// EMERGENCY REACT RUNTIME FIX - Clean React initialization
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// GLOBAL ICON SHIM - Fix FaArrowLeft error before app loads
import './utils/globalIconShim';

console.log('🚀 EMERGENCY FIX: Loading your ORIGINAL SwanStudios homepage with icon fixes...');

// Clean React initialization - no complex utilities that cause loops
const rootElement = document.getElementById('root');

if (rootElement) {
  console.log('✅ Root element found - rendering YOUR ORIGINAL HOMEPAGE');
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  console.log('✅ YOUR SWANSTUDIOS HOMEPAGE IS LOADING!');
} else {
  console.error('❌ Root element not found');
}
