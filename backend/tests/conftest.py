import os
import random
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel import StaticPool
from sqlmodel.ext.asyncio.session import AsyncSession

# for general randomness seeds (uuid4)
random.seed(1)

# Set required env vars before any visions module imports trigger Settings()
os.environ.setdefault("DATABASE_PASSWORD", "test")
os.environ.setdefault("SUPABASE_SECRET_KEY", "test")
os.environ.setdefault("S3_SECRET_ACCESS_KEY", "test")
os.environ.setdefault("GEMINI_API_KEY", "test")

# visions.* must be imported after env vars are set

from visions.core.config import SETTINGS  # noqa  E402
from visions.core.db import get_session  # noqa  E402
from visions.core.security import get_current_user  # noqa  E402
from visions.main import app  # noqa  E402
from visions.models import (  # noqa  E402
    GenerationJob,
    GenerationJobCreate,
    Property,
    PropertyCreate,
    Room,
    RoomCreate,
    User,
    get_metadata,
)
from visions.services import property as property_service  # noqa  E402
from visions.services import room as room_service  # noqa  E402
from visions.services import generation as generation_service  # noqa  E402
from visions.services import storage as storage_service  # noqa  E402
from visions.services import ai as ai_service  # noqa  E402

RESOURCES_DIR = Path(__file__).parent / "resources"


@pytest.fixture(autouse=True)
def mock_supabase(monkeypatch: pytest.MonkeyPatch):
    mock_bucket = MagicMock()

    def _create_signed_url(*args, **kwargs):
        # create a consistant signed URL based on the args
        return {"signedURL": f"https://example.com/{args}/{kwargs}"}

    mock_bucket.create_signed_url = AsyncMock(side_effect=_create_signed_url)
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    monkeypatch.setattr(storage_service, "_supabase_client", mock_client)
    return mock_client


@pytest.fixture(autouse=True)
def mock_s3(monkeypatch: pytest.MonkeyPatch):
    mock = MagicMock(name="mock_s3")
    monkeypatch.setattr(storage_service, "_s3", mock)
    return mock


@pytest.fixture(autouse=True)
def mock_ai(monkeypatch: pytest.MonkeyPatch):
    mock_agent = MagicMock(name="mock_agent")
    mock_agent.run = AsyncMock()
    monkeypatch.setattr(ai_service, "agent", mock_agent)
    return mock_agent


@pytest.fixture
async def mock_db_session():
    # All sessions will have a fresh in-memory database
    engine = create_async_engine(
        "sqlite+aiosqlite://",  # :memory: connection
        echo=SETTINGS.debug,
        #
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # 1. Initialize schema
    async with engine.begin() as conn:
        await conn.run_sync(get_metadata().create_all)

    # 2. Setup session factory
    async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # 3. Use the session and ensure cleanup
    async with async_session_factory() as session:
        yield session

    # 4. Explicitly dispose of the engine after the session is closed
    await engine.dispose()


@pytest.fixture
async def test_user(mock_db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        name="Test User",
        picture=None,
    )
    mock_db_session.add(user)
    await mock_db_session.commit()
    await mock_db_session.refresh(user)

    return user


@pytest.fixture
async def test_property(mock_db_session: AsyncSession, test_user: User) -> Property:
    return await property_service.create(
        mock_db_session,
        owner_id=test_user.id,
        data=PropertyCreate(
            name="test property",
            description=None,
            address=None,
        ),
    )


@pytest.fixture
async def test_room(
    mock_db_session: AsyncSession, test_user: User, test_property: Property
) -> Room:
    return await room_service.create(
        mock_db_session,
        caller_id=test_user.id,
        data=RoomCreate(
            label="Test Room",
            property_id=test_property.id,
        ),
    )


@pytest.fixture
async def test_generation_job(
    mock_db_session: AsyncSession, test_user: User, test_room: Room
) -> GenerationJob:
    jobs = await generation_service.create_many(
        mock_db_session,
        caller=test_user,
        data=[
            GenerationJobCreate(
                room_id=test_room.id,
                style="Japandi",
                original_job_id=None,
            )
        ],
    )
    return jobs[0]


@pytest.fixture
async def test_derived_generation_job(
    mock_db_session: AsyncSession, test_user: User, test_generation_job: GenerationJob
) -> GenerationJob:
    jobs = await generation_service.create_many(
        mock_db_session,
        caller=test_user,
        data=[
            GenerationJobCreate(
                room_id=test_generation_job.room_id,
                style="Industrial",
                original_job_id=test_generation_job.id,
            )
        ],
    )
    return jobs[0]


@pytest.fixture
async def test_client(test_user: User, mock_db_session: AsyncMock):
    async def _override_get_session():
        yield mock_db_session

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_current_user] = lambda: test_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
