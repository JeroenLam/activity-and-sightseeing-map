<template>
  <div class="page-container">
    <CsvImport />
  </div>
</template>

<script setup lang="ts">
import CsvImport from '@/components/locations/CsvImport.vue';
</script>

<style scoped>
.page-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
}

@media (max-width: 768px) {
  .page-container {
    padding: 1rem;
  }
}
</style>
