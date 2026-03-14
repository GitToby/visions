"""Tests for the generation service and API endpoints."""

import asyncio
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from pydantic_ai import ImageUrl
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.core.config import SETTINGS
from visions.core.exception import VisionsApiException
from visions.models import (
    BUILTIN_STYLES_KV,
    GenerationJob,
    GenerationJobCreate,
    PropertyCreate,
    Room,
    RoomCreate,
    User,
)
from visions.services import generation as generation_service
from visions.services import property as property_service
from visions.services import room as room_service


@pytest.mark.asyncio
async def test_get_many_returns_empty_when_no_jobs(mock_db_session: AsyncSession):
    jobs = await generation_service.get_many(
        mock_db_session, caller_id=uuid.uuid4(), property_id=uuid.uuid4()
    )
    assert jobs == []


@pytest.mark.asyncio
async def test_get_many_returns_after_create_many(
    mock_db_session: AsyncSession, test_user: User, test_room: Room
):
    jobs = [
        GenerationJobCreate(room_id=test_room.id, style="Japandi"),
        GenerationJobCreate(room_id=test_room.id, style="Maximalist"),
    ]
    jobs = await generation_service.create_many(mock_db_session, caller=test_user, data=jobs)
    assert len(jobs) == 2
    assert jobs[0].room_id == test_room.id
    assert jobs[0].style == "Japandi"
    assert jobs[1].room_id == test_room.id
    assert jobs[1].style == "Maximalist"


@pytest.mark.asyncio
async def test_create_fails_on_bad_style(
    mock_db_session: AsyncSession, test_user: User, test_room: Room
):
    # 1. Setup: Ensure user is in the session and has balance
    initial_balance = 10
    test_user.balance = initial_balance
    mock_db_session.add(test_user)
    await mock_db_session.commit()

    # 2. Create a job with an invalid style
    bad_style = "non_existent_style_123"
    job_data = [
        GenerationJobCreate(
            room_id=test_room.id, style=bad_style, extra_context="Make it look cool"
        )
    ]

    # create_many handles the DB insertion and initial charge
    jobs = await generation_service.create_many(mock_db_session, data=job_data, caller=test_user)
    job = jobs[0]

    # 3. Execute: Attempt to submit the job (where validation happens)
    # Note: _submit_job refreshes/updates the job object internally
    processed_job = await generation_service._submit_job(mock_db_session, job)
    await mock_db_session.commit()

    # 4. Assertions
    # The job should have an error message about the style
    assert processed_job.error_message is not None
    assert f"Unknown style: {bad_style!r}" in processed_job.error_message

    # The submitter (test_user) should have been refunded (+1)
    # initial_balance - cost (e.g. 1) + refund (1) = initial_balance
    await mock_db_session.refresh(test_user)
    assert test_user.balance == initial_balance


@pytest.mark.asyncio
async def test_get_many_filter(mock_db_session: AsyncSession, test_user: User, test_room: Room):
    """Verify that the 'filter' argument correctly restricts results to specific UUIDs."""

    # 1. Prepare data for multiple jobs
    job_data = [
        GenerationJobCreate(room_id=test_room.id, style="japandi"),
        GenerationJobCreate(room_id=test_room.id, style="industrial"),
        GenerationJobCreate(room_id=test_room.id, style="coastal"),
    ]

    # 2. Use create_many to persist them
    created_jobs = await generation_service.create_many(
        db=mock_db_session, data=job_data, caller=test_user
    )
    await mock_db_session.commit()

    # 3. Pick a subset of IDs to filter by (e.g., the first two)
    target_ids = [created_jobs[0].id, created_jobs[1].id]
    excluded_id = created_jobs[2].id

    # 4. Execute the "get_many" logic
    results = await generation_service.get_many(
        mock_db_session, job_ids=target_ids, caller_id=test_user.id
    )

    # 5. Assertions
    assert len(results) == 2
    result_ids = [job.id for job in results]

    for job_id in target_ids:
        assert job_id in result_ids

    assert excluded_id not in result_ids

    # Verify the user balance was actually deducted correctly by create_many
    await mock_db_session.refresh(test_user)
    expected_balance = 10 - (SETTINGS.generation_cost * len(job_data))
    assert test_user.balance == expected_balance


