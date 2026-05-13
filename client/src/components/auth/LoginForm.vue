<template>
  <div class="auth-form">
    <h2>{{ t('auth.login') }}</h2>
    <p v-if="auth.error" class="error-msg">{{ auth.error }}</p>
    <form @submit.prevent="onSubmit">
      <div class="field">
        <label>{{ t('auth.email') }}</label>
        <input v-model="email" type="email" required autocomplete="email" />
      </div>
      <div class="field">
        <label>{{ t('auth.password') }}</label>
        <input v-model="password" type="password" required autocomplete="current-password" />
      </div>
      <button type="submit" class="btn-primary" :disabled="submitting">
        {{ t('auth.loginBtn') }}
      </button>
    </form>

    <div v-if="auth.oauthConfig.google || auth.oauthConfig.github" class="oauth-section">
      <p class="divider"><span>{{ t('auth.orLoginWith') }}</span></p>
      <div class="oauth-buttons">
        <a v-if="auth.oauthConfig.google" href="/api/auth/google" class="btn-oauth google">
          {{ t('auth.google') }}
        </a>
        <a v-if="auth.oauthConfig.github" href="/api/auth/github" class="btn-oauth github">
          {{ t('auth.github') }}
        </a>
      </div>
    </div>

    <p class="switch-link">
      <a href="#" @click.prevent="$emit('switch')">{{ t('auth.switchToRegister') }}</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

defineEmits<{ switch: [] }>();

const { t } = useI18n();
const auth = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const submitting = ref(false);

async function onSubmit() {
  submitting.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push('/map');
  } catch {
    // error is set in store
  } finally {
    submitting.value = false;
  }
}
</script>
