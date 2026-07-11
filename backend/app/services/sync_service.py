from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.location import Location
from app.models.location_type import LocationType
from app.models.sync_conflict import SyncConflict
from app.models.sync_event import SyncEvent
from app.schemas.location import LocationFeatureCollection
from app.schemas.location import LocationCreateFeature, LocationUpdateFeature
from app.schemas.location_type import (
    LocationTypeCreate,
    LocationTypeResponse,
    LocationTypeUpdate,
)
from app.schemas.settings import SettingsResponse, SettingsUpdate


class SyncConflictError(Exception):
    def __init__(
        self,
        entity_type: str,
        entity_id: str,
        client_version: int | None,
        server_version: int,
    ) -> None:
        super().__init__("Sync conflict")
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.client_version = client_version
        self.server_version = server_version


async def record_event(
    db: AsyncSession,
    *,
    user_id: str,
    entity_type: str,
    entity_id: str,
    operation: str,
    entity_version: int,
    changed_fields: list[str] | None = None,
    payload: dict | None = None,
) -> SyncEvent:
    event = SyncEvent(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        operation=operation,
        entity_version=entity_version,
        changed_fields=changed_fields,
        payload=payload,
    )
    db.add(event)
    return event


async def get_cursor(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.max(SyncEvent.id)).where(SyncEvent.user_id == user_id)
    )
    cursor = result.scalar_one_or_none()
    return cursor or 0


async def build_bootstrap(
    db: AsyncSession, user_id: str
) -> tuple[
    LocationFeatureCollection, list[LocationTypeResponse], SettingsResponse, int
]:
    from app.routers.settings import get_settings
    from app.services.location_service import get_locations
    from app.services.type_service import get_types

    locations = await get_locations(db, user_id)
    types = await get_types(db, user_id)
    settings = await get_settings(user_id=user_id, db=db)
    cursor = await get_cursor(db, user_id)
    return locations, types, settings, cursor


async def list_changes(db: AsyncSession, user_id: str, cursor: int) -> list[SyncEvent]:
    result = await db.execute(
        select(SyncEvent)
        .where(SyncEvent.user_id == user_id, SyncEvent.id > cursor)
        .order_by(SyncEvent.id.asc())
    )
    return list(result.scalars().all())


async def _load_location(
    db: AsyncSession, user_id: str, location_id: str
) -> Location | None:
    result = await db.execute(
        select(Location)
        .options(
            selectinload(Location.location_type),
            selectinload(Location.visits),
            selectinload(Location.tags),
        )
        .where(Location.user_id == user_id, Location.id == location_id)
    )
    return result.scalar_one_or_none()


async def _load_type(
    db: AsyncSession, user_id: str, type_id: str
) -> LocationType | None:
    result = await db.execute(
        select(LocationType).where(
            LocationType.user_id == user_id, LocationType.id == type_id
        )
    )
    return result.scalar_one_or_none()


async def create_conflict(
    db: AsyncSession,
    *,
    user_id: str,
    entity_type: str,
    entity_id: str,
    operation: str,
    base_sync_version: int | None,
    client_version: int | None,
    server_version: int,
    client_payload: dict | None,
    server_payload: dict | None,
) -> SyncConflict:
    conflict = SyncConflict(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        operation=operation,
        base_sync_version=base_sync_version,
        client_version=client_version,
        server_version=server_version,
        client_payload=client_payload,
        server_payload=server_payload,
        status="open",
    )
    db.add(conflict)
    await db.commit()
    await db.refresh(conflict)
    return conflict


async def list_conflicts(db: AsyncSession, user_id: str) -> list[SyncConflict]:
    result = await db.execute(
        select(SyncConflict)
        .where(SyncConflict.user_id == user_id)
        .order_by(SyncConflict.id.desc())
    )
    return list(result.scalars().all())


