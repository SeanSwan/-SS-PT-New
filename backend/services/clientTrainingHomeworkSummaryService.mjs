/**
 * Client Training Homework Summary Service
 * ========================================
 *
 * Builds a read-safe off-day homework status object shared by the client
 * dashboard, trainer/admin plan vault, and Swan Coach read context. The output
 * intentionally avoids titles, notes, emails, names, and freeform text.
 */

import { normalizeAssignmentType } from './clientTrainingAssignmentSemanticsService.mjs';

const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const toPositiveInteger = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const safeDateTime = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && value.trim()) return value;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const safeHomeworkCompletion = (completion) => {
  const exerciseCount = toPositiveInteger(completion?.exerciseCount, 0);
  const assignmentType = normalizeAssignmentType(completion?.assignmentType, exerciseCount);
  if (assignmentType !== 'homework') return null;

  return {
    assignmentType,
    assignmentKey: compactString(completion?.assignmentKey || completion?.assignmentId),
    formId: completion?.formId ?? completion?.id ?? null,
    completedAt: safeDateTime(completion?.completedAt || completion?.submittedAt),
    scheduledDate: compactString(completion?.scheduledDate || completion?.date),
    weekNumber: toPositiveInteger(completion?.weekNumber),
    dayNumber: toPositiveInteger(completion?.dayNumber),
    exerciseCount,
    firstExerciseName: compactString(completion?.firstExerciseName),
  };
};

const completionIdentity = (completion) => (
  completion.formId || completion.assignmentKey || completion.completedAt
);

const shouldKeepCompletion = (seen, completion) => {
  const key = completionIdentity(completion);
  if (!key || seen.has(key)) return false;
  seen.add(key);
  return true;
};

const uniqueHomeworkCompletions = (completions = []) => {
  const seen = new Set();
  return (Array.isArray(completions) ? completions : [])
    .map(safeHomeworkCompletion)
    .filter(Boolean)
    .filter((completion) => shouldKeepCompletion(seen, completion))
    .slice(0, 5);
};

export const buildHomeworkSummary = ({
  todayAssignment = null,
  recentAssignmentCompletions = [],
} = {}) => {
  const today = todayAssignment || {};
  const recentCompletions = uniqueHomeworkCompletions(recentAssignmentCompletions);
  const todayStatus = compactString(today.status) || 'none';

  return {
    assignmentType: compactString(today.assignmentType) || 'none',
    todayStatus,
    todayIsCompleted: todayStatus === 'completed',
    todayIsLoggable: today.isLoggable === true,
    todayShouldDeductSession: today.shouldDeductSession === true,
    todayWeekNumber: toPositiveInteger(today.weekNumber),
    todayDayNumber: toPositiveInteger(today.dayNumber),
    todayExerciseCount: toPositiveInteger(today.exerciseCount, 0),
    todayFirstExerciseName: compactString(today.firstExerciseName),
    recentCompletedCount: recentCompletions.length,
    lastCompletedAt: recentCompletions[0]?.completedAt || null,
    recentCompletions,
  };
};
