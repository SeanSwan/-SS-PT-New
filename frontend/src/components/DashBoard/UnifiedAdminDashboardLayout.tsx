/**
 * UnifiedAdminDashboardLayout.tsx
 * ================================
 * 
 * Executive Command Intelligence Admin Dashboard Layout
 * Unified layout featuring ONLY the AdminStellarSidebar with full routing integration
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Single AdminStellarSidebar with intelligent routing
 * - Executive Command Intelligence theme throughout
 * - Professional blue-focused command center aesthetic
 * - Responsive design with mobile-first approach
 * - Real-time system monitoring integration
 * - WCAG AA accessibility compliance
 * 
 * Master Prompt v28 Alignment:
 * - Revolutionary platform management interface
 * - Sensational aesthetics with functional supremacy
 * - Performance-optimized command center experience
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { useAuth } from '../../context/AuthContext';

// Import the revolutionary AdminStellarSidebar
import AdminStellarSidebar from './Pages/admin-dashboard/AdminStellarSidebar';

// Import admin page components
import { RevolutionaryAdminDashboard } from './Pages/admin-dashboard/admin-dashboard-view';
import EnhancedAdminSessionsView from './Pages/admin-sessions/enhanced-admin-sessions-view';
import ModernUserManagementSystem from './Pages/user-management/modern-user-management';
import AdminClientProgressView from './Pages/admin-client-progress/admin-client-progress-view';
import AdminPackagesView from './Pages/admin-packages/admin-packages-view';
import TrainersManagementSection from './Pages/admin-dashboard/TrainersManagementSection';
import AdminGamificationView from './Pages/admin-gamification/admin-gamification-view';

// Import Universal Master Schedule
import AdminScheduleIntegration from '../UniversalMasterSchedule/AdminScheduleIntegration';

// Import Financial Management Components
import RevenueAnalyticsPanel from './Pages/admin-dashboard/components/RevenueAnalyticsPanel';
import PendingOrdersAdminPanel from './Pages/admin-dashboard/components/PendingOrdersAdminPanel';

// Import System Management Components
import UserAnalyticsPanel from './Pages/admin-dashboard/components/UserAnalyticsPanel';
import SystemHealthPanel from './Pages/admin-dashboard/components/SystemHealthPanel';
import SecurityMonitoringPanel from './Pages/admin-dashboard/components/SecurityMonitoringPanel';
import NotificationSettingsList from './Pages/admin-dashboard/components/NotificationSettingsList';

// Import Enterprise Management Components
import ContentModerationPanel from './Pages/admin-dashboard/components/ContentModerationPanel';
import PerformanceReportsPanel from './Pages/admin-dashboard/components/PerformanceReportsPanel';
import MCPManagementPanel from './Pages/admin-dashboard/components/MCPManagementPanel';
import AdminSettingsPanel from './Pages/admin-dashboard/components/AdminSettingsPanel';

// Import Trainer Permissions Manager
import TrainerPermissionsManager from '../Admin/TrainerPermissionsManager';

// Import Client-Trainer Assignments
import ClientTrainerAssignments from '../Admin/ClientTrainerAssignments';

// Import Enhanced Admin Components
import AdminSocialManagementView from './Pages/admin-dashboard/components/AdminSocialManagementView';
import NASMCompliancePanel from './Pages/admin-dashboard/components/NASMCompliancePanel';

// Import Admin Exercise Command Center
import { AdminExerciseCommandCenter } from './Pages/admin-exercises';

// ============================================
// ENTERPRISE MCP & BUSINESS INTELLIGENCE IMPORTS
// ============================================
import { MCPServerCommandCenter } from './Pages/admin-dashboard/components/MCPServerManagement';
import { SocialMediaCommandCenter } from './Pages/admin-dashboard/components/SocialMediaCommand';
import { EnterpriseBusinessIntelligenceSuite } from './Pages/admin-dashboard/components/BusinessIntelligence';

// === EXECUTIVE COMMAND INTELLIGENCE THEME ===
const executiveCommandTheme = {
  colors: {
    // Core Command Palette
    deepSpace: '#0a0a0f',
    commandNavy: '#1e3a8a',           // Primary backgrounds, main navigation
    stellarAuthority: '#3b82f6',      // Active states, primary actions
    cyberIntelligence: '#0ea5e9',     // Data highlights, real-time indicators
    executiveAccent: '#0891b2',       // Secondary actions, hover states
    
    // Alert & Status System
    warningAmber: '#f59e0b',          // Warnings
    successGreen: '#10b981',          // Success states
    criticalRed: '#ef4444',           // Critical alerts
    
    // Information Hierarchy
    stellarWhite: '#ffffff',          // Primary text
    platinumSilver: '#e5e7eb',        // Secondary text
    cosmicGray: '#9ca3af',            // Tertiary text
    voidBlack: '#000000',             // Deep backgrounds
    
    // Content Backgrounds
    contentBackground: '#f8fafc',     // Light neutral for data-dense areas
    cardBackground: 'rgba(30, 58, 138, 0.1)', // Glass cards
  },
  gradients: {
    commandCenter: 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #0891b2 100%)',
    executiveGlass: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)',
    dataFlow: 'radial-gradient(ellipse at top, #3b82f6 0%, #1e3a8a 50%, #0a0a0f 100%)',
    intelligenceHorizon: 'linear-gradient(270deg, #0891b2, #3b82f6, #1e3a8a)',
    commandAurora: 'linear-gradient(45deg, #00ffff 0%, #3b82f6 50%, #1e3a8a 100%)'
  },
  shadows: {
    commandGlow: '0 0 30px rgba(59, 130, 246, 0.4)',
    executiveDepth: '0 20px 40px rgba(0, 0, 0, 0.3)',
    intelligenceCard: '0 8px 32px rgba(30, 58, 138, 0.2)',
    systemAlert: '0 0 20px currentColor'
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Roboto", sans-serif',
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    xxl: '3rem'       // 48px
  },
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    xl: '24px'
  }
};

// === GLOBAL STYLES FOR EXECUTIVE COMMAND INTELLIGENCE ===
const ExecutiveGlobalStyles = createGlobalStyle`
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
    color: ${props => props.theme.colors.stellarWhite};
    background: ${props => props.theme.gradients.dataFlow};
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
    background: ${props => props.theme.gradients.commandCenter};
    border-radius: 4px;
    
    &:hover {
      background: ${props => props.theme.colors.stellarAuthority};
    }
  }
  
  /* Firefox Scrollbar */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${props => props.theme.colors.stellarAuthority} rgba(10, 10, 15, 0.3);
  }
  
  /* Focus Styles for Accessibility */
  *:focus {
    outline: 2px solid ${props => props.theme.colors.stellarAuthority};
    outline-offset: 2px;
  }
  
  /* Disable focus outline for mouse users */
  .js-focus-visible *:focus:not(.focus-visible) {
    outline: none;
  }
