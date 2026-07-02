import { describe, expect, it } from 'vitest';

import { resolveWorkoutPlannerReturnTo, workoutPlannerReturnLabel } from './workoutPlannerReturnTo';

describe('resolveWorkoutPlannerReturnTo', () => {
  it('allows same-role dashboard return targets used by planner handoffs', () => {
    expect(resolveWorkoutPlannerReturnTo('/dashboard/admin/client-management?clientId=42&tab=training', 'admin'))
      .toBe('/dashboard/admin/client-management?clientId=42&tab=training');
    expect(resolveWorkoutPlannerReturnTo('/dashboard/admin/log-my-workout?loadPlan=today', 'admin'))
      .toBe('/dashboard/admin/log-my-workout?loadPlan=today');
    expect(resolveWorkoutPlannerReturnTo('/dashboard/trainer/schedule', 'trainer'))
      .toBe('/dashboard/trainer/schedule');
  });

  it('labels return targets by their actual planner handoff destination', () => {
    expect(workoutPlannerReturnLabel('/dashboard/admin/client-management?clientId=42&tab=training'))
      .toBe('Return to Client Hub');
    expect(workoutPlannerReturnLabel('/dashboard/admin/log-my-workout?loadPlan=today', 'back'))
      .toBe('Back to Workout Logger');
    expect(workoutPlannerReturnLabel('/dashboard/trainer/log-workout?clientId=42'))
      .toBe('Return to Workout Logger');
    expect(workoutPlannerReturnLabel('/dashboard/trainer/overview'))
      .toBe('Return to Trainer Dashboard');
    expect(workoutPlannerReturnLabel('/dashboard/admin/workout-planner?returnTo=/dashboard/trainer/log-workout'))
      .toBe('Return to Admin Dashboard');
  });
  it('rejects cross-role, external, and encoded unsafe return targets', () => {
    expect(resolveWorkoutPlannerReturnTo('/dashboard/admin/client-management?clientId=42', 'trainer')).toBeNull();
    expect(resolveWorkoutPlannerReturnTo('/dashboard/trainer/schedule', 'admin')).toBeNull();
    expect(resolveWorkoutPlannerReturnTo('https://evil.example/dashboard/trainer/schedule', 'trainer')).toBeNull();
    expect(resolveWorkoutPlannerReturnTo('/dashboard/trainer/%2e%2e/admin/client-management', 'trainer')).toBeNull();
    expect(resolveWorkoutPlannerReturnTo('/dashboard/trainer/schedule%0A?sessionId=77', 'trainer')).toBeNull();
    expect(resolveWorkoutPlannerReturnTo('/dashboard/trainer/..', 'trainer')).toBeNull();
  });
});