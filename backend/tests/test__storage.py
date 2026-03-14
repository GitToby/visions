"""Tests for the storage service (S3 + Supabase signed URLs)."""

from io import BytesIO
from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError
from fastapi import HTTPException
from fastapi.datastructures import UploadFile

from visions.services import storage as storage_service


def test_file_exists_returns_true_when_object_found(mock_s3: MagicMock):
    # Arrange
    mock_s3.head_object.return_value = {}

    # Act
    result = storage_service.file_exists(bucket="my-bucket", key="rooms/abc.webp")

    # Assert
    assert result is True
    mock_s3.head_object.assert_called_once_with(Bucket="my-bucket", Key="rooms/abc.webp")


def test_file_exists_returns_false_on_404(mock_s3: MagicMock):
    # Arrange
    mock_s3.head_object.side_effect = ClientError(
        {"Error": {"Code": "404", "Message": "Not Found"}}, "HeadObject"
    )

    # Act
    result = storage_service.file_exists(bucket="my-bucket", key="rooms/missing.webp")

    # Assert
    assert result is False


def test_file_exists_raises_on_unexpected_client_error(mock_s3: MagicMock):
    # Arrange
    mock_s3.head_object.side_effect = ClientError(
        {"Error": {"Code": "403", "Message": "Forbidden"}}, "HeadObject"
    )

    # Act & Assert
    with pytest.raises(ClientError):
        storage_service.file_exists(bucket="my-bucket", key="rooms/secret.webp")


@pytest.mark.asyncio
async def test_s3_presigned_url_returns_signed_url(mock_supabase: MagicMock):
    # Arrange
    storage_service._url_cache.clear_cache()

    # Act
    url = await storage_service.s3_presigned_url(bucket="my-bucket", key="rooms/abc.webp")

    # Assert
    assert url is not None
    assert url.startswith("https://example.com/")


@pytest.mark.asyncio
async def test_s3_presigned_url_returns_none_on_404(monkeypatch: pytest.MonkeyPatch):
    # Arrange
    from supabase import StorageException

    storage_service._url_cache.clear_cache()

    mock_bucket = MagicMock()
    mock_bucket.create_signed_url.side_effect = StorageException(
        {"statusCode": "404", "message": "Not Found"}
    )
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    monkeypatch.setattr(storage_service, "_supabase_client", mock_client)

    # Act
    result = await storage_service.s3_presigned_url(bucket="my-bucket", key="rooms/missing.webp")

    # Assert
    assert result is None


@pytest.mark.asyncio
async def test_s3_presigned_url_returns_none_on_400(monkeypatch: pytest.MonkeyPatch):
    # Arrange
    from supabase import StorageException

    storage_service._url_cache.clear_cache()

    mock_bucket = MagicMock()
    mock_bucket.create_signed_url.side_effect = StorageException(
        {"statusCode": "400", "message": "Bad Request"}
    )
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    monkeypatch.setattr(storage_service, "_supabase_client", mock_client)

    # Act
    result = await storage_service.s3_presigned_url(bucket="my-bucket", key="rooms/bad.webp")

    # Assert
    assert result is None


@pytest.mark.asyncio
async def test_s3_presigned_url_returns_none_on_unexpected_storage_error(
    monkeypatch: pytest.MonkeyPatch,
):
    # Arrange
    from supabase import StorageException

    storage_service._url_cache.clear_cache()

    mock_bucket = MagicMock()
    mock_bucket.create_signed_url.side_effect = StorageException(
        {"statusCode": "500", "message": "Internal Error"}
    )
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    monkeypatch.setattr(storage_service, "_supabase_client", mock_client)

    # Act
    result = await storage_service.s3_presigned_url(bucket="my-bucket", key="rooms/error.webp")

    # Assert
    assert result is None


# --- upload_file ---


def test_upload_file_calls_s3_upload_fileobj(mock_s3: MagicMock):
    # Arrange
    file_content = b"fake image data"
    mock_file = MagicMock(spec=UploadFile)
    mock_file.file = BytesIO(file_content)
    mock_file.size = len(file_content)
    mock_file.headers = {"Content-Type": "image/webp"}

    # Act
    # todo: make async
    storage_service.upload_file(mock_file, bucket="my-bucket", key="rooms/new.webp")

    # Assert
    mock_s3.upload_fileobj.assert_called_once_with(
        mock_file.file,
        "my-bucket",
        "rooms/new.webp",
        ExtraArgs={"ContentType": "image/webp"},
    )


def test_upload_file_raises_http_500_on_client_error(mock_s3: MagicMock):
    # Arrange
    mock_s3.upload_fileobj.side_effect = ClientError(
        {"Error": {"Code": "500", "Message": "Internal Error"}}, "PutObject"
    )

    mock_file = MagicMock(spec=UploadFile)
    mock_file.file = BytesIO(b"data")
    mock_file.size = 4
    mock_file.headers = {"Content-Type": "image/webp"}

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        storage_service.upload_file(mock_file, bucket="my-bucket", key="rooms/fail.webp")

    assert exc_info.value.status_code == 500


# --- download_file ---


def test_download_file_returns_bytes(mock_s3: MagicMock):
    # Arrange
    file_bytes = b"image bytes"
    mock_s3.get_object.return_value = {"Body": MagicMock(read=MagicMock(return_value=file_bytes))}

    # Act
    result = storage_service.download_file(bucket="my-bucket", key="rooms/abc.webp")

    # Assert
    assert result == file_bytes


def test_download_file_raises_502_on_client_error(mock_s3: MagicMock):
    # Arrange
    mock_s3.get_object.side_effect = ClientError(
        {"Error": {"Code": "NoSuchKey", "Message": "Not Found"}}, "GetObject"
    )

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        storage_service.download_file(bucket="my-bucket", key="rooms/missing.webp")

    assert exc_info.value.status_code == 502


# --- delete_file ---


def test_delete_file_calls_s3_delete_object(mock_s3: MagicMock):
    # Act
    storage_service.delete_file(bucket="my-bucket", key="rooms/old.webp")

    # Assert
    mock_s3.delete_object.assert_called_once_with(Bucket="my-bucket", Key="rooms/old.webp")


def test_delete_file_raises_502_on_client_error(mock_s3: MagicMock):
    # Arrange
    mock_s3.delete_object.side_effect = ClientError(
        {"Error": {"Code": "500", "Message": "Server Error"}}, "DeleteObject"
    )

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        storage_service.delete_file(bucket="my-bucket", key="rooms/fail.webp")

    assert exc_info.value.status_code == 502
