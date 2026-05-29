<template>
  <div class="filter-panel">
    <h4>{{ $t('map.filterPanel') }}</h4>
    <div>
      <label>{{ $t('map.showUnvisited') }}</label>
      <input type="checkbox" :checked="showUnvisited" @change="$emit('update:showUnvisited', !showUnvisited)" />
    </div>
    <div>
      <label>{{ $t('map.opacity') }} (visited)</label>
      <input type="range" min="0" max="100" :value="visitedOpacity" @input="$emit('update:visitedOpacity', +($event.target as HTMLInputElement).value)" />
    </div>
    <div>
      <label>{{ $t('map.opacity') }} (unvisited)</label>
      <input type="range" min="0" max="100" :value="unvisitedOpacity" @input="$emit('update:unvisitedOpacity', +($event.target as HTMLInputElement).value)" />
    </div>
    <div>
      <label>{{ $t('map.markerSize') }}</label>
      <input type="range" min="4" max="20" :value="markerSize" @input="$emit('update:markerSize', +($event.target as HTMLInputElement).value)" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  yearFrom?: number;
  yearTo?: number;
  showUnvisited: boolean;
  visitedOpacity: number;
  unvisitedOpacity: number;
  markerSize: number;
}>();

defineEmits<{
  'update:yearFrom': [value: number];
  'update:yearTo': [value: number];
  'update:showUnvisited': [value: boolean];
  'update:visitedOpacity': [value: number];
  'update:unvisitedOpacity': [value: number];
  'update:markerSize': [value: number];
}>();
</script>
