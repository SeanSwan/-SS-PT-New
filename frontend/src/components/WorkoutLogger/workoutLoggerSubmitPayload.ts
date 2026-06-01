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

/**
 * Strip null/undefined rating fields from an exercise array.
 * Returns a fresh array; does not mutate the input.
 */
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
  return body;
}
