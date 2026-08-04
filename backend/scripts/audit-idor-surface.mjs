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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROUTES = path.join(HERE, '..', 'routes');
const verbose = process.argv.includes('--verbose');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node backend/scripts/audit-idor-surface.mjs [--verbose]');
  console.log('  Flags route handlers that take a user-identifying param with no visible check');
  console.log('  against the authenticated caller. Static reader, not a prover — output is a');
  console.log('  review queue ranked by data sensitivity. Read-only.');
  console.log('  Exit 0 = all show a check, 1 = some do not, 2 = audit failed.');
  process.exit(0);
}

// Params that name a user other than "me".
const USER_PARAM = /:(userId|clientId|trainerId|user_id|client_id|trainer_id|memberId|athleteId)\b/;

// Any of these, on or near the route, counts as a visible check.
//
// The guard vocabulary was ENUMERATED from `middleware/` rather than guessed. The first version
// listed four names I assumed, and over-flagged badly as a result: `painEntryRoutes` came back
// "no visible check" while actually carrying `verifyClientAccessByUserId` on every route AND a
// controller-level `requester.role === 'client' && requester.id !== userId` 403. A linter whose
// vocabulary is smaller than the codebase's reports the gap between the two as findings.
const CHECK = [
  /req\.user\.(id|userId)/,
  /req\.user\.role/,
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
  /ensureClientAccess|ensureTrainerAccess|canAccess[A-Za-z]*|hasAccess/,
  // explicit annotation, including an explicit public declaration
  /\/\/\s*authz:/i,
];

// Route paths whose data is most sensitive — used only to rank the queue.
const SENSITIVE = /pii|waiver|measurement|movement|progress|photo|note|medical|injury|pain|nutrition|order|payment|session/i;

function handlerBody(src, from) {
  // Take a generous window from the route declaration; handlers here are short and this only needs
  // to be good enough to spot a check, not to parse JavaScript.
  return src.slice(from, from + 2200);
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

function main() {
  let files;
  try {
    files = fs.readdirSync(ROUTES).filter((f) => f.endsWith('.mjs'));
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

    const re = /router\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const [, verb, , routePath] = m;
      if (!USER_PARAM.test(routePath)) continue;

      // A file-level ROLE gate authorizes the whole router: if `router.use(authorize(['admin']))`
      // runs before every handler, a client cannot reach any of them and per-route ownership is
      // moot. A bare `router.use(protect)` does NOT count — that is authentication, and a logged-in
      // client hitting someone else's :userId still passes it. Conflating the two is precisely the
      // authn-for-authz mistake this audit exists to find, so the audit must not make it itself.
      const fileRoleGate = /router\.use\(\s*(authorize\w*\s*\(|adminOnly|requireAdmin|requireSuperAdmin|requireTrainerOrAdmin|requireAnyRole|ownerAdminOnly)/.test(src);
      const body = expandSpreads(src, handlerBody(src, m.index));
      const hasCheck = fileRoleGate || CHECK.some((r) => r.test(body));
      const row = {
        file: f,
        verb: verb.toUpperCase(),
        route: routePath,
        line: src.slice(0, m.index).split('\n').length,
        sensitive: SENSITIVE.test(routePath) || SENSITIVE.test(f),
      };
      (hasCheck ? guarded : unchecked).push(row);
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

  if (verbose && guarded.length) {
    console.log(`\n  --- shows a visible check (${guarded.length}) ---`);
    for (const r of guarded) console.log(`    ${r.verb.padEnd(6)} ${r.route.padEnd(52)} ${r.file}:${r.line}`);
  }

  console.log('\n  NOTE: a flagged handler may still be safe via a service-layer check this reader');
  console.log('  cannot follow, and a passing one is NOT proven safe. Only a two-user negative test');
  console.log('  proves either. This ranks where to point those tests.\n');

  process.exit(unchecked.length === 0 ? 0 : 1);
}

main();
