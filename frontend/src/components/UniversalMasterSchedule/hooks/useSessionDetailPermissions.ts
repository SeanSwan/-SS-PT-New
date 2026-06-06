import { useEffect, useMemo, useState } from 'react';
import {
  getClientSessionSignal,
  isNonDeductingClientSource,
} from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import {
  canSessionBeCompleted,
  canSessionOpenWorkoutLogger,
} from '../SessionDetailModal.logic';
import type {
  SessionDetail,
  SessionDetailModalMode,
} from '../SessionDetailModal.types';

interface UseSessionDetailPermissionsInput {
  open: boolean;
  mode: SessionDetailModalMode;
  session: SessionDetail | null;
}

export const useSessionDetailPermissions = ({
  open,
  mode,
  session,
}: UseSessionDetailPermissionsInput) => {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setCurrentUserId(null);
      return;
    }

    const userString = localStorage.getItem('user');
    if (!userString) {
      setCurrentUserId(null);
      return;
    }

    try {
      const user = JSON.parse(userString);
      setCurrentUserId(user?.id ? Number(user.id) : null);
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      setCurrentUserId(null);
    }
  }, [open]);

  return useMemo(() => {
    const isVisible = Boolean(open && session);
    const isBlocked = Boolean(session?.isBlocked) || session?.status === 'blocked';
    const canManage = mode === 'admin' || mode === 'trainer';
    const canManageSeries = Boolean(
      isVisible && mode === 'admin' && session?.recurringGroupId
    );
    const isNonDeductingClient = isNonDeductingClientSource(session?.clientSource);
    const sessionSignal = getClientSessionSignal({
      clientSource: session?.clientSource,
      availableSessions: session?.clientAvailableSessions,
    });

    const isEarlyCancelEligible = (() => {
      if (!session) {
        return false;
      }

      const sessionTime = new Date(session.sessionDate).getTime();
      const now = Date.now();
      const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
      return hoursUntilSession > 24;
    })();

    const isTrainerAssigned = (() => {
      if (mode !== 'trainer') {
        return true;
      }

      if (!session?.trainerId || !currentUserId) {
        return false;
      }

      return session.trainerId === currentUserId;
    })();

    const canComplete = Boolean(
      isVisible
      && canManage
      && isTrainerAssigned
      && !isBlocked
      && canSessionBeCompleted(session)
    );

    const canCancel = Boolean(
      isVisible
      && !isBlocked
      && session?.status !== 'completed'
      && session?.status !== 'cancelled'
      && (canManage || (mode === 'client' && session?.userId === currentUserId))
    );

    const canRecordAttendance = Boolean(
      isVisible
      && canManage
      && isTrainerAssigned
      && !isBlocked
      && !session?.attendanceStatus
      && (session?.status === 'scheduled' || session?.status === 'confirmed')
    );
    const canViewWorkouts = Boolean(
      isVisible
      && Number.isSafeInteger(Number(session?.userId))
      && Number(session?.userId) > 0
    );
    const canOpenWorkoutLogger = Boolean(
      isVisible
      && canManage
      && isTrainerAssigned
      && canSessionOpenWorkoutLogger(session)
    );

    return {
      currentUserId,
      isBlocked,
      canManage,
      canManageSeries,
      isNonDeductingClient,
      sessionSignal,
      isEarlyCancelEligible,
      isTrainerAssigned,
      canComplete,
      canCancel,
      canRecordAttendance,
      hasAttendanceRecorded: Boolean(session?.attendanceStatus),
      canOpenWorkoutLogger,
      canViewWorkouts,
    };
  }, [currentUserId, mode, open, session]);
};
