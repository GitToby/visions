"""Tests for the property service."""

import uuid

import pytest
from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from visions.models import Property, PropertyCreate, PropertyUpdate, RoomCreate, User
from visions.services import property as property_service
from visions.services import room as room_service

# ─── get_many ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_many_returns_empty_for_new_user(mock_db_session: AsyncSession, test_user: User):
    """A freshly created user with no properties should receive an empty list."""
    # Act
    results = await property_service.get_many(
        mock_db_session, caller_id=test_user.id, include_public=False
    )

    # Assert
    assert list(results) == []


@pytest.mark.asyncio
async def test_get_many_returns_owned_properties(
    mock_db_session: AsyncSession, test_user: User, test_property: Property
):
    """A user should see their own properties when calling get_many with their caller_id."""
    # Act
    results = await property_service.get_many(
        mock_db_session, caller_id=test_user.id, include_public=False
    )

    # Assert
    assert len(results) == 1
    assert results[0].id == test_property.id


@pytest.mark.asyncio
async def test_get_many_excludes_other_users_made_private_properties(
    mock_db_session: AsyncSession, test_user: User
):
    """A property that was public but made private should not appear in another user's results."""
    # Arrange
    other_user = User(id=uuid.uuid4(), email="other@example.com", name="Other User")
    mock_db_session.add(other_user)
    await mock_db_session.commit()
    prop = await property_service.create(
        mock_db_session,
        owner_id=other_user.id,
        data=PropertyCreate(name="Was Public"),
    )

    # Act 1 - private property by default
    results = await property_service.get_many(
        mock_db_session, caller_id=test_user.id, include_public=True
    )

    # Assert
    assert list(results) == []

    await property_service.update(
        mock_db_session,
        property=prop,
        data=PropertyUpdate(public=True),
    )

    # Act 2 - now its public it should appear
    results = await property_service.get_many(
        mock_db_session, caller_id=test_user.id, include_public=True
    )

    # Assert
    assert list(results) == [prop]


@pytest.mark.asyncio
async def test_get_many_includes_other_users_public_properties(
    mock_db_session: AsyncSession, test_user: User
):
    """Properties owned by another user that are public should appear in results."""
    # Arrange
    other_user = User(id=uuid.uuid4(), email="other@example.com", name="Other User")
    mock_db_session.add(other_user)
    await mock_db_session.commit()
    public_prop = await property_service.create(
        mock_db_session,
        owner_id=other_user.id,
        data=PropertyCreate(name="Other Public", public=True),
    )
    private_prop = await property_service.create(
        mock_db_session,
        owner_id=other_user.id,
        data=PropertyCreate(name="Other Private", public=False),
    )

    # Act
    results = await property_service.get_many(
        mock_db_session, caller_id=test_user.id, include_public=True
    )

    # Assert
    results = list(results)
    assert len(results) == 1
    assert public_prop in results
    assert private_prop not in results


@pytest.mark.asyncio
async def test_get_many_excludes_public_when_flag_false(
    mock_db_session: AsyncSession, test_user: User
):
    """When include_public=False, public properties from other owners should not appear."""
    # Arrange
    other_user = User(id=uuid.uuid4(), email="other@example.com", name="Other User")
    mock_db_session.add(other_user)
    await mock_db_session.commit()
    await property_service.create(
        mock_db_session,
        owner_id=other_user.id,
        data=PropertyCreate(name="Public Prop", public=True),
    )

    # Act
    results = await property_service.get_many(
        mock_db_session, caller_id=test_user.id, include_public=False
    )

    # Assert
    assert list(results) == []


