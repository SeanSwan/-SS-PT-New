import { describe, expect, it } from 'vitest';

import {
  buildClientCoachDailyRoute,
  buildClientCoachOnboardingRoute,
  buildClientManagementReturnTo,
  buildClientWorkoutLoggerRoute,
  buildClientWorkoutPlannerRoute,
} from './clientDailyTrainingRoutes';

const CLIENT_ID = 'fixture client/42';
const VALID_CLIENT_ID = 42;
const ENCODED_RETURN_TO = '%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42';
const ENCODED_PLANS_RETURN_TO =
  '%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans';

describe('client daily training routes', () => {
  it('keeps the selected client encoded in the Client Hub return route', () => {
    expect(buildClientManagementReturnTo(VALID_CLIENT_ID)).toBe(
      '/dashboard/admin/client-management?clientId=42'
    );
  });

  it('opens Swan Coach with selected-client context and a Client Hub return target', () => {
    expect(buildClientCoachDailyRoute(VALID_CLIENT_ID, 'log_workout')).toBe(
      `/dashboard/admin/coach-assistant?clientId=42&source=clients-team&returnTo=${ENCODED_RETURN_TO}&intent=log_workout`
    );
  });

  it('opens Swan Coach in new-client onboarding mode from Client Hub', () => {
    expect(buildClientCoachOnboardingRoute()).toBe(
      '/dashboard/admin/coach-assistant?source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management&intent=client_onboarding'
    );
  });

  it('opens the canonical workout logger with source and returnTo context', () => {
    expect(buildClientWorkoutLoggerRoute(VALID_CLIENT_ID)).toBe(
      `/dashboard/admin/log-workout?clientId=42&source=clients-team&returnTo=${ENCODED_RETURN_TO}`
    );
  });

  it('opens the workout planner with source and returnTo context', () => {
    expect(buildClientWorkoutPlannerRoute(VALID_CLIENT_ID)).toBe(
      `/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=${ENCODED_PLANS_RETURN_TO}`
    );
  });

  it('refuses malformed client ids instead of encoding them into downstream routes', () => {
    expect(buildClientManagementReturnTo(CLIENT_ID)).toBeNull();
    expect(buildClientCoachDailyRoute(`${VALID_CLIENT_ID}junk`, 'log_workout')).toBeNull();
    expect(buildClientWorkoutLoggerRoute(0)).toBeNull();
    expect(buildClientWorkoutPlannerRoute('42.5')).toBeNull();
  });
});
