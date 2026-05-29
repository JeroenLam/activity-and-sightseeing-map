<template>
  <div class="csv-import">
    <h3>{{ $t('import.title') }}</h3>

    <div v-if="!previewData">
      <input type="file" accept=".csv" @change="onFileSelect" />
      <button :disabled="!file" @click="onPreview">{{ $t('import.preview') }}</button>
    </div>

    <div v-if="previewData">
      <h4>{{ $t('import.columnMapping') }}</h4>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>CSV Column</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(col, idx) in previewData.detected_columns" :key="idx">
            <td>{{ col.field }}</td>
            <td>{{ col.csv_column }}</td>
          </tr>
        </tbody>
      </table>

      <h4>{{ $t('import.previewRows') }}</h4>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>City</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in previewData.preview_rows.slice(0, 5)" :key="idx">
            <td>{{ row.name }}</td>
            <td>{{ row.city }}</td>
            <td>{{ row.type_name }}</td>
          </tr>
        </tbody>
      </table>

      <p>Total rows: {{ previewData.total_rows }}</p>
      <button @click="onImport">{{ $t('import.import') }}</button>
      <button @click="previewData = null">{{ $t('common.cancel') }}</button>
    </div>

    <div v-if="importResult">
      <p>{{ $t('import.success') }}: {{ importResult.imported }} imported, {{ importResult.skipped }} skipped</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLocationsStore } from '@/stores/locations';

const locationsStore = useLocationsStore();
const file = ref<File | null>(null);
const previewData = ref<any>(null);
const importResult = ref<any>(null);

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  file.value = input.files?.[0] || null;
}

async function onPreview() {
  if (!file.value) return;
  previewData.value = await locationsStore.csvPreview(file.value);
}

async function onImport() {
  if (!file.value) return;
  importResult.value = await locationsStore.csvImport(file.value);
  previewData.value = null;
}
</script>
