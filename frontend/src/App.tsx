// /frontend/src/App.tsx

// DISABLED - These utilities were causing infinite loops and have been disabled
// import './utils/emergency-boot';
// import './utils/circuit-breaker';
// import './utils/emergencyAdminFix';

import './utils/pageViewTracker'; // Anonymous page view analytics
import React, { useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheetManager, type ShouldForwardProp } from 'styled-components';

// Context providers
import { AuthProvider } from './context/AuthContext';
import AppearanceSyncBridge from './components/appearance/AppearanceSyncBridge';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './hooks/use-toast'; // FIXED: Use correct ToastProvider with toast() function
import { SwanToastProvider } from './components/ui/Toast/ToastContainer';
import { CartProvider } from './context/CartContext';
import { FeatureAccessProvider } from './context/FeatureAccessContext';
import { PaywallProvider } from './context/PaywallContext';
import { SessionProvider } from './context/SessionContext';
import { ConfigProvider } from './context/ConfigContext';
import { UniversalThemeProvider } from './context/ThemeContext';
import { StyleLensProvider } from './core/style-lens-os';
import {
  SWAN_STYLE_LENS_REGISTRY,
  SwanStyleLensGlobalStyles,
} from './adapters/style-lens-swan';
import MenuStateProvider from './hooks/MenuStateProvider';
import { ConnectionStatusBanner, useBackendConnection } from './hooks/useBackendConnection';
import AdminImpersonationBanner from './components/Admin/AdminImpersonationBanner';

// Homepage Refactor v2.0 - Performance tier system
import { PerformanceTierProvider } from './core/perf/PerformanceTierProvider';
import { initPerformanceMonitoring } from './core/perf/performanceMonitor';

// Gamification Celebrations
import { CelebrationProvider } from './context/CelebrationContext';

// Development Tools
import { DevToolsProvider } from './components/DevTools';
import ThemeStatusIndicator from './components/ThemeStatusIndicator';

// PWA Components
import { TouchGestureProvider, NetworkStatus } from './components/PWA';

// Routes configuration
import MainRoutes from './routes/main-routes';

// Store
import { store, RootState } from './redux/store';
import { setInitialized } from './store/slices/appSlice';

// Utilities
import { setupNotifications } from './utils/notificationInitializer';
import { initializeApiMonitoring } from './utils/apiConnectivityFixer';
import clearMockTokens from './utils/clearMockTokens';

// Error Boundary (CTO/CEO consensus: top-level crash protection)
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Styles
import './styles/tokens.css'; // Crystalline Swan design tokens (CSS custom properties)
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
// import './styles/cart-mobile-optimizations.css'; // 🛒 AAA 7-Star Cart Mobile Experience (DISABLED - file removed)
// Crystalline Swan theme integration with Cosmic Elegance
// (ImprovedGlobalStyle import removed because it was imported but never rendered)
import CosmicEleganceGlobalStyle, { detectDeviceCapability } from './styles/CosmicEleganceGlobalStyle';
import './styles/theme';
// Import consolidated SwanStudios theme
// swanStudiosTheme now merged into UniversalThemeProvider (context/ThemeContext)
// Cosmic Performance Optimizer
import { initializeCosmicPerformance } from './utils/cosmicPerformanceOptimizer';
import { logger } from '@/utils/logger';

// Custom shouldForwardProp function to filter out props that cause warnings
const shouldForwardProp: ShouldForwardProp<'web'> = (prop) => {
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
  useSelector((state: RootState) => state.ui?.isLoading || false);
  useSelector((state: RootState) => state.ui?.isDarkMode || false);
  useSelector((state: RootState) => state.app?.isInitialized || false);
  
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
  
  // Initialize Cosmic Performance System
  const performanceCleanupRef = React.useRef<(() => void) | null>(null);
  
  useEffect(() => {
    // Skip if already initialized to prevent re-runs
    if (initializationRef.current) {
      return;
    }
    
    // Mark as initialized immediately
    initializationRef.current = true;
    
    logger.log('Running one-time App initialization...');

    if (import.meta.env.DEV) {
      import('./utils/routeDebugger');
      import('./utils/clearCache');
    }

    // Mark app as initialized in Redux store
    dispatch(setInitialized(true));
    
    // Clear any existing mock tokens that might interfere with real authentication
    const hadMockTokens = clearMockTokens();
    if (hadMockTokens) {
      logger.log('🔄 Cleared mock tokens, please login again with real credentials');
    }
    
    // Start API connection monitoring with a slight delay to prevent conflicts
    setTimeout(() => {
      initializeApiMonitoring();
    }, 500);
    
    // Initialize Cosmic Performance System
    performanceCleanupRef.current = initializeCosmicPerformance();

    // Initialize Homepage v2.0 Performance Monitoring
    // Tracks LCP, CLS, FPS, long tasks for performance budget enforcement
    initPerformanceMonitoring();
    logger.log('🎯 [Homepage v2.0] Performance monitoring initialized (LCP ≤2.5s, CLS ≤0.1, FPS ≥30)');
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
  
  // Cleanup performance monitoring on unmount
  useEffect(() => {
    return () => {
      if (performanceCleanupRef.current) {
        performanceCleanupRef.current();
      }
    };
  }, []);
  
  return (
    <>
      <CosmicEleganceGlobalStyle deviceCapability={deviceCapability} />
      
      {/* Network & Connection Status */}
      <NetworkStatus position="top" autoHide={true} />
      <ConnectionStatusBanner connection={connection} />
      <AdminImpersonationBanner />
      
      {/* Development Tools */}
      <ThemeStatusIndicator enabled={process.env.NODE_ENV === 'development'} />
      
      {/* Main App Router — wrapped in ErrorBoundary to prevent white-screens */}
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>

      {/* PWA Install Prompt - DISABLED until fixed */}
      {/* <PWAInstallPrompt /> */}
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HelmetProvider>
          <StyleSheetManager shouldForwardProp={shouldForwardProp}>
            <PerformanceTierProvider>
              <UniversalThemeProvider defaultTheme="crystalline-dark">
                <StyleLensProvider registry={SWAN_STYLE_LENS_REGISTRY}>
                  <ConfigProvider>
                  <SwanStyleLensGlobalStyles />
                  <MenuStateProvider>
                    <AuthProvider>
                      <FeatureAccessProvider>
                      <PaywallProvider>
                      <ToastProvider>
                        <SwanToastProvider>
                        <CartProvider>
                          {/* FUSION F1: server appearance sync — inside Auth+Toast (B4), renders null */}
                          <AppearanceSyncBridge />
                          <SessionProvider>
                            <TouchGestureProvider>
                              <CelebrationProvider>
                                <DevToolsProvider>
                                  <SocketProvider>
                                    <AppContent />
                                  </SocketProvider>
                                </DevToolsProvider>
                              </CelebrationProvider>
                            </TouchGestureProvider>
                          </SessionProvider>
                        </CartProvider>
                        </SwanToastProvider>
                      </ToastProvider>
                      </PaywallProvider>
                      </FeatureAccessProvider>
                    </AuthProvider>
                  </MenuStateProvider>
                  </ConfigProvider>
                </StyleLensProvider>
              </UniversalThemeProvider>
            </PerformanceTierProvider>
          </StyleSheetManager>
        </HelmetProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;
