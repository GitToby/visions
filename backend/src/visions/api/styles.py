import uuid

from fastapi import APIRouter, File, Form, UploadFile, status

from visions.core.db import DBSession
from visions.core.security import CurrentUser
from visions.models import BUILTIN_STYLES, DesignStyle, DesignStyleCreate, DesignStyleResponse
from visions.services import storage as storage_service
from visions.services import style as style_service

router = APIRouter(prefix="/styles", tags=["styles"])


@router.get("", response_model=list[DesignStyleResponse])
async def list_styles(db: DBSession, current_user: CurrentUser) -> list[DesignStyleResponse]:
    styles = await style_service.get_all_for_user(db, current_user.id)
    return [s.to_response() for s in BUILTIN_STYLES + styles]


@router.post("", response_model=DesignStyleResponse, status_code=status.HTTP_201_CREATED)
async def create_style(
    db: DBSession,
    current_user: CurrentUser,
    name: str = Form(...),
    description: str = Form(...),
    preview_image: UploadFile = File(...),  # noqa B008
) -> DesignStyleResponse:
    preview_key: str | None = None

    file_bytes = await preview_image.read()
    preview_key = await storage_service.upload_image(
        file_bytes, preview_image.filename or "preview.jpg", prefix="style-previews"
    )

    data = DesignStyleCreate(name=name, description=description)
    style = await style_service.create_custom(
        db, creator_id=current_user.id, data=data, preview_image_key=preview_key
    )
    return style.to_response()


@router.delete("/{style_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_style(style_id: uuid.UUID, db: DBSession, current_user: CurrentUser) -> None:
    style = await style_service.get_or_404(db, style_id)
    await style_service.delete(db, style, current_user.id)
