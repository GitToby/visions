import itertools
import random

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_ok(test_client: AsyncClient):
    # Act
    response = await test_client.get("/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:8088",
    ],
)
async def test_cors_allows_configured_origins(test_client: AsyncClient, origin: str):
    # Act
    response = await test_client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    # Assert
    assert response.headers.get("access-control-allow-origin") == origin


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "origin",
    itertools.chain(
        [
            "https://visions-api.onrender.com/",
            "https://visions-api.onrender.com",
            "https://visions-web.onrender.com/",
            "https://visions-web.onrender.com",
        ],
        # test for a bunch of random PR origins
        (f"https://visions-api-pr-{random.randrange(1, 1000)}.onrender.com" for i in range(10)),
        (f"https://visions-web-pr-{random.randrange(1, 1000)}.onrender.com" for i in range(10)),
    ),
)
async def test_cors_allows_render_preview_origins_via_regex(test_client: AsyncClient, origin: str):
    # Act
    response = await test_client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    # Assert
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "origin",
    [
        "https://evil.com",
        "https://evil.com/",
        "http://localhost:3000",
        "https://visions-other.onrender.com/",
        "https://visions-other.onrender.com",
        "https://visions-api-pr-abc.onrender.com/",  # non-numeric PR number
    ],
)
async def test_cors_blocks_unknown_origins(test_client: AsyncClient, origin: str):
    # Act
    response = await test_client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    # Assert
    assert response.status_code != 200
    assert response.headers.get("access-control-allow-origin") != origin
