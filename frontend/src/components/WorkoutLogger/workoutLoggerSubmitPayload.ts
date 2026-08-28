/**
 * Phase 16 (2026-04-16) — WorkoutLogger submit-payload builder
 * ================================================================
 * Extracted from WorkoutLogger.tsx handleSubmit so the wire contract
 * ("omit untouched rating fields") is independently unit-testable.
 *
 * Wire contract (Phase 16 pinned):
 *   - When `overallIntensity` is null/undefined, the key is OMITTED
 *     from the submit body.
 *   - When any `set.rpe` / `set.formQuality` / `exercise.formRating`
 *     is null/undefined, that key is OMITTED from the per-set/-exercise
 *     object on the wire.
 *   - Non-null values pass through unchanged.
 *
 * The backend (dailyWorkoutFormRoutes POST, workoutLogService
 * logWorkoutForClient) accepts both "missing key" and "explicit null"
 * symmetrically and persists DB null in either case. The frontend
 * picks the cleaner shape (omission) so wire payloads never serialize
 * `null` on rating fields.
 */

import type { ExerciseEntry } from '../../services/nasmApiService';

/**
 * The shape that /api/workout-forms actually receives post-sanitization.
 * Rating fields are optional — their absence communicates "not rated".
 */
export interface WorkoutFormSubmitBody {
  clientId: number;
  date: string;
  exercises: SanitizedExercise[];
  sessionNotes: string;
  overallIntensity?: number;
  scheduledSessionId?: string;
  equipmentProfileId?: number;
  plannedAssignment?: SanitizedPlannedAssignment;
}

export interface PlannedAssignmentInput {
  assignmentId?: string | null;
  assignmentKey?: string | null;
  planId?: string | number | null;
  assignmentType?: string | null;
  source?: string | null;
  isBillable?: boolean | null;
  shouldDeductSession?: boolean | null;
  title?: string | null;
  scheduledDate?: string | null;
  weekNumber?: number | string | null;
  dayNumber?: number | string | null;
  dayLabel?: string | null;
  exerciseCount?: number | null;
  firstExerciseName?: string | null;
}

interface SanitizedPlannedAssignment {
  assignmentId: string;
  assignmentKey: string;
  planId: string;
  assignmentType: string;
  source: 'workout_plan';
  isBillable: boolean;
  shouldDeductSession: boolean;
  weekNumber: number;
  dayNumber: number;
  title?: string;
  scheduledDate?: string;
  dayLabel?: string;
  exerciseCount?: number;
  firstExerciseName?: string;
}

interface SanitizedExercise {
  exerciseId: string;
  exerciseName: string;
  circuitName?: string;
  circuitOrder?: number;
  exerciseRole?: string;
  painLevel: number;
  performanceNotes?: string;
  sets: SanitizedSet[];
  formRating?: number;
  category?: string;
  exerciseFamily?: string;
  movementPattern?: string;
  nasmMovementPattern?: string;
  bodyPartCategory?: string;
  muscleGroups?: string[];
  tags?: string[];
}

interface SanitizedSet {
  setNumber: number;
  weight: number;
  reps: number;
  tempo?: string;
  restTime?: number;
  notes?: string;
  rpe?: number;
  formQuality?: number;
  setType?: string;
  isometricHoldSeconds?: number;
}

type ExerciseClassificationMetadata = {
  category?: unknown;
  exerciseFamily?: unknown;
  movementPattern?: unknown;
  nasmMovementPattern?: unknown;
  bodyPartCategory?: unknown;
  muscleGroups?: unknown;
  tags?: unknown;
};

const compactString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const compactStringArray = (value: unknown) => (
  Array.isArray(value)
    ? value.map(compactString).filter((item): item is string => Boolean(item))
    : []
);
const positiveInteger = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

function copyExerciseClassificationMetadata(
  out: SanitizedExercise,
  exercise: ExerciseEntry,
): void {
  const source = exercise as ExerciseEntry & ExerciseClassificationMetadata;
  const target = out as SanitizedExercise & Record<string, unknown>;

  for (const key of ['category', 'exerciseFamily', 'movementPattern', 'nasmMovementPattern', 'bodyPartCategory']) {
    const value = compactString(source[key as keyof ExerciseClassificationMetadata]);
    if (value) target[key] = value;
  }

  for (const key of ['muscleGroups', 'tags']) {
    const values = compactStringArray(source[key as keyof ExerciseClassificationMetadata]);
    if (values.length > 0) target[key] = values;
  }
}

