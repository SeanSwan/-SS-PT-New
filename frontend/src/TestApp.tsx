/**
 * TEST APP - Simplified version to identify blank page cause
 * This bypasses complex Header dependencies to isolate the problem
 */
import React, { useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, StyleSheetManager } from 'styled-components';

// Essential context providers only
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { UniversalThemeProvider } from './context/ThemeContext';

// Test routes (bypasses complex Header)
import TestRoutes from './routes/test-routes';
import ErrorBoundary from './routes/error-boundary';

// Store
import { store, RootState } from './redux/store';
import { setInitialized } from './store/slices/appSlice';

// Minimal utilities
import clearMockTokens from './utils/clearMockTokens';

// Styles
import './App.css';
import './index.css';
import theme from './styles/theme';
import { swanStudiosTheme } from './core';

// Custom shouldForwardProp function
const shouldForwardProp = (prop) => {
  const nonDOMProps = ['variants', 'sx', 'as', 'theme', 'variant'];
  return !nonDOMProps.includes(prop);
};

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000,
      retry: 1
    },
  },
});

// Create router with test routes
const router = createBrowserRouter([TestRoutes]);

/**
 * Minimal AppContent Component
 */
const TestAppContent = () => {
  const dispatch = useDispatch();
  const isInitialized = useSelector((state: RootState) => state.app?.isInitialized || false);
  
  // Minimal initialization
  useEffect(() => {
    console.log('🧪 TEST APP: Running minimal initialization...');
    
    try {
      dispatch(setInitialized(true));
      const hadMockTokens = clearMockTokens();
      if (hadMockTokens) {
        console.log('🔄 Cleared mock tokens');
      }
      console.log('✅ TEST APP: Initialization successful');
    } catch (initError) {
      console.error('❌ TEST APP: Initialization failed:', initError);
    }
  }, [dispatch]);
  
  return (
    <>
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 255, 0, 0.1)',
        color: '#00ff00',
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #00ff00',
        fontSize: '12px',
        zIndex: 10000
      }}>
        🧪 TEST MODE: Header bypassed
      </div>
      
      <RouterProvider router={router} />
    </>
  );
};

const TestApp = () => {
  console.log('🧪 TEST APP: Loading minimal SwanStudios (Header bypassed)...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HelmetProvider>
          <StyleSheetManager shouldForwardProp={shouldForwardProp}>
            <UniversalThemeProvider defaultTheme="swan-galaxy">
              <ThemeProvider theme={{ ...theme.dark, swanStudios: swanStudiosTheme }}>
                <AuthProvider>
                  <ToastProvider>
                    <ErrorBoundary>
                      <TestAppContent />
                    </ErrorBoundary>
                  </ToastProvider>
                </AuthProvider>
              </ThemeProvider>
            </UniversalThemeProvider>
          </StyleSheetManager>
        </HelmetProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default TestApp;
