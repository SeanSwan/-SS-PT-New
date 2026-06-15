import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide admin people routes', () => {
  it('keeps onboarding and assignment routes on their exact first click', () => {
    const cases = [
      ['/dashboard/admin/trainer-onboarding', 'Add Trainer', '/dashboard/admin/trainer-onboarding'],
      ['/dashboard/admin/client-onboarding', 'Onboard Client', '/dashboard/admin/client-onboarding'],
      ['/dashboard/admin/client-trainer-assignments', 'Assign Clients', '/dashboard/admin/client-trainer-assignments'],
      ['/dashboard/admin/trainer-management', 'Open Trainer Profiles', '/dashboard/admin/trainer-management'],
      ['/dashboard/admin/user-onboarding', 'Add User', '/dashboard/admin/user-onboarding'],
    ] as const;

    cases.forEach(([pathname, label, to]) => {
      const guide = getDashboardTeachMeGuide({ role: 'admin', pathname });

      expect(guide.title).toBe('Admin people setup');
      expect(guide.primaryAction).toEqual({ label, to });
      expect(guide.primaryAction.to).not.toBe('/dashboard/admin/user-management');
      expect(guide.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ label, to }),
      ]));
    });
  });
});
