"""Regression tests for ``PUT /api/locations/{id}``.

Editing a location from the map's edit dialog used to need two saves before
a newly added visit year (or a changed type) appeared. The update endpoint
reloaded the location from the SQLAlchemy identity map, which kept the
relationship collections loaded *before* the update, so the response (which
the frontend writes straight into its store) still held the old values.

These tests make sure a single update returns, persists and records the
new state.
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
