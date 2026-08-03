/**
 * ============================================================================
 * FILE: trainingPlanProjectionContract.mjs
 * PURPOSE: Validate and build deterministic UI-safe plan projections.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Validates bounded query windows and turns plans plus
 * immutable completion receipts into deterministic read-only calendar data.
 * HOW IT FITS IN THE APP: The database-facing service calls this pure contract;
 * appointment creation, drag/drop, credits, and Session mutations stay separate.
 * KEY DECISIONS: Plan start is the primary date anchor. Legacy plans without one
 * use each client's local today plus the saved plan cursor and label that basis.
 */

import { buildWorkoutPlanAssignmentIdentity } from './workoutPlanAssignmentIdentityService.mjs';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_WINDOW_DAYS = 90;
const MAX_CLIENTS = 50;
const MAX_PAGE_SIZE = 250;

export class TrainingPlanProjectionError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.name = 'TrainingPlanProjectionError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const fail = (message, code, statusCode = 400) => {
  throw new TrainingPlanProjectionError(message, code, statusCode);
};

const dateOnly = (value) => {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day ? value : null;
};

const dateValue = (value) => Array.isArray(value) ? null : dateOnly(value);
const utcTime = (value) => {
  const valid = dateOnly(value);
  if (!valid) return null;
  const [year, month, day] = valid.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};
const addDays = (value, count) => new Date(utcTime(value) + (count * 86400000))
  .toISOString().slice(0, 10);

const positiveInteger = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const compact = (value, max = 160) => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
);
const plain = (value) => value?.get ? value.get({ plain: true }) : value;

const parsePagination = (value, fallback, max) => {
  if (value === undefined) return fallback;
  if (Array.isArray(value) || !/^[1-9]\d*$/.test(String(value))) {
    fail('page and limit must be positive integers', 'TRAINING_PLAN_PROJECTION_PAGINATION_INVALID');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) {
    fail('page or limit exceeds the supported range', 'TRAINING_PLAN_PROJECTION_PAGINATION_INVALID');
  }
  return parsed;
};

const parseClientIds = (value) => {
  if (value === undefined || value === '') return [];
  const raw = (Array.isArray(value) ? value : [value]).flatMap((entry) => String(entry).split(','));
  if (!raw.length || raw.some((entry) => !/^[1-9]\d*$/.test(entry.trim()))) {
    fail('clientIds must contain positive integer IDs', 'TRAINING_PLAN_PROJECTION_CLIENT_IDS_INVALID');
  }
  const ids = [...new Set(raw.map((entry) => Number(entry.trim())))];
  if (ids.length > MAX_CLIENTS || ids.some((id) => !Number.isSafeInteger(id))) {
    fail(`clientIds supports at most ${MAX_CLIENTS} clients`, 'TRAINING_PLAN_PROJECTION_CLIENT_IDS_INVALID');
  }
  return ids;
};

export const parseTrainingPlanProjectionQuery = (query = {}) => {
  const usesLongNames = query.startDate !== undefined || query.endDate !== undefined;
  const usesAliases = query.from !== undefined || query.to !== undefined;
  if (usesLongNames && usesAliases) {
    fail('Use startDate/endDate or from/to, not both', 'TRAINING_PLAN_PROJECTION_RANGE_INVALID');
  }
  const startDate = dateValue(usesAliases ? query.from : query.startDate);
  const endDate = dateValue(usesAliases ? query.to : query.endDate);
  if (!startDate || !endDate) {
    fail('A real startDate and endDate are required', 'TRAINING_PLAN_PROJECTION_DATE_INVALID');
  }
  const dayDifference = (utcTime(endDate) - utcTime(startDate)) / 86400000;
  if (dayDifference < 0) {
    fail('endDate must not precede startDate', 'TRAINING_PLAN_PROJECTION_RANGE_INVALID');
  }
  if (dayDifference >= MAX_WINDOW_DAYS) {
    fail(`Projection windows may include at most ${MAX_WINDOW_DAYS} days`, 'TRAINING_PLAN_PROJECTION_RANGE_TOO_LARGE');
  }
  return {
    startDate,
    endDate,
    clientIds: parseClientIds(query.clientIds),
    page: parsePagination(query.page, 1, 1000000),
    limit: parsePagination(query.limit, 100, MAX_PAGE_SIZE),
  };
};

const dayEntries = (week) => {
  if (Array.isArray(week?.days) && week.days.length) return week.days;
  if (Array.isArray(week?.sessions) && week.sessions.length) return week.sessions;
  return [];
};

const explicitDayDate = (day) => dateOnly(day?.scheduledDate)
  || dateOnly(day?.scheduleDate) || dateOnly(day?.date);

const assignmentRows = (plan) => {
  const weeks = Array.isArray(plan?.planData?.weeks) ? plan.planData.weeks : [];
  if (weeks.length) {
    return weeks.flatMap((week, weekIndex) => dayEntries(week).map((day, dayIndex) => ({
      day,
      dayIndex,
      weekIndex,
      weekNumber: positiveInteger(week?.weekNumber, weekIndex + 1),
      dayNumber: positiveInteger(day?.dayNumber ?? day?.day, dayIndex + 1),
      weekFocus: compact(week?.focus),
    })));
  }
  const template = [plan?.planData?.days, plan?.planData?.sessions, plan?.planData?.weeklySchedule]
    .find((entries) => Array.isArray(entries) && entries.length) || [];
  const duration = Math.min(positiveInteger(plan?.durationWeeks, 1), 52);
  return Array.from({ length: duration }, (_, weekIndex) => template.map((day, dayIndex) => ({
    day,
    dayIndex,
    weekIndex,
    weekNumber: weekIndex + 1,
    dayNumber: positiveInteger(day?.dayNumber ?? day?.day, dayIndex + 1),
    weekFocus: compact(plan?.planData?.focus),
  }))).flat().filter((row) => row.weekIndex === 0 || !explicitDayDate(row.day));
};

