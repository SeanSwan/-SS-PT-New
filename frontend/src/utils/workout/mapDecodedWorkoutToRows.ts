/**
 * UTIL: mapDecodedWorkoutToRows (S8 — JARVIS blueprint §6.2)
 * PURPOSE: THE single decoded-workout → logger-row mapper. Wraps the proven
 * `parsedWorkoutToExerciseEntries` (same ExerciseEntry shape the manual
 * logger saves — the byte-pinned POST /api/workout-forms body is untouched
 * because committed rows enter the SAME logger state the manual path uses)
 * and adds the review metadata the S8 surface needs: per-row confidence
 * flags, "check this" fields, pain flags surfaced (NEVER auto-committed),
 * and the aggregate needs-review marker that persists past commit.
 * Doors: voice overlay (S9) · History Import draft · PLAUD inbox (S12).
 */

import type { ExerciseEntry } from '../../services/nasmApiService';
import type { ParsedWorkout } from '../../components/WorkoutLogger/VoiceMemoUpload';
import { parsedWorkoutToExerciseEntries } from '../../components/WorkoutLogger/workoutLoggerVoiceImport';

export const LOW_CONFIDENCE_THRESHOLD = 0.75;

export interface DecodedRowFlags {
  lowConfidence: boolean;
  /** Field names the trainer should eyeball ("check this" affordance). */
  checkFields: string[];
}

export interface DecodedWorkoutReview {
  rows: ExerciseEntry[];
  flagsByExerciseId: Record<string, DecodedRowFlags>;
  painFlags: NonNullable<ParsedWorkout['painFlags']>;
  /** True when any row is low-confidence — persists on the session after commit. */
  needsReview: boolean;
  confidence: number | null;
}

export function mapDecodedWorkoutToRows(
  workout: ParsedWorkout,
  idPrefix?: string,
): DecodedWorkoutReview {
  const rows = idPrefix
    ? parsedWorkoutToExerciseEntries(workout, idPrefix)
    : parsedWorkoutToExerciseEntries(workout);
  const aggregate = typeof workout.confidence === 'number' ? workout.confidence : null;
  const aggregateLow = aggregate !== null && aggregate < LOW_CONFIDENCE_THRESHOLD;

  const flagsByExerciseId: Record<string, DecodedRowFlags> = {};
  rows.forEach((row, index) => {
    const source = workout.exercises[index];
    const checkFields: string[] = [];
    source?.sets?.forEach((set, setIndex) => {
      if (set.weight === null || set.weight === undefined) checkFields.push(`set ${setIndex + 1} weight`);
      if (!set.reps) checkFields.push(`set ${setIndex + 1} reps`);
    });
    flagsByExerciseId[row.exerciseId] = {
      lowConfidence: aggregateLow || checkFields.length > 0,
      checkFields,
    };
  });

  return {
    rows,
    flagsByExerciseId,
    painFlags: workout.painFlags ?? [],
    needsReview: aggregateLow || Object.values(flagsByExerciseId).some(flag => flag.lowConfidence),
    confidence: aggregate,
  };
}
