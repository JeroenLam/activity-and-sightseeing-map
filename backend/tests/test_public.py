import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_public_profile_not_found(client: AsyncClient):
    response = await client.get("/api/public/nonexistent/profile")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_public_profile_private(authenticated_client):
    client, user_id = authenticated_client
    # Profile is private by default
    response = await client.get(f"/api/public/{user_id}/profile")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_public_profile_public(authenticated_client):
    client, user_id = authenticated_client
    # Make profile public
    await client.put("/api/settings", json={"profile_public": True})

    response = await client.get(f"/api/public/{user_id}/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "Test User"
    assert "types" in data


@pytest.mark.asyncio
async def test_public_locations(authenticated_client):
    client, user_id = authenticated_client
    # Make profile public
    await client.put("/api/settings", json={"profile_public": True})

    # Create a location
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Public Location", "rating": 4, "comments": "Nice"},
        },
    )

    response = await client.get(f"/api/public/{user_id}/locations")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 1


@pytest.mark.asyncio
async def test_public_locations_hides_comments(authenticated_client):
    client, user_id = authenticated_client
    # Make profile public but hide comments
    await client.put(
        "/api/settings", json={"profile_public": True, "show_comments": False}
    )

    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Secret Comments", "comments": "Hidden"},
        },
    )

    response = await client.get(f"/api/public/{user_id}/locations")
    assert response.status_code == 200
    features = response.json()["features"]
    for f in features:
        assert f["properties"]["comments"] is None
