import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict
from sqlalchemy import TIMESTAMP, text
from sqlalchemy.event import listens_for
from sqlmodel import Field, Relationship, SQLModel


def _now() -> datetime:
    return datetime.now(UTC)


@listens_for(SQLModel, "before_update")
def update_timestamp(_, __, target):
    target.updated_at = _now()


# ─── Mixins ───────────────────────────────────────────────────────────────────


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


# ─── User ─────────────────────────────────────────────────────────────────────


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
    custom_styles: list[DesignStyle] = Relationship(back_populates="creator")


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    picture: str | None
    created_at: datetime
    updated_at: datetime | None


# ─── House ────────────────────────────────────────────────────────────────────


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


class HouseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None
    room_count: int | None = Field(default=None, description="Number of rooms in the house")


# ─── Room ─────────────────────────────────────────────────────────────────────


class RoomBase(SQLModel):
    label: str = Field(default="Room", max_length=100)


class RoomCreate(RoomBase):
    house_id: uuid.UUID


class RoomUpdate(SQLModel):
    label: str | None = Field(default=None, max_length=100)


class Room(RoomBase, UUIDModel, CreatedUpdatedAtMixin, table=True):
    house_id: uuid.UUID = Field(foreign_key="house.id", index=True)
    original_image_key: str = Field(
        max_length=500,
        description="Supabase Storage object key for the uploaded room photo",
    )

    house: House = Relationship(back_populates="rooms")
    generation_jobs: list[GenerationJob] = Relationship(back_populates="room")


class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    house_id: uuid.UUID
    label: str
    original_image_key: str
    created_at: datetime
    updated_at: datetime | None


# ─── Generation job ───────────────────────────────────────────────────────────


class JobStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationRequest(BaseModel):
    """Triggers one generation job per (room, style) pair in the cartesian product."""

    house_id: uuid.UUID
    room_ids: list[uuid.UUID]
    style_ids: list[uuid.UUID]

    def create_jobs(self) -> list[GenerationJob]:
        """create all the generation jobs for each (room, style) pair."""
        return [
            GenerationJob(room_id=room_id, style_id=style_id)
            for room_id in self.room_ids
            for style_id in self.style_ids
        ]


class GenerationJob(UUIDModel, CreatedUpdatedAtMixin, table=True):
    room_id: uuid.UUID = Field(foreign_key="room.id", index=True)
    style_id: uuid.UUID = Field(foreign_key="designstyle.id", index=True)
    status: JobStatus = Field(default="pending")
    result_image_key: str | None = Field(
        default=None,
        max_length=500,
        description="Supabase Storage key populated on successful generation",
    )
    error_message: str | None = Field(default=None)
    completed_at: datetime | None = Field(default=None, sa_type=TIMESTAMP)

    room: Room = Relationship(back_populates="generation_jobs")
    style: DesignStyle = Relationship(back_populates="generation_jobs")


class GenerationJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    room_id: uuid.UUID
    style_id: uuid.UUID
    status: JobStatus
    result_image_key: str | None
    error_message: str | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime | None


# ─── Design style ─────────────────────────────────────────────────────────────


class DesignStyleBase(SQLModel):
    name: str = Field(max_length=100)
    description: str = Field(max_length=2000)


class DesignStyleCreate(DesignStyleBase):
    pass


class DesignStyleUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=2000)


class DesignStyle(DesignStyleBase, UUIDModel, CreatedUpdatedAtMixin, table=True):
    preview_image_key: str = Field(
        max_length=500,
        description="Supabase Storage key for user-uploaded previews; static path for built-ins",
    )
    is_builtin: bool = Field(default=False)
    creator_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="user.id",
        index=True,
        description="Null for built-in styles; set to the creating user's id for custom styles",
    )

    creator: User | None = Relationship(back_populates="custom_styles")
    generation_jobs: list[GenerationJob] = Relationship(back_populates="style")
    
    def to_response(self) -> DesignStyleResponse:
        return DesignStyleResponse(
            id=self.id,
            name=self.name,
            description=self.description,
            preview_image_key=self.preview_image_key,
            is_builtin=self.is_builtin,
            creator_id=self.creator_id,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class DesignStyleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str
    preview_image_key: str | None
    is_builtin: bool = False
    creator_id: uuid.UUID | None
    created_at: datetime | None = None
    updated_at: datetime | None = None


BUILTIN_STYLES: list[DesignStyle] = [
    DesignStyle(
        name="Japandi",
        is_builtin=True,
        description=(
            "A harmonious blend of Japanese minimalism and Scandinavian functionality. "
            "Neutral tones, natural materials (oak, rattan, linen), clean lines, and an "
            "emphasis on craftsmanship and negative space."
        ),
        preview_image_key="static/styles/japandi.svg",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    ),
    DesignStyle(
        name="Industrial",
        is_builtin=True,
        description=(
            "Raw, unfinished aesthetics inspired by urban lofts. Exposed brick, concrete, "
            "steel beams, Edison bulbs, and reclaimed wood. Dark palette with metallic accents."
        ),
        preview_image_key="static/styles/industrial.svg",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    ),
    DesignStyle(
        name="Mid-Century Modern",
        is_builtin=True,
        description=(
            "1950s-60s American design: organic shapes, tapered legs, bold accent colours, "
            "and a mix of natural and manufactured materials. Think Eames chairs and sunburst clocks."
        ),
        preview_image_key="static/styles/mid-century-modern.svg",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    ),
    DesignStyle(
        name="Coastal",
        is_builtin=True,
        description=(
            "Light, airy interiors evoking a beachside retreat. White and sand tones, "
            "weathered wood, wicker, jute, and ocean-blue accents. Natural light is central."
        ),
        preview_image_key="static/styles/coastal.svg",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    ),
    DesignStyle(
        name="Maximalist",
        is_builtin=True,
        description=(
            "More is more. Layered patterns, rich jewel tones, eclectic art, global "
            "textiles, and abundant plants. Every surface tells a story."
        ),
        preview_image_key="static/styles/maximalist.svg",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    ),
    DesignStyle(
        name="Biophilic",
        is_builtin=True,
        description=(
            "Design that brings nature indoors. Living walls, abundant houseplants, natural "
            "stone, wood, water features, and large windows for natural light and views."
        ),
        preview_image_key="static/styles/biophilic.svg",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    ),
]


def get_metadata():
    return SQLModel.metadata
