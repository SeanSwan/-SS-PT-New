/**
 * COMPONENT: workoutHistoryEditPayload
 * PURPOSE: Builds WorkoutHistoryPanel edit PATCH payloads from edited log rows.
 */

import type { WorkoutLogEntry } from '../../../../../hooks/analytics/useWorkoutAnalytics';

export interface WorkoutEditSetPayload {
  setNumber: number;
  reps: number;
  weight: number;
  tempo?: string;
  rest?: number;
  rpe?: number;
  notes?: string;
}

export interface WorkoutEditExercisePayload {
  name: string;
  sets: WorkoutEditSetPayload[];
  exerciseNote?: string;
}

export function buildWorkoutEditExercises(editLogs: WorkoutLogEntry[]): WorkoutEditExercisePayload[] {
  const exerciseMap = new Map<string, WorkoutLogEntry[]>();

  for (const log of editLogs) {
    if (!exerciseMap.has(log.exerciseName)) {
      exerciseMap.set(log.exerciseName, []);
    }
    exerciseMap.get(log.exerciseName)!.push(log);
  }

  return Array.from(exerciseMap.entries()).map(([name, sets]) => {
    const groupExerciseNote = firstExerciseNote(sets);
    const exerciseOut: WorkoutEditExercisePayload = {
      name,
      sets: sets.map(buildSetPayload),
    };

    if (groupExerciseNote) {
      exerciseOut.exerciseNote = groupExerciseNote;
    }

    return exerciseOut;
  });
}

function firstExerciseNote(sets: WorkoutLogEntry[]): string {
  for (const row of sets) {
    if (typeof row.exerciseNote === 'string' && row.exerciseNote.trim()) {
      return row.exerciseNote.trim();
    }
  }
  return '';
}

function buildSetPayload(set: WorkoutLogEntry, index: number): WorkoutEditSetPayload {
  const out: WorkoutEditSetPayload = {
    setNumber: index + 1,
    reps: typeof set.reps === 'number' ? set.reps : 0,
    weight: typeof set.weight === 'number' ? set.weight : 0,
  };

  if (typeof set.tempo === 'string' && set.tempo.trim()) out.tempo = set.tempo.trim();
  if (typeof set.rest === 'number' && set.rest > 0) out.rest = set.rest;
  if (typeof set.rpe === 'number' && set.rpe > 0) out.rpe = set.rpe;
  if (typeof set.notes === 'string' && set.notes.trim()) out.notes = set.notes.trim();

  return out;
}
