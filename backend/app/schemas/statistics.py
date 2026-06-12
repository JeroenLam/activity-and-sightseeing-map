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


class StatisticsResponse(BaseModel):
    total_locations: int
    total_visited: int
    total_unvisited: int
    total_countries: int
    visits_per_year: list[YearStat]
    locations_per_type: list[TypeStat]
    locations_per_country: list[CountryStat]
