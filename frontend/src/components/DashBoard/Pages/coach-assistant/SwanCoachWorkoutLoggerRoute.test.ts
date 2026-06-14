import { describe, expect, it } from 'vitest';

import { buildSwanCoachWorkoutLoggerRoute } from './SwanCoachWorkoutLoggerRoute';

describe('buildSwanCoachWorkoutLoggerRoute', () => {
  it('routes client-role Coach workouts to the self logger with today preloaded', () => {
    expect(buildSwanCoachWorkoutLoggerRoute({
      userRole: 'client',
      searchParams: new URLSearchParams(),
      selectedClientId: null,
    })).toBe('/dashboard/client/log-workout?loadPlan=today');
  });

  it('routes trainer Coach workouts to the selected client logger and preserves safe session context', () => {
    const searchParams = new URLSearchParams({
      sessionId: '77',
      sessionDate: '2026-06-14T17:00:00.000Z',
      sessionCredits: '2',
      returnTo: '/dashboard/trainer/overview',
    });

    expect(buildSwanCoachWorkoutLoggerRoute({
      userRole: 'trainer',
      selectedClientId: 42,
      searchParams,
    })).toBe(
      '/dashboard/trainer/log-workout?clientId=42&source=swan-coach&loadPlan=today&returnTo=%2Fdashboard%2Ftrainer%2Foverview&sessionId=77&sessionDate=2026-06-14T17%3A00%3A00.000Z&sessionCredits=2',
    );
  });

  it('drops unsafe trainer route context instead of copying free-form query text', () => {
    const searchParams = new URLSearchParams({
      sessionId: 'bad-id',
      sessionDate: 'not-a-date',
      sessionCredits: '-1',
      returnTo: 'https://evil.example/steal',
    });

    expect(buildSwanCoachWorkoutLoggerRoute({
      userRole: 'trainer',
      selectedClientId: '99',
      searchParams,
    })).toBe('/dashboard/trainer/log-workout?clientId=99&source=swan-coach&loadPlan=today');
  });

  it('routes admin Coach workouts to the Client Hub logger when a client is selected', () => {
    expect(buildSwanCoachWorkoutLoggerRoute({
      userRole: 'admin',
      selectedClientId: 8,
      searchParams: new URLSearchParams(),
    })).toBe('/dashboard/admin/client-management?clientId=8&tab=training&trainingSection=logger&loadPlan=today');
  });

  it('routes admin Coach workouts to the personal logger when no client is selected', () => {
    expect(buildSwanCoachWorkoutLoggerRoute({
      userRole: 'admin',
      selectedClientId: null,
      searchParams: new URLSearchParams(),
    })).toBe('/dashboard/admin/log-my-workout?loadPlan=today');
  });
});
