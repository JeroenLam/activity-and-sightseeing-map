import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import type { UserSettings } from '@/types';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>({
    preferred_language: 'nl',
    default_map_lat: null,
    default_map_lng: null,
    default_map_zoom: null,
    profile_public: false,
    location_filter: 'show-all',
    show_ratings: true,
    show_comments: true,
  });
  const loading = ref(false);

  async function fetchSettings() {
    loading.value = true;
    try {
      const { data } = await axios.get<UserSettings>('/api/settings');
      settings.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function updateSettings(payload: Partial<UserSettings>) {
    const { data } = await axios.put<UserSettings>('/api/settings', payload);
    settings.value = data;
  }

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
  };
});
