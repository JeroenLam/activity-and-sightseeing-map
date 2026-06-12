import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';
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
    const collection = ref<LocationFeatureCollection>({ type: 'FeatureCollection', features: [] });
    const loading = ref(false);

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
        } finally {
            loading.value = false;
        }
    }

    async function createLocation(feature: LocationCreateFeature): Promise<LocationFeature> {
        const { data } = await api.post<LocationFeature>('/api/locations', feature);
        collection.value.features.push(data);
        return data;
    }

    async function updateLocation(id: string, feature: LocationUpdateFeature): Promise<LocationFeature> {
        const { data } = await api.put<LocationFeature>(`/api/locations/${id}`, feature);
        const idx = collection.value.features.findIndex((f) => f.id === id);
        if (idx !== -1) collection.value.features[idx] = data;
        return data;
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
        await api.delete(`/api/locations/${id}`);
        collection.value.features = collection.value.features.filter((f) => f.id !== id);
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
    };
});
