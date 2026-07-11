from fastapi import APIRouter, HTTPException, Query

from app.middleware.auth import DB, CurrentUserId
from app.routers.settings import get_settings, update_settings
from app.schemas.location import (
    LocationCreateFeature,
    LocationUpdateFeature,
)
from app.schemas.location_type import (
    LocationTypeCreate,
    LocationTypeUpdate,
)
from app.schemas.settings import SettingsUpdate
from app.schemas.sync import (
    SyncBootstrapResponse,
    SyncChangeResponse,
    SyncConflictResolveRequest,
    SyncConflictResponse,
    SyncMutationRequest,
    SyncMutationResult,
    SyncPushRequest,
    SyncPushResponse,
    SyncStatusResponse,
)
from app.services import location_service, sync_service, type_service
from app.services.sync_service import SyncConflictError

router = APIRouter(prefix="/api/sync", tags=["sync"])


def _change_to_response(event) -> SyncChangeResponse:
    return SyncChangeResponse(
        id=event.id,
        entity_type=event.entity_type,
        entity_id=event.entity_id,
        operation=event.operation,
        entity_version=event.entity_version,
        changed_fields=event.changed_fields,
        payload=event.payload,
        created_at=event.created_at,
    )


def _conflict_to_response(conflict) -> SyncConflictResponse:
    return SyncConflictResponse(
        id=conflict.id,
        entity_type=conflict.entity_type,
        entity_id=conflict.entity_id,
        operation=conflict.operation,
        base_sync_version=conflict.base_sync_version,
        client_version=conflict.client_version,
        server_version=conflict.server_version,
        client_payload=conflict.client_payload,
        server_payload=conflict.server_payload,
        status=conflict.status,
        created_at=conflict.created_at,
        resolved_at=conflict.resolved_at,
    )


@router.get("/status", response_model=SyncStatusResponse)
async def get_status(user_id: CurrentUserId, db: DB):
    cursor = await sync_service.get_cursor(db, user_id)
    return SyncStatusResponse(
        cursor=cursor, entities=["locations", "types", "settings"]
    )


@router.get("/bootstrap", response_model=SyncBootstrapResponse)
async def bootstrap(user_id: CurrentUserId, db: DB):
    locations, types, settings, cursor = await sync_service.build_bootstrap(db, user_id)
    return SyncBootstrapResponse(
        cursor=cursor, locations=locations, types=types, settings=settings
    )


@router.get("/changes", response_model=list[SyncChangeResponse])
async def changes(user_id: CurrentUserId, db: DB, cursor: int = Query(0, ge=0)):
    events = await sync_service.list_changes(db, user_id, cursor)
    return [_change_to_response(event) for event in events]


@router.get("/conflicts", response_model=list[SyncConflictResponse])
async def list_conflicts(user_id: CurrentUserId, db: DB):
    conflicts = await sync_service.list_conflicts(db, user_id)
    return [_conflict_to_response(conflict) for conflict in conflicts]


@router.get("/conflicts/{conflict_id}", response_model=SyncConflictResponse)
async def get_conflict(conflict_id: int, user_id: CurrentUserId, db: DB):
    conflict = await sync_service.get_conflict(db, user_id, conflict_id)
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")
    return _conflict_to_response(conflict)


@router.post("/conflicts/{conflict_id}/resolve", response_model=SyncConflictResponse)
async def resolve_conflict(
    conflict_id: int,
    data: SyncConflictResolveRequest,
    user_id: CurrentUserId,
    db: DB,
):
    conflict = await sync_service.resolve_conflict(
        db,
        user_id=user_id,
        conflict_id=conflict_id,
        resolution_mode=data.resolution_mode,
        payload=data.payload,
    )
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")
    return _conflict_to_response(conflict)


@router.post("/push", response_model=SyncPushResponse)
async def push(data: SyncPushRequest, user_id: CurrentUserId, db: DB):
    results: list[SyncMutationResult] = []

    for mutation in data.mutations:
        try:
            result = await _apply_mutation(db, user_id, mutation)
            results.append(result)
        except SyncConflictError as exc:
            conflict = await sync_service.create_conflict(
                db,
                user_id=user_id,
                entity_type=exc.entity_type,
                entity_id=exc.entity_id,
                operation=mutation.operation,
                base_sync_version=mutation.base_sync_version,
                client_version=exc.client_version,
                server_version=exc.server_version,
                client_payload=mutation.payload,
                server_payload=await _current_payload(db, user_id, mutation),
            )
            results.append(
                SyncMutationResult(
                    mutation_id=mutation.mutation_id,
                    status="conflict",
                    entity_type=mutation.entity_type,
                    entity_id=mutation.entity_id,
                    conflict_id=conflict.id,
                    error="sync_conflict",
                )
            )
        except Exception as exc:  # noqa: BLE001
            results.append(
                SyncMutationResult(
                    mutation_id=mutation.mutation_id,
                    status="error",
                    entity_type=mutation.entity_type,
                    entity_id=mutation.entity_id,
                    error=str(exc),
                )
            )

    cursor = await sync_service.get_cursor(db, user_id)
    return SyncPushResponse(cursor=cursor, results=results)


