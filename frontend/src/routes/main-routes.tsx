/**
 * main-routes.tsx
 * Main application routes configuration for the live monitoring/patrol security service website.
 * Implements a type-safe routing structure with protected routes and proper error handling.
 */
import React, { lazy, Suspense } from 'react';
import { RouteObject, Navigate, Outlet } from 'react-router-dom';

// Layout and Error Handling
import Layout from '../components/Layout/layout';
import ErrorBoundary from './error-boundary';

// Route Protection Components
import AdminRoute from './admin-route';
import ProtectedRoute from './protected-route';

// Types
interface ProtectedRouteProps {
  requiredRole?: string;
  children: React.ReactNode;
}

// Loading Component for Code Splitting
const PageLoader: React.FC = () => (
  <div className="page-loading-container">
    <div className="page-loading-spinner"></div>
  </div>
);

// Fallback component in case import fails - this is separate from ErrorBoundary
const ComponentLoadError = () => (
  <div className="error-container">
    <h2>Component Failed to Load</h2>
    <p>We're having trouble loading this page. Please try refreshing the browser.</p>
  </div>
);

// Lazy-loaded Components with error handling
// Public Pages - using dynamic import() with explicit file extensions
const HomePage = lazy(() => 
  import('../pages/HomePage/components/HomePage.component.jsx')
    .catch(() => {
      console.error('Failed to load HomePage component');
      return { default: ComponentLoadError };
    })
);
const LoginModal = lazy(() => import('../pages/LoginModal.component'));
const SignupModal = lazy(() => import('../pages/SignupModal.component'));
const ContactPage = lazy(() => import('../pages/contactpage/ContactPage'));
const AboutPage = lazy(() => import('../pages/about/About'));
const StoreFront = lazy(() => import('../pages/shop/StoreFront.component'));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage.component'));

// Checkout Pages
const CheckoutSuccess = lazy(() => import('../pages/checkout/CheckoutSuccess'));
const CheckoutCancel = lazy(() => import('../pages/checkout/CheckoutCancel'));

// Protected Pages
const ClientDashboard = lazy(() => import('../components/ClientDashboard/ClientDashboard'));
// AdminDashboard is commented out but kept for future implementation
// const AdminDashboard = lazy(() => import('../components/AdminDashboard/AdminDashboard'));

/**
 * Main application routes configuration
 * Organized by access level: public, protected, and admin routes
 */
const MainRoutes: RouteObject = {
  path: '/',
  element: (
    <Layout>
      <Outlet />
    </Layout>
  ),
  errorElement: <ErrorBoundary />,
  children: [
    // Public Routes
    {
      index: true,
      element: (
        <Suspense fallback={<PageLoader />}>
          <HomePage />
        </Suspense>
      )
    },
    {
      path: 'login',
      element: (
        <Suspense fallback={<PageLoader />}>
          <LoginModal />
        </Suspense>
      )
    },
    {
      path: 'signup',
      element: (
        <Suspense fallback={<PageLoader />}>
          <SignupModal />
        </Suspense>
      )
    },
    {
      path: 'contact',
      element: (
        <Suspense fallback={<PageLoader />}>
          <ContactPage />
        </Suspense>
      )
    },
    {
      path: 'about',
      element: (
        <Suspense fallback={<PageLoader />}>
          <AboutPage />
        </Suspense>
      )
    },
    {
      path: 'store',
      element: (
        <Suspense fallback={<PageLoader />}>
          <StoreFront />
        </Suspense>
      )
    },
    {
      path: 'unauthorized',
      element: (
        <Suspense fallback={<PageLoader />}>
          <UnauthorizedPage />
        </Suspense>
      )
    },
    
    // Checkout Routes
    {
      path: 'checkout/success',
      element: (
        <Suspense fallback={<PageLoader />}>
          <CheckoutSuccess />
        </Suspense>
      )
    },
    {
      path: 'checkout/cancel',
      element: (
        <Suspense fallback={<PageLoader />}>
          <CheckoutCancel />
        </Suspense>
      )
    },
    
    // Protected Client Routes
    {
      path: 'client-dashboard/*',
      element: (
        <ProtectedRoute requiredRole="client">
          <Suspense fallback={<PageLoader />}>
            <ClientDashboard />
          </Suspense>
        </ProtectedRoute>
      )
    },
    
    // Protected Admin Routes
    {
      path: 'admin-dashboard/*',
      element: (
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            {/* <AdminDashboard /> */}
            <div>Admin dashboard is not implemented</div>
          </Suspense>
        </AdminRoute>
      )
    },
    
    // Fallback Route (404)
    {
      path: '*',
      element: <Navigate to="/" replace />
    }
  ]
};

export default MainRoutes;