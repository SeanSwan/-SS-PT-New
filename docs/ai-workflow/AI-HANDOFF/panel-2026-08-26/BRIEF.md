# HOSTILE REVIEW BRIEF — Swan Coach ownership authorization (3 fixes, 9 commits)

**You are a hostile reviewer. Your job is to find what is WRONG, not to praise what is right.**
A review that returns "looks good" is a failed review. If you genuinely cannot find a defect,
say so explicitly and name the three things you checked hardest and why they held.

## Rules of engagement

- **Rank every finding CRITICAL / HIGH / MEDIUM / LOW / NIT.** For each: file, the exact code
  or claim you are attacking, a CONCRETE failure scenario (inputs -> wrong outcome), and the
  smallest fix.
- **Attack the PROOF as hard as the code.** An assertion that cannot fail is worse than no
  assertion — it converts an unchecked area into one that looks checked. If a test would still
  pass with the security check deleted, that is a CRITICAL finding even though the code is right.
- **Do not invent requirements.** A finding that contradicts an existing, deliberate, documented
  decision is noise. If you think a documented decision is itself wrong, say so separately and
  label it OPINION.
- **Say what you could not verify.** You are reading a diff, not running it.

## Context you need

Swan Coach is a natural-language command lane in a personal-training SaaS. A user types or
speaks; a classifier picks one of 139 registered commands; an 11-step pipeline runs and then
calls a dispatcher (handler). **Commands never travel over HTTP routes** — dispatch selects a
handler by command TYPE, so NO route middleware runs for this lane. Anything a REST route gets
from middleware, this lane must do itself.

Pipeline step order (this matters):
`sanitize -> phi_scan -> classify -> validate -> write_kill_switch -> rbac -> capability_gate
-> resolve_client -> debate_routing -> confirmation -> execute`

Roles in the User model enum: `user` (DEFAULT), `client`, `trainer`, `admin`. `admin` is the
deliberate superset role.

`dispatch()` has exactly THREE call sites: the pipeline's `stepExecute`, and two confirm-lane
redemption paths (non-destructive pending confirmation, and HMAC-signed destructive).

A prior session proved no BELOW-ROLE caller reaches a dispatcher (303 pairs). This work is the
DIFFERENT question: whose RECORD may a correctly-roled caller act on.

## The three defects claimed fixed — attack each

### 1. A client could read any other client
`stepResolveClient` derived the resolver scope as
`{ trainerId: ctx.user.role === 'trainer' ? ctx.user.id : undefined }` — leaving every
non-trainer role unscoped. `view_xp_streaks` permits a `client` caller, sets
`requiresClientRef: true`, and is NOT self-service, so a client could name another client id
and receive their gamification profile (points, level, tier, streaks, achievements).

### 2. Any trainer could archive any workout plan
`delete_workout_plan` is `destructive: true`, takes `planId`, declares
`requiresClientRef: false` (so the pipeline resolves no client and applies NO scope), and passed
the caller-supplied id to `transitionWorkoutPlanLifecycle`, which validates `actorId` is a
positive integer and records it for audit — it authorizes nothing. The REST route to the same
service, `DELETE /api/workout-plans/:id`, is guarded by `verifyClientAccessByPlanId`.

### 3. A confirmed operation stayed authorized for 120s after permission was lost
Redemption checked ownership of the pending operation, expiry, and (destructive) an HMAC
signature. None re-checked the caller's current role or current client access.

## SPECIFIC THINGS I WANT YOU TO TRY TO BREAK

1. **Can any caller still reach a dispatcher holding a client id that is not theirs?** Consider:
   `clientRef` name strings vs numeric ids; `selectedClientId` vs `params.clientId`;
   `selfService` commands whose params also carry a clientId; role strings with unexpected case
   or type; `ctx.user.id` as a string vs a number.
2. **Is the new non-privileged branch in `stepResolveClient` in the right PLACE?** It returns
   early. What does it skip? Is any later step load-bearing for correctness or safety?
3. **The plan-archive fix loads the plan, then the service loads it again under a row lock.**
   Is that TOCTOU exploitable? Does it match what the REST middleware does?
4. **`confirmLaneDenialReason` — find the hole.** What if `commandType` is null; the registry is
   uninitialized; `clientId` is 0, a string, or negative; `assertAssignmentOrAdmin` returns a
   non-boolean or a promise that never settles.
5. **Denial-vs-absence indistinguishability.** Three paths return the same shape. Is there a
   fourth that does not? Timing differences? Observable audit side effects?
