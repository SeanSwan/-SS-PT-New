/**
 * SPA Service Worker for SwanStudios
 * ==================================
 * 
 * Handles offline routing and ensures SPA routes work correctly
 * even when the server isn't configured properly for SPA routing
 */

const CACHE_NAME = 'swanstudios-spa-v2';
// Only cache essential files that we know exist
const APP_SHELL = [
  '/',
  '/index.html'
  // Note: Vite uses /assets/ for built files, not /static/
  // We'll cache other assets dynamically as they're requested
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('SW: Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching app shell');
        // Only cache files we're confident exist
        return Promise.allSettled(
          APP_SHELL.map(url => {
            console.log(`SW: Attempting to cache ${url}`);
            return cache.add(url).catch(error => {
              console.warn(`SW: Failed to cache ${url}:`, error.message);
              return null;
            });
          })
        );
      })
      .then((results) => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`SW: Successfully cached ${successful}/${APP_SHELL.length} shell resources`);
        return self.skipWaiting();
      })
      .catch(error => {
        console.warn('SW: Service worker install failed:', error);
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - handle SPA routing and dynamic caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Handle API requests normally (don't cache)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/webhooks/')) {
    return;
  }
  
  // For navigation requests to SPA routes, serve index.html
  if (event.request.mode === 'navigate') {
    console.log(`SW: Navigation request to ${url.pathname}`);
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If we get a 404 for an app route, serve index.html instead
          if (response.status === 404 && !url.pathname.includes('.')) {
            console.log(`SW: 404 for app route ${url.pathname}, serving index.html`);
            return caches.match('/index.html') || fetch('/index.html');
          }
          return response;
        })
        .catch(() => {
          console.log(`SW: Network failed for ${url.pathname}, serving cached index.html`);
          // If the network request fails, serve index.html from cache
          return caches.match('/index.html') || fetch('/index.html');
        })
    );
    return;
  }
  
  // For static assets, try network first, then cache, with dynamic caching
  if (url.pathname.includes('.') && !url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If successful, cache the asset for future use
          if (response.ok && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseClone);
              })
              .catch(error => {
                console.warn(`SW: Failed to cache ${url.pathname}:`, error.message);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For all other requests, try network first, then cache
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});