import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide public user tab routes', () => {
  it('teaches public user tabs without sending everyone back to home or generic logging', () => {
    expect(getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard/creative#creative',
    }).primaryAction).toEqual({
      label: 'Open Creative',
      to: '/user-dashboard/creative',
    });

    expect(getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard/challenges#challenges',
    }).primaryAction).toEqual({
      label: 'Open Challenges',
      to: '/user-dashboard/challenges',
    });

    expect(getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard/notifications#notifications',
    }).primaryAction).toEqual({
      label: 'Open Notifications',
      to: '/user-dashboard/notifications',
    });

    expect(getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard/nutrition#nutrition',
    }).primaryAction).toEqual({
      label: 'Open Nutrition',
      to: '/user-dashboard/nutrition',
    });
  });

  it('gives every routable user tab a tab-specific Coach prompt and action rail', () => {
    const userTabs = [
      ['reels', 'Open Reels'],
      ['friends', 'Open Friends'],
      ['challenges', 'Open Challenges'],
      ['notifications', 'Open Notifications'],
      ['creative', 'Open Creative'],
      ['photos', 'Open Photo Library'],
      ['about', 'Open About'],
      ['activity', 'Review Activity'],
      ['nutrition', 'Open Nutrition'],
      ['progress', "Log Today's Workout"],
      ['profile', 'Open Profile'],
    ] as const;

    userTabs.forEach(([tab, label]) => {
      const guide = getDashboardTeachMeGuide({
        role: 'user',
        pathname: `/user-dashboard/${tab}#${tab}`,
      });

      expect(guide.primaryAction.label).toBe(label);
      expect(guide.actions).toEqual(expect.arrayContaining([
        expect.objectContaining(guide.primaryAction),
        expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/client/coach-assistant' }),
      ]));
      expect(guide.primaryPrompt).toContain(tab);
      expect(guide.primaryPrompt).not.toBe('teach me the user dashboard training workflow');
    });
  });

  it('teaches the progress tab as the mounted workout proof and logger handoff', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard/progress#progress',
    });

    expect(guide.title).toBe('User workout proof loop');
    expect(guide.summary).toMatch(/Exercise Usage|Log Today|Ask Coach/i);
    expect(guide.focus).toMatch(/logged workout history|today's workout/i);
    expect(guide.primaryAction).toEqual({
      label: "Log Today's Workout",
      to: '/dashboard/client/log-workout?loadPlan=today',
    });
    expect(guide.fastPath.join(' ')).toMatch(/Exercise Usage|Log Today|Ask Coach/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/client/coach-assistant' }),
      expect.objectContaining({ label: 'Progress Tab', to: '/user-dashboard/progress' }),
      expect.objectContaining({ label: "Log Today's Workout", to: '/dashboard/client/log-workout?loadPlan=today' }),
    ]));
    expect(guide.primaryPrompt).toContain('workouts tab');
  });
});
