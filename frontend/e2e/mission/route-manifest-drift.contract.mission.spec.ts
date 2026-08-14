/**
 * FILE: route-manifest-drift.contract.mission.spec.ts
 * PURPOSE: Fail when the crawl's route table and the application's real route
 * table disagree, in either direction.
 * OWNER: SwanStudios Mission QA.
 *
 * WHY: the crawl's ~85 routes were hand-typed and connected to nothing. Coverage
 * was reported as "visited / total" against that same hand-typed total, so a
 * route the list had never heard of could not lower the number. When this gate
 * was first run it found 45 live dashboard routes the production audit had never
 * visited — among them the trainer commission ledger, admin trainer-payouts,
 * session allocation, and the owner support inbox. Every one of them reported as
 * 100% covered, because absence cannot fail an assertion nobody wrote.
 *
 * Pure logic: no `page` fixture, so no browser is launched.
 */

import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { roleRoutes } from './production-dashboard-crawl.routes';
import { CRAWL_MS_PER_ROUTE, crawlTimeoutFor } from './production-dashboard-crawl.report';
import {
  MANIFEST_ROLES,
  readDashboardRouteManifest,
  readUserDashboardRoutes,
  routeWithoutQuery,
  type ManifestRole,
} from './dashboardRouteManifest';
import { UNCRAWLED_ROUTES, isAcknowledgedUncrawled } from './uncrawledRoutes';

/** `/dashboard/<role>` is the role root; the layout redirects it to that role's defaultPath. */
const roleRoot = (role: ManifestRole) => `/dashboard/${role}`;

function crawledPaths(role: ManifestRole): Set<string> {
  return new Set(roleRoutes[role].map(routeWithoutQuery));
}

test.describe('@mission @contract dashboard route manifest drift', () => {
  test('the manifest parses real routes for every role — never an empty set', () => {
    // An empty manifest would make every assertion below vacuously true, which is
    // the same green-on-nothing failure the crawl report contract guards against.
    const manifest = readDashboardRouteManifest();
    for (const role of MANIFEST_ROLES) {
      expect(manifest[role].length, `${role} manifest is empty`).toBeGreaterThan(10);
      for (const routePath of manifest[role]) {
        expect(routePath.startsWith(`/dashboard/${role}/`), `${routePath} malformed`).toBe(true);
      }
    }
  });

  test('the parser throws loudly if the canonical route table moves', () => {
    // Silence here would mean the crawl quietly stops noticing new routes forever.
    // This spec file is a real, readable .ts file that does NOT declare
    // roleConfigurations — exactly the shape of "the table was moved or renamed".
    const notTheRouteTable = fileURLToPath(import.meta.url);
    expect(() => readDashboardRouteManifest(notTheRouteTable)).toThrow(/roleConfigurations/);
  });

  for (const role of MANIFEST_ROLES) {
    test(`every ${role} route is crawled or explicitly acknowledged`, () => {
      const manifest = readDashboardRouteManifest()[role];
      const crawled = crawledPaths(role);

      const unaccounted = manifest.filter(
        (routePath) => !crawled.has(routePath) && !isAcknowledgedUncrawled(routePath),
      );

      expect(
        unaccounted,
        `${role}: ${unaccounted.length} live route(s) are neither crawled nor listed in `
        + 'uncrawledRoutes.ts. Add them to the crawl, or acknowledge them there with a reason.',
      ).toEqual([]);
    });

    test(`every crawled ${role} route still exists in the app`, () => {
      // The reverse drift: a route renamed or deleted in the app leaves a dead
      // entry here, and the crawl reports a route-failure that is the test's own
      // fault rather than the product's.
      const manifest = new Set(readDashboardRouteManifest()[role]);
      const dead = [...crawledPaths(role)].filter(
        (routePath) => !manifest.has(routePath) && routePath !== roleRoot(role),
      );

      expect(dead, `${role}: crawl visits route(s) the app no longer defines`).toEqual([]);
    });
  }

  test('the user role is drift-checked too — it had NO gate at all', () => {
    // /user-dashboard/:tab is one parameterised route, so the user role is absent
    // from roleConfigurations and the first version of this gate skipped it
    // entirely. That hole hid /user-dashboard/groups — a shipped feature the
    // audit had never visited.
    const app = readUserDashboardRoutes();
    expect(app.length).toBeGreaterThan(5);

    const crawled = new Set(roleRoutes.user.map(routeWithoutQuery));
    const unaccounted = app.filter((routePath) => !crawled.has(routePath));

    expect(
      unaccounted,
      `${unaccounted.length} user tab(s) exist in the app but are never crawled`,
    ).toEqual([]);
  });

  test('every crawled user route is still a real tab', () => {
    const app = new Set(readUserDashboardRoutes());
    const dead = roleRoutes.user.map(routeWithoutQuery).filter((routePath) => !app.has(routePath));
    expect(dead, 'crawl visits user tab(s) the app no longer defines').toEqual([]);
  });

  test('the crawl timeout tracks the route count, not a constant that goes stale', () => {
    // Adding 38 routes took admin from 28 to 61. Against the old flat 600s the
    // crawl would have run out of time partway and reported a partial run — an
    // audit that can never pass, for no product reason.
    const small = crawlTimeoutFor(10);
    const large = crawlTimeoutFor(61);

    expect(large).toBeGreaterThan(small);
    expect(large).toBeGreaterThanOrEqual(61 * CRAWL_MS_PER_ROUTE);
    // A small table never drops BELOW the historical floor.
    expect(small).toBeGreaterThanOrEqual(600_000);
    // And the real tables all get more than the floor's worth of headroom.
    for (const role of MANIFEST_ROLES) {
      expect(crawlTimeoutFor(roleRoutes[role].length))
        .toBeGreaterThanOrEqual(roleRoutes[role].length * CRAWL_MS_PER_ROUTE);
    }
  });

  test('every acknowledged uncrawled route is real, reasoned, and still needed', () => {
    const all = new Set(MANIFEST_ROLES.flatMap((role) => readDashboardRouteManifest()[role]));

    for (const entry of UNCRAWLED_ROUTES) {
      // A stale acknowledgement is a licence to skip a route that no longer
      // exists — and it would silently absorb a future route of the same name.
      expect(all.has(entry.path), `${entry.path} is acknowledged but not a real route`).toBe(true);
      expect(entry.reason.length, `${entry.path} needs a real reason`).toBeGreaterThan(30);
      expect(entry.reason, `${entry.path}: "${entry.reason}" is not a reason`)
        .not.toMatch(/^(flaky|later|not important|todo|wip)\.?$/i);
    }
  });
});