6. **The test fake is a "mirror" that applies whatever predicates it finds in the SQL string.**
   Attack that design. When does it lie?
7. **Ordering claims.** The kill switch must run before the re-auth query. The gate must run
   before every dispatch. Guaranteed, or merely tested?

---

# THE PRODUCTION DIFF (the code under review)

```diff
diff --git a/backend/services/ai/commandExecutor.mjs b/backend/services/ai/commandExecutor.mjs
index ee1185c8f..d60b54d46 100644
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
+const CONFIRM_NO_LONGER_PERMITTED_MESSAGE = 'You no longer have permission to complete that operation. No data was changed. Please re-issue the command if you believe this is wrong.';
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
@@ -412,6 +430,25 @@ async function stepResolveClient(ctx) {
   const clientId = selectedClientId || paramsClientId;
   const clientRef = selectedClientId ? null : (ctx.intent.clientRef || ctx.options.selectedClientName);
 
+  if (!RESOLVER_SCOPED_ROLES.has(ctx.user.role)) {
+    // An unscoped role may only ever be its own client. Asking for someone else by id is
+    // refused outright rather than silently retargeted, so the caller is not told about a
+    // record they may not see and is not misled about whose data they received. A name
+    // reference falls through to self for the same reason it does for a self-service
+    // command: there is no one else in scope for it to mean.
+    if (clientId && clientId !== toPositiveInteger(ctx.user.id)) {
+      ctx.error = 'You can only run this on your own record.';
+      return ctx;
+    }
+    ctx.resolvedClient = {
+      id: ctx.user.id,
+      firstName: ctx.user.firstName,
+      lastName: ctx.user.lastName,
+    };
+    if (ctx.intent.params) ctx.intent.params.clientId = ctx.user.id;
+    return ctx;
+  }
+
   if (clientId) {
     // Direct ID provided — use it
     ctx.resolvedClient = { id: clientId };
@@ -780,6 +817,51 @@ function outcomeFromPipelineCtx(ctx) {
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
+ * is whether this caller may do this now, which is what every other gate in this lane asks.
+ *
+ * Note on ordering: retrieval is single-use and deletes the operation, so a denial here
+ * also consumes it. That is the safe direction — a denied caller cannot retry — at the
+ * cost of a re-issue if the assignment lookup fails transiently.
+ *
+ * @returns {string|null} a denial reason for the audit log, or null when still permitted
+ */
+async function confirmLaneDenialReason(commandType, clientId, user) {
+  if (commandType) {
+    const command = getCommand(commandType);
+    const required = Array.isArray(command?.roleRequired) ? command.roleRequired : null;
+    if (!required) {
+      // Unknown to the registry: there is no roleRequired to check against. If the type
+      // can still reach a dispatcher, refuse — "cannot tell" must not mean "allow". If it
+      // cannot, leave the lane's honest `not_wired` answer intact rather than replacing it
+      // with a permission error that would be false: nothing can execute either way.
+      return hasDispatcher(commandType) ? 'unregistered_command' : null;
+    }
+    if (!required.includes(user.role)) return 'role_revoked';
+  }
+  if (clientId != null) {
+    let permitted = false;
+    try {
+      permitted = await assertAssignmentOrAdmin(user.id, user.role, clientId);
+    } catch {
+      permitted = false;
+    }
+    if (!permitted) return 'client_access_revoked';
+  }
+  return null;
+}
+
 export async function executeConfirmedOperation(operationId, user, sequelize) {
   // Audit helper for the confirm lane — best-effort, never throws.
   const auditConfirm = (outcome, extras = {}) => {
@@ -804,6 +886,18 @@ export async function executeConfirmedOperation(operationId, user, sequelize) {
   const ndResult = retrievePendingConfirmation(operationId, user.id);
   if (ndResult.verified) {
     const { operation } = ndResult;
+    const ndDenial = await confirmLaneDenialReason(
+      operation.commandType, operation.clientId ?? null, user,
+    );
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
@@ -944,6 +1038,17 @@ export async function executeConfirmedOperation(operationId, user, sequelize) {
   const commandType = operation.commandType || null;
   if (commandType && hasDispatcher(commandType)) {
     const clientId = operation.params?.clientId ?? null;
+    const denial = await confirmLaneDenialReason(commandType, clientId, user);
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

# WHAT THE TESTS ASSERT (attack these for vacuity)

39 assertions across four contracts, plus a committed 29-mutation harness reporting
FIRED / SURVIVED / ANCHOR, claimed 29/29 FIRED.

## backend/tests/api/aiCommandDispatcherOwnership.contract.test.mjs
```javascript
  });
  return {
    ctx,
    directory,
    dispatchCalls: dispatchMock.mock.calls.length,
    dispatchedClientId: dispatchMock.mock.calls[0]?.[1]?.clientId ?? null,
    resolvedClientId: ctx.resolvedClient?.id ?? null,
    schemaConverged: fixture.ok,
  };
}

