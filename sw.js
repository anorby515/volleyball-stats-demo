// ============================================================================
// Service Worker - Volleyball Stat Tracker
// ============================================================================
// Caches the app shell so the PWA works offline.
// Strategy: Cache-first for app files, network-first for CDN resources.
// ============================================================================

var CACHE_NAME = 'vb-tracker-v8';

var APP_SHELL_FILES = [
    './',
    './index.html',
    './match-setup.html',
    './volleyball-tracker.html',
    './analyze-stats.html',
    './app-mode.js',
    './config.js',
    './offline-storage.js',
    './manifest.json'
];

var CDN_URLS = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install: pre-cache app shell files
self.addEventListener('install', function(event) {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] Caching app shell');
            return cache.addAll(APP_SHELL_FILES);
        }).then(function() {
            // Force activate immediately (don't wait for old SW to finish)
            return self.skipWaiting();
        })
    );
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(name) {
                    if (name !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(function() {
            // Take control of all open pages immediately
            return self.clients.claim();
        })
    );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    // Skip non-GET requests (POST, etc.)
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip Supabase API calls (data requests should go to network)
    if (url.hostname.includes('supabase.co')) {
        return;
    }

    // For CDN resources (Supabase JS, Google Fonts): network-first, cache fallback
    if (url.hostname !== self.location.hostname) {
        event.respondWith(
            fetch(event.request).then(function(response) {
                // Cache the CDN response for offline use
                var responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, responseClone);
                });
                return response;
            }).catch(function() {
                // Try cache; if not cached, return a valid empty response (never undefined)
                return caches.match(event.request, { ignoreSearch: true }).then(function(cachedResponse) {
                    return cachedResponse || new Response('', { status: 503, statusText: 'Offline' });
                });
            })
        );
        return;
    }

    // For app files: cache-first, network fallback
    // Use ignoreSearch so that e.g. volleyball-tracker.html?matchId=xxx
    // matches the cached volleyball-tracker.html
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(function(cachedResponse) {
            if (cachedResponse) {
                // Serve from cache, but also update cache in background
                fetch(event.request).then(function(networkResponse) {
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, networkResponse);
                    });
                }).catch(function() {
                    // Network failed, that's fine - we served from cache
                });
                return cachedResponse;
            }

            // Not in cache, try network and cache the result
            return fetch(event.request).then(function(response) {
                var responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, responseClone);
                });
                return response;
            }).catch(function() {
                // Both cache and network failed - return a basic offline page
                return new Response(
                    '<html><body style="background:#1a1a1a;color:#f5f5f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1>Offline</h1><p>This page is not available offline.</p><p><a href="index.html" style="color:#ef4444">Go to Home</a></p></div></body></html>',
                    { headers: { 'Content-Type': 'text/html' } }
                );
            });
        })
    );
});
