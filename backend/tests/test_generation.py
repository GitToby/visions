"""Tests for the generation service and API endpoints."""

import uuid

import pytest
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import GenerationJobCreate, Room, User
from visions.services import generation as generation_service


@pytest.mark.asyncio
async def test_get_many_returns_empty_when_no_jobs(mock_db_session: AsyncSession):
    jobs = await generation_service.get_many(
        mock_db_session, caller_id=uuid.uuid4(), property_id=uuid.uuid4()
    )
    assert jobs == []


@pytest.mark.asyncio
async def test_get_many_returns_after_create_many(mock_db_session: AsyncSession, test_user: User):
    room_id = uuid.uuid4()
    jobs = [
        GenerationJobCreate(room_id=room_id, style="Japandi"),
        GenerationJobCreate(room_id=room_id, style="Maximalist"),
    ]
    jobs = await generation_service.create_many(mock_db_session, caller=test_user, data=jobs)
    assert len(jobs) == 2
    assert jobs[0].room_id == room_id
    assert jobs[0].style == "Japandi"
    assert jobs[1].room_id == room_id
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
async def test_get_many_filter_by_job_ids(mock_db_session: AsyncSession, test_user: User):
    """Verify that the 'filter' argument correctly restricts results to specific UUIDs."""
    ...


@pytest.mark.asyncio
async def test_get_many_unauthorized_access(mock_db_session: AsyncSession, test_user: User):
    """Ensure a user cannot see jobs submitted by a different user."""
    ...


@pytest.mark.asyncio
async def test_get_or_404_raises_exception(mock_db_session: AsyncSession, test_user: User):
    """Ensure HTTPException is raised when a job ID does not exist for that user."""
    ...


### Financials & Constraints
@pytest.mark.asyncio
async def test_create_many_deducts_user_balance(mock_db_session: AsyncSession, test_user: User):
    """Verify that (balance - cost * len(jobs)) is calculated and persisted correctly."""
    ...


@pytest.mark.asyncio
async def test_create_many_insufficient_funds(mock_db_session: AsyncSession, test_user: User):
    """Test behavior when a user tries to create more jobs than their balance allows."""
    ...


@pytest.mark.asyncio
async def test_create_with_invalid_style_fails(mock_db_session: AsyncSession, test_user: User):
    """Check that BUILTIN_STYLES_KV validation prevents invalid style strings from being saved."""
    ...


### Job Submission & AI Logic
@pytest.mark.asyncio
async def test_submit_job_success_updates_metadata(mock_db_session: AsyncSession):
    """Verify that token usage, model ID, and timestamps are saved after a successful AI run."""
    ...


@pytest.mark.asyncio
async def test_submit_job_uses_original_job_image_if_provided(mock_db_session: AsyncSession):
    """Ensure that if original_job_id exists, the AI uses that image instead of the base Room image."""
    ...


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
