import { afterEach, describe, expect, it } from 'vitest';

import {
  appendPendingWorkoutPlan,
  drainPendingWorkoutPlans,
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
