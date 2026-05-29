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
    try:
        user = await auth_service.create_local_user(db, data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    token = create_token(user.id)
    set_token_cookie(response, token)
    return auth_service.user_to_response(user)


@router.post("/login", response_model=UserResponse)
async def login(data: LoginRequest, response: Response, db: DB):
    user = await auth_service.authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user.id)
    set_token_cookie(response, token)
    return auth_service.user_to_response(user)


@router.post("/logout")
async def logout(response: Response):
    clear_token_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: CurrentUserId, db: DB):
    user = await auth_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return auth_service.user_to_response(user)


@router.put("/me", response_model=UserResponse)
async def update_me(data: UpdateProfileRequest, user_id: CurrentUserId, db: DB):
    user = await auth_service.update_user_profile(
        db, user_id, data.display_name, data.preferred_language
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return auth_service.user_to_response(user)


@router.put("/me/password")
async def change_password(data: ChangePasswordRequest, user_id: CurrentUserId, db: DB):
    success = await auth_service.change_password(
        db, user_id, data.current_password, data.new_password
    )
    if not success:
        raise HTTPException(status_code=400, detail="Invalid current password")
    return {"ok": True}


@router.get("/oauth-config", response_model=OAuthConfigResponse)
async def get_oauth_config():
    return OAuthConfigResponse(
        google=bool(settings.google_client_id and settings.google_client_secret)
    )
