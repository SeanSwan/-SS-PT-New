import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Context providers
import { AuthProvider } from '../../context/AuthContext';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';

// Components and pages
import HomePage from '../../pages/HomePage.component';
import LoginModal from '../../pages/LoginModal.component';
import SignupModal from '../../pages/SignupModal.component';
import ContactPage from '../../pages/contactpage/ContactPage';
import AboutPage from '../../pages/about/About';
import StoreFront from '../../pages/shop/StoreFront.component';
import ClientDashboard from '../../components/ClientDashboard/ClientDashboard';
import UnauthorizedPage from '../../pages/UnauthorizedPage.component';

// Error Boundary
import ErrorBoundary from '../../components/ErrorBoundary/error-boundry.component';

// BerryAdmin import - direct import to simplify integration
import Berry from '../../BerryAdmin/berryIndex';

// Store
import store from '../../store';

// Create React Query client
const queryClient = new QueryClient();

// Custom AdminRoute component that ensures proper authentication
const AdminRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading authentication...</div>;
  }
  
  // For debugging - log why redirect happens
  if (!user) {
    console.log("Admin route blocked: No user logged in");
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'admin') {
    console.log("Admin route blocked: User is not admin", user.role);
    return <Navigate to="/unauthorized" replace />;
  }
  
  // User is authenticated as admin
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
  
  // Allow admin to access all protected routes regardless of requiredRole
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    console.log(`Access blocked: User is ${user.role}, needs ${requiredRole}`);
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginModal />} />
      <Route path="/signup" element={<SignupModal />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/store" element={<StoreFront />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      
      {/* Protected client routes */}
      <Route
        path="/client-dashboard/*"
        element={
          <ProtectedRoute requiredRole="client">
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
      
      {/* 
        Admin routes - Using Berry Admin Dashboard
        The /* at the end is important to pass all nested routes to Berry 
      */}
      <Route
        path="/admin-dashboard/*"
        element={
          <AdminRoute>
            <Berry />
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
              <Router>
                <ErrorBoundary>
                  <div className="main" id="main-app-container">
                    <AppRoutes />
                  </div>
                </ErrorBoundary>
              </Router>
            </ToastProvider>
          </AuthProvider>
        </HelmetProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;