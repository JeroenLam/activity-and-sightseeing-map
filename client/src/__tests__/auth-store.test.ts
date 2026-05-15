import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock the i18n module
vi.mock('@/i18n', () => ({
    i18n: {
        global: {
            locale: { value: 'nl' },
        },
    },
}));

describe('authStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should start with null user and loading true', () => {
            const store = useAuthStore();
            expect(store.user).toBeNull();
            expect(store.isAuthenticated).toBe(false);
            expect(store.loading).toBe(true);
            expect(store.error).toBe('');
        });
    });

    describe('fetchUser', () => {
        it('should set user on success', async () => {
            const mockUser = {
                id: '1',
                email: 'test@test.com',
                displayName: 'Tester',
                preferredLanguage: 'nl' as const,
                oauthProviders: [],
            };
            mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

            const store = useAuthStore();
            await store.fetchUser();

            expect(store.user).toEqual(mockUser);
            expect(store.isAuthenticated).toBe(true);
            expect(store.loading).toBe(false);
        });

        it('should set user to null on failure', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Unauthorized'));

            const store = useAuthStore();
            await store.fetchUser();

            expect(store.user).toBeNull();
            expect(store.isAuthenticated).toBe(false);
            expect(store.loading).toBe(false);
        });
    });

    describe('login', () => {
        it('should set user on successful login', async () => {
            const mockUser = {
                id: '1',
                email: 'test@test.com',
                displayName: 'Tester',
                preferredLanguage: 'en' as const,
                oauthProviders: [],
            };
            mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

            const store = useAuthStore();
            await store.login('test@test.com', 'password123');

            expect(store.user).toEqual(mockUser);
            expect(store.isAuthenticated).toBe(true);
            expect(store.error).toBe('');
            expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/login', {
                email: 'test@test.com',
                password: 'password123',
            });
        });

        it('should set error on failed login', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                response: { data: { error: 'Invalid credentials' } },
            });

            const store = useAuthStore();
            await expect(store.login('bad@test.com', 'wrong')).rejects.toBeDefined();

            expect(store.user).toBeNull();
            expect(store.error).toBe('Invalid credentials');
        });

        it('should set generic error when no response data', async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

            const store = useAuthStore();
            await expect(store.login('a@b.com', 'x')).rejects.toBeDefined();

            expect(store.error).toBe('Login failed');
        });
    });

    describe('register', () => {
        it('should set user on successful registration', async () => {
            const mockUser = {
                id: '2',
                email: 'new@test.com',
                displayName: 'New User',
                preferredLanguage: 'nl' as const,
                oauthProviders: [],
            };
            mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

            const store = useAuthStore();
            await store.register('new@test.com', 'password123', 'New User');

            expect(store.user).toEqual(mockUser);
            expect(store.isAuthenticated).toBe(true);
            expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/register', {
                email: 'new@test.com',
                password: 'password123',
                displayName: 'New User',
            });
        });

        it('should set error on failed registration', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                response: { data: { error: 'Email already registered' } },
            });

            const store = useAuthStore();
            await expect(
                store.register('dup@test.com', 'pass1234', 'Dup')
            ).rejects.toBeDefined();

            expect(store.error).toBe('Email already registered');
        });
    });

    describe('logout', () => {
        it('should clear user on logout', async () => {
            // First login
            const mockUser = {
                id: '1',
                email: 'test@test.com',
                displayName: 'Tester',
                preferredLanguage: 'nl' as const,
                oauthProviders: [],
            };
            mockedAxios.post.mockResolvedValueOnce({ data: mockUser });
            const store = useAuthStore();
            await store.login('test@test.com', 'password123');
            expect(store.isAuthenticated).toBe(true);

            // Then logout
            mockedAxios.post.mockResolvedValueOnce({});
            await store.logout();

            expect(store.user).toBeNull();
            expect(store.isAuthenticated).toBe(false);
        });
    });

    describe('setLanguage', () => {
        it('should update language and call API when authenticated', async () => {
            const mockUser = {
                id: '1',
                email: 'test@test.com',
                displayName: 'Tester',
                preferredLanguage: 'nl' as const,
                oauthProviders: [],
            };
            mockedAxios.post.mockResolvedValueOnce({ data: mockUser });
            const store = useAuthStore();
            await store.login('test@test.com', 'pass');

            mockedAxios.put.mockResolvedValueOnce({});
            await store.setLanguage('en');

            expect(store.user!.preferredLanguage).toBe('en');
            expect(mockedAxios.put).toHaveBeenCalledWith('/api/auth/me/language', {
                language: 'en',
            });
        });
    });

    describe('changePassword', () => {
        it('should call the password change API', async () => {
            mockedAxios.put.mockResolvedValueOnce({});
            const store = useAuthStore();
            await store.changePassword('oldpass', 'newpass123');

            expect(mockedAxios.put).toHaveBeenCalledWith('/api/auth/me/password', {
                currentPassword: 'oldpass',
                newPassword: 'newpass123',
            });
        });
    });

    describe('fetchOAuthConfig', () => {
        it('should fetch OAuth configuration', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { google: true, github: false },
            });

            const store = useAuthStore();
            await store.fetchOAuthConfig();

            expect(store.oauthConfig).toEqual({ google: true, github: false });
        });

        it('should handle fetch failure gracefully', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('fail'));

            const store = useAuthStore();
            await store.fetchOAuthConfig();

            // Should not throw, defaults remain
            expect(store.oauthConfig).toEqual({ google: false, github: false });
        });
    });
});
