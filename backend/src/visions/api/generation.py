import asyncio
import uuid
from collections.abc import AsyncIterable

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from fastapi.sse import EventSourceResponse, ServerSentEvent

from visions.core.config import SETTINGS
from visions.core.db import DBSession
from visions.core.security import CurrentUser
from visions.models import GenerationJobCreate, GenerationJobResponse
from visions.services import generation as generation_service
from visions.services import room as room_service
from visions.services.events import ROOM_GENERATIONS

router = APIRouter(prefix="/generation", tags=["generation"])


@router.post("", response_model=list[GenerationJobResponse], status_code=status.HTTP_202_ACCEPTED)
async def start_generation_for_room(
    db: DBSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    payload: list[GenerationJobCreate],
) -> list[GenerationJobResponse]:
    """Submit and generate an AI generation request for a room in the property."""
    if current_user.balance < (SETTINGS.generation_cost * len(payload)):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient balance"
        )
    job = await generation_service.create_many(db, data=payload, caller=current_user)
    background_tasks.add_task(generation_service.submit_jobs, [j.id for j in job])

    return await asyncio.gather(*[j.to_response() for j in job])


@router.get("/property/{property_id}", response_model=list[GenerationJobResponse])
async def list_jobs_for_property(
    property_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[GenerationJobResponse]:
    """
    See all generation jobs for a property.
    """
    jobs = await generation_service.get_many(db, property_id=property_id, caller_id=current_user.id)
    return await asyncio.gather(*[j.to_response() for j in jobs])


# Note, this is untest because i cant work out how to test open streaming responses without the test client hanging.
@router.get("/events/{room_id}", response_class=EventSourceResponse)
async def get_room_notifications(
    request: Request,
    db: DBSession,
    current_user: CurrentUser,
    room_id: uuid.UUID,
) -> AsyncIterable[ServerSentEvent]:
    """
    A SSE Endpoint which listens to generation job events for a room and notifies on any changes.
    """
    # Validate room access BEFORE returning the EventSourceResponse
    await room_service.get_or_404(db, room_id=room_id, caller_id=current_user.id)
    q = ROOM_GENERATIONS.sub(room_id)

    async for job in q:
        if await request.is_disconnected():
            break
        yield ServerSentEvent(data=await job.to_response())


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
