import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide engagement and achievement routes', () => {
  it('teaches mounted admin engagement routes without falling back to the generic command center', () => {
    const gamification = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/gamification',
    });

    expect(gamification.title).toBe('Admin engagement engine');
    expect(gamification.primaryAction).toEqual({
      label: 'Open Gamification',
      to: '/dashboard/admin/gamification',
    });
    expect(gamification.primaryPrompt).toContain('engagement');
    expect(gamification.title).not.toBe('Admin command center');

    const sprint = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/sprint-planner',
    });

    expect(sprint.title).toBe('Admin sprint planning');
    expect(sprint.primaryAction).toEqual({
      label: 'Open Sprint Planner',
      to: '/dashboard/admin/sprint-planner',
    });

    const competition = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/virtual-olympics',
    });

    expect(competition.title).toBe('Admin engagement engine');
    expect(competition.primaryAction).toEqual({
      label: 'Open Virtual Olympics',
      to: '/dashboard/admin/virtual-olympics',
    });
  });

  it('teaches trainer achievement routes as trainer workflow surfaces', () => {
    const home = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/my-home',
    });

    expect(home.title).toBe('Trainer achievement space');
    expect(home.primaryAction).toEqual({
      label: 'Open My Home',
      to: '/dashboard/trainer/my-home',
    });
    expect(home.primaryPrompt).toContain('achievement');

    const competition = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/virtual-olympics',
    });

    expect(competition.title).toBe('Trainer competition flow');
    expect(competition.primaryAction).toEqual({
      label: 'Open Virtual Olympics',
      to: '/dashboard/trainer/virtual-olympics',
    });
  });

  it('teaches the client My Home route as an achievement route tied back to training proof', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/my-home',
    });

    expect(guide.title).toBe('Client achievement home');
    expect(guide.primaryAction).toEqual({
      label: 'Open My Home',
      to: '/dashboard/client/my-home',
    });
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Rewards', to: '/dashboard/client/rewards' }),
      expect.objectContaining({ label: 'Progress', to: '/dashboard/client/progress' }),
    ]));
    expect(guide.primaryPrompt).toContain('achievement home');
  });
});