function sanitizePlannedAssignment(
  value?: PlannedAssignmentInput | null,
  options: { hasScheduledSession?: boolean } = {},
): SanitizedPlannedAssignment | null {
  if (!value) return null;
  const assignmentKey = compactString(value.assignmentKey || value.assignmentId);
  const planId = compactString(String(value.planId ?? ''));
  const assignmentType = compactString(value.assignmentType)?.toLowerCase().replace(/[\s-]+/g, '_') || null;
  const weekNumber = positiveInteger(value.weekNumber);
  const dayNumber = positiveInteger(value.dayNumber);
  if (!assignmentKey || !planId || !assignmentType || !weekNumber || !dayNumber) return null;
  const allowedTypes = options.hasScheduledSession
    ? ['trainer_session']
    : ['homework', 'active_recovery'];
  if (!allowedTypes.includes(assignmentType)) return null;

  const out: SanitizedPlannedAssignment = {
    assignmentId: assignmentKey,
    assignmentKey,
    planId,
    assignmentType,
    source: 'workout_plan',
    isBillable: assignmentType === 'trainer_session',
    shouldDeductSession: assignmentType === 'trainer_session'
      ? value.shouldDeductSession === true
      : false,
    weekNumber,
    dayNumber,
  };
  const title = compactString(value.title);
  const scheduledDate = compactString(value.scheduledDate);
  const dayLabel = compactString(value.dayLabel);
  const firstExerciseName = compactString(value.firstExerciseName);
  const exerciseCount = positiveInteger(value.exerciseCount);
  if (title) out.title = title;
  if (scheduledDate) out.scheduledDate = scheduledDate;
  if (dayLabel) out.dayLabel = dayLabel;
  if (firstExerciseName) out.firstExerciseName = firstExerciseName;
  if (exerciseCount) out.exerciseCount = exerciseCount;
  return out;
}

/**
 * Strip null/undefined rating fields from an exercise array.
 * Returns a fresh array; does not mutate the input.
 */
// fallow-ignore-next-line unused-export
export function stripNullRatings(exercises: ExerciseEntry[]): SanitizedExercise[] {
  return exercises.map((ex) => {
    const out: SanitizedExercise = {
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      painLevel: ex.painLevel,
      performanceNotes: ex.performanceNotes,
      sets: ex.sets.map((s) => {
        const setOut: SanitizedSet = {
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          tempo: s.tempo,
          restTime: s.restTime,
          notes: s.notes,
          setType: s.setType || 'working',
          isometricHoldSeconds: s.isometricHoldSeconds,
        };
        if (s.rpe !== null && s.rpe !== undefined) setOut.rpe = s.rpe;
        if (s.formQuality !== null && s.formQuality !== undefined) setOut.formQuality = s.formQuality;
        return setOut;
      }),
    };
    if (ex.formRating !== null && ex.formRating !== undefined) {
      out.formRating = ex.formRating;
    }
    const circuitName = compactString(ex.circuitName);
    const exerciseRole = compactString(ex.exerciseRole);
    if (circuitName) out.circuitName = circuitName;
    if (positiveInteger(ex.circuitOrder)) out.circuitOrder = positiveInteger(ex.circuitOrder)!;
    if (exerciseRole) out.exerciseRole = exerciseRole;
    copyExerciseClassificationMetadata(out, ex);
    return out;
  });
}

/**
 * Build the canonical /api/workout-forms submit body.
 * Applies the Phase 16 omission contract end-to-end.
 */
export function buildWorkoutFormSubmitBody(params: {
  clientId: number;
  date: string;
  exercises: ExerciseEntry[];
  sessionNotes: string;
  overallIntensity: number | null | undefined;
  scheduledSessionId?: string | null;
  equipmentProfileId?: number | null;
  plannedAssignment?: PlannedAssignmentInput | null;
}): WorkoutFormSubmitBody {
  const body: WorkoutFormSubmitBody = {
    clientId: params.clientId,
    date: params.date,
    exercises: stripNullRatings(params.exercises),
    sessionNotes: params.sessionNotes,
  };
  if (params.overallIntensity !== null && params.overallIntensity !== undefined) {
    body.overallIntensity = params.overallIntensity;
  }
  if (params.scheduledSessionId) {
    body.scheduledSessionId = params.scheduledSessionId;
  }
  if (params.equipmentProfileId !== null && params.equipmentProfileId !== undefined) {
    body.equipmentProfileId = params.equipmentProfileId;
  }
  const plannedAssignment = sanitizePlannedAssignment(params.plannedAssignment, {
    hasScheduledSession: Boolean(params.scheduledSessionId),
  });
  if (plannedAssignment) {
    body.plannedAssignment = plannedAssignment;
  }
  return body;
}
