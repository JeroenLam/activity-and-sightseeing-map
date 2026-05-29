<template>
  <form @submit.prevent="onSubmit">
    <h3>{{ $t('auth.register') }}</h3>
    <div v-if="authStore.error" class="error">{{ authStore.error }}</div>
    <input v-model="displayName" type="text" :placeholder="$t('auth.displayName')" required />
    <input v-model="email" type="email" :placeholder="$t('auth.email')" required />
    <input v-model="password" type="password" :placeholder="$t('auth.password')" required minlength="8" />
    <button type="submit">{{ $t('auth.register') }}</button>
    <p>
      {{ $t('auth.hasAccount') }}
      <a href="#" @click.prevent="$emit('switch')">{{ $t('auth.login') }}</a>
    </p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

defineEmits<{ switch: [] }>();

const authStore = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const displayName = ref('');

async function onSubmit() {
  try {
    await authStore.register(email.value, password.value, displayName.value);
    router.push({ name: 'map' });
  } catch {
    // Error already set in store
  }
}
</script>
