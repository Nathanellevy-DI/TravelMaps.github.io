const CACHE_NAME = 'travelmaps-v4';
const APP_VERSION = 2; // Increment when adding new features - TEST
const urlsToCache = [
    '/TravelMaps.github.io/',
    '/TravelMaps.github.io/index.html'
];

// Install service worker and cache essential files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// Activate and clean up old caches, set badge for new version
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            // Set badge to notify user of update
            if ('setAppBadge' in navigator) {
                navigator.setAppBadge(1).catch(() => { });
            }
            return self.clients.claim();
        })
    );
});

// Network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache if network fails
                return caches.match(event.request);
            })
    );
});
