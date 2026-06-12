import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';
import type { Statistics } from '@/types';

export const useStatisticsStore = defineStore('statistics', () => {
    const statistics = ref<Statistics | null>(null);
    const loading = ref(false);

    async function fetchStatistics() {
        loading.value = true;
        try {
            const { data } = await api.get<Statistics>('/api/statistics');
            statistics.value = data;
        } finally {
            loading.value = false;
        }
    }

    return {
        statistics,
        loading,
        fetchStatistics,
    };
});
