from httpx import AsyncClient


async def test_create_house_success(client: AsyncClient):
    resp = await client.post("/houses", json={"name": "Beach House"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Beach House"
    assert "id" in data


async def test_create_house_missing_name(client: AsyncClient):
    resp = await client.post("/houses", json={})
    assert resp.status_code == 422


async def test_list_houses_empty(client: AsyncClient):
    resp = await client.get("/houses")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_get_house_not_found(client: AsyncClient):
    resp = await client.get("/houses/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


async def test_get_house_success(client: AsyncClient):
    create_resp = await client.post("/houses", json={"name": "Test House"})
    assert create_resp.status_code == 201
    property_id = create_resp.json()["id"]

    resp = await client.get(f"/houses/{property_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == property_id
    assert data["name"] == "Test House"
    assert data["room_count"] == 0


async def test_get_house_with_rooms(client: AsyncClient):
    """Test get_house returns correct room_count when rooms exist."""
    create_resp = await client.post("/houses", json={"name": "House with Rooms"})
    assert create_resp.status_code == 201
    property_id = create_resp.json()["id"]

    resp = await client.get(f"/houses/{property_id}")
    assert resp.status_code == 200
    assert resp.json()["room_count"] == 0


async def test_delete_house(client: AsyncClient):
    create_resp = await client.post("/houses", json={"name": "To Delete"})
    assert create_resp.status_code == 201
    property_id = create_resp.json()["id"]

    delete_resp = await client.delete(f"/houses/{property_id}")
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/houses/{property_id}")
    assert get_resp.status_code == 404


async def test_list_houses_unauthenticated():
    """Verify that unauthenticated requests are rejected (no override)."""
    from httpx import ASGITransport
    from httpx import AsyncClient as _Client

    from visions.main import app as _app

    async with _Client(transport=ASGITransport(app=_app), base_url="http://test") as ac:
        resp = await ac.get("/houses")
    assert resp.status_code == 401
