import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide user profile summary', () => {
  it('teaches the profile tab with profile-specific summary copy', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'user',
      pathname: '/user-dashboard/profile#profile',
    });

    expect(guide.title).toBe('Profile proof setup');
    expect(guide.summary).toMatch(/profile/i);
    expect(guide.summary).toMatch(/identity|public/i);
    expect(guide.summary).toMatch(/training/i);
    expect(guide.summary).not.toBe(
      'Use the public dashboard as the personal proof hub: Home, training proof, Studio, community, and profile all stay connected.',
    );
    expect(guide.primaryAction).toEqual({
      label: 'Open Profile',
      to: '/user-dashboard/profile',
    });
    expect(guide.primaryPrompt).toContain('profile workflow');
  });
});
