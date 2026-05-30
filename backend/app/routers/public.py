from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.middleware.auth import DB
from app.models.location import Location
from app.models.location_type import LocationType, TypeVisibility
from app.models.user import User, UserVisibilitySettings
from app.schemas.location import (
    LocationFeature,
    LocationFeatureCollection,
    LocationProperties,
    LocationTypeInline,
    PointGeometry,
)
from app.schemas.location_type import LocationTypeResponse

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/{user_id}/profile")
async def get_public_profile(user_id: str, db: DB):
    """Get a user's public profile including display name and type legend.

    Returns the user's display name and their public location types
    (excluding types marked as private). No authentication required.

    Example request:
        GET /api/public/550e8400-e29b-41d4-a716-446655440000/profile

    Example response:
        {
            "display_name": "Jan de Vries",
            "types": [
                {"id": "uuid", "name": "Museum", "color": "#2196F3", "icon": "bank"}
            ]
        }

    Returns 404 if the user does not exist or their profile is not public.
    """
    # Check user exists and is public
    user = await _get_public_user(db, user_id)

    # Get public types
    result = await db.execute(
        select(LocationType).where(LocationType.user_id == user_id)
    )
    all_types = result.scalars().all()

    # Filter by type visibility
    result = await db.execute(
        select(TypeVisibility).where(
            TypeVisibility.user_id == user_id,
            TypeVisibility.public == False,  # noqa: E712
        )
    )
    private_type_ids = {tv.type_id for tv in result.scalars().all()}
    public_types = [t for t in all_types if t.id not in private_type_ids]

    return {
        "display_name": user.display_name,
        "types": [LocationTypeResponse.model_validate(t) for t in public_types],
    }


@router.get("/{user_id}/locations", response_model=LocationFeatureCollection)
async def get_public_locations(user_id: str, db: DB):
    """Get a user's public locations as a GeoJSON FeatureCollection.

    Returns locations filtered by the user's visibility settings:
    - Types marked as private are excluded
    - Locations are filtered by the user's location_filter setting
      (show-all, visited-only, or unvisited-only)
    - Ratings and comments are hidden if disabled in visibility settings

    No authentication required.

    Example request:
        GET /api/public/550e8400-e29b-41d4-a716-446655440000/locations

    Returns a GeoJSON FeatureCollection. Returns 404 if the user does not
    exist or their profile is not public.
    """
    await _get_public_user(db, user_id)

    # Get visibility settings
    result = await db.execute(
        select(UserVisibilitySettings).where(UserVisibilitySettings.user_id == user_id)
    )
    visibility = result.scalar_one_or_none()
    if not visibility:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Get private type IDs
    result = await db.execute(
        select(TypeVisibility).where(
            TypeVisibility.user_id == user_id,
            TypeVisibility.public == False,  # noqa: E712
        )
    )
    private_type_ids = {tv.type_id for tv in result.scalars().all()}

    # Get locations
    query = (
        select(Location)
        .options(
            selectinload(Location.location_type),
            selectinload(Location.visits),
            selectinload(Location.tags),
        )
        .where(Location.user_id == user_id)
    )
    result = await db.execute(query)
    locations = list(result.scalars().all())

    # Filter by type visibility
    locations = [loc for loc in locations if loc.type_id not in private_type_ids]

    # Filter by location_filter setting
    if visibility.location_filter == "visited-only":
        locations = [loc for loc in locations if loc.visits or loc.visited_unknown_year]
    elif visibility.location_filter == "unvisited-only":
        locations = [
            loc for loc in locations if not loc.visits and not loc.visited_unknown_year
        ]

    # Build features respecting visibility
    features = []
    for loc in locations:
        type_inline = None
        if loc.location_type:
            type_inline = LocationTypeInline(
                id=loc.location_type.id,
                name=loc.location_type.name,
                color=loc.location_type.color,
                icon=loc.location_type.icon,
            )

        properties = LocationProperties(
            name=loc.name,
            type=type_inline,
            city=loc.city,
            country=loc.country,
            address=loc.address,
            link=loc.link,
            years_visited=sorted([v.year for v in loc.visits]),
            visited_unknown_year=loc.visited_unknown_year,
            rating=loc.rating if visibility.show_ratings else None,
            comments=loc.comments if visibility.show_comments else None,
            tags=[t.tag for t in loc.tags],
            created_at=loc.created_at,
            updated_at=loc.updated_at,
        )

        features.append(
            LocationFeature(
                id=loc.id,
                geometry=PointGeometry(coordinates=[loc.longitude, loc.latitude]),
                properties=properties,
            )
        )

    return LocationFeatureCollection(features=features)


async def _get_public_user(db: DB, user_id: str) -> User:
    """Get user and verify their profile is public."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(UserVisibilitySettings).where(UserVisibilitySettings.user_id == user_id)
    )
    visibility = result.scalar_one_or_none()
    if not visibility or not visibility.profile_public:
        raise HTTPException(status_code=404, detail="Profile not found")

    return user
