import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import type { User, OAuthConfig } from '@/types';
import { i18n } from '@/i18n';

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null);
    const oauthConfig = ref<OAuthConfig>({ google: false, github: false });
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
            i18n.global.locale.value = data.preferredLanguage;
        } catch {
            user.value = null;
        } finally {
            loading.value = false;
        }
    }

    async function login(email: string, password: string) {
        error.value = '';
        try {
            const { data } = await axios.post<User>('/api/auth/login', {
                email,
                password,
            });
            user.value = data;
            i18n.global.locale.value = data.preferredLanguage;
        } catch (err: any) {
            error.value = err.response?.data?.error || 'Login failed';
            throw err;
        }
    }

    async function register(
        email: string,
        password: string,
        displayName: string
    ) {
        error.value = '';
        try {
            const { data } = await axios.post<User>('/api/auth/register', {
                email,
                password,
                displayName,
            });
            user.value = data;
            i18n.global.locale.value = data.preferredLanguage;
        } catch (err: any) {
            error.value = err.response?.data?.error || 'Registration failed';
            throw err;
        }
    }

    async function logout() {
        await axios.post('/api/auth/logout');
        user.value = null;
    }

    async function setLanguage(lang: 'nl' | 'en') {
        i18n.global.locale.value = lang;
        if (user.value) {
            user.value.preferredLanguage = lang;
            await axios.put('/api/auth/me/language', { language: lang });
        }
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
        setLanguage,
    };
});
