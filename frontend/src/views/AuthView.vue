<template>
  <div class="auth-page">
    <div class="auth-card">
      <LoginForm v-if="mode === 'login'" @switch="mode = 'register'" />
      <RegisterForm v-else @switch="mode = 'login'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import LoginForm from '@/components/auth/LoginForm.vue';
import RegisterForm from '@/components/auth/RegisterForm.vue';

const mode = ref<'login' | 'register'>('login');
const auth = useAuthStore();
onMounted(() => auth.fetchOAuthConfig());
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height));
  padding: 1rem;
}

.auth-card {
  background: var(--color-surface);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 400px;
}

@media (max-width: 768px) {
  .auth-page { align-items: flex-start; padding-top: 2rem; }
  .auth-card { padding: 1.5rem; }
}
</style>
