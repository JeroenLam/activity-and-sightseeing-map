<template>
  <div class="page-container">
    <h2>{{ t('import.title') }}</h2>

    <!-- Locations section -->
    <section class="import-section">
      <h3>{{ t('import.locationsSection') }}</h3>

      <div class="subsection">
        <div class="subsection-header">
          <h4>GeoJSON</h4>
          <div class="subsection-actions">
            <button class="btn btn-small" @click="exportGeojson">{{ t('import.exportAll') }}</button>
            <label class="btn btn-small">
              {{ t('manage.import') }}
              <input type="file" accept=".json,.geojson" @change="onGeojsonFile" hidden />
            </label>
          </div>
        </div>
        <p v-if="geojsonMsg" class="text-success msg">{{ geojsonMsg }}</p>
        <p v-if="geojsonError" class="text-error msg">{{ geojsonError }}</p>
      </div>

      <div class="subsection">
        <div class="subsection-header">
          <h4>CSV</h4>
          <div class="subsection-actions">
            <button class="btn btn-small" @click="exportLocationsCsv">{{ t('import.exportAll') }}</button>
            <button class="btn btn-small" @click="csvImportRef?.triggerFileInput()">{{ t('manage.import') }}</button>
          </div>
        </div>
        <CsvImport ref="csvImportRef" @done="onCsvDone" />
      </div>
    </section>

    <!-- Types section -->
    <section class="import-section">
      <h3>{{ t('import.typesSection') }}</h3>

      <div class="subsection">
        <div class="subsection-header">
          <h4>CSV</h4>
          <div class="subsection-actions">
            <button class="btn btn-small" @click="exportTypesCsv">{{ t('import.exportAll') }}</button>
            <label class="btn btn-small">
              {{ t('manage.import') }}
              <input type="file" accept=".csv" @change="onTypeCsvFile" hidden />
            </label>
          </div>
        </div>
        <p v-if="typeImportMsg" class="text-success msg">{{ typeImportMsg }}</p>
        <p v-if="typeImportError" class="text-error msg">{{ typeImportError }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocationsStore } from '@/stores/locations';
import { useTypesStore } from '@/stores/types';
import CsvImport from '@/components/locations/CsvImport.vue';

const { t } = useI18n();
const locationsStore = useLocationsStore();
const typesStore = useTypesStore();

const csvImportRef = ref<InstanceType<typeof CsvImport>>();
const geojsonMsg = ref('');
const geojsonError = ref('');
const typeImportMsg = ref('');
const typeImportError = ref('');

onMounted(async () => {
  await Promise.all([locationsStore.fetchLocations(), typesStore.fetchTypes()]);
});

async function exportGeojson() {
  try {
    const data = await locationsStore.exportGeojson();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'locations.geojson'; a.click();
    URL.revokeObjectURL(url);
  } catch { geojsonError.value = t('common.error'); }
}

async function onGeojsonFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  geojsonMsg.value = ''; geojsonError.value = '';
  try {
    const text = await file.text();
    const geojson = JSON.parse(text);
    const result = await locationsStore.importGeojson(geojson);
    geojsonMsg.value = t('import.imported', { count: result.imported });
    await locationsStore.fetchLocations();
  } catch {
    geojsonError.value = t('common.error');
  }
}

function exportLocationsCsv() {
  const features = locationsStore.collection.features;
  const header = ['name', 'type', 'city', 'country', 'link', 'visited', 'latitude', 'longitude', 'rating', 'note'];
  const rows = features.map((f) => {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const visited = p.visited_unknown_year ? '-' : (p.years_visited ?? []).join(', ');
    return [p.name, p.type?.name || '', p.city, p.country, p.link || '', visited, String(lat), String(lng), p.rating != null ? String(p.rating) : '', p.comments || '']
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',');
  });
  downloadCsv([header.join(','), ...rows].join('\n'), 'locations.csv');
}

function exportTypesCsv() {
  const header = ['name', 'color', 'icon'];
  const rows = typesStore.types.map((lt) =>
    [lt.name, lt.color, lt.icon || ''].map((v) => `"${v.replace(/"/g, '""')}"`).join(',')
  );
  downloadCsv([header.join(','), ...rows].join('\n'), 'types.csv');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function onTypeCsvFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  typeImportMsg.value = ''; typeImportError.value = '';
  try {
    const text = await file.text();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) { typeImportError.value = 'CSV file is empty or has no data rows.'; return; }

    const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const colorIdx = headers.indexOf('color');
    const iconIdx = headers.indexOf('icon');
    if (nameIdx < 0) { typeImportError.value = 'CSV must have a "name" column.'; return; }

    let imported = 0;
    let skipped = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const name = cols[nameIdx]?.trim();
      if (!name) { skipped++; continue; }
      const color = colorIdx >= 0 ? (cols[colorIdx]?.trim() || '#4f46e5') : '#4f46e5';
      const icon = iconIdx >= 0 ? (cols[iconIdx]?.trim() || '') : '';

      // Skip if type with same name already exists
      if (typesStore.types.some((t) => t.name.toLowerCase() === name.toLowerCase())) { skipped++; continue; }

      await typesStore.createType({ name, color, icon });
      imported++;
    }
    typeImportMsg.value = t('import.imported', { count: imported }) + (skipped ? ` (${skipped} skipped)` : '');
  } catch {
    typeImportError.value = t('common.error');
  }
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

function onCsvDone() {
  locationsStore.fetchLocations();
}
</script>

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; padding: 1.5rem; }
.page-container h2 { margin: 0 0 1.5rem; }

.import-section {
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.import-section h3 { margin: 0 0 0.75rem; font-size: 1.1rem; }

.subsection {
  padding: 0.75rem 0;
  border-top: 1px solid var(--color-border);
}
.subsection:first-of-type { border-top: none; padding-top: 0; }
.subsection h4 { margin: 0; font-size: 0.9rem; color: var(--color-text-secondary); }

.subsection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.subsection-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.msg { margin-top: 0.5rem; }

@media (max-width: 768px) {
  .page-container { padding: 1rem; }
  .import-section { padding: 1rem; }
  .subsection-header { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .subsection-actions { width: 100%; }
  .subsection-actions .btn { flex: 1; text-align: center; }
}
</style>
