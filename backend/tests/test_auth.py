from httpx import AsyncClient


async def test_get_me(client: AsyncClient):
    resp = await client.get("/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert "id" in data


async def test_get_me_unauthenticated():
    from httpx import ASGITransport
    from httpx import AsyncClient as _Client

    from visions.main import app as _app

    async with _Client(transport=ASGITransport(app=_app), base_url="http://test") as ac:
        resp = await ac.get("/auth/me")
    assert resp.status_code == 401


async def test_login_returns_url(client: AsyncClient):
    resp = await client.get("/auth/login")
    assert resp.status_code == 200
    assert "url" in resp.json()
    assert "accounts.google.com" in resp.json()["url"]


async def test_logout(client: AsyncClient):
    resp = await client.post("/auth/logout")
    assert resp.status_code == 204