const TRAINER_READ = 'view_client_profile';

describe('Swan Coach dispatcher ownership', () => {
  describe('the probe itself', () => {
    it('reaches a dispatcher for a client the trainer OWNS — the positive control', async () => {
      // Without this, every denial below could pass because the harness never reaches
      // the gate rather than because the gate holds.
      const command = allCommands().find((c) => c.type === TRAINER_READ);
      const run = await runAgainstClient(command, 'trainer', OUR_TRAINER, OWN_CLIENT);
      expect(
        run.dispatchCalls,
        `control failed: an ASSIGNED client never reached dispatch (stopped at ${run.ctx.stage}: ${run.ctx.error})`,
      ).toBe(1);
      expect(run.dispatchedClientId).toBe(OWN_CLIENT);
    });

    it('sends the assignment scope to the database, with the caller as the trainer', async () => {
      // The denial must come from the scope clause. If the query stops carrying it, the
      // fake stops filtering, the foreign client resolves, and the suite fails — but this
      // asserts the mechanism directly rather than only through its effect.
      const command = allCommands().find((c) => c.type === TRAINER_READ);
      const run = await runAgainstClient(command, 'trainer', OUR_TRAINER, OWN_CLIENT);
      const scoped = run.directory.calls.filter((call) => call.scopedByAssignment);
      expect(scoped.length, 'resolver issued no assignment-scoped query for a trainer').toBeGreaterThan(0);
      for (const call of scoped) {
        expect(Number(call.replacements.trainerId)).toBe(OUR_TRAINER);
      }
    });

    it('sees parameter names through refine/optional wrappers', () => {
      // Instrument validation. A naive `Object.keys(schema.shape)` returns [] for the 19
      // wrapped schemas, hiding 12 commands' entire parameter lists — including
      // update_client's client id — while reporting a clean survey.
      const hidden = commandsWithHiddenShape(allCommands());
      expect(hidden, 'no wrapped schemas found: either the registry changed or the reader broke').not.toEqual([]);
      expect(paramNames(allCommands().find((c) => c.type === 'update_client'))).toContain('clientId');
    });

    it('has no stale pins', () => {
      const stale = [...UNSYNTHESIZABLE].filter((type) => {
        const command = allCommands().find((c) => c.type === type);
        return command && buildValidParams(command.inputSchema).ok;
      });
      expect(stale, `pinned commands now converge and must be unpinned: ${stale.join(', ')}`).toEqual([]);
    });
  });

  describe('a trainer and a client who is not theirs', () => {
    it('is stopped at resolve_client, not merely short of dispatch', async () => {
      const command = allCommands().find((c) => c.type === TRAINER_READ);
      const run = await runAgainstClient(command, 'trainer', OUR_TRAINER, FOREIGN_CLIENT);
      expect(run.dispatchCalls).toBe(0);
      expect(run.ctx.stage).toBe('resolve_client');
      expect(run.ctx.error).toBeTruthy();
    });

    it('is denied by NAME as well as by id — the other resolver branch', async () => {
      const command = allCommands().find((c) => c.type === TRAINER_READ);
      const own = await runAgainstClient(command, 'trainer', OUR_TRAINER, null, { byName: 'Ada' });
      expect(
        own.dispatchCalls,
        `control failed: an assigned client was not resolvable by name (${own.ctx.stage}: ${own.ctx.error})`,
      ).toBe(1);
      expect(own.dispatchedClientId).toBe(OWN_CLIENT);

      const foreign = await runAgainstClient(command, 'trainer', OUR_TRAINER, null, { byName: 'Bo' });
      expect(foreign.dispatchCalls, 'a trainer resolved an unassigned client by name').toBe(0);
      expect(foreign.ctx.stage).toBe('resolve_client');
      // The scan must not even list the foreign client, or a near-miss suggestion would
      // disclose that they exist.
      expect(JSON.stringify(foreign.ctx.result || {})).not.toContain('Foreign');
    });

    it('holds for EVERY command that resolves a client reference', async () => {
      const commands = clientRefCommands().filter((c) => c.roleRequired.includes('trainer'));
      expect(commands.length).toBeGreaterThan(30);
      const leaked = [];
      const wrongStage = [];
      for (const command of commands) {
        if (UNSYNTHESIZABLE.has(command.type)) continue;
        const run = await runAgainstClient(command, 'trainer', OUR_TRAINER, FOREIGN_CLIENT);
        if (run.dispatchCalls > 0) leaked.push(`${command.type} -> ${run.dispatchedClientId}`);
        else if (run.ctx.stage !== 'resolve_client') wrongStage.push(`${command.type} @ ${run.ctx.stage}`);
      }
      expect(leaked, `a trainer reached a dispatcher for an unassigned client: ${leaked.join(', ')}`).toEqual([]);
      expect(wrongStage, `denied, but NOT by the ownership gate: ${wrongStage.join(', ')}`).toEqual([]);
    });
  });

  describe('a caller who is neither admin nor trainer', () => {
    it('cannot reach a dispatcher holding another client id', async () => {
      // `view_xp_streaks` is the case that exposed this: roleRequired includes 'client',
      // requiresClientRef is true, selfService is not set. Step 6 derived a scope for
      // trainers only, so a client caller was unscoped and the resolver returned any
      // active client row by id.
      const command = allCommands().find((c) => c.type === 'view_xp_streaks');
      expect(command.roleRequired).toContain('client');
      const run = await runAgainstClient(command, 'client', OWN_CLIENT, FOREIGN_CLIENT);
      expect(
        run.dispatchedClientId,
        'a client-role caller reached a dispatcher holding another client id',
      ).not.toBe(FOREIGN_CLIENT);
      expect(run.resolvedClientId).not.toBe(FOREIGN_CLIENT);
    });

    it('is refused explicitly, not silently retargeted to itself', async () => {
      // The distinction matters: a silent retarget answers a question the caller did not
      // ask, and on a future write command it would modify the wrong record without ever
      // reporting an error.
      const command = allCommands().find((c) => c.type === 'view_xp_streaks');
      const run = await runAgainstClient(command, 'client', OWN_CLIENT, FOREIGN_CLIENT);
      expect(run.dispatchCalls).toBe(0);
      expect(run.ctx.stage).toBe('resolve_client');
      expect(run.ctx.error).toBeTruthy();
    });

    it('still reaches a dispatcher for its OWN record', async () => {
      // The fix must scope the caller, not lock them out. Without this, denying every
      // non-privileged caller unconditionally would pass every assertion above.
      const command = allCommands().find((c) => c.type === 'view_xp_streaks');
      const run = await runAgainstClient(command, 'client', OWN_CLIENT, OWN_CLIENT);
      expect(
        run.dispatchCalls,
        `a client was blocked from its own record (stopped at ${run.ctx.stage}: ${run.ctx.error})`,
      ).toBe(1);
      expect(run.dispatchedClientId).toBe(OWN_CLIENT);
    });

    it('holds for every non-privileged role on every client-ref command', async () => {
      const leaked = [];
      let pairsTested = 0;
      for (const command of clientRefCommands()) {
        if (UNSYNTHESIZABLE.has(command.type)) continue;
        for (const role of command.roleRequired) {
          if (role === 'admin' || role === 'trainer') continue;
          pairsTested += 1;
          const run = await runAgainstClient(command, role, OWN_CLIENT, FOREIGN_CLIENT);
          if (run.dispatchedClientId === FOREIGN_CLIENT || run.resolvedClientId === FOREIGN_CLIENT) {
            leaked.push(`${command.type} as ${role}`);
          }
        }
      }
      // Today exactly one such pair exists. If `view_xp_streaks` stops permitting a client
      // — or the classification changes — the loop body would never run and an empty
      // `leaked` would report a clean sweep of nothing. An empty surface is a fact worth
      // failing on, so that whoever removed the last pair decides deliberately.
      expect(pairsTested, 'no non-privileged client-ref pairs remain to test').toBeGreaterThan(0);
      expect(leaked, `non-privileged callers reached a foreign client: ${leaked.join(', ')}`).toEqual([]);
    });
  });

  describe('admin is the superset role, deliberately', () => {
    it('resolves any client, and the query carries no assignment scope', async () => {
      // Asserted so that scoping admins later is a deliberate, visible break rather than
      // an accident. If this ever needs to change, change it here first.
      const command = allCommands().find((c) => c.type === TRAINER_READ);
      const run = await runAgainstClient(command, 'admin', 9001, FOREIGN_CLIENT);
      expect(run.dispatchCalls).toBe(1);
      expect(run.dispatchedClientId).toBe(FOREIGN_CLIENT);
      expect(run.directory.calls.some((call) => call.scopedByAssignment)).toBe(false);
    });
  });
});
```

## backend/tests/helpers/fakeClientDirectory.mjs
```javascript
 * @param {Array<{id:number,firstName:string,lastName:string,email?:string,isActive?:boolean,role?:string,version?:number}>} fixture.clients
 * @param {Array<{clientId:number,trainerId:number,status?:string}>} fixture.assignments
 * @returns {{ query: Function, calls: Array<{sql:string,replacements:object,scopedByAssignment:boolean}> }}
 */
