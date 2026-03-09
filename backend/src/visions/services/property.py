import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.orm import selectinload
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import Property, PropertyCreate, PropertyUpdate, Room


async def list_all(db: AsyncSession, caller_id: uuid.UUID) -> Sequence[Property]:
    """List all properties for a given owner."""
    logger.debug("Listing properties | caller_id={}", caller_id)
    result = await db.exec(
        select(Property)
        .where(Property.owner_id == caller_id)
        .order_by(Property.created_at.desc())  # type: ignore[arg-type]
        .options(selectinload(Property.rooms).selectinload(Room.generation_jobs))  # type: ignore[arg-type]
    )
    properties = result.all()
    logger.debug("Found {} property(s) | caller_id={}", len(properties), caller_id)
    return properties


async def get(db: AsyncSession, property_id: uuid.UUID, caller_id: uuid.UUID) -> Property | None:
    """Fetch a property by its ID, ensuring the caller has access."""
    logger.debug("Fetching property | property_id={} caller_id={}", property_id, caller_id)
    q = (
        select(Property)
        .where(Property.id == property_id, Property.owner_id == caller_id)
        .options(selectinload(Property.rooms).selectinload(Room.generation_jobs))  # type: ignore[arg-type]
    )

    result = await db.exec(q)
    return result.first()


async def get_or_404(db: AsyncSession, property_id: uuid.UUID, caller_id: uuid.UUID) -> Property:
    property = await get(db, property_id, caller_id)
    if property is None:
        logger.debug(
            "Property not found or access denied | property_id={} caller_id={}",
            property_id,
            caller_id,
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return property


async def create(db: AsyncSession, *, owner_id: uuid.UUID, data: PropertyCreate) -> Property:
    logger.debug("Creating property | owner_id={} name={!r}", owner_id, data.name)
    property = Property(
        name=data.name,
        description=data.description,
        address=data.address,
        owner_id=owner_id,
    )
    db.add(property)
    await db.commit()
    await db.refresh(property)
    await db.refresh(property, attribute_names=["rooms"])
    logger.info("Property created | property_id={} name={!r}", property.id, property.name)
    return property


async def update(db: AsyncSession, *, property: Property, data: PropertyUpdate) -> Property:
    if data.name is not None:
        property.name = data.name
    if data.description is not None:
        property.description = data.description
    if data.address is not None:
        property.address = data.address
    db.add(property)
    await db.commit()
    await db.refresh(property, attribute_names=["rooms"])
    return property


async def delete(db: AsyncSession, property: Property) -> None:
    logger.info("Deleting property | property_id={} name={!r}", property.id, property.name)
    await db.delete(property)
    await db.commit()
    logger.debug("Property deleted | property_id={}", property.id)


async def count_rooms(db: AsyncSession, property_id: uuid.UUID) -> int:
    result = await db.exec(select(func.count()).where(Room.property_id == property_id))
    return result.one()


async def get_rooms(db: AsyncSession, property_id: uuid.UUID) -> list[Room]:
    logger.debug("Fetching rooms | property_id={}", property_id)
    result = await db.exec(select(Room).where(Room.property_id == property_id))
    return list(result.all())
