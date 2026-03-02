import uuid

from fastapi import APIRouter, File, Form, UploadFile, status

from visions.core.db import DBSession
from visions.core.security import CurrentUser
from visions.models import StyleCreateRequest, StyleResponse
from visions.services import storage as storage_service
from visions.services import style as style_service

router = APIRouter(prefix="/styles", tags=["styles"])


def _to_response(style, db=None) -> StyleResponse:
    preview_url = (
        storage_service.presigned_url(style.preview_image_key) if style.preview_image_key else None
    )
    return StyleResponse.model_validate(style).model_copy(update={"preview_image_url": preview_url})


@router.get("", response_model=list[StyleResponse])
async def list_styles(db: DBSession, current_user: CurrentUser) -> list[StyleResponse]:
    styles = await style_service.get_all_visible(db, current_user.id)
    return [_to_response(s) for s in styles]


@router.post("", response_model=StyleResponse, status_code=status.HTTP_201_CREATED)
async def create_style(
    db: DBSession,
    current_user: CurrentUser,
    name: str = Form(...),
    description: str = Form(...),
    preview_image: UploadFile | None = File(default=None),  # noqa B008
) -> StyleResponse:
    preview_key: str | None = None
    if preview_image is not None:
        file_bytes = await preview_image.read()
        preview_key = await storage_service.upload_image(
            file_bytes, preview_image.filename or "preview.jpg", prefix="style-previews"
        )

    data = StyleCreateRequest(name=name, description=description)
    style = await style_service.create_custom(
        db, creator_id=current_user.id, data=data, preview_image_key=preview_key
    )
    return _to_response(style)


@router.delete("/{style_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_style(style_id: uuid.UUID, db: DBSession, current_user: CurrentUser) -> None:
    style = await style_service.get_or_404(db, style_id)
    await style_service.delete(db, style, current_user.id)