@pytest.mark.asyncio
async def test_get_many_unauthorized_access(
    mock_db_session: AsyncSession, test_user: User, test_room: Room
):
    """Ensure a user cannot see jobs submitted by a different user."""

    # 1. Create a "Stranger" user with their own property and room
    stranger = User(id=uuid.uuid4(), email="stranger@example.com", name="Stranger")
    mock_db_session.add(stranger)
    await mock_db_session.commit()

    stranger_property = await property_service.create(
        mock_db_session,
        owner_id=stranger.id,
        data=PropertyCreate(name="stranger property", description=None, address=None),
    )
    stranger_room = await room_service.create(
        mock_db_session,
        caller_id=stranger.id,
        data=RoomCreate(label="Stranger Room", property_id=stranger_property.id),
    )

    # 2. Create a job belonging to the Stranger using their own room
    stranger_job_data = [GenerationJobCreate(room_id=stranger_room.id, style="japandi")]
    stranger_jobs = await generation_service.create_many(
        db=mock_db_session, data=stranger_job_data, caller=stranger
    )
    stranger_job_id = stranger_jobs[0].id

    # 3. Attempt to fetch jobs using the 'test_user' — they should not see stranger's job
    results = await generation_service.get_many(
        mock_db_session, caller_id=test_user.id, job_ids=[stranger_job_id]
    )

    # 4. Assertions
    assert len(results) == 0
    assert stranger_job_id not in [j.id for j in results]


@pytest.mark.asyncio
async def test_get_or_404_raises_exception(mock_db_session: AsyncSession, test_user: User):
    """Ensure HTTPException is raised when a job ID does not exist for that user."""

    # 1. Create a random UUID that definitely doesn't exist in the DB
    non_existent_id = uuid.uuid4()

    # 2.1 assert that we should normally get None
    result = await generation_service.get(
        db=mock_db_session, job_id=non_existent_id, caller_id=test_user.id
    )
    assert result is None

    # 2. Assert that the service raises an HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await generation_service.get_or_404(
            db=mock_db_session, job_id=non_existent_id, caller_id=test_user.id
        )

    # 3. Verify the error details
    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail.lower()


### Room Access Checks
@pytest.mark.asyncio
async def test_create_many_raises_if_caller_lacks_room_access(
    mock_db_session: AsyncSession, test_user: User, test_room: Room
):
    """create_many must raise HTTP 400 if the caller doesn't own the room's property."""
    # Create a second user who does not own test_room
    stranger = User(id=uuid.uuid4(), email="stranger@example.com", name="Stranger")
    mock_db_session.add(stranger)
    await mock_db_session.commit()

    job_data = [GenerationJobCreate(room_id=test_room.id, style="japandi")]

    with pytest.raises(VisionsApiException) as exc_info:
        await generation_service.create_many(mock_db_session, data=job_data, caller=stranger)

    assert exc_info.value.status_code == 400
    assert str(test_room.id) in exc_info.value.detail


@pytest.mark.asyncio
async def test_create_many_raises_for_nonexistent_room(
    mock_db_session: AsyncSession, test_user: User
):
    """create_many must raise HTTP 400 if the room does not exist at all."""
    room_id = uuid.uuid4()
    job_data = [GenerationJobCreate(room_id=room_id, style="japandi")]

    with pytest.raises(VisionsApiException) as exc_info:
        await generation_service.create_many(mock_db_session, data=job_data, caller=test_user)

    assert exc_info.value.status_code == 400
    assert str(room_id) in str(exc_info.value.detail)


