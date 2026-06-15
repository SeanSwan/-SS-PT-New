/**
 * FILE: ClientCurrentWorkoutCoachAction.ts
 * PURPOSE: Builds safe Coach handoff routes from the client overview current-workout card.
 */

import type { CurrentClientWorkout } from './useCurrentClientWorkout';

export interface ClientCurrentWorkoutCoachAction {
  label: string;
  ariaLabel: string;
  path: string;
}

const CLIENT_COACH_PATH = '/dashboard/client/coach-assistant';
const CLIENT_OVERVIEW_RETURN_TO = '/dashboard/client/overview';
const CLIENT_OVERVIEW_SOURCE = 'client-dashboard';

const filled = (value?: string | null): string => value?.trim() || '';

const safePromptText = (value?: string | null): string => (
  filled(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '')
    .replace(/\+?\d[\d ().-]{7,}\d/g, '')
    .replace(/@[A-Za-z0-9_]{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
);

const numberLabel = (value?: number | null, noun = 'item'): string => {
  if (!Number.isFinite(value)) return '';
  const count = Math.max(0, Math.round(value || 0));
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

const positionParts = (workout: CurrentClientWorkout): string[] => [
  safePromptText(workout.primaryPlanLabel) ? `${safePromptText(workout.primaryPlanLabel)} Primary` : '',
  workout.weekNumber ? `Week ${Math.max(1, Math.round(workout.weekNumber))}` : '',
  workout.dayNumber ? `Day ${Math.max(1, Math.round(workout.dayNumber))}` : '',
  safePromptText(workout.dayLabel),
].filter(Boolean);

const assignmentPosition = (workout: CurrentClientWorkout): string => (
  positionParts(workout).join(', ') || 'today'
);

const assignmentIntent = (workout?: CurrentClientWorkout | null): string => (
  workout?.isLoggable ? 'log_self_workout' : 'client_daily_command'
);

const assignmentSafetyCopy = (workout?: CurrentClientWorkout | null): string => (
  workout?.isLoggable
    ? 'If this should be logged, send me back to the Workout Logger.'
    : 'If this is a trainer-led session, open schedule or ask my trainer before logging.'
);

const currentAssignmentPrompt = (workout: CurrentClientWorkout): string => {
  const pieces = [
    `Client overview current assignment: ${safePromptText(workout.title) || 'Today assignment'}.`,
    `Position: ${assignmentPosition(workout)}.`,
    `Type: ${safePromptText(workout.assignmentType) || 'assignment'}.`,
    safePromptText(workout.firstExercise) ? `First exercise: ${safePromptText(workout.firstExercise)}.` : '',
    numberLabel(workout.exerciseCount, 'exercise') ? `Size: ${numberLabel(workout.exerciseCount, 'exercise')}.` : '',
    'Tell me the next simple action in plain language.',
    assignmentSafetyCopy(workout),
    'Do not claim the workout was logged until I save it in the Workout Logger.',
  ];
  return pieces.filter(Boolean).join(' ');
};

const emptyAssignmentPrompt = (): string => (
  'Client overview has no current assignment loaded. Tell me the simplest next action: check my plan, log a workout, review progress, book, or ask my trainer. Do not claim anything was logged.'
);

export function buildClientCurrentWorkoutCoachAction(
  workout?: CurrentClientWorkout | null,
): ClientCurrentWorkoutCoachAction {
  const params = new URLSearchParams({
    intent: assignmentIntent(workout),
    source: CLIENT_OVERVIEW_SOURCE,
    returnTo: CLIENT_OVERVIEW_RETURN_TO,
    teachPrompt: workout ? currentAssignmentPrompt(workout) : emptyAssignmentPrompt(),
  });

  return {
    label: 'Coach This',
    ariaLabel: "Ask Swan Coach about today's assignment",
    path: `${CLIENT_COACH_PATH}?${params.toString()}`,
  };
}
