/**
 * WorkoutLogger.loadTodaysPlan
 * ----------------------------
 * Behavior-neutral extraction for the active logger's "Load Today's Plan"
 * flow. Keeps the component shell smaller while preserving the canonical
 * current-plan fallback order.
 */

import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '../../services/api.service';
import type { ExerciseEntry } from '../../services/nasmApiService';
import { getErrorMessage } from './WorkoutLoggerCS';
import type {
  CurrentWorkoutPlanResponse,
  PlannedAssignment,
} from './WorkoutLogger.localTypes';
import {
  currentWorkoutAssignmentMatchesRouteIntent,
  getCurrentWorkoutCursorSession,
  getCurrentWorkoutPlanId,
  getCurrentWorkoutTodayAssignment,
  getCurrentWorkoutTodayAssignmentExercises,
  getPlanDayForDate,
  isCurrentWorkoutAssignmentLoggable,
  plannedExerciseToEntry,
} from './WorkoutLogger.helpers';

interface LoadTodaysPlanIntoLoggerParams {
  effectiveClientId?: number;
  createWorkoutLoggerLocalId: (prefix: string) => string;
  routeAssignmentKey: string | null;
  routeAssignmentType: string | null;
  scheduledSessionId: string | null;
  setExercises: Dispatch<SetStateAction<ExerciseEntry[]>>;
  setIsLoadingPlan: Dispatch<SetStateAction<boolean>>;
  setPlannedAssignment: Dispatch<SetStateAction<PlannedAssignment | null>>;
}

function isMissingCurrentPlanContext(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response;
  const message = response?.data?.message || '';

  return response?.status === 404 && /client not found|workout plan/i.test(message);
}

export async function loadTodaysPlanIntoLogger({
  effectiveClientId,
  createWorkoutLoggerLocalId,
  routeAssignmentKey,
  routeAssignmentType,
  scheduledSessionId,
  setExercises,
  setIsLoadingPlan,
  setPlannedAssignment,
}: LoadTodaysPlanIntoLoggerParams): Promise<void> {
  setIsLoadingPlan(true);
  try {
    const api = new ApiService();
    if (typeof effectiveClientId !== 'number') {
      toast.info('No client context - cannot load a plan');
      setPlannedAssignment(null);
      return;
    }

    const response = await api.get(`/api/workouts/${effectiveClientId}/current`);
    const data = (response?.data ?? response) as CurrentWorkoutPlanResponse;
    const todayAssignment = getCurrentWorkoutTodayAssignment(data);
    const currentPlanId = getCurrentWorkoutPlanId(data);
    if (!currentWorkoutAssignmentMatchesRouteIntent(todayAssignment, {
      assignmentKey: routeAssignmentKey,
      assignmentType: routeAssignmentType,
    })) {
      setPlannedAssignment(null);
      toast.info('Today\'s assignment changed. Open it again from your dashboard before logging.');
      return;
    }

    const canLoadCurrentAssignment = isCurrentWorkoutAssignmentLoggable(todayAssignment, {
      hasScheduledSession: Boolean(scheduledSessionId),
    });
    if (!canLoadCurrentAssignment) {
      const assignmentLabel = todayAssignment?.title || todayAssignment?.dayLabel || 'Today\'s assignment';
      setPlannedAssignment(null);
      toast.info(`${assignmentLabel} is not loggable right now. Review your workout history or plan vault.`);
      return;
    }

    const cursorSession = getCurrentWorkoutCursorSession(data);
    const cursorExercises = Array.isArray(cursorSession?.exercises) ? cursorSession.exercises : [];
    if (cursorSession && cursorExercises.length > 0) {
      const prefilled = cursorExercises.map((exercise) =>
        plannedExerciseToEntry(exercise, () => createWorkoutLoggerLocalId('plan'))
      );
      setExercises(prev => [...prev, ...prefilled]);
      // Persist the cursor session's week/day onto the assignment so the
      // Active Plan Context strip can show them on this load path too; the
      // toast below is transient and these fields would otherwise be lost.
      setPlannedAssignment(todayAssignment && currentPlanId
        ? {
            ...todayAssignment,
            planId: currentPlanId,
            weekNumber: todayAssignment.weekNumber ?? cursorSession.weekNumber ?? null,
            dayLabel: todayAssignment.dayLabel ?? cursorSession.dayLabel ?? null,
            dayNumber: todayAssignment.dayNumber ?? cursorSession.dayNumber ?? null,
            exerciseCount: todayAssignment.exerciseCount ?? prefilled.length,
          }
        : null);
      const weekNum = cursorSession.weekNumber ?? '?';
      const dayLabel = cursorSession.dayLabel || `Day ${cursorSession.dayNumber ?? '?'}`;
      toast.success(`Loaded ${prefilled.length} exercises from Week ${weekNum} — ${dayLabel}`);
      return;
    }

    const assignmentExercises = getCurrentWorkoutTodayAssignmentExercises(data);
    if (canLoadCurrentAssignment && todayAssignment && assignmentExercises.length > 0) {
      const prefilled = assignmentExercises.map((exercise) =>
        plannedExerciseToEntry(exercise, () => createWorkoutLoggerLocalId('assignment'))
      );
      setExercises(prev => [...prev, ...prefilled]);
      setPlannedAssignment(currentPlanId
        ? { ...todayAssignment, planId: currentPlanId }
        : todayAssignment);
      const assignmentLabel = todayAssignment.title || todayAssignment.dayLabel || 'today assignment';
      toast.success(`Loaded ${prefilled.length} exercises from ${assignmentLabel}`);
      return;
    }

    if (!data?.plan?.days?.length) {
      setPlannedAssignment(null);
      toast.info('No active workout plan found for this client');
      return;
    }

    const planDay = getPlanDayForDate(data.plan.days);
    const dayLabel = planDay?.dayName || new Date().toLocaleDateString('en-US', { weekday: 'long' });

    if (!planDay?.exercises?.length) {
      setPlannedAssignment(null);
      toast.info(`No exercises scheduled for ${dayLabel} in the active plan`);
      return;
    }

    const prefilled = planDay.exercises.map((exercise) =>
      plannedExerciseToEntry(exercise, () => createWorkoutLoggerLocalId('plan'))
    );
    setExercises(prev => [...prev, ...prefilled]);
    setPlannedAssignment(null);
    toast.success(`Loaded ${prefilled.length} exercises from ${dayLabel}'s plan`);
  } catch (error: unknown) {
    if (isMissingCurrentPlanContext(error)) {
      setPlannedAssignment(null);
      toast.info('No active workout plan found for this client');
      return;
    }
    console.error('Failed to load today\'s plan:', error);
    toast.error(getErrorMessage(error, 'Could not load today\'s workout plan'));
  } finally {
    setIsLoadingPlan(false);
  }
}
