<template>
  <div class="auth-view">
    <h1>{{ $t('app.title') }}</h1>
    <LoginForm v-if="mode === 'login'" @switch="mode = 'register'" />
    <RegisterForm v-else @switch="mode = 'login'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import LoginForm from '@/components/auth/LoginForm.vue';
import RegisterForm from '@/components/auth/RegisterForm.vue';

const mode = ref<'login' | 'register'>('login');
</script>
