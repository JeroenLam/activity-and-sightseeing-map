<template>
  <div class="map-view">
    <div class="map-sidebar">
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
        @visibleLocationsChanged="onVisibleLocationsChanged"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
const markerSize = ref(8);
const disabledTypes = ref(new Set<string>());
const visibleLocations = ref<Location[]>([]);

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
</style>
