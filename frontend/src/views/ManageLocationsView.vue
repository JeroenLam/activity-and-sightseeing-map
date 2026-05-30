<template>
  <div class="page-container">
    <div class="page-header">
      <h2>{{ t('manage.title') }}</h2>
      <div class="header-actions">
        <button class="btn" @click="exportCsv">{{ t('manage.export') }}</button>
      </div>
    </div>

    <!-- Geocode failed banner -->
    <div v-if="failedLocations.length" class="geocode-banner">
      <span>⚠️ {{ t('manage.geocodeFailed', { count: failedLocations.length }) }}</span>
      <button class="btn btn-small" @click="retryAllGeocode" :disabled="retryingAll">
        {{ retryingAll ? t('manage.retrying') : t('manage.retryAll') }}
      </button>
    </div>

    <p v-if="locationsStore.loading" class="text-secondary">{{ t('common.loading') }}</p>
    <p v-else-if="!features.length" class="text-secondary">{{ t('manage.empty') }}</p>

    <template v-else>
      <!-- Search -->
      <div class="search-bar">
        <input v-model="search" type="text" :placeholder="t('manage.searchPlaceholder')" />
        <span class="search-count">{{ t('manage.showing', { shown: sortedLocations.length, total: features.length }) }}</span>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th @click="setSort('name')">{{ t('location.name') }} {{ sortIcon('name') }}</th>
              <th @click="setSort('type')">{{ t('location.type') }} {{ sortIcon('type') }}</th>
              <th @click="setSort('city')" class="hide-mobile">{{ t('location.city') }} {{ sortIcon('city') }}</th>
              <th @click="setSort('country')" class="hide-mobile">{{ t('location.country') }} {{ sortIcon('country') }}</th>
              <th @click="setSort('years')">{{ t('location.visitedYears') }} {{ sortIcon('years') }}</th>
              <th @click="setSort('rating')" class="hide-mobile">{{ t('location.rating') }} {{ sortIcon('rating') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(f, idx) in sortedLocations" :key="f.id ?? idx" :class="{ 'row-failed': isGeocodeFailed(f) }">
              <td>{{ f.properties.name }}</td>
              <td>
                <span v-if="f.properties.type" class="type-badge" :style="{ background: f.properties.type.color + '22', color: f.properties.type.color }">
                  {{ f.properties.type.name }}
                </span>
              </td>
              <td class="hide-mobile">{{ f.properties.city }}</td>
              <td class="hide-mobile">{{ f.properties.country }}</td>
              <td>
                <span v-if="f.properties.visited_unknown_year">?</span>
                <span v-else>{{ f.properties.years_visited.join(', ') }}</span>
              </td>
              <td class="hide-mobile">
                <span v-if="f.properties.rating" style="color: #f5a623">{{ '★'.repeat(f.properties.rating) }}</span>
              </td>
              <td class="actions-cell">
                <button class="btn btn-small" @click="openEdit(f)">{{ t('manage.edit') }}</button>
                <button class="btn btn-small btn-danger" @click="confirmDelete(f)">{{ t('manage.delete') }}</button>
                <button v-if="isGeocodeFailed(f)" class="btn btn-small" @click="retryGeocode(f)" :disabled="retrying === f.id">
                  {{ retrying === f.id ? '...' : t('manage.retry') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Edit dialog -->
    <div v-if="editing" class="overlay" @click.self="editing = null">
      <div class="dialog" style="max-width: 600px">
        <h3>{{ t('manage.editTitle') }}</h3>
        <div class="form-grid">
          <div class="field"><label>{{ t('location.name') }}</label><input v-model="editForm.name" /></div>
          <div class="field">
            <label>{{ t('location.type') }}</label>
            <select v-model="editForm.type_id">
              <option value="">—</option>
              <option v-for="lt in typesStore.types" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
            </select>
          </div>
          <div class="field"><label>{{ t('location.city') }}</label><input v-model="editForm.city" /></div>
          <div class="field"><label>{{ t('location.country') }}</label><input v-model="editForm.country" /></div>
          <div class="field"><label>{{ t('location.latitude') }}</label><input v-model.number="editForm.lat" type="number" step="any" /></div>
          <div class="field"><label>{{ t('location.longitude') }}</label><input v-model.number="editForm.lng" type="number" step="any" /></div>
        </div>
        <div class="field"><label>{{ t('location.link') }}</label><input v-model="editForm.link" type="url" /></div>
        <div class="field">
          <label>{{ t('location.rating') }}</label>
          <div class="star-rating">
            <button v-for="star in 5" :key="star" type="button" class="star-btn" :class="{ active: editForm.rating !== null && star <= editForm.rating }" @click="editForm.rating = star">★</button>
            <button v-if="editForm.rating !== null" type="button" class="clear-rating" @click="editForm.rating = null">×</button>
          </div>
        </div>
        <div class="field"><label>{{ t('location.note') }}</label><textarea v-model="editForm.comments" rows="2"></textarea></div>
        <div class="field">
          <label>{{ t('location.visitedYears') }}</label>
          <div class="year-chips">
            <span v-for="(year, i) in editForm.years_visited" :key="i" class="year-chip">
              {{ year }} <button type="button" @click="editForm.years_visited.splice(i, 1)">×</button>
            </span>
            <div class="add-year-inline">
              <input v-model.number="newYear" type="number" min="1900" :max="currentYear" class="year-input" />
              <button type="button" class="btn btn-small" @click="addEditYear">+</button>
            </div>
          </div>
          <label class="checkbox-label">
            <input type="checkbox" v-model="editForm.visited_unknown_year" />
            {{ t('location.visitedUnknownYear') }}
          </label>
        </div>
        <div class="dialog-actions">
          <button class="btn" @click="editing = null">{{ t('location.cancel') }}</button>
          <button class="btn btn-primary" @click="saveEdit" :disabled="saving">{{ t('location.save') }}</button>
        </div>
      </div>
    </div>

    <!-- Delete confirm dialog -->
    <div v-if="toDelete" class="overlay" @click.self="toDelete = null">
      <div class="dialog">
        <h3>{{ t('manage.delete') }}</h3>
        <p>{{ t('manage.deleteConfirm', { name: toDelete.properties.name }) }}</p>
        <div class="dialog-actions">
          <button class="btn" @click="toDelete = null">{{ t('manage.cancel') }}</button>
          <button class="btn btn-danger" @click="doDelete" :disabled="!!deleting">{{ t('manage.confirmBtn') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocationsStore } from '@/stores/locations';
import { useTypesStore } from '@/stores/types';
import type { LocationFeature } from '@/types';

const { t } = useI18n();
const locationsStore = useLocationsStore();
const typesStore = useTypesStore();

const search = ref('');
const sortKey = ref<string>('name');
const sortAsc = ref(true);
const currentYear = new Date().getFullYear();
const newYear = ref(currentYear);

// Edit
const editing = ref<LocationFeature | null>(null);
const saving = ref(false);
const editForm = reactive({
  name: '', type_id: '', city: '', country: '', link: '',
  lat: 0, lng: 0,
  rating: null as number | null, comments: '',
  years_visited: [] as number[], visited_unknown_year: false,
});

// Delete
const toDelete = ref<LocationFeature | null>(null);
const deleting = ref<string | null>(null);

// Geocode retry
const retrying = ref<string | null>(null);
const retryingAll = ref(false);

const features = computed(() => locationsStore.collection.features);

function isGeocodeFailed(f: LocationFeature): boolean {
  const [lng, lat] = f.geometry.coordinates;
  return lat === 0 && lng === 0;
}

const failedLocations = computed(() => features.value.filter(isGeocodeFailed));

const filteredLocations = computed(() => {
  const q = search.value.toLowerCase();
  if (!q) return features.value;
  return features.value.filter((f) => {
    const p = f.properties;
    return (
      p.name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      (p.type?.name || '').toLowerCase().includes(q) ||
      p.years_visited.some((y) => String(y).includes(q))
    );
  });
});

const sortedLocations = computed(() => {
  const dir = sortAsc.value ? 1 : -1;
  return [...filteredLocations.value].sort((a, b) => {
    let cmp = 0;
    const ap = a.properties, bp = b.properties;
    switch (sortKey.value) {
      case 'name': cmp = ap.name.localeCompare(bp.name); break;
      case 'type': cmp = (ap.type?.name || '').localeCompare(bp.type?.name || ''); break;
      case 'city': cmp = ap.city.localeCompare(bp.city); break;
      case 'country': cmp = ap.country.localeCompare(bp.country); break;
      case 'years': {
        const aY = ap.years_visited.length ? Math.min(...ap.years_visited) : ap.visited_unknown_year ? 0 : Infinity;
        const bY = bp.years_visited.length ? Math.min(...bp.years_visited) : bp.visited_unknown_year ? 0 : Infinity;
        cmp = aY - bY; break;
      }
      case 'rating': cmp = (ap.rating ?? 0) - (bp.rating ?? 0); break;
    }
    return cmp * dir;
  });
});

function setSort(key: string) {
  if (sortKey.value === key) { sortAsc.value = !sortAsc.value; }
  else { sortKey.value = key; sortAsc.value = true; }
}

function sortIcon(key: string): string {
  if (sortKey.value !== key) return '';
  return sortAsc.value ? '▲' : '▼';
}

function exportCsv() {
  const header = ['name', 'type', 'city', 'country', 'link', 'visited', 'latitude', 'longitude', 'rating', 'note'];
  const rows = sortedLocations.value.map((f) => {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const visited = p.visited_unknown_year ? '-' : p.years_visited.join(', ');
    return [p.name, p.type?.name || '', p.city, p.country, p.link || '', visited, String(lat), String(lng), p.rating != null ? String(p.rating) : '', p.comments || '']
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',');
  });
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'locations.csv'; a.click();
  URL.revokeObjectURL(url);
}

function openEdit(f: LocationFeature) {
  editing.value = f;
  const [lng, lat] = f.geometry.coordinates;
  editForm.name = f.properties.name;
  editForm.type_id = f.properties.type?.id || '';
  editForm.city = f.properties.city;
  editForm.country = f.properties.country;
  editForm.link = f.properties.link || '';
  editForm.lat = lat;
  editForm.lng = lng;
  editForm.rating = f.properties.rating;
  editForm.comments = f.properties.comments || '';
  editForm.years_visited = [...f.properties.years_visited];
  editForm.visited_unknown_year = f.properties.visited_unknown_year;
  newYear.value = currentYear;
}

function addEditYear() {
  if (newYear.value && !editForm.years_visited.includes(newYear.value)) {
    editForm.years_visited.push(newYear.value);
    editForm.years_visited.sort((a, b) => a - b);
  }
}

async function saveEdit() {
  if (!editing.value?.id) return;
  saving.value = true;
  try {
    await locationsStore.updateLocation(editing.value.id, {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [editForm.lng, editForm.lat] },
      properties: {
        name: editForm.name,
        type_id: editForm.type_id || null,
        city: editForm.city,
        country: editForm.country,
        link: editForm.link || null,
        rating: editForm.rating,
        comments: editForm.comments || null,
        years_visited: editForm.years_visited,
        visited_unknown_year: editForm.visited_unknown_year,
      },
    });
    editing.value = null;
  } finally { saving.value = false; }
}

function confirmDelete(f: LocationFeature) { toDelete.value = f; }

async function doDelete() {
  if (!toDelete.value?.id) return;
  deleting.value = toDelete.value.id;
  try {
    await locationsStore.deleteLocation(toDelete.value.id);
  } finally { deleting.value = null; toDelete.value = null; }
}

async function retryGeocode(f: LocationFeature) {
  if (!f.id) return;
  retrying.value = f.id;
  try { await locationsStore.geocodeLocation(f.id); } catch {}
  finally { retrying.value = null; }
}

async function retryAllGeocode() {
  retryingAll.value = true;
  for (const f of failedLocations.value) {
    if (!f.id) continue;
    retrying.value = f.id;
    try { await locationsStore.geocodeLocation(f.id); await new Promise((r) => setTimeout(r, 1200)); } catch {}
    retrying.value = null;
  }
  retryingAll.value = false;
}

onMounted(async () => {
  await Promise.all([locationsStore.fetchLocations(), typesStore.fetchTypes()]);
});
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

.page-header h2 { margin: 0; }
.header-actions { display: flex; gap: 0.5rem; }

.geocode-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  margin-bottom: 1rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #92400e;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.search-bar input { max-width: 300px; }

.search-count {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.table-wrap { overflow-x: auto; }

.row-failed { background: #fef3c7 !important; }

.type-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
}

.actions-cell {
  display: flex;
  gap: 0.3rem;
  white-space: nowrap;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.star-rating { display: flex; align-items: center; gap: 0.2rem; }
.star-btn { background: none; border: none; font-size: 1.4rem; color: #ccc; cursor: pointer; padding: 0; }
.star-btn.active { color: #f5a623; }
.clear-rating { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--color-text-secondary); margin-left: 0.4rem; }

.year-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center; }
.year-chip { display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.15rem 0.4rem; background: var(--color-primary-light); color: var(--color-primary); border-radius: 10px; font-size: 0.75rem; }
.year-chip button { background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 0.9rem; padding: 0; }
.add-year-inline { display: flex; gap: 0.25rem; align-items: center; }
.year-input { width: 70px; padding: 0.2rem 0.4rem; font-size: 0.8rem; }
.checkbox-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; margin-top: 0.25rem; }
.checkbox-label input { width: auto; }

@media (max-width: 768px) {
  .page-container { padding: 1rem; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
