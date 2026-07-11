import { defineStore } from 'pinia';
import api from '@/lib/api';
import { createDefaultSettings, loadSnapshot, saveSnapshot } from '@/lib/storage';
import { fetchBootstrap, fetchChanges, listConflicts, pushMutations, resolveConflict as resolveConflictRequest } from '@/lib/sync';
import type {
    LocationDraft,
    LocationFeature,
    LocationType,
    LocalLocationFeature,
    OfflineSnapshot,
    PointGeometry,
    SyncChange,
    SyncConflict,
    SyncMutationRequest,
    SyncStatus,
    TypeDraft,
    User,
    UserSettings,
} from '@/types';

function makeId() {
    return crypto.randomUUID ? crypto.randomUUID() : `tmp-${Math.random().toString(36).slice(2)}`;
}

function makeTempLocation(draft: LocationDraft, syncState: LocalLocationFeature['sync_state']): LocalLocationFeature {
    const years = draft.years_visited
        .split(/[;,]/)
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value));

    return {
        type: 'Feature',
        id: draft.id ?? makeId(),
        geometry: {
            type: 'Point',
            coordinates: [draft.longitude, draft.latitude],
        },
        properties: {
            name: draft.name,
            type: null,
            city: draft.city,
            country: draft.country,
            address: draft.address || null,
            link: draft.link || null,
            years_visited: years,
            visited_unknown_year: draft.visited_unknown_year,
            rating: draft.rating ? Number(draft.rating) : null,
            comments: draft.comments || null,
            tags: draft.tags
                .split(/[;,]/)
                .map((tag) => tag.trim())
                .filter(Boolean),
            sync_version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        sync_state: syncState,
        pending_mutation_id: null,
    };
}

function normalizeFeature(feature: LocationFeature, syncState: LocalLocationFeature['sync_state'] = 'clean'): LocalLocationFeature {
    return {
        ...feature,
        sync_state: syncState,
        pending_mutation_id: null,
    };
}

function normalizeSettings(settings: Partial<UserSettings> | null | undefined): UserSettings {
    return {
        ...createDefaultSettings(),
        ...(settings ?? {}),
    };
}

function syncEventToLocation(change: SyncChange, currentTypes: LocationType[]): LocalLocationFeature | null {
    if (change.operation === 'delete') {
        return null;
    }

    const payload = change.payload as any;
    const type = payload?.properties?.type?.id
        ? currentTypes.find((item) => item.id === payload.properties.type.id) ?? null
        : null;

    return normalizeFeature(
        {
            type: 'Feature',
            id: payload.id,
            geometry: payload.geometry,
            properties: {
                ...payload.properties,
                type,
            },
        },
        'clean',
    );
}

