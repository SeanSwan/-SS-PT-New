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

