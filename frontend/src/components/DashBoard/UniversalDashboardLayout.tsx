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

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GlobalClientProvider } from '../../context/GlobalClientContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { 
  fetchEvents, 
  setUserContext, 
  selectCurrentUserRole,
  selectCurrentUserId
} from '../../redux/slices/scheduleSlice';

// Import the three stellar sidebars
import AdminStellarSidebar from './Pages/admin-dashboard/AdminStellarSidebar';
import TrainerStellarSidebar from './Pages/trainer-dashboard/TrainerStellarSidebar';
import ClientStellarSidebar from './Pages/client-dashboard/ClientStellarSidebar';

// Import role-specific page components
import { RevolutionaryAdminDashboard } from './Pages/admin-dashboard/admin-dashboard-view';
import EnhancedAdminSessionsView from './Pages/admin-sessions/enhanced-admin-sessions-view';
import ModernUserManagementSystem from './Pages/user-management/modern-user-management';
import AdminClientProgressView from './Pages/admin-client-progress/admin-client-progress-view.V2';
import AdminPackagesView from './Pages/admin-packages/admin-packages-view';
import TrainersManagementSection from './Pages/admin-dashboard/TrainersManagementSection';
import AdminGamificationView from './Pages/admin-gamification/admin-gamification-view';
import RevenueAnalyticsPanel from './Pages/admin-dashboard/components/RevenueAnalyticsPanel';
import PendingOrdersAdminPanel from './Pages/admin-dashboard/components/PendingOrdersAdminPanel';

// 🔥 BUSINESS-CRITICAL: Import Client Management System Components
import ClientManagementDashboard from './Pages/admin-clients/ClientManagementDashboard';
import EnhancedAdminClientManagementView from './Pages/admin-clients/EnhancedAdminClientManagementView';
import ClientOnboardingWizard from './Pages/admin-clients/components/ClientOnboardingWizard';
import NutritionPlanBuilder from '../Admin/NutritionPlanBuilder';
import WorkoutPlanBuilder from '../Admin/WorkoutPlanBuilder';
import NotesManager from '../Admin/NotesManager';
import PhotoManager from '../Admin/PhotoManager';
import AutomationManager from '../Admin/AutomationManager';
import SMSLogsPanel from '../Admin/SMSLogsPanel';

// 🏢 COMPREHENSIVE DATA MANAGEMENT: Import Enhanced User & Trainer Management
import EnhancedUserDataManagement from './Pages/admin-users/EnhancedUserDataManagement';
import EnhancedTrainerDataManagement from './Pages/admin-trainers/EnhancedTrainerDataManagement';

// 🚀 UNIFIED DATA COLLECTION: Import Comprehensive Onboarding System
import UnifiedOnboardingWizard from './Pages/admin-onboarding/UnifiedOnboardingWizard';

// Import Universal Master Schedule Integration
import UniversalSchedule from '../Schedule/UniversalSchedule';

// Import NASM Workout Tracking System Components
import ClientTrainerAssignments from '../Admin/ClientTrainerAssignments';
import TrainerPermissionsManager from '../Admin/TrainerPermissionsManager';
import SessionAllocationManager from '../Admin/SessionAllocationManager';
import WorkoutLogger from '../WorkoutLogger/WorkoutLogger';
import { ClientProgressCharts as NASMProgressCharts } from '../ClientProgressCharts';

// 🎨 THE AESTHETIC CODEX: Import the definitive style guide
import TheAestheticCodex from '../../core/TheAestheticCodex';

// Import Trainer Dashboard Components
import MyClientsView from '../TrainerDashboard/ClientManagement';
import EnhancedWorkoutLogger from '../TrainerDashboard/WorkoutLogging';
import { EnhancedClientProgressView } from '../TrainerDashboard/ClientProgress';

// Lazy load components
const UniversalScheduleLazy = React.lazy(() => import('../Schedule/UniversalSchedule'));
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

