import {
  convertAIWorkoutExercisesToEntries,
  coerceToNumericId,
  getCurrentWorkoutCursorSession,
  normalizeWorkoutDate,
  plannedExerciseToEntry,
} from './WorkoutLogger.helpers';

describe('WorkoutLogger helpers', () => {
  it('coerces finite numeric ids and rejects invalid ids', () => {
    expect(coerceToNumericId(7)).toBe(7);
    expect(coerceToNumericId('42')).toBe(42);
    expect(coerceToNumericId('')).toBeUndefined();
    expect(coerceToNumericId('abc')).toBeUndefined();
    expect(coerceToNumericId(Number.NaN)).toBeUndefined();
    expect(coerceToNumericId(0)).toBeUndefined();
    expect(coerceToNumericId(-1)).toBeUndefined();
    expect(coerceToNumericId(42.5)).toBeUndefined();
    expect(coerceToNumericId('42.5')).toBeUndefined();
    expect(coerceToNumericId('42junk')).toBeUndefined();
  });

  it('normalizes scheduled workout dates with a deterministic fallback', () => {
    expect(normalizeWorkoutDate('2026-05-24T20:30:00.000Z', new Date('2026-05-30T08:00:00.000Z'))).toBe('2026-05-24');
    expect(normalizeWorkoutDate(null, new Date('2026-05-30T08:00:00.000Z'))).toBe('2026-05-30');
    expect(normalizeWorkoutDate('not-a-date', new Date('2026-05-30T08:00:00.000Z'))).toBe('2026-05-30');
  });

  it('maps planned exercises into null-honest workout logger entries', () => {
    const entry = plannedExerciseToEntry(
      {
        id: 'plan-1',
        exerciseName: 'Goblet Squat',
        sets: '2',
        weight: '35',
        targetReps: '10',
        tempo: '3-1-1',
        restSeconds: '75',
      },
      () => 'fallback-id',
    );

    expect(entry.exerciseId).toBe('plan-1');
    expect(entry.exerciseName).toBe('Goblet Squat');
    expect(entry.sets).toHaveLength(2);
    expect(entry.sets[0]).toMatchObject({
      setNumber: 1,
      weight: 35,
      reps: 10,
      rpe: null,
      formQuality: null,
      tempo: '3-1-1',
      restTime: 75,
    });
    expect(entry.formRating).toBeNull();
  });

  it('reads currentSession from every backend-compatible response location', () => {
    const session = { exercises: [{ name: 'Pushup' }] };
    expect(getCurrentWorkoutCursorSession({ currentSession: session })).toBe(session);
    expect(getCurrentWorkoutCursorSession({ data: { currentSession: session } })).toBe(session);
    expect(getCurrentWorkoutCursorSession({ plan: { currentSession: session } })).toBe(session);
  });

  it('converts AI workout exercises into null-honest logger rows', () => {
    let nextId = 0;
    const makeLocalId = (prefix: string) => `${prefix}-${nextId += 1}`;

    const [entry] = convertAIWorkoutExercisesToEntries(
      [{
        exerciseName: 'AI Goblet Squat',
        sets: 2,
        weight: 40,
        reps: 8,
        tempo: '3-1-1',
        restTime: 75,
        notes: 'Keep chest tall',
      }],
      makeLocalId,
    );

    expect(entry).toMatchObject({
      loggerExerciseId: 'exercise-1',
      exerciseId: 'ai-2',
      exerciseName: 'AI Goblet Squat',
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
    });
    expect(entry.sets).toEqual([
      {
        loggerSetId: 'set-3',
        setNumber: 1,
        weight: 40,
        reps: 8,
        rpe: null,
        tempo: '3-1-1',
        restTime: 75,
        formQuality: null,
        notes: 'Keep chest tall',
      },
      {
        loggerSetId: 'set-4',
        setNumber: 2,
        weight: 40,
        reps: 8,
        rpe: null,
        tempo: '3-1-1',
        restTime: 75,
        formQuality: null,
        notes: 'Keep chest tall',
      },
    ]);
  });
});
