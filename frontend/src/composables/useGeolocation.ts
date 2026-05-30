import { ref } from 'vue';

export function useGeolocation() {
    const position = ref<{ lat: number; lon: number } | null>(null);
    const error = ref<string | null>(null);
    const loading = ref(false);

    function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const msg = 'Geolocation is not supported by this browser';
                error.value = msg;
                reject(new Error(msg));
                return;
            }

            loading.value = true;
            error.value = null;

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const result = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    position.value = result;
                    loading.value = false;
                    resolve(result);
                },
                (err) => {
                    error.value = err.message;
                    loading.value = false;
                    reject(err);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    return { position, error, loading, getCurrentPosition };
}
