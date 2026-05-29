import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_settings(authenticated_client):
    client, _ = authenticated_client
    response = await client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert data["preferred_language"] == "nl"
    assert data["default_map_lat"] is None
    assert data["profile_public"] is False


@pytest.mark.asyncio
async def test_update_settings(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/settings",
        json={
            "preferred_language": "en",
            "default_map_lat": 52.1,
            "default_map_lng": 5.3,
            "default_map_zoom": 7,
            "profile_public": True,
            "show_ratings": False,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["preferred_language"] == "en"
    assert data["default_map_lat"] == 52.1
    assert data["default_map_lng"] == 5.3
    assert data["default_map_zoom"] == 7
    assert data["profile_public"] is True
    assert data["show_ratings"] is False


@pytest.mark.asyncio
async def test_update_settings_invalid_language(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/settings",
        json={"preferred_language": "fr"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_settings_unauthenticated(client: AsyncClient):
    response = await client.get("/api/settings")
    assert response.status_code == 401