`;

// === STYLED COMPONENTS ===
const ExecutiveLayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: ${props => props.theme.gradients.dataFlow};
  position: relative;
  overflow: hidden;
  
  /* Cosmic particle background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(2px 2px at 40px 60px, rgba(59, 130, 246, 0.3), transparent),
      radial-gradient(1px 1px at 90px 120px, rgba(14, 165, 233, 0.2), transparent),
      radial-gradient(1px 1px at 170px 80px, rgba(255, 255, 255, 0.1), transparent);
    background-size: 200px 160px;
    background-repeat: repeat;
    animation: commandFloat 60s linear infinite;
    opacity: 0.4;
    pointer-events: none;
    z-index: -1;
  }
  
  @keyframes commandFloat {
    0% { transform: translateY(0) rotate(0deg); }
    100% { transform: translateY(-20px) rotate(360deg); }
  }
`;

const ExecutiveMainContent = styled(motion.main)`
  flex: 1;
  margin-left: 280px;
  padding: ${props => props.theme.spacing.lg};
  min-height: 100vh;
  position: relative;
  background: rgba(248, 250, 252, 0.02);
  backdrop-filter: blur(10px);
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: ${props => props.theme.spacing.md};
  }
`;

const ExecutivePageContainer = styled(motion.div)`
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const ExecutiveLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
`;

const ExecutiveLoadingSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 4px solid rgba(59, 130, 246, 0.2);
  border-left: 4px solid ${props => props.theme.colors.stellarAuthority};
  border-radius: 50%;
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const ExecutiveErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
  padding: ${props => props.theme.spacing.xl};
  
  h2 {
    color: ${props => props.theme.colors.criticalRed};
    margin-bottom: ${props => props.theme.spacing.md};
    font-size: 1.5rem;
    font-weight: ${props => props.theme.typography.weights.semibold};
  }
  
  p {
    color: ${props => props.theme.colors.platinumSilver};
    margin-bottom: ${props => props.theme.spacing.lg};
    max-width: 600px;
    line-height: 1.6;
  }
