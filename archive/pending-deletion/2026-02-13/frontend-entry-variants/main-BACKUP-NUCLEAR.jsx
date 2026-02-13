// NUCLEAR APPROACH: ZERO THEME IMPORTS - Find the real culprit
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';

// Context providers - BASIC ONES ONLY (no theme-related providers)
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
// import { CartProvider } from './context/CartContext';  // TESTING
// import { SessionProvider } from './context/SessionContext';  // TESTING
// import { UniversalThemeProvider } from './context/ThemeContext';  // SUSPECT - DISABLED

// Routes configuration - YOUR ORIGINAL ROUTES
import MainRoutes from './routes/main-routes';
import ErrorBoundary from './routes/error-boundary';

// Store
import { store } from './redux/store';
import { setInitialized } from './store/slices/appSlice';

// Minimal utilities only
import clearMockTokens from './utils/clearMockTokens';

// Styles - BASIC ONLY
import './index.css';
// import './App.css';  // TESTING - MIGHT HAVE THEME IMPORTS

console.log('🔥 NUCLEAR TEST: Zero theme imports - finding the real culprit...');

/**
 * AppContent Component - MINIMAL
 */
const AppContent = () => {
  const dispatch = useDispatch();
  const isInitialized = useSelector((state) => state.app?.isInitialized || false);
  
  // Minimal initialization
  useEffect(() => {
    console.log('🔥 NUCLEAR: Ultra-minimal SwanStudios loading...');
    
    try {
      dispatch(setInitialized(true));
      
      const hadMockTokens = clearMockTokens();
      if (hadMockTokens) {
        console.log('🔄 Cleared mock tokens');
      }
      
      console.log('✅ NUCLEAR: Minimal initialization successful');
    } catch (initError) {
      console.error('❌ NUCLEAR: Initialization failed:', initError);
    }
  }, [dispatch]);
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
      color: 'white',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Emergency Status Header */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ color: '#ef4444', margin: '0 0 0.5rem 0' }}>
          🔥 NUCLEAR TEST: Zero Theme Imports
        </h2>
        <p style={{ color: '#fecaca', margin: 0, fontSize: '0.875rem' }}>
          <strong>If you see this:</strong> The Y.create error is NOT in theme providers.<br/>
          <strong>If blue screen returns:</strong> The error is in basic Auth/Toast providers or routes.
        </p>
      </div>

      {/* Basic Router Test */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        padding: '1rem',
        borderRadius: '8px'
      }}>
        <h3 style={{ color: '#3b82f6', margin: '0 0 1rem 0' }}>
          🎯 Active Components
        </h3>
        <ul style={{ color: '#e2e8f0', margin: 0, paddingLeft: '1rem' }}>
          <li>✅ React & ReactDOM</li>
          <li>✅ Redux Store</li>
          <li>✅ AuthProvider</li>
          <li>✅ ToastProvider</li>
          <li>❌ CartProvider (disabled)</li>
          <li>❌ SessionProvider (disabled)</li>
          <li>❌ UniversalThemeProvider (disabled)</li>
          <li>❌ All theme imports (disabled)</li>
          <li>⚡ Router about to load...</li>
        </ul>
      </div>

      {/* Router Load Area */}
      <div style={{ marginTop: '2rem' }}>
        <RouterProvider router={router} />
      </div>
    </div>
  );
};

// Create router
const router = createBrowserRouter([MainRoutes]);

const App = () => {
  console.log('🔥 NUCLEAR: Loading ultra-minimal SwanStudios...');
  
  return (
    <Provider store={store}>
      <HelmetProvider>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </HelmetProvider>
    </Provider>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  console.log('✅ NUCLEAR: Ultra-minimal SwanStudios rendered');
} else {
  console.error('❌ Root element not found');
}
