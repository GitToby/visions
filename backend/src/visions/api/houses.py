import uuid
from typing import Annotated

from fastapi import APIRouter, Body, File, Form, UploadFile, status

from visions.core.db import DBSession
from visions.core.security import CurrentUser
from visions.models import HouseCreate, HouseResponse, HouseUpdate, RoomResponse
from visions.services import house as house_service

router = APIRouter(prefix="/houses", tags=["houses"])


@router.get("", response_model=list[HouseResponse])
async def list_houses(db: DBSession, current_user: CurrentUser) -> list[HouseResponse]: ...


@router.post("", response_model=HouseResponse, status_code=status.HTTP_201_CREATED)
async def create_house(
    db: DBSession, current_user: CurrentUser, payload: Annotated[HouseCreate, Body(...)]
) -> HouseResponse:
    house = await house_service.create(db, owner_id=current_user.id, data=payload)
    return await house.to_response()


@router.get("/{house_id}", response_model=HouseResponse)
async def get_house(
    db: DBSession,
    current_user: CurrentUser,
    house_id: uuid.UUID,
) -> HouseResponse:
    house = await house_service.get_or_404(db, house_id, current_user.id)
    return await house.to_response()


@router.put("/{house_id}", response_model=HouseResponse)
async def update_house(
    db: DBSession,
    current_user: CurrentUser,
    house_id: uuid.UUID,
    house_update: Annotated[HouseUpdate, Body(...)],
) -> HouseResponse: ...


@router.delete("/{house_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_house(db: DBSession, current_user: CurrentUser, house_id: uuid.UUID) -> None:
    house = await house_service.get_or_404(db, house_id, current_user.id)
    await house_service.delete(db, house)


@router.post("/{house_id}/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def upload_room(
    db: DBSession,
    current_user: CurrentUser,
    house_id: uuid.UUID,
    image: UploadFile = File(...),  # noqa B008
    label: str = Form(default="Room"),
) -> RoomResponse: ...


@router.delete("/{house_id}/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    house_id: uuid.UUID,
    room_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None: ...
