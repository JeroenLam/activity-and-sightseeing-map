import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { nextTick } from 'vue';
import { useThemeStore } from '@/stores/theme';

describe('themeStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        // Reset localStorage
        localStorage.clear();
        document.documentElement.classList.remove('dark');
    });

    it('should default to light mode when no localStorage', () => {
        const store = useThemeStore();
        expect(store.dark).toBe(false);
    });

    it('should read dark mode from localStorage', () => {
        localStorage.setItem('theme', 'dark');
        const store = useThemeStore();
        expect(store.dark).toBe(true);
    });

    it('should toggle dark mode', async () => {
        const store = useThemeStore();
        expect(store.dark).toBe(false);

        store.toggle();
        await nextTick();
        expect(store.dark).toBe(true);
        expect(localStorage.getItem('theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        store.toggle();
        await nextTick();
        expect(store.dark).toBe(false);
        expect(localStorage.getItem('theme')).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply dark class to document on creation when dark', () => {
        localStorage.setItem('theme', 'dark');
        setActivePinia(createPinia());
        useThemeStore();
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
});