// Client dashboard pages (replacing stubs)
const ClientMyWorkoutsPage = React.lazy(() => import('./Pages/client-dashboard/ClientMyWorkoutsPage'));
const ClientOverviewPage = React.lazy(() => import('./Pages/client-dashboard/ClientOverviewPage'));
const ClientProfilePage = React.lazy(() => import('./Pages/client-dashboard/ClientProfilePage'));
const ClientRewardsPage = React.lazy(() => import('./Pages/client-dashboard/ClientRewardsPage'));
const ClientCommunityPage = React.lazy(() => import('./Pages/client-dashboard/ClientCommunityPage'));
const ClientWorkoutForgePage = React.lazy(() => import('./Pages/client-dashboard/ClientWorkoutForgePage'));
const BodyMapPage = React.lazy(() => import('../BodyMap'));

// Trainer dashboard pages (replacing stubs)
const TrainerOverviewPage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerOverviewPage'));
const TrainerAssessmentsPage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerAssessmentsPage'));
const TrainerVideosPage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerVideosPage'));
const VideoLibraryPage = React.lazy(() => import('../../pages/VideoLibraryV3'));
const TrainerWorkoutForgePage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerWorkoutForgePage'));
const OmniTerminal = React.lazy(() => import('../Shared/OmniTerminal'));
const EquipmentManagerPage = React.lazy(() => import('../EquipmentManager/EquipmentManagerPage'));
const BootcampBuilderPage = React.lazy(() => import('../BootcampBuilder/BootcampBuilderPage'));

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
`;

const UniversalPageContainer = styled(motion.div)`
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 1;
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
  return <NASMProgressCharts clientId={user?.id || 0} />;
};

