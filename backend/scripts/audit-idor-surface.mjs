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
export const USER_PARAM = /:(userId|clientId|trainerId|user_id|client_id|trainer_id|memberId|athleteId)\b|\/(users?|clients?|trainers?|members?|athletes?)\/:id\b/;

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
  // role / permission gates. NOTE: inline `authorize(...)` is handled in routeClearance, not
  // here, because whether it clears depends on WHICH roles it grants.
  /isAdmin|adminOnly|ownerAdminOnly|ownerOrAdminOnly|requireAdmin|requireSuperAdmin|requireTrainerOrAdmin|requireAnyRole/,
  /require[A-Za-z]*Permission|requireMultiplePermissions|requireAnyPermission/,
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
  // Explicit annotation, including an explicit public declaration. `// authz: TODO — add check
  // before launch` used to clear: an annotation is a claim, and an unfinished one is its opposite.
  /\/\/\s*authz:\s*(?!.*\b(todo|fixme|tbd|none|missing|unknown|pending)\b)\S/i,
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
/**
 * Callees that BIND the actor to the resource. An ALLOWLIST, not a denylist.
 *
 * The denylist this replaces excluded `console.log` and `res.json` and cleared on every other
 * callee — so `auditLog('read', req.user.id, req.params.userId)` cleared a handler with no
 * authorization at all, and this codebase writes actor-attributed audit logging diligently. A
 * denylist of sinks is an inverted allowlist of guards: it must enumerate every way to NOT
 * authorize, which is unbounded, instead of the few ways to authorize, which are not.
 * (External review, Kimi K3, 2026-08-14.)
 */
const GUARD_CALLEE = /^(ensureClientAccess|ensureScopedClientAccess|ensureTrainerAccess|checkClientAccess|assertGoalAccess|verifyClientAccess\w*|checkTrainerClientRelationship|assertTrainerAssignedToClient|assertAssignmentOrAdmin|authorizeResourceAccess|requireOwnershipOrTrainer|assertClipOwnership|canAccess\w*|hasAccess)$/;

/**
 * Does the body COMPARE the actor against THIS handler's route param, or merely mention it?
 *
 * Two things had to be true and only one was checked. `req.user.role === 'client'` is a
 * comparison, and it authorizes nothing about `:clientId`; so is `req.user.id === req.user.id`.
 * The other operand must be the param — directly, or through one level of local aliasing, which
 * is the dominant in-repo idiom on BOTH sides (`const requestingUserId = req.user.id;`
 * `const parsedClientId = parseInt(req.params.clientId)` … `String(a) !== String(b)`).
 *
 * `paramName` omitted → param binding is not required. Only the pure unit tests do that.
 */
