import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide trainer training routes', () => {
  it('teaches Build Plan as a save-to-logger and Plan Library handoff', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/build-plan',
    });

    expect(guide.title).toBe('Trainer Build Plan flow');
    expect(guide.summary).toMatch(/Log Today|Open Plan Library/i);
    expect(guide.focus).toMatch(/Log Today|Open Plan Library/i);
    expect(guide.fastPath.join(' ')).toMatch(/Log Today|Open Plan Library/i);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Build Plan', to: '/dashboard/trainer/build-plan' }),
      expect.objectContaining({ label: 'Log Today', to: '/dashboard/trainer/clients?intent=log_workout' }),
      expect.objectContaining({ label: 'Plan Library', to: '/dashboard/trainer/workout-planner' }),
    ]));
    expect(guide.primaryPrompt).toContain('logger');
  });

  it('keeps trainer Plan Library, equipment, and bootcamp on the exact tool they opened', () => {
    const planner = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/workout-planner',
    });

    expect(planner.title).toBe('Trainer Plan Library');
    expect(planner.primaryAction).toEqual({
      label: 'Open Plan Library',
      to: '/dashboard/trainer/workout-planner',
    });
    expect(planner.primaryPrompt).toContain('Plan Library');
    expect(planner.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Plan Library', to: '/dashboard/trainer/workout-planner' }),
      expect.objectContaining({ label: 'My Clients', to: '/dashboard/trainer/clients' }),
      expect.objectContaining({ label: 'Equipment', to: '/dashboard/trainer/equipment' }),
    ]));

    const equipment = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/equipment',
    });

    expect(equipment.title).toBe('Trainer equipment setup');
    expect(equipment.primaryAction).toEqual({
      label: 'Open Equipment',
      to: '/dashboard/trainer/equipment',
    });
    expect(equipment.primaryPrompt).toContain('equipment');
    expect(equipment.fastPath.join(' ')).toMatch(/equipment|constraints/i);
    expect(equipment.primaryAction.label).not.toMatch(/build/i);

    const bootcamp = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/bootcamp',
    });

    expect(bootcamp.title).toBe('Trainer bootcamp delivery');
    expect(bootcamp.primaryAction).toEqual({
      label: 'Open Bootcamp',
      to: '/dashboard/trainer/bootcamp',
    });
    expect(bootcamp.primaryPrompt).toContain('bootcamp');
    expect(bootcamp.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Bootcamp', to: '/dashboard/trainer/bootcamp' }),
      expect.objectContaining({ label: 'Schedule', to: '/dashboard/trainer/schedule' }),
      expect.objectContaining({ label: 'Equipment', to: '/dashboard/trainer/equipment' }),
    ]));
    expect(bootcamp.primaryAction.to).not.toBe('/dashboard/trainer/build-plan');
  });
});
