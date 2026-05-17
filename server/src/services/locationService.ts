import path from 'path';
import { v4 as uuid } from 'uuid';
import { readJSONArray, writeJSON, ensureDir } from '../utils/fileStore';
import { Location } from '../types';

function locationsFile(dataDir: string, userId: string): string {
    return path.join(dataDir, 'users', userId, 'locations.json');
}

export async function getLocations(
    dataDir: string,
    userId: string
): Promise<Location[]> {
    await ensureDir(path.join(dataDir, 'users', userId));
    return readJSONArray<Location>(locationsFile(dataDir, userId));
}

export async function createLocation(
    dataDir: string,
    userId: string,
    data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Location> {
    const locations = await getLocations(dataDir, userId);
    const now = new Date().toISOString();
    const location: Location = {
        id: uuid(),
        ...data,
        createdAt: now,
        updatedAt: now,
    };
    locations.push(location);
    await writeJSON(locationsFile(dataDir, userId), locations);
    return location;
}

export async function updateLocation(
    dataDir: string,
    userId: string,
    locationId: string,
    data: Partial<Omit<Location, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Location | null> {
    const locations = await getLocations(dataDir, userId);
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return null;

    if (data.name !== undefined) loc.name = data.name;
    if (data.type !== undefined) loc.type = data.type;
    if (data.city !== undefined) loc.city = data.city;
    if (data.country !== undefined) loc.country = data.country;
    if (data.link !== undefined) loc.link = data.link;
    if (data.latitude !== undefined) loc.latitude = data.latitude;
    if (data.longitude !== undefined) loc.longitude = data.longitude;
    if (data.visitedYears !== undefined) loc.visitedYears = data.visitedYears;
    if (data.visitedUnknownYear !== undefined)
        loc.visitedUnknownYear = data.visitedUnknownYear;
    if (data.rating !== undefined) loc.rating = data.rating;
    if (data.note !== undefined) loc.note = data.note;
    loc.updatedAt = new Date().toISOString();

    await writeJSON(locationsFile(dataDir, userId), locations);
    return loc;
}

export async function deleteLocation(
    dataDir: string,
    userId: string,
    locationId: string
): Promise<boolean> {
    const locations = await getLocations(dataDir, userId);
    const idx = locations.findIndex((l) => l.id === locationId);
    if (idx === -1) return false;
    locations.splice(idx, 1);
    await writeJSON(locationsFile(dataDir, userId), locations);
    return true;
}

export async function bulkCreateLocations(
    dataDir: string,
    userId: string,
    items: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<Location[]> {
    const locations = await getLocations(dataDir, userId);
    const now = new Date().toISOString();
    const created: Location[] = items.map((item) => ({
        id: uuid(),
        ...item,
        createdAt: now,
        updatedAt: now,
    }));
    locations.push(...created);
    await writeJSON(locationsFile(dataDir, userId), locations);
    return created;
}
