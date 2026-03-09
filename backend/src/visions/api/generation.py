import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from visions.core.config import SETTINGS
from visions.core.db import DBSession
from visions.core.security import CurrentUser
from visions.models import GenerationJobCreate, GenerationJobResponse
from visions.services import generation as generation_service

router = APIRouter(prefix="/generation", tags=["generation"])


@router.post("", response_model=list[GenerationJobResponse], status_code=status.HTTP_202_ACCEPTED)
async def start_generation_for_room(
    db: DBSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    payload: GenerationJobCreate,
) -> list[GenerationJobResponse]:
    """Submit and generate an AI generation request for a room in the property."""
    if current_user.balance < SETTINGS.generation_cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient balance"
        )
    job = await generation_service.create(db, data=payload, caller=current_user)
    background_tasks.add_task(generation_service.submit_job, job.id)

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
    jobs = await generation_service.list_all(db, property_id=property_id, caller_id=current_user.id)
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
    job = await generation_service.get_or_404(db, job_id, current_user.id)
    return await job.to_response()
