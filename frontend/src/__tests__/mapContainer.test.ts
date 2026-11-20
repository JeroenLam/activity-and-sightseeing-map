import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { i18n } from '@/i18n';
import MapContainer from '@/components/map/MapContainer.vue';
import type { LocationFeature } from '@/types';

/**
 * MapContainer reconciles Leaflet markers with its `features` prop instead
 * of rebuilding them all on every change. These tests run real Leaflet in
 * happy-dom and check that markers are reused, added, removed and updated
 * as features change.
 */
vi.mock('@mdi/js', () => ({ mdiBank: 'M-bank' }));
vi.mock('@/lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

if (!('ResizeObserver' in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
        observe() {}
        disconnect() {}
    };
}

function feature(id: string, overrides: Partial<LocationFeature['properties']> = {}, lng = 5.1): LocationFeature {
    return {
        type: 'Feature',
        id,
        geometry: { type: 'Point', coordinates: [lng, 52.1] },
        properties: {
            name: `Place ${id}`,
            type: { id: 'museum', name: 'Museum', color: '#ff0000', icon: '' },
            city: '',
            country: '',
            address: null,
            link: null,
            years_visited: [],
            visited_unknown_year: false,
            rating: null,
            comments: null,
            tags: [],
            created_at: null,
            updated_at: null,
            ...overrides,
        },
    };
}

function mountMap(features: LocationFeature[], markerSize = 20) {
    return mount(MapContainer, {
        attachTo: document.body,
        props: { features, markerSize, visitedOpacity: 1, unvisitedOpacity: 1 },
        global: { plugins: [i18n] },
    });
}

const markerEls = () => [...document.querySelectorAll<HTMLElement>('.leaflet-marker-icon')];
const markerBox = (el: HTMLElement) => el.firstElementChild as HTMLElement;

describe('MapContainer marker reconciliation', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
        setActivePinia(createPinia());
    });

    it('renders one marker per feature and skips features at 0,0', () => {
        const atOrigin = feature('zero');
        atOrigin.geometry.coordinates = [0, 0];
        const wrapper = mountMap([feature('a'), feature('b'), atOrigin]);
        expect(markerEls()).toHaveLength(2);
        wrapper.unmount();
    });

    it('reuses existing markers when features are filtered out and back in', async () => {
        const a = feature('a');
        const b = feature('b');
        const c = feature('c');
        const wrapper = mountMap([a, b, c]);
        const [elA] = markerEls();

        await wrapper.setProps({ features: [a, c] });
        expect(markerEls()).toHaveLength(2);
        expect(markerEls()).toContain(elA); // marker for `a` was not recreated

        await wrapper.setProps({ features: [a, b, c] });
        expect(markerEls()).toHaveLength(3);
        expect(markerEls()).toContain(elA);
        wrapper.unmount();
    });

    it('updates the icon of a marker whose feature became visited', async () => {
        const wrapper = mountMap([feature('a')]);
        expect(markerBox(markerEls()[0]).style.borderRadius).toBe('50%');

        await wrapper.setProps({ features: [feature('a', { years_visited: [2026] })] });

        expect(markerEls()).toHaveLength(1);
        expect(markerBox(markerEls()[0]).style.borderRadius).toBe('2px');
        wrapper.unmount();
    });

    it('moves (rather than recreates) a marker whose coordinates changed', async () => {
        const wrapper = mountMap([feature('a', {}, 5.1)]);
        const [el] = markerEls();
        // Without 3D transforms (as in happy-dom) Leaflet positions markers via `left`.
        const before = el.style.left;

        await wrapper.setProps({ features: [feature('a', {}, 6.2)] });

        expect(markerEls()).toEqual([el]);
        expect(el.style.left).not.toBe(before);
        wrapper.unmount();
    });

    it('applies a new marker size to all markers', async () => {
        const wrapper = mountMap([feature('a'), feature('b')], 20);
        expect(markerBox(markerEls()[0]).style.width).toBe('20px');

        await wrapper.setProps({ markerSize: 32 });

        for (const el of markerEls()) expect(markerBox(el).style.width).toBe('32px');
        wrapper.unmount();
    });

    it('builds the popup from the current feature when it opens', async () => {
        const wrapper = mountMap([feature('a', { name: 'Old name' })]);
        await wrapper.setProps({ features: [feature('a', { name: 'New name' })] });

        markerEls()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await nextTick();

        const popup = document.querySelector('.leaflet-popup-content');
        expect(popup?.textContent).toContain('New name');
        expect(popup?.textContent).not.toContain('Old name');
        wrapper.unmount();
    });

    it('emits add-year with the current feature from the popup button', async () => {
        const wrapper = mountMap([feature('a')]);
        markerEls()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await nextTick();

        document.querySelector<HTMLButtonElement>('.popup-add-year')?.click();

        expect(wrapper.emitted('add-year')?.[0]?.[0]).toMatchObject({ id: 'a' });
        wrapper.unmount();
    });

    it('adds the type icon to markers once the icon path has loaded', async () => {
        const wrapper = mountMap([feature('a', { type: { id: 't', name: 'T', color: '#000', icon: 'bank' } })]);
        expect(markerEls()[0].querySelector('path')).toBeNull();

        for (let i = 0; i < 5; i++) await flushPromises();
        await nextTick();

        expect(markerEls()[0].querySelector('path')?.getAttribute('d')).toBe('M-bank');
        wrapper.unmount();
    });
});
