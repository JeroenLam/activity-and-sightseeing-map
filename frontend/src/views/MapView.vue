<template>
  <div class="map-page">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: !sidebarOpen }">
      <div class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
        {{ sidebarOpen ? '◀' : '▶' }}
      </div>

      <div v-if="sidebarOpen" class="sidebar-content">
        <!-- Progress -->
        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: visitedPct + '%' }"></div>
          </div>
          <span class="progress-text">{{ t('progress.visited', { pct: visitedPct }) }}</span>
        </div>

        <!-- Filter panel -->
        <FilterPanel
          v-model:yearFrom="yearFrom"
          v-model:yearTo="yearTo"
          v-model:viewMode="viewMode"
          v-model:markerSize="markerSize"
          v-model:visitedOpacity="visitedOpacity"
          v-model:unvisitedOpacity="unvisitedOpacity"
        />

        <!-- Legend (type filter integrated) -->
        <div class="legend">
          <div
            v-for="lt in sortedTypes"
            :key="lt.id"
            class="legend-item"
            :class="{ disabled: disabledTypes.has(lt.id) }"
            @click="toggleType(lt.id)"
          >
            <span class="legend-dot" :style="{ background: lt.color, opacity: disabledTypes.has(lt.id) ? 0.3 : 1 }"></span>
            <span class="legend-label">{{ lt.name }}</span>
            <span class="legend-count">{{ typeCount(lt.id) }}</span>
          </div>
        </div>

        <!-- Visible locations -->
        <div class="visible-section">
          <h4>{{ t('map.visibleLocations') }} ({{ visibleLocations.length }})</h4>
          <ul class="visible-list" v-if="visibleLocations.length">
            <li v-for="(f, idx) in sortedVisibleLocations" :key="f.id ?? idx" @click="panTo(f)">
              <span class="vis-dot" :style="{ background: f.properties.type?.color || '#9E9E9E' }"></span>
              {{ f.properties.name }}
            </li>
          </ul>
          <p v-else class="text-secondary">{{ t('map.noVisibleLocations') }}</p>
        </div>
      </div>
    </aside>

    <!-- Map -->
    <div class="map-area">
      <MapContainer
        ref="mapRef"
        :features="filteredFeatures"
        :marker-size="markerSize"
        :visited-opacity="visitedOpacity"
        :unvisited-opacity="unvisitedOpacity"
        @bounds-change="onBoundsChange"
        @edit="openEdit"
        @add-year="onAddYear"
      />
    </div>

    <!-- Edit dialog -->
    <div v-if="editing" class="overlay" @click.self="editing = null">
      <div class="dialog" style="max-width: 600px">
        <h3>{{ t('manage.editTitle') }}</h3>
        <div class="form-grid">
          <div class="field">
            <label>{{ t('location.name') }}</label>
            <input v-model="editForm.name" />
          </div>
          <div class="field">
            <label>{{ t('location.type') }}</label>
            <select v-model="editForm.type_id">
              <option value="">—</option>
              <option v-for="lt in typesStore.types" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>{{ t('location.city') }}</label>
            <input v-model="editForm.city" />
          </div>
          <div class="field">
            <label>{{ t('location.country') }}</label>
            <input v-model="editForm.country" />
          </div>
        </div>
        <div class="field">
          <label>{{ t('location.link') }}</label>
          <input v-model="editForm.link" type="url" />
        </div>
        <div class="field">
          <label>{{ t('location.rating') }}</label>
          <div class="star-rating">
            <button v-for="star in 5" :key="star" type="button" class="star-btn" :class="{ active: editForm.rating !== null && star <= editForm.rating }" @click="editForm.rating = star">★</button>
            <button v-if="editForm.rating !== null" type="button" class="clear-rating" @click="editForm.rating = null">×</button>
          </div>
        </div>
        <div class="field">
          <label>{{ t('location.note') }}</label>
          <textarea v-model="editForm.comments" rows="2"></textarea>
        </div>
        <div class="field">
          <label>{{ t('location.visitedYears') }}</label>
          <div class="year-chips">
            <span v-for="(year, i) in editForm.years_visited" :key="i" class="year-chip">
              {{ year }} <button type="button" @click="editForm.years_visited.splice(i, 1)">×</button>
            </span>
            <div class="add-year-inline">
              <input v-model.number="newYear" type="number" min="1900" :max="currentYear" class="year-input" />
              <button type="button" class="btn btn-small" @click="addEditYear">+</button>
            </div>
          </div>
          <label class="checkbox-label">
            <input type="checkbox" v-model="editForm.visited_unknown_year" />
            {{ t('location.visitedUnknownYear') }}
          </label>
        </div>
        <div class="dialog-actions">
          <button class="btn" @click="editing = null">{{ t('location.cancel') }}</button>
          <button class="btn btn-primary" @click="saveEdit" :disabled="saving">{{ t('location.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocationsStore } from '@/stores/locations';
import { useTypesStore } from '@/stores/types';
import FilterPanel from '@/components/map/FilterPanel.vue';
import MapContainer from '@/components/map/MapContainer.vue';
import type { LocationFeature } from '@/types';

const { t } = useI18n();
const locationsStore = useLocationsStore();
const typesStore = useTypesStore();

const sidebarOpen = ref(true);
const yearFrom = ref<number | undefined>(undefined);
const yearTo = ref<number | undefined>(undefined);
const viewMode = ref<'all' | 'visited' | 'unvisited'>('all');
const disabledTypes = ref<Set<string>>(new Set());
const markerSize = ref(20);
const visitedOpacity = ref(1);
const unvisitedOpacity = ref(1);
const mapRef = ref<InstanceType<typeof MapContainer>>();
const visibleLocations = ref<LocationFeature[]>([]);
const currentYear = new Date().getFullYear();
const newYear = ref(currentYear);

const sortedTypes = computed(() =>
  [...typesStore.types].sort((a, b) => a.name.localeCompare(b.name))
);

const sortedVisibleLocations = computed(() =>
  [...visibleLocations.value].sort((a, b) => a.properties.name.localeCompare(b.properties.name))
);

// Edit state
const editing = ref<LocationFeature | null>(null);
const saving = ref(false);
const editForm = reactive({
  name: '',
  type_id: '',
  city: '',
  country: '',
  link: '',
  rating: null as number | null,
  comments: '',
  years_visited: [] as number[],
  visited_unknown_year: false,
});

const features = computed(() => locationsStore.collection.features);

const filteredFeatures = computed(() => {
  return features.value.filter((f) => {
    const props = f.properties;
    const visited = props.years_visited.length > 0 || props.visited_unknown_year;
    if (viewMode.value === 'visited' && !visited) return false;
    if (viewMode.value === 'unvisited' && visited) return false;
    if (props.type && disabledTypes.value.has(props.type.id)) return false;
    if (yearFrom.value && props.years_visited.length) {
      if (Math.max(...props.years_visited) < yearFrom.value) return false;
    }
    if (yearTo.value && props.years_visited.length) {
      if (Math.min(...props.years_visited) > yearTo.value) return false;
    }
    return true;
  });
});

const visitedPct = computed(() => {
  const total = features.value.length;
  if (!total) return 0;
  const visited = features.value.filter(
    (f) => f.properties.years_visited.length > 0 || f.properties.visited_unknown_year
  ).length;
  return Math.round((visited / total) * 100);
});

function typeCount(typeId: string): number {
  return features.value.filter((f) => f.properties.type?.id === typeId).length;
}

function toggleType(typeId: string) {
  const s = new Set(disabledTypes.value);
  if (s.has(typeId)) s.delete(typeId);
  else s.add(typeId);
  disabledTypes.value = s;
}

function onBoundsChange(visible: LocationFeature[]) {
  visibleLocations.value = visible;
}

function panTo(f: LocationFeature) {
  mapRef.value?.panTo(f);
}

function openEdit(f: LocationFeature) {
  editing.value = f;
  editForm.name = f.properties.name;
  editForm.type_id = f.properties.type?.id || '';
  editForm.city = f.properties.city;
  editForm.country = f.properties.country;
  editForm.link = f.properties.link || '';
  editForm.rating = f.properties.rating;
  editForm.comments = f.properties.comments || '';
  editForm.years_visited = [...f.properties.years_visited];
  editForm.visited_unknown_year = f.properties.visited_unknown_year;
  newYear.value = currentYear;
}

function addEditYear() {
  if (newYear.value && !editForm.years_visited.includes(newYear.value)) {
    editForm.years_visited.push(newYear.value);
    editForm.years_visited.sort((a, b) => a - b);
  }
}

async function saveEdit() {
  if (!editing.value?.id) return;
  saving.value = true;
  try {
    await locationsStore.updateLocation(editing.value.id, {
      type: 'Feature',
      geometry: editing.value.geometry,
      properties: {
        name: editForm.name,
        type_id: editForm.type_id || null,
        city: editForm.city,
        country: editForm.country,
        link: editForm.link || null,
        rating: editForm.rating,
        comments: editForm.comments || null,
        years_visited: editForm.years_visited,
        visited_unknown_year: editForm.visited_unknown_year,
      },
    });
    editing.value = null;
  } finally {
    saving.value = false;
  }
}

async function onAddYear(f: LocationFeature) {
  if (!f.id) return;
  const years = [...f.properties.years_visited];
  if (!years.includes(currentYear)) {
    years.push(currentYear);
    years.sort((a, b) => a - b);
  }
  await locationsStore.updateLocation(f.id, {
    type: 'Feature',
    properties: { years_visited: years },
  });
}

onMounted(async () => {
  await Promise.all([locationsStore.fetchLocations(), typesStore.fetchTypes()]);
});
</script>

<style scoped>
.map-page {
  display: flex;
  height: calc(100vh - var(--header-height));
  overflow: hidden;
}

.sidebar {
  position: relative;
  width: 300px;
  min-width: 300px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.2s, min-width 0.2s;
}

.sidebar.collapsed {
  width: 0;
  min-width: 0;
  overflow: hidden;
}

.sidebar-toggle {
  position: absolute;
  top: 50%;
  right: -20px;
  transform: translateY(-50%);
  z-index: 10;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0 4px 4px 0;
  padding: 0.5rem 4px;
  cursor: pointer;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.sidebar-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  overflow: hidden;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.progress-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  user-select: none;
  transition: opacity 0.15s;
}

.legend-item:hover {
  background: var(--color-bg);
}

.legend-item.disabled {
  opacity: 0.45;
  text-decoration: line-through;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
}

.legend-count {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.visible-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.visible-section h4 {
  font-size: 0.8rem;
  margin-bottom: 0.4rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.visible-list {
  list-style: none;
  padding: 0;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.visible-list li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.4rem;
  font-size: 0.8rem;
  cursor: pointer;
  border-radius: 4px;
}

.visible-list li:hover {
  background: var(--color-bg);
}

.vis-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.map-area {
  flex: 1;
  position: relative;
}

/* Edit dialog extras */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.star-rating {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.star-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  color: #ccc;
  cursor: pointer;
  padding: 0;
}

.star-btn.active {
  color: #f5a623;
}

.clear-rating {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  margin-left: 0.4rem;
}

.year-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}

.year-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.4rem;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 10px;
  font-size: 0.75rem;
}

.year-chip button {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
}

.add-year-inline {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.year-input {
  width: 70px;
  padding: 0.2rem 0.4rem;
  font-size: 0.8rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.checkbox-label input {
  width: auto;
}

@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    z-index: 50;
    height: 100%;
    width: 260px;
    min-width: 260px;
  }
  .sidebar.collapsed {
    width: 0;
    min-width: 0;
  }
}
</style>
