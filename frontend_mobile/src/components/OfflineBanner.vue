<template>
  <div class="offline-banner" :class="{ offline: !online }">
    <div>
      <strong>{{ online ? 'Online' : 'Offline' }}</strong>
      <p>{{ online ? 'Changes will sync on demand.' : 'Local edits are stored and will sync later.' }}</p>
    </div>
    <span>{{ pendingCount }} queued</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ online: boolean; pendingCount: number }>();
</script>
