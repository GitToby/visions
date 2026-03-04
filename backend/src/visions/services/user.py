import uuid

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from visions.models import User


async def get_by_id(db: AsyncSession, user_id: str) -> User | None:
    logger.debug("Fetching user | user_id={}", user_id)
    return await db.get(User, uuid.UUID(user_id))


# todo: type the payload here
async def upsert_from_supabase(db: AsyncSession, payload: dict) -> User:
    """Lazily sync a Supabase auth user into our database.

    Called on every authenticated request. Creates the user on first login,
    updates name/picture on subsequent calls.
    """
    user_id = uuid.UUID(payload["sub"])
    meta = payload.get("user_metadata", {})
    name = meta.get("full_name") or meta.get("name") or payload.get("email", "")
    picture: str | None = meta.get("avatar_url") or meta.get("picture")

    user = await db.get(User, user_id)
    if user is None:
        logger.info("New user — creating | user_id={} email={}", user_id, payload.get("email"))
        user = User(id=user_id, email=payload["email"], name=name, picture=picture)
    else:
        logger.debug("Existing user — updating metadata | user_id={}", user_id)
        user.name = name
        user.picture = picture
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
