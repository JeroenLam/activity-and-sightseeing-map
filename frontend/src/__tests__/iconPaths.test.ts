import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

/**
 * Tests for the lazy, cached icon lookup in `useIconPath`.
 *
 * The composable keeps module-level state (seeded from localStorage at
 * import time), so each test re-imports it after `vi.resetModules()`.
 * `@mdi/js` is replaced by a tiny stand-in.
 *
 * Whether the icon module was needed is observed through the public API:
 * a cache hit returns the path synchronously (a miss returns ''), and every
 * resolution of queued names bumps `iconPathsVersion`.
 */
vi.mock('@mdi/js', () => ({ mdiBank: 'M-bank', mdiMapMarker: 'M-map-marker' }));

const STORAGE_KEY = 'mdi-icon-paths-v1';

async function importFresh() {
    vi.resetModules();
    return import('@/composables/useIconPath');
}

/** Wait for the dynamic import and its `.then` to settle. */
async function flush() {
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

describe('useIconPath', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('converts kebab-case names to export names', async () => {
        const { iconNameToExportName } = await importFresh();
        expect(iconNameToExportName('map-marker')).toBe('mdiMapMarker');
        expect(iconNameToExportName('bank')).toBe('mdiBank');
    });

    it('returns an empty path for no icon without loading anything', async () => {
        const { getIconPath, iconPathsVersion } = await importFresh();
        expect(getIconPath(undefined)).toBe('');
        expect(getIconPath('')).toBe('');
        await flush();
        expect(iconPathsVersion.value).toBe(0);
    });

    it('resolves a cache miss asynchronously and bumps the version', async () => {
        const { getIconPath, iconPathsVersion } = await importFresh();
        const before = iconPathsVersion.value;

        expect(getIconPath('bank')).toBe('');
        await flush();

        expect(iconPathsVersion.value).toBe(before + 1);
        expect(getIconPath('bank')).toBe('M-bank');
    });

    it('resolves several queued names with a single module load', async () => {
        const { getIconPath, iconPathsVersion } = await importFresh();
        getIconPath('bank');
        getIconPath('map-marker');
        getIconPath('bank');
        await flush();

        expect(getIconPath('bank')).toBe('M-bank');
        expect(getIconPath('map-marker')).toBe('M-map-marker');
        // One batched resolution for all queued names.
        expect(iconPathsVersion.value).toBe(1);
    });

    it('caches unknown icon names as empty so they do not reload', async () => {
        const { getIconPath, iconPathsVersion } = await importFresh();
        getIconPath('does-not-exist');
        await flush();
        const version = iconPathsVersion.value;

        expect(getIconPath('does-not-exist')).toBe('');
        await flush();
        expect(iconPathsVersion.value).toBe(version);
    });

    it('persists resolved paths and serves them on the next visit without loading the icon set', async () => {
        const first = await importFresh();
        first.getIconPath('bank');
        await flush();
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({ bank: 'M-bank' });

        const second = await importFresh();
        // Answered synchronously from the stored cache: no module load needed.
        expect(second.getIconPath('bank')).toBe('M-bank');
        await flush();
        expect(second.iconPathsVersion.value).toBe(0);
    });

    it('ignores a corrupt stored cache', async () => {
        localStorage.setItem(STORAGE_KEY, '{not json');
        const { getIconPath } = await importFresh();
        expect(getIconPath('bank')).toBe('');
        await flush();
        expect(getIconPath('bank')).toBe('M-bank');
    });

    it('makes reactive callers update once paths arrive', async () => {
        const { getIconPath } = await importFresh();
        const { computed } = await import('vue');
        const path = computed(() => getIconPath('map-marker'));

        expect(path.value).toBe('');
        await flush();
        await nextTick();
        expect(path.value).toBe('M-map-marker');
    });
});