@pytest.mark.asyncio
async def test_get_many_filter_by_property_ids(mock_db_session: AsyncSession, test_user: User):
    """Passing property_ids should restrict results to only those IDs."""
    # Arrange
    prop_a = await property_service.create(
        mock_db_session,
        owner_id=test_user.id,
        data=PropertyCreate(name="Prop A"),
    )
    await property_service.create(
        mock_db_session,
        owner_id=test_user.id,
        data=PropertyCreate(name="Prop B"),
    )

    # Act
    results = await property_service.get_many(
        mock_db_session,
        caller_id=test_user.id,
        property_ids=[prop_a.id],
        include_public=False,
    )

    # Assert
    assert len(results) == 1
    assert results[0].id == prop_a.id


@pytest.mark.asyncio
async def test_get_many_respects_limit(mock_db_session: AsyncSession, test_user: User):
    """The limit parameter should cap the number of returned properties."""
    # Arrange
    for i in range(3):
        await property_service.create(
            mock_db_session,
            owner_id=test_user.id,
            data=PropertyCreate(name=f"Property {i}"),
        )

    # Act
    results = await property_service.get_many(
        mock_db_session, caller_id=test_user.id, include_public=False, limit=2
    )

    # Assert
    assert len(results) == 2


# ─── get ──────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_returns_property_for_owner(
    mock_db_session: AsyncSession, test_user: User, test_property: Property
):
    """Owner can fetch their own property by ID."""
    # Act
    result = await property_service.get(
        mock_db_session, property_id=test_property.id, caller_id=test_user.id
    )

    # Assert
    assert result is not None
    assert result.id == test_property.id


@pytest.mark.asyncio
async def test_get_returns_none_for_unknown_id(mock_db_session: AsyncSession, test_user: User):
    """Returns None when the property_id does not exist."""
    # Act
    result = await property_service.get(
        mock_db_session, property_id=uuid.uuid4(), caller_id=test_user.id
    )

    # Assert
    assert result is None


@pytest.mark.asyncio
async def test_get_returns_none_for_other_users_private_property(
    mock_db_session: AsyncSession, test_user: User
):
    """Returns None when the caller doesn't own the property and it is not public."""
    # Arrange
    other_user = User(id=uuid.uuid4(), email="other@example.com", name="Other User")
    mock_db_session.add(other_user)
    await mock_db_session.commit()
    private_prop = await property_service.create(
        mock_db_session,
        owner_id=other_user.id,
        data=PropertyCreate(name="Private", public=False),
    )

    # Act
    result = await property_service.get(
        mock_db_session,
        property_id=private_prop.id,
        caller_id=test_user.id,
    )

    # Assert
    assert result is None


# ─── get_or_404 ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_or_404_raises_for_missing_property(
    mock_db_session: AsyncSession, test_user: User
):
    """HTTPException with 404 should be raised when the property does not exist."""
    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await property_service.get_or_404(mock_db_session, uuid.uuid4(), test_user.id)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_or_404_returns_property_for_owner(
    mock_db_session: AsyncSession, test_user: User, test_property: Property
):
    """Owner can retrieve their property via get_or_404 without exception."""
    # Act
    result = await property_service.get_or_404(mock_db_session, test_property.id, test_user.id)

    # Assert
    assert result.id == test_property.id


# ─── create ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_persists_property(mock_db_session: AsyncSession, test_user: User):
    """A newly created property should be queryable from the DB with correct fields."""
    # Act
    created = await property_service.create(
        mock_db_session,
        owner_id=test_user.id,
        data=PropertyCreate(name="My Home", description="A nice place", address="1 Main St"),
    )

    # Assert
    fetched = await property_service.get(
        mock_db_session, property_id=created.id, caller_id=test_user.id
    )
    assert fetched is not None
    assert fetched.name == "My Home"
    assert fetched.description == "A nice place"
    assert fetched.address == "1 Main St"


@pytest.mark.asyncio
async def test_create_sets_owner_id(mock_db_session: AsyncSession, test_user: User):
    """The owner_id on the created property must match the caller's user ID."""
    # Act
    created = await property_service.create(
        mock_db_session,
        owner_id=test_user.id,
        data=PropertyCreate(name="Owner Test"),
    )

    # Assert
    assert created.owner_id == test_user.id


