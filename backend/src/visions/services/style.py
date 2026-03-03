import uuid

from fastapi import HTTPException, status
from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import DesignStyle, DesignStyleCreate

# Curated built-in styles — seeded on first startup
BUILTIN_STYLES: list[dict] = [
    {
        "name": "Japandi",
        "description": (
            "A harmonious blend of Japanese minimalism and Scandinavian functionality. "
            "Neutral tones, natural materials (oak, rattan, linen), clean lines, and an "
            "emphasis on craftsmanship and negative space."
        ),
    },
    {
        "name": "Industrial",
        "description": (
            "Raw, unfinished aesthetics inspired by urban lofts. Exposed brick, concrete, "
            "steel beams, Edison bulbs, and reclaimed wood. Dark palette with metallic accents."
        ),
    },
    {
        "name": "Mid-Century Modern",
        "description": (
            "1950s-60s American design: organic shapes, tapered legs, bold accent colours, "
            "and a mix of natural and manufactured materials. Think Eames chairs and sunburst clocks."
        ),
    },
    {
        "name": "Coastal",
        "description": (
            "Light, airy interiors evoking a beachside retreat. White and sand tones, "
            "weathered wood, wicker, jute, and ocean-blue accents. Natural light is central."
        ),
    },
    {
        "name": "Maximalist",
        "description": (
            "More is more. Layered patterns, rich jewel tones, eclectic art, global "
            "textiles, and abundant plants. Every surface tells a story."
        ),
    },
    {
        "name": "Biophilic",
        "description": (
            "Design that brings nature indoors. Living walls, abundant houseplants, natural "
            "stone, wood, water features, and large windows for natural light and views."
        ),
    },
]


async def seed_builtins(db: AsyncSession) -> None:
    for style_data in BUILTIN_STYLES:
        existing = await db.exec(
            select(DesignStyle).where(
                DesignStyle.name == style_data["name"],
                DesignStyle.is_builtin == True,  # noqa: E712
            )
        )
        if existing.first() is None:
            db.add(DesignStyle(**style_data, is_builtin=True))
    await db.commit()


async def get_all_visible(db: AsyncSession, user_id: uuid.UUID) -> list[DesignStyle]:
    """Return all built-in styles plus the requesting user's custom styles."""
    result = await db.exec(
        select(DesignStyle).where(
            or_(DesignStyle.is_builtin == True, DesignStyle.creator_id == user_id)  # noqa: E712
        )
    )
    return list(result.all())


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
    preview_image_key: str | None = None,
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
