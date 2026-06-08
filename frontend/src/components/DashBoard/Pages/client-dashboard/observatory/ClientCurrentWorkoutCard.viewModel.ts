/**
 * ============================================================================
 * FILE: ClientCurrentWorkoutCard.viewModel.ts
 * PURPOSE: Presentation model for the client dashboard current-workout card.
 * ============================================================================
 * Converts the read-only current-workout API model into card copy, route
 * targets, and homework-history rows while preserving trainer-session and
 * off-day homework semantics.
 */

import {
  formatHomeworkCompletionDate,
  formatHomeworkCompletionExerciseLabel,
  formatHomeworkCompletionPosition,
} from '../../../shared/client-training/clientHomeworkSummary';
import type { CurrentClientWorkout } from './useCurrentClientWorkout';
interface BuildClientCurrentWorkoutViewModelOptions {
  workout?: CurrentClientWorkout | null;
  error?: boolean;
  loading?: boolean;
}
export interface ClientCurrentWorkoutRow {
  label: string;
  value: string;
}

export interface ClientCurrentWorkoutViewModel {
  kicker: string;
  title: string;
  action: {
    label: string;
    ariaLabel: string;
    path: string;
  };
  rows: ClientCurrentWorkoutRow[];
  detail: string;
}

type ClientCurrentWorkoutAction = ClientCurrentWorkoutViewModel['action'];
type CurrentClientHomeworkSummary = NonNullable<CurrentClientWorkout['homeworkSummary']>;

const CLIENT_LOG_WORKOUT_PATH = '/dashboard/client/log-workout';
const CLIENT_SCHEDULE_PATH = '/dashboard/client/schedule';
const CLIENT_WORKOUTS_PATH = '/dashboard/client/workouts';

const ASSIGNMENT_LABELS: Record<string, string> = {
  none: 'Plan Pending',
  trainer_session: 'Trainer Session',
  homework: 'Coach Homework',
  active_recovery: 'Active Recovery',
  rest: 'Rest Day',
  assessment: 'Assessment',
};

const KICKER_LABELS: Record<string, string> = {
  trainer_session: 'Trainer Session',
  homework: 'Suggested Off-Day Workout',
  rest: 'Recovery Day',
};

const STATUS_DETAILS: Record<string, string> = {
  completed: 'Completed today - review your workout history and progress.',
};

const TYPE_DETAILS: Record<string, string> = {
  rest: 'Recovery guidance is visible in your main plan today.',
  trainer_session: 'Trainer-led sessions are logged by your coach from the schedule so progress and paid-session credits stay tied to the appointment.',
};

const HOMEWORK_STATUS_LABELS: Record<string, string> = {
  completed: 'Off-day logs - completed today',
  ready: 'Off-day logs - ready',
  default: 'Off-day logs',
};

const LOGGABLE_LABELS: Record<string, string> = {
  trainer_session: 'Log Workout',
};

const lookupLabel = (
  labels: Record<string, string>,
  key: string | undefined,
  fallback: string,
): string => (key ? labels[key] || fallback : fallback);

const firstFilled = (values: string[]): string => (
  values.find((value) => value.length > 0) || ''
);

const withFallback = (value: string, fallback: string): string => (
  value.length > 0 ? value : fallback
);

const exerciseCountLabel = (count: number) => (
  `${count} exercise${count === 1 ? '' : 's'}`
);

const planPositionPart = (workout: CurrentClientWorkout): string => (
  workout.primaryPlanLabel ? `${workout.primaryPlanLabel} Primary` : ''
);

const weekPositionPart = (workout: CurrentClientWorkout): string => (
  workout.weekNumber ? `Week ${workout.weekNumber}` : ''
);

const dayPositionPart = (workout: CurrentClientWorkout): string => (
  workout.dayNumber ? `Day ${workout.dayNumber}` : ''
);

const dayLabelPositionPart = (workout: CurrentClientWorkout): string => (
  workout.dayLabel || ''
);

const workoutPositionParts = (workout: CurrentClientWorkout): string[] => (
  [
    planPositionPart(workout),
    weekPositionPart(workout),
    dayPositionPart(workout),
    dayLabelPositionPart(workout),
  ].filter((part) => part.length > 0)
);

const workoutPosition = (workout?: CurrentClientWorkout | null): string => {
  if (!workout) return '6 Month plan pending';
  return workoutPositionParts(workout).join(' - ') || 'Ready now';
};

const assignmentLabel = (type?: string): string => (
  lookupLabel(ASSIGNMENT_LABELS, type, 'Coach Homework')
);

const sectionKickerLabel = (workout?: CurrentClientWorkout | null): string => (
  lookupLabel(KICKER_LABELS, workout?.assignmentType, 'Today\'s Assignment')
);

const exerciseStartSuffix = (workout: CurrentClientWorkout): string => (
  workout.firstExercise ? ` - starts with ${workout.firstExercise}` : ''
);

const exerciseDetail = (workout: CurrentClientWorkout): string => (
  `${exerciseCountLabel(workout.exerciseCount)}${exerciseStartSuffix(workout)}`
);

