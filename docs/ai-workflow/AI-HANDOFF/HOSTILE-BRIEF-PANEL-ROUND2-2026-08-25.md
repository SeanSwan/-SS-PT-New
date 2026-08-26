# HOSTILE REVIEW BRIEF — Swan Coach endpoint truth + Client Hub a11y (round 2)
**Branch:** `claude/coach-endpoint-truth-v2-20260824` · **Date:** 2026-08-25
**Seats:** Ox Alpha · GLM-5.3 · HY3 · Claude (self)

## Your remit
Find what is WRONG. Confirmations are worthless. Assume I am over-confident and that at
least one load-bearing claim here is false. Rank findings most-severe first. For each:
name the exact claim that is wrong, the evidence, and what it breaks. If you cannot
refute something, say so in ONE line and move on — no padding, no praise.

## Why you are getting FULL FILES, not excerpts
A previous round of this review produced two confident findings that were both WRONG,
and both were my fault: I pasted lines 30-45 of a 200-line file, and the reviewer
correctly reasoned about code that had a guard 120 lines below what I showed. Excerpt
boundaries are part of the question. So the four files most likely to hide a defect are
included in full below. If you need something not included, say "NOT SHOWN" rather than
assuming.

## The context you need

Swan Coach is a voice/command lane. ~139 commands are declared in a registry; 112 are
"wired" to a service dispatcher. A command declares `method`, `endpoint`, and
`roleRequired`.

**Load-bearing claim #1:** `endpoint` is DECLARATIVE METADATA. Nothing dispatches on it.
Execution selects a dispatcher by command TYPE (`commandDispatcher.mjs:347`
`hasDispatcher`), never by making an HTTP request to the app's own route. Therefore the
route's middleware never runs for the Coach lane.

Evidence — a repo-wide grep for consumers of a command's endpoint returned exactly four:
  - `commandExecutor.mjs:512`   copies it into the destructive-op record
  - `destructiveOperations.mjs:34`  HMAC-signs it into the audit payload
  - `aiCommandRoutes.mjs:284`  `frontendEvent || endpoint` as a response label
  - `hermesCommands.mjs:12`  a COMMENT BY ANOTHER AUTHOR: "Does NOT use command.endpoint
    for execution — endpoint is informational only"

