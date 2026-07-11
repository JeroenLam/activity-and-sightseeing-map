import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import { useThemeStore } from '@/stores/theme';
import { useAuthStore } from '@/stores/auth';
import { i18n } from '@/i18n';

vi.mock('@/lib/api', () => ({
    default: {
        post: vi.fn().mockResolvedValue({ data: {} }),
        get: vi.fn(),
        put: vi.fn(),
    },
}));

describe('AppHeader layout mode toggle', () => {
    function makeRouter() {
        return createRouter({
            history: createWebHistory(),
            routes: [
                { path: '/', name: 'map', component: { template: '<div />' } },
                { path: '/add', name: 'add-location', component: { template: '<div />' } },
                { path: '/locations', name: 'manage-locations', component: { template: '<div />' } },
                { path: '/types', name: 'manage-types', component: { template: '<div />' } },
                { path: '/stats', name: 'statistics', component: { template: '<div />' } },
                { path: '/sync', name: 'sync', component: { template: '<div />' } },
                { path: '/import', name: 'import', component: { template: '<div />' } },
                { path: '/profile', name: 'profile', component: { template: '<div />' } },
                { path: '/auth', name: 'auth', component: { template: '<div />' } },
            ],
        });
    }

    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        document.documentElement.className = '';
    });

    it('renders desktop top navigation links', async () => {
        const router = makeRouter();
        await router.push('/');
        await router.isReady();

        const authStore = useAuthStore();
        authStore.user = {
            id: 'u1',
            email: 'test@example.com',
            display_name: 'Tester',
            preferred_language: 'en',
            oauth_providers: [],
        };

        const wrapper = mount(AppHeader, {
            global: {
                plugins: [createPinia(), router, i18n],
            },
        });

        const navLinks = wrapper.findAll('nav.nav-main .nav-link');
        expect(navLinks.length).toBeGreaterThanOrEqual(7);
    });

    it('toggles dark mode class from header control', async () => {
        const router = makeRouter();
        await router.push('/');
        await router.isReady();

        const authStore = useAuthStore();
        authStore.user = {
            id: 'u1',
            email: 'test@example.com',
            display_name: 'Tester',
            preferred_language: 'en',
            oauth_providers: [],
        };

        const wrapper = mount(AppHeader, {
            global: {
                plugins: [createPinia(), router, i18n],
            },
        });

        const themeStore = useThemeStore();
        const iconButtons = wrapper.findAll('button.btn-icon');
        const themeToggleButton = iconButtons[0];

        expect(themeStore.dark).toBe(false);
        expect(themeToggleButton.attributes('title')).toBe('Dark mode');
        expect(document.documentElement.classList.contains('dark')).toBe(false);

        await themeToggleButton.trigger('click');

        expect(themeStore.dark).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
});
