<template>
  <div class="map-view">
    <button class="mobile-sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
      {{ sidebarOpen ? '✕' : '☰' }} {{ t('map.filters') }}
    </button>
    <div class="map-sidebar" :class="{ open: sidebarOpen }">
      <FilterPanel
        v-model:yearMin="yearMin"
        v-model:yearMax="yearMax"
        v-model:viewMode="viewMode"
        v-model:visitedOpacity="visitedOpacity"
        v-model:unvisitedOpacity="unvisitedOpacity"
        v-model:markerSize="markerSize"
        :absoluteMin="absoluteMin"
        :absoluteMax="absoluteMax"
      />
      <!-- Legend (clickable to toggle) -->
      <div class="legend">
        <div
          v-for="lt in sortedTypes"
          :key="lt.id"
          class="legend-item"
          :class="{ disabled: disabledTypes.has(lt.id) }"
          @click="toggleType(lt.id)"
        >
          <span class="legend-dot" :style="{ background: getLegendColor(lt) }"></span>
          <span>{{ lt.name }}</span>
          <span class="legend-count">({{ visibleTypeCounts.get(lt.id) ?? 0 }})</span>
        </div>
      </div>
      <!-- Visible locations list -->
      <div class="visible-list">
        <h4 class="visible-header">{{ t('map.visibleLocations') }} ({{ sortedVisibleLocations.length }})</h4>
        <div v-if="sortedVisibleLocations.length === 0" class="visible-empty">{{ t('map.noVisibleLocations') }}</div>
        <div
          v-for="loc in sortedVisibleLocations"
          :key="loc.id"
          class="visible-item"
        >
          <span class="legend-dot" :class="{ 'legend-square': loc.visitedYears.length > 0 || loc.visitedUnknownYear }" :style="{ background: getTypeColor(loc.type) }"></span>
          <div class="visible-item-info">
            <span class="visible-item-name">{{ loc.name }}</span>
            <span class="visible-item-meta">{{ loc.city }}{{ loc.country ? ', ' + loc.country : '' }}</span>
          </div>
        </div>
      </div>
      <!-- Progress (desktop: bottom of sidebar) -->
      <div v-if="locationsStore.locations.length > 0" class="progress-section">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: visitedPct + '%' }"></div>
        </div>
        <span class="progress-label">{{ t('progress.visited', { pct: visitedPct }) }}</span>
      </div>
    </div>
    <div class="map-main">
      <p v-if="filteredLocations.length === 0 && !locationsStore.loading" class="no-locations">
        {{ t('map.noLocations') }}
      </p>
      <MapContainer
        :locations="filteredLocations"
        :types="typesStore.types"
        :viewMode="viewMode"
        :visitedOpacity="visitedOpacity"
        :unvisitedOpacity="unvisitedOpacity"
        :markerSize="markerSize"
        :darkMode="themeStore.dark"
        @addYear="onAddYear"
        @editLocation="onEditLocation"
        @visibleLocationsChanged="onVisibleLocationsChanged"
      />
      <!-- Progress (mobile: bottom of map) -->
      <div v-if="locationsStore.locations.length > 0" class="progress-section-mobile">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: visitedPct + '%' }"></div>
        </div>
        <span class="progress-label">{{ t('progress.visited', { pct: visitedPct }) }}</span>
      </div>
    </div>

    <!-- Edit location dialog -->
    <div v-if="editing" class="overlay" @click.self="editing = null">
      <div class="edit-dialog">
        <h3>{{ t('manage.editTitle') }}</h3>
        <div class="edit-form">
          <label>{{ t('location.name') }}</label>
          <input v-model="editForm.name" type="text" />

          <label>{{ t('location.type') }}</label>
          <select v-model="editForm.type">
            <option v-for="lt in typesStore.types" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
          </select>

          <label>{{ t('location.city') }}</label>
          <input v-model="editForm.city" type="text" />

          <label>{{ t('location.country') }}</label>
          <input v-model="editForm.country" type="text" />

          <label>{{ t('location.link') }}</label>
          <input v-model="editForm.link" type="url" />

          <label>{{ t('location.latitude') }}</label>
          <input v-model.number="editForm.latitude" type="number" step="any" />

          <label>{{ t('location.longitude') }}</label>
          <input v-model.number="editForm.longitude" type="number" step="any" />

          <label>{{ t('location.visitedYears') }}</label>
          <div class="years-edit">
            <div v-for="(year, i) in editForm.visitedYears" :key="i" class="year-chip">
              <span>{{ year }}</span>
              <button class="chip-remove" @click="editForm.visitedYears.splice(i, 1)">×</button>
            </div>
            <div class="year-add-row">
              <input
                v-model.number="editNewYear"
                type="number"
                min="1900"
                :max="currentYear"
                class="year-input"
              />
              <button class="btn-ghost btn-small" @click="addEditYear">+</button>
            </div>
          </div>

          <label class="checkbox-label">
            <input v-model="editForm.visitedUnknownYear" type="checkbox" />
            {{ t('location.visitedUnknownYear') }}
          </label>

          <label>{{ t('location.rating') }}</label>
          <div class="star-rating">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              class="star-btn"
              :class="{ active: editForm.rating !== null && star <= editForm.rating }"
              @click="editForm.rating = star"
            >★</button>
            <button v-if="editForm.rating !== null" type="button" class="clear-rating" @click="editForm.rating = null">×</button>
          </div>

          <label>{{ t('location.note') }}</label>
          <textarea v-model="editForm.note" rows="3" :placeholder="t('location.notePlaceholder')"></textarea>
        </div>

        <div class="dialog-actions">
          <button class="btn-ghost" @click="editing = null">{{ t('manage.cancel') }}</button>
          <button class="btn-primary" :disabled="saving" @click="saveEdit">
            {{ saving ? '...' : t('location.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocationsStore } from '@/stores/locations';
import { useTypesStore } from '@/stores/types';
import { useThemeStore } from '@/stores/theme';
import MapContainer from '@/components/map/MapContainer.vue';
import FilterPanel from '@/components/map/FilterPanel.vue';
import type { Location } from '@/types';

const { t } = useI18n();
const locationsStore = useLocationsStore();
const typesStore = useTypesStore();
const themeStore = useThemeStore();

const currentYear = new Date().getFullYear();
const absoluteMin = 2000;
const absoluteMax = currentYear;

const yearMin = ref(absoluteMin);
const yearMax = ref(absoluteMax);
const viewMode = ref<'all' | 'visited' | 'unvisited'>('all');
const visitedOpacity = ref(100);
const unvisitedOpacity = ref(100);
const markerSize = ref(10);
const disabledTypes = ref(new Set<string>());
const visibleLocations = ref<Location[]>([]);
const sidebarOpen = ref(false);

const visitedPct = computed(() => {
  const total = locationsStore.locations.length;
  if (total === 0) return 0;
  const visited = locationsStore.locations.filter(
    (l) => l.visitedYears.length > 0 || l.visitedUnknownYear
  ).length;
  return Math.round((visited / total) * 100);
});

function toggleType(typeId: string) {
  const s = new Set(disabledTypes.value);
  if (s.has(typeId)) {
    s.delete(typeId);
  } else {
    s.add(typeId);
  }
  disabledTypes.value = s;
}

onMounted(async () => {
  await Promise.all([locationsStore.fetchLocations(), typesStore.fetchTypes()]);
});

async function onAddYear(locationId: string, year: number) {
  const loc = locationsStore.locations.find((l) => l.id === locationId);
  if (!loc) return;
  const years = loc.visitedYears.includes(year)
    ? loc.visitedYears
    : [...loc.visitedYears, year].sort((a, b) => a - b);
  await locationsStore.updateLocation(locationId, { visitedYears: years });
}

function onVisibleLocationsChanged(locs: Location[]) {
  visibleLocations.value = locs;
}

// --- Edit location ---
const editing = ref<Location | null>(null);
const saving = ref(false);
const editNewYear = ref(currentYear);
const editForm = reactive({
  name: '',
  type: '',
  city: '',
  country: '',
  link: '' as string | null,
  latitude: 0,
  longitude: 0,
  visitedYears: [] as number[],
  visitedUnknownYear: false,
  rating: null as number | null,
  note: '' as string | null,
});

function onEditLocation(loc: Location) {
  editing.value = loc;
  editForm.name = loc.name;
  editForm.type = loc.type;
  editForm.city = loc.city;
  editForm.country = loc.country;
  editForm.link = loc.link || '';
  editForm.latitude = loc.latitude;
  editForm.longitude = loc.longitude;
  editForm.visitedYears = [...loc.visitedYears];
  editForm.visitedUnknownYear = loc.visitedUnknownYear;
  editForm.rating = loc.rating;
  editForm.note = loc.note || '';
  editNewYear.value = currentYear;
}

function addEditYear() {
  if (editNewYear.value && !editForm.visitedYears.includes(editNewYear.value)) {
    editForm.visitedYears.push(editNewYear.value);
    editForm.visitedYears.sort((a, b) => a - b);
  }
}

async function saveEdit() {
  if (!editing.value) return;
  saving.value = true;
  try {
    await locationsStore.updateLocation(editing.value.id, {
      name: editForm.name,
      type: editForm.type,
      city: editForm.city,
      country: editForm.country,
      link: editForm.link || null,
      latitude: editForm.latitude,
      longitude: editForm.longitude,
      visitedYears: editForm.visitedYears,
      visitedUnknownYear: editForm.visitedUnknownYear,
      rating: editForm.rating,
      note: editForm.note || null,
    });
    editing.value = null;
  } finally {
    saving.value = false;
  }
}

function getTypeColor(typeId: string): string {
  const base = typesStore.types.find((t) => t.id === typeId)?.color ?? '#9E9E9E';
  return themeStore.dark ? lightenColor(base, 60) : base;
}

function lightenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getLegendColor(lt: { id: string; color: string }): string {
  if (disabledTypes.value.has(lt.id)) return '#ccc';
  return themeStore.dark ? lightenColor(lt.color, 60) : lt.color;
}

const sortedTypes = computed(() =>
  [...typesStore.types].sort((a, b) => a.name.localeCompare(b.name))
);

const visibleTypeCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const loc of visibleLocations.value) {
    counts.set(loc.type, (counts.get(loc.type) ?? 0) + 1);
  }
  return counts;
});

