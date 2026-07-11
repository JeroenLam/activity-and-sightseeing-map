import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useThemeStore } from '@/stores/theme';

describe('theme store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        document.documentElement.className = '';
    });

    it('defaults to light mode and stores theme', () => {
        const store = useThemeStore();

        expect(store.dark).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('theme')).toBe('light');
    });

    it('restores saved dark mode from localStorage', () => {
        localStorage.setItem('theme', 'dark');

        const store = useThemeStore();

        expect(store.dark).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('toggles dark mode and updates html classes + localStorage', async () => {
        const store = useThemeStore();

        store.toggle();
        await nextTick();

        expect(store.dark).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('theme')).toBe('dark');

        store.toggle();
        await nextTick();

        expect(store.dark).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('theme')).toBe('light');
    });
});
