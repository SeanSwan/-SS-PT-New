/**
 * Planned workout assignment logging helpers.
 *
 * Verifies client-sent plan assignment metadata against the server-side
 * current workout read model before a daily workout form may treat it as a
 * non-billable homework/recovery log.
 */

const NON_BILLABLE_TYPES = new Set(['homework', 'active_recovery']);

export class PlannedWorkoutAssignmentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'PlannedWorkoutAssignmentError';
    this.status = status;
  }
}

const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const toPositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const ASSIGNMENT_TYPE_ALIASES = new Map([
  ['solo', 'homework'],
  ['conditioning', 'homework'],
  ['recovery', 'active_recovery'],
  ['flexibility', 'active_recovery'],
]);

const normalizeAssignmentType = (value) => {
  const raw = compactString(value)?.toLowerCase().replace(/[\s-]+/g, '_') || null;
  return ASSIGNMENT_TYPE_ALIASES.get(raw) || raw;
};

const isEmptyAssignmentInput = (value) => value === undefined || value === null || value === '';
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const buildAssignmentDraft = (value) => ({
  assignmentKey: compactString(value.assignmentKey || value.assignmentId),
  planId: compactString(value.planId),
  assignmentType: normalizeAssignmentType(value.assignmentType),
  weekNumber: toPositiveInteger(value.weekNumber),
  dayNumber: toPositiveInteger(value.dayNumber),
  source: compactString(value.source) || 'workout_plan',
});

const missingRequiredAssignmentField = (draft) => [
  draft.assignmentKey,
  draft.planId,
  draft.assignmentType,
  draft.weekNumber,
  draft.dayNumber,
].some((field) => !field);

const inputValidationRules = [
  {
    fails: (draft) => draft.source !== 'workout_plan',
    message: 'Planned assignment source must be workout_plan',
  },
  {
    fails: (draft) => missingRequiredAssignmentField(draft),
    message: 'Planned assignment metadata is incomplete',
  },
  {
    fails: (draft) => !NON_BILLABLE_TYPES.has(draft.assignmentType),
    message: 'Only homework or active recovery assignments can use planned assignment logging',
  },
  {
    fails: (_draft, value) => value.shouldDeductSession === true || value.isBillable === true,
    message: 'Billable assignments must be logged through scheduled session flows',
  },
];

const firstValidationMessage = (rules, ...args) => (
  rules.find((rule) => rule.fails(...args))?.message || null
);

export const normalizePlannedWorkoutAssignmentInput = (value) => {
  if (isEmptyAssignmentInput(value)) {
    return { ok: true, assignment: null };
  }
  if (!isRecord(value)) {
    return { ok: false, message: 'Planned assignment metadata must be an object' };
  }

  const draft = buildAssignmentDraft(value);
  const validationMessage = firstValidationMessage(inputValidationRules, draft, value);
  if (validationMessage) return { ok: false, message: validationMessage };

  return {
    ok: true,
    assignment: {
      assignmentKey: draft.assignmentKey,
      assignmentId: draft.assignmentKey,
      planId: draft.planId,
      assignmentType: draft.assignmentType,
      source: draft.source,
      weekNumber: draft.weekNumber,
      dayNumber: draft.dayNumber,
      isBillable: false,
      shouldDeductSession: false,
    },
  };
};

const assignmentCursorMismatch = (input, overviewAssignment) => (
  Number(overviewAssignment.weekNumber) !== input.weekNumber
  || Number(overviewAssignment.dayNumber) !== input.dayNumber
);

const overviewMatchRules = [
  {
    fails: (input, overviewAssignment) => (
      !overviewAssignment?.assignmentKey || overviewAssignment.assignmentKey !== input.assignmentKey
    ),
    message: 'Planned assignment does not match the active workout plan',
  },
  {
    fails: (input, overviewAssignment) => overviewAssignment.assignmentType !== input.assignmentType,
    message: 'Planned assignment type does not match the active workout plan',
  },
  {
    fails: assignmentCursorMismatch,
    message: 'Planned assignment cursor does not match the active workout plan',
  },
  {
    fails: (_input, overviewAssignment) => (
      overviewAssignment.shouldDeductSession === true || overviewAssignment.isBillable === true
    ),
    message: 'Billable assignments must be logged through scheduled session flows',
  },
];

export const assertPlannedAssignmentMatchesOverview = (input, overviewAssignment = {}) => {
  if (!input) return;
  const validationMessage = firstValidationMessage(overviewMatchRules, input, overviewAssignment);
  if (validationMessage) throw new PlannedWorkoutAssignmentError(validationMessage);
};

export const buildPlannedAssignmentFormMetadata = (input, overviewAssignment = {}) => {
  if (!input) return null;
  return {
    assignmentId: overviewAssignment.assignmentId || input.assignmentId,
    assignmentKey: overviewAssignment.assignmentKey || input.assignmentKey,
    source: 'workout_plan',
    planId: input.planId,
    assignmentType: overviewAssignment.assignmentType || input.assignmentType,
    status: overviewAssignment.status || 'planned',
    sessionType: overviewAssignment.sessionType || 'solo',
    isBillable: false,
    shouldDeductSession: false,
    title: compactString(overviewAssignment.title),
    scheduledDate: compactString(overviewAssignment.scheduledDate),
    weekNumber: toPositiveInteger(overviewAssignment.weekNumber) || input.weekNumber,
    dayNumber: toPositiveInteger(overviewAssignment.dayNumber) || input.dayNumber,
    dayLabel: compactString(overviewAssignment.dayLabel),
    exerciseCount: toPositiveInteger(overviewAssignment.exerciseCount) || 0,
    firstExerciseName: compactString(overviewAssignment.firstExerciseName),
  };
};

export const isNonBillablePlannedWorkoutAssignment = (assignment) => {
  if (!assignment) return false;
  return [
    assignment.source === 'workout_plan',
    NON_BILLABLE_TYPES.has(assignment.assignmentType),
    assignment.isBillable === false,
    assignment.shouldDeductSession === false,
  ].every(Boolean);
};
