from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    preferred_language: str
    default_map_lat: float | None = None
    default_map_lng: float | None = None
    default_map_zoom: int | None = None
    map_tile_set: str = "auto"
    profile_public: bool = False
    location_filter: str = "show-all"
    show_ratings: bool = True
    show_comments: bool = True


class SettingsUpdate(BaseModel):
    preferred_language: str | None = Field(None, pattern=r"^(nl|en)$")
    default_map_lat: float | None = Field(None, ge=-90, le=90)
    default_map_lng: float | None = Field(None, ge=-180, le=180)
    default_map_zoom: int | None = Field(None, ge=1, le=20)
    map_tile_set: str | None = Field(
        None,
        pattern=r"^(auto|openstreetmap|carto-light|carto-dark|esri-world-imagery|opentopomap)$",
    )
    profile_public: bool | None = None
    location_filter: str | None = Field(
        None, pattern=r"^(show-all|visited-only|unvisited-only)$"
    )
    show_ratings: bool | None = None
    show_comments: bool | None = None
