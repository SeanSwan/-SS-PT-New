// DISABLED - These utilities were causing infinite loops and have been disabled
// import './utils/emergencyAdminFix';
// import './utils/hooksRecovery';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import Font Awesome setup
import '../fontawesome.setup';

// Import viewport fix utility
import initViewportFixes from './utils/viewportFix';

// Import image error handler
import { imageErrorHandler } from './utils/imageErrorHandler';

// Import token cleanup initialization
import './utils/initTokenCleanup';

// Import token debug tool (adds window.debugTokens() for debugging)
import './utils/tokenDebugTool';

// Import store initialization safeguard (must run before any components render)
import './utils/storeInitSafeguard';

// Import SPA routing fix for handling refresh and direct URL access
import { initializeAllSPAFixes } from './utils/spaRoutingFix';

// Import PWA service worker registration
import { initializePWA } from './utils/serviceWorkerRegistration';

// Initialize viewport fixes for better mobile experience
initViewportFixes();

// Initialize global image error handler to fix placeholder issues
imageErrorHandler.initialize();

// Initialize SPA routing fixes to handle refresh and direct URL access issues
initializeAllSPAFixes();

// Initialize PWA features (service worker, offline support, etc.)
initializePWA().then((pwaInfo) => {
  console.log('PWA initialized:', pwaInfo);
  
  // Add PWA info to window for debugging
  if (import.meta.env.DEV) {
    window.__PWA_INFO__ = pwaInfo;
  }
}).catch((error) => {
  console.warn('PWA initialization failed:', error);
});

// Get the root element - remove the TypeScript non-null assertion (!)
const rootElement = document.getElementById('root');

// Check if root element exists and render
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}