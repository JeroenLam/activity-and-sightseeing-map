import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLocationsStore } from '@/stores/locations';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('locationsStore - extended', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    const mockLocation = {
        id: '1',
        name: 'Artis',
        type: 'zoo',
        city: 'Amsterdam',
        country: 'NL',
        link: null,
        latitude: 52.366,
        longitude: 4.916,
        visitedYears: [2024],
        visitedUnknownYear: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
    };

    describe('updateLocation', () => {
        it('should update a location and replace it in the store', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: [mockLocation] });

            const store = useLocationsStore();
            await store.fetchLocations();
            expect(store.locations).toHaveLength(1);

            const updated = { ...mockLocation, name: 'Artis Zoo', updatedAt: '2024-06-01' };
            mockedAxios.put.mockResolvedValueOnce({ data: updated });

            const result = await store.updateLocation('1', { name: 'Artis Zoo' });

            expect(result.name).toBe('Artis Zoo');
            expect(store.locations[0].name).toBe('Artis Zoo');
            expect(mockedAxios.put).toHaveBeenCalledWith('/api/locations/1', { name: 'Artis Zoo' });
        });

        it('should handle updating a non-existent location gracefully', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: [mockLocation] });

            const store = useLocationsStore();
            await store.fetchLocations();

            const updated = { ...mockLocation, id: 'other', name: 'Other' };
            mockedAxios.put.mockResolvedValueOnce({ data: updated });

            await store.updateLocation('other', { name: 'Other' });
            // Original location unchanged
            expect(store.locations[0].name).toBe('Artis');
        });
    });

    describe('geocodeLocation', () => {
        it('should geocode and update location coordinates', async () => {
            const locNoCoords = { ...mockLocation, latitude: 0, longitude: 0 };
            mockedAxios.get.mockResolvedValueOnce({ data: [locNoCoords] });

            const store = useLocationsStore();
            await store.fetchLocations();
            expect(store.locations[0].latitude).toBe(0);

            const geocoded = { ...locNoCoords, latitude: 52.366, longitude: 4.916 };
            mockedAxios.post.mockResolvedValueOnce({ data: geocoded });

            const result = await store.geocodeLocation('1');

            expect(result.latitude).toBe(52.366);
            expect(store.locations[0].latitude).toBe(52.366);
            expect(mockedAxios.post).toHaveBeenCalledWith('/api/locations/1/geocode');
        });
    });

    describe('previewCsv', () => {
        it('should call API and return preview data', async () => {
            const mockPreview = {
                headers: ['Naam', 'Wat', 'Plaats'],
                columnMap: { name: 'Naam', type: 'Wat', city: 'Plaats' },
                preview: [{ Naam: 'Artis', Wat: 'Zoo', Plaats: 'Amsterdam' }],
                totalRows: 1,
            };
            mockedAxios.post.mockResolvedValueOnce({ data: mockPreview });

            const store = useLocationsStore();
            const result = await store.previewCsv('Naam,Wat,Plaats\nArtis,Zoo,Amsterdam');

            expect(result.headers).toContain('Naam');
            expect(result.totalRows).toBe(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/locations/import/preview',
                { csv: 'Naam,Wat,Plaats\nArtis,Zoo,Amsterdam' }
            );
        });
    });

    describe('loading state', () => {
        it('should set loading while fetching', async () => {
            let resolvePromise: (value: any) => void;
            const pending = new Promise((resolve) => {
                resolvePromise = resolve;
            });
            mockedAxios.get.mockReturnValueOnce(pending as any);

            const store = useLocationsStore();
            const fetchPromise = store.fetchLocations();

            expect(store.loading).toBe(true);
            resolvePromise!({ data: [] });
            await fetchPromise;
            expect(store.loading).toBe(false);
        });

        it('should reset loading even on error', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

            const store = useLocationsStore();
            try {
                await store.fetchLocations();
            } catch {
                // expected
            }
            expect(store.loading).toBe(false);
        });
    });
});
