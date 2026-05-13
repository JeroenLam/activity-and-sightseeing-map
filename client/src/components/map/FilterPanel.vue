<template>
  <div class="filter-panel">
    <h3>{{ t('map.filters') }}</h3>

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

    <!-- Unvisited only -->
    <div class="filter-group">
      <label class="checkbox-label">
        <input type="checkbox" v-model="showUnvisitedOnly" />
        {{ t('map.showUnvisitedOnly') }}
      </label>
    </div>

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
          :class="['toggle-btn', { active: viewMode === 'transparency' }]"
          @click="viewMode = 'transparency'"
        >
          {{ t('map.transparencyMode') }}
        </button>
      </div>
    </div>

    <!-- Opacity slider -->
    <div v-if="viewMode === 'transparency'" class="filter-group">
      <label>{{ t('map.visitedOpacity') }}: {{ visitedOpacity }}%</label>
      <input
        type="range"
        min="0"
        max="100"
        v-model.number="visitedOpacity"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const yearMin = defineModel<number>('yearMin', { required: true });
const yearMax = defineModel<number>('yearMax', { required: true });
const showUnvisitedOnly = defineModel<boolean>('showUnvisitedOnly', { required: true });
const viewMode = defineModel<'all' | 'transparency'>('viewMode', { required: true });
const visitedOpacity = defineModel<number>('visitedOpacity', { required: true });

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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
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
</style>
