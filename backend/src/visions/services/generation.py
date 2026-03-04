"""Orchestrates batch generation jobs: room x style → Gemini → Supabase Storage."""

import uuid

from loguru import logger
from pydantic_ai.messages import ImageUrl
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import BUILTIN_STYLES_KV, GenerationJob, Room, User
from visions.services import ai


async def get_jobs_for_house(db: AsyncSession, house_id: uuid.UUID) -> list[GenerationJob]:
    logger.debug("Fetching generation jobs | house_id={}", house_id)
    result = await db.exec(select(GenerationJob).join(Room).where(Room.house_id == house_id))
    jobs = list(result.all())
    logger.debug("Found {} job(s) | house_id={}", len(jobs), house_id)
    return jobs


async def create_jobs(
    db: AsyncSession, *, house_id: uuid.UUID, styles: set[str], sumbitter: User
) -> list[GenerationJob]:
    """Create pending GenerationJob rows for every room x style combination."""
    styles = {style for style in styles if style in BUILTIN_STYLES_KV.keys()}

    q = select(Room).where(Room.house_id == house_id)
    rooms = await db.exec(q)

    jobs = [
        GenerationJob(room_id=room.id, style=style_id, submitter_id=sumbitter.id)
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
    img_url = await job.room.get_image_url()
    if not img_url:
        raise ValueError(f"Room {job.room_id} has no image URL")
        # fail gen job and return None
    img_url_ = ImageUrl(url=img_url)

    style = BUILTIN_STYLES_KV[job.style]
    prompt = ai.system_prompt(style.name, style.description)

    # https://ai.pydantic.dev/input/
    _ = ai.agent.run_sync([prompt, img_url_])
    # upload binary result to the job bucket path
    # return url
