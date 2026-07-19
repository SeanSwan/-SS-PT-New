/**
 * main-routes.tsx
 * Application route definitions — Crystalline Swan theme, dark-first.
 */
import React, { Suspense } from 'react';
import { RouteObject, Navigate, Outlet, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

// Layout and Error Handling
import Layout from '../components/Layout/layout';
import ErrorBoundary from './error-boundary';

// Route Protection Components
import ProtectedRoute from './protected-route';

import { lazyLoadWithErrorHandling } from './lazyLoadWithErrorHandling';
import { buildSocialPostDashboardRedirect } from '../utils/socialPostShareUrl';
// Dashboards v2 seam: flag-gated wrapper; renders V1 (children) when off (default), the v2 shell when on.
import DashboardV2RouteGate from '../components/DashBoard/v2/DashboardV2RouteGate';
import StoreGate from '../pages/shop/StoreGate';
import HomeGate from '../pages/HomePage/HomeGate';
import AboutGate from '../pages/about/AboutGate';
import VideoGate from '../pages/VideoGate';
import ContactGate from '../pages/contactpage/ContactGate';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const LoaderShell = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
`;

const LoaderSpinner = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 4px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-top-color: var(--accent-primary, #60C0F0);
  animation: ${spin} 1s linear infinite;
`;

const PageLoader: React.FC = () => (
  <LoaderShell>
    <LoaderSpinner />
  </LoaderShell>
);

const DebugRoutes = import.meta.env.DEV
  ? lazyLoadWithErrorHandling(
      () => import('./debug-routes'),
      'Debug Routes'
    )
  : null;

// Lazy-loaded Components
// v4.0 HOMEPAGE: Gemini 3.1 Pro cinematic redesign — parallax, weighted motion, glassmorphism
// Falls back to V3 (Claude's version) if V4 fails to load
const HomePage = lazyLoadWithErrorHandling(
  () => import('../pages/HomePage/components/HomePage.V4'),
  'Home Page V4',
  () => import('../pages/HomePage/components/HomePage.V3')
);

// Home V-next seam: HomeGate flag-gates the optics hero in front of the current Home. Flag off/unresolved/
// contract-fail → HomePage (V4→V3) renders untouched (fail-closed).
const GatedHomePage = () => (
  <HomeGate>
    <HomePage />
  </HomeGate>
);
const LoginModal = lazyLoadWithErrorHandling(
  () => import('../pages/EnhancedLoginModal'),
  'Login Modal'
);
const NotFoundPage = lazyLoadWithErrorHandling(
  () => import('../pages/NotFoundPage'),
  'Not Found Page'
);
const ForgotPasswordModal = lazyLoadWithErrorHandling(
  () => import('../pages/ForgotPasswordModal'),
  'Forgot Password'
);
const ResetPasswordPage = lazyLoadWithErrorHandling(
  () => import('../pages/ResetPasswordPage'),
  'Reset Password'
);
const SignupModal = lazyLoadWithErrorHandling(
  () => import('../pages/OptimizedSignupModal'),
  'Signup Modal'
);
const GalleryPage = lazyLoadWithErrorHandling(
  () => import('../pages/GalleryPage'),
  'Gallery Page'
);
const ContactPage = lazyLoadWithErrorHandling(
  () => import('../pages/contactpage/ContactV3'),
  'Contact Page V3',
  () => import('../pages/contactpage/ContactV2')
);

// Contact V-next seam: ContactGate flag-gates the Crystallize-Submit contact page in front of V3. Flag
// off/unresolved/contract-fail → ContactV3 renders untouched (fail-closed). /api/contact POST reused.
const GatedContactPage = () => (
  <ContactGate>
    <ContactPage />
  </ContactGate>
);
const AboutPage = lazyLoadWithErrorHandling(
  () => import('../pages/about/About.V4'),
  'About Page V4',
  () => import('../pages/about/About.V3')
);

// About V-next seam: AboutGate flag-gates the caustic swan-occluder hero in front of the current About.
// Flag off/unresolved/contract-fail → AboutPage (V4→V3) renders untouched (fail-closed).
const GatedAboutPage = () => (
  <AboutGate>
    <AboutPage />
  </AboutGate>
);

// Account Claiming (Crystalline Link Protocol — SWAN-XXXXXXXX invite codes)
const ClaimAccountPage = lazyLoadWithErrorHandling(
  () => import('../pages/ClaimAccountPage'),
  'Claim Account Page'
);

// Public Waiver (Phase 5W-G) — V3 primary, V2 fallback
const PublicWaiverPage = lazyLoadWithErrorHandling(
  () => import('../pages/PublicWaiverPage.V3'),
  'Public Waiver Page V3',
  () => import('../pages/PublicWaiverPage.V2')
);

// Legal surfaces (launch charter BP04 §6.3 — footer links previously bounced to Home)
const PrivacyPolicyPage = lazyLoadWithErrorHandling(
  () => import('../pages/legal/PrivacyPolicyPage'),
  'Privacy Policy Page'
);
const TermsOfServicePage = lazyLoadWithErrorHandling(
  () => import('../pages/legal/TermsOfServicePage'),
  'Terms of Service Page'
);

// Video Library (public) — V3 primary, V2 fallback
const VideoLibrary = lazyLoadWithErrorHandling(
  () => import('../pages/VideoLibraryV3'),
  'Video Library V3',
  () => import('../pages/VideoLibraryV2')
);

// Video V-next seam: VideoGate flag-gates the refraction library in front of V3. Flag off/unresolved/
// contract-fail → VideoLibraryV3 renders untouched (fail-closed). Catalog/auth logic reused, never edited.
const GatedVideoLibrary = () => (
  <VideoGate>
    <VideoLibrary />
  </VideoGate>
);

// Video Watch page (public with gated content)
const VideoWatch = lazyLoadWithErrorHandling(
  () => import('../pages/VideoWatch'),
  'Video Watch'
);

// Collection Detail page (public)
const CollectionDetail = lazyLoadWithErrorHandling(
  () => import('../pages/CollectionDetail'),
  'Collection Detail'
);

// Members Video Vault (authenticated)
const MembersVault = lazyLoadWithErrorHandling(
  () => import('../pages/MembersVault'),
  'Members Vault'
);

// 🌌 OPTIMIZED GALAXY THEMED SWANSTUDIOS STORE — V3 primary, V2 fallback
const SwanStudiosStore = lazyLoadWithErrorHandling(
  () => import('../pages/shop/StoreV3'),
  'SwanStudios Store V3',
  () => import('../pages/shop/StoreV2')
);

// Store V4 seam (KIMI-STORE-CORRECTED F2): StoreGate flag-gates V4 in front of V3 for all three store
// routes at once. Flag off/unresolved/contract-fail → StoreV3 renders untouched (fail-closed).
const GatedSwanStudiosStore = () => (
  <StoreGate>
    <SwanStudiosStore />
  </StoreGate>
);

// 🏔️ ASCENSION — Tier comparison landing page
const AscensionPage = lazyLoadWithErrorHandling(
  () => import('../pages/AscensionPage/AscensionPage'),
  'Ascension Tier Comparison'
);

// ✨ GENESIS CHECKOUT SYSTEM - New clean checkout flow
const CheckoutView = lazyLoadWithErrorHandling(
  () => import('../components/NewCheckout/CheckoutView'),
  'Genesis Checkout'
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

// AI Form Analysis — real-time + upload-based exercise form checking
const FormAnalysisPage = lazyLoadWithErrorHandling(
  () => import('../components/FormAnalysis/FormAnalysisPage'),
  'Movement Analysis'
);

// Biomechanics Studio — Custom Exercise Builder (trainer/admin)
const BiomechanicsStudio = lazyLoadWithErrorHandling(
  () => import('../components/FormAnalysis/BiomechanicsStudioPage'),
  'Biomechanics Studio'
);

// Equipment Manager — Location-based equipment profiles (trainer/admin)
const EquipmentManager = lazyLoadWithErrorHandling(
  () => import('../components/EquipmentManager/EquipmentManagerPage'),
  'Equipment Manager'
);

// Variation Engine — BUILD/SWITCH workout rotation (trainer/admin)
const VariationEngine = lazyLoadWithErrorHandling(
  () => import('../components/VariationEngine/VariationEnginePage'),
  'Variation Engine'
);

// Intelligent Workout Builder — AI-powered workout generation (trainer/admin)
const WorkoutBuilder = lazyLoadWithErrorHandling(
  () => import('../components/WorkoutBuilder/WorkoutBuilderPage'),
  'Workout Builder'
);

// Boot Camp Class Builder — AI-powered group fitness class generation (trainer/admin)
const BootcampBuilder = lazyLoadWithErrorHandling(
  () => import('../components/BootcampBuilder/BootcampBuilderPage'),
  'Bootcamp Builder'
);

const SprintPlanner = lazyLoadWithErrorHandling(
  () => import('../components/SprintPlanner/SprintPlannerPage'),
  'Sprint Planner'
);

const UnauthorizedPage = lazyLoadWithErrorHandling(
  () => import('../pages/UnauthorizedPage.component'),
  'Unauthorized Page'
);

// Schedule Related Components - Emergency fallback retained, primary component activated
// Primary schedule component — switched from emergency placeholder 2026-02-14
const UniversalMasterSchedule = lazyLoadWithErrorHandling(
  () => import('../components/UniversalMasterSchedule/UniversalMasterSchedule'),
  'Universal Master Schedule',
  // Fallback to emergency view if primary fails to load
  () => import('../components/UniversalMasterSchedule/EmergencyAdminScheduleIntegration')
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
const SubscriptionSuccessPage = lazyLoadWithErrorHandling(
  () => import('../pages/subscription/SubscriptionSuccessPage'),
  'Subscription Success Page'
);

// Protected Pages
const EmergencyDashboard = lazyLoadWithErrorHandling(
  () => import('../components/Emergency/EmergencyDashboard'),
  'Emergency Dashboard'
);
const WorkoutDashboard = lazyLoadWithErrorHandling(
  () => import('../pages/workout/WorkoutDashboard'),
  'Workout Dashboard'
);

// Universal Dashboard Layout — serves ALL roles (admin, trainer, client)
const UniversalDashboardLayout = lazyLoadWithErrorHandling(
  () => import('../components/DashBoard/UniversalDashboardLayout'),
  'Universal Dashboard Layout'
);

// Phase 3 Slice 3.13: PLAUD multi-clip merge — admin/trainer only.
const PlaudMergePage = lazyLoadWithErrorHandling(
  () => import('../pages/dashboard/PlaudMergePage'),
  'PLAUD Merge Page'
);
const TheAestheticCodex = lazyLoadWithErrorHandling(
  () => import('../core/TheAestheticCodex'),
  'The Aesthetic Codex'
);
const AdvancedGamificationPage = lazyLoadWithErrorHandling(
  () => import('../pages/AdvancedGamificationPage'),
  'Advanced Gamification Hub'
);
const UserProfilePage = lazyLoadWithErrorHandling(
  () => import('../pages/Social/UserProfilePage'),
  'User Profile Page'
);
// Workstream N (2026-06-11, Sean's direction): the V3 Observatory IS the main
// hub. UserDashboard.V3 mounts at /user-dashboard with URL-driven tabs, and it
// now owns live community content on Home. The duplicate full-feed tab, coach
// dock, and right rail were archived after a resolved-import closure audit.
// Compatibility routes below preserve old /social links.
const UserDashboardV3 = lazyLoadWithErrorHandling(
  () => import('../components/UserDashboard/UserDashboard.V3'),
  'User Dashboard'
);
const SupportReportRoomPage = lazyLoadWithErrorHandling(
  () => import('../pages/support/SupportReportRoomPage'),
  'Report Room'
);

// Preserves the tab segment when redirecting /social/:tab -> /user-dashboard/:tab.
// Workstream O: the feed tab folded into Home (its widgets were duplicates;
// Faction War moved to the Home right rail), so bare /social and /social/feed
// both land on the dashboard Home.
const SocialTabRedirect: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  return <Navigate to={tab && tab !== 'feed' ? `/user-dashboard/${tab}` : '/user-dashboard'} replace />;
};

const SocialPostRedirect: React.FC = () => {
  const { postId } = useParams<{ postId?: string }>();
  return <Navigate to={postId ? buildSocialPostDashboardRedirect(postId) : '/user-dashboard'} replace />;
};

// Design Playground - Admin-only concept viewer (build-time gated — not loaded in production)
const DesignPlaygroundLayout = import.meta.env.VITE_DESIGN_PLAYGROUND === 'true'
  ? lazyLoadWithErrorHandling(
      () => import('../pages/DesignPlayground/DesignPlaygroundLayout'),
      'Design Playground Viewer'
    )
  : (() => null);

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
          <GatedHomePage />
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
      path: 'forgot-password',
      element: (
        <Suspense fallback={<PageLoader />}>
          <ForgotPasswordModal />
        </Suspense>
      )
    },
    {
      path: 'reset-password/:token',
      element: (
        <Suspense fallback={<PageLoader />}>
          <ResetPasswordPage />
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
          <GatedContactPage />
        </Suspense>
      )
    },
    {
      path: 'about',
      element: (
        <Suspense fallback={<PageLoader />}>
          <GatedAboutPage />
        </Suspense>
      )
    },
    {
      path: 'gallery',
      element: (
        <Suspense fallback={<PageLoader />}>
          <GalleryPage />
        </Suspense>
      )
    },
    {
      path: 'gallery/:slug',
      element: (
        <Suspense fallback={<PageLoader />}>
          <GalleryPage />
        </Suspense>
      )
    },

    // Account Claiming (Crystalline Link Protocol — public, no auth required)
    {
      path: 'claim/:token',
      element: (
        <Suspense fallback={<PageLoader />}>
          <ClaimAccountPage />
        </Suspense>
      )
    },
    {
      path: 'claim',
      element: (
        <Suspense fallback={<PageLoader />}>
          <ClaimAccountPage />
        </Suspense>
      )
    },

    // Public Waiver (Phase 5W-G)
    {
      path: 'waiver',
      element: (
        <Suspense fallback={<PageLoader />}>
          <PublicWaiverPage />
        </Suspense>
      )
    },

    // Legal surfaces (launch gate)
    {
      path: 'privacy',
      element: (
        <Suspense fallback={<PageLoader />}>
          <PrivacyPolicyPage />
        </Suspense>
      )
    },
    {
      path: 'terms',
      element: (
        <Suspense fallback={<PageLoader />}>
          <TermsOfServicePage />
        </Suspense>
      )
    },

    // Video Library (public)
    {
      path: 'video-library',
      element: (
        <Suspense fallback={<PageLoader />}>
          <GatedVideoLibrary />
        </Suspense>
      )
    },

    // Video Watch page (public, handles own auth gating)
    {
      path: 'watch/:slug',
      element: (
        <Suspense fallback={<PageLoader />}>
          <VideoWatch />
        </Suspense>
      )
    },

    // Collection Detail (public)
    {
      path: 'collections/:slug',
      element: (
        <Suspense fallback={<PageLoader />}>
          <CollectionDetail />
        </Suspense>
      )
    },

    // Members Video Vault (protected)
    {
      path: 'members/videos',
      element: (
        <Suspense fallback={<PageLoader />}>
          <MembersVault />
        </Suspense>
      )
    },

    // Retired theme showcase: keep the URL non-breaking without shipping the old Galaxy reference page.
    {
      path: 'theme-showcase',
      element: <Navigate to="/" replace />
    },

    // 🏔️ ASCENSION — Tier comparison / pricing page
    {
      path: 'ascension',
      element: (
        <Suspense fallback={<PageLoader />}>
          <AscensionPage />
        </Suspense>
      )
    },

    // 🌌 GALAXY THEMED SWANSTUDIOS STORE - All routes point to the new Galaxy themed version
    {
      path: 'store',
      element: (
        <Suspense fallback={<PageLoader />}>
          <GatedSwanStudiosStore />
        </Suspense>
      )
    },
    {
      path: 'swanstudios-store',
      element: (
        <Suspense fallback={<PageLoader />}>
          <GatedSwanStudiosStore />
        </Suspense>
      )
    },
    {
      path: 'shop',
      element: (
        <Suspense fallback={<PageLoader />}>
          <GatedSwanStudiosStore />
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

    // AI Form Analysis — Upload, Live Camera, History
    {
      path: 'form-analysis',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <FormAnalysisPage />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Biomechanics Studio — Custom Exercise Builder (trainer/admin)
    {
      path: 'biomechanics-studio',
      element: (
        <ProtectedRoute allowedRoles={['trainer', 'admin']}>
          <Suspense fallback={<PageLoader />}>
            <BiomechanicsStudio />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Equipment Manager — Location-based equipment profiles (trainer/admin)
    {
      path: 'equipment-manager',
      element: (
        <ProtectedRoute allowedRoles={['trainer', 'admin']}>
          <Suspense fallback={<PageLoader />}>
            <EquipmentManager />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Variation Engine — BUILD/SWITCH workout rotation (trainer/admin)
    {
      path: 'variation-engine',
      element: (
        <ProtectedRoute allowedRoles={['trainer', 'admin']}>
          <Suspense fallback={<PageLoader />}>
            <VariationEngine />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Intelligent Workout Builder — AI-powered workout generation (trainer/admin)
    {
      path: 'workout-builder',
      element: (
        <ProtectedRoute allowedRoles={['trainer', 'admin']}>
          <Suspense fallback={<PageLoader />}>
            <WorkoutBuilder />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Boot Camp Class Builder — AI-powered group fitness (trainer/admin)
    {
      path: 'bootcamp-builder',
      element: (
        <ProtectedRoute allowedRoles={['trainer', 'admin']}>
          <Suspense fallback={<PageLoader />}>
            <BootcampBuilder />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Sprint Planner — 3-month bootcamp sprint planning + calendar (trainer/admin)
    {
      path: 'sprint-planner',
      element: (
        <ProtectedRoute allowedRoles={['trainer', 'admin']}>
          <Suspense fallback={<PageLoader />}>
            <SprintPlanner />
          </Suspense>
        </ProtectedRoute>
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
    {
      path: 'subscription/success',
      element: (
        <Suspense fallback={<PageLoader />}>
          <SubscriptionSuccessPage />
        </Suspense>
      )
    },

    // Protected Client Routes — redirect old routes to unified dashboard
    {
      path: 'client-dashboard',
      element: <Navigate to="/dashboard/client/overview" replace />
    },
    {
      path: 'client-dashboard-legacy',
      element: <Navigate to="/dashboard/client/overview" replace />
    },
    {
      path: 'emergency-admin',
      element: (
        <ProtectedRoute allowedRoles={['admin']}>
          <Suspense fallback={<PageLoader />}>
            <EmergencyDashboard />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Trainer Dashboard Routes — redirect old routes to unified dashboard
    {
      path: 'trainer-dashboard/*',
      element: <Navigate to="/dashboard/trainer/overview" replace />
    },

    // Canonical authenticated Report Room — shared across client, trainer, and admin roles.
    {
      path: 'support',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <SupportReportRoomPage />
          </Suspense>
        </ProtectedRoute>
      )
    },

      // Workstream N (2026-06-11): /user-dashboard is the canonical home and
      // mounts the V3 Observatory directly. Its feed tab carries the absorbed
      // /social hub (cover studio + composer + full feed + coach dock + right
      // rail); friends/challenges/notifications are first-class tabs.
      {
        path: 'user-dashboard',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <UserDashboardV3 />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: 'user-dashboard/:tab',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <UserDashboardV3 />
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

    // User Profile Route — resolves /profile/:userId for social navigation
    {
      path: 'profile/:userId',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <UserProfilePage />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Social alias routes — the hub lives at /user-dashboard (workstream N).
    // Old /social links land on the dashboard Home (the feed tab folded into
    // Home in workstream O), /social/:tab on the matching dashboard tab.
    {
      path: 'social',
      element: <Navigate to="/user-dashboard" replace />
    },
    {
      path: 'social/posts/:postId',
      element: <SocialPostRedirect />
    },
    {
      path: 'social/:tab',
      element: <SocialTabRedirect />
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

    // Phase 3 Slice 3.13: PLAUD multi-clip merge — admin/trainer only.
    // Mounted BEFORE the dashboard/* catch-all so React Router matches this
    // exact path first and routes to PlaudMergePage instead of falling through
    // to UniversalDashboardLayout's default tab.
    {
      path: 'dashboard/plaud-merge',
      element: (
        <ProtectedRoute allowedRoles={['admin', 'trainer']}>
          <Suspense fallback={<PageLoader />}>
            <PlaudMergePage />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Universal Dashboard Routes — serves admin, trainer, and client roles
    // UniversalDashboardLayout handles role detection and renders role-specific sidebar + routes
    {
      path: 'dashboard/*',
      element: (
        <ProtectedRoute allowedRoles={['admin', 'trainer', 'client']}>
          <Suspense fallback={<PageLoader />}>
            <DashboardV2RouteGate>
              <UniversalDashboardLayout />
            </DashboardV2RouteGate>
          </Suspense>
        </ProtectedRoute>
      )
    },
    ...(DebugRoutes
      ? [{
          path: 'debug/*',
          element: (
            <Suspense fallback={<PageLoader />}>
              <DebugRoutes />
            </Suspense>
          )
        }]
      : []),

    {
      path: 'training-packages',
      element: <Navigate to="/store" replace />
    },

    // Schedule Route - Primary UniversalMasterSchedule (switched from emergency 2026-02-14)
    // Falls back to EmergencyAdminScheduleIntegration if chunk fails to load
    {
      path: 'schedule',
      element: (
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <UniversalMasterSchedule />
          </Suspense>
        </ProtectedRoute>
      )
    },

    // Fallback Route (404) — a real page, not a silent redirect home.
    // The silent redirect made broken deep links indistinguishable from
    // "the app sent me home" and masked dead-route regressions.
    {
      path: '*',
      element: (
        <Suspense fallback={<PageLoader />}>
          <NotFoundPage />
        </Suspense>
      )
    }
  ]
};

export default MainRoutes;
