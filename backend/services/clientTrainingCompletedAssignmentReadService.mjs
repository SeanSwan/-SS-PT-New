/**
 * Client Training Completed Assignment Read Service
 * =================================================
 *
 * Builds a read-safe "completed today" assignment card from a logged
 * DailyWorkoutForm planned-assignment receipt after the plan cursor advances.
 */

import { normalizeAssignmentType } from './clientTrainingAssignmentSemanticsService.mjs';
import { DEFAULT_CLIENT_TIME_ZONE, formatDateOnlyInTimeZone } from './clientTrainingDateService.mjs';

const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const toPositiveInteger = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const todayDateOnly = () => formatDateOnlyInTimeZone(new Date(), DEFAULT_CLIENT_TIME_ZONE);
const isDateOnlyString = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const normalizeDateOnly = (value) => {
  if (isDateOnlyString(value)) return value;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : todayDateOnly();
};

const latestCompletedAssignment = (assignmentCompletions = []) => (
  Array.isArray(assignmentCompletions)
    ? assignmentCompletions.find((completion) => compactString(completion?.assignmentKey || completion?.assignmentId))
    : null
);

export const buildCompletedAssignmentFromLoggedCompletion = (assignmentCompletions, today) => {
  const completion = latestCompletedAssignment(assignmentCompletions);
  if (!completion) return null;
  const assignmentKey = compactString(completion.assignmentKey || completion.assignmentId);
  const exerciseCount = toPositiveInteger(completion.exerciseCount, 0);
  const type = normalizeAssignmentType(completion.assignmentType, exerciseCount);

  return {
    assignmentId: assignmentKey,
    assignmentKey,
    assignmentType: type,
    sessionType: type === 'trainer_session' ? 'trainer-led' : 'solo',
    status: 'completed',
    source: 'workout_plan',
    isLoggable: false,
    isBillable: false,
    shouldDeductSession: false,
    title: compactString(completion.title) || 'Completed Assignment',
    scheduledDate: normalizeDateOnly(today),
    weekNumber: toPositiveInteger(completion.weekNumber),
    dayNumber: toPositiveInteger(completion.dayNumber),
    dayLabel: compactString(completion.dayLabel),
    exerciseCount,
    firstExerciseName: compactString(completion.firstExerciseName),
    exercises: [],
    ctaLabel: 'Review Workout',
    completion: {
      source: 'daily_workout_form',
      formId: completion.formId ?? completion.id ?? null,
      completedAt: completion.completedAt ?? completion.submittedAt ?? null,
    },
  };
};