// === ROLE CONFIGURATION ===
interface RoleConfig {
  routes: Array<{
    path: string;
    component: React.ComponentType;
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
      { path: '/coach-assistant', component: SwanCoachAssistantPage, title: 'Coach Assistant', description: 'Swan Studios AI training assistant' },

      // 🏢 COMPREHENSIVE USER DATA MANAGEMENT SUITE
      { path: '/user-management', component: EnhancedUserDataManagement, title: 'User Data Management', description: 'Complete user data collection & lifecycle management' },
      { path: '/user-management-legacy', component: ModernUserManagementSystem, title: 'User Management (Legacy)', description: 'Traditional user management interface' },
      
      // 🏋️ ENHANCED TRAINER DATA MANAGEMENT
      { path: '/trainer-management', component: EnhancedTrainerDataManagement, title: 'Trainer Data Management', description: 'Complete trainer data collection, certs & performance' },
      { path: '/trainer-management-legacy', component: TrainersManagementSection, title: 'Trainer Management (Legacy)', description: 'Traditional trainer oversight interface' },
      
      // 💪 COMPREHENSIVE CLIENT DATA MANAGEMENT
      { path: '/client-management', component: React.lazy(() => import('./workspaces/ClientsWorkspace')), title: 'Client Hub', description: 'Unified client management with selector, cards, and detail tabs' },
      { path: '/client-details', component: EnhancedAdminClientManagementView, title: 'Advanced Client Management', description: 'Detailed client management interface' },
      { path: '/client-onboarding', component: ClientOnboardingWizard, title: 'Client Onboarding', description: 'New client data collection workflow' },
      { path: '/client-progress-tracking', component: AdminClientProgressView, title: 'Client Progress Analytics', description: 'Client progress monitoring & analytics' },
      { path: '/nutrition/:clientId?', component: NutritionPlanBuilder, title: 'Nutrition Plan Builder', description: 'Create and update client nutrition plans' },
      { path: '/workouts/:clientId?', component: WorkoutPlanBuilder, title: 'Workout Plan Builder', description: 'Build client-specific workout plans' },
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
      { path: '/homepage-preview', component: React.lazy(() => import('../../pages/HomePage/components/HomePage.V5')), title: 'Homepage V5 Preview', description: 'Preview redesigned homepage before going live' },

      // 🎬 CONTENT MANAGEMENT — Two-tier hub (Bootstrap + Full Arsenal)
      { path: '/content', component: ContentStudioHub, title: 'Content Studio', description: 'Video and content management' },

      // 🔐 FEATURE ACCESS CONTROL (admin-only)
      { path: '/feature-access', component: FeatureAccessPage, title: 'Feature Access', description: 'Per-user feature flag management' },

      // 🍁 ADMIN-ONLY: Canada Immigration
      { path: '/immigration', component: CanadaImmigrationTab, title: 'Canada Immigration', description: 'Immigration tracker & study platform' },

      // 💪 WORKOUT LOGGING (admin can log workouts too)
      { path: '/log-workout', component: EnhancedWorkoutLogger, title: 'Log Client Workout', description: 'Enhanced NASM workout logging' },

      // 🏋️ NASM WORKOUT PLANNER — AI-powered workout builder with Teach Mode
      { path: '/workout-planner', component: WorkoutPlannerPage, title: 'Swan Studios Workout Planner', description: 'Build periodized training programs with 840+ exercises' },

      // 🔧 EQUIPMENT MANAGER — Upload gym/park/home photos, manage equipment profiles
      { path: '/equipment', component: EquipmentManagerPage, title: 'Equipment Manager', description: 'Manage training environments and equipment profiles' },

      // 🔥 BOOTCAMP CREATOR — AI-powered group fitness class builder
      { path: '/bootcamp', component: BootcampBuilderPage, title: 'Bootcamp Creator', description: 'AI-powered group fitness class builder with pyramids, supersets, and flow optimization' }
    ],
    defaultPath: '/coach-assistant'
  },
  trainer: {
    routes: [
      { path: '/overview', component: TrainerOverviewPage, title: 'Training Overview', description: 'Your coaching dashboard' },
      { path: '/clients', component: MyClientsView, title: 'My Clients', description: 'Assigned client management' },
      { path: '/log-workout', component: EnhancedWorkoutLogger, title: 'Log Client Workout', description: 'Enhanced NASM-compliant workout logging interface with client integration' },
      { path: '/client-progress', component: EnhancedClientProgressView, title: 'Client Progress Analytics', description: 'Advanced client progress tracking with comparison analytics, injury risk assessment, and goal management' },
      { path: '/assessments', component: TrainerAssessmentsPage, title: 'Form Assessments', description: 'YOLO AI form checking' },
      { path: '/videos', component: VideoLibraryPage, title: 'Video Library', description: 'Training video content library' },
      { path: '/workout-forge', component: TrainerWorkoutForgePage, title: 'Workout Intelligence', description: 'AI workout generation' },
      { path: '/workout-planner', component: WorkoutPlannerPage, title: 'Swan Studios Workout Planner', description: 'Build periodized training programs with 840+ exercises' },
      { path: '/meal-planner', component: NutritionWorkspaceLazy, title: 'Nutrition Intelligence', description: 'Log meals, track macros, and explore food data' },
      { path: '/schedule', component: UniversalScheduleLazy, title: 'My Schedule', description: 'Personal appointment calendar' },
      { path: '/messages', component: MessagingPageLazy, title: 'Client Messages', description: 'Communication hub' },
      { path: '/live', component: LiveStreamingPage, title: 'Live Streams', description: 'Stream live workouts to clients' },
      { path: '/creators', component: CreatorEconomyPage, title: 'Creators', description: 'Creator program and content monetization' },
      { path: '/equipment', component: EquipmentManagerPage, title: 'Equipment Manager', description: 'Manage training environments and equipment profiles' },
      { path: '/bootcamp', component: BootcampBuilderPage, title: 'Bootcamp Creator', description: 'AI-powered group fitness class builder' },
      { path: '/body-map', component: BodyMapPage, title: 'Client Pain Charts', description: 'View and manage client pain and injury tracking' }
    ],
    defaultPath: '/overview'
  },
  client: {
    routes: [
      { path: '/overview', component: ClientOverviewPage, title: 'Overview', description: 'Your fitness journey hub' },
      { path: '/workouts', component: ClientMyWorkoutsPage, title: 'My Workouts', description: 'Workout history with per-set detail' },
      { path: '/log-workout', component: WorkoutLogger, title: 'Log Workout', description: 'Log your workout session' },
      { path: '/progress', component: ClientProgressDashboardPage, title: 'My Progress', description: 'Progress dashboard with stats, charts, and gamification' },
      { path: '/progress/detailed', component: ClientProgressWrapper, title: 'Detailed Analytics', description: 'NASM 14-chart analytics dashboard' },
      { path: '/ai-consent', component: () => <AiConsentScreen />, title: 'AI Privacy & Consent', description: 'Manage AI data consent' },
      { path: '/meal-planner', component: () => <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>Loading nutrition...</div>}><NutritionWorkspaceLazy /></Suspense>, title: 'Nutrition Intelligence', description: 'Log meals, track macros, and explore food data' },
      { path: '/schedule', component: UniversalScheduleLazy, title: 'Book My Session', description: 'Session booking interface' },
      { path: '/community', component: ClientCommunityPage, title: 'Community', description: 'Social feed and challenges' },
      { path: '/messages', component: MessagingPageLazy, title: 'Messages', description: 'Trainer communications' },
      { path: '/live', component: LiveStreamingPage, title: 'Live Streams', description: 'Watch and join live workout streams' },
      { path: '/creators', component: CreatorEconomyPage, title: 'Creators', description: 'Creator program and content monetization' },
      { path: '/profile', component: ClientProfilePage, title: 'Profile', description: 'Personal settings and preferences' },
      { path: '/rewards', component: ClientRewardsPage, title: 'Rewards', description: 'Points, achievements, and tier progress' },
      { path: '/body-map', component: BodyMapPage, title: 'Pain & Injury Chart', description: 'Track pain areas and injury recovery' }
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [omniTerminalOpen, setOmniTerminalOpen] = useState(false);

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

  // Use URL role if it's valid AND the user has permission to view it (admins can view all)
  const activeRole = (urlRole && validUrlRoles.includes(urlRole) && (userRole === 'admin' || urlRole === userRole))
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

        // Fetch role-based schedule data
        await dispatch(fetchEvents({ 
          role: userRole as 'admin' | 'trainer' | 'client', 
          userId: user.id 
        })).unwrap();

        setError(null);
      } catch (err) {
        console.error('Universal Dashboard initialization error:', err);
        setError('Failed to initialize dashboard. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    // Delay to ensure auth state is loaded
    setTimeout(initializeUserContext, 300);
  }, [user, userRole, dispatch, isValidRole]);

  // Handle sidebar toggle
  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleToggleMobile = useCallback(() => {
    setMobileSidebarOpen(prev => !prev);
  }, []);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login?returnUrl=' + encodeURIComponent(location.pathname));
  };

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
          onClick={() => window.location.reload()}
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
        return <ClientStellarSidebar {...sidebarProps} />;
      default:
        return <ClientStellarSidebar {...sidebarProps} />; // Default fallback
    }
  };

  // Get role configuration
  const roleConfig = roleConfigurations[activeRole] || roleConfigurations.client;

  if (isLoading) {
    return (
      <ThemeProvider theme={{ ...universalTheme, currentRole: activeRole }}>
        <UniversalGlobalStyles />
        <UniversalLayoutContainer>
          <LoadingState />
        </UniversalLayoutContainer>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={{ ...universalTheme, currentRole: activeRole }}>
        <UniversalGlobalStyles />
        <UniversalLayoutContainer>
          <ErrorState />
        </UniversalLayoutContainer>
      </ThemeProvider>
    );
  }

  return (
    <GlobalClientProvider>
      <ThemeProvider theme={{ ...universalTheme, currentRole: activeRole }}>
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
            $sidebarCollapsed={sidebarCollapsed}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <AnimatePresence mode="wait">
              <Suspense fallback={<LoadingState />}>
                <Routes>
                  {/* Default redirect */}
                  <Route path="/" element={<Navigate to={`/dashboard/${activeRole}${roleConfig.defaultPath}`} replace />} />

                  {/* Role-specific routes — render routes for the active URL role */}
                  <Route path={`/${activeRole}/*`} element={
                    <Routes>
                      {roleConfig.routes.map(({ path, component: Component }) => (
                        <Route
                          key={path}
                          path={path}
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
                      <Route path="*" element={<Navigate to={`/dashboard/${activeRole}${roleConfig.defaultPath}`} replace />} />
                    </Routes>
                  } />

                  {/* Fallback Route */}
                  <Route path="*" element={<Navigate to={`/dashboard/${activeRole}${roleConfig.defaultPath}`} replace />} />
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
`;

export default UniversalDashboardLayout;
