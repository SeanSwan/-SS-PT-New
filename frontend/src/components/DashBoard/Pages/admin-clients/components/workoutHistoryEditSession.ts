/**
 * COMPONENT: workoutHistoryEditSession
 * PURPOSE: Builds editable workout-log rows from canonical or legacy session data.
 */

import type {
  WorkoutLogEntry,
  WorkoutSession,
} from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { resolveExerciseNote, splitLegacyStoredNote } from './workoutHistoryNotes';

export function buildEditableWorkoutLogs(session: Pick<WorkoutSession, 'logs'>): WorkoutLogEntry[] {
  const migrated: WorkoutLogEntry[] = [];
  const groups = new Map<string, WorkoutLogEntry[]>();

  for (const log of session.logs) {
    if (!groups.has(log.exerciseName)) {
      groups.set(log.exerciseName, []);
    }
    groups.get(log.exerciseName)!.push({ ...log });
  }

  for (const rows of groups.values()) {
    const { exerciseNote, source } = resolveExerciseNote(rows);

    if (source === 'legacy' && exerciseNote) {
      for (const row of rows) {
        const split = splitLegacyStoredNote(row.notes);
        row.notes = split.setNote || undefined;
        row.exerciseNote = exerciseNote;
      }
    } else if (source === 'canonical' && exerciseNote) {
      for (const row of rows) {
        row.exerciseNote = exerciseNote;
      }
    }

    migrated.push(...rows);
  }

  return migrated;
}
