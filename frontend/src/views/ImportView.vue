<template>
  <div class="import-view">
    <h2>{{ $t('import.title') }}</h2>
    <CsvImport />
  </div>
</template>

<script setup lang="ts">
import CsvImport from '@/components/locations/CsvImport.vue';
</script>
