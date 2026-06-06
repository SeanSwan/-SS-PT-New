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

const normalizeAssignmentType = (value) => {
  const raw = compactString(value)?.toLowerCase().replace(/[\s-]+/g, '_') || null;
  if (raw === 'solo' || raw === 'conditioning') return 'homework';
  if (raw === 'recovery' || raw === 'flexibility') return 'active_recovery';
  return raw;
};

export const normalizePlannedWorkoutAssignmentInput = (value) => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, assignment: null };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, message: 'Planned assignment metadata must be an object' };
  }

  const assignmentKey = compactString(value.assignmentKey || value.assignmentId);
  const planId = compactString(value.planId);
  const assignmentType = normalizeAssignmentType(value.assignmentType);
  const weekNumber = toPositiveInteger(value.weekNumber);
  const dayNumber = toPositiveInteger(value.dayNumber);
  const source = compactString(value.source) || 'workout_plan';

  if (source !== 'workout_plan') {
    return { ok: false, message: 'Planned assignment source must be workout_plan' };
  }
  if (!assignmentKey || !planId || !assignmentType || !weekNumber || !dayNumber) {
    return { ok: false, message: 'Planned assignment metadata is incomplete' };
  }
  if (!NON_BILLABLE_TYPES.has(assignmentType)) {
    return { ok: false, message: 'Only homework or active recovery assignments can use planned assignment logging' };
  }
  if (value.shouldDeductSession === true || value.isBillable === true) {
    return { ok: false, message: 'Billable assignments must be logged through scheduled session flows' };
  }

  return {
    ok: true,
    assignment: {
      assignmentKey,
      assignmentId: assignmentKey,
      planId,
      assignmentType,
      source,
      weekNumber,
      dayNumber,
      isBillable: false,
      shouldDeductSession: false,
    },
  };
};

export const assertPlannedAssignmentMatchesOverview = (input, overviewAssignment = {}) => {
  if (!input) return;
  if (!overviewAssignment?.assignmentKey || overviewAssignment.assignmentKey !== input.assignmentKey) {
    throw new PlannedWorkoutAssignmentError('Planned assignment does not match the active workout plan');
  }
  if (overviewAssignment.assignmentType !== input.assignmentType) {
    throw new PlannedWorkoutAssignmentError('Planned assignment type does not match the active workout plan');
  }
  if (
    Number(overviewAssignment.weekNumber) !== input.weekNumber
    || Number(overviewAssignment.dayNumber) !== input.dayNumber
  ) {
    throw new PlannedWorkoutAssignmentError('Planned assignment cursor does not match the active workout plan');
  }
  if (overviewAssignment.shouldDeductSession === true || overviewAssignment.isBillable === true) {
    throw new PlannedWorkoutAssignmentError('Billable assignments must be logged through scheduled session flows');
  }
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

export const isNonBillablePlannedWorkoutAssignment = (assignment) => (
  Boolean(assignment)
  && assignment.source === 'workout_plan'
  && NON_BILLABLE_TYPES.has(assignment.assignmentType)
  && assignment.isBillable === false
  && assignment.shouldDeductSession === false
);
