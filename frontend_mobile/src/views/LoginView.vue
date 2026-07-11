<template>
  <section class="card stack" style="margin-top: 1rem;">
    <div class="section-title">
      <div>
        <p class="eyebrow">Welcome back</p>
        <h2>{{ mode === 'login' ? 'Sign in' : 'Create account' }}</h2>
      </div>
      <span class="badge">Offline ready</span>
    </div>

    <form class="stack" @submit.prevent="submit">
      <input v-model="email" type="email" placeholder="Email" autocomplete="email" />
      <input v-model="password" type="password" placeholder="Password" autocomplete="current-password" />
      <input v-if="mode === 'register'" v-model="displayName" type="text" placeholder="Display name" autocomplete="name" />
      <p v-if="auth.error" class="muted" style="color: #fecdd3;">{{ auth.error }}</p>
      <div class="form-actions">
        <button type="submit" :disabled="auth.loading">{{ auth.loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register' }}</button>
        <button type="button" class="ghost" @click="mode = mode === 'login' ? 'register' : 'login'">
          {{ mode === 'login' ? 'Need an account?' : 'I already have an account' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const app = useAppStore();
const router = useRouter();
const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const displayName = ref('');

const submit = async () => {
  const user =
    mode.value === 'login'
      ? await auth.login(email.value, password.value)
      : await auth.register(email.value, password.value, displayName.value || 'Mobile User');

  app.setUser(user);
  await app.bootstrapFromServer();
  await router.push('/');
};
</script>
