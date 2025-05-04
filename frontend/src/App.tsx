// /frontend/src/App.tsx

import React from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';

// Context providers
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { ConfigProvider } from './context/ConfigContext';
import MenuStateProvider from './hooks/useMenuState';

// Routes configuration
import MainRoutes from './routes/main-routes';

// Store
import store from './store';

// Styles
import './App.scss';
import './index.css';
import GlobalStyle from './styles/GlobalStyle';
import theme from './styles/theme';

// Create React Query client
const queryClient = new QueryClient();

// Create router from routes configuration
const router = createBrowserRouter([MainRoutes]);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HelmetProvider>
          <ThemeProvider theme={theme.dark}>
            <GlobalStyle />
            <ConfigProvider>
              <MenuStateProvider>
                <AuthProvider>
                  <ToastProvider>
                    <CartProvider>
                      {/* Removed the div wrapper to prevent extra container that could cause margin issues */}
                      <RouterProvider router={router} />
                    </CartProvider>
                  </ToastProvider>
                </AuthProvider>
              </MenuStateProvider>
            </ConfigProvider>
          </ThemeProvider>
        </HelmetProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;