const homeworkDetail = (workout: CurrentClientWorkout): string => (
  `Today's assignment - off-day plan work - ${exerciseDetail(workout)}. No paid session deduction.`
);

const statusDetail = (workout: CurrentClientWorkout): string => (
  lookupLabel(STATUS_DETAILS, workout.assignmentStatus, '')
);

const typeDetail = (workout: CurrentClientWorkout): string => (
  lookupLabel(TYPE_DETAILS, workout.assignmentType, '')
);

const emptyExerciseDetail = (workout: CurrentClientWorkout): string => (
  workout.exerciseCount <= 0 ? 'Open your plan vault to review the next training block.' : ''
);

const exerciseAssignmentDetail = (workout: CurrentClientWorkout): string => (
  workout.assignmentType === 'homework' ? homeworkDetail(workout) : exerciseDetail(workout)
);

const currentWorkoutDetail = (workout: CurrentClientWorkout): string => (
  firstFilled([
    statusDetail(workout),
    typeDetail(workout),
    emptyExerciseDetail(workout),
    exerciseAssignmentDetail(workout),
  ])
);

const workoutDetail = (workout?: CurrentClientWorkout | null, error?: boolean): string => {
  if (error) return 'Refresh this page or open the workout logger directly.';
  if (!workout) return 'Your trainer will assign the default 6 Month plan after assessment.';
  return currentWorkoutDetail(workout);
};

const workoutTitle = (
  workout?: CurrentClientWorkout | null,
  error?: boolean,
  loading?: boolean,
): string => {
  if (loading) return 'Loading plan';
  if (workout) return workout.title;
  return error ? 'Assignment unavailable' : 'Plan pending';
};

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

const logAction = (workout: CurrentClientWorkout): ClientCurrentWorkoutAction => ({
  label: workout.ctaLabel || lookupLabel(LOGGABLE_LABELS, workout.assignmentType, 'Log Assignment'),
  ariaLabel: 'Log today\'s assignment',
  path: logWorkoutPath(workout),
});

const workoutAction = (workout?: CurrentClientWorkout | null): ClientCurrentWorkoutAction => {
  if (isTrainerScheduleOnly(workout)) return scheduleAction();
  if (!workout?.isLoggable) return reviewAction(workout);
  return logAction(workout);
};

const homeworkLogValue = (workout?: CurrentClientWorkout | null): string => {
  const count = workout?.homeworkSummary?.recentCompletedCount || 0;
  return count === 1 ? '1 completed' : `${count} completed`;
};

const completedHomeworkStatusKey = (summary: CurrentClientHomeworkSummary): string => (
  summary.todayIsCompleted ? 'completed' : ''
);

const readyHomeworkStatusKey = (summary: CurrentClientHomeworkSummary): string => (
  summary.todayIsLoggable ? 'ready' : ''
);

const homeworkStatusKey = (workout?: CurrentClientWorkout | null): string => (
  workout?.homeworkSummary
    ? firstFilled([
      completedHomeworkStatusKey(workout.homeworkSummary),
      readyHomeworkStatusKey(workout.homeworkSummary),
      'default',
    ])
    : 'default'
);

const homeworkLogLabel = (workout?: CurrentClientWorkout | null): string => (
  HOMEWORK_STATUS_LABELS[homeworkStatusKey(workout)]
);

const homeworkHistoryRows = (workout?: CurrentClientWorkout | null): ClientCurrentWorkoutRow[] => {
  const recentHomework = workout?.homeworkSummary?.recentCompletions.slice(0, 3) || [];
  if (recentHomework.length === 0) return [];

  return [
    { label: 'Recent Homework History', value: `Last ${recentHomework.length}` },
    ...recentHomework.map((completion) => ({
      label: `${formatHomeworkCompletionPosition(completion, ' ')} - ${formatHomeworkCompletionDate(completion)}`,
      value: formatHomeworkCompletionExerciseLabel(completion),
    })),
  ];
};

const homeworkSummaryRows = (workout?: CurrentClientWorkout | null): ClientCurrentWorkoutRow[] => (
  workout?.homeworkSummary
    ? [{ label: homeworkLogLabel(workout), value: homeworkLogValue(workout) }]
    : []
);

const buildRows = (workout?: CurrentClientWorkout | null): ClientCurrentWorkoutRow[] => {
  const assignmentRow = {
    label: workoutPosition(workout),
    value: assignmentLabel(workout?.assignmentType),
  };
  return [assignmentRow, ...homeworkSummaryRows(workout), ...homeworkHistoryRows(workout)];
};

export const buildClientCurrentWorkoutViewModel = ({
  workout,
  error,
  loading,
}: BuildClientCurrentWorkoutViewModelOptions): ClientCurrentWorkoutViewModel => ({
  kicker: sectionKickerLabel(workout),
  title: workoutTitle(workout, error, loading),
  action: workoutAction(workout),
  rows: buildRows(workout),
  detail: workoutDetail(workout, error),
});
