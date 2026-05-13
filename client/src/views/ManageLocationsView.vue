<template>
  <div class="page-container">
    <h2>{{ t('manage.title') }}</h2>

    <div v-if="locationsStore.loading" class="loading">{{ t('app.loading') }}</div>

    <div v-else-if="locationsStore.locations.length === 0" class="empty">
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

      <div class="locations-list">
        <div
          v-for="loc in filteredLocations"
          :key="loc.id"
          class="location-row"
          :class="{ 'geocode-failed': isGeocodeFailed(loc) }"
        >
          <span
            class="type-dot"
            :style="{ background: getTypeColor(loc.type) }"
          ></span>
          <div class="location-info">
            <strong>{{ loc.name }}</strong>
            <span class="location-meta">
              {{ getTypeName(loc.type) }} · {{ loc.city
              }}{{ loc.country ? ', ' + loc.country : '' }}
              <template v-if="loc.visitedYears.length">
                · 📅 {{ loc.visitedYears.join(', ') }}
              </template>
              <template v-else-if="loc.visitedUnknownYear">
                · 📅 ?
              </template>
            </span>
            <span v-if="isGeocodeFailed(loc)" class="geocode-warning">
              ⚠️ {{ t('manage.noCoordinates') }}
            </span>
          </div>
          <div class="location-actions">
            <button
              v-if="isGeocodeFailed(loc)"
              class="btn-ghost btn-small"
              :disabled="retrying === loc.id"
              @click="retryGeocode(loc)"
            >
              🔄 {{ retrying === loc.id ? '...' : t('manage.retry') }}
            </button>
            <button
              class="btn-ghost btn-small"
              @click="openEdit(loc)"
            >
              ✏️ {{ t('manage.edit') }}
            </button>
            <button
              class="btn-ghost btn-danger btn-small"
              :disabled="deleting === loc.id"
              @click="confirmDelete(loc)"
            >
              🗑️ {{ t('manage.delete') }}
            </button>
          </div>
        </div>
      </div>

      <p class="count">
        {{ t('manage.showing', { shown: filteredLocations.length, total: locationsStore.locations.length }) }}
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
            <option v-for="lt in typesStore.types" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
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
import type { Location } from '@/types';

const { t } = useI18n();
const locationsStore = useLocationsStore();
const typesStore = useTypesStore();

const currentYear = new Date().getFullYear();
const search = ref('');
const deleting = ref<string | null>(null);
const toDelete = ref<Location | null>(null);
const retrying = ref<string | null>(null);
const retryingAll = ref(false);

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
  const list = locationsStore.locations;
  if (!q) return list;
  return list.filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.country.toLowerCase().includes(q) ||
      getTypeName(l.type).toLowerCase().includes(q)
  );
});

function getTypeName(typeId: string): string {
  return typesStore.getTypeById(typeId)?.name ?? typeId;
}

function getTypeColor(typeId: string): string {
  return typesStore.getTypeById(typeId)?.color ?? '#9E9E9E';
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
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
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
  margin-bottom: 1rem;
}

.locations-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: box-shadow 0.15s;
}

.location-row:hover {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.location-row.geocode-failed {
  border-color: #f59e0b;
  background: #fffbeb;
}

.type-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.location-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.location-info strong {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-meta {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.geocode-warning {
  font-size: 0.75rem;
  color: #b45309;
}

.location-actions {
  flex-shrink: 0;
  display: flex;
  gap: 0.25rem;
}

.btn-small {
  font-size: 0.78rem;
  padding: 0.2rem 0.5rem;
}

.btn-danger:hover {
  color: var(--color-error) !important;
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
</style>
