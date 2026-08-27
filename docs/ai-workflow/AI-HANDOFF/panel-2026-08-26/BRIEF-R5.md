# HOSTILE REVIEW — the two fixes YOU just caused

You reviewed this workstream and found two real defects. I fixed both. **Now attack the
fixes.** A fix for a real defect is the most likely place for the next one, and this
particular pair touches a helper that four other callers depend on.

One of you was right about a third thing with a wrong example; that is now the planned next
slice and is NOT part of this review. Do not re-argue it.

## What changed, and why

### Fix 1 — the resolver fail-OPENED on an uncomputable scope

`resolveClient` decided scope with:

```javascript
const hasTrainerScope = Number.isInteger(scopedTrainerId) && scopedTrainerId > 0;
```

A false there omitted the scope clause entirely — the admin-wide query. So `false` meant
BOTH "no scope was requested" (correct for admin) and "a scope was requested and could not
be computed" (must deny), and the code took the permissive reading.

Fixed in TWO places deliberately:
- the resolver now separates `scopeRequested` from `hasTrainerScope` and denies the second case
- `stepResolveClient` independently refuses a trainer whose own id will not parse

Neither guard alone can fail a test, since either catches the case. That redundancy is
intentional, so the mutation proving it is COMPOUND (both removed at once).

### Fix 2 — a denial with no server-side record

`dispatchDeleteWorkoutPlan` answered a cross-tenant attempt with the same 404-shaped result
it gives for a nonexistent plan — correct, and deliberate — but recorded nothing. An id-walker
left a trail identical to a typo. Now audited as `handler_denied_plan_access`, response shape
unchanged.

## ATTACK THESE SPECIFICALLY

1. **`scopeRequested` uses `!== undefined && !== null`.** What value passes that check,
   fails `hasTrainerScope`, and should NOT have been a denial? Is there a legitimate caller
   I just broke? There are four callers of `resolveClient` in the tree — I checked two are
   real and only one passes a scope. Verify that.
2. **The lane guard is `role === 'trainer' && !toPositiveInteger(ctx.user.id)`.** What about
   the other roles — does admin now fall through to something unguarded? Does the ORDER of
   this new check against the existing non-privileged branch matter?
3. **The audit call is fire-and-forget inside a denial path.** Can it throw? Can it slow the
   denial enough to become a timing oracle that distinguishes "denied" from "not found",
   defeating the very 404-parity it was added to protect?
4. **`recordCommandAudit` is now imported by a dispatcher.** Does that create an import cycle
   (`commandAudit` <- dispatcher <- commandDispatcher <- commandExecutor -> commandAudit)?
   A cycle here would surface as an undefined function at runtime, not at build.
5. **The denial records `targetClientId: plan.userId`** — the client of a plan the caller was
   just told does not exist. Is writing that id to an audit row a disclosure problem in the
   other direction?
6. **Anything else in the diff.**

## Also attack the TESTS, as hard as the code

An assertion that cannot fail is worse than none — it converts an unchecked area into one
that looks checked. This workstream has shipped several. If a test here would still pass with
the guard deleted, that is a CRITICAL finding even though the code is right.

