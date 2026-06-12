import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_location(authenticated_client):
    client, _ = authenticated_client
    response = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [4.9163, 52.3660]},
            "properties": {
                "name": "Artis",
                "city": "Amsterdam",
                "country": "NL",
                "years_visited": [2023],
                "rating": 4,
                "tags": ["family-friendly"],
            },
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "Feature"
    assert data["properties"]["name"] == "Artis"
    assert data["geometry"]["coordinates"] == [4.9163, 52.3660]
    assert data["properties"]["years_visited"] == [2023]
    assert data["properties"]["tags"] == ["family-friendly"]


@pytest.mark.asyncio
async def test_list_locations(authenticated_client):
    client, _ = authenticated_client
    # Create a location first
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Test Location"},
        },
    )
    response = await client.get("/api/locations")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 1


@pytest.mark.asyncio
async def test_get_location(authenticated_client):
    client, _ = authenticated_client
    create_resp = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Get Test"},
        },
    )
    location_id = create_resp.json()["id"]

    response = await client.get(f"/api/locations/{location_id}")
    assert response.status_code == 200
    assert response.json()["properties"]["name"] == "Get Test"


@pytest.mark.asyncio
async def test_update_location(authenticated_client):
    client, _ = authenticated_client
    create_resp = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Before Update"},
        },
    )
    location_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/locations/{location_id}",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [6.0, 53.0]},
            "properties": {"name": "After Update", "rating": 5},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["properties"]["name"] == "After Update"
    assert data["geometry"]["coordinates"] == [6.0, 53.0]
    assert data["properties"]["rating"] == 5


@pytest.mark.asyncio
async def test_delete_location(authenticated_client):
    client, _ = authenticated_client
    create_resp = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "To Delete"},
        },
    )
    location_id = create_resp.json()["id"]

    response = await client.delete(f"/api/locations/{location_id}")
    assert response.status_code == 200

    # Verify deleted
    response = await client.get(f"/api/locations/{location_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_location_not_found(authenticated_client):
    client, _ = authenticated_client
    response = await client.get("/api/locations/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_locations_unauthenticated(client: AsyncClient):
    response = await client.get("/api/locations")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_filter_unvisited(authenticated_client):
    client, _ = authenticated_client
    # Create visited location
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Visited", "years_visited": [2023]},
        },
    )
    # Create unvisited location
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.1, 52.1]},
            "properties": {"name": "Unvisited"},
        },
    )

    response = await client.get("/api/locations?unvisited=true")
    assert response.status_code == 200
    features = response.json()["features"]
    names = [f["properties"]["name"] for f in features]
    assert "Unvisited" in names
    assert "Visited" not in names


@pytest.mark.asyncio
async def test_invalid_coordinates(authenticated_client):
    client, _ = authenticated_client
    response = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [200.0, 100.0]},
            "properties": {"name": "Invalid"},
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_bulk_update_locations(authenticated_client):
    client, _ = authenticated_client

    type_response = await client.post(
        "/api/types",
        json={"name": "Museum", "color": "#FF0000", "icon": ""},
    )
    assert type_response.status_code == 201
    type_id = type_response.json()["id"]

    first = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "First Place", "years_visited": [2021]},
        },
    )
    second = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.1, 52.1]},
            "properties": {
                "name": "Second Place",
                "visited_unknown_year": True,
            },
        },
    )
    assert first.status_code == 201
    assert second.status_code == 201

    response = await client.post(
        "/api/locations/bulk-update",
        json={
            "location_ids": [first.json()["id"], second.json()["id"]],
            "properties": {"type_id": type_id, "rating": 4, "year_to_add": 2024},
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    for feature in data:
        assert feature["properties"]["type"]["id"] == type_id
        assert feature["properties"]["rating"] == 4
        assert 2024 in feature["properties"]["years_visited"]
        assert feature["properties"]["visited_unknown_year"] is False


@pytest.mark.asyncio
async def test_bulk_update_requires_changes(authenticated_client):
    client, _ = authenticated_client
    response = await client.post(
        "/api/locations/bulk-update",
        json={"location_ids": ["some-id"], "properties": {}},
    )
    assert response.status_code == 422
