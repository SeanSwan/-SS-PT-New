import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide admin self planner routes', () => {
  it('teaches owner self-planning when the admin planner is opened in self mode', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/workout-planner',
      search: '?self=1&source=swan-coach',
    });

    expect(guide.title).toBe('Admin self workout planning');
    expect(guide.primaryAction).toEqual({
      label: 'Build My Plan',
      to: '/dashboard/admin/workout-planner?self=1',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Keep the target on your owner profile/i),
      expect.stringMatching(/Build or generate today's plan/i),
      expect.stringMatching(/send it to Log My Workout/i),
    ]);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Build My Plan', to: '/dashboard/admin/workout-planner?self=1' }),
      expect.objectContaining({ label: 'Log My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' }),
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/admin/coach-assistant' }),
    ]));
    expect(guide.primaryPrompt).toContain('admin self workout planning');
  });

  it('keeps normal admin planner teaching for client and team planning', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/workout-planner',
    });

    expect(guide.title).toBe('Admin Plan Library');
    expect(guide.primaryAction).toEqual({
      label: 'Open Plan Library',
      to: '/dashboard/admin/workout-planner',
    });
  });
});
