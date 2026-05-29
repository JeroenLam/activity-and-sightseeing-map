import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.location import Location
from app.models.location_type import LocationType
from app.schemas.location_type import (
    LocationTypeCreate,
    LocationTypeResponse,
    LocationTypeUpdate,
)


async def get_types(db: AsyncSession, user_id: str) -> list[LocationTypeResponse]:
    result = await db.execute(
        select(LocationType).where(LocationType.user_id == user_id)
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
    )
    db.add(location_type)
    await db.commit()
    await db.refresh(location_type)
    return LocationTypeResponse.model_validate(location_type)


async def update_type(
    db: AsyncSession, user_id: str, type_id: str, data: LocationTypeUpdate
) -> LocationTypeResponse | None:
    result = await db.execute(
        select(LocationType).where(
            LocationType.id == type_id, LocationType.user_id == user_id
        )
    )
    location_type = result.scalar_one_or_none()
    if not location_type:
        return None

    if data.name is not None:
        location_type.name = data.name
    if data.color is not None:
        location_type.color = data.color
    if data.icon is not None:
        location_type.icon = data.icon

    await db.commit()
    await db.refresh(location_type)
    return LocationTypeResponse.model_validate(location_type)


async def delete_type(db: AsyncSession, user_id: str, type_id: str) -> bool:
    result = await db.execute(
        select(LocationType).where(
            LocationType.id == type_id, LocationType.user_id == user_id
        )
    )
    location_type = result.scalar_one_or_none()
    if not location_type:
        return False
    await db.delete(location_type)
    await db.commit()
    return True


async def get_type_usage_count(
    db: AsyncSession, user_id: str, type_id: str
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Location)
        .where(Location.user_id == user_id, Location.type_id == type_id)
    )
    return result.scalar_one()