**Consequence:** a proposed "authz parity harness" (assert `roleRequired` is a subset of
the middleware on the endpoint's route) was REFUSED as unsound, because the two sides are
never connected at runtime. Instead I shipped an ENDPOINT-EXISTENCE contract: every
command's endpoint must name a route that is actually mounted.

**Attack this first.** If claim #1 is false, I deleted a real security control and
shipped a weaker one.

## What I already know is imperfect — do NOT spend findings here
- 4 commands still declare endpoints resolving to no route. Deliberately pinned; they
  execute lane-internally and inventing a REST path would be fiction.
- NO dispatcher-authorization coverage. Nothing tests that a dispatcher denies a
  below-role caller. I read 3 of 112 dispatchers. This is already the named next slice.
- The route extractor does not model cross-mount middleware inheritance (documented in
  its header). Direction: it can only make a ceiling too PERMISSIVE, never too
  restrictive, so it cannot manufacture a false absence.
- The static-intelligence gate (fallow) is NOT installed -> [UNKNOWN].
- Whole-tree scan tests are load-fragile (timeouts, not assertion failures).

## Verification already run (tell me what it does NOT prove)
- `tsc --noEmit` true exit 0 / 0 errors; `vite build` exit 0
- Full frontend 1584 files / 8025 tests pass
- Full backend: failing-file set BYTE-IDENTICAL to known-failing-baseline.json (23 files),
  compared as SETS not counts
- Every new assertion mutation-tested and restored byte-identical

### The route extractor (absence claims rest on this) — FULL FILE `backend/tests/helpers/routeTable.mjs`
```
/**
 * routeTable.mjs — mount-resolved Express route extraction
 * ========================================================
 * Blueprint
 * ---------
 * PURPOSE   Build the real, mount-resolved route table of the Express app by static
 *           analysis, so contract tests can ask "which roles can actually reach
 *           METHOD /api/x/y?" without booting the server or a database.
 *
 * WHY STATIC
 *           Booting `setupRoutes(app)` requires a live DB, Redis, Stripe keys and
 *           ~200 module side effects. A contract test must run in CI with none of
 *           those. Static extraction is the only option that stays hermetic.
 *
 * THE TRAP THIS EXISTS TO AVOID (recorded 2026-08-23)
 *           A previous attempt matched command endpoints against route paths by
 *           STRIPPING the `/api/x` prefix and comparing tails. That produced ~23
 *           false positives (e.g. `/api/pain-entries/:userId` "matching"
 *           `videoLibraryRoutes GET /:id`). Tail-matching is unsound: it discards
 *           exactly the information — the mount prefix — that disambiguates
 *           routers. This module resolves `app.use(prefix, router)` prefixes and
 *           joins them to router-level paths (CLAUDE.md Rule 31, route ownership).
 *
 * EXPRESS SEMANTICS MODELLED
 *   1. Mount order matters. `app.use('/api/workout', a)` declared before
 *      `app.use('/api/workout/sessions', b)` means a request for
 *      `/api/workout/sessions/x` is offered to `a` FIRST; `a` falls through to `b`
 *      only by calling next() when no route in `a` matches. The effective handler
 *      for a path is therefore the FIRST mount-order match, not any match.
 *   2. `router.use(mw)` with no path applies to every route declared AFTER it in
 *      the file, not to the whole file. Line order is tracked.
 *   3. One router may be mounted at several prefixes (e.g.
 *      `/api/client-trainer-assignments` and `/api/assignments`). Every mount
 *      yields its own set of full paths.
 *   4. Stacked role gates INTERSECT. `protect, adminOnly` then a route-level
 *      `authorize(['admin','trainer'])` still admits only admin.
 *
 * KNOWN LIMITS (explicit on purpose — silence reads as absence to a reviewer)
 *   - Sub-routers mounted inside a router via `router.use('/p', child)` are
 *     resolved one level deep; deeper nesting is not followed. Every unfollowed
 *     subtree is RECORDED in `unresolved` and pinned by a contract test, so the
 *     blind spot is countable rather than silent.
 *   - CROSS-MOUNT MIDDLEWARE IS NOT INHERITED (GLM-5.3 hostile review 2026-08-24).
 *     With `app.use('/api/workout', a)` declared before `app.use('/api/workout/sessions', b)`,
 *     a request for `/api/workout/sessions/x` enters `a` first, so `a`'s pathless
 *     `router.use(mw)` layers RUN before the request falls through to `b`. This
 *     table composes only the mount's own app-level middleware plus the router's
 *     own, so a `b` route's `allowedRoles` can be WIDER than reality.
 *     Direction matters: this can only make a ceiling too permissive, never too
 *     restrictive, so it cannot manufacture a false "this route does not exist" —
 *     and route EXISTENCE is the only thing the shipped contract asserts. Fix this
 *     before using `allowedRoles` to make an authorization claim.
 *   - Dynamically built paths (template literals, variables) are not resolved and
 *     are reported in `unresolved` rather than silently dropped.
 *   - Role semantics come from ROLE_GATES below. An unrecognised middleware name
 *     is treated as NOT a role gate and is counted in `unknownGates`, so a new
 *     gate cannot silently widen access without this table noticing.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadSource, importBindings, aliasBindings, matchParen, splitArgs } from './sourceScan.mjs';
import { roleCeiling } from './roleGates.mjs';

export { ROLE_GATES, AUTH_ONLY, classifyMiddleware, roleCeiling } from './roleGates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_ROOT = path.resolve(HERE, '../..');

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all'];

/**
 * Parse one router file into its route declarations, honouring router.use() line order.
 */
export function parseRouterFile(absPath) {
  const { code, lineAt } = loadSource(absPath);
  const events = [];

  const useRe = /\brouter\s*\.\s*use\s*\(/g;
  let m;
  while ((m = useRe.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const end = matchParen(code, open);
    if (end < 0) continue;
    const args = splitArgs(code.slice(open + 1, end - 1));
    if (!args.length) continue;
    const pathLit = args[0].match(/^['"]([^'"]*)['"]$/);
    events.push({
      at: m.index,
      line: lineAt(m.index),
      type: 'use',
      mountPath: pathLit ? pathLit[1] : null,
      args: pathLit ? args.slice(1) : args,
    });
  }

  const routeRe = new RegExp(`\\brouter\\s*\\.\\s*(${METHODS.join('|')})\\s*\\(`, 'g');
  while ((m = routeRe.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const end = matchParen(code, open);
    if (end < 0) continue;
    const args = splitArgs(code.slice(open + 1, end - 1));
    if (!args.length) continue;
    const pathLit = args[0].match(/^['"]([^'"]*)['"]$/);
    events.push({
      at: m.index,
      line: lineAt(m.index),
      type: 'route',
      method: m[1].toUpperCase(),
      subPath: pathLit ? pathLit[1] : null,
      rawPath: args[0],
      args: args.slice(1),
    });
  }

  events.sort((a, b) => a.at - b.at);

  const routes = [];
  const subMounts = [];
  const unresolved = [];
  let active = [];

  for (const ev of events) {
    if (ev.type === 'use') {
      if (ev.mountPath !== null) {
        subMounts.push({ mountPath: ev.mountPath, args: ev.args, line: ev.line, inherited: [...active] });
      } else {
        active = [...active, ...ev.args];
      }
      continue;
    }
    if (ev.subPath === null) {
      unresolved.push({ file: absPath, line: ev.line, reason: 'non-literal route path', raw: ev.rawPath.slice(0, 60) });
      continue;
    }
    routes.push({ method: ev.method, subPath: ev.subPath, middleware: [...active, ...ev.args], line: ev.line });
  }

  return { routes, subMounts, unresolved, imports: importBindings(code), alias: aliasBindings(code) };
}

/**
 * Normalise a path into comparable segments; '' and '/' both mean the mount root.
 * A query string is not part of route matching, and several registry endpoints carry
 * one (e.g. `/api/macros/summary?date={date}`), so it is stripped here rather than
 * silently producing a no-match that would read as a missing route.
 */
export function segments(p) {
  return p.split('?')[0].split('#')[0].split('/').filter(Boolean);
}

/** Join a mount prefix with a router sub-path into a full canonical path. */
export function joinPath(prefix, sub) {
  return '/' + [...segments(prefix), ...segments(sub)].join('/');
}


/**
 * Build the full mount-resolved route table from backend/core/routes.mjs.
 * `table` is in MOUNT ORDER — the first entry matching a request is the effective one.
 */
export function buildRouteTable({ backendRoot = BACKEND_ROOT } = {}) {
  const routesFile = path.join(backendRoot, 'core', 'routes.mjs');
  const { code, lineAt } = loadSource(routesFile);
  const importMap = importBindings(code);

  const table = [];
  const unresolved = [];
  const unknownGates = new Map();
  const fileCache = new Map();
  let mountCount = 0;

  const parseCached = (abs) => {
    if (!fileCache.has(abs)) fileCache.set(abs, parseRouterFile(abs));
    return fileCache.get(abs);
  };

  const rel = (abs) => path.relative(backendRoot, abs).replace(/\\/g, '/');

  const appUseRe = /\bapp\s*\.\s*use\s*\(/g;
  let m;
  while ((m = appUseRe.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const end = matchParen(code, open);
    if (end < 0) continue;
    const args = splitArgs(code.slice(open + 1, end - 1));
    if (args.length < 2) continue;
    const prefixLit = args[0].match(/^['"]([^'"]*)['"]$/);
    if (!prefixLit) continue;
    const prefix = prefixLit[1];

    const routerId = args[args.length - 1].trim();
    const relPath = importMap.get(routerId);
    if (!relPath) {
      unresolved.push({
        file: rel(routesFile), line: lineAt(m.index),
        reason: 'mount target not a static import', raw: routerId.slice(0, 60),
      });
      continue;
    }
    const abs = path.resolve(path.dirname(routesFile), relPath);
    if (!fs.existsSync(abs)) {
      unresolved.push({ file: rel(routesFile), line: lineAt(m.index), reason: 'router file not found', raw: relPath });
      continue;
    }

    const parsed = parseCached(abs);
    for (const u of parsed.unresolved) unresolved.push({ ...u, file: rel(u.file) });
    mountCount++;

    const appLevel = args.slice(1, -1);

    const pushRoute = (method, subPath, middleware, line, routerFile, alias) => {
      const ceiling = roleCeiling([...appLevel, ...middleware], alias);
      for (const name of ceiling.unknown) unknownGates.set(name, (unknownGates.get(name) ?? 0) + 1);
      const full = joinPath(prefix, subPath);
      table.push({
        method,
        path: full,
        segs: segments(full),
        allowedRoles: ceiling.allowedRoles,
        authRequired: ceiling.authRequired,
        mountPrefix: prefix,
        routerFile,
        line,
        middleware,
      });
    };

    for (const r of parsed.routes) pushRoute(r.method, r.subPath, r.middleware, r.line, rel(abs), parsed.alias);

    for (const sm of parsed.subMounts) {
      const childId = sm.args[sm.args.length - 1]?.trim();
      // Every `continue` below is a route subtree this extractor does NOT follow.
      // They are RECORDED, not skipped silently: a dropped subtree turns "this
      // endpoint does not exist" into a false positive, and the whole value of this
      // table is that its absences can be trusted (GLM-5.3 hostile review, 2026-08-24).
      if (!childId || !/^[A-Za-z_$][\w$]*$/.test(childId)) {
        unresolved.push({ file: rel(abs), line: sm.line, reason: 'sub-mount target is not a plain identifier', raw: String(childId).slice(0, 60) });
        continue;
      }
      const childRel = parsed.imports.get(childId);
      if (!childRel) {
        unresolved.push({ file: rel(abs), line: sm.line, reason: 'sub-mount target is not a static default import', raw: childId });
        continue;
      }
      const childAbs = path.resolve(path.dirname(abs), childRel);
      if (!fs.existsSync(childAbs)) {
        unresolved.push({ file: rel(abs), line: sm.line, reason: 'sub-mount file not found', raw: childRel });
        continue;
      }
      const child = parseCached(childAbs);
      // Depth 2+ is not followed. Record each so the count is visible.
      for (const deeper of child.subMounts) {
        unresolved.push({ file: rel(childAbs), line: deeper.line, reason: 'nested sub-mount deeper than one level — NOT followed', raw: deeper.mountPath });
      }
      for (const r of child.routes) {
        pushRoute(
          r.method,
          joinPath(sm.mountPath, r.subPath),
          [...sm.inherited, ...sm.args.slice(0, -1), ...r.middleware],
          r.line,
          rel(childAbs),
          new Map([...parsed.alias, ...child.alias])
        );
      }
    }
  }

  return { table, unresolved, unknownGates, mountCount };
}

/**
 * Does a concrete request path match a route pattern?
 * `:param` and `*` match exactly one segment, and segment counts must be equal —
 * this is what makes the match sound where tail-matching was not.
 */
export function pathMatches(routeSegs, requestSegs) {
  if (routeSegs.length !== requestSegs.length) return false;
  for (let i = 0; i < routeSegs.length; i++) {
    const r = routeSegs[i];
    if (r.startsWith(':') || r === '*') continue;
    if (r !== requestSegs[i]) return false;
  }
  return true;
}

/**
 * Resolve METHOD + path to the EFFECTIVE route — the first mount-order match.
 * `candidates` lists every match so shadowing (Rule 31) can be reported.
 */
export function resolveRoute(table, method, requestPath) {
  const reqSegs = segments(requestPath);
  const candidates = table.filter(
    (r) => (r.method === method || r.method === 'ALL') && pathMatches(r.segs, reqSegs)
  );
  return { route: candidates[0] ?? null, candidates };
}


```

### Role semantics — FULL FILE `backend/tests/helpers/roleGates.mjs`
```
/**
 * roleGates.mjs — role semantics of Express middleware
 * ====================================================
 * Blueprint
 * ---------
 * PURPOSE   Translate a middleware argument as written in a route file into the set
 *           of roles that can actually pass it. Split out of routeTable.mjs to keep
 *           every file under the 300-line cap (CLAUDE.md Rule 4).
 *
 * FAIL-LOUD BY DESIGN
 *           An unrecognised middleware name is reported as `unknown`, never assumed
 *           harmless. Assuming would let a newly-added gate silently widen the
 *           reported access of every route it guards.
 */
import { isInlineHandler } from './sourceScan.mjs';

/**
 * Role semantics of each known gate, read from backend/middleware/authMiddleware.mjs.
 *
 * NOTE the asymmetry, which is real and load-bearing:
 *   - authorize([...])    -> roles UNION {admin}  (admin is a universal override, line 472)
 *   - requireAnyRole(...) -> roles exactly        (NO admin override, line 559)
 */
export const ROLE_GATES = {
  adminOnly: ['admin'],
  admin: ['admin'],
  isAdmin: ['admin'],
  authorizeAdmin: ['admin'],
  trainerOnly: ['trainer'],
  clientOnly: ['client', 'user', 'admin'],
  trainerOrAdminOnly: ['trainer', 'admin'],
  adminOrTrainerOnly: ['trainer', 'admin'],
  // Defined separately in backend/middleware/adminMiddleware.mjs:22-38
  // (`req.user.role === 'admin'` or 403). Same ceiling as adminOnly, different module.
  requireAdmin: ['admin'],
};

/**
 * Middleware that authenticate but impose no role ceiling.
 * `authenticateToken` is a re-export of `protect` (backend/middleware/auth.mjs:173).
 */
export const AUTH_ONLY = new Set([
  'protect',
  'authenticate',
  'authenticateToken',
  'requireAuth',
  'optionalAuth',
  'verifyToken',
]);

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all'];


/**
 * Interpret one middleware argument into a role constraint.
 * Returns { kind: 'roles', roles } | { kind: 'auth' } | { kind: 'none' } | { kind: 'unknown', name }
 */
export function classifyMiddleware(arg, alias = new Map(), depth = 0) {
  let text = arg.trim();

  // Resolve local aliases (named-import `as`, const alias, recognised local arrow gate).
  // Depth-capped so a cyclic alias cannot spin.
  if (depth < 5) {
    if (text.startsWith('__roles:')) {
      return { kind: 'roles', roles: text.slice(8).split('|').filter(Boolean) };
    }
    if (/^[A-Za-z_$][\w$]*$/.test(text) && alias.has(text) && !ROLE_GATES[text] && !AUTH_ONLY.has(text)) {
      return classifyMiddleware(alias.get(text), alias, depth + 1);
    }
  }

  if (isInlineHandler(text)) return { kind: 'none' };

  const authorizeMatch = text.match(/^authorize\s*\(\s*\[([^\]]*)\]\s*\)$/);
  if (authorizeMatch) {
    const roles = [...authorizeMatch[1].matchAll(/['"]([a-zA-Z_]+)['"]/g)].map((m) => m[1]);
    if (!roles.length) return { kind: 'unknown', name: 'authorize(<dynamic>)' };
    return { kind: 'roles', roles: [...new Set([...roles, 'admin'])] };
  }
  if (/^authorize\s*\(/.test(text)) return { kind: 'unknown', name: 'authorize(<dynamic>)' };

  const anyRoleMatch = text.match(/^requireAnyRole\s*\(([^)]*)\)$/);
  if (anyRoleMatch) {
    const roles = [...anyRoleMatch[1].matchAll(/['"]([a-zA-Z_]+)['"]/g)].map((m) => m[1]);
    return roles.length
      ? { kind: 'roles', roles }
      : { kind: 'unknown', name: 'requireAnyRole(<dynamic>)' };
  }

  const bare = text.match(/^([A-Za-z_$][\w$]*)$/);
  if (bare) {
    const name = bare[1];
    if (ROLE_GATES[name]) return { kind: 'roles', roles: ROLE_GATES[name] };
    if (AUTH_ONLY.has(name)) return { kind: 'auth' };
    return { kind: 'unknown', name };
  }

  const call = text.match(/^([A-Za-z_$][\w$]*)\s*\(/);
  if (call) {
    const name = call[1];
    if (ROLE_GATES[name]) return { kind: 'roles', roles: ROLE_GATES[name] };
    return { kind: 'unknown', name: `${name}(...)` };
  }
  return { kind: 'unknown', name: text.slice(0, 40) };
}


/**
 * Reduce a middleware list to its effective role ceiling.
 * Returns { allowedRoles, authRequired, unknown } where allowedRoles === null means
 * "no role gate found" (any authenticated role, or public if authRequired is false).
 */
export function roleCeiling(middleware, alias = new Map()) {
  const roleSets = [];
  const unknown = [];
  let authed = false;
  for (const raw of middleware) {
    const c = classifyMiddleware(raw, alias);
    if (c.kind === 'roles') roleSets.push(c.roles);
    else if (c.kind === 'auth') authed = true;
    else if (c.kind === 'unknown') unknown.push(c.name);
  }
  let allowed = null;
  for (const rs of roleSets) {
    allowed = allowed === null ? new Set(rs) : new Set([...allowed].filter((r) => rs.includes(r)));
  }
  return {
    allowedRoles: allowed === null ? null : [...allowed].sort(),
    authRequired: authed || roleSets.length > 0,
    unknown,
  };
}


```

### The contract — FULL FILE `backend/tests/api/aiCommandEndpointRouteTruth.contract.test.mjs`
```
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
function bodyOf(source, name) {
  const NEXT_EXPORT = String.fromCharCode(10) + 'export const ';
  return sliceBetween(source, `export const ${name} `, NEXT_EXPORT, { label: `authMiddleware.${name}` });
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
    // Raised by GLM-5.3 hostile review 2026-08-24: sub-mounts the extractor gives up
    // on were previously `continue`d SILENTLY. A dropped subtree turns every "this
    // endpoint does not exist" claim into a possible false positive, so the drops are
    // now recorded — and pinned here so a new one cannot appear unnoticed.
    //
    // Each pinned entry was checked by hand against the four KNOWN_UNROUTED paths:
    // all six mount under /api/plaud/*, social groups, or admin-clients (which is
    // also mounted directly and therefore already in the table). None can host
    // /api/ai-chat/* or /api/ai-command/*, so no pinned absence rests on them.
    const { unresolved } = buildRouteTable();
    const summary = unresolved
      .map((u) => `${u.reason} @ ${u.file}:${u.line}`)
      .sort();

    expect(summary).toEqual([
      'mount target not a static import @ core/routes.mjs:448',
      'mount target not a static import @ core/routes.mjs:449',
      'mount target not a static import @ core/routes.mjs:463',
      'nested sub-mount deeper than one level — NOT followed @ routes/adminRoutes.mjs:67',
      'nested sub-mount deeper than one level — NOT followed @ routes/social/groups.mjs:279',
      'sub-mount target is not a plain identifier @ routes/authRoutes.mjs:368',
    ]);
  });

  it('the hand-transcribed role table still matches the middleware it describes', () => {
    // Raised by GLM-5.3: `unknownGates` catches NEW middleware names but cannot catch
    // a KNOWN gate whose implementation changed. If the admin universal override were
    // removed from authorize(), every authorize([...]) ceiling in ROLE_GATES would be
    // wrong and the suite would stay green. This binds the table to its source.
    const auth = fs.readFileSync(path.join(BACKEND_ROOT, 'middleware', 'authMiddleware.mjs'), 'utf8');

    // Every gate the table claims to know must still be exported by that module.
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
    expect(bodyOf(auth, 'requireAnyRole')).not.toMatch(/role === 'admin'/);
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

```

### The a11y primitive — FULL FILE `frontend/src/components/ui/LiveRegion.tsx`
```
/**
 * COMPONENT: LiveRegion (shared UI primitive)
 * PURPOSE: THE visually-hidden announcer for async state changes — one correct
 * implementation instead of a per-surface clone, in the same spirit as ErrorNote.
 *
 * WHY THIS IS FUSSIER THAN A `<div role="status">`
 * Two failure modes make naive live regions silently useless, and both were live
 * defects on the client hub before this existed (GLM-5.3 hostile review, 2026-08-24):
 *
 *   1. MOUNT-AND-ANNOUNCE. A region that appears already containing its text is
 *      unreliably announced — several screen readers only announce a region whose
 *      content CHANGES while it is already in the accessibility tree. So this
 *      component is meant to be rendered unconditionally, with `message` swapping
 *      between text and ''. Do not conditionally mount it.
 *
 *   2. THE aria-busy TRAP. ARIA 1.2 permits assistive tech to DEFER changes inside
 *      an `aria-busy` subtree until busy clears. A loading announcement nested
 *      inside the very container marked busy-while-loading can therefore be
 *      deferred, and then lost when the loading node unmounts. Render this OUTSIDE
 *      any `aria-busy` ancestor — that is the whole point of it being a separate,
 *      hoistable element rather than an attribute on the spinner.
 *
 * USAGE
 *   <LiveRegion message={loading ? 'Loading clients...' : ''} />
 *   ...somewhere ABOVE and OUTSIDE the aria-busy container.
 */
import React from 'react';
import styled from 'styled-components';

/**
 * Standard visually-hidden box: removed from view, kept in the accessibility tree.
 * `clip` is retained alongside `clip-path` for older assistive tech.
 */
const HiddenRegion = styled.div`
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
`;

interface LiveRegionProps {
  /** Current announcement. Pass '' to clear — do not unmount the component. */
  message: string;
  /**
   * 'polite' waits for a pause (correct for loading/progress).
   * 'assertive' interrupts — reserve it for errors the user must act on.
   */
  politeness?: 'polite' | 'assertive';
  className?: string;
}

const LiveRegion: React.FC<LiveRegionProps> = ({ message, politeness = 'polite', className }) => (
  <HiddenRegion
    role={politeness === 'assertive' ? 'alert' : 'status'}
    aria-live={politeness}
    className={className}
  >
    {message}
  </HiddenRegion>
);

export default LiveRegion;

```

### The behavioural a11y test — FULL FILE `frontend/src/components/DashBoard/workspaces/ClientsWorkspace.rosterA11y.test.tsx`
```
/**
 * ClientsWorkspace.rosterA11y.test.tsx
 * ====================================
 * Blueprint
 * ---------
 * PURPOSE   Prove the client-hub roster loading/error affordances BEHAVIOURALLY —
 *           in a real render, against the real caller path — rather than by matching
 *           source text.
 *
 * WHY THIS EXISTS ALONGSIDE LoadingSpinner.retryContract.test.ts
 *           That contract asserts the same guarantees by reading the file. Source-text
 *           assertions are cheap and they survive refactors badly: they pass when the
 *           string is present but the element never renders, and they cannot tell you
 *           that clicking Retry actually refetches. Three reviewers have called that
 *           pattern theatre on this codebase. This file is the behavioural half —
 *           the retry contract keeps the law legible, this proves it is live.
 *
 * The trainer audience is used deliberately: TrainerClientsWorkspace is a 16-line
 * wrapper around <ClientsWorkspace audience="trainer" />, so exercising it proves the
 * fix reaches the component BOTH dashboards render, not an admin-only branch.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dataMock = vi.hoisted(() => ({
  fetchClientHubClients: vi.fn(),
  fetchClientHubClientsStrict: vi.fn(),
  fetchClientHubAdminClients: vi.fn(),
  fetchClientHubTrainerClients: vi.fn(),
  fetchAdminClientById: vi.fn(),
  fetchTrainerClientById: vi.fn(),
  resolveInitialClientSelection: vi.fn(),
}));

vi.mock('./ClientsWorkspace.data', () => dataMock);

const stableAuth = vi.hoisted(() => ({
  authAxios: { get: async () => ({ data: {} }) },
  user: { id: 777, role: 'trainer' },
}));

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => stableAuth }));
vi.mock('../../../hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

vi.mock('./clients-team/useManualClientCreation', () => ({
  useManualClientCreation: () => ({
    manualCreateOpen: false,
    manualCreateTrainers: [],
    creationHandoff: null,
    openManualCreate: vi.fn(),
    closeManualCreate: vi.fn(),
    clearCreationHandoff: vi.fn(),
    handleManualCreate: vi.fn(),
  }),
}));

vi.mock('./ClientActivationQueuePanel', () => ({
  default: () => <div data-testid="activation-queue-panel" />,
}));

import ClientsWorkspace from './ClientsWorkspace';

const roster = [
  {
    id: 61,
    firstName: 'Assigned',
    lastName: 'Client',
    email: 'assigned@example.com',
    clientSource: 'swanstudios',
    sessionBillingMode: 'paid_sessions',
    isActive: true,
    availableSessions: 4,
    workoutCount: 9,
    lastSessionDate: null,
    nextSessionDate: null,
    joinDate: null,
    fitnessGoal: '',
    trainingExperience: '',
    dateOfBirth: null,
    onboardingComplete: true,
    isOnboardingComplete: true,
    onboardingPct: 100,
    onboardingCompletionPercentage: 100,
    completionPercentage: 100,
    onboardingFieldLedger: null,
    onboardingMissingFields: [],
  },
];

const renderHub = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard/trainer/clients']}>
      <ClientsWorkspace audience="trainer" />
    </MemoryRouter>,
  );

describe('client hub roster — loading and failure affordances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataMock.resolveInitialClientSelection.mockResolvedValue(null);
  });

  it('announces loading from a live region that is NOT inside the aria-busy subtree', async () => {
    let release: (value: unknown) => void = () => {};
    dataMock.fetchClientHubClientsStrict.mockReturnValue(new Promise((r) => { release = r; }));

    renderHub();

    // Asserted while the fetch is genuinely in flight — a source-text check cannot
    // distinguish "the attribute is written" from "the element ever renders".
    // The generous timeout is not papering over a race: the fetch is held open by
    // `release`, so the announcement cannot legitimately vanish. It exists because
    // this hub mounts a dozen panels and the default 1000ms expired once under a full
    // parallel suite run while passing 5/5 in isolation.
    const status = await screen.findByRole('status', {}, { timeout: 5000 });
    expect(status).toHaveTextContent(/loading clients/i);

    // THE LOAD-BEARING ASSERTION. ARIA 1.2 lets assistive tech defer changes inside
    // an aria-busy subtree until busy clears. If this live region sat inside
    // ContentArea (which is busy while loading), the announcement could be deferred
    // and then lost when the pulse unmounts. It must not have a busy ancestor.
    expect(status.closest('[aria-busy="true"]')).toBeNull();

    release(roster);

    // The region PERSISTS and empties, rather than unmounting — a region that mounts
    // already containing its text is unreliably announced.
    await waitFor(() => expect(status).toHaveTextContent(''), { timeout: 5000 });
    expect(status).toBeInTheDocument();
  });

  it('marks the persistent content region busy while loading and clears it after', async () => {
    let release: (value: unknown) => void = () => {};
    dataMock.fetchClientHubClientsStrict.mockReturnValue(new Promise((r) => { release = r; }));

    renderHub();

    // Found via the visible pulse rather than a container-wide [aria-busy] query:
    // sibling nutrition panels carry their own aria-busy and stay loading forever
    // under these mocks, so a broad query proves nothing about the node under test.
    // Assert the invariant directly rather than hunting for a specific node: the hub
    // has exactly ONE aria-busy region (ContentArea), the announcer must sit OUTSIDE
    // it, and the visible loading text must sit INSIDE it.
    const announcer = await screen.findByRole('status', {}, { timeout: 5000 });
    const busyNodes = document.querySelectorAll('[aria-busy]');
    expect(busyNodes.length).toBe(1);
    const region = busyNodes[0];
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region.contains(announcer)).toBe(false);
    expect(region.textContent).toMatch(/loading clients/i);

    release(roster);

    // aria-busy on a PERSISTENT node has something to flip back to. Same element
    // re-read, so this proves an actual flip rather than a disappearance.
    await waitFor(() => expect(region).toHaveAttribute('aria-busy', 'false'));
  });

  it('offers a real Retry control on failure and never says "reload the page"', async () => {
    dataMock.fetchClientHubClientsStrict.mockRejectedValue(new Error('network down'));

    renderHub();

    // Scoped by text: sibling nutrition panels also render role=alert under these
    // mocks, so getByRole('alert') alone is ambiguous and would pass or fail for
    // reasons unrelated to the roster.
    const banner = (await screen.findByText(/couldn't load your client roster/i, {}, { timeout: 5000 })).closest('[role="alert"]');
    expect(banner).not.toBeNull();
    expect(banner).not.toHaveTextContent(/reload the page/i);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('refetches when Retry is pressed, and clears the banner once it succeeds', async () => {
    dataMock.fetchClientHubClientsStrict.mockRejectedValueOnce(new Error('network down'));

    renderHub();
    const retry = await screen.findByRole('button', { name: /retry/i }, { timeout: 5000 });
    expect(dataMock.fetchClientHubClientsStrict).toHaveBeenCalledTimes(1);

    dataMock.fetchClientHubClientsStrict.mockResolvedValue(roster);
    await userEvent.click(retry);

    // The whole point of the fix: recovery without throwing away app state.
    await waitFor(() => expect(dataMock.fetchClientHubClientsStrict).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText(/couldn't load your client roster/i)).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    expect((await screen.findAllByText(/assigned client/i)).length).toBeGreaterThan(0);
  });
});

```

## Specific things to attack

1. **The premise (claim #1).** Is there ANY path where a command's `endpoint` becomes a
   real HTTP request? Client-side counts.
2. **The extractor's Express model.** Mount order = first match wins; `router.use()`
   applies only to routes declared after it; stacked role gates INTERSECT; `pathMatches`
   requires EQUAL segment counts. Is any of that wrong in a way that produces a FALSE
   "this route does not exist"?
3. **Vacuous assertions.** I have now shipped TWO in this file and caught both late — a
   regex window that spilled past its function, and a slice returning '' on a missing
   anchor. Are there more? An assertion that cannot fail is the defect I most want found.
4. **The a11y design.** `LiveRegion` is rendered unconditionally OUTSIDE the `aria-busy`
   container, with `message` swapping between text and ''. Is that reasoning about ARIA
   1.2 aria-busy subtree deferral actually correct, or plausible-sounding invention?
   Is the behavioural test asserting something real, or something trivially true?
5. **Blast radius.** A 31-file legacy tree and ~120 lines of config were deleted. What
   breaks that a green suite, tsc, and a vite build would all miss?

## Output
Ranked findings. Most severe first. No summary of what I did well.
