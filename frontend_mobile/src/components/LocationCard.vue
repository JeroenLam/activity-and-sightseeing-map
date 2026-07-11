<template>
  <article class="location-card" :data-state="location.sync_state">
    <header>
      <div>
        <h3>{{ location.properties.name }}</h3>
        <p>
          {{ location.properties.city || 'Unknown city' }} · {{ location.properties.country || 'Unknown country' }}
        </p>
      </div>
      <span class="badge">{{ location.sync_state }}</span>
    </header>

    <div class="meta">
      <span v-if="location.properties.type" class="type-chip" :style="{ background: location.properties.type.color }">
        {{ location.properties.type.name }}
      </span>
      <span v-if="location.properties.rating">{{ location.properties.rating }}/5</span>
      <span v-if="location.properties.visited_unknown_year">Visited, year unknown</span>
    </div>

    <p v-if="location.properties.comments" class="comments">{{ location.properties.comments }}</p>

    <footer>
      <button type="button" @click="$emit('edit', location.id as string)">Edit</button>
      <button type="button" class="danger" @click="$emit('delete', location.id as string)">Delete</button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import type { LocalLocationFeature } from '@/types';

defineProps<{ location: LocalLocationFeature }>();
defineEmits<{ edit: [id: string]; delete: [id: string] }>();
</script>
