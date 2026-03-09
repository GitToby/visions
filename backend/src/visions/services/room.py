import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import Property, Room, RoomCreate, RoomUpdate


async def list_all(
    db: AsyncSession, *, property_id: uuid.UUID, caller_id: uuid.UUID
) -> Sequence[Room]:
    """List all rooms for a property, ensuring the caller has access."""
    logger.debug("Listing rooms | property_id={} caller_id={}", property_id, caller_id)
    q = (
        select(Room)
        .join(Property)
        .where(Room.property_id == property_id, Property.owner_id == caller_id)
        .options(selectinload(Room.generation_jobs))  # type: ignore[arg-type]
    )
    result = await db.exec(q)
    return result.all()


async def get(db: AsyncSession, *, room_id: uuid.UUID, caller_id: uuid.UUID) -> Room | None:
    """Gets a room by ID, ensuring the caller has access to it."""
    logger.debug("Fetching room | room_id={} caller_id={}", room_id, caller_id)
    q = (
        select(Room)
        .join(Property)
        .where(Room.id == room_id, Property.owner_id == caller_id)
        .options(selectinload(Room.generation_jobs))  # type: ignore[arg-type]
    )

    result = await db.exec(q)
    return result.one_or_none()


async def get_many(
    db: AsyncSession, *, room_ids: list[uuid.UUID], caller_id: uuid.UUID
) -> Sequence[Room]:
    """Gets multiple rooms by IDs, ensuring the caller has access to all."""
    logger.debug("Fetching multiple rooms | count={} caller_id={}", len(room_ids), caller_id)
    q = (
        select(Room)
        .join(Property)
        .where(Room.id.in_(room_ids), Property.owner_id == caller_id)  # type: ignore[attr-defined]
        .options(selectinload(Room.generation_jobs))  # type: ignore[arg-type]
    )
    result = await db.exec(q)
    return result.all()


async def get_or_404(db: AsyncSession, *, room_id: uuid.UUID, caller_id: uuid.UUID) -> Room:
    room = await get(db, room_id=room_id, caller_id=caller_id)
    if room is None:
        logger.debug(
            "Room not found or access denied | room_id={} caller_id={}",
            room_id,
            caller_id,
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return room


async def create(db: AsyncSession, *, caller_id: uuid.UUID, data: RoomCreate) -> Room:
    """Create a new room, verifying property ownership."""
    logger.debug("Creating room | property_id={} label={!r}", data.property_id, data.label)
    # Verify ownership of the property
    q = select(Property).where(Property.id == data.property_id, Property.owner_id == caller_id)
    result = await db.exec(q)
    if not result.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    room = Room(property_id=data.property_id, label=data.label)
    db.add(room)
    if data.image:
        await room.upload_image(data.image.file)

    await db.commit()
    await db.refresh(room)
    await db.refresh(room, attribute_names=["generation_jobs"])
    logger.info("Room created | room_id={} label={!r}", room.id, room.label)
    return room


async def update(db: AsyncSession, *, room: Room, data: RoomUpdate) -> Room:
    """Update a room instance with new data."""
    logger.debug("Updating room | room_id={} label={!r}", room.id, data.label)
    room.label = data.label
    if data.image:
        await room.upload_image(data.image.file)

    db.add(room)
    await db.commit()
    await db.refresh(room)
    await db.refresh(room, attribute_names=["generation_jobs"])
    return room


async def delete(db: AsyncSession, *, room: Room) -> None:
    logger.info("Deleting room | room_id={} label={!r}", room.id, room.label)
    await room.delete_image()
    await db.delete(room)
    await db.commit()
    logger.debug("Room deleted | room_id={}", room.id)
