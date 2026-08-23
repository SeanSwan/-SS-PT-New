/**
 * aiCommandEndpointRouteTruth.contract.test.mjs
 * =============================================
 * Blueprint
 * ---------
 * PURPOSE   Lock the truthfulness of the `endpoint` field on every Swan Coach
 *           command. An endpoint string that names a route which does not exist is
 *           a Rule 75 trailhead-truth defect in a field that is HMAC-SIGNED into
 *           destructive-operation audit payloads
 *           (backend/services/ai/destructiveOperations.mjs:34) and surfaced as the
 *           event label on the execute response (routes/aiCommandRoutes.mjs:284).
 *           A forensic reviewer reading a signed audit record must not be pointed
 *           at a route that was never mounted.
 *
 * WHAT THIS TEST IS *NOT* — read before extending it
 * --------------------------------------------------
 * It deliberately does NOT assert that `roleRequired` is a subset of the role
 * middleware on the command's endpoint route. That comparison was proposed as an
 * "authz parity harness" and is UNSOUND, because the two sides are never connected
 * at runtime:
 *
 *   - `endpoint` is declarative metadata. Nothing dispatches on it.
 *   - Execution goes through a service dispatcher selected by command TYPE
 *     (commandDispatcher.mjs:347 `hasDispatcher`), not through an HTTP request to
 *     the app's own route. The route's middleware therefore never runs for the
 *     Coach lane.
 *   - The real role gate is `stepRBAC` (commandExecutor.mjs:369) plus whatever the
 *     dispatcher itself enforces.
 *
 * Worked example of why the parity premise fails: `schedule_session` declares
 * `roleRequired: ['admin','trainer']` while its endpoint `/api/sessions/admin/book`
 * resolves to `routes/sessions.mjs:1091` which is `protect, adminOnly`. That reads
 * like trainer drift. It is not: `dispatchScheduleSession`
 * (dispatchers/scheduleWriteDispatchers.mjs:113) calls `assertTrainerOrAdmin(ctx)`
 * and pins `trainerId` to `ctx.user.id` for trainers. Trainer access is deliberate
 * and scoped. Asserting the parity law would fail 10 correct-by-design commands.
 *
 * If you want a real authz law here, assert it against the DISPATCHER, not the
 * endpoint string.
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';
import { initializeRegistry, getAllCommands } from '../../services/ai/commandRegistry/index.mjs';
import { buildRouteTable, resolveRoute, parseRouterFile, BACKEND_ROOT } from '../helpers/routeTable.mjs';

/** Roles the platform actually recognises (backend/middleware/authMiddleware.mjs). */
const KNOWN_ROLES = new Set(['admin', 'trainer', 'client', 'user']);

/**
 * Commands whose `endpoint` names no mounted route, as of 2026-08-23, each verified
 * by hand against the mount-resolved route table rather than by grep.
 *
 * These are NOT broken commands — four of the five are wired and execute correctly
 * through their dispatcher. The endpoint string is simply stale documentation.
 * They are pinned here so the count cannot grow silently; the test also fails if one
 * of them STARTS resolving, which forces this list to be pruned rather than rot.
 *
 * Fixing them means deciding what `endpoint` should say for a command that executes
 * lane-internally rather than over REST — a registry-wide design call that belongs
 * to Sean, not to this test.
 */
const KNOWN_UNROUTED = new Map([
  ['update_nasm_level', 'POST /api/ai-chat/data-update — no such route under any spelling; command is not wired'],
  ['request_plan_adjustment', 'POST /api/ai-chat/data-update — no such route; executes via clientPlanAdjustmentDispatcher'],
  ['brief_my_day', 'GET /api/ai-command/brief-my-day — aiCommandRoutes exposes only execute/confirm/cancel/metrics/commands/health'],
  ['brief_client', 'GET /api/ai-command/brief-client — same; executes via dayBriefDispatcher'],
  ['set_availability', 'POST /api/availability/trainer/:trainerId — real route is PUT /api/availability/:trainerId (availability.mjs:93); both method and path differ'],
]);

let commands;
let table;

beforeAll(() => {
  initializeRegistry();
  commands = getAllCommands();
  ({ table } = buildRouteTable());
});

/** Commands that drive the browser rather than an HTTP route. */
const isFrontendDispatch = (c) => String(c.method).toUpperCase() === 'FRONTEND_DISPATCH';

