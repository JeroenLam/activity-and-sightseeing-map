<template>
  <header class="app-header">
    <div class="header-left">
      <h1 class="app-title">{{ t('app.title') }}</h1>
    </div>
    <nav v-if="auth.isAuthenticated" class="header-nav">
      <router-link to="/map" class="nav-link" active-class="active">
        <span class="nav-icon">🗺️</span> {{ t('nav.map') }}
      </router-link>
      <router-link to="/add" class="nav-link" active-class="active">
        <span class="nav-icon">➕</span> {{ t('nav.add') }}
      </router-link>
      <router-link to="/types" class="nav-link" active-class="active">
        <span class="nav-icon">🏷️</span> {{ t('nav.types') }}
      </router-link>
      <router-link to="/manage" class="nav-link" active-class="active">
        <span class="nav-icon">📋</span> {{ t('nav.manage') }}
      </router-link>
      <router-link to="/import" class="nav-link" active-class="active">
        <span class="nav-icon">📥</span> {{ t('nav.import') }}
      </router-link>
    </nav>
    <div class="header-right">
      <select
        :value="locale"
        class="lang-select"
        @change="onLangChange"
      >
        <option value="nl">🇳🇱 NL</option>
        <option value="en">🇬🇧 EN</option>
      </select>
      <template v-if="auth.isAuthenticated">
        <span class="user-name">{{ auth.user?.displayName }}</span>
        <button class="btn-ghost" @click="auth.logout().then(() => $router.push('/login'))">
          {{ t('nav.logout') }}
        </button>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

const { t, locale } = useI18n();
const auth = useAuthStore();

function onLangChange(e: Event) {
  const lang = (e.target as HTMLSelectElement).value as 'nl' | 'en';
  auth.setLanguage(lang);
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 1.5rem;
  height: 56px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.header-left {
  flex-shrink: 0;
}

.app-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0;
  white-space: nowrap;
}

.header-nav {
  display: flex;
  gap: 0.25rem;
  margin-left: 2rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all 0.15s;
}

.nav-link:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.nav-link.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.nav-icon {
  font-size: 1rem;
}

.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lang-select {
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  font-size: 0.8rem;
  cursor: pointer;
}

.user-name {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.btn-ghost {
  padding: 0.4rem 0.75rem;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.btn-ghost:hover {
  background: var(--color-bg);
  color: var(--color-error);
}
</style>
