from collections import Counter
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.location import Location, LocationVisit
from app.models.location_type import LocationType
from app.schemas.statistics import (
    CountryStat,
    CountryYearStat,
    StatisticsResponse,
    TypeStat,
    TypeYearStat,
    YearStat,
)


def estimate_continent(latitude: float, longitude: float) -> str:
    """Estimate continent from coordinates using broad geographic bounds."""
    if latitude <= -60:
        return "Antarctica"

    if -35 <= latitude <= 38 and -20 <= longitude <= 52:
        return "Africa"

    if 35 <= latitude <= 72 and -25 <= longitude <= 45:
        return "Europe"

    if 1 <= latitude <= 81 and 26 <= longitude <= 180:
        return "Asia"

    if -50 <= latitude <= 0 and 110 <= longitude <= 180:
        return "Oceania"

    if 7 <= latitude <= 83 and -170 <= longitude <= -52:
        return "North America"

    if -56 <= latitude <= 13 and -81 <= longitude <= -34:
        return "South America"

    return "Unknown"


UNCATEGORIZED_TYPE_KEY: tuple[str | None, str, str] = (None, "Uncategorized", "#9E9E9E")


@dataclass(slots=True)
class _StatsLocation:
    """The subset of a location's data that the statistics need."""

    city: str
    country: str
    rating: int | None
    comments: str | None
    visited_unknown_year: bool
    latitude: float
    longitude: float
    #: ``(type_id, type_name, color)``; :data:`UNCATEGORIZED_TYPE_KEY` if untyped.
    type_key: tuple[str | None, str, str]
    years: list[int] = field(default_factory=list)


async def _load_stats_locations(db: AsyncSession, user_id: str) -> list[_StatsLocation]:
    """Load the user's non-deleted locations with their visit years.

    Uses two flat queries (locations joined with their type, and all visit
    years) instead of loading ORM objects with their relationships, which
    was several times slower for large collections and also loaded tags
    that no statistic uses. Soft-deleted locations are excluded.
    """
    location_filter = (Location.user_id == user_id, Location.deleted_at.is_(None))
    location_rows = await db.execute(
        select(
            Location.id,
            Location.city,
            Location.country,
            Location.rating,
            Location.comments,
            Location.visited_unknown_year,
            Location.latitude,
            Location.longitude,
            LocationType.id.label("type_id"),
            LocationType.name.label("type_name"),
            LocationType.color.label("type_color"),
        )
        .outerjoin(LocationType, Location.type_id == LocationType.id)
        .where(*location_filter)
    )
    locations: dict[str, _StatsLocation] = {
        row.id: _StatsLocation(
            city=row.city,
            country=row.country,
            rating=row.rating,
            comments=row.comments,
            visited_unknown_year=row.visited_unknown_year,
            latitude=row.latitude,
            longitude=row.longitude,
            type_key=(
                (row.type_id, row.type_name, row.type_color)
                if row.type_id is not None
                else UNCATEGORIZED_TYPE_KEY
            ),
        )
        for row in location_rows
    }

    visit_rows = await db.execute(
        select(LocationVisit.location_id, LocationVisit.year)
        .join(Location, LocationVisit.location_id == Location.id)
        .where(*location_filter)
    )
    for location_id, year in visit_rows:
        locations[location_id].years.append(year)

    return list(locations.values())


async def get_statistics(db: AsyncSession, user_id: str) -> StatisticsResponse:
    locations = await _load_stats_locations(db, user_id)

    total_locations = len(locations)

    # Visited vs unvisited
    visited = [loc for loc in locations if loc.years or loc.visited_unknown_year]
    total_visited = len(visited)
    total_unvisited = total_locations - total_visited

    city_counter: Counter[str] = Counter()
    ratings_provided = 0
    comments_provided = 0
    locations_visited_multiple_years = 0

    for loc in visited:
        city = loc.city.strip() if loc.city else ""
        if city:
            city_counter[city.casefold()] += 1

        if loc.rating is not None:
            ratings_provided += 1

        if loc.comments and loc.comments.strip():
            comments_provided += 1

        if len(set(loc.years)) >= 2:
            locations_visited_multiple_years += 1

    total_cities = len(city_counter)

    # Visits per year
    year_counter: Counter[int] = Counter()
    for loc in locations:
        for year in loc.years:
            year_counter[year] += 1

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
        for year in loc.years:
            country_year_counter[(year, country)] += 1

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
        for year in loc.years:
            type_year_counter[(year, *loc.type_key)] += 1

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
        type_counter[loc.type_key] += 1

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
        visited_type_counter[loc.type_key] += 1

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

    visited_continents = {
        estimate_continent(loc.latitude, loc.longitude) for loc in visited
    }
    visited_continents.discard("Unknown")
    total_visited_continents = len(visited_continents)

    return StatisticsResponse(
        total_locations=total_locations,
        total_visited=total_visited,
        total_unvisited=total_unvisited,
        total_countries=total_countries,
        total_cities=total_cities,
        total_ratings_provided=ratings_provided,
        total_comments_provided=comments_provided,
        total_locations_visited_multiple_years=locations_visited_multiple_years,
        total_visited_continents=total_visited_continents,
        visits_per_year=visits_per_year,
        locations_per_type=locations_per_type,
        visited_locations_per_type=visited_locations_per_type,
        locations_per_country=locations_per_country,
        visited_locations_per_country=visited_locations_per_country,
        visited_locations_per_year_by_country=visited_locations_per_year_by_country,
        visited_locations_per_year_by_type=visited_locations_per_year_by_type,
    )
