/**
 * Floor mode's pure half: reading a plan scheme, hearing a set in a sentence, and
 * producing EXACTLY the Workout Logger's canonical /api/workout-forms body.
 */
import { describe, expect, it } from 'vitest';
import { floorAccess, floorExerciseEntries, floorStorageKey, localDateISO, loggedSetCount, nextReps, nextWeight, parseSetScheme, parseSetUtterance, reconcileAfterSave, spokenKilograms, wholeSetUtterance } from './floorSession';
import { buildWorkoutFormSubmitBody } from '../../../WorkoutLogger/workoutLoggerSubmitPayload';

describe('parseSetScheme', () => {
  it('reads sets × reps in the shapes plans use', () => {
    expect(parseSetScheme('3 × 10')).toEqual({ sets: 3, reps: 10 });
    expect(parseSetScheme('4x8-10')).toEqual({ sets: 4, reps: 8 });
    expect(parseSetScheme('3 sets')).toEqual({ sets: 3, reps: null });
  });
  it('distances and times are not reps', () => {
    expect(parseSetScheme('2 × 400m')).toEqual({ sets: 2, reps: null });
    expect(parseSetScheme('3 x 30s')).toEqual({ sets: 3, reps: null });
    expect(parseSetScheme('3 x 45 sec')).toEqual({ sets: 3, reps: null });
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
    expect(floorStorageKey('1:trainer', 84)).toBe('swan-coach:floor:v2:1:trainer:84');
  });
});

describe('wholeSetUtterance — only a message that IS a set becomes one', () => {
  it.each(['145 for 6', '145 x 6', '145x6', '135 lb × 8.', '6 reps at 145', '8 @ 115 pounds', '145 for 6 reps'])('%s', (text) => {
    expect(wholeSetUtterance(text)).not.toBeNull();
  });
  it.each(['Log bench 4x8 at 185', 'What about 3x10 for Jesse?', 'Rest 90 for 2 minutes', 'her knee felt fine at 145 for 5', ''])('stays a message: %s', (text) => {
    expect(wholeSetUtterance(text)).toBeNull();
  });
});

describe('units are converted, never dropped (Astra F5)', () => {
  it.each([
    ['100 kg for 5', { weight: 220.5, reps: 5 }, 100],
    ['5 reps at 100 kg', { weight: 220.5, reps: 5 }, 100],
    ['60kgs x 8', { weight: 132.5, reps: 8 }, 60],
    ['22.5 kilos for 10', { weight: 49.5, reps: 10 }, 22.5],
    ['8 @ 40 kilograms', { weight: 88, reps: 8 }, 40],
    ['135 lbs for 8', { weight: 135, reps: 8 }, null],
    ['145 for 6', { weight: 145, reps: 6 }, null],
  ])('%s → pounds on the dials', (text, expected, kg) => {
    expect(parseSetUtterance(text)).toEqual(expected);
    expect(wholeSetUtterance(text)).toEqual(expected);
    expect(spokenKilograms(text)).toBe(kg);
  });
  it('a kilogram word the weight does not carry is refused, never read as pounds', () => {
    expect(parseSetUtterance('100 for 5 kg')).toBeNull();
    expect(wholeSetUtterance('100 for 5 kg')).toBeNull();
  });
});

describe('reconcileAfterSave — only what the save carried leaves (Astra F3)', () => {
  const ex = (name: string, sets: Array<[number, number]>) => ({ name, targetSets: null, targetReps: null, sets: sets.map(([weight, reps]) => ({ weight, reps })) });
  it('sets added while the save was out stay; an exercise added meanwhile is untouched', () => {
    const sent = [ex('Squat', [[145, 6]]), ex('Row', [[95, 10], [95, 9]])];
    const now = [ex('Squat', [[145, 6], [150, 5]]), ex('Row', [[95, 10], [95, 9]]), ex('Plank', [[0, 1]])];
    expect(reconcileAfterSave(now, sent)).toEqual([ex('Squat', [[150, 5]]), ex('Row', []), ex('Plank', [[0, 1]])]);
  });
  it('CONTROL: a list that no longer starts with the sent sets is left alone', () => {
    expect(reconcileAfterSave([ex('Squat', [[150, 5]])], [ex('Squat', [[145, 6]])])).toEqual([ex('Squat', [[150, 5]])]);
    expect(reconcileAfterSave([ex('Lunge', [[145, 6]])], [ex('Squat', [[145, 6]])])).toEqual([ex('Lunge', [[145, 6]])]);
  });
});

describe('floorAccess — the chat admission decides (Astra F2)', () => {
  it('open only for the accepted client; failures close; anything else is still checking', () => {
    expect(floorAccess({ clientMode: false, clientId: 12, phase: 'ready', acceptedTargetUserId: 12 })).toBe('open');
    expect(floorAccess({ clientMode: false, clientId: 12, phase: 'ready', acceptedTargetUserId: '12' })).toBe('open');
    expect(floorAccess({ clientMode: false, clientId: 12, phase: 'ready', acceptedTargetUserId: 7 })).toBe('checking');
    for (const phase of ['unadmitted', 'checking', 'decision', 'committing', undefined]) {
      expect(floorAccess({ clientMode: false, clientId: 12, phase, acceptedTargetUserId: 12 })).toBe('checking');
    }
    for (const phase of ['invalid', 'denied', 'unavailable', 'blocked-return', 'retired']) {
      expect(floorAccess({ clientMode: false, clientId: 12, phase, acceptedTargetUserId: 12 })).toBe('closed');
    }
    expect(floorAccess({ clientMode: true, clientId: 5 })).toBe('open'); // a client's own session
  });
});
