"""Orchestrates batch generation jobs: room x style → Gemini → Supabase Storage."""

import asyncio
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from io import BytesIO

from fastapi import HTTPException, status
from loguru import logger
from pydantic_ai.messages import ImageUrl
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.core.config import SETTINGS
from visions.core.db import async_session_factory
from visions.core.exception import VisionsApiException
from visions.models import (
    BUILTIN_STYLES_KV,
    GenerationJob,
    GenerationJobCreate,
    Room,
    User,
)
from visions.services import ai
from visions.services import room as room_service

ROOM_GENERATION_NOTIFICATIONS: dict[uuid.UUID, asyncio.Queue[GenerationJob]] = {}
"""
A mutable map of notifications for a given room.
 - Subscribers make their own queue and place it in the map.
 - Notifications are pushed when something happens to that room.
"""


async def get_many(
    db: AsyncSession,
    *,
    caller_id: uuid.UUID | None,
    property_id: uuid.UUID | None = None,
    job_ids: list[uuid.UUID] | None = None,
    load_generation_jobs: bool = False,
) -> Sequence[GenerationJob]:
    """List generation jobs for a property or all jobs for a user."""
    logger.debug("Listing generation jobs | property_id={} caller_id={}", property_id, caller_id)
    q = select(GenerationJob)
    if caller_id:
        q = q.where(GenerationJob.submitter_id == caller_id)

    if property_id:
        q = q.join(Room).where(Room.property_id == property_id)

    if job_ids:
        q = q.where(GenerationJob.id.in_(job_ids))  # type: ignore[reportAttributeAccessIssue, reportAttributeAccessIssue,missing-attribute]

    if load_generation_jobs:
        q = q.options(selectinload(GenerationJob.generation_jobs))  # type: ignore[reportAttributeAccessIssue]

    result = await db.exec(q)
    return result.all()


async def get(
    db: AsyncSession, job_id: uuid.UUID, caller_id: uuid.UUID | None
) -> GenerationJob | None:
    """Fetch a specific generation job. Optionally pass a caller_id to
    ensuring the caller has access."""
    logger.debug("Fetching generation job | job_id={} caller_id={}", job_id, caller_id)
    q = select(GenerationJob).where(GenerationJob.id == job_id)
    if caller_id:
        q = q.where(GenerationJob.submitter_id == caller_id)
    result = await db.exec(q)
    return result.first()


async def get_or_404(db: AsyncSession, job_id: uuid.UUID, caller_id: uuid.UUID) -> GenerationJob:
    job = await get(db, job_id, caller_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Generation job not found"
        )
    return job


async def create_many(
    db: AsyncSession, *, data: list[GenerationJobCreate], caller: User
) -> list[GenerationJob]:
    rooms_with_access = await room_service.get_many(
        db, room_ids=[job.room_id for job in data], caller_id=caller.id
    )
    accessible_room_ids = {room.id for room in rooms_with_access}

    # if a user has not got access to a room, they will not be able to submit a job for it
    # question: should we build failed job ids here:
    if any(job.room_id not in accessible_room_ids for job in data):
        rooms_without_access = {
            job.room_id for job in data if job.room_id not in accessible_room_ids
        }
        raise VisionsApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User does not have access to rooms: {', '.join(str(r) for r in rooms_without_access)}",
        )

    jobs = [
        GenerationJob(
            room_id=job.room_id,
            original_job_id=job.original_job_id,
            style=job.style,
            submitter_id=caller.id,
            extra_context=job.extra_context,
        )
        for job in data
        if job.room_id in accessible_room_ids
    ]

    db.add_all(jobs)
    db.add(caller)
    caller.balance -= SETTINGS.generation_cost * len(jobs)
    await db.commit()
    await db.refresh(caller)
    for job in jobs:
        await db.refresh(job)
    logger.debug("Jobs created | job_ids={}", [job.id for job in jobs])
    return jobs


async def submit_jobs(job_ids: list[uuid.UUID], dry_run: bool = False):
    """Run a series of generation jobs in their own DB session. Safe to call from a background task."""
    async with async_session_factory() as db:
        jobs = await get_many(db, caller_id=None, job_ids=job_ids, load_generation_jobs=True)
        missing_jobs = set(job_ids) - {j.id for j in jobs}
        if missing_jobs:
            logger.warning("Job not found | job_ids={}", missing_jobs)

        jobs = await asyncio.gather(*[_submit_job(db, job, dry_run) for job in jobs])
        await db.commit()

        # notify that we've done something with the jobs
        for job in jobs:
            if q := ROOM_GENERATION_NOTIFICATIONS.get(job.room_id):
                await q.put(job)

        return jobs


async def _submit_job(db: AsyncSession, job: GenerationJob, dry_run: bool = False):
    logger.debug("Submitting job | job_id={} room_id={} style={}", job.id, job.room_id, job.style)
    job_id = job.id
    try:
        if job.original_job_id:
            if job.original_job is None:
                raise ValueError(f"Original job {job.original_job_id} not found, links broken.")

            logger.debug(
                "Original job found | job_id={} room_id={}",
                job.original_job_id,
                job.original_job.id,
            )
            img_url = await job.original_job.get_image_url()
        else:
            img_url = await job.room.get_image_url()

        if not img_url:
            raise ValueError(f"Room {job.room_id} has no image URL")

        if job.style not in BUILTIN_STYLES_KV:
            raise ValueError(f"Unknown style: {job.style!r}")

        img_url_ = ImageUrl(url=img_url)
        style = BUILTIN_STYLES_KV[job.style]
        logger.debug(
            "Creating prompt | job_id={} room_id={} style={} img_url={}",
            job_id,
            job.room_id,
            job.style,
            img_url,
        )
        if dry_run:
            logger.debug("Dry run | job_id={} data={}", job_id, job.model_dump_json())
            return job

        prompt = ai.system_prompt(style.name, style.description, extra_context=job.extra_context)

        # https://ai.pydantic.dev/input/
        resp = await ai.agent.run([prompt, img_url_])
        await job.upload_image(BytesIO(resp.output.data))
        logger.debug(
            "Upload completed | job_id={} room_id={} style={}", job_id, job.room_id, job.style
        )

        job.completed_at = datetime.now(UTC)
        job.error_message = None

        usage = resp.usage()
        job.llm_model = ai.model.model_id
        job.llm_requests = usage.requests
        job.llm_tool_calls = usage.tool_calls
        job.llm_input_tokens = usage.input_tokens
        job.llm_cache_write_tokens = usage.cache_write_tokens
        job.llm_cache_read_tokens = usage.cache_read_tokens
        job.llm_output_tokens = usage.output_tokens

    except Exception as exc:
        logger.warning("Job failed | job_id={} error={}", job_id, str(exc))
        submitter = job.submitter
        submitter.balance += 1
        job.error_message = str(exc)

    return job


async def main_genjob_rec(dry_run: bool = True):
    q = (
        select(GenerationJob)
        .where(
            GenerationJob.completed_at.is_(None),  # type: ignore[reportAttributeAccessIssue]
            GenerationJob.error_message.is_(None),  # type: ignore[reportAttributeAccessIssue]
        )
        .order_by(GenerationJob.created_at)  # type: ignore[reportArgumentType, bad-argument-type]
    )
    async with async_session_factory() as session:
        result = await session.exec(q)
        job_ids = [job.id for job in result.all()]

    await submit_jobs(job_ids, dry_run=dry_run)
    logger.info("Generation job rec complete | job_ids={}", job_ids)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main_genjob_rec())