export const useAppStore = defineStore('app', {
    state: (): OfflineSnapshot => loadSnapshot(),
    getters: {
        pendingCount: (state) => state.queue.length,
        conflictCount: (state) => state.conflicts.length,
        locationCount: (state) => state.locations.length,
        typeCount: (state) => state.types.length,
        activeLocations(state): LocalLocationFeature[] {
            return state.locations
                .filter((item) => item.sync_state !== 'conflict')
                .slice()
                .sort((left, right) => left.properties.name.localeCompare(right.properties.name));
        },
        sortedConflicts(state): SyncConflict[] {
            return state.conflicts.slice().sort((left, right) => right.id - left.id);
        },
        statusLabel: (state) => (state.queue.length ? 'Pending sync' : 'Synced locally'),
    },
    actions: {
        hydrate() {
            const snapshot = loadSnapshot();
            this.user = snapshot.user;
            this.locations = snapshot.locations;
            this.types = snapshot.types;
            this.settings = normalizeSettings(snapshot.settings);
            this.cursor = snapshot.cursor;
            this.queue = snapshot.queue;
            this.conflicts = snapshot.conflicts;
            this.lastSyncedAt = snapshot.lastSyncedAt;
            saveSnapshot(this.$state as OfflineSnapshot);
        },
        persist() {
            saveSnapshot(this.$state as OfflineSnapshot);
        },
        setUser(user: User | null) {
            this.user = user;
            this.persist();
        },
        applyBootstrap(payload: { locations: { features: LocationFeature[] }; types: LocationType[]; settings: UserSettings; cursor: number }) {
            this.locations = payload.locations.features.map((feature) => normalizeFeature(feature));
            this.types = payload.types;
            this.settings = normalizeSettings(payload.settings);
            this.cursor = payload.cursor;
            this.conflicts = [];
            this.queue = [];
            this.lastSyncedAt = new Date().toISOString();
            this.persist();
        },
        async bootstrapFromServer() {
            const payload = await fetchBootstrap();
            this.applyBootstrap(payload);
        },
        async loadConflicts() {
            try {
                this.conflicts = await listConflicts();
                this.persist();
            } catch {
                // Keep local conflict cache when offline.
            }
        },
        async syncNow() {
            if (!navigator.onLine) {
                return;
            }

            if (this.queue.length) {
                const response = await pushMutations(this.queue);
                const appliedMutationIds = new Set(response.results.filter((item) => item.status === 'applied').map((item) => item.mutation_id));
                this.queue = this.queue.filter((item) => !appliedMutationIds.has(item.mutation_id));

                for (const result of response.results) {
                    if (result.status === 'applied' && result.payload) {
                        this.applyServerPayload(result.entity_type, result.payload as Record<string, unknown>, result.entity_id ?? null, result.entity_version ?? null);
                    }
                }
            }

            const changes = await fetchChanges(this.cursor);
            for (const change of changes) {
                this.applyChange(change);
                this.cursor = change.id;
            }

            await this.loadConflicts();
            this.lastSyncedAt = new Date().toISOString();
            this.persist();
        },
        applyServerPayload(entityType: string, payload: Record<string, unknown>, entityId: string | null, version: number | null) {
            if (entityType === 'location') {
                const typedPayload = payload as any;
                const location = normalizeFeature(
                    {
                        type: 'Feature',
                        id: entityId ?? typedPayload.id ?? null,
                        geometry: typedPayload.geometry as PointGeometry,
                        properties: {
                            ...typedPayload.properties,
                            sync_version: version ?? typedPayload.properties?.sync_version ?? 1,
                        },
                    },
                    'clean',
                );
                this.upsertLocation(location);
            } else if (entityType === 'type') {
                const typedPayload = payload as any;
                this.upsertType({ ...typedPayload, sync_version: version ?? typedPayload.sync_version ?? 1 });
                this.relinkLocationTypes();
            } else if (entityType === 'settings') {
                this.settings = normalizeSettings(payload as Partial<UserSettings>);
            }
        },
        applyChange(change: SyncChange) {
            if (change.entity_type === 'location') {
                if (change.operation === 'delete') {
                    this.locations = this.locations.filter((item) => item.id !== change.entity_id);
                    return;
                }
                const location = syncEventToLocation(change, this.types);
                if (location) {
                    this.upsertLocation(location);
                }
            }

            if (change.entity_type === 'type') {
                if (change.operation === 'delete') {
                    this.types = this.types.filter((item) => item.id !== change.entity_id);
                    this.locations = this.locations.map((item) => {
                        if (item.properties.type?.id === change.entity_id) {
                            return { ...item, properties: { ...item.properties, type: null } };
                        }
                        return item;
                    });
                    return;
                }
                const payload = change.payload as any;
                this.upsertType(payload);
                this.relinkLocationTypes();
            }

            if (change.entity_type === 'settings') {
                this.settings = normalizeSettings(change.payload as Partial<UserSettings>);
            }
        },
        upsertLocation(location: LocalLocationFeature) {
            const index = this.locations.findIndex((item) => item.id === location.id);
            if (index === -1) {
                this.locations.unshift(location);
            } else {
                this.locations.splice(index, 1, location);
            }
        },
        upsertType(type: LocationType) {
            const index = this.types.findIndex((item) => item.id === type.id);
            if (index === -1) {
                this.types.unshift(type);
            } else {
                this.types.splice(index, 1, type);
            }
        },
        relinkLocationTypes() {
            this.locations = this.locations.map((location) => {
                const type = location.properties.type ? this.types.find((item) => item.id === location.properties.type?.id) ?? null : null;
                return {
                    ...location,
                    properties: {
                        ...location.properties,
                        type,
                    },
                };
            });
        },
        queueMutation(mutation: SyncMutationRequest) {
            this.queue.push(mutation);
            this.persist();
        },
        saveLocation(draft: LocationDraft, existingId?: string) {
            const syncVersion = existingId ? this.locations.find((item) => item.id === existingId)?.properties.sync_version ?? 1 : 1;
            const mutationId = makeId();
            const payload = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [draft.longitude, draft.latitude],
                },
                properties: {
                    name: draft.name,
                    type_id: draft.type_id || null,
                    city: draft.city,
                    country: draft.country,
                    address: draft.address || null,
                    link: draft.link || null,
                    years_visited: draft.years_visited
                        .split(/[;,]/)
                        .map((value) => Number(value.trim()))
                        .filter((value) => Number.isFinite(value)),
                    visited_unknown_year: draft.visited_unknown_year,
                    rating: draft.rating ? Number(draft.rating) : null,
                    comments: draft.comments || null,
                    tags: draft.tags
                        .split(/[;,]/)
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    base_sync_version: syncVersion,
                },
            };

            if (existingId) {
                const index = this.locations.findIndex((item) => item.id === existingId);
                if (index !== -1) {
                    const current = this.locations[index];
                    this.locations.splice(index, 1, {
                        ...current,
                        geometry: payload.geometry as PointGeometry,
                        properties: {
                            ...current.properties,
                            ...payload.properties,
                            type: payload.properties.type_id ? this.types.find((item) => item.id === payload.properties.type_id) ?? null : current.properties.type,
                            sync_version: current.properties.sync_version,
                        },
                        sync_state: 'pending',
                        pending_mutation_id: mutationId,
                    });
                }
            } else {
                const temp = makeTempLocation(draft, 'pending');
                temp.pending_mutation_id = mutationId;
                this.locations.unshift(temp);
            }

            this.queueMutation({
                mutation_id: mutationId,
                entity_type: 'location',
                operation: existingId ? 'update' : 'create',
                entity_id: existingId ?? this.locations[0]?.id ?? null,
                base_sync_version: syncVersion,
                payload,
            });
        },
        deleteLocation(locationId: string) {
            const current = this.locations.find((item) => item.id === locationId);
            const mutationId = makeId();
            if (!current) {
                return;
            }
            this.locations = this.locations.filter((item) => item.id !== locationId);
            this.queueMutation({
                mutation_id: mutationId,
                entity_type: 'location',
                operation: 'delete',
                entity_id: locationId,
                base_sync_version: current.properties.sync_version,
                payload: {},
            });
        },
        saveType(draft: TypeDraft) {
            const mutationId = makeId();
            const payload = {
                name: draft.name,
                color: draft.color,
                icon: draft.icon,
                base_sync_version: draft.id ? this.types.find((item) => item.id === draft.id)?.sync_version ?? 1 : 1,
            };

            if (draft.id) {
                const index = this.types.findIndex((item) => item.id === draft.id);
                if (index !== -1) {
                    this.types.splice(index, 1, { ...this.types[index], ...payload, sync_state: 'pending' } as LocationType);
                }
            }

            this.queueMutation({
                mutation_id: mutationId,
                entity_type: 'type',
                operation: draft.id ? 'update' : 'create',
                entity_id: draft.id ?? mutationId,
                base_sync_version: payload.base_sync_version,
                payload,
            });
        },
        deleteType(typeId: string) {
            const current = this.types.find((item) => item.id === typeId);
            if (!current) {
                return;
            }
            this.types = this.types.filter((item) => item.id !== typeId);
            this.locations = this.locations.map((item) =>
                item.properties.type?.id === typeId ? { ...item, properties: { ...item.properties, type: null } } : item,
            );
            this.queueMutation({
                mutation_id: makeId(),
                entity_type: 'type',
                operation: 'delete',
                entity_id: typeId,
                base_sync_version: current.sync_version,
                payload: {},
            });
        },
        updateSettings(partial: Partial<UserSettings>) {
            this.settings = normalizeSettings({ ...this.settings, ...partial });
            this.queueMutation({
                mutation_id: makeId(),
                entity_type: 'settings',
                operation: 'update',
                entity_id: this.user?.id ?? 'settings',
                base_sync_version: this.settings.sync_version,
                payload: { ...this.settings, ...partial },
            });
            this.persist();
        },
        async resolveConflict(conflictId: number, resolution_mode: 'use_client' | 'use_server' | 'merge', payload?: Record<string, unknown>) {
            await resolveConflictRequest(conflictId, { resolution_mode, payload });
            await this.bootstrapFromServer();
            await this.loadConflicts();
        },
        async syncSettingsAndData() {
            await this.syncNow();
        },
        async refreshStatus() {
            const response = await api.get<SyncStatus>('/api/sync/status');
            return response.data;
        },
    },
});
