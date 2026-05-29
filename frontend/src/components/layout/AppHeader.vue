<template>
  <header class="app-header">
    <nav>
      <router-link :to="{ name: 'map' }">{{ $t('nav.map') }}</router-link>
      <router-link :to="{ name: 'add-location' }">{{ $t('nav.add') }}</router-link>
      <router-link :to="{ name: 'manage-locations' }">{{ $t('nav.locations') }}</router-link>
      <router-link :to="{ name: 'manage-types' }">{{ $t('nav.types') }}</router-link>
      <router-link :to="{ name: 'import' }">{{ $t('nav.import') }}</router-link>
      <router-link :to="{ name: 'profile' }">{{ $t('nav.profile') }}</router-link>
    </nav>
    <div class="header-actions">
      <button @click="themeStore.toggle()">🌓</button>
      <span>{{ authStore.user?.display_name }}</span>
      <button @click="onLogout">{{ $t('auth.logout') }}</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const authStore = useAuthStore();
const themeStore = useThemeStore();
const router = useRouter();

async function onLogout() {
  await authStore.logout();
  router.push({ name: 'auth' });
}
</script>
