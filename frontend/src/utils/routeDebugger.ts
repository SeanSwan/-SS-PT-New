/**
 * Route Debugger Utility
 * Helps diagnose SPA routing issues
 */

export function logRouteChange(location: Location) {
  console.log('🔍 [Route Debugger] Location changed:', {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: (location as any).state,
    href: window.location.href,
    timestamp: new Date().toISOString()
  });
}

export function monitorRouting() {
  // Log initial route
  console.log('🔍 [Route Debugger] Initial route:', window.location.pathname);

  // Monitor history changes
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    console.log('🔍 [Route Debugger] pushState called:', args[2]);
    return originalPushState.apply(history, args);
  };

  history.replaceState = function(...args) {
    console.log('🔍 [Route Debugger] replaceState called:', args[2]);
    return originalReplaceState.apply(history, args);
  };

  // Monitor popstate (back/forward)
  window.addEventListener('popstate', (event) => {
    console.log('🔍 [Route Debugger] popstate event:', {
      pathname: window.location.pathname,
      state: event.state
    });
  });

  console.log('🔍 [Route Debugger] Monitoring enabled');
}

// Auto-enable in development
if (import.meta.env.DEV) {
  monitorRouting();
}
