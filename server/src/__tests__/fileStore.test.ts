import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { readJSON, writeJSON, readJSONArray, ensureDir } from '../utils/fileStore';

describe('fileStore', () => {
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'filestore-test-'));
    });

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    describe('ensureDir', () => {
        it('should create nested directories', async () => {
            const dir = path.join(tmpDir, 'a', 'b', 'c');
            await ensureDir(dir);
            const stat = await fs.stat(dir);
            expect(stat.isDirectory()).toBe(true);
        });

        it('should not fail if directory already exists', async () => {
            await ensureDir(tmpDir);
            const stat = await fs.stat(tmpDir);
            expect(stat.isDirectory()).toBe(true);
        });
    });

    describe('readJSON', () => {
        it('should return null for non-existent file', async () => {
            const result = await readJSON(path.join(tmpDir, 'nope.json'));
            expect(result).toBeNull();
        });

        it('should read and parse JSON file', async () => {
            const file = path.join(tmpDir, 'data.json');
            await fs.writeFile(file, JSON.stringify({ hello: 'world' }));
            const result = await readJSON<{ hello: string }>(file);
            expect(result).toEqual({ hello: 'world' });
        });
    });

    describe('writeJSON', () => {
        it('should write JSON atomically', async () => {
            const file = path.join(tmpDir, 'out.json');
            await writeJSON(file, { foo: 'bar' });
            const content = JSON.parse(await fs.readFile(file, 'utf-8'));
            expect(content).toEqual({ foo: 'bar' });
        });

        it('should create parent directories', async () => {
            const file = path.join(tmpDir, 'sub', 'dir', 'out.json');
            await writeJSON(file, [1, 2, 3]);
            const content = JSON.parse(await fs.readFile(file, 'utf-8'));
            expect(content).toEqual([1, 2, 3]);
        });

        it('should handle concurrent writes', async () => {
            const file = path.join(tmpDir, 'concurrent.json');
            await Promise.all([
                writeJSON(file, { i: 1 }),
                writeJSON(file, { i: 2 }),
                writeJSON(file, { i: 3 }),
            ]);
            const content = await readJSON<{ i: number }>(file);
            expect(content).toBeDefined();
            expect([1, 2, 3]).toContain(content!.i);
        });
    });

    describe('readJSONArray', () => {
        it('should return empty array for non-existent file', async () => {
            const result = await readJSONArray(path.join(tmpDir, 'nope.json'));
            expect(result).toEqual([]);
        });

        it('should return array from file', async () => {
            const file = path.join(tmpDir, 'arr.json');
            await fs.writeFile(file, JSON.stringify([1, 2, 3]));
            const result = await readJSONArray<number>(file);
            expect(result).toEqual([1, 2, 3]);
        });
    });
});