### dry_run
@pytest.mark.asyncio
async def test_submit_job_dry_run_skips_ai(
    mock_db_session: AsyncSession,
    test_user: User,
    test_room: Room,
    mock_ai: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
):
    """With dry_run=True, _submit_job returns the job early without calling AI or uploading."""
    style_key = next(iter(BUILTIN_STYLES_KV.keys()))
    jobs = await generation_service.create_many(
        mock_db_session,
        data=[GenerationJobCreate(room_id=test_room.id, style=style_key)],
        caller=test_user,
    )
    job = jobs[0]

    mock_upload = AsyncMock(name="mock_upload")
    monkeypatch.setattr(GenerationJob, "upload_image", mock_upload)

    mock_get_image_url = AsyncMock(return_value="https://example.com/room.webp")
    monkeypatch.setattr(Room, "get_image_url", mock_get_image_url)

    result = await generation_service._submit_job(mock_db_session, job, dry_run=True)

    assert mock_ai.run.call_count == 0
    assert mock_upload.call_count == 0
    assert mock_get_image_url.call_count == 1
    assert result.completed_at is None
    assert result.error_message is None


@pytest.mark.asyncio
async def test_submit_job_dry_run_still_validates_style(
    mock_db_session: AsyncSession,
    test_user: User,
    test_room: Room,
    monkeypatch: pytest.MonkeyPatch,
):
    """dry_run=True does not bypass style validation — bad styles still set error_message."""
    bad_style = "nonexistent_style_xyz"
    jobs = await generation_service.create_many(
        mock_db_session,
        data=[GenerationJobCreate(room_id=test_room.id, style=bad_style)],
        caller=test_user,
    )
    job = jobs[0]

    monkeypatch.setattr(GenerationJob, "upload_image", AsyncMock())

    result = await generation_service._submit_job(mock_db_session, job, dry_run=True)

    assert result.error_message is not None
    assert f"Unknown style: {bad_style!r}" in result.error_message


### Financials & Constraints
@pytest.mark.asyncio
async def test_create_many_deducts_user_balance(
    mock_db_session: AsyncSession, test_user: User, test_room: Room
):
    """Verify that (balance - cost * len(jobs)) is calculated and persisted correctly."""

    # 1. Initial state setup
    initial_balance = 10.0
    test_user.balance = initial_balance
    mock_db_session.add(test_user)
    await mock_db_session.commit()

    # 2. Define the jobs to create
    job_data = [
        GenerationJobCreate(room_id=test_room.id, style="japandi"),
        GenerationJobCreate(room_id=test_room.id, style="industrial"),
    ]
    num_jobs = len(job_data)

    # 3. Execute creation logic
    # This calls the logic: caller.balance -= SETTINGS.generation_cost * len(jobs)
    await generation_service.create_many(db=mock_db_session, data=job_data, caller=test_user)

    # 4. Assertions
    # We must refresh the user from the DB to ensure the change was persisted
    await mock_db_session.refresh(test_user)

    expected_reduction = SETTINGS.generation_cost * num_jobs
    expected_balance = initial_balance - expected_reduction

    assert test_user.balance == expected_balance
    assert test_user.balance < initial_balance


@pytest.mark.skip
@pytest.mark.asyncio
async def test_create_many_insufficient_funds(mock_db_session: AsyncSession, test_user: User):
    """Test behavior when a user tries to create more jobs than their balance allows."""
    ...


