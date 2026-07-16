import { describe, expect, it } from 'vitest';

import {
  buildClientCoachDailyRoute,
  buildClientCoachOnboardingRoute,
  buildClientWorkoutLoggerRoute,
  buildClientWorkoutPlanEditRoute,
  buildClientWorkoutPlannerRoute,
} from './clientDailyTrainingRoutes';

const CLIENT_ID = 'fixture client/42';
const VALID_CLIENT_ID = 42;
const ENCODED_LOGGER_RETURN_TO =
  '%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dlogger%26loadPlan%3Dtoday';
const ENCODED_PLANS_RETURN_TO =
  '%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans';
const CLIENT_HUB_LOGGER_ROUTE =
  '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today';

describe('client daily training routes', () => {
  it('opens Swan Coach with selected-client context and an embedded logger return target', () => {
    expect(buildClientCoachDailyRoute(VALID_CLIENT_ID, 'log_workout')).toBe(
      `/dashboard/admin/coach-assistant?clientId=42&source=clients-team&returnTo=${ENCODED_LOGGER_RETURN_TO}&intent=log_workout`
    );
  });

  it('opens Swan Coach with plan intent and an embedded plans return target', () => {
    expect(buildClientCoachDailyRoute(VALID_CLIENT_ID, 'plan_next')).toBe(
      `/dashboard/admin/coach-assistant?clientId=42&source=clients-team&returnTo=${ENCODED_PLANS_RETURN_TO}&intent=plan_next`
    );
  });

  it('opens Swan Coach in new-client onboarding mode from Client Hub', () => {
    expect(buildClientCoachOnboardingRoute()).toBe(
      '/dashboard/admin/coach-assistant?source=clients-team&workspace=onboarding&returnTo=%2Fdashboard%2Fadmin%2Fclient-management&intent=client_onboarding'
    );
  });

  it('keeps the workout logger inside the selected-client Client Hub training cockpit with today-plan intent', () => {
    expect(buildClientWorkoutLoggerRoute(VALID_CLIENT_ID)).toBe(CLIENT_HUB_LOGGER_ROUTE);
  });

  it('opens the full Workout Planner with a Client Hub Plan Library return target', () => {
    expect(buildClientWorkoutPlannerRoute(VALID_CLIENT_ID)).toBe(
      '/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans'
    );
  });

  it('opens a specific saved plan in edit mode with the Client Hub return path intact', () => {
    expect(buildClientWorkoutPlanEditRoute(VALID_CLIENT_ID, '6ea7806d-36c8-4307-bd5d-6b04b68be849')).toBe(
      '/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans&planId=6ea7806d-36c8-4307-bd5d-6b04b68be849&mode=edit'
    );
  });

  it('refuses malformed client ids instead of encoding them into downstream routes', () => {
    expect(buildClientCoachDailyRoute(`${VALID_CLIENT_ID}junk`, 'log_workout')).toBeNull();
    expect(buildClientWorkoutLoggerRoute(0)).toBeNull();
    expect(buildClientWorkoutPlannerRoute('42.5')).toBeNull();
  });
});
