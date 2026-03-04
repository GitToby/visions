from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from loguru import logger

from visions.core.config import SETTINGS
from visions.core.db import DBSession
from visions.models import User
from visions.services.user import upsert_from_supabase

_jwks_client = PyJWKClient(
    f"{SETTINGS.supabase_url}/auth/v1/.well-known/jwks.json",
    cache_keys=True,
)


def validate_supabase_jwt(token: str) -> dict | None:
    """Validate a Supabase-issued JWT via JWKS (ES256) and return the decoded payload."""
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
    except jwt.exceptions.PyJWKClientError:
        logger.debug("JWT signing key lookup failed")
        return None
    try:
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["ES256"],
            audience="authenticated",
        )
        logger.debug("JWT validated | sub={}", payload.get("sub"))
        return payload
    except jwt.PyJWTError as exc:
        logger.debug("JWT validation failed | reason={}", exc)
        return None


_bearer = HTTPBearer()


async def get_current_user(
    db: DBSession,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> User:
    payload = validate_supabase_jwt(credentials.credentials)
    if payload is None:
        logger.debug("Rejected unauthenticated request")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await upsert_from_supabase(db, payload)
    logger.debug("Authenticated | user_id={}", user.id)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
