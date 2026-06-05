<template>
  <div id="app" :class="{ dark: themeStore.dark }">
    <div v-if="connectionError" class="connection-error-banner">
      <strong>⚠ Backend Connection Error [{{ connectionError.code }}]:</strong>
      {{ connectionError.message }}
    </div>
    <AppHeader v-if="authStore.isAuthenticated" />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppHeader from './components/layout/AppHeader.vue';
import { useAuthStore } from './stores/auth';
import { useThemeStore } from './stores/theme';
import { classifyError, type ApiConnectionError } from './lib/api';

const authStore = useAuthStore();
const themeStore = useThemeStore();
const connectionError = ref<ApiConnectionError | null>(null);

onMounted(async () => {
  console.info('[App] Mounting application, fetching user...');
  try {
    await authStore.fetchUser();
    console.info('[App] User fetch complete:', authStore.user ? 'authenticated' : 'not authenticated');
    connectionError.value = null;
  } catch (err: any) {
    const classified = err.apiError || classifyError(err);
    connectionError.value = classified;
    console.error(`[App] Failed to connect to backend [${classified.code}]:`, classified.message);
  }
});
</script>

<style scoped>
.connection-error-banner {
  background-color: #fef2f2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  padding: 0.75rem 1rem;
  text-align: center;
  font-size: 0.9rem;
}

.dark .connection-error-banner {
  background-color: #450a0a;
  border-color: #7f1d1d;
  color: #fca5a5;
}
</style>
