<template>
  <div class="csv-import">
    <input ref="fileInput" type="file" accept=".csv" @change="onFile" hidden />

    <template v-if="preview">
      <h4>{{ t('import.preview') }} ({{ preview.total_rows }} rows)</h4>

      <!-- Column mapping -->
      <div class="mapping-table">
        <div v-for="(col, field) in preview.column_map" :key="field" class="mapping-row">
          <span class="mapping-field">{{ field }}</span>
          <select v-model="columnMap[field]">
            <option value="">—</option>
            <option v-for="h in preview.headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>
      </div>

      <button class="btn btn-primary" @click="doImport" :disabled="importing" style="margin-top: 0.75rem">
        {{ importing ? t('import.importing') : t('import.startImport') }}
      </button>
    </template>

    <div v-if="result" class="result-box">
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
import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocationsStore } from '@/stores/locations';
import type { CsvPreview, ImportResult } from '@/types';

const { t } = useI18n();
const locationsStore = useLocationsStore();
const emit = defineEmits<{ done: [] }>();

const fileInput = ref<HTMLInputElement>();
const csvText = ref('');
const preview = ref<CsvPreview | null>(null);
const columnMap = reactive<Record<string, string>>({});
const importing = ref(false);
const result = ref<ImportResult | null>(null);

function triggerFileInput() {
  fileInput.value?.click();
}

defineExpose({ triggerFileInput });

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  csvText.value = await file.text();
  result.value = null;
  try {
    const p = await locationsStore.previewCsv(csvText.value);
    preview.value = p;
    Object.assign(columnMap, p.column_map);
  } catch { preview.value = null; }
}

async function doImport() {
  importing.value = true;
  try {
    result.value = await locationsStore.importCsv(csvText.value, columnMap);
    emit('done');
  } catch {}
  finally { importing.value = false; }
}
</script>

<style scoped>
.hint { font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.25rem; }
h4 { margin: 0.75rem 0 0.5rem; font-size: 0.9rem; }

.mapping-table { display: flex; flex-direction: column; gap: 0.4rem; }
.mapping-row { display: flex; align-items: center; gap: 0.5rem; }
.mapping-field { font-size: 0.8rem; font-weight: 500; min-width: 100px; }
.mapping-row select { flex: 1; font-size: 0.8rem; padding: 0.3rem; }

.result-box { margin-top: 1rem; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 8px; }
.error-list { list-style: disc; padding-left: 1.25rem; font-size: 0.8rem; color: var(--color-error); }
</style>
