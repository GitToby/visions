"""Unit tests for FileStoreMixin."""

from io import BytesIO
from unittest.mock import patch

import pytest
from fastapi import UploadFile
from fastapi.datastructures import Headers
from PIL import Image

from visions.models import FileStoreMixin


class ConcreteStore(FileStoreMixin):
    """Minimal concrete implementation for testing."""

    __bucket__ = "test-bucket"

    @property
    def _image_key_prefix(self) -> str:
        return "prefix/item"


@pytest.fixture
def store() -> ConcreteStore:
    return ConcreteStore()


def _make_upload_file(fmt: str = "PNG") -> UploadFile:
    """Return an in-memory UploadFile containing a tiny image."""
    buf = BytesIO()
    Image.new("RGB", (4, 4), color=(255, 0, 0)).save(buf, format=fmt)
    buf.seek(0)
    return UploadFile(
        file=buf,
        filename=f"test.{fmt.lower()}",
        headers=Headers({"Content-Type": f"image/{fmt.lower()}"}),
        size=buf.getbuffer().nbytes,
    )


# ─── image_key ────────────────────────────────────────────────────────────────


def test_image_key(store: ConcreteStore):
    assert store.image_key == "prefix/item.webp"


# ─── has_image ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_has_image_returns_true_when_file_exists(store: ConcreteStore):
    with patch("visions.models.storage.file_exists", return_value=True) as mock:
        result = await store.has_image()

    assert result is True
    mock.assert_called_once_with(bucket="test-bucket", key="prefix/item.webp")


@pytest.mark.asyncio
async def test_has_image_returns_false_when_file_missing(store: ConcreteStore):
    with patch("visions.models.storage.file_exists", return_value=False) as mock:
        result = await store.has_image()

    assert result is False
    mock.assert_called_once_with(bucket="test-bucket", key="prefix/item.webp")


# ─── get_image_url ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_image_url_returns_url_when_file_exists(store: ConcreteStore):
    with (
        patch("visions.models.storage.file_exists", return_value=True),
        patch(
            "visions.models.storage.s3_presigned_url", return_value="https://cdn.example.com/img"
        ) as mock_url,
    ):
        result = await store.get_image_url()

    assert result == "https://cdn.example.com/img"
    mock_url.assert_called_once_with(bucket="test-bucket", key="prefix/item.webp")


@pytest.mark.asyncio
async def test_get_image_url_returns_none_when_file_missing(store: ConcreteStore):
    with (
        patch("visions.models.storage.file_exists", return_value=False),
        patch("visions.models.storage.s3_presigned_url") as mock_url,
    ):
        result = await store.get_image_url()

    assert result is None
    mock_url.assert_not_called()


# ─── upload_image ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_image_converts_to_webp_and_uploads(store: ConcreteStore):
    upload = _make_upload_file("PNG")

    with patch("visions.models.storage.upload_file") as mock_upload:
        await store.upload_image(upload.file)

    mock_upload.assert_called_once()
    _, kwargs = mock_upload.call_args
    assert kwargs["bucket"] == "test-bucket"
    assert kwargs["key"] == "prefix/item.webp"

    # Confirm the file was actually converted to WebP
    uploaded: UploadFile = mock_upload.call_args.args[0]
    uploaded.file.seek(0)
    img = Image.open(uploaded.file)
    assert img.format == "WEBP"


@pytest.mark.asyncio
async def test_upload_image_accepts_jpeg_input(store: ConcreteStore):
    """Non-PNG inputs should also be re-encoded to WebP."""
    upload = _make_upload_file("JPEG")

    with patch("visions.models.storage.upload_file") as mock_upload:
        await store.upload_image(upload.file)

    uploaded: UploadFile = mock_upload.call_args.args[0]
    uploaded.file.seek(0)
    img = Image.open(uploaded.file)
    assert img.format == "WEBP"


# ─── download_image ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_download_image_returns_bytes(store: ConcreteStore):
    fake_bytes = b"\x89PNG\r\n"

    with patch("visions.models.storage.download_file", return_value=fake_bytes) as mock_dl:
        result = await store.download_image()

    assert result == fake_bytes
    mock_dl.assert_called_once_with(bucket="test-bucket", key="prefix/item.webp")


@pytest.mark.asyncio
async def test_download_image_returns_none_on_error(store: ConcreteStore):
    with patch("visions.models.storage.download_file", side_effect=Exception("S3 error")):
        result = await store.download_image()

    assert result is None


@pytest.mark.asyncio
async def test_download_image_add_watermark_param_accepted(store: ConcreteStore):
    """add_watermark is a no-op for now; ensure it doesn't raise."""
    with patch("visions.models.storage.download_file", return_value=b"data"):
        result = await store.download_image(add_watermark=True)

    assert result == b"data"