export function makeClientDirectory({ clients = [], assignments = [] } = {}) {
  const calls = [];

  const query = async (sql, options = {}) => {
    const replacements = options.replacements || {};
    // Read the predicates the query actually carries — never assume them.
    const scopedByAssignment = sql.includes('client_trainer_assignments');
    const filtersActive = sql.includes('"isActive" = true');
    const filtersClientRole = sql.includes("role = 'client'");
    calls.push({ sql, replacements, scopedByAssignment });

    let visible = clients;
    if (filtersActive) visible = visible.filter((c) => c.isActive !== false);
    if (filtersClientRole) visible = visible.filter((c) => (c.role || 'client') === 'client');
    if (scopedByAssignment) {
      const trainerId = Number(replacements.trainerId);
      visible = visible.filter((c) => assignments.some(
        (a) => a.clientId === c.id
          && a.trainerId === trainerId
          && (a.status || 'active') === 'active',
      ));
    }

    const row = (c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email || `${c.firstName}@example.test`.toLowerCase(),
      isActive: c.isActive !== false,
      version: c.version ?? 1,
    });

    // Direct-id lookup: the resolver destructures the FIRST element as the row.
    if (sql.includes('WHERE id = :id')) {
      const hit = visible.find((c) => c.id === Number(replacements.id));
      return hit ? [row(hit)] : [];
    }
    // Bounded list scan for fuzzy matching.
    return visible.map(row);
  };

  return { query, calls };
}

