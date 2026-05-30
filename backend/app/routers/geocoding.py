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
    """Search for locations using Nominatim geocoding (rate-limited to 1 req/sec).

    Proxies the request to Nominatim and extracts structured city/country data
    from the response.

    Query parameters:
        q: Search query (e.g. "Artis Amsterdam" or "Eiffel Tower")
        limit: Maximum number of results (1-10, default 5)

    Example request:
        GET /api/geocode/search?q=Artis+Amsterdam&limit=3

    Example response:
        [
            {
                "display_name": "Artis, Plantage Kerklaan, Amsterdam, ...",
                "lat": 52.3660,
                "lon": 4.9163,
                "city": "Amsterdam",
                "country_code": "NL"
            }
        ]
    """
    results = await geocoding_service.search(q, limit=limit)
    return results


@router.get("/reverse")
async def reverse_geocode(
    user_id: CurrentUserId,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """Reverse geocode coordinates to get an address, city, and country.

    Used when the user clicks on the map or uses "Use my location" to
    auto-fill city and country fields.

    Query parameters:
        lat: Latitude (-90 to 90)
        lon: Longitude (-180 to 180)

    Example request:
        GET /api/geocode/reverse?lat=52.3660&lon=4.9163

    Example response:
        {
            "display_name": "Artis, Plantage Kerklaan, Amsterdam, ...",
            "city": "Amsterdam",
            "country_code": "NL"
        }
    """
    result = await geocoding_service.reverse(lat, lon)
    return result