@pytest.mark.asyncio
async def test_submit_job_success_updates_metadata(
    mock_db_session: AsyncSession,
    test_user: User,
    test_room: Room,
    mock_ai: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
):
    # 1. Setup: Ensure user and room exist in the DB
    # We set a high balance to cover the generation cost
    test_user.balance = 100
    mock_db_session.add(test_user)
    mock_db_session.add(test_room)
    await mock_db_session.commit()

    # 2. Create a Job using the service
    style_key = next(iter(BUILTIN_STYLES_KV.keys()))
    job_create = GenerationJobCreate(
        room_id=test_room.id, style=style_key, extra_context="Bright and airy"
    )

    # create_many handles the balance deduction and DB insertion
    jobs = await generation_service.create_many(
        mock_db_session, data=[job_create], caller=test_user
    )
    job = jobs[0]

    # 3. Mock the AI response and Image upload
    # Mocking the pydantic_ai Agent run result
    mock_usage = MagicMock()
    mock_usage.requests = 1
    mock_usage.tool_calls = 0
    mock_usage.input_tokens = 500
    mock_usage.cache_write_tokens = 0
    mock_usage.cache_read_tokens = 0
    mock_usage.output_tokens = 200

    mock_resp = AsyncMock()
    mock_resp.output.data = b"fake-image-bytes"
    mock_resp.usage = MagicMock(return_value=mock_usage)

    # 4. Execute the unit of work, patching where necessary
    mock_ai.run = AsyncMock(name="mock_run", return_value=mock_resp)
    mock_upload = AsyncMock(name="mock_upload")
    monkeypatch.setattr(GenerationJob, "upload_image", mock_upload)
    updated_job = await generation_service._submit_job(mock_db_session, job)

    # 5. Assertions
    assert updated_job.completed_at is not None
    assert isinstance(updated_job.completed_at, datetime)
    assert updated_job.error_message is None

    # Verify Metadata Mapping
    assert updated_job.llm_input_tokens == 500
    assert updated_job.llm_output_tokens == 200
    assert updated_job.llm_requests == 1

    # Verify side effects
    assert mock_upload.call_count == 1
    assert mock_ai.run.call_count == 1

    # verify user balance
    assert test_user.balance == 100 - SETTINGS.generation_cost


@pytest.mark.asyncio
async def test_submit_job_uses_original_job_image_if_provided(
    mock_db_session: AsyncSession,
    test_user: User,
    test_generation_job: GenerationJob,
    test_derived_generation_job: GenerationJob,
    mock_ai: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
):
    """Ensure that if original_job_id exists, the AI uses that image instead of the base Room image."""
    await mock_db_session.commit()

    mock_usage = MagicMock()
    mock_usage.requests = 1
    mock_usage.tool_calls = 0
    mock_usage.input_tokens = 500
    mock_usage.cache_write_tokens = 0
    mock_usage.cache_read_tokens = 0
    mock_usage.output_tokens = 200

    mock_resp = AsyncMock()
    mock_resp.output.data = b"fake-image-bytes"
    mock_resp.usage = MagicMock(return_value=mock_usage)

    # 4. Execute the unit of work, patching where necessary
    mock_ai.run = AsyncMock(name="mock_run", return_value=mock_resp)
    mock_upload = AsyncMock(name="mock_upload")
    monkeypatch.setattr(GenerationJob, "upload_image", mock_upload)
    _ = await generation_service._submit_job(mock_db_session, test_derived_generation_job)

    assert mock_ai.run.call_count == 1
    args, _ = mock_ai.run.call_args
    call_list = args[0]  # This is the [prompt, img_url_] list

    # Verify the second element is an ImageUrl containing the original job's URL
    assert isinstance(call_list[1], ImageUrl)
    # Assuming test_generation_job is the 'original' one
    expected_url = await test_generation_job.get_image_url()
    assert call_list[1].url == expected_url
    assert expected_url != await test_derived_generation_job.get_image_url()


@pytest.mark.asyncio
async def test_submit_job_room_not_found_error(mock_db_session: AsyncSession):
    """Verify error handling and error_message logging if a Job points to a non-existent Room."""
    ...


@pytest.mark.asyncio
async def test_submit_job_missing_image_url(mock_db_session: AsyncSession):
    """Ensure the job fails gracefully if both Room and OriginalJob have no valid image URL."""
    ...


### Error Handling & Recovery
@pytest.mark.asyncio
async def test_submit_job_failure_refunds_user(mock_db_session: AsyncSession, test_user: User):
    """Crucial: Verify that an Exception during _submit_job increments the user's balance back."""
    ...


