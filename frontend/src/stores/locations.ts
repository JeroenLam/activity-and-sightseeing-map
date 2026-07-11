import { defineStore } from 'pinia';
import { ref } from 'vue';
import api, { isOfflineErrorLike } from '@/lib/api';
import { loadCachedLocations, saveCachedLocations } from '@/lib/offlineStorage';
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
    const collection = ref<LocationFeatureCollection>(
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
            collection.value = data;
            persistCollection();
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
            collection.value.features.push(data);
            persistCollection();
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
            collection.value.features.push(localFeature);
            persistCollection();

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
            if (idx !== -1) collection.value.features[idx] = data;
            persistCollection();
            return data;
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }
            if (idx === -1) {
                throw error;
            }

            const current = collection.value.features[idx];
            const optimistic: LocationFeature = {
                ...current,
                geometry: feature.geometry ?? current.geometry,
                properties: {
                    ...current.properties,
                    name: feature.properties.name ?? current.properties.name,
                    city: feature.properties.city ?? current.properties.city,
                    country: feature.properties.country ?? current.properties.country,
                    address: feature.properties.address ?? current.properties.address,
                    link: feature.properties.link ?? current.properties.link,
                    years_visited: feature.properties.years_visited ?? current.properties.years_visited,
                    visited_unknown_year:
                        feature.properties.visited_unknown_year ?? current.properties.visited_unknown_year,
                    rating: feature.properties.rating ?? current.properties.rating,
                    comments: feature.properties.comments ?? current.properties.comments,
                    tags: feature.properties.tags ?? current.properties.tags,
                },
            };
            collection.value.features[idx] = optimistic;
            persistCollection();

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
        collection.value.features = collection.value.features.map((feature) => {
            if (!feature.id) return feature;
            return updatedById.get(feature.id) ?? feature;
        });
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
        collection.value.features = collection.value.features.filter((f) => f.id !== id);
        persistCollection();
    }

    async function geocodeLocation(id: string): Promise<LocationFeature> {
        const { data } = await api.post<LocationFeature>(`/api/locations/${id}/geocode`);
        const idx = collection.value.features.findIndex((f) => f.id === id);
        if (idx !== -1) collection.value.features[idx] = data;
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
        collection.value.features = [];
        persistCollection();
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
