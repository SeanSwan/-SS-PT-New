/**
 * TEST: canonical-surface-names registry contract.
 * Locks the SUPER-PROMPT §4 naming streamline: one name per surface, and
 * every registry route must resolve to a REGISTERED role route — this is
 * the regression lock for the 2026-07-13 "Build Plan → schedule" misroute,
 * where an unregistered sidebar target fell through the dashboard
 * catch-all and silently opened the scheduling calendar.
 */
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_SURFACES,
  surfaceName,
  surfaceRoute,
  type SurfaceRole,
} from './canonical-surface-names';
import { roleConfigurations } from '../components/DashBoard/UniversalDashboardLayout.routes';

const surfaceKeys = Object.keys(CANONICAL_SURFACES) as Array<keyof typeof CANONICAL_SURFACES>;

const findRoleRoute = (role: SurfaceRole, absolutePath: string) => {
  const prefix = `/dashboard/${role}`;
  if (!absolutePath.startsWith(`${prefix}/`)) return undefined;
  const suffix = absolutePath.slice(prefix.length);
  return roleConfigurations[role].routes.find(({ path }) => path === suffix);
};

describe('canonical surface naming registry', () => {
  it('keeps ids, names, and test ids unique and non-empty', () => {
    const ids = surfaceKeys.map((key) => CANONICAL_SURFACES[key].id);
    const names = surfaceKeys.map((key) => CANONICAL_SURFACES[key].name);
    const testIds = surfaceKeys.map((key) => CANONICAL_SURFACES[key].testId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(testIds).size).toBe(testIds.length);

    for (const key of surfaceKeys) {
      const surface = CANONICAL_SURFACES[key];
      expect(surface.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(surface.name.trim().length).toBeGreaterThan(2);
      expect(surface.ariaLabel).toContain(surface.name);
      expect(Object.keys(surface.routes).length).toBeGreaterThan(0);
    }
  });

  it('resolves every registry route to a REGISTERED role route (no dead nav targets)', () => {
    for (const key of surfaceKeys) {
      const surface = CANONICAL_SURFACES[key];
      for (const [role, absolutePath] of Object.entries(surface.routes) as Array<[SurfaceRole, string]>) {
        const entry = findRoleRoute(role, absolutePath);
        expect(
          entry,
          `${String(key)} ${role} route ${absolutePath} must be a registered ${role} dashboard route`,
        ).toBeDefined();
        expect(
          surface.subtitles[role],
          `${String(key)} must carry a ${role} subtitle for its ${role} route`,
        ).toBeTruthy();
      }
    }
  });

  it('mounts Build Plan at /dashboard/trainer/build-plan with the canonical title (misroute regression lock)', () => {
    const entry = findRoleRoute('trainer', surfaceRoute('buildPlan', 'trainer')!);
    expect(entry).toBeDefined();
    expect(entry!.title).toBe(surfaceName('buildPlan'));
  });

  it('titles the Workout Planner with THE one name on both operator roles', () => {
    for (const role of ['admin', 'trainer'] as const) {
      const entry = findRoleRoute(role, surfaceRoute('workoutPlanner', role)!);
      expect(entry).toBeDefined();
      expect(entry!.title).toBe(surfaceName('workoutPlanner'));
    }
  });
});
