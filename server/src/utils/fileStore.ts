import fs from 'fs/promises';
import path from 'path';

const locks = new Map<string, Promise<void>>();

async function acquireLock(filePath: string): Promise<() => void> {
    while (locks.has(filePath)) {
        await locks.get(filePath);
    }
    let release: () => void;
    const promise = new Promise<void>((resolve) => {
        release = resolve;
    });
    locks.set(filePath, promise);
    return () => {
        locks.delete(filePath);
        release!();
    };
}

export async function ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
}

export async function readJSON<T>(filePath: string): Promise<T | null> {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data) as T;
    } catch (err: any) {
        if (err.code === 'ENOENT') return null;
        throw err;
    }
}

export async function writeJSON<T>(filePath: string, data: T): Promise<void> {
    const release = await acquireLock(filePath);
    try {
        await ensureDir(path.dirname(filePath));
        const tmp = filePath + '.tmp';
        await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
        await fs.rename(tmp, filePath);
    } finally {
        release();
    }
}

export async function readJSONArray<T>(filePath: string): Promise<T[]> {
    const data = await readJSON<T[]>(filePath);
    return data ?? [];
}
