from pydantic import BaseModel


class YearStat(BaseModel):
    year: int
    count: int


class TypeStat(BaseModel):
    type_id: str | None
    type_name: str
    color: str
    count: int


class CountryStat(BaseModel):
    country: str
    count: int


class CountryYearStat(BaseModel):
    year: int
    country: str
    count: int


class TypeYearStat(BaseModel):
    year: int
    type_id: str | None
    type_name: str
    color: str
    count: int


class StatisticsResponse(BaseModel):
    total_locations: int
    total_visited: int
    total_unvisited: int
    total_countries: int
    visits_per_year: list[YearStat]
    locations_per_type: list[TypeStat]
    visited_locations_per_type: list[TypeStat]
    locations_per_country: list[CountryStat]
    visited_locations_per_country: list[CountryStat]
    visited_locations_per_year_by_country: list[CountryYearStat]
    visited_locations_per_year_by_type: list[TypeYearStat]
