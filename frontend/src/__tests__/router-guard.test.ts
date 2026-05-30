import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

// Mock i18n
vi.mock('@/i18n', () => ({
    i18n: { global: { locale: { value: 'en' } } },
}));

function createTestRouter() {
    const router = createRouter({
        history: createWebHistory(),
        routes: [
            { path: '/', name: 'map', component: { template: '<div />' }, meta: { requiresAuth: true } },
            { path: '/add', name: 'add-location', component: { template: '<div />' }, meta: { requiresAuth: true } },
            { path: '/locations', name: 'manage-locations', component: { template: '<div />' }, meta: { requiresAuth: true } },
            { path: '/types', name: 'manage-types', component: { template: '<div />' }, meta: { requiresAuth: true } },
            { path: '/import', name: 'import', component: { template: '<div />' }, meta: { requiresAuth: true } },
            { path: '/profile', name: 'profile', component: { template: '<div />' }, meta: { requiresAuth: true } },
            { path: '/auth', name: 'auth', component: { template: '<div />' } },
        ],
    });

    router.beforeEach(async (to) => {
        const authStore = useAuthStore();

        if (!authStore.user) {
            await authStore.fetchUser();
        }

        if (to.meta.requiresAuth && !authStore.isAuthenticated) {
            return { name: 'auth' };
        }

        if (to.name === 'auth' && authStore.isAuthenticated) {
            return { name: 'map' };
        }
    });

    return router;
}

describe('Router auth guard', () => {
    let router: ReturnType<typeof createTestRouter>;

    beforeEach(() => {
        setActivePinia(createPinia());
        router = createTestRouter();
    });

    it('redirects unauthenticated user to /auth from /', async () => {
        const authStore = useAuthStore();
        authStore.fetchUser = vi.fn(async () => { authStore.user = null as any; });

        await router.push('/');
        await router.isReady();

        expect(router.currentRoute.value.name).toBe('auth');
    });

    it('redirects unauthenticated user to /auth from /add', async () => {
        const authStore = useAuthStore();
        authStore.fetchUser = vi.fn(async () => { authStore.user = null as any; });

        await router.push('/add');
        await router.isReady();

        expect(router.currentRoute.value.name).toBe('auth');
    });

    it('redirects unauthenticated user to /auth from /locations', async () => {
        const authStore = useAuthStore();
        authStore.fetchUser = vi.fn(async () => { authStore.user = null as any; });

        await router.push('/locations');
        await router.isReady();

        expect(router.currentRoute.value.name).toBe('auth');
    });

    it('redirects unauthenticated user to /auth from /types', async () => {
        const authStore = useAuthStore();
        authStore.fetchUser = vi.fn(async () => { authStore.user = null as any; });

        await router.push('/types');
        await router.isReady();

        expect(router.currentRoute.value.name).toBe('auth');
    });

    it('redirects unauthenticated user to /auth from /import', async () => {
        const authStore = useAuthStore();
        authStore.fetchUser = vi.fn(async () => { authStore.user = null as any; });

        await router.push('/import');
        await router.isReady();

        expect(router.currentRoute.value.name).toBe('auth');
    });

    it('redirects unauthenticated user to /auth from /profile', async () => {
        const authStore = useAuthStore();
        authStore.fetchUser = vi.fn(async () => { authStore.user = null as any; });

        await router.push('/profile');
        await router.isReady();

        expect(router.currentRoute.value.name).toBe('auth');
    });

    it('allows authenticated user to access protected routes', async () => {
        const authStore = useAuthStore();
        authStore.fetchUser = vi.fn(async () => {
            authStore.user = { id: '1', email: 'test@test.com', display_name: 'Test', preferred_language: 'en' } as any;
        });

        await router.push('/');
        await router.isReady();

        expect(router.currentRoute.value.name).toBe('map');
    });

    it('allows authenticated user to access /add', async () => {
        const authStore = useAuthStore();
        authStore.fetchUser = vi.fn(async () => {
            authStore.user = { id: '1', email: 'test@test.com', display_name: 'Test', preferred_language: 'en' } as any;
        });

        await router.push('/add');
        await router.isReady();

        expect(router.currentRoute.value.name).toBe('add-location');
    });

    it('redirects authenticated user away from /auth to /', async () => {
        const authStore = useAuthStore();
        authStore.user = { id: '1', email: 'test@test.com', display_name: 'Test', preferred_language: 'en' } as any;
        authStore.fetchUser = vi.fn();

        await router.push('/auth');
        await router.isReady();

        expect(router.currentRoute.value.name).toBe('map');
    });

    it('allows unauthenticated user to access /auth', async () => {
        const authStore = useAuthStore();
        authStore.fetchUser = vi.fn(async () => { authStore.user = null as any; });

        await router.push('/auth');
        await router.isReady();

        expect(router.currentRoute.value.name).toBe('auth');
    });
});
