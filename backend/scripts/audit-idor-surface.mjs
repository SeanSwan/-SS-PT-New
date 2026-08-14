#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: backend/scripts/audit-idor-surface.mjs
 * PURPOSE: Find route handlers that take a user-identifying parameter and never
 *          check it against the authenticated caller.
 * ADDED: 2026-08-04 (SWA-134 item 4 — horizontal authz was the one untested surface)
 * ============================================================================
 *
 * WHY. Live probing proved AUTHENTICATION: unauthenticated requests get 401. It proved nothing
 * about AUTHORIZATION — whether an authenticated client can read a DIFFERENT client's injury
 * history, waivers, measurements or orders. That is the attack most likely to actually happen to a
 * training SaaS, 47 per-user sensitive columns are reachable by a user-shaped parameter, and there
 * is no row-level security to catch a miss (and none would help while the app connects as the table
 * owner, which bypasses RLS).
 *
 * WHAT IT DOES. For every `router.<verb>('/path/:userId', ...)` whose path carries a
 * user-identifying param, it reads the handler body and asks one question: does anything in here
 * compare that param against the authenticated user, or gate it behind a role/relationship check?
 *
 * It looks for any of:
 *   - a comparison against `req.user.id` / `req.user.userId`
 *   - an admin or role gate (`isAdmin`, `req.user.role === ...`, `adminOnly`, `ownerAdminOnly`)
 *   - a relationship check (`checkTrainerClientRelationship`, `authorizeResourceAccess`)
 *   - an explicit `// authz:` annotation, including `// authz: public`
 *
 * WHAT IT IS NOT. This is a STATIC reader, not a prover. It cannot follow a helper three files deep,
 * and a handler it flags may well be safe via a service-layer check. Treat output as a REVIEW QUEUE
 * ranked by data sensitivity, not a defect list — the value is turning "we have no idea about 1,309
 * handlers" into "these N touch user-scoped data and show no visible check."
 *
 * The inverse error matters more and this tool cannot make it: a handler it passes is not proven
 * safe either. Only a two-user negative test proves that. This narrows where to point those tests.
 *
 * SAFETY: read-only. Parses files. Touches no database, makes no network call.
 *
 * USAGE:
 *   node backend/scripts/audit-idor-surface.mjs            # unchecked handlers, ranked
 *   node backend/scripts/audit-idor-surface.mjs --verbose  # also list the ones that look guarded
 *   node backend/scripts/audit-idor-surface.mjs --help
 *
 * EXIT: 0 = every user-scoped handler shows a visible check · 1 = some do not ·
 *       2 = the audit itself failed (including scanning zero files).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  findingKey, loadBaseline, diffBaseline, writeBaseline, reportRatchet,
} from './lib/audit-baseline.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROUTES = path.join(HERE, '..', 'routes');
const verbose = process.argv.includes('--verbose');
const updateBaseline = process.argv.includes('--update-baseline');
const BASELINE = path.join(HERE, 'baselines', 'idor-surface.json');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node backend/scripts/audit-idor-surface.mjs [--verbose]');
  console.log('  Flags route handlers that take a user-identifying param with no visible check');
  console.log('  against the authenticated caller. Static reader, not a prover — output is a');
  console.log('  review queue ranked by data sensitivity. Read-only.');
  console.log('  Exit 0 = all show a check, 1 = some do not, 2 = audit failed.');
  process.exit(0);
}

// Params that name a user other than "me".
//
// The `/users/:id` shape has to be listed explicitly: a bare `:id` is far too common to treat as
// user-scoped, but on a `/users` or `/user` path it names a person. Five handlers were invisible
// without it (`adminRoutes:35`, `authRoutes:855,925`, `userManagementRoutes:562,692`) — all five
// traced and guarded, but absent from the denominator, which is its own kind of wrong.
export const USER_PARAM = /:(userId|clientId|trainerId|user_id|client_id|trainer_id|memberId|athleteId)\b|\/users?\/:id\b/;

