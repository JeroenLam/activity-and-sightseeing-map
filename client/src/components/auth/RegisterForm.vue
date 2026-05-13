<template>
  <div class="auth-form">
    <h2>{{ t('auth.register') }}</h2>
    <p v-if="auth.error" class="error-msg">{{ auth.error }}</p>
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
        <input v-model="password" type="password" required minlength="8" autocomplete="new-password" />
      </div>
      <button type="submit" class="btn-primary" :disabled="submitting">
        {{ t('auth.registerBtn') }}
      </button>
    </form>
    <p class="switch-link">
      <a href="#" @click.prevent="$emit('switch')">{{ t('auth.switchToLogin') }}</a>
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

const displayName = ref('');
const email = ref('');
const password = ref('');
const submitting = ref(false);

async function onSubmit() {
  submitting.value = true;
  try {
    await auth.register(email.value, password.value, displayName.value);
    router.push('/map');
  } catch {
    // error is set in store
  } finally {
    submitting.value = false;
  }
}
</script>
