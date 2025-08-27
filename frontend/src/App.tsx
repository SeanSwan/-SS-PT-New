// RESTORED ORIGINAL SWANSTUDIOS APP - Your original system with proper fixes
import React, { useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, StyleSheetManager } from 'styled-components';

// Context providers - ESSENTIAL for your original header
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { SessionProvider } from './context/SessionContext';
import { ConfigProvider } from './context/ConfigContext';
import { UniversalThemeProvider } from './context/ThemeContext';
import MenuStateProvider from './hooks/useMenuState';
import { ConnectionStatusBanner, useBackendConnection } from './hooks/useBackendConnection';

// Development Tools
import { DevToolsProvider } from './components/DevTools';
import ThemeStatusIndicator from './components/ThemeStatusIndicator';

// PWA Components
import { TouchGestureProvider, PWAInstallPrompt, NetworkStatus } from './components/PWA';

// Routes configuration - YOUR ORIGINAL ROUTES
import MainRoutes from './routes/main-routes';
import ErrorBoundary from './routes/error-boundary';

// Store
import { store, RootState } from './redux/store';
import { setInitialized } from './store/slices/appSlice';

// Utilities - ONLY WORKING ONES
import { setupNotifications } from './utils/notificationInitializer';
import { initializeMockData } from './utils/mockDataHelper';
import { initializeApiMonitoring } from './utils/apiConnectivityFixer';
import clearMockTokens from './utils/clearMockTokens';
import './utils/initTokenCleanup';

// EMERGENCY ICON FIX
import './utils/globalIconShim';

// Styles
import './App.css';
import './index.css';
import './styles/responsive-fixes.css';
import './styles/enhanced-responsive.css';
import './styles/auth-page-fixes.css';
import './styles/signup-fixes.css';
import './styles/aaa-enhancements.css';
import './styles/dashboard-global-styles.css';
import './styles/animation-performance-fallbacks.css';
import './styles/cosmic-elegance-utilities.css';
import './styles/cosmic-mobile-navigation.css';
import './styles/universal-theme-styles.css';
import './styles/mobile/mobile-base.css';
import './styles/mobile/mobile-workout.css';

// Galaxy-Swan theme integration
import ImprovedGlobalStyle from './styles/ImprovedGlobalStyle';
import CosmicEleganceGlobalStyle, { detectDeviceCapability } from './styles/CosmicEleganceGlobalStyle';
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

// Create router from YOUR ORIGINAL routes configuration
const router = createBrowserRouter([MainRoutes]);

/**
 * AppContent Component - Your original system
 */
const AppContent = () => {
  const user = useSelector((state: RootState) => state.auth?.user || null);
  const isAuthenticated = useSelector((state: RootState) => state.auth?.isAuthenticated || false);
  const isLoading = useSelector((state: RootState) => state.ui?.isLoading || false);
  const isDarkMode = useSelector((state: RootState) => state.ui?.isDarkMode || false);
  const isInitialized = useSelector((state: RootState) => state.app?.isInitialized || false);
  
  let connection = null;
  try {
    connection = useBackendConnection();
  } catch (connectionError) {
    console.warn('Backend connection hook failed:', connectionError);
    connection = null;
  }
  const dispatch = useDispatch();
  const [deviceCapability] = React.useState(() => {
    try {
      return detectDeviceCapability();
    } catch (deviceError) {
      console.warn('Device capability detection failed:', deviceError);
      return 'basic';
    }
  });
  
  // Set router context flag
  useEffect(() => {
    window.__ROUTER_CONTEXT_AVAILABLE__ = true;
    return () => {
      window.__ROUTER_CONTEXT_AVAILABLE__ = false;
    };
  }, []);
  
  // Initialize app with error handling
  const initializationRef = React.useRef(false);
  
  useEffect(() => {
    if (initializationRef.current) {
      return;
    }
    
    initializationRef.current = true;
    console.log('Running SwanStudios initialization...');
    
    try {
      dispatch(setInitialized(true));
      
      const hadMockTokens = clearMockTokens();
      if (hadMockTokens) {
        console.log('🔄 Cleared mock tokens, please login again with real credentials');
      }
      
      initializeMockData();
      
      setTimeout(() => {
        try {
          initializeApiMonitoring();
        } catch (apiError) {
          console.warn('API monitoring initialization failed:', apiError);
        }
      }, 500);
    } catch (initError) {
      console.error('App initialization failed:', initError);
    }
  }, [dispatch]);
  
  // Initialize notifications when user is authenticated
  useEffect(() => {
    let cleanupNotifications: (() => void) | null = null;
    
    if (isAuthenticated && user) {
      try {
        cleanupNotifications = setupNotifications();
      } catch (notifError) {
        console.warn('Notification setup failed:', notifError);
      }
    }
    
    return () => {
      if (cleanupNotifications) {
        try {
          cleanupNotifications();
        } catch (cleanupError) {
          console.warn('Notification cleanup failed:', cleanupError);
        }
      }
    };
  }, [isAuthenticated, user]);
  
  return (
    <>
      {/* Global Styles with error boundary */}
      {React.createElement(() => {
        try {
          return <CosmicEleganceGlobalStyle deviceCapability={deviceCapability} />;
        } catch (styleError) {
          console.warn('Global style initialization failed:', styleError);
          return null;
        }
      })}
      
      {/* Network & Connection Status */}
      {connection && (
        <>
          <NetworkStatus position="top" autoHide={true} />
          <ConnectionStatusBanner connection={connection} />
        </>
      )}
      
      {/* Development Tools */}
      {process.env.NODE_ENV === 'development' && (
        <ThemeStatusIndicator enabled={true} />
      )}
      
      {/* YOUR ORIGINAL ROUTER WITH LAYOUT AND HEADER */}
      <RouterProvider router={router} />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </>
  );
};

const App = () => {
  console.log('✅ FIXED: Loading SwanStudios with error handling...');
  
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
                                <ErrorBoundary>
                                  <AppContent />
                                </ErrorBoundary>
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