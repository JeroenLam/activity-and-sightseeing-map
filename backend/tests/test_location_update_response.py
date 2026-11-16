"""Regression tests for ``PUT /api/locations/{id}``.

Editing a location from the map's edit dialog used to need two saves before
a newly added visit year (or a changed type) appeared. The update endpoint
reloaded the location from the SQLAlchemy identity map, which kept the
relationship collections loaded *before* the update, so the response (which
the frontend writes straight into its store) still held the old values.

These tests make sure a single update returns, persists and records the
new state, and that nullable fields such as ``rating`` can be cleared.
"""

import pytest
from httpx import AsyncClient

POINT = {"type": "Point", "coordinates": [5.0, 52.0]}


async def _create_location(client: AsyncClient, **properties) -> str:
    response = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": POINT,
            "properties": {"name": "Rijksmuseum", **properties},
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


async def _update_location(client: AsyncClient, location_id: str, **properties):
    """Send the same full payload the map edit dialog sends."""
    response = await client.put(
        f"/api/locations/{location_id}",
        json={"type": "Feature", "geometry": POINT, "properties": properties},
    )
    assert response.status_code == 200
    return response.json()


@pytest.mark.asyncio
async def test_adding_visit_year_is_returned_after_single_update(
    authenticated_client,
):
    client, _ = authenticated_client
    location_id = await _create_location(client, years_visited=[2020])

    data = await _update_location(
        client, location_id, name="Rijksmuseum", years_visited=[2020, 2024]
    )

    assert data["properties"]["years_visited"] == [2020, 2024]


@pytest.mark.asyncio
async def test_first_visit_year_on_unvisited_location(authenticated_client):
    client, _ = authenticated_client
    location_id = await _create_location(client)

    data = await _update_location(client, location_id, years_visited=[2025])

    assert data["properties"]["years_visited"] == [2025]


@pytest.mark.asyncio
async def test_removing_visit_year_is_returned_after_single_update(
    authenticated_client,
):
    client, _ = authenticated_client
    location_id = await _create_location(client, years_visited=[2019, 2021])

    data = await _update_location(client, location_id, years_visited=[2021])

    assert data["properties"]["years_visited"] == [2021]


@pytest.mark.asyncio
async def test_rating_and_visit_year_together_after_single_update(
    authenticated_client,
):
    client, _ = authenticated_client
    location_id = await _create_location(client)

    data = await _update_location(client, location_id, rating=4, years_visited=[2023])

    assert data["properties"]["rating"] == 4
    assert data["properties"]["years_visited"] == [2023]


@pytest.mark.asyncio
async def test_updated_values_are_persisted(authenticated_client):
    client, _ = authenticated_client
    location_id = await _create_location(client, years_visited=[2020])

    await _update_location(client, location_id, rating=5, years_visited=[2020, 2022])

    response = await client.get(f"/api/locations/{location_id}")
    props = response.json()["properties"]
    assert props["rating"] == 5
    assert props["years_visited"] == [2020, 2022]


@pytest.mark.asyncio
async def test_tags_are_returned_after_single_update(authenticated_client):
    client, _ = authenticated_client
    location_id = await _create_location(client, tags=["old"])

    data = await _update_location(client, location_id, tags=["new", "museum"])

    assert sorted(data["properties"]["tags"]) == ["museum", "new"]


@pytest.mark.asyncio
async def test_changed_type_is_returned_after_single_update(authenticated_client):
    client, _ = authenticated_client
    types = (await client.get("/api/types")).json()
    first, second = types[0], types[1]
    location_id = await _create_location(client, type_id=first["id"])

    data = await _update_location(client, location_id, type_id=second["id"])

    assert data["properties"]["type"]["id"] == second["id"]


@pytest.mark.asyncio
async def test_sync_event_payload_contains_new_visit_years(authenticated_client):
    """The change feed used by offline sync must carry the updated state too."""
    client, _ = authenticated_client
    location_id = await _create_location(client, years_visited=[2020])

    data = await _update_location(client, location_id, years_visited=[2020, 2024])

    response = await client.get("/api/sync/changes", params={"cursor": 0})
    assert response.status_code == 200
    events = [
        event
        for event in response.json()
        if event["entity_id"] == location_id and event["operation"] == "update"
    ]
    assert events, "expected an update event for the location"
    latest = events[-1]
    assert latest["entity_version"] == data["properties"]["sync_version"]
    assert latest["payload"]["properties"]["years_visited"] == [2020, 2024]


@pytest.mark.asyncio
async def test_explicit_null_clears_rating(authenticated_client):
    client, _ = authenticated_client
    location_id = await _create_location(client, rating=3)

    data = await _update_location(client, location_id, rating=None)

    assert data["properties"]["rating"] is None
    response = await client.get(f"/api/locations/{location_id}")
    assert response.json()["properties"]["rating"] is None


@pytest.mark.asyncio
async def test_explicit_null_clears_link_and_comments(authenticated_client):
    client, _ = authenticated_client
    location_id = await _create_location(
        client, link="https://example.com", comments="Nice"
    )

    data = await _update_location(client, location_id, link=None, comments=None)

    assert data["properties"]["link"] is None
    assert data["properties"]["comments"] is None


@pytest.mark.asyncio
async def test_omitted_nullable_fields_are_left_unchanged(authenticated_client):
    """Partial updates (e.g. the popup's "add current year" button) keep data."""
    client, _ = authenticated_client
    location_id = await _create_location(
        client, rating=4, link="https://example.com", comments="Keep me"
    )

    data = await _update_location(client, location_id, years_visited=[2026])

    props = data["properties"]
    assert props["rating"] == 4
    assert props["link"] == "https://example.com"
    assert props["comments"] == "Keep me"
    assert props["years_visited"] == [2026]


@pytest.mark.asyncio
async def test_popup_add_current_year_marks_location_visited_after_one_click(
    authenticated_client,
):
    """The map popup's "📅 <year>" button on an unvisited location.

    It sends a minimal payload (no geometry, only ``years_visited``). The
    response must already contain the new year, otherwise the marker keeps
    showing "Not visited" and the button has to be pressed a second time.
    """
    client, _ = authenticated_client
    location_id = await _create_location(client, rating=4)

    response = await client.put(
        f"/api/locations/{location_id}",
        json={"type": "Feature", "properties": {"years_visited": [2026]}},
    )

    assert response.status_code == 200
    props = response.json()["properties"]
    assert props["years_visited"] == [2026]
    assert props["rating"] == 4
    assert response.json()["geometry"]["coordinates"] == POINT["coordinates"]
