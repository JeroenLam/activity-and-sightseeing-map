import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import * as locationService from '../services/locationService';

describe('locationService', () => {
    let dataDir: string;
    const userId = 'test-user-123';

    beforeEach(async () => {
        dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'loc-test-'));
    });

    afterEach(async () => {
        await fs.rm(dataDir, { recursive: true, force: true });
    });

    const sampleLocation = {
        name: 'Artis',
        type: 'zoo-type-id',
        city: 'Amsterdam',
        country: 'NL',
        link: 'https://artis.nl',
        latitude: 52.366,
        longitude: 4.916,
        visitedYears: [2024],
        visitedUnknownYear: false,
        rating: null,
        note: null,
    };

    describe('createLocation', () => {
        it('should create a location with id and timestamps', async () => {
            const loc = await locationService.createLocation(dataDir, userId, sampleLocation);
            expect(loc.id).toBeDefined();
            expect(loc.name).toBe('Artis');
            expect(loc.createdAt).toBeDefined();
            expect(loc.updatedAt).toBeDefined();
        });

        it('should create a location with rating and note', async () => {
            const loc = await locationService.createLocation(dataDir, userId, {
                ...sampleLocation,
                rating: 4,
                note: 'Wonderful zoo with lots of animals',
            });
            expect(loc.rating).toBe(4);
            expect(loc.note).toBe('Wonderful zoo with lots of animals');
        });

        it('should create a location with null rating and note', async () => {
            const loc = await locationService.createLocation(dataDir, userId, sampleLocation);
            expect(loc.rating).toBeNull();
            expect(loc.note).toBeNull();
        });
    });

    describe('getLocations', () => {
        it('should return empty array for new user', async () => {
            const locs = await locationService.getLocations(dataDir, userId);
            expect(locs).toEqual([]);
        });

        it('should return created locations', async () => {
            await locationService.createLocation(dataDir, userId, sampleLocation);
            await locationService.createLocation(dataDir, userId, {
                ...sampleLocation,
                name: 'Nemo',
            });
            const locs = await locationService.getLocations(dataDir, userId);
            expect(locs).toHaveLength(2);
        });
    });

    describe('updateLocation', () => {
        it('should update fields', async () => {
            const loc = await locationService.createLocation(dataDir, userId, sampleLocation);
            const updated = await locationService.updateLocation(dataDir, userId, loc.id, {
                name: 'Artis Zoo',
                visitedYears: [2024, 2025],
            });
            expect(updated).not.toBeNull();
            expect(updated!.name).toBe('Artis Zoo');
            expect(updated!.visitedYears).toEqual([2024, 2025]);
        });

        it('should update rating', async () => {
            const loc = await locationService.createLocation(dataDir, userId, sampleLocation);
            const updated = await locationService.updateLocation(dataDir, userId, loc.id, {
                rating: 4,
            });
            expect(updated).not.toBeNull();
            expect(updated!.rating).toBe(4);
        });

        it('should update note', async () => {
            const loc = await locationService.createLocation(dataDir, userId, sampleLocation);
            const updated = await locationService.updateLocation(dataDir, userId, loc.id, {
                note: 'Great zoo, loved the aquarium section',
            });
            expect(updated).not.toBeNull();
            expect(updated!.note).toBe('Great zoo, loved the aquarium section');
        });

        it('should clear rating by setting to null', async () => {
            const loc = await locationService.createLocation(dataDir, userId, {
                ...sampleLocation,
                rating: 5,
            });
            expect(loc.rating).toBe(5);
            const updated = await locationService.updateLocation(dataDir, userId, loc.id, {
                rating: null,
            });
            expect(updated!.rating).toBeNull();
        });

        it('should return null for non-existent id', async () => {
            const result = await locationService.updateLocation(dataDir, userId, 'nope', { name: 'X' });
            expect(result).toBeNull();
        });
    });

    describe('deleteLocation', () => {
        it('should delete an existing location', async () => {
            const loc = await locationService.createLocation(dataDir, userId, sampleLocation);
            const ok = await locationService.deleteLocation(dataDir, userId, loc.id);
            expect(ok).toBe(true);
            const locs = await locationService.getLocations(dataDir, userId);
            expect(locs).toHaveLength(0);
        });

        it('should return false for non-existent id', async () => {
            const ok = await locationService.deleteLocation(dataDir, userId, 'nope');
            expect(ok).toBe(false);
        });
    });

    describe('bulkCreateLocations', () => {
        it('should create multiple locations', async () => {
            const items = [
                sampleLocation,
                { ...sampleLocation, name: 'Nemo' },
                { ...sampleLocation, name: 'Rijksmuseum' },
            ];
            const created = await locationService.bulkCreateLocations(dataDir, userId, items);
            expect(created).toHaveLength(3);
            const all = await locationService.getLocations(dataDir, userId);
            expect(all).toHaveLength(3);
        });
    });
});
