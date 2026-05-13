import { ref } from 'vue';

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
}

export function useGeocoding() {
    const results = ref<NominatimResult[]>([]);
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
                const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
                const resp = await fetch(url, {
                    headers: { 'User-Agent': 'ActiviteitenMap/1.0' },
                });
                results.value = await resp.json();
            } catch {
                results.value = [];
            } finally {
                searching.value = false;
            }
        }, 400);
    }

    function clear() {
        results.value = [];
    }

    return { results, searching, search, clear };
}
