import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useThemeStore } from '@/stores/theme';

describe('theme store layout mode', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        document.documentElement.className = '';
    });

    it('defaults to desktop layout and applies classes/storage', () => {
        const store = useThemeStore();

        expect(store.layoutMode).toBe('desktop');
        expect(document.documentElement.classList.contains('layout-desktop')).toBe(true);
        expect(document.documentElement.classList.contains('layout-mobile')).toBe(false);
        expect(localStorage.getItem('layoutMode')).toBe('desktop');
    });

    it('restores saved mobile layout mode from localStorage', () => {
        localStorage.setItem('layoutMode', 'mobile');

        const store = useThemeStore();

        expect(store.layoutMode).toBe('mobile');
        expect(document.documentElement.classList.contains('layout-mobile')).toBe(true);
        expect(document.documentElement.classList.contains('layout-desktop')).toBe(false);
    });

    it('toggles layout mode and updates html classes + localStorage', async () => {
        const store = useThemeStore();

        store.toggleLayoutMode();
        await nextTick();

        expect(store.layoutMode).toBe('mobile');
        expect(document.documentElement.classList.contains('layout-mobile')).toBe(true);
        expect(document.documentElement.classList.contains('layout-desktop')).toBe(false);
        expect(localStorage.getItem('layoutMode')).toBe('mobile');

        store.toggleLayoutMode();
        await nextTick();

        expect(store.layoutMode).toBe('desktop');
        expect(document.documentElement.classList.contains('layout-desktop')).toBe(true);
        expect(document.documentElement.classList.contains('layout-mobile')).toBe(false);
        expect(localStorage.getItem('layoutMode')).toBe('desktop');
    });
});
