import type {
    LocationFeatureCollection,
    LocationType,
    SyncConflict,
    SyncMutationRequest,
    UserSettings,
} from '@/types';

const KEY_PREFIX = 'activiteiten-offline-v1';

function getItem<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(`${KEY_PREFIX}:${key}`);
        if (!raw) {
            return fallback;
        }
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function setItem<T>(key: string, value: T): void {
    localStorage.setItem(`${KEY_PREFIX}:${key}`, JSON.stringify(value));
}

export function loadQueuedMutations(): SyncMutationRequest[] {
    return getItem<SyncMutationRequest[]>('queue', []);
}

export function saveQueuedMutations(queue: SyncMutationRequest[]): void {
    setItem('queue', queue);
}

export function loadSyncCursor(): number {
    return getItem<number>('cursor', 0);
}

export function saveSyncCursor(cursor: number): void {
    setItem('cursor', cursor);
}

export function loadConflicts(): SyncConflict[] {
    return getItem<SyncConflict[]>('conflicts', []);
}

export function saveConflicts(conflicts: SyncConflict[]): void {
    setItem('conflicts', conflicts);
}

export function loadCachedLocations(): LocationFeatureCollection | null {
    return getItem<LocationFeatureCollection | null>('locations', null);
}

export function saveCachedLocations(collection: LocationFeatureCollection): void {
    setItem('locations', collection);
}

export function loadCachedTypes(): LocationType[] | null {
    return getItem<LocationType[] | null>('types', null);
}

export function saveCachedTypes(types: LocationType[]): void {
    setItem('types', types);
}

export function loadCachedSettings(): UserSettings | null {
    return getItem<UserSettings | null>('settings', null);
}

export function saveCachedSettings(settings: UserSettings): void {
    setItem('settings', settings);
}

export function loadLastSyncedAt(): string | null {
    return getItem<string | null>('lastSyncedAt', null);
}

export function saveLastSyncedAt(value: string | null): void {
    setItem('lastSyncedAt', value);
}
