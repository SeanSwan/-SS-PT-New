import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide admin secondary route specificity', () => {
  it('teaches the admin equipment screen as its own setup job', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/equipment',
    });

    expect(guide.title).toBe('Admin equipment command');
    expect(guide.primaryAction).toEqual({
      label: 'Open Equipment',
      to: '/dashboard/admin/equipment',
    });
    expect(guide.fastPath.join(' ')).toMatch(/equipment/i);
    expect(guide.primaryPrompt).toContain('equipment');
    expect(guide.primaryAction.label).not.toBe('Open Plan Library');
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Equipment', to: '/dashboard/admin/equipment' }),
      expect.objectContaining({ label: 'Plan Library', to: '/dashboard/admin/workout-planner' }),
      expect.objectContaining({ label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' }),
    ]));
  });

  it('teaches the admin bootcamp screen as a group-class builder', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/bootcamp',
    });

    expect(guide.title).toBe('Admin bootcamp builder');
    expect(guide.primaryAction).toEqual({
      label: 'Open Bootcamp',
      to: '/dashboard/admin/bootcamp',
    });
    expect(guide.fastPath.join(' ')).toMatch(/group|bootcamp/i);
    expect(guide.primaryPrompt).toContain('bootcamp');
    expect(guide.primaryAction.label).not.toBe('Open Plan Library');
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Bootcamp', to: '/dashboard/admin/bootcamp' }),
      expect.objectContaining({ label: 'Plan Library', to: '/dashboard/admin/workout-planner' }),
      expect.objectContaining({ label: 'Schedule', to: '/dashboard/admin/master-schedule' }),
    ]));
  });
});
