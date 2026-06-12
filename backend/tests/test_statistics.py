import pytest


@pytest.mark.asyncio
async def test_statistics_empty(authenticated_client):
    client, _ = authenticated_client
    response = await client.get("/api/statistics")
    assert response.status_code == 200
    data = response.json()
    assert data["total_locations"] == 0
    assert data["total_visited"] == 0
    assert data["total_unvisited"] == 0
    assert data["total_countries"] == 0
    assert data["total_cities"] == 0
    assert data["total_ratings_provided"] == 0
    assert data["total_comments_provided"] == 0
    assert data["total_locations_visited_multiple_years"] == 0
    assert data["total_visited_continents"] == 0
    assert data["visits_per_year"] == []
    assert data["locations_per_type"] == []
    assert data["visited_locations_per_type"] == []
    assert data["locations_per_country"] == []
    assert data["visited_locations_per_country"] == []
    assert data["visited_locations_per_year_by_country"] == []
    assert data["visited_locations_per_year_by_type"] == []


@pytest.mark.asyncio
async def test_statistics_with_locations(authenticated_client):
    client, _ = authenticated_client

    # Create a type
    type_resp = await client.post(
        "/api/types",
        json={"name": "Museum", "color": "#FF0000", "icon": ""},
    )
    assert type_resp.status_code == 201
    type_id = type_resp.json()["id"]

    # Create visited location
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [4.9, 52.4]},
            "properties": {
                "name": "Rijksmuseum",
                "type_id": type_id,
                "city": "Amsterdam",
                "country": "NL",
                "years_visited": [2022, 2023],
                "rating": 5,
                "comments": "Must-see museum",
            },
        },
    )

    # Create another visited location in different country
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [2.3, 48.9]},
            "properties": {
                "name": "Louvre",
                "type_id": type_id,
                "city": "Paris",
                "country": "FR",
                "years_visited": [2023],
            },
        },
    )

    # Create unvisited location
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [13.4, 52.5]},
            "properties": {
                "name": "Berlin Wall",
                "city": "Berlin",
                "country": "DE",
                "years_visited": [],
                "rating": 4,
                "comments": "Unvisited comment should not count",
            },
        },
    )

    response = await client.get("/api/statistics")
    assert response.status_code == 200
    data = response.json()

    assert data["total_locations"] == 3
    assert data["total_visited"] == 2
    assert data["total_unvisited"] == 1
    assert data["total_countries"] == 3
    assert data["total_cities"] == 2
    assert data["total_ratings_provided"] == 1
    assert data["total_comments_provided"] == 1
    assert data["total_locations_visited_multiple_years"] == 1
    assert data["total_visited_continents"] == 1

    # Visits per year
    years = {item["year"]: item["count"] for item in data["visits_per_year"]}
    assert years[2022] == 1
    assert years[2023] == 2

    # Locations per type
    types = {item["type_name"]: item["count"] for item in data["locations_per_type"]}
    assert types["Museum"] == 2
    assert types["Uncategorized"] == 1

    visited_types = {
        item["type_name"]: item["count"] for item in data["visited_locations_per_type"]
    }
    assert visited_types["Museum"] == 2
    assert "Uncategorized" not in visited_types

    # Locations per country
    countries = {
        item["country"]: item["count"] for item in data["locations_per_country"]
    }
    assert countries["NL"] == 1
    assert countries["FR"] == 1
    assert countries["DE"] == 1

    visited_countries = {
        item["country"]: item["count"] for item in data["visited_locations_per_country"]
    }
    assert visited_countries["NL"] == 1
    assert visited_countries["FR"] == 1
    assert "DE" not in visited_countries

    visited_by_country = {
        (item["year"], item["country"]): item["count"]
        for item in data["visited_locations_per_year_by_country"]
    }
    assert visited_by_country[(2022, "NL")] == 1
    assert visited_by_country[(2023, "NL")] == 1
    assert visited_by_country[(2023, "FR")] == 1

    visited_by_type = {
        (item["year"], item["type_name"]): item["count"]
        for item in data["visited_locations_per_year_by_type"]
    }
    assert visited_by_type[(2022, "Museum")] == 1
    assert visited_by_type[(2023, "Museum")] == 2


@pytest.mark.asyncio
async def test_statistics_requires_auth(client):
    response = await client.get("/api/statistics")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_statistics_visited_unknown_year(authenticated_client):
    client, _ = authenticated_client

    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {
                "name": "Old Place",
                "country": "NL",
                "years_visited": [],
                "visited_unknown_year": True,
            },
        },
    )

    response = await client.get("/api/statistics")
    data = response.json()
    assert data["total_visited"] == 1
    assert data["total_unvisited"] == 0
