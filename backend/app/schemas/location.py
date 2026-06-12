from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class PointGeometry(BaseModel):
    type: str = "Point"
    coordinates: list[float] = Field(
        ..., min_length=2, max_length=2, description="[longitude, latitude]"
    )

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, v: list[float]) -> list[float]:
        lon, lat = v
        if not (-180 <= lon <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        if not (-90 <= lat <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v


class LocationTypeInline(BaseModel):
    id: str
    name: str
    color: str
    icon: str


class LocationProperties(BaseModel):
    name: str
    type: LocationTypeInline | None = None
    city: str = ""
    country: str = ""
    address: str | None = None
    link: str | None = None
    years_visited: list[int] = []
    visited_unknown_year: bool = False
    rating: int | None = Field(None, ge=1, le=5)
    comments: str | None = None
    tags: list[str] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None


class LocationFeature(BaseModel):
    type: str = "Feature"
    id: str | None = None
    geometry: PointGeometry
    properties: LocationProperties


class LocationFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[LocationFeature]


class LocationCreateProperties(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type_id: str | None = None
    city: str = ""
    country: str = ""
    address: str | None = None
    link: str | None = None
    years_visited: list[int] = []
    visited_unknown_year: bool = False
    rating: int | None = Field(None, ge=1, le=5)
    comments: str | None = None
    tags: list[str] = []


class LocationCreateFeature(BaseModel):
    type: str = "Feature"
    geometry: PointGeometry
    properties: LocationCreateProperties


class LocationUpdateProperties(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    type_id: str | None = None
    city: str | None = None
    country: str | None = None
    address: str | None = None
    link: str | None = None
    years_visited: list[int] | None = None
    visited_unknown_year: bool | None = None
    rating: int | None = Field(None, ge=1, le=5)
    comments: str | None = None
    tags: list[str] | None = None


class LocationUpdateFeature(BaseModel):
    type: str = "Feature"
    geometry: PointGeometry | None = None
    properties: LocationUpdateProperties


class BulkLocationUpdateProperties(BaseModel):
    type_id: str | None = None
    rating: int | None = Field(None, ge=1, le=5)
    year_to_add: int | None = Field(None, ge=1900, le=3000)

    @model_validator(mode="after")
    def validate_has_changes(self) -> "BulkLocationUpdateProperties":
        if (
            self.type_id is None
            and self.rating is None
            and self.year_to_add is None
        ):
            raise ValueError("At least one bulk edit change must be provided")
        return self


class BulkLocationUpdateRequest(BaseModel):
    location_ids: list[str] = Field(..., min_length=1)
    properties: BulkLocationUpdateProperties


class CsvPreviewRequest(BaseModel):
    csv: str


class CsvPreviewResponse(BaseModel):
    headers: list[str]
    column_map: dict[str, str]
    preview: list[dict[str, Any]]
    total_rows: int


class CsvImportRequest(BaseModel):
    csv: str
    column_map: dict[str, str] | None = None


class ImportResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str]
