import { describe, expect, it } from 'vitest';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { GeneratedPlan } from './WorkoutPlannerTypes';
import {
  applyHorizonSwap,
  isDuplicateInHorizonDay,
  isHorizonSwapTargetValid,
  removeHorizonExercise,
  type HorizonSwapTarget,
} from './workoutPlannerHorizonSwap.helpers';

const slim = (id: string, name: string): ExerciseSlim => ({
  id,
  name,
  exerciseKey: id,
  exerciseType: 'strength',
  bodyPartCategory: 'legs',
  primaryMuscles: ['quads'],
  difficulty: 2,
});

const basePlan = (): GeneratedPlan => ({
  clientId: 84,
  clientName: 'Client 84',
  planSummary: { durationWeeks: 2, sessionsPerWeek: 2, totalSessions: 4, primaryGoal: 'strength', startingPhase: 2 },
  mesocycles: [],
  weeklySchedule: [],
  recommendations: [],
  weeks: [
    {
      weekNumber: 1,
      days: [
        {
          dayNumber: 1,
          exercises: [
            { exerciseId: 'a', exerciseName: 'Barbell Back Squat', sets: 2, reps: '8-12', tempo: '2-0-2', rotationFallback: true },
            { exerciseId: 'b', exerciseName: 'Leg Press', sets: 2, reps: '8-12' },
          ],
        },
      ],
    },
    {
      weekNumber: 2,
      sessions: [{ dayNumber: 1, exercises: [{ exerciseId: 'c', exerciseName: 'Romanian Deadlift', sets: 2, reps: '8-12' }] }],
    },
  ],
});

const target: HorizonSwapTarget = {
  kind: 'horizon',
  weekNumber: 1,
  dayIndex: 0,
  exerciseIndex: 0,
  exerciseName: 'Barbell Back Squat',
};

describe('workoutPlannerHorizonSwap.helpers', () => {
  it('swaps the targeted slot keeping its programming and clearing rotationFallback', () => {
    const next = applyHorizonSwap(basePlan(), target, slim('x', 'Box Squat to Bench'));
    const swapped = next.weeks![0].days![0].exercises[0];
    expect(swapped.exerciseName).toBe('Box Squat to Bench');
    expect(swapped.exerciseId).toBe('x');
    expect(swapped.sets).toBe(2);
    expect(swapped.reps).toBe('8-12');
    expect(swapped.tempo).toBe('2-0-2');
    expect(swapped.rotationFallback).toBe(false);
    // untouched siblings preserved
    expect(next.weeks![0].days![0].exercises[1].exerciseName).toBe('Leg Press');
    expect(next.weeks![1].sessions![0].exercises[0].exerciseName).toBe('Romanian Deadlift');
  });

  it('swaps inside sessions-keyed weeks too', () => {
    const t: HorizonSwapTarget = { kind: 'horizon', weekNumber: 2, dayIndex: 0, exerciseIndex: 0, exerciseName: 'Romanian Deadlift' };
    const next = applyHorizonSwap(basePlan(), t, slim('y', 'Stability Ball Hamstring Curl'));
    expect(next.weeks![1].sessions![0].exercises[0].exerciseName).toBe('Stability Ball Hamstring Curl');
  });

  it('removes the targeted slot only', () => {
    const next = removeHorizonExercise(basePlan(), target);
    const exercises = next.weeks![0].days![0].exercises;
    expect(exercises).toHaveLength(1);
    expect(exercises[0].exerciseName).toBe('Leg Press');
  });

  it('duplicate-guards against the rest of the same day', () => {
    expect(isDuplicateInHorizonDay(basePlan(), target, slim('b', 'Leg Press'))).toBe(true);
    expect(isDuplicateInHorizonDay(basePlan(), target, slim('z', 'Goblet Squat'))).toBe(false);
  });

  it('validates targets against the current plan (stale after content changes)', () => {
    expect(isHorizonSwapTargetValid(basePlan(), target)).toBe(true);
    expect(isHorizonSwapTargetValid(removeHorizonExercise(basePlan(), target), target)).toBe(false);
    expect(isHorizonSwapTargetValid(null, target)).toBe(false);
  });
});
