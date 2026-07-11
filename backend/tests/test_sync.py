import pytest


@pytest.mark.asyncio
async def test_sync_status_and_bootstrap(authenticated_client):
    client, _ = authenticated_client

    status_response = await client.get("/api/sync/status")
    assert status_response.status_code == 200
    status_data = status_response.json()
    assert status_data["cursor"] == 0
    assert "locations" in status_data["entities"]
    assert "types" in status_data["entities"]

    bootstrap_response = await client.get("/api/sync/bootstrap")
    assert bootstrap_response.status_code == 200
    bootstrap_data = bootstrap_response.json()
    assert bootstrap_data["cursor"] == 0
    assert bootstrap_data["locations"]["type"] == "FeatureCollection"
    assert len(bootstrap_data["types"]) >= 1
    assert bootstrap_data["settings"]["sync_version"] == 1


@pytest.mark.asyncio
async def test_sync_changes_capture_creates(authenticated_client):
    client, _ = authenticated_client

    type_response = await client.post(
        "/api/types",
        json={"name": "Gallery", "color": "#123456", "icon": "image"},
    )
    assert type_response.status_code == 201

    location_response = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [4.0, 52.0]},
            "properties": {"name": "Sync Test"},
        },
    )
    assert location_response.status_code == 201

    changes_response = await client.get("/api/sync/changes?cursor=0")
    assert changes_response.status_code == 200
    changes = changes_response.json()
    assert len(changes) >= 2
    assert {change["entity_type"] for change in changes} >= {"type", "location"}


@pytest.mark.asyncio
async def test_sync_changes_capture_delete_tombstone(authenticated_client):
    client, _ = authenticated_client

    create_response = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [4.5, 52.5]},
            "properties": {"name": "Delete Me"},
        },
    )
    location_id = create_response.json()["id"]

    delete_response = await client.delete(f"/api/locations/{location_id}")
    assert delete_response.status_code == 200

    changes_response = await client.get("/api/sync/changes?cursor=0")
    changes = changes_response.json()
    delete_events = [change for change in changes if change["operation"] == "delete"]
    assert any(event["entity_id"] == location_id for event in delete_events)


@pytest.mark.asyncio
async def test_sync_push_conflict_and_resolve_settings(authenticated_client):
    client, _ = authenticated_client

    initial_settings = await client.get("/api/settings")
    assert initial_settings.status_code == 200
    base_version = initial_settings.json()["sync_version"]

    server_update = await client.put(
        "/api/settings",
        json={"preferred_language": "nl"},
    )
    assert server_update.status_code == 200

    push_response = await client.post(
        "/api/sync/push",
        json={
            "mutations": [
                {
                    "mutation_id": "settings-1",
                    "entity_type": "settings",
                    "operation": "update",
                    "base_sync_version": base_version,
                    "payload": {"default_map_zoom": 7, "preferred_language": "nl"},
                }
            ]
        },
    )
    assert push_response.status_code == 200
    push_data = push_response.json()
    assert push_data["results"][0]["status"] == "conflict"
    conflict_id = push_data["results"][0]["conflict_id"]

    resolve_response = await client.post(
        f"/api/sync/conflicts/{conflict_id}/resolve",
        json={
            "resolution_mode": "merge",
            "payload": {
                "preferred_language": "nl",
                "default_map_zoom": 7,
            },
        },
    )
    assert resolve_response.status_code == 200
    assert resolve_response.json()["status"] == "resolved"

    settings_response = await client.get("/api/settings")
    settings_data = settings_response.json()
    assert settings_data["preferred_language"] == "nl"
    assert settings_data["default_map_zoom"] == 7


@pytest.mark.asyncio
async def test_stale_location_update_returns_conflict(authenticated_client):
    client, _ = authenticated_client

    create_response = await client.post(
        "/api/locations",
        json={
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [5.0, 52.0]},
            "properties": {"name": "Conflict Target"},
        },
    )
    assert create_response.status_code == 201
    location_id = create_response.json()["id"]

    update_response = await client.put(
        f"/api/locations/{location_id}",
        json={
            "type": "Feature",
            "properties": {
                "name": "Stale Update",
                "base_sync_version": 0,
            },
        },
    )

    assert update_response.status_code == 409
    assert update_response.json()["detail"]["error"] == "sync_conflict"