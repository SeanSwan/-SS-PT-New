/**
 * @file DashboardTeachMeGuide.logTodayRoutes.test.ts
 * @description Regression coverage for low-click Log Workout actions loading today's plan.
 */

import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

const todayLoggerPath = '/dashboard/client/log-workout?loadPlan=today';

describe('DashboardTeachMeGuide log-today actions', () => {
  it('routes default client guidance to today-loaded logging', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/overview',
    });

    expect(guide.primaryAction).toEqual({
      label: 'Log Workout',
      to: todayLoggerPath,
    });
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Log Workout', to: todayLoggerPath }),
    ]));
  });

  it.each(['/user-dashboard', '/user-dashboard/progress', '/user-dashboard/creative', '/user-dashboard/community'])(
    'routes public user guidance from %s to today-loaded logging',
    (pathname) => {
      const guide = getDashboardTeachMeGuide({
        role: 'user',
        pathname,
      });

      expect(guide.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: 'Log Workout', to: todayLoggerPath }),
      ]));
    },
  );

  it('makes the public user default primary action load today', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard',
    });

    expect(guide.primaryAction).toEqual({
      label: 'Log Workout',
      to: todayLoggerPath,
    });
  });
});