@pytest.mark.asyncio
async def test_create_defaults_public_to_false(mock_db_session: AsyncSession, test_user: User):
    """A property created without explicit public flag should default to non-public."""
    # Act
    created = await property_service.create(
        mock_db_session,
        owner_id=test_user.id,
        data=PropertyCreate(name="Default Visibility"),
    )

    # Assert
    assert created.public is False


# ─── update ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_changes_name(
    mock_db_session: AsyncSession, test_user: User, test_property: Property
):
    """Updating the name should persist the new value."""
    # Act
    updated = await property_service.update(
        mock_db_session,
        property=test_property,
        data=PropertyUpdate(name="New Name"),
    )

    # Assert
    assert updated.name == "New Name"


@pytest.mark.asyncio
async def test_update_partial_leaves_other_fields_unchanged(
    mock_db_session: AsyncSession, test_user: User, test_property: Property
):
    """Passing None for a field in PropertyUpdate should leave the original value intact."""
    # Arrange
    original_name = test_property.name

    # Act
    updated = await property_service.update(
        mock_db_session,
        property=test_property,
        data=PropertyUpdate(description="Updated desc"),
    )

    # Assert
    assert updated.name == original_name
    assert updated.description == "Updated desc"


# ─── delete ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_removes_property(
    mock_db_session: AsyncSession, test_user: User, test_property: Property
):
    """After deletion, get() should return None for the same property_id."""
    # Arrange
    property_id = test_property.id

    # Act
    await property_service.delete(mock_db_session, test_property)

    # Assert
    result = await property_service.get(
        mock_db_session, property_id=property_id, caller_id=test_user.id
    )
    assert result is None


# ─── count_rooms / get_rooms ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_count_rooms_returns_zero_for_empty_property(
    mock_db_session: AsyncSession, test_property: Property
):
    """A property with no rooms should report a count of 0."""
    # Act
    count = await property_service.count_rooms(mock_db_session, test_property.id)

    # Assert
    assert count == 0


@pytest.mark.asyncio
async def test_count_rooms_reflects_added_rooms(
    mock_db_session: AsyncSession, test_user: User, test_property: Property
):
    """count_rooms should increment as rooms are added to the property."""
    # Arrange
    await room_service.create(
        mock_db_session,
        caller_id=test_user.id,
        data=RoomCreate(label="Room 1", property_id=test_property.id),
    )
    await room_service.create(
        mock_db_session,
        caller_id=test_user.id,
        data=RoomCreate(label="Room 2", property_id=test_property.id),
    )

    # Act
    count = await property_service.count_rooms(mock_db_session, test_property.id)

    # Assert
    assert count == 2


@pytest.mark.asyncio
async def test_get_rooms_returns_rooms_for_property(
    mock_db_session: AsyncSession, test_user: User, test_property: Property
):
    """get_rooms should return all rooms belonging to the given property."""
    # Arrange
    room = await room_service.create(
        mock_db_session,
        caller_id=test_user.id,
        data=RoomCreate(label="Living Room", property_id=test_property.id),
    )

    # Act
    rooms = await property_service.get_rooms(mock_db_session, test_property.id)

    # Assert
    assert len(rooms) == 1
    assert rooms[0].id == room.id


@pytest.mark.asyncio
async def test_get_rooms_excludes_rooms_from_other_properties(
    mock_db_session: AsyncSession, test_user: User, test_property: Property
):
    """get_rooms should not return rooms that belong to a different property."""
    # Arrange
    other_prop = await property_service.create(
        mock_db_session,
        owner_id=test_user.id,
        data=PropertyCreate(name="Other Property"),
    )
    await room_service.create(
        mock_db_session,
        caller_id=test_user.id,
        data=RoomCreate(label="Other Room", property_id=other_prop.id),
    )

    # Act
    rooms = await property_service.get_rooms(mock_db_session, test_property.id)

    # Assert
    assert rooms == []
