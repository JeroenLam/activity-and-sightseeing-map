import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { isReactive, nextTick, watch } from 'vue';
import type { LocationFeature } from '@/types';

/**
 * The locations store holds its collection in a `shallowRef` and updates it
 * immutably (a new collection object and features array per change), so
 * features are plain objects rather than deep reactive proxies. These tests
 * pin that contract: every mutation must publish a new array (triggering
 * watchers), must not modify the previous array, and must be persisted.
 */
vi.mock('@/lib/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    isOfflineErrorLike: (error: { code?: string }) => error?.code === 'ERR_NETWORK',
}));

import api from '@/lib/api';
import { loadCachedLocations } from '@/lib/offlineStorage';
import { useLocationsStore } from '@/stores/locations';

function feature(id: string, name = `Place ${id}`): LocationFeature {
    return {
        type: 'Feature',
        id,
        geometry: { type: 'Point', coordinates: [5, 52] },
        properties: {
            name,
            type: null,
            city: '',
            country: '',
            address: null,
            link: null,
            years_visited: [],
            visited_unknown_year: false,
            rating: null,
            comments: null,
            tags: [],
            sync_version: 1,
            created_at: null,
            updated_at: null,
        },
    };
}

function setup(features: LocationFeature[]) {
    const store = useLocationsStore();
    store.setCollection({ type: 'FeatureCollection', features });
    const before = store.collection.features;
    const changes = vi.fn();
    watch(() => store.collection.features, changes);
    return { store, before, changes };
}

describe('locations store immutable updates', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
        vi.mocked(api.put).mockReset();
        vi.mocked(api.delete).mockReset();
    });

    it('does not wrap features in reactive proxies', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: { type: 'FeatureCollection', features: [feature('a')] },
        });
        const store = useLocationsStore();
        await store.fetchLocations();

        expect(isReactive(store.collection.features)).toBe(false);
        expect(isReactive(store.collection.features[0])).toBe(false);
    });

    it('createLocation publishes a new array and persists it', async () => {
        const { store, before, changes } = setup([feature('a')]);
        vi.mocked(api.post).mockResolvedValueOnce({ data: feature('b') });

        await store.createLocation({ type: 'Feature', geometry: { type: 'Point', coordinates: [5, 52] }, properties: { name: 'b' } });
        await nextTick();

        expect(store.collection.features.map((f) => f.id)).toEqual(['a', 'b']);
        expect(before.map((f) => f.id)).toEqual(['a']);
        expect(changes).toHaveBeenCalledTimes(1);
        expect(loadCachedLocations()?.features.map((f) => f.id)).toEqual(['a', 'b']);
    });

    it('updateLocation replaces only the updated feature', async () => {
        const untouched = feature('a');
        const { store, before, changes } = setup([untouched, feature('b', 'Old')]);
        vi.mocked(api.put).mockResolvedValueOnce({ data: feature('b', 'New') });

        await store.updateLocation('b', { type: 'Feature', properties: { name: 'New' } });
        await nextTick();

        expect(store.collection.features[1].properties.name).toBe('New');
        expect(store.collection.features[0]).toBe(untouched);
        expect(before[1].properties.name).toBe('Old');
        expect(changes).toHaveBeenCalledTimes(1);
        expect(loadCachedLocations()?.features[1].properties.name).toBe('New');
    });

    it('deleteLocation publishes a new array without the feature', async () => {
        const { store, before, changes } = setup([feature('a'), feature('b')]);
        vi.mocked(api.delete).mockResolvedValueOnce({});

        await store.deleteLocation('a');
        await nextTick();

        expect(store.collection.features.map((f) => f.id)).toEqual(['b']);
        expect(before).toHaveLength(2);
        expect(changes).toHaveBeenCalledTimes(1);
        expect(loadCachedLocations()?.features.map((f) => f.id)).toEqual(['b']);
    });

    it('bulkUpdateLocations publishes and persists the updated features', async () => {
        const { store, changes } = setup([feature('a'), feature('b')]);
        vi.mocked(api.post).mockResolvedValueOnce({ data: [feature('b', 'Bulk')] });

        await store.bulkUpdateLocations(['b'], { rating: 5 });
        await nextTick();

        expect(store.collection.features[1].properties.name).toBe('Bulk');
        expect(changes).toHaveBeenCalledTimes(1);
        expect(loadCachedLocations()?.features[1].properties.name).toBe('Bulk');
    });

    it('geocodeLocation publishes the geocoded feature', async () => {
        const { store, changes } = setup([feature('a')]);
        vi.mocked(api.post).mockResolvedValueOnce({ data: feature('a', 'Geocoded') });

        await store.geocodeLocation('a');
        await nextTick();

        expect(store.collection.features[0].properties.name).toBe('Geocoded');
        expect(changes).toHaveBeenCalledTimes(1);
    });

    it('deleteAll publishes an empty array', async () => {
        const { store, changes } = setup([feature('a'), feature('b')]);
        vi.mocked(api.delete).mockResolvedValue({});

        await store.deleteAll();
        await nextTick();

        expect(store.collection.features).toEqual([]);
        expect(changes).toHaveBeenCalledTimes(1);
    });
});
