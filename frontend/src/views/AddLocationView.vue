<template>
  <div class="add-location-view">
    <h2>{{ $t('nav.add') }}</h2>
    <LocationForm @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import LocationForm from '@/components/locations/LocationForm.vue';
import { useTypesStore } from '@/stores/types';

const router = useRouter();
const typesStore = useTypesStore();

onMounted(async () => {
  if (!typesStore.types.length) {
    await typesStore.fetchTypes();
  }
});

function onSaved() {
  router.push({ name: 'map' });
}
</script>
