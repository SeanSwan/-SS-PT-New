import React, { Suspense } from 'react';
import { type NavigateFunction } from 'react-router-dom';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { ThemeProvider } from 'styled-components';
import { X } from 'lucide-react';
import { GlobalClientProvider } from '../../context/GlobalClientContext';
import DashboardTeachMeGuide from '../Shared/DashboardTeachMeGuide';
import ViewAsBanner from './components/ViewAsBanner';
import { MobileBackBtn } from './UniversalDashboardLayout.controls';
import type { DashboardRouteDefinition } from './UniversalDashboardLayout.routes';
import {
  DashboardRoutes,
  ErrorState,
  LoadingState,
  RoleSidebar,
} from './UniversalDashboardLayout.shellPieces';
import {
  MobileDashboardSafeArea,
  UniversalGlobalStyles,
  UniversalLayoutContainer,
  UniversalMainContent,
} from './UniversalDashboardLayout.styles';
import { createUniversalDashboardTheme } from './UniversalDashboardLayout.theme';


interface UniversalDashboardLayoutShellProps {
  activeRole: string;
  userRole: string;
  userClientSource?: string | null;
  isLoading: boolean;
  error: string | null;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  locationPathname: string;
  visibleRoleRoutes: DashboardRouteDefinition[];
  dashboardDefaultPath: string;
  mainContentRef: React.RefObject<HTMLElement>;
  navigate: NavigateFunction;
  onToggleCollapse: () => void;
  onToggleMobile: () => void;
  onRetryInitialization: () => void;
  onLogout: () => void;
  onTeachMeCoachPrompt: (prompt: string) => void;
}

export const UniversalDashboardLayoutShell: React.FC<UniversalDashboardLayoutShellProps> = ({
  activeRole,
  userRole,
  userClientSource,
  isLoading,
  error,
  sidebarCollapsed,
  mobileSidebarOpen,
  locationPathname,
  visibleRoleRoutes,
  dashboardDefaultPath,
  mainContentRef,
  navigate,
  onToggleCollapse,
  onToggleMobile,
  onRetryInitialization,
  onLogout,
  onTeachMeCoachPrompt,
}) => {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const isCoachAssistantRoute = /\/coach-assistant(?:\/|$)/.test(locationPathname);
  const themedShell = (content: React.ReactNode) => (
    <ThemeProvider theme={(parentTheme) => createUniversalDashboardTheme(activeRole, parentTheme)}>
      <UniversalGlobalStyles />
      <UniversalLayoutContainer>{content}</UniversalLayoutContainer>
    </ThemeProvider>
  );

  if (isLoading) {
    return themedShell(<LoadingState activeRole={activeRole} />);
  }

  if (error) {
    return themedShell(
      <ErrorState
        error={error}
        onRetryInitialization={onRetryInitialization}
        onLogout={onLogout}
      />
    );
  }

  return (
    <GlobalClientProvider>
      {themedShell(
        <>
          <RoleSidebar
            activeRole={activeRole}
            userClientSource={userClientSource}
            sidebarCollapsed={sidebarCollapsed}
            mobileSidebarOpen={mobileSidebarOpen}
            onToggleCollapse={onToggleCollapse}
            onToggleMobile={onToggleMobile}
          />
          <MobileDashboardSafeArea data-swan-mobile-dashboard-safe-area aria-hidden="true" />
          {!locationPathname.endsWith('/overview') && (
            <MobileBackBtn
              type="button"
              onClick={() => navigate(`/dashboard/${activeRole}/overview`)}
              aria-label="Back to dashboard overview"
              title="Back to overview"
            >
              <X size={20} aria-hidden="true" focusable="false" />
            </MobileBackBtn>
          )}
          <UniversalMainContent
            ref={mainContentRef}
            data-dashboard-scroll-root
            $sidebarCollapsed={sidebarCollapsed}
            initial={prefersReducedMotion ? false : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
          >
            {userRole === 'admin' && (activeRole === 'trainer' || activeRole === 'client') && (
              <ViewAsBanner activeRole={activeRole} />
            )}
            {!isCoachAssistantRoute && (
              <DashboardTeachMeGuide
                role={activeRole}
                pathname={locationPathname}
                onNavigate={navigate}
                onAskCoach={onTeachMeCoachPrompt}
              />
            )}
            <AnimatePresence mode="wait">
              <Suspense fallback={<LoadingState activeRole={activeRole} />}>
                <DashboardRoutes
                  activeRole={activeRole}
                  visibleRoleRoutes={visibleRoleRoutes}
                  dashboardDefaultPath={dashboardDefaultPath}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </Suspense>
            </AnimatePresence>
          </UniversalMainContent>
        </>
      )}
    </GlobalClientProvider>
  );
};
