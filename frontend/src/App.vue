<template>
  <div id="app" :class="{ dark: themeStore.dark }">
    <div v-if="connectionError" class="connection-error-banner">
      <strong>⚠ Backend Connection Error [{{ connectionError.code }}]:</strong>
      {{ connectionError.message }}
    </div>
    <div class="offline-banner" :class="{ offline: !syncStore.online }">
      <strong>{{ syncStore.online ? t('sync.online') : t('sync.offline') }}</strong>
      <span>{{ t('sync.pendingMutations') }}: {{ syncStore.queue.length }}</span>
      <button class="btn btn-small" :disabled="syncStore.syncing || !syncStore.online" @click="syncStore.syncNow">
        {{ syncStore.syncing ? t('sync.syncing') : t('sync.syncNow') }}
      </button>
    </div>
    <AppHeader v-if="authStore.isAuthenticated" />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppHeader from './components/layout/AppHeader.vue';
import { useAuthStore } from './stores/auth';
import { useThemeStore } from './stores/theme';
import { useOfflineSyncStore } from './stores/offlineSync';
import { classifyError, type ApiConnectionError } from './lib/api';

const { t } = useI18n();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const syncStore = useOfflineSyncStore();
const connectionError = ref<ApiConnectionError | null>(null);

onMounted(async () => {
  console.info('[App] Mounting application, fetching user...');
  try {
    await authStore.fetchUser();
    console.info('[App] User fetch complete:', authStore.user ? 'authenticated' : 'not authenticated');
    connectionError.value = null;
    if (authStore.user) {
      await syncStore.bootstrap();
      await syncStore.refreshConflicts();
    }
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

.offline-banner {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.75rem;
  background: #ecfeff;
  border-bottom: 1px solid #bae6fd;
  color: #0c4a6e;
}

.offline-banner.offline {
  background: #fff7ed;
  border-bottom-color: #fed7aa;
  color: #9a3412;
}

.dark .offline-banner {
  background: #082f49;
  border-bottom-color: #0c4a6e;
  color: #bae6fd;
}

.dark .offline-banner.offline {
  background: #431407;
  border-bottom-color: #9a3412;
  color: #fdba74;
}
</style>
