import uuid

from fastapi import APIRouter, File, Form, UploadFile, status

from visions.core.db import DBSession
from visions.core.security import CurrentUser
from visions.models import HouseCreateRequest, HouseDetailResponse, HouseResponse, RoomResponse
from visions.services import house as house_service
from visions.services import storage as storage_service

router = APIRouter(prefix="/houses", tags=["houses"])


@router.get("", response_model=list[HouseResponse])
async def list_houses(db: DBSession, current_user: CurrentUser) -> list[HouseResponse]:
    houses = await house_service.get_all_for_owner(db, current_user.id)
    result = []
    for h in houses:
        count = await house_service.count_rooms(db, h.id)
        result.append(HouseResponse.model_validate(h).model_copy(update={"room_count": count}))
    return result


@router.post("", response_model=HouseResponse, status_code=status.HTTP_201_CREATED)
async def create_house(
    payload: HouseCreateRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> HouseResponse:
    house = await house_service.create(db, owner_id=current_user.id, data=payload)
    return HouseResponse.model_validate(house)


@router.get("/{house_id}", response_model=HouseDetailResponse)
async def get_house(
    house_id: uuid.UUID, db: DBSession, current_user: CurrentUser
) -> HouseDetailResponse:
    house = await house_service.get_or_404(db, house_id, current_user.id)
    rooms = await house_service.get_rooms(db, house.id)
    room_responses = [
        RoomResponse.model_validate(r).model_copy(
            update={"original_image_url": storage_service.presigned_url(r.original_image_key)}
        )
        for r in rooms
    ]
    count = len(room_responses)
    return HouseDetailResponse.model_validate(house).model_copy(
        update={"room_count": count, "rooms": room_responses}
    )


@router.delete("/{house_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_house(house_id: uuid.UUID, db: DBSession, current_user: CurrentUser) -> None:
    house = await house_service.get_or_404(db, house_id, current_user.id)
    await house_service.delete(db, house)


@router.post("/{house_id}/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def upload_room(
    house_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
    image: UploadFile = File(...),  # noqa B008
    label: str = Form(default="Room"),
) -> RoomResponse:
    await house_service.get_or_404(db, house_id, current_user.id)
    file_bytes = await image.read()
    image_key = await storage_service.upload_image(
        file_bytes, image.filename or "room.jpg", prefix=f"rooms/{house_id}"
    )
    room = await house_service.add_room(db, house_id=house_id, label=label, image_key=image_key)
    image_url = storage_service.presigned_url(image_key)
    return RoomResponse.model_validate(room).model_copy(update={"original_image_url": image_url})
