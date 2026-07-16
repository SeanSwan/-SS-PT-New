/**
 * ============================================================================
 * FILE: TodayTrainingModule.logic.ts
 * PURPOSE: Build honest, route-ready states for the shared client Today module.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * Both canonical client Home compositions consume this pure view model. It
 * keeps loading, failure, recovery, completion, revision, and PDF truth out of
 * JSX while preserving deterministic assignment identity in logger routes.
 */

import type { CurrentClientWorkoutState } from '../../Pages/client-dashboard/observatory/useCurrentClientWorkout';
import type { ClientTrainingPlanSlot } from '../../Pages/client-dashboard/observatory/clientTrainingPlanVaultNormalizer';

export type TodayTrainingKind = 'loading' | 'error' | 'empty' | 'workout' | 'rest' | 'recovery' | 'completed';

export interface TodayTrainingAction {
  label: string;
  path: string;
  disabled: boolean;
}

export interface TodayTrainingView {
  kind: TodayTrainingKind;
  title: string;
  statusLabel: string;
  planLabel?: string;
  dayLabel?: string;
  exerciseNames: string[];
  overflowExerciseCount: number;
  revisionLabel?: string;
  pdfLabel: string;
  logAction: TodayTrainingAction;
  planAction: TodayTrainingAction;
  scheduleAction: TodayTrainingAction;
}

const disabledLogAction = (): TodayTrainingAction => ({
  label: 'Log Workout', path: '/dashboard/client/log-workout', disabled: true,
});

const primarySlot = (state: CurrentClientWorkoutState): ClientTrainingPlanSlot | null => (
  state.planVault?.slots.find((slot) => slot.isPrimary && slot.isFilled) || null
);

const loggerPath = (assignmentKey?: string, assignmentType?: string): string => {
  const query = new URLSearchParams({ loadPlan: 'today' });
  if (assignmentKey) query.set('assignmentKey', assignmentKey);
  if (assignmentType) query.set('assignmentType', assignmentType);
  return `/dashboard/client/log-workout?${query.toString()}`;
};

const pdfLabel = (slot: ClientTrainingPlanSlot | null): string => {
  const derivative = slot?.pdfDerivative;
  if (!derivative) return slot?.pdfFile ? 'Custom PDF' : 'PDF pending';
  if (!derivative.enabled) return 'Legacy PDF';
  if (derivative.state === 'unavailable') return 'PDF status unavailable';
  if (derivative.latestManual?.needsReview) return 'Custom PDF review';
  const generated = derivative.latestGenerated;
  if (generated?.state === 'ready') {
    return generated.sourceRevision === slot?.contentRevision ? 'PDF current' : 'PDF outdated';
  }
  if (['pending', 'queued', 'rendering'].includes(generated?.state || derivative.state)) return 'PDF generating';
  if ((generated?.state || derivative.state) === 'failed') return 'PDF unavailable';
  if (derivative.latestManual?.state === 'ready') return 'Custom PDF';
  return 'PDF pending';
};

const baseView = (kind: TodayTrainingKind, title: string, statusLabel: string): TodayTrainingView => ({
  kind,
  title,
  statusLabel,
  exerciseNames: [],
  overflowExerciseCount: 0,
  pdfLabel: 'PDF pending',
  logAction: disabledLogAction(),
  planAction: { label: 'View Plan', path: '/dashboard/client/workouts', disabled: false },
  scheduleAction: { label: 'View Schedule', path: '/dashboard/client/schedule', disabled: false },
});

const dayLabel = (week?: number, day?: number, fallback?: string): string | undefined => {
  if (week && day) return `Week ${week} / Day ${day}`;
  if (week) return `Week ${week}`;
  if (day) return `Day ${day}`;
  return fallback;
};

/** Build one honest Today view without fetching or mutating training state. */
export function buildTodayTrainingView(state: CurrentClientWorkoutState): TodayTrainingView {
  if (state.loading) return baseView('loading', 'Loading today', 'Syncing plan');
  if (state.error) return baseView('error', 'Today unavailable', 'Connection needed');
  if (!state.workout) return baseView('empty', 'Plan pending', 'Waiting for your coach');

  const workout = state.workout;
  const slot = primarySlot(state);
  const assignmentType = (workout.assignmentType || '').toLowerCase();
  const completed = workout.assignmentStatus?.toLowerCase() === 'completed';
  const kind: TodayTrainingKind = completed
    ? 'completed'
    : assignmentType === 'rest'
      ? 'rest'
      : assignmentType === 'active_recovery'
        ? 'recovery'
        : 'workout';
  const statusLabel = completed
    ? 'Logged today'
    : kind === 'rest'
      ? 'Recovery day'
      : kind === 'recovery'
        ? 'Active recovery'
        : workout.isLoggable ? 'Ready to log' : 'Review assignment';
  const exerciseNames = workout.exerciseNames.slice(0, 3);
  const logAction = completed
    ? { label: 'Review Workout', path: '/dashboard/client/workouts', disabled: false }
    : {
      label: 'Log Workout',
      path: loggerPath(workout.assignmentKey, workout.assignmentType),
      disabled: !workout.isLoggable || kind === 'rest' || kind === 'recovery',
    };

  return {
    ...baseView(kind, workout.title, statusLabel),
    planLabel: slot?.planTitle || workout.primaryPlanLabel,
    dayLabel: dayLabel(workout.weekNumber, workout.dayNumber, workout.dayLabel),
    exerciseNames,
    overflowExerciseCount: Math.max(0, workout.exerciseCount - exerciseNames.length),
    revisionLabel: workout.prescribedRevision ? `Revision ${workout.prescribedRevision}` : undefined,
    pdfLabel: pdfLabel(slot),
    logAction,
  };
}