export default makeClientDirectory;
```

## backend/tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs
```javascript

vi.mock('../../database.mjs', () => ({ default: {} }));
vi.mock('../../services/workoutPlanLifecycleService.mjs', () => ({
  transitionWorkoutPlanLifecycle: vi.fn(),
}));
vi.mock('../../models/index.mjs', () => ({
  getAllModels: vi.fn(),
  getModel: vi.fn(),
}));

const transitionMock = vi.mocked(transitionWorkoutPlanLifecycle);
const getAllModelsMock = vi.mocked(getAllModels);
const getModelMock = vi.mocked(getModel);

const OWN_PLAN = 71;
const FOREIGN_PLAN = 72;

/** Two plans: one belonging to an assigned client, one to a peer trainer's client. */
const PLANS = {
  [OWN_PLAN]: { id: OWN_PLAN, userId: OWN_CLIENT, trainerId: OUR_TRAINER, status: 'active' },
  [FOREIGN_PLAN]: { id: FOREIGN_PLAN, userId: FOREIGN_CLIENT, trainerId: PEER_TRAINER, status: 'active' },
};

const ASSIGNMENTS = [{ trainerId: OUR_TRAINER, clientId: OWN_CLIENT, status: 'active' }];

beforeEach(() => {
  transitionMock.mockReset();
  transitionMock.mockImplementation(async ({ planId }) => ({
    plan: { ...PLANS[planId], status: 'archived' },
    lifecycleReceipt: { id: 'receipt-1', fromStatus: 'active' },
  }));
  getAllModelsMock.mockReset();
  getAllModelsMock.mockReturnValue({
    WorkoutPlan: { findByPk: async (id) => PLANS[Number(id)] || null },
  });
  getModelMock.mockReset();
  getModelMock.mockImplementation((name) => {
    if (name !== 'ClientTrainerAssignment') throw new Error(`unexpected model ${name}`);
    return {
      findOne: async ({ where }) => ASSIGNMENTS.find((a) => a.trainerId === Number(where.trainerId)
        && a.clientId === Number(where.clientId)
        && a.status === where.status) || null,
    };
  });
});

