/**
 * main-routes.tsx
 * Main application routes configuration for SwanStudios fitness platform.
 * Implements a type-safe routing structure with protected routes and improved error handling.
 */
import React, { lazy, Suspense } from 'react';
import { RouteObject, Navigate, Outlet } from 'react-router-dom';

// Layout and Error Handling
import Layout from '../components/Layout/layout';
import ErrorBoundary from './error-boundary';

// Route Protection Components
import AdminRoute from './admin-route-emergency';
import ProtectedRoute from './protected-route';
import { DashboardWrapper } from '../components/DashboardWrapper';

// Custom Routes
import DebugRoutes from './debug-routes';

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

// Enhanced error component with retry functionality
const ComponentLoadError = ({ componentName = "Component", retryFn = null }) => (
  <div className="error-container" style={{
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center',
    background: 'rgba(30, 30, 60, 0.4)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'white'
  }}>
    <h2 style={{ color: '#ff416c' }}>Failed to Load {componentName}</h2>
    <p>We're having trouble loading this page. This could be due to a network issue or a problem with the component.</p>
    
    {retryFn && (
      <button 
        onClick={retryFn}
        style={{
          background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          color: '#0a0a1a',
          fontWeight: 500,
          cursor: 'pointer',
          marginTop: '1rem'
        }}
      >
        Retry Loading
      </button>
    )}
    
    <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>
      If this issue persists, please try refreshing the browser or contact support.
    </p>
  </div>
);

// Enhanced lazy loading function with better error handling
function lazyLoadWithErrorHandling(importFn, componentName) {
  return lazy(() => 
    importFn()
      .catch(error => {
        console.error(`Failed to load ${componentName}:`, error);
        // Return a component that displays the error but allows retrying
        return {
          default: (props) => (
            <ComponentLoadError 
              componentName={componentName} 
              retryFn={() => window.location.reload()}
            />
          )
        };
      })
  );
}

// Lazy-loaded Components with enhanced error handling
// Public Pages
const HomePage = lazyLoadWithErrorHandling(
  () => import('../pages/HomePage/components/HomePage.component.jsx'),
  'Home Page'
);
const LoginModal = lazyLoadWithErrorHandling(
  () => import('../pages/EnhancedLoginModal'),
  'Login Modal'
);
const SignupModal = lazyLoadWithErrorHandling(
  () => import('../pages/OptimizedSignupModal'),
  'Signup Modal'
);
const ContactPage = lazyLoadWithErrorHandling(
  () => import('../pages/contactpage'),
  'Contact Page'
);
const AboutPage = lazyLoadWithErrorHandling(
  () => import('../pages/about/About'),
  'About Page'
);
const StoreFront = lazyLoadWithErrorHandling(
  () => import('../pages/shop/StoreFront.component'),
  'Storefront'
);
const StoreFrontFixed = lazyLoadWithErrorHandling(
  () => import('../pages/shop/StoreFrontFixed.component'),
  'Fixed Storefront'
);
const DebugStoreFront = lazyLoadWithErrorHandling(
  () => import('../pages/shop/DebugStoreFront.component'),
  'Debug Storefront'
);
const SimplifiedStoreFront = lazyLoadWithErrorHandling(
  () => import('../pages/shop/SimplifiedStoreFront.component'),
  'Simplified Storefront'
);
const ShopPage = lazyLoadWithErrorHandling(
  () => import('../pages/shop/ShopPage'),
  'Shop Page'
);
const RawPackageViewer = lazyLoadWithErrorHandling(
  () => import('../pages/shop/RawPackageViewer'),
  'Raw Package Viewer'
);
const ProductDetail = lazyLoadWithErrorHandling(
  () => import('../components/Shop/ProductDetail'),
  'Product Detail'
);
const FoodScannerPage = lazyLoadWithErrorHandling(
  () => import('../pages/FoodScanner/FoodScannerPage'),
  'Food Scanner'
);
// Temporarily disabled - missing theme dependencies
// const SwanBrandShowcase = lazyLoadWithErrorHandling(
//   () => import('../components/SwanBrandShowcase.component'),
//   'Swan Brand Showcase'
// );
const UnauthorizedPage = lazyLoadWithErrorHandling(
  () => import('../pages/UnauthorizedPage.component'),
  'Unauthorized Page'
);
// Schedule Related Components
const ScheduleContainer = lazyLoadWithErrorHandling(
  () => import('../components/Schedule'),
  'Schedule Container'
);
const EnhancedScheduleWrapper = lazyLoadWithErrorHandling(
  () => import('../components/Schedule').then(module => ({ default: module.EnhancedScheduleWrapper })),
  'Enhanced Schedule Wrapper'
);

// Checkout Pages
const CheckoutSuccess = lazyLoadWithErrorHandling(
  () => import('../pages/checkout/CheckoutSuccess'),
  'Checkout Success'
);
const CheckoutCancel = lazyLoadWithErrorHandling(
  () => import('../pages/checkout/CheckoutCancel'),
  'Checkout Cancel'
);
const MockCheckout = lazyLoadWithErrorHandling(
  () => import('../pages/checkout/MockCheckout'),
  'Mock Checkout'
);

// Protected Pages
const ClientDashboard = lazyLoadWithErrorHandling(
  () => import('../components/ClientDashboard/ClientDashboard'),
  'Client Dashboard'
);
const ClientDashboardView = lazyLoadWithErrorHandling(
  () => import('../components/DashBoard/Pages/client-dashboard/client-dashboard-view'),
  'Client Dashboard View'
);
// Revolutionary Galaxy Dashboard - Seraphina's Digital Alchemist Implementation
const RevolutionaryClientDashboard = lazyLoadWithErrorHandling(
  () => import('../components/ClientDashboard/RevolutionaryClientDashboard'),
  'Revolutionary Galaxy Client Dashboard'
);

