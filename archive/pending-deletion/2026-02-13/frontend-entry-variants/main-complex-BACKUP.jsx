// /frontend/src/main.jsx - RUNTIME ERROR FIXED VERSION
// Fixed utility imports while preserving essential functionality

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import WORKING utilities only - removed problematic ones that caused loops
import initViewportFixes from './utils/viewportFix';
import { imageErrorHandler } from './utils/imageErrorHandler';
import './utils/initTokenCleanup';
import './utils/tokenDebugTool';
import './utils/storeInitSafeguard';
import { initializeAllSPAFixes } from './utils/spaRoutingFix';
import { initializePWA } from './utils/serviceWorkerRegistration';

console.log('🚀 SwanStudios starting with full original features...');

// Initialize viewport fixes for better mobile experience
initViewportFixes();

// Initialize global image error handler to fix placeholder issues
imageErrorHandler.initialize();

// Initialize SPA routing fixes to handle refresh and direct URL access issues
initializeAllSPAFixes();

// Initialize PWA features (service worker, offline support, etc.)
initializePWA().then((pwaInfo) => {
  console.log('✅ PWA initialized:', pwaInfo);
  
  // Add PWA info to window for debugging
  if (import.meta.env.DEV) {
    window.__PWA_INFO__ = pwaInfo;
  }
}).catch((error) => {
  console.warn('⚠️ PWA initialization failed:', error);
});

// Get the root element
const rootElement = document.getElementById('root');

// Check if root element exists and render
if (rootElement) {
  console.log('✅ Root element found, rendering SwanStudios app...');
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ SwanStudios rendered successfully!');
} else {
  console.error('❌ Root element not found - check index.html');
}