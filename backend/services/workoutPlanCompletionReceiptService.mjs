/**
 * ============================================================================
 * FILE: workoutPlanCompletionReceiptService.mjs
 * PURPOSE: Persist immutable evidence for completed workout-plan assignments.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Validates pre-mutation plan identity, builds a compact
 * allowlisted exercise prescription snapshot, and idempotently creates a receipt.
 * HOW IT FITS IN THE APP: Workout-log transaction -> plan mutation -> immutable
 * completion receipt stored in the same database transaction.
 * KEY DECISIONS: Identity is plan/day/date/occurrence/revision; replay returns an
 * exact existing receipt, while any evidence collision fails closed with 409.
 * NASM PROTOCOL CONTEXT: Historical completion remains tied to the acute-variable
 * prescription the client actually received, even after later plan edits.
 */

import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { hashWorkoutPlanContent } from './workoutPlanRevisionService.mjs';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_EXERCISES = 100;
const IMMUTABLE_FIELDS = [
  'workoutPlanId',
  'clientId',
  'dayKey',
  'assignmentId',
  'occurrenceIndex',
  'scheduledDate',
  'prescribedRevision',
  'prescribedHash',
  'exerciseSnapshot',
  'dailyWorkoutFormId',
  'workoutSessionId',
  'idempotencyKey',
  'completedAt',
];

export class WorkoutPlanCompletionReceiptError extends Error {
  constructor(message, { code, statusCode = 500, field } = {}) {
    super(message);
    this.name = 'WorkoutPlanCompletionReceiptError';
    this.code = code || 'WORKOUT_PLAN_COMPLETION_RECEIPT_FAILED';
    this.statusCode = statusCode;
    if (field) this.field = field;
  }
}

const fail = (message, code, field, statusCode = 500) => {
  throw new WorkoutPlanCompletionReceiptError(message, { code, field, statusCode });
};

const compactString = (value, maxLength = 255) => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null
);

const positiveInteger = (value, field, code = 'WORKOUT_PLAN_COMPLETION_EVIDENCE_INVALID') => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`Completion receipt ${field} must be a positive integer`, code, field, 400);
  }
  return parsed;
};
const requiredUuid = (value, field) => {
  const normalized = compactString(String(value ?? ''), 36)?.toLowerCase() || null;
  if (!normalized || !UUID_PATTERN.test(normalized)) {
    fail(`Completion receipt ${field} must be a UUID`, 'WORKOUT_PLAN_COMPLETION_EVIDENCE_INVALID', field, 400);
  }
  return normalized;
};

const isRealDateOnly = (value) => {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

const validCompletedAt = (value) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    fail('Completion receipt timestamp is invalid', 'WORKOUT_PLAN_COMPLETION_TIME_INVALID', 'completedAt', 400);
  }
  return date;
};

const firstPresent = (...values) => values.find((value) => (
  value !== undefined && value !== null && value !== ''
));

const compactScalar = (value, maxLength = 64) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return compactString(value, maxLength);
  return null;
};

const exerciseName = (entry) => compactString(firstPresent(
  entry.exerciseName,
  entry.name,
  entry.exercise?.name,
  entry.exercise?.exerciseName,
), 120);

const prescribedSetCount = (entry) => {
  const raw = firstPresent(entry.sets, entry.setCount, entry.setScheme);
  if (Array.isArray(raw)) return raw.length || null;
  const count = Number(raw);
  return Number.isFinite(count) && count > 0 ? count : compactScalar(raw);
};

const snapshotExercise = (rawExercise) => {
  const entry = rawExercise && typeof rawExercise === 'object' ? rawExercise : {};
  const name = exerciseName(entry);
  if (!name) return null;
  const snapshot = { exerciseName: name };
  const candidates = {
    exerciseId: compactString(firstPresent(entry.exerciseId, entry.id, entry.exercise?.id), 120),
    sets: prescribedSetCount(entry),
    reps: compactScalar(firstPresent(entry.targetReps, entry.reps, entry.repGoal)),
    tempo: compactString(firstPresent(entry.tempo, entry.cadence), 40),
    restSeconds: compactScalar(firstPresent(entry.restSeconds, entry.restTime, entry.restPeriod, entry.rest)),
    load: compactScalar(firstPresent(entry.targetWeight, entry.weight, entry.load)),
    targetIntensity: compactScalar(firstPresent(entry.targetIntensity, entry.intensity, entry.rpe)),
  };
  for (const [key, value] of Object.entries(candidates)) {
    if (value !== null && value !== undefined && value !== '') snapshot[key] = value;
  }
  return snapshot;
};

const buildExerciseSnapshot = (prescribedEntry) => {
  const exercises = Array.isArray(prescribedEntry?.exercises) ? prescribedEntry.exercises : [];
  if (exercises.length > MAX_EXERCISES) {
    fail('Completion receipt exercise snapshot exceeds 100 items', 'WORKOUT_PLAN_COMPLETION_SNAPSHOT_TOO_LARGE', 'exerciseSnapshot', 400);
  }
  const safeExercises = exercises.map(snapshotExercise).filter(Boolean);
  return { version: 1, exerciseCount: safeExercises.length, exercises: safeExercises };
};

