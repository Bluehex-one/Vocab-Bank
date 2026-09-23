const CACHE_NAME = 'vocab-vault-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app_v3.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install event: cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: network first, fallback to cache
self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;
    
    // Don't intercept API requests (like Gemini or Wikipedia)
    if (event.request.url.includes('googleapis.com') || event.request.url.includes('wikipedia.org')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // If network fetch succeeds, update the cache
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request);
            })
    );
});
