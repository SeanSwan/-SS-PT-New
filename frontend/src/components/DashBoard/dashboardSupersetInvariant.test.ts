/**
 * dashboardSupersetInvariant.test.ts
 * ==================================
 * THE SUPERSET INVARIANT — the executable law behind Sean's requirement:
 * "As admin I need to do EVERYTHING from my admin dashboard without
 *  switching to trainer."
 *
 * WHY THIS TEST EXISTS (root cause, verified 2026-07-24):
 * `UniversalDashboardLayout.tsx:69-79` derives `activeRole` from the URL path
 * segment, not from the authenticated user. The moment an admin lands on any
 * `/dashboard/trainer/*` URL, `roleConfigurations[activeRole]` swaps the whole
 * route table and `shellPieces.tsx:73` swaps in the trainer sidebar — the
 * entire shell becomes the trainer dashboard. That is the literal mechanism
 * behind "it turns me into a trainer."
 *
 * The links were never the real defect. The defect is that some trainer
 * capabilities have NO admin mount, so an admin is FORCED onto a trainer URL
 * to reach them — and is silently demoted for doing so.
 *
 * THE INVARIANT: every trainer capability must either
 *   (a) have an equivalent mount under the admin role config, or
 *   (b) be explicitly declared role-exclusive below, WITH a written reason and
 *       the admin counterpart that serves the same job.
 * Silent gaps are forbidden. A new trainer-only route fails this test until
 * someone consciously decides which case it is.
 *
 * Source-text parsing (not module import) matches the established repo
 * precedent for structural truth tests — see ClientManagement.index.truth.test.ts
 * and MyClientsView.adminViewAs.test.ts — and avoids pulling the entire lazy
 * component graph into the test environment.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { WORKSPACE_CONFIG } from '../../config/dashboard-tabs';

const ROUTES_SOURCE = readFileSync(
  resolve(__dirname, './UniversalDashboardLayout.routes.tsx'),
  'utf8',
);

type RoleKey = 'admin' | 'trainer' | 'client';

/**
 * Slice the `roleConfigurations` literal into per-role blocks, then collect the
 * `path:` literals inside each. Deliberately structural: if the shape of the
 * config changes, this throws loudly rather than silently passing on an empty set.
 */
const extractRoutePaths = (role: RoleKey): string[] => {
  const roleMarkers: Record<RoleKey, string> = {
    admin: '\n  admin: {',
    trainer: '\n  trainer: {',
    client: '\n  client: {',
  };

  const start = ROUTES_SOURCE.indexOf(roleMarkers[role]);
  if (start === -1) throw new Error(`roleConfigurations.${role} block not found`);

  // The block ends at the next role marker, or at the end of the literal.
  const laterMarkers = (['admin', 'trainer', 'client'] as RoleKey[])
    .map((r) => ROUTES_SOURCE.indexOf(roleMarkers[r], start + 1))
    .filter((idx) => idx > start);
  const end = laterMarkers.length ? Math.min(...laterMarkers) : ROUTES_SOURCE.length;

  const block = ROUTES_SOURCE.slice(start, end);
  const paths = [...block.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);

  if (paths.length === 0) throw new Error(`No route paths parsed for role ${role}`);
  return paths;
};

/** Strip route params so '/nutrition/:clientId?' compares as '/nutrition'. */
const normalizePath = (path: string): string => path.split('/:')[0];

/**
 * Capabilities that are legitimately NOT mirrored onto the admin dashboard.
 * Each entry MUST name the admin counterpart that does the equivalent job —
 * that requirement is what stops this table from becoming a dumping ground
 * for "we didn't get to it yet."
 */
const DECLARED_ROLE_EXCLUSIVE: Record<string, { reason: string; adminCounterpart: string }> = {
  '/earnings': {
    reason:
      "A trainer's personal commission ledger is scoped to that trainer. The admin equivalent is the roster-wide payout ledger, not a personal earnings page.",
    adminCounterpart: '/trainer-payouts',
  },
  '/schedule': {
    reason:
      "The trainer surface is a personal appointment calendar. The admin's job is roster-wide scheduling, which is a genuinely different surface.",
    adminCounterpart: '/master-schedule',
  },
  '/clients': {
    reason:
      'Same component, audience-scoped: TrainerClientsWorkspace renders <ClientsWorkspace audience="trainer" />. The admin mounts the identical workspace at its own base.',
    adminCounterpart: '/client-management',
  },
  '/workout-forge': {
    reason:
      'Legacy alias that redirects to the canonical Build Plan surface. Aliases do not need mirroring; the canonical path does.',
    adminCounterpart: '/build-plan',
  },
};

describe('Dashboard superset invariant — admin ⊇ trainer', () => {
  it('parses both role route tables from the canonical config', () => {
    expect(extractRoutePaths('admin').length).toBeGreaterThan(0);
    expect(extractRoutePaths('trainer').length).toBeGreaterThan(0);
  });

  it('exposes every trainer capability to the admin, or declares it role-exclusive with a counterpart', () => {
    const adminPaths = new Set(extractRoutePaths('admin').map(normalizePath));
    const trainerPaths = extractRoutePaths('trainer').map(normalizePath);

    const gaps = trainerPaths.filter(
      (path) => !adminPaths.has(path) && !DECLARED_ROLE_EXCLUSIVE[path],
    );

    expect(
      gaps,
      `Admin is not a superset of trainer. These trainer capabilities have no admin mount and no declared exclusion, so an admin must navigate to /dashboard/trainer/* to use them — which flips activeRole (UniversalDashboardLayout.tsx:77) and reskins the entire shell into the trainer dashboard.\n\nGaps: ${gaps.join(', ')}\n\nFix by either mounting the capability under the admin role config, or adding a DECLARED_ROLE_EXCLUSIVE entry with a real reason and admin counterpart.`,
    ).toEqual([]);
  });

  it('keeps every declared exclusion honest — the named admin counterpart must actually exist', () => {
    const adminPaths = new Set(extractRoutePaths('admin').map(normalizePath));
    const trainerPaths = new Set(extractRoutePaths('trainer').map(normalizePath));

    for (const [path, { adminCounterpart, reason }] of Object.entries(DECLARED_ROLE_EXCLUSIVE)) {
      expect(reason.length, `Exclusion for ${path} needs a written reason`).toBeGreaterThan(20);

      const counterpartExists =
        adminPaths.has(normalizePath(adminCounterpart)) ||
        trainerPaths.has(normalizePath(adminCounterpart));

      expect(
        counterpartExists,
        `Declared exclusion "${path}" names admin counterpart "${adminCounterpart}", but no such route is mounted. A counterpart that does not exist is a silent capability gap wearing a justification.`,
      ).toBe(true);
    }
  });

  /**
   * A capability that is mounted but not listed in the admin sidebar is a dead
   * end reachable only by typing a URL — and a dead end is precisely what sends
   * the owner back to the trainer dashboard to get work done. Closing a route
   * gap without closing the nav gap does not solve Sean's problem.
   */
  it('surfaces every superset-closure capability in the admin sidebar, not just the router', () => {
    const navPrefixes = new Set(WORKSPACE_CONFIG.map((entry) => entry.prefix));

    const mustBeNavigable = [
      '/dashboard/admin/build-plan',
      '/dashboard/admin/client-progress',
      '/dashboard/admin/assessments',
      '/dashboard/admin/videos',
      '/dashboard/admin/live',
      '/dashboard/admin/creators',
    ];

    const missing = mustBeNavigable.filter((prefix) => !navPrefixes.has(prefix));

    expect(
      missing,
      `Mounted for admin but absent from WORKSPACE_CONFIG, so unreachable without typing a URL: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('keeps every admin sidebar entry pointed at the admin dashboard', () => {
    const strays = WORKSPACE_CONFIG.filter((entry) => !entry.prefix.startsWith('/dashboard/admin/'));

    expect(
      strays.map((entry) => `${entry.id} → ${entry.prefix}`),
      'An admin sidebar entry pointing outside /dashboard/admin/* would flip activeRole and reskin the shell mid-session.',
    ).toEqual([]);
  });

  it('does not carry stale exclusions for capabilities the trainer no longer has', () => {
    const trainerPaths = new Set(extractRoutePaths('trainer').map(normalizePath));

    const stale = Object.keys(DECLARED_ROLE_EXCLUSIVE).filter(
      (path) => !trainerPaths.has(normalizePath(path)),
    );

    expect(
      stale,
      `These exclusions describe trainer routes that no longer exist: ${stale.join(', ')}. Remove them so the table keeps telling the truth.`,
    ).toEqual([]);
  });
});