import uuid
from datetime import UTC, datetime
from enum import StrEnum

import sqlalchemy as sa
from pydantic import BaseModel
from sqlmodel import Field, Relationship, SQLModel


def _now() -> datetime:
    return datetime.now(UTC)


class User(SQLModel, table=True):
    __tablename__ = "users"

    # ID matches Supabase auth.users.id (set from JWT `sub` claim)
    id: uuid.UUID = Field(primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    name: str = Field(max_length=255)
    picture: str | None = Field(default=None)
    created_at: datetime = Field(
        default_factory=_now,
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False),
    )

    houses: list[House] = Relationship(back_populates="owner")
    custom_styles: list[DesignStyle] = Relationship(back_populates="creator")


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    picture: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class House(SQLModel, table=True):
    __tablename__ = "houses"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=255)
    owner_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(
        default_factory=_now,
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_now,
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False),
    )

    owner: User = Relationship(back_populates="houses")
    rooms: list[Room] = Relationship(back_populates="house")


class Room(SQLModel, table=True):
    __tablename__ = "rooms"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    house_id: uuid.UUID = Field(foreign_key="houses.id", index=True)
    label: str = Field(default="Room", max_length=100)
    original_image_key: str = Field(max_length=500)  # S3 object key
    created_at: datetime = Field(
        default_factory=_now,
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False),
    )

    house: House = Relationship(back_populates="rooms")
    generation_jobs: list[GenerationJob] = Relationship(back_populates="room")


class HouseCreateRequest(BaseModel):
    name: str


class RoomResponse(BaseModel):
    id: uuid.UUID
    house_id: uuid.UUID
    label: str
    original_image_url: str  # presigned URL resolved by service
    created_at: datetime

    model_config = {"from_attributes": True}


class HouseResponse(BaseModel):
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    room_count: int = 0

    model_config = {"from_attributes": True}


class HouseDetailResponse(HouseResponse):
    rooms: list[RoomResponse] = []


class JobStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationJob(SQLModel, table=True):
    __tablename__ = "generation_jobs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    room_id: uuid.UUID = Field(foreign_key="rooms.id", index=True)
    style_id: uuid.UUID = Field(foreign_key="design_styles.id", index=True)
    status: JobStatus = Field(default=JobStatus.PENDING)
    result_image_key: str | None = Field(default=None, max_length=500)  # S3 key on success
    error_message: str | None = Field(default=None)
    created_at: datetime = Field(
        default_factory=_now,
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False),
    )
    completed_at: datetime | None = Field(
        default=None,
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=True),
    )

    room: Room = Relationship(back_populates="generation_jobs")
    style: DesignStyle = Relationship(back_populates="generation_jobs")


class GenerationRequest(BaseModel):
    house_id: uuid.UUID
    room_ids: list[uuid.UUID]
    style_ids: list[uuid.UUID]


class GenerationJobResponse(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    style_id: uuid.UUID
    status: JobStatus
    result_image_url: str | None  # presigned URL when completed
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class DesignStyle(SQLModel, table=True):
    __tablename__ = "design_styles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=100)
    description: str = Field(max_length=2000)
    preview_image_key: str | None = Field(
        default=None, max_length=500
    )  # S3 key or None for builtins
    is_builtin: bool = Field(default=False)
    creator_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)
    created_at: datetime = Field(
        default_factory=_now,
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False),
    )

    creator: User | None = Relationship(back_populates="custom_styles")
    generation_jobs: list[GenerationJob] = Relationship(back_populates="style")


class StyleCreateRequest(BaseModel):
    name: str
    description: str


class StyleResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    preview_image_url: str | None  # presigned URL
    is_builtin: bool
    creator_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


def get_metadata():
    return SQLModel.metadata
