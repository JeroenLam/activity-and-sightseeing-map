import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_csv_preview(authenticated_client):
    client, _ = authenticated_client
    csv_content = "name,city,country,type,visited\nLondon Zoo,London,UK,Zoo,2023\nBritish Museum,London,UK,Museum,2022"
    response = await client.post(
        "/api/locations/import/preview",
        json={"csv": csv_content},
    )
    assert response.status_code == 200
    data = response.json()
    assert "name" in data["column_map"]
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
async def test_import_unauthenticated(client: AsyncClient):
    response = await client.post(
        "/api/locations/import/preview",
        json={"csv": "name\nTest"},
    )
    assert response.status_code == 401
