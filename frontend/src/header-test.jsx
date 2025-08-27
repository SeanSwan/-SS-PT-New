/**
 * HEADER TEST - Uses TestApp to bypass complex Header dependencies
 * This will help identify if the Header is causing the blank page
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import TestApp from './TestApp';
import './index.css';

console.log('🧪 HEADER TEST: Testing if complex Header is causing blank page...');

const rootElement = document.getElementById('root');

if (rootElement) {
  console.log('✅ Root element found - rendering TEST APP (Header bypassed)');
  const root = ReactDOM.createRoot(rootElement);
  root.render(<TestApp />);
  console.log('✅ TEST APP LOADED - Check if page displays!');
} else {
  console.error('❌ Root element not found');
}
