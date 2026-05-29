<template>
  <div class="map-view">
    <FilterPanel
      v-model:yearFrom="yearFrom"
      v-model:yearTo="yearTo"
      v-model:showUnvisited="showUnvisited"
      v-model:visitedOpacity="visitedOpacity"
      v-model:unvisitedOpacity="unvisitedOpacity"
      v-model:markerSize="markerSize"
    />
    <MapContainer
      :locations="locationsStore.collection.features"
      :types="typesStore.types"
      :visited-opacity="visitedOpacity"
      :unvisited-opacity="unvisitedOpacity"
      :marker-size="markerSize"
      :dark-mode="themeStore.dark"
      :default-lat="settingsStore.settings.default_map_lat"
      :default-lng="settingsStore.settings.default_map_lng"
      :default-zoom="settingsStore.settings.default_map_zoom"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import MapContainer from '@/components/map/MapContainer.vue';
import FilterPanel from '@/components/map/FilterPanel.vue';
import { useLocationsStore } from '@/stores/locations';
import { useTypesStore } from '@/stores/types';
import { useSettingsStore } from '@/stores/settings';
import { useThemeStore } from '@/stores/theme';

const locationsStore = useLocationsStore();
const typesStore = useTypesStore();
const settingsStore = useSettingsStore();
const themeStore = useThemeStore();

const yearFrom = ref<number | undefined>(undefined);
const yearTo = ref<number | undefined>(undefined);
const showUnvisited = ref(false);
const visitedOpacity = ref(100);
const unvisitedOpacity = ref(100);
const markerSize = ref(10);

onMounted(async () => {
  await Promise.all([
    locationsStore.fetchLocations(),
    typesStore.fetchTypes(),
    settingsStore.fetchSettings(),
  ]);
});
</script>
