<template>
  <section class="grid two">
    <div class="stat">
      <span class="muted">Locations</span>
      <strong>{{ app.locationCount }}</strong>
      <span class="muted">{{ app.pendingCount }} pending sync</span>
    </div>
    <div class="stat">
      <span class="muted">Types</span>
      <strong>{{ app.typeCount }}</strong>
      <span class="muted">{{ app.conflictCount }} conflicts</span>
    </div>
  </section>

  <section class="card" style="margin-top: 1rem;">
    <div class="section-title">
      <div>
        <p class="eyebrow">Session</p>
        <h2>{{ auth.user?.display_name }}</h2>
      </div>
      <span class="badge">{{ app.statusLabel }}</span>
    </div>

    <p class="muted">Last sync: {{ app.lastSyncedAt || 'never' }}</p>
    <div class="form-actions">
      <button type="button" @click="syncNow">Sync now</button>
      <button type="button" class="ghost" @click="reloadBootstrap">Refresh snapshot</button>
    </div>
  </section>

  <section class="card" style="margin-top: 1rem;">
    <div class="section-title">
      <div>
        <p class="eyebrow">Offline flow</p>
        <h2>How this mobile interface behaves</h2>
      </div>
    </div>
    <div class="stack">
      <p class="muted">1. Edit locations and settings locally when the server is unreachable.</p>
      <p class="muted">2. Queue mutations until a connection returns.</p>
      <p class="muted">3. Push queued changes to the sync endpoint and reload the latest server state.</p>
      <p class="muted">4. Review conflicts in the Sync tab and choose client, server, or merged values.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const app = useAppStore();
const router = useRouter();

const syncNow = async () => {
  await app.syncNow();
  await router.push('/sync');
};

const reloadBootstrap = async () => {
  await app.bootstrapFromServer();
};
</script>
