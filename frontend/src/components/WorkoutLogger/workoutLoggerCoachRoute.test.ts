import { describe, expect, it } from 'vitest';

import { buildWorkoutLoggerCoachRoute } from './workoutLoggerCoachRoute';

describe('buildWorkoutLoggerCoachRoute', () => {
  it('opens admin selected-client workouts in Coach with a return to the embedded Client Hub logger', () => {
    const route = buildWorkoutLoggerCoachRoute({
      userRole: 'admin',
      clientId: 42,
      workoutDate: '2026-06-15',
      scheduledSessionId: '314',
      scheduledSessionDate: '2026-06-15T17:00:00.000Z',
      scheduledSessionCreditHint: 0,
    });

    expect(route).toBe(
      '/dashboard/admin/coach-assistant?clientId=42&source=admin-workout-logger&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dlogger%26loadPlan%3Dtoday%26sessionId%3D314%26sessionDate%3D2026-06-15%26sessionCredits%3D0&intent=log_workout&workoutDate=2026-06-15&sessionId=314&sessionDate=2026-06-15&sessionCredits=0',
    );
  });

  it('opens trainer selected-client workouts in the trainer Coach surface', () => {
    const route = buildWorkoutLoggerCoachRoute({
      userRole: 'trainer',
      clientId: '51',
      workoutDate: '2026-06-16',
      scheduledSessionId: '99',
      scheduledSessionDate: '2026-06-16',
      scheduledSessionCreditHint: 2,
    });

    expect(route).toBe(
      '/dashboard/trainer/coach-assistant?clientId=51&source=trainer-workout-logger&returnTo=%2Fdashboard%2Ftrainer%2Flog-workout%3FclientId%3D51%26loadPlan%3Dtoday%26sessionId%3D99%26sessionDate%3D2026-06-16%26sessionCredits%3D2&intent=log_workout&workoutDate=2026-06-16&sessionId=99&sessionDate=2026-06-16&sessionCredits=2',
    );
  });

  it('keeps client self-logging out of selected-client mode', () => {
    const route = buildWorkoutLoggerCoachRoute({
      userRole: 'client',
      clientId: 7,
      selfMode: true,
      workoutDate: '2026-06-17',
    });

    expect(route).toBe(
      '/dashboard/client/coach-assistant?source=client-workout-logger&returnTo=%2Fdashboard%2Fclient%2Flog-workout%3FloadPlan%3Dtoday&intent=log_self_workout&workoutDate=2026-06-17',
    );
  });

  it('lets the admin personal logger return to Coach without pretending Sean is a selected client', () => {
    const route = buildWorkoutLoggerCoachRoute({
      userRole: 'admin',
      clientId: 1,
      selfMode: true,
      workoutDate: '2026-06-18',
    });

    expect(route).toBe(
      '/dashboard/admin/coach-assistant?source=admin-workout-logger&returnTo=%2Fdashboard%2Fadmin%2Flog-my-workout%3FloadPlan%3Dtoday&intent=log_self_workout&workoutDate=2026-06-18',
    );
  });

  it('drops malformed client and booked-session context instead of encoding unsafe route text', () => {
    expect(buildWorkoutLoggerCoachRoute({
      userRole: 'trainer',
      clientId: '51junk',
      scheduledSessionId: '99bad',
      scheduledSessionDate: '2026-06-16\nbad',
      scheduledSessionCreditHint: -1,
    })).toBeNull();

    expect(buildWorkoutLoggerCoachRoute({
      userRole: 'admin',
      clientId: 42,
      scheduledSessionId: '99bad',
      scheduledSessionDate: '2026-06-16\nbad',
      scheduledSessionCreditHint: -1,
    })).toBe(
      '/dashboard/admin/coach-assistant?clientId=42&source=admin-workout-logger&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dlogger%26loadPlan%3Dtoday&intent=log_workout',
    );
  });
});
