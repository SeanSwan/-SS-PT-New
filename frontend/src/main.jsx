// SOLUTION: FULL SWANSTUDIOS APP - BYPASSING CONFIGPROVIDER
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, StyleSheetManager } from 'styled-components';

// Context providers - WORKING ONES ONLY (bypassing ConfigProvider)
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { SessionProvider } from './context/SessionContext';
// import { ConfigProvider } from './context/ConfigProvider';  // CULPRIT - DISABLED
import { UniversalThemeProvider } from './context/ThemeContext';
import MenuStateProvider from './hooks/useMenuState';

// Routes configuration - YOUR ORIGINAL ROUTES
import MainRoutes from './routes/main-routes';
import ErrorBoundary from './routes/error-boundary';

// Store
import { store, RootState } from './redux/store';
import { setInitialized } from './store/slices/appSlice';

// Minimal utilities only
import clearMockTokens from './utils/clearMockTokens';

// EMERGENCY ICON FIX
import './utils/globalIconShim';

// Styles
import './App.css';
import './index.css';

// Theme (using existing working theme, not core theme)
import theme from './styles/theme';

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
 * AppContent Component - Restored with working providers only
 */
const AppContent = () => {
  const dispatch = useDispatch();
  const isInitialized = useSelector((state: RootState) => state.app?.isInitialized || false);
  
  // Minimal initialization (avoiding complex utilities that might break)
  useEffect(() => {
    console.log('🚀 SOLUTION: Loading full SwanStudios (ConfigProvider bypassed)...');
    
    try {
      dispatch(setInitialized(true));
      
      const hadMockTokens = clearMockTokens();
      if (hadMockTokens) {
        console.log('🔄 Cleared mock tokens');
      }
      
      console.log('✅ SOLUTION: SwanStudios initialization successful');
    } catch (initError) {
      console.error('❌ App initialization failed:', initError);
    }
  }, [dispatch]);
  
  return (
    <>      
      {/* YOUR ORIGINAL ROUTER WITH LAYOUT AND HEADER */}
      <RouterProvider router={router} />
    </>
  );
};

const App = () => {
  console.log('✅ SOLUTION: Loading full SwanStudios (ConfigProvider bypassed)...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HelmetProvider>
          <StyleSheetManager shouldForwardProp={shouldForwardProp}>
            <UniversalThemeProvider defaultTheme="swan-galaxy">
              <ThemeProvider theme={theme.dark}>
                <MenuStateProvider>
                  <AuthProvider>
                    <ToastProvider>
                      <CartProvider>
                        <SessionProvider>
                          <ErrorBoundary>
                            <AppContent />
                          </ErrorBoundary>
                        </SessionProvider>
                      </CartProvider>
                    </ToastProvider>
                  </AuthProvider>
                </MenuStateProvider>
              </ThemeProvider>
            </UniversalThemeProvider>
          </StyleSheetManager>
        </HelmetProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;
