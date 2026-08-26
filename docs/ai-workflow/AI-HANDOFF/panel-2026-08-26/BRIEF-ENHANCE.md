# SWAN COACH AUTHORIZATION — ENHANCEMENT AND GAP HUNT

Four rounds of hostile review already ran on this work and reached DRY on bug-finding.
**This brief asks a different and broader question.** Do not just re-run a bug hunt.

## What I want from you, in priority order

1. **Bugs and issues that survived four rounds.** The prior rounds were scoped to the
   diffs. This brief hands you the whole workstream at once, which is a different view —
   things that are individually fine and collectively wrong live in that gap.
2. **Enhancements and upgrades.** Where is this merely adequate where it could be good?
   Performance, clarity, operability, failure behaviour, developer ergonomics.
3. **GAPS NOBODY ASKED FOR.** This is the one I most want. What is missing that neither
   the author nor the product owner has thought to ask for? What would a security engineer
   with fresh eyes say is conspicuously absent from an authorization system like this?
4. **Feature ideas**, grounded in the product below — not generic SaaS advice.

For each item: what it is, why it matters HERE (not in general), the smallest first move,
and how you would know it worked. Rank by value, and say plainly which of your own
suggestions you would drop if only three could be done.

Be concrete and be willing to say "this is fine, leave it". Padding a list with
safe-sounding suggestions costs the good ones their attention.

## The product, so your ideas land in it

SwanStudios is a **trainer-led personal-training SaaS**. Real trainers coach real clients:
workout logging, programs, progress charts, scheduling, payments. The core loop is
workout-progress-first — log the workout, turn it into progress proof, decide the next
training action.

**Swan Coach** is a natural-language command lane over that product. A trainer (or client,
or admin) types or speaks; a classifier picks one of 139 registered commands; an 11-step
pipeline validates, authorizes, resolves the target client, optionally requires
confirmation, and dispatches to a handler.

The load-bearing fact: **commands never travel over HTTP routes.** Dispatch selects a
handler by command TYPE, so no route middleware runs for this lane. Anything a REST route
gets for free from middleware, this lane must do itself — and for a long time, did not.

Roles: `user` (default), `client`, `trainer`, `admin`. Admin is the deliberate superset.
Data at stake: client PII, workout and biometric history, pain/injury notes, scheduling,
and payment-adjacent records. Multi-tenant: trainers must not see each other's clients.

## What three sessions of work established

- **Session 1** proved no BELOW-ROLE caller reaches a dispatcher (303 command×role pairs).
- **Session 2** (this one) asked the different question — whose RECORD may a correctly-roled
  caller act on — and found three live cross-tenant holes:
  1. Any authenticated **client could read any other client's** gamification profile
     (`view_xp_streaks` permits `client`, requires a client ref, is not self-service, and
     the resolver was handed no scope for non-trainer roles).
  2. Any **trainer could archive any workout plan** by id (`delete_workout_plan` is
     destructive, declares `requiresClientRef: false`, and passed the caller-supplied id to
     a lifecycle service that authorizes nothing — while the REST route to the same service
     is guarded by purpose-built IDOR middleware).
  3. A **confirmed operation stayed authorized for 120 seconds** after permission was lost.
- **Four hostile-review rounds** then found 12 more real defects, mostly in the FIXES and
  in the TESTS rather than in the original code.

## Current verification posture

- 61 assertions across five contracts, all executing real code paths
- **40 committed mutations**, all firing — `node scripts/mutation-harness.mjs`
  `backend/tests/mutations/ownership.mutations.mjs`
- Full backend: 9740 passed; 25 known-failing tests across 23 files, per-test baselined
- **No CI has ever run any of it** — the account's GitHub Actions are billing-blocked
- **Nothing is deployed.** 15 unpushed commits.

## Known and accepted — argue with these if you disagree, but do not re-report them

- **Dispatcher self-gating unproven.** Handlers are mocked throughout. Nothing shows a
  handler would refuse a caller on its own if reached another way.
- **TOCTOU on plan archive.** The access check sits outside the row lock the lifecycle
  service takes. `verifyClientAccessByPlanId` has the identical structure, so the window is
  shared with the REST route rather than introduced here.
- **~56 test stubs return `{id: 1}`** for an assignment row, which is why the fail-open-SQL
  consumer guard is narrowed (absent fields are not mismatches) rather than strict.
- **`client_access_check_failed` is unreachable in production** — the authorizer swallows
  its own failures, so a DB outage is audited as a revocation.
- **`allowedRoles` is untrustworthy for 54% of registry rows** (from an earlier session).
- **A role changing DURING dispatch** is not covered; only mint→redemption is.

---

# THE CODE

## The authorization seam — `stepResolveClient` and the confirm-lane gate

```javascript
    return setTypedPipelineError(ctx, 'CAPABILITY_DENIED');
  }
  return ctx;
}

/**
 * Roles whose client scope `resolveClient` itself decides: a trainer is restricted to
 * active assignments, an admin is deliberately unrestricted as the superset role.
 *
 * Every OTHER role resolves only itself. That used to be expressed as a ternary on the
 * resolver call — `trainerId: role === 'trainer' ? user.id : undefined` — which reads as
 * "trainers are scoped" but MEANS "every role except trainer is unscoped". `view_xp_streaks`
 * permits a `client` caller, requires a client ref, and is not self-service, so a client
 * could resolve any active client by id and read their gamification profile. Naming the
 * scoped roles makes the fall-through case explicit instead of implied.
 */
const RESOLVER_SCOPED_ROLES = new Set(['admin', 'trainer']);

/** Step 6: Resolve client reference if needed */
async function stepResolveClient(ctx) {
  ctx.stage = 'resolve_client';
  if (!ctx.command) return ctx;

  // Self-service commands use the requesting user
  if (ctx.command.selfService) {
    ctx.resolvedClient = {
      id: ctx.user.id,
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
    };
    return ctx;
  }

  if (!ctx.command.requiresClientRef) return ctx;

  const selectedClientId = toPositiveInteger(ctx.options.selectedClientId);
  const paramsClientId = toPositiveInteger(ctx.intent.params?.clientId);
  let clientId = selectedClientId || paramsClientId;
  let clientRef = selectedClientId ? null : (ctx.intent.clientRef || ctx.options.selectedClientName);

  if (!RESOLVER_SCOPED_ROLES.has(ctx.user.role)) {
    // An unscoped role may only ever be its own client. Asking for someone else by id is
    // refused outright rather than silently retargeted, so the caller is not told about a
    // record they may not see and is not misled about whose data they received. A name
    // reference is replaced by self for the same reason it is for a self-service command:
    // there is no one else in scope for it to mean.
    const selfId = toPositiveInteger(ctx.user.id);
    if (clientId && clientId !== selfId) {
      ctx.error = 'You can only run this on your own record.';
      return ctx;
    }
    if (!selfId) {
      ctx.error = 'You can only run this on your own record.';
      return ctx;
    }
    // Pin the target to self and then fall THROUGH to the ordinary resolver, rather than
    // fabricating a client record here. An earlier draft built `resolvedClient` from
    // `ctx.user` directly and so skipped every predicate the scoped path enforces — most
    // importantly `"isActive" = true`, which meant a deactivated account could still act
    // on itself while a trainer could not act on it. Two layers disagreeing about who
    // counts as a client is the same class of defect this whole slice exists to remove.
    clientId = selfId;
    clientRef = null;
  }

  if (clientId) {
    // Direct ID provided — use it
    ctx.resolvedClient = { id: clientId };
    // Still need to resolve for name
  }

  if (!clientRef && !clientId) {
    ctx.error = `Which client? Please specify a client name or select one from the client picker.`;
    return ctx;
  }

  const sequelize = ctx.options.sequelize;
  if (!sequelize) {
    ctx.error = 'Database connection not available. Please try again.';
    return ctx;
  }

  const { resolved, suggestions, error } = await resolveClient(
    clientRef || `#${clientId}`,
    sequelize,
    { trainerId: ctx.user.role === 'trainer' ? ctx.user.id : undefined }
  );

  if (error) {
    ctx.error = error;
    ctx.result = { suggestions };
    return ctx;
  }

  ctx.resolvedClient = resolved;

  // Inject resolved clientId into params
  if (resolved && ctx.intent.params) {
    ctx.intent.params.clientId = resolved.id;
  }

  return ctx;
}

