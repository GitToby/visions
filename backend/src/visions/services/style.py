import uuid

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import (
    DesignStyle,
    DesignStyleCreate,
)


async def get_all_for_user(db: AsyncSession, user_id: uuid.UUID):
    q = select(DesignStyle).where(DesignStyle.creator_id == user_id)
    result = await db.exec(q)
    return result.all()


async def get_by_id(db: AsyncSession, style_id: uuid.UUID) -> DesignStyle | None:
    return await db.get(DesignStyle, style_id)


async def get_or_404(db: AsyncSession, style_id: uuid.UUID) -> DesignStyle:
    style = await get_by_id(db, style_id)
    if style is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Style not found")
    return style


async def create_custom(
    db: AsyncSession,
    *,
    creator_id: uuid.UUID,
    data: DesignStyleCreate,
    preview_image_key: str,
) -> DesignStyle:
    style = DesignStyle(
        name=data.name,
        description=data.description,
        preview_image_key=preview_image_key,
        is_builtin=False,
        creator_id=creator_id,
    )
    db.add(style)
    await db.commit()
    await db.refresh(style)
    return style


async def delete(db: AsyncSession, style: DesignStyle, owner_id: uuid.UUID) -> None:
    if style.is_builtin or style.creator_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete this style"
        )
    await db.delete(style)
    await db.commit()
