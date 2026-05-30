<template>
  <div>
    <h2>{{ t('auth.login') }}</h2>
    <form @submit.prevent="onSubmit">
      <div class="field">
        <label>{{ t('auth.email') }}</label>
        <input v-model="email" type="email" required autocomplete="email" />
      </div>
      <div class="field">
        <label>{{ t('auth.password') }}</label>
        <input v-model="password" type="password" required autocomplete="current-password" />
      </div>
      <p v-if="auth.error" class="text-error">{{ auth.error }}</p>
      <button type="submit" class="btn btn-primary" style="width: 100%" :disabled="loading">
        {{ t('auth.loginBtn') }}
      </button>
    </form>
    <div v-if="auth.oauthConfig.google" class="oauth-section">
      <p class="oauth-divider">{{ t('auth.orLoginWith') }}</p>
      <a href="/api/auth/google" class="btn" style="width: 100%; justify-content: center">
        {{ t('auth.google') }}
      </a>
    </div>
    <p class="switch-link" @click="$emit('switch')">{{ t('auth.switchToRegister') }}</p>
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

const email = ref('');
const password = ref('');
const loading = ref(false);

defineEmits<{ switch: [] }>();

async function onSubmit() {
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push('/');
  } catch {} finally { loading.value = false; }
}
</script>

<style scoped>
h2 { margin: 0 0 1.25rem; text-align: center; }
.oauth-section { margin-top: 1rem; }
.oauth-divider { text-align: center; font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 0.5rem; }
.switch-link { margin-top: 1rem; text-align: center; font-size: 0.85rem; color: var(--color-primary); cursor: pointer; }
.switch-link:hover { text-decoration: underline; }
</style>
