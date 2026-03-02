"""Supabase Storage file service."""

import uuid
from pathlib import PurePosixPath

from fastapi import HTTPException, status
from supabase import Client, create_client

from visions.core.config import settings

SIGNED_URL_EXPIRES = 3600  # 1 hour

_supabase: Client | None = None


def _client() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase


def _key(prefix: str, filename: str) -> str:
    ext = PurePosixPath(filename).suffix
    return f"{prefix}/{uuid.uuid4()}{ext}"


async def upload_image(file_bytes: bytes, filename: str, prefix: str = "uploads") -> str:
    """Upload image bytes and return the storage path key."""
    key = _key(prefix, filename)
    try:
        _client().storage.from_(settings.supabase_storage_bucket).upload(
            key,
            file_bytes,
            {"content-type": _guess_content_type(filename)},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload failed",
        ) from exc
    return key


async def upload_image_from_bytes(image_bytes: bytes, key: str) -> None:
    """Store raw bytes at an explicit key (used by generation service)."""
    try:
        _client().storage.from_(settings.supabase_storage_bucket).upload(
            key,
            image_bytes,
            {"content-type": "image/png", "upsert": "true"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Result image upload failed",
        ) from exc


def presigned_url(key: str) -> str:
    """Generate a time-limited signed URL for a stored object."""
    try:
        res = (
            _client()
            .storage.from_(settings.supabase_storage_bucket)
            .create_signed_url(key, SIGNED_URL_EXPIRES)
        )
        return res["signedURL"]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not generate image URL",
        ) from exc


def download_image(key: str) -> bytes:
    """Download a stored object and return its bytes."""
    try:
        return bytes(_client().storage.from_(settings.supabase_storage_bucket).download(key))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image download failed",
        ) from exc


def _guess_content_type(filename: str) -> str:
    ext = PurePosixPath(filename).suffix.lower()
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(ext, "application/octet-stream")
