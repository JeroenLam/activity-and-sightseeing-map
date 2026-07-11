<template>
  <section class="card stack">
    <div class="section-title">
      <div>
        <p class="eyebrow">Locations</p>
        <h2>{{ editingId ? 'Edit location' : 'Add location' }}</h2>
      </div>
      <button type="button" class="ghost" @click="resetForm">Clear</button>
    </div>

    <form class="stack" @submit.prevent="submit">
      <div class="form-grid">
        <input v-model="form.name" placeholder="Name" />
        <select v-model="form.type_id">
          <option value="">No type</option>
          <option v-for="type in app.types" :key="type.id" :value="type.id">{{ type.name }}</option>
        </select>
      </div>
      <div class="form-grid cols-2">
        <input v-model="form.city" placeholder="City" />
        <input v-model="form.country" placeholder="Country" />
      </div>
      <div class="form-grid cols-2">
        <input v-model.number="form.latitude" type="number" step="0.000001" placeholder="Latitude" />
        <input v-model.number="form.longitude" type="number" step="0.000001" placeholder="Longitude" />
      </div>
      <div class="form-grid cols-2">
        <input v-model="form.rating" type="number" min="1" max="5" placeholder="Rating" />
        <input v-model="form.years_visited" placeholder="Years visited (comma separated)" />
      </div>
      <input v-model="form.address" placeholder="Address" />
      <input v-model="form.link" placeholder="Link" />
      <textarea v-model="form.comments" placeholder="Comments" />
      <label class="badge" style="justify-content: flex-start; gap: 0.5rem;">
        <input v-model="form.visited_unknown_year" type="checkbox" style="width: auto;" />
        Visited, year unknown
      </label>
      <div class="form-actions">
        <button type="submit">{{ editingId ? 'Update' : 'Save' }}</button>
        <button type="button" class="ghost" @click="seedGeography">Use default map area</button>
      </div>
    </form>
  </section>

  <section class="stack" style="margin-top: 1rem;">
    <LocationCard
      v-for="location in app.activeLocations"
      :key="location.id ?? location.properties.name"
      :location="location"
      @edit="startEdit"
      @delete="app.deleteLocation"
    />
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import LocationCard from '@/components/LocationCard.vue';
import { useAppStore } from '@/stores/app';
import type { LocationDraft } from '@/types';

const app = useAppStore();
const editingId = ref<string | undefined>();

const form = reactive<LocationDraft>({
  name: '',
  type_id: null,
  city: '',
  country: '',
  address: '',
  link: '',
  latitude: app.settings.default_map_lat ?? 52.1,
  longitude: app.settings.default_map_lng ?? 5.3,
  years_visited: '',
  visited_unknown_year: false,
  rating: '',
  comments: '',
  tags: '',
});

function resetForm() {
  editingId.value = undefined;
  Object.assign(form, {
    name: '',
    type_id: null,
    city: '',
    country: '',
    address: '',
    link: '',
    latitude: app.settings.default_map_lat ?? 52.1,
    longitude: app.settings.default_map_lng ?? 5.3,
    years_visited: '',
    visited_unknown_year: false,
    rating: '',
    comments: '',
    tags: '',
  });
}

function startEdit(id: string | null) {
  if (!id) return;
  const location = app.locations.find((item) => item.id === id);
  if (!location) return;
  editingId.value = id;
  Object.assign(form, {
    name: location.properties.name,
    type_id: location.properties.type?.id ?? null,
    city: location.properties.city,
    country: location.properties.country,
    address: location.properties.address ?? '',
    link: location.properties.link ?? '',
    latitude: location.geometry.coordinates[1],
    longitude: location.geometry.coordinates[0],
    years_visited: location.properties.years_visited.join(','),
    visited_unknown_year: location.properties.visited_unknown_year,
    rating: location.properties.rating?.toString() ?? '',
    comments: location.properties.comments ?? '',
    tags: location.properties.tags.join(','),
  });
}

function submit() {
  app.saveLocation(form, editingId.value);
  resetForm();
}

function seedGeography() {
  form.latitude = app.settings.default_map_lat ?? 52.1;
  form.longitude = app.settings.default_map_lng ?? 5.3;
}

watch(
  () => app.settings,
  (settings) => {
    if (!editingId.value) {
      form.latitude = settings.default_map_lat ?? 52.1;
      form.longitude = settings.default_map_lng ?? 5.3;
    }
  },
  { deep: true },
);
</script>
