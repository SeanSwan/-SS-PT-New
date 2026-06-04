/**
 * COMPONENT: workoutHistoryNotes
 * PURPOSE: Exercise-note classification helpers for WorkoutHistoryPanel.
 */

import type { WorkoutLogEntry } from '../../../../../hooks/analytics/useWorkoutAnalytics';

// Preserves the legacy separator stored by the old note encoder.
export const EXERCISE_NOTE_SEPARATOR = ' \u00b7 Coach: ';
export const EXERCISE_NOTE_PREFIX = 'Coach: ';

export interface SplitNote {
  setNote: string;
  exerciseNote: string;
}

export type ExerciseNoteResolution = {
  exerciseNote: string;
  source: 'canonical' | 'legacy' | 'empty';
};

export interface WorkoutHistorySetNoteDisplay {
  log: WorkoutLogEntry;
  logIndex: number;
  setNote: string;
}

export interface WorkoutHistoryNotesDisplay {
  exerciseNoteValue: string;
  isLegacy: boolean;
  perSetDisplay: WorkoutHistorySetNoteDisplay[];
  setNotesPresent: boolean;
  anyNoteAtAll: boolean;
}

export function splitLegacyStoredNote(stored: string | undefined | null): SplitNote {
  if (typeof stored !== 'string' || stored.length === 0) {
    return { setNote: '', exerciseNote: '' };
  }

  const trimmed = stored.trim();
  const sepIdx = trimmed.indexOf(EXERCISE_NOTE_SEPARATOR);
  if (sepIdx !== -1) {
    return {
      setNote: trimmed.slice(0, sepIdx).trim(),
      exerciseNote: trimmed.slice(sepIdx + EXERCISE_NOTE_SEPARATOR.length).trim(),
    };
  }

  return { setNote: trimmed, exerciseNote: '' };
}

export function resolveExerciseNote(groupSets: WorkoutLogEntry[]): ExerciseNoteResolution {
  for (const row of groupSets) {
    if (typeof row.exerciseNote === 'string' && row.exerciseNote.trim().length > 0) {
      return { exerciseNote: row.exerciseNote.trim(), source: 'canonical' };
    }
  }

  for (const row of groupSets) {
    const split = splitLegacyStoredNote(row.notes);
    if (split.exerciseNote.length > 0) {
      return { exerciseNote: split.exerciseNote, source: 'legacy' };
    }
  }

  return { exerciseNote: '', source: 'empty' };
}

export function buildWorkoutHistoryNotesDisplay(
  groupSets: WorkoutLogEntry[],
  activeLogs: WorkoutLogEntry[],
): WorkoutHistoryNotesDisplay {
  const resolved = resolveExerciseNote(groupSets);
  const exerciseNoteValue = resolved.exerciseNote;
  const isLegacy = resolved.source === 'legacy';

  const perSetDisplay = groupSets.map((log) => {
    if (isLegacy) {
      const split = splitLegacyStoredNote(log.notes);
      return {
        log,
        logIndex: activeLogs.indexOf(log),
        setNote: split.setNote,
      };
    }

    return {
      log,
      logIndex: activeLogs.indexOf(log),
      setNote: typeof log.notes === 'string' ? log.notes.trim() : '',
    };
  });
  const setNotesPresent = perSetDisplay.some((row) => row.setNote.length > 0);

  return {
    exerciseNoteValue,
    isLegacy,
    perSetDisplay,
    setNotesPresent,
    anyNoteAtAll: setNotesPresent || exerciseNoteValue.length > 0,
  };
}