const scheduledDateFor = (plan, row, context) => {
  const explicit = explicitDayDate(row.day);
  if (explicit) return { scheduledDate: explicit, dateBasis: 'explicit' };
  const planStart = dateOnly(plan.startDate);
  if (planStart) {
    return { scheduledDate: addDays(planStart, ((row.weekNumber - 1) * 7) + row.dayIndex), dateBasis: 'plan_start' };
  }
  const localDate = dateOnly(context?.localDate);
  if (!localDate) return null;
  const offset = ((row.weekNumber - positiveInteger(plan.currentWeek, 1)) * 7)
    + (row.dayNumber - positiveInteger(plan.currentDay, 1));
  return { scheduledDate: addDays(localDate, offset), dateBasis: 'current_cursor' };
};

const exercisePreview = (day) => {
  const exercises = Array.isArray(day?.exercises) ? day.exercises : [];
  return {
    exerciseCount: exercises.length,
    exercisePreview: exercises.map((exercise) => compact(exercise?.exerciseName || exercise?.name, 80))
      .filter(Boolean).slice(0, 3),
  };
};

const completionTime = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const buildTrainingPlanProjectionItems = ({
  plans = [], receipts = [], clientDateContexts = new Map(), startDate, endDate,
} = {}) => {
  const receiptByAssignment = new Map(receipts.map(plain).filter(Boolean)
    .map((receipt) => [String(receipt.assignmentId), receipt]));
  const projections = new Map();

  plans.map(plain).filter(Boolean).forEach((plan) => {
    const revision = positiveInteger(plan.contentRevision, 1);
    const planHash = HASH.test(plan.contentHash || '') ? plan.contentHash : null;
    const context = clientDateContexts.get(Number(plan.userId));
    assignmentRows(plan).forEach((row) => {
      const dateResolution = scheduledDateFor(plan, row, context);
      const scheduledDate = dateResolution?.scheduledDate;
      if (!scheduledDate || scheduledDate < startDate || scheduledDate > endDate) return;
      if (dateOnly(plan.endDate) && scheduledDate > plan.endDate) return;
      const identity = buildWorkoutPlanAssignmentIdentity({
        planId: plan.id,
        weekNumber: row.weekNumber,
        dayNumber: row.dayNumber,
        assignmentType: row.day?.assignmentType,
        scheduledDate,
        occurrenceIndex: 1,
        prescribedRevision: revision,
      });
      if (!identity) return;
      const receipt = receiptByAssignment.get(identity.assignmentId);
      const receiptHash = HASH.test(receipt?.prescribedHash || '') ? receipt.prescribedHash : null;
      projections.set(identity.assignmentId, {
        projectionId: identity.assignmentId,
        kind: 'training_plan_projection',
        source: 'training_plan',
        billingImpact: 'none',
        readOnly: true,
        planId: String(plan.id),
        clientId: Number(plan.userId),
        trainerId: positiveInteger(plan.trainerId),
        planStatus: compact(plan.status, 24) || 'active',
        scheduledDate,
        dateBasis: dateResolution.dateBasis,
        timeZone: compact(context?.timeZone, 64),
        weekNumber: row.weekNumber,
        dayNumber: row.dayNumber,
        title: compact(plan.title) || 'Training plan',
        dayLabel: compact(row.day?.name || row.day?.dayLabel) || `Day ${row.dayNumber}`,
        focus: compact(row.day?.focus) || row.weekFocus,
        assignmentType: compact(row.day?.assignmentType, 40) || 'homework',
        ...exercisePreview(row.day),
        prescribedRevision: positiveInteger(receipt?.prescribedRevision, revision),
        prescribedHash: receiptHash || planHash,
        completionState: receipt ? 'completed' : 'planned',
        completedAt: receipt ? completionTime(receipt.completedAt) : null,
        // S2 (Plan Surfacing): honest drift — a planned day whose scheduled
        // date is behind the client's local today is N days overdue. The
        // cursor model otherwise slides silently; this is the visible truth.
        overdueDays: (!receipt && dateOnly(context?.localDate) && scheduledDate < context.localDate)
          ? Math.round((utcTime(context.localDate) - utcTime(scheduledDate)) / 86400000)
          : null,
        coexistenceKey: `${Number(plan.userId)}:${scheduledDate}`,
      });
    });
  });

  return [...projections.values()].sort((left, right) => (
    left.scheduledDate.localeCompare(right.scheduledDate)
    || left.clientId - right.clientId
    || left.planId.localeCompare(right.planId)
    || left.weekNumber - right.weekNumber
    || left.dayNumber - right.dayNumber
  ));
};

// ─────────────────────────────────────────────────────────────
// S0 (Plan Surfacing Batch A, 2026-08-03): the basis chain is the ONE
// date→plan-day truth app-wide. planDayResolver consumes these exports;
// nothing else should re-implement scheduled-date math.
// ─────────────────────────────────────────────────────────────
export const buildAssignmentRows = assignmentRows;
export const resolveScheduledDate = scheduledDateFor;
