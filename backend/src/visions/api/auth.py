from typing import Annotated

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from visions.core.security import get_current_user
from visions.models import User, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginResponse(BaseModel):
    url: str


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> None:
    """No-op: Supabase session is managed client-side."""