```diff
diff --git a/backend/services/ai/clientResolver.mjs b/backend/services/ai/clientResolver.mjs
index 4f3b23357..b5ca5bddf 100644
--- a/backend/services/ai/clientResolver.mjs
+++ b/backend/services/ai/clientResolver.mjs
@@ -112,6 +112,20 @@ export async function resolveClient(clientRef, sequelize, options = {}) {
   const scopedTrainerId = Number.parseInt(trainerId, 10);
   const hasTrainerScope = Number.isInteger(scopedTrainerId) && scopedTrainerId > 0;
 
+  // "Unscoped by design" and "unscoped because the id was garbage" used to be the same
+  // value, and the same value meant NO SCOPE CLAUSE — so a caller that asked to be scoped
+  // and supplied an unusable id got the admin-wide query instead. That is fail-OPEN, and it
+  // is the asymmetry a review named: `assertAssignmentOrAdmin` returns false when it cannot
+  // parse a requester id, while this returned everybody. Asking for a scope that cannot be
+  // computed is now a refusal, and only omitting the option entirely means unscoped.
+  const scopeRequested = trainerId !== undefined && trainerId !== null;
+  if (scopeRequested && !hasTrainerScope) {
+    logger.warn('[ClientResolver] Scope requested with an unusable trainer id — denying', {
+      trainerIdType: typeof trainerId,
+    });
+    return { resolved: null, suggestions: [], error: 'No accessible active client found with that ID.' };
+  }
+
   if (!clientRef || typeof clientRef !== 'string') {
     return { resolved: null, suggestions: [], error: 'No client reference provided' };
   }
diff --git a/backend/services/ai/commandExecutor.mjs b/backend/services/ai/commandExecutor.mjs
index 207a61d45..62bf4e137 100644
--- a/backend/services/ai/commandExecutor.mjs
+++ b/backend/services/ai/commandExecutor.mjs
@@ -455,6 +455,16 @@ async function stepResolveClient(ctx) {
     clientRef = null;
   }
 
+  // A trainer whose own id will not parse cannot be scoped to their own clients, and a
+  // caller who cannot be scoped must not be served unscoped. The non-privileged branch above
+  // already refuses on an unusable `selfId`; this is the same rule for the role that has the
+  // most to reach. The resolver now fail-closes on this too — both, because the lane should
+  // not depend on a shared helper's internals for its own safety.
+  if (ctx.user.role === 'trainer' && !toPositiveInteger(ctx.user.id)) {
+    ctx.error = 'No accessible active client found with that ID.';
+    return ctx;
+  }
+
   if (clientId) {
     // Direct ID provided — use it
     ctx.resolvedClient = { id: clientId };
diff --git a/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs b/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs
index 0fba6b7a9..d8a43f4af 100644
--- a/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs
+++ b/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs
@@ -26,6 +26,7 @@ import sequelize from '../../../database.mjs';
 import { getAllModels } from '../../../models/index.mjs';
 import { transitionWorkoutPlanLifecycle } from '../../workoutPlanLifecycleService.mjs';
 import { assertAssignmentOrAdmin } from '../../../middleware/verifyClientAccess.mjs';
+import { recordCommandAudit } from '../commandAudit.mjs';
 
 /**
  * Denial and absence are the same answer on purpose.
@@ -64,7 +65,25 @@ export async function dispatchDeleteWorkoutPlan(params = {}, ctx = {}) {
   const plan = await WorkoutPlan.findByPk(planId);
   if (!plan) return planNotAvailable(planId);
   const permitted = await assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, plan.userId);
-  if (!permitted) return planNotAvailable(planId);
+  if (!permitted) {
+    // The RESPONSE stays indistinguishable from "no such plan" — that is the whole point of
+    // the 404-parity design. The SERVER-SIDE record must not be. Without this line, a caller
+    // walking plan ids leaves a trail identical to someone mistyping one, and the
+    // enumeration attack the parity design anticipates is invisible in the only place
+    // detection could live. Best-effort and never thrown: an audit write must not be able to
+    // turn a denial into a 500.
+    recordCommandAudit({
+      userId: ctx.user?.id,
+      userRole: ctx.user?.role,
+      commandType: 'delete_workout_plan',
+      targetClientId: plan.userId ?? null,
+      destructive: true,
+      confirmationState: 'confirmed',
+      outcome: 'denied',
+      errorCode: 'handler_denied_plan_access',
+    });
+    return planNotAvailable(planId);
+  }
 
   try {
     const result = await transitionWorkoutPlanLifecycle({
diff --git a/backend/tests/api/aiCommandDispatcherOwnership.contract.test.mjs b/backend/tests/api/aiCommandDispatcherOwnership.contract.test.mjs
index 890cb0316..2c5781689 100644
--- a/backend/tests/api/aiCommandDispatcherOwnership.contract.test.mjs
+++ b/backend/tests/api/aiCommandDispatcherOwnership.contract.test.mjs
@@ -239,6 +239,29 @@ describe('Swan Coach dispatcher ownership', () => {
       expect(run.ctx.error).toBeTruthy();
     });
 
+    it('is refused when the trainer\'s OWN id will not parse — unscoped by garbage is not unscoped by design', async () => {
+      // Panel finding (GLM, 2026-08-26). The resolver decided scope with
+      // `hasTrainerScope = Number.isInteger(parseInt(trainerId)) && > 0`, and a false there
+      // meant NO SCOPE CLAUSE — the admin-wide query. So a trainer whose own id was missing
+      // or unparseable was served UNSCOPED rather than refused: the trainer edition of the
+      // very hole this file was opened to close.
+      //
+      // The asymmetry is what makes it a defect rather than a preference:
+      // `assertAssignmentOrAdmin` returns false when it cannot parse a requester id. Two
+      // helpers, one input class, opposite answers.
+      const command = allCommands().find((c) => c.type === TRAINER_READ);
+      for (const brokenId of [0, -1, 'not-a-number', null]) {
+        const run = await runAgainstClient(command, 'trainer', brokenId, OWN_CLIENT);
+        expect(
+          run.dispatchCalls,
+          `a trainer with id ${JSON.stringify(brokenId)} resolved a client anyway`,
+        ).toBe(0);
+        // And specifically: no unscoped query was issued on their behalf.
+        const unscoped = run.directory.calls.filter((call) => !call.scopedByAssignment);
+        expect(unscoped, `an UNSCOPED query ran for a trainer with id ${JSON.stringify(brokenId)}`).toEqual([]);
+      }
+    });
+
     it('is denied by NAME as well as by id — the other resolver branch', async () => {
       const command = allCommands().find((c) => c.type === TRAINER_READ);
       const own = await runAgainstClient(command, 'trainer', OUR_TRAINER, null, { byName: 'Ada' });
diff --git a/backend/tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs b/backend/tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs
index acd6ecf57..c512ae405 100644
--- a/backend/tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs
+++ b/backend/tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs
@@ -60,8 +60,10 @@ import { getAllModels, getModel } from '../../models/index.mjs';
 import { transitionWorkoutPlanLifecycle } from '../../services/workoutPlanLifecycleService.mjs';
 import { dispatchDeleteWorkoutPlan } from '../../services/ai/dispatchers/workoutPlanCommandDispatchers.mjs';
 import { OUR_TRAINER, PEER_TRAINER, OWN_CLIENT, FOREIGN_CLIENT } from '../helpers/ownershipFixture.mjs';
+import { recordCommandAudit } from '../../services/ai/commandAudit.mjs';
 
 vi.mock('../../database.mjs', () => ({ default: {} }));
+vi.mock('../../services/ai/commandAudit.mjs', () => ({ recordCommandAudit: vi.fn() }));
 vi.mock('../../services/workoutPlanLifecycleService.mjs', () => ({
   transitionWorkoutPlanLifecycle: vi.fn(),
 }));
@@ -71,6 +73,7 @@ vi.mock('../../models/index.mjs', () => ({
 }));
 
 const transitionMock = vi.mocked(transitionWorkoutPlanLifecycle);
+const auditMock = vi.mocked(recordCommandAudit);
 const getAllModelsMock = vi.mocked(getAllModels);
 const getModelMock = vi.mocked(getModel);
 
@@ -86,6 +89,7 @@ const PLANS = {
 const ASSIGNMENTS = [{ trainerId: OUR_TRAINER, clientId: OWN_CLIENT, status: 'active' }];
 
 beforeEach(() => {
+  auditMock.mockReset();
   transitionMock.mockReset();
   transitionMock.mockImplementation(async ({ planId }) => ({
     plan: { ...PLANS[planId], status: 'archived' },
@@ -145,6 +149,21 @@ describe('Swan Coach plan-archive ownership', () => {
     expect(withoutEcho(raced)).toEqual(withoutEcho(missing));
   });
 
+  it('leaves a server-side record of the denial, though the response leaves none', async () => {
+    // Panel finding (GLM, 2026-08-26). The 404-parity response is deliberate and correct —
+    // an id-walker must not learn which plans exist. But nothing was recorded either, so a
+    // caller probing plan ids left a trail identical to someone mistyping one, and the
+    // enumeration attack the parity design anticipates was invisible in the only place
+    // detection could live. Indistinguishable to the CALLER; not to the operator.
+    await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
+    await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
+    const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.outcome === 'denied');
+    expect(row, 'a cross-tenant denial was not recorded anywhere').toBeTruthy();
+    expect(row.errorCode).toBe('handler_denied_plan_access');
+    expect(row.userId).toBe(OUR_TRAINER);
+    expect(row.targetClientId).toBe(FOREIGN_CLIENT);
+  });
+
   it('scopes on the plan\'s CLIENT, not its author — deliberately, for parity', async () => {
     // A plan this trainer authored, for a client who is no longer theirs. The REST
     // middleware answers on `plan.userId` alone, so this lane does too: parity with the
diff --git a/backend/tests/mutations/ownership.mutations.mjs b/backend/tests/mutations/ownership.mutations.mjs
index 291957c7b..01d1ac3f1 100644
--- a/backend/tests/mutations/ownership.mutations.mjs
+++ b/backend/tests/mutations/ownership.mutations.mjs
@@ -33,6 +33,27 @@ export default {
     'tests/api/aiCommandConfirmLaneReauthorization.contract.test.mjs',
   ],
   mutations: [
+    {
+      "id": "M42 BOTH fail-open guards removed: trainer scope reverts to unscoped-by-garbage",
+      "parts": [
+        {
+          "file": "services/ai/clientResolver.mjs",
+          "find": "  if (scopeRequested && !hasTrainerScope) {",
+          "replace": "  if (false) {"
+        },
+        {
+          "file": "services/ai/commandExecutor.mjs",
+          "find": "  if (ctx.user.role === 'trainer' && !toPositiveInteger(ctx.user.id)) {",
+          "replace": "  if (false) {"
+        }
+      ]
+    },
+    {
+      "id": "M43 plan archive: deny silently, leaving no server-side record of the probe",
+      "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
+      "find": "    recordCommandAudit({",
+      "replace": "    if (false) recordCommandAudit({"
+    },
     {
       "id": "M40 confirm lane: stop checking role at redemption entirely",
       "file": "services/ai/commandExecutor.mjs",
@@ -204,8 +225,8 @@ export default {
     {
       "id": "M16 plan archive: skip the access check entirely",
       "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
-      "find": "  if (!permitted) return planNotAvailable(planId);",
-      "replace": "  if (false) return planNotAvailable(planId);"
+      "find": "  if (!permitted) {",
+      "replace": "  if (false) {"
     },
     {
       "id": "M17 plan archive: check access against the wrong id (the plan is not the client)",
@@ -216,8 +237,8 @@ export default {
     {
       "id": "M18 plan archive: distinguish denial from absence",
       "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
-      "find": "  if (!permitted) return planNotAvailable(planId);",
-      "replace": "  if (!permitted) return { ...planNotAvailable(planId), denied: true };"
+      "find": "    recordCommandAudit({",
+      "replace": "    return { ...planNotAvailable(planId), denied: true }; recordCommandAudit({"
     },
     {
       "id": "M19 assertAssignmentOrAdmin: fail OPEN when the lookup throws",
@@ -234,8 +255,8 @@ export default {
     {
       "id": "M21 plan archive: let the service-not-found answer drift from the other two",
       "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
-      "find": "    return planNotAvailable(planId);",
-      "replace": "    return { ...planNotAvailable(planId), viaService: true };"
+      "find": "    if (error?.code !== 'WORKOUT_PLAN_NOT_FOUND') throw error;",
+      "replace": "    if (error?.code !== 'WORKOUT_PLAN_NOT_FOUND') throw error; return { ...planNotAvailable(planId), viaService: true };"
     },
     {
       "id": "M22 confirm lane: ignore the re-authorization verdict (non-destructive)",
```

