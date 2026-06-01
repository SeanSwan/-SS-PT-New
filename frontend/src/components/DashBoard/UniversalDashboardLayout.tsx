/**
 * UniversalDashboardLayout.tsx
 * ============================
 * 
 * Revolutionary Universal Dashboard Layout System
 * The Grand Unification - Single layout serving all roles (Admin, Trainer, Client)
 * Implements the complete dashboard revolution from Alchemist's Opus v42
 * Designed by Seraphina, The Digital Alchemist
 * 
 * REVOLUTIONARY FEATURES:
 * - Intelligent role-based sidebar rendering (Admin, Trainer, Client)
 * - Unified routing pattern: All dashboards use /dashboard/* 
 * - Single theme system with role-specific color variations
 * - Universal Calendar integration with role-aware data fetching
 * - Seamless data sharing via Redux scheduling slice
 * - Mobile-first responsive design across all roles
 * - WCAG AA accessibility compliance
 * 
 * THE GRAND UNIFICATION PRINCIPLE:
 * "One Layout, All Roles, Infinite Possibilities"
 * 
 * This component eliminates dashboard fragmentation and creates the unified
 * platform experience described in the Master Tree Flowchart.
 */

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { X } from 'lucide-react';
// Phase 18.A (2026-04-20): persistent view-as banner shown when admin is
// viewing a non-admin dashboard (trainer or client).
import ViewAsBanner from './components/ViewAsBanner';
import { useAuth } from '../../context/AuthContext';
import { GlobalClientProvider } from '../../context/GlobalClientContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { 
  fetchEvents, 
  setUserContext, 
  selectCurrentUserRole,
  selectCurrentUserId
} from '../../redux/slices/scheduleSlice';
import { scheduleDashboardRouteScrollReset } from './DashboardRouteScroll';
import { parseDashboardUserId } from './UniversalDashboardLayout.logic';

// Import the three stellar sidebars
import AdminStellarSidebar from './Pages/admin-dashboard/AdminStellarSidebar';
import TrainerStellarSidebar from './Pages/trainer-dashboard/TrainerStellarSidebar';
import ClientStellarSidebar from './Pages/client-dashboard/ClientStellarSidebar';
import UniversalSchedule from '../Schedule/UniversalSchedule';

// Import role-specific page components

// 🔥 BUSINESS-CRITICAL: Import Client Management System Components

// 🏢 COMPREHENSIVE DATA MANAGEMENT: Import Enhanced User & Trainer Management

// 🚀 UNIFIED DATA COLLECTION: Import Comprehensive Onboarding System

// Import Universal Master Schedule Integration

// Import NASM Workout Tracking System Components

// 🎨 THE AESTHETIC CODEX: Import the definitive style guide

// Import Trainer Dashboard Components

// Lazy load components
const RevolutionaryAdminDashboard = React.lazy(() => import('./Pages/admin-dashboard/admin-dashboard-view'));
const EnhancedAdminSessionsView = React.lazy(() => import('./Pages/admin-sessions/enhanced-admin-sessions-view'));
const ModernUserManagementSystem = React.lazy(() => import('./Pages/user-management/modern-user-management'));
const AdminClientProgressView = React.lazy(() => import('./Pages/admin-client-progress/admin-client-progress-view.V2'));
const AdminPackagesView = React.lazy(() => import('./Pages/admin-packages/admin-packages-view'));
const TrainersManagementSection = React.lazy(() => import('./Pages/admin-dashboard/TrainersManagementSection'));
const AdminGamificationView = React.lazy(() => import('./Pages/admin-gamification/admin-gamification-view'));
const RevenueAnalyticsPanel = React.lazy(() => import('./Pages/admin-dashboard/components/RevenueAnalyticsPanel'));
const PendingOrdersAdminPanel = React.lazy(() => import('./Pages/admin-dashboard/components/PendingOrdersAdminPanel'));
const ClientOnboardingWizard = React.lazy(() => import('./Pages/admin-clients/components/ClientOnboardingWizard'));
const ClientSelfOnboardingWizard = React.lazy(() => import('../../pages/onboarding/ClientOnboardingWizard'));
const NutritionPlanBuilder = React.lazy(() => import('../Admin/NutritionPlanBuilder'));
const NotesManager = React.lazy(() => import('../Admin/NotesManager'));
const PhotoManager = React.lazy(() => import('../Admin/PhotoManager'));
const AutomationManager = React.lazy(() => import('../Admin/AutomationManager'));
const SMSLogsPanel = React.lazy(() => import('../Admin/SMSLogsPanel'));
const EnhancedUserDataManagement = React.lazy(() => import('./Pages/admin-users/EnhancedUserDataManagement'));
const EnhancedTrainerDataManagement = React.lazy(() => import('./Pages/admin-trainers/EnhancedTrainerDataManagement'));
const UnifiedOnboardingWizard = React.lazy(() => import('./Pages/admin-onboarding/UnifiedOnboardingWizard'));
const BodyMapPage = React.lazy(() => import('../BodyMap'));
const ClientTrainerAssignments = React.lazy(() => import('../Admin/ClientTrainerAssignments'));
const TrainerPermissionsManager = React.lazy(() => import('../Admin/TrainerPermissionsManager'));
const SessionAllocationManager = React.lazy(() => import('../Admin/SessionAllocationManager'));
const WorkoutLogger = React.lazy(() => import('../WorkoutLogger/WorkoutLogger'));
const NASMProgressCharts = React.lazy(() => import('../ClientProgressCharts'));
const TheAestheticCodex = React.lazy(() => import('../../core/TheAestheticCodex'));
const MyClientsView = React.lazy(() => import('../TrainerDashboard/ClientManagement'));
const EnhancedWorkoutLogger = React.lazy(() => import('../TrainerDashboard/WorkoutLogging'));
const EnhancedClientProgressView = React.lazy(() =>
  import('../TrainerDashboard/ClientProgress').then((module) => ({
    default: module.EnhancedClientProgressView,
  }))
);
const AiConsentScreen = React.lazy(() => import('./Pages/client-dashboard/AiConsentScreen'));
const MessagingPageLazy = React.lazy(() => import('../../pages/MessagingPage'));
const NutritionWorkspaceLazy = React.lazy(() => import('./workspaces/NutritionWorkspace'));
const CanadaImmigrationTab = React.lazy(() => import('./Pages/canada-immigration/CanadaImmigrationTab'));
const VideoLibraryPageLazy = React.lazy(() => import('../../pages/VideoLibraryV3'));
const ContentStudioHub = React.lazy(() => import('./Pages/content-studio/ContentStudioHub'));
const FeatureAccessPage = React.lazy(() => import('./Pages/admin-feature-access/FeatureAccessPage'));
const WorkoutPlannerPage = React.lazy(() => import('./Pages/admin-workout-planner/WorkoutPlannerPage'));
const LiveStreamingPage = React.lazy(() => import('../Social/LiveStreaming/LiveStreamingView'));
const CreatorEconomyPage = React.lazy(() => import('../Social/CreatorEconomy/CreatorEconomyView'));
const SwanCoachAssistantPage = React.lazy(() => import('./Pages/coach-assistant/SwanCoachAssistantPage'));
const CoachCommandCenterPage = React.lazy(() => import('./Pages/coach-assistant/CoachCommandCenterPage'));
const AdminWaiversManagerPage = React.lazy(() => import('./Pages/admin-waivers/AdminWaiversManager'));
// Phase 18.C.1B.1R (2026-04-24): canonical re-mount of the admin view-as
// aggregator. Lazy-loaded — rare admin route, kept out of base bundle.
// Previous mount at UnifiedAdminRoutes.tsx:211 went dead when Phase 19
// cleanup unmounted UnifiedAdminRoutes from the live tree.
const AdminViewAsWrapper = React.lazy(() => import('./Pages/admin-clients/components/AdminViewAsWrapper'));

