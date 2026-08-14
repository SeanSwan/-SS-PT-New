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
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    //
    // This used to pass THIS SPEC FILE as the "table is missing" case. That broke
    // the moment the file gained parser-hardening fixtures that legitimately
    // contain the string `roleConfigurations` — the anchor was found, the parse
    // continued, and the test failed on a different error. Same incidental-text
    // fragility Kimi found in the backend twin (which passed only because its
    // FILENAME contained "Registry"). A guard test must not depend on what happens
    // to be written elsewhere in its own file.
    const dir = mkdtempSync(join(tmpdir(), 'swan-no-table-'));
    try {
      const file = join(dir, 'not-the-route-table.tsx');
      writeFileSync(file, 'export const somethingElse = { a: 1 };\n', 'utf8');
      expect(() => readDashboardRouteManifest(file)).toThrow(/roleConfigurations/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
    //
    // THE ENV OVERRIDE MUST BE CLEARED (Kimi K3, 2026-08-14): crawlTimeoutFor
    // returns the override BEFORE any route-count math, so if CI sets
    // SWAN_DASHBOARD_CRAWL_TEST_TIMEOUT_MS — which is the documented way to pin
    // it — every assertion below passed while the function was a flat constant.
    // The test would have been green with the exact defect it names fully present.
    const saved = process.env.SWAN_DASHBOARD_CRAWL_TEST_TIMEOUT_MS;
    delete process.env.SWAN_DASHBOARD_CRAWL_TEST_TIMEOUT_MS;

    try {
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

      // The override still wins when it IS set — pin the documented behaviour too.
      process.env.SWAN_DASHBOARD_CRAWL_TEST_TIMEOUT_MS = '1234';
      expect(crawlTimeoutFor(999)).toBe(1234);
    } finally {
      if (saved === undefined) delete process.env.SWAN_DASHBOARD_CRAWL_TEST_TIMEOUT_MS;
      else process.env.SWAN_DASHBOARD_CRAWL_TEST_TIMEOUT_MS = saved;
    }
  });

  test.describe('parser hardening — every fix below is proven, not asserted', () => {
    // External review (Kimi K3, 2026-08-14) named four ways this parser could
    // return a WRONG-BUT-NONEMPTY manifest, so the fail-loud guard never trips and
    // the gate silently checks fewer routes than it claims. Each is pinned here.
    const withSource = (body: string, run: (file: string) => void) => {
      const dir = mkdtempSync(join(tmpdir(), 'swan-manifest-'));
      try {
        const file = join(dir, 'routes.tsx');
        writeFileSync(file, body, 'utf8');
        run(file);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    };

    const source = (adminRoutes: string) => `
export const roleConfigurations = {
  admin: {
    routes: [
${adminRoutes}
    ],
    defaultPath: '/overview',
  },
  trainer: {
    routes: [
      { path: '/overview', component: T, title: 't', description: 'd' },
      { path: '/clients', component: T, title: 't', description: 'd' },
    ],
    defaultPath: '/overview',
  },
  client: {
    routes: [
      { path: '/overview', component: C, title: 't', description: 'd' },
      { path: '/progress', component: C, title: 't', description: 'd' },
    ],
    defaultPath: '/overview',
  },
};
`;

    test('a DOUBLE-QUOTED path is parsed, not silently dropped', () => {
      withSource(source(`      { path: '/a', component: A, title: 't', description: 'd' },
      { path: "/b", component: A, title: 't', description: 'd' },`), (file) => {
        expect(readDashboardRouteManifest(file).admin)
          .toEqual(['/dashboard/admin/a', '/dashboard/admin/b']);
      });
    });

    test('an UNPARSEABLE path form THROWS rather than shrinking the manifest', () => {
      // Widening the regex alone would leave the NEXT unanticipated syntax just as
      // quiet. The count-check is what makes it loud.
      withSource(source(`      { path: '/a', component: A, title: 't', description: 'd' },
      { path: ROUTE_CONST, component: A, title: 't', description: 'd' },`), (file) => {
        expect(() => readDashboardRouteManifest(file)).toThrow(/parsed 1 of 2/);
      });
    });

    test('a renamed role key cannot make one role inherit ANOTHER role\'s routes', () => {
      // The old unbounded indexOf('routes: [') searched past the role block, so
      // admin silently adopted trainer's array — full, plausible, entirely wrong.
      const body = source('').replace('  admin: {\n    routes: [\n\n    ],', '  admin: {\n    adminRoutes: [\n    ],');
      withSource(body, (file) => {
        const parsed = (() => {
          try { return readDashboardRouteManifest(file).admin; } catch (error) { return error; }
        })();
        // Either it throws, or it returns admin's own (empty→throw) — what it must
        // NEVER do is return trainer's routes relabelled as admin's.
        expect(parsed).not.toEqual(['/dashboard/admin/overview', '/dashboard/admin/clients']);
      });
    });

    test('a user tab id with uppercase or digits is parsed, not dropped', () => {
      const dir = mkdtempSync(join(tmpdir(), 'swan-tabs-'));
      try {
        const file = join(dir, 'tabs.ts');
        writeFileSync(file, `export const USER_DASHBOARD_TAB_IDS = [\n  'home',\n  'aiTools',\n  'group2',\n];\n`, 'utf8');
        expect(readUserDashboardRoutes(file))
          .toEqual(['/user-dashboard', '/user-dashboard/aiTools', '/user-dashboard/group2']);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
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
