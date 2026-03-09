"""S3-compatible file service"""

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException, status
from fastapi.datastructures import UploadFile
from loguru import logger
from supabase import create_async_client

from visions.core.config import SETTINGS

SIGNED_URL_EXPIRES = 3600  # 1 hour

_supabase_client = None


async def _get_supabase():
    global _supabase_client
    if _supabase_client is None:
        # Initialized only when first called
        _supabase_client = await create_async_client(
            SETTINGS.supabase_url, SETTINGS.supabase_secret_key.get_secret_value()
        )
    return _supabase_client


# Usage:


_s3 = boto3.client(
    "s3",
    endpoint_url=SETTINGS.s3_endpoint_url,
    aws_access_key_id=SETTINGS.s3_access_key_id,
    aws_secret_access_key=SETTINGS.s3_secret_access_key.get_secret_value(),
    region_name=SETTINGS.s3_region,
)


def file_exists(*, bucket: str, key: str) -> bool:
    """Checks if a key exists in the bucket."""
    try:
        _s3.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "404":
            return False
        raise


def upload_file(file: UploadFile, *, bucket: str, key: str):
    """Uploads a file to S3."""
    size_kb = (file.size or 0) / 1024
    # todo, check if image by known codecs - then alter the image to be of a standard size
    logger.debug(f"Uploading generated image | {bucket}/{key} {size_kb=:.1f}KB")
    try:
        _s3.upload_fileobj(
            file.file, bucket, key, ExtraArgs={"ContentType": file.headers.get("Content-Type")}
        )
    except ClientError as exc:
        logger.error("Failed to upload file | exc={}", exc)
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {exc}") from exc


async def s3_presigned_url(*, bucket: str, key: str):
    """
    Generate a signed URL via the Supabase Storage SDK.

    supabase dosent like the s3 presigned format so wew have to use the client.
    """
    logger.debug(f"Generating presigned URL | {bucket}/{key}")
    try:
        client = await _get_supabase()
        result = await client.storage.from_(bucket).create_signed_url(key, SIGNED_URL_EXPIRES)
        return result["signedURL"]
    except Exception as exc:
        logger.error("Presigned URL generation failed | key={} error={}", key, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not generate image URL",
        ) from exc


def download_file(*, bucket: str, key: str) -> bytes:
    """Download a stored object and return its bytes."""
    # todo, make a generator response for downstream conuming
    logger.debug("Downloading image | key={}", key)
    try:
        response = _s3.get_object(Bucket=bucket, Key=key)
        data: bytes = response["Body"].read()
    except ClientError as exc:
        logger.error("Image download failed | key={} error={}", key, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image download failed",
        ) from exc
    logger.debug("Image downloaded | key={} size={:.1f}KB", key, len(data) / 1024)
    return data


def delete_file(*, bucket: str, key: str):
    """Delete a stored object."""
    logger.debug("Deleting image | key={}", key)
    try:
        _s3.delete_object(Bucket=bucket, Key=key)
    except ClientError as exc:
        logger.error("Image deletion failed | key={} error={}", key, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image deletion failed",
        ) from exc
    logger.debug("Image deleted | key={}", key)
