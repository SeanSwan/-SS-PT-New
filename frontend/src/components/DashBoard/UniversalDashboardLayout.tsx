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
import { useAuth } from '../../context/AuthContext';
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
import NASMProgressCharts from '../Client/NASMProgressCharts';

// 🎨 THE AESTHETIC CODEX: Import the definitive style guide
import TheAestheticCodex from '../../core/TheAestheticCodex';

// Import Trainer Dashboard Components
import MyClientsView from '../TrainerDashboard/ClientManagement';
import EnhancedWorkoutLogger from '../TrainerDashboard/WorkoutLogging';
import { EnhancedClientProgressView } from '../TrainerDashboard/ClientProgress';

// Lazy load components
const UniversalScheduleLazy = React.lazy(() => import('../Schedule/UniversalSchedule'));
const AiConsentScreen = React.lazy(() => import('./Pages/client-dashboard/AiConsentScreen'));

// === UNIVERSAL THEME SYSTEM ===
const universalTheme = {
  // Role-specific color palettes
  admin: {
    primary: '#1e3a8a',      // Command Navy
    secondary: '#3b82f6',    // Stellar Blue  
    accent: '#00ffff',       // Cyber Cyan
    gradients: {
      primary: 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #00ffff 100%)',
      background: 'radial-gradient(ellipse at top, #3b82f6 0%, #1e3a8a 50%, #0a0a0f 100%)'
    }
  },
  trainer: {
    primary: '#7851a9',      // Stellar Purple
    secondary: '#9333ea',    // Cosmic Amethyst
    accent: '#00ffff',       // Cyber Cyan
    gradients: {
      primary: 'linear-gradient(135deg, #7851a9 0%, #8b5cf6 50%, #00ffff 100%)',
      background: 'radial-gradient(ellipse at top, #9333ea 0%, #7851a9 50%, #0a0a0f 100%)'
    }
  },
  client: {
    primary: '#10b981',      // Galaxy Emerald
    secondary: '#22c55e',    // Cosmic Green
    accent: '#00ffff',       // Cyber Cyan
    gradients: {
      primary: 'linear-gradient(135deg, #10b981 0%, #22c55e 50%, #00ffff 100%)',
      background: 'radial-gradient(ellipse at top, #22c55e 0%, #10b981 50%, #0a0a0f 100%)'
    }
  },
  // Common elements
  common: {
    deepSpace: '#0a0a0f',
    stellarWhite: '#ffffff',
    platinumSilver: '#e5e7eb',
    cosmicGray: '#9ca3af',
    voidBlack: '#000000',
    warningAmber: '#f59e0b',
    successGreen: '#10b981',
    criticalRed: '#ef4444'
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Roboto", sans-serif',
    weights: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 }
  },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '3rem' },
  borderRadius: { sm: '6px', md: '12px', lg: '16px', xl: '24px' }
};

