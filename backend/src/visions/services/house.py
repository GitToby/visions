import uuid

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.orm import selectinload
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import House, HouseCreate, HouseUpdate, Room


async def get_all_for_owner(db: AsyncSession, owner_id: uuid.UUID) -> list[House]:
    logger.debug("Fetching all houses | owner_id={}", owner_id)
    result = await db.exec(
        select(House)
        .where(House.owner_id == owner_id)
        .order_by(House.created_at.desc())  # type: ignore[arg-type]
        .options(selectinload(House.rooms))  # type: ignore[arg-type]
    )
    houses = list(result.all())
    logger.debug("Found {} house(s) | owner_id={}", len(houses), owner_id)
    return houses


async def get_by_id(
    db: AsyncSession, house_id: uuid.UUID, caller_id: uuid.UUID | None = None
) -> House | None:
    """
    Fetch a house by its ID. If `caller_id` is provided, only return the house if it can be accessed by the caller.

    loads rooms by default.

    """

    logger.debug("Fetching house | house_id={}", house_id)
    q = select(House).where(House.id == house_id).options(selectinload(House.rooms))  # type: ignore[arg-type]
    if caller_id is not None:
        q = q.where(House.owner_id == caller_id)

    result = await db.exec(q)
    return result.first()


async def get_or_404(db: AsyncSession, house_id: uuid.UUID, caller_id: uuid.UUID) -> House:
    house = await get_by_id(db, house_id, caller_id)
    if house is None:
        logger.debug(
            "House not found or access denied | house_id={} owner_id={}", house_id, caller_id
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")
    return house


async def create(db: AsyncSession, *, owner_id: uuid.UUID, data: HouseCreate) -> House:
    logger.debug("Creating house | owner_id={} name={!r}", owner_id, data.name)
    house = House(name=data.name, owner_id=owner_id)
    db.add(house)
    await db.commit()
    await db.refresh(house)
    await db.refresh(house, attribute_names=["rooms"])
    logger.info("House created | house_id={} name={!r}", house.id, house.name)
    return house


async def update(db: AsyncSession, *, owner_id: uuid.UUID, data: HouseUpdate) -> House: ...


async def delete(db: AsyncSession, house: House) -> None:
    logger.info("Deleting house | house_id={} name={!r}", house.id, house.name)
    await db.delete(house)
    await db.commit()
    logger.debug("House deleted | house_id={}", house.id)


async def count_rooms(db: AsyncSession, house_id: uuid.UUID) -> int:
    result = await db.exec(select(func.count()).where(Room.house_id == house_id))
    return result.one()


async def get_rooms(db: AsyncSession, house_id: uuid.UUID) -> list[Room]:
    logger.debug("Fetching rooms | house_id={}", house_id)
    result = await db.exec(select(Room).where(Room.house_id == house_id))
    return list(result.all())
