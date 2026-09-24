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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch } from '../../redux/hooks';
import { useStyleLensAppearance } from '../../core/style-lens-os';
import { 
  fetchEvents, 
  setUserContext,
} from '../../redux/slices/scheduleSlice';
import { scheduleDashboardRouteScrollReset } from './DashboardRouteScroll';
import {
  dashboardDiagnosticMeta,
  reportDashboardDiagnostic,
} from './UniversalDashboardLayout.logic';
import { roleConfigurations } from './UniversalDashboardLayout.routes';
import { UniversalDashboardLayoutShell } from './UniversalDashboardLayout.shell';
import { isNonDeductingClientSource } from './workspaces/clients-team/clientSessionSignal';
import { CoachSessionDraftProvider } from './Pages/coach-assistant/CoachSessionDraftContext';

// === MAIN COMPONENT ===
interface UniversalDashboardLayoutProps {}

const UniversalDashboardLayout: React.FC<UniversalDashboardLayoutProps> = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  const { setPersistenceSuppressed } = useStyleLensAppearance();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryInitNonce, setRetryInitNonce] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  // Determine user role and validate access
  // Normalize 'user' -> 'client' since DB default role is 'user' but dashboard treats them as clients
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

  const isAdministratorViewAs =
    userRole === 'admin' &&
    (activeRole === 'trainer' || activeRole === 'client');

  useEffect(() => {
    setPersistenceSuppressed(isAdministratorViewAs);

    return () => {
      setPersistenceSuppressed(false);
    };
  }, [isAdministratorViewAs, setPersistenceSuppressed]);

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
          reportDashboardDiagnostic(
            dashboardDiagnosticMeta(
              'schedule_prefetch_failed',
              'Dashboard schedule prefetch failed.',
              err
            )
          );
        });

        setError(null);
      } catch (err) {
        reportDashboardDiagnostic(
          dashboardDiagnosticMeta(
            'dashboard_initialization_failed',
            'Dashboard initialization failed.',
            err
          )
        );
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

  // Get role configuration
  const roleConfig = roleConfigurations[activeRole] || roleConfigurations.client;
  const canBookSwanStudiosSessions =
    userRole !== 'client' ||
    activeRole !== 'client' ||
    !isNonDeductingClientSource(user?.clientSource);
  const visibleRoleRoutes = canBookSwanStudiosSessions
    ? roleConfig.routes
    : roleConfig.routes.filter(({ path }) => path !== '/schedule');
  const dashboardDefaultPath =
    !canBookSwanStudiosSessions && roleConfig.defaultPath === '/schedule'
      ? '/overview'
      : roleConfig.defaultPath;
  const handleTeachMeCoachPrompt = useCallback((prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    const params = new URLSearchParams({ teachPrompt: trimmedPrompt });
    navigate(`/dashboard/${activeRole}/coach-assistant?${params.toString()}`);
  }, [activeRole, navigate]);
  return (
    <CoachSessionDraftProvider actorId={user?.id} actorRole={rawRole}>
      <UniversalDashboardLayoutShell
      activeRole={activeRole}
      userRole={userRole}
      userClientSource={user?.clientSource}
      isLoading={isLoading}
      error={error}
      sidebarCollapsed={sidebarCollapsed}
      mobileSidebarOpen={mobileSidebarOpen}
      locationPathname={location.pathname}
      visibleRoleRoutes={visibleRoleRoutes}
      dashboardDefaultPath={dashboardDefaultPath}
      mainContentRef={mainContentRef}
      navigate={navigate}
      onToggleCollapse={handleToggleCollapse}
      onToggleMobile={handleToggleMobile}
      onRetryInitialization={handleRetryInitialization}
      onLogout={handleLogout}
      onTeachMeCoachPrompt={handleTeachMeCoachPrompt}
      />
    </CoachSessionDraftProvider>
  );
};

export default UniversalDashboardLayout;
