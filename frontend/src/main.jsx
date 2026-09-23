// DISABLED - These utilities were causing infinite loops and have been disabled
// import './utils/emergencyAdminFix';

// Error reporting first: the SDK's global handlers must be installed before
// any application code can throw. Inert without VITE_SENTRY_DSN (SWA-225 EX-4).
import './instrument';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { StyleSheetManager } from 'styled-components';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import App from './App';
import './index.css';
import { logger } from '@/utils/logger';

// Create Emotion cache for styled-components v6
const emotionCache = createCache({
  key: 'swanstudios',
  prepend: true,
});

// Acquisition: persist a shared milestone link's ?ref= code the moment the visitor lands,
// BEFORE any in-app navigation drops the query param (forms read it back at submit time).
import { captureReferralOnLanding } from './utils/acquisitionAttribution';
captureReferralOnLanding();

// Import viewport fix utility
import initViewportFixes from './utils/viewportFix';

// Import image error handler
import { imageErrorHandler } from './utils/imageErrorHandler';

// Import token cleanup initialization
import './utils/initTokenCleanup';

// Token debug helpers are development-only and expose token metadata on window.
if (import.meta.env.DEV) {
  import('./utils/tokenDebugTool');
}

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
  logger.log('PWA initialized:', pwaInfo);
  
  // Add PWA info to window for debugging
  if (import.meta.env.DEV) {
    window.__PWA_INFO__ = pwaInfo;
  }
}).catch((error) => {
  logger.warn('PWA initialization failed:', error);
});

// Get the root element - remove the TypeScript non-null assertion (!)
const rootElement = document.getElementById('root');

// Check if root element exists and render
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <CacheProvider value={emotionCache}>
        <StyleSheetManager>
          <App />
        </StyleSheetManager>
      </CacheProvider>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