/**
 * Every `.mjs` under routes/, RECURSIVELY, relative to ROUTES.
 *
 * `fs.readdirSync` is not recursive, so this audit scanned 196 of 230 route files and was **silent**
 * about six whole subdirectories — admin, dashboard, masterPrompt, plaud, print, social — containing
 * 7 user-scoped handlers that never appeared in any total. Silence is worse than imprecision: an
 * over-clearing reader at least names the handler it got wrong.
 *
 * This exact class — a non-recursive glob hiding these same 34 files including `social/` — is
 * already recorded as a past instrument failure in SESSION-HANDOFF §10. It was written down, and
 * then recurred inside the security tool itself. Documenting a defect does not install the fix.
 */
export function collectRouteFiles(dir = ROUTES, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...collectRouteFiles(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.mjs')) out.push(rel);
  }
  return out;
}

// Any of these, on or near the route, counts as a visible check.
//
// The guard vocabulary was ENUMERATED from `middleware/` rather than guessed. The first version
// listed four names I assumed, and over-flagged badly as a result: `painEntryRoutes` came back
// "no visible check" while actually carrying `verifyClientAccessByUserId` on every route AND a
// controller-level `requester.role === 'client' && requester.id !== userId` 403. A linter whose
// vocabulary is smaller than the codebase's reports the gap between the two as findings.
/**
 * WEAK evidence: a reference to the actor. Clears a handler ONLY when `comparesActor()` also holds.
 *
 * Optional chaining must match as well as the dot form — `req.user?.id` appears in 89 files against
 * 143 for `req.user.id`, so requiring the dot made this blind to roughly as many ownership checks
 * as it could see. But widening reach without requiring a comparison made the weaker problem worse:
 * these two patterns match logging and response payloads, not just checks. Split out deliberately.
 */
const USER_REF = [
  /req\.user\??\.(id|userId)/,
  /req\.user\??\.role/,
];

