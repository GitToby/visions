import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from visions.core.db import DBSession
from visions.core.security import CurrentUser
from visions.models import GenerationJob, GenerationJobResponse, GenerationRequest
from visions.services import generation as generation_service
from visions.services import house as house_service
from visions.services import storage as storage_service

router = APIRouter(prefix="/generation", tags=["generation"])


def _to_response(job) -> GenerationJobResponse:
    result_url = (
        storage_service.presigned_url(job.result_image_key) if job.result_image_key else None
    )
    return GenerationJobResponse.model_validate(job).model_copy(
        update={"result_image_url": result_url}
    )


@router.post("", response_model=list[GenerationJobResponse], status_code=status.HTTP_202_ACCEPTED)
async def start_generation(
    payload: GenerationRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
    current_user: CurrentUser,
) -> list[GenerationJobResponse]:
    # Verify ownership
    await house_service.get_or_404(db, payload.house_id, current_user.id)

    jobs = await generation_service.create_jobs(
        db, room_ids=payload.room_ids, style_ids=payload.style_ids
    )

    # Process each job in the background
    for job in jobs:
        background_tasks.add_task(generation_service.process_job, db, job.id)

    return [_to_response(j) for j in jobs]


@router.get("/houses/{house_id}", response_model=list[GenerationJobResponse])
async def list_jobs_for_house(
    house_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[GenerationJobResponse]:
    await house_service.get_or_404(db, house_id, current_user.id)
    jobs = await generation_service.get_jobs_for_house(db, house_id)
    return [_to_response(j) for j in jobs]


@router.get("/jobs/{job_id}", response_model=GenerationJobResponse)
async def get_job(
    job_id: uuid.UUID, db: DBSession, current_user: CurrentUser
) -> GenerationJobResponse:
    job = await db.get(GenerationJob, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return _to_response(job)
