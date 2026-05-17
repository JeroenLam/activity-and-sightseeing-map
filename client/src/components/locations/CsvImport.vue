<template>
  <div class="csv-import">
    <h2>{{ t('import.title') }}</h2>

    <!-- Upload -->
    <div
      v-if="!preview"
      class="upload-area"
      :class="{ dragover }"
      @dragover.prevent="dragover = true"
      @dragleave="dragover = false"
      @drop.prevent="onDrop"
    >
      <p>{{ t('import.uploadHint') }}</p>
      <input
        type="file"
        accept=".csv"
        class="file-input"
        @change="onFileSelect"
      />
    </div>

    <!-- Preview -->
    <template v-if="preview && !importResult">
      <h3>{{ t('import.preview') }} ({{ preview.totalRows }} rows)</h3>
      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead>
            <tr>
              <th v-for="h in preview.headers" :key="h">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in preview.preview" :key="i">
              <td v-for="h in preview.headers" :key="h">{{ row[h] }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Column mapping -->
      <h3>{{ t('import.columnMapping') }}</h3>
      <div class="mapping-grid">
        <template v-for="field in mappingFields" :key="field.key">
          <label>{{ field.label }}</label>
          <select v-model="columnMap[field.key]">
            <option value="">—</option>
            <option v-for="h in preview.headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </template>
      </div>

      <button class="btn-primary" :disabled="importing" @click="startImport">
        {{ importing ? t('import.importing') : t('import.startImport') }}
      </button>

      <!-- Progress bar -->
      <div v-if="importing" class="progress-section">
        <div class="progress-header">
          <span>{{ t('import.progress', { current: progress.current, total: progress.total }) }}</span>
          <span class="progress-pct">{{ progressPct }}%</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <p v-if="progress.name" class="progress-name">{{ progress.name }}</p>
      </div>
    </template>

    <!-- Results -->
    <template v-if="importResult">
      <h3>{{ t('import.results') }}</h3>
      <div class="results-summary">
        <p class="result-imported">{{ t('import.imported', { count: importResult.imported }) }}</p>
        <p class="result-skipped">{{ t('import.skipped', { count: importResult.skipped }) }}</p>
      </div>
      <div v-if="importResult.errors.length" class="result-errors">
        <h4>{{ t('import.errors') }}</h4>
        <ul>
          <li v-for="(err, i) in importResult.errors" :key="i">{{ err }}</li>
        </ul>
      </div>
      <p v-else class="success-msg">{{ t('import.noErrors') }}</p>
      <button class="btn-primary" @click="reset">{{ t('import.done') }}</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocationsStore } from '@/stores/locations';
import type { CsvPreview, ImportResult, ImportProgress } from '@/types';

const { t } = useI18n();
const locationsStore = useLocationsStore();
const emit = defineEmits<{ done: [] }>();

const dragover = ref(false);
const preview = ref<CsvPreview | null>(null);
const csvContent = ref('');
const importing = ref(false);
const importResult = ref<ImportResult | null>(null);
const progress = reactive({ current: 0, total: 0, name: '' });

const progressPct = computed(() =>
  progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
);

const columnMap = reactive<Record<string, string>>({
  name: '',
  type: '',
  city: '',
  country: '',
  link: '',
  visited: '',
  latitude: '',
  longitude: '',
});

const mappingFields = computed(() => [
  { key: 'name', label: t('location.name') },
  { key: 'type', label: t('location.type') },
  { key: 'city', label: t('location.city') },
  { key: 'country', label: t('location.country') },
  { key: 'link', label: t('location.link') },
  { key: 'visited', label: t('location.visitedYears') },
  { key: 'latitude', label: t('location.latitude') },
  { key: 'longitude', label: t('location.longitude') },
]);

async function processFile(file: File) {
  csvContent.value = await file.text();
  try {
    const result = await locationsStore.previewCsv(csvContent.value);
    preview.value = result;
    // Apply detected column map
    Object.assign(columnMap, result.columnMap);
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to parse CSV');
  }
}

function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) processFile(file);
}

function onDrop(e: DragEvent) {
  dragover.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) processFile(file);
}

async function startImport() {
  importing.value = true;
  progress.current = 0;
  progress.total = preview.value?.totalRows ?? 0;
  progress.name = '';
  try {
    importResult.value = await locationsStore.importCsv(
      csvContent.value,
      columnMap,
      (p: ImportProgress) => {
        progress.current = p.current;
        progress.total = p.total;
        progress.name = p.name;
      }
    );
  } catch (err: any) {
    alert(err.message || 'Import failed');
  } finally {
    importing.value = false;
  }
}

function reset() {
  preview.value = null;
  csvContent.value = '';
  importResult.value = null;
  Object.keys(columnMap).forEach((k) => (columnMap[k] = ''));
  emit('done');
}
</script>

<style scoped>
.csv-import h2 {
  margin: 0 0 1rem;
}

.upload-area {
  position: relative;
  border: 2px dashed var(--color-border);
  border-radius: 10px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
}

.upload-area.dragover,
.upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.preview-table-wrap {
  overflow-x: auto;
  margin: 0.75rem 0;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.preview-table th,
.preview-table td {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-border);
  text-align: left;
  white-space: nowrap;
}

.preview-table th {
  background: var(--color-bg);
  font-weight: 600;
}

.mapping-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  align-items: center;
  margin: 0.75rem 0 1.25rem;
}

.mapping-grid label {
  font-size: 0.85rem;
  font-weight: 500;
}

.mapping-grid select {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
}

.results-summary {
  display: flex;
  gap: 1.5rem;
  margin: 0.75rem 0;
}

.result-imported {
  color: var(--color-success);
  font-weight: 600;
}

.result-skipped {
  color: var(--color-warning);
  font-weight: 600;
}

.result-errors {
  margin: 0.5rem 0;
}

.result-errors ul {
  margin: 0.25rem 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
  color: var(--color-error);
}

.success-msg {
  color: var(--color-success);
  font-weight: 500;
}

.progress-section {
  margin-top: 1rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
}

.progress-pct {
  font-weight: 600;
  color: var(--color-primary);
}

.progress-bar-track {
  width: 100%;
  height: 10px;
  background: var(--color-border);
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 5px;
  transition: width 0.3s ease;
}

.progress-name {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0.3rem 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .upload-area {
    padding: 2rem 1rem;
  }

  .mapping-grid {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }

  .mapping-grid label {
    margin-top: 0.35rem;
  }

  .results-summary {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