const trainer = { id: OUR_TRAINER, role: 'trainer' };
const admin = { id: 9001, role: 'admin' };

describe('Swan Coach plan-archive ownership', () => {
  it('archives a plan belonging to an assigned client — the positive control', async () => {
    const result = await dispatchDeleteWorkoutPlan({ planId: OWN_PLAN }, { user: trainer });
    expect(transitionMock).toHaveBeenCalledTimes(1);
    expect(transitionMock.mock.calls[0][0].planId).toBe(OWN_PLAN);
    expect(result.planFound).toBe(true);
    expect(result.archived).toBe(true);
  });

  it('does not archive a plan belonging to a client who is not the caller\'s', async () => {
    const result = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
    expect(transitionMock, 'an unassigned trainer reached the lifecycle service').not.toHaveBeenCalled();
    expect(result.planFound).toBe(false);
    expect(result.archived).toBe(false);
  });

  it('tells an unassigned trainer nothing a stranger would not learn', async () => {
    // Same answer for "not yours" and "does not exist", so walking ids reveals nothing.
    // Both echo the id they were asked about — that is the caller's own input coming
    // back, not a disclosure — so the comparison is over everything else.
    const withoutEcho = ({ planId, ...rest }) => rest;
    const denied = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
    const missing = await dispatchDeleteWorkoutPlan({ planId: 999999 }, { user: trainer });
    expect(withoutEcho(denied)).toEqual(withoutEcho(missing));
    expect(denied.planId).toBe(FOREIGN_PLAN);

    // There is a THIRD way to arrive at "no": the plan is loadable and the caller is
    // permitted, but the lifecycle service reports it gone underneath them. That answer
    // has to match too — two of three agreeing still tells an id-walker something.
    transitionMock.mockRejectedValueOnce(Object.assign(
      new Error('Workout plan not found'), { code: 'WORKOUT_PLAN_NOT_FOUND' },
    ));
    const raced = await dispatchDeleteWorkoutPlan({ planId: OWN_PLAN }, { user: trainer });
    expect(withoutEcho(raced)).toEqual(withoutEcho(missing));
  });

  it('scopes on the plan\'s CLIENT, not its author — deliberately, for parity', async () => {
    // A plan this trainer authored, for a client who is no longer theirs. The REST
    // middleware answers on `plan.userId` alone, so this lane does too: parity with the
    // guarded route matters more than the intuition that authorship should carry rights,
    // and two callers into one service disagreeing about who may use it is how the gap
    // being fixed here appeared in the first place. If this should change, change the
    // middleware and this together.
    const ORPHANED = 73;
    PLANS[ORPHANED] = { id: ORPHANED, userId: FOREIGN_CLIENT, trainerId: OUR_TRAINER, status: 'active' };
    const result = await dispatchDeleteWorkoutPlan({ planId: ORPHANED }, { user: trainer });
    expect(transitionMock).not.toHaveBeenCalled();
    expect(result.planFound).toBe(false);
    delete PLANS[ORPHANED];
  });

  it('lets an admin archive any plan', async () => {
    const result = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: admin });
    expect(transitionMock).toHaveBeenCalledTimes(1);
    expect(result.planFound).toBe(true);
  });

  it('denies when the assignment lookup throws — fail closed', async () => {
    // `assertAssignmentOrAdmin` treats any failure as a denial. Asserted here because a
    // gate that fails open under load is worse than no gate: it works in every test and
    // stops working exactly when the database is unhappy.
    getModelMock.mockImplementation(() => { throw new Error('model cache cold'); });
    const result = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
    expect(transitionMock).not.toHaveBeenCalled();
    expect(result.planFound).toBe(false);
  });

  it('does not archive when the plan lookup itself fails', async () => {
    // The REST middleware answers 500 here rather than 404, because a lookup that threw
    // is not evidence the plan is absent. This lane has no status code to return: the
    // throw leaves the handler, the pipeline's step loop catches it, and the command
    // fails. What matters either way is that nothing was archived.
    getAllModelsMock.mockReturnValue({
      WorkoutPlan: { findByPk: async () => { throw new Error('connection reset'); } },
    });
    await expect(dispatchDeleteWorkoutPlan({ planId: OWN_PLAN }, { user: trainer })).rejects.toThrow();
    expect(transitionMock).not.toHaveBeenCalled();
  });

  it('denies a caller with no role at all', async () => {
    const result = await dispatchDeleteWorkoutPlan({ planId: OWN_PLAN }, { user: { id: OUR_TRAINER } });
    expect(transitionMock).not.toHaveBeenCalled();
    expect(result.planFound).toBe(false);
  });
});
```

## backend/tests/api/aiCommandConfirmLaneReauthorization.contract.test.mjs
```javascript
const sequelize = {};