async def get_conflict(
    db: AsyncSession, user_id: str, conflict_id: int
) -> SyncConflict | None:
    result = await db.execute(
        select(SyncConflict).where(
            SyncConflict.user_id == user_id, SyncConflict.id == conflict_id
        )
    )
    return result.scalar_one_or_none()


async def get_current_location_payload(
    db: AsyncSession, user_id: str, location_id: str
) -> dict | None:
    from app.services.location_service import _location_to_feature

    location = await _load_location(db, user_id, location_id)
    if not location or location.deleted_at is not None:
        return None
    return _location_to_feature(location).model_dump(mode="json")


async def get_current_type_payload(
    db: AsyncSession, user_id: str, type_id: str
) -> dict | None:
    type_obj = await _load_type(db, user_id, type_id)
    if not type_obj or type_obj.deleted_at is not None:
        return None
    return LocationTypeResponse.model_validate(type_obj).model_dump(mode="json")


async def get_current_settings_payload(db: AsyncSession, user_id: str) -> dict:
    from app.routers.settings import get_settings

    settings = await get_settings(user_id=user_id, db=db)
    return settings.model_dump(mode="json")


async def resolve_conflict(
    db: AsyncSession,
    *,
    user_id: str,
    conflict_id: int,
    resolution_mode: str,
    payload: dict | None,
) -> SyncConflict | None:
    conflict = await get_conflict(db, user_id, conflict_id)
    if not conflict or conflict.status != "open":
        return None

    from app.services.location_service import (
        create_location,
        delete_location,
        update_location,
    )
    from app.services.type_service import create_type, delete_type, update_type

    applied_payload: dict | None = None

    if resolution_mode == "use_server":
        applied_payload = conflict.server_payload
    elif conflict.entity_type == "location":
        if conflict.operation == "create":
            if resolution_mode in {"use_client", "merge"}:
                created = await create_location(
                    db,
                    user_id,
                    LocationCreateFeature.model_validate(
                        payload or conflict.client_payload or {}
                    ),
                )
                applied_payload = created.model_dump(mode="json")
        elif conflict.operation == "delete":
            if resolution_mode in {"use_client", "merge"}:
                await delete_location(db, user_id, conflict.entity_id)
                applied_payload = {"id": conflict.entity_id, "deleted": True}
        else:
            update_payload = payload or conflict.client_payload or {}
            applied = await update_location(
                db,
                user_id,
                conflict.entity_id,
                LocationUpdateFeature.model_validate(update_payload),
            )
            if applied:
                applied_payload = applied.model_dump(mode="json")
    elif conflict.entity_type == "type":
        if conflict.operation == "create":
            if resolution_mode in {"use_client", "merge"}:
                created = await create_type(
                    db,
                    user_id,
                    LocationTypeCreate.model_validate(
                        payload or conflict.client_payload or {}
                    ),
                )
                applied_payload = created.model_dump(mode="json")
        elif conflict.operation == "delete":
            if resolution_mode in {"use_client", "merge"}:
                await delete_type(db, user_id, conflict.entity_id)
                applied_payload = {"id": conflict.entity_id, "deleted": True}
        else:
            update_payload = payload or conflict.client_payload or {}
            applied = await update_type(
                db,
                user_id,
                conflict.entity_id,
                LocationTypeUpdate.model_validate(update_payload),
            )
            if applied:
                applied_payload = applied.model_dump(mode="json")
    elif conflict.entity_type == "settings":
        from app.routers.settings import update_settings

        if resolution_mode in {"use_client", "merge"}:
            update_payload = payload or conflict.client_payload or {}
            applied = await update_settings(
                SettingsUpdate.model_validate(update_payload),
                user_id=user_id,
                db=db,
            )
            applied_payload = applied.model_dump(mode="json")
        else:
            applied_payload = conflict.server_payload

    conflict.status = "resolved"
    conflict.resolution_mode = resolution_mode
    conflict.resolution_payload = applied_payload
    conflict.resolved_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(conflict)
    return conflict
