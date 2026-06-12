<template>
  <div class="page-container">
    <h2>{{ t('profile.title') }}</h2>

    <!-- User info -->
    <div class="profile-card">
      <div class="profile-field">
        <label>{{ t('auth.displayName') }}</label>
        <span>{{ auth.user?.display_name }}</span>
      </div>
      <div class="profile-field">
        <label>{{ t('auth.email') }}</label>
        <span>{{ auth.user?.email }}</span>
      </div>
    </div>

    <!-- Default map position -->
    <h3>{{ t('profile.defaultMapPosition') }}</h3>
    <div class="map-picker-section">
      <p class="hint">{{ t('profile.defaultMapHint') }}</p>
      <div class="map-picker" ref="mapPickerEl"></div>
      <div class="map-coords">
        <span>{{ t('profile.lat') }}: {{ mapLat.toFixed(4) }}</span>
        <span>{{ t('profile.lng') }}: {{ mapLng.toFixed(4) }}</span>
        <span>{{ t('profile.zoom') }}: {{ mapZoom }}</span>
      </div>
      <button class="btn btn-primary" @click="saveMapPosition" :disabled="savingMap">
        {{ savingMap ? '...' : t('profile.saveMapPosition') }}
      </button>
      <p v-if="mapSaved" class="text-success">{{ t('common.success') }}</p>
    </div>

    <!-- Sharing settings -->
    <h3>{{ t('profile.sharing') }}</h3>
    <div class="settings-card">
      <div class="setting-row">
        <label>{{ t('profile.profilePublic') }}</label>
        <input type="checkbox" v-model="shareSettings.profile_public" @change="saveShareSettings" />
      </div>
      <div class="setting-row" v-if="shareSettings.profile_public">
        <label>{{ t('profile.shareLink') }}</label>
        <div class="share-link-row">
          <input type="text" readonly :value="publicUrl" class="share-url" />
          <button class="btn btn-small" @click="copyShareLink">{{ t('profile.copyLink') }}</button>
        </div>
      </div>
      <div class="setting-row" v-if="shareSettings.profile_public">
        <label>{{ t('profile.locationFilter') }}</label>
        <select v-model="shareSettings.location_filter" @change="saveShareSettings">
          <option value="show-all">{{ t('profile.filterShowAll') }}</option>
          <option value="visited-only">{{ t('profile.filterVisitedOnly') }}</option>
          <option value="unvisited-only">{{ t('profile.filterUnvisitedOnly') }}</option>
        </select>
      </div>
      <div class="setting-row" v-if="shareSettings.profile_public">
        <label>{{ t('profile.showRatings') }}</label>
        <input type="checkbox" v-model="shareSettings.show_ratings" @change="saveShareSettings" />
      </div>
      <div class="setting-row" v-if="shareSettings.profile_public">
        <label>{{ t('profile.showComments') }}</label>
        <input type="checkbox" v-model="shareSettings.show_comments" @change="saveShareSettings" />
      </div>
    </div>

    <!-- Change password -->
    <h3>{{ t('profile.changePassword') }}</h3>
    <form class="password-form" @submit.prevent="onSubmit">
      <div class="form-group">
        <label for="currentPassword">{{ t('profile.currentPassword') }}</label>
        <input id="currentPassword" v-model="currentPassword" type="password" autocomplete="current-password" required />
      </div>
      <div class="form-group">
        <label for="newPassword">{{ t('profile.newPassword') }}</label>
        <input id="newPassword" v-model="newPassword" type="password" autocomplete="new-password" minlength="8" required />
      </div>
      <div class="form-group">
        <label for="confirmPassword">{{ t('profile.confirmPassword') }}</label>
        <input id="confirmPassword" v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required />
      </div>
      <p v-if="errorMsg" class="text-error">{{ errorMsg }}</p>
      <p v-if="successMsg" class="text-success">{{ successMsg }}</p>
      <button type="submit" class="btn btn-primary" :disabled="saving">
        {{ saving ? '...' : t('profile.savePassword') }}
      </button>
    </form>

    <!-- Danger zone -->
    <h3 class="danger-title">{{ t('profile.dangerZone') }}</h3>
    <div class="danger-card">
      <div class="danger-row">
        <div>
          <strong>{{ t('profile.deleteAllLocations') }}</strong>
          <p class="hint">{{ t('profile.deleteAllLocationsHint') }}</p>
        </div>
        <button class="btn btn-danger" @click="confirmDeleteLocations">{{ t('common.delete') }}</button>
      </div>
      <div class="danger-row">
        <div>
          <strong>{{ t('profile.deleteAllTypes') }}</strong>
          <p class="hint">{{ t('profile.deleteAllTypesHint') }}</p>
        </div>
        <button class="btn btn-danger" @click="confirmDeleteTypes">{{ t('common.delete') }}</button>
      </div>
    </div>

    <!-- Confirmation dialog -->
    <div v-if="confirmAction" class="overlay" @click.self="confirmAction = null">
      <div class="dialog">
        <h3>{{ t('profile.confirmTitle') }}</h3>
        <p>{{ confirmMessage }}</p>
        <p class="text-error confirm-warning">{{ t('profile.cannotBeUndone') }}</p>
        <div class="dialog-actions">
          <button class="btn" @click="confirmAction = null">{{ t('common.cancel') }}</button>
          <button class="btn btn-danger" @click="executeConfirm" :disabled="deleting">
            {{ deleting ? '...' : t('common.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { useLocationsStore } from '@/stores/locations';
import { useTypesStore } from '@/stores/types';
import L from 'leaflet';

const { t } = useI18n();
const auth = useAuthStore();
const settingsStore = useSettingsStore();
const locationsStore = useLocationsStore();
const typesStore = useTypesStore();

// Password
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const saving = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// Map position
const mapPickerEl = ref<HTMLElement>();
const mapLat = ref(52.1);
const mapLng = ref(5.3);
const mapZoom = ref(7);
const savingMap = ref(false);
const mapSaved = ref(false);
let pickerMap: L.Map | null = null;

// Share settings
const shareSettings = reactive({
  profile_public: false,
  location_filter: 'show-all',
  show_ratings: true,
  show_comments: true,
});

// Danger zone
const confirmAction = ref<'locations' | 'types' | null>(null);
const confirmMessage = ref('');
const deleting = ref(false);

const publicUrl = computed(() => {
  if (!auth.user) return '';
  return `${window.location.origin}/public/${auth.user.id}`;
});

onMounted(async () => {
  await settingsStore.fetchSettings();
  const s = settingsStore.settings;
  mapLat.value = s.default_map_lat ?? 52.1;
  mapLng.value = s.default_map_lng ?? 5.3;
  mapZoom.value = s.default_map_zoom ?? 7;
  shareSettings.profile_public = s.profile_public;
  shareSettings.location_filter = s.location_filter;
  shareSettings.show_ratings = s.show_ratings;
  shareSettings.show_comments = s.show_comments;

  await nextTick();
  initMapPicker();
});

function initMapPicker() {
  if (!mapPickerEl.value || pickerMap) return;
  pickerMap = L.map(mapPickerEl.value).setView([mapLat.value, mapLng.value], mapZoom.value);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(pickerMap);
  pickerMap.on('moveend', () => {
    if (!pickerMap) return;
    const center = pickerMap.getCenter();
    mapLat.value = center.lat;
    mapLng.value = center.lng;
    mapZoom.value = pickerMap.getZoom();
  });
}

async function saveMapPosition() {
  savingMap.value = true;
  mapSaved.value = false;
  try {
    await settingsStore.updateSettings({
      default_map_lat: mapLat.value,
      default_map_lng: mapLng.value,
      default_map_zoom: mapZoom.value,
    });
    mapSaved.value = true;
  } finally {
    savingMap.value = false;
  }
}

async function saveShareSettings() {
  await settingsStore.updateSettings({
    profile_public: shareSettings.profile_public,
    location_filter: shareSettings.location_filter,
    show_ratings: shareSettings.show_ratings,
    show_comments: shareSettings.show_comments,
  });
}

function copyShareLink() {
  navigator.clipboard.writeText(publicUrl.value);
}

function confirmDeleteLocations() {
  confirmAction.value = 'locations';
  confirmMessage.value = t('profile.confirmDeleteLocations', { count: locationsStore.collection.features.length });
}

function confirmDeleteTypes() {
  confirmAction.value = 'types';
  confirmMessage.value = t('profile.confirmDeleteTypes', { count: typesStore.types.length });
}

async function executeConfirm() {
  deleting.value = true;
  try {
    if (confirmAction.value === 'locations') {
      await locationsStore.deleteAll();
    } else if (confirmAction.value === 'types') {
      await typesStore.deleteAll();
    }
    confirmAction.value = null;
  } finally {
    deleting.value = false;
  }
}

async function onSubmit() {
  errorMsg.value = ''; successMsg.value = '';
  if (newPassword.value !== confirmPassword.value) { errorMsg.value = t('profile.passwordsMismatch'); return; }
  if (newPassword.value.length < 8) { errorMsg.value = t('auth.errorMinPassword'); return; }
  saving.value = true;
  try {
    await auth.changePassword(currentPassword.value, newPassword.value);
    successMsg.value = t('profile.passwordChanged');
    currentPassword.value = ''; newPassword.value = ''; confirmPassword.value = '';
  } catch (err: any) {
    errorMsg.value = err.response?.data?.detail || t('profile.passwordError');
  } finally { saving.value = false; }
}
</script>

<style scoped>
.page-container { max-width: 600px; margin: 0 auto; padding: 1.5rem; }
.page-container h2 { margin: 0 0 1rem; }
.page-container h3 { margin: 1.5rem 0 0.75rem; }

.profile-card, .settings-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-field { display: flex; gap: 0.75rem; font-size: 0.9rem; }
.profile-field label { font-weight: 600; min-width: 100px; color: var(--color-text-secondary); }

.map-picker-section { display: flex; flex-direction: column; gap: 0.5rem; }
.map-picker { height: 250px; border-radius: 8px; border: 1px solid var(--color-border); z-index: 0; }
.map-coords { display: flex; gap: 1rem; font-size: 0.8rem; color: var(--color-text-secondary); }

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.4rem 0;
}
.setting-row label { font-size: 0.9rem; }
.setting-row select { max-width: 180px; }
.setting-row input[type="checkbox"] { width: auto; }

.share-link-row { display: flex; gap: 0.4rem; align-items: center; flex: 1; }
.share-url { flex: 1; font-size: 0.8rem; padding: 0.3rem 0.5rem; }

.password-form { display: flex; flex-direction: column; gap: 0.75rem; }

.danger-title { color: var(--color-danger, #dc3545); }
.danger-card {
  border: 1px solid var(--color-danger, #dc3545);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.danger-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.danger-row .hint { margin: 0.2rem 0 0; }

.btn-danger {
  background: var(--color-danger, #dc3545);
  color: #fff;
  border-color: var(--color-danger, #dc3545);
}
.btn-danger:hover { opacity: 0.9; }

.confirm-warning { font-weight: 600; }

.hint { font-size: 0.8rem; color: var(--color-text-secondary); }

@media (max-width: 768px) {
  .page-container { padding: 1rem; }
  .profile-field { flex-direction: column; gap: 0.15rem; }
  .profile-field label { min-width: unset; }
  .danger-row { flex-direction: column; align-items: flex-start; }
  .setting-row { flex-direction: column; align-items: flex-start; gap: 0.35rem; }
  .setting-row select { max-width: 100%; }
  .share-link-row { flex-direction: column; align-items: stretch; }
  .map-picker { height: 200px; }
  .map-coords { flex-wrap: wrap; }
}
</style>
