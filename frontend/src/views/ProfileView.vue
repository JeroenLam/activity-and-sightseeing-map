<template>
  <div class="profile-view">
    <h2>{{ $t('settings.title') }}</h2>

    <section>
      <h3>{{ $t('settings.language') }}</h3>
      <select :value="settingsStore.settings.preferred_language" @change="onLanguageChange">
        <option value="nl">Nederlands</option>
        <option value="en">English</option>
      </select>
    </section>

    <section>
      <h3>{{ $t('settings.darkMode') }}</h3>
      <label>
        <input type="checkbox" :checked="themeStore.dark" @change="themeStore.toggle()" />
        {{ $t('settings.darkMode') }}
      </label>
    </section>

    <section>
      <h3>{{ $t('settings.defaultMap') }}</h3>
      <p v-if="settingsStore.settings.default_map_lat">
        {{ settingsStore.settings.default_map_lat?.toFixed(4) }},
        {{ settingsStore.settings.default_map_lng?.toFixed(4) }}
        (zoom: {{ settingsStore.settings.default_map_zoom }})
      </p>
      <p v-else>{{ $t('map.resetView') }}</p>
    </section>

    <section>
      <h3>{{ $t('settings.publicProfile') }}</h3>
      <label>
        <input
          type="checkbox"
          :checked="settingsStore.settings.profile_public"
          @change="onPublicToggle"
        />
        {{ $t('settings.publicProfile') }}
      </label>
      <div v-if="settingsStore.settings.profile_public">
        <label>
          <input
            type="checkbox"
            :checked="settingsStore.settings.show_ratings"
            @change="settingsStore.updateSettings({ show_ratings: !settingsStore.settings.show_ratings })"
          />
          {{ $t('settings.showRatings') }}
        </label>
        <label>
          <input
            type="checkbox"
            :checked="settingsStore.settings.show_comments"
            @change="settingsStore.updateSettings({ show_comments: !settingsStore.settings.show_comments })"
          />
          {{ $t('settings.showComments') }}
        </label>
      </div>
    </section>

    <section>
      <h3>{{ $t('settings.changePassword') }}</h3>
      <form @submit.prevent="onChangePassword">
        <input v-model="currentPassword" type="password" :placeholder="$t('settings.currentPassword')" />
        <input v-model="newPassword" type="password" :placeholder="$t('settings.newPassword')" />
        <button type="submit">{{ $t('common.save') }}</button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const themeStore = useThemeStore();

const currentPassword = ref('');
const newPassword = ref('');

onMounted(async () => {
  await settingsStore.fetchSettings();
});

async function onLanguageChange(event: Event) {
  const lang = (event.target as HTMLSelectElement).value;
  await settingsStore.updateSettings({ preferred_language: lang });
  await authStore.updateProfile(undefined, lang);
}

async function onPublicToggle() {
  await settingsStore.updateSettings({ profile_public: !settingsStore.settings.profile_public });
}

async function onChangePassword() {
  await authStore.changePassword(currentPassword.value, newPassword.value);
  currentPassword.value = '';
  newPassword.value = '';
}
</script>
