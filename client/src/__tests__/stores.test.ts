import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTypesStore } from '@/stores/types';
import { useLocationsStore } from '@/stores/locations';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('Stores', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('typesStore', () => {
        it('should fetch types from API', async () => {
            const mockTypes = [
                { id: '1', name: 'Dierentuin', color: '#4CAF50', icon: 'paw' },
                { id: '2', name: 'Museum', color: '#2196F3', icon: 'museum' },
            ];
            mockedAxios.get.mockResolvedValueOnce({ data: mockTypes });

            const store = useTypesStore();
            await store.fetchTypes();

            expect(store.types).toEqual(mockTypes);
            expect(mockedAxios.get).toHaveBeenCalledWith('/api/types');
        });

        it('should create a type via API', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: [] });
            const newType = { id: '3', name: 'Pretpark', color: '#E91E63', icon: '' };
            mockedAxios.post.mockResolvedValueOnce({ data: newType });

            const store = useTypesStore();
            await store.fetchTypes();
            const result = await store.createType({ name: 'Pretpark', color: '#E91E63' });

            expect(result).toEqual(newType);
            expect(store.types).toContainEqual(newType);
        });

        it('should delete a type', async () => {
            const mockTypes = [
                { id: '1', name: 'Dierentuin', color: '#4CAF50', icon: 'paw' },
            ];
            mockedAxios.get.mockResolvedValueOnce({ data: mockTypes });
            mockedAxios.delete.mockResolvedValueOnce({ data: { ok: true } });

            const store = useTypesStore();
            await store.fetchTypes();
            await store.deleteType('1');

            expect(store.types).toHaveLength(0);
        });

        it('getTypeById should return correct type', async () => {
            const mockTypes = [
                { id: '1', name: 'Dierentuin', color: '#4CAF50', icon: 'paw' },
                { id: '2', name: 'Museum', color: '#2196F3', icon: 'museum' },
            ];
            mockedAxios.get.mockResolvedValueOnce({ data: mockTypes });

            const store = useTypesStore();
            await store.fetchTypes();

            expect(store.getTypeById('2')?.name).toBe('Museum');
            expect(store.getTypeById('99')).toBeUndefined();
        });
    });

    describe('locationsStore', () => {
        it('should fetch locations from API', async () => {
            const mockLocations = [
                {
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
                    rating: null,
                    note: null,
                    createdAt: '2024-01-01',
                    updatedAt: '2024-01-01',
                },
            ];
            mockedAxios.get.mockResolvedValueOnce({ data: mockLocations });

            const store = useLocationsStore();
            await store.fetchLocations();

            expect(store.locations).toEqual(mockLocations);
        });

        it('should create a location via API', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: [] });
            const newLoc = {
                id: '2',
                name: 'Nemo',
                type: 'museum',
                city: 'Amsterdam',
                country: 'NL',
                link: null,
                latitude: 52.374,
                longitude: 4.912,
                visitedYears: [],
                visitedUnknownYear: false,
                rating: null,
                note: null,
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
            };
            mockedAxios.post.mockResolvedValueOnce({ data: newLoc });

            const store = useLocationsStore();
            await store.fetchLocations();
            const result = await store.createLocation({
                name: 'Nemo',
                type: 'museum',
                city: 'Amsterdam',
                country: 'NL',
                link: null,
                latitude: 52.374,
                longitude: 4.912,
                visitedYears: [],
                visitedUnknownYear: false,
                rating: null,
                note: null,
            });

            expect(result.name).toBe('Nemo');
            expect(store.locations).toContainEqual(newLoc);
        });

        it('should delete a location', async () => {
            const mockLocations = [
                {
                    id: '1',
                    name: 'Artis',
                    type: 'zoo',
                    city: 'Amsterdam',
                    country: 'NL',
                    link: null,
                    latitude: 52.366,
                    longitude: 4.916,
                    visitedYears: [],
                    visitedUnknownYear: false,
                    rating: null,
                    note: null,
                    createdAt: '2024-01-01',
                    updatedAt: '2024-01-01',
                },
            ];
            mockedAxios.get.mockResolvedValueOnce({ data: mockLocations });
            mockedAxios.delete.mockResolvedValueOnce({ data: { ok: true } });

            const store = useLocationsStore();
            await store.fetchLocations();
            await store.deleteLocation('1');

            expect(store.locations).toHaveLength(0);
        });
    });
});
