/**
 * EMERGENCY SERVICE WORKER PATCH
 * ==============================
 * Fixes infinite service worker fetch failures
 * Deploy immediately to prevent SW retry storms
 */

// This will be injected into the service worker context
const EMERGENCY_SW_PATCH = `
// Emergency patch for spa-sw.js fetch failures
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip if URL contains specific patterns that are known to fail
  const url = event.request.url;
  if (url.includes('ss-pt-new.onrender.com') && navigator.onLine === false) {
    console.log('🛑 SW: Skipping fetch due to offline status:', url);
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .catch(error => {
        console.warn('🚨 SW: Fetch failed, providing fallback:', url);
        
        // For API calls, return a JSON error response
        if (url.includes('/api/') || url.includes('/sessions')) {
          return new Response(
            JSON.stringify({ 
              error: 'Service temporarily unavailable',
              message: 'Network error - using offline mode',
              data: []
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        // For other resources, just fail silently
        return new Response('', { status: 404 });
      })
  );
});

console.log('🛑 EMERGENCY: Service worker patch applied - preventing fetch storms');
`;

// Export for potential injection
if (typeof window !== 'undefined') {
  window.EMERGENCY_SW_PATCH = EMERGENCY_SW_PATCH;
}

export { EMERGENCY_SW_PATCH };
