import { defineStore } from 'pinia';
import { ref } from 'vue';
import api, { isOfflineErrorLike } from '@/lib/api';
import { loadCachedTypes, saveCachedTypes } from '@/lib/offlineStorage';
import { useOfflineSyncStore } from '@/stores/offlineSync';
import type { LocationType } from '@/types';

export const useTypesStore = defineStore('types', () => {
    const types = ref<LocationType[]>(loadCachedTypes() ?? []);
    const loading = ref(false);

    function persistTypes() {
        saveCachedTypes(types.value);
    }

    function setTypes(nextTypes: LocationType[]) {
        types.value = nextTypes;
        persistTypes();
    }

    function makeId() {
        return crypto.randomUUID ? crypto.randomUUID() : `tmp-${Math.random().toString(36).slice(2)}`;
    }

    async function fetchTypes() {
        loading.value = true;
        try {
            const { data } = await api.get<LocationType[]>('/api/types');
            types.value = data;
            persistTypes();
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }
        } finally {
            loading.value = false;
        }
    }

    async function createType(payload: { name: string; color: string; icon?: string }): Promise<LocationType> {
        const offlineSync = useOfflineSyncStore();
        try {
            const { data } = await api.post<LocationType>('/api/types', payload);
            types.value.push(data);
            persistTypes();
            return data;
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }
            const optimistic: LocationType = {
                id: makeId(),
                name: payload.name,
                color: payload.color,
                icon: payload.icon ?? '',
                sync_version: 1,
            };
            types.value.push(optimistic);
            persistTypes();
            offlineSync.enqueue({
                entity_type: 'type',
                operation: 'create',
                entity_id: optimistic.id,
                payload: payload as unknown as Record<string, unknown>,
            });
            return optimistic;
        }
    }

    async function updateType(id: string, payload: { name?: string; color?: string; icon?: string }): Promise<LocationType> {
        const idx = types.value.findIndex((t) => t.id === id);
        const offlineSync = useOfflineSyncStore();
        try {
            const { data } = await api.put<LocationType>(`/api/types/${id}`, payload);
            if (idx !== -1) types.value[idx] = data;
            persistTypes();
            return data;
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }
            if (idx === -1) {
                throw error;
            }
            const current = types.value[idx];
            const optimistic = {
                ...current,
                ...payload,
            };
            types.value[idx] = optimistic;
            persistTypes();
            offlineSync.enqueue({
                entity_type: 'type',
                operation: 'update',
                entity_id: id,
                base_sync_version: current.sync_version ?? null,
                payload: payload as unknown as Record<string, unknown>,
            });
            return optimistic;
        }
    }

    async function deleteType(id: string) {
        const offlineSync = useOfflineSyncStore();
        const current = types.value.find((t) => t.id === id);
        try {
            await api.delete(`/api/types/${id}`);
        } catch (error) {
            if (!isOfflineErrorLike(error)) {
                throw error;
            }
            offlineSync.enqueue({
                entity_type: 'type',
                operation: 'delete',
                entity_id: id,
                base_sync_version: current?.sync_version ?? null,
                payload: {},
            });
        }
        types.value = types.value.filter((t) => t.id !== id);
        persistTypes();
    }

    async function deleteAll() {
        for (const t of [...types.value]) {
            await api.delete(`/api/types/${t.id}`);
        }
        types.value = [];
        persistTypes();
    }

    return {
        types,
        loading,
        fetchTypes,
        createType,
        updateType,
        deleteType,
        deleteAll,
        setTypes,
    };
});
