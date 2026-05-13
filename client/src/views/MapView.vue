<template>
  <div class="map-view">
    <div class="map-sidebar">
      <FilterPanel
        v-model:yearMin="yearMin"
        v-model:yearMax="yearMax"
        v-model:showUnvisitedOnly="showUnvisitedOnly"
        v-model:viewMode="viewMode"
        v-model:visitedOpacity="visitedOpacity"
        :absoluteMin="absoluteMin"
        :absoluteMax="absoluteMax"
      />
      <!-- Legend (clickable to toggle) -->
      <div class="legend">
        <div
          v-for="lt in typesStore.types"
          :key="lt.id"
          class="legend-item"
          :class="{ disabled: disabledTypes.has(lt.id) }"
          @click="toggleType(lt.id)"
        >
          <span class="legend-dot" :style="{ background: disabledTypes.has(lt.id) ? '#ccc' : lt.color }"></span>
          <span>{{ lt.name }}</span>
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
        @addYear="onAddYear"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocationsStore } from '@/stores/locations';
import { useTypesStore } from '@/stores/types';
import MapContainer from '@/components/map/MapContainer.vue';
import FilterPanel from '@/components/map/FilterPanel.vue';

const { t } = useI18n();
const locationsStore = useLocationsStore();
const typesStore = useTypesStore();

const currentYear = new Date().getFullYear();
const absoluteMin = 2000;
const absoluteMax = currentYear;

const yearMin = ref(absoluteMin);
const yearMax = ref(absoluteMax);
const showUnvisitedOnly = ref(false);
const viewMode = ref<'all' | 'transparency'>('all');
const visitedOpacity = ref(30);
const disabledTypes = ref(new Set<string>());

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

const filteredLocations = computed(() => {
  return locationsStore.locations.filter((loc) => {
    // Type filter
    if (disabledTypes.value.has(loc.type)) return false;

    const isVisited =
      loc.visitedYears.length > 0 || loc.visitedUnknownYear;

    // Unvisited filter
    if (showUnvisitedOnly.value && isVisited) return false;

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

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
