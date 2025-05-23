/**
 * Initialize Token Cleanup
 * =========================
 * This file should be imported early in the app initialization to ensure
 * token cleanup happens before any API calls are made
 */

import tokenCleanup from './tokenCleanup';

// Run token cleanup on app initialization
tokenCleanup.initializeTokenCleanup();

// Add a global event listener for token cleanup events
window.addEventListener('tokenCleanup', (event: any) => {
  console.log('Token cleanup event received:', event.detail);
  
  // Optionally redirect to login page or show a message
  // This can be customized based on your app's needs
});

window.addEventListener('tokenError', (event: any) => {
  console.log('Token error event received:', event.detail);
  
  // Optionally show a toast message or redirect
  // This can be customized based on your app's needs
});

export default tokenCleanup;
