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
        jobs.append(job)

    logger.debug("Jobs persisted | job_ids={}", [str(j.id) for j in jobs])
    await db.commit()
    return jobs


async def submit_job(db: AsyncSession, job: GenerationJob):
    logger.debug(f"Submitting job | room_id={job.room_id} style={job.style}")
    room = await db.get(Room, job.room_id)
    if room is None:
        raise ValueError(f"Room {job.room_id} not found")

    img_url = await room.get_image_url()
    if not img_url:
        logger.warning(f"Room {job.room_id} has no image URL")
        raise ValueError(f"Room {job.room_id} has no image URL")
        # fail gen job and return None

    img_url_ = ImageUrl(url=img_url)
    style = BUILTIN_STYLES_KV[job.style]
    prompt = ai.system_prompt(style.name, style.description, extra_context=job.extra_context)

    # https://ai.pydantic.dev/input/
    resp = await ai.agent.run([prompt, img_url_])

    job.completed_at = datetime.now(UTC)
    logger.debug(f"Job completed | room_id={job.room_id} style={job.style}")
    await job.upload_image(BytesIO(resp.output.data))
    logger.debug(f"Upload completed | room_id={job.room_id} style={job.style}")
    return job


async def main_genjob_rec():
    q = select(GenerationJob).where(GenerationJob.completed_at == None)  # noqa E711
    async with async_session_factory() as session:
        jobs = await session.exec(q)
        await asyncio.gather(*[submit_job(session, job) for job in jobs])
        await session.commit()


if __name__ == "__main__":
    asyncio.run(main_genjob_rec())
