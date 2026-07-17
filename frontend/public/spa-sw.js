/**
 * KILL-SWITCH SERVICE WORKER
 * ==========================
 * PWA functionality is intentionally disabled. This worker exists only to
 * replace/drain any previously-installed caching service worker: it clears
 * all caches on activate and handles nothing else.
 *
 * IMPORTANT: there is deliberately NO 'fetch' listener.
 * Intentionally no event.respondWith anywhere: with no fetch handler,
 * browsers skip service-worker dispatch entirely (navigation fast path) —
 * the previous passive listener added overhead to every request and
 * logged noise in every production session.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clear all caches left behind by older service workers
      caches.keys().then((cacheNames) => (
        Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      )),
      // Claim all clients
      self.clients.claim()
    ])
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
