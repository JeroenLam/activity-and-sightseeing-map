<template>
  <form class="location-form" @submit.prevent="onSubmit">
    <h3>{{ editing ? $t('locations.edit') : $t('locations.add') }}</h3>

    <div>
      <label>{{ $t('locations.name') }}</label>
      <input v-model="form.name" type="text" required />
    </div>

    <div>
      <label>{{ $t('locations.type') }}</label>
      <select v-model="form.type_id">
        <option v-for="t in typesStore.types" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </div>

    <div>
      <label>{{ $t('locations.address') }}</label>
      <input
        v-model="searchQuery"
        type="text"
        @input="debouncedSearch"
        :placeholder="$t('locations.searchAddress')"
      />
      <ul v-if="geocodeResults.length" class="geocode-results">
        <li v-for="r in geocodeResults" :key="r.display_name" @click="selectGeocode(r)">
          {{ r.display_name }}
        </li>
      </ul>
      <button type="button" @click="useMyLocation">{{ $t('locations.useMyLocation') }}</button>
    </div>

    <div>
      <label>{{ $t('locations.city') }}</label>
      <input v-model="form.city" type="text" required />
    </div>

    <div>
      <label>{{ $t('locations.country') }}</label>
      <input v-model="form.country" type="text" />
    </div>

    <div>
      <label>{{ $t('locations.lat') }}</label>
      <input v-model.number="form.lat" type="number" step="any" />
    </div>

    <div>
      <label>{{ $t('locations.lng') }}</label>
      <input v-model.number="form.lng" type="number" step="any" />
    </div>

    <div>
      <label>{{ $t('locations.yearsVisited') }}</label>
      <input v-model="yearsText" type="text" placeholder="2020, 2021" />
    </div>

    <div>
      <label>{{ $t('locations.visitedUnknownYear') }}</label>
      <input v-model="form.visited_unknown_year" type="checkbox" />
    </div>

    <div>
      <label>{{ $t('locations.rating') }}</label>
      <input v-model.number="form.rating" type="number" min="1" max="5" />
    </div>

    <div>
      <label>{{ $t('locations.comment') }}</label>
      <textarea v-model="form.comment"></textarea>
    </div>

    <div>
      <label>{{ $t('locations.link') }}</label>
      <input v-model="form.link" type="url" />
    </div>

    <button type="submit">{{ $t('common.save') }}</button>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useLocationsStore } from '@/stores/locations';
import { useTypesStore } from '@/stores/types';
import { useGeocoding } from '@/composables/useGeocoding';
import { useGeolocation } from '@/composables/useGeolocation';
import type { LocationFeature } from '@/types';

const props = defineProps<{
  location?: LocationFeature;
}>();

const emit = defineEmits<{ saved: [] }>();

const locationsStore = useLocationsStore();
const typesStore = useTypesStore();
const { search, results: geocodeResults } = useGeocoding();
const { getCurrentPosition } = useGeolocation();

const editing = computed(() => !!props.location);
const searchQuery = ref('');

const form = reactive({
  name: props.location?.properties.name || '',
  type_id: props.location?.properties.type?.id || '',
  city: props.location?.properties.city || '',
  country: props.location?.properties.country || '',
  lat: props.location?.geometry.coordinates[1] || 0,
  lng: props.location?.geometry.coordinates[0] || 0,
  years_visited: props.location?.properties.years_visited || [] as number[],
  visited_unknown_year: props.location?.properties.visited_unknown_year || false,
  rating: props.location?.properties.rating || null,
  comment: props.location?.properties.comment || '',
  link: props.location?.properties.link || '',
});

const yearsText = computed({
  get: () => form.years_visited.join(', '),
  set: (val: string) => {
    form.years_visited = val
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
  },
});

onMounted(() => {
  if (!typesStore.types.length) typesStore.fetchTypes();
});

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => search(searchQuery.value), 300);
}

function selectGeocode(result: { lat: number; lon: number; display_name: string; city?: string; country?: string }) {
  form.lat = result.lat;
  form.lng = result.lon;
  if (result.city) form.city = result.city;
  if (result.country) form.country = result.country;
  geocodeResults.value = [];
  searchQuery.value = result.display_name;
}

async function useMyLocation() {
  const pos = await getCurrentPosition();
  if (pos) {
    form.lat = pos.lat;
    form.lng = pos.lng;
  }
}

async function onSubmit() {
  const payload = {
    name: form.name,
    type_id: form.type_id || undefined,
    city: form.city,
    country: form.country,
    lat: form.lat,
    lng: form.lng,
    years_visited: form.years_visited,
    visited_unknown_year: form.visited_unknown_year,
    rating: form.rating,
    comment: form.comment,
    link: form.link,
  };
  if (editing.value && props.location) {
    await locationsStore.updateLocation(props.location.id!, payload);
  } else {
    await locationsStore.createLocation(payload);
  }
  emit('saved');
}
</script>

<style scoped>
.geocode-results {
  list-style: none;
  padding: 0;
  border: 1px solid #ccc;
  max-height: 150px;
  overflow-y: auto;
}
.geocode-results li {
  padding: 4px 8px;
  cursor: pointer;
}
.geocode-results li:hover {
  background: #f0f0f0;
}
</style>
