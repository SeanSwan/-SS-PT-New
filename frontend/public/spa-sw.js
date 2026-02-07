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
  // Skip cross-origin requests to prevent CORS error storms
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    // Let browser handle cross-origin requests directly
    return;
  }

  // For same-origin requests, pass through with error handling
  event.respondWith(
    fetch(event.request).catch((error) => {
      console.log('SW: Fetch failed for', event.request.url, error.message);
      // Return a simple error response instead of throwing
      return new Response('Service Worker: Network error', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    })
  );
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
