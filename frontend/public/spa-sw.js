/**
 * Enhanced PWA Service Worker for SwanStudios
 * ==========================================
 * 
 * Features:
 * - SPA routing support for seamless navigation
 * - Offline workout logging with sync when online
 * - Smart caching for performance
 * - Background sync for workout data
 * - Push notification support
 * - App update management
 */

const CACHE_NAME = 'swanstudios-pwa-v1.0';
const STATIC_CACHE = 'swanstudios-static-v1.0';
const API_CACHE = 'swanstudios-api-v1.0';
const WORKOUT_CACHE = 'swanstudios-workouts-v1.0';

// Essential app shell files
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/Logo.png'
];

// API endpoints to cache for offline functionality
const CACHE_API_ROUTES = [
  '/api/health',
  '/api/exercises',
  '/api/clients',
  '/api/user/profile'
];

// Workout data that should be synced when back online
const SYNC_TAGS = {
  WORKOUT_DATA: 'sync-workout-data',
  PROGRESS_UPDATE: 'sync-progress-update'
};

// Install event - cache app shell and essential resources
self.addEventListener('install', (event) => {
  console.log('SW: Installing enhanced PWA service worker');
  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('SW: Caching app shell');
        return Promise.allSettled(
          APP_SHELL.map(url => {
            console.log(`SW: Attempting to cache ${url}`);
            return cache.add(url).catch(error => {
              console.warn(`SW: Failed to cache ${url}:`, error.message);
              return null;
            });
          })
        );
      }),
      
      // Pre-cache critical API endpoints for offline access
      caches.open(API_CACHE).then((cache) => {
        console.log('SW: Pre-caching critical API endpoints');
        return Promise.allSettled(
          CACHE_API_ROUTES.map(route => {
            return fetch(route, { cache: 'no-cache' })
              .then(response => {
                if (response.ok) {
                  return cache.put(route, response.clone());
                }
                return null;
              })
              .catch(error => {
                console.warn(`SW: Failed to pre-cache ${route}:`, error.message);
                return null;
              });
          })
        );
      })
    ])
    .then((results) => {
      const [shellResults, apiResults] = results;
      const shellSuccess = shellResults.filter(r => r.status === 'fulfilled').length;
      const apiSuccess = apiResults.filter(r => r.status === 'fulfilled').length;
      
      console.log(`SW: Successfully cached ${shellSuccess}/${APP_SHELL.length} shell resources`);
      console.log(`SW: Successfully pre-cached ${apiSuccess}/${CACHE_API_ROUTES.length} API endpoints`);
      
      return self.skipWaiting();
    })
    .catch(error => {
      console.warn('SW: Service worker install failed:', error);
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches and enable advanced features
self.addEventListener('activate', (event) => {
  console.log('SW: Activating enhanced PWA service worker');
  
  const currentCaches = [STATIC_CACHE, API_CACHE, WORKOUT_CACHE];
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => !currentCaches.includes(cacheName))
            .map((cacheName) => {
              console.log(`SW: Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Claim all clients immediately
      self.clients.claim(),
      
      // Initialize background sync for workout data
      self.registration.sync?.register(SYNC_TAGS.WORKOUT_DATA)
        .then(() => console.log('SW: Background sync registered for workout data'))
        .catch(error => console.warn('SW: Background sync registration failed:', error))
    ])
    .then(() => {
      console.log('SW: Service worker activation complete');
      
      // Notify all clients about the new service worker
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            message: 'Enhanced PWA features are now available'
          });
        });
      });
    })
  );
});

// Fetch event - enhanced request handling with smart caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Handle API requests with caching strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Handle webhooks without caching
  if (url.pathname.startsWith('/webhooks/')) {
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
          return caches.match('/index.html') || fetch('/index.html');
        })
    );
    return;
  }
  
  // Handle static assets with smart caching
  if (url.pathname.includes('.') && !url.pathname.startsWith('/api/')) {
    event.respondWith(handleStaticAsset(event.request));
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

// ==================== HELPER FUNCTIONS ====================

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCriticalEndpoint = CACHE_API_ROUTES.includes(url.pathname);
  
  try {
    // Always try network first for API requests
    const networkResponse = await fetch(request.clone());
    
    if (networkResponse.ok) {
      // Cache successful responses for critical endpoints
      if (isCriticalEndpoint) {
        const cache = await caches.open(API_CACHE);
        await cache.put(request.clone(), networkResponse.clone());
      }
      
      // Store workout data for background sync if offline
      if (url.pathname.includes('/workouts') && request.method === 'POST') {
        const workoutData = await request.clone().json().catch(() => null);
        if (workoutData) {
          await storeWorkoutForSync(workoutData);
        }
      }
      
      return networkResponse;
    }
    
    throw new Error(`API responded with status: ${networkResponse.status}`);
  } catch (error) {
    console.log(`SW: Network failed for ${url.pathname}, trying cache`);
    
    // If network fails, try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`SW: Serving ${url.pathname} from cache`);
      return cachedResponse;
    }
    
    // If it's a POST request (like workout logging), store for later sync
    if (request.method === 'POST' && url.pathname.includes('/workouts')) {
      const workoutData = await request.clone().json().catch(() => null);
      if (workoutData) {
        await storeWorkoutForSync(workoutData);
        
        // Return a success response to the client
        return new Response(JSON.stringify({
          success: true,
          offline: true,
          message: 'Workout saved locally and will sync when online'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Return a meaningful offline response
    return new Response(JSON.stringify({
      success: false,
      offline: true,
      message: 'This feature requires an internet connection'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static assets with performance optimization
async function handleStaticAsset(request) {
  const url = new URL(request.url);
  
  // Don't cache video files to avoid memory issues
  if (url.pathname.match(/\.(mp4|webm|avi|mov)$/)) {
    console.log(`SW: Serving video file ${url.pathname} without caching`);
    return fetch(request);
  }
  
  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && networkResponse.status === 200) {
      // Cache successful responses
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If network fails, serve from cache
    console.log(`SW: Network failed for ${url.pathname}, serving from cache`);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache available, return a meaningful error
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Store workout data for background sync
async function storeWorkoutForSync(workoutData) {
  try {
    const cache = await caches.open(WORKOUT_CACHE);
    const syncKey = `workout-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const response = new Response(JSON.stringify({
      ...workoutData,
      syncKey,
      timestamp: new Date().toISOString(),
      synced: false
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put(`/offline-workouts/${syncKey}`, response);
    console.log(`SW: Stored workout data for sync: ${syncKey}`);
    
    // Register background sync
    if (self.registration.sync) {
      await self.registration.sync.register(SYNC_TAGS.WORKOUT_DATA);
    }
  } catch (error) {
    console.error('SW: Failed to store workout for sync:', error);
  }
}

// Background sync event handler
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync event:', event.tag);
  
  if (event.tag === SYNC_TAGS.WORKOUT_DATA) {
    event.waitUntil(syncWorkoutData());
  }
});

// Sync stored workout data when back online
async function syncWorkoutData() {
  try {
    console.log('SW: Starting workout data sync');
    const cache = await caches.open(WORKOUT_CACHE);
    const requests = await cache.keys();
    
    const workoutRequests = requests.filter(req => 
      req.url.includes('/offline-workouts/')
    );
    
    if (workoutRequests.length === 0) {
      console.log('SW: No workout data to sync');
      return;
    }
    
    console.log(`SW: Syncing ${workoutRequests.length} workout entries`);
    
    for (const request of workoutRequests) {
      try {
        const response = await cache.match(request);
        if (!response) continue;
        
        const workoutData = await response.json();
        
        // Don't sync if already synced
        if (workoutData.synced) {
          await cache.delete(request);
          continue;
        }
        
        // Try to sync with server
        const syncResponse = await fetch('/api/workouts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workoutData)
        });
        
        if (syncResponse.ok) {
          console.log(`SW: Successfully synced workout: ${workoutData.syncKey}`);
          await cache.delete(request);
          
          // Notify clients about successful sync
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'WORKOUT_SYNCED',
              data: { syncKey: workoutData.syncKey, success: true }
            });
          });
        } else {
          console.warn(`SW: Failed to sync workout: ${workoutData.syncKey}`);
        }
      } catch (error) {
        console.error('SW: Error syncing individual workout:', error);
      }
    }
    
    console.log('SW: Workout data sync completed');
  } catch (error) {
    console.error('SW: Failed to sync workout data:', error);
    throw error; // Re-throw to trigger retry
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from Swan Studios',
      icon: '/Logo.png',
      badge: '/swan-tile.png',
      image: data.image,
      tag: data.tag || 'swan-notification',
      actions: data.actions || [],
      data: data.data || {},
      requireInteraction: data.urgent || false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Swan Studios', options)
    );
  } catch (error) {
    console.error('SW: Error handling push notification:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not, open a new window/tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handler for communication with clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_OFFLINE_WORKOUTS':
      getOfflineWorkouts().then(workouts => {
        event.ports[0].postMessage({ workouts });
      });
      break;
      
    case 'FORCE_SYNC':
      if (self.registration.sync) {
        self.registration.sync.register(SYNC_TAGS.WORKOUT_DATA);
      }
      break;
      
    default:
      console.log('SW: Unknown message type:', type);
  }
});

// Get stored offline workouts
async function getOfflineWorkouts() {
  try {
    const cache = await caches.open(WORKOUT_CACHE);
    const requests = await cache.keys();
    
    const workoutRequests = requests.filter(req => 
      req.url.includes('/offline-workouts/')
    );
    
    const workouts = [];
    for (const request of workoutRequests) {
      const response = await cache.match(request);
      if (response) {
        const workoutData = await response.json();
        workouts.push(workoutData);
      }
    }
    
    return workouts;
  } catch (error) {
    console.error('SW: Error getting offline workouts:', error);
    return [];
  }
}