`;

const ExecutiveButton = styled(motion.button)`
  background: ${props => props.theme.gradients.commandCenter};
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.stellarWhite};
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  font-weight: ${props => props.theme.typography.weights.medium};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: ${props => props.theme.shadows.commandGlow};
    transform: translateY(-2px);
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors.stellarAuthority};
    outline-offset: 2px;
  }
`;

// === PLACEHOLDER COMPONENTS ===
const LazyPlaceholder: React.FC<{ title: string; description: string; icon: string }> = ({ 
  title, 
  description, 
  icon 
}) => (
  <ExecutivePageContainer
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
  >
    <div style={{
      padding: '3rem',
      textAlign: 'center',
      background: executiveCommandTheme.gradients.executiveGlass,
      borderRadius: executiveCommandTheme.borderRadius.lg,
      border: `1px solid rgba(59, 130, 246, 0.2)`,
      backdropFilter: 'blur(20px)'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.8 }}>
        {icon}
      </div>
      <h2 style={{
        fontSize: '1.75rem',
        fontWeight: 600,
        marginBottom: '1rem',
        background: executiveCommandTheme.gradients.commandCenter,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        {title}
      </h2>
      <p style={{
        color: executiveCommandTheme.colors.platinumSilver,
        fontSize: '1.1rem',
        lineHeight: 1.6,
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {description}
      </p>
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: executiveCommandTheme.borderRadius.md,
        border: '1px solid rgba(59, 130, 246, 0.3)',
        color: executiveCommandTheme.colors.cyberIntelligence,
        fontWeight: 500
      }}>
        Implementation in Progress...
      </div>
    </div>
  </ExecutivePageContainer>
);

// === MAIN COMPONENT ===
interface UnifiedAdminDashboardLayoutProps {}

const UnifiedAdminDashboardLayout: React.FC<UnifiedAdminDashboardLayoutProps> = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify admin access
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // Simple verification with bypass for development
        if (!user) {
          setError('Authentication required. Please log in with admin credentials.');
        } else if (user.role !== 'admin' && user.email !== 'ogpswan@gmail.com') {
          setError('Administrator access required.');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Admin access verification error:', err);
        setError('Unable to verify admin access.');
      } finally {
        setIsLoading(false);
      }
    };

    // Delay to ensure auth state is loaded
    setTimeout(verifyAccess, 300);
  }, [user]);

  // Handle retry
  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    window.location.reload();
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login?returnUrl=' + encodeURIComponent(location.pathname));
  };

  // Loading state
  const LoadingState = () => (
    <ExecutiveLoadingContainer>
      <ExecutiveLoadingSpinner
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <h2 style={{ 
        fontSize: '1.25rem', 
        fontWeight: 500,
        color: executiveCommandTheme.colors.platinumSilver,
        marginBottom: '0.5rem'
      }}>
        Initializing Command Center...
      </h2>
      <p style={{ 
        color: executiveCommandTheme.colors.cosmicGray,
        fontSize: '0.9rem'
      }}>
        Loading Executive Command Intelligence
      </p>
    </ExecutiveLoadingContainer>
  );

  // Error state
  const ErrorState = () => (
    <ExecutiveErrorContainer>
      <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🛡️</div>
      <h2>Access Restricted</h2>
      <p>{error}</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <ExecutiveButton
        onClick={handleRetry}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
          aria-label="Retry admin access verification"
          >
          Retry Access
        </ExecutiveButton>
        <ExecutiveButton
        onClick={handleLogout}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ 
        background: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 0.4)'
        }}
          aria-label="Logout from admin dashboard"
          >
          Logout
        </ExecutiveButton>
      </div>
    </ExecutiveErrorContainer>
  );

  if (isLoading) {
    return (
      <ThemeProvider theme={executiveCommandTheme}>
        <ExecutiveGlobalStyles />
        <ExecutiveLayoutContainer>
          <LoadingState />
        </ExecutiveLayoutContainer>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={executiveCommandTheme}>
        <ExecutiveGlobalStyles />
        <ExecutiveLayoutContainer>
          <ErrorState />
        </ExecutiveLayoutContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={executiveCommandTheme}>
      <ExecutiveGlobalStyles />
      <ExecutiveLayoutContainer>
        {/* Revolutionary AdminStellarSidebar */}
        <AdminStellarSidebar />
        
        {/* Executive Main Content Area */}
        <ExecutiveMainContent
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          role="main"
          aria-label="Admin dashboard main content"
        >
          <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingState />}>
              <Routes>
                {/* Overview Routes */}
                <Route path="/" element={<Navigate to="/dashboard/default" replace />} />
                <Route path="/default" element={<RevolutionaryAdminDashboard />} />
                <Route 
                  path="/analytics" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <UserAnalyticsPanel />
                    </ExecutivePageContainer>
                  } 
                />
                
                {/* Platform Management Routes */}
                <Route path="/user-management" element={<ModernUserManagementSystem />} />
                <Route 
                  path="/trainers" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <TrainersManagementSection />
                    </ExecutivePageContainer>
                  } 
                />
                <Route 
                  path="/trainers/permissions" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <TrainerPermissionsManager onPermissionChange={() => {/* Optional callback */}} />
                    </ExecutivePageContainer>
                  } 
                />
                <Route 
                  path="/client-trainer-assignments" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <ClientTrainerAssignments onAssignmentChange={() => {/* Optional callback */}} />
                    </ExecutivePageContainer>
                  } 
                />
                <Route path="/client-management" element={<AdminClientProgressView />} />
                <Route path="/admin-sessions" element={<EnhancedAdminSessionsView />} />
                <Route 
                  path="/admin/master-schedule" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <AdminScheduleIntegration />
                    </ExecutivePageContainer>
                  } 
                />
                <Route path="/admin-packages" element={<AdminPackagesView />} />
                <Route 
                  path="/content" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <ContentModerationPanel />
                    </ExecutivePageContainer>
                  } 
                />
                
                {/* Business Intelligence Routes */}
                <Route 
                  path="/revenue" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <RevenueAnalyticsPanel />
                    </ExecutivePageContainer>
                  } 
                />
                <Route 
                  path="/pending-orders" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <PendingOrdersAdminPanel />
                    </ExecutivePageContainer>
                  } 
                />
                <Route 
                  path="/reports" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <PerformanceReportsPanel />
                    </ExecutivePageContainer>
                  } 
                />
                <Route 
                  path="/gamification" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <AdminGamificationView />
                    </ExecutivePageContainer>
                  } 
                />
                <Route 
                  path="/notifications" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <NotificationSettingsList />
                    </ExecutivePageContainer>
                  } 
                />
                
                {/* System Operations Routes */}
                <Route 
                  path="/system-health" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <SystemHealthPanel />
                    </ExecutivePageContainer>
                  } 
                />
                <Route 
                  path="/security" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <SecurityMonitoringPanel />
                    </ExecutivePageContainer>
                  } 
                />
                <Route 
                  path="/mcp-servers" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <MCPManagementPanel />
                    </ExecutivePageContainer>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <AdminSettingsPanel />
                    </ExecutivePageContainer>
                  } 
                />
                
                {/* ============================================= */}
                {/* ENTERPRISE MCP & BUSINESS INTELLIGENCE ROUTES */}
                {/* ============================================= */}
                
                {/* MCP Command Center Route */}
                <Route 
                  path="/mcp-overview" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <MCPServerCommandCenter />
                    </ExecutivePageContainer>
                  } 
                />
                
                {/* Social Media Command Center Route */}
                <Route 
                  path="/social-overview" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <SocialMediaCommandCenter />
                    </ExecutivePageContainer>
                  } 
                />
                
                {/* Business Intelligence Suite Route */}
                <Route 
                  path="/business-intelligence" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <EnterpriseBusinessIntelligenceSuite />
                    </ExecutivePageContainer>
                  } 
                />
                
                {/* Enhanced Admin Features */}
                <Route 
                  path="/social-management" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <AdminSocialManagementView />
                    </ExecutivePageContainer>
                  } 
                />
                
                <Route 
                  path="/nasm-compliance" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <NASMCompliancePanel />
                    </ExecutivePageContainer>
                  } 
                />
                
                {/* === ADMIN EXERCISE COMMAND CENTER ROUTE === */}
                <Route 
                  path="/exercise-management" 
                  element={
                    <ExecutivePageContainer
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <AdminExerciseCommandCenter />
                    </ExecutivePageContainer>
                  } 
                />
                
                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/dashboard/default" replace />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </ExecutiveMainContent>
      </ExecutiveLayoutContainer>
    </ThemeProvider>
  );
};

export default UnifiedAdminDashboardLayout;
