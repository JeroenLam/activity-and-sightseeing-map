from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.middleware.auth import DB, CurrentUserId
from app.schemas.location import (
    CsvImportRequest,
    CsvPreviewRequest,
    CsvPreviewResponse,
    ImportResult,
    LocationCreateFeature,
    LocationFeature,
    LocationFeatureCollection,
    LocationUpdateFeature,
)
from app.services import csv_service, geocoding_service, location_service

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("", response_model=LocationFeatureCollection)
async def list_locations(
    user_id: CurrentUserId,
    db: DB,
    year_from: int | None = Query(None),
    year_to: int | None = Query(None),
    unvisited: bool = Query(False),
    type_id: str | None = Query(None),
):
    return await location_service.get_locations(
        db,
        user_id,
        year_from=year_from,
        year_to=year_to,
        unvisited=unvisited,
        type_id=type_id,
    )


@router.post("", response_model=LocationFeature, status_code=201)
async def create_location(data: LocationCreateFeature, user_id: CurrentUserId, db: DB):
    return await location_service.create_location(db, user_id, data)


@router.get("/export/geojson", response_model=LocationFeatureCollection)
async def export_geojson(user_id: CurrentUserId, db: DB):
    return await location_service.get_locations(db, user_id)


@router.post("/import/preview", response_model=CsvPreviewResponse)
async def preview_csv_import(data: CsvPreviewRequest, user_id: CurrentUserId, db: DB):
    headers, rows = csv_service.parse_csv(data.csv)
    column_map = csv_service.detect_column_map(headers)
    preview = rows[:10] if rows else []
    return CsvPreviewResponse(
        headers=headers,
        column_map=column_map,
        preview=preview,
        total_rows=len(rows),
    )


@router.post("/import", response_model=ImportResult)
async def import_csv(data: CsvImportRequest, user_id: CurrentUserId, db: DB):
    headers, rows = csv_service.parse_csv(data.csv)
    column_map = data.column_map or csv_service.detect_column_map(headers)

    from app.services.type_service import get_types

    existing_types = await get_types(db, user_id)
    type_map = {t.name.lower(): t.id for t in existing_types}

    imported = 0
    skipped = 0
    errors: list[str] = []

    for i, row in enumerate(rows):
        try:
            mapped = csv_service.map_csv_row(row, column_map)
            name = mapped.get("name", "")
            if not name:
                skipped += 1
                continue

            # Resolve type
            type_id = None
            type_name = mapped.get("type_name", "")
            if type_name and type_name.lower() in type_map:
                type_id = type_map[type_name.lower()]

            # Use provided coordinates or geocode
            city = mapped.get("city", "")
            country = mapped.get("country", "")
            lat = mapped.get("latitude")
            lon = mapped.get("longitude")

            if lat is None and lon is None and city:
                try:
                    results = await geocoding_service.search(f"{name}, {city}")
                    if results:
                        lat = results[0]["lat"]
                        lon = results[0]["lon"]
                        if not city:
                            city = results[0]["city"]
                        if not country:
                            country = results[0]["country_code"]
                except Exception:  # noqa: S110  # nosec B110
                    pass

            feature = LocationCreateFeature(
                type="Feature",
                geometry={"type": "Point", "coordinates": [lon or 0.0, lat or 0.0]},
                properties={
                    "name": name,
                    "type_id": type_id,
                    "city": city,
                    "country": country,
                    "address": mapped.get("address"),
                    "link": mapped.get("link"),
                    "years_visited": mapped.get("years_visited", []),
                    "visited_unknown_year": mapped.get("visited_unknown_year", False),
                    "rating": mapped.get("rating"),
                    "comments": mapped.get("comments"),
                    "tags": mapped.get("tags", []),
                },
            )
            await location_service.create_location(db, user_id, feature)
            imported += 1
        except Exception as e:
            errors.append(f"Row {i + 1}: {str(e)}")

    return ImportResult(imported=imported, skipped=skipped, errors=errors)


class CsvRowImportRequest(BaseModel):
    row: dict[str, str]
    column_map: dict[str, str]


class CsvRowImportResult(BaseModel):
    status: str  # "imported", "skipped", "error"
    error: str | None = None


