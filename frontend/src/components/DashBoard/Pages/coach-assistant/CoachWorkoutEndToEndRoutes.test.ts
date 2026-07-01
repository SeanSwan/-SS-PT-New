import { describe, expect, it } from 'vitest';

import {
  buildWorkoutPlannerLoggerRoute,
} from '../admin-workout-planner/workoutPlannerHandoffRoutes';
import type { GeneratedPlan } from '../admin-workout-planner/WorkoutPlannerTypes';
import {
  buildClientCoachDailyRoute,
  buildClientCoachOnboardingRoute,
} from '../../workspaces/clients-team/clientDailyTrainingRoutes';
import {
  normalizeCommandCenterReturnTo,
  parseRouteClientId,
} from './CoachCommandCenter.routeContext';
import { buildSwanCoachWorkoutLoggerRoute } from './SwanCoachWorkoutLoggerRoute';
import { buildSwanCoachWorkoutPlannerRoute } from './SwanCoachWorkoutPlannerRoute';

const BASE_URL = 'https://sswanstudios.com';

const generatedPlan: GeneratedPlan = {
  clientId: 42,
  clientName: 'Private Client Name',
  planSummary: {
    durationWeeks: 4,
    sessionsPerWeek: 2,
    totalSessions: 8,
    primaryGoal: 'strength',
    startingPhase: 2,
  },
  mesocycles: [],
  weeklySchedule: [],
  weeks: [],
  recommendations: [],
};

function routeUrl(route: string | null): URL {
  expect(route).toBeTruthy();
  return new URL(route ?? '/', BASE_URL);
}

describe('Coach workout end-to-end route contracts', () => {
  it('chains Client Hub plan-next through Coach, planner, and logger without dropping client or session context', () => {
    const coachUrl = routeUrl(buildClientCoachDailyRoute(42, 'plan_next'));
    const routeClientId = parseRouteClientId(coachUrl.searchParams.get('clientId'));
    const workflowReturnTo = normalizeCommandCenterReturnTo(coachUrl.searchParams.get('returnTo'), 'admin');

    expect(coachUrl.pathname).toBe('/dashboard/admin/coach-assistant');
    expect(coachUrl.searchParams.get('source')).toBe('clients-team');
    expect(coachUrl.searchParams.get('intent')).toBe('plan_next');
    expect(routeClientId).toBe(42);
    expect(workflowReturnTo).toBe('/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=plans');

    const plannerUrl = routeUrl(buildSwanCoachWorkoutPlannerRoute({
      userRole: 'admin',
      selectedClientId: routeClientId,
      workflowReturnTo,
      searchParams: new URLSearchParams({
        sessionId: '314',
        sessionDate: '2026-06-15',
        sessionCredits: '0',
      }),
    }));

    expect(plannerUrl.pathname).toBe('/dashboard/admin/workout-planner');
    expect(plannerUrl.searchParams.get('clientId')).toBe('42');
    expect(plannerUrl.searchParams.get('source')).toBe('swan-coach');
    expect(plannerUrl.searchParams.get('returnTo')).toBe('/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=plans');
    expect(plannerUrl.searchParams.get('sessionId')).toBe('314');
    expect(plannerUrl.searchParams.get('sessionDate')).toBe('2026-06-15');
    expect(plannerUrl.searchParams.get('sessionCredits')).toBe('0');

    const loggerUrl = routeUrl(buildWorkoutPlannerLoggerRoute({
      pathname: plannerUrl.pathname,
      search: plannerUrl.search,
      selectedClientId: routeClientId,
      generatedPlan,
    }));

    expect(loggerUrl.pathname).toBe('/dashboard/admin/client-management');
    expect(loggerUrl.searchParams.get('clientId')).toBe('42');
    expect(loggerUrl.searchParams.get('tab')).toBe('training');
    expect(loggerUrl.searchParams.get('trainingSection')).toBe('logger');
    expect(loggerUrl.searchParams.get('loadPlan')).toBe('today');
    expect(loggerUrl.searchParams.get('source')).toBe('workout-planner');
    expect(loggerUrl.searchParams.get('returnTo')).toBe(`${plannerUrl.pathname}${plannerUrl.search}`);
    expect(loggerUrl.searchParams.get('sessionId')).toBe('314');
    expect(loggerUrl.searchParams.get('sessionDate')).toBe('2026-06-15');
    expect(loggerUrl.searchParams.get('sessionCredits')).toBe('0');
  });

  it('chains Client Hub log-workout through Coach back to the embedded Client Hub logger with booked-session context', () => {
    const coachUrl = routeUrl(buildClientCoachDailyRoute(42, 'log_workout'));
    const searchParams = new URLSearchParams(coachUrl.searchParams);
    searchParams.set('sessionId', '314');
    searchParams.set('sessionDate', '2026-06-15');
    searchParams.set('sessionCredits', '0');

    const loggerUrl = routeUrl(buildSwanCoachWorkoutLoggerRoute({
      userRole: 'admin',
      selectedClientId: parseRouteClientId(coachUrl.searchParams.get('clientId')),
      searchParams,
    }));

    expect(coachUrl.searchParams.get('intent')).toBe('log_workout');
    expect(normalizeCommandCenterReturnTo(coachUrl.searchParams.get('returnTo'), 'admin'))
      .toBe('/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today');
    expect(loggerUrl.pathname).toBe('/dashboard/admin/client-management');
    expect(loggerUrl.searchParams.get('clientId')).toBe('42');
    expect(loggerUrl.searchParams.get('tab')).toBe('training');
    expect(loggerUrl.searchParams.get('trainingSection')).toBe('logger');
    expect(loggerUrl.searchParams.get('loadPlan')).toBe('today');
    expect(loggerUrl.searchParams.get('sessionId')).toBe('314');
    expect(loggerUrl.searchParams.get('sessionDate')).toBe('2026-06-15');
    expect(loggerUrl.searchParams.get('sessionCredits')).toBe('0');
  });

  it('keeps new-client onboarding scoped to Client Hub instead of leaking workout route context', () => {
    const onboardingUrl = routeUrl(buildClientCoachOnboardingRoute());

    expect(onboardingUrl.pathname).toBe('/dashboard/admin/coach-assistant');
    expect(onboardingUrl.searchParams.get('source')).toBe('clients-team');
    expect(onboardingUrl.searchParams.get('workspace')).toBe('onboarding');
    expect(onboardingUrl.searchParams.get('intent')).toBe('client_onboarding');
    expect(normalizeCommandCenterReturnTo(onboardingUrl.searchParams.get('returnTo'), 'admin'))
      .toBe('/dashboard/admin/client-management');
    expect(onboardingUrl.searchParams.get('clientId')).toBeNull();
    expect(onboardingUrl.searchParams.get('loadPlan')).toBeNull();
    expect(onboardingUrl.searchParams.get('sessionId')).toBeNull();
  });
});