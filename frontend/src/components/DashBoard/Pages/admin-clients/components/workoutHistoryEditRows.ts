import type { WorkoutLogEntry } from '../../../../../hooks/analytics/useWorkoutAnalytics';

export function updateWorkoutEditField(
  logs: WorkoutLogEntry[],
  logIndex: number,
  field: keyof WorkoutLogEntry,
  value: string,
): WorkoutLogEntry[] {
  return logs.map((log, index) => {
    if (index !== logIndex) return log;
    if (field === 'notes' || field === 'tempo') {
      return { ...log, [field]: value };
    }
    const trimmed = value.trim();
    if (trimmed === '') {
      return { ...log, [field]: undefined as unknown as number };
    }
    const numericValue = Number(trimmed);
    return { ...log, [field]: Number.isFinite(numericValue) ? numericValue : 0 };
  });
}

export function removeWorkoutEditRow(
  logs: WorkoutLogEntry[],
  logIndex: number,
): WorkoutLogEntry[] {
  return logs.filter((_, index) => index !== logIndex);
}

export function updateWorkoutExerciseNote(
  logs: WorkoutLogEntry[],
  exerciseName: string,
  value: string,
): WorkoutLogEntry[] {
  const nextValue = value.trim().length > 0 ? value : undefined;
  return logs.map((log) =>
    log.exerciseName === exerciseName ? { ...log, exerciseNote: nextValue } : log,
  );
}

export function appendWorkoutEditRow(
  logs: WorkoutLogEntry[],
  exerciseName: string,
  temporaryId: number,
): WorkoutLogEntry[] {
  const existingSets = logs.filter((log) => log.exerciseName === exerciseName);
  const exerciseNote = existingSets.find((log) => log.exerciseNote?.trim())?.exerciseNote;
  const nextRow: WorkoutLogEntry = {
    id: temporaryId,
    exerciseName,
    setNumber: existingSets.length + 1,
    reps: 0,
    weight: 0,
    ...(exerciseNote ? { exerciseNote } : {}),
  };

  return [...logs, nextRow];
}
