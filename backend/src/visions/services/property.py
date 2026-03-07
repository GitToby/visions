import uuid

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.orm import selectinload
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import Property, PropertyCreate, PropertyUpdate, Room


async def get_all_for_owner(db: AsyncSession, owner_id: uuid.UUID) -> list[Property]:
    logger.debug("Fetching all properties | owner_id={}", owner_id)
    result = await db.exec(
        select(Property)
        .where(Property.owner_id == owner_id)
        .order_by(Property.created_at.desc())  # type: ignore[arg-type]
        .options(selectinload(Property.rooms))  # type: ignore[arg-type]
    )
    houses = list(result.all())
    logger.debug("Found {} property(s) | owner_id={}", len(houses), owner_id)
    return houses


async def get_by_id(
    db: AsyncSession, property_id: uuid.UUID, caller_id: uuid.UUID | None = None
) -> Property | None:
    """
    Fetch a house by its ID. If `caller_id` is provided, only return the house if it can be accessed by the caller.

    loads rooms by default.

    """

    logger.debug("Fetching house | property_id={}", property_id)
    q = select(Property).where(Property.id == property_id).options(selectinload(Property.rooms))  # type: ignore[arg-type]
    if caller_id is not None:
        q = q.where(Property.owner_id == caller_id)

    result = await db.exec(q)
    return result.first()


async def get_or_404(db: AsyncSession, property_id: uuid.UUID, caller_id: uuid.UUID) -> Property:
    house = await get_by_id(db, property_id, caller_id)
    if house is None:
        logger.debug(
            "House not found or access denied | property_id={} owner_id={}", property_id, caller_id
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")
    return house


async def create(db: AsyncSession, *, owner_id: uuid.UUID, data: PropertyCreate) -> Property:
    logger.debug("Creating house | owner_id={} name={!r}", owner_id, data.name)
    house = Property(
        name=data.name,
        description=data.description,
        address=data.address,
        owner_id=owner_id,
    )
    db.add(house)
    await db.commit()
    await db.refresh(house)
    await db.refresh(house, attribute_names=["rooms"])
    logger.info("House created | property_id={} name={!r}", house.id, house.name)
    return house


async def update(db: AsyncSession, *, house: Property, data: PropertyUpdate) -> Property:
    if data.name is not None:
        house.name = data.name
    if data.description is not None:
        house.description = data.description
    if data.address is not None:
        house.address = data.address
    db.add(house)
    await db.commit()
    await db.refresh(house, attribute_names=["rooms"])
    return house


async def delete(db: AsyncSession, property: Property) -> None:
    logger.info("Deleting house | property_id={} name={!r}", property.id, property.name)
    await db.delete(property)
    await db.commit()
    logger.debug("House deleted | property_id={}", property.id)


async def count_rooms(db: AsyncSession, property_id: uuid.UUID) -> int:
    result = await db.exec(select(func.count()).where(Room.property_id == property_id))
    return result.one()


async def get_rooms(db: AsyncSession, property_id: uuid.UUID) -> list[Room]:
    logger.debug("Fetching rooms | property_id={}", property_id)
    result = await db.exec(select(Room).where(Room.property_id == property_id))
    return list(result.all())
