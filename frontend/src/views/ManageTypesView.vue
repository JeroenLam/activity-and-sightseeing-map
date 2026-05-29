<template>
  <div class="manage-types-view">
    <h2>{{ $t('types.manage') }}</h2>
    <TypeManager />
  </div>
</template>

<script setup lang="ts">
import TypeManager from '@/components/types/TypeManager.vue';
</script>
