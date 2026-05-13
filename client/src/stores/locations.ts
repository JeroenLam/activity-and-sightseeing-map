import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import type { Location, CsvPreview, ImportResult, ImportProgress } from '@/types';

export const useLocationsStore = defineStore('locations', () => {
    const locations = ref<Location[]>([]);
    const loading = ref(false);

    async function fetchLocations() {
        loading.value = true;
        try {
            const { data } = await axios.get<Location[]>('/api/locations');
            locations.value = data;
        } finally {
            loading.value = false;
        }
    }

    async function createLocation(
        payload: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>
    ) {
        const { data } = await axios.post<Location>('/api/locations', payload);
        locations.value.push(data);
        return data;
    }

    async function updateLocation(
        id: string,
        payload: Partial<Omit<Location, 'id' | 'createdAt' | 'updatedAt'>>
    ) {
        const { data } = await axios.put<Location>(
            `/api/locations/${id}`,
            payload
        );
        const idx = locations.value.findIndex((l) => l.id === id);
        if (idx !== -1) locations.value[idx] = data;
        return data;
    }

    async function deleteLocation(id: string) {
        await axios.delete(`/api/locations/${id}`);
        locations.value = locations.value.filter((l) => l.id !== id);
    }

    async function geocodeLocation(id: string): Promise<Location> {
        const { data } = await axios.post<Location>(
            `/api/locations/${id}/geocode`
        );
        const idx = locations.value.findIndex((l) => l.id === id);
        if (idx !== -1) locations.value[idx] = data;
        return data;
    }

    async function previewCsv(csv: string): Promise<CsvPreview> {
        const { data } = await axios.post<CsvPreview>(
            '/api/locations/import/preview',
            { csv }
        );
        return data;
    }

    async function importCsv(
        csv: string,
        columnMap?: Record<string, string>,
        onProgress?: (progress: ImportProgress) => void
    ): Promise<ImportResult> {
        const response = await fetch('/api/locations/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csv, columnMap }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Import failed');
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let result: ImportResult = { imported: 0, skipped: 0, errors: [] };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop()!; // keep incomplete line in buffer

            for (const line of lines) {
                if (!line.trim()) continue;
                const event = JSON.parse(line);
                if (event.type === 'progress' && onProgress) {
                    onProgress(event as ImportProgress);
                } else if (event.type === 'result') {
                    result = {
                        imported: event.imported,
                        skipped: event.skipped,
                        errors: event.errors,
                    };
                }
            }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
            const event = JSON.parse(buffer);
            if (event.type === 'result') {
                result = {
                    imported: event.imported,
                    skipped: event.skipped,
                    errors: event.errors,
                };
            }
        }

        await fetchLocations();
        return result;
    }

    return {
        locations,
        loading,
        fetchLocations,
        createLocation,
        updateLocation,
        deleteLocation,
        geocodeLocation,
        previewCsv,
        importCsv,
    };
});
