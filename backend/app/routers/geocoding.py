from fastapi import APIRouter, Query

from app.middleware.auth import CurrentUserId
from app.services import geocoding_service

router = APIRouter(prefix="/api/geocode", tags=["geocoding"])


@router.get("/search")
async def search_geocode(
    user_id: CurrentUserId,
    q: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=10),
):
    results = await geocoding_service.search(q, limit=limit)
    return results


@router.get("/reverse")
async def reverse_geocode(
    user_id: CurrentUserId,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    result = await geocoding_service.reverse(lat, lon)
    return result
