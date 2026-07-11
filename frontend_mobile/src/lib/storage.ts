import type { OfflineSnapshot, User, UserSettings } from '@/types';

const STORAGE_KEY = 'activiteiten-mobile-state';

export function createDefaultSettings(): UserSettings {
  return {
    preferred_language: 'en',
    default_map_lat: 52.1,
    default_map_lng: 5.3,
    default_map_zoom: 7,
    map_tile_set: 'auto',
    profile_public: false,
    location_filter: 'show-all',
    show_ratings: true,
    show_comments: true,
    sync_version: 1,
  };
}

export function createInitialSnapshot(): OfflineSnapshot {
  return {
    user: null,
    locations: [],
    types: [],
    settings: createDefaultSettings(),
    cursor: 0,
    queue: [],
    conflicts: [],
    lastSyncedAt: null,
  };
}

export function loadSnapshot(): OfflineSnapshot {
  if (typeof window === 'undefined') {
    return createInitialSnapshot();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialSnapshot();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OfflineSnapshot>;
    return {
      ...createInitialSnapshot(),
      ...parsed,
      settings: parsed.settings ?? createDefaultSettings(),
      locations: parsed.locations ?? [],
      types: parsed.types ?? [],
      queue: parsed.queue ?? [],
      conflicts: parsed.conflicts ?? [],
      user: parsed.user ?? null,
    };
  } catch {
    return createInitialSnapshot();
  }
}

export function saveSnapshot(snapshot: OfflineSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearSnapshot(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function setUser(snapshot: OfflineSnapshot, user: User | null): OfflineSnapshot {
  return {
    ...snapshot,
    user,
  };
}
