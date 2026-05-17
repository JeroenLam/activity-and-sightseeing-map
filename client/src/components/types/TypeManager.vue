<template>
  <div class="type-manager">
    <div class="page-header">
      <h2>{{ t('types.title') }}</h2>
      <div class="header-actions">
        <div class="btn-with-help">
          <label class="btn-primary btn-small import-label">
            📤 {{ t('types.import') }}
            <input type="file" accept=".csv" class="hidden-input" @change="onImportFile" />
          </label>
          <button class="btn-help" :title="t('types.importHelp')" @click="showImportHelp = !showImportHelp">?</button>
          <div v-if="showImportHelp" class="help-tooltip">{{ t('types.importHelp') }}</div>
        </div>
        <div class="btn-with-help">
          <button class="btn-primary btn-small" @click="exportTypes">
            📥 {{ t('types.export') }}
          </button>
          <button class="btn-help" :title="t('types.exportHelp')" @click="showExportHelp = !showExportHelp">?</button>
          <div v-if="showExportHelp" class="help-tooltip">{{ t('types.exportHelp') }}</div>
        </div>
      </div>
    </div>

    <p v-if="importMsg" class="import-msg">{{ importMsg }}</p>

    <!-- Add new type -->
    <form class="type-add-form" @submit.prevent="onAdd">
      <input v-model="newName" type="text" :placeholder="t('types.name')" required />
      <input v-model="newColor" type="color" class="color-input" />
      <MdiIconPicker v-model="newIcon" />
      <button type="submit" class="btn-primary btn-small">{{ t('types.add') }}</button>
    </form>

    <!-- Types list -->
    <div class="types-list">
      <div
        v-for="lt in sortedTypes"
        :key="lt.id"
        class="type-row"
      >
        <template v-if="editingId === lt.id">
          <input v-model="editName" type="text" class="edit-input" />
          <input v-model="editColor" type="color" class="color-input" />
          <MdiIconPicker v-model="editIcon" />
          <button class="btn-small btn-primary" @click="onSaveEdit(lt.id)">{{ t('types.save') }}</button>
          <button class="btn-small btn-ghost" @click="editingId = ''">{{ t('types.cancel') }}</button>
        </template>
        <template v-else>
          <span class="type-color" :style="{ background: lt.color }">
            <svg v-if="getIconPath(lt.icon)" viewBox="0 0 24 24" class="type-icon-svg">
              <path :d="getIconPath(lt.icon)" fill="#fff" />
            </svg>
          </span>
          <span class="type-name">{{ lt.name }}</span>
          <span class="type-count">({{ countLocations(lt.id) }})</span>
          <div class="type-actions">
            <button class="btn-ghost" @click="startEdit(lt)">✏️</button>
            <button class="btn-ghost btn-danger" @click="onDelete(lt)">🗑️</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTypesStore } from '@/stores/types';
import { useLocationsStore } from '@/stores/locations';
import MdiIconPicker from './MdiIconPicker.vue';
import * as mdiIcons from '@mdi/js';
import type { LocationType } from '@/types';

const { t } = useI18n();
const typesStore = useTypesStore();
const locationsStore = useLocationsStore();

const sortedTypes = computed(() => typesStore.sortedTypes);

const newName = ref('');
const newColor = ref('#9E9E9E');
const newIcon = ref('');
const editingId = ref('');
const editName = ref('');
const editColor = ref('');
const editIcon = ref('');
const importMsg = ref('');
const showImportHelp = ref(false);
const showExportHelp = ref(false);

function countLocations(typeId: string): number {
  return locationsStore.locations.filter((l) => l.type === typeId).length;
}

function getIconPath(iconName: string | undefined): string {
  if (!iconName) return '';
  // Convert "map-marker" to "mdiMapMarker"
  const camel = 'mdi' + iconName.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  return (mdiIcons as Record<string, string>)[camel] ?? '';
}

function exportTypes() {
  const header = ['name', 'color', 'icon'];
  const rows = typesStore.sortedTypes.map((t) =>
    [t.name, t.color, t.icon ?? ''].map((v) => `"${v.replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'location-types.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  importMsg.value = '';
  const text = await file.text();
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);
  if (lines.length < 2) return;

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => /^(name|naam)$/.test(h));
  const colorIdx = headers.findIndex((h) => /^(color|kleur)$/.test(h));

  if (nameIdx === -1) {
    importMsg.value = 'CSV must have a "name" column';
    return;
  }

  const existingNames = new Set(typesStore.types.map((t) => t.name.toLowerCase()));
  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[nameIdx]?.trim();
    if (!name) continue;

    if (existingNames.has(name.toLowerCase())) {
      skipped++;
      continue;
    }

    const color = colorIdx !== -1 && cols[colorIdx]?.trim() ? cols[colorIdx].trim() : '#9E9E9E';
    await typesStore.createType({ name, color });
    existingNames.add(name.toLowerCase());
    imported++;
  }

  importMsg.value = t('types.importSuccess', { count: imported });
  if (skipped > 0) {
    importMsg.value += ' — ' + t('types.importSkipped', { count: skipped });
  }

  // Reset file input
  (e.target as HTMLInputElement).value = '';
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

async function onAdd() {
  if (!newName.value) return;
  await typesStore.createType({ name: newName.value, color: newColor.value, icon: newIcon.value });
  newName.value = '';
  newColor.value = '#9E9E9E';
  newIcon.value = '';
}

function startEdit(lt: LocationType) {
  editingId.value = lt.id;
  editName.value = lt.name;
  editColor.value = lt.color;
  editIcon.value = lt.icon || '';
}

async function onSaveEdit(id: string) {
  await typesStore.updateType(id, { name: editName.value, color: editColor.value, icon: editIcon.value });
  editingId.value = '';
}

async function onDelete(lt: LocationType) {
  const count = countLocations(lt.id);
  let msg = t('types.deleteConfirm');
  if (count > 0) {
    msg += '\n' + t('types.deleteWarning', { count });
  }
  if (confirm(msg)) {
    await typesStore.deleteType(lt.id);
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.page-header h2 {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-with-help {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.btn-help {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
}

.btn-help:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.help-tooltip {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 50;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--color-text-secondary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 280px;
  white-space: normal;
}

.import-label {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.hidden-input {
  display: none;
}

.import-msg {
  font-size: 0.85rem;
  color: var(--color-success, #16a34a);
  margin: 0 0 1rem;
}

.type-manager h2 {
  margin: 0 0 1rem;
}

.type-add-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.type-add-form input[type='text'] {
  flex: 1;
  max-width: 250px;
}

.color-input {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 2px;
  cursor: pointer;
}

.types-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.type-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.type-color {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-icon-svg {
  width: 14px;
  height: 14px;
}

.type-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.type-count {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.type-actions {
  margin-left: auto;
  display: flex;
  gap: 0.25rem;
}

.edit-input {
  flex: 1;
  max-width: 200px;
}

.btn-small {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.btn-danger:hover {
  color: var(--color-error) !important;
}

@media (max-width: 768px) {
  .type-add-form {
    flex-wrap: wrap;
  }

  .type-add-form input[type='text'] {
    max-width: 100%;
    flex-basis: 100%;
  }

  .type-row {
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .type-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
