<template>
  <div class="csv-import">
    <input ref="fileInput" type="file" accept=".csv" @change="onFile" hidden />

    <template v-if="preview">
      <h4>{{ t('import.preview') }} ({{ preview.total_rows }} {{ t('import.rows') }})</h4>

      <!-- Column mapping -->
      <div class="mapping-section">
        <h5>{{ t('import.columnMapping') }}</h5>
        <div class="mapping-table">
          <div v-for="field in allFields" :key="field.key" class="mapping-row">
            <span class="mapping-field">
              {{ t('import.fields.' + field.key) }}
              <span v-if="field.required" class="required">*</span>
            </span>
            <select v-model="columnMap[field.key]">
              <option value="">{{ field.required ? '—' : t('import.notPresent') }}</option>
              <option v-for="h in preview.headers" :key="h" :value="h">{{ h }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Preview table -->
      <div class="preview-section">
        <h5>{{ t('import.previewData') }}</h5>
        <div class="preview-table-wrapper">
          <table class="preview-table">
            <thead>
              <tr>
                <th v-for="h in preview.headers" :key="h">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in preview.preview" :key="idx">
                <td v-for="h in preview.headers" :key="h">{{ row[h] || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Import button -->
      <button
        class="btn btn-primary"
        @click="doImport"
        :disabled="importing || !hasRequiredMappings"
        style="margin-top: 0.75rem"
      >
        {{ importing ? t('import.importing') : t('import.startImport') }}
      </button>
      <p v-if="!hasRequiredMappings" class="text-error hint">
        {{ t('import.requiredFieldsHint') }}
      </p>
    </template>

    <!-- Progress bar -->
    <div v-if="importing" class="progress-section">
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: progressPct + '%' }"></div>
      </div>
      <p class="progress-text">{{ t('import.progress', { current: processed, total: totalRows }) }}</p>
    </div>

    <!-- Results -->
    <div v-if="result && !importing" class="result-box">
      <p class="text-success">{{ t('import.imported', { count: result.imported }) }}</p>
      <p v-if="result.skipped" class="text-secondary">{{ t('import.skipped', { count: result.skipped }) }}</p>
      <div v-if="result.errors.length">
        <p class="text-error">{{ t('import.errors') }}:</p>
        <ul class="error-list">
          <li v-for="(err, i) in result.errors.slice(0, 10)" :key="i">{{ err }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/lib/api';
import type { CsvPreview, ImportResult } from '@/types';

const { t } = useI18n();
const emit = defineEmits<{ done: [] }>();

const fileInput = ref<HTMLInputElement>();
const csvText = ref('');
const preview = ref<CsvPreview | null>(null);
const columnMap = reactive<Record<string, string>>({});
const importing = ref(false);
const result = ref<ImportResult | null>(null);
const processed = ref(0);
const totalRows = ref(0);

const allFields = [
  { key: 'name', required: true },
  { key: 'type', required: false },
  { key: 'city', required: false },
  { key: 'country', required: false },
  { key: 'visited', required: false },
  { key: 'link', required: false },
  { key: 'rating', required: false },
  { key: 'comments', required: false },
  { key: 'latitude', required: false },
  { key: 'longitude', required: false },
];

const hasRequiredMappings = computed(() => {
  return allFields
    .filter((f) => f.required)
    .every((f) => columnMap[f.key]);
});

const progressPct = computed(() => {
  if (totalRows.value === 0) return 0;
  return Math.round((processed.value / totalRows.value) * 100);
});

function triggerFileInput() {
  fileInput.value?.click();
}

defineExpose({ triggerFileInput });

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  csvText.value = await file.text();
  result.value = null;
  importing.value = false;
  processed.value = 0;
  try {
    const { data } = await api.post<CsvPreview>('/api/locations/import/preview', { csv: csvText.value });
    preview.value = data;
    // Reset column map and populate with auto-detected mappings
    for (const field of allFields) {
      columnMap[field.key] = data.column_map[field.key] || '';
    }
  } catch {
    preview.value = null;
  }
}

async function doImport() {
  if (!preview.value) return;
  importing.value = true;
  result.value = null;
  processed.value = 0;

  // Parse CSV client-side to get all rows
  const lines = csvText.value.split('\n');
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });
    rows.push(row);
  }

  totalRows.value = rows.length;

  // Build the active column_map (only mapped fields)
  const activeMap: Record<string, string> = {};
  for (const field of allFields) {
    if (columnMap[field.key]) {
      activeMap[field.key] = columnMap[field.key];
    }
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const { data } = await api.post<{ status: string; error: string | null }>(
        '/api/locations/import/row',
        { row: rows[i], column_map: activeMap }
      );
      if (data.status === 'imported') imported++;
      else if (data.status === 'skipped') skipped++;
      else if (data.status === 'error') errors.push(`Row ${i + 1}: ${data.error}`);
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message || 'Unknown error'}`);
    }
    processed.value = i + 1;
  }

  result.value = { imported, skipped, errors };
  importing.value = false;
  emit('done');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
</script>

<style scoped>
.csv-import h4 { margin: 0.75rem 0 0.5rem; font-size: 0.9rem; }
.csv-import h5 { margin: 0.75rem 0 0.4rem; font-size: 0.85rem; font-weight: 600; }

.mapping-section { margin-bottom: 1rem; }
.mapping-table { display: flex; flex-direction: column; gap: 0.4rem; }
.mapping-row { display: flex; align-items: center; gap: 0.5rem; }
.mapping-field { font-size: 0.8rem; font-weight: 500; min-width: 120px; }
.mapping-field .required { color: var(--color-error); }
.mapping-row select { flex: 1; font-size: 0.8rem; padding: 0.3rem; border-radius: 4px; border: 1px solid var(--color-border); }

.preview-section { margin-bottom: 0.75rem; }
.preview-table-wrapper { overflow-x: auto; max-height: 300px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: 6px; }
.preview-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
.preview-table th, .preview-table td { padding: 0.35rem 0.5rem; text-align: left; border-bottom: 1px solid var(--color-border); white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
.preview-table th { background: var(--color-surface-alt, var(--color-surface)); font-weight: 600; position: sticky; top: 0; }
.preview-table tbody tr:hover { background: var(--color-hover, rgba(0,0,0,0.03)); }

.progress-section { margin-top: 1rem; }
.progress-bar-container { width: 100%; height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden; }
.progress-bar { height: 100%; background: var(--color-primary, #4f46e5); border-radius: 4px; transition: width 0.2s ease; }
.progress-text { font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.35rem; }

.hint { font-size: 0.75rem; margin-top: 0.25rem; }
.result-box { margin-top: 1rem; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 8px; }
.error-list { list-style: disc; padding-left: 1.25rem; font-size: 0.8rem; color: var(--color-error); }
</style>
