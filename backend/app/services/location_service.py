import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.location import Location, LocationTag, LocationVisit
from app.schemas.location import (
    BulkLocationUpdateProperties,
    LocationCreateFeature,
    LocationFeature,
    LocationFeatureCollection,
    LocationProperties,
    LocationTypeInline,
    LocationUpdateFeature,
    PointGeometry,
)
from app.services.sync_service import SyncConflictError, record_event


def _location_to_feature(location: Location) -> LocationFeature:
    type_inline = None
    if location.location_type:
        type_inline = LocationTypeInline(
            id=location.location_type.id,
            name=location.location_type.name,
            color=location.location_type.color,
            icon=location.location_type.icon,
        )

    return LocationFeature(
        id=location.id,
        geometry=PointGeometry(coordinates=[location.longitude, location.latitude]),
        properties=LocationProperties(
            name=location.name,
            type=type_inline,
            city=location.city,
            country=location.country,
            address=location.address,
            link=location.link,
            years_visited=sorted([v.year for v in location.visits]),
            visited_unknown_year=location.visited_unknown_year,
            rating=location.rating,
            comments=location.comments,
            tags=[t.tag for t in location.tags],
            sync_version=location.sync_version,
            created_at=location.created_at,
            updated_at=location.updated_at,
        ),
    )


async def _get_location_query(db: AsyncSession, user_id: str):  # noqa: ANN202
    return (
        select(Location)
        .options(
            selectinload(Location.location_type),
            selectinload(Location.visits),
            selectinload(Location.tags),
        )
        .where(Location.user_id == user_id, Location.deleted_at.is_(None))
    )


async def get_locations(
    db: AsyncSession,
    user_id: str,
    year_from: int | None = None,
    year_to: int | None = None,
    unvisited: bool = False,
    type_id: str | None = None,
) -> LocationFeatureCollection:
    query = await _get_location_query(db, user_id)

    if type_id:
        query = query.where(Location.type_id == type_id)

    result = await db.execute(query)
    locations = list(result.scalars().all())

    # Filter by visit years (post-query due to relationship)
    if unvisited:
        locations = [
            loc for loc in locations if not loc.visits and not loc.visited_unknown_year
        ]
    elif year_from is not None or year_to is not None:
        filtered = []
        for loc in locations:
            years = [v.year for v in loc.visits]
            if not years:
                continue
            if year_from and not any(y >= year_from for y in years):
                continue
            if year_to and not any(y <= year_to for y in years):
                continue
            filtered.append(loc)
        locations = filtered

    features = [_location_to_feature(loc) for loc in locations]
    return LocationFeatureCollection(features=features)


async def get_location(
    db: AsyncSession, user_id: str, location_id: str
) -> LocationFeature | None:
    query = (await _get_location_query(db, user_id)).where(Location.id == location_id)
    result = await db.execute(query)
    location = result.scalar_one_or_none()
    if not location:
        return None
    if location.deleted_at is not None:
        return None
    return _location_to_feature(location)


async def create_location(
    db: AsyncSession, user_id: str, data: LocationCreateFeature
) -> LocationFeature:
    lon, lat = data.geometry.coordinates
    props = data.properties

    location = Location(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=props.name,
        type_id=props.type_id,
        city=props.city,
        country=props.country,
        address=props.address,
        link=props.link,
        latitude=lat,
        longitude=lon,
        rating=props.rating,
        comments=props.comments,
        visited_unknown_year=props.visited_unknown_year,
        sync_version=1,
        deleted_at=None,
    )
    db.add(location)

    for year in props.years_visited:
        db.add(LocationVisit(id=str(uuid.uuid4()), location_id=location.id, year=year))

    for tag in props.tags:
        db.add(LocationTag(id=str(uuid.uuid4()), location_id=location.id, tag=tag))

    await db.flush()

    # Reload with relationships
    query = (await _get_location_query(db, user_id)).where(Location.id == location.id)
    result = await db.execute(query)
    location = result.scalar_one()
    await record_event(
        db,
        user_id=user_id,
        entity_type="location",
        entity_id=location.id,
        operation="create",
        entity_version=location.sync_version,
        changed_fields=["geometry", "properties"],
        payload=_location_to_feature(location).model_dump(mode="json"),
    )
    await db.commit()
    return _location_to_feature(location)


