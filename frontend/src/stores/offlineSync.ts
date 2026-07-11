import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
    loadConflicts,
    loadLastSyncedAt,
    loadQueuedMutations,
    loadSyncCursor,
    saveConflicts,
    saveLastSyncedAt,
    saveQueuedMutations,
    saveSyncCursor,
} from '@/lib/offlineStorage';
import {
    fetchBootstrap,
    listConflicts,
    pushMutations,
    resolveConflict as resolveConflictRequest,
} from '@/lib/sync';
import type { SyncConflict, SyncMutationRequest } from '@/types';
import { useLocationsStore } from '@/stores/locations';
import { useTypesStore } from '@/stores/types';
import { useSettingsStore } from '@/stores/settings';

function makeId() {
    return crypto.randomUUID ? crypto.randomUUID() : `tmp-${Math.random().toString(36).slice(2)}`;
}

export const useOfflineSyncStore = defineStore('offline-sync', () => {
    const queue = ref<SyncMutationRequest[]>(loadQueuedMutations());
    const cursor = ref<number>(loadSyncCursor());
    const conflicts = ref<SyncConflict[]>(loadConflicts());
    const lastSyncedAt = ref<string | null>(loadLastSyncedAt());
    const syncing = ref(false);
    const online = ref(navigator.onLine);

    window.addEventListener('online', () => {
        online.value = true;
    });

    window.addEventListener('offline', () => {
        online.value = false;
    });

    function persist() {
        saveQueuedMutations(queue.value);
        saveSyncCursor(cursor.value);
        saveConflicts(conflicts.value);
        saveLastSyncedAt(lastSyncedAt.value);
    }

    function enqueue(mutation: Omit<SyncMutationRequest, 'mutation_id'> & { mutation_id?: string }) {
        queue.value.push({
            ...mutation,
            mutation_id: mutation.mutation_id ?? makeId(),
        });
        persist();
    }

    async function refreshConflicts() {
        try {
            conflicts.value = await listConflicts();
            persist();
        } catch {
            // keep local conflicts when offline
        }
    }

    async function bootstrap() {
        const locationsStore = useLocationsStore();
        const typesStore = useTypesStore();
        const settingsStore = useSettingsStore();

        const payload = await fetchBootstrap();
        locationsStore.setCollection(payload.locations);
        typesStore.setTypes(payload.types);
        settingsStore.setSettings(payload.settings);
        cursor.value = payload.cursor;
        lastSyncedAt.value = new Date().toISOString();
        persist();
    }

    async function syncNow() {
        if (!navigator.onLine || syncing.value) {
            return;
        }

        syncing.value = true;
        try {
            if (queue.value.length) {
                const pushResponse = await pushMutations(queue.value);
                const appliedIds = new Set(
                    pushResponse.results
                        .filter((result) => result.status === 'applied')
                        .map((result) => result.mutation_id),
                );
                queue.value = queue.value.filter((item) => !appliedIds.has(item.mutation_id));
                cursor.value = pushResponse.cursor;
            }

            await bootstrap();
            await refreshConflicts();
        } finally {
            syncing.value = false;
            persist();
        }
    }

    async function resolveConflict(
        conflictId: number,
        resolutionMode: 'use_client' | 'use_server' | 'merge',
        payload?: Record<string, unknown>,
    ) {
        await resolveConflictRequest(conflictId, {
            resolution_mode: resolutionMode,
            payload,
        });
        await bootstrap();
        await refreshConflicts();
    }

    return {
        queue,
        cursor,
        conflicts,
        lastSyncedAt,
        syncing,
        online,
        enqueue,
        bootstrap,
        syncNow,
        refreshConflicts,
        resolveConflict,
    };
});
