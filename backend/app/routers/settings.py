from fastapi import APIRouter, HTTPException

from app.middleware.auth import DB, CurrentUserId
from app.models.user import UserVisibilitySettings
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.services.auth_service import get_user_by_id
from app.services.sync_service import SyncConflictError, record_event

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
        map_tile_set=user.map_tile_set,
        profile_public=visibility.profile_public if visibility else False,
        location_filter=visibility.location_filter if visibility else "show-all",
        show_ratings=visibility.show_ratings if visibility else True,
        show_comments=visibility.show_comments if visibility else True,
        sync_version=user.sync_version,
    )


@router.put("", response_model=SettingsResponse)
async def update_settings(data: SettingsUpdate, user_id: CurrentUserId, db: DB):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.base_sync_version is not None and data.base_sync_version != user.sync_version:
        raise SyncConflictError(
            entity_type="settings",
            entity_id=user.id,
            client_version=data.base_sync_version,
            server_version=user.sync_version,
        )

    # Update user fields
    if data.preferred_language is not None:
        user.preferred_language = data.preferred_language
    if data.default_map_lat is not None:
        user.default_map_lat = data.default_map_lat
    if data.default_map_lng is not None:
        user.default_map_lng = data.default_map_lng
    if data.default_map_zoom is not None:
        user.default_map_zoom = data.default_map_zoom
    if data.map_tile_set is not None:
        user.map_tile_set = data.map_tile_set

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

    user.sync_version += 1

    await record_event(
        db,
        user_id=user_id,
        entity_type="settings",
        entity_id=user.id,
        operation="update",
        entity_version=user.sync_version,
        changed_fields=[
            field
            for field, value in {
                "preferred_language": data.preferred_language is not None,
                "default_map_lat": data.default_map_lat is not None,
                "default_map_lng": data.default_map_lng is not None,
                "default_map_zoom": data.default_map_zoom is not None,
                "map_tile_set": data.map_tile_set is not None,
                "profile_public": data.profile_public is not None,
                "location_filter": data.location_filter is not None,
                "show_ratings": data.show_ratings is not None,
                "show_comments": data.show_comments is not None,
            }.items()
            if value
        ],
        payload={
            "preferred_language": user.preferred_language,
            "default_map_lat": user.default_map_lat,
            "default_map_lng": user.default_map_lng,
            "default_map_zoom": user.default_map_zoom,
            "map_tile_set": user.map_tile_set,
            "profile_public": visibility.profile_public,
            "location_filter": visibility.location_filter,
            "show_ratings": visibility.show_ratings,
            "show_comments": visibility.show_comments,
            "sync_version": user.sync_version,
        },
    )

    await db.commit()

    return SettingsResponse(
        preferred_language=user.preferred_language,
        default_map_lat=user.default_map_lat,
        default_map_lng=user.default_map_lng,
        default_map_zoom=user.default_map_zoom,
        map_tile_set=user.map_tile_set,
        profile_public=visibility.profile_public,
        location_filter=visibility.location_filter,
        show_ratings=visibility.show_ratings,
        show_comments=visibility.show_comments,
        sync_version=user.sync_version,
    )
