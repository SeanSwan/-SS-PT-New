// EMERGENCY REACT RUNTIME FIX - Clean React initialization
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🚀 EMERGENCY FIX: Loading your ORIGINAL SwanStudios homepage...');

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