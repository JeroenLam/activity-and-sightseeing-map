<template>
  <section class="card stack">
    <div class="section-title">
      <div>
        <p class="eyebrow">Sync</p>
        <h2>Queue and conflicts</h2>
      </div>
      <button type="button" @click="syncNow">Run sync</button>
    </div>

    <p class="muted">Cursor: {{ app.cursor }} · Last sync: {{ app.lastSyncedAt || 'never' }}</p>
  </section>

  <section class="card stack" style="margin-top: 1rem;">
    <div class="section-title">
      <h2>Queued mutations</h2>
      <span class="badge">{{ app.pendingCount }}</span>
    </div>
    <div v-if="!app.queue.length" class="muted">No queued changes.</div>
    <div v-for="item in app.queue" :key="item.mutation_id" class="panel">
      <strong>{{ item.entity_type }} · {{ item.operation }}</strong>
      <p class="muted">Mutation {{ item.mutation_id }}</p>
      <p class="muted">Entity: {{ item.entity_id || 'new' }}</p>
    </div>
  </section>

  <section class="card stack" style="margin-top: 1rem;">
    <div class="section-title">
      <h2>Conflicts</h2>
      <span class="badge">{{ app.conflictCount }}</span>
    </div>
    <div v-if="!app.conflicts.length" class="muted">No open conflicts.</div>
    <div v-for="conflict in app.sortedConflicts" :key="conflict.id" class="panel stack">
      <div class="section-title">
        <div>
          <strong>{{ conflict.entity_type }} · {{ conflict.operation }}</strong>
          <p class="muted">Conflict {{ conflict.id }} · server version {{ conflict.server_version }}</p>
        </div>
        <span class="badge">{{ conflict.status }}</span>
      </div>

      <textarea v-model="mergeDrafts[conflict.id]" />
      <div class="form-actions">
        <button type="button" @click="useServer(conflict.id)">Use server</button>
        <button type="button" class="ghost" @click="useClient(conflict.id, conflict.client_payload)">Use client</button>
        <button type="button" class="ghost" @click="merge(conflict.id)">Merge JSON</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, watchEffect } from 'vue';
import { useAppStore } from '@/stores/app';

const app = useAppStore();
const mergeDrafts = reactive<Record<number, string>>({});

watchEffect(() => {
  for (const conflict of app.conflicts) {
    if (!(conflict.id in mergeDrafts)) {
      mergeDrafts[conflict.id] = JSON.stringify(conflict.client_payload ?? conflict.server_payload ?? {}, null, 2);
    }
  }
});

const syncNow = async () => {
  await app.syncSettingsAndData();
  await app.loadConflicts();
};

const useServer = async (conflictId: number) => {
  await app.resolveConflict(conflictId, 'use_server');
};

const useClient = async (conflictId: number, payload?: Record<string, unknown> | null) => {
  await app.resolveConflict(conflictId, 'use_client', payload ?? undefined);
};

const merge = async (conflictId: number) => {
  try {
    const payload = JSON.parse(mergeDrafts[conflictId] || '{}') as Record<string, unknown>;
    await app.resolveConflict(conflictId, 'merge', payload);
  } catch {
    mergeDrafts[conflictId] = '{\n  "error": "Invalid JSON"\n}';
  }
};
</script>
