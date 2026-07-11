import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import DashboardView from '@/views/DashboardView.vue';
import LocationsView from '@/views/LocationsView.vue';
import LoginView from '@/views/LoginView.vue';
import SettingsView from '@/views/SettingsView.vue';
import SyncView from '@/views/SyncView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/locations', name: 'locations', component: LocationsView },
    { path: '/sync', name: 'sync', component: SyncView },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.hydrated) {
    await auth.restoreSession();
  }

  if (!auth.user && to.name !== 'login') {
    return { name: 'login' };
  }

  if (auth.user && to.name === 'login') {
    return { name: 'dashboard' };
  }

  return true;
});

export default router;