async def update_location(
    db: AsyncSession, user_id: str, location_id: str, data: LocationUpdateFeature
) -> LocationFeature | None:
    query = (
        select(Location)
        .options(
            selectinload(Location.location_type),
            selectinload(Location.visits),
            selectinload(Location.tags),
        )
        .where(Location.id == location_id, Location.user_id == user_id)
        .where(Location.deleted_at.is_(None))
    )
    result = await db.execute(query)
    location = result.scalar_one_or_none()
    if not location:
        return None

    # Update geometry
    if data.geometry:
        lon, lat = data.geometry.coordinates
        location.latitude = lat
        location.longitude = lon

    # Update properties
    props = data.properties
    if props.base_sync_version is not None and props.base_sync_version != location.sync_version:
        raise SyncConflictError(
            entity_type="location",
            entity_id=location.id,
            client_version=props.base_sync_version,
            server_version=location.sync_version,
        )
    if props.name is not None:
        location.name = props.name
    if props.type_id is not None:
        location.type_id = props.type_id
    if props.city is not None:
        location.city = props.city
    if props.country is not None:
        location.country = props.country
    if props.address is not None:
        location.address = props.address
    if props.link is not None:
        location.link = props.link
    if props.rating is not None:
        location.rating = props.rating
    if props.comments is not None:
        location.comments = props.comments
    if props.visited_unknown_year is not None:
        location.visited_unknown_year = props.visited_unknown_year

    changed_fields = []
    if data.geometry is not None:
        changed_fields.append("geometry")
    changed_fields.extend(
        [
            field
            for field, value in {
                "name": props.name is not None,
                "type_id": props.type_id is not None,
                "city": props.city is not None,
                "country": props.country is not None,
                "address": props.address is not None,
                "link": props.link is not None,
                "rating": props.rating is not None,
                "comments": props.comments is not None,
                "visited_unknown_year": props.visited_unknown_year is not None,
                "years_visited": props.years_visited is not None,
                "tags": props.tags is not None,
            }.items()
            if value
        ]
    )

    location.updated_at = datetime.now(UTC)
    location.sync_version += 1

    # Update visits if provided
    if props.years_visited is not None:
        # Remove existing visits
        for visit in location.visits:
            await db.delete(visit)
        # Add new visits
        for year in props.years_visited:
            db.add(
                LocationVisit(id=str(uuid.uuid4()), location_id=location.id, year=year)
            )

    # Update tags if provided
    if props.tags is not None:
        for tag in location.tags:
            await db.delete(tag)
        for tag_name in props.tags:
            db.add(
                LocationTag(id=str(uuid.uuid4()), location_id=location.id, tag=tag_name)
            )

    await db.flush()

    query2 = (await _get_location_query(db, user_id)).where(Location.id == location.id)
    result2 = await db.execute(query2)
    location = result2.scalar_one()

    await record_event(
        db,
        user_id=user_id,
        entity_type="location",
        entity_id=location.id,
        operation="update",
        entity_version=location.sync_version,
        changed_fields=changed_fields,
        payload=_location_to_feature(location).model_dump(mode="json"),
    )
    await db.commit()
    return _location_to_feature(location)


async def delete_location(db: AsyncSession, user_id: str, location_id: str) -> bool:
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.user_id == user_id)
    )
    location = result.scalar_one_or_none()
    if not location:
        return False
    location.deleted_at = datetime.now(UTC)
    location.sync_version += 1
    await record_event(
        db,
        user_id=user_id,
        entity_type="location",
        entity_id=location.id,
        operation="delete",
        entity_version=location.sync_version,
        changed_fields=["deleted"],
        payload={"id": location.id, "deleted": True},
    )
    await db.commit()
    return True


async def bulk_create_locations(
    db: AsyncSession,
    user_id: str,
    items: list[LocationCreateFeature],
) -> list[LocationFeature]:
    created = []
    for item in items:
        feature = await create_location(db, user_id, item)
        created.append(feature)
    return created


async def bulk_update_locations(
    db: AsyncSession,
    user_id: str,
    location_ids: list[str],
    properties: BulkLocationUpdateProperties,
) -> list[LocationFeature]:
    query = (
        select(Location)
        .options(
            selectinload(Location.location_type),
            selectinload(Location.visits),
            selectinload(Location.tags),
        )
        .where(Location.user_id == user_id, Location.id.in_(location_ids))
        .where(Location.deleted_at.is_(None))
    )
    result = await db.execute(query)
    locations = list(result.scalars().all())

    if not locations:
        return []

    for location in locations:
        if (
            getattr(properties, "base_sync_version", None) is not None
            and properties.base_sync_version != location.sync_version
        ):
            raise SyncConflictError(
                entity_type="location",
                entity_id=location.id,
                client_version=properties.base_sync_version,
                server_version=location.sync_version,
            )
        if properties.type_id is not None:
            location.type_id = properties.type_id
        if properties.rating is not None:
            location.rating = properties.rating
        if properties.year_to_add is not None:
            existing_years = {visit.year for visit in location.visits}
            if properties.year_to_add not in existing_years:
                db.add(
                    LocationVisit(
                        id=str(uuid.uuid4()),
                        location_id=location.id,
                        year=properties.year_to_add,
                    )
                )
            location.visited_unknown_year = False

        location.updated_at = datetime.now(UTC)
        location.sync_version += 1

        await record_event(
            db,
            user_id=user_id,
            entity_type="location",
            entity_id=location.id,
            operation="update",
            entity_version=location.sync_version,
            changed_fields=[
                field
                for field, value in {
                    "type_id": properties.type_id is not None,
                    "rating": properties.rating is not None,
                    "year_to_add": properties.year_to_add is not None,
                }.items()
                if value
            ],
            payload=_location_to_feature(location).model_dump(mode="json"),
        )

    await db.commit()
    db.expire_all()

    reloaded = await db.execute(
        (await _get_location_query(db, user_id)).where(Location.id.in_(location_ids))
    )
    locations_by_id = {location.id: location for location in reloaded.scalars().all()}
    return [
        _location_to_feature(locations_by_id[location_id])
        for location_id in location_ids
        if location_id in locations_by_id
    ]
