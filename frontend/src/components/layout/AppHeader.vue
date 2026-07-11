<template>
  <header class="app-header">
    <div class="header-left">
      <router-link to="/" class="logo">{{ t('app.title') }}</router-link>
    </div>

    <nav class="nav-main">
      <router-link to="/" class="nav-link">{{ t('nav.map') }}</router-link>
      <router-link to="/add" class="nav-link">{{ t('nav.add') }}</router-link>
      <router-link to="/locations" class="nav-link">{{ t('nav.manage') }}</router-link>
      <router-link to="/types" class="nav-link">{{ t('nav.types') }}</router-link>
      <router-link to="/stats" class="nav-link">{{ t('nav.stats') }}</router-link>
      <router-link to="/sync" class="nav-link">{{ t('nav.sync') }}</router-link>
      <router-link to="/import" class="nav-link">{{ t('nav.import') }}</router-link>
    </nav>

    <div class="header-right">
      <button class="btn-icon" @click="themeStore.toggle()" :title="themeStore.dark ? t('nav.lightMode') : t('nav.darkMode')">
        {{ themeStore.dark ? '☀️' : '🌙' }}
      </button>
      <div class="profile-dropdown" ref="dropdownRef">
        <button class="btn-icon profile-btn" @click="dropdownOpen = !dropdownOpen">
          👤
        </button>
        <div v-if="dropdownOpen" class="dropdown-menu" @click.stop>
          <div class="dropdown-user">{{ authStore.user?.display_name }}</div>
          <router-link to="/profile" class="dropdown-item" @click="dropdownOpen = false">{{ t('nav.profile') }}</router-link>
          <button class="dropdown-item" @click="onLogout">{{ t('nav.logout') }}</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const themeStore = useThemeStore();

const dropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement>();

async function onLogout() {
  await authStore.logout();
  dropdownOpen.value = false;
  router.push('/auth');
}

function onClickOutside(e: MouseEvent) {
  const target = e.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (dropdownRef.value && !dropdownRef.value.contains(target)) {
    dropdownOpen.value = false;
  }
}

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  width: 100%;
  max-width: 100%;
  padding: 0 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 1100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo {
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-text);
  text-decoration: none;
}

.nav-main {
  display: flex;
  gap: 0.25rem;
}

.nav-link {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover {
  background: var(--color-bg);
  color: var(--color-text);
  text-decoration: none;
}

.nav-link.router-link-active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.1rem;
  padding: 0.4rem;
  cursor: pointer;
  border-radius: 6px;
  color: var(--color-text-secondary);
}

.btn-icon:hover {
  background: var(--color-bg);
}

.profile-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 160px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 200;
}

.dropdown-user {
  padding: 0.6rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  text-align: left;
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  text-decoration: none;
}

.dropdown-item:hover {
  background: var(--color-bg);
}
</style>
