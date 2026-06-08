import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionDetail, SessionDetailModalMode } from '../SessionDetailModal.types';
import {
  buildScheduleCoachRoute,
  buildScheduleWorkoutLoggerRoute,
  buildScheduleWorkoutsRoute,
} from '../SessionDetailModal.logic';

interface SessionDetailNavigationOptions {
  mode: SessionDetailModalMode;
  session: SessionDetail | null;
  onClose: () => void;
}

export function useSessionDetailNavigation({
  mode,
  session,
  onClose,
}: SessionDetailNavigationOptions) {
  const navigate = useNavigate();
  const openRoute = useCallback((routeBuilder: (mode: SessionDetailModalMode, session: SessionDetail) => string) => {
    if (!session) return;
    onClose();
    navigate(routeBuilder(mode, session));
  }, [mode, navigate, onClose, session]);

  return {
    openCoachLogger: () => openRoute(buildScheduleCoachRoute),
    openWorkoutLogger: () => openRoute(buildScheduleWorkoutLoggerRoute),
    viewWorkouts: () => openRoute(buildScheduleWorkoutsRoute),
  };
}
