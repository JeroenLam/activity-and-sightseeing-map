import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { applyLocationUpdate } from '@/lib/locationUpdate';
import type { LocationFeature } from '@/types';

vi.mock('@/lib/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    isOfflineErrorLike: (error: { code?: string }) => error?.code === 'ERR_NETWORK',
}));

import api from '@/lib/api';
import { useLocationsStore } from '@/stores/locations';
import { useOfflineSyncStore } from '@/stores/offlineSync';

function createFeature(overrides: Partial<LocationFeature['properties']> = {}): LocationFeature {
    return {
        type: 'Feature',
        id: 'loc-1',
        geometry: { type: 'Point', coordinates: [4.9, 52.37] },
        properties: {
            name: 'Rijksmuseum',
            type: null,
            city: 'Amsterdam',
            country: 'NL',
            address: null,
            link: 'https://example.com',
            years_visited: [2020],
            visited_unknown_year: false,
            rating: 3,
            comments: 'Nice',
            tags: [],
            sync_version: 1,
            created_at: null,
            updated_at: null,
            ...overrides,
        },
    };
}

describe('applyLocationUpdate', () => {
    it('applies a new visit year and rating', () => {
        const result = applyLocationUpdate(createFeature(), {
            type: 'Feature',
            properties: { years_visited: [2020, 2024], rating: 5 },
        });
        expect(result.properties.years_visited).toEqual([2020, 2024]);
        expect(result.properties.rating).toBe(5);
    });

    it('clears nullable fields that are explicitly sent as null', () => {
        const result = applyLocationUpdate(createFeature(), {
            type: 'Feature',
            properties: { rating: null, link: null, comments: null },
        });
        expect(result.properties.rating).toBeNull();
        expect(result.properties.link).toBeNull();
        expect(result.properties.comments).toBeNull();
    });

    it('keeps fields that are omitted from a partial update', () => {
        const result = applyLocationUpdate(createFeature(), {
            type: 'Feature',
            properties: { years_visited: [2026] },
        });
        expect(result.properties.rating).toBe(3);
        expect(result.properties.link).toBe('https://example.com');
        expect(result.properties.comments).toBe('Nice');
        expect(result.properties.name).toBe('Rijksmuseum');
    });

    it('treats null for required fields as unchanged', () => {
        const result = applyLocationUpdate(createFeature(), {
            type: 'Feature',
            properties: { name: null, city: null, years_visited: null },
        });
        expect(result.properties.name).toBe('Rijksmuseum');
        expect(result.properties.city).toBe('Amsterdam');
        expect(result.properties.years_visited).toEqual([2020]);
    });

    it('does not mutate the original feature', () => {
        const original = createFeature();
        applyLocationUpdate(original, { type: 'Feature', properties: { rating: 1 } });
        expect(original.properties.rating).toBe(3);
    });
});

describe('locations store updateLocation', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
        vi.mocked(api.put).mockReset();
    });

    it('stores the server response after a single save', async () => {
        const store = useLocationsStore();
        store.setCollection({ type: 'FeatureCollection', features: [createFeature()] });
        const saved = createFeature({ years_visited: [2020, 2024], rating: 5, sync_version: 2 });
        vi.mocked(api.put).mockResolvedValueOnce({ data: saved });

        await store.updateLocation('loc-1', {
            type: 'Feature',
            properties: { years_visited: [2020, 2024], rating: 5 },
        });

        expect(api.put).toHaveBeenCalledTimes(1);
        const stored = store.collection.features[0];
        expect(stored.properties.years_visited).toEqual([2020, 2024]);
        expect(stored.properties.rating).toBe(5);
    });

    it('applies the edit optimistically and queues it when offline', async () => {
        const store = useLocationsStore();
        const offlineSync = useOfflineSyncStore();
        const enqueue = vi.spyOn(offlineSync, 'enqueue').mockImplementation(() => {});
        store.setCollection({ type: 'FeatureCollection', features: [createFeature()] });
        vi.mocked(api.put).mockRejectedValueOnce({ code: 'ERR_NETWORK' });

        await store.updateLocation('loc-1', {
            type: 'Feature',
            properties: { years_visited: [2020, 2025], rating: null },
        });

        const stored = store.collection.features[0];
        expect(stored.properties.years_visited).toEqual([2020, 2025]);
        expect(stored.properties.rating).toBeNull();
        expect(enqueue).toHaveBeenCalledWith(
            expect.objectContaining({ operation: 'update', entity_id: 'loc-1', base_sync_version: 1 }),
        );
    });
});