// STRONG evidence: named guards, role gates and ownership helpers. These clear on presence.
const CHECK = [
  // ownership / relationship guards
  /verifyClientAccessBy(UserId|PlanId)|verifyClientAccess/,
  /checkTrainerClientRelationship|assertTrainerAssignedToClient|assertAssignmentOrAdmin/,
  /authorizeResourceAccess|requireOwnershipOrTrainer|assertClipOwnership|requireLinkedWaiver/,
  // role / permission gates
  /\bauthorize(Roles|Admin)?\s*\(/,
  /isAdmin|adminOnly|ownerAdminOnly|ownerOrAdminOnly|requireAdmin|requireSuperAdmin|requireTrainerOrAdmin|requireAnyRole/,
  // The `<role>Only` / `authorize<Role>` family, applied inline on the route rather than via
  // router.use. Missing these reported `gamificationRoutes` (authorizeTrainer) and
  // `sessionMetricsRoutes` (trainerOrAdminOnly) as unguarded when both carry a real role gate.
  /trainerOnly|clientOnly|trainerOrAdminOnly|authorizeTrainer|authorizeClient|authenticate\b/,
  /require[A-Za-z]*Permission|requireMultiplePermissions|requireAnyPermission/,
  /requireSubscription|requireTier|requireFeature|requireAiConsent/,
  // FILE-LOCAL access helpers. Enumerated from routes/, not guessed — this codebase also gates
  // ownership with helpers defined inside the route file rather than imported middleware.
  // `clientPhotoRoutes` calls `ensureClientAccess(req, req.params.userId)` and was being flagged
  // purely because that name was absent here. Every miss of this kind is a false accusation.
  // Enumerated by grepping controllers/middleware/utils for `(check|verify|assert|ensure|can|has)
  // [A-Za-z]*Access`, then reading each definition — not guessed. Counts at time of writing:
  // ensureClientAccess 16, verifyClientAccess 9, assertGoalAccess 4, ensureTrainerAccess 3,
  // ensureScopedClientAccess 3, checkClientAccess 3. `checkClientAccess` and
  // `ensureScopedClientAccess` were both absent and are both real fail-closed 403 gates —
  // `profileController.mjs:46-52` denies before it touches storage or the DB.
  // \b matters: unanchored `hasAccess` also matched `hasAccessibilityAccess`, which is a feature
  // flag, not an authorization gate.
  /\b(ensureClientAccess|ensureScopedClientAccess|ensureTrainerAccess|checkClientAccess|assertGoalAccess|canAccess[A-Za-z]*|hasAccess)\b/,
  // explicit annotation, including an explicit public declaration
  /\/\/\s*authz:/i,
];

// Route paths whose data is most sensitive — used only to rank the queue.
const SENSITIVE = /pii|waiver|measurement|movement|progress|photo|note|medical|injury|pain|nutrition|order|payment|session/i;

export const ROUTE_DECL = /router\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/g;

/**
 * Window for one handler — bounded at the NEXT route declaration.
 *
 * v1 took a flat 2200-character slice with no handler boundary, so any guard-shaped string within
 * 2200 chars AFTER a declaration cleared it, including text belonging to later handlers. An
 * unguarded handler sitting ABOVE a guarded one was cleared by its sibling. Measured by an
 * independent instrument: 12 of 182 `route` clearances (6.6%) rested on that bleed, some on a log
 * line from a different handler entirely.
 *
 * This was invisible to the negative controls that "proved" the widening safe, because those
 * probes put the unguarded handler in a file of its own — the isolated case, which already passed.
 * The arrangement that occurs in real route files was never tested. Found by session 4911ff52.
 */
export function handlerBody(src, from, nextDecl) {
  return src.slice(from, nextDecl === undefined ? from + 2200 : Math.min(nextDecl, from + 2200));
}

/**
 * Does the body actually COMPARE the actor, or merely mention it?
 *
 * `/req\.user\??\.id/` matches a `console.log` as happily as an ownership check, so a handler with
 * zero authorization whose only `req.user.id` sits in an audit log was cleared. That inverts the
 * incentive: the more diligently someone writes actor-attributed logging, the more likely their
 * unguarded handler passes. Follows ONE level of local aliasing, because
 * `const requestingUserId = req.user.id` … `if (String(requestingUserId) !== …)` is the dominant
 * in-repo idiom and refusing to follow it would just move the false-positive class into this file.
 */
const SINK = /^(json|send|sendStatus|status|end|write|render|redirect|log|warn|error|info|debug|trace|emit|push|set|header|append)$/;

export function comparesActor(body) {
  const OPS = '===|!==|==|!=|<|>';
  if (new RegExp(`req\\.user\\??\\.\\w+\\s*(?:${OPS})`).test(body)) return true;
  if (new RegExp(`(?:${OPS})\\s*req\\.user\\??\\.\\w+`).test(body)) return true;
  // Passed into a guard/comparison helper: `ensureClientAccess(req, req.user.id)`, `String(req.user.id)`.
  // SINKS are excluded. Without that exclusion this rule re-creates the exact defect it sits beside:
  // `console.log(\`actor ${req.user.id}\`)` and `res.json({ viewer: req.user?.role })` are calls that
  // take the actor and authorize nothing, and both cleared until the denylist was added.
  for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\(\s*[^)]*req\.user\??\.\w+/g)) {
    if (!SINK.test(m[1])) return true;
  }
  for (const m of body.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*req\.user\??\.\w+/g)) {
    const alias = m[1];
    if (new RegExp(`\\b${alias}\\b\\s*(?:${OPS})|(?:${OPS})\\s*\\b${alias}\\b`).test(body)) return true;
    if (new RegExp(`\\b[A-Za-z_$][\\w$]*\\(\\s*[^)]*\\b${alias}\\b`).test(body)) return true;
  }
  return false;
}

/**
 * Route-level clearance for one handler. Pure — no filesystem — so the two probe shapes that
 * defeated v1 can be asserted permanently in a test instead of re-discovered by hand.
 * Returns 'route' or null.
 */
export function routeClearance(body) {
  const strong = CHECK.some((r) => r.test(body));
  if (strong) return 'route';
  return USER_REF.some((r) => r.test(body)) && comparesActor(body) ? 'route' : null;
}

