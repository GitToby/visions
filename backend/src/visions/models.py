import asyncio
import uuid
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from io import BytesIO
from typing import override

from fastapi import UploadFile
from PIL import Image
from pydantic import BaseModel, ConfigDict
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

        The result is of the post proccessed image file.
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
        if storage.file_exists(bucket=self.__bucket__, key=self.image_key):
            return storage.s3_presigned_url(bucket=self.__bucket__, key=self.image_key)
        return None

    async def upload_image(self, image: UploadFile) -> None:
        """Upload the image to S3"""
        # todo, take image, convert to .webp using pillow before upload

        with Image.open(image.file) as img:
            _bytes = BytesIO(img.tobytes())
            _image = UploadFile(file=_bytes, filename=self.image_key)
            storage.upload_file(_image, bucket=self.__bucket__, key=self.image_key)

    async def download_image(self, add_watermark: bool = False) -> bytes | None:
        """Returns the image file bytes to be used with a FileResponse"""
        try:
            return storage.download_file(bucket=self.__bucket__, key=self.image_key)
        except Exception:
            return None


# ─── User ─────────────────────────────────────────────────────────────────────
# users are a mirror of the oauth provider data to keep things in sync


class UserBase(SQLModel):
    email: str = Field(unique=True, index=True, max_length=255)
    name: str = Field(max_length=255)
    picture: str | None = Field(default=None)


class User(UserBase, CreatedUpdatedAtMixin, table=True):
    """Mirrors a Supabase `auth.users` row.

    `id` is not auto-generated — it is set from the JWT `sub` claim on first
    login via `upsert_from_jwt`.
    """

    id: uuid.UUID = Field(primary_key=True)

    houses: list[House] = Relationship(back_populates="owner")

    def to_response(self) -> UserResponse:
        return UserResponse(
            id=self.id,
            email=self.email,
            name=self.name,
            picture=self.picture,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    picture: str | None
    created_at: datetime
    updated_at: datetime | None


# ─── House ────────────────────────────────────────────────────────────────────
# A house is the container of rooms. It is owned by a user


class HouseBase(SQLModel):
    name: str = Field(max_length=255)


class HouseCreate(HouseBase):
    pass


class HouseUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)


class House(HouseBase, UUIDModel, CreatedUpdatedAtMixin, table=True):
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    owner: User = Relationship(back_populates="houses")
    rooms: list[Room] = Relationship(back_populates="house")

    async def to_response(self) -> HouseResponse:
        return HouseResponse(
            id=self.id,
            name=self.name,
            owner_id=self.owner_id,
            created_at=self.created_at,
            updated_at=self.updated_at,
            rooms=await asyncio.gather(*[room.to_response() for room in self.rooms]),
        )


class HouseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None
    rooms: list[RoomResponse]


# ─── Room ─────────────────────────────────────────────────────────────────────
# A room belongs to a house, and has a label; this is its unique identifier.
# Rooms are immutible when created - but their image can be uploaded multiple times.
# Delete a room will delete all its images.


class RoomBase(SQLModel):
    """Base data used across the room model"""

    label: str
    """What is the name of the room, should be unique in the house"""


class RoomUpdate(RoomBase):
    """Data needed to update a room"""

    image: UploadFile
    """The image of the room"""


class RoomCreate(RoomUpdate):
    """Data needed to create a room"""

    house_id: uuid.UUID
    """The house this room belongs to"""


class RoomDelete(RoomCreate):
    """Data needed to delete a room"""

    pass


class Room(RoomBase, UUIDModel, CreatedUpdatedAtMixin, FileStoreMixin, table=True):
    """
    Canonical Room model stored in the database.
    """

    __bucket__: str = SETTINGS.s3_bucket__rooms
    __table_args__ = (UniqueConstraint("house_id", "label"),)

    house_id: uuid.UUID = Field(foreign_key="house.id", index=True)
    label: str = Field(max_length=100)

    @property
    @override
    def _image_key_prefix(self):
        return f"rooms/{self.id}/{self.label}"

    house: House = Relationship(back_populates="rooms")
    generation_jobs: list[GenerationJob] = Relationship(back_populates="room")

    async def to_response(self) -> RoomResponse:
        return RoomResponse(
            id=self.id,
            house_id=self.house_id,
            label=self.label,
            image_url=await self.get_image_url(),
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class RoomResponse(BaseModel):
    """Schema used in the API Response"""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    house_id: uuid.UUID
    label: str
    image_url: str | None
    created_at: datetime
    updated_at: datetime | None


# ─── Generation job ───────────────────────────────────────────────────────────
# async style generation jobs
# these are the result of a combination of a Room and a DesignStyle


class GenerationJobBase(SQLModel):
    pass


class GenerationJobCreate(SQLModel):
    room_id: uuid.UUID
    style: str


class GenerationJob(UUIDModel, CreatedUpdatedAtMixin, FileStoreMixin, table=True):
    __bucket__: str = SETTINGS.s3_bucket__rooms

    submitter_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    room_id: uuid.UUID = Field(foreign_key="room.id", index=True)
    style: str = Field(index=True)

    error_message: str | None = None
    completed_at: datetime | None = Field(default=None, sa_type=TIMESTAMP)

    @property
    @override
    def _image_key_prefix(self):
        return f"generation-jobs/{self.room_id}/{self.style}"

    room: Room = Relationship(back_populates="generation_jobs")

    def to_response(self) -> GenerationJobResponse:
        return GenerationJobResponse(
            id=self.id,
            room_id=self.room_id,
            style=self.style,
            image_key=self.image_key,
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
    image_key: str | None
    error_message: str | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime | None


# ─── Design style ─────────────────────────────────────────────────────────────
# A design style is a hypotheical set of rooms that have particular characteristics
# that can be used to generate new rooms from house rooms.
# for now this is not a table and isnt user creatable


class DesignStyle(BaseModel):
    name: str
    description: str


BUILTIN_STYLES: list[DesignStyle] = [
    DesignStyle(
        name="Japandi",
        description=(
            "A harmonious blend of Japanese minimalism and Scandinavian functionality. "
            "Neutral tones, natural materials (oak, rattan, linen), clean lines, and an "
            "emphasis on craftsmanship and negative space."
        ),
    ),
    DesignStyle(
        name="Industrial",
        description=(
            "Raw, unfinished aesthetics inspired by urban lofts. Exposed brick, concrete, "
            "steel beams, Edison bulbs, and reclaimed wood. Dark palette with metallic accents."
        ),
    ),
    DesignStyle(
        name="Mid-Century Modern",
        description=(
            "1950s-60s American design: organic shapes, tapered legs, bold accent colours, "
            "and a mix of natural and manufactured materials. Think Eames chairs and sunburst clocks."
        ),
    ),
    DesignStyle(
        name="Coastal",
        description=(
            "Light, airy interiors evoking a beachside retreat. White and sand tones, "
            "weathered wood, wicker, jute, and ocean-blue accents. Natural light is central."
        ),
    ),
    DesignStyle(
        name="Maximalist",
        description=(
            "More is more. Layered patterns, rich jewel tones, eclectic art, global "
            "textiles, and abundant plants. Every surface tells a story."
        ),
    ),
    DesignStyle(
        name="Biophilic",
        description=(
            "Design that brings nature indoors. Living walls, abundant houseplants, natural "
            "stone, wood, water features, and large windows for natural light and views."
        ),
    ),
]

BUILTIN_STYLES_KV = {style.name: style for style in BUILTIN_STYLES}


def get_metadata():
    return SQLModel.metadata
