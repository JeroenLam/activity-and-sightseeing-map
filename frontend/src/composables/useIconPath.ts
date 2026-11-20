import { ref } from 'vue';

/**
 * Lazy, cached access to Material Design Icon SVG paths.
 *
 * `@mdi/js` holds ~7,000 icons (~2.7 MB of JavaScript). Importing it
 * statically put the whole set on the critical path of the map page, even
 * though the map only ever needs the handful of icons used by the user's
 * location types. Instead:
 *
 * - `getIconPath()` answers synchronously from an in-memory cache that is
 *   seeded from `localStorage`, so on repeat visits the icon set is never
 *   downloaded or parsed at all.
 * - A cache miss returns `''` for now and queues the name; the icon module
 *   is then loaded once with a dynamic `import()`, every queued name is
 *   resolved, and {@link iconPathsVersion} is bumped so views re-render with
 *   the real paths. Callers that render outside Vue's reactivity (Leaflet
 *   markers) watch that ref.
 * - The icon picker, which needs the full set, calls {@link loadIconModule}.
 */

/** A module whose named exports are icon paths, e.g. `mdiBank`. */
export type IconModule = Record<string, string>;

const STORAGE_KEY = 'mdi-icon-paths-v1';
/** Upper bound on persisted entries, so the stored cache cannot grow forever. */
const MAX_STORED_ICONS = 300;

/**
 * Incremented whenever newly resolved icon paths become available. Reading
 * it inside `getIconPath` makes templates and computeds that call
 * `getIconPath` re-evaluate automatically once the icons arrive.
 */
export const iconPathsVersion = ref(0);

const cache = new Map<string, string>(readStoredCache());
const pending = new Set<string>();
let modulePromise: Promise<IconModule> | null = null;

function readStoredCache(): [string, string][] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return [];
        return Object.entries(parsed as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
        );
    } catch {
        return [];
    }
}

function persistCache() {
    try {
        const entries = [...cache.entries()].slice(-MAX_STORED_ICONS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
        // Storage full or unavailable (private mode): the in-memory cache still works.
    }
}

/** Convert a kebab-case icon name (`map-marker`) to its export name (`mdiMapMarker`). */
export function iconNameToExportName(icon: string): string {
    return 'mdi' + icon.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

/** Load the full icon module once; later calls share the same promise. */
export function loadIconModule(): Promise<IconModule> {
    modulePromise ??= import('@mdi/js').then((mod) => mod as unknown as IconModule);
    return modulePromise;
}

function resolvePending() {
    loadIconModule()
        .then((icons) => {
            for (const name of pending) {
                // Unknown names are cached as '' so they do not trigger reloads.
                cache.set(name, icons[iconNameToExportName(name)] ?? '');
            }
            pending.clear();
            persistCache();
            iconPathsVersion.value++;
        })
        .catch(() => {
            // e.g. offline before the chunk was ever cached: allow a later retry.
            pending.clear();
            modulePromise = null;
        });
}

/**
 * Return the SVG path for an icon name, or `''` if there is no icon (or it
 * is still loading; see the module docs).
 */
export function getIconPath(icon: string | undefined): string {
    if (!icon) return '';
    // Register a reactive dependency so callers update once paths load.
    void iconPathsVersion.value;
    const cached = cache.get(icon);
    if (cached !== undefined) return cached;
    if (!pending.has(icon)) {
        pending.add(icon);
        if (pending.size === 1) resolvePending();
    }
    return '';
}

/** Test helper: forget all cached and pending icons. */
export function resetIconPathCache() {
    cache.clear();
    pending.clear();
    modulePromise = null;
}
