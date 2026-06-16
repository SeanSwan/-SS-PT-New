import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide admin special routes', () => {
  it('teaches admin-only immigration and design-system routes as specific jobs', () => {
    const immigration = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/immigration',
    });

    expect(immigration.title).toBe('Admin immigration workspace');
    expect(immigration.primaryAction).toEqual({
      label: 'Open Immigration',
      to: '/dashboard/admin/immigration',
    });
    expect(immigration.primaryPrompt).toContain('immigration');
    expect(immigration.title).not.toBe('Admin command center');

    const styleGuide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/style-guide',
    });

    expect(styleGuide.title).toBe('Admin design system check');
    expect(styleGuide.primaryAction).toEqual({
      label: 'Open Style Guide',
      to: '/dashboard/admin/style-guide',
    });
    expect(styleGuide.fastPath.join(' ')).toMatch(/tokens|mobile|contrast/i);
    expect(styleGuide.title).not.toBe('Admin command center');
  });
});
