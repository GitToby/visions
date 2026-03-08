"""Orchestrates batch generation jobs: room x style → Gemini → Supabase Storage."""

import asyncio
import uuid
from datetime import UTC, datetime
from io import BytesIO

from loguru import logger
from pydantic_ai.messages import ImageUrl
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.core.db import async_session_factory
from visions.models import BUILTIN_STYLES_KV, GenerationJob, Room, User
from visions.services import ai


async def get_jobs_for_property(db: AsyncSession, property_id: uuid.UUID) -> list[GenerationJob]:
    logger.debug("Fetching generation jobs | property_id={}", property_id)
    result = await db.exec(select(GenerationJob).join(Room).where(Room.property_id == property_id))
    jobs = list(result.all())
    logger.debug("Found {} job(s) | property_id={}", len(jobs), property_id)
    return jobs


async def get_job(db: AsyncSession, job_id: uuid.UUID, caller: User) -> GenerationJob | None:
    logger.debug("Fetching generation job | job_id={}", job_id)
    q = select(GenerationJob).where(GenerationJob.id == job_id)
    if caller:
        q = q.where(GenerationJob.submitter_id == caller.id)
    result = await db.exec(q)
    job = result.first()
    return job


async def create_jobs(
    db: AsyncSession, *, property_id: uuid.UUID, styles: set[str], submitter: User
) -> list[GenerationJob]:
    """Create pending GenerationJob rows for every room x style combination."""
    styles = {style for style in styles if style in BUILTIN_STYLES_KV.keys()}

    q = select(Room).where(Room.property_id == property_id)
    rooms = await db.exec(q)

    jobs = [
        GenerationJob(room_id=room.id, style=style_id, submitter_id=submitter.id)
        for room in rooms
        for style_id in styles
    ]

    for job in jobs:
        db.add(job)

    logger.debug("Jobs persisted | job_ids={}", [str(j.id) for j in jobs])
    await db.commit()
    return jobs


async def submit_job(job_id: uuid.UUID):
    """Run a generation job in its own DB session. Safe to call from a background task."""
    async with async_session_factory() as db:
        job = await db.get(GenerationJob, job_id)
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
    asyncio.run(main_genjob_rec())
