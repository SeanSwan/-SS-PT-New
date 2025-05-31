/**
 * Token Cleanup Initialization
 * ===========================
 * Handles token cleanup on app startup
 */

// Listen for token cleanup events
if (typeof window !== 'undefined') {
  // Handle token cleanup events
  window.addEventListener('tokenCleanup', (event: any) => {
    console.log('Token cleanup event received:', event.detail);
    // Could trigger a notification or redirect to login
  });

  // Handle token error events
  window.addEventListener('tokenError', (event: any) => {
    console.log('Token error event received:', event.detail);
    // In development mode, don't immediately redirect to avoid loops
    if (import.meta.env.MODE === 'development') {
      console.log('[DEV MODE] Token error detected but not forcing logout');
    }
  });

  // Development mode helper to reset everything
  if (import.meta.env.MODE === 'development') {
    window.clearAuthData = function() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('tokenTimestamp');
      localStorage.removeItem('bypass_admin_verification');
      console.log('[DEV MODE] Auth data cleared. Reload the page.');
      return 'Auth data cleared.';
    };

    console.log('[DEV MODE] Token cleanup initialized. Use window.clearAuthData() to reset.');
  }
}

export default {};
