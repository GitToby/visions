from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import PropertyShare, PropertyShareCreate


async def get_or_create(
    db: AsyncSession,
    *,
    data: PropertyShareCreate,
) -> PropertyShare: ...


async def delete(db: AsyncSession, *, share: PropertyShare) -> None:
    logger.info("Deleting property share | share_id={}", share.id)
    await db.delete(share)
    await db.commit()
    logger.debug("Property share deleted | share_id={}", share.id)
