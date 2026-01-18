import React from 'react';
import { useAuth } from '../../context/AuthContext';
import UniversalMasterSchedule from '../UniversalMasterSchedule/UniversalMasterSchedule';

type ScheduleMode = 'admin' | 'trainer' | 'client';

interface UniversalScheduleProps {
  mode?: ScheduleMode;
}

const UniversalSchedule: React.FC<UniversalScheduleProps> = ({ mode }) => {
  const { user, isAuthenticated } = useAuth();
  const resolvedMode: ScheduleMode | null = mode
    || (user?.role === 'trainer'
      ? 'trainer'
      : user?.role === 'client'
        ? 'client'
        : user?.role === 'admin'
          ? 'admin'
          : null);

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
