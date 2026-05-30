import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "password": "password123",
            "display_name": "New User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["display_name"] == "New User"
    assert "token" in response.cookies


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={
            "email": "dup@example.com",
            "password": "password123",
            "display_name": "User 1",
        },
    )
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "dup@example.com",
            "password": "password456",
            "display_name": "User 2",
        },
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "short@example.com",
            "password": "short",
            "display_name": "User",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={
            "email": "login@example.com",
            "password": "password123",
            "display_name": "Login User",
        },
    )
    response = await client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "login@example.com"
    assert "token" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    response = await client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authenticated(authenticated_client):
    client, user_id = authenticated_client
    response = await client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["id"] == user_id


@pytest.mark.asyncio
async def test_update_profile(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/auth/me",
        json={"display_name": "Updated Name", "preferred_language": "en"},
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "Updated Name"


@pytest.mark.asyncio
async def test_change_password(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/auth/me/password",
        json={"current_password": "testpass123", "new_password": "newpass456"},
    )
    assert response.status_code == 200

    # Login with new password
    response = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "newpass456"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current(authenticated_client):
    client, _ = authenticated_client
    response = await client.put(
        "/api/auth/me/password",
        json={"current_password": "wrongpass", "new_password": "newpass456"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_logout(authenticated_client):
    client, _ = authenticated_client
    response = await client.post("/api/auth/logout")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_oauth_config(client: AsyncClient):
    response = await client.get("/api/auth/oauth-config")
    assert response.status_code == 200
    assert "google" in response.json()
