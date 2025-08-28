/**
 * main.jsx - ULTIMATE NUCLEAR TEST
 * ZERO dependencies beyond React - Absolute minimal test
 * If this works: Theme system is 100% the culprit
 * If this fails: Infrastructure problem
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppNuke from './App-NUKE';

console.log('🔥 ULTIMATE NUCLEAR TEST: Loading absolute minimal React app...');

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<AppNuke />);
  console.log('✅ ULTIMATE NUCLEAR TEST: Minimal app rendered successfully');
} else {
  console.error('❌ ULTIMATE NUCLEAR TEST: Root element not found');
}