/** Step 7: Route debate-required commands to debate engine */
async function stepDebateRouting(ctx) {
  ctx.stage = 'debate_routing';
  if (!ctx.command || !ctx.command.isDebateRequired) return ctx;
```

```javascript
 * was not tampered with; it says nothing about who may run it now, because it was signed
 * when the caller still could.
 *
 * The check is against the CURRENT role rather than the minted one. The operation never
 * recorded what it was minted under, and that is the wrong question anyway: what matters
 * is whether this caller may do this now.
 *
 * It re-runs the IDENTITY gates — role, and access to the operation's client — and
 * deliberately not the capability gate. `authorizeCommandCapability` answers a different
 * question: whether the browser surface that sent the request is in a state that permits
 * the command. At redemption there is no context envelope to answer it with, and a
 * surface's state is not a permission that gets revoked from a person. An earlier draft of
 * this comment claimed to ask "what every other gate in this lane asks", which was an
 * overclaim a review caught: capability is one of those gates and it is not re-run.
 *
 * Note on ordering: retrieval is single-use and deletes the operation, so a denial here
 * also consumes it. That is the safe direction — a denied caller cannot retry — at the
 * cost of a re-issue if the assignment lookup fails transiently.
 *
 * @returns {string|null} a denial reason for the audit log, or null when still permitted
 */
async function confirmLaneDenialReason(operation, user) {
  const commandType = operation?.commandType || null;
  // A STORED operation with no command type is a malformed record, not an absent input.
  // Skipping the checks for it — the earlier reading — meant an operation could pass the
  // gate having had nothing checked at all. That it also could not reach a dispatcher was
  // an argument, not an assertion, and it depended on code this function cannot see.
  if (!commandType) return 'malformed_operation';

  const command = getCommand(commandType);
  const required = Array.isArray(command?.roleRequired) ? command.roleRequired : null;
  if (!required) {
    // Unknown to the registry: there is no roleRequired to check against. If the type can
    // still reach a dispatcher, refuse — "cannot tell" must not mean "allow". If it cannot,
    // leave the lane's honest `not_wired` answer intact rather than replacing it with a
    // permission error that would be false: nothing can execute either way.
    return hasDispatcher(commandType) ? 'unregistered_command' : null;
  }
  if (!required.includes(user.role)) return 'role_revoked';

  // One canonical target, read from the operation rather than from a params field. The two
  // lanes previously read different sources, and `params.clientId` is absent on exactly the
  // commands that matter most (`delete_workout_plan` carries `planId`), so the check ran on
  // null. Where params ALSO name a client, the two must agree: a gate that authorizes one
  // id while dispatch acts on another authorizes nothing.
  const clientId = operation.clientId ?? null;
  const paramsClientId = operation.params?.clientId ?? null;
  if (clientId != null && paramsClientId != null && Number(clientId) !== Number(paramsClientId)) {
    return 'target_mismatch';
  }
  if (clientId == null && paramsClientId != null) return 'target_mismatch';

  // A command the PIPELINE resolves a client for must arrive with one recorded. If it does
  // not, the mint is broken and this gate cannot authorize what it cannot see — so it says
  // so instead of returning "permitted" by falling off the end.
  //
  // The converse is the honest limit, and it is not a bug: a command with NO client concept
  // at the pipeline level (`requiresClientRef: false` — `delete_workout_plan` is the live
  // example, it carries a `planId`) records no client, and this gate has nothing to check.
  // Ownership for those lives in the handler, which is why `dispatchDeleteWorkoutPlan` now
  // calls `assertAssignmentOrAdmin` itself. A panel called that arrangement incidental. It
  // is not incidental any more — it is the stated division of labour, and the handler-side
  // half is asserted in `aiCommandPlanArchiveOwnership.contract.test.mjs`.
  if (clientId == null && command.requiresClientRef === true) return 'missing_client_target';

  if (clientId != null) {
    // A denial caused by the lookup FAILING is recorded separately from a denial caused by
    // the answer being no. Both refuse — that is not negotiable — but during an incident the
    // two mean opposite things: one is a revoked user being correctly stopped, the other is
    // the database being unhealthy and every caller being stopped with them. A forensics
    // trail that cannot tell them apart turns an outage into a false access-abuse signal.
    //
    // HONEST LIMIT, found by review 2026-08-26: `assertAssignmentOrAdmin` catches its own
    // failures and returns false, so today a database outage arrives here as a plain "no"
    // and IS audited as a revocation. This catch is therefore unreachable through the
    // current authorizer — it is defence in depth against one that stops swallowing, and
    // the distinction it draws is real only for such an authorizer. Closing the conflation
    // properly means changing shared middleware the REST routes also depend on, which is a
```

## The shared access helper both lanes and the REST routes use

```javascript
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

/**
 * Core helper - returns boolean. Used by both middleware variants and exposed
 * for direct test use.
 *
 * REVISION 2026-04-30 (Codex BLOCKER post-Phase-B-merge): replaced obsolete raw
 * SQL against `"ClientTrainerAssignments"."isActive"` with the real model
 * contract `client_trainer_assignments.status = 'active'`. The original SQL
 * was inherited from workoutBuilderRoutes.mjs Phase A and was broken there
 * too - both call sites query a non-existent table name + non-existent column,
 * causing fail-closed denials for every trainer with a valid assignment. The
 * bug never surfaced in admin-driven testing because admins bypass.
 *
 * @param {number} userId - requester id (req.user.id)
 * @param {string} userRole - requester role ('admin' | 'trainer' | 'client' | 'user')
 * @param {number} clientId - target client id to verify access against
 * @returns {Promise<boolean>}
 */
export async function assertAssignmentOrAdmin(userId, userRole, clientId) {
  const requesterId = parseStrictPositiveInteger(userId);
  const targetClientId = parseStrictPositiveInteger(clientId);

  if (!targetClientId || (userRole !== 'admin' && !requesterId)) return false;
  if (userRole === 'admin') return true;
  if (userRole === 'client' || userRole === 'user') {
    return requesterId === targetClientId;
  }
  if (userRole !== 'trainer') return false;
  // Trainer: look up via the ClientTrainerAssignment model (real schema:
  // table=client_trainer_assignments, column=status with 'active'/'inactive'/'pending').
  //
  // NOTE: getModel() THROWS when the model isn't in the cache (it does not
  // return null). The try/catch below wraps both the lookup AND the findOne
  // call so that ANY failure - missing model, query throw, malformed cache -
  // routes through the fail-closed branch. Hostile-review fix 2026-04-30.
  try {
    const Model = getModel('ClientTrainerAssignment');
    const assignment = await Model.findOne({
      where: { trainerId: requesterId, clientId: targetClientId, status: 'active' },
    });
    if (!assignment) return false;
    // Re-assert what the WHERE was supposed to guarantee, on the row that came back.
    //
    // Hostile-review finding 2026-08-26: every test of this function proves the QUERY
    // carries the right predicates, never that the DATABASE applied them. A fail-open
    // construct — `WHERE (... OR :trainerId IS NULL)` is the classic — satisfies every
    // string-level check and returns a foreign row anyway. Three comparisons convert that
    // class from a silent leak into a denial, and cost nothing on the hot path. Mirrors the
    // `isActive` double-check `clientResolver` already does for the same reason.
    //
    // Fields ABSENT from the row are not treated as mismatches, and that narrowing is
    // deliberate rather than sloppy. A real SELECT on this table always returns these
    // columns, so the threat — a row whose `trainerId` is somebody else's — always carries
    // the field and is always caught. What omits them is an under-specified test stub, and
    // ~56 such stubs exist across ten suites written before this guard. Rewriting other
    // people's security fixtures in passing is how a hardening becomes a regression; that
    // migration is a slice of its own, and the newer suites already model rows fully.
    // `requesterId` and `targetClientId` are `parseStrictPositiveInteger` outputs above —
    // numbers, never strings — so coercing only the row side is correct rather than lucky.
    // A review asked; this comment is the answer, so nobody has to ask twice.
    const present = (value) => value !== undefined && value !== null;
    const mismatched = (actual, expected) => present(actual) && Number(actual) !== expected;
    if (mismatched(assignment.trainerId, requesterId)) return false;
    if (mismatched(assignment.clientId, targetClientId)) return false;
    // Same absent-is-not-a-mismatch rule as the ids. It read differently before — an
    // explicit `status: null` denied while an explicit `trainerId: null` passed — which errs
    // closed and so was never going to be caught by a test, but two rules for one idea is
    // how the next person derives the wrong one.
    if (present(assignment.status) && assignment.status !== 'active') return false;
    return true;
```

## The client resolver — the only thing that scopes a trainer to their own clients

```javascript
/**
 * Resolve a client reference to a database record.
 *
 * @param {string} clientRef - Name/ID/email from user input
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} [options]
 * @param {number} [options.trainerId] - Restrict to trainer's own clients
 * @param {number} [options.maxSuggestions=3] - Max disambiguation suggestions
 * @returns {Promise<{ resolved: Object|null, suggestions: Object[], error: string|null }>}
 */
export async function resolveClient(clientRef, sequelize, options = {}) {
  const { trainerId, maxSuggestions = 3 } = options;
  const scopedTrainerId = Number.parseInt(trainerId, 10);
  const hasTrainerScope = Number.isInteger(scopedTrainerId) && scopedTrainerId > 0;

  if (!clientRef || typeof clientRef !== 'string') {
    return { resolved: null, suggestions: [], error: 'No client reference provided' };
  }

  // Input validation: cap length to prevent abuse / regex DoS
  if (clientRef.length > 100) {
    return { resolved: null, suggestions: [], error: 'Client reference is too long. Please use a name or ID.' };
  }

  try {
    // Check if it's a direct ID reference
    const directId = clientRef.match(/^(?:client\s*#?\s*|#)?(\d+)$/i);
    if (directId) {
      const id = parseInt(directId[1]);
      const replacements = { id };
      let trainerScopeSql = '';
      if (hasTrainerScope) {
        replacements.trainerId = scopedTrainerId;
        trainerScopeSql = `
           AND EXISTS (
             SELECT 1
               FROM client_trainer_assignments cta
              WHERE cta."clientId" = "Users".id
                AND cta."trainerId" = :trainerId
                AND cta.status = 'active'
           )`;
      }
      const [rows] = await sequelize.query(
        `SELECT id, "firstName", "lastName", email, "isActive", version
         FROM "Users" WHERE id = :id AND role = 'client' AND "isActive" = true${trainerScopeSql} LIMIT 1`,
        { replacements, type: QueryTypes.SELECT }
      );
      if (rows && rows.id) {
        if (!rows.isActive) {
          return { resolved: null, suggestions: [], error: `Client #${id} is deactivated.` };
        }
        return {
          resolved: { id: rows.id, firstName: rows.firstName, lastName: rows.lastName, version: rows.version },
          suggestions: [],
          error: null,
        };
      }
      return {
        resolved: null,
        suggestions: [],
        error: hasTrainerScope ? 'No accessible active client found with that ID.' : `No client found with ID #${id}.`,
      };
    }

    // Fetch active clients for fuzzy matching
    let query = `SELECT id, "firstName", "lastName", email, "isActive", version
                 FROM "Users" WHERE "isActive" = true AND role = 'client'`;
    const replacements = {};

    if (hasTrainerScope) {
      // Trainer command scope must stay inside assigned active clients.
      replacements.trainerId = scopedTrainerId;
      query += ` AND EXISTS (
                   SELECT 1
                     FROM client_trainer_assignments cta
                    WHERE cta."clientId" = "Users".id
                      AND cta."trainerId" = :trainerId
                      AND cta.status = 'active'
                 )`;
    }

    query += ' ORDER BY "lastName", "firstName" LIMIT 50';

    const clients = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    // AI Village consensus: Log when limit is hit so we know to implement pg_trgm
    if (clients && clients.length === 50) {
      logger.warn('[ClientResolver] Client list truncated at 50 — consider database-side fuzzy matching', {
        trainerId,
        refLength: clientRef.length,
      });
    }

    if (!clients || clients.length === 0) {
      return { resolved: null, suggestions: [], error: 'No active clients found in the system.' };
    }

    // Score all clients against the reference
```

## The plan-archive dispatcher (the destructive one that had no check at all)

```javascript
/**
 * ============================================================================
 * FILE: dispatchers/workoutPlanCommandDispatchers.mjs
 * PURPOSE: Workout-plan write dispatchers for Swan Coach command execution
 * OWNER: Codex | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Routes Swan Coach archive commands through the same
 * audited lifecycle boundary as the protected REST API, under the same access
 * check that route's middleware applies.
 * HOW IT FITS IN THE APP: Confirmed command -> dispatcher -> access check ->
 * lifecycle service -> locked plan transition plus immutable receipt.
 * KEY DECISIONS: Archived is explicit and terminal; command results expose only
 * bounded identifiers/status, never plan content or client PII.
 *
 * THE ACCESS CHECK IS NOT OPTIONAL, AND WAS ONCE ABSENT: this header claimed
 * parity with the protected REST route while performing no authorization at
 * all. `DELETE /api/workout-plans/:id` is guarded by
 * `verifyClientAccessByPlanId`; commands never travel over routes, so no
 * middleware runs for this lane and the guard has to be called here. Sharing a
 * boundary with a protected caller is not the same as being protected.
 */

import sequelize from '../../../database.mjs';
import { getAllModels } from '../../../models/index.mjs';
import { transitionWorkoutPlanLifecycle } from '../../workoutPlanLifecycleService.mjs';
import { assertAssignmentOrAdmin } from '../../../middleware/verifyClientAccess.mjs';

/**
 * Denial and absence are the same answer on purpose.
 *
 * `verifyClientAccessByPlanId` — the middleware guarding the REST route to this same
 * operation — answers cross-tenant access with 404 rather than 403 so that an attacker
 * walking ids cannot tell "exists but not yours" from "does not exist". This lane already
 * had a not-found shape, so denial reuses it rather than inventing a distinguishable one.
 */
const planNotAvailable = (planId) => ({
  planId,
  planFound: false,
  archived: false,
  previousStatus: null,
  status: null,
  clientId: null,
  trainerId: null,
});

/**
 * Archive a workout plan through the canonical lifecycle boundary.
 * @param {{ planId: string|number }} params
 * @param {{ user?: { id?: number } }} ctx
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchDeleteWorkoutPlan(params = {}, ctx = {}) {
  const { WorkoutPlan } = getAllModels();
  const planId = params.planId;

  // `delete_workout_plan` declares `requiresClientRef: false`, so the pipeline resolves no
  // client and applies no scope — the caller-supplied planId arrives unexamined. The
  // lifecycle service does not close that: it validates `actorId` as a positive integer
  // and records it for audit, which is why its own comment says it applies one ALREADY
  // authorized action. Authorizing it is this caller's job, exactly as it is the REST
  // route's, and through the same helper that route's middleware uses.
  const plan = await WorkoutPlan.findByPk(planId);
  if (!plan) return planNotAvailable(planId);
  const permitted = await assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, plan.userId);
  if (!permitted) return planNotAvailable(planId);

  try {
    const result = await transitionWorkoutPlanLifecycle({
      sequelize,
      WorkoutPlan,
      planId,
      action: 'archive',
      actorId: ctx.user?.id,
    });
    const plan = result.plan;
    const receipt = result.lifecycleReceipt;

    return {
      planId: plan.id ?? planId,
      planFound: true,
      archived: receipt?.fromStatus !== 'archived',
      previousStatus: receipt?.fromStatus ?? null,
      status: plan.status ?? 'archived',
      lifecycleReceiptId: receipt?.id ?? null,
      clientId: plan.userId ?? null,
      trainerId: plan.trainerId ?? null,
    };
  } catch (error) {
    if (error?.code !== 'WORKOUT_PLAN_NOT_FOUND') throw error;
    // Same helper as the denial path above, so the two answers cannot drift apart. Kept
    // as one expression rather than two identical literals: if a later edit adds a field
    // to one of them, an unassigned caller becomes distinguishable from a stranger, and
    // nothing about that edit would look like a security change.
    return planNotAvailable(planId);
  }
}
```

## The full production diff for the whole workstream

```diff
diff --git a/backend/middleware/verifyClientAccess.mjs b/backend/middleware/verifyClientAccess.mjs
index 01ae3446a..c06b85d85 100644
--- a/backend/middleware/verifyClientAccess.mjs
+++ b/backend/middleware/verifyClientAccess.mjs
@@ -103,7 +103,36 @@ export async function assertAssignmentOrAdmin(userId, userRole, clientId) {
     const assignment = await Model.findOne({
       where: { trainerId: requesterId, clientId: targetClientId, status: 'active' },
     });
-    return !!assignment;
+    if (!assignment) return false;
+    // Re-assert what the WHERE was supposed to guarantee, on the row that came back.
+    //
+    // Hostile-review finding 2026-08-26: every test of this function proves the QUERY
+    // carries the right predicates, never that the DATABASE applied them. A fail-open
+    // construct — `WHERE (... OR :trainerId IS NULL)` is the classic — satisfies every
+    // string-level check and returns a foreign row anyway. Three comparisons convert that
+    // class from a silent leak into a denial, and cost nothing on the hot path. Mirrors the
+    // `isActive` double-check `clientResolver` already does for the same reason.
+    //
+    // Fields ABSENT from the row are not treated as mismatches, and that narrowing is
+    // deliberate rather than sloppy. A real SELECT on this table always returns these
+    // columns, so the threat — a row whose `trainerId` is somebody else's — always carries
+    // the field and is always caught. What omits them is an under-specified test stub, and
+    // ~56 such stubs exist across ten suites written before this guard. Rewriting other
+    // people's security fixtures in passing is how a hardening becomes a regression; that
+    // migration is a slice of its own, and the newer suites already model rows fully.
+    // `requesterId` and `targetClientId` are `parseStrictPositiveInteger` outputs above —
+    // numbers, never strings — so coercing only the row side is correct rather than lucky.
+    // A review asked; this comment is the answer, so nobody has to ask twice.
+    const present = (value) => value !== undefined && value !== null;
+    const mismatched = (actual, expected) => present(actual) && Number(actual) !== expected;
+    if (mismatched(assignment.trainerId, requesterId)) return false;
+    if (mismatched(assignment.clientId, targetClientId)) return false;
+    // Same absent-is-not-a-mismatch rule as the ids. It read differently before — an
+    // explicit `status: null` denied while an explicit `trainerId: null` passed — which errs
+    // closed and so was never going to be caught by a test, but two rules for one idea is
+    // how the next person derives the wrong one.
+    if (present(assignment.status) && assignment.status !== 'active') return false;
+    return true;
   } catch (err) {
     logger.warn('[verifyClientAccess] ClientTrainerAssignment check failed - denying access', {
       userId, clientId, error: err?.message,
diff --git a/backend/scripts/test-baseline-gate.mjs b/backend/scripts/test-baseline-gate.mjs
index 723035927..46f158c20 100644
--- a/backend/scripts/test-baseline-gate.mjs
+++ b/backend/scripts/test-baseline-gate.mjs
@@ -7,41 +7,56 @@
  * `npx vitest run ... | tail -4 && git push`, and `tail` exits 0 no matter what vitest
  * reported. The failure slipped through a pipe.
  *
- * The deeper cause is structural, and it is why "just check the exit code" does not fix
- * it: **this suite has a non-green baseline.** Nine files / six tests fail for reasons
- * that predate this work, so `vitest run` exits 1 on a perfectly good tree. A literal
- * exit-code gate blocks every push forever, which is precisely the pressure that leads
- * someone to pipe the output somewhere friendlier. A gate that cries wolf gets routed
- * around, and then it is not a gate.
+ * The deeper cause is structural: **this suite has a non-green baseline.** Files fail for
+ * reasons that predate current work, so `vitest run` exits 1 on a perfectly good tree. A
+ * literal exit-code gate blocks every push forever, which is precisely the pressure that
+ * leads someone to pipe the output somewhere friendlier. A gate that cries wolf gets routed
+ * around, and then it is not a gate. So the honest question is not "did anything fail?" but
+ * **"did anything NEW fail?"**
  *
- * So the honest question is not "did anything fail?" but **"did anything NEW fail?"**
- * This compares the set of failing test FILES against a recorded baseline:
+ * WHY IT COMPARES TESTS AND REASONS, NOT FILE NAMES (2026-08-26)
+ * -------------------------------------------------------------
+ * It used to compare the set of failing FILE NAMES. Two handoffs flagged the hole and a
+ * hostile-review panel put a number on it: a file already in the baseline could start
+ * failing for an entirely NEW reason — a different test inside it, or the same test with a
+ * different error — and the set stayed identical. Every verification claim in three
+ * sessions of security work was routed through that comparison, so the thing certifying
+ * the work could not see a whole class of regression in the work.
  *
+ * It now records each failing TEST by identity and a normalised failure REASON:
+ *
+ *   - a test that starts failing and was not in the baseline   -> REGRESSION
+ *   - a baselined test that starts failing DIFFERENTLY         -> REGRESSION (reason drift)
+ *   - a file that stops COLLECTING at all (import crash)       -> REGRESSION
+ *   - a baselined test that now passes                          -> reported, prune it
+ *
+ * Reason drift is a hard failure rather than a warning on purpose. It is the exact case
+ * the old gate was blind to, and a warning in a wall of green output is a thing nobody
+ * reads. Re-baseline deliberately with `--update` when the drift is understood.
+ *
+ * USAGE
  *   node backend/scripts/test-baseline-gate.mjs --update   # record today's baseline
  *   node backend/scripts/test-baseline-gate.mjs            # gate: exit 1 on regression
  *
  * Exit 0 = no new failures (baseline may still be red).
- * Exit 1 = a file that used to pass now fails, OR the run itself did not complete.
- * Exit 2 = usage / could not run.
- *
- * It deliberately reports files that were EXPECTED to fail and now pass, too — a
- * baseline that silently rots is the next version of this same problem.
+ * Exit 1 = something failed that did not before, OR the run did not complete.
+ * Exit 2 = usage / no baseline recorded.
  */
-
 import { spawn } from 'node:child_process';
-import { readFileSync, writeFileSync, existsSync } from 'node:fs';
-import { dirname, join } from 'node:path';
+import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdtempSync } from 'node:fs';
+import { dirname, join, relative, resolve } from 'node:path';
 import { fileURLToPath } from 'node:url';
+import { tmpdir } from 'node:os';
 
 const HERE = dirname(fileURLToPath(import.meta.url));
-const BASELINE_PATH = join(HERE, '..', 'tests', 'known-failing-baseline.json');
+const BACKEND = join(HERE, '..');
+const BASELINE_PATH = join(BACKEND, 'tests', 'known-failing-baseline.json');
 const UPDATE = process.argv.includes('--update');
 
-function runSuite() {
+function runSuite(outputFile) {
   return new Promise((resolve) => {
-    // `--reporter dot` keeps output small; we parse the FAIL lines, not the summary.
-    const p = spawn('npx', ['vitest', 'run', '--reporter', 'dot'], {
-      cwd: join(HERE, '..'),
+    const p = spawn('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${outputFile}`], {
+      cwd: BACKEND,
       shell: process.platform === 'win32',
     });
     let out = '';
@@ -52,42 +67,94 @@ function runSuite() {
   });
 }
 
-/** Failing FILES, not individual test names — test names churn, files are stable. */
-function parseFailingFiles(out) {
-  const files = new Set();
-  for (const line of out.split('\n')) {
-    const m = line.match(/^\s*FAIL\s+(\S+)/);
-    if (m) files.add(m[1].replace(/\\/g, '/'));
-  }
-  return [...files].sort();
+const rel = (abs) => relative(BACKEND, abs).split('\\').join('/');
+
+/**
+ * Reduce a failure message to something stable enough to compare across runs but specific
+ * enough that a DIFFERENT failure looks different. Absolute paths, line/column numbers,
+ * durations, hex ids and quantities all churn without the failure changing; the assertion
+ * itself does not.
+ */
+export function normalizeReason(messages) {
+  const first = (Array.isArray(messages) ? messages : []).find(Boolean) || '';
+  return String(first)
+    .split('\n')[0]
+    .replace(/[A-Za-z]:[\\/][^\s:]+/g, '<path>')
+    .replace(/\/[^\s:]+\.(mjs|js|ts|tsx)/g, '<path>')
+    .replace(/:\d+:\d+/g, '')
+    .replace(/\b0x[0-9a-f]+\b/gi, '<hex>')
+    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g, '<time>')
+    .replace(/\b\d+\s?ms\b/g, '<ms>')
+    .replace(/\s+/g, ' ')
+    .trim()
+    .slice(0, 200);
 }
 
-function parseTotals(out) {
-  const m = out.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/);
-  return m ? { failed: Number(m[1] || 0), passed: Number(m[2]) } : null;
+/**
+ * Every failing test, by identity, plus why. A file that failed to COLLECT has no
+ * assertions at all — recording it under a sentinel keeps an import crash from being
+ * invisible, which is the same blindness in a different coat.
+ */
+export function collectFailures(report) {
+  const failures = new Map();
+  for (const file of report.testResults || []) {
+    const path = rel(file.name);
+    const assertions = file.assertionResults || [];
+    const failed = assertions.filter((a) => a.status === 'failed');
+    for (const a of failed) {
+      failures.set(`${path} :: ${a.fullName}`, normalizeReason(a.failureMessages));
+    }
+    // No assertions ran but the file is failed => it never collected.
+    if (!assertions.length && file.status === 'failed') {
+      failures.set(`${path} :: <file did not collect>`, normalizeReason([file.message]));
+    }
+  }
+  return failures;
 }
 
-const { out, code } = await runSuite();
-const failing = parseFailingFiles(out);
-const totals = parseTotals(out);
+const RUN_AS_CLI = process.argv[1]
+  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
+if (!RUN_AS_CLI) {
+  // Imported for its pure comparison logic (see tests/unit/testBaselineGate.test.mjs).
+  // Running the whole suite as a side effect of an import would be its own kind of lie.
+} else {
+const outputFile = join(mkdtempSync(join(tmpdir(), 'swan-gate-')), 'report.json');
+const { out, code } = await runSuite(outputFile);
+
+let report = null;
+try {
+  report = JSON.parse(readFileSync(outputFile, 'utf8'));
+} catch {
+  report = null;
+}
+try { unlinkSync(outputFile); } catch { /* best effort */ }
 
-// A run that never produced a summary is NOT a pass — it is an unknown, and treating an
+// A run that never produced a report is NOT a pass — it is an unknown, and treating an
 // unknown as success is how a broken suite reads as a clean one.
-if (!totals) {
-  process.stderr.write('\n  test-baseline-gate: the suite did not produce a summary — treating as FAILURE.\n');
+if (!report || !Array.isArray(report.testResults) || report.testResults.length === 0) {
+  process.stderr.write('\n  test-baseline-gate: the suite produced no machine-readable report — treating as FAILURE.\n');
   process.stderr.write(`  vitest exit code: ${code}\n\n`);
   process.stderr.write(`${out.split('\n').slice(-25).join('\n')}\n`);
   process.exit(1);
 }
 
+const failures = collectFailures(report);
+const failingFiles = [...new Set([...failures.keys()].map((k) => k.split(' :: ')[0]))].sort();
+const passed = report.numPassedTests ?? 0;
+const failed = report.numFailedTests ?? 0;
+
 if (UPDATE) {
   writeFileSync(BASELINE_PATH, `${JSON.stringify({
     recordedAt: new Date().toISOString(),
-    note: 'Files failing for reasons that predate current work. Shrink this list; never grow it casually.',
-    failingFiles: failing,
+    note: 'Tests failing for reasons that predate current work, with the reason each failed. '
+      + 'Shrink this list; never grow it casually. Compared per TEST and per REASON — a '
+      + 'baselined test that starts failing differently is a regression, not a match.',
+    failingTests: [...failures.entries()].sort((a, b) => a[0].localeCompare(b[0]))
+      .map(([id, reason]) => ({ id, reason })),
+    failingFiles,
   }, null, 2)}\n`);
-  process.stdout.write(`\n  baseline recorded: ${failing.length} failing file(s)\n`);
-  for (const f of failing) process.stdout.write(`    ${f}\n`);
+  process.stdout.write(`\n  baseline recorded: ${failures.size} failing test(s) across ${failingFiles.length} file(s)\n`);
+  for (const f of failingFiles) process.stdout.write(`    ${f}\n`);
   process.stdout.write('\n');
   process.exit(0);
 }
@@ -97,26 +164,62 @@ if (!existsSync(BASELINE_PATH)) {
   process.exit(2);
 }
 
-const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).failingFiles || [];
-const known = new Set(baseline);
-const regressions = failing.filter((f) => !known.has(f));
-const fixed = baseline.filter((f) => !failing.includes(f));
+const baselineDoc = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
+process.stdout.write(`\n  tests: ${passed} passed, ${failed} failed`
+  + `  |  failing tests: ${failures.size} across ${failingFiles.length} file(s)\n`);
 
-process.stdout.write(`\n  tests: ${totals.passed} passed, ${totals.failed} failed`
-  + `  |  failing files: ${failing.length} (baseline ${baseline.length})\n`);
+// ── Legacy baseline: file names only ────────────────────────────────────────
+if (!Array.isArray(baselineDoc.failingTests)) {
+  const knownFiles = new Set(baselineDoc.failingFiles || []);
+  const newFiles = failingFiles.filter((f) => !knownFiles.has(f));
+  process.stderr.write('\n  NOTE: this baseline records FILE NAMES only, so a file already in it can start\n');
+  process.stderr.write('  failing for a new reason invisibly. Re-record with --update to gate per test.\n');
+  if (newFiles.length) {
+    process.stderr.write('\n  REGRESSION — these files were not failing before:\n');
+    for (const f of newFiles) process.stderr.write(`    ${f}\n`);
+    process.stderr.write('\n  Do not push.\n\n');
+    process.exit(1);
+  }
+  process.stdout.write('\n  no new failing FILES — but this gate is running blind within them.\n\n');
+  process.exit(0);
+}
+
+// ── Per-test comparison ─────────────────────────────────────────────────────
+const baseline = new Map(baselineDoc.failingTests.map((t) => [t.id, t.reason]));
+const brandNew = [];
+const drifted = [];
+for (const [id, reason] of failures) {
+  if (!baseline.has(id)) brandNew.push(id);
+  else if (baseline.get(id) !== reason) {
+    drifted.push({ id, was: baseline.get(id), now: reason });
+  }
+}
+const fixed = [...baseline.keys()].filter((id) => !failures.has(id));
 
 if (fixed.length) {
   // Not a failure — but a baseline nobody prunes becomes a place to hide new breakage.
   process.stdout.write('\n  these are in the baseline but now PASS — prune them:\n');
-  for (const f of fixed) process.stdout.write(`    ${f}\n`);
+  for (const id of fixed) process.stdout.write(`    ${id}\n`);
 }
 
-if (regressions.length) {
-  process.stderr.write('\n  REGRESSION — these files were not failing before:\n');
-  for (const f of regressions) process.stderr.write(`    ${f}\n`);
-  process.stderr.write('\n  Do not push. Fix them, or record a new baseline deliberately.\n\n');
+if (brandNew.length) {
+  process.stderr.write('\n  REGRESSION — these tests were not failing before:\n');
+  for (const id of brandNew) process.stderr.write(`    ${id}\n    ${failures.get(id)}\n`);
+}
+
+if (drifted.length) {
+  process.stderr.write('\n  REASON DRIFT — these were already failing, but NOT like this:\n');
+  for (const d of drifted) {
+    process.stderr.write(`    ${d.id}\n      was: ${d.was}\n      now: ${d.now}\n`);
+  }
+  process.stderr.write('\n  A known failure that changed shape is a new failure wearing an old name.\n');
+}
+
+if (brandNew.length || drifted.length) {
+  process.stderr.write('\n  Do not push. Fix them, or re-record deliberately with --update.\n\n');
   process.exit(1);
 }
 
-process.stdout.write('  no new failures — safe to push.\n\n');
+process.stdout.write('\n  no new failures — safe to push.\n\n');
 process.exit(0);
+}
diff --git a/backend/services/ai/commandExecutor.mjs b/backend/services/ai/commandExecutor.mjs
index ee1185c8f..207a61d45 100644
--- a/backend/services/ai/commandExecutor.mjs
+++ b/backend/services/ai/commandExecutor.mjs
@@ -22,6 +22,7 @@ import { getCommand } from './commandRegistry/index.mjs';
 import { createCommandErrorOutcome } from './commandOutcomeContract.mjs';
 import { authorizeCommandCapability } from './commandCapabilityPolicy.mjs';
 import { resolveClient } from './clientResolver.mjs';
+import { assertAssignmentOrAdmin } from '../../middleware/verifyClientAccess.mjs';
 import { rehydrateResponse } from './deIdentifier.mjs';
 import {
   prepareDestructiveOperation,
@@ -39,6 +40,10 @@ import { recordCommandAudit } from './commandAudit.mjs';
 
 const COMMAND_PIPELINE_FAILED_MESSAGE = 'Swan Coach command lane failed. No data was changed.';
 const COMMAND_CONFIRM_FAILED_MESSAGE = 'Swan Coach could not complete that confirmed operation. No data was changed.';
+
+// Deliberately says nothing about WHICH permission is gone. A caller whose access was just
+// revoked is the one person who should not be told whether it was the role or the client.
+export const CONFIRM_NO_LONGER_PERMITTED_MESSAGE = 'You no longer have permission to complete that operation. No data was changed. Please re-issue the command if you believe this is wrong.';
 const CLASSIFIER_FAILURE_CODES = new Set(['PARSE_FAIL', 'CLASSIFICATION_FAILED']);
 
 function setTypedPipelineError(ctx, code) {
@@ -390,6 +395,19 @@ async function stepCapabilityGate(ctx) {
   return ctx;
 }
 
+/**
+ * Roles whose client scope `resolveClient` itself decides: a trainer is restricted to
+ * active assignments, an admin is deliberately unrestricted as the superset role.
+ *
+ * Every OTHER role resolves only itself. That used to be expressed as a ternary on the
+ * resolver call — `trainerId: role === 'trainer' ? user.id : undefined` — which reads as
+ * "trainers are scoped" but MEANS "every role except trainer is unscoped". `view_xp_streaks`
+ * permits a `client` caller, requires a client ref, and is not self-service, so a client
+ * could resolve any active client by id and read their gamification profile. Naming the
+ * scoped roles makes the fall-through case explicit instead of implied.
+ */
+const RESOLVER_SCOPED_ROLES = new Set(['admin', 'trainer']);
+
 /** Step 6: Resolve client reference if needed */
 async function stepResolveClient(ctx) {
   ctx.stage = 'resolve_client';
@@ -409,8 +427,33 @@ async function stepResolveClient(ctx) {
 
   const selectedClientId = toPositiveInteger(ctx.options.selectedClientId);
   const paramsClientId = toPositiveInteger(ctx.intent.params?.clientId);
-  const clientId = selectedClientId || paramsClientId;
-  const clientRef = selectedClientId ? null : (ctx.intent.clientRef || ctx.options.selectedClientName);
+  let clientId = selectedClientId || paramsClientId;
+  let clientRef = selectedClientId ? null : (ctx.intent.clientRef || ctx.options.selectedClientName);
+
+  if (!RESOLVER_SCOPED_ROLES.has(ctx.user.role)) {
+    // An unscoped role may only ever be its own client. Asking for someone else by id is
+    // refused outright rather than silently retargeted, so the caller is not told about a
+    // record they may not see and is not misled about whose data they received. A name
+    // reference is replaced by self for the same reason it is for a self-service command:
+    // there is no one else in scope for it to mean.
+    const selfId = toPositiveInteger(ctx.user.id);
+    if (clientId && clientId !== selfId) {
+      ctx.error = 'You can only run this on your own record.';
+      return ctx;
+    }
+    if (!selfId) {
+      ctx.error = 'You can only run this on your own record.';
+      return ctx;
+    }
+    // Pin the target to self and then fall THROUGH to the ordinary resolver, rather than
+    // fabricating a client record here. An earlier draft built `resolvedClient` from
+    // `ctx.user` directly and so skipped every predicate the scoped path enforces — most
+    // importantly `"isActive" = true`, which meant a deactivated account could still act
+    // on itself while a trainer could not act on it. Two layers disagreeing about who
+    // counts as a client is the same class of defect this whole slice exists to remove.
+    clientId = selfId;
+    clientRef = null;
+  }
 
   if (clientId) {
     // Direct ID provided — use it
@@ -512,6 +555,11 @@ async function stepConfirmation(ctx) {
       endpoint: ctx.command.endpoint,
       commandParams: ctx.intent.params,
       commandType: ctx.command.type,   // exec-substrate-v9: signed in HMAC payload
+      // The client this operation was AUTHORIZED against, recorded so redemption can
+      // re-check the same one. Reading it back out of `params` instead is what a panel
+      // caught: `delete_workout_plan` carries its target in `params.planId` and has no
+      // `params.clientId`, so the destructive lane's client re-check silently did nothing.
+      clientId: ctx.resolvedClient?.id ?? null,
       userId: ctx.user.id,
       description: `${ctx.command.description}${ctx.resolvedClient ? ` for ${ctx.resolvedClient.firstName || 'Client #' + ctx.resolvedClient.id}` : ''}`,
       affectedRecords: ctx.resolvedClient ? [{ id: ctx.resolvedClient.id, name: `${ctx.resolvedClient.firstName} ${ctx.resolvedClient.lastName || ''}`.trim() }] : [],
@@ -780,6 +828,102 @@ function outcomeFromPipelineCtx(ctx) {
  *   message: string,
  * }>}
  */
+/**
+ * Re-authorize a confirmed operation at the moment of its EFFECT.
+ *
+ * A pending operation is authorized once, in the pipeline, then parked for up to 120
+ * seconds. Redemption verified ownership, expiry and (destructively) an HMAC signature —
+ * none of which notice that the caller's role was revoked, or that the client was
+ * transferred to another trainer, inside that window. The signature proves the operation
+ * was not tampered with; it says nothing about who may run it now, because it was signed
+ * when the caller still could.
+ *
+ * The check is against the CURRENT role rather than the minted one. The operation never
+ * recorded what it was minted under, and that is the wrong question anyway: what matters
+ * is whether this caller may do this now.
+ *
+ * It re-runs the IDENTITY gates — role, and access to the operation's client — and
+ * deliberately not the capability gate. `authorizeCommandCapability` answers a different
+ * question: whether the browser surface that sent the request is in a state that permits
+ * the command. At redemption there is no context envelope to answer it with, and a
+ * surface's state is not a permission that gets revoked from a person. An earlier draft of
+ * this comment claimed to ask "what every other gate in this lane asks", which was an
+ * overclaim a review caught: capability is one of those gates and it is not re-run.
+ *
+ * Note on ordering: retrieval is single-use and deletes the operation, so a denial here
+ * also consumes it. That is the safe direction — a denied caller cannot retry — at the
+ * cost of a re-issue if the assignment lookup fails transiently.
+ *
+ * @returns {string|null} a denial reason for the audit log, or null when still permitted
+ */
+async function confirmLaneDenialReason(operation, user) {
+  const commandType = operation?.commandType || null;
+  // A STORED operation with no command type is a malformed record, not an absent input.
+  // Skipping the checks for it — the earlier reading — meant an operation could pass the
+  // gate having had nothing checked at all. That it also could not reach a dispatcher was
+  // an argument, not an assertion, and it depended on code this function cannot see.
+  if (!commandType) return 'malformed_operation';
+
+  const command = getCommand(commandType);
+  const required = Array.isArray(command?.roleRequired) ? command.roleRequired : null;
+  if (!required) {
+    // Unknown to the registry: there is no roleRequired to check against. If the type can
+    // still reach a dispatcher, refuse — "cannot tell" must not mean "allow". If it cannot,
+    // leave the lane's honest `not_wired` answer intact rather than replacing it with a
+    // permission error that would be false: nothing can execute either way.
+    return hasDispatcher(commandType) ? 'unregistered_command' : null;
+  }
+  if (!required.includes(user.role)) return 'role_revoked';
+
+  // One canonical target, read from the operation rather than from a params field. The two
+  // lanes previously read different sources, and `params.clientId` is absent on exactly the
+  // commands that matter most (`delete_workout_plan` carries `planId`), so the check ran on
+  // null. Where params ALSO name a client, the two must agree: a gate that authorizes one
+  // id while dispatch acts on another authorizes nothing.
+  const clientId = operation.clientId ?? null;
+  const paramsClientId = operation.params?.clientId ?? null;
+  if (clientId != null && paramsClientId != null && Number(clientId) !== Number(paramsClientId)) {
+    return 'target_mismatch';
+  }
+  if (clientId == null && paramsClientId != null) return 'target_mismatch';
+
+  // A command the PIPELINE resolves a client for must arrive with one recorded. If it does
+  // not, the mint is broken and this gate cannot authorize what it cannot see — so it says
+  // so instead of returning "permitted" by falling off the end.
+  //
+  // The converse is the honest limit, and it is not a bug: a command with NO client concept
+  // at the pipeline level (`requiresClientRef: false` — `delete_workout_plan` is the live
+  // example, it carries a `planId`) records no client, and this gate has nothing to check.
+  // Ownership for those lives in the handler, which is why `dispatchDeleteWorkoutPlan` now
+  // calls `assertAssignmentOrAdmin` itself. A panel called that arrangement incidental. It
+  // is not incidental any more — it is the stated division of labour, and the handler-side
+  // half is asserted in `aiCommandPlanArchiveOwnership.contract.test.mjs`.
+  if (clientId == null && command.requiresClientRef === true) return 'missing_client_target';
+
+  if (clientId != null) {
+    // A denial caused by the lookup FAILING is recorded separately from a denial caused by
+    // the answer being no. Both refuse — that is not negotiable — but during an incident the
+    // two mean opposite things: one is a revoked user being correctly stopped, the other is
+    // the database being unhealthy and every caller being stopped with them. A forensics
+    // trail that cannot tell them apart turns an outage into a false access-abuse signal.
+    //
+    // HONEST LIMIT, found by review 2026-08-26: `assertAssignmentOrAdmin` catches its own
+    // failures and returns false, so today a database outage arrives here as a plain "no"
+    // and IS audited as a revocation. This catch is therefore unreachable through the
+    // current authorizer — it is defence in depth against one that stops swallowing, and
+    // the distinction it draws is real only for such an authorizer. Closing the conflation
+    // properly means changing shared middleware the REST routes also depend on, which is a
+    // separate decision; claiming the distinction works today would be false.
+    try {
+      const permitted = await assertAssignmentOrAdmin(user.id, user.role, clientId);
+      if (!permitted) return 'client_access_revoked';
+    } catch {
+      return 'client_access_check_failed';
+    }
+  }
+  return null;
+}
+
 export async function executeConfirmedOperation(operationId, user, sequelize) {
   // Audit helper for the confirm lane — best-effort, never throws.
   const auditConfirm = (outcome, extras = {}) => {
@@ -804,6 +948,16 @@ export async function executeConfirmedOperation(operationId, user, sequelize) {
   const ndResult = retrievePendingConfirmation(operationId, user.id);
   if (ndResult.verified) {
     const { operation } = ndResult;
+    const ndDenial = await confirmLaneDenialReason(operation, user);
+    if (ndDenial) {
+      auditConfirm('denied', {
+        commandType: operation.commandType,
+        targetClientId: operation.clientId ?? null,
+        requiresConfirmation: true,
+        errorCode: ndDenial,
+      });
+      return { success: false, type: 'error', message: CONFIRM_NO_LONGER_PERMITTED_MESSAGE };
+    }
     if (operation.frontendEvent) {
       auditConfirm('success', {
         commandType: operation.commandType,
@@ -943,7 +1097,22 @@ export async function executeConfirmedOperation(operationId, user, sequelize) {
   // stores the command-lane dispatcher key signed into the pending operation.
   const commandType = operation.commandType || null;
   if (commandType && hasDispatcher(commandType)) {
-    const clientId = operation.params?.clientId ?? null;
+    // ONE canonical source in both lanes: the client the operation was authorized against
+    // at mint, not whatever a params field happens to hold. `params.clientId` was the
+    // earlier reading and it is absent on exactly the commands that matter most —
+    // `delete_workout_plan` carries `planId` — so the check quietly ran on `null`.
+    const clientId = operation.clientId ?? null;
+    const denial = await confirmLaneDenialReason(operation, user);
+    if (denial) {
+      auditConfirm('denied', {
+        commandType,
+        targetClientId: clientId,
+        destructive: true,
+        requiresConfirmation: true,
+        errorCode: denial,
+      });
+      return { success: false, type: 'error', message: CONFIRM_NO_LONGER_PERMITTED_MESSAGE };
+    }
     try {
       const result = await dispatch(commandType, operation.params, {
         user,
diff --git a/backend/services/ai/destructiveOperations.mjs b/backend/services/ai/destructiveOperations.mjs
index c3af5ba4d..ab0302b62 100644
--- a/backend/services/ai/destructiveOperations.mjs
+++ b/backend/services/ai/destructiveOperations.mjs
@@ -33,6 +33,7 @@ function signOperation(op) {
     type: op.type,
     endpoint: op.endpoint,
     commandType: op.commandType,  // exec-substrate-v9: included so tampering with commandType fails verification
+    clientId: op.clientId,        // the client this operation was AUTHORIZED against, re-checked at redemption
     params: op.params,
     createdBy: op.createdBy,
   });
@@ -61,6 +62,7 @@ export function prepareDestructiveOperation({
   endpoint,
   commandParams,
   commandType,      // exec-substrate-v9: command-lane type (e.g. 'cancel_session'); HMAC-signed
+  clientId = null,  // resolved client this op was authorized against; HMAC-signed, re-checked at redemption
   userId,
   description,
   affectedRecords = [],
@@ -96,6 +98,7 @@ export function prepareDestructiveOperation({
     type,
     endpoint,
     commandType: commandType ?? null,  // signed in HMAC payload — tampering detected on verify
+    clientId: Number.isSafeInteger(Number(clientId)) && Number(clientId) > 0 ? Number(clientId) : null,
     params: commandParams,
     affectedRecords: affectedRecords.slice(0, 10), // Max 10 in preview
     affectedCount: affectedRecords.length,
diff --git a/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs b/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs
index 44a4162ee..0fba6b7a9 100644
--- a/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs
+++ b/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs
@@ -7,16 +7,43 @@
  * ============================================================================
  *
  * WHAT THIS FILE DOES: Routes Swan Coach archive commands through the same
- * audited lifecycle boundary as the protected REST API.
- * HOW IT FITS IN THE APP: Confirmed command -> dispatcher -> lifecycle service
- * -> locked plan transition plus immutable receipt.
+ * audited lifecycle boundary as the protected REST API, under the same access
+ * check that route's middleware applies.
+ * HOW IT FITS IN THE APP: Confirmed command -> dispatcher -> access check ->
+ * lifecycle service -> locked plan transition plus immutable receipt.
  * KEY DECISIONS: Archived is explicit and terminal; command results expose only
  * bounded identifiers/status, never plan content or client PII.
+ *
+ * THE ACCESS CHECK IS NOT OPTIONAL, AND WAS ONCE ABSENT: this header claimed
+ * parity with the protected REST route while performing no authorization at
+ * all. `DELETE /api/workout-plans/:id` is guarded by
+ * `verifyClientAccessByPlanId`; commands never travel over routes, so no
+ * middleware runs for this lane and the guard has to be called here. Sharing a
+ * boundary with a protected caller is not the same as being protected.
  */
 
 import sequelize from '../../../database.mjs';
 import { getAllModels } from '../../../models/index.mjs';
 import { transitionWorkoutPlanLifecycle } from '../../workoutPlanLifecycleService.mjs';
+import { assertAssignmentOrAdmin } from '../../../middleware/verifyClientAccess.mjs';
+
+/**
+ * Denial and absence are the same answer on purpose.
+ *
+ * `verifyClientAccessByPlanId` — the middleware guarding the REST route to this same
+ * operation — answers cross-tenant access with 404 rather than 403 so that an attacker
+ * walking ids cannot tell "exists but not yours" from "does not exist". This lane already
+ * had a not-found shape, so denial reuses it rather than inventing a distinguishable one.
+ */
+const planNotAvailable = (planId) => ({
+  planId,
+  planFound: false,
+  archived: false,
+  previousStatus: null,
+  status: null,
+  clientId: null,
+  trainerId: null,
+});
 
 /**
  * Archive a workout plan through the canonical lifecycle boundary.
@@ -28,6 +55,17 @@ export async function dispatchDeleteWorkoutPlan(params = {}, ctx = {}) {
   const { WorkoutPlan } = getAllModels();
   const planId = params.planId;
 
+  // `delete_workout_plan` declares `requiresClientRef: false`, so the pipeline resolves no
+  // client and applies no scope — the caller-supplied planId arrives unexamined. The
+  // lifecycle service does not close that: it validates `actorId` as a positive integer
+  // and records it for audit, which is why its own comment says it applies one ALREADY
+  // authorized action. Authorizing it is this caller's job, exactly as it is the REST
+  // route's, and through the same helper that route's middleware uses.
+  const plan = await WorkoutPlan.findByPk(planId);
+  if (!plan) return planNotAvailable(planId);
+  const permitted = await assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, plan.userId);
+  if (!permitted) return planNotAvailable(planId);
+
   try {
     const result = await transitionWorkoutPlanLifecycle({
       sequelize,
@@ -51,14 +89,10 @@ export async function dispatchDeleteWorkoutPlan(params = {}, ctx = {}) {
     };
   } catch (error) {
     if (error?.code !== 'WORKOUT_PLAN_NOT_FOUND') throw error;
-    return {
-      planId,
-      planFound: false,
-      archived: false,
-      previousStatus: null,
-      status: null,
-      clientId: null,
-      trainerId: null,
-    };
+    // Same helper as the denial path above, so the two answers cannot drift apart. Kept
+    // as one expression rather than two identical literals: if a later edit adds a field
+    // to one of them, an unassigned caller becomes distinguishable from a stranger, and
+    // nothing about that edit would look like a security change.
+    return planNotAvailable(planId);
   }
 }
\ No newline at end of file
```

---

# OUTPUT FORMAT

```
## 1. BUGS AND ISSUES STILL PRESENT
### [SEVERITY] title — where / failure scenario / smallest fix / confidence
(or: "none found after attacking X, Y, Z")

## 2. ENHANCEMENTS AND UPGRADES
### [VALUE: HIGH|MED|LOW] title — what / why here / first move / done-when

## 3. GAPS NOBODY ASKED FOR
The section I care most about. What is conspicuously absent?
### [VALUE] title — what is missing / what it costs to lack it / first move

## 4. FEATURE IDEAS
Grounded in a trainer-led PT SaaS with a natural-language command lane.

## 5. IF ONLY THREE OF YOUR OWN SUGGESTIONS COULD BE DONE
Name them, in order, and say what you would drop and why.
```