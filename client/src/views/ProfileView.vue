<template>
  <div class="page-container">
    <h2>{{ t('profile.title') }}</h2>

    <div class="profile-card">
      <div class="profile-field">
        <label>{{ t('auth.displayName') }}</label>
        <span>{{ auth.user?.displayName }}</span>
      </div>
      <div class="profile-field">
        <label>{{ t('auth.email') }}</label>
        <span>{{ auth.user?.email }}</span>
      </div>
    </div>

    <h3>{{ t('profile.changePassword') }}</h3>
    <form class="password-form" @submit.prevent="onSubmit">
      <div class="form-group">
        <label for="currentPassword">{{ t('profile.currentPassword') }}</label>
        <input
          id="currentPassword"
          v-model="currentPassword"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <div class="form-group">
        <label for="newPassword">{{ t('profile.newPassword') }}</label>
        <input
          id="newPassword"
          v-model="newPassword"
          type="password"
          autocomplete="new-password"
          minlength="8"
          required
        />
      </div>
      <div class="form-group">
        <label for="confirmPassword">{{ t('profile.confirmPassword') }}</label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          minlength="8"
          required
        />
      </div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      <button type="submit" class="btn btn-primary" :disabled="saving">
        {{ saving ? '...' : t('profile.savePassword') }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const saving = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

async function onSubmit() {
  errorMsg.value = '';
  successMsg.value = '';

  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = t('profile.passwordsMismatch');
    return;
  }
  if (newPassword.value.length < 8) {
    errorMsg.value = t('auth.errorMinPassword');
    return;
  }

  saving.value = true;
  try {
    await auth.changePassword(currentPassword.value, newPassword.value);
    successMsg.value = t('profile.passwordChanged');
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err: any) {
    errorMsg.value = err.response?.data?.error || t('profile.passwordError');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.page-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 1.5rem;
}

.page-container h2 {
  margin: 0 0 1rem;
}

.page-container h3 {
  margin: 1.5rem 0 0.75rem;
}

.profile-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-field {
  display: flex;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.profile-field label {
  font-weight: 600;
  min-width: 100px;
  color: var(--color-text-secondary);
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
}

.form-group input {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.9rem;
}

.error-msg {
  color: var(--color-error);
  font-size: 0.85rem;
  margin: 0;
}

.success-msg {
  color: var(--color-success, #22c55e);
  font-size: 0.85rem;
  margin: 0;
}

@media (max-width: 768px) {
  .page-container {
    padding: 1rem;
  }

  .profile-field {
    flex-direction: column;
    gap: 0.15rem;
  }

  .profile-field label {
    min-width: unset;
  }
}
</style>
