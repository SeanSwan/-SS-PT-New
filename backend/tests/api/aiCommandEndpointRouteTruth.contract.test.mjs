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
 * SCOPE OF THAT CLAIM — read before quoting it (panel round 2, 2026-08-25)
 *           It is NOT fully delivered. Four commands are allowlisted in
 *           KNOWN_UNROUTED, and `request_plan_adjustment` is both WIRED and
 *           `requiresConfirmation: true` — so it reaches prepareDestructiveOperation
 *           and its fictional endpoint IS HMAC-signed into a real audit record. Ox
 *           Alpha and GLM-5.3 independently flagged that the allowlist carves out
 *           exactly the case the blueprint claims to prevent.
 *           The honest statement: this contract stops the set of unrouted endpoints
 *           from GROWING, and it fixed the one entry that was a plain factual error.
 *           It does not make every signed record truthful. Closing that needs a
 *           registry-wide decision on what `endpoint` means for a lane-internal
 *           command — Sean's call, tracked, not silently pinned.
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
import { buildRouteTable, resolveRoute, parseRouterFile, BACKEND_ROOT, ROLE_GATES } from '../helpers/routeTable.mjs';
import { sliceBetween } from '../helpers/sliceBetween.mjs';

/**
 * Window one `export const <name> = ...` up to the next top-level export.
 *
 * Uses sliceBetween rather than a local indexOf so a DRIFTED ANCHOR THROWS instead
 * of yielding an empty string. An earlier local version returned '' when the anchor
 * was missing, which would have made `expect(...).not.toMatch(...)` pass vacuously
 * the moment a middleware was renamed — the same silent-green failure this file's
 * other assertions exist to prevent, reintroduced in the fix for the first instance.
 */
function bodyOfIn(source, name, label = name) {
  const NEXT_EXPORT = String.fromCharCode(10) + 'export const ';
  return sliceBetween(source, `export const ${name} `, NEXT_EXPORT, { label });
}

function bodyOf(source, name) {
  return bodyOfIn(source, name, `authMiddleware.${name}`);
}

/** Roles the platform actually recognises (backend/middleware/authMiddleware.mjs). */
const KNOWN_ROLES = new Set(['admin', 'trainer', 'client', 'user']);