export function comparesActor(body, paramName) {
  const OPS = '===|!==|==|!=';
  const actorAliases = ['req\\.user\\??\\.\\w+'];
  for (const m of body.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*req\.user\??\.\w+/g)) {
    actorAliases.push(`\\b${m[1]}\\b`);
  }

  // A named ownership guard handed the actor is a binding on its own — that IS the check.
  for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(\s*[^)]*req\.user\??\.\w+/g)) {
    if (GUARD_CALLEE.test(m[1])) return true;
  }
  for (const alias of actorAliases.slice(1)) {
    if (new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*\\([^)]*${alias}`).test(body)) {
      const callee = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*\\([^)]*${alias}`).exec(body)[1];
      if (GUARD_CALLEE.test(callee)) return true;
    }
  }

  if (!paramName) {
    // A short window, not adjacency: the dominant idiom wraps both operands —
    // `String(req.user.id) !== String(parsedClientId)` — so requiring the operator to sit next to
    // the reference rejects the most common real check in the codebase.
    return actorAliases.some((a) => new RegExp(
      `${a}[^;\\n]{0,40}(?:${OPS})|(?:${OPS})[^;\\n]{0,40}${a}`,
    ).test(body));
  }

  // Param side: `req.params.x`, or one alias hop off it.
  const paramRefs = [`req\\.params\\.${paramName}`, `req\\.params\\[['"\`]${paramName}['"\`]\\]`];
  for (const m of body.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*req\.params[.[]/g)) {
    paramRefs.push(`\\b${m[1]}\\b`);
  }
  // Destructured: `const { userId } = req.params;`
  for (const m of body.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*req\.params/g)) {
    for (const name of m[1].split(',')) {
      const clean = name.split(':').pop().trim().replace(/\W/g, '');
      if (clean) paramRefs.push(`\\b${clean}\\b`);
    }
  }
  // SECOND hop. The real idiom destructures and THEN parses:
  //   const { clientId } = req.params;
  //   const parsedClientId = parseStrictPositiveInteger(clientId);
  //   if (String(requestingUserId) !== String(parsedClientId)) return 403;
  // One hop stops at `clientId` and never reaches the name actually compared, so the most
  // careful handlers — the ones that validate before comparing — were the ones reported
  // unguarded. Two hops, deliberately not a fixpoint: unbounded chasing would let any
  // derived name satisfy the binding.
  for (const p of [...paramRefs]) {
    const bare = p.replace(/\\b/g, '').replace(/\\/g, '');
    if (!/^[A-Za-z_$][\w$]*$/.test(bare)) continue;
    for (const m of body.matchAll(new RegExp(`(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*[^;\\n]*\\b${bare}\\b`, 'g'))) {
      paramRefs.push(`\\b${m[1]}\\b`);
    }
  }

  for (const a of actorAliases) {
    for (const p of paramRefs) {
      if (new RegExp(`${a}[^;\\n]{0,80}(?:${OPS})[^;\\n]{0,80}${p}`).test(body)) return true;
      if (new RegExp(`${p}[^;\\n]{0,80}(?:${OPS})[^;\\n]{0,80}${a}`).test(body)) return true;
    }
  }
  return false;
}

/**
 * Route-level clearance for one handler. Pure — no filesystem — so the two probe shapes that
 * defeated v1 can be asserted permanently in a test instead of re-discovered by hand.
 * Returns 'route' or null.
 */
export function routeClearance(body, paramName) {
  if (CHECK.some((r) => r.test(body))) return 'route';
  // Inline `authorize([...])` clears only when the role list is staff-only. `authorize(['client'])`
  // on a `:clientId` route lets any client read any client — it was clearing identically to
  // `authorize(['admin'])`. (External review, Kimi K3, 2026-08-14.)
  for (const m of body.matchAll(/\bauthorize(?:Roles|Admin)?\s*\(([^)]*)\)/g)) {
    if (!NON_STAFF_ROLE.test(m[1])) return 'route';
  }
  return USER_REF.some((r) => r.test(body)) && comparesActor(body, paramName) ? 'route' : null;
}