const sortedVisibleLocations = computed(() =>
  [...visibleLocations.value].sort((a, b) => a.name.localeCompare(b.name))
);

const filteredLocations = computed(() => {
  return locationsStore.locations.filter((loc) => {
    // Type filter
    if (disabledTypes.value.has(loc.type)) return false;

    const isVisited =
      loc.visitedYears.length > 0 || loc.visitedUnknownYear;

    // View mode filter
    if (viewMode.value === 'visited' && !isVisited) return false;
    if (viewMode.value === 'unvisited' && isVisited) return false;

    // Year range filter — show if any visit year is in range, OR if unvisited, OR if visitedUnknownYear
    if (isVisited && !loc.visitedUnknownYear) {
      const hasYearInRange = loc.visitedYears.some(
        (y) => y >= yearMin.value && y <= yearMax.value
      );
      if (!hasYearInRange) return false;
    }

    return true;
  });
});
</script>

<style scoped>
.map-view {
  display: flex;
  height: calc(100vh - 56px);
  overflow: hidden;
}

.map-sidebar {
  width: 280px;
  flex-shrink: 0;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--color-bg);
}

.map-main {
  flex: 1;
  position: relative;
}

.no-locations {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-text-secondary);
  z-index: 500;
  background: var(--color-surface);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.legend {
  background: var(--color-surface);
  border-radius: 10px;
  padding: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0;
  font-size: 0.8rem;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  transition: opacity 0.15s;
}

