import asyncio
import uuid
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import BinaryIO, override

from fastapi import UploadFile
from fastapi.datastructures import Headers
from PIL import Image
from pydantic import BaseModel, ConfigDict, computed_field
from sqlalchemy import TIMESTAMP, UniqueConstraint, text
from sqlalchemy.event import listens_for
from sqlmodel import Field, Relationship, SQLModel

from visions.core.config import SETTINGS
from visions.services import storage


def _now() -> datetime:
    return datetime.now(UTC)


@listens_for(SQLModel, "before_update")
def update_timestamp(_, __, target):
    target.updated_at = _now()


# ─── Mixins ───────────────────────────────────────────────────────────────────
# util mixins that can be used across multiple table models


class UUIDModel(SQLModel):
    """Adds an auto-generated UUID primary key.

    Safe to use as a mixin across multiple table models because no explicit
    `sa_column` is set; SQLModel generates a fresh Column per table.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class CreatedUpdatedAtMixin(SQLModel):
    """Adds `created_at` and `updated_at` fields with timezone-aware datetime."""

    created_at: datetime = Field(
        default_factory=_now,
        sa_type=TIMESTAMP,
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=_now,
        sa_type=TIMESTAMP,
        nullable=False,
        sa_column_kwargs={
            "server_onupdate": text("CURRENT_TIMESTAMP"),
        },
    )


class FileStoreMixin(ABC):
    """Adds storage utils to link to a file in the file store."""

    __bucket__: str

    @property
    @abstractmethod
    def _image_key_prefix(self) -> str:
        """
        The key used to store the image in S3

        The result is of the post processed image file.
        """
        ...

    @property
    def image_key(self) -> str:
        """
        The key used to store the image in S3

        The result should be of the post proccessed image file.
        """
        return f"{self._image_key_prefix}.webp"

    async def has_image(self) -> bool:
        """Check if the room has an image"""
        return storage.file_exists(bucket=self.__bucket__, key=self.image_key)

    async def get_image_url(self) -> str | None:
        """Returns a presigned URL for the image"""
        return await storage.s3_presigned_url(bucket=self.__bucket__, key=self.image_key)

    async def upload_image(self, image: BinaryIO) -> None:
        """Upload the image to S3"""

        with Image.open(image) as img:  # failed here
            # todo: make all images below a specific size
            _bytes = BytesIO()
            img.save(_bytes, format="WebP")
            size = _bytes.tell()
            _bytes.seek(0)
            _image = UploadFile(
                file=_bytes,
                filename=self.image_key,
                headers=Headers({"Content-Type": "image/webp"}),
                size=size,
            )
            storage.upload_file(_image, bucket=self.__bucket__, key=self.image_key)

    async def download_image(self, add_watermark: bool = False) -> bytes | None:
        """Returns the image file bytes to be used with a FileResponse"""
        try:
            return storage.download_file(bucket=self.__bucket__, key=self.image_key)
        except Exception:
            return None

    async def delete_image(self):
        """Deletes the image from the file store."""
        try:
            storage.delete_file(bucket=self.__bucket__, key=self.image_key)
        except Exception:
            pass


# ─── User ─────────────────────────────────────────────────────────────────────
# users are a mirror of the oauth provider data to keep things in sync


class UserBase(SQLModel):
    email: str = Field(unique=True, index=True, max_length=255)
    name: str = Field(max_length=255)
    picture: str | None = None
    balance: float = Field(default=10, sa_column_kwargs={"server_default": text("10")})


class User(UserBase, CreatedUpdatedAtMixin, table=True):
    """Mirrors a Supabase `auth.users` row.

    `id` is not auto-generated — it is set from the JWT `sub` claim on first
    login via `upsert_from_jwt`.
    """

    id: uuid.UUID = Field(primary_key=True)

    properties: list[Property] = Relationship(back_populates="owner")
    generation_jobs: list[GenerationJob] = Relationship(back_populates="submitter")
    shared_properties: list[PropertyShare] = Relationship(back_populates="shared_with")

    def to_response(self) -> UserResponse:
        return UserResponse(
            id=self.id,
            email=self.email,
            name=self.name,
            picture=self.picture,
            balance=self.balance,
            created_at=self.created_at,
        )


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    picture: str | None
    balance: float
    created_at: datetime


# ─── Property ────────────────────────────────────────────────────────────────────
# A property is the container of rooms. It is owned by a user


class PropertyBase(SQLModel):
    description: str | None = Field(default=None)
    address: str | None = Field(default=None, max_length=500)


class PropertyUpdate(PropertyBase):
    name: str | None = Field(default=None, max_length=255)
    public: bool | None = None


class PropertyCreate(PropertyBase):
    name: str = Field(max_length=255)
    public: bool = False


class Property(PropertyCreate, UUIDModel, CreatedUpdatedAtMixin, table=True):
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    owner: User = Relationship(back_populates="properties")
    rooms: list[Room] = Relationship(back_populates="property")
    shares: list[PropertyShare] = Relationship(back_populates="property")

    async def to_response(self) -> PropertyResponse:
        return PropertyResponse(
            id=self.id,
            name=self.name,
            description=self.description,
            address=self.address,
            public=self.public,
            owner_id=self.owner_id,
            created_at=self.created_at,
            updated_at=self.updated_at,
            rooms=await asyncio.gather(*[room.to_response() for room in self.rooms]),
        )


class PropertyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    address: str | None
    public: bool
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None
    rooms: list[RoomResponse]


# ─── PropertyShare ────────────────────────────────────────────────────────────
# Allow users to share properties with others


class PropertyShareBase(BaseModel):
    """Schema used to share a property with another user"""

    model_config = ConfigDict(from_attributes=True)

    property_id: uuid.UUID
    shared_with_id: uuid.UUID


class PropertyShareCreate(PropertyShareBase):
    """Data needed to create a property share"""

    pass


class PropertyShareUpdate(PropertyShareBase):
    """Data needed to update a property share"""

    pass


class PropertyShare(PropertyShareBase, UUIDModel, CreatedUpdatedAtMixin, table=True):
    __table_args__ = (UniqueConstraint("property_id", "shared_with_id"),)

    property_id: uuid.UUID = Field(foreign_key="property.id", index=True)
    shared_with_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    property: Property = Relationship(back_populates="shares")
    shared_with: User = Relationship(back_populates="shared_properties")


# ─── Room ─────────────────────────────────────────────────────────────────────
# A room belongs to a property, and has a label; this is its unique identifier.
# Rooms are immutable when created - but their image can be uploaded multiple times.
# Delete a room will delete all its images.


class RoomBase(SQLModel):
    """Base data used across the room model"""

    label: str
    """What is the name of the room, should be unique in the property"""


class RoomUpdate(RoomBase):
    """Data needed to update a room"""

    image: UploadFile | None = None
    """The image of the room"""


class RoomCreate(RoomUpdate):
    """Data needed to create a room"""

    property_id: uuid.UUID
    """The property this room belongs to"""


class RoomDelete(RoomCreate):
    """Data needed to delete a room"""

    pass


class Room(RoomBase, UUIDModel, CreatedUpdatedAtMixin, FileStoreMixin, table=True):
    """
    Canonical Room model stored in the database.
    """

    __bucket__: str = SETTINGS.s3_bucket__rooms
    __table_args__ = (UniqueConstraint("property_id", "label"),)

    property_id: uuid.UUID = Field(foreign_key="property.id", index=True)
    label: str = Field(max_length=100)

    @property
    @override
    def _image_key_prefix(self):
        return f"rooms/{self.id}"

    property: Property = Relationship(back_populates="rooms")
    generation_jobs: list[GenerationJob] = Relationship(
        back_populates="room",
        sa_relationship_kwargs={"lazy": "selectin"},
    )

    async def to_response(self) -> RoomResponse:
        return RoomResponse(
            id=self.id,
            property_id=self.property_id,
            label=self.label,
            image_url=await self.get_image_url(),
            created_at=self.created_at,
            updated_at=self.updated_at,
            generation_jobs=await asyncio.gather(
                *[job.to_response() for job in self.generation_jobs]
            ),
        )


class RoomResponse(BaseModel):
    """Schema used in the API Response"""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    property_id: uuid.UUID
    label: str
    image_url: str | None
    created_at: datetime
    updated_at: datetime | None
    generation_jobs: list[GenerationJobResponse]


# ─── Generation job ───────────────────────────────────────────────────────────
# async style generation jobs
# these are the result of a combination of a Room and a DesignStyle


class GenerationJobBase(SQLModel):
    pass


class GenerationJobCreate(SQLModel):
    room_id: uuid.UUID
    original_job_id: uuid.UUID | None = None
    style: str
    extra_context: str | None = None


class GenerationJob(UUIDModel, CreatedUpdatedAtMixin, FileStoreMixin, table=True):
    __bucket__: str = SETTINGS.s3_bucket__rooms

    submitter_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    room_id: uuid.UUID = Field(foreign_key="room.id", index=True)
    original_job_id: uuid.UUID | None = Field(None, foreign_key="generationjob.id", index=True)
    style: str = Field(index=True)

    extra_context: str | None = None
    error_message: str | None = None
    completed_at: datetime | None = Field(default=None, sa_type=TIMESTAMP)

    # pydantic usage metrics
    # https://ai.pydantic.dev/api/usage
    llm_model: str | None = None
    llm_requests: int = 0
    llm_tool_calls: int = 0
    llm_input_tokens: int = 0
    llm_cache_write_tokens: int = 0
    llm_cache_read_tokens: int = 0
    llm_output_tokens: int = 0

    @property
    def llm_total_tokens(self) -> int:
        return self.llm_input_tokens + self.llm_output_tokens

    @property
    @override
    def _image_key_prefix(self):
        return f"generation-jobs/{self.room_id}/{self.style}/{self.id}"

    room: Room = Relationship(back_populates="generation_jobs")
    submitter: User = Relationship(back_populates="generation_jobs")
    # original_job: GenerationJob | None = Relationship(
    #     back_populates="derived_jobs",
    #     sa_relationship_kwargs={
    #         # Use strings that match the class name and attribute
    #         "foreign_keys": "GenerationJob.original_job_id",
    #         "remote_side": "GenerationJob.id",
    #     },
    # )
    # derived_jobs: list[GenerationJob] = Relationship(
    #     back_populates="original_job",
    #     sa_relationship_kwargs={"foreign_keys": "GenerationJob.original_job_id"},
    # )

    async def to_response(self) -> GenerationJobResponse:
        return GenerationJobResponse(
            id=self.id,
            room_id=self.room_id,
            style=self.style,
            image_url=await self.get_image_url() if self.completed_at else None,
            error_message=self.error_message,
            completed_at=self.completed_at,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class GenerationJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    room_id: uuid.UUID
    style: str
    image_url: str | None
    error_message: str | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime | None

    @computed_field
    @property
    def failed(self) -> bool:
        return self.error_message is not None


# ─── Design style ─────────────────────────────────────────────────────────────
# A design style is a hypotheical set of rooms that have particular characteristics
# that can be used to generate new rooms from property rooms.
# for now this is not a table and isnt user creatable

_STATIC_STYLES_DIR = Path(__file__).parent / "static" / "styles"


def _build_image_urls(slug: str) -> dict[str, str]:
    """Scans the static styles directory and returns {room_name: url} for the given slug."""
    style_dir = _STATIC_STYLES_DIR / slug
    if not style_dir.is_dir():
        return {}
    base = SETTINGS.api_base_url.rstrip("/")
    return {
        p.stem: f"{base}/static/styles/{slug}/{p.name}"
        for p in sorted(style_dir.iterdir())
        if p.suffix == ".webp"
    }


class DesignStyle(BaseModel):
    name: str
    slug: str
    description: str
    image_urls: dict[str, str]


BUILTIN_STYLES: list[DesignStyle] = [
    DesignStyle(
        name="Japandi",
        slug="japandi",
        description=(
            "A harmonious blend of Japanese minimalism and Scandinavian functionality. "
            "Neutral tones, natural materials (oak, rattan, linen), clean lines, and an "
            "emphasis on craftsmanship and negative space."
        ),
        image_urls=_build_image_urls("japandi"),
    ),
    DesignStyle(
        name="Industrial",
        slug="industrial",
        description=(
            "Raw, unfinished aesthetics inspired by urban lofts. Exposed brick, concrete, "
            "steel beams, Edison bulbs, and reclaimed wood. Dark palette with metallic accents."
        ),
        image_urls=_build_image_urls("industrial"),
    ),
    DesignStyle(
        name="Mid-Century Modern",
        slug="mid-century",
        description=(
            "1950s-60s American design: organic shapes, tapered legs, bold accent colours, "
            "and a mix of natural and manufactured materials. Think Eames chairs and sunburst clocks."
        ),
        image_urls=_build_image_urls("mid-century"),
    ),
    DesignStyle(
        name="Coastal",
        slug="coastal",
        description=(
            "Light, airy interiors evoking a beachside retreat. White and sand tones, "
            "weathered wood, wicker, jute, and ocean-blue accents. Natural light is central."
        ),
        image_urls=_build_image_urls("coastal"),
    ),
    DesignStyle(
        name="Maximalist",
        slug="maximalist",
        description=(
            "More is more. Layered patterns, rich jewel tones, eclectic art, global "
            "textiles, and abundant plants. Every surface tells a story."
        ),
        image_urls=_build_image_urls("maximalist"),
    ),
    DesignStyle(
        name="Biophilic",
        slug="biophilic",
        description=(
            "Design that brings nature indoors. Living walls, abundant propertyplants, natural "
            "stone, wood, water features, and large windows for natural light and views."
        ),
        image_urls=_build_image_urls("biophilic"),
    ),
]

BUILTIN_STYLES_KV = {style.name: style for style in BUILTIN_STYLES}


def get_metadata():
    return SQLModel.metadata
