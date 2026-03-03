from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from visions.core.config import settings
from visions.core.db import DBSession
from visions.models import User
from visions.services.user import upsert_from_supabase

_jwks_client = PyJWKClient(
    f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
    cache_keys=True,
)


def validate_supabase_jwt(token: str) -> dict | None:
    """Validate a Supabase-issued JWT via JWKS (ES256) and return the decoded payload."""
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
    except jwt.exceptions.PyJWKClientError:
        return None
    try:
        return jwt.decode(
            token,
            signing_key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except jwt.PyJWTError:
        return None


_bearer = HTTPBearer()


async def get_current_user(
    db: DBSession,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> User:
    payload = validate_supabase_jwt(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return await upsert_from_supabase(db, payload)


CurrentUser = Annotated[User, Depends(get_current_user)]
