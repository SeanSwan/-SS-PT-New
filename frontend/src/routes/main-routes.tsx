/**
 * main-routes.tsx - GALAXY THEMED STOREFRONT VERSION
 * Using the new GalaxyThemedStoreFront with correct pricing and stunning visuals
 */
import React, { lazy, Suspense } from 'react';
import { RouteObject, Navigate, Outlet } from 'react-router-dom';

// Layout and Error Handling
import Layout from '../components/Layout/layout';
import ErrorBoundary from './error-boundary';

// Route Protection Components
import ProtectedRoute from './protected-route';
import { DashboardWrapper } from '../components/DashboardWrapper';

// Custom Routes
import DebugRoutes from './debug-routes';

// Loading Component for Code Splitting
const PageLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
    background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
    color: 'white'
  }}>
    <div style={{
      border: '4px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '50%',
      borderTop: '4px solid #00ffff',
      width: '50px',
      height: '50px',
      animation: 'spin 1s linear infinite'
    }}>
    </div>
  </div>
);

// Enhanced lazy loading function
function lazyLoadWithErrorHandling(importFn, componentName, fallbackImportFn = null) {
  return lazy(() => 
    importFn()
      .catch(error => {
        console.error(`Failed to load ${componentName}:`, error);
        
        if (fallbackImportFn) {
          console.log(`Trying fallback for ${componentName}...`);
          return fallbackImportFn().catch(fallbackError => {
            console.error(`Fallback also failed for ${componentName}:`, fallbackError);
            return {
              default: () => (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
                  color: 'white',
                  minHeight: '50vh',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <h2 style={{ color: '#ff416c' }}>Error Loading {componentName}</h2>
                  <p>Please refresh the page or contact support.</p>
                  <button 
                    onClick={() => window.location.reload()}
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
                    Retry
                  </button>
                </div>
              )
            };
          });
        }
        
        return {
          default: () => (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
              color: 'white',
              minHeight: '50vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <h2 style={{ color: '#ff416c' }}>Error Loading {componentName}</h2>
              <p>Please refresh the page or contact support.</p>
              <button 
                onClick={() => window.location.reload()}
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
                Retry
              </button>
            </div>
          )
        };
      })
  );
}

// Lazy-loaded Components
const ClientOnboardingWizard = lazyLoadWithErrorHandling(
  () => import('../pages/onboarding/ClientOnboardingWizard'),
  'Client Onboarding Wizard'
);

