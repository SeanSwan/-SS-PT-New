import { afterEach, describe, expect, it } from 'vitest';

import {
  appendPendingWorkoutPlan,
  drainPendingWorkoutPlans,
  drainPendingWorkoutPlansForClient,
  parseAIWorkoutPlan,
  PENDING_WORKOUT_KEY,
  PENDING_WORKOUT_QUEUE_KEY,
  type WorkoutPlanTransfer,
} from './parseAIWorkoutPlan';

const buildPlan = (exerciseName: string): WorkoutPlanTransfer => ({
  source: 'ai-chat',
  exercises: [{ exerciseName, sets: 3, reps: 10 }],
});

describe('pending AI workout plan queue', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('appends generated workouts without overwriting an earlier staged plan', () => {
    expect(appendPendingWorkoutPlan(buildPlan('Goblet squat'))).toBe(true);
    expect(appendPendingWorkoutPlan(buildPlan('Push-up'))).toBe(true);

    const queued = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_QUEUE_KEY) || '[]');

    expect(queued).toHaveLength(2);
    expect(queued[0].exercises[0].exerciseName).toBe('Goblet squat');
    expect(queued[1].exercises[0].exerciseName).toBe('Push-up');
    expect(sessionStorage.getItem(PENDING_WORKOUT_KEY)).toBeNull();
  });

  it('drains queued plans and the legacy one-shot pending plan, then clears both stores', () => {
    sessionStorage.setItem(PENDING_WORKOUT_KEY, JSON.stringify(buildPlan('Legacy row')));
    expect(appendPendingWorkoutPlan(buildPlan('Queued row'))).toBe(true);

    const plans = drainPendingWorkoutPlans();

    expect(plans.map((plan) => plan.exercises[0]?.exerciseName)).toEqual([
      'Legacy row',
      'Queued row',
    ]);
    expect(sessionStorage.getItem(PENDING_WORKOUT_KEY)).toBeNull();
    expect(sessionStorage.getItem(PENDING_WORKOUT_QUEUE_KEY)).toBeNull();
  });

  it('drains only matching targeted plans and preserves the rest for the correct client', () => {
    expect(appendPendingWorkoutPlan({ ...buildPlan('Client 42 row'), targetClientId: 42 })).toBe(true);
    expect(appendPendingWorkoutPlan({ ...buildPlan('Client 99 row'), targetClientId: 99 })).toBe(true);
    expect(appendPendingWorkoutPlan(buildPlan('Unscoped row'))).toBe(true);

    const plans = drainPendingWorkoutPlansForClient(42);

    expect(plans.map((plan) => plan.exercises[0]?.exerciseName)).toEqual([
      'Client 42 row',
      'Unscoped row',
    ]);
    const remaining = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_QUEUE_KEY) || '[]');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ targetClientId: 99 });
    expect(remaining[0].exercises[0].exerciseName).toBe('Client 99 row');
  });
  it('preserves queued plans when the logger has no resolved client context yet', () => {
    expect(appendPendingWorkoutPlan(buildPlan('Unresolved self row'))).toBe(true);
    expect(appendPendingWorkoutPlan({ ...buildPlan('Client 42 row'), targetClientId: 42 })).toBe(true);

    const plans = drainPendingWorkoutPlansForClient(undefined);

    expect(plans).toEqual([]);
    const remaining = JSON.parse(sessionStorage.getItem(PENDING_WORKOUT_QUEUE_KEY) || '[]');
    expect(remaining.map((plan: WorkoutPlanTransfer) => plan.exercises[0]?.exerciseName)).toEqual([
      'Unresolved self row',
      'Client 42 row',
    ]);
    expect(sessionStorage.getItem(PENDING_WORKOUT_KEY)).toBeNull();
  });
  it('does not mistake the s in sets for a rest-time cue', () => {
    const parsed = parseAIWorkoutPlan('- Goblet squat: 3 sets x 10 reps');

    expect(parsed?.[0]).toMatchObject({
      exerciseName: 'Goblet squat',
      sets: 3,
      reps: 10,
    });
    expect(parsed?.[0]?.restTime).toBeUndefined();
  });

  it('keeps explicit rest-time cues while ignoring set-count words', () => {
    const parsed = parseAIWorkoutPlan('- Cable row: 3 sets x 10 reps, rest 75 sec');

    expect(parsed?.[0]).toMatchObject({
      exerciseName: 'Cable row',
      sets: 3,
      reps: 10,
      restTime: 75,
    });
  });

  it('keeps duration and round-based coach rows as review-only logger entries', () => {
    const parsed = parseAIWorkoutPlan([
      'Warm-up:',
      '- Incline walk - 5 minutes',
      'Strength:',
      '- Goblet squat: 3 sets x 10 reps',
      'Finisher:',
      '- Bike sprint - 6 rounds x 20 sec',
    ].join('\n'));

    expect(parsed).toEqual([
      expect.objectContaining({
        exerciseName: 'Incline walk',
        sets: 1,
        reps: 0,
        notes: '5 minutes',
      }),
      expect.objectContaining({
        exerciseName: 'Goblet squat',
        sets: 3,
        reps: 10,
      }),
      expect.objectContaining({
        exerciseName: 'Bike sprint',
        sets: 6,
        reps: 0,
        notes: '6 rounds x 20 sec',
      }),
    ]);
  });

  it('parses duration and round-based coach rows with unicode dash separators', () => {
    const parsed = parseAIWorkoutPlan([
      'Warm-up:',
      '- Incline walk \u2013 5 minutes',
      'Finisher:',
      '- Bike sprint \u2014 6 rounds x 20 sec',
    ].join('\n'));

    expect(parsed).toEqual([
      expect.objectContaining({
        exerciseName: 'Incline walk',
        sets: 1,
        reps: 0,
        notes: '5 minutes',
      }),
      expect.objectContaining({
        exerciseName: 'Bike sprint',
        sets: 6,
        reps: 0,
        notes: '6 rounds x 20 sec',
      }),
    ]);
  });
  it('parses trainer shorthand with superset labels and unicode separators', () => {
    const parsed = parseAIWorkoutPlan([
      'A1. DB Romanian deadlift \u2013 4x8 @ 85 lbs, rest 75 sec',
      'A2) TRX row: 3 \u00d7 12',
      '- 1-arm cable row - 3 x 10 reps',
    ].join('\n'));

    expect(parsed).toEqual([
      expect.objectContaining({
        exerciseName: 'DB Romanian deadlift',
        sets: 4,
        reps: 8,
        weight: 85,
        restTime: 75,
      }),
      expect.objectContaining({
        exerciseName: 'TRX row',
        sets: 3,
        reps: 12,
      }),
      expect.objectContaining({
        exerciseName: '1-arm cable row',
        sets: 3,
        reps: 10,
      }),
    ]);
  });

  it('preserves structured generator target reps, rest seconds, load, and set-array counts', () => {
    const parsed = parseAIWorkoutPlan([
      '```json',
      JSON.stringify({ exercises: [{ name: 'Bench Press', sets: [{ setNumber: 1 }, { setNumber: 2 }], targetReps: '8-10', restSeconds: 75, load: '95 lb' }, { name: 'Push-up', sets: 2, targetReps: 12, load: 'bodyweight' }] }),
      '```',
    ].join('\n'));

    expect(parsed?.[0]).toMatchObject({
      exerciseName: 'Bench Press',
      sets: 2,
      reps: 8,
      restTime: 75,
      weight: 95,
    });
    expect(parsed?.[1]?.weight).toBeUndefined();
  });

  it('preserves explicit zero reps from structured review-only JSON rows', () => {
    const parsed = parseAIWorkoutPlan([
      '```json',
      JSON.stringify({ exercises: [{ exerciseName: 'Incline walk', sets: 1, reps: 0, notes: '5 minutes' }] }),
      '```',
    ].join('\n'));

    expect(parsed?.[0]).toMatchObject({
      exerciseName: 'Incline walk',
      sets: 1,
      reps: 0,
      notes: '5 minutes',
    });
  });
});
