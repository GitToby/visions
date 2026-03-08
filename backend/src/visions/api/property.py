import asyncio
import uuid
from typing import Annotated

from fastapi import APIRouter, Body, File, Form, UploadFile, status

from visions.core.db import DBSession
from visions.core.security import CurrentUser
from visions.models import (
    PropertyCreate,
    PropertyResponse,
    PropertyUpdate,
    RoomCreate,
    RoomResponse,
    RoomUpdate,
)
from visions.services import property as property_service
from visions.services import room as room_service

router = APIRouter(prefix="/properties", tags=["properties"])


@router.get("", response_model=list[PropertyResponse])
async def list_properties(db: DBSession, current_user: CurrentUser) -> list[PropertyResponse]:
    properties = await property_service.get_all_for_owner(db, current_user.id)
    return await asyncio.gather(*[property.to_response() for property in properties])


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    db: DBSession, current_user: CurrentUser, payload: Annotated[PropertyCreate, Body(...)]
) -> PropertyResponse:
    property = await property_service.create(db, owner_id=current_user.id, data=payload)
    return await property.to_response()


@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    db: DBSession,
    current_user: CurrentUser,
    property_id: uuid.UUID,
) -> PropertyResponse:
    property = await property_service.get_or_404(db, property_id, current_user.id)
    return await property.to_response()


@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(
    db: DBSession,
    current_user: CurrentUser,
    property_id: uuid.UUID,
    property_update: Annotated[PropertyUpdate, Body(...)],
) -> PropertyResponse:
    property = await property_service.get_or_404(db, property_id, current_user.id)
    property = await property_service.update(db, property=property, data=property_update)
    return await property.to_response()


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(db: DBSession, current_user: CurrentUser, property_id: uuid.UUID) -> None:
    property = await property_service.get_or_404(db, property_id, current_user.id)
    await property_service.delete(db, property)


@router.post(
    "/{property_id}/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED
)
async def create_room(
    db: DBSession,
    current_user: CurrentUser,
    property_id: uuid.UUID,
    image: UploadFile = File(...),  # noqa B008
    label: str = Form(default="Room"),
) -> RoomResponse:
    await property_service.get_or_404(db, property_id, current_user.id)
    room_create = RoomCreate(property_id=property_id, label=label, image=image)
    room = await room_service.create(db, room_create=room_create)
    return await room.to_response()


@router.get("/{property_id}/rooms/{room_id}", response_model=RoomResponse)
async def get_room(
    db: DBSession,
    current_user: CurrentUser,
    property_id: uuid.UUID,
    room_id: uuid.UUID,
) -> RoomResponse:
    room = await room_service.get_or_404(
        db, property_id=property_id, room_id=room_id, caller=current_user
    )
    return await room.to_response()


# question, what if theyre not pngs
# @router.get("/{property_id}/rooms/{room_id}.webp", response_model=StreamingResponse)
# async def get_room_image(
#     db: DBSession,
#     current_user: CurrentUser,
#     property_id: uuid.UUID,
#     room_id: uuid.UUID,
# ) -> StreamingResponse:
#     ...


@router.put("/{property_id}/rooms/{room_id}", response_model=RoomResponse)
async def update_room(
    db: DBSession,
    current_user: CurrentUser,
    property_id: uuid.UUID,
    room_id: uuid.UUID,
    label: str | None = None,
    image: UploadFile = File(...),  # noqa B008
) -> RoomResponse:
    await property_service.get_or_404(db, property_id, current_user.id)
    room = await room_service.get_or_404(db, property_id=property_id, room_id=room_id)
    room_update = RoomUpdate(label=label or room.label, image=image)
    room = await room_service.update(db, room=room, room_update=room_update)
    return await room.to_response()


@router.delete("/{property_id}/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    db: DBSession,
    current_user: CurrentUser,
    property_id: uuid.UUID,
    room_id: uuid.UUID,
) -> None:
    await property_service.get_or_404(db, property_id, current_user.id)
    room = await room_service.get_or_404(db, property_id=property_id, room_id=room_id)
    await room_service.delete(db, room=room)