describe('Swan Coach command registry — endpoint/route truth', () => {
  it('the route table extracted enough of the app to be trustworthy', () => {
    // A near-empty table would make every absence claim below vacuously "pass".
    // This guards the instrument before any negative is believed.
    expect(table.length).toBeGreaterThan(1000);
    expect(table.some((r) => r.path === '/api/ai-command/execute' && r.method === 'POST')).toBe(true);
    expect(table.some((r) => r.path === '/api/sessions/admin/book' && r.method === 'POST')).toBe(true);
  });

  it('no router file silently parses to zero routes', () => {
    // This caught a real defect on 2026-08-23: workoutSummaryRoutes.mjs:34 holds the
    // regex literal /[&<>"']/g. Before the extractor understood regex literals, those
    // quotes put the scanner into a string state it never left, and the file's only
    // route vanished from the table. Nothing failed — the table was just quietly
    // 5 routes short, which would have turned "this endpoint does not exist" into a
    // false positive for anything living in a file like that.
    //
    // Comparing a naive grep count against the parsed count is a cheap, independent
    // second opinion on the parser. It is the guard that makes every absence claim in
    // this file trustworthy, so it must never be deleted to make a refactor pass.
    // Walks subdirectories too (routes/print, routes/masterPrompt, ...), so the
    // guarantee in this test's name is the guarantee it actually checks.
    const routesDir = path.join(BACKEND_ROOT, 'routes');
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) return walk(abs);
      return e.name.endsWith('.mjs') ? [abs] : [];
    });

    const shortfalls = [];
    for (const abs of walk(routesDir)) {
      const src = fs.readFileSync(abs, 'utf8');
      const naive = (src.match(/router\s*\.\s*(get|post|put|patch|delete|all)\s*\(/g) || []).length;
      const parsed = parseRouterFile(abs).routes.length;
      if (naive > 0 && parsed === 0) {
        shortfalls.push(`${path.relative(routesDir, abs)}: grep found ${naive} route(s), parser found 0`);
      }
    }

    expect(shortfalls).toEqual([]);
  });

  it('every command declares a method, an endpoint and at least one known role', () => {
    const bad = commands
      .filter((c) => {
        if (!c.method || !c.endpoint) return true;
        if (!Array.isArray(c.roleRequired) || c.roleRequired.length === 0) return true;
        return c.roleRequired.some((r) => !KNOWN_ROLES.has(r));
      })
      .map((c) => `${c.type} (method=${c.method} endpoint=${c.endpoint} roles=${JSON.stringify(c.roleRequired)})`);

    expect(bad).toEqual([]);
  });

  it('every FRONTEND_DISPATCH command names the browser event it dispatches', () => {
    const bad = commands
      .filter(isFrontendDispatch)
      .filter((c) => !c.frontendEvent)
      .map((c) => c.type);

    expect(bad).toEqual([]);
  });

  it('every HTTP command endpoint resolves to a real mounted route', () => {
    const unrouted = [];
    for (const c of commands) {
      if (isFrontendDispatch(c) || !c.endpoint) continue;
      if (KNOWN_UNROUTED.has(c.type)) continue;
      const { route } = resolveRoute(table, String(c.method).toUpperCase(), c.endpoint);
      if (!route) unrouted.push(`${c.type}: ${c.method} ${c.endpoint}`);
    }

    // A new entry here means a command points at a route that was renamed, deleted,
    // or never existed. Fix the endpoint — do not add it to KNOWN_UNROUTED without
    // verifying against the mount-resolved table by hand.
    expect(unrouted).toEqual([]);
  });

  it('the known-unrouted allowlist has not rotted', () => {
    const nowResolving = [];
    for (const [type, reason] of KNOWN_UNROUTED) {
      const c = commands.find((x) => x.type === type);
      if (!c) {
        nowResolving.push(`${type}: no longer in the registry — remove this allowlist entry (${reason})`);
        continue;
      }
      const { route } = resolveRoute(table, String(c.method).toUpperCase(), c.endpoint);
      if (route) {
        nowResolving.push(`${type}: now resolves to ${route.routerFile}:${route.line} — remove this allowlist entry`);
      }
    }

    expect(nowResolving).toEqual([]);
  });

  it('no command endpoint matches a real path under a different HTTP method', () => {
    // A path that exists but only under another verb is the signature of a typo'd
    // method, which the "resolves to a real route" check alone would only report as
    // a flat absence. There is no live example today — this is a regression guard,
    // and it was mutation-tested by temporarily flipping `view_today_schedule` from
    // GET to PUT, which it caught. Note that `set_availability` is NOT an instance:
    // its path differs too (4 segments vs 3), so no verb resolves it.
    const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    const wrongMethod = [];
    for (const c of commands) {
      if (isFrontendDispatch(c) || !c.endpoint) continue;
      if (KNOWN_UNROUTED.has(c.type)) continue;
      const declared = String(c.method).toUpperCase();
      const { route } = resolveRoute(table, declared, c.endpoint);
      if (route) continue;
      const other = METHODS.filter((m) => m !== declared).find((m) => resolveRoute(table, m, c.endpoint).route);
      if (other) wrongMethod.push(`${c.type}: declares ${declared} ${c.endpoint} but the path exists as ${other}`);
    }

    expect(wrongMethod).toEqual([]);
  });
});
