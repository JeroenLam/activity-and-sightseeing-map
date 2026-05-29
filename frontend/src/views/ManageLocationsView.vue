<template>
  <div class="manage-locations-view">
    <h2>{{ $t('nav.locations') }}</h2>
    <div v-if="locationsStore.loading">{{ $t('common.loading') }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>{{ $t('location.name') }}</th>
          <th>{{ $t('location.type') }}</th>
          <th>{{ $t('location.city') }}</th>
          <th>{{ $t('location.country') }}</th>
          <th>{{ $t('location.rating') }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="feature in locationsStore.collection.features" :key="feature.id">
          <td>{{ feature.properties.name }}</td>
          <td>{{ feature.properties.type?.name || '-' }}</td>
          <td>{{ feature.properties.city }}</td>
          <td>{{ feature.properties.country }}</td>
          <td>{{ feature.properties.rating ? '★'.repeat(feature.properties.rating) : '-' }}</td>
          <td>
            <button @click="deleteLocation(feature.id!)">{{ $t('common.delete') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useLocationsStore } from '@/stores/locations';

const locationsStore = useLocationsStore();

onMounted(async () => {
  await locationsStore.fetchLocations();
});

async function deleteLocation(id: string) {
  if (confirm('Are you sure?')) {
    await locationsStore.deleteLocation(id);
  }
}
</script>
