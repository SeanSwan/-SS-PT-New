/**
 * ============================================================================
 * FILE: ClientCurrentWorkoutCard.actions.ts
 * PURPOSE: Route-action builder for the client dashboard current-workout card.
 * ============================================================================
 * Keeps action selection isolated from the card presentation model so completed
 * assignments, trainer-led sessions, and loggable homework keep distinct routes.
 */

import type { CurrentClientWorkout } from './useCurrentClientWorkout';

export interface ClientCurrentWorkoutAction {
  label: string;
  ariaLabel: string;
  path: string;
}

const CLIENT_LOG_WORKOUT_PATH = '/dashboard/client/log-workout';
const CLIENT_SCHEDULE_PATH = '/dashboard/client/schedule';
const CLIENT_WORKOUTS_PATH = '/dashboard/client/workouts';

const LOGGABLE_LABELS: Record<string, string> = {
  trainer_session: 'Log Workout',
};

const lookupLabel = (
  labels: Record<string, string>,
  key: string | undefined,
  fallback: string,
): string => (key ? labels[key] || fallback : fallback);

const withFallback = (value: string, fallback: string): string => (
  value.length > 0 ? value : fallback
);

const appendOptionalParam = (
  params: URLSearchParams,
  key: string,
  value?: string,
): void => {
  if (value) params.set(key, value);
};

const logWorkoutPath = (workout: CurrentClientWorkout): string => {
  const params = new URLSearchParams({ loadPlan: 'today' });
  appendOptionalParam(params, 'assignmentKey', workout.assignmentKey);
  appendOptionalParam(params, 'assignmentType', workout.assignmentType);
  return `${CLIENT_LOG_WORKOUT_PATH}?${params.toString()}`;
};

const isTrainerScheduleOnly = (workout?: CurrentClientWorkout | null): boolean => (
  Boolean(workout?.assignmentType === 'trainer_session' && !workout.isLoggable)
);

const scheduleAction = (): ClientCurrentWorkoutAction => ({
  label: 'View Schedule',
  ariaLabel: 'View schedule for trainer-led session',
  path: CLIENT_SCHEDULE_PATH,
});

const workoutCtaLabel = (workout?: CurrentClientWorkout | null): string => (
  workout?.ctaLabel || ''
);

const reviewAction = (workout?: CurrentClientWorkout | null): ClientCurrentWorkoutAction => ({
  label: withFallback(workoutCtaLabel(workout), 'View Plan'),
  ariaLabel: withFallback(workoutCtaLabel(workout), 'View training plan'),
  path: CLIENT_WORKOUTS_PATH,
});

const historyAction = (): ClientCurrentWorkoutAction => ({
  label: 'Review Workout History',
  ariaLabel: 'Review completed workout history',
  path: CLIENT_WORKOUTS_PATH,
});

const logAction = (workout: CurrentClientWorkout): ClientCurrentWorkoutAction => ({
  label: workout.ctaLabel || lookupLabel(LOGGABLE_LABELS, workout.assignmentType, 'Log Assignment'),
  ariaLabel: 'Log today\'s assignment',
  path: logWorkoutPath(workout),
});

const isCompletedAssignment = (workout?: CurrentClientWorkout | null): boolean => (
  workout?.assignmentStatus === 'completed'
);

export const buildCurrentWorkoutAction = (
  workout?: CurrentClientWorkout | null,
): ClientCurrentWorkoutAction => {
  if (isTrainerScheduleOnly(workout)) return scheduleAction();
  if (isCompletedAssignment(workout)) return historyAction();
  if (!workout?.isLoggable) return reviewAction(workout);
  return logAction(workout);
};
