import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import Font Awesome setup
import '../fontawesome.setup';

// Import viewport fix utility
import initViewportFixes from './utils/viewportFix';

// Initialize viewport fixes for better mobile experience
initViewportFixes();

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