// Client dashboard pages (replacing stubs)
const ClientMyWorkoutsPage = React.lazy(() => import('./Pages/client-dashboard/ClientMyWorkoutsPage'));
// ClientHomeTab is the canonical /overview route.
const ClientHomeTab = React.lazy(() => import('./Pages/client-dashboard/ClientHomeTab'));
const ClientProfilePage = React.lazy(() => import('./Pages/client-dashboard/ClientProfilePage'));
const ClientRewardsPage = React.lazy(() => import('./Pages/client-dashboard/ClientRewardsPage'));
const ClientCommunityPage = React.lazy(() => import('./Pages/client-dashboard/ClientCommunityPage'));

// Trainer dashboard pages
const TrainerHomeTab = React.lazy(() => import('./Pages/trainer-dashboard/TrainerHomeTab'));
const TrainerAssessmentsPage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerAssessmentsPage'));
const TrainerVideosPage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerVideosPage'));
const VideoLibraryPage = React.lazy(() => import('../../pages/VideoLibraryV3'));
const TrainerWorkoutForgePage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerWorkoutForgePage'));
const OmniTerminal = React.lazy(() => import('../Shared/OmniTerminal'));
const EquipmentManagerPage = React.lazy(() => import('../EquipmentManager/EquipmentManagerPage'));
const BootcampBuilderPage = React.lazy(() => import('../BootcampBuilder/BootcampBuilderPage'));
const SprintPlannerPage = React.lazy(() => import('../SprintPlanner/SprintPlannerPage'));
const VideoCallPage = React.lazy(() => import('../VideoChat/VideoCallPage'));
const AvatarHomePage = React.lazy(() => import('../AvatarHome/AvatarHomePage'));
const VirtualOlympicsPage = React.lazy(() => import('../VirtualOlympics/VirtualOlympicsPage'));
const BadgeCreatorPage = React.lazy(() => import('../BadgeCreator/BadgeCreatorPage'));
const MarketingWorkspace = React.lazy(() => import('./workspaces/MarketingWorkspace'));
const SecurityWorkspace = React.lazy(() => import('./workspaces/SecurityWorkspace'));
const PlaudIntelligenceWorkspacePage = React.lazy(() => import('../../pages/dashboard/PlaudIntelligenceWorkspacePage'));

