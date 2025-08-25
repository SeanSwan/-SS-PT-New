// /frontend/src/App.tsx - RUNTIME ERROR FIXED VERSION
// Fixed imports and provider chain while preserving all original functionality

import React, { useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, StyleSheetManager } from 'styled-components';

// Context providers
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { SessionProvider } from './context/SessionContext';
import { ConfigProvider } from './context/ConfigContext';
import { UniversalThemeProvider } from './context/ThemeContext';
import MenuStateProvider from './hooks/useMenuState.tsx';
import { ConnectionStatusBanner, useBackendConnection } from './hooks/useBackendConnection.jsx';

// Development Tools
import { DevToolsProvider } from './components/DevTools';
import ThemeStatusIndicator from './components/ThemeStatusIndicator';

// PWA Components
import { TouchGestureProvider, PWAInstallPrompt, NetworkStatus } from './components/PWA';

// Routes configuration
import MainRoutes from './routes/main-routes';

// Store
import { store, RootState } from './redux/store';
import { setInitialized } from './store/slices/appSlice';

// Utilities - FIXED: Only import working utilities
import { setupNotifications } from './utils/notificationInitializer';
import { initializeMockData } from './utils/mockDataHelper';
import { initializeApiMonitoring } from './utils/apiConnectivityFixer';
import clearMockTokens from './utils/clearMockTokens';
import './utils/initTokenCleanup'; // Initialize token cleanup handlers

// Styles - FIXED: Removed missing cart-mobile-optimizations.css
import './App.css';
import './index.css';
import './styles/responsive-fixes.css';
import './styles/enhanced-responsive.css';
import './styles/auth-page-fixes.css';
import './styles/signup-fixes.css';
import './styles/aaa-enhancements.css';
import './styles/dashboard-global-styles.css'; // Dashboard full-space utilization styles
import './styles/animation-performance-fallbacks.css'; // Performance-optimized animation fallbacks
import './styles/cosmic-elegance-utilities.css'; // ✨ Cosmic Elegance Utility System
import './styles/cosmic-mobile-navigation.css'; // ✨ Cosmic Mobile Navigation System
import './styles/universal-theme-styles.css'; // ✨ Universal Theme Integration System
// Mobile-First Styles
import './styles/mobile/mobile-base.css';
import './styles/mobile/mobile-workout.css';

// Galaxy-Swan theme integration with Cosmic Elegance
import ImprovedGlobalStyle from './styles/ImprovedGlobalStyle';
import CosmicEleganceGlobalStyle, { detectDeviceCapability } from './styles/CosmicEleganceGlobalStyle';
import theme from './styles/theme';
// Import consolidated SwanStudios theme
import { swanStudiosTheme } from './core';

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
  // Use individual selectors to prevent unnecessary rerenders
  const user = useSelector((state: RootState) => state.auth?.user || null);
  const isAuthenticated = useSelector((state: RootState) => state.auth?.isAuthenticated || false);
  const isLoading = useSelector((state: RootState) => state.ui?.isLoading || false);
  const isDarkMode = useSelector((state: RootState) => state.ui?.isDarkMode || false);
  const isInitialized = useSelector((state: RootState) => state.app?.isInitialized || false);
  
  // Backend connection state
  const connection = useBackendConnection();
  
  // Redux dispatch
  const dispatch = useDispatch();
  
  // Device capability detection for performance optimization
  const [deviceCapability] = React.useState(() => detectDeviceCapability());
  
  // Set router context flag
  useEffect(() => {
    window.__ROUTER_CONTEXT_AVAILABLE__ = true;
    return () => {
      window.__ROUTER_CONTEXT_AVAILABLE__ = false;
    };
  }, []);
  
  // Initialize mock data for fallback when backend is unavailable
  // Using a ref to ensure this only runs once
  const initializationRef = React.useRef(false);
  
  useEffect(() => {
    // Skip if already initialized to prevent re-runs
    if (initializationRef.current) {
      return;
    }
    
    // Mark as initialized immediately
    initializationRef.current = true;
    
    console.log('Running one-time App initialization...');
    
    // Mark app as initialized in Redux store
    dispatch(setInitialized(true));
    
    // Clear any existing mock tokens that might interfere with real authentication
    const hadMockTokens = clearMockTokens();
    if (hadMockTokens) {
      console.log('🔄 Cleared mock tokens, please login again with real credentials');
    }
    
    // Initialize mock data system
    initializeMockData();
    
    // Start API connection monitoring with a slight delay to prevent conflicts
    setTimeout(() => {
      initializeApiMonitoring();
    }, 500);
  }, [dispatch]);
  
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
  
  return (
    <>
      <CosmicEleganceGlobalStyle deviceCapability={deviceCapability} />
      
      {/* Network & Connection Status */}
      <NetworkStatus position="top" autoHide={true} />
      <ConnectionStatusBanner connection={connection} />
      
      {/* Development Tools */}
      <ThemeStatusIndicator enabled={process.env.NODE_ENV === 'development'} />
      
      {/* Main App Router */}
      <RouterProvider router={router} />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </>
  );
};

const App = () => {
  console.log('✅ SwanStudios App initializing with full features...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HelmetProvider>
          <StyleSheetManager shouldForwardProp={shouldForwardProp}>
            <UniversalThemeProvider defaultTheme="swan-galaxy">
              <ThemeProvider theme={{ ...theme.dark, swanStudios: swanStudiosTheme }}>
                <ImprovedGlobalStyle />
                <ConfigProvider>
                  <MenuStateProvider>
                    <AuthProvider>
                      <ToastProvider>
                        <CartProvider>
                          <SessionProvider>
                            <TouchGestureProvider>
                              <DevToolsProvider>
                                <AppContent />
                              </DevToolsProvider>
                            </TouchGestureProvider>
                          </SessionProvider>
                        </CartProvider>
                      </ToastProvider>
                    </AuthProvider>
                  </MenuStateProvider>
                </ConfigProvider>
              </ThemeProvider>
            </UniversalThemeProvider>
          </StyleSheetManager>
        </HelmetProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;