/**
 * Commands whose `endpoint` names no mounted route, as of 2026-08-23, each verified
 * by hand against the mount-resolved route table rather than by grep.
 *
 * These are NOT broken commands — three of the four are wired and execute correctly
 * through their dispatcher. The endpoint string is simply stale documentation.
 *
 * A fifth entry, set_availability, was here until 2026-08-23 and is now FIXED rather
 * than pinned: a real route existed (PUT /api/availability/:trainerId, availability
 * .mjs:93) whose gate `protect, trainerOrAdminOnly` matches the command's declared
 * roles exactly, so the old value was an unambiguous factual error, not a convention
 * question. The four that remain have no REST route at all — inventing one would be
 * fiction, and deciding what `endpoint` should say for a lane-internal command is a
 * registry-wide convention call for Sean, not something to settle by mutating four
 * rows into a shape the other 135 do not share.
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

  it('the set of route subtrees the extractor cannot follow has not grown', () => {
    // Sub-mounts the extractor gives up on were previously `continue`d SILENTLY. A
    // dropped subtree turns every "this endpoint does not exist" claim into a possible
    // false positive, so the drops are recorded — and pinned here so a new one cannot
    // appear unnoticed.
    //
    // CORRECTION (panel round 2, 2026-08-25). This comment previously claimed "all six
    // mount under /api/plaud/*, social groups, or admin-clients". That was FALSE, and
    // GLM-5.3 caught it: routes/authRoutes.mjs:368 is under /api/auth, and it is not a
    // sub-mount at all — it is `router.use('/oauth', rateLimiter({...}))`, i.e. path-
    // scoped middleware. It is now labelled correctly.
    //
    // What actually matters for the pinned absences below, checked entry by entry:
    //   core/routes.mjs:448/449/463  -> /api/plaud/merge, /api/plaud/merge-requests,
    //                                   /api/plaud/webhook. Prefixes are literal and
    //                                   visible even though the routers are dynamically
    //                                   imported, so nothing under /api/ai-chat/* or
    //                                   /api/ai-command/* can hide there.
    //   routes/adminRoutes.mjs:67    -> mounts adminClientRoutes at '/', which is ALSO
    //                                   mounted directly and therefore already in the table.
    //   routes/social/groups.mjs:279 -> group membership, under the groups prefix.
    //   routes/authRoutes.mjs:368    -> /api/auth/oauth rate limiter.
    // None can host a KNOWN_UNROUTED path.
    const { unresolved } = buildRouteTable();
    const summary = unresolved.map((u) => `${u.reason} @ ${u.file}:${u.line}`).sort();

    expect(summary).toEqual([
      'mount target not a static import @ core/routes.mjs:448',
      'mount target not a static import @ core/routes.mjs:449',
      'mount target not a static import @ core/routes.mjs:463',
      'nested sub-mount deeper than one level — NOT followed @ routes/adminRoutes.mjs:67',
      'nested sub-mount deeper than one level — NOT followed @ routes/social/groups.mjs:279',
      'path-scoped middleware, not a sub-mount — its gate is NOT applied to routes under this path @ routes/authRoutes.mjs:368',
    ]);
  });

  it('the parser has no route syntax it cannot see', () => {
    // Two blind spots the panel identified, pinned rather than left unknown.
    //
    // 1. `router.route('/x').get(h)` chains are invisible to the parser AND to the
    //    grep cross-check below, which shares the `router.<verb>(` assumption — so for
    //    that one syntax the "independent second opinion" is not independent. Zero
    //    occurrences today; this assertion is what keeps that true.
    // 2. A file using a non-`router` identifier (`const api = Router()`) parses to
    //    zero routes and records nothing.
    const routesDir = path.join(BACKEND_ROOT, 'routes');
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) return walk(abs);
      return e.name.endsWith('.mjs') ? [abs] : [];
    });

    const offenders = [];
    for (const abs of walk(routesDir)) {
      const src = fs.readFileSync(abs, 'utf8');
      const rel = path.relative(routesDir, abs);
      if (/\.route\s*\(/.test(src)) offenders.push(`${rel}: uses .route() chaining, which the parser cannot see`);
      const altRouter = src.match(/const\s+([A-Za-z_$][\w$]*)\s*=\s*(express\.)?Router\s*\(/);
      if (altRouter && altRouter[1] !== 'router') {
        offenders.push(`${rel}: router bound as '${altRouter[1]}', not 'router' — parser sees no routes`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('the share of rows whose role ceiling is unknown has not grown', () => {
    // An unclassified middleware yields allowedRoles:null + authRequired:false, which
    // reads IDENTICALLY to "public" (Ox Alpha, panel round 2). `ceilingUnknown` now
    // marks those rows so no consumer can mistake them for ungated.
    //
    // The number is large and that is the point: 903 of 1672 rows carry at least one
    // middleware this table cannot classify. It is pinned as a CEILING so the honest
    // size of the blind spot is visible, and so nobody builds an authorization claim
    // on `allowedRoles` while it is this big.
    const { table } = buildRouteTable();
    const unknownRows = table.filter((r) => r.ceilingUnknown).length;

    expect(unknownRows).toBeLessThanOrEqual(903);
    expect(table.length).toBeGreaterThan(1000);
  });

  it('the hand-transcribed role table still matches the middleware it describes', () => {
    // Raised by GLM-5.3: `unknownGates` catches NEW middleware names but cannot catch
    // a KNOWN gate whose implementation changed. If the admin universal override were
    // removed from authorize(), every authorize([...]) ceiling in ROLE_GATES would be
    // wrong and the suite would stay green. This binds the table to its source.
    const auth = fs.readFileSync(path.join(BACKEND_ROOT, 'middleware', 'authMiddleware.mjs'), 'utf8');

    // Every gate the table claims to know must still be exported by that module.
    // requireAdmin lives in adminMiddleware.mjs, not authMiddleware.mjs. It was
    // previously excluded from the export check and therefore bound to NOTHING —
    // three of eight transcribed gates had no source binding at all (Ox Alpha,
    // panel round 2). It is now checked against its own file, below.
    const adminMw = fs.readFileSync(path.join(BACKEND_ROOT, 'middleware', 'adminMiddleware.mjs'), 'utf8');
    expect(adminMw).toContain('export const requireAdmin =');
    expect(bodyOfIn(adminMw, 'requireAdmin')).toMatch(/role === 'admin'/);

    const missing = Object.keys(ROLE_GATES)
      .filter((name) => !['requireAdmin', 'authorizeAdmin', 'adminOrTrainerOnly'].includes(name))
      .filter((name) => !new RegExp(String.raw`export const ${name}\b`).test(auth));
    expect(missing).toEqual([]);

    // authorize([...]) unions admin — the override the table depends on.
    // Sliced to the function BODY. A window-based regex (`[\s\S]{0,600}`) looked
    // equivalent and was not: it ran past the end of authorize into neighbouring
    // middleware, so deleting the override left it still passing. Mutation-testing
    // caught that; the slice is what makes this assertion able to fail at all.
    const authorizeBody = bodyOf(auth, 'authorize');
    expect(authorizeBody).toMatch(/role === 'admin'/);
    expect(authorizeBody).toMatch(/return next\(\)/);

    // requireAnyRole must NOT have that override; the table treats it as exact.
    // Spelling-hardened. The single-spelling form `/role === 'admin'/` was evadable by
    // double quotes, optional chaining, or whitespace — a refactor could restore the
    // override and keep this green (Ox Alpha, panel round 2). Now matches any
    // comparison of a role to admin, however written.
    expect(bodyOf(auth, 'requireAnyRole')).not.toMatch(/role\s*===\s*['"]admin['"]/);
    expect(bodyOf(auth, 'requireAnyRole')).not.toMatch(/isAdmin|adminOnly/);
  });

  it('no client-side surface can turn a command endpoint into an HTTP request', () => {
    // THE LOAD-BEARING PROOF. This whole file exists because an "authz parity harness"
    // was refused on the grounds that `endpoint` is declarative metadata that never
    // becomes a request. All three panel seats independently attacked that claim on the
    // same ground: the evidence was a BACKEND-only grep, while /api/ai-command/commands
    // hands a command list to the browser. If any client built a fetch from `endpoint`,
    // route middleware WOULD run and the refused harness was a real control.
    //
    // Two independent facts settle it, and both are asserted here so the claim can
    // never quietly stop being true:
    //   1. The commands response picks its fields explicitly and `endpoint` is not
    //      among them, so the browser is never handed one.
    //   2. No frontend source reads `.endpoint` off a command.
    const routeSrc = fs.readFileSync(path.join(BACKEND_ROOT, 'routes', 'aiCommandRoutes.mjs'), 'utf8');
    const commandsHandler = sliceBetween(routeSrc, "router.get('/commands'", "router.get('/health'", {
      label: 'aiCommandRoutes GET /commands',
    });
    expect(commandsHandler).toContain('commands: commands.map');
    expect(commandsHandler).not.toMatch(/endpoint/);

    const laneSrc = fs.readFileSync(
      path.join(BACKEND_ROOT, 'services', 'ai', 'commandExecutionLane.mjs'), 'utf8',
    );
    expect(laneSrc).not.toMatch(/endpoint/);

    const frontendRoot = path.resolve(BACKEND_ROOT, '..', 'frontend', 'src');
    const walkFe = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === 'assets' ? [] : walkFe(abs);
      return /\.(ts|tsx|js|jsx)$/.test(e.name) ? [abs] : [];
    });
    const consumers = [];
    for (const abs of walkFe(frontendRoot)) {
      const src = fs.readFileSync(abs, 'utf8');
      if (!/ai-?command|commandRegistry/i.test(src)) continue;
      if (/\.endpoint/.test(src) || /\{[^}]*endpoint[^}]*\}\s*=/.test(src)) {
        consumers.push(path.relative(frontendRoot, abs));
      }
    }

    expect(consumers).toEqual([]);
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