@pytest.mark.asyncio
async def test_submit_job_ai_timeout_handling(mock_db_session: AsyncSession):
    """Verify the job marks itself with an error message if the AI agent times out."""
    ...


@pytest.mark.asyncio
async def test_submit_jobs_partial_failure_independence(mock_db_session: AsyncSession):
    """If one job in a batch fails, ensure the others in the asyncio.gather still complete."""
    ...


### Recovery Logic (main_genjob_rec)
@pytest.mark.asyncio
async def test_recovery_skips_completed_jobs(mock_db_session: AsyncSession):
    """Ensure the recovery query only picks up jobs where completed_at and error_message are None."""
    ...


@pytest.mark.asyncio
async def test_recovery_orders_by_creation_date(mock_db_session: AsyncSession):
    """Ensure the recovery worker processes older 'stuck' jobs first."""
    ...


### Integration & Concurrency
@pytest.mark.asyncio
async def test_submit_jobs_empty_list_does_nothing(mock_db_session: AsyncSession):
    """Ensure the service doesn't crash or attempt DB sessions when called with an empty list."""
    ...


@pytest.mark.asyncio
async def test_concurrent_job_submissions(mock_db_session: AsyncSession):
    """Simulate rapid-fire job submissions to check for race conditions in balance deduction."""
    ...


@pytest.mark.asyncio
async def test_upload_image_to_storage_integration(mock_db_session: AsyncSession):
    """Verify the interaction between the AI response data and the job's upload_image method."""
    ...


### ROOM_GENERATION_NOTIFICATIONS
@pytest.mark.asyncio
async def test_submit_jobs_notifies_subscribed_queue(
    mock_db_session: AsyncSession,
    test_user: User,
    test_room: Room,
    monkeypatch: pytest.MonkeyPatch,
):
    """submit_jobs puts the processed job into any queue registered for its room_id."""
    style_key = next(iter(BUILTIN_STYLES_KV.keys()))
    jobs = await generation_service.create_many(
        mock_db_session,
        data=[GenerationJobCreate(room_id=test_room.id, style=style_key)],
        caller=test_user,
    )
    job = jobs[0]

    monkeypatch.setattr(generation_service, "get_many", AsyncMock(return_value=[job]))
    monkeypatch.setattr(generation_service, "_submit_job", AsyncMock(return_value=job))

    q: asyncio.Queue[GenerationJob] = asyncio.Queue()
    generation_service.ROOM_GENERATION_NOTIFICATIONS[test_room.id] = q
    try:
        await generation_service.submit_jobs([job.id])
    finally:
        generation_service.ROOM_GENERATION_NOTIFICATIONS.pop(test_room.id, None)

    assert not q.empty()
    notified_job = q.get_nowait()
    assert notified_job.id == job.id
    assert notified_job.room_id == test_room.id


@pytest.mark.asyncio
async def test_submit_jobs_does_not_notify_unrelated_room(
    mock_db_session: AsyncSession,
    test_user: User,
    test_room: Room,
    monkeypatch: pytest.MonkeyPatch,
):
    """A queue registered for a different room_id should not receive notifications."""
    style_key = next(iter(BUILTIN_STYLES_KV.keys()))
    jobs = await generation_service.create_many(
        mock_db_session,
        data=[GenerationJobCreate(room_id=test_room.id, style=style_key)],
        caller=test_user,
    )
    job = jobs[0]

    monkeypatch.setattr(generation_service, "get_many", AsyncMock(return_value=[job]))
    monkeypatch.setattr(generation_service, "_submit_job", AsyncMock(return_value=job))

    other_room_id = uuid.uuid4()
    q: asyncio.Queue[GenerationJob] = asyncio.Queue()
    generation_service.ROOM_GENERATION_NOTIFICATIONS[other_room_id] = q
    try:
        await generation_service.submit_jobs([job.id])
    finally:
        generation_service.ROOM_GENERATION_NOTIFICATIONS.pop(other_room_id, None)

    assert q.empty()
