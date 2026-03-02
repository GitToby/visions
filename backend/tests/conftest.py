import uuid

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.core.db import get_session
from visions.core.security import get_current_user
from visions.main import app
from visions.models import User

TEST_DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/visions_test"

TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@pytest_asyncio.fixture(scope="session")
async def engine():
    _engine = create_async_engine(TEST_DB_URL, echo=False)
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield _engine
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await _engine.dispose()


@pytest_asyncio.fixture()
async def db(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture()
def test_user() -> User:
    return User(
        id=TEST_USER_ID,
        email="test@example.com",
        name="Test User",
    )


@pytest_asyncio.fixture()
async def client(db: AsyncSession, test_user: User) -> AsyncClient:
    """HTTP test client with DB override and auth stub."""

    async def override_session():
        yield db

    async def override_current_user():
        return test_user

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = override_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
