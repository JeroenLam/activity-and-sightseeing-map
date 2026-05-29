from fastapi import APIRouter, HTTPException

from app.middleware.auth import CurrentUserId, DB
from app.models.user import User, UserVisibilitySettings
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.services.auth_service import get_user_by_id

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings(user_id: CurrentUserId, db: DB):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from sqlalchemy import select

    result = await db.execute(
        select(UserVisibilitySettings).where(UserVisibilitySettings.user_id == user_id)
    )
    visibility = result.scalar_one_or_none()

    return SettingsResponse(
        preferred_language=user.preferred_language,
        default_map_lat=user.default_map_lat,
        default_map_lng=user.default_map_lng,
        default_map_zoom=user.default_map_zoom,
        profile_public=visibility.profile_public if visibility else False,
        location_filter=visibility.location_filter if visibility else "show-all",
        show_ratings=visibility.show_ratings if visibility else True,
        show_comments=visibility.show_comments if visibility else True,
    )


@router.put("", response_model=SettingsResponse)
async def update_settings(data: SettingsUpdate, user_id: CurrentUserId, db: DB):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update user fields
    if data.preferred_language is not None:
        user.preferred_language = data.preferred_language
    if data.default_map_lat is not None:
        user.default_map_lat = data.default_map_lat
    if data.default_map_lng is not None:
        user.default_map_lng = data.default_map_lng
    if data.default_map_zoom is not None:
        user.default_map_zoom = data.default_map_zoom

    # Update visibility settings
    from sqlalchemy import select

    result = await db.execute(
        select(UserVisibilitySettings).where(UserVisibilitySettings.user_id == user_id)
    )
    visibility = result.scalar_one_or_none()
    if not visibility:
        visibility = UserVisibilitySettings(user_id=user_id)
        db.add(visibility)

    if data.profile_public is not None:
        visibility.profile_public = data.profile_public
    if data.location_filter is not None:
        visibility.location_filter = data.location_filter
    if data.show_ratings is not None:
        visibility.show_ratings = data.show_ratings
    if data.show_comments is not None:
        visibility.show_comments = data.show_comments

    await db.commit()

    return SettingsResponse(
        preferred_language=user.preferred_language,
        default_map_lat=user.default_map_lat,
        default_map_lng=user.default_map_lng,
        default_map_zoom=user.default_map_zoom,
        profile_public=visibility.profile_public,
        location_filter=visibility.location_filter,
        show_ratings=visibility.show_ratings,
        show_comments=visibility.show_comments,
    )
