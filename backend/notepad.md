--- generation_service.py
"""Orchestrates batch generation jobs: room x style → Gemini → Supabase Storage."""

import asyncio
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from io import BytesIO

from fastapi import HTTPException, status
from loguru import logger
from pydantic_ai.messages import ImageUrl
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.core.config import SETTINGS
from visions.core.db import async_session_factory
from visions.models import (
    BUILTIN_STYLES_KV,
    GenerationJob,
    GenerationJobCreate,
    Room,
    User,
)
from visions.services import ai


async def get_many(
    db: AsyncSession,
    *,
    caller_id: uuid.UUID | None,
    property_id: uuid.UUID | None = None,
    filter: list[uuid.UUID] | None = None,
) -> Sequence[GenerationJob]:
    """List generation jobs for a property or all jobs for a user."""
    logger.debug("Listing generation jobs | property_id={} caller_id={}", property_id, caller_id)
    q = select(GenerationJob)
    if caller_id:
        q = q.where(GenerationJob.submitter_id == caller_id)

    if property_id:
        q = q.join(Room).where(Room.property_id == property_id)

    if filter:
        q = q.where(GenerationJob.id.in_(filter))  # pyright: ignore[reportAttributeAccessIssue] # pyrefly: ignore[reportAttributeAccessIssue,missing-attribute]

    result = await db.exec(q)
    return result.all()


async def get(
    db: AsyncSession, job_id: uuid.UUID, caller_id: uuid.UUID | None
) -> GenerationJob | None:
    """Fetch a specific generation job. Optionally pass a caller_id to
    ensuring the caller has access."""
    logger.debug("Fetching generation job | job_id={} caller_id={}", job_id, caller_id)
    q = select(GenerationJob).where(GenerationJob.id == job_id)
    if caller_id:
        q = q.where(GenerationJob.submitter_id == caller_id)
    result = await db.exec(q)
    return result.first()


async def get_or_404(db: AsyncSession, job_id: uuid.UUID, caller_id: uuid.UUID) -> GenerationJob:
    job = await get(db, job_id, caller_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Generation job not found"
        )
    return job


async def create_many(
    db: AsyncSession, *, data: list[GenerationJobCreate], caller: User
) -> list[GenerationJob]:
    jobs = [
        GenerationJob(
            room_id=job.room_id,
            original_job_id=job.original_job_id,
            style=job.style,
            submitter_id=caller.id,
            extra_context=job.extra_context,
        )
        for job in data
    ]
    db.add_all(jobs)
    db.add(caller)
    caller.balance -= SETTINGS.generation_cost * len(jobs)
    await db.commit()
    await db.refresh(caller)
    for job in jobs:
        await db.refresh(job)
    logger.debug("Jobs created | job_ids={}", [job.id for job in jobs])
    return jobs


async def submit_jobs(job_ids: list[uuid.UUID]):
    """Run a series of generation jobs in their own DB session. Safe to call from a background task."""
    async with async_session_factory() as db:
        jobs = await get_many(db, caller_id=None, filter=job_ids)
        missing_jobs = set(job_ids) - {j.id for j in jobs}
        if missing_jobs:
            logger.warning("Job not found | job_ids={}", missing_jobs)

        jobs = await asyncio.gather(*[_submit_job(db, job) for job in jobs])
        await db.commit()
        return jobs


async def _submit_job(db: AsyncSession, job: GenerationJob):
    logger.debug("Submitting job | job_id={} room_id={} style={}", job.id, job.room_id, job.style)
    job_id = job.id
    try:
        room = await db.get(Room, job.room_id)
        if room is None:
            raise ValueError(f"Room {job.room_id} not found")

        if job.original_job_id:
            original_job = await get(db, job.original_job_id, caller_id=None)
            if original_job is None:
                raise ValueError(f"Original job {job.original_job_id} not found, links broken.")

            logger.debug(
                "Original job found | job_id={} room_id={}",
                job.original_job_id,
                original_job.room_id,
            )
            img_url = await original_job.get_image_url()
        else:
            img_url = await room.get_image_url()

        if not img_url:
            raise ValueError(f"Room {job.room_id} has no image URL")

        if job.style not in BUILTIN_STYLES_KV:
            raise ValueError(f"Unknown style: {job.style!r}")

        img_url_ = ImageUrl(url=img_url)
        style = BUILTIN_STYLES_KV[job.style]
        logger.debug(
            "Creating prompt | job_id={} room_id={} style={} img_url={}",
            job_id,
            job.room_id,
            job.style,
            img_url,
        )
        prompt = ai.system_prompt(style.name, style.description, extra_context=job.extra_context)

        # https://ai.pydantic.dev/input/
        resp = await ai.agent.run([prompt, img_url_])
        await job.upload_image(BytesIO(resp.output.data))
        logger.debug(
            "Upload completed | job_id={} room_id={} style={}", job_id, job.room_id, job.style
        )

        job.completed_at = datetime.now(UTC)
        job.error_message = None

        usage = resp.usage()
        job.llm_model = ai.model.model_id
        job.llm_requests = usage.requests
        job.llm_tool_calls = usage.tool_calls
        job.llm_input_tokens = usage.input_tokens
        job.llm_cache_write_tokens = usage.cache_write_tokens
        job.llm_cache_read_tokens = usage.cache_read_tokens
        job.llm_output_tokens = usage.output_tokens

    except Exception as exc:
        logger.exception("Job failed | job_id={} error={}", job_id, exc)
        submitter = job.submitter
        submitter.balance += 1
        job.error_message = str(exc)

    return job


async def main_genjob_rec():
    q = (
        select(GenerationJob)
        .where(
            GenerationJob.completed_at == None,  # noqa E711
            GenerationJob.error_message == None,  # noqa E711
        )
        .order_by(GenerationJob.created_at)  # pyright: ignore[reportArgumentType] # pyrefly: ignore[bad-argument-type]
    )
    async with async_session_factory() as session:
        result = await session.exec(q)
        job_ids = [job.id for job in result.all()]

    await submit_jobs(job_ids)
    logger.info("Generation job rec complete | job_ids={}", job_ids)


--- conftext.py
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
def user_id() -> uuid.UUID:
    return uuid.uuid4()


@pytest.fixture
def test_user(user_id: uuid.UUID) -> User:
    return User(
        id=user_id,
        email="test@example.com",
        name="Test User",
        picture=None,
    )


--- 

Using the above code, implement the following stub. When creating ORM Objects  If more fixtured are needed, create them alongside the test.

@pytest.mark.asyncio
async def test_create_fails_on_bad_style(mock_db_session: AsyncSession, test_user: User): ...

