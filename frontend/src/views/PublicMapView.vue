<template>
  <div class="public-map-view">
    <h2 v-if="profileName">{{ profileName }}</h2>
    <MapContainer
      v-if="locations.length"
      :locations="locations"
      :types="types"
      :visited-opacity="100"
      :unvisited-opacity="100"
      :marker-size="10"
      :dark-mode="false"
      :default-lat="null"
      :default-lng="null"
      :default-zoom="null"
    />
    <p v-else-if="loading">Loading...</p>
    <p v-else>Profile not found or is private.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import MapContainer from '@/components/map/MapContainer.vue';
import type { LocationFeature, LocationType } from '@/types';

const route = useRoute();
const locations = ref<LocationFeature[]>([]);
const types = ref<LocationType[]>([]);
const profileName = ref('');
const loading = ref(true);

onMounted(async () => {
  const userId = route.params.userId as string;
  try {
    const [profileResp, locationsResp] = await Promise.all([
      axios.get(`/api/public/${userId}/profile`),
      axios.get(`/api/public/${userId}/locations`),
    ]);
    profileName.value = profileResp.data.display_name;
    types.value = profileResp.data.types;
    locations.value = locationsResp.data.features;
  } catch {
    // Profile not found or private
  } finally {
    loading.value = false;
  }
});
</script>