@router.post("/import/row", response_model=CsvRowImportResult)
async def import_csv_row(data: CsvRowImportRequest, user_id: CurrentUserId, db: DB):
    """Import a single CSV row. Used for progress-tracked imports."""
    from app.services.type_service import get_types

    try:
        mapped = csv_service.map_csv_row(data.row, data.column_map)
        name = mapped.get("name", "")
        if not name:
            return CsvRowImportResult(status="skipped")

        existing_types = await get_types(db, user_id)
        type_map = {t.name.lower(): t.id for t in existing_types}

        # Resolve type
        type_id = None
        type_name = mapped.get("type_name", "")
        if type_name and type_name.lower() in type_map:
            type_id = type_map[type_name.lower()]

        # Use provided coordinates or geocode
        city = mapped.get("city", "")
        country = mapped.get("country", "")
        lat = mapped.get("latitude")
        lon = mapped.get("longitude")

        if lat is None and lon is None and city:
            try:
                results = await geocoding_service.search(f"{name}, {city}")
                if results:
                    lat = results[0]["lat"]
                    lon = results[0]["lon"]
                    if not city:
                        city = results[0]["city"]
                    if not country:
                        country = results[0]["country_code"]
            except Exception:  # noqa: S110
                pass

        feature = LocationCreateFeature(
            type="Feature",
            geometry={"type": "Point", "coordinates": [lon or 0.0, lat or 0.0]},
            properties={
                "name": name,
                "type_id": type_id,
                "city": city,
                "country": country,
                "address": mapped.get("address"),
                "link": mapped.get("link"),
                "years_visited": mapped.get("years_visited", []),
                "visited_unknown_year": mapped.get("visited_unknown_year", False),
                "rating": mapped.get("rating"),
                "comments": mapped.get("comments"),
                "tags": mapped.get("tags", []),
            },
        )
        await location_service.create_location(db, user_id, feature)
        return CsvRowImportResult(status="imported")
    except Exception as e:
        return CsvRowImportResult(status="error", error=str(e))


@router.post("/import/geojson", response_model=ImportResult)
async def import_geojson(
    data: LocationFeatureCollection, user_id: CurrentUserId, db: DB
):
    imported = 0
    skipped = 0
    errors: list[str] = []

    for i, feature in enumerate(data.features):
        try:
            create_data = LocationCreateFeature(
                type="Feature",
                geometry=feature.geometry,
                properties={
                    "name": feature.properties.name,
                    "type_id": (
                        feature.properties.type.id if feature.properties.type else None
                    ),
                    "city": feature.properties.city,
                    "country": feature.properties.country,
                    "address": feature.properties.address,
                    "link": feature.properties.link,
                    "years_visited": feature.properties.years_visited,
                    "visited_unknown_year": feature.properties.visited_unknown_year,
                    "rating": feature.properties.rating,
                    "comments": feature.properties.comments,
                    "tags": feature.properties.tags,
                },
            )
            await location_service.create_location(db, user_id, create_data)
            imported += 1
        except Exception as e:
            errors.append(f"Feature {i + 1}: {str(e)}")
            skipped += 1

    return ImportResult(imported=imported, skipped=skipped, errors=errors)


@router.get("/{location_id}", response_model=LocationFeature)
async def get_location(location_id: str, user_id: CurrentUserId, db: DB):
    feature = await location_service.get_location(db, user_id, location_id)
    if not feature:
        raise HTTPException(status_code=404, detail="Location not found")
    return feature


@router.put("/{location_id}", response_model=LocationFeature)
async def update_location(
    location_id: str, data: LocationUpdateFeature, user_id: CurrentUserId, db: DB
):
    feature = await location_service.update_location(db, user_id, location_id, data)
    if not feature:
        raise HTTPException(status_code=404, detail="Location not found")
    return feature


@router.delete("/{location_id}")
async def delete_location(location_id: str, user_id: CurrentUserId, db: DB):
    success = await location_service.delete_location(db, user_id, location_id)
    if not success:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"ok": True}


@router.post("/{location_id}/geocode", response_model=LocationFeature)
async def geocode_location(location_id: str, user_id: CurrentUserId, db: DB):
    feature = await location_service.get_location(db, user_id, location_id)
    if not feature:
        raise HTTPException(status_code=404, detail="Location not found")

    name = feature.properties.name
    city = feature.properties.city

    search_query = f"{name}, {city}" if city else name
    results = await geocoding_service.search(search_query)
    if not results:
        raise HTTPException(status_code=404, detail="Could not geocode location")

    from app.schemas.location import (
        LocationUpdateFeature,
        LocationUpdateProperties,
        PointGeometry,
    )

    update_data = LocationUpdateFeature(
        geometry=PointGeometry(coordinates=[results[0]["lon"], results[0]["lat"]]),
        properties=LocationUpdateProperties(
            city=results[0]["city"] or feature.properties.city,
            country=results[0]["country_code"] or feature.properties.country,
        ),
    )
    updated = await location_service.update_location(
        db, user_id, location_id, update_data
    )
    return updated
