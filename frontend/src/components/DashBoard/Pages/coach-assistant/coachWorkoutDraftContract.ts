import type { SubmittedDraft } from './coachSessionDraftState';

export type CoachWorkoutUnit = 'lb' | 'kg' | 'bodyweight';

export interface CoachWorkoutSetDraft {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  tempo?: string | null;
  restTime?: number | null;
  rpe?: number | null;
  notes?: string | null;
  setType?: string | null;
  isometricHoldSeconds?: number | null;
}

export interface CoachWorkoutExerciseDraft {
  exerciseInstanceId: string;
  exerciseId?: string;
  exerciseKey?: string;
  exerciseName: string;
  unit: CoachWorkoutUnit;
  exerciseNote?: string | null;
  sets: CoachWorkoutSetDraft[];
}

export interface CoachWorkoutDraftContent {
  date: string | null;
  title?: string | null;
  notes?: string | null;
  duration?: number | null;
  intensity?: number | null;
  source?: string | null;
  exercises: CoachWorkoutExerciseDraft[];
}

export interface CoachWorkoutDraftRequest {
  schemaVersion: 1;
  taskId: string;
  requestKey: string;
  draftRevision: number;
  targetUserId: number;
  workout: CoachWorkoutDraftContent & { clientId: number };
}

export type CoachWorkoutDraftValidationCode =
  | 'CONTENT_REQUIRED'
  | 'DATE_REQUIRED'
  | 'DATE_INVALID'
  | 'EXERCISES_REQUIRED'
  | 'EXERCISES_INVALID'
  | 'EXERCISE_ID_REQUIRED'
  | 'EXERCISE_INSTANCE_REQUIRED'
  | 'EXERCISE_NAME_REQUIRED'
  | 'UNIT_REQUIRED'
  | 'UNIT_MAPPING_REQUIRED'
  | 'SETS_REQUIRED'
  | 'SET_ORDER_INVALID'
  | 'REPS_REQUIRED'
  | 'REPS_INVALID'
  | 'WEIGHT_REQUIRED'
  | 'WEIGHT_INVALID'
  | 'BODYWEIGHT_MUST_BE_ZERO'
  | 'TASK_ID_INVALID'
  | 'REQUEST_KEY_INVALID'
  | 'REVISION_INVALID'
  | 'ROLE_NOT_ALLOWED';

export class CoachWorkoutDraftContractError extends Error {
  readonly code: CoachWorkoutDraftValidationCode;

