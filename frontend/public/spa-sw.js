/**
 * TEMPORARY DISABLED SERVICE WORKER
 * ===============================
 * This temporarily disables PWA functionality to prevent
 * install/update prompts while we fix routing issues.
 */

console.log('Service Worker: PWA functionality temporarily disabled');

// Unregister any existing service worker
self.addEventListener('install', (event) => {
  console.log('SW: Install event - skipping');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activate event - cleaning up');
  event.waitUntil(
    Promise.all([
      // Clear all caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('SW: Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Pass through all fetch requests without caching.
// Intentionally no event.respondWith here: this service worker is disabled,
// so the browser/network stack should surface the real navigation/API result.
self.addEventListener('fetch', (event) => {
  // Touch event.request so lint/build tooling knows this is intentionally a
  // passive fetch listener while the old registration drains from browsers.
  void event.request;
});

// Notify clients that PWA is disabled
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_STATUS') {
    event.ports[0].postMessage({ 
      status: 'disabled',
      message: 'PWA functionality temporarily disabled' 
    });
  }
});
