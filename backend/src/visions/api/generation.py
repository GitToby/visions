import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from visions.core.db import DBSession
from visions.core.security import CurrentUser
from visions.models import GenerationJob, GenerationJobCreate, GenerationJobResponse, Room
from visions.services import generation as generation_service
from visions.services import property as property_service

router = APIRouter(prefix="/generation", tags=["generation"])


@router.post("", response_model=list[GenerationJobResponse], status_code=status.HTTP_202_ACCEPTED)
async def start_generation_for_room(
    db: DBSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    payload: GenerationJobCreate,
) -> list[GenerationJobResponse]:
    """Submit and generate an AI generation request for a room in the property."""
    room = await db.get(Room, payload.room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    await property_service.get_or_404(db, room.property_id, current_user.id)

    job = GenerationJob(
        room_id=room.id,
        style=payload.style,
        submitter_id=current_user.id,
        extra_context=payload.extra_context,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(generation_service.submit_job, db, job)
    return [await job.to_response()]


@router.get("/property/{property_id}", response_model=list[GenerationJobResponse])
async def list_jobs_for_property(
    property_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[GenerationJobResponse]:
    """
    See all generation jobs for a property.
    """
    await property_service.get_or_404(db, property_id, current_user.id)
    jobs = await generation_service.get_jobs_for_property(db, property_id)
    return await asyncio.gather(*[j.to_response() for j in jobs])


@router.get("/jobs/{job_id}", response_model=GenerationJobResponse)
async def get_job(
    db: DBSession,
    current_user: CurrentUser,
    job_id: uuid.UUID,
) -> GenerationJobResponse:
    """
    Get the specific genertaion job, if it exists
    """
    job = await db.get(GenerationJob, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return await job.to_response()
