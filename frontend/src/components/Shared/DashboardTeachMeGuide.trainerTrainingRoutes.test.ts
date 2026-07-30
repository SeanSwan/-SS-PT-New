import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide trainer training routes', () => {
  it('teaches the retired Build Plan and workout-forge paths as the Workout Planner flow (C7 absorption)', () => {
    // Workout-OS C7 (2026-07-29): /build-plan and /workout-forge redirect
    // into the Workout Planner, so their teach-me copy must be the planner
    // lesson — never a lesson for a surface that no longer exists.
    for (const pathname of [
      '/dashboard/trainer/build-plan',
      '/dashboard/trainer/workout-forge',
    ]) {
      const guide = getDashboardTeachMeGuide({ role: 'trainer', pathname });

      expect(guide.title).toBe('Trainer Workout Planner');
      expect(guide.primaryAction).toEqual({
        label: 'Open Workout Planner',
        to: '/dashboard/trainer/workout-planner',
      });
      expect(guide.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: 'Workout Planner', to: '/dashboard/trainer/workout-planner' }),
        expect.objectContaining({ label: 'My Clients', to: '/dashboard/trainer/clients' }),
      ]));
      expect(guide.primaryPrompt).toContain('Workout Planner');
    }
  });

  it('keeps trainer Workout Planner, equipment, and bootcamp on the exact tool they opened', () => {
    const planner = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/workout-planner',
    });

    expect(planner.title).toBe('Trainer Workout Planner');
    expect(planner.primaryAction).toEqual({
      label: 'Open Workout Planner',
      to: '/dashboard/trainer/workout-planner',
    });
    expect(planner.primaryPrompt).toContain('Workout Planner');
    expect(planner.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Workout Planner', to: '/dashboard/trainer/workout-planner' }),
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
