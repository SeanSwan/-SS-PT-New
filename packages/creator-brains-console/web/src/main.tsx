import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/tokens.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('console shell: #root element is missing from index.html');
}

// S1-H17: a top-level net for a throw in App's own body (the inner boundary in
// App.tsx cannot catch its own parent). Without one, any uncaught render error
// unmounts the root and the operator gets a blank page.
createRoot(container).render(
  <StrictMode>
    <ErrorBoundary scope="The console shell">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
