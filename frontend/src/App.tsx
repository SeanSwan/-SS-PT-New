// /frontend/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Context providers
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext'; // Import CartProvider (now .tsx)

// Components and pages
import Layout from './components/Layout/layout';

import LoginModal from './pages/LoginModal.component';
import SignupModal from './pages/SignupModal.component';
import ContactPage from './pages/contactpage/ContactPage';
import AboutPage from './pages/about/About';
import StoreFront from './pages/shop/StoreFront.component';
import ClientDashboard from './components/ClientDashboard/ClientDashboard';
import UnauthorizedPage from './pages/UnauthorizedPage.component';
// Fix the import path to match the actual file path and case
import HomePage from './pages/HomePage/components/HomePage.component.jsx';

// Checkout pages
import CheckoutSuccess from './pages/checkout/CheckoutSuccess';
import CheckoutCancel from './pages/checkout/CheckoutCancel';

// Error Boundary
import ErrorBoundary from './components/ErrorBoundary/error-boundry.component';

// Admin Dashboard 
import AdminDashboardLayout from './components/DashBoard/admin-dashboard-layout';

// Store
import store from './store';

// Create React Query client
const queryClient = new QueryClient();

// Custom AdminRoute component that ensures proper authentication
const AdminRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading authentication...</div>;
  }
  
  if (!user) {
    console.log("Admin route blocked: No user logged in");
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'admin') {
    console.log("Admin route blocked: User is not admin", user.role);
    return <Navigate to="/unauthorized" replace />;
  }
  
  console.log("Admin access granted to:", user.username);
  return children;
};

// Protected route for client access
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading authentication...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    console.log(`Access blocked: User is ${user.role}, needs ${requiredRole}`);
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes with Layout */}
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/login" element={<Layout><LoginModal /></Layout>} />
      <Route path="/signup" element={<Layout><SignupModal /></Layout>} />
      <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
      <Route path="/about" element={<Layout><AboutPage /></Layout>} />
      <Route path="/store" element={<Layout><StoreFront /></Layout>} />
      <Route path="/unauthorized" element={<Layout><UnauthorizedPage /></Layout>} />
      
      {/* Checkout routes */}
      <Route path="/checkout/success" element={<Layout><CheckoutSuccess /></Layout>} />
      <Route path="/checkout/cancel" element={<Layout><CheckoutCancel /></Layout>} />
      
      {/* Protected client routes */}
      <Route
        path="/client-dashboard/*"
        element={
          <ProtectedRoute requiredRole="client">
            <Layout>
              <ClientDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      {/* Admin routes */}
      <Route
        path="/admin-dashboard/*"
        element={
          <AdminRoute>
            <AdminDashboardLayout />
          </AdminRoute>
        }
      />
      
      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HelmetProvider>
          <AuthProvider>
            <ToastProvider>
              <CartProvider> {/* Add CartProvider */}
                <Router>
                  <ErrorBoundary>
                    <div className="main" id="main-app-container">
                      <AppRoutes />
                    </div>
                  </ErrorBoundary>
                </Router>
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </HelmetProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;