## The full current state of the two functions

### `resolveClient` — scope decision and the direct-id branch

```javascript
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

  // "Unscoped by design" and "unscoped because the id was garbage" used to be the same
  // value, and the same value meant NO SCOPE CLAUSE — so a caller that asked to be scoped
  // and supplied an unusable id got the admin-wide query instead. That is fail-OPEN, and it
  // is the asymmetry a review named: `assertAssignmentOrAdmin` returns false when it cannot
  // parse a requester id, while this returned everybody. Asking for a scope that cannot be
  // computed is now a refusal, and only omitting the option entirely means unscoped.
  const scopeRequested = trainerId !== undefined && trainerId !== null;
  if (scopeRequested && !hasTrainerScope) {
    logger.warn('[ClientResolver] Scope requested with an unusable trainer id — denying', {
      trainerIdType: typeof trainerId,
    });
    return { resolved: null, suggestions: [], error: 'No accessible active client found with that ID.' };
  }

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
```

### `stepResolveClient` — the whole step, so ordering is visible

```javascript
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

  // A trainer whose own id will not parse cannot be scoped to their own clients, and a
  // caller who cannot be scoped must not be served unscoped. The non-privileged branch above
  // already refuses on an unusable `selfId`; this is the same rule for the role that has the
  // most to reach. The resolver now fail-closes on this too — both, because the lane should
  // not depend on a shared helper's internals for its own safety.
  if (ctx.user.role === 'trainer' && !toPositiveInteger(ctx.user.id)) {
    ctx.error = 'No accessible active client found with that ID.';
    return ctx;
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
```

