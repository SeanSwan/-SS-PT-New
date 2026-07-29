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
  PlanAssignmentPickerItem,
  PlannedAssignment,
} from './WorkoutLogger.localTypes';
import type { WorkoutLoggerPlanLoadOutcome } from './WorkoutLoggerEmptyPlanState';
import {
  currentWorkoutAssignmentMatchesRouteIntent,
  getCurrentWorkoutCursorSession,
  getCurrentWorkoutPlanId,
  getCurrentWorkoutTodayAssignment,
  getCurrentWorkoutTodayAssignmentExercises,
  getPlanDayForDate,
  isCurrentWorkoutAssignmentLoggable,
  planAssignmentPickerItemToContext,
  planAssignmentPickerItemToEntries,
  planAssignmentPickerItemToSubmitAssignment,
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
  setPlanLoadOutcome?: (outcome: WorkoutLoggerPlanLoadOutcome | null) => void;
  setLoadedPlanContext?: Dispatch<SetStateAction<PlannedAssignment | null>>;
  setPlannedAssignment: Dispatch<SetStateAction<PlannedAssignment | null>>;
}

function isMissingCurrentPlanContext(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response;
  const message = response?.data?.message || '';

  return response?.status === 404 && /client not found|workout plan/i.test(message);
}

function routeAssignmentKey(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function routeAssignmentTypeIntent(value: string | null, scheduledSessionId: string | null): string | null {
  if (scheduledSessionId) return 'trainer_session';
  const trimmed = value?.trim();
  return trimmed || null;
}

function currentAssignmentPicker(data: CurrentWorkoutPlanResponse): PlanAssignmentPickerItem[] {
  const picker = data?.assignmentPicker
    ?? data?.data?.assignmentPicker
    ?? data?.plan?.assignmentPicker
    ?? [];
  return Array.isArray(picker) ? picker : [];
}

function isPendingCurrentAssignment(assignment: PlannedAssignment | null): boolean {
  const assignmentType = assignment?.assignmentType?.trim().toLowerCase() ?? null;
  const status = assignment?.status?.trim().toLowerCase() ?? null;
  return assignmentType === 'none' || status === 'none';
}

function routeAssignmentPickerMatch(
  data: CurrentWorkoutPlanResponse,
  intent: { assignmentKey: string | null; assignmentType: string | null },
): PlanAssignmentPickerItem | null {
  if (!routeAssignmentKey(intent.assignmentKey)) return null;
  return currentAssignmentPicker(data).find((assignment) => (
    currentWorkoutAssignmentMatchesRouteIntent(assignment, intent)
  )) ?? null;
}

function pickerAssignmentLabel(assignment: PlanAssignmentPickerItem): string {
  return assignment.title || assignment.dayLabel || assignment.planTitle || 'generated plan day';
}

function loadPickerAssignmentIntoLogger({
  assignment,
  createWorkoutLoggerLocalId,
  setExercises,
  setLoadedPlanContext,
  setPlannedAssignment,
}: {
  assignment: PlanAssignmentPickerItem;
  createWorkoutLoggerLocalId: (prefix: string) => string;
  setExercises: Dispatch<SetStateAction<ExerciseEntry[]>>;
  setLoadedPlanContext?: Dispatch<SetStateAction<PlannedAssignment | null>>;
  setPlannedAssignment: Dispatch<SetStateAction<PlannedAssignment | null>>;
}): void {
  const context = planAssignmentPickerItemToContext(assignment);
  setLoadedPlanContext?.(context);

  if (assignment.isLoadable === false) {
    setPlannedAssignment(null);
    toast.info('That generated day is not loadable.');
    return;
  }

  const prefilled = planAssignmentPickerItemToEntries(assignment, createWorkoutLoggerLocalId);
  if (prefilled.length === 0) {
    setPlannedAssignment(null);
    toast.info('That generated plan day has no exercises to load.');
    return;
  }

  const submitAssignment = planAssignmentPickerItemToSubmitAssignment(assignment);
  setExercises(prev => [...prev, ...prefilled]);
  setPlannedAssignment(submitAssignment);

  const label = pickerAssignmentLabel(assignment);
  toast.success(
    `Loaded ${prefilled.length} exercise${prefilled.length === 1 ? '' : 's'} from ${label}${submitAssignment ? '' : ' as a draft'}.`,
  );
}

export async function loadTodaysPlanIntoLogger({
  setPlanLoadOutcome,
  effectiveClientId,
  createWorkoutLoggerLocalId,
  routeAssignmentKey: routeAssignmentKeyParam,
  routeAssignmentType,
  scheduledSessionId,
  setExercises,
  setIsLoadingPlan,
  setLoadedPlanContext,
  setPlannedAssignment,
}: LoadTodaysPlanIntoLoggerParams): Promise<void> {
  setIsLoadingPlan(true);
  try {
    const api = new ApiService();
    if (typeof effectiveClientId !== 'number') {
      toast.info('No client context - cannot load a plan');
      setPlanLoadOutcome?.({ kind: 'no_client', message: 'Pick a client to load their plan.' });
      setPlannedAssignment(null);
      setLoadedPlanContext?.(null);
      return;
    }

    const response = await api.get(`/api/workouts/${effectiveClientId}/current`);
    const data = (response?.data ?? response) as CurrentWorkoutPlanResponse;
    const todayAssignment = getCurrentWorkoutTodayAssignment(data);
    const currentPlanId = getCurrentWorkoutPlanId(data);
    const routeIntent = {
      assignmentKey: routeAssignmentKeyParam,
      assignmentType: routeAssignmentTypeIntent(routeAssignmentType, scheduledSessionId),
    };
    if (!currentWorkoutAssignmentMatchesRouteIntent(todayAssignment, routeIntent)) {
      const pickerMatch = routeAssignmentPickerMatch(data, routeIntent);
      if (pickerMatch) {
        loadPickerAssignmentIntoLogger({
          assignment: pickerMatch,
          createWorkoutLoggerLocalId,
          setExercises,
          setLoadedPlanContext,
          setPlannedAssignment,
        });
        return;
      }

      setPlannedAssignment(null);
      setLoadedPlanContext?.(null);
      toast.info('Today\'s assignment changed. Open it again from your dashboard before logging.');
      setPlanLoadOutcome?.({ kind: 'assignment_changed', message: 'Open it again from your dashboard before logging.' });
      return;
    }

    if (!currentPlanId && isPendingCurrentAssignment(todayAssignment)) {
      setPlannedAssignment(null);
      setLoadedPlanContext?.(null);
      toast.info('No active workout plan found for this training profile');
      setPlanLoadOutcome?.({ kind: 'no_plan', message: 'Your trainer has not assigned a plan to this profile yet.' });
      return;
    }

    const canLoadCurrentAssignment = isCurrentWorkoutAssignmentLoggable(todayAssignment, {
      hasScheduledSession: Boolean(scheduledSessionId),
    });
    if (!canLoadCurrentAssignment) {
      const assignmentLabel = todayAssignment?.title || todayAssignment?.dayLabel || 'Today\'s assignment';
      setPlannedAssignment(null);
      setLoadedPlanContext?.(null);
      toast.info(`${assignmentLabel} is not loggable right now. Review your workout history or plan vault.`);
      setPlanLoadOutcome?.({ kind: 'not_loggable', message: 'Review your workout history or plan vault.' });
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
      setLoadedPlanContext?.(null);
      toast.info('No active workout plan found for this training profile');
      setPlanLoadOutcome?.({ kind: 'no_plan', message: 'Your trainer has not assigned a plan to this profile yet.' });
      return;
    }

    const planDay = getPlanDayForDate(data.plan.days);
    const dayLabel = planDay?.dayName || new Date().toLocaleDateString('en-US', { weekday: 'long' });

    if (!planDay?.exercises?.length) {
      setPlannedAssignment(null);
      setLoadedPlanContext?.(null);
      toast.info(`No exercises scheduled for ${dayLabel} in the active plan`);
      setPlanLoadOutcome?.({ kind: 'no_exercises_today', message: 'Your plan has a rest day here.' });
      return;
    }

    const prefilled = planDay.exercises.map((exercise) =>
      plannedExerciseToEntry(exercise, () => createWorkoutLoggerLocalId('plan'))
    );
    const firstExercise = planDay.exercises[0] ?? null;
    setExercises(prev => [...prev, ...prefilled]);
    setPlannedAssignment(null);
    setLoadedPlanContext?.({
      assignmentId: null,
      assignmentKey: null,
      planId: getCurrentWorkoutPlanId(data),
      assignmentType: null,
      source: 'workout_plan',
      isLoggable: true,
      isBillable: false,
      shouldDeductSession: false,
      status: null,
      title: `${dayLabel}'s plan`,
      dayLabel,
      exerciseCount: prefilled.length,
      firstExerciseName: firstExercise?.exerciseName || firstExercise?.name || null,
      exercises: planDay.exercises,
    });
    toast.success(`Loaded ${prefilled.length} exercises from ${dayLabel}'s plan`);
  } catch (error: unknown) {
    if (isMissingCurrentPlanContext(error)) {
      setPlannedAssignment(null);
      setLoadedPlanContext?.(null);
      toast.info('No active workout plan found for this training profile');
      setPlanLoadOutcome?.({ kind: 'no_plan', message: 'Your trainer has not assigned a plan to this profile yet.' });
      return;
    }
    console.error('Failed to load today\'s plan:', error);
    toast.error(getErrorMessage(error, 'Could not load today\'s workout plan'));
  } finally {
    setIsLoadingPlan(false);
  }
}
