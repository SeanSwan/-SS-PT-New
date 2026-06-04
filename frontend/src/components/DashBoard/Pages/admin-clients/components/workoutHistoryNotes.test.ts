import { describe, expect, it } from 'vitest';
import {
  EXERCISE_NOTE_SEPARATOR,
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
});
