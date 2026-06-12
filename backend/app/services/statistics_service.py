from collections import Counter

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.location import Location
from app.schemas.statistics import (
    CountryYearStat,
    CountryStat,
    StatisticsResponse,
    TypeStat,
    TypeYearStat,
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
    visited = [loc for loc in locations if loc.visits or loc.visited_unknown_year]
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

    # Visited locations per year by country
    country_year_counter: Counter[tuple[int, str]] = Counter()
    for loc in locations:
        country = loc.country.strip() if loc.country else ""
        if not country:
            continue
        for visit in loc.visits:
            country_year_counter[(visit.year, country)] += 1

    visited_locations_per_year_by_country = sorted(
        [
            CountryYearStat(year=year, country=country, count=count)
            for (year, country), count in country_year_counter.items()
        ],
        key=lambda x: (x.year, x.country),
    )

    # Visited locations per year by type
    type_year_counter: Counter[tuple[int, str | None, str, str]] = Counter()
    for loc in locations:
        if loc.location_type:
            type_key = (
                loc.location_type.id,
                loc.location_type.name,
                loc.location_type.color,
            )
        else:
            type_key = (None, "Uncategorized", "#9E9E9E")

        for visit in loc.visits:
            type_year_counter[(visit.year, *type_key)] += 1

    visited_locations_per_year_by_type = sorted(
        [
            TypeYearStat(
                year=year,
                type_id=type_id,
                type_name=type_name,
                color=color,
                count=count,
            )
            for (year, type_id, type_name, color), count in type_year_counter.items()
        ],
        key=lambda x: (x.year, x.type_name),
    )

    # Locations per type
    type_counter: Counter[tuple[str | None, str, str]] = Counter()
    for loc in locations:
        if loc.location_type:
            key = (
                loc.location_type.id,
                loc.location_type.name,
                loc.location_type.color,
            )
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

    visited_type_counter: Counter[tuple[str | None, str, str]] = Counter()
    for loc in visited:
        if loc.location_type:
            key = (
                loc.location_type.id,
                loc.location_type.name,
                loc.location_type.color,
            )
        else:
            key = (None, "Uncategorized", "#9E9E9E")
        visited_type_counter[key] += 1

    visited_locations_per_type = sorted(
        [
            TypeStat(type_id=key[0], type_name=key[1], color=key[2], count=count)
            for key, count in visited_type_counter.items()
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

    visited_country_counter: Counter[str] = Counter()
    for loc in visited:
        country = loc.country.strip() if loc.country else ""
        if country:
            visited_country_counter[country] += 1

    visited_locations_per_country = sorted(
        [
            CountryStat(country=country, count=count)
            for country, count in visited_country_counter.items()
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
        visited_locations_per_type=visited_locations_per_type,
        locations_per_country=locations_per_country,
        visited_locations_per_country=visited_locations_per_country,
        visited_locations_per_year_by_country=visited_locations_per_year_by_country,
        visited_locations_per_year_by_type=visited_locations_per_year_by_type,
    )
