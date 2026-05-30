from fastapi import APIRouter, HTTPException, Response, status

from app.config import settings
from app.middleware.auth import (
    CurrentUserId,
    DB,
    clear_token_cookie,
    create_token,
    set_token_cookie,
)
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    OAuthConfigResponse,
    RegisterRequest,
    UpdateProfileRequest,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, response: Response, db: DB):
    """Register a new local account with email and password.

    Creates a user, issues a JWT token stored in an httpOnly cookie, and returns
    the user profile.

    Example request body:
        {
            "email": "user@example.com",
            "password": "securePassword123",
            "display_name": "Jan de Vries"
        }

    Returns 409 if the email is already registered.
    """
    try:
        user = await auth_service.create_local_user(db, data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    token = create_token(user.id)
    set_token_cookie(response, token)
    return auth_service.user_to_response(user)


@router.post("/login", response_model=UserResponse)
async def login(data: LoginRequest, response: Response, db: DB):
    """Authenticate a user with email and password.

    On success, issues a JWT token stored in an httpOnly cookie and returns
    the user profile.

    Example request body:
        {
            "email": "user@example.com",
            "password": "securePassword123"
        }

    Returns 401 if credentials are invalid.
    """
    user = await auth_service.authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user.id)
    set_token_cookie(response, token)
    return auth_service.user_to_response(user)


@router.post("/logout")
async def logout(response: Response):
    """Log out the current user by clearing the JWT cookie.

    Always returns {"ok": true} regardless of whether the user was logged in.
    """
    clear_token_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: CurrentUserId, db: DB):
    """Get the current authenticated user's profile.

    Requires a valid JWT cookie. Returns the user's id, email, display_name,
    and preferred_language.

    Example response:
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "user@example.com",
            "display_name": "Jan de Vries",
            "preferred_language": "nl",
            "has_password": true
        }
    """
    user = await auth_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return auth_service.user_to_response(user)


@router.put("/me", response_model=UserResponse)
async def update_me(data: UpdateProfileRequest, user_id: CurrentUserId, db: DB):
    """Update the current user's profile (display name and/or language).

    Example request body:
        {
            "display_name": "Jan de Vries",
            "preferred_language": "en"
        }

    Returns the updated user profile. Returns 404 if user not found.
    """
    user = await auth_service.update_user_profile(
        db, user_id, data.display_name, data.preferred_language
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return auth_service.user_to_response(user)


@router.put("/me/password")
async def change_password(data: ChangePasswordRequest, user_id: CurrentUserId, db: DB):
    """Change the current user's password.

    Requires the current password for verification before setting the new one.

    Example request body:
        {
            "current_password": "oldPassword123",
            "new_password": "newSecurePassword456"
        }

    Returns 400 if the current password is incorrect.
    """
    success = await auth_service.change_password(
        db, user_id, data.current_password, data.new_password
    )
    if not success:
        raise HTTPException(status_code=400, detail="Invalid current password")
    return {"ok": True}


@router.get("/oauth-config", response_model=OAuthConfigResponse)
async def get_oauth_config():
    """Get available OAuth provider configuration.

    Returns which OAuth providers (e.g. Google) are configured and available
    for login. No authentication required.

    Example response:
        {
            "google": true
        }
    """
    return OAuthConfigResponse(
        google=bool(settings.google_client_id and settings.google_client_secret)
    )
