/**
 * SPA Routing Fix for SwanStudios
 * ===============================
 * 
 * Comprehensive solution to handle SPA routing issues across different hosting providers
 * Implements client-side fallbacks when server-side configuration isn't working properly
 */

/**
 * Initialize SPA routing fix
 * This function should be called early in the application lifecycle
 */
export const initializeSPARouting = () => {
  // 1. Handle direct URL access and refresh scenarios
  const handleDirectAccess = () => {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    
    // If we're on a route that should exist but got a 404, redirect properly
    if (currentPath !== '/' && !document.querySelector('#root').innerHTML) {
      console.log('SPA Routing: Handling direct access to:', currentPath);
      
      // Store the intended path in sessionStorage
      sessionStorage.setItem('spa_intended_path', currentPath + currentHash);
      
      // Redirect to root with the path as a hash
      window.location.href = `${window.location.origin}/#${currentPath}${currentHash}`;
    }
  };

  // 2. Handle hash-based routing fallback
  const handleHashRouting = () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      const path = hash.substring(1); // Remove the #
      console.log('SPA Routing: Restoring path from hash:', path);
      
      // Use React Router's navigation
      window.history.replaceState(null, null, path);
      
      // Clear the hash
      window.location.hash = '';
    }
  };

  // 3. Handle stored intended path
  const handleStoredPath = () => {
    const intendedPath = sessionStorage.getItem('spa_intended_path');
    if (intendedPath) {
      console.log('SPA Routing: Restoring intended path:', intendedPath);
      sessionStorage.removeItem('spa_intended_path');
      
      // Navigate to the intended path
      window.history.replaceState(null, null, intendedPath);
    }
  };

  // 4. Enhanced 404 detection and handling
  const handle404Detection = () => {
    // Check if we're getting a 404 page instead of our React app
    const isActualApp = document.querySelector('#root') && 
                       (document.querySelector('[data-reactroot]') || 
                        document.querySelector('#root').children.length > 0);
    
    if (!isActualApp && window.location.pathname !== '/') {
      console.log('SPA Routing: 404 detected, attempting to recover');
      
      // Try to recover by redirecting to the base URL with hash
      const fullPath = window.location.pathname + window.location.search + window.location.hash;
      window.location.href = `${window.location.origin}/#${fullPath}`;
    }
  };

  // Execute fixes in order
  handleDirectAccess();
  handleHashRouting();
  handleStoredPath();
  
  // Check for 404 after a brief delay to allow React to mount
  setTimeout(handle404Detection, 100);
};

/**
 * Browser history navigation fix
 * Ensures that browser back/forward buttons work correctly
 */
export const enhanceBrowserNavigation = () => {
  // Listen for popstate events (back/forward button)
  window.addEventListener('popstate', (event) => {
    console.log('SPA Routing: Handling browser navigation');
    
    // If the state is null, we might be dealing with a routing issue
    if (!event.state && window.location.pathname !== '/') {
      // Try to restore the correct route
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      console.log('SPA Routing: Restoring route after browser navigation:', currentPath);
    }
  });
};

/**
 * Link click handler for internal navigation
 * Ensures all internal links work correctly
 */
export const enhanceInternalLinks = () => {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    
    if (link && link.href) {
      const url = new URL(link.href);
      const currentOrigin = window.location.origin;
      
      // If it's an internal link
      if (url.origin === currentOrigin && !link.hasAttribute('target')) {
        const path = url.pathname + url.search + url.hash;
        
        // Check if this is a route that should be handled by React Router
        const isAppRoute = path.startsWith('/client-dashboard') || 
                          path.startsWith('/trainer-dashboard') || 
                          path.startsWith('/dashboard') || 
                          path.startsWith('/shop') || 
                          path.startsWith('/about') || 
                          path.startsWith('/contact') || 
                          path.startsWith('/login') || 
                          path.startsWith('/signup');
        
        if (isAppRoute) {
          console.log('SPA Routing: Enhancing internal link navigation to:', path);
          
          // Prevent default link behavior
          event.preventDefault();
          
          // Use React Router navigation if available
          if (window.__ROUTER_CONTEXT_AVAILABLE__) {
            window.history.pushState(null, null, path);
            // Trigger a popstate event to notify React Router
            window.dispatchEvent(new PopStateEvent('popstate'));
          } else {
            // Fallback to standard navigation
            window.location.href = link.href;
          }
        }
      }
    }
  });
};

/**
 * Service Worker registration for offline SPA routing
 * Ensures the app works offline and handles routing correctly
 * Only registers in production to avoid development cache issues
 */
export const registerSPAServiceWorker = () => {
  // Only register service worker in production
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/spa-sw.js')
      .then((registration) => {
        console.log('SPA Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('SPA Service Worker registration failed:', error);
      });
  } else if (!import.meta.env.PROD && 'serviceWorker' in navigator) {
    // In development, unregister any existing service workers to avoid cache conflicts
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then(() => {
          console.log('SW: Unregistered service worker for development');
        });
      });
    });
    console.log('SW: Skipping service worker registration in development');
  }
};

/**
 * Clear service worker caches in development
 * Helps prevent cache-related issues during development
 */
export const clearServiceWorkerCaches = async () => {
  if ('caches' in window && !import.meta.env.PROD) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`SW: Clearing cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
      console.log('SW: All caches cleared for development');
    } catch (error) {
      console.warn('SW: Failed to clear caches:', error);
    }
  }
};

/**
 * Initialize all SPA routing fixes
 * Call this function once when the app starts
 *
 * UPDATED 2025-12-28: Disabled legacy routing fixes since we now have proper
 * server-side rewrites via Render. The old hash-based routing logic was
 * conflicting with React Router and causing refreshes to show homepage.
 */
export const initializeAllSPAFixes = () => {
  // Clear any existing service worker caches in development
  if (!import.meta.env.PROD) {
    clearServiceWorkerCaches();
  }

  // DISABLED: Legacy routing fixes that conflict with modern React Router + server rewrites
  // initializeSPARouting();
  // enhanceBrowserNavigation();
  // enhanceInternalLinks();

  console.log('[SPA Fix] Legacy routing fixes disabled - using React Router with server-side rewrites');

  // Register service worker after a delay to avoid blocking initial load
  setTimeout(registerSPAServiceWorker, 2000);
};

export default {
  initializeSPARouting,
  enhanceBrowserNavigation,
  enhanceInternalLinks,
  registerSPAServiceWorker,
  clearServiceWorkerCaches,
  initializeAllSPAFixes
};