"""Orchestrates batch generation jobs: room x style → Gemini → Supabase Storage."""

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import DesignStyle, GenerationJob, JobStatus, Room
from visions.services import gemini as gemini_service
from visions.services import storage as storage_service


async def get_jobs_for_house(db: AsyncSession, house_id: uuid.UUID) -> list[GenerationJob]:
    result = await db.exec(
        select(GenerationJob)
        .join(Room)
        .where(Room.house_id == house_id)
        .order_by(GenerationJob.created_at.desc())  # type: ignore[arg-type]
    )
    return list(result.all())


async def create_jobs(
    db: AsyncSession,
    *,
    room_ids: list[uuid.UUID],
    style_ids: list[uuid.UUID],
) -> list[GenerationJob]:
    """Create pending GenerationJob rows for every room x style combination."""
    jobs: list[GenerationJob] = []
    for room_id in room_ids:
        for style_id in style_ids:
            job = GenerationJob(room_id=room_id, style_id=style_id)
            db.add(job)
            jobs.append(job)
    await db.commit()
    for job in jobs:
        await db.refresh(job)
    return jobs


async def process_job(db: AsyncSession, job_id: uuid.UUID) -> GenerationJob:
    """Execute a single pending job synchronously.

    Marks job as processing, calls Gemini, uploads result, then marks completed/failed.
    """
    job = await db.get(GenerationJob, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    room = await db.get(Room, job.room_id)
    style = await db.get(DesignStyle, job.style_id)

    if room is None or style is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Room or style missing"
        )

    # Mark as processing
    job.status = JobStatus.PROCESSING
    db.add(job)
    await db.commit()

    try:
        # Fetch original image from Supabase Storage
        room_image_bytes = storage_service.download_image(room.original_image_key)

        # Generate redesign via Gemini
        result_bytes = await gemini_service.generate_room_redesign(
            room_image_bytes=room_image_bytes,
            style_name=style.name,
            style_description=style.description,
        )

        # Upload result
        result_key = f"results/{job.id}.png"
        await storage_service.upload_image_from_bytes(result_bytes, result_key)

        job.status = JobStatus.COMPLETED
        job.result_image_key = result_key
        job.completed_at = datetime.now(UTC)

    except Exception as exc:
        job.status = JobStatus.FAILED
        job.error_message = str(exc)
        job.completed_at = datetime.now(UTC)

    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job