beforeEach(() => {
  // The registry is real and must be initialized, as it is at boot. Without it every
  // `getCommand` returns undefined and the lane denies EVERYTHING — the right direction to
  // fail in, but it would make the denial assertions below pass for the wrong reason.
  initializeRegistry();
  process.env.AI_COMMAND_WRITES_ENABLED = 'true';
  dispatchMock.mockReset();
  dispatchMock.mockResolvedValue({ probe: 'dispatcher reached' });
  hasDispatcherMock.mockReset();
  hasDispatcherMock.mockReturnValue(true);
  assertAccessMock.mockReset();
  assertAccessMock.mockResolvedValue(true);
  auditMock.mockReset();
  auditMock.mockResolvedValue({});
});

function mintPending(userId = OUR_TRAINER) {
  const { operationId } = preparePendingConfirmation({
    commandType: CONFIRMED_COMMAND,
    params: { clientId: OWN_CLIENT, achievementId: '7' },
    clientId: OWN_CLIENT,
    userId,
    description: 'award a badge',
  });
  return operationId;
}

function mintDestructive(userId = OUR_TRAINER) {
  const { operationId } = prepareDestructiveOperation({
    type: 'UPDATE',
    endpoint: '/api/sessions/9/cancel',
    commandParams: { id: 9, clientId: OWN_CLIENT },
    commandType: DESTRUCTIVE_COMMAND,
    userId,
    description: 'cancel a session',
  });
  return operationId;
}

