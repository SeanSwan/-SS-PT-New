/**
 * plaudMapperConvergence.test.ts — S12 fence (JARVIS blueprint §6.3).
 * RULING (Rule 52 anti-rework, recorded in docs/breadcrumbs/S12.md): the
 * PLAUD lane already reviews before any log write through its hardened
 * PlaudMergeReview surface — S12 does NOT rework it. What S12 fences here
 * is the real risk left: the PLAUD approval mapper
 * (parsedWorkoutToLogPayload) and the voice-lane mapper
 * (mapDecodedWorkoutToRows) consuming the SAME parsed shape must never
 * drift on the facts a trainer approved — exercise names, set counts,
 * weights, reps.
 */
import { describe, expect, it } from 'vitest';
import { mapDecodedWorkoutToRows } from './mapDecodedWorkoutToRows';
import { parsedWorkoutToLogPayload } from '../../components/DashBoard/Pages/coach-assistant/utils/parsedWorkoutToLogPayload';
import type { ParsedWorkout } from '../../components/WorkoutLogger/VoiceMemoUpload';

const PARSED: ParsedWorkout = {
  exercises: [
    {
      exerciseName: 'Bench Press',
      sets: [
        { setNumber: 1, weight: 185, reps: 8 },
        { setNumber: 2, weight: 185, reps: 8 },
      ],
      painLevel: 0,
    },
    { exerciseName: 'Goblet Squat', sets: [{ setNumber: 1, weight: 53, reps: 12 }] },
  ],
  sessionNotes: 'strong session',
  confidence: 0.92,
};

describe('S12 PLAUD ↔ voice mapper convergence', () => {
  it('both mappers agree on names, set counts, weights, and reps', () => {
    const voiceRows = mapDecodedWorkoutToRows(PARSED).rows;
    const plaudPayload = parsedWorkoutToLogPayload(PARSED, { clientId: 1 });
    const payloadExercises = (plaudPayload as { exercises: Array<{ exerciseName?: string; name?: string; sets: Array<{ weight: number | null; reps: number }> }> }).exercises;

    expect(voiceRows.length).toBe(payloadExercises.length);
    voiceRows.forEach((row, i) => {
      const other = payloadExercises[i];
      expect(row.exerciseName).toBe(other.exerciseName ?? other.name);
      expect(row.sets.length).toBe(other.sets.length);
      row.sets.forEach((set, j) => {
        expect(set.weight).toBe(other.sets[j].weight ?? 0);
        expect(set.reps).toBe(other.sets[j].reps);
      });
    });
  });
});
