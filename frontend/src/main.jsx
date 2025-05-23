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

// Initialize viewport fixes for better mobile experience
initViewportFixes();

// Initialize global image error handler to fix placeholder issues
imageErrorHandler.initialize();

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