from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.core.config import SETTINGS

engine = create_async_engine(SETTINGS.database_url.get_secret_value(), echo=SETTINGS.debug)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession]:
    async with async_session_factory() as session:
        yield session


DBSession = Annotated[AsyncSession, Depends(get_session)]
