const CACHE_NAME = 'activiteiten-web-cache-v2';
const CORE_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/config.js'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    const isSameOrigin = url.origin === self.location.origin;
    const isNavigation = event.request.mode === 'navigate';

    // App shell navigation fallback: network first, cached index as offline fallback.
    if (isNavigation) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                    return response;
                })
                .catch(async () => {
                    const cachedNavigation = await caches.match(event.request);
                    if (cachedNavigation) {
                        return cachedNavigation;
                    }
                    return caches.match('/index.html');
                })
        );
        return;
    }

    // Static assets/API responses: never fall back to index.html.
    // Returning HTML for script/style requests can blank the app at startup.
    if (isSameOrigin) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                    return response;
                })
                .catch(async () => {
                    const cached = await caches.match(event.request);
                    if (cached) {
                        return cached;
                    }
                    return Response.error();
                })
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const cloned = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                return response;
            })
            .catch(async () => {
                const cached = await caches.match(event.request);
                if (cached) {
                    return cached;
                }
                return Response.error();
            })
    );
});
