import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminStellarSidebar from './Pages/admin-dashboard/AdminStellarSidebar';
import TrainerStellarSidebar from './Pages/trainer-dashboard/TrainerStellarSidebar';
import ClientStellarSidebar from './Pages/client-dashboard/ClientStellarSidebar';
import { UniversalButton } from './UniversalDashboardLayout.controls';
import TabErrorBoundary from './TabErrorBoundary';
import type { DashboardRouteDefinition } from './UniversalDashboardLayout.routes';
import {
  ErrorActions,
  ErrorIcon,
  LoadingText,
  LoadingTitle,
  UniversalErrorContainer,
  UniversalLoadingContainer,
  UniversalLoadingSpinner,
  UniversalPageContainer,
} from './UniversalDashboardLayout.styles';

export const LoadingState: React.FC<{ activeRole: string }> = ({ activeRole }) => (
  <UniversalLoadingContainer role="status" aria-live="polite">
    <UniversalLoadingSpinner />
    <LoadingTitle>
      Initializing Dashboard...
    </LoadingTitle>
    <LoadingText>
      Loading {activeRole} interface
    </LoadingText>
  </UniversalLoadingContainer>
);

export const ErrorState: React.FC<{
  error: string | null;
  onRetryInitialization: () => void;
  onLogout: () => void;
}> = ({ error, onRetryInitialization, onLogout }) => (
  <UniversalErrorContainer role="alert" aria-live="assertive">
    <ErrorIcon aria-hidden="true">!</ErrorIcon>
    <h2>Dashboard Access Error</h2>
    <p>{error}</p>
    <ErrorActions>
      <UniversalButton
        type="button"
        onClick={onRetryInitialization}
      >
        Retry
      </UniversalButton>
      <UniversalButton
        type="button"
        onClick={onLogout}
        $variant="danger"
      >
        Logout
      </UniversalButton>
    </ErrorActions>
  </UniversalErrorContainer>
);

export const RoleSidebar: React.FC<{
  activeRole: string;
  userClientSource?: string | null;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  onToggleCollapse: () => void;
  onToggleMobile: () => void;
}> = ({ activeRole, userClientSource, sidebarCollapsed, mobileSidebarOpen, onToggleCollapse, onToggleMobile }) => {
  const sidebarProps = {
    isCollapsed: sidebarCollapsed,
    onToggleCollapse,
    isMobileOpen: mobileSidebarOpen,
    onToggleMobile,
  };

  switch (activeRole) {
    case 'admin':
      return <AdminStellarSidebar {...sidebarProps} />;
    case 'trainer':
      return <TrainerStellarSidebar {...sidebarProps} />;
    case 'client':
      return <ClientStellarSidebar {...sidebarProps} clientSource={userClientSource} />;
    default:
      return <ClientStellarSidebar {...sidebarProps} clientSource={userClientSource} />;
  }
};

export const DashboardRoutes: React.FC<{
  activeRole: string;
  visibleRoleRoutes: DashboardRouteDefinition[];
  dashboardDefaultPath: string;
  prefersReducedMotion: boolean;
}> = ({ activeRole, visibleRoleRoutes, dashboardDefaultPath, prefersReducedMotion }) => (
  <Routes>
    <Route path="/" element={<Navigate to={`/dashboard/${activeRole}${dashboardDefaultPath}`} replace />} />
    <Route path={`/${activeRole}/*`} element={(
      <Routes>
        {visibleRoleRoutes.map(({ path, component: Component, title }) => (
          <Route
            key={path}
            path={path.replace(/^\//, '')}
            element={(
              <UniversalPageContainer
                data-dashboard-scroll-root
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6 }}
              >
                <TabErrorBoundary tabLabel={title}>
                  <Component />
                </TabErrorBoundary>
              </UniversalPageContainer>
            )}
          />
        ))}
        <Route path="*" element={<Navigate to={`/dashboard/${activeRole}${dashboardDefaultPath}`} replace />} />
      </Routes>
    )} />
    <Route path="*" element={<Navigate to={`/dashboard/${activeRole}${dashboardDefaultPath}`} replace />} />
  </Routes>
);
