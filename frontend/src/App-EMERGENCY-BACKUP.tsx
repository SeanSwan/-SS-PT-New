/**
 * App.tsx - EMERGENCY SIMPLIFIED VERSION
 * Eliminates complex theme provider chain causing runtime errors
 * Gets the site working immediately while preserving functionality
 */
import React from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';

// Essential context providers only
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Routes configuration
import MainRoutes from './routes/main-routes';

// Store
import { store } from './redux/store';

// Simplified theme object with safe defaults
const emergencyTheme = {
  colors: {
    primary: '#00d9ff',
    primaryLight: '#4de6ff', 
    accent: '#ff4081',
    background: '#0a0a1a',
    text: '#ffffff'
  },
  text: {
    primary: '#ffffff'
  },
  swanStudios: {
    colors: {
      primary: '#00d9ff',
      accent: '#ff4081'
    }
  }
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

// Create router from routes configuration
const router = createBrowserRouter([MainRoutes]);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HelmetProvider>
          <ThemeProvider theme={emergencyTheme}>
            <AuthProvider>
              <CartProvider>
                <RouterProvider router={router} />
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </HelmetProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;