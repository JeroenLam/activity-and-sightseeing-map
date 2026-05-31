import { ref } from 'vue';
import api from '@/lib/api';
import type { GeocodingResult, ReverseGeocodingResult } from '@/types';

export function useGeocoding() {
    const results = ref<GeocodingResult[]>([]);
    const searching = ref(false);
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function search(query: string) {
        if (debounceTimer) clearTimeout(debounceTimer);

        if (!query || query.length < 3) {
            results.value = [];
            return;
        }

        searching.value = true;
        debounceTimer = setTimeout(async () => {
            try {
                const { data } = await api.get<GeocodingResult[]>('/api/geocode/search', {
                    params: { q: query },
                });
                results.value = data;
            } catch {
                results.value = [];
            } finally {
                searching.value = false;
            }
        }, 400);
    }

    async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodingResult | null> {
        try {
            const { data } = await api.get<ReverseGeocodingResult>('/api/geocode/reverse', {
                params: { lat, lon },
            });
            return data;
        } catch {
            return null;
        }
    }

    function clear() {
        results.value = [];
    }

    return { results, searching, search, reverseGeocode, clear };
}