### `dispatchDeleteWorkoutPlan` — the whole file

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
import { recordCommandAudit } from '../commandAudit.mjs';

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
  if (!permitted) {
    // The RESPONSE stays indistinguishable from "no such plan" — that is the whole point of
    // the 404-parity design. The SERVER-SIDE record must not be. Without this line, a caller
    // walking plan ids leaves a trail identical to someone mistyping one, and the
    // enumeration attack the parity design anticipates is invisible in the only place
    // detection could live. Best-effort and never thrown: an audit write must not be able to
    // turn a denial into a 500.
    recordCommandAudit({
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
      commandType: 'delete_workout_plan',
      targetClientId: plan.userId ?? null,
      destructive: true,
      confirmationState: 'confirmed',
      outcome: 'denied',
      errorCode: 'handler_denied_plan_access',
    });
    return planNotAvailable(planId);
  }

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

## Current verification

- 16/16 client-ownership, 10/10 plan-archive, 21/21 confirm-lane, 8/8 trainer-scope
- Full backend 9742 passed; 25 failing tests across 23 files, matching the per-test baseline
- **42/42 mutations fire** — including the compound one for fix 1 and a single for fix 2
- Nothing deployed; 17 unpushed commits; no CI has ever run any of this

## Known and accepted — do not re-report

- Tenancy derived from caller-supplied linkage rather than from the record. This is the
  PLANNED NEXT SLICE (a required registry field declaring each id-taking command's ownership
  derivation, plus an enumeration contract). Out of scope here.
- TOCTOU on plan archive — the check is outside the lifecycle service's row lock, shared with
  the REST route rather than introduced here.
- ~56 test stubs return `{id: 1}` for an assignment row, which is why the consumer guard
  treats absent fields as non-mismatches.
- `client_access_check_failed` unreachable in production; the authorizer swallows its failures.
- Admin name resolution breaks past 50 clients (`LIMIT 50` on the fuzzy path).
- In-flight confirmations die at deploy now that `clientId` is in the HMAC payload.

## OUTPUT FORMAT

```
VERDICT: DRY | NOT DRY

If NOT DRY — findings in severity order:
### [SEVERITY] title
- Where / Failure scenario (concrete inputs -> wrong outcome) / Smallest fix / Confidence

If DRY — the three things you attacked hardest, and why each held.

VACUOUS TESTS: any assertion that cannot fail, with file:line and why.
ONE LINE: what would you tell the author to do next?
```