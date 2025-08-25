// SIMPLIFIED MAIN ENTRY - EMERGENCY RUNTIME FIX
// Removing complex imports that might be causing runtime errors

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🚀 SwanStudios starting...');

// Get the root element
const rootElement = document.getElementById('root');

// Check if root element exists and render
if (rootElement) {
  console.log('✅ Root element found, rendering app...');
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('❌ Root element not found');
}
