import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.orm import selectinload
from sqlmodel import func, or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import Property, PropertyCreate, PropertyUpdate, Room


async def get_many(
    db: AsyncSession,
    *,
    caller_id: uuid.UUID | None = None,
    include_public: bool = True,
    property_ids: list[uuid.UUID] | None = None,
    limit: int | None = None,
) -> Sequence[Property]:
    """List all properties for a given owner."""
    logger.debug("Listing properties | caller_id={}", caller_id)
    q = select(Property)

    if property_ids is not None:
        q = q.where(Property.id.in_(property_ids))  # type: ignore[reportAttributeAccessIssue]

    or_statment = []
    if caller_id:
        or_statment.append(Property.owner_id == caller_id)

    if include_public:
        or_statment.append(Property.public.is_(True))  # type: ignore[reportAttributeAccessIssue]

    if or_statment:
        q = q.where(or_(*or_statment))

    if limit is not None:
        q = q.limit(limit)

    q = q.order_by(Property.created_at.desc()).options(  # type: ignore[arg-type]
        selectinload(Property.rooms).selectinload(Room.generation_jobs)  # type: ignore[arg-type]
    )
    # todo, move to a generater thing to async read from the session in batches.
    result = await db.exec(q)
    properties = result.all()
    logger.debug("Found {} property(s) | caller_id={}", len(properties), caller_id)
    return properties


async def get(
    db: AsyncSession,
    *,
    property_id: uuid.UUID,
    caller_id: uuid.UUID | None = None,
    include_public: bool = True,
) -> Property | None:
    """Fetch a property by its ID, ensuring the caller has access."""
    logger.debug("Fetching property | property_id={} caller_id={}", property_id, caller_id)
    properties = await get_many(
        db, property_ids=[property_id], caller_id=caller_id, include_public=include_public, limit=1
    )
    return properties[0] if properties else None


async def get_or_404(db: AsyncSession, property_id: uuid.UUID, caller_id: uuid.UUID) -> Property:
    property = await get(db, property_id=property_id, caller_id=caller_id, include_public=True)
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
        public=data.public,
    )
    db.add(property)
    await db.commit()
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
    if data.public is not None:
        property.public = data.public
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
