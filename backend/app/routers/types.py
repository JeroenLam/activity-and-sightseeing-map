from fastapi import APIRouter, HTTPException

from app.middleware.auth import CurrentUserId, DB
from app.schemas.location_type import (
    LocationTypeCreate,
    LocationTypeResponse,
    LocationTypeUpdate,
)
from app.services import type_service

router = APIRouter(prefix="/api/types", tags=["types"])


@router.get("", response_model=list[LocationTypeResponse])
async def list_types(user_id: CurrentUserId, db: DB):
    return await type_service.get_types(db, user_id)


@router.post("", response_model=LocationTypeResponse, status_code=201)
async def create_type(data: LocationTypeCreate, user_id: CurrentUserId, db: DB):
    return await type_service.create_type(db, user_id, data)


@router.put("/{type_id}", response_model=LocationTypeResponse)
async def update_type(
    type_id: str, data: LocationTypeUpdate, user_id: CurrentUserId, db: DB
):
    result = await type_service.update_type(db, user_id, type_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Type not found")
    return result


@router.delete("/{type_id}")
async def delete_type(type_id: str, user_id: CurrentUserId, db: DB):
    success = await type_service.delete_type(db, user_id, type_id)
    if not success:
        raise HTTPException(status_code=404, detail="Type not found")
    return {"ok": True}
