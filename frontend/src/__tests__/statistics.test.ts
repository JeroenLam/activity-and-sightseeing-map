import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useStatisticsStore } from '@/stores/statistics';

vi.mock('@/lib/api', () => ({
    default: {
        get: vi.fn(),
    },
}));

import api from '@/lib/api';

const mockGet = api.get as ReturnType<typeof vi.fn>;

describe('Statistics Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('starts with null statistics and loading false', () => {
        const store = useStatisticsStore();
        expect(store.statistics).toBeNull();
        expect(store.loading).toBe(false);
    });

    it('fetches statistics and stores response', async () => {
        const mockData = {
            total_locations: 10,
            total_visited: 7,
            total_unvisited: 3,
            total_countries: 4,
            visits_per_year: [
                { year: 2022, count: 3 },
                { year: 2023, count: 5 },
            ],
            locations_per_type: [
                { type_id: '1', type_name: 'Museum', color: '#FF0000', count: 5 },
                { type_id: null, type_name: 'Uncategorized', color: '#9E9E9E', count: 2 },
            ],
            locations_per_country: [
                { country: 'NL', count: 4 },
                { country: 'FR', count: 3 },
            ],
        };

        mockGet.mockResolvedValueOnce({ data: mockData } as any);

        const store = useStatisticsStore();
        await store.fetchStatistics();

        expect(mockGet).toHaveBeenCalledWith('/api/statistics');
        expect(store.statistics).toEqual(mockData);
        expect(store.loading).toBe(false);
    });

    it('sets loading true during fetch', async () => {
        let resolvePromise: (value: any) => void;
        const promise = new Promise((resolve) => { resolvePromise = resolve; });
        mockGet.mockReturnValueOnce(promise as any);

        const store = useStatisticsStore();
        const fetchPromise = store.fetchStatistics();

        expect(store.loading).toBe(true);

        resolvePromise!({ data: { total_locations: 0, total_visited: 0, total_unvisited: 0, total_countries: 0, visits_per_year: [], locations_per_type: [], locations_per_country: [] } });
        await fetchPromise;

        expect(store.loading).toBe(false);
    });

    it('sets loading to false even on error', async () => {
        mockGet.mockRejectedValueOnce(new Error('Network error'));

        const store = useStatisticsStore();
        try {
            await store.fetchStatistics();
        } catch {
            // expected
        }

        expect(store.loading).toBe(false);
    });
});
