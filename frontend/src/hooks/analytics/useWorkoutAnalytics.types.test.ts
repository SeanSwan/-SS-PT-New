import { describe, expect, it } from 'vitest';
import { WORKOUT_ANALYTICS_DEFAULT_LIMIT } from './useWorkoutAnalytics.types';

describe('useWorkoutAnalytics public contract', () => {
  it('keeps the workout history fetch window explicit', () => {
    expect(WORKOUT_ANALYTICS_DEFAULT_LIMIT).toBe(50);
  });
});
