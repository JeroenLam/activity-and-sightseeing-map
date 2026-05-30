<template>
  <div class="filter-panel">
    <h4>{{ t('map.filters') }}</h4>

    <!-- View mode toggle (all / visited / unvisited) -->
    <div class="filter-row">
      <label>{{ t('map.viewMode') }}</label>
      <div class="view-mode-toggle">
        <button :class="{ active: viewMode === 'all' }" @click="$emit('update:viewMode', 'all')">{{ t('map.allLocations') }}</button>
        <button :class="{ active: viewMode === 'visited' }" @click="$emit('update:viewMode', 'visited')">{{ t('map.visited') }}</button>
        <button :class="{ active: viewMode === 'unvisited' }" @click="$emit('update:viewMode', 'unvisited')">{{ t('map.notVisited') }}</button>
      </div>
    </div>

    <!-- Year range -->
    <div class="filter-row">
      <label>{{ t('map.yearRange') }}</label>
      <div class="year-range">
        <input type="number" :value="yearFrom" @input="$emit('update:yearFrom', ($event.target as HTMLInputElement).valueAsNumber || undefined)" placeholder="From" min="1900" :max="currentYear" />
        <span>–</span>
        <input type="number" :value="yearTo" @input="$emit('update:yearTo', ($event.target as HTMLInputElement).valueAsNumber || undefined)" placeholder="To" min="1900" :max="currentYear" />
      </div>
    </div>

    <!-- Advanced toggle -->
    <button class="toggle-advanced" @click="showAdvanced = !showAdvanced">
      {{ showAdvanced ? t('map.hideAdvanced') : t('map.showAdvanced') }}
    </button>

    <div v-if="showAdvanced" class="advanced-section">
      <!-- Marker size -->
      <div class="filter-row">
        <label>{{ t('map.markerSize') }}: {{ markerSize }}px</label>
        <input type="range" :value="markerSize" @input="$emit('update:markerSize', Number(($event.target as HTMLInputElement).value))" min="8" max="40" />
      </div>

      <!-- Opacity -->
      <div class="filter-row">
        <label>{{ t('map.visitedOpacity') }}: {{ Math.round(visitedOpacity * 100) }}%</label>
        <input type="range" :value="visitedOpacity * 100" @input="$emit('update:visitedOpacity', Number(($event.target as HTMLInputElement).value) / 100)" min="10" max="100" />
      </div>
      <div class="filter-row">
        <label>{{ t('map.unvisitedOpacity') }}: {{ Math.round(unvisitedOpacity * 100) }}%</label>
        <input type="range" :value="unvisitedOpacity * 100" @input="$emit('update:unvisitedOpacity', Number(($event.target as HTMLInputElement).value) / 100)" min="10" max="100" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const currentYear = new Date().getFullYear();
const showAdvanced = ref(false);

defineProps<{
  yearFrom?: number;
  yearTo?: number;
  viewMode: 'all' | 'visited' | 'unvisited';
  markerSize: number;
  visitedOpacity: number;
  unvisitedOpacity: number;
}>();

defineEmits<{
  'update:yearFrom': [value: number | undefined];
  'update:yearTo': [value: number | undefined];
  'update:viewMode': [value: 'all' | 'visited' | 'unvisited'];
  'update:markerSize': [value: number];
  'update:visitedOpacity': [value: number];
  'update:unvisitedOpacity': [value: number];
}>();
</script>

<style scoped>
.filter-panel h4 {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.filter-row {
  margin-bottom: 0.6rem;
}

.filter-row > label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: 0.2rem;
}

.view-mode-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.view-mode-toggle button {
  flex: 1;
  padding: 0.3rem 0.4rem;
  font-size: 0.75rem;
  border: none;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.view-mode-toggle button + button {
  border-left: 1px solid var(--color-border);
}

.view-mode-toggle button.active {
  background: var(--color-primary);
  color: #fff;
}

.type-filter-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  max-height: 150px;
  overflow-y: auto;
}

.type-filter-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.type-filter-item input {
  width: auto;
}

.type-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.year-range {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.year-range input {
  width: 70px;
  padding: 0.25rem 0.4rem;
  font-size: 0.8rem;
}

.year-range span {
  color: var(--color-text-secondary);
}

.toggle-advanced {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 0.5rem;
}

.toggle-advanced:hover {
  text-decoration: underline;
}

.advanced-section {
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
}

input[type="range"] {
  width: 100%;
  cursor: pointer;
}
</style>
