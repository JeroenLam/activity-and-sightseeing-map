import pytest
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------

_LOCATION_PAYLOAD = {
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
    "properties": {
        "name": "Export Test",
        "city": "Amsterdam",
        "country": "NL",
        "years_visited": [2023],
        "rating": 4,
        "comments": "Great spot",
        "tags": ["test"],
    },
}

# ---------------------------------------------------------------------------
# GeoJSON
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_export_geojson(authenticated_client):
    client, _ = authenticated_client
    await client.post("/api/locations", json=_LOCATION_PAYLOAD)

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


# ---------------------------------------------------------------------------
# KML
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_export_kml(authenticated_client):
    client, _ = authenticated_client
    await client.post("/api/locations", json=_LOCATION_PAYLOAD)

    response = await client.get("/api/locations/export/kml")
    assert response.status_code == 200
    assert "kml" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
    assert "locations.kml" in response.headers["content-disposition"]

    body = response.text
    assert '<?xml version="1.0" encoding="UTF-8"?>' in body
    assert "<kml" in body
    assert "<Placemark>" in body
    assert "Export Test" in body
    assert "Amsterdam" in body
    # coordinates: longitude,latitude,0
    assert "5.0,52.0,0" in body


@pytest.mark.asyncio
async def test_export_kml_includes_metadata(authenticated_client):
    client, _ = authenticated_client
    await client.post("/api/locations", json=_LOCATION_PAYLOAD)

    body = (await client.get("/api/locations/export/kml")).text
    assert "NL" in body
    assert "2023" in body
    assert "4/5" in body
    assert "Great spot" in body


@pytest.mark.asyncio
async def test_export_kml_empty(authenticated_client):
    """Empty collection should produce valid KML with no Placemarks."""
    client, _ = authenticated_client
    response = await client.get("/api/locations/export/kml")
    assert response.status_code == 200
    body = response.text
    assert "<kml" in body
    assert "<Placemark>" not in body


@pytest.mark.asyncio
async def test_export_kml_unauthenticated(client: AsyncClient):
    response = await client.get("/api/locations/export/kml")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GPX
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_export_gpx(authenticated_client):
    client, _ = authenticated_client
    await client.post("/api/locations", json=_LOCATION_PAYLOAD)

    response = await client.get("/api/locations/export/gpx")
    assert response.status_code == 200
    assert "gpx" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
    assert "locations.gpx" in response.headers["content-disposition"]

    body = response.text
    assert '<?xml version="1.0" encoding="UTF-8"?>' in body
    assert "<gpx" in body
    assert '<wpt lat="52.0" lon="5.0">' in body
    assert "Export Test" in body


@pytest.mark.asyncio
async def test_export_gpx_includes_metadata(authenticated_client):
    client, _ = authenticated_client
    await client.post("/api/locations", json=_LOCATION_PAYLOAD)

    body = (await client.get("/api/locations/export/gpx")).text
    assert "Amsterdam" in body
    assert "NL" in body
    assert "2023" in body
    assert "4/5" in body
    assert "Great spot" in body


@pytest.mark.asyncio
async def test_export_gpx_empty(authenticated_client):
    """Empty collection should produce valid GPX with no waypoints."""
    client, _ = authenticated_client
    response = await client.get("/api/locations/export/gpx")
    assert response.status_code == 200
    body = response.text
    assert "<gpx" in body
    assert "<wpt" not in body


@pytest.mark.asyncio
async def test_export_gpx_unauthenticated(client: AsyncClient):
    response = await client.get("/api/locations/export/gpx")
    assert response.status_code == 401

