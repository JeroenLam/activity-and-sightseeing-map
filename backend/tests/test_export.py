import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_export_geojson(authenticated_client):
    client, _ = authenticated_client
    # Create a location
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {
                "name": "Export Test",
                "city": "Amsterdam",
                "tags": ["test"],
            },
        },
    )

    response = await client.get("/api/locations/export/geojson")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 1


@pytest.mark.asyncio
async def test_geojson_import(authenticated_client):
    client, _ = authenticated_client
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [4.9, 52.4]},
                "properties": {
                    "name": "Imported Location",
                    "city": "Amsterdam",
                    "country": "NL",
                    "years_visited": [2024],
                    "tags": ["imported"],
                },
            }
        ],
    }
    response = await client.post("/api/locations/import/geojson", json=geojson)
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    assert data["errors"] == []


@pytest.mark.asyncio
async def test_export_unauthenticated(client: AsyncClient):
    response = await client.get("/api/locations/export/geojson")
    assert response.status_code == 401
