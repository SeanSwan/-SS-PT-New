import { describe, expect, it } from 'vitest';
import { closestWorkoutPlanHorizon, workoutPlanHorizonForKey } from './workoutPlanHorizonTokens';

describe('closestWorkoutPlanHorizon', () => {
  it('maps exact SwanStudios plan arcs to stable PDF tokens', () => {
    expect(closestWorkoutPlanHorizon(1)).toMatchObject({ key: 'one_week', token: '1wk' });
    expect(closestWorkoutPlanHorizon(4)).toMatchObject({ key: 'one_month', token: '1mo' });
    expect(closestWorkoutPlanHorizon(12)).toMatchObject({ key: 'three_month', token: '3mo' });
    expect(closestWorkoutPlanHorizon(26)).toMatchObject({ key: 'six_month', token: '6mo' });
    expect(closestWorkoutPlanHorizon(39)).toMatchObject({ key: 'nine_month', token: '9mo' });
    expect(closestWorkoutPlanHorizon(52)).toMatchObject({ key: 'twelve_month', token: '12mo' });
  });

  it('maps custom durations to the closest real SwanStudios horizon', () => {
    expect(closestWorkoutPlanHorizon(8).token).toBe('3mo');
    expect(closestWorkoutPlanHorizon(21).token).toBe('6mo');
    expect(closestWorkoutPlanHorizon(33).token).toBe('9mo');
    expect(closestWorkoutPlanHorizon(46).token).toBe('12mo');
  });

  it('resolves explicit one-day plan vault horizons without treating them as one-week plans', () => {
    expect(workoutPlanHorizonForKey('one_day', 1)).toMatchObject({
      key: 'one_day',
      token: '1d',
      label: '1-Day',
    });
    expect(workoutPlanHorizonForKey('unknown', 26)).toMatchObject({
      key: 'six_month',
      token: '6mo',
    });
  });
});
