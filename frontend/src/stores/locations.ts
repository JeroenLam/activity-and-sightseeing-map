import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import api, { isOfflineErrorLike } from '@/lib/api';
import { loadCachedLocations, saveCachedLocations } from '@/lib/offlineStorage';
import { applyLocationUpdate } from '@/lib/locationUpdate';
import { useOfflineSyncStore } from '@/stores/offlineSync';
import type {
    BulkLocationUpdateProperties,
    LocationFeature,
    LocationFeatureCollection,
    LocationCreateFeature,
    LocationUpdateFeature,
    CsvPreview,
    ImportResult,
} from '@/types';

export const useLocationsStore = defineStore('locations', () => {
    /**
     * The user's locations.
     *
     * A `shallowRef` on purpose: with a deep `ref`, Vue wraps every feature
     * and every nested property in a reactive Proxy, so each read in the map's
     * filters, marker rendering and lists went through a tracking `get` trap
     * (the single largest cost when toggling a map filter with thousands of
     * locations). Features are treated as immutable instead: every change
     * below assigns a new collection object with a new `features` array,
     * which is what triggers dependents. Never mutate the array or a feature
     * in place; use {@link replaceFeatures}.
     */
    const collection = shallowRef<LocationFeatureCollection>(
        loadCachedLocations() ?? { type: 'FeatureCollection', features: [] },
    );
    const loading = ref(false);

    function persistCollection() {
        saveCachedLocations(collection.value);
    }

    function setCollection(nextCollection: LocationFeatureCollection) {
        collection.value = nextCollection;
        persistCollection();
    }

    /** Publish a new features array (triggering dependents) and persist it. */
    function replaceFeatures(features: LocationFeature[]) {
        setCollection({ ...collection.value, features });
    }

    /** Replace the feature at `idx` with `feature`, immutably. */
    function replaceFeatureAt(idx: number, feature: LocationFeature) {
        const features = collection.value.features.slice();
        features[idx] = feature;
        replaceFeatures(features);
    }

    function makeId() {
        return crypto.randomUUID ? crypto.randomUUID() : `tmp-${Math.random().toString(36).slice(2)}`;
    }

    async function fetchLocations(params?: {
        year_from?: number;
        year_to?: number;
        unvisited?: boolean;
        type_id?: string;
    }) {
        loading.value = true;
        try {
            const { data } = await api.get<LocationFeatureCollection>('/api/locations', { params });
            setCollection(data);
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }
        } finally {
            loading.value = false;
        }
    }

    async function createLocation(feature: LocationCreateFeature): Promise<LocationFeature> {
        const offlineSync = useOfflineSyncStore();
        try {
            const { data } = await api.post<LocationFeature>('/api/locations', feature);
            replaceFeatures([...collection.value.features, data]);
            return data;
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }

            const localFeature: LocationFeature = {
                type: 'Feature',
                id: makeId(),
                geometry: feature.geometry,
                properties: {
                    name: feature.properties.name,
                    type: null,
                    city: feature.properties.city ?? '',
                    country: feature.properties.country ?? '',
                    address: feature.properties.address ?? null,
                    link: feature.properties.link ?? null,
                    years_visited: feature.properties.years_visited ?? [],
                    visited_unknown_year: feature.properties.visited_unknown_year ?? false,
                    rating: feature.properties.rating ?? null,
                    comments: feature.properties.comments ?? null,
                    tags: feature.properties.tags ?? [],
                    sync_version: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            };
            replaceFeatures([...collection.value.features, localFeature]);

            offlineSync.enqueue({
                entity_type: 'location',
                operation: 'create',
                entity_id: localFeature.id,
                payload: feature as unknown as Record<string, unknown>,
            });
            return localFeature;
        }
    }

    async function updateLocation(id: string, feature: LocationUpdateFeature): Promise<LocationFeature> {
        const offlineSync = useOfflineSyncStore();
        const idx = collection.value.features.findIndex((f) => f.id === id);
        try {
            const { data } = await api.put<LocationFeature>(`/api/locations/${id}`, feature);
            // The server response is the source of truth for the saved state
            // (it includes the refreshed visit years, type and sync_version).
            if (idx !== -1) replaceFeatureAt(idx, data);
            return data;
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }
            if (idx === -1) {
                throw error;
            }

            const current = collection.value.features[idx];
            // Offline: apply the edit locally so the map updates immediately;
            // the queued mutation is replayed against the server later.
            const optimistic = applyLocationUpdate(current, feature);
            replaceFeatureAt(idx, optimistic);

            offlineSync.enqueue({
                entity_type: 'location',
                operation: 'update',
                entity_id: id,
                base_sync_version: current.properties.sync_version ?? null,
                payload: feature as unknown as Record<string, unknown>,
            });
            return optimistic;
        }
    }

    async function bulkUpdateLocations(ids: string[], properties: BulkLocationUpdateProperties): Promise<LocationFeature[]> {
        const { data } = await api.post<LocationFeature[]>('/api/locations/bulk-update', {
            location_ids: ids,
            properties,
        });
        const updatedById = new Map(data.map((feature) => [feature.id, feature]));
        replaceFeatures(
            collection.value.features.map((feature) => {
                if (!feature.id) return feature;
                return updatedById.get(feature.id) ?? feature;
            }),
        );
        return data;
    }

    async function deleteLocation(id: string) {
        const offlineSync = useOfflineSyncStore();
        const current = collection.value.features.find((f) => f.id === id);
        try {
            await api.delete(`/api/locations/${id}`);
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }
            offlineSync.enqueue({
                entity_type: 'location',
                operation: 'delete',
                entity_id: id,
                base_sync_version: current?.properties.sync_version ?? null,
                payload: {},
            });
        }
        replaceFeatures(collection.value.features.filter((f) => f.id !== id));
    }

    async function geocodeLocation(id: string): Promise<LocationFeature> {
        const { data } = await api.post<LocationFeature>(`/api/locations/${id}/geocode`);
        const idx = collection.value.features.findIndex((f) => f.id === id);
        if (idx !== -1) replaceFeatureAt(idx, data);
        return data;
    }

    async function previewCsv(csv: string): Promise<CsvPreview> {
        const { data } = await api.post<CsvPreview>('/api/locations/import/preview', { csv });
        return data;
    }

    async function importCsv(csv: string, columnMap?: Record<string, string>): Promise<ImportResult> {
        const { data } = await api.post<ImportResult>('/api/locations/import', { csv, column_map: columnMap });
        return data;
    }

    async function importGeojson(geojson: LocationFeatureCollection): Promise<ImportResult> {
        const { data } = await api.post<ImportResult>('/api/locations/import/geojson', geojson);
        return data;
    }

    async function exportGeojson(): Promise<LocationFeatureCollection> {
        const { data } = await api.get<LocationFeatureCollection>('/api/locations/export/geojson');
        return data;
    }

    async function deleteAll() {
        const ids = collection.value.features.map((f) => f.id).filter(Boolean);
        for (const id of ids) {
            await api.delete(`/api/locations/${id}`);
        }
        replaceFeatures([]);
    }

    return {
        collection,
        loading,
        fetchLocations,
        createLocation,
        updateLocation,
        bulkUpdateLocations,
        deleteLocation,
        geocodeLocation,
        previewCsv,
        importCsv,
        importGeojson,
        exportGeojson,
        deleteAll,
        setCollection,
    };
});
