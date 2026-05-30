<template>
  <div class="public-map-page">
    <h2 v-if="profileName" class="public-title">{{ profileName }}</h2>
    <div class="public-map-area" v-if="features.length">
      <MapContainer
        :features="features"
        :marker-size="10"
        :visited-opacity="1"
        :unvisited-opacity="0.5"
        @bounds-change="() => {}"
        @edit="() => {}"
        @add-year="() => {}"
      />
    </div>
    <p v-else-if="loading" class="text-secondary" style="padding: 2rem; text-align: center">Loading...</p>
    <p v-else class="text-secondary" style="padding: 2rem; text-align: center">Profile not found or is private.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import MapContainer from '@/components/map/MapContainer.vue';
import type { LocationFeature } from '@/types';

const route = useRoute();
const features = ref<LocationFeature[]>([]);
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
    features.value = locationsResp.data.features;
  } catch {} finally { loading.value = false; }
});
</script>

<style scoped>
.public-map-page { display: flex; flex-direction: column; height: calc(100vh - var(--header-height)); }
.public-title { padding: 0.75rem 1rem; margin: 0; font-size: 1.1rem; border-bottom: 1px solid var(--color-border); }
.public-map-area { flex: 1; }
</style>
