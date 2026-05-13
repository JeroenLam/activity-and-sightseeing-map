<template>
  <form class="location-form" @submit.prevent="onSubmit">
    <h2>{{ t('location.add') }}</h2>

    <!-- Geocoding search -->
    <div class="field">
      <label>{{ t('location.search') }}</label>
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="t('location.searchPlaceholder')"
        @input="geocoding.search(searchQuery)"
      />
      <ul v-if="geocoding.results.value.length" class="search-results">
        <li
          v-for="result in geocoding.results.value"
          :key="result.place_id"
          @click="selectResult(result)"
        >
          {{ result.display_name }}
        </li>
      </ul>
      <p class="hint">{{ t('location.clickMapHint') }}</p>
    </div>

    <div class="form-grid">
      <div class="field">
        <label>{{ t('location.name') }} *</label>
        <input v-model="form.name" type="text" required />
      </div>

      <div class="field">
        <label>{{ t('location.type') }} *</label>
        <select v-model="form.type" required>
          <option value="" disabled>—</option>
          <option v-for="lt in typesStore.types" :key="lt.id" :value="lt.id">
            {{ lt.name }}
          </option>
        </select>
      </div>

      <div class="field">
        <label>{{ t('location.city') }}</label>
        <input v-model="form.city" type="text" />
      </div>

      <div class="field">
        <label>{{ t('location.country') }}</label>
        <input v-model="form.country" type="text" />
      </div>

      <div class="field">
        <label>{{ t('location.latitude') }}</label>
        <input v-model.number="form.latitude" type="number" step="any" required />
      </div>

      <div class="field">
        <label>{{ t('location.longitude') }}</label>
        <input v-model.number="form.longitude" type="number" step="any" required />
      </div>
    </div>

    <div class="field">
      <label>{{ t('location.link') }}</label>
      <input v-model="form.link" type="url" placeholder="https://..." />
    </div>

    <!-- Visited years -->
    <div class="field">
      <label>{{ t('location.visitedYears') }}</label>
      <div class="year-chips">
        <span v-for="(year, i) in form.visitedYears" :key="i" class="year-chip">
          {{ year }}
          <button type="button" class="chip-remove" @click="form.visitedYears.splice(i, 1)">×</button>
        </span>
        <div class="add-year">
          <input v-model.number="newYear" type="number" min="1900" :max="new Date().getFullYear()" placeholder="Jaar" class="year-input" />
          <button type="button" class="btn-small" @click="addYear">{{ t('location.addYear') }}</button>
        </div>
      </div>
      <label class="checkbox-label">
        <input type="checkbox" v-model="form.visitedUnknownYear" />
        {{ t('location.visitedUnknownYear') }}
      </label>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn-primary" :disabled="saving">
        {{ t('location.save') }}
      </button>
    </div>

    <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTypesStore } from '@/stores/types';
import { useLocationsStore } from '@/stores/locations';
import { useGeocoding } from '@/composables/useGeocoding';

const { t } = useI18n();
const typesStore = useTypesStore();
const locationsStore = useLocationsStore();
const geocoding = useGeocoding();

const searchQuery = ref('');
const newYear = ref<number | undefined>(undefined);
const saving = ref(false);
const successMsg = ref('');

const form = reactive({
  name: '',
  type: '',
  city: '',
  country: '',
  link: '',
  latitude: 0,
  longitude: 0,
  visitedYears: [] as number[],
  visitedUnknownYear: false,
});

function selectResult(result: any) {
  form.latitude = parseFloat(result.lat);
  form.longitude = parseFloat(result.lon);
  // Try to extract city/country from display name
  const parts = result.display_name.split(',').map((s: string) => s.trim());
  if (!form.name) form.name = parts[0] || '';
  geocoding.clear();
  searchQuery.value = result.display_name;
}

function addYear() {
  if (newYear.value && !form.visitedYears.includes(newYear.value)) {
    form.visitedYears.push(newYear.value);
    form.visitedYears.sort((a, b) => a - b);
    newYear.value = undefined;
  }
}

async function onSubmit() {
  saving.value = true;
  successMsg.value = '';
  try {
    await locationsStore.createLocation({
      name: form.name,
      type: form.type,
      city: form.city,
      country: form.country,
      link: form.link || null,
      latitude: form.latitude,
      longitude: form.longitude,
      visitedYears: form.visitedYears,
      visitedUnknownYear: form.visitedUnknownYear,
    });
    successMsg.value = t('location.saved');
    // Reset form
    form.name = '';
    form.type = '';
    form.city = '';
    form.country = '';
    form.link = '';
    form.latitude = 0;
    form.longitude = 0;
    form.visitedYears = [];
    form.visitedUnknownYear = false;
    searchQuery.value = '';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.location-form {
  max-width: 640px;
}

.location-form h2 {
  margin: 0 0 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.search-results {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  background: var(--color-surface);
}

.search-results li {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
}

.search-results li:hover {
  background: var(--color-bg);
}

.search-results li:last-child {
  border-bottom: none;
}

.hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin: 0.25rem 0 0;
}

.year-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.year-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-primary);
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}

.add-year {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.year-input {
  width: 80px;
  padding: 0.25rem 0.4rem;
  font-size: 0.8rem;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.form-actions {
  margin-top: 1.25rem;
}

.success-msg {
  color: var(--color-success);
  font-weight: 500;
  margin-top: 0.75rem;
}
</style>
