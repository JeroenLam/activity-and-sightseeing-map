import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import type { User, OAuthConfig } from '@/types';
import { i18n } from '@/i18n';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const oauthConfig = ref<OAuthConfig>({ google: false });
  const loading = ref(true);
  const error = ref('');

  const isAuthenticated = computed(() => !!user.value);

  async function fetchOAuthConfig() {
    try {
      const { data } = await axios.get<OAuthConfig>('/api/auth/oauth-config');
      oauthConfig.value = data;
    } catch {
      // OAuth not available
    }
  }

  async function fetchUser() {
    loading.value = true;
    try {
      const { data } = await axios.get<User>('/api/auth/me');
      user.value = data;
      i18n.global.locale.value = data.preferred_language as 'nl' | 'en';
    } catch {
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string) {
    error.value = '';
    try {
      const { data } = await axios.post<User>('/api/auth/login', { email, password });
      user.value = data;
      i18n.global.locale.value = data.preferred_language as 'nl' | 'en';
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Login failed';
      throw err;
    }
  }

  async function register(email: string, password: string, displayName: string) {
    error.value = '';
    try {
      const { data } = await axios.post<User>('/api/auth/register', {
        email,
        password,
        display_name: displayName,
      });
      user.value = data;
      i18n.global.locale.value = data.preferred_language as 'nl' | 'en';
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Registration failed';
      throw err;
    }
  }

  async function logout() {
    await axios.post('/api/auth/logout');
    user.value = null;
  }

  async function updateProfile(displayName?: string, preferredLanguage?: string) {
    const { data } = await axios.put<User>('/api/auth/me', {
      display_name: displayName,
      preferred_language: preferredLanguage,
    });
    user.value = data;
    if (preferredLanguage) {
      i18n.global.locale.value = preferredLanguage as 'nl' | 'en';
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await axios.put('/api/auth/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  return {
    user,
    oauthConfig,
    loading,
    error,
    isAuthenticated,
    fetchOAuthConfig,
    fetchUser,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };
});
