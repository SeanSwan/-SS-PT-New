/**
 * Planned workout assignment logging helpers.
 *
 * Verifies client-sent plan assignment metadata against the server-side
 * current workout read model before a daily workout form may treat it as
 * homework/recovery work or scheduled trainer-session plan progress.
 */

const NON_BILLABLE_TYPES = new Set(['homework', 'active_recovery']);
const SCHEDULED_TRAINER_TYPES = new Set(['trainer_session']);

export class PlannedWorkoutAssignmentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'PlannedWorkoutAssignmentError';
    this.status = status;
  }
}

const PUBLIC_PLANNED_ASSIGNMENT_MESSAGES = new Set([
  'Planned assignment source must be workout_plan',
  'Planned assignment metadata is incomplete',
  'Planned assignment metadata must be an object',
  'Only homework or active recovery assignments can use planned assignment logging',
  'Billable assignments must be logged through scheduled session flows',
  'Scheduled session plan metadata must be a trainer session assignment',
  'Planned assignment date does not match the workout log date',
  'Planned assignment does not match the active workout plan',
  'Planned assignment is not loggable',
  'Planned assignment type does not match the active workout plan',
  'Planned assignment cursor does not match the active workout plan',
  'Scheduled session plan metadata must match a trainer session assignment',
]);

export const getPlannedWorkoutAssignmentClientMessage = (error = {}) => (
  PUBLIC_PLANNED_ASSIGNMENT_MESSAGES.has(error.message)
    ? error.message
    : 'Planned workout assignment could not be verified.'
);

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
];

const nonScheduledInputValidationRules = [
  {
    fails: (draft) => !NON_BILLABLE_TYPES.has(draft.assignmentType),
    message: 'Only homework or active recovery assignments can use planned assignment logging',
  },
  {
    fails: (_draft, value) => value.shouldDeductSession === true || value.isBillable === true,
    message: 'Billable assignments must be logged through scheduled session flows',
  },
];

const scheduledInputValidationRules = [
  {
    fails: (draft) => !SCHEDULED_TRAINER_TYPES.has(draft.assignmentType),
    message: 'Scheduled session plan metadata must be a trainer session assignment',
  },
];

const firstValidationMessage = (rules, ...args) => (
  rules.find((rule) => rule.fails(...args))?.message || null
);

export const normalizePlannedWorkoutAssignmentInput = (value, {
  hasScheduledSession = false,
} = {}) => {
  if (isEmptyAssignmentInput(value)) {
    return { ok: true, assignment: null };
  }
  if (!isRecord(value)) {
    return { ok: false, message: 'Planned assignment metadata must be an object' };
  }

  const draft = buildAssignmentDraft(value);
  const validationMessage = firstValidationMessage([
    ...inputValidationRules,
    ...(hasScheduledSession ? scheduledInputValidationRules : nonScheduledInputValidationRules),
  ], draft, value);
  if (validationMessage) return { ok: false, message: validationMessage };

  const isScheduledTrainerSession = SCHEDULED_TRAINER_TYPES.has(draft.assignmentType);

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
      isBillable: isScheduledTrainerSession,
      shouldDeductSession: isScheduledTrainerSession && value.shouldDeductSession === true,
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
    fails: (_input, overviewAssignment, options = {}) => (
      (
        overviewAssignment?.isLoggable === false
        && !(options.hasScheduledSession && SCHEDULED_TRAINER_TYPES.has(overviewAssignment.assignmentType))
      )
      || compactString(overviewAssignment?.status)?.toLowerCase() === 'completed'
    ),
    message: 'Planned assignment is not loggable',
  },
  {
    fails: (input, overviewAssignment) => overviewAssignment.assignmentType !== input.assignmentType,
    message: 'Planned assignment type does not match the active workout plan',
  },
  {
    fails: assignmentCursorMismatch,
    message: 'Planned assignment cursor does not match the active workout plan',
  },
];

const nonScheduledOverviewMatchRules = [
  {
    fails: (_input, overviewAssignment) => (
      overviewAssignment.shouldDeductSession === true || overviewAssignment.isBillable === true
    ),
    message: 'Billable assignments must be logged through scheduled session flows',
  },
];

const scheduledOverviewMatchRules = [
  {
    fails: (_input, overviewAssignment) => !SCHEDULED_TRAINER_TYPES.has(overviewAssignment.assignmentType),
    message: 'Scheduled session plan metadata must match a trainer session assignment',
  },
];

export const assertPlannedAssignmentMatchesOverview = (
  input,
  overviewAssignment = {},
  { hasScheduledSession = false } = {},
) => {
  if (!input) return;
  const validationMessage = firstValidationMessage([
    ...overviewMatchRules,
    ...(hasScheduledSession ? scheduledOverviewMatchRules : nonScheduledOverviewMatchRules),
  ], input, overviewAssignment, { hasScheduledSession });
  if (validationMessage) throw new PlannedWorkoutAssignmentError(validationMessage);
};

export const buildPlannedAssignmentFormMetadata = (input, overviewAssignment = {}) => {
  if (!input) return null;
  const isScheduledTrainerSession = SCHEDULED_TRAINER_TYPES.has(overviewAssignment.assignmentType || input.assignmentType);
  return {
    assignmentId: overviewAssignment.assignmentId || input.assignmentId,
    assignmentKey: overviewAssignment.assignmentKey || input.assignmentKey,
    source: 'workout_plan',
    planId: input.planId,
    assignmentType: overviewAssignment.assignmentType || input.assignmentType,
    status: overviewAssignment.status || 'planned',
    sessionType: overviewAssignment.sessionType || 'solo',
    isBillable: isScheduledTrainerSession,
    shouldDeductSession: isScheduledTrainerSession && overviewAssignment.shouldDeductSession === true,
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
