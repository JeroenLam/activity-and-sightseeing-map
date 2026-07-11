from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.location import LocationFeatureCollection
from app.schemas.location_type import LocationTypeResponse
from app.schemas.settings import SettingsResponse


class SyncStatusResponse(BaseModel):
    cursor: int = 0
    entities: list[str] = Field(default_factory=list)


class SyncChangeResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: str
    operation: str
    entity_version: int
    changed_fields: list[str] | None = None
    payload: dict[str, Any] | None = None
    created_at: datetime


class SyncBootstrapResponse(BaseModel):
    cursor: int = 0
    locations: LocationFeatureCollection
    types: list[LocationTypeResponse]
    settings: SettingsResponse


class SyncMutationRequest(BaseModel):
    mutation_id: str
    entity_type: str
    operation: str
    entity_id: str | None = None
    base_sync_version: int | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class SyncMutationResult(BaseModel):
    mutation_id: str
    status: str
    entity_type: str
    entity_id: str | None = None
    entity_version: int | None = None
    conflict_id: int | None = None
    error: str | None = None
    payload: dict[str, Any] | None = None


class SyncPushRequest(BaseModel):
    mutations: list[SyncMutationRequest]


class SyncPushResponse(BaseModel):
    cursor: int = 0
    results: list[SyncMutationResult]


class SyncConflictResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: str
    operation: str
    base_sync_version: int | None = None
    client_version: int | None = None
    server_version: int
    client_payload: dict[str, Any] | None = None
    server_payload: dict[str, Any] | None = None
    status: str
    created_at: datetime
    resolved_at: datetime | None = None


class SyncConflictResolveRequest(BaseModel):
    resolution_mode: str = Field(pattern=r"^(use_client|use_server|merge)$")
    payload: dict[str, Any] | None = None
