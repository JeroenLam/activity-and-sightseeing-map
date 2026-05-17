<template>
  <div class="page-container">
    <TypeManager />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useTypesStore } from '@/stores/types';
import { useLocationsStore } from '@/stores/locations';
import TypeManager from '@/components/types/TypeManager.vue';

const typesStore = useTypesStore();
const locationsStore = useLocationsStore();

onMounted(() => {
  typesStore.fetchTypes();
  locationsStore.fetchLocations();
});
</script>

<style scoped>
.page-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}

@media (max-width: 768px) {
  .page-container {
    padding: 1rem;
  }
}
</style>
