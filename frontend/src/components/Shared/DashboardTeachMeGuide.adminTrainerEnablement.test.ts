import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide admin trainer enablement', () => {
  it('teaches trainer permissions as the low-click trainer onboarding command path', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/trainer-permissions',
    });

    expect(guide.title).toBe('Admin trainer enablement');
    expect(guide.primaryAction).toEqual({
      label: 'Review Trainer Permissions',
      to: '/dashboard/admin/trainer-permissions',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/trainer account/i),
      expect.stringMatching(/permission/i),
      expect.stringMatching(/assignment/i),
    ]);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Trainer Permissions', to: '/dashboard/admin/trainer-permissions' }),
      expect.objectContaining({ label: 'Trainer Profiles', to: '/dashboard/admin/trainer-management' }),
      expect.objectContaining({ label: 'Client Assignments', to: '/dashboard/admin/client-trainer-assignments' }),
    ]));
    expect(guide.primaryPrompt).toContain('trainer enablement');
    expect(guide.primaryAction.label).not.toMatch(/workout|client log/i);
  });
});
