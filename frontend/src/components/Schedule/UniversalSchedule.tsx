import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import UniversalMasterSchedule from '../UniversalMasterSchedule/UniversalMasterSchedule';

type ScheduleMode = 'admin' | 'trainer' | 'client';

interface UniversalScheduleProps {
  mode?: ScheduleMode;
}

const VALID_SCHEDULE_MODES: ScheduleMode[] = ['admin', 'trainer', 'client'];

const normalizeAuthRole = (role?: string | null): ScheduleMode | null => {
  if (role === 'user') {
    return 'client';
  }

  return VALID_SCHEDULE_MODES.includes(role as ScheduleMode)
    ? role as ScheduleMode
    : null;
};

const getDashboardModeFromPath = (pathname: string): ScheduleMode | null => {
  const segments = pathname.split('/').filter(Boolean);
  const dashboardIndex = segments.indexOf('dashboard');
  const urlRole = dashboardIndex >= 0 ? segments[dashboardIndex + 1] : null;

  return VALID_SCHEDULE_MODES.includes(urlRole as ScheduleMode)
    ? urlRole as ScheduleMode
    : null;
};

const canUseDashboardMode = (authRole: ScheduleMode | null, dashboardMode: ScheduleMode | null) => {
  if (!authRole || !dashboardMode) {
    return false;
  }

  return authRole === 'admin'
    || dashboardMode === authRole
    || (authRole === 'trainer' && dashboardMode === 'client');
};

const UniversalSchedule: React.FC<UniversalScheduleProps> = ({ mode }) => {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const authRole = normalizeAuthRole(user?.role);
  const dashboardMode = getDashboardModeFromPath(pathname);
  const resolvedMode: ScheduleMode | null = mode
    || (canUseDashboardMode(authRole, dashboardMode) ? dashboardMode : authRole);

  if (!isAuthenticated) {
    return <div>Schedule access requires login.</div>;
  }

  if (!resolvedMode) {
    return <div>Schedule access requires a paid or authorized role.</div>;
  }

  return (
    <UniversalMasterSchedule
      mode={resolvedMode}
      userId={user?.id}
    />
  );
};

export default UniversalSchedule;
