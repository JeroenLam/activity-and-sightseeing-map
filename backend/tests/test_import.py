from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_csv_preview(authenticated_client):
    client, _ = authenticated_client
    csv_content = (
        "name,city,country,type,visited,latitude,longitude,rating,comments,tags\n"
        "London Zoo,London,UK,Zoo,2023,51.5353,-0.1534,4,Great zoo,animals;family\n"
        "British Museum,London,UK,Museum,2022,51.5194,-0.1270,5,Amazing,history"
    )
    response = await client.post(
        "/api/locations/import/preview",
        json={"csv": csv_content},
    )
    assert response.status_code == 200
    data = response.json()
    assert "name" in data["column_map"]
    assert "latitude" in data["column_map"]
    assert "longitude" in data["column_map"]
    assert "rating" in data["column_map"]
    assert "comments" in data["column_map"]
    assert "tags" in data["column_map"]
    assert data["total_rows"] == 2
    assert len(data["preview"]) == 2


@pytest.mark.asyncio
async def test_csv_import(authenticated_client):
    client, _ = authenticated_client
    csv_content = "name,city,country,type\nTestPlace,TestCity,UK,Zoo"

    mock_results = [{"lat": 52.0, "lon": 5.0, "city": "TestCity", "country_code": "NL"}]
    with patch(
        "app.services.geocoding_service.search",
        new_callable=AsyncMock,
        return_value=mock_results,
    ):
        response = await client.post(
            "/api/locations/import",
            json={"csv": csv_content},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] >= 1


@pytest.mark.asyncio
async def test_csv_import_with_coordinates(authenticated_client):
    """When lat/lon are provided, geocoding should be skipped."""
    client, _ = authenticated_client
    csv_content = (
        "name,city,country,type,latitude,longitude,rating,comments,tags\n"
        "TestPlace,TestCity,NL,Zoo,52.3676,4.9041,4,Nice place,outdoor;fun"
    )

    with patch(
        "app.services.geocoding_service.search",
        new_callable=AsyncMock,
    ) as mock_search:
        response = await client.post(
            "/api/locations/import",
            json={"csv": csv_content},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    # Geocoding should NOT have been called since coordinates were provided
    mock_search.assert_not_called()

    # Verify the location was created with correct data
    locations_resp = await client.get("/api/locations")
    features = locations_resp.json()["features"]
    imported_loc = next(f for f in features if f["properties"]["name"] == "TestPlace")
    assert imported_loc["geometry"]["coordinates"] == [4.9041, 52.3676]
    assert imported_loc["properties"]["rating"] == 4
    assert imported_loc["properties"]["comments"] == "Nice place"
    assert imported_loc["properties"]["tags"] == ["outdoor", "fun"]


@pytest.mark.asyncio
async def test_import_unauthenticated(client: AsyncClient):
    response = await client.post(
        "/api/locations/import/preview",
        json={"csv": "name\nTest"},
    )
    assert response.status_code == 401
