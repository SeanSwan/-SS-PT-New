import { describe, expect, it } from 'vitest';

import { buildSwanCoachWorkoutPlannerRoute } from './SwanCoachWorkoutPlannerRoute';

describe('buildSwanCoachWorkoutPlannerRoute', () => {
  it('routes trainer Coach plan building to the selected-client planner with a safe return path', () => {
    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'trainer',
      selectedClientId: 42,
      workflowReturnTo: '/dashboard/trainer/schedule',
    })).toBe('/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Fschedule');
  });

  it('preserves safe booked-session context when routing trainer Coach plan building', () => {
    const searchParams = new URLSearchParams({
      sessionId: '88',
      sessionDate: '2026-05-31T16:00:00.000Z',
      sessionCredits: '2',
    });

    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'trainer',
      selectedClientId: 42,
      workflowReturnTo: '/dashboard/trainer/schedule',
      searchParams,
    })).toBe('/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Fschedule&sessionId=88&sessionDate=2026-05-31T16%3A00%3A00.000Z&sessionCredits=2');
  });

  it('drops unsafe booked-session date and credit values before routing Coach plan building', () => {
    const searchParams = new URLSearchParams({
      sessionId: '88',
      sessionDate: '1',
      sessionCredits: '02',
    });

    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'trainer',
      selectedClientId: 42,
      workflowReturnTo: '/dashboard/trainer/schedule',
      searchParams,
    })).toBe('/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Fschedule&sessionId=88');
  });

  it('drops unsafe trainer return paths before building the planner handoff', () => {
    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'trainer',
      selectedClientId: '42',
      workflowReturnTo: '/dashboard/trainer/schedule\n?sessionId=77',
    })).toBe('/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Foverview');
  });

  it('drops trainer return paths with encoded control characters before building the planner handoff', () => {
    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'trainer',
      selectedClientId: 42,
      workflowReturnTo: '/dashboard/trainer/schedule%0A?sessionId=77',
    })).toBe('/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Foverview');
  });

  it('drops encoded traversal trainer return paths before building the planner handoff', () => {
    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'trainer',
      selectedClientId: 42,
      workflowReturnTo: '/dashboard/trainer/%2e%2e/admin/client-management',
    })).toBe('/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Foverview');

    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'trainer',
      selectedClientId: 42,
      workflowReturnTo: '/dashboard/trainer/%2f/admin/client-management',
    })).toBe('/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Foverview');
  });

  it('drops trainer return paths with dot or double-slash segments', () => {
    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'trainer',
      selectedClientId: 42,
      workflowReturnTo: '/dashboard/trainer/..',
    })).toBe('/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Foverview');

    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'trainer',
      selectedClientId: 42,
      workflowReturnTo: '/dashboard/trainer//schedule',
    })).toBe('/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Foverview');
  });

  it('routes admin selected clients to the canonical Client Hub planner return path', () => {
    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'admin',
      selectedClientId: 42,
    })).toBe('/dashboard/admin/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans');
  });

  it('returns null for trainer plan building without a selected client', () => {
    expect(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'trainer',
      selectedClientId: null,
    })).toBeNull();
  });
});