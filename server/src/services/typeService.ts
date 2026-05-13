import path from 'path';
import { v4 as uuid } from 'uuid';
import { readJSONArray, writeJSON, ensureDir } from '../utils/fileStore';
import { LocationType, DEFAULT_TYPES } from '../types';

function typesFile(dataDir: string, userId: string): string {
    return path.join(dataDir, 'users', userId, 'types.json');
}

export async function getTypes(
    dataDir: string,
    userId: string
): Promise<LocationType[]> {
    const types = await readJSONArray<LocationType>(typesFile(dataDir, userId));
    if (types.length === 0) {
        return seedDefaultTypes(dataDir, userId);
    }
    return types;
}

export async function seedDefaultTypes(
    dataDir: string,
    userId: string
): Promise<LocationType[]> {
    const types: LocationType[] = DEFAULT_TYPES.map((t) => ({
        id: uuid(),
        ...t,
    }));
    await ensureDir(path.join(dataDir, 'users', userId));
    await writeJSON(typesFile(dataDir, userId), types);
    return types;
}

export async function createType(
    dataDir: string,
    userId: string,
    data: { name: string; color: string; icon?: string }
): Promise<LocationType> {
    const types = await getTypes(dataDir, userId);
    const newType: LocationType = {
        id: uuid(),
        name: data.name,
        color: data.color,
        icon: data.icon ?? '',
    };
    types.push(newType);
    await writeJSON(typesFile(dataDir, userId), types);
    return newType;
}

export async function updateType(
    dataDir: string,
    userId: string,
    typeId: string,
    data: Partial<{ name: string; color: string; icon: string }>
): Promise<LocationType | null> {
    const types = await getTypes(dataDir, userId);
    const typeObj = types.find((t) => t.id === typeId);
    if (!typeObj) return null;
    if (data.name !== undefined) typeObj.name = data.name;
    if (data.color !== undefined) typeObj.color = data.color;
    if (data.icon !== undefined) typeObj.icon = data.icon;
    await writeJSON(typesFile(dataDir, userId), types);
    return typeObj;
}

export async function deleteType(
    dataDir: string,
    userId: string,
    typeId: string
): Promise<boolean> {
    const types = await getTypes(dataDir, userId);
    const idx = types.findIndex((t) => t.id === typeId);
    if (idx === -1) return false;
    types.splice(idx, 1);
    await writeJSON(typesFile(dataDir, userId), types);
    return true;
}
