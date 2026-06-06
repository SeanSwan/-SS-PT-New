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
  isBillable: false;
  shouldDeductSession: false;
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
  painLevel: number;
  performanceNotes?: string;
  sets: SanitizedSet[];
  formRating?: number;
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
}

const compactString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const positiveInteger = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

function sanitizePlannedAssignment(value?: PlannedAssignmentInput | null): SanitizedPlannedAssignment | null {
  if (!value) return null;
  const assignmentKey = compactString(value.assignmentKey || value.assignmentId);
  const planId = compactString(String(value.planId ?? ''));
  const assignmentType = compactString(value.assignmentType)?.toLowerCase().replace(/[\s-]+/g, '_') || null;
  const weekNumber = positiveInteger(value.weekNumber);
  const dayNumber = positiveInteger(value.dayNumber);
  if (!assignmentKey || !planId || !assignmentType || !weekNumber || !dayNumber) return null;
  if (!['homework', 'active_recovery'].includes(assignmentType)) return null;

  const out: SanitizedPlannedAssignment = {
    assignmentId: assignmentKey,
    assignmentKey,
    planId,
    assignmentType,
    source: 'workout_plan',
    isBillable: false,
    shouldDeductSession: false,
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
        };
        if (s.rpe !== null && s.rpe !== undefined) setOut.rpe = s.rpe;
        if (s.formQuality !== null && s.formQuality !== undefined) setOut.formQuality = s.formQuality;
        return setOut;
      }),
    };
    if (ex.formRating !== null && ex.formRating !== undefined) {
      out.formRating = ex.formRating;
    }
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
  const plannedAssignment = sanitizePlannedAssignment(params.plannedAssignment);
  if (plannedAssignment) {
    body.plannedAssignment = plannedAssignment;
  }
  return body;
}
