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
});
