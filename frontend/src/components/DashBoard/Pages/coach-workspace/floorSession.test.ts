/**
 * Floor mode's pure half: reading a plan scheme, hearing a set in a sentence, and
 * producing EXACTLY the Workout Logger's canonical /api/workout-forms body.
 */
import { describe, expect, it } from 'vitest';
import { floorExerciseEntries, floorStorageKey, localDateISO, loggedSetCount, nextReps, nextWeight, parseSetScheme, parseSetUtterance } from './floorSession';
import { buildWorkoutFormSubmitBody } from '../../../WorkoutLogger/workoutLoggerSubmitPayload';

describe('parseSetScheme', () => {
  it('reads sets × reps in the shapes plans use', () => {
    expect(parseSetScheme('3 × 10')).toEqual({ sets: 3, reps: 10 });
    expect(parseSetScheme('4x8-10')).toEqual({ sets: 4, reps: 8 });
    expect(parseSetScheme('3 sets')).toEqual({ sets: 3, reps: null });
  });
  it('CONTROL: unknown schemes stay unknown', () => {
    expect(parseSetScheme('—')).toEqual({ sets: null, reps: null });
    expect(parseSetScheme(null)).toEqual({ sets: null, reps: null });
  });
});

describe('parseSetUtterance — a set said out loud', () => {
  it.each([
    ['145 for 6', { weight: 145, reps: 6 }],
    ['…five at one-forty-five, then 145 x 5', { weight: 145, reps: 5 }],
    ['135 lb × 8', { weight: 135, reps: 8 }],
    ['6 reps at 145', { weight: 145, reps: 6 }],
    ['8 at 115 pounds', { weight: 115, reps: 8 }],
  ])('%s', (text, expected) => {
    expect(parseSetUtterance(text)).toEqual(expected);
  });
  it('CONTROL: words, questions and impossible numbers are not sets', () => {
    expect(parseSetUtterance('five at one forty five')).toBeNull();
    expect(parseSetUtterance("how is Maria's knee?")).toBeNull();
    expect(parseSetUtterance('145 for 0')).toBeNull();
    expect(parseSetUtterance('9999 for 5')).toBeNull();
  });
});

describe('steppers never produce nonsense', () => {
  it('weight clamps at 0 and rounds to the half pound; reps clamp at 0', () => {
    expect(nextWeight(2.5, -5)).toBe(0);
    expect(nextWeight(145, 5)).toBe(150);
    expect(nextReps(0, -1)).toBe(0);
    expect(nextReps(5, 1)).toBe(6);
  });
});

describe('floorExerciseEntries → the canonical submit body', () => {
  it('only logged exercises travel, numbered sets, the logger omission contract holds', () => {
    const entries = floorExerciseEntries([
      { name: 'Box squat', targetSets: 4, targetReps: 6, sets: [{ weight: 145, reps: 6 }, { weight: 145, reps: 5 }] },
      { name: 'Step-up', targetSets: 3, targetReps: 10, sets: [] },
      { name: '  ', targetSets: null, targetReps: null, sets: [{ weight: 10, reps: 5 }] },
    ]);
    const body = buildWorkoutFormSubmitBody({ clientId: 84, date: '2026-09-23', exercises: entries, sessionNotes: 'x', overallIntensity: null });
    expect(body.exercises).toHaveLength(1);
    expect(body.exercises[0]).toMatchObject({ exerciseName: 'Box squat', painLevel: 0 });
    expect(body.exercises[0].sets).toEqual([
      { setNumber: 1, weight: 145, reps: 6, restTime: 0, setType: 'working', notes: undefined, tempo: undefined },
      { setNumber: 2, weight: 145, reps: 5, restTime: 0, setType: 'working', notes: undefined, tempo: undefined },
    ]);
    expect(body.exercises[0]).not.toHaveProperty('formRating'); // null ratings are omitted on the wire
    expect(body).not.toHaveProperty('overallIntensity');
  });
  it('counts, the local day, and the storage key are stable', () => {
    expect(loggedSetCount([{ name: 'a', targetSets: null, targetReps: null, sets: [{ weight: 1, reps: 1 }, { weight: 1, reps: 1 }] }])).toBe(2);
    expect(localDateISO(new Date(2026, 8, 3, 23, 30))).toBe('2026-09-03');
    expect(floorStorageKey('1:trainer', 84, '2026-09-23')).toBe('swan-coach:floor:v1:1:trainer:84:2026-09-23');
  });
});