const prescribedIdentity = (plan) => {
  const prescribedRevision = positiveInteger(
    plan?.contentRevision,
    'prescribedRevision',
    'WORKOUT_PLAN_COMPLETION_IDENTITY_INVALID',
  );
  const expectedHash = hashWorkoutPlanContent(plan?.planData);
  const prescribedHash = compactString(plan?.contentHash, 64);
  if (!prescribedHash || !HASH_PATTERN.test(prescribedHash) || prescribedHash !== expectedHash) {
    fail('Workout plan prescription identity is invalid', 'WORKOUT_PLAN_COMPLETION_IDENTITY_INVALID', 'prescribedHash');
  }
  return { prescribedRevision, prescribedHash };
};

const buildIdempotencyKey = ({ workoutPlanId, dayKey, scheduledDate, occurrenceIndex, prescribedRevision }) => {
  const identity = [workoutPlanId, dayKey, scheduledDate, occurrenceIndex, prescribedRevision].join('|');
  return `wpc:${createHash('sha256').update(identity).digest('hex')}`;
};

export const buildWorkoutPlanCompletionReceiptValues = ({
  plan,
  assignment,
  prescribedEntry,
  clientId,
  dailyWorkoutFormId,
  workoutSessionId = null,
  completedAt,
} = {}) => {
  const workoutPlanId = requiredUuid(plan?.id, 'workoutPlanId');
  const safeClientId = positiveInteger(clientId, 'clientId');
  const weekNumber = positiveInteger(assignment?.weekNumber, 'weekNumber');
  const dayNumber = positiveInteger(assignment?.dayNumber, 'dayNumber');
  const occurrenceIndex = positiveInteger(assignment?.occurrenceIndex ?? 1, 'occurrenceIndex');
  const assignmentId = compactString(assignment?.assignmentId || assignment?.assignmentKey);
  const scheduledDate = compactString(assignment?.scheduledDate, 10);
  const safeDailyFormId = compactString(dailyWorkoutFormId, 64);
  if (!assignmentId) fail('Completion receipt assignment id is required', 'WORKOUT_PLAN_COMPLETION_EVIDENCE_INVALID', 'assignmentId', 400);
  if (!safeDailyFormId) fail('Completion receipt workout form id is required', 'WORKOUT_PLAN_COMPLETION_EVIDENCE_INVALID', 'dailyWorkoutFormId', 400);
  if (!isRealDateOnly(scheduledDate)) {
    fail('Completion receipt scheduled date is invalid', 'WORKOUT_PLAN_COMPLETION_DATE_INVALID', 'scheduledDate', 400);
  }

  const dayKey = `w${weekNumber}:d${dayNumber}`;
  const identity = prescribedIdentity(plan);
  const values = {
    workoutPlanId,
    clientId: safeClientId,
    dayKey,
    assignmentId,
    occurrenceIndex,
    scheduledDate,
    ...identity,
    exerciseSnapshot: buildExerciseSnapshot(prescribedEntry),
    dailyWorkoutFormId: safeDailyFormId,
    workoutSessionId: compactString(workoutSessionId, 64),
    completedAt: validCompletedAt(completedAt),
  };
  values.idempotencyKey = buildIdempotencyKey(values);
  return values;
};

const plainReceipt = (receipt) => {
  if (typeof receipt?.get === 'function') return receipt.get({ plain: true });
  return receipt?.dataValues || receipt || {};
};

const comparableValue = (field, value) => (
  field === 'completedAt' && value ? new Date(value).toISOString() : value
);

const isExactReceipt = (receipt, values) => {
  const plain = plainReceipt(receipt);
  return IMMUTABLE_FIELDS.every((field) => isDeepStrictEqual(
    comparableValue(field, plain[field]),
    comparableValue(field, values[field]),
  ));
};

export const assertWorkoutPlanCompletionReceiptBoundary = ({
  WorkoutPlanCompletionReceipt,
  transaction,
} = {}) => {
  if (typeof WorkoutPlanCompletionReceipt?.findOrCreate !== 'function') {
    fail('Workout plan completion receipt model is unavailable', 'WORKOUT_PLAN_COMPLETION_MODEL_UNAVAILABLE');
  }
  if (!transaction) {
    fail('Workout plan completion receipt transaction is required', 'WORKOUT_PLAN_COMPLETION_TRANSACTION_REQUIRED');
  }
};

export const createWorkoutPlanCompletionReceipt = async ({
  WorkoutPlanCompletionReceipt,
  transaction,
  ...input
} = {}) => {
  assertWorkoutPlanCompletionReceiptBoundary({ WorkoutPlanCompletionReceipt, transaction });
  const values = buildWorkoutPlanCompletionReceiptValues(input);
  const [receipt, created] = await WorkoutPlanCompletionReceipt.findOrCreate({
    where: { idempotencyKey: values.idempotencyKey },
    defaults: values,
    transaction,
  });
  if (!created && !isExactReceipt(receipt, values)) {
    fail('Completion receipt identity resolved to different evidence', 'WORKOUT_PLAN_COMPLETION_RECEIPT_CONFLICT', 'idempotencyKey', 409);
  }
  return { receipt, created, idempotencyKey: values.idempotencyKey };
};
