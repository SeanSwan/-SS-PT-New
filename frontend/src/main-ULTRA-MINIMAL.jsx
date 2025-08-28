/**
 * main-ULTRA-MINIMAL.jsx - ABSOLUTELY ZERO DEPENDENCIES
 * No CSS imports, no nothing - just React
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('🔥 ULTRA-MINIMAL: Zero dependencies test...');

const UltraMinimalApp = () => {
  return React.createElement('div', {
    style: {
      background: '#000',
      color: '#fff',
      padding: '50px',
      fontSize: '24px',
      fontFamily: 'Arial',
      minHeight: '100vh'
    }
  }, [
    React.createElement('h1', { key: 'title' }, '🔥 ULTRA-MINIMAL TEST'),
    React.createElement('p', { key: 'desc' }, 'If you see this, the issue is in CSS or build config'),
    React.createElement('p', { key: 'status' }, 'React + ReactDOM only - ZERO other imports')
  ]);
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(React.createElement(UltraMinimalApp));
  console.log('✅ ULTRA-MINIMAL: Rendered successfully');
} else {
  console.error('❌ Root element not found');
}
