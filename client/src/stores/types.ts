import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import type { LocationType } from '@/types';

export const useTypesStore = defineStore('types', () => {
    const types = ref<LocationType[]>([]);
    const loading = ref(false);

    async function fetchTypes() {
        loading.value = true;
        try {
            const { data } = await axios.get<LocationType[]>('/api/types');
            types.value = data;
        } finally {
            loading.value = false;
        }
    }

    async function createType(payload: {
        name: string;
        color: string;
        icon?: string;
    }) {
        const { data } = await axios.post<LocationType>('/api/types', payload);
        types.value.push(data);
        return data;
    }

    async function updateType(
        id: string,
        payload: Partial<{ name: string; color: string; icon: string }>
    ) {
        const { data } = await axios.put<LocationType>(`/api/types/${id}`, payload);
        const idx = types.value.findIndex((t) => t.id === id);
        if (idx !== -1) types.value[idx] = data;
        return data;
    }

    async function deleteType(id: string) {
        await axios.delete(`/api/types/${id}`);
        types.value = types.value.filter((t) => t.id !== id);
    }

    function getTypeById(id: string): LocationType | undefined {
        return types.value.find((t) => t.id === id);
    }

    const sortedTypes = computed(() =>
        [...types.value].sort((a, b) => a.name.localeCompare(b.name))
    );

    return { types, sortedTypes, loading, fetchTypes, createType, updateType, deleteType, getTypeById };
});
