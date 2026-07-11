<template>
  <section class="card stack">
    <div class="section-title">
      <div>
        <p class="eyebrow">Settings</p>
        <h2>Offline defaults</h2>
      </div>
      <span class="badge">v{{ app.settings.sync_version }}</span>
    </div>

    <div class="form-grid cols-2">
      <select v-model="form.preferred_language">
        <option value="en">English</option>
        <option value="nl">Nederlands</option>
      </select>
      <select v-model="form.map_tile_set">
        <option value="auto">Auto</option>
        <option value="openstreetmap">OpenStreetMap</option>
        <option value="carto-light">Carto Light</option>
        <option value="carto-dark">Carto Dark</option>
        <option value="esri-world-imagery">Esri World Imagery</option>
        <option value="opentopomap">OpenTopoMap</option>
      </select>
    </div>

    <div class="form-grid cols-2">
      <input v-model.number="form.default_map_lat" type="number" step="0.000001" placeholder="Default latitude" />
      <input v-model.number="form.default_map_lng" type="number" step="0.000001" placeholder="Default longitude" />
    </div>

    <input v-model.number="form.default_map_zoom" type="number" min="1" max="20" placeholder="Default zoom" />

    <div class="form-actions">
      <button type="button" @click="save">Save settings</button>
      <button type="button" class="ghost" @click="syncNow">Sync settings</button>
    </div>
  </section>

  <section class="card stack" style="margin-top: 1rem;">
    <div class="section-title">
      <div>
        <p class="eyebrow">Types</p>
        <h2>Manage local type list</h2>
      </div>
    </div>

    <form class="stack" @submit.prevent="saveType">
      <div class="form-grid cols-2">
        <input v-model="typeForm.name" placeholder="Type name" />
        <input v-model="typeForm.color" placeholder="#38bdf8" />
      </div>
      <input v-model="typeForm.icon" placeholder="Icon name" />
      <div class="form-actions">
        <button type="submit">Add type</button>
      </div>
    </form>

    <div class="stack" style="margin-top: 1rem;">
      <div v-for="type in app.types" :key="type.id" class="panel">
        <div class="section-title">
          <strong>{{ type.name }}</strong>
          <span class="type-chip" :style="{ background: type.color }">{{ type.icon || 'no icon' }}</span>
        </div>
        <button type="button" class="danger" @click="app.deleteType(type.id)">Delete type</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useAppStore } from '@/stores/app';

const app = useAppStore();
const form = reactive({
  preferred_language: app.settings.preferred_language,
  default_map_lat: app.settings.default_map_lat,
  default_map_lng: app.settings.default_map_lng,
  default_map_zoom: app.settings.default_map_zoom,
  map_tile_set: app.settings.map_tile_set,
});

const typeForm = reactive({ name: '', color: '#38bdf8', icon: '' });

const save = () => {
  app.updateSettings(form);
};

const syncNow = async () => {
  await app.syncNow();
};

const saveType = () => {
  app.saveType(typeForm);
  typeForm.name = '';
  typeForm.color = '#38bdf8';
  typeForm.icon = '';
};
</script>
