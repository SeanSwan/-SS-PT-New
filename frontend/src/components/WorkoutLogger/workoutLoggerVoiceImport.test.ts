import { describe, expect, it } from 'vitest';
import {
  appendImportedSessionNotes,
  parsedWorkoutToExerciseEntries,
} from './workoutLoggerVoiceImport';

describe('workoutLoggerVoiceImport', () => {
  it('converts parsed upload exercises into null-honest WorkoutLogger entries', () => {
    const entries = parsedWorkoutToExerciseEntries({
      exercises: [
        {
          exerciseName: ' Dumbbell Row ',
          sets: [
            { setNumber: 1, weight: 50, reps: 10, rpe: 7, formQuality: 4, notes: 'clean' },
            { setNumber: 2, weight: null, reps: 8 },
          ],
          formRating: undefined,
          painLevel: 0,
          performanceNotes: 'stable tempo',
        },
      ],
    }, 'voice-test');

    expect(entries).toEqual([
      {
        exerciseId: 'voice-test-1',
        exerciseName: 'Dumbbell Row',
        sets: [
          { setNumber: 1, weight: 50, reps: 10, rpe: 7, tempo: '', restTime: 60, formQuality: 4, notes: 'clean' },
          { setNumber: 2, weight: 0, reps: 8, rpe: null, tempo: '', restTime: 60, formQuality: null, notes: '' },
        ],
        formRating: null,
        painLevel: 0,
        performanceNotes: 'stable tempo',
      },
    ]);
  });

  it('adds a fallback set when the parsed exercise has no sets', () => {
    const entries = parsedWorkoutToExerciseEntries({
      exercises: [{ exerciseName: 'Plank', sets: [] }],
    }, 'voice-test');

    expect(entries[0].sets).toEqual([
      { setNumber: 1, weight: 0, reps: 0, rpe: null, tempo: '', restTime: 60, formQuality: null, notes: '' },
    ]);
  });

  it('appends parsed session notes without overwriting existing notes', () => {
    expect(appendImportedSessionNotes('Existing note', 'Imported note')).toBe('Existing note\n\nImported note');
    expect(appendImportedSessionNotes('', 'Imported note')).toBe('Imported note');
    expect(appendImportedSessionNotes('Existing note', '')).toBe('Existing note');
  });
});
