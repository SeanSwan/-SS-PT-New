import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide admin schedule routes', () => {
  it('keeps schedule and session-credit routes on their exact first click', () => {
    const cases = [
      ['/dashboard/admin/admin-sessions', 'Review Sessions', '/dashboard/admin/admin-sessions'],
      ['/dashboard/admin/master-schedule', 'Open Master Schedule', '/dashboard/admin/master-schedule'],
      ['/dashboard/admin/session-allocation', 'Manage Session Allocation', '/dashboard/admin/session-allocation'],
    ] as const;

    cases.forEach(([pathname, label, to]) => {
      const guide = getDashboardTeachMeGuide({ role: 'admin', pathname });

      expect(guide.title).toBe('Admin schedule control');
      expect(guide.primaryAction).toEqual({ label, to });
      expect(guide.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ label, to }),
      ]));
    });
  });
});
