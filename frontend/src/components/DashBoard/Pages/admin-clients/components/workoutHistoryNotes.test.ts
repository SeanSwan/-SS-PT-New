import { describe, expect, it } from 'vitest';
import {
  EXERCISE_NOTE_SEPARATOR,
  buildWorkoutHistoryNotesDisplay,
  resolveExerciseNote,
  splitLegacyStoredNote,
} from './workoutHistoryNotes';

describe('workoutHistoryNotes', () => {
  it('splits only the legacy separator form', () => {
    expect(splitLegacyStoredNote(`grip slipped${EXERCISE_NOTE_SEPARATOR}hips tight`)).toEqual({
      setNote: 'grip slipped',
      exerciseNote: 'hips tight',
    });
  });

  it('keeps bare Coach prefixes as set notes', () => {
    expect(splitLegacyStoredNote('Coach: said this was heavy')).toEqual({
      setNote: 'Coach: said this was heavy',
      exerciseNote: '',
    });
  });

  it('prefers canonical exerciseNote from any row in the group', () => {
    const result = resolveExerciseNote([
      { notes: 'set note only' },
      { exerciseNote: 'knees caved on last set' },
    ] as any);

    expect(result).toEqual({
      exerciseNote: 'knees caved on last set',
      source: 'canonical',
    });
  });

  it('falls back to legacy separator rows without promoting bare Coach prefixes', () => {
    expect(resolveExerciseNote([
      { notes: `set note${EXERCISE_NOTE_SEPARATOR}legacy coach note` },
    ] as any)).toEqual({
      exerciseNote: 'legacy coach note',
      source: 'legacy',
    });

    expect(resolveExerciseNote([
      { notes: 'Coach: literal set note' },
    ] as any)).toEqual({
      exerciseNote: '',
      source: 'empty',
    });
  });

  it('builds canonical display rows without stripping literal Coach set notes', () => {
    const activeLogs = [
      { id: 1, notes: 'Coach: literal set note', exerciseNote: 'bar path drifted' },
      { id: 2, notes: 'strong lockout', exerciseNote: 'bar path drifted' },
    ] as any;

    const display = buildWorkoutHistoryNotesDisplay(activeLogs, activeLogs);

    expect(display.exerciseNoteValue).toBe('bar path drifted');
    expect(display.isLegacy).toBe(false);
    expect(display.setNotesPresent).toBe(true);
    expect(display.anyNoteAtAll).toBe(true);
    expect(display.perSetDisplay.map((row) => [row.logIndex, row.setNote])).toEqual([
      [0, 'Coach: literal set note'],
      [1, 'strong lockout'],
    ]);
  });

  it('strips legacy exercise markers from per-set display rows', () => {
    const activeLogs = [
      { id: 1, notes: `grip slipped${EXERCISE_NOTE_SEPARATOR}keep shoulders packed` },
      { id: 2, notes: '' },
    ] as any;

    const display = buildWorkoutHistoryNotesDisplay(activeLogs, activeLogs);

    expect(display.exerciseNoteValue).toBe('keep shoulders packed');
    expect(display.isLegacy).toBe(true);
    expect(display.perSetDisplay.map((row) => row.setNote)).toEqual(['grip slipped', '']);
  });

  it('reports empty note state when no exercise or set notes exist', () => {
    const activeLogs = [{ id: 1, notes: '', exerciseNote: '' }] as any;

    const display = buildWorkoutHistoryNotesDisplay(activeLogs, activeLogs);

    expect(display.setNotesPresent).toBe(false);
    expect(display.anyNoteAtAll).toBe(false);
  });
});
