<template>
  <form class="location-form" @submit.prevent="onSubmit">
    <h2>{{ t('location.add') }}</h2>

    <!-- Geocoding search -->
    <div class="field">
      <label>{{ t('location.search') }}</label>
      <input v-model="searchQuery" type="text" :placeholder="t('location.searchPlaceholder')" @input="geocoding.search(searchQuery)" />
      <ul v-if="geocoding.results.value.length" class="search-results">
        <li v-for="result in geocoding.results.value" :key="result.display_name" @click="selectResult(result)">
          {{ result.display_name }}
        </li>
      </ul>
      <p class="hint">{{ t('location.clickMapHint') }}</p>
    </div>

    <div class="form-grid">
      <div class="field">
        <label>{{ t('location.name') }} *</label>
        <input v-model="form.name" type="text" required />
      </div>
      <div class="field">
        <label>{{ t('location.type') }} *</label>
        <select v-model="form.type_id" required>
          <option value="" disabled>—</option>
          <option v-for="lt in typesStore.types" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>{{ t('location.city') }}</label>
        <input v-model="form.city" type="text" />
      </div>
      <div class="field">
        <label>{{ t('location.country') }}</label>
        <input v-model="form.country" type="text" />
      </div>
      <div class="field">
        <label>{{ t('location.latitude') }}</label>
        <input v-model.number="form.latitude" type="number" step="any" required />
      </div>
      <div class="field">
        <label>{{ t('location.longitude') }}</label>
        <input v-model.number="form.longitude" type="number" step="any" required />
      </div>
    </div>

    <!-- Pin map -->
    <div class="field">
      <div class="pin-map-container">
        <div ref="pinMapEl" class="pin-map"></div>
        <p class="hint">{{ t('location.pinOnMap') }}</p>
        <button type="button" class="btn" @click="useDeviceLocation" :disabled="locating">
          📍 {{ locating ? t('location.locating') : t('location.useDeviceLocation') }}
        </button>
        <p v-if="locationError" class="text-error">{{ locationError }}</p>
      </div>
    </div>

    <div class="field">
      <label>{{ t('location.link') }}</label>
      <input v-model="form.link" type="url" placeholder="https://..." />
    </div>

    <!-- Rating -->
    <div class="field">
      <label>{{ t('location.rating') }}</label>
      <div class="star-rating">
        <button v-for="star in 5" :key="star" type="button" class="star-btn" :class="{ active: form.rating !== null && star <= form.rating }" @click="form.rating = star">★</button>
        <button v-if="form.rating !== null" type="button" class="clear-rating" @click="form.rating = null">×</button>
      </div>
      <p class="hint">{{ t('location.ratingHint') }}</p>
    </div>

    <!-- Note -->
    <div class="field">
      <label>{{ t('location.note') }}</label>
      <textarea v-model="form.note" rows="3" :placeholder="t('location.notePlaceholder')"></textarea>
    </div>

    <!-- Visited years -->
    <div class="field">
      <label>{{ t('location.visitedYears') }}</label>
      <div class="year-chips">
        <span v-for="(year, i) in form.visitedYears" :key="i" class="year-chip">
          {{ year }} <button type="button" @click="form.visitedYears.splice(i, 1)">×</button>
        </span>
        <div class="add-year">
          <input v-model.number="newYear" type="number" min="1900" :max="currentYear" class="year-input" />
          <button type="button" class="btn btn-small" @click="addYear">{{ t('location.addYear') }}</button>
        </div>
      </div>
      <label class="checkbox-label">
        <input type="checkbox" v-model="form.visitedUnknownYear" />
        {{ t('location.visitedUnknownYear') }}
      </label>
    </div>

    <div v-if="nearbyDuplicates.length" class="duplicate-warning">
      <strong>{{ t('location.duplicateWarningTitle') }}</strong>
      <p>
        {{ t('location.duplicateWarningBody', { count: nearbyDuplicates.length, distance: DUPLICATE_THRESHOLD_METERS }) }}
      </p>
      <ul>
        <li v-for="match in nearbyDuplicates" :key="match.feature.id ?? match.feature.properties.name">
          {{ match.feature.properties.name }}
          <span class="duplicate-distance">({{ Math.round(match.distanceMeters) }}m)</span>
        </li>
      </ul>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary" :disabled="saving">{{ t('location.save') }}</button>
    </div>

    <p v-if="successMsg" class="text-success" style="margin-top: 0.75rem; font-weight: 500">{{ successMsg }}</p>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTypesStore } from '@/stores/types';
import { useLocationsStore } from '@/stores/locations';
import { useGeocoding } from '@/composables/useGeocoding';
import { findNearbyLocations } from '@/utils/locationProximity';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const { t } = useI18n();
const typesStore = useTypesStore();
const locationsStore = useLocationsStore();
const geocoding = useGeocoding();

const searchQuery = ref('');
const currentYear = new Date().getFullYear();
const newYear = ref<number | undefined>(undefined);
const saving = ref(false);
const successMsg = ref('');
const locating = ref(false);
const locationError = ref('');
const pinMapEl = ref<HTMLDivElement>();
let pinMap: L.Map | null = null;
let pinMarker: L.Marker | null = null;
const DUPLICATE_THRESHOLD_METERS = 200;

const form = reactive({
  name: '',
  type_id: '',
  city: '',
  country: '',
  link: '',
  latitude: 0,
  longitude: 0,
  visitedYears: [] as number[],
  visitedUnknownYear: false,
  rating: null as number | null,
  note: '',
});