/** The user-identifying param this route actually declares, for the binding check. */
export function paramNameOf(routePath) {
  const m = /:(userId|clientId|trainerId|user_id|client_id|trainer_id|memberId|athleteId)\b/.exec(routePath);
  return m ? m[1] : (/\/(?:users?|clients?|trainers?|members?|athletes?)\/:id\b/.test(routePath) ? 'id' : undefined);
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
export function expandSpreads(src, line) {
  let out = line;
  for (const m of line.matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)) {
    const name = m[1];
    // `const <name> = [ ... ]` anywhere in the file, captured with a BALANCED scan.
    //
    // The non-greedy `[\s\S]{0,600}?\]` this replaces stopped at the FIRST `]` — which is nested
    // inside `authorize(['trainer', 'admin'])`, truncating the array immediately before
    // `verifyClientAccessByUserId(...)`, the only member that binds the param. Eight of the most
    // sensitive handlers in the app are defended three ways and this read them as defended by a
    // fragment. It stayed invisible only because the old blind `authorize\s*\(` pattern cleared
    // them anyway — a second defect masking the first.
    const start = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\\[`).exec(src);
    if (!start) continue;
    const from = start.index + start[0].length - 1;
    let depth = 0;
    let end = -1;
    for (let k = from; k < Math.min(src.length, from + 1200); k += 1) {
      if (src[k] === '[') depth += 1;
      else if (src[k] === ']') { depth -= 1; if (depth === 0) { end = k; break; } }
    }
    if (end > from) out += `\n/*spread:${name}*/ ${src.slice(from + 1, end)}`;
  }
  return out;
}

/**
 * Middleware that authenticates but does NOT authorize. These must never clear a handler:
 * a logged-in client hitting someone else's `:userId` passes every one of them. Conflating
 * authn with authz is the exact bug this audit exists to find, so the audit must not make it.
 */
const AUTHN_ONLY = /^(protect|authenticateToken|authMiddleware|optionalAuth|injectUserId)$/;

/**
 * STAFF gates only. A router-level gate clears a param-scoped handler under it only when the gate
 * restricts to roles trusted ACROSS users. `clientOnly` and `authorizeClient` are VERTICAL:
 * `clientOnly` on `GET /:clientId/pain` means any client reads any client's pain log — the exact
 * horizontal attack this tool exists to find. They were in the clearing set and are now out.
 * Same reasoning removed `requireSubscription|requireTier|requireFeature|requireAiConsent` from
 * CHECK: a subscribed client is still a client. (External review, Kimi K3, 2026-08-14 — which also
 * caught that this file anchored `hasAccess` because a feature flag is not a gate, and then listed
 * `requireFeature` as one, in the same comment block.)
 */
const STAFF_GATE_NAME = /^(adminOnly|requireAdmin|requireSuperAdmin|requireTrainerOrAdmin|requireAnyRole|ownerAdminOnly|trainerOrAdminOnly|requireStaff|authorizeAdmin|require\w*Permission)$/;

/** Roles that do NOT make a role gate sufficient for a user-scoped param. */
const NON_STAFF_ROLE = /['"`](client|user|member|athlete)['"`]/;

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
export function routerUseGate(src, beforeOffset = Infinity, paramName) {
  for (const m of src.matchAll(/router\.use\(/g)) {
    if (m.index > beforeOffset) break;
    // Read the WHOLE call, not the first identifier: `router.use(protect, adminOnly)` appears in
    // 5+ files and stopping at `protect` skipped the only gate that mattered.
    // Strip the `router.use(` prefix BEFORE tokenizing. Leaving it on, the token pattern matched
    // `use` as a call and its optional `\(([^)]*)\)` group consumed `(authorizeAdmin)` whole — so
    // the argument was never tokenized and a correctly admin-gated router read as ungated. The
    // change that introduced this was itself the fix for `router.use(protect, adminOnly)`: widening
    // from "first identifier" to "all tokens" broke the single-argument case it was extending.
    const call = src.slice(m.index, m.index + 400).split(';')[0].replace(/^router\.use\(/, '');
    for (const a of call.matchAll(/\b([A-Za-z_$][\w$]*)\s*(?:\(([^)]*)\))?/g)) {
      const name = a[1];
      const args = a[2] || '';
      if (AUTHN_ONLY.test(name)) continue;
      if (STAFF_GATE_NAME.test(name)) return `router.use(${name})`;
      if (/^authorize\w*$/.test(name)) {
        // `authorize(['admin'])` binds; `authorize(['client'])` does not. Both printed identically
        // as `router.use(authorize)`, which made 19 clearances unverifiable from the output alone.
        if (args && !NON_STAFF_ROLE.test(args)) return `router.use(${name}(${args.trim().slice(0, 40)}))`;
        continue;
      }
      const fnBody = localFnBody(src, name);
      if (fnBody && routeClearance(fnBody, paramName)) return `router.use(${name}) -> local fn`;
    }
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
function controllerHop(src, window, paramName) {
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
    // Bounded at the NEXT function declaration. Defect A was fixed for route windows and left
    // standing one hop away: an unguarded controller method above a guarded sibling was cleared
    // by the sibling's text. (External review, Kimi K3.)
    const after = body.slice(at.index + 1);
    const nextFn = /\n(?:export\s+)?(?:async\s+)?(?:function\s+[A-Za-z_$]|const\s+[A-Za-z_$][\w$]*\s*=)|\n  [A-Za-z_$][\w$]*\s*\(/.exec(after);
    const end = at.index + 1 + Math.min(nextFn ? nextFn.index : 2200, 2200);
    if (routeClearance(body.slice(at.index, end), paramName)) {
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
      const paramName = paramNameOf(routePath);
      const why = routeClearance(body, paramName)
        || routerUseGate(src, m.index, paramName)
        || controllerHop(src, window, paramName);
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