// Legacy dashboard (kept for fallback if needed)
const NewClientDashboard = lazyLoadWithErrorHandling(
  () => import('../components/ClientDashboard/NewDashboard.jsx'),
  'Enhanced Client Dashboard'
);

// Emergency dashboard for testing
const EmergencyDashboard = lazyLoadWithErrorHandling(
  () => import('../components/ClientDashboard/EmergencyDashboard.jsx'),
  'Emergency Dashboard'
);

const WorkoutDashboard = lazyLoadWithErrorHandling(
  () => import('../pages/workout/WorkoutDashboard'),
  'Workout Dashboard'
);

// Admin Dashboard Components - using direct imports to avoid path resolution issues
const AdminDashboardLayout = lazyLoadWithErrorHandling(
  () => import('../components/DashBoard/UnifiedAdminDashboardLayout'),
  'Admin Dashboard Layout'
);

// Trainer Dashboard - Revolutionary Galaxy Theme (New)
const TrainerDashboard = lazyLoadWithErrorHandling(
  () => import('../components/TrainerDashboard/TrainerDashboard'),
  'Trainer Dashboard'
);

// User Dashboard - Instagram-style social dashboard
const UserDashboard = lazyLoadWithErrorHandling(
  () => import('../components/UserDashboard'),
  'User Dashboard'
);

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
      path: 'shop',
      element: (
        <Suspense fallback={<PageLoader />}>
          <StoreFront />
        </Suspense>
      )
    },
    {
      path: 'shop/apparel',
      element: (
        <Suspense fallback={<PageLoader />}>
          <StoreFront />
        </Suspense>
      )
    },
    {
      path: 'shop/training-packages',
      element: (
        <Suspense fallback={<PageLoader />}>
          <StoreFront />
        </Suspense>
      )
    },
    {
      path: 'shop/supplements',
      element: (
        <Suspense fallback={<PageLoader />}>
          <StoreFront />
        </Suspense>
      )
    },
    {
      path: 'shop/product/:id',
      element: (
        <Suspense fallback={<PageLoader />}>
          <ProductDetail />
        </Suspense>
      )
    },
    {
      path: 'food-scanner',
      element: (
        <Suspense fallback={<PageLoader />}>
          <FoodScannerPage />
        </Suspense>
      )
    },
    // Temporarily disabled - missing theme dependencies
    // {
    //   path: 'theme-showcase',
    //   element: (
    //     <Suspense fallback={<PageLoader />}>
    //       <SwanBrandShowcase />
    //     </Suspense>
    //   )
    // },
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
    
    // Debug routes for StoreFront troubleshooting
    {
      path: 'debug-store',
      element: (
        <Suspense fallback={<PageLoader />}>
          <DebugStoreFront />
        </Suspense>
      )
    },
    {
      path: 'simple-store',
      element: (
        <Suspense fallback={<PageLoader />}>
          <SimplifiedStoreFront />
        </Suspense>
      )
    },
    {
      path: 'fixed-store',
      element: (
        <Suspense fallback={<PageLoader />}>
          <StoreFront />
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
    {
      path: 'checkout/mock',
      element: (
        <Suspense fallback={<PageLoader />}>
          <MockCheckout />
        </Suspense>
      )
    },
    
    // Protected Client Routes
    {
      path: 'client-dashboard',
      element: (
        <ProtectedRoute requiredRole="client">
          <Suspense fallback={<PageLoader />}>
            <RevolutionaryClientDashboard />
          </Suspense>
        </ProtectedRoute>
      )
    },
    // Legacy dashboard fallback route
    {
      path: 'client-dashboard-legacy',
      element: (
        <ProtectedRoute requiredRole="client">
          <Suspense fallback={<PageLoader />}>
            <NewClientDashboard />
          </Suspense>
        </ProtectedRoute>
      )
    },
    // Emergency admin dashboard route - for breaking loops
    {
      path: 'emergency-admin',
      element: (
        <Suspense fallback={<PageLoader />}>
          <EmergencyDashboard />
        </Suspense>
      )
    },
    
    // Trainer Dashboard Routes - Revolutionary Galaxy Theme
    // Allow both trainer and admin roles to access trainer dashboard
    {
      path: 'trainer-dashboard/*',
      element: (
        <ProtectedRoute allowedRoles={['trainer', 'admin']}>
          <Suspense fallback={<PageLoader />}>
            <TrainerDashboard />
          </Suspense>
        </ProtectedRoute>
      )
    },
    
    // User Dashboard Route - Open to all authenticated users
    {
      path: 'user-dashboard',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <UserDashboard />
          </Suspense>
        </ProtectedRoute>
      )
    },
    

    {
      path: 'workout',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <WorkoutDashboard />
          </Suspense>
        </ProtectedRoute>
      )
    },
    {
      path: 'workout/:userId',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <WorkoutDashboard />
          </Suspense>
        </ProtectedRoute>
      )
    },
    
    // Enhanced Admin Dashboard Routes
    {
      path: 'dashboard/*',
      element: (
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <AdminDashboardLayout />
          </Suspense>
        </AdminRoute>
      )
    },
    
    // Debug Routes (Direct access)
    {
      path: 'debug/*',
      element: <DebugRoutes />
    },
    
    // Redirect for missing training-packages route
    {
      path: 'training-packages',
      element: <Navigate to="/shop/training-packages" replace />
    },
    
    // Fallback Route (404)
    {
      path: '*',
      element: <Navigate to="/" replace />
    },
    
    // Schedule Route (Protected)
    {
      path: 'schedule',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <EnhancedScheduleWrapper />
          </Suspense>
        </ProtectedRoute>
      )
    }
  ]
};

export default MainRoutes;