async def _current_payload(
    db: DB, user_id: str, mutation: SyncMutationRequest
) -> dict | None:
    if mutation.entity_type == "location":
        if mutation.entity_id:
            return await sync_service.get_current_location_payload(
                db, user_id, mutation.entity_id
            )
    elif mutation.entity_type == "type":
        if mutation.entity_id:
            return await sync_service.get_current_type_payload(
                db, user_id, mutation.entity_id
            )
    elif mutation.entity_type == "settings":
        return await sync_service.get_current_settings_payload(db, user_id)
    return None


async def _apply_mutation(
    db: DB, user_id: str, mutation: SyncMutationRequest
) -> SyncMutationResult:
    entity_type = mutation.entity_type
    operation = mutation.operation

    if entity_type == "location":
        if operation == "create":
            created_location = await location_service.create_location(
                db, user_id, LocationCreateFeature.model_validate(mutation.payload)
            )
            return SyncMutationResult(
                mutation_id=mutation.mutation_id,
                status="applied",
                entity_type=entity_type,
                entity_id=created_location.id,
                entity_version=created_location.properties.sync_version,
                payload=created_location.model_dump(mode="json"),
            )
        if operation == "update":
            if mutation.base_sync_version is not None:
                mutation.payload["properties"] = {
                    **mutation.payload.get("properties", {}),
                    "base_sync_version": mutation.base_sync_version,
                }
            updated_location = await location_service.update_location(
                db,
                user_id,
                mutation.entity_id or "",
                LocationUpdateFeature.model_validate(mutation.payload),
            )
            if not updated_location:
                raise HTTPException(status_code=404, detail="Location not found")
            return SyncMutationResult(
                mutation_id=mutation.mutation_id,
                status="applied",
                entity_type=entity_type,
                entity_id=updated_location.id,
                entity_version=updated_location.properties.sync_version,
                payload=updated_location.model_dump(mode="json"),
            )
        if operation == "delete":
            deleted = await location_service.delete_location(
                db, user_id, mutation.entity_id or ""
            )
            if not deleted:
                raise HTTPException(status_code=404, detail="Location not found")
            return SyncMutationResult(
                mutation_id=mutation.mutation_id,
                status="applied",
                entity_type=entity_type,
                entity_id=mutation.entity_id,
            )

    if entity_type == "type":
        if operation == "create":
            created_type = await type_service.create_type(
                db, user_id, LocationTypeCreate.model_validate(mutation.payload)
            )
            return SyncMutationResult(
                mutation_id=mutation.mutation_id,
                status="applied",
                entity_type=entity_type,
                entity_id=created_type.id,
                entity_version=created_type.sync_version,
                payload=created_type.model_dump(mode="json"),
            )
        if operation == "update":
            update_payload = mutation.payload | {
                "base_sync_version": mutation.base_sync_version
            }
            updated_type = await type_service.update_type(
                db,
                user_id,
                mutation.entity_id or "",
                LocationTypeUpdate.model_validate(update_payload),
            )
            if not updated_type:
                raise HTTPException(status_code=404, detail="Type not found")
            return SyncMutationResult(
                mutation_id=mutation.mutation_id,
                status="applied",
                entity_type=entity_type,
                entity_id=updated_type.id,
                entity_version=updated_type.sync_version,
                payload=updated_type.model_dump(mode="json"),
            )
        if operation == "delete":
            deleted = await type_service.delete_type(
                db, user_id, mutation.entity_id or ""
            )
            if not deleted:
                raise HTTPException(status_code=404, detail="Type not found")
            return SyncMutationResult(
                mutation_id=mutation.mutation_id,
                status="applied",
                entity_type=entity_type,
                entity_id=mutation.entity_id,
            )

    if entity_type == "settings" and operation == "update":
        update_payload = mutation.payload | {
            "base_sync_version": mutation.base_sync_version
        }
        updated = await update_settings(
            SettingsUpdate.model_validate(update_payload), user_id=user_id, db=db
        )
        return SyncMutationResult(
            mutation_id=mutation.mutation_id,
            status="applied",
            entity_type=entity_type,
            entity_id=user_id,
            entity_version=updated.sync_version,
            payload=updated.model_dump(mode="json"),
        )

    if entity_type == "settings" and operation == "read":
        settings = await get_settings(user_id=user_id, db=db)
        return SyncMutationResult(
            mutation_id=mutation.mutation_id,
            status="applied",
            entity_type=entity_type,
            entity_id=user_id,
            entity_version=settings.sync_version,
            payload=settings.model_dump(mode="json"),
        )

    raise HTTPException(status_code=400, detail="Unsupported sync mutation")
