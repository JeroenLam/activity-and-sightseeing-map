<template>
  <form @submit.prevent="onSubmit">
    <h3>{{ $t('auth.login') }}</h3>
    <div v-if="authStore.error" class="error">{{ authStore.error }}</div>
    <input v-model="email" type="email" :placeholder="$t('auth.email')" required />
    <input v-model="password" type="password" :placeholder="$t('auth.password')" required />
    <button type="submit">{{ $t('auth.login') }}</button>
    <p>
      {{ $t('auth.noAccount') }}
      <a href="#" @click.prevent="$emit('switch')">{{ $t('auth.register') }}</a>
    </p>
    <div v-if="authStore.oauthConfig.google">
      <a :href="'/api/auth/google'">{{ $t('auth.loginWithGoogle') }}</a>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

defineEmits<{ switch: [] }>();

const authStore = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');

onMounted(() => {
  authStore.fetchOAuthConfig();
});

async function onSubmit() {
  try {
    await authStore.login(email.value, password.value);
    router.push({ name: 'map' });
  } catch {
    // Error already set in store
  }
}
</script>
