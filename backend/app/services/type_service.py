import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.location import Location
from app.models.location_type import LocationType
from app.schemas.location_type import (
    LocationTypeCreate,
    LocationTypeResponse,
    LocationTypeUpdate,
)
from app.services.sync_service import SyncConflictError, record_event


async def get_types(db: AsyncSession, user_id: str) -> list[LocationTypeResponse]:
    result = await db.execute(
        select(LocationType)
        .where(LocationType.user_id == user_id, LocationType.deleted_at.is_(None))
        .order_by(func.lower(LocationType.name))
    )
    types = result.scalars().all()
    return [LocationTypeResponse.model_validate(t) for t in types]


async def create_type(
    db: AsyncSession, user_id: str, data: LocationTypeCreate
) -> LocationTypeResponse:
    location_type = LocationType(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=data.name,
        color=data.color,
        icon=data.icon,
        sync_version=1,
        deleted_at=None,
    )
    db.add(location_type)
    await record_event(
        db,
        user_id=user_id,
        entity_type="type",
        entity_id=location_type.id,
        operation="create",
        entity_version=location_type.sync_version,
        changed_fields=["name", "color", "icon"],
        payload=LocationTypeResponse.model_validate(location_type).model_dump(mode="json"),
    )
    await db.commit()
    await db.refresh(location_type)
    return LocationTypeResponse.model_validate(location_type)


async def update_type(
    db: AsyncSession, user_id: str, type_id: str, data: LocationTypeUpdate
) -> LocationTypeResponse | None:
    result = await db.execute(
        select(LocationType).where(
            LocationType.id == type_id,
            LocationType.user_id == user_id,
            LocationType.deleted_at.is_(None),
        )
    )
    location_type = result.scalar_one_or_none()
    if not location_type:
        return None

    if (
        data.base_sync_version is not None
        and data.base_sync_version != location_type.sync_version
    ):
        raise SyncConflictError(
            entity_type="type",
            entity_id=location_type.id,
            client_version=data.base_sync_version,
            server_version=location_type.sync_version,
        )

    if data.name is not None:
        location_type.name = data.name
    if data.color is not None:
        location_type.color = data.color
    if data.icon is not None:
        location_type.icon = data.icon

    location_type.sync_version += 1
    await record_event(
        db,
        user_id=user_id,
        entity_type="type",
        entity_id=location_type.id,
        operation="update",
        entity_version=location_type.sync_version,
        changed_fields=[
            field
            for field, value in {
                "name": data.name is not None,
                "color": data.color is not None,
                "icon": data.icon is not None,
            }.items()
            if value
        ],
        payload=LocationTypeResponse.model_validate(location_type).model_dump(mode="json"),
    )
    await db.commit()
    await db.refresh(location_type)
    return LocationTypeResponse.model_validate(location_type)


async def delete_type(db: AsyncSession, user_id: str, type_id: str) -> bool:
    result = await db.execute(
        select(LocationType).where(
            LocationType.id == type_id,
            LocationType.user_id == user_id,
            LocationType.deleted_at.is_(None),
        )
    )
    location_type = result.scalar_one_or_none()
    if not location_type:
        return False
    location_type.deleted_at = datetime.now(UTC)
    location_type.sync_version += 1
    await record_event(
        db,
        user_id=user_id,
        entity_type="type",
        entity_id=location_type.id,
        operation="delete",
        entity_version=location_type.sync_version,
        changed_fields=["deleted"],
        payload={"id": location_type.id, "deleted": True},
    )
    await db.commit()
    return True


async def get_type_usage_count(db: AsyncSession, user_id: str, type_id: str) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Location)
        .where(
            Location.user_id == user_id,
            Location.type_id == type_id,
            Location.deleted_at.is_(None),
        )
    )
    return result.scalar_one()
