<template>
  <header class="app-header">
    <div class="header-left">
      <button v-if="auth.isAuthenticated" class="hamburger" @click.stop="mobileMenuOpen = !mobileMenuOpen" aria-label="Menu">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
      <h1 class="app-title">{{ t('app.title') }}</h1>
    </div>
    <nav v-if="auth.isAuthenticated" class="header-nav desktop-nav">
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
    </nav>
    <div class="header-right">
      <div v-if="auth.isAuthenticated" class="profile-dropdown-wrap">
        <button class="profile-btn" @click.stop="profileOpen = !profileOpen">
          <span class="profile-avatar">{{ auth.user?.displayName?.charAt(0)?.toUpperCase() }}</span>
        </button>
        <div v-if="profileOpen" class="profile-dropdown">
          <div class="dropdown-header">
            <span class="dropdown-name">{{ auth.user?.displayName }}</span>
            <span class="dropdown-email">{{ auth.user?.email }}</span>
          </div>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" @click="theme.toggle(); profileOpen = false">
            {{ theme.dark ? '☀️' : '🌙' }} {{ theme.dark ? t('nav.lightMode') : t('nav.darkMode') }}
          </button>
          <div class="dropdown-item dropdown-lang">
            <span>🌐</span>
            <select :value="locale" class="lang-select" @change="onLangChange">
              <option value="nl">🇳🇱 NL</option>
              <option value="en">🇬🇧 EN</option>
            </select>
          </div>
          <router-link to="/profile" class="dropdown-item" @click="profileOpen = false">
            👤 {{ t('nav.profile') }}
          </router-link>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item dropdown-item-danger" @click="auth.logout().then(() => $router.push('/login')); profileOpen = false">
            🚪 {{ t('nav.logout') }}
          </button>
        </div>
      </div>
    </div>
  </header>
  <!-- Mobile nav drawer (outside header to avoid stacking context issues) -->
  <Teleport to="body">
    <div v-if="mobileMenuOpen" class="mobile-overlay" @click="mobileMenuOpen = false"></div>
    <nav v-if="auth.isAuthenticated" class="mobile-nav" :class="{ open: mobileMenuOpen }">
      <router-link to="/map" class="nav-link" active-class="active" @click="mobileMenuOpen = false">
        <span class="nav-icon">🗺️</span> {{ t('nav.map') }}
      </router-link>
      <router-link to="/add" class="nav-link" active-class="active" @click="mobileMenuOpen = false">
        <span class="nav-icon">➕</span> {{ t('nav.add') }}
      </router-link>
      <router-link to="/types" class="nav-link" active-class="active" @click="mobileMenuOpen = false">
        <span class="nav-icon">🏷️</span> {{ t('nav.types') }}
      </router-link>
      <router-link to="/manage" class="nav-link" active-class="active" @click="mobileMenuOpen = false">
        <span class="nav-icon">📋</span> {{ t('nav.manage') }}
      </router-link>
      <div class="mobile-nav-extras">
        <button class="nav-link" @click="theme.toggle(); mobileMenuOpen = false">
          {{ theme.dark ? '☀️' : '🌙' }} {{ theme.dark ? t('nav.lightMode') : t('nav.darkMode') }}
        </button>
        <div class="mobile-lang-row">
          <span class="nav-icon">🌐</span>
          <select :value="locale" class="lang-select" @change="onLangChange">
            <option value="nl">🇳🇱 NL</option>
            <option value="en">🇬🇧 EN</option>
          </select>
        </div>
        <router-link to="/profile" class="nav-link" @click="mobileMenuOpen = false">
          👤 {{ auth.user?.displayName }}
        </router-link>
        <button class="nav-link nav-link-danger" @click="auth.logout().then(() => $router.push('/login')); mobileMenuOpen = false">
          🚪 {{ t('nav.logout') }}
        </button>
      </div>
    </nav>
    <div v-if="profileOpen" class="profile-overlay" @click="profileOpen = false"></div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const { t, locale } = useI18n();
const auth = useAuthStore();
const theme = useThemeStore();

const mobileMenuOpen = ref(false);
const profileOpen = ref(false);

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
  z-index: 1100;
  position: sticky;
  top: 0;
}

.header-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 40px;
  height: 40px;
  padding: 8px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 6px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.hamburger:hover {
  background: var(--color-bg);
}

.hamburger:active {
  background: var(--color-border);
}

.hamburger-line {
  display: block;
  width: 100%;
  height: 2.5px;
  background: var(--color-text);
  border-radius: 1px;
}

.app-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0;
  white-space: nowrap;
}

.desktop-nav {
  display: flex;
  gap: 0.25rem;
  margin-left: 2rem;
  flex-shrink: 0;
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
  border: none;
  background: none;
  cursor: pointer;
}

.nav-link:hover {
  background: var(--color-bg);
  color: var(--color-text);
  text-decoration: none;
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
  flex-shrink: 0;
}

/* Profile dropdown */
.profile-dropdown-wrap {
  position: relative;
}

.profile-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  background: var(--color-primary);
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s;
}

.profile-btn:hover {
  border-color: var(--color-primary);
}

.profile-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1300;
  padding: 0.5rem 0;
  animation: dropdown-in 0.15s ease;
}

@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-header {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.dropdown-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.dropdown-email {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.dropdown-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0.25rem 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
  color: var(--color-text);
  text-decoration: none;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
  transition: background 0.1s;
}

.dropdown-item:hover {
  background: var(--color-bg);
  text-decoration: none;
}

.dropdown-item-danger {
  color: var(--color-error);
}

.dropdown-lang {
  cursor: default;
}

.dropdown-lang:hover {
  background: none;
}

.lang-select {
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  font-size: 0.8rem;
  cursor: pointer;
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 1rem;
    gap: 0.5rem;
  }

  .app-title {
    font-size: 0.95rem;
  }

  .hamburger {
    display: flex;
  }

  .desktop-nav {
    display: none;
  }

  .profile-dropdown-wrap {
    display: none;
  }
}
</style>

<!-- Non-scoped styles for Teleported mobile nav -->
<style>
.mobile-nav {
  position: fixed;
  top: 56px;
  left: 0;
  width: 280px;
  height: calc(100vh - 56px);
  display: none;
  flex-direction: column;
  background: var(--color-surface);
  padding: 1rem;
  gap: 0.25rem;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
  z-index: 10200;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  overflow-y: auto;
}

.mobile-nav .nav-link {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all 0.15s;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  min-height: 44px;
}

.mobile-nav .nav-link:hover {
  background: var(--color-bg);
  color: var(--color-text);
  text-decoration: none;
}

.mobile-nav .nav-link.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.mobile-nav .nav-link-danger:hover {
  color: var(--color-error);
}

.mobile-nav .nav-icon {
  font-size: 1rem;
}

.mobile-nav .mobile-nav-extras {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.mobile-nav .mobile-lang-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.mobile-nav .mobile-lang-row .lang-select {
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  font-size: 0.8rem;
  cursor: pointer;
}

.mobile-nav.open {
  transform: translateX(0);
}

.mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  top: 56px;
  background: rgba(0, 0, 0, 0.3);
  z-index: 10100;
}

.profile-overlay {
  position: fixed;
  inset: 0;
  z-index: 1099;
}

@media (max-width: 768px) {
  .mobile-nav {
    display: flex;
  }

  .mobile-overlay {
    display: block;
  }
}
</style>
