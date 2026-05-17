<template>
  <div class="page-container">
    <div class="page-header">
      <h2>{{ t('manage.title') }}</h2>
      <div class="header-actions">
        <div class="btn-with-help">
          <button class="btn-primary btn-small" @click="showImport = !showImport">
            📤 {{ t('manage.import') }}
          </button>
          <button class="btn-help" :title="t('manage.importHelp')" @click="showImportHelp = !showImportHelp">?</button>
          <div v-if="showImportHelp" class="help-tooltip">{{ t('manage.importHelp') }}</div>
        </div>
        <div class="btn-with-help">
          <button v-if="locationsStore.locations.length > 0" class="btn-primary btn-small" @click="exportCsv">
            📥 {{ t('manage.export') }}
          </button>
          <button v-if="locationsStore.locations.length > 0" class="btn-help" :title="t('manage.exportHelp')" @click="showExportHelp = !showExportHelp">?</button>
          <div v-if="showExportHelp" class="help-tooltip">{{ t('manage.exportHelp') }}</div>
        </div>
      </div>
    </div>

    <!-- Import section (toggled) -->
    <div v-if="showImport" class="import-section">
      <CsvImport @done="onImportDone" />
    </div>

    <div v-if="locationsStore.loading" class="loading">{{ t('app.loading') }}</div>

    <div v-else-if="locationsStore.locations.length === 0 && !showImport" class="empty">
      {{ t('manage.empty') }}
    </div>

    <template v-else>
      <!-- Failed geocode banner -->
      <div v-if="failedLocations.length > 0" class="geocode-banner">
        <span class="banner-icon">⚠️</span>
        <span>{{ t('manage.geocodeFailed', { count: failedLocations.length }) }}</span>
        <button
          class="btn-ghost btn-small"
          :disabled="retryingAll"
          @click="retryAllGeocode"
        >
          {{ retryingAll ? t('manage.retrying') : t('manage.retryAll') }}
        </button>
      </div>

      <!-- Search -->
      <div class="field search-field">
        <input
          v-model="search"
          type="text"
          :placeholder="t('manage.searchPlaceholder')"
        />
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <table class="manage-table">
          <thead>
            <tr>
              <th class="th-sortable" @click="toggleSort('name')">
                {{ t('location.name') }} {{ sortIcon('name') }}
              </th>
              <th class="th-sortable" @click="toggleSort('type')">
                {{ t('location.type') }} {{ sortIcon('type') }}
              </th>
              <th class="th-sortable" @click="toggleSort('city')">
                {{ t('location.city') }} {{ sortIcon('city') }}
              </th>
              <th class="th-sortable" @click="toggleSort('country')">
                {{ t('location.country') }} {{ sortIcon('country') }}
              </th>
              <th class="th-sortable" @click="toggleSort('years')">
                📅 {{ sortIcon('years') }}
              </th>
              <th class="th-sortable th-rating" @click="toggleSort('rating')">
                {{ t('location.rating') }} {{ sortIcon('rating') }}
              </th>
              <th class="th-note">
                {{ t('location.note') }}
              </th>
              <th class="th-sortable th-status" @click="toggleSort('status')">
                📍 {{ sortIcon('status') }}
              </th>
              <th class="th-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="loc in sortedLocations"
              :key="loc.id"
              :class="{ 'row-failed': isGeocodeFailed(loc) }"
            >
              <td class="td-name">
                <span class="type-dot" :style="{ background: getTypeColor(loc.type) }"></span>
                {{ loc.name }}
              </td>
              <td>{{ getTypeName(loc.type) }}</td>
              <td>{{ loc.city }}</td>
              <td>{{ loc.country }}</td>
              <td class="td-years">
                <template v-if="loc.visitedYears.length">{{ loc.visitedYears.join(', ') }}</template>
                <template v-else-if="loc.visitedUnknownYear">?</template>
                <template v-else>—</template>
              </td>
              <td class="td-rating">
                <span v-if="loc.rating" class="rating-stars">{{ '★'.repeat(loc.rating) }}{{ '☆'.repeat(5 - loc.rating) }}</span>
                <span v-else class="rating-none">—</span>
              </td>
              <td class="td-note">
                <span v-if="loc.note" class="note-text" :title="loc.note">{{ loc.note }}</span>
                <span v-else>—</span>
              </td>
              <td class="td-status">
                <span v-if="isGeocodeFailed(loc)" class="status-warn" :title="t('manage.noCoordinates')">⚠️</span>
                <span v-else class="status-ok">✓</span>
              </td>
              <td>
                <div class="td-actions">
                  <button
                    v-if="isGeocodeFailed(loc)"
                    class="btn-icon"
                    :disabled="retrying === loc.id"
                    :title="t('manage.retry')"
                    @click="retryGeocode(loc)"
                  >🔄</button>
                  <button class="btn-icon" :title="t('manage.edit')" @click="openEdit(loc)">✏️</button>
                  <button
                    class="btn-icon btn-icon-danger"
                    :disabled="deleting === loc.id"
                    :title="t('manage.delete')"
                    @click="confirmDelete(loc)"
                  >🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="count">
        {{ t('manage.showing', { shown: sortedLocations.length, total: locationsStore.locations.length }) }}
      </p>
    </template>

    <!-- Edit dialog -->
    <div v-if="editing" class="overlay" @click.self="editing = null">
      <div class="edit-dialog">
        <h3>{{ t('manage.editTitle') }}</h3>
        <div class="edit-form">
          <label>{{ t('location.name') }}</label>
          <input v-model="editForm.name" type="text" />

          <label>{{ t('location.type') }}</label>
          <select v-model="editForm.type">
            <option v-for="lt in typesStore.sortedTypes" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
          </select>

          <label>{{ t('location.city') }}</label>
          <input v-model="editForm.city" type="text" />

          <label>{{ t('location.country') }}</label>
          <input v-model="editForm.country" type="text" />

          <label>{{ t('location.link') }}</label>
          <input v-model="editForm.link" type="url" />

          <label>{{ t('location.latitude') }}</label>
          <input v-model.number="editForm.latitude" type="number" step="any" />

          <label>{{ t('location.longitude') }}</label>
          <input v-model.number="editForm.longitude" type="number" step="any" />

          <label>{{ t('location.visitedYears') }}</label>
          <div class="years-edit">
            <div v-for="(year, i) in editForm.visitedYears" :key="i" class="year-chip">
              <span>{{ year }}</span>
              <button class="chip-remove" @click="editForm.visitedYears.splice(i, 1)">×</button>
            </div>
            <div class="year-add-row">
              <input
                v-model.number="newYear"
                type="number"
                min="1900"
                :max="currentYear"
                class="year-input"
              />
              <button class="btn-ghost btn-small" @click="addEditYear">+</button>
            </div>
          </div>

          <label class="checkbox-label">
            <input v-model="editForm.visitedUnknownYear" type="checkbox" />
            {{ t('location.visitedUnknownYear') }}
          </label>

          <label>{{ t('location.rating') }}</label>
          <div class="star-rating">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              class="star-btn"
              :class="{ active: editForm.rating !== null && star <= editForm.rating }"
              @click="editForm.rating = star"
            >★</button>
            <button v-if="editForm.rating !== null" type="button" class="clear-rating" @click="editForm.rating = null">×</button>
          </div>

          <label>{{ t('location.note') }}</label>
          <textarea v-model="editForm.note" rows="3" :placeholder="t('location.notePlaceholder')"></textarea>
        </div>

        <div class="dialog-actions">
          <button class="btn-ghost" @click="editing = null">{{ t('manage.cancel') }}</button>
          <button class="btn-primary" :disabled="saving" @click="saveEdit">
            {{ saving ? '...' : t('location.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm delete dialog -->
    <div v-if="toDelete" class="overlay" @click.self="toDelete = null">
      <div class="confirm-dialog">
        <p>{{ t('manage.deleteConfirm', { name: toDelete.name }) }}</p>
        <div class="dialog-actions">
          <button class="btn-ghost" @click="toDelete = null">{{ t('manage.cancel') }}</button>
          <button class="btn-primary btn-danger-fill" @click="doDelete">{{ t('manage.confirmBtn') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocationsStore } from '@/stores/locations';
import { useTypesStore } from '@/stores/types';
import CsvImport from '@/components/locations/CsvImport.vue';
import type { Location } from '@/types';

const { t } = useI18n();
const locationsStore = useLocationsStore();
const typesStore = useTypesStore();

const showImport = ref(false);
const showImportHelp = ref(false);
const showExportHelp = ref(false);
const currentYear = new Date().getFullYear();
const search = ref('');
const deleting = ref<string | null>(null);
const toDelete = ref<Location | null>(null);
const retrying = ref<string | null>(null);
const retryingAll = ref(false);

// Sort state
type SortKey = 'name' | 'type' | 'city' | 'country' | 'years' | 'rating' | 'status';
const sortKey = ref<SortKey>('name');
const sortAsc = ref(true);

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return '';
  return sortAsc.value ? '▲' : '▼';
}

// Edit state
const editing = ref<Location | null>(null);
const saving = ref(false);
const newYear = ref(currentYear);
const editForm = reactive({
  name: '',
  type: '',
  city: '',
  country: '',
  link: '' as string | null,
  latitude: 0,
  longitude: 0,
  visitedYears: [] as number[],
  visitedUnknownYear: false,
  rating: null as number | null,
  note: '' as string | null,
});

onMounted(() => {
  locationsStore.fetchLocations();
  typesStore.fetchTypes();
});

function isGeocodeFailed(loc: Location): boolean {
  return loc.latitude === 0 && loc.longitude === 0;
}

const failedLocations = computed(() =>
  locationsStore.locations.filter(isGeocodeFailed)
);

const filteredLocations = computed(() => {
  const q = search.value.toLowerCase();
  let list = locationsStore.locations;
  if (q) {
    list = list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q) ||
        getTypeName(l.type).toLowerCase().includes(q) ||
        l.visitedYears.some((y) => String(y).includes(q))
    );
  }
  return list;
});

const sortedLocations = computed(() => {
  const dir = sortAsc.value ? 1 : -1;
  return [...filteredLocations.value].sort((a, b) => {
    let cmp = 0;
    switch (sortKey.value) {
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'type':
        cmp = getTypeName(a.type).localeCompare(getTypeName(b.type));
        break;
      case 'city':
        cmp = a.city.localeCompare(b.city);
        break;
      case 'country':
        cmp = a.country.localeCompare(b.country);
        break;
      case 'years': {
        const aY = a.visitedYears.length ? Math.min(...a.visitedYears) : a.visitedUnknownYear ? 0 : Infinity;
        const bY = b.visitedYears.length ? Math.min(...b.visitedYears) : b.visitedUnknownYear ? 0 : Infinity;
        cmp = aY - bY;
        break;
      }
      case 'status': {
        const aF = isGeocodeFailed(a) ? 0 : 1;
        const bF = isGeocodeFailed(b) ? 0 : 1;
        cmp = aF - bF;
        break;
      }
      case 'rating': {
        const aR = a.rating ?? 0;
        const bR = b.rating ?? 0;
        cmp = aR - bR;
        break;
      }
    }
    return cmp * dir;
  });
});

function getTypeName(typeId: string): string {
  return typesStore.getTypeById(typeId)?.name ?? typeId;
}

function getTypeColor(typeId: string): string {
  return typesStore.getTypeById(typeId)?.color ?? '#9E9E9E';
}

// --- Export ---
function exportCsv() {
  const header = ['name', 'type', 'city', 'country', 'link', 'visited', 'latitude', 'longitude', 'rating', 'note'];
  const rows = locationsStore.locations.map((loc) => {
    const typeName = getTypeName(loc.type);
    const visited = loc.visitedUnknownYear
      ? '-'
      : loc.visitedYears.join(', ');
    return [
      loc.name,
      typeName,
      loc.city,
      loc.country,
      loc.link ?? '',
      visited,
      String(loc.latitude),
      String(loc.longitude),
      loc.rating != null ? String(loc.rating) : '',
      loc.note ?? '',
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(',');
  });
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'locations.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function onImportDone() {
  showImport.value = false;
  locationsStore.fetchLocations();
}

// --- Edit ---
function openEdit(loc: Location) {
  editing.value = loc;
  editForm.name = loc.name;
  editForm.type = loc.type;
  editForm.city = loc.city;
  editForm.country = loc.country;
  editForm.link = loc.link || '';
  editForm.latitude = loc.latitude;
  editForm.longitude = loc.longitude;
  editForm.visitedYears = [...loc.visitedYears];
  editForm.visitedUnknownYear = loc.visitedUnknownYear;
  editForm.rating = loc.rating;
  editForm.note = loc.note || '';
  newYear.value = currentYear;
}

function addEditYear() {
  if (newYear.value && !editForm.visitedYears.includes(newYear.value)) {
    editForm.visitedYears.push(newYear.value);
    editForm.visitedYears.sort((a, b) => a - b);
  }
}

async function saveEdit() {
  if (!editing.value) return;
  saving.value = true;
  try {
    await locationsStore.updateLocation(editing.value.id, {
      name: editForm.name,
      type: editForm.type,
      city: editForm.city,
      country: editForm.country,
      link: editForm.link || null,
      latitude: editForm.latitude,
      longitude: editForm.longitude,
      visitedYears: editForm.visitedYears,
      visitedUnknownYear: editForm.visitedUnknownYear,
      rating: editForm.rating,
      note: editForm.note || null,
    });
    editing.value = null;
  } finally {
    saving.value = false;
  }
}

// --- Delete ---
function confirmDelete(loc: Location) {
  toDelete.value = loc;
}

async function doDelete() {
  if (!toDelete.value) return;
  deleting.value = toDelete.value.id;
  try {
    await locationsStore.deleteLocation(toDelete.value.id);
  } finally {
    deleting.value = null;
    toDelete.value = null;
  }
}

// --- Retry geocoding ---
async function retryGeocode(loc: Location) {
  retrying.value = loc.id;
  try {
    await locationsStore.geocodeLocation(loc.id);
  } catch {
    // keep it visible as failed
  } finally {
    retrying.value = null;
  }
}

async function retryAllGeocode() {
  retryingAll.value = true;
  for (const loc of failedLocations.value) {
    retrying.value = loc.id;
    try {
      await locationsStore.geocodeLocation(loc.id);
      // Rate limit between requests
      await new Promise((r) => setTimeout(r, 1200));
    } catch {
      // continue with next
    }
    retrying.value = null;
  }
  retryingAll.value = false;
}
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
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

.import-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.page-container h2 {
  margin: 0 0 1rem;
}

.empty,
.loading {
  color: var(--color-text-secondary);
  padding: 2rem 0;
}

/* Geocode failed banner */
.geocode-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 1rem;
  margin-bottom: 1rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #92400e;
}

.banner-icon {
  font-size: 1.1rem;
}

.search-field {
  margin-bottom: 0.75rem;
}

/* Table */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.manage-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.manage-table th,
.manage-table td {
  padding: 0.4rem 0.6rem;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
}

.manage-table thead th {
  background: var(--color-bg);
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  position: sticky;
  top: 0;
}

.th-sortable {
  cursor: pointer;
  user-select: none;
}

.th-sortable:hover {
  color: var(--color-primary);
}

.th-status {
  text-align: center;
  width: 2rem;
}

.th-actions {
  width: 5rem;
}

.manage-table tbody tr:hover {
  background: rgba(0, 0, 0, 0.02);
}

.manage-table tbody tr.row-failed {
  background: #fffbeb;
}

.td-name {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 500;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

.td-years {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.th-rating {
  width: 6rem;
}

.td-rating {
  white-space: nowrap;
}

.rating-stars {
  color: #f5a623;
  font-size: 0.85rem;
}

.rating-none {
  color: var(--color-text-secondary);
}

.th-note {
  min-width: 100px;
}

.td-note {
  max-width: 150px;
}

.note-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.td-status {
  text-align: center;
}

.status-ok {
  color: var(--color-success, #22c55e);
  font-size: 0.75rem;
}

.status-warn {
  font-size: 0.85rem;
}

.td-actions {
  display: flex;
  gap: 0.15rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  transition: background 0.1s;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.06);
}

.btn-icon-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: default;
}

.count {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

/* Overlay & dialogs */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.confirm-dialog p {
  margin: 0 0 1.25rem;
  font-size: 0.95rem;
}

.edit-dialog {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 500px;
  width: 95%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.edit-dialog h3 {
  margin: 0 0 1rem;
}

.edit-form {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.edit-form label {
  font-size: 0.85rem;
  font-weight: 500;
}

.edit-form input[type="text"],
.edit-form input[type="url"],
.edit-form input[type="number"],
.edit-form select {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
}

.years-edit {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.year-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  background: var(--color-primary-light, #e0e7ff);
  border-radius: 12px;
  padding: 0.15rem 0.5rem;
  font-size: 0.8rem;
}

.chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  color: var(--color-text-secondary);
}

.chip-remove:hover {
  color: var(--color-error);
}

.year-add-row {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.year-input {
  width: 70px;
  padding: 0.2rem 0.35rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8rem;
}

.checkbox-label {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.dialog-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-danger-fill {
  background: var(--color-error) !important;
}

.btn-danger-fill:hover {
  background: #dc2626 !important;
}

/* === Mobile Responsive === */
@media (max-width: 768px) {
  .page-container {
    padding: 1rem;
  }

  .page-header {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .page-header h2 {
    font-size: 1.2rem;
  }

  .manage-table th,
  .manage-table td {
    padding: 0.4rem 0.5rem;
    font-size: 0.75rem;
  }

  .td-name {
    max-width: 140px;
  }

  .th-actions {
    width: 3.5rem;
  }

  .edit-dialog {
    max-width: 100%;
    width: 100%;
    max-height: 90vh;
    border-radius: 12px 12px 0 0;
    margin-top: auto;
  }

  .edit-form {
    grid-template-columns: 1fr;
  }

  .overlay {
    align-items: flex-end;
  }

  .geocode-banner {
    flex-wrap: wrap;
    font-size: 0.8rem;
  }
}

.star-rating {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  grid-column: 1 / -1;
}

.star-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  color: #ccc;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.star-btn.active {
  color: #f5a623;
}

.star-btn:hover {
  color: #f5a623;
}

.clear-rating {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  margin-left: 0.4rem;
}

.edit-form textarea {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
}
</style>
