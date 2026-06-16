import { describe, expect, it } from 'vitest';

import {
  getLogWorkoutDashboardPath,
  getPersonalLogWorkoutDashboardPath,
  getSwanCoachDashboardPath,
} from './swanCoachDashboardRoute';

describe('swanCoachDashboardRoute', () => {
  it.each([
    ['admin', '/dashboard/admin/coach-assistant'],
    ['trainer', '/dashboard/trainer/coach-assistant'],
    ['client', '/dashboard/client/coach-assistant'],
    ['user', '/dashboard/client/coach-assistant'],
    [undefined, '/dashboard/client/coach-assistant'],
    [null, '/dashboard/client/coach-assistant'],
  ])('routes Coach role %s to %s', (role, expected) => {
    expect(getSwanCoachDashboardPath(role as string | null | undefined)).toBe(expected);
  });

  it.each([
    ['admin', '/dashboard/admin/client-management?intent=log_workout'],
    ['trainer', '/dashboard/trainer/clients?intent=log_workout'],
    ['client', '/dashboard/client/log-workout?loadPlan=today'],
    ['user', '/dashboard/client/log-workout?loadPlan=today'],
    [undefined, '/dashboard/client/log-workout?loadPlan=today'],
    [null, '/dashboard/client/log-workout?loadPlan=today'],
  ])('routes team workout role %s to the safe logging entry %s', (role, expected) => {
    expect(getLogWorkoutDashboardPath(role as string | null | undefined)).toBe(expected);
  });

  it.each(['admin', 'trainer', 'client', 'user', undefined, null])(
    "routes personal workout logging for role %s to today's client logger",
    () => {
      expect(getPersonalLogWorkoutDashboardPath()).toBe('/dashboard/client/log-workout?loadPlan=today');
    },
  );
});
