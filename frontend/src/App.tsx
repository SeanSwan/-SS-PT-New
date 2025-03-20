// /frontend/src/App.tsx

import React from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Context providers
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';

// Routes configuration
import MainRoutes from './routes/main-routes';

// Store
import store from './store';

// Create React Query client
const queryClient = new QueryClient();

// Create router from routes configuration
const router = createBrowserRouter([MainRoutes]);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HelmetProvider>
          <AuthProvider>
            <ToastProvider>
              <CartProvider>
                <div className="main" id="main-app-container">
                  <RouterProvider router={router} />
                </div>
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </HelmetProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;