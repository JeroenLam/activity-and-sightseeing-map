import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_types(authenticated_client):
    client, _ = authenticated_client
    response = await client.get("/api/types")
    assert response.status_code == 200
    data = response.json()
    # Default types are seeded on registration
    assert len(data) == 7


@pytest.mark.asyncio
async def test_create_type(authenticated_client):
    client, _ = authenticated_client
    response = await client.post(
        "/api/types",
        json={"name": "Aquarium", "color": "#00BCD4", "icon": "fish"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Aquarium"
    assert data["color"] == "#00BCD4"
    assert data["icon"] == "fish"


@pytest.mark.asyncio
async def test_create_type_invalid_color(authenticated_client):
    client, _ = authenticated_client
    response = await client.post(
        "/api/types",
        json={"name": "Bad", "color": "not-a-color"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_type(authenticated_client):
    client, _ = authenticated_client
    create_resp = await client.post(
        "/api/types",
        json={"name": "Old Name", "color": "#111111"},
    )
    type_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/types/{type_id}",
        json={"name": "New Name", "color": "#222222"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
    assert response.json()["color"] == "#222222"


@pytest.mark.asyncio
async def test_delete_type(authenticated_client):
    client, _ = authenticated_client
    create_resp = await client.post(
        "/api/types",
        json={"name": "To Delete", "color": "#333333"},
    )
    type_id = create_resp.json()["id"]

    response = await client.delete(f"/api/types/{type_id}")
    assert response.status_code == 200

    # Verify deleted
    types_resp = await client.get("/api/types")
    ids = [t["id"] for t in types_resp.json()]
    assert type_id not in ids


@pytest.mark.asyncio
async def test_delete_type_not_found(authenticated_client):
    client, _ = authenticated_client
    response = await client.delete("/api/types/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_types_unauthenticated(client: AsyncClient):
    response = await client.get("/api/types")
    assert response.status_code == 401
