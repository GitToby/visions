"""Orchestrates batch generation jobs: room x style → Gemini → Supabase Storage."""

import asyncio
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from io import BytesIO

from fastapi import HTTPException, status
from loguru import logger
from pydantic_ai.messages import ImageUrl
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.core.config import SETTINGS
from visions.core.db import async_session_factory
from visions.models import (
    BUILTIN_STYLES_KV,
    GenerationJob,
    GenerationJobCreate,
    Room,
    User,
)
from visions.services import ai
from visions.services import room as room_service


async def list_all(
    db: AsyncSession, *, property_id: uuid.UUID | None = None, caller_id: uuid.UUID | None
) -> Sequence[GenerationJob]:
    """List generation jobs for a property or all jobs for a user."""
    logger.debug("Listing generation jobs | property_id={} caller_id={}", property_id, caller_id)
    q = select(GenerationJob)
    if caller_id:
        q = q.where(GenerationJob.submitter_id == caller_id)
    if property_id:
        q = q.join(Room).where(Room.property_id == property_id)

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


async def create(db: AsyncSession, *, data: GenerationJobCreate, caller: User) -> GenerationJob:
    """Create a single pending GenerationJob."""
    caller_id = caller.id
    logger.debug(
        "Creating generation job | room_id={} style={} caller_id={}",
        data.room_id,
        data.style,
        caller_id,
    )

    await room_service.get_or_404(db, room_id=data.room_id, caller_id=caller_id)

    if data.style not in BUILTIN_STYLES_KV:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown style: {data.style}"
        )

    job = GenerationJob(
        room_id=data.room_id,
        original_job_id=None,  # todo: make this a property which allows updates to the underlying generation
        style=data.style,
        submitter_id=caller_id,
        extra_context=data.extra_context,
    )
    db.add(job)
    caller.balance -= SETTINGS.generation_cost
    db.add(caller)
    await db.commit()
    await db.refresh(job)
    logger.debug("Job created | job_id={}", job.id)
    return job


async def delete(db: AsyncSession, *, job: GenerationJob) -> None:
    """Delete a generation job."""
    await job.delete_image()
    await db.delete(job)
    await db.commit()


async def submit_job(job_id: uuid.UUID):
    """Run a generation job in its own DB session. Safe to call from a background task."""
    async with async_session_factory() as db:
        job = await get(db, job_id, caller_id=None)
        if job is None:
            logger.error("Job not found | job_id={}", job_id)
            return

        logger.debug(
            "Submitting job | job_id={} room_id={} style={}", job_id, job.room_id, job.style
        )
        try:
            room = await db.get(Room, job.room_id)
            if room is None:
                raise ValueError(f"Room {job.room_id} not found")

            img_url = await room.get_image_url()
            if not img_url:
                raise ValueError(f"Room {job.room_id} has no image URL")

            if job.style not in BUILTIN_STYLES_KV:
                raise ValueError(f"Unknown style: {job.style!r}")

            img_url_ = ImageUrl(url=img_url)
            style = BUILTIN_STYLES_KV[job.style]
            prompt = ai.system_prompt(
                style.name, style.description, extra_context=job.extra_context
            )

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
            logger.exception("Job failed | job_id={} error={}", job_id, exc)
            job.error_message = str(exc)

        await db.commit()


async def main_genjob_rec():
    q = select(GenerationJob).where(
        GenerationJob.completed_at == None,  # noqa E711
        GenerationJob.error_message == None,  # noqa E711
    )
    async with async_session_factory() as session:
        result = await session.exec(q)
        job_ids = [job.id for job in result.all()]

    await asyncio.gather(*[submit_job(job_id) for job_id in job_ids])


if __name__ == "__main__":
    import asyncio

    asyncio.run(main_genjob_rec())
