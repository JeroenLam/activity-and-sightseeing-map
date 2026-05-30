from fastapi import APIRouter, HTTPException

from app.middleware.auth import DB, CurrentUserId
from app.schemas.location_type import (
    LocationTypeCreate,
    LocationTypeResponse,
    LocationTypeUpdate,
)
from app.services import type_service

router = APIRouter(prefix="/api/types", tags=["types"])


@router.get("", response_model=list[LocationTypeResponse])
async def list_types(user_id: CurrentUserId, db: DB):
    """Get all location types for the authenticated user.

    Returns a list of location types with their id, name, color, and icon.

    Example response:
        [
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Dierentuin",
                "color": "#4CAF50",
                "icon": "paw"
            },
            {
                "id": "660e8400-e29b-41d4-a716-446655440001",
                "name": "Museum",
                "color": "#2196F3",
                "icon": "bank"
            }
        ]
    """
    return await type_service.get_types(db, user_id)


@router.post("", response_model=LocationTypeResponse, status_code=201)
async def create_type(data: LocationTypeCreate, user_id: CurrentUserId, db: DB):
    """Create a new location type.

    Example request body:
        {
            "name": "Restaurant",
            "color": "#FF5722",
            "icon": "silverware-fork-knife"
        }

    Returns the created type with a server-assigned UUID.
    """
    return await type_service.create_type(db, user_id, data)


@router.put("/{type_id}", response_model=LocationTypeResponse)
async def update_type(
    type_id: str, data: LocationTypeUpdate, user_id: CurrentUserId, db: DB
):
    """Update an existing location type.

    Only provided fields are updated.

    Example request:
        PUT /api/types/550e8400-e29b-41d4-a716-446655440000
        {
            "name": "Dierentuin",
            "color": "#66BB6A"
        }

    Returns 404 if the type does not exist or does not belong to the user.
    """
    result = await type_service.update_type(db, user_id, type_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Type not found")
    return result


@router.delete("/{type_id}")
async def delete_type(type_id: str, user_id: CurrentUserId, db: DB):
    """Delete a location type by ID.

    Removes the type. Locations using this type will have their type_id set
    to null.

    Example request:
        DELETE /api/types/550e8400-e29b-41d4-a716-446655440000

    Returns 404 if the type does not exist or does not belong to the user.
    """
    success = await type_service.delete_type(db, user_id, type_id)
    if not success:
        raise HTTPException(status_code=404, detail="Type not found")
    return {"ok": True}
