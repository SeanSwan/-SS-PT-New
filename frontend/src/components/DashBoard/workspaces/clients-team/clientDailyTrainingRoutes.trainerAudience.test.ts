import { describe, expect, it } from 'vitest';
import {
  buildClientCoachDailyRoute,
  buildClientWorkoutLoggerRoute,
  buildClientWorkoutPlannerRoute,
} from './clientDailyTrainingRoutes';
import { buildClientCardQuickActionRoute } from './clientCardQuickActions';

describe('clientDailyTrainingRoutes trainer audience', () => {
  it('keeps admin routes byte-identical when no audience is passed', () => {
    expect(buildClientWorkoutLoggerRoute(61)).toBe(
      '/dashboard/admin/client-management?clientId=61&tab=training&trainingSection=logger&loadPlan=today',
    );
    expect(buildClientWorkoutPlannerRoute(61)).toContain('/dashboard/admin/workout-planner?');
    expect(buildClientCoachDailyRoute(61)).toContain('/dashboard/admin/coach-assistant?');
  });

  it('builds trainer-local logger deep links with the same section contract', () => {
    expect(buildClientWorkoutLoggerRoute(61, 'trainer')).toBe(
      '/dashboard/trainer/clients?clientId=61&tab=training&trainingSection=logger&loadPlan=today',
    );
  });

  it('routes trainer planner handoffs through the trainer planner with a trainer returnTo', () => {
    const route = buildClientWorkoutPlannerRoute(61, 'trainer');
    expect(route).toContain('/dashboard/trainer/workout-planner?');
    expect(decodeURIComponent(route ?? '')).toContain('/dashboard/trainer/clients?clientId=61');
    expect(route).not.toContain('%2Fadmin%2F');
  });

  it('routes trainer coach handoffs through the trainer Coach Command Center', () => {
    const route = buildClientCoachDailyRoute(61, 'log_workout', 'trainer');
    expect(route).toContain('/dashboard/trainer/coach-assistant?');
    expect(decodeURIComponent(route ?? '')).toContain('/dashboard/trainer/clients?clientId=61');
  });

  it('threads the audience through card quick actions', () => {
    expect(buildClientCardQuickActionRoute(61, 'plan', 'trainer')).toContain('/dashboard/trainer/workout-planner?');
    expect(buildClientCardQuickActionRoute(61, 'coach', 'trainer')).toContain('/dashboard/trainer/coach-assistant?');
    expect(buildClientCardQuickActionRoute(61, 'plan')).toContain('/dashboard/admin/workout-planner?');
  });

  it('still refuses malformed client ids for the trainer audience', () => {
    expect(buildClientWorkoutLoggerRoute('61abc', 'trainer')).toBeNull();
    expect(buildClientWorkoutPlannerRoute('-4', 'trainer')).toBeNull();
  });
});