/**
 * Resolve spread middleware arrays: `router.get('/:clientId/goals', ...clientReadAccess, handler)`.
 *
 * `clientProgressRoutes` defines `const clientReadAccess = [protect, authorize([...]),
 * verifyClientAccessByUserId({paramName:'clientId'})]` at the top of the file and spreads it into
 * every route. Reading only the route line, all seven of its handlers looked unguarded — they are
 * among the most sensitive in the app, and every one of them is in fact defended three ways. A tool
 * that cannot follow one hop of indirection does not produce a short list; it produces a wrong one.
 */
function expandSpreads(src, line) {
  let out = line;
  for (const m of line.matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)) {
    const name = m[1];
    // `const <name> = [ ... ]` anywhere in the file.
    const def = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\\[([\\s\\S]{0,600}?)\\]`).exec(src);
    if (def) out += `\n/*spread:${name}*/ ${def[1]}`;
  }
  return out;
}

/**
 * Middleware that authenticates but does NOT authorize. These must never clear a handler:
 * a logged-in client hitting someone else's `:userId` passes every one of them. Conflating
 * authn with authz is the exact bug this audit exists to find, so the audit must not make it.
 */
const AUTHN_ONLY = /^(protect|authenticateToken|authMiddleware|optionalAuth|injectUserId)$/;

/** Named role/relationship gates. Same vocabulary as CHECK — kept as one source of truth. */
const ROLE_GATE_NAME = /^(authorize\w*|adminOnly|requireAdmin|requireSuperAdmin|requireTrainerOrAdmin|requireAnyRole|ownerAdminOnly|trainerOrAdminOnly|trainerOnly|clientOnly|requireStaff|require\w*Permission)$/;

/** Body of a function/const declared in THIS file, so a file-local gate can be read. */
function localFnBody(src, name) {
  const re = new RegExp(
    `(?:async\\s+)?function\\s+${name}\\s*\\(|(?:const|let|var)\\s+${name}\\s*=\\s*(?:async\\s*)?\\(`,
  );
  const at = re.exec(src);
  return at ? src.slice(at.index, at.index + 1200) : null;
}

/**
 * Resolve every `router.use(...)` into a verdict, instead of matching a hardcoded name list.
 *
 * The v1 regex knew six names. `renewalAlertRoutes` gates its whole router with a file-local
 * `requireStaff` (admin-or-trainer, 403 otherwise) declared at :42 — a real role gate that the
 * name list had never heard of, so every handler under it was reported unguarded. Guessing a
 * wider list would only move the boundary; reading the function body removes it. Returns a
 * reason string, or null.
 */
function routerUseGate(src, beforeOffset = Infinity) {
  for (const m of src.matchAll(/router\.use\(\s*([A-Za-z_$][\w$]*)/g)) {
    // Express applies `router.use` only to handlers declared AFTER it. Ignoring position meant a
    // gate at the bottom of a file cleared genuinely unprotected handlers above it. Zero live
    // instances today; latent exactly like the window bleed was, until someone adds a handler
    // above the gate.
    if (m.index > beforeOffset) break;
    const name = m[1];
    if (AUTHN_ONLY.test(name)) continue;
    if (ROLE_GATE_NAME.test(name)) return `router.use(${name})`;
    const body = localFnBody(src, name);
    if (body && routeClearance(body)) return `router.use(${name}) -> local fn`;
  }
  return null;
}

/**
 * One hop from the route line into the controller that handles it.
 *
 * `expandSpreads` already follows one hop for middleware arrays; this is the same idea for the
 * other direction. `badgeRoutes` passes `badgeController.setUserBadgeDisplay`, whose ownership
 * check (`role === 'admin' || isOwnProfile`, else 403) lives in the controller file — invisible
 * to a reader that only ever sees the routes directory. Three of today's seven flags were this.
 *
 * Deliberately ONE hop: a controller that delegates to a service is still reported unguarded.
 * Following arbitrary depth would let this tool clear almost anything, which is the failure mode
 * that matters most here — a false negative is worse than a false positive.
 */
function controllerHop(src, window) {
  const decl = window.slice(0, window.indexOf(';') + 1 || window.length);
  for (const m of decl.matchAll(/\b([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)|,\s*([A-Za-z_$][\w$]*)\s*\)/g)) {
    const [root, prop] = m[1] ? [m[1], m[2]] : [null, m[3]];
    const fnName = prop;
    const importRe = root
      ? new RegExp(`import\\s+${root}\\s+from\\s+['"]([^'"]+)['"]`)
      : new RegExp(`import\\s*\\{[^}]*\\b${fnName}\\b[^}]*\\}\\s*from\\s+['"]([^'"]+)['"]`);
    const imp = importRe.exec(src);
    if (!imp) continue;
    const fnRe = new RegExp(
      `(?:async\\s+)?${fnName}\\s*\\(|(?:const|let|var|export\\s+const)\\s+${fnName}\\s*=`,
    );
    // Follow `export { NAME } from './real/module.mjs'` facades. `messagingController.mjs` is 23
    // lines of pure re-export; the guard lives in `messaging/groupController.mjs`. A barrel is
    // file organisation, not a second layer of authorization logic, so resolving it does not
    // widen how deep this reader looks — it just stops the reader from being defeated by a
    // directory layout. Capped at two facades so a cycle cannot hang the audit.
    let target = path.join(ROUTES, imp[1]);
    let body = null;
    for (let hop = 0; hop < 3; hop += 1) {
      try { body = fs.readFileSync(target, 'utf8'); } catch { body = null; break; }
      if (fnRe.test(body)) break;
      const reExport = new RegExp(`export\\s*\\{[^}]*\\b${fnName}\\b[^}]*\\}\\s*from\\s+['"]([^'"]+)['"]`)
        .exec(body);
      if (!reExport) break;
      target = path.join(path.dirname(target), reExport[1]);
      body = null;
    }
    if (!body) continue;
    const at = fnRe.exec(body);
    if (!at) continue;
    if (routeClearance(body.slice(at.index, at.index + 2200))) {
      return `controller ${path.basename(target)}:${fnName}`;
    }
  }
  return null;
}

function main() {
  let files;
  try {
    files = collectRouteFiles();
  } catch {
    console.error(`could not read ${ROUTES}`);
    process.exit(2);
  }

  const unchecked = [];
  const guarded = [];

  for (const f of files) {
    const full = path.join(ROUTES, f);
    let src;
    try { src = fs.readFileSync(full, 'utf8'); } catch { continue; }

    // Collected up front so each handler's window can be bounded at the NEXT declaration.
    const decls = [...src.matchAll(new RegExp(ROUTE_DECL.source, 'g'))];
    for (let d = 0; d < decls.length; d += 1) {
      const m = decls[d];
      const [, verb, , routePath] = m;
      if (!USER_PARAM.test(routePath)) continue;
      const nextDecl = decls[d + 1]?.index;

      // A file-level ROLE gate authorizes the whole router: if `router.use(authorize(['admin']))`
      // runs before every handler, a client cannot reach any of them and per-route ownership is
      // moot. A bare `router.use(protect)` does NOT count — see AUTHN_ONLY.
      //
      // Every clearance records WHY. A boolean makes this tool's own reasoning unauditable, which
      // is the same defect it hunts: something reporting success while describing a world nobody
      // can check. `--verbose` prints the reason so a human can falsify any one of them.
      const window = handlerBody(src, m.index, nextDecl);
      const body = expandSpreads(src, window);
      const why = routeClearance(body)
        || routerUseGate(src, m.index)
        || controllerHop(src, window);
      // A handler that names the actor but never compares it is the highest-value thing to review
      // by hand, so it is ranked as sensitive even when its path is not.
      const mentionOnly = !why && USER_REF.some((r) => r.test(body));
      const row = {
        file: f,
        verb: verb.toUpperCase(),
        route: routePath,
        line: src.slice(0, m.index).split('\n').length,
        sensitive: SENSITIVE.test(routePath) || SENSITIVE.test(f) || mentionOnly,
        why,
      };
      (why ? guarded : unchecked).push(row);
    }
  }

  const scanned = unchecked.length + guarded.length;
  console.log('\n=== IDOR surface audit (handlers taking a user-identifying param) ===');
  console.log(`  route files scanned      : ${files.length}`);
  console.log(`  user-scoped handlers     : ${scanned}`);
  console.log(`  show a visible check     : ${guarded.length}`);
  console.log(`  NO visible check         : ${unchecked.length}`);

  // A scan that examined nothing must never report success — same guard as the sibling audits.
  if (scanned === 0) {
    console.log('\n  AUDIT FAILED: zero user-scoped handlers were found.');
    console.log('  That is a fault in this audit (bad path or changed routing style), not a clean result.\n');
    process.exit(2);
  }

  const bySensitivity = [...unchecked].sort((a, b) => Number(b.sensitive) - Number(a.sensitive));
  const hot = bySensitivity.filter((r) => r.sensitive);

  if (hot.length) {
    console.log(`\n  --- SENSITIVE DATA, no visible check (${hot.length}) — review these first ---`);
    for (const r of hot) console.log(`    ${r.verb.padEnd(6)} ${r.route.padEnd(52)} ${r.file}:${r.line}`);
  }
  const rest = bySensitivity.filter((r) => !r.sensitive);
  if (rest.length) {
    console.log(`\n  --- other user-scoped, no visible check (${rest.length}) ---`);
    for (const r of rest.slice(0, 25)) console.log(`    ${r.verb.padEnd(6)} ${r.route.padEnd(52)} ${r.file}:${r.line}`);
    if (rest.length > 25) console.log(`    … and ${rest.length - 25} more`);
  }

  // How each clearance was reached. An indirect mechanism clearing a large share is the signal
  // that this reader has been widened too far — read it as a prompt to spot-check, not comfort.
  const byWhy = guarded.reduce((acc, r) => { acc[r.why] = (acc[r.why] || 0) + 1; return acc; }, {});
  console.log('\n  cleared by:');
  for (const [k, n] of Object.entries(byWhy).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${k.startsWith('router.use') || k.startsWith('controller') ? `INDIRECT — ${k}` : k}`);
  }

  if (verbose && guarded.length) {
    console.log(`\n  --- shows a visible check (${guarded.length}) ---`);
    for (const r of guarded) console.log(`    ${r.verb.padEnd(6)} ${r.route.padEnd(52)} ${r.file}:${r.line}  [${r.why}]`);
  }

  console.log('\n  NOTE: a flagged handler may still be safe via a service-layer check this reader');
  console.log('  cannot follow, and a passing one is NOT proven safe. Only a two-user negative test');
  console.log('  proves either. This ranks where to point those tests.');

  // RATCHET. Keyed on verb+route+file — NOT the line number, which churns whenever anyone adds a
  // comment above a handler and would otherwise resurrect a known finding as "new".
  const keys = unchecked.map((r) => findingKey([r.verb, r.route, r.file]));
  const describe = (k) => { const [v, rt, f] = k.split('|'); return `${v.padEnd(6)} ${rt.padEnd(52)} ${f}`; };

  if (updateBaseline) {
    const n = writeBaseline(BASELINE, keys, { audit: 'idor-surface', scanned: scanned });
    console.log(`\n  baseline written: ${n} accepted finding(s) -> ${path.relative(process.cwd(), BASELINE)}`);
    console.log('  Commit it. A gitignored baseline is a local opinion; a committed one is a');
    console.log('  reviewable record of what was accepted and when.\n');
    process.exit(0);
  }

  const baseline = loadBaseline(BASELINE);
  if (!baseline.exists) {
    // No baseline yet: report honestly and keep the old behaviour rather than inventing acceptance.
    console.log(`\n  no baseline at ${path.relative(process.cwd(), BASELINE)} — every finding counts as new.`);
    console.log('  Record the current state with --update-baseline once you have reviewed it.\n');
    process.exit(unchecked.length === 0 ? 0 : 1);
  }

  process.exit(reportRatchet({
    diff: diffBaseline(baseline, keys), label: 'unguarded handler(s)', baselineFile: BASELINE, describe,
  }));
}

// Run only when invoked directly. Importing this file used to execute the whole audit and call
// `process.exit()`, which is precisely why its detection logic had never been unit-tested — and
// why two defects survived in it. A script that cannot be imported cannot be given a regression
// test, so the absence of tests was a property of the file, not an oversight.
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
