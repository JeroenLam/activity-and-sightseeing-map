import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            redirect: '/map',
        },
        {
            path: '/map',
            name: 'map',
            component: () => import('@/views/MapView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/add',
            name: 'add',
            component: () => import('@/views/AddLocationView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/types',
            name: 'types',
            component: () => import('@/views/ManageTypesView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/manage',
            name: 'manage',
            component: () => import('@/views/ManageLocationsView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/import',
            name: 'import',
            component: () => import('@/views/ImportView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('@/views/ProfileView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/AuthView.vue'),
        },
    ],
});

router.beforeEach(async (to) => {
    const auth = useAuthStore();

    if (auth.loading) {
        await auth.fetchUser();
    }

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        return { name: 'login' };
    }

    if (to.name === 'login' && auth.isAuthenticated) {
        return { name: 'map' };
    }
});

export default router;