const nearbyDuplicates = computed(() => {
  if (!form.latitude || !form.longitude) return [];
  return findNearbyLocations({
    latitude: form.latitude,
    longitude: form.longitude,
    features: locationsStore.collection.features,
    thresholdMeters: DUPLICATE_THRESHOLD_METERS,
  });
});

onMounted(() => {
  if (!locationsStore.collection.features.length) {
    void locationsStore.fetchLocations();
  }
  if (!pinMapEl.value) return;
  pinMap = L.map(pinMapEl.value).setView([52.1, 5.3], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(pinMap);
  pinMap.on('click', async (e: L.LeafletMouseEvent) => {
    form.latitude = e.latlng.lat;
    form.longitude = e.latlng.lng;
    updatePinMarker(e.latlng.lat, e.latlng.lng);
    const result = await geocoding.reverseGeocode(e.latlng.lat, e.latlng.lng);
    if (result) {
      if (result.country_code) form.country = result.country_code;
      if (result.city && !form.city) form.city = result.city;
    }
  });
});

onUnmounted(() => { pinMap?.remove(); pinMap = null; });

function updatePinMarker(lat: number, lng: number) {
  if (!pinMap) return;
  if (pinMarker) { pinMarker.setLatLng([lat, lng]); }
  else {
    pinMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div class="pin-icon"></div>', iconSize: [24, 36], iconAnchor: [12, 36] }),
    }).addTo(pinMap);
  }
  pinMap.setView([lat, lng], Math.max(pinMap.getZoom(), 13));
}

watch(() => [form.latitude, form.longitude], ([lat, lng]) => {
  if (lat && lng && pinMap) updatePinMarker(lat as number, lng as number);
});

function useDeviceLocation() {
  if (!navigator.geolocation) { locationError.value = t('location.locationError'); return; }
  locating.value = true; locationError.value = '';
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      form.latitude = pos.coords.latitude;
      form.longitude = pos.coords.longitude;
      updatePinMarker(pos.coords.latitude, pos.coords.longitude);
      locating.value = false;
      const result = await geocoding.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (result) {
        if (result.country_code) form.country = result.country_code;
        if (result.city && !form.city) form.city = result.city;
      }
    },
    () => { locationError.value = t('location.locationError'); locating.value = false; },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function selectResult(result: any) {
  form.latitude = result.lat;
  form.longitude = result.lon;
  if (result.city) form.city = result.city;
  if (result.country_code) form.country = result.country_code;
  if (!form.name) form.name = result.display_name.split(',')[0]?.trim() || '';
  geocoding.clear();
  searchQuery.value = result.display_name;
  updatePinMarker(result.lat, result.lon);
}

function addYear() {
  if (newYear.value && !form.visitedYears.includes(newYear.value)) {
    form.visitedYears.push(newYear.value);
    form.visitedYears.sort((a, b) => a - b);
    newYear.value = undefined;
  }
}

async function onSubmit() {
  saving.value = true; successMsg.value = '';
  try {
    await locationsStore.createLocation({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [form.longitude, form.latitude] },
      properties: {
        name: form.name,
        type_id: form.type_id || null,
        city: form.city,
        country: form.country,
        link: form.link || null,
        years_visited: form.visitedYears,
        visited_unknown_year: form.visitedUnknownYear,
        rating: form.rating,
        comments: form.note || null,
      },
    });
    successMsg.value = t('location.saved');
    Object.assign(form, { name: '', type_id: '', city: '', country: '', link: '', latitude: 0, longitude: 0, visitedYears: [], visitedUnknownYear: false, rating: null, note: '' });
    searchQuery.value = '';
    if (pinMarker && pinMap) { pinMap.removeLayer(pinMarker); pinMarker = null; }
  } finally { saving.value = false; }
}
</script>

<style scoped>
.location-form { max-width: 640px; }
.location-form h2 { margin: 0 0 1.25rem; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.search-results {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  background: var(--color-surface);
}

.search-results li {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
}

.search-results li:hover { background: var(--color-bg); }
.search-results li:last-child { border-bottom: none; }

.hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin: 0.25rem 0 0;
}

.year-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-bottom: 0.5rem; }
.year-chip { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; background: var(--color-primary-light); color: var(--color-primary); border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
.year-chip button { background: none; border: none; cursor: pointer; color: var(--color-primary); font-size: 1rem; padding: 0; }
.add-year { display: flex; gap: 0.35rem; align-items: center; }
.year-input { width: 80px; padding: 0.25rem 0.4rem; font-size: 0.8rem; }
.checkbox-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: pointer; }
.checkbox-label input { width: auto; }
.form-actions { margin-top: 1.25rem; }

.star-rating { display: flex; align-items: center; gap: 0.25rem; }
.star-btn { background: none; border: none; font-size: 1.5rem; color: #ccc; cursor: pointer; padding: 0; }
.star-btn.active { color: #f5a623; }
.star-btn:hover { color: #f5a623; }
.clear-rating { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--color-text-secondary); margin-left: 0.5rem; }

.pin-map-container { display: flex; flex-direction: column; gap: 0.5rem; }
.pin-map { height: 250px; border-radius: 8px; border: 1px solid var(--color-border); z-index: 0; }
.pin-map :deep(.pin-icon) { width: 24px; height: 36px; background: var(--color-primary); border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }

.duplicate-warning {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
}

.duplicate-warning p {
  margin: 0.25rem 0 0.5rem;
}

.duplicate-warning ul {
  margin: 0;
  padding-left: 1rem;
}

.duplicate-distance {
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .location-form { max-width: 100%; }
}
</style>
