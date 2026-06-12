from collections import Counter

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.location import Location
from app.schemas.statistics import (
    CountryStat,
    StatisticsResponse,
    TypeStat,
    YearStat,
)


async def get_statistics(db: AsyncSession, user_id: str) -> StatisticsResponse:
    query = (
        select(Location)
        .options(
            selectinload(Location.location_type),
            selectinload(Location.visits),
        )
        .where(Location.user_id == user_id)
    )
    result = await db.execute(query)
    locations = list(result.scalars().all())

    total_locations = len(locations)

    # Visited vs unvisited
    visited = [
        loc
        for loc in locations
        if loc.visits or loc.visited_unknown_year
    ]
    total_visited = len(visited)
    total_unvisited = total_locations - total_visited

    # Visits per year
    year_counter: Counter[int] = Counter()
    for loc in locations:
        for visit in loc.visits:
            year_counter[visit.year] += 1

    visits_per_year = sorted(
        [YearStat(year=year, count=count) for year, count in year_counter.items()],
        key=lambda x: x.year,
    )

    # Locations per type
    type_counter: Counter[tuple[str | None, str, str]] = Counter()
    for loc in locations:
        if loc.location_type:
            key = (loc.location_type.id, loc.location_type.name, loc.location_type.color)
        else:
            key = (None, "Uncategorized", "#9E9E9E")
        type_counter[key] += 1

    locations_per_type = sorted(
        [
            TypeStat(type_id=key[0], type_name=key[1], color=key[2], count=count)
            for key, count in type_counter.items()
        ],
        key=lambda x: x.count,
        reverse=True,
    )

    # Locations per country
    country_counter: Counter[str] = Counter()
    for loc in locations:
        country = loc.country.strip() if loc.country else ""
        if country:
            country_counter[country] += 1

    total_countries = len(country_counter)

    locations_per_country = sorted(
        [
            CountryStat(country=country, count=count)
            for country, count in country_counter.items()
        ],
        key=lambda x: x.count,
        reverse=True,
    )

    return StatisticsResponse(
        total_locations=total_locations,
        total_visited=total_visited,
        total_unvisited=total_unvisited,
        total_countries=total_countries,
        visits_per_year=visits_per_year,
        locations_per_type=locations_per_type,
        locations_per_country=locations_per_country,
    )
