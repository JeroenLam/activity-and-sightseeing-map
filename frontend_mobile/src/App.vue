<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Offline first</p>
        <h1>Activiteiten Mobile</h1>
      </div>
      <button type="button" class="ghost" @click="syncNow">Sync now</button>
    </header>

    <OfflineBanner :online="online" :pending-count="app.pendingCount" />

    <nav v-if="auth.user" class="tab-bar">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/locations">Locations</RouterLink>
      <RouterLink to="/sync">Sync</RouterLink>
      <RouterLink to="/settings">Settings</RouterLink>
    </nav>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import OfflineBanner from '@/components/OfflineBanner.vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const app = useAppStore();
const router = useRouter();
const online = ref(navigator.onLine);

const syncNow = async () => {
  if (!auth.user) {
    await router.push('/login');
    return;
  }

  await app.syncNow();
};

const handleOnline = () => {
  online.value = true;
};

const handleOffline = () => {
  online.value = false;
};

onMounted(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});
</script>
