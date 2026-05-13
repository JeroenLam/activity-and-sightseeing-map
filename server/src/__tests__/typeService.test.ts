import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import * as typeService from '../services/typeService';
import { DEFAULT_TYPES } from '../types';

describe('typeService', () => {
    let dataDir: string;
    const userId = 'test-user-456';

    beforeEach(async () => {
        dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'type-test-'));
    });

    afterEach(async () => {
        await fs.rm(dataDir, { recursive: true, force: true });
    });

    describe('getTypes', () => {
        it('should seed default types for new user', async () => {
            const types = await typeService.getTypes(dataDir, userId);
            expect(types).toHaveLength(DEFAULT_TYPES.length);
            const names = types.map((t) => t.name);
            expect(names).toContain('Dierentuin');
            expect(names).toContain('Pretpark');
        });

        it('should return existing types on subsequent calls', async () => {
            const first = await typeService.getTypes(dataDir, userId);
            const second = await typeService.getTypes(dataDir, userId);
            expect(first.map((t) => t.id)).toEqual(second.map((t) => t.id));
        });
    });

    describe('createType', () => {
        it('should add a new type', async () => {
            await typeService.getTypes(dataDir, userId); // seed
            const newType = await typeService.createType(dataDir, userId, {
                name: 'Aquarium',
                color: '#00BCD4',
            });
            expect(newType.id).toBeDefined();
            expect(newType.name).toBe('Aquarium');
            const all = await typeService.getTypes(dataDir, userId);
            expect(all).toHaveLength(DEFAULT_TYPES.length + 1);
        });
    });

    describe('updateType', () => {
        it('should update type fields', async () => {
            const types = await typeService.getTypes(dataDir, userId);
            const updated = await typeService.updateType(dataDir, userId, types[0].id, {
                name: 'Updated',
                color: '#000000',
            });
            expect(updated).not.toBeNull();
            expect(updated!.name).toBe('Updated');
            expect(updated!.color).toBe('#000000');
        });

        it('should return null for non-existent id', async () => {
            const result = await typeService.updateType(dataDir, userId, 'nope', { name: 'X' });
            expect(result).toBeNull();
        });
    });

    describe('deleteType', () => {
        it('should delete a type', async () => {
            const types = await typeService.getTypes(dataDir, userId);
            const ok = await typeService.deleteType(dataDir, userId, types[0].id);
            expect(ok).toBe(true);
            const remaining = await typeService.getTypes(dataDir, userId);
            expect(remaining).toHaveLength(DEFAULT_TYPES.length - 1);
        });

        it('should return false for non-existent id', async () => {
            await typeService.getTypes(dataDir, userId); // seed
            const ok = await typeService.deleteType(dataDir, userId, 'nope');
            expect(ok).toBe(false);
        });
    });
});
