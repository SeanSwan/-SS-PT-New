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

// Pass through all fetch requests without caching
self.addEventListener('fetch', (event) => {
  // Just pass through to network - no caching
  event.respondWith(fetch(event.request));
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
