import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'map',
            component: () => import('@/views/MapView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/add',
            name: 'add-location',
            component: () => import('@/views/AddLocationView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/locations',
            name: 'manage-locations',
            component: () => import('@/views/ManageLocationsView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/types',
            name: 'manage-types',
            component: () => import('@/views/ManageTypesView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/import',
            name: 'import',
            component: () => import('@/views/ImportView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/stats',
            name: 'statistics',
            component: () => import('@/views/StatsView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/sync',
            name: 'sync',
            component: () => import('@/views/SyncView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('@/views/ProfileView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/auth',
            name: 'auth',
            component: () => import('@/views/AuthView.vue'),
        },
        {
            path: '/public/:userId',
            name: 'public-profile',
            component: () => import('@/views/PublicMapView.vue'),
        },
    ],
});

router.beforeEach(async (to) => {
    const authStore = useAuthStore();

    // Always attempt to fetch user if not yet loaded
    if (!authStore.user) {
        await authStore.fetchUser();
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        return { name: 'auth' };
    }

    // Redirect authenticated users away from auth page
    if (to.name === 'auth' && authStore.isAuthenticated) {
        return { name: 'map' };
    }
});

export default router;
