from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_geocode_search_unauthenticated(client: AsyncClient):
    response = await client.get("/api/geocode/search?q=Amsterdam")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_geocode_search(authenticated_client):
    client, _ = authenticated_client
    mock_results = [
        {
            "display_name": "Amsterdam, Netherlands",
            "lat": 52.3676,
            "lon": 4.9041,
            "city": "Amsterdam",
            "country_code": "NL",
        }
    ]
    with patch(
        "app.services.geocoding_service.search",
        new_callable=AsyncMock,
        return_value=mock_results,
    ):
        response = await client.get("/api/geocode/search?q=Amsterdam")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["city"] == "Amsterdam"


@pytest.mark.asyncio
async def test_geocode_reverse(authenticated_client):
    client, _ = authenticated_client
    mock_result = {
        "display_name": "Artis, Amsterdam",
        "city": "Amsterdam",
        "country_code": "NL",
    }
    with patch(
        "app.services.geocoding_service.reverse",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        response = await client.get("/api/geocode/reverse?lat=52.366&lon=4.916")
        assert response.status_code == 200
        data = response.json()
        assert data["city"] == "Amsterdam"
        assert data["country_code"] == "NL"


@pytest.mark.asyncio
async def test_geocode_search_empty_query(authenticated_client):
    client, _ = authenticated_client
    response = await client.get("/api/geocode/search?q=")
    assert response.status_code == 422
