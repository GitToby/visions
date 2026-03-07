import uuid

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import Room, RoomCreate, RoomUpdate, User


async def get(
    db: AsyncSession, *, property_id: uuid.UUID, room_id: uuid.UUID, caller: User | None = None
) -> Room | None:
    """Gets a room, optionally checking if the caller has access to it."""
    q = select(Room).where(Room.id == room_id, Room.property_id == property_id)
    if caller is not None:
        q = q.where(Room.property.owner_id == caller.id)

    result = await db.exec(q)
    return result.one_or_none()


async def get_or_404(
    db: AsyncSession, *, property_id: uuid.UUID, room_id: uuid.UUID, caller: User | None = None
) -> Room:
    room = await get(db, property_id=property_id, room_id=room_id, caller=caller)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return room


async def create(db: AsyncSession, *, room_create: RoomCreate) -> Room:
    room = Room(property_id=room_create.property_id, label=room_create.label)
    db.add(room)
    await room.upload_image(room_create.image.file)
    await db.commit()
    await db.refresh(room)
    return room


async def update(db: AsyncSession, *, room: Room, room_update: RoomUpdate) -> Room:
    room.label = room_update.label
    await room.upload_image(room_update.image.file)
    await db.commit()
    await db.refresh(room)
    return room


async def delete(db: AsyncSession, *, room: Room) -> None:
    await room.delete_image()
    await db.delete(room)
    await db.commit()
