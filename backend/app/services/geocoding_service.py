import asyncio
import time

import httpx

from app.config import settings

_last_request_time: float = 0.0
_lock = asyncio.Lock()

NOMINATIM_BASE = "https://nominatim.openstreetmap.org"


def _extract_city(address: dict) -> str:
    """Extract city from Nominatim address object."""
    for key in ("city", "town", "village", "municipality", "hamlet"):
        if key in address:
            return address[key]
    return ""


def _extract_country_code(address: dict) -> str:
    """Extract ISO country code from Nominatim address object."""
    return address.get("country_code", "").upper()


async def _rate_limited_request(url: str, params: dict) -> httpx.Response:
    """Make a rate-limited request to Nominatim."""
    global _last_request_time
    async with _lock:
        elapsed = time.time() - _last_request_time
        if elapsed < settings.nominatim_rate_limit:
            await asyncio.sleep(settings.nominatim_rate_limit - elapsed)
        _last_request_time = time.time()

    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            params=params,
            headers={"User-Agent": settings.nominatim_user_agent},
            timeout=10.0,
        )
        response.raise_for_status()
        return response


async def search(query: str, limit: int = 5) -> list[dict]:
    """Search Nominatim for places matching the query."""
    response = await _rate_limited_request(
        f"{NOMINATIM_BASE}/search",
        {
            "q": query,
            "format": "json",
            "limit": limit,
            "addressdetails": 1,
        },
    )
    results = response.json()
    return [
        {
            "display_name": r["display_name"],
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "city": _extract_city(r.get("address", {})),
            "country_code": _extract_country_code(r.get("address", {})),
        }
        for r in results
    ]


async def reverse(lat: float, lon: float) -> dict:
    """Reverse geocode coordinates to address."""
    response = await _rate_limited_request(
        f"{NOMINATIM_BASE}/reverse",
        {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "addressdetails": 1,
        },
    )
    data = response.json()
    address = data.get("address", {})
    return {
        "display_name": data.get("display_name", ""),
        "city": _extract_city(address),
        "country_code": _extract_country_code(address),
    }