// === GLOBAL STYLES FOR UNIVERSAL SYSTEM ===
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
  
  body {
    font-family: ${props => props.theme.typography.fontFamily};
    color: ${props => props.theme.common.stellarWhite};
    background: ${props => {
      const role = props.theme.currentRole || 'admin';
      return props.theme[role]?.gradients?.background || props.theme.admin.gradients.background;
    }};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  /* Custom Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.3);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${props => {
      const role = props.theme.currentRole || 'admin';
      return props.theme[role]?.gradients?.primary || props.theme.admin.gradients.primary;
    }};
    border-radius: 4px;
    
    &:hover {
      background: ${props => {
        const role = props.theme.currentRole || 'admin';
        return props.theme[role]?.secondary || props.theme.admin.secondary;
      }};
    }
  }
  
  /* Focus Styles for Accessibility */
  *:focus {
    outline: 2px solid ${props => {
      const role = props.theme.currentRole || 'admin';
      return props.theme[role]?.secondary || props.theme.admin.secondary;
    }};
    outline-offset: 2px;
  }
  
  /* Disable focus outline for mouse users */
  .js-focus-visible *:focus:not(.focus-visible) {
    outline: none;
  }
`;

// === STYLED COMPONENTS ===
const UniversalLayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: ${props => {
    const role = props.theme.currentRole || 'admin';
    return props.theme[role]?.gradients?.background || props.theme.admin.gradients.background;
  }};
  position: relative;
  /* SCROLL FIX: Removed overflow: hidden which was blocking body scroll */
  overflow-x: hidden;

  /* Role-specific cosmic particle background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => {
      const role = props.theme.currentRole || 'admin';
      const primaryColor = props.theme[role]?.secondary || props.theme.admin.secondary;
      const accentColor = props.theme.common.stellarWhite;

      return `
        radial-gradient(2px 2px at 40px 60px, ${primaryColor}30, transparent),
        radial-gradient(1px 1px at 90px 120px, ${primaryColor}20, transparent),
        radial-gradient(1px 1px at 170px 80px, ${accentColor}10, transparent)
      `;
    }};
    background-size: 200px 160px;
    background-repeat: repeat;
    /* SCROLL FIX: Disable animation on mobile to prevent scroll jank */
    animation: universalFloat 60s linear infinite;
    opacity: 0.4;
    pointer-events: none;
    z-index: -1;
    /* GPU layer promotion for smoother animation */
    transform: translateZ(0);
    will-change: transform;
  }

  @keyframes universalFloat {
    0% { transform: translateY(0) rotate(0deg); }
    100% { transform: translateY(-20px) rotate(360deg); }
  }

  /* SCROLL FIX: Disable expensive animation on mobile */
  @media (max-width: 768px) {
    &::before {
      animation: none;
      transform: none;
      will-change: auto;
    }
  }
`;

const UniversalMainContent = styled(motion.main)`
  flex: 1;
  margin-left: 280px;
  padding: ${props => props.theme.spacing.lg};
  min-height: 100vh;
  position: relative;
  /* SCROLL FIX: Replaced expensive backdrop-filter with solid background on mobile */
  background: rgba(248, 250, 252, 0.02);
  /* GPU layer promotion for smooth scrolling */
  transform: translateZ(0);
  -webkit-overflow-scrolling: touch;

  @media (min-width: 769px) {
    /* Only use backdrop-filter on desktop where it's less impactful */
    backdrop-filter: blur(10px);
  }

  @media (max-width: 768px) {
    margin-left: 0;
    padding: ${props => props.theme.spacing.md};
    /* Solid background instead of blur for mobile performance */
    background: rgba(10, 10, 15, 0.95);
  }
`;

const UniversalPageContainer = styled(motion.div)`
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 1;
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
  border: 4px solid ${props => {
    const role = props.theme.currentRole || 'admin';
    return `${props.theme[role]?.primary || props.theme.admin.primary}20`;
  }};
  border-left: 4px solid ${props => {
    const role = props.theme.currentRole || 'admin';
    return props.theme[role]?.secondary || props.theme.admin.secondary;
  }};
  border-radius: 50%;
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const UniversalErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
  padding: ${props => props.theme.spacing.xl};
  
  h2 {
    color: ${props => props.theme.common.criticalRed};
    margin-bottom: ${props => props.theme.spacing.md};
    font-size: 1.5rem;
    font-weight: ${props => props.theme.typography.weights.semibold};
  }
  
  p {
    color: ${props => props.theme.common.platinumSilver};
    margin-bottom: ${props => props.theme.spacing.lg};
    max-width: 600px;
    line-height: 1.6;
  }
`;

const UniversalButton = styled(motion.button)`
  background: ${props => {
    const role = props.theme.currentRole || 'admin';
    return props.theme[role]?.gradients?.primary || props.theme.admin.gradients.primary;
  }};
  border: 1px solid ${props => {
    const role = props.theme.currentRole || 'admin';
    return `${props.theme[role]?.secondary || props.theme.admin.secondary}30`;
  }};
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.common.stellarWhite};
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  font-weight: ${props => props.theme.typography.weights.medium};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 0 30px ${props => {
      const role = props.theme.currentRole || 'admin';
      return `${props.theme[role]?.secondary || props.theme.admin.secondary}60`;
    }};
    transform: translateY(-2px);
  }
`;

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
      
      // 🏢 COMPREHENSIVE USER DATA MANAGEMENT SUITE
      { path: '/user-management', component: EnhancedUserDataManagement, title: 'User Data Management', description: 'Complete user data collection & lifecycle management' },
      { path: '/user-management-legacy', component: ModernUserManagementSystem, title: 'User Management (Legacy)', description: 'Traditional user management interface' },
      
      // 🏋️ ENHANCED TRAINER DATA MANAGEMENT
      { path: '/trainer-management', component: EnhancedTrainerDataManagement, title: 'Trainer Data Management', description: 'Complete trainer data collection, certs & performance' },
      { path: '/trainer-management-legacy', component: TrainersManagementSection, title: 'Trainer Management (Legacy)', description: 'Traditional trainer oversight interface' },
      
      // 💪 COMPREHENSIVE CLIENT DATA MANAGEMENT
      { path: '/client-management', component: ClientManagementDashboard, title: 'Client Management Hub', description: 'Complete client data collection & management' },
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
      { path: '/style-guide', component: TheAestheticCodex, title: 'The Aesthetic Codex', description: 'Living style guide and design system foundation' }
    ],
    defaultPath: '/overview'
  },
  trainer: {
    routes: [
      { path: '/overview', component: () => <div>Trainer Overview (Coming Soon)</div>, title: 'Training Overview', description: 'Your coaching dashboard' },
      { path: '/clients', component: MyClientsView, title: 'My Clients', description: 'Assigned client management' },
      { path: '/log-workout', component: EnhancedWorkoutLogger, title: 'Log Client Workout', description: 'Enhanced NASM-compliant workout logging interface with client integration' },
      { path: '/client-progress', component: EnhancedClientProgressView, title: 'Client Progress Analytics', description: 'Advanced client progress tracking with comparison analytics, injury risk assessment, and goal management' },
      { path: '/assessments', component: () => <div>Form Assessments (Coming Soon)</div>, title: 'Form Assessments', description: 'YOLO AI form checking' },
      { path: '/videos', component: () => <div>Training Videos (Coming Soon)</div>, title: 'Training Videos', description: 'Video content library' },
      { path: '/workout-forge', component: () => <div>AI Workout Forge (Coming Soon)</div>, title: 'AI Workout Forge', description: 'Olympian\'s Forge interface' },
      { path: '/schedule', component: UniversalScheduleLazy, title: 'My Schedule', description: 'Personal appointment calendar' },
      { path: '/messages', component: () => <div>Client Messages (Coming Soon)</div>, title: 'Client Messages', description: 'Communication hub' }
    ],
    defaultPath: '/overview'
  },
  client: {
    routes: [
      { path: '/overview', component: () => <div>Galaxy Overview (Coming Soon)</div>, title: 'Overview', description: 'Your fitness journey hub' },
      { path: '/workouts', component: () => <div>My Workouts (Coming Soon)</div>, title: 'My Workouts', description: 'Assigned workout plans' },
      { path: '/progress', component: () => <NASMProgressCharts clientId={user?.id || 0} />, title: 'My Progress', description: 'NASM progress visualization dashboard' },
      { path: '/workout-forge', component: () => <div>AI Workout Forge (Coming Soon)</div>, title: 'AI Workout Forge', description: 'Self-serve workout generation' },
      { path: '/ai-consent', component: () => <AiConsentScreen />, title: 'AI Privacy & Consent', description: 'Manage AI data consent' },
      { path: '/meal-planner', component: () => <div>AI Meal Planner (Coming Soon)</div>, title: 'AI Meal Planner', description: 'Culinary Codex interface' },
      { path: '/schedule', component: UniversalScheduleLazy, title: 'Book My Session', description: 'Session booking interface' },
      { path: '/community', component: () => <div>Community & Challenges (Coming Soon)</div>, title: 'Community', description: 'Social feed and challenges' },
      { path: '/messages', component: () => <div>Messages (Coming Soon)</div>, title: 'Messages', description: 'Trainer communications' },
      { path: '/profile', component: () => <div>Profile & Settings (Coming Soon)</div>, title: 'Profile', description: 'Personal settings' },
      { path: '/rewards', component: () => <div>My Rewards (Coming Soon)</div>, title: 'Rewards', description: 'Points and achievements' }
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

  // Redux state
  const currentUserRole = useAppSelector(selectCurrentUserRole);
  const currentUserId = useAppSelector(selectCurrentUserId);

  // Determine user role and validate access
  const userRole = user?.role || 'client';
  const isValidRole = ['admin', 'trainer', 'client'].includes(userRole);

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
        color: universalTheme.common.platinumSilver,
        marginBottom: '0.5rem'
      }}>
        Initializing Universal Dashboard...
      </h2>
      <p style={{ 
        color: universalTheme.common.cosmicGray,
        fontSize: '0.9rem'
      }}>
        Loading {userRole} interface
      </p>
    </UniversalLoadingContainer>
  );

  // Error state
  const ErrorState = () => (
    <UniversalErrorContainer>
      <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🛡️</div>
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
          style={{ background: 'rgba(239, 68, 68, 0.2)' }}
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

    switch (userRole) {
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
  const roleConfig = roleConfigurations[userRole] || roleConfigurations.client;

  if (isLoading) {
    return (
      <ThemeProvider theme={{ ...universalTheme, currentRole: userRole }}>
        <UniversalGlobalStyles />
        <UniversalLayoutContainer>
          <LoadingState />
        </UniversalLayoutContainer>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={{ ...universalTheme, currentRole: userRole }}>
        <UniversalGlobalStyles />
        <UniversalLayoutContainer>
          <ErrorState />
        </UniversalLayoutContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={{ ...universalTheme, currentRole: userRole }}>
      <UniversalGlobalStyles />
      <UniversalLayoutContainer>
        {/* Role-specific Stellar Sidebar */}
        {renderSidebar()}
        
        {/* Universal Main Content Area */}
        <UniversalMainContent
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingState />}>
              <Routes>
                {/* Default redirect */}
                <Route path="/" element={<Navigate to={`/dashboard/${userRole}${roleConfig.defaultPath}`} replace />} />
                
                {/* Role-specific routes */}
                <Route path={`/${userRole}/*`} element={
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
                    <Route path="*" element={<Navigate to={`/dashboard/${userRole}${roleConfig.defaultPath}`} replace />} />
                  </Routes>
                } />
                
                {/* Fallback Route */}
                <Route path="*" element={<Navigate to={`/dashboard/${userRole}${roleConfig.defaultPath}`} replace />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </UniversalMainContent>
      </UniversalLayoutContainer>
    </ThemeProvider>
  );
};

export default UniversalDashboardLayout;
