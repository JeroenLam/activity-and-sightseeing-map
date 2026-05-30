"""Additional tests to improve coverage."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

# ==================== SETTINGS ROUTER ====================


@pytest.mark.asyncio
async def test_settings_location_filter(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/settings",
        json={"location_filter": "visited-only"},
    )
    assert response.status_code == 200
    assert response.json()["location_filter"] == "visited-only"


@pytest.mark.asyncio
async def test_settings_show_comments(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/settings",
        json={"show_comments": False, "show_ratings": False},
    )
    assert response.status_code == 200
    assert response.json()["show_comments"] is False
    assert response.json()["show_ratings"] is False


@pytest.mark.asyncio
async def test_settings_partial_update(authenticated_client):
    client, _ = authenticated_client
    # Set initial values
    await client.put(
        "/api/settings",
        json={
            "default_map_lat": 52.0,
            "default_map_lng": 5.0,
            "default_map_zoom": 10,
        },
    )
    # Update only language
    response = await client.put(
        "/api/settings",
        json={"preferred_language": "nl"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["preferred_language"] == "nl"
    # Previous values should persist
    assert data["default_map_lat"] == 52.0


# ==================== LOCATIONS ROUTER ====================


@pytest.mark.asyncio
async def test_filter_by_year_from(authenticated_client):
    client, _ = authenticated_client
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Old Visit", "years_visited": [2019]},
        },
    )
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.1, 52.1]},
            "properties": {"name": "Recent Visit", "years_visited": [2024]},
        },
    )
    response = await client.get("/api/locations?year_from=2023")
    assert response.status_code == 200
    names = [f["properties"]["name"] for f in response.json()["features"]]
    assert "Recent Visit" in names
    assert "Old Visit" not in names


@pytest.mark.asyncio
async def test_filter_by_year_to(authenticated_client):
    client, _ = authenticated_client
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Early", "years_visited": [2018]},
        },
    )
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.1, 52.1]},
            "properties": {"name": "Late", "years_visited": [2025]},
        },
    )
    response = await client.get("/api/locations?year_to=2020")
    assert response.status_code == 200
    names = [f["properties"]["name"] for f in response.json()["features"]]
    assert "Early" in names
    assert "Late" not in names


@pytest.mark.asyncio
async def test_filter_by_type_id(authenticated_client):
    client, _ = authenticated_client
    # Get available types
    types_resp = await client.get("/api/types")
    type_id = types_resp.json()[0]["id"]

    # Create location with type
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Typed Location", "type_id": type_id},
        },
    )
    # Create location without type
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.1, 52.1]},
            "properties": {"name": "No Type"},
        },
    )

    response = await client.get(f"/api/locations?type_id={type_id}")
    assert response.status_code == 200
    features = response.json()["features"]
    names = [f["properties"]["name"] for f in features]
    assert "Typed Location" in names
    assert "No Type" not in names


@pytest.mark.asyncio
async def test_update_location_partial(authenticated_client):
    client, _ = authenticated_client
    create_resp = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {
                "name": "Original",
                "city": "Amsterdam",
                "country": "NL",
                "rating": 3,
                "comments": "Good",
                "years_visited": [2020],
                "tags": ["museum"],
            },
        },
    )
    location_id = create_resp.json()["id"]

    # Partial update: only change name and add years
    response = await client.put(
        f"/api/locations/{location_id}",
        json={
            "type": "Feature",
            "properties": {
                "name": "Updated",
                "years_visited": [2020, 2024],
                "tags": ["museum", "art"],
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["properties"]["name"] == "Updated"
    assert data["properties"]["city"] == "Amsterdam"


@pytest.mark.asyncio
async def test_update_location_not_found(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/locations/nonexistent-id",
        json={
            "type": "Feature",
            "properties": {"name": "Doesn't Exist"},
        },
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_location_not_found(authenticated_client):
    client, _ = authenticated_client
    response = await client.delete("/api/locations/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_location_with_visited_unknown_year(authenticated_client):
    client, _ = authenticated_client
    response = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Unknown Year", "visited_unknown_year": True},
        },
    )
    assert response.status_code == 201
    assert response.json()["properties"]["visited_unknown_year"] is True

    # Should not appear in unvisited filter
    response = await client.get("/api/locations?unvisited=true")
    names = [f["properties"]["name"] for f in response.json()["features"]]
    assert "Unknown Year" not in names


@pytest.mark.asyncio
async def test_import_csv_with_type(authenticated_client):
    client, _ = authenticated_client
    csv_content = "name,type,city,country,visited\nBerlin Zoo,Zoo,Berlin,DE,2023"
    response = await client.post(
        "/api/locations/import",
        json={
            "csv": csv_content,
            "column_map": {
                "name": "name",
                "type": "type",
                "city": "city",
                "country": "country",
                "visited": "visited",
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1


@pytest.mark.asyncio
async def test_import_csv_skip_empty_name(authenticated_client):
    client, _ = authenticated_client
    csv_content = "name,city\n,Amsterdam\nReal Place,Rotterdam"
    response = await client.post(
        "/api/locations/import",
        json={"csv": csv_content, "column_map": {"name": "name", "city": "city"}},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    assert data["skipped"] == 1


@pytest.mark.asyncio
async def test_import_geojson_multiple(authenticated_client):
    client, _ = authenticated_client
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [4.9, 52.4]},
                "properties": {
                    "name": "Location A",
                    "city": "Amsterdam",
                    "country": "NL",
                    "years_visited": [2023],
                    "visited_unknown_year": False,
                    "rating": 5,
                    "comments": "Great",
                    "tags": ["fun"],
                },
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [5.1, 52.1]},
                "properties": {
                    "name": "Location B",
                    "city": "Utrecht",
                    "country": "NL",
                    "years_visited": [],
                    "visited_unknown_year": True,
                },
            },
        ],
    }
    response = await client.post("/api/locations/import/geojson", json=geojson)
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 2
    assert data["errors"] == []


# ==================== PUBLIC ROUTER ====================


@pytest.mark.asyncio
async def test_public_locations_visited_only_filter(authenticated_client):
    client, user_id = authenticated_client
    # Make profile public with visited-only filter
    await client.put(
        "/api/settings",
        json={"profile_public": True, "location_filter": "visited-only"},
    )

    # Create visited + unvisited
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Visited Loc", "years_visited": [2023]},
        },
    )
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.1, 52.1]},
            "properties": {"name": "Unvisited Loc"},
        },
    )

    response = await client.get(f"/api/public/{user_id}/locations")
    assert response.status_code == 200
    names = [f["properties"]["name"] for f in response.json()["features"]]
    assert "Visited Loc" in names
    assert "Unvisited Loc" not in names


@pytest.mark.asyncio
async def test_public_locations_unvisited_only_filter(authenticated_client):
    client, user_id = authenticated_client
    await client.put(
        "/api/settings",
        json={"profile_public": True, "location_filter": "unvisited-only"},
    )

    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Visited2", "years_visited": [2023]},
        },
    )
    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.1, 52.1]},
            "properties": {"name": "Unvisited2"},
        },
    )

    response = await client.get(f"/api/public/{user_id}/locations")
    assert response.status_code == 200
    names = [f["properties"]["name"] for f in response.json()["features"]]
    assert "Unvisited2" in names
    assert "Visited2" not in names


@pytest.mark.asyncio
async def test_public_locations_hides_ratings(authenticated_client):
    client, user_id = authenticated_client
    await client.put(
        "/api/settings", json={"profile_public": True, "show_ratings": False}
    )

    await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Rated", "rating": 5},
        },
    )

    response = await client.get(f"/api/public/{user_id}/locations")
    assert response.status_code == 200
    features = response.json()["features"]
    for f in features:
        assert f["properties"]["rating"] is None


@pytest.mark.asyncio
async def test_public_locations_not_found(client: AsyncClient):
    response = await client.get("/api/public/nonexistent/locations")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_public_profile_type_visibility(authenticated_client):
    client, user_id = authenticated_client
    await client.put("/api/settings", json={"profile_public": True})

    # Get types
    types_resp = await client.get("/api/types")
    types_data = types_resp.json()
    assert len(types_data) > 0

    # Profile should show all types by default
    response = await client.get(f"/api/public/{user_id}/profile")
    assert response.status_code == 200
    assert len(response.json()["types"]) == len(types_data)


# ==================== AUTH ROUTER ====================


@pytest.mark.asyncio
async def test_update_profile_display_name(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/auth/me",
        json={"display_name": "New Display Name"},
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "New Display Name"


@pytest.mark.asyncio
async def test_update_profile_language(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/auth/me",
        json={"preferred_language": "nl"},
    )
    assert response.status_code == 200
    assert response.json()["preferred_language"] == "nl"


# ==================== TYPES ROUTER ====================


@pytest.mark.asyncio
async def test_update_type_not_found(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/types/nonexistent-id",
        json={"name": "Nope"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_type_icon(authenticated_client):
    client, _ = authenticated_client
    create_resp = await client.post(
        "/api/types",
        json={"name": "With Icon", "color": "#123456", "icon": "museum"},
    )
    type_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/types/{type_id}",
        json={"icon": "paw"},
    )
    assert response.status_code == 200
    assert response.json()["icon"] == "paw"


# ==================== CSV SERVICE ====================


def test_csv_parse():
    from app.services.csv_service import parse_csv

    headers, rows = parse_csv("name,city\nAmsterdam Zoo,Amsterdam\nBerlin Zoo,Berlin")
    assert headers == ["name", "city"]
    assert len(rows) == 2
    assert rows[0]["name"] == "Amsterdam Zoo"


def test_csv_detect_column_map():
    from app.services.csv_service import detect_column_map

    mapping = detect_column_map(["Name", "City", "Country", "Visited", "Link"])
    assert mapping["name"] == "Name"
    assert mapping["city"] == "City"
    assert mapping["country"] == "Country"
    assert mapping["visited"] == "Visited"
    assert mapping["link"] == "Link"


def test_csv_detect_dutch_columns():
    from app.services.csv_service import detect_column_map

    mapping = detect_column_map(["naam", "stad", "land", "bezocht"])
    assert mapping["name"] == "naam"
    assert mapping["city"] == "stad"
    assert mapping["country"] == "land"
    assert mapping["visited"] == "bezocht"


def test_csv_parse_visited_years():
    from app.services.csv_service import parse_visited_years

    years, unknown = parse_visited_years("2020, 2021, 2023")
    assert years == [2020, 2021, 2023]
    assert unknown is False

    years, unknown = parse_visited_years("-")
    assert years == []
    assert unknown is True

    years, unknown = parse_visited_years("")
    assert years == []
    assert unknown is False

    years, unknown = parse_visited_years("2020, -, 2022")
    assert years == [2020, 2022]
    assert unknown is True


def test_csv_map_row():
    from app.services.csv_service import map_csv_row

    row = {
        "name": "Zoo",
        "city": "Amsterdam",
        "visited": "2020, 2023",
        "url": "http://example.com",
    }
    column_map = {"name": "name", "city": "city", "visited": "visited", "link": "url"}
    result = map_csv_row(row, column_map)
    assert result["name"] == "Zoo"
    assert result["city"] == "Amsterdam"
    assert result["years_visited"] == [2020, 2023]
    assert result["link"] == "http://example.com"


def test_csv_map_row_empty_link():
    from app.services.csv_service import map_csv_row

    row = {"name": "Zoo", "url": ""}
    column_map = {"name": "name", "link": "url"}
    result = map_csv_row(row, column_map)
    assert result["link"] is None


# ==================== GEOCODING SERVICE ====================


@pytest.mark.asyncio
async def test_geocoding_search():
    from app.services import geocoding_service

    mock_response = MagicMock()
    mock_response.json.return_value = [
        {
            "display_name": "Amsterdam, Netherlands",
            "lat": "52.374",
            "lon": "4.8897",
            "address": {"city": "Amsterdam", "country_code": "nl"},
        }
    ]
    mock_response.raise_for_status = MagicMock()

    with patch.object(
        geocoding_service,
        "_rate_limited_request",
        new=AsyncMock(return_value=mock_response),
    ):
        results = await geocoding_service.search("Amsterdam")
        assert len(results) == 1
        assert results[0]["city"] == "Amsterdam"
        assert results[0]["country_code"] == "NL"
        assert results[0]["lat"] == 52.374


@pytest.mark.asyncio
async def test_geocoding_reverse():
    from app.services import geocoding_service

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "display_name": "Amsterdam, Netherlands",
        "address": {"city": "Amsterdam", "country_code": "nl"},
    }
    mock_response.raise_for_status = MagicMock()

    with patch.object(
        geocoding_service,
        "_rate_limited_request",
        new=AsyncMock(return_value=mock_response),
    ):
        result = await geocoding_service.reverse(52.374, 4.8897)
        assert result["city"] == "Amsterdam"
        assert result["country_code"] == "NL"


@pytest.mark.asyncio
async def test_geocoding_extract_town():
    from app.services.geocoding_service import _extract_city

    assert _extract_city({"town": "Hilversum"}) == "Hilversum"
    assert _extract_city({"village": "Blaricum"}) == "Blaricum"
    assert _extract_city({"municipality": "Het Gooi"}) == "Het Gooi"
    assert _extract_city({}) == ""


# ==================== LOCATION SERVICE EDGE CASES ====================


@pytest.mark.asyncio
async def test_location_with_address_and_link(authenticated_client):
    client, _ = authenticated_client
    response = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {
                "name": "Full Location",
                "city": "Amsterdam",
                "country": "NL",
                "address": "123 Main St",
                "link": "https://example.com",
                "rating": 5,
                "comments": "Excellent",
            },
        },
    )
    assert response.status_code == 201
    props = response.json()["properties"]
    assert props["address"] == "123 Main St"
    assert props["link"] == "https://example.com"
    assert props["rating"] == 5
    assert props["comments"] == "Excellent"


@pytest.mark.asyncio
async def test_update_location_geometry_only(authenticated_client):
    client, _ = authenticated_client
    create_resp = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Move Me"},
        },
    )
    location_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/locations/{location_id}",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [6.0, 53.0]},
            "properties": {},
        },
    )
    assert response.status_code == 200
    assert response.json()["geometry"]["coordinates"] == [6.0, 53.0]
    assert response.json()["properties"]["name"] == "Move Me"


@pytest.mark.asyncio
async def test_update_location_visited_unknown(authenticated_client):
    client, _ = authenticated_client
    create_resp = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Unknown Visit"},
        },
    )
    location_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/locations/{location_id}",
        json={
            "type": "Feature",
            "properties": {"visited_unknown_year": True},
        },
    )
    assert response.status_code == 200
    assert response.json()["properties"]["visited_unknown_year"] is True


@pytest.mark.asyncio
async def test_location_with_type(authenticated_client):
    client, _ = authenticated_client
    # Get a type
    types_resp = await client.get("/api/types")
    type_data = types_resp.json()[0]

    response = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Typed", "type_id": type_data["id"]},
        },
    )
    assert response.status_code == 201
    loc_type = response.json()["properties"]["type"]
    assert loc_type["id"] == type_data["id"]
    assert loc_type["name"] == type_data["name"]
    assert loc_type["color"] == type_data["color"]


# ==================== UTILS/GEOJSON ====================


def test_geojson_imports():
    """Test that geojson utils module imports correctly."""
    from app.utils.geojson import (
        LocationFeature,
        LocationFeatureCollection,
        LocationProperties,
        LocationTypeInline,
        PointGeometry,
    )

    # Verify the imports are the right types
    assert LocationFeature is not None
    assert LocationFeatureCollection is not None
    assert LocationProperties is not None
    assert LocationTypeInline is not None
    assert PointGeometry is not None