  constructor(code: CoachWorkoutDraftValidationCode, message: string = code) {
    super(message);
    this.name = 'CoachWorkoutDraftContractError';
    this.code = code;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedUnits = new Set<CoachWorkoutUnit>(['lb', 'kg', 'bodyweight']);

const fail = (code: CoachWorkoutDraftValidationCode, message: string): never => {
  throw new CoachWorkoutDraftContractError(code, message);
};

const isFiniteNonNegative = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0
);

const isDateOnly = (value: unknown): value is string => (
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
);

export interface CoachWorkoutDraftValidationOptions {
  allowIncomplete?: boolean;
}

const validateSet = (set: CoachWorkoutSetDraft, unit: CoachWorkoutUnit, ordinals: Set<number>, allowIncomplete: boolean): CoachWorkoutSetDraft => {
  if (!Number.isSafeInteger(set?.setNumber) || set.setNumber < 1 || ordinals.has(set.setNumber)) {
    fail('SET_ORDER_INVALID', 'Set numbers must be unique positive integers.');
  }
  ordinals.add(set.setNumber);
  const reps = set.reps;
  if (reps === null) {
    if (allowIncomplete) return { ...set };
    fail('REPS_REQUIRED', 'Each set needs an exact nonnegative repetition count.');
  }
  const numericReps = typeof reps === 'number' ? reps : NaN;
  if (!Number.isSafeInteger(numericReps) || numericReps < 0) fail('REPS_REQUIRED', 'Each set needs an exact nonnegative repetition count.');
  if (set.weight === null || set.weight === undefined) {
    if (allowIncomplete) return { ...set };
    fail('WEIGHT_REQUIRED', 'Each set needs an explicit load; use zero for bodyweight.');
  }
  if (!isFiniteNonNegative(set.weight)) fail('WEIGHT_INVALID', 'Set load must be a finite nonnegative number.');
  if (unit === 'bodyweight' && set.weight !== 0) fail('BODYWEIGHT_MUST_BE_ZERO', 'Bodyweight sets must use an explicit zero load.');
  return { ...set };
};

export function validateCoachWorkoutContent(content: unknown, options: CoachWorkoutDraftValidationOptions = {}): CoachWorkoutDraftContent {
  const allowIncomplete = options.allowIncomplete !== false;
  if (!content || typeof content !== 'object' || Array.isArray(content)) fail('CONTENT_REQUIRED', 'Workout draft content is required.');
  const value = content as Partial<CoachWorkoutDraftContent>;
  if (!isDateOnly(value.date)) fail(value.date ? 'DATE_INVALID' : 'DATE_REQUIRED', 'Workout date must be a valid YYYY-MM-DD date.');
  if (!Array.isArray(value.exercises)) {
    fail('EXERCISES_REQUIRED', 'Provide between 1 and 100 workout exercises.');
  }
  const sourceExercises = value.exercises as CoachWorkoutExerciseDraft[];
  if (sourceExercises.length === 0 || sourceExercises.length > 100) {
    fail('EXERCISES_REQUIRED', 'Provide between 1 and 100 workout exercises.');
  }
  const instances = new Set<string>();
  const exercises = sourceExercises.map((exercise) => {
    if (!exercise || typeof exercise !== 'object') fail('EXERCISES_INVALID', 'Workout exercises must be objects.');
    const item = exercise as CoachWorkoutExerciseDraft;
    if (!item.exerciseId && !item.exerciseKey) fail('EXERCISE_ID_REQUIRED', 'Resolve every exercise through the canonical exercise library.');
    if (typeof item.exerciseInstanceId !== 'string' || !item.exerciseInstanceId.trim() || instances.has(item.exerciseInstanceId)) {
      fail('EXERCISE_INSTANCE_REQUIRED', 'Every exercise instance needs a unique identity.');
    }
    instances.add(item.exerciseInstanceId);
    if (typeof item.exerciseName !== 'string' || !item.exerciseName.trim()) fail('EXERCISE_NAME_REQUIRED', 'Every exercise needs its canonical name.');
    if (!allowedUnits.has(item.unit)) fail('UNIT_REQUIRED', 'Every exercise needs an explicit supported load unit.');
    if (!Array.isArray(item.sets) || item.sets.length === 0 || item.sets.length > 200) fail('SETS_REQUIRED', 'Provide between 1 and 200 explicit sets.');
    const ordinals = new Set<number>();
    return { ...item, sets: item.sets.map((set) => validateSet(set, item.unit, ordinals, allowIncomplete)) };
  });
  const date = value.date as string;
  return { ...value, date, exercises };
}

export function buildCoachWorkoutDraftRequest(submitted: SubmittedDraft): CoachWorkoutDraftRequest {
  if (!submitted || !UUID.test(submitted.taskId)) fail('TASK_ID_INVALID', 'Submitted workout task identity is invalid.');
  if (!UUID.test(submitted.requestKey)) fail('REQUEST_KEY_INVALID', 'Submitted workout request identity is invalid.');
  if (!Number.isSafeInteger(submitted.submittedRevision) || submitted.submittedRevision < 0) fail('REVISION_INVALID', 'Submitted workout revision is invalid.');
  const role = submitted.snapshot.actorRole.trim().toLowerCase();
  if (!['admin', 'trainer'].includes(role)) fail('ROLE_NOT_ALLOWED', 'Only trainer and admin actors can submit workout drafts.');
  const content = validateCoachWorkoutContent(submitted.snapshot.content, { allowIncomplete: false });
  if (content.exercises.some((exercise) => exercise.unit === 'kg')) {
    fail('UNIT_MAPPING_REQUIRED', 'Kilogram input requires an approved unit mapping before save.');
  }
  return {
    schemaVersion: 1,
    taskId: submitted.taskId,
    requestKey: submitted.requestKey,
    draftRevision: submitted.submittedRevision,
    targetUserId: submitted.targetUserId,
    workout: { ...content, clientId: submitted.targetUserId },
  };
}
