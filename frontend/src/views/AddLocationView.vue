<template>
  <div class="page-container">
    <LocationForm />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useTypesStore } from '@/stores/types';
import LocationForm from '@/components/locations/LocationForm.vue';

const typesStore = useTypesStore();
const settingsStore = useSettingsStore();
onMounted(() => {
  void Promise.all([typesStore.fetchTypes(), settingsStore.fetchSettings()]);
});
</script>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
}

@media (max-width: 768px) {
  .page-container { padding: 1rem; }
}
</style>