// v2.0 HOMEPAGE: LivingConstellation + FrostedCard + Parallax (NO pricing on homepage)
const HomePage = lazyLoadWithErrorHandling(
  () => import('../pages/HomePage/components/HomePage.V2.component'),
  'Home Page v2.0',
  // Fallback to v1.0 if v2.0 fails to load
  () => import('../pages/HomePage/components/HomePage.component')
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

// 🌌 OPTIMIZED GALAXY THEMED SWANSTUDIOS STORE - Single production store
const SwanStudiosStore = lazyLoadWithErrorHandling(
  () => import('../pages/shop/OptimizedGalaxyStoreFront'),
  'SwanStudios Store'
);

// ✨ GENESIS CHECKOUT SYSTEM - New clean checkout flow
const CheckoutView = lazyLoadWithErrorHandling(
  () => import('../components/NewCheckout/CheckoutView'),
  'Genesis Checkout'
);

// Galaxy-Swan Theme Showcase
const SwanBrandShowcase = lazyLoadWithErrorHandling(
  () => import('../components/SwanBrandShowcase.component'),
  'Swan Brand Theme Showcase'
);

// All testing routes now redirect to main production store
// No need for separate testing components
const ProductDetail = lazyLoadWithErrorHandling(
  () => import('../components/Shop/ProductDetail'),
  'Product Detail'
);
const FoodScannerPage = lazyLoadWithErrorHandling(
  () => import('../pages/FoodScanner/FoodScannerPage'),
  'Food Scanner'
);

const UnauthorizedPage = lazyLoadWithErrorHandling(
  () => import('../pages/UnauthorizedPage.component'),
  'Unauthorized Page'
);

// Schedule Related Components - Emergency Safe Version
const EmergencyAdminScheduleIntegration = lazyLoadWithErrorHandling(
  () => import('../components/UniversalMasterSchedule/EmergencyAdminScheduleIntegration'),
  'Emergency Admin Schedule Integration'
);

// Checkout Pages - Genesis Checkout System
const SuccessPage = lazyLoadWithErrorHandling(
  () => import('../components/NewCheckout/SuccessPage'),
  'Genesis Success Page'
);
const CheckoutCancel = lazyLoadWithErrorHandling(
  () => import('../pages/checkout/CheckoutCancel'),
  'Checkout Cancel'
);

// Protected Pages
const RevolutionaryClientDashboard = lazyLoadWithErrorHandling(
  () => import('../components/ClientDashboard/RevolutionaryClientDashboard'),
  'Revolutionary Galaxy Client Dashboard'
);
const NewClientDashboard = lazyLoadWithErrorHandling(
  () => import('../components/ClientDashboard/NewDashboard'),
  'Enhanced Client Dashboard'
);
const EmergencyDashboard = lazyLoadWithErrorHandling(
  () => import('../components/ClientDashboard/EmergencyDashboard'),
  'Emergency Dashboard'
);
const WorkoutDashboard = lazyLoadWithErrorHandling(
  () => import('../pages/workout/WorkoutDashboard'),
  'Workout Dashboard'
);
const AdminDashboardLayout = lazyLoadWithErrorHandling(
  () => import('../components/DashBoard/UnifiedAdminDashboardLayout'),
  'Admin Dashboard Layout'
);
const TheAestheticCodex = lazyLoadWithErrorHandling(
  () => import('../core/TheAestheticCodex'),
  'The Aesthetic Codex'
);
const TrainerDashboard = lazyLoadWithErrorHandling(
  () => import('../components/TrainerDashboard/TrainerDashboard'),
  'Trainer Dashboard'
);
const UserDashboard = lazyLoadWithErrorHandling(
  () => import('../components/UserDashboard'),
  'User Dashboard'
);
const AdvancedGamificationPage = lazyLoadWithErrorHandling(
  () => import('../pages/AdvancedGamificationPage'),
  'Advanced Gamification Hub'
);

// Design Playground - Admin-only concept viewer (build-time gated — not loaded in production)
const DesignPlaygroundLayout = import.meta.env.VITE_DESIGN_PLAYGROUND === 'true'
  ? lazyLoadWithErrorHandling(
      () => import('../pages/DesignPlayground/DesignPlaygroundLayout'),
      'Design Playground Viewer'
    )
  : null;

/**
 * Main application routes configuration
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
    
    // Galaxy-Swan Theme Showcase
    {
      path: 'theme-showcase',
      element: (
        <Suspense fallback={<PageLoader />}>
          <SwanBrandShowcase />
        </Suspense>
      )
    },
    
    // 🌌 GALAXY THEMED SWANSTUDIOS STORE - All routes point to the new Galaxy themed version
    {
      path: 'store',
      element: (
        <Suspense fallback={<PageLoader />}>
          <SwanStudiosStore />
        </Suspense>
      )
    },
    {
      path: 'swanstudios-store',
      element: (
        <Suspense fallback={<PageLoader />}>
          <SwanStudiosStore />
        </Suspense>
      )
    },
    {
      path: 'shop',
      element: (
        <Suspense fallback={<PageLoader />}>
          <SwanStudiosStore />
        </Suspense>
      )
    },
    
    // Testing routes redirect to main production store
    {
      path: 'store-original',
      element: <Navigate to="/store" replace />
    },
    {
      path: 'store-galaxy-api', 
      element: <Navigate to="/store" replace />
    },
    {
      path: 'store-simple',
      element: <Navigate to="/store" replace />
    },
    
    // Redirect old routes
    {
      path: 'galaxy-store',
      element: <Navigate to="/store" replace />
    },
    {
      path: 'shop/apparel',
      element: <Navigate to="/store" replace />
    },
    {
      path: 'shop/training-packages',
      element: <Navigate to="/store" replace />
    },
    {
      path: 'shop/supplements',
      element: <Navigate to="/store" replace />
    },
    
    // Keep product detail route
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
    {
      path: 'unauthorized',
      element: (
        <Suspense fallback={<PageLoader />}>
          <UnauthorizedPage />
        </Suspense>
      )
    },
    
    // Debug store redirects to main production store
    {
      path: 'debug-store',
      element: <Navigate to="/store" replace />
    },
    
    // GENESIS CHECKOUT SYSTEM ROUTES
    {
      path: 'checkout',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <CheckoutView />
          </Suspense>
        </ProtectedRoute>
      )
    },
    {
      path: 'checkout/success',
      element: (
        <Suspense fallback={<PageLoader />}>
          <SuccessPage />
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
      path: 'client-dashboard',
      element: (
        <ProtectedRoute allowedRoles={['client', 'admin']}>
          <Suspense fallback={<PageLoader />}>
            <RevolutionaryClientDashboard />
          </Suspense>
        </ProtectedRoute>
      )
    },
    {
      path: 'client-dashboard-legacy',
      element: (
        <ProtectedRoute allowedRoles={['client', 'admin']}>
          <Suspense fallback={<PageLoader />}>
            <NewClientDashboard />
          </Suspense>
        </ProtectedRoute>
      )
    },
    {
      path: 'emergency-admin',
      element: (
        <Suspense fallback={<PageLoader />}>
          <EmergencyDashboard />
        </Suspense>
      )
    },
    
    // Trainer Dashboard Routes
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
    
    // User Dashboard Route
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
    
    // 🎮 Advanced Gamification Hub - PHASE 4 ENHANCEMENT
    {
      path: 'gamification',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <AdvancedGamificationPage />
          </Suspense>
        </ProtectedRoute>
      )
    },
    {
      path: 'achievements',
      element: <Navigate to="/gamification" replace />
    },
    {
      path: 'challenges',
      element: <Navigate to="/gamification" replace />
    },
    {
      path: 'leaderboard',
      element: <Navigate to="/gamification" replace />
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
    
    // Admin Style Guide Route
    {
      path: 'style-guide',
      element: (
        <ProtectedRoute requiredRole="admin">
          <Suspense fallback={<PageLoader />}>
            <TheAestheticCodex />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Design Playground - Full-page concept viewer (admin-only, build-time gated)
    ...(import.meta.env.VITE_DESIGN_PLAYGROUND === 'true' ? [{
      path: 'designs/:id',
      element: (
        <ProtectedRoute requiredRole="admin">
          <Suspense fallback={<PageLoader />}>
            <DesignPlaygroundLayout />
          </Suspense>
        </ProtectedRoute>
      )
    }] : []),
    
    // Enhanced Admin Dashboard Routes
    {
      path: 'dashboard/*',
      element: (
        <ProtectedRoute requiredRole="admin">
          <Suspense fallback={<PageLoader />}>
            <AdminDashboardLayout />
          </Suspense>
        </ProtectedRoute>
      )
    },
    
    // Debug Routes
    {
      path: 'debug/*',
      element: <DebugRoutes />
    },
    
    {
      path: 'training-packages',
      element: <Navigate to="/store" replace />
    },
    
    // Schedule Route - Using Emergency Safe Version
    {
      path: 'schedule',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <EmergencyAdminScheduleIntegration />
          </Suspense>
        </ProtectedRoute>
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