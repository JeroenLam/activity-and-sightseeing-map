<template>
  <div class="filter-panel">
    <h3>{{ t('map.filters') }}</h3>

    <!-- View mode -->
    <div class="filter-group">
      <label>{{ t('map.viewMode') }}</label>
      <div class="toggle-group">
        <button
          :class="['toggle-btn', { active: viewMode === 'all' }]"
          @click="viewMode = 'all'"
        >
          {{ t('map.allLocations') }}
        </button>
        <button
          :class="['toggle-btn', { active: viewMode === 'visited' }]"
          @click="viewMode = 'visited'"
        >
          {{ t('map.visited') }}
        </button>
        <button
          :class="['toggle-btn', { active: viewMode === 'unvisited' }]"
          @click="viewMode = 'unvisited'"
        >
          {{ t('map.notVisited') }}
        </button>
      </div>
    </div>

    <!-- Marker size -->
    <div class="filter-group">
      <label>{{ t('map.markerSize') }}: {{ markerSize }}</label>
      <input
        type="range"
        min="3"
        max="20"
        v-model.number="markerSize"
      />
    </div>

    <!-- Expand / collapse advanced settings -->
    <button class="expand-btn" @click="expanded = !expanded">
      {{ expanded ? t('map.hideAdvanced') : t('map.showAdvanced') }}
      <span class="expand-icon">{{ expanded ? '▲' : '▼' }}</span>
    </button>

    <div v-if="expanded" class="advanced-section">
      <!-- Year range -->
      <div class="filter-group">
        <label>{{ t('map.yearRange') }}: {{ yearMin }} – {{ yearMax }}</label>
        <div class="range-inputs">
          <input
            type="range"
            :min="absoluteMin"
            :max="absoluteMax"
            :value="yearMin"
            @input="yearMin = Number(($event.target as HTMLInputElement).value)"
          />
          <input
            type="range"
            :min="absoluteMin"
            :max="absoluteMax"
            :value="yearMax"
            @input="yearMax = Number(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- Visited opacity slider -->
      <div v-if="viewMode === 'all'" class="filter-group">
        <label>{{ t('map.visitedOpacity') }}: {{ visitedOpacity }}%</label>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="visitedOpacity"
        />
      </div>

      <!-- Unvisited opacity slider -->
      <div v-if="viewMode === 'all'" class="filter-group">
        <label>{{ t('map.unvisitedOpacity') }}: {{ unvisitedOpacity }}%</label>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="unvisitedOpacity"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const expanded = ref(false);

const yearMin = defineModel<number>('yearMin', { required: true });
const yearMax = defineModel<number>('yearMax', { required: true });
const viewMode = defineModel<'all' | 'visited' | 'unvisited'>('viewMode', { required: true });
const visitedOpacity = defineModel<number>('visitedOpacity', { required: true });
const unvisitedOpacity = defineModel<number>('unvisitedOpacity', { required: true });
const markerSize = defineModel<number>('markerSize', { required: true });

defineProps<{
  absoluteMin: number;
  absoluteMax: number;
}>();
</script>

<style scoped>
.filter-panel {
  background: var(--color-surface);
  border-radius: 10px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-panel h3 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.filter-group {
  margin-bottom: 0.75rem;
}

.filter-group > label {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.35rem;
}

.range-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.range-inputs input[type='range'] {
  width: 100%;
}

.toggle-group {
  display: flex;
  gap: 0;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.toggle-btn {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: none;
  background: var(--color-surface);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn:not(:last-child) {
  border-right: 1px solid var(--color-border);
}

.toggle-btn.active {
  background: var(--color-primary);
  color: white;
}

input[type='range'] {
  accent-color: var(--color-primary);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.4rem 0;
  border: none;
  background: none;
  font-size: 0.8rem;
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 500;
}

.expand-btn:hover {
  text-decoration: underline;
}

.expand-icon {
  font-size: 0.65rem;
}

.advanced-section {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}
</style>