// ─────────────────────────────────────────────────────────────
// SECTION: Universal Theme — CSS Custom Property Bridge
// PURPOSE: Mirrors AdminLayoutTheme pattern for theme changer compat
// WHY: Original hardcoded bright theme ignored the 14-theme system
// ─────────────────────────────────────────────────────────────
const universalTheme = {
  admin: {
    primary: 'var(--brand-primary, #002060)',
    secondary: 'var(--accent-purple, #8B5CF6)',
    accent: 'var(--accent-cyan, #60C0F0)',
    gradients: {
      primary: 'linear-gradient(135deg, var(--accent-purple, #8B5CF6) 0%, var(--accent-cyan, #60C0F0) 100%)',
      background: 'var(--bg-base, #0A0A0F)',
    },
  },
  trainer: {
    primary: 'var(--accent-purple, #8B5CF6)',
    secondary: 'var(--accent-cyan, #60C0F0)',
    accent: 'var(--accent-cyan, #60C0F0)',
    gradients: {
      primary: 'linear-gradient(135deg, var(--accent-purple, #8B5CF6) 0%, var(--accent-cyan, #60C0F0) 100%)',
      background: 'var(--bg-base, #0A0A0F)',
    },
  },
  client: {
    primary: 'var(--accent-cyan, #60C0F0)',
    secondary: 'var(--accent-purple, #8B5CF6)',
    accent: 'var(--accent-cyan, #60C0F0)',
    gradients: {
      primary: 'linear-gradient(135deg, var(--accent-cyan, #60C0F0) 0%, var(--accent-purple, #8B5CF6) 100%)',
      background: 'var(--bg-base, #0A0A0F)',
    },
  },
  common: {
    deepSpace: 'var(--bg-base, #0A0A0F)',
    stellarWhite: 'var(--text-primary, #E0ECF4)',
    platinumSilver: 'var(--text-secondary, rgba(224, 236, 244, 0.65))',
    cosmicGray: 'var(--text-muted, rgba(224, 236, 244, 0.4))',
    voidBlack: '#000000',
    warningAmber: '#f59e0b',
    successGreen: '#10b981',
    criticalRed: 'var(--danger, #C92A54)', /* Crimson Frost */
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif",
    weights: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 },
  },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '3rem' },
  borderRadius: { sm: '6px', md: '12px', lg: '16px', xl: '24px' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Global Styles — CSS Custom Property Bridge (dark-first)
// PURPOSE: Matches ExecutiveGlobalStyles from AdminLayoutTheme
// ─────────────────────────────────────────────────────────────
const UniversalGlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    height: 100%;
    overflow-x: hidden;
  }

  /* Lock body scroll when mobile sidebar is open */
  body.mobile-sidebar-open {
    overflow: hidden;
    position: fixed;
    width: 100%;
    touch-action: none;
  }

  body {
    font-family: 'Plus Jakarta Sans', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--text-primary, #E0ECF4);
    background: var(--bg-base, #0A0A0F);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Mobile font size boost for readability on small phones */
  @media (max-width: 430px) {
    body { font-size: 15px; }
    h1 { font-size: clamp(1.2rem, 5vw, 1.5rem); }
    h2 { font-size: clamp(1.05rem, 4vw, 1.25rem); }
    h3 { font-size: clamp(0.95rem, 3.5vw, 1.1rem); }
  }

  @media (max-width: 375px) {
    body { font-size: 14px; }
  }

  @media (min-width: 2560px) {
    body { font-size: 17px; }
    h1 { font-size: clamp(1.75rem, 3vw, 2.5rem); }
    h2 { font-size: clamp(1.4rem, 2.5vw, 2rem); }
    h3 { font-size: clamp(1.15rem, 2vw, 1.5rem); }
  }

  @media (min-width: 3840px) {
    body { font-size: 20px; }
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    h2 { font-size: clamp(1.6rem, 2.5vw, 2.25rem); }
    h3 { font-size: clamp(1.3rem, 2vw, 1.75rem); }
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }

  *:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  *:focus:not(:focus-visible) {
    outline: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout Container — dark-first, matches admin layout
// ─────────────────────────────────────────────────────────────
const UniversalLayoutContainer = styled.div`
  display: flex;
  min-height: 100dvh;
  width: 100%;
  background: var(--bg-base, #0A0A0F);
  position: relative;
  overflow-x: hidden;
`;

const UniversalMainContent = styled(motion.main)<{ $sidebarCollapsed?: boolean }>`
  flex: 1;
  margin-left: ${({ $sidebarCollapsed }) => ($sidebarCollapsed ? '64px' : '280px')};
  padding: 24px;
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  background: var(--bg-base, #0A0A0F);
  overflow-y: auto;
  overflow-x: hidden;
  transition: margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1024px) {
    margin-left: 0;
    padding: 16px;
    padding-top: 72px;
  }

  @media (max-width: 430px) {
    padding: 12px;
    padding-top: 68px;
    /* Bump base font size for readability on small phones */
    font-size: 15px;
  }

  @media (max-width: 375px) {
    padding: 8px;
    padding-top: 64px;
  }

  @media (max-width: 320px) {
    padding: 6px;
    padding-top: 60px;
  }

  @media (min-width: 2560px) {
    padding: 40px;
    padding-top: 96px;
  }

  @media (min-width: 3840px) {
    padding: 56px;
    padding-top: 112px;
  }
`;

const UniversalPageContainer = styled(motion.div)`
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 1;

  @media (min-width: 2560px) {
    max-width: 2200px;
  }

  @media (min-width: 3840px) {
    max-width: 3000px;
  }
`;

// ─── Mobile Back/Close Button ────────────────────────────
// Shows on mobile when user navigates into a sub-page (not overview)
// Provides a persistent way to return to the main dashboard
const MobileBackBtn = styled.button`
  display: none;
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 999;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: var(--bg-surface, #141419);
  color: var(--text-primary, #E0ECF4);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: all 200ms ease;

  &:hover {
    background: var(--bg-elevated, #1A1A24);
    border-color: rgba(139, 92, 246, 0.5);
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }

  @media (max-width: 1024px) {
    display: flex;
  }

  @media (max-width: 480px) {
    top: 62px;
    right: 12px;
  }

  @media (max-width: 375px) {
    top: 58px;
    right: 8px;
  }
`;

const UniversalLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
`;

const UniversalLoadingSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 4px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-left: 4px solid var(--accent-primary, #60C0F0);
  border-radius: 50%;
  margin-bottom: 24px;
`;

const UniversalErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
  padding: 32px;

  h2 {
    color: var(--danger, #C92A54); /* Crimson Frost */
    margin-bottom: 16px;
    font-size: 1.5rem;
    font-weight: 600;
  }

  p {
    color: var(--text-secondary, rgba(224, 236, 244, 0.65));
    margin-bottom: 24px;
    max-width: 600px;
    line-height: 1.6;
  }
`;

const UniversalButton = styled(motion.button)`
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6) 0%, var(--accent-primary, #60C0F0) 100%);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 12px;
  color: #fff;
  padding: 12px 24px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px;

  &:hover {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// Lazy load the new client progress dashboard page
const ClientProgressDashboardPage = React.lazy(
  () => import('./Pages/client-dashboard/ClientProgressDashboardPage')
);

// Wrapper component for detailed NASM analytics — kept for deep-link access
const ClientProgressWrapper: React.FC = () => {
  const { user } = useAuth();
  const clientId = parseDashboardUserId(user?.id);

  if (!clientId) {
    return (
      <UniversalErrorContainer role="status">
        <h2>Progress identity unavailable</h2>
        <p>Reload the dashboard once your account identity finishes loading.</p>
      </UniversalErrorContainer>
    );
  }

  return <NASMProgressCharts clientId={clientId} />;
};

const ADMIN_PLAUD_COMMAND_CENTER_PATH = '/dashboard/admin/coach-assistant?workspace=plaud';

const AdminPlaudCommandCenterRedirect: React.FC = () => {
  const location = useLocation();
  if (!location.search) {
    return <Navigate to={ADMIN_PLAUD_COMMAND_CENTER_PATH} replace />;
  }
  const params = new URLSearchParams(location.search);
  params.set('workspace', 'plaud');
  return <Navigate to={`/dashboard/admin/coach-assistant?${params.toString()}`} replace />;
};

const ClientSelfOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const goToOverview = () => navigate('/dashboard/client/overview');
  return (
    <ClientSelfOnboardingWizard
      selfSubmit
      onComplete={goToOverview}
      onCancel={goToOverview}
    />
  );
};

const AdminClientDetailsRedirect: React.FC = () => {
  const location = useLocation();
  return <Navigate to={`/dashboard/admin/client-management${location.search}`} replace />;
};

const AdminWorkoutPlansRedirect: React.FC = () => {
  const { clientId } = useParams<{ clientId?: string }>();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const queryClientId = params.get('clientId')?.trim();
  const safeClientId = [clientId, queryClientId].find((value) => value && /^[1-9]\d*$/.test(value));

  if (!safeClientId) {
    return <Navigate to={'/dashboard/admin/client-management?intent=plan_next'} replace />;
  }

  params.set('clientId', safeClientId);
  params.set('source', 'legacy-admin-workouts');
  params.set('returnTo', `/dashboard/admin/client-management?clientId=${safeClientId}`);
  return <Navigate to={`/dashboard/admin/workout-planner?${params.toString()}`} replace />;
};

// === ROLE CONFIGURATION ===
interface RoleConfig {
  routes: Array<{
    path: string;
    component: React.ComponentType<any>;
    title: string;
    description: string;
  }>;
  defaultPath: string;
}

const roleConfigurations: Record<string, RoleConfig> = {
  admin: {
    routes: [
      { path: '/overview', component: RevolutionaryAdminDashboard, title: 'Command Center', description: 'Administrative oversight' },

      // 🤖 SWAN COACH ASSISTANT — Master AI with full context access
      { path: '/coach-assistant', component: CoachCommandCenterPage, title: 'Coach Command Center', description: 'Review-gated Swan Coach command observatory' },

      // 🏢 COMPREHENSIVE USER DATA MANAGEMENT SUITE
      { path: '/user-management', component: EnhancedUserDataManagement, title: 'User Data Management', description: 'Complete user data collection & lifecycle management' },
      { path: '/user-management-legacy', component: ModernUserManagementSystem, title: 'User Management (Legacy)', description: 'Traditional user management interface' },
      
      // 🏋️ ENHANCED TRAINER DATA MANAGEMENT
      { path: '/trainer-management', component: EnhancedTrainerDataManagement, title: 'Trainer Data Management', description: 'Complete trainer data collection, certs & performance' },
      { path: '/trainer-management-legacy', component: TrainersManagementSection, title: 'Trainer Management (Legacy)', description: 'Traditional trainer oversight interface' },
      
      // 💪 COMPREHENSIVE CLIENT DATA MANAGEMENT
      { path: '/client-management', component: React.lazy(() => import('./workspaces/ClientsWorkspace')), title: 'Client Hub', description: 'Unified client management with selector, cards, and detail tabs' },
      { path: '/client-management/view-as/:userId', component: AdminViewAsWrapper, title: 'View As Client', description: 'Read-only admin impersonation view of a single client profile, workouts, sessions, and gamification' },
      { path: '/client-details', component: AdminClientDetailsRedirect, title: 'Client Hub', description: 'Redirects legacy client details to the canonical Client Hub' },
      { path: '/client-onboarding', component: ClientOnboardingWizard, title: 'Client Onboarding', description: 'New client data collection workflow' },
      { path: '/client-progress-tracking', component: AdminClientProgressView, title: 'Client Progress Analytics', description: 'Client progress monitoring & analytics' },
      { path: '/nutrition/:clientId?', component: NutritionPlanBuilder, title: 'Nutrition Plan Builder', description: 'Create and update client nutrition plans' },
      { path: '/workouts/:clientId?', component: AdminWorkoutPlansRedirect, title: 'Workout Plan Builder', description: 'Build client-specific workout plans' },
      { path: '/notes/:clientId?', component: NotesManager, title: 'Client Notes Manager', description: 'Manage trainer notes and observations' },
      { path: '/photos/:clientId?', component: PhotoManager, title: 'Client Photo Manager', description: 'Upload and organize progress photos' },
      { path: '/automation', component: AutomationManager, title: 'Automation Manager', description: 'Manage automated client outreach sequences' },
      { path: '/sms-logs', component: SMSLogsPanel, title: 'SMS Logs', description: 'Monitor outbound SMS delivery' },
      
      // 🚀 UNIFIED DATA COLLECTION SYSTEM
      { path: '/unified-onboarding', component: UnifiedOnboardingWizard, title: 'Unified Onboarding', description: 'Complete data collection for all user types' },
      { path: '/user-onboarding', component: UnifiedOnboardingWizard, title: 'Add New User', description: 'General user registration' },
      { path: '/trainer-onboarding', component: UnifiedOnboardingWizard, title: 'Add New Trainer', description: 'Trainer registration with certifications' },
      
      // 📅 SCHEDULING & OPERATIONS
      { path: '/admin-sessions', component: EnhancedAdminSessionsView, title: 'Session Management', description: 'Universal session control' },
      { path: '/master-schedule', component: UniversalSchedule, title: 'Universal Master Schedule', description: 'Advanced drag-and-drop scheduling command center' },
      { path: '/session-allocation', component: SessionAllocationManager, title: 'Session Allocation Manager', description: 'Manage client session counts and allocation' },
      { path: '/client-trainer-assignments', component: ClientTrainerAssignments, title: 'Client-Trainer Assignments', description: 'Drag-and-drop client assignment management' },
      { path: '/trainer-permissions', component: TrainerPermissionsManager, title: 'Trainer Permissions', description: 'Granular trainer permission control' },
      
      // 💰 BUSINESS & FINANCIAL MANAGEMENT
      { path: '/admin-packages', component: AdminPackagesView, title: 'Package Management', description: 'Training package configuration' },
      { path: '/revenue', component: RevenueAnalyticsPanel, title: 'Revenue Analytics', description: 'Financial performance tracking' },
      { path: '/pending-orders', component: PendingOrdersAdminPanel, title: 'Pending Orders', description: 'Order management system' },
      
      // 🎮 ENGAGEMENT & SYSTEMS
      { path: '/gamification', component: AdminGamificationView, title: 'Gamification Engine', description: 'Achievement system control' },
      
      // 🎨 DESIGN SYSTEM & DEVELOPMENT
      { path: '/style-guide', component: TheAestheticCodex, title: 'The Aesthetic Codex', description: 'Living style guide and design system foundation' },

      // 🎬 CONTENT MANAGEMENT — Two-tier hub (Bootstrap + Full Arsenal)
      { path: '/content', component: ContentStudioHub, title: 'Content Studio', description: 'Video and content management' },

      // 🔐 FEATURE ACCESS CONTROL (admin-only)
      { path: '/feature-access', component: FeatureAccessPage, title: 'Feature Access', description: 'Per-user feature flag management' },

      // 🍁 ADMIN-ONLY: Canada Immigration
      { path: '/immigration', component: CanadaImmigrationTab, title: 'Canada Immigration', description: 'Immigration tracker & study platform' },

      // 💪 WORKOUT LOGGING (admin can log workouts too)
      { path: '/log-workout', component: EnhancedWorkoutLogger, title: 'Log Client Workout', description: 'Enhanced NASM workout logging' },
      { path: '/plaud', component: AdminPlaudCommandCenterRedirect, title: 'Coach Command Center', description: 'Redirects PLAUD intake into the unified admin Coach Command Center' },

      // 🏋️ NASM WORKOUT PLANNER — AI-powered workout builder with Teach Mode
      { path: '/workout-planner', component: WorkoutPlannerPage, title: 'Swan Studios Workout Planner', description: 'Build periodized training programs with 840+ exercises' },

      // 🔧 EQUIPMENT MANAGER — Upload gym/park/home photos, manage equipment profiles
      { path: '/equipment', component: EquipmentManagerPage, title: 'Equipment Manager', description: 'Manage training environments and equipment profiles' },

      // 🔥 BOOTCAMP CREATOR — Swan Coach group fitness class builder
      { path: '/bootcamp', component: BootcampBuilderPage, title: 'Bootcamp Creator', description: 'Swan Coach group fitness class builder with pyramids, supersets, and flow optimization' },

      // 📣 MARKETING DASHBOARD — SEO, content creation, social media, competitor analysis
      { path: '/marketing', component: MarketingWorkspace, title: 'Marketing', description: 'Campaign approvals, publishing cadence, lead follow-up, and performance signals' },

      // 🔒 SECURITY INTELLIGENCE — CVE scanning, dependency health, alerts, score card
      { path: '/security', component: SecurityWorkspace, title: 'Security Intelligence', description: 'Vulnerability scanning, dependency health, and security posture' },

      // 📊 ADMIN-AS-TRAINER TOOLS — admin has access to everything trainers have
      { path: '/body-map', component: BodyMapPage, title: 'Pain Charts', description: 'Client pain and injury tracking (body map)' },
      { path: '/meal-planner', component: NutritionWorkspaceLazy, title: 'Nutrition Intelligence', description: 'Log meals, track macros, and explore food data' },
      { path: '/messages', component: MessagingPageLazy, title: 'Messages', description: 'Communication hub for clients and trainers' },
      { path: '/sprint-planner', component: SprintPlannerPage, title: 'Sprint Planner', description: '3-month bootcamp sprint planning + calendar' },
      { path: '/video-call', component: VideoCallPage, title: 'Video Assessment', description: 'Remote movement screens, postural analysis via video' },
      { path: '/my-home', component: AvatarHomePage, title: 'My Home', description: '3D avatar home — unlocks at Level 10' },
      { path: '/virtual-olympics', component: VirtualOlympicsPage, title: 'Virtual Olympics', description: 'Ghost Racing competitive events — Pull-ups, Push-ups, Sprint' },
      { path: '/badge-creator', component: BadgeCreatorPage, title: 'Badge Creator', description: 'AI-powered badge and icon generation studio' },
      { path: '/waivers', component: AdminWaiversManagerPage, title: 'Waiver Management', description: 'Waiver records, match approval, revocation, and manual linking' }
    ],
    defaultPath: '/coach-assistant'
  },
  trainer: {
    routes: [
      { path: '/overview', component: TrainerHomeTab, title: 'Home', description: 'Your trainer operations hub' },
      { path: '/clients', component: MyClientsView, title: 'My Clients', description: 'Assigned client management' },
      { path: '/log-workout', component: EnhancedWorkoutLogger, title: 'Log Client Workout', description: 'Enhanced NASM-compliant workout logging interface with client integration' },
      { path: '/client-progress', component: EnhancedClientProgressView, title: 'Client Progress Analytics', description: 'Advanced client progress tracking with comparison analytics, injury risk assessment, and goal management' },
      { path: '/assessments', component: TrainerAssessmentsPage, title: 'Form Assessments', description: 'Swan Coach form checking' },
      { path: '/videos', component: VideoLibraryPage, title: 'Video Library', description: 'Training video content library' },
      { path: '/workout-forge', component: TrainerWorkoutForgePage, title: 'Workout Intelligence', description: 'Swan Coach workout generation' },
      { path: '/plaud', component: PlaudIntelligenceWorkspacePage, title: 'PLAUD Intelligence Workspace', description: 'PLAUD intake, merge review, and Swan Coach handoff' },
      { path: '/workout-planner', component: WorkoutPlannerPage, title: 'Swan Studios Workout Planner', description: 'Build periodized training programs with 840+ exercises' },
      { path: '/meal-planner', component: NutritionWorkspaceLazy, title: 'Nutrition Intelligence', description: 'Log meals, track macros, and explore food data' },
      { path: '/schedule', component: UniversalSchedule, title: 'My Schedule', description: 'Personal appointment calendar' },
      { path: '/messages', component: MessagingPageLazy, title: 'Client Messages', description: 'Communication hub' },
      { path: '/live', component: LiveStreamingPage, title: 'Live Streams', description: 'Stream live workouts to clients' },
      { path: '/creators', component: CreatorEconomyPage, title: 'Creators', description: 'Creator program and content monetization' },
      { path: '/equipment', component: EquipmentManagerPage, title: 'Equipment Manager', description: 'Manage training environments and equipment profiles' },
      { path: '/bootcamp', component: BootcampBuilderPage, title: 'Bootcamp Creator', description: 'Swan Coach group fitness class builder' },
      { path: '/body-map', component: BodyMapPage, title: 'Client Pain Charts', description: 'View and manage client pain and injury tracking' },
      { path: '/sprint-planner', component: SprintPlannerPage, title: 'Sprint Planner', description: '3-month bootcamp sprint planning + calendar' },
      { path: '/video-call', component: VideoCallPage, title: 'Video Assessment', description: 'Remote movement screens, postural analysis via video' },
      { path: '/my-home', component: AvatarHomePage, title: 'My Home', description: '3D avatar home — unlocks at Level 10' },
      { path: '/coach-assistant', component: SwanCoachAssistantPage, title: 'Coach Assistant', description: 'Swan Studios Coach Assistant' },
      { path: '/virtual-olympics', component: VirtualOlympicsPage, title: 'Virtual Olympics', description: 'Ghost Racing competitive events' }
    ],
    defaultPath: '/overview'
  },
  client: {
    routes: [
      { path: '/overview', component: ClientHomeTab, title: 'Home', description: 'Your fitness journey hub' },
      { path: '/overview/:tab', component: ClientHomeTab, title: 'Home', description: 'Your fitness journey hub' },
      { path: '/onboarding', component: ClientSelfOnboardingPage, title: 'Client Onboarding', description: 'Complete your SwanStudios onboarding' },
      { path: '/workouts', component: ClientMyWorkoutsPage, title: 'My Workouts', description: 'Workout history with per-set detail' },
      { path: '/log-workout', component: WorkoutLogger, title: 'Log Workout', description: 'Log your workout session' },
      { path: '/progress', component: ClientProgressDashboardPage, title: 'My Progress', description: 'Progress dashboard with stats, charts, and gamification' },
      { path: '/progress/detailed', component: ClientProgressWrapper, title: 'Detailed Analytics', description: 'NASM 14-chart analytics dashboard' },
      { path: '/ai-consent', component: () => <AiConsentScreen />, title: 'Swan Coach Privacy & Consent', description: 'Manage Swan Coach data consent' },
      { path: '/meal-planner', component: () => <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>Loading nutrition...</div>}><NutritionWorkspaceLazy /></Suspense>, title: 'Nutrition Intelligence', description: 'Log meals, track macros, and explore food data' },
      { path: '/schedule', component: UniversalSchedule, title: 'Book My Session', description: 'Session booking interface' },
      { path: '/community', component: ClientCommunityPage, title: 'Community', description: 'Social feed and challenges' },
      { path: '/messages', component: MessagingPageLazy, title: 'Messages', description: 'Trainer communications' },
      { path: '/live', component: LiveStreamingPage, title: 'Live Streams', description: 'Watch and join live workout streams' },
      { path: '/creators', component: CreatorEconomyPage, title: 'Creators', description: 'Creator program and content monetization' },
      { path: '/profile', component: ClientProfilePage, title: 'Profile', description: 'Personal settings and preferences' },
      { path: '/rewards', component: ClientRewardsPage, title: 'Rewards', description: 'Points, achievements, and tier progress' },
      { path: '/body-map', component: BodyMapPage, title: 'Pain & Injury Chart', description: 'Track pain areas and injury recovery' },
      { path: '/my-home', component: AvatarHomePage, title: 'My Home', description: '3D avatar home — unlocks at Level 10' },
      { path: '/coach-assistant', component: SwanCoachAssistantPage, title: 'Coach Assistant', description: 'Swan Studios Coach Assistant' },
      { path: '/virtual-olympics', component: VirtualOlympicsPage, title: 'Virtual Olympics', description: 'Ghost Racing competitive events' }
    ],
    defaultPath: '/overview'
  }
};

// === MAIN COMPONENT ===
interface UniversalDashboardLayoutProps {}

const UniversalDashboardLayout: React.FC<UniversalDashboardLayoutProps> = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryInitNonce, setRetryInitNonce] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [omniTerminalOpen, setOmniTerminalOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement | null>(null);

  // Redux state
  const currentUserRole = useAppSelector(selectCurrentUserRole);
  const currentUserId = useAppSelector(selectCurrentUserId);

  // Determine user role and validate access
  // Normalize 'user' → 'client' since DB default role is 'user' but dashboard treats them as clients
  const rawRole = user?.role || 'client';
  const userRole = rawRole === 'user' ? 'client' : rawRole;
  const isValidRole = ['admin', 'trainer', 'client'].includes(userRole);

  // Derive the active dashboard role from the URL path
  // This allows admins to view trainer/client dashboards via the dashboard selector
  const pathSegments = location.pathname.split('/');
  const dashboardIndex = pathSegments.indexOf('dashboard');
  const urlRole = dashboardIndex >= 0 ? pathSegments[dashboardIndex + 1] : null;
  const validUrlRoles = ['admin', 'trainer', 'client'];

  // Use URL role if it's valid AND the user has permission to view it.
  // Admins can view all role dashboards; trainers may also inspect the client training surface.
  const canViewUrlRole = userRole === 'admin' || urlRole === userRole || (userRole === 'trainer' && urlRole === 'client');
  const activeRole = (urlRole && validUrlRoles.includes(urlRole) && canViewUrlRole)
    ? urlRole
    : userRole;

  // Initialize Redux user context and fetch role-based data
  useEffect(() => {
    const initializeUserContext = async () => {
      try {
        if (!user || !isValidRole) {
          setError('Invalid user role or authentication required.');
          setIsLoading(false);
          return;
        }

        // Set user context in Redux
        dispatch(setUserContext({ 
          role: userRole as 'admin' | 'trainer' | 'client', 
          userId: user.id 
        }));

        // Warm schedule data in the background; route rendering must not wait
        // on the scheduler because non-schedule admin surfaces need to load
        // even if that request is slow.
        void dispatch(fetchEvents({ 
          role: userRole as 'admin' | 'trainer' | 'client', 
          userId: user.id 
        })).unwrap().catch((err) => {
          console.warn('Universal Dashboard schedule prefetch failed:', err);
        });

        setError(null);
      } catch (err) {
        console.error('Universal Dashboard initialization error:', err);
        setError('Failed to initialize dashboard. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    // Delay to ensure auth state is loaded
    const initTimer = window.setTimeout(initializeUserContext, 300);
    return () => window.clearTimeout(initTimer);
  }, [user, userRole, dispatch, isValidRole, retryInitNonce]);

  // Handle sidebar toggle
  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleToggleMobile = useCallback(() => {
    setMobileSidebarOpen(prev => !prev);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
    return scheduleDashboardRouteScrollReset(mainContentRef.current);
  }, [location.pathname]);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login?returnUrl=' + encodeURIComponent(location.pathname));
  };

  const handleRetryInitialization = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRetryInitNonce(prev => prev + 1);
  }, []);

  // Loading state
  const LoadingState = () => (
    <UniversalLoadingContainer>
      <UniversalLoadingSpinner
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <h2 style={{
        fontSize: '1.25rem',
        fontWeight: 500,
        color: 'var(--text-secondary, rgba(224, 236, 244, 0.65))',
        marginBottom: '0.5rem',
      }}>
        Initializing Dashboard...
      </h2>
      <p style={{
        color: 'var(--text-muted, rgba(224, 236, 244, 0.4))',
        fontSize: '0.9rem',
      }}>
        Loading {activeRole} interface
      </p>
    </UniversalLoadingContainer>
  );

  // Error state
  const ErrorState = () => (
    <UniversalErrorContainer>
      <div style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--danger, #C92A54)' }}>!</div>
      <h2>Dashboard Access Error</h2>
      <p>{error}</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <UniversalButton
          onClick={handleRetryInitialization}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Retry
        </UniversalButton>
        <UniversalButton
          onClick={handleLogout}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ background: 'rgba(201, 42, 84, 0.2)' }} /* Crimson Frost */
        >
          Logout
        </UniversalButton>
      </div>
    </UniversalErrorContainer>
  );

  // Render appropriate sidebar based on role
  const renderSidebar = () => {
    const sidebarProps = {
      isCollapsed: sidebarCollapsed,
      onToggleCollapse: handleToggleCollapse,
      isMobileOpen: mobileSidebarOpen,
      onToggleMobile: handleToggleMobile
    };

    switch (activeRole) {
      case 'admin':
        return <AdminStellarSidebar {...sidebarProps} />;
      case 'trainer':
        return <TrainerStellarSidebar {...sidebarProps} />;
      case 'client':
        return <ClientStellarSidebar {...sidebarProps} clientSource={user?.clientSource} />;
      default:
        return <ClientStellarSidebar {...sidebarProps} clientSource={user?.clientSource} />; // Default fallback
    }
  };

  // Get role configuration
  const roleConfig = roleConfigurations[activeRole] || roleConfigurations.client;
  const canBookSwanStudiosSessions =
    userRole !== 'client' ||
    activeRole !== 'client' ||
    (user?.clientSource !== 'move_fitness' && user?.clientSource !== 'external');
  const visibleRoleRoutes = canBookSwanStudiosSessions
    ? roleConfig.routes
    : roleConfig.routes.filter(({ path }) => path !== '/schedule');
  const dashboardDefaultPath =
    !canBookSwanStudiosSessions && roleConfig.defaultPath === '/schedule'
      ? '/overview'
      : roleConfig.defaultPath;

  if (isLoading) {
    return (
      <ThemeProvider theme={{ ...universalTheme, currentRole: activeRole } as any}>
        <UniversalGlobalStyles />
        <UniversalLayoutContainer>
          <LoadingState />
        </UniversalLayoutContainer>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={{ ...universalTheme, currentRole: activeRole } as any}>
        <UniversalGlobalStyles />
        <UniversalLayoutContainer>
          <ErrorState />
        </UniversalLayoutContainer>
      </ThemeProvider>
    );
  }

  return (
    <GlobalClientProvider>
      <ThemeProvider theme={{ ...universalTheme, currentRole: activeRole } as any}>
        <UniversalGlobalStyles />
        <UniversalLayoutContainer>
          {/* Role-specific Stellar Sidebar */}
          {renderSidebar()}

          {/* Mobile back/close button — returns to dashboard overview */}
          {!location.pathname.endsWith('/overview') && (
            <MobileBackBtn
              onClick={() => navigate(`/dashboard/${activeRole}/overview`)}
              aria-label="Back to dashboard overview"
              title="Back to overview"
            >
              <X size={20} />
            </MobileBackBtn>
          )}

          {/* Universal Main Content Area */}
          <UniversalMainContent
            ref={mainContentRef}
            $sidebarCollapsed={sidebarCollapsed}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/*
              Phase 18.A (2026-04-20): persistent view-as banner for admins
              viewing a non-admin dashboard. userRole is the authenticated
              role; activeRole is the URL-driven dashboard being viewed.
              Only renders when they disagree AND the authenticated user
              is admin. Writes still audit to the real admin (no JWT swap).
            */}
            {userRole === 'admin' && (activeRole === 'trainer' || activeRole === 'client') && (
              <ViewAsBanner activeRole={activeRole} />
            )}
            <AnimatePresence mode="wait">
              <Suspense fallback={<LoadingState />}>
                <Routes>
                  {/* Default redirect */}
                  <Route path="/" element={<Navigate to={`/dashboard/${activeRole}${dashboardDefaultPath}`} replace />} />

                  {/* Role-specific routes — render routes for the active URL role */}
                  <Route path={`/${activeRole}/*`} element={
                    <Routes>
                      {visibleRoleRoutes.map(({ path, component: Component }) => (
                        <Route
                          key={path}
                          path={path.replace(/^\//, '')}
                          element={
                            <UniversalPageContainer
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6 }}
                            >
                              <Component />
                            </UniversalPageContainer>
                          }
                        />
                      ))}
                      {/* Default redirect for role */}
                      <Route path="*" element={<Navigate to={`/dashboard/${activeRole}${dashboardDefaultPath}`} replace />} />
                    </Routes>
                  } />

                  {/* Fallback Route */}
                  <Route path="*" element={<Navigate to={`/dashboard/${activeRole}${dashboardDefaultPath}`} replace />} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </UniversalMainContent>
        </UniversalLayoutContainer>

        {/* OmniTerminal — persistent AI assistant drawer, accessible from all pages */}
        {(activeRole === 'admin' || activeRole === 'trainer') && (
          <Suspense fallback={null}>
            <OmniTerminal
              isOpen={omniTerminalOpen}
              onClose={() => setOmniTerminalOpen(false)}
            />
          </Suspense>
        )}

        {/* OmniTerminal trigger FAB */}
        {(activeRole === 'admin' || activeRole === 'trainer') && !omniTerminalOpen && (
          <OmniTerminalFAB
            onClick={() => setOmniTerminalOpen(true)}
            aria-label="Open SwanStudios Assistant"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              <path d="M18 14v2a6 6 0 0 1-12 0v-2" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
            AI
          </OmniTerminalFAB>
        )}
      </ThemeProvider>
    </GlobalClientProvider>
  );
};

// OmniTerminal floating action button
const OmniTerminalFAB = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 10px;
  font-weight: 700;
  font-family: 'Sora', sans-serif;
  z-index: 1050;
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3), 0 0 12px rgba(96, 192, 240, 0.2);
  transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 28px rgba(139, 92, 246, 0.5), 0 0 20px rgba(96, 192, 240, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    bottom: 16px;
    right: 16px;
  }

  @media (max-width: 375px) {
    bottom: 12px;
    right: 8px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    font-size: 9px;
  }
`;

export default UniversalDashboardLayout;
