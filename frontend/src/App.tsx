// /frontend/src/App.tsx

import React, { useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, StyleSheetManager } from 'styled-components';

// Context providers
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { ConfigProvider } from './context/ConfigContext';
import MenuStateProvider from './hooks/useMenuState';

// Development Tools
import { DevToolsProvider } from './components/DevTools';

// Routes configuration
import MainRoutes from './routes/main-routes';

// Store
import store, { RootState } from './store';

// Utilities
import { setupNotifications } from './utils/notificationInitializer';
import { initializeMockData } from './utils/mockDataHelper';
import { initializeApiMonitoring } from './utils/apiConnectivityFixer';

// Styles
import './App.scss';
import './index.css';
import './styles/responsive-fixes.css';
import './styles/enhanced-responsive.css';
import './styles/auth-page-fixes.css';
import './styles/signup-fixes.css';
import ImprovedGlobalStyle from './styles/ImprovedGlobalStyle';
import theme from './styles/theme';

// Custom shouldForwardProp function to filter out props that cause warnings
const shouldForwardProp = (prop) => {
  // Filter out common styling props that shouldn't be forwarded to DOM
  const nonDOMProps = ['variants', 'sx', 'as', 'theme', 'variant'];
  return !nonDOMProps.includes(prop);
};

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      retry: 1
    },
  },
});

// Create router from routes configuration
const router = createBrowserRouter([MainRoutes]);

/**
 * AppContent Component
 * Handles initialization of features like notifications after authentication
 */
const AppContent = () => {
  // Get authentication state from Redux store
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth || {});
  
  // Initialize mock data for fallback when backend is unavailable
  useEffect(() => {
    // Initialize mock data system
    initializeMockData();
    
    // Start API connection monitoring
    initializeApiMonitoring();
  }, []);
  
  // Initialize notifications when user is authenticated
  useEffect(() => {
    let cleanupNotifications: (() => void) | null = null;
    
    if (isAuthenticated && user) {
      cleanupNotifications = setupNotifications();
    }
    
    return () => {
      if (cleanupNotifications) {
        cleanupNotifications();
      }
    };
  }, [isAuthenticated, user]);
  
  return <RouterProvider router={router} />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HelmetProvider>
          <StyleSheetManager shouldForwardProp={shouldForwardProp}>
            <ThemeProvider theme={theme.dark}>
              <ImprovedGlobalStyle />
              <ConfigProvider>
                <MenuStateProvider>
                  <AuthProvider>
                    <ToastProvider>
                      <CartProvider>
                        <DevToolsProvider>
                          <AppContent />
                        </DevToolsProvider>
                      </CartProvider>
                    </ToastProvider>
                  </AuthProvider>
                </MenuStateProvider>
              </ConfigProvider>
            </ThemeProvider>
          </StyleSheetManager>
        </HelmetProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;