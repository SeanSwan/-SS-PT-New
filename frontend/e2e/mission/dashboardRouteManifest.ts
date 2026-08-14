/**
 * FILE: dashboardRouteManifest.ts
 * PURPOSE: Derive the dashboard's REAL route table from the app source, so the
 * crawl's hand-typed list can be checked against reality instead of trusted.
 * OWNER: SwanStudios Mission QA.
 *
 * WHY THIS EXISTS: `production-dashboard-crawl.routes.ts` lists ~85 routes by
 * hand. Nothing connected it to the application. Ship a new dashboard page and
 * the crawl simply never visits it — and because coverage is reported as
 * "visited / total" against that same hand-typed total, the run still says
 * 100%. The gap is invisible by construction: the crawl cannot miss a route it
 * has never heard of.
 *
 * WHY PARSE INSTEAD OF IMPORT: the canonical table lives in
 * `UniversalDashboardLayout.routes.tsx`, which eagerly imports every dashboard
 * page component. Importing it from a spec would drag the entire component
 * graph — styled-components, contexts, lazy chunks — into the test process.
 * Reading the source text costs nothing and cannot execute app code.
 *
 * FAIL-LOUD CONTRACT: if the parse yields no routes for a role, that is an
 * ERROR, never an empty manifest. An empty expected-set makes every drift
 * assertion vacuously true — the same "0/0 · complete" green-on-nothing failure
 * the crawl report contract already guards against. A refactor that changes the
 * file's shape must break this loudly, not quietly stop checking.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** The canonical dashboard route table, relative to this file. */
export const ROUTES_SOURCE = path.resolve(
  here,
  '../../src/components/DashBoard/UniversalDashboardLayout.routes.tsx',
);

/** Roles served by `roleConfigurations`. `user` lives on /user-dashboard and is out of scope here. */
export type ManifestRole = 'admin' | 'trainer' | 'client';
export const MANIFEST_ROLES: readonly ManifestRole[] = ['admin', 'trainer', 'client'] as const;

/**
 * Full dashboard paths per role, e.g. `/dashboard/admin/overview`.
 * Derived from the app source at call time — there is no generated artifact to
 * go stale, because a committed manifest is just one more copy to drift.
 */
export function readDashboardRouteManifest(source = ROUTES_SOURCE): Record<ManifestRole, string[]> {
  const text = readFileSync(source, 'utf8');

  const configAt = text.indexOf('export const roleConfigurations');
  if (configAt === -1) {
    throw new Error(
      `dashboardRouteManifest: "export const roleConfigurations" not found in ${source}. `
      + 'The canonical route table moved or was renamed — fix this parser rather than '
      + 'letting the crawl silently stop checking for new routes.',
    );
  }

  const manifest = {} as Record<ManifestRole, string[]>;

  for (const role of MANIFEST_ROLES) {
    const roleAt = text.indexOf(`\n  ${role}: {`, configAt);
    if (roleAt === -1) {
      throw new Error(`dashboardRouteManifest: no "${role}:" block in ${source}`);
    }

    const routesAt = text.indexOf('routes: [', roleAt);
    const routesEnd = text.indexOf('\n    ],', routesAt);
    if (routesAt === -1 || routesEnd === -1) {
      throw new Error(`dashboardRouteManifest: unterminated routes array for "${role}" in ${source}`);
    }

    const block = text.slice(routesAt, routesEnd);
    const paths = [...block.matchAll(/\bpath:\s*'([^']+)'/g)].map((match) => match[1]);

    if (paths.length === 0) {
      throw new Error(
        `dashboardRouteManifest: parsed ZERO routes for "${role}". Refusing to return an empty `
        + 'manifest — an empty expected-set makes every drift check vacuously pass.',
      );
    }

    manifest[role] = paths.map((routePath) => `/dashboard/${role}${routePath}`);
  }

  return manifest;
}

/**
 * The `user` role is NOT in roleConfigurations — /user-dashboard/:tab is a single
 * parameterised route, and the crawl's entries are TAB values, not routes. Their
 * canonical list lives here.
 */
export const USER_TABS_SOURCE = path.resolve(
  here,
  '../../src/components/UserDashboard/types/UserDashboardTypes.ts',
);

/**
 * Crawlable /user-dashboard paths. `home` is the bare `/user-dashboard`, so it is
 * emitted in that form rather than as `/user-dashboard/home`.
 *
 * Without this, the user role had no drift check at all and `/user-dashboard/groups`
 * — a shipped feature — was never visited by the audit.
 */
export function readUserDashboardRoutes(source = USER_TABS_SOURCE): string[] {
  const text = readFileSync(source, 'utf8');

  const at = text.indexOf('export const USER_DASHBOARD_TAB_IDS');
  if (at === -1) {
    throw new Error(
      `dashboardRouteManifest: "USER_DASHBOARD_TAB_IDS" not found in ${source}. The canonical `
      + 'user tab list moved or was renamed — fix this parser rather than letting the crawl '
      + 'silently stop checking for new tabs.',
    );
  }

  const end = text.indexOf('];', at);
  const tabs = [...text.slice(at, end).matchAll(/'([a-z-]+)'/g)].map((match) => match[1]);

  if (tabs.length === 0) {
    throw new Error('dashboardRouteManifest: parsed ZERO user tabs. Refusing to return an empty set.');
  }

  return tabs.map((tab) => (tab === 'home' ? '/user-dashboard' : `/user-dashboard/${tab}`));
}

/** Strip the query string a crawl entry may carry (`/x?intent=y` visits route `/x`). */
export function routeWithoutQuery(entry: string): string {
  const at = entry.indexOf('?');
  return at === -1 ? entry : entry.slice(0, at);
}
