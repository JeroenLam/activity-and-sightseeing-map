import { defineStore } from 'pinia';
import { ref } from 'vue';
import api, { isOfflineErrorLike } from '@/lib/api';
import { loadCachedSettings, saveCachedSettings } from '@/lib/offlineStorage';
import { useOfflineSyncStore } from '@/stores/offlineSync';
import type { UserSettings } from '@/types';

export const useSettingsStore = defineStore('settings', () => {
    const settings = ref<UserSettings>(loadCachedSettings() ?? {
        preferred_language: 'nl',
        default_map_lat: null,
        default_map_lng: null,
        default_map_zoom: null,
        map_tile_set: 'auto',
        profile_public: false,
        location_filter: 'show-all',
        show_ratings: true,
        show_comments: true,
    });
    const loading = ref(false);

    function persistSettings() {
        saveCachedSettings(settings.value);
    }

    function setSettings(nextSettings: UserSettings) {
        settings.value = nextSettings;
        persistSettings();
    }

    async function fetchSettings() {
        loading.value = true;
        try {
            const { data } = await api.get<UserSettings>('/api/settings');
            settings.value = data;
            persistSettings();
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }
        } finally {
            loading.value = false;
        }
    }

    async function updateSettings(payload: Partial<UserSettings>) {
        const offlineSync = useOfflineSyncStore();
        try {
            const { data } = await api.put<UserSettings>('/api/settings', payload);
            settings.value = data;
            persistSettings();
            return;
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }
            settings.value = {
                ...settings.value,
                ...payload,
            };
            persistSettings();
            offlineSync.enqueue({
                entity_type: 'settings',
                operation: 'update',
                entity_id: 'settings',
                base_sync_version: settings.value.sync_version ?? null,
                payload: settings.value as unknown as Record<string, unknown>,
            });
        }
    }

    return {
        settings,
        loading,
        fetchSettings,
        updateSettings,
        setSettings,
    };
});