describe('Swan Coach confirm-lane re-authorization', () => {
  describe('the probe itself', () => {
    it('executes for an unchanged, still-permitted caller — the positive control', async () => {
      const result = await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(
        dispatchMock,
        `control failed: a permitted trainer could not redeem (${result.type}: ${result.message})`,
      ).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });
  });

  describe('a role that no longer permits the command', () => {
    it('refuses the non-destructive lane', async () => {
      const result = await executeConfirmedOperation(mintPending(), DEMOTED, sequelize);
      expect(dispatchMock, 'a demoted caller redeemed a pending operation').not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('refuses the destructive lane, signature notwithstanding', async () => {
      // The HMAC proves the operation was not tampered with. It says nothing about who may
      // run it now — it was signed when the caller still could.
      const result = await executeConfirmedOperation(mintDestructive(), DEMOTED, sequelize);
      expect(dispatchMock, 'a demoted caller redeemed a destructive operation').not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe('a client relationship that has ended', () => {
    it('refuses when access to the operation\'s client is gone', async () => {
      assertAccessMock.mockResolvedValue(false);
      const result = await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('refuses when the access lookup THROWS, not only when it says no', async () => {
      // Caught by mutation: flipping the catch to `permitted = true` left every other
      // assertion here green, because nothing exercised a rejecting authorizer. A gate
      // that fails open under load works in every test and stops working exactly when the
      // database is unhappy — which is when a queued destructive operation matters most.
      assertAccessMock.mockRejectedValue(new Error('connection pool exhausted'));
      const result = await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('asks about the OPERATION\'s client, not the caller', async () => {
      // The distinction matters: asking about the caller's own id would pass for any
      // trainer and quietly authorize nothing.
      await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(assertAccessMock).toHaveBeenCalledWith(OUR_TRAINER, 'trainer', OWN_CLIENT);
    });

    it('checks the destructive lane\'s client too', async () => {
      assertAccessMock.mockResolvedValue(false);
      const result = await executeConfirmedOperation(mintDestructive(), TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe('a command the registry cannot vouch for', () => {
    it('is refused, because there is no roleRequired to check it against', async () => {
      // Fail-closed by construction: if the registry has no entry, the lane cannot know
      // who may run the operation, and "cannot tell" must not mean "allow". The same
      // branch is why an uninitialized registry denies everything rather than everything
      // sailing through — the right direction for a boot-order accident to fail in.
      const { operationId } = preparePendingConfirmation({
        commandType: 'a_command_no_registry_knows',
        params: {},
        clientId: null,
        userId: OUR_TRAINER,
        description: 'unknown command',
      });
      const result = await executeConfirmedOperation(operationId, TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe('every way out of this function', () => {
    it("reaches a dispatcher only after a re-authorization, in that order", () => {
      // Behavioural tests cover the two lanes that exist today. This is about the third
      // one somebody adds later: a new `await dispatch(` inside this function, written by
      // someone who did not know the gate was their job, would pass every test above by
      // simply not being exercised by any of them.
      const body = sliceBetween(
        stripComments(fs.readFileSync(EXECUTOR_FILE, 'utf8')),
        'export async function executeConfirmedOperation(',
        '\nexport ',
        { label: 'executeConfirmedOperation' },
      );
      const order = [...body.matchAll(/confirmLaneDenialReason\(|await dispatch\(/g)]
        .map((m) => (m[0].startsWith('confirm') ? 'gate' : 'dispatch'));

      expect(order.length, 'no gates and no dispatches found — the scan broke').toBeGreaterThan(0);
      expect(
        order.filter((step) => step === 'dispatch').length,
        'a dispatch call in the confirm lane is unaccounted for',
      ).toBe(2);
      // Every dispatch must be preceded by at least one gate it has not already consumed.
      let available = 0;
      for (const step of order) {
        if (step === 'gate') available += 1;
        else {
          expect(available, 'a dispatch runs before any re-authorization gate').toBeGreaterThan(0);
          available -= 1;
        }
      }
    });
  });

  describe('the forensics trail', () => {
    it('records the denial with a reason, using the vocabulary the model documents', async () => {
      // A revoked caller trying to redeem is exactly the event an admin would go looking
      // for. `outcome` stays inside the documented set so a query filtering on known
      // outcomes finds it; the specific reason rides in `errorCode`, which is what that
      // column is for. An outcome value nobody else uses is a row nobody else queries.
      await executeConfirmedOperation(mintPending(), DEMOTED, sequelize);
      // The audit is fire-and-forget and reaches the model through a dynamic import, so
      // it settles a microtask after the call returns. Waiting for it is the assertion —
      // checking synchronously would fail whether or not the row is ever written.
      await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
      const denial = auditMock.mock.calls
        .map(([row]) => row)
        .find((row) => row?.outcome === 'denied');
      expect(denial, 'no denial row was written').toBeTruthy();
      expect(denial.errorCode).toBe('role_revoked');
      expect(denial.commandType).toBe(CONFIRMED_COMMAND);
    });
  });

  describe('what re-authorization must not break', () => {
    it('still refuses another user\'s operation', async () => {
      const someoneElse = mintPending(4242);
      const result = await executeConfirmedOperation(someoneElse, TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('still honours the write kill switch before anything else', async () => {
      // Asserted for ordering, not just outcome: a re-authorization query that ran before
      // the kill switch would put load on the database during the incident the switch
      // exists to contain.
      // The switch is opt-OUT: absent means enabled, so the pause is an explicit 'false'.
      process.env.AI_COMMAND_WRITES_ENABLED = 'false';
      const result = await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(result.success).toBe(false);
      expect(assertAccessMock).not.toHaveBeenCalled();
      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });
});
```

---

# VERIFICATION CLAIMED (challenge any of it)

- 39/39 across the four ownership contracts; anchor guard 7/7
- Full backend suite: 9719 passed, failing-file set byte-identical to a recorded
  `known-failing-baseline.json` (23 files), compared as SETS
- 29/29 mutations fire; every mutated file restored byte-identical by sha256
- `node --check` clean; registry import smoke 139 commands; secret scan CLEAN
- Zero frontend files changed

# STATED AS NOT PROVEN (tell me if this list is missing something)

- Dispatcher self-gating — handlers are mocked throughout
- A role that changes DURING dispatch (between redemption and the write)
- Real SQL — the fake mirrors predicates; it does not prove PostgreSQL agrees
- Nothing deployed; no CI (the account's GitHub Actions are billing-blocked)

# OUTPUT FORMAT

```
## VERDICT: APPROVE | REVISE | REJECT

## FINDINGS
### [SEVERITY] short title
- **Where:** file:line or the claim quoted
- **Failure scenario:** concrete inputs -> wrong outcome
- **Fix:** smallest change that closes it
- **Confidence:** how sure, and what you could not check

## WHAT I ATTACKED AND COULD NOT BREAK
(three things, with why they held)

## WHAT I TOOK ON FAITH
```