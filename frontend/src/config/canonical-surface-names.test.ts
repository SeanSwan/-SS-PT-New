/**
 * TEST: canonical-surface-names registry contract.
 * Locks the SUPER-PROMPT §4 naming streamline: one name per surface, and
 * every registry route must resolve to a REGISTERED role route — this is
 * the regression lock for the 2026-07-13 "Build Plan → schedule" misroute,
 * where an unregistered sidebar target fell through the dashboard
 * catch-all and silently opened the scheduling calendar.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
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

  it('absorbs Build Plan into the Workout Planner mount (C7 retirement + misroute regression lock)', () => {
    // Workout-OS C7 (2026-07-29): the Build Plan surface was retired as a
    // strict subset of the Workout Planner. Its registry route must resolve
    // to the REGISTERED planner mount, never a dead or forked target.
    expect(surfaceRoute('buildPlan', 'trainer')).toBe(surfaceRoute('workoutPlanner', 'trainer'));
    const entry = findRoleRoute('trainer', surfaceRoute('buildPlan', 'trainer')!);
    expect(entry).toBeDefined();
    expect(entry!.title).toBe(surfaceName('workoutPlanner'));
  });

  it('titles the Workout Planner with THE one name on both operator roles', () => {
    for (const role of ['admin', 'trainer'] as const) {
      const entry = findRoleRoute(role, surfaceRoute('workoutPlanner', role)!);
      expect(entry).toBeDefined();
      expect(entry!.title).toBe(surfaceName('workoutPlanner'));
    }
  });
});

describe('retired-name tripwire (structural enforcement of the one-name law)', () => {
  // 'Plan Library' remains the honest name of the Client Hub per-client
  // saved-plans SECTION (a different surface) — allow it only there.
  const PLAN_LIBRARY_ALLOWLIST = 'components/DashBoard/workspaces/clients-team/';
  // Historical slice-receipt comment, not a user-facing string.
  const HISTORICAL_ALLOWLIST = ['components/DashBoard/Pages/admin-workout-planner/SavedPlanCard.test.tsx'];

  const srcRoot = join(__dirname, '..');
  const offenders: Record<string, string[]> = { planLibrary: [], swanStudiosPlanner: [] };

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry) || full === __filename) continue;
      const rel = relative(srcRoot, full).replace(/\\/g, '/');
      const source = readFileSync(full, 'utf8');
      if (source.includes('Plan Library')
        && !rel.startsWith(PLAN_LIBRARY_ALLOWLIST)
        && !HISTORICAL_ALLOWLIST.includes(rel)) {
        offenders.planLibrary.push(rel);
      }
      if (source.includes('Swan Studios Workout Planner')) offenders.swanStudiosPlanner.push(rel);
    }
  };

  it('keeps retired planner names out of the source tree', () => {
    walk(srcRoot);
    expect(offenders.planLibrary, 'retired "Plan Library" leaked outside the Client Hub section').toEqual([]);
    expect(offenders.swanStudiosPlanner, 'retired "Swan Studios Workout Planner" must not return').toEqual([]);
  });
});