.legend-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.legend-item.disabled {
  opacity: 0.45;
  text-decoration: line-through;
}

.legend-count {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-square {
  border-radius: 0;
}

/* Visible locations list */
.visible-list {
  background: var(--color-surface);
  border-radius: 10px;
  padding: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 40vh;
  overflow-y: auto;
}

.visible-header {
  margin: 0 0 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
}

.visible-empty {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.visible-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0;
  font-size: 0.78rem;
}

.visible-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.visible-item-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visible-item-meta {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

/* Edit dialog styles */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.edit-dialog {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 500px;
  width: 95%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.edit-dialog h3 {
  margin: 0 0 1rem;
}

.edit-form {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.edit-form label {
  font-size: 0.85rem;
  font-weight: 500;
}

.edit-form input[type="text"],
.edit-form input[type="url"],
.edit-form input[type="number"],
.edit-form select {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
}

.years-edit {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.year-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  background: var(--color-primary-light, #e0e7ff);
  border-radius: 12px;
  padding: 0.15rem 0.5rem;
  font-size: 0.8rem;
}

.chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  color: var(--color-text-secondary);
}

.chip-remove:hover {
  color: var(--color-error);
}

.year-add-row {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.year-input {
  width: 70px;
  padding: 0.2rem 0.35rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8rem;
}

.checkbox-label {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.dialog-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: var(--color-primary, #4f46e5);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.mobile-sidebar-toggle {
  display: none;
}

/* Progress section */
.progress-section {
  margin-top: auto;
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-section-mobile {
  display: none;
}

.progress-bar-track {
  flex: 1;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* === Mobile Responsive === */
@media (max-width: 768px) {
  .map-view {
    flex-direction: column;
    position: relative;
  }

  .mobile-sidebar-toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1100;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .map-sidebar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 60vh;
    z-index: 1050;
    transform: translateY(-100%);
    transition: transform 0.3s ease;
    padding-top: 3.5rem;
    border-radius: 0 0 12px 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .map-sidebar.open {
    transform: translateY(0);
  }

  .map-main {
    height: calc(100vh - 56px);
    flex: none;
  }

  .progress-section {
    display: none;
  }

  .progress-section-mobile {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: absolute;
    bottom: 0.75rem;
    left: 0.75rem;
    right: 0.75rem;
    padding: 0.6rem 0.75rem;
    background: var(--color-surface);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    z-index: 600;
  }

  .edit-dialog {
    max-width: 100%;
    width: 100%;
    max-height: 90vh;
    border-radius: 12px 12px 0 0;
    margin-top: auto;
  }

  .edit-form {
    grid-template-columns: 1fr;
  }

  .overlay {
    align-items: flex-end;
  }
}

.star-rating {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  grid-column: 1 / -1;
}

.star-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  color: #ccc;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.star-btn.active {
  color: #f5a623;
}

.star-btn:hover {
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

.edit-form textarea {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
}
</style>
