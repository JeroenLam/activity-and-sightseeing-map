<template>
  <div class="page-container">
    <div class="page-header">
      <h2>{{ t('sync.title') }}</h2>
      <button class="btn btn-primary" :disabled="syncStore.syncing || !syncStore.online" @click="runSync">
        {{ syncStore.syncing ? t('sync.syncing') : t('sync.syncNow') }}
      </button>
    </div>

    <div class="sync-status-card">
      <p><strong>{{ t('sync.connection') }}:</strong> {{ syncStore.online ? t('sync.online') : t('sync.offline') }}</p>
      <p><strong>{{ t('sync.cursor') }}:</strong> {{ syncStore.cursor }}</p>
      <p><strong>{{ t('sync.lastSyncedAt') }}:</strong> {{ syncStore.lastSyncedAt || t('sync.never') }}</p>
      <p><strong>{{ t('sync.pendingMutations') }}:</strong> {{ syncStore.queue.length }}</p>
      <p><strong>{{ t('sync.conflicts') }}:</strong> {{ syncStore.conflicts.length }}</p>
    </div>

    <div class="sync-section">
      <h3>{{ t('sync.pendingTitle') }}</h3>
      <p v-if="!syncStore.queue.length" class="text-secondary">{{ t('sync.noPending') }}</p>
      <div v-else class="sync-list">
        <div class="sync-item" v-for="item in syncStore.queue" :key="item.mutation_id">
          <strong>{{ item.entity_type }} · {{ item.operation }}</strong>
          <p class="text-secondary">{{ item.entity_id || 'new' }}</p>
        </div>
      </div>
    </div>

    <div class="sync-section">
      <h3>{{ t('sync.conflictTitle') }}</h3>
      <p v-if="!syncStore.conflicts.length" class="text-secondary">{{ t('sync.noConflicts') }}</p>
      <div v-else class="sync-list">
        <div class="sync-item" v-for="conflict in syncStore.conflicts" :key="conflict.id">
          <div class="sync-item-header">
            <strong>{{ conflict.entity_type }} · {{ conflict.operation }}</strong>
            <span class="text-secondary">#{{ conflict.id }}</span>
          </div>
          <p class="text-secondary">{{ t('sync.serverVersion') }}: {{ conflict.server_version }}</p>
          <textarea v-model="mergeDrafts[conflict.id]" rows="6"></textarea>
          <div class="sync-actions">
            <button class="btn btn-small" @click="resolveUseServer(conflict.id)">{{ t('sync.useServer') }}</button>
            <button class="btn btn-small" @click="resolveUseClient(conflict.id, conflict.client_payload)">{{ t('sync.useClient') }}</button>
            <button class="btn btn-small btn-primary" @click="resolveMerge(conflict.id)">{{ t('sync.mergeJson') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useOfflineSyncStore } from '@/stores/offlineSync';

const { t } = useI18n();
const syncStore = useOfflineSyncStore();
const mergeDrafts = reactive<Record<number, string>>({});

watchEffect(() => {
  for (const conflict of syncStore.conflicts) {
    if (!(conflict.id in mergeDrafts)) {
      mergeDrafts[conflict.id] = JSON.stringify(conflict.client_payload ?? conflict.server_payload ?? {}, null, 2);
    }
  }
});

async function runSync() {
  await syncStore.syncNow();
}

async function resolveUseServer(conflictId: number) {
  await syncStore.resolveConflict(conflictId, 'use_server');
}

async function resolveUseClient(conflictId: number, payload?: Record<string, unknown> | null) {
  await syncStore.resolveConflict(conflictId, 'use_client', payload ?? undefined);
}

async function resolveMerge(conflictId: number) {
  try {
    const payload = JSON.parse(mergeDrafts[conflictId] || '{}') as Record<string, unknown>;
    await syncStore.resolveConflict(conflictId, 'merge', payload);
  } catch {
    mergeDrafts[conflictId] = '{\n  "error": "Invalid JSON"\n}';
  }
}
</script>

<style scoped>
.sync-status-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem;
}

.sync-section {
  margin-top: 1.25rem;
}

.sync-list {
  display: grid;
  gap: 0.75rem;
}

.sync-item {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 0.75rem;
}

.sync-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sync-item textarea {
  width: 100%;
  margin-top: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  padding: 0.5rem;
}

.sync-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}
</style>
