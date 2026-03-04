from fastapi import APIRouter

from visions.core.security import CurrentUser
from visions.models import BUILTIN_STYLES, DesignStyle

router = APIRouter(prefix="/styles", tags=["styles"])


@router.get("", response_model=list[DesignStyle])
async def list_styles(_: CurrentUser) -> list[DesignStyle]:
    return BUILTIN_STYLES
