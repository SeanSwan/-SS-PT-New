import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide admin Client Hub', () => {
  it('teaches Client Hub as the one-client training cockpit', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/client-management',
    });

    expect(guide.title).toBe('Admin Client Hub command');
    expect(guide.primaryAction).toEqual({
      label: 'Open Client Hub Training',
      to: '/dashboard/admin/client-management?tab=training',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/choose the client/i),
      expect.stringMatching(/training tab/i),
      expect.stringMatching(/log|progress|plan|coach/i),
    ]);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Log Client Workout',
        to: '/dashboard/admin/client-management?intent=log_workout',
      }),
      expect.objectContaining({
        label: 'Workout Planner',
        to: '/dashboard/admin/workout-planner',
      }),
      expect.objectContaining({
        label: 'Ask Coach',
        to: '/dashboard/admin/coach-assistant',
      }),
    ]));
    expect(guide.primaryPrompt).toContain('Client Hub');
    expect(guide.primaryPrompt).not.toBe('teach me the admin dashboard workflow');
  });
});
