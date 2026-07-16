/**
 * ============================================================================
 * FILE: workoutPlanAssignmentIdentityService.mjs
 * PURPOSE: Build canonical revision/date-aware WorkoutPlan assignment keys.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Encodes plan, day, scheduled date, occurrence, and
 * prescribed revision into one stable assignment identity.
 * HOW IT FITS IN THE APP: Read models emit it, log guards dual-read it, and
 * completion receipts use the same identity dimensions.
 * KEY DECISIONS: Legacy type-based keys are read-only rollout aliases and are
 * never persisted as the canonical completion identity.
 * NASM PROTOCOL CONTEXT: A completed assignment names the exact prescription.
 */

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const positiveInteger = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const realDateOnly = (value) => {
  if (!DATE_ONLY_PATTERN.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day ? value : null;
};

export const buildWorkoutPlanAssignmentIdentity = ({
  planId,
  weekNumber,
  dayNumber,
  assignmentType,
  scheduledDate,
  occurrenceIndex = 1,
  prescribedRevision = 1,
} = {}) => {
  const safePlanId = compactString(String(planId ?? ''));
  const week = positiveInteger(weekNumber);
  const day = positiveInteger(dayNumber);
  const occurrence = positiveInteger(occurrenceIndex);
  const revision = positiveInteger(prescribedRevision);
  const date = realDateOnly(scheduledDate);
  const type = compactString(assignmentType) || 'homework';
  if (!safePlanId || !week || !day || !occurrence || !revision || !date) return null;

  const assignmentKey = `${safePlanId}:w${week}:d${day}:${date}:o${occurrence}:r${revision}`;
  return {
    assignmentId: assignmentKey,
    assignmentKey,
    legacyAssignmentKey: `${safePlanId}:w${week}:d${day}:${type}`,
    scheduledDate: date,
    occurrenceIndex: occurrence,
    prescribedRevision: revision,
  };
};

export const matchesWorkoutPlanAssignmentIdentity = (input, overviewAssignment) => {
  const inputKey = compactString(input?.assignmentKey || input?.assignmentId);
  if (!inputKey) return false;
  return [overviewAssignment?.assignmentKey, overviewAssignment?.legacyAssignmentKey]
    .map(compactString)
    .filter(Boolean)
    .includes(inputKey);
};
