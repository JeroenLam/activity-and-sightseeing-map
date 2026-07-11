import { defineStore } from 'pinia';
import api from '@/lib/api';
import { clearSnapshot } from '@/lib/storage';
import type { OAuthConfig, User } from '@/types';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as User | null,
        oauthConfig: { google: false } as OAuthConfig,
        loading: false,
        hydrated: false,
        error: '' as string,
    }),
    getters: {
        isAuthenticated: (state) => state.user !== null,
    },
    actions: {
        async restoreSession() {
            if (this.hydrated) {
                return;
            }

            this.loading = true;
            try {
                const response = await api.get('/api/auth/me');
                this.user = response.data;
            } catch {
                this.user = null;
            } finally {
                this.loading = false;
                this.hydrated = true;
            }
        },
        async fetchOAuthConfig() {
            const response = await api.get('/api/auth/oauth-config');
            this.oauthConfig = response.data;
        },
        async login(email: string, password: string) {
            this.loading = true;
            this.error = '';
            try {
                const response = await api.post('/api/auth/login', { email, password });
                this.user = response.data;
                return this.user;
            } catch (error: any) {
                this.error = error?.response?.data?.detail || 'Unable to log in.';
                throw error;
            } finally {
                this.loading = false;
            }
        },
        async register(email: string, password: string, display_name: string) {
            this.loading = true;
            this.error = '';
            try {
                const response = await api.post('/api/auth/register', { email, password, display_name });
                this.user = response.data;
                return this.user;
            } catch (error: any) {
                this.error = error?.response?.data?.detail || 'Unable to register.';
                throw error;
            } finally {
                this.loading = false;
            }
        },
        async logout() {
            await api.post('/api/auth/logout');
            this.user = null;
            clearSnapshot();
        },
    },
});
