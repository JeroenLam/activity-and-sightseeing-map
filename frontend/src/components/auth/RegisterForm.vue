<template>
  <div>
    <h2>{{ t('auth.register') }}</h2>
    <form @submit.prevent="onSubmit">
      <div class="field">
        <label>{{ t('auth.displayName') }}</label>
        <input v-model="displayName" type="text" required />
      </div>
      <div class="field">
        <label>{{ t('auth.email') }}</label>
        <input v-model="email" type="email" required autocomplete="email" />
      </div>
      <div class="field">
        <label>{{ t('auth.password') }}</label>
        <input v-model="password" type="password" required autocomplete="new-password" minlength="8" />
      </div>
      <p v-if="auth.error" class="text-error">{{ auth.error }}</p>
      <button type="submit" class="btn btn-primary" style="width: 100%" :disabled="loading">
        {{ t('auth.registerBtn') }}
      </button>
    </form>
    <p class="switch-link" @click="$emit('switch')">{{ t('auth.switchToLogin') }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const displayName = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);

defineEmits<{ switch: [] }>();

async function onSubmit() {
  loading.value = true;
  try {
    await auth.register(email.value, password.value, displayName.value);
    router.push('/');
  } catch {} finally { loading.value = false; }
}
</script>

<style scoped>
h2 { margin: 0 0 1.25rem; text-align: center; }
.switch-link { margin-top: 1rem; text-align: center; font-size: 0.85rem; color: var(--color-primary); cursor: pointer; }
.switch-link:hover { text-decoration: underline; }
</style>
