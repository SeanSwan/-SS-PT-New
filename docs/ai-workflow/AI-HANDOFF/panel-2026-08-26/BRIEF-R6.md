# HOSTILE REVIEW — ROUND 6. Is this dry?

Round 5: one of you returned DRY, the other found six, four of which were real and are now
fixed. **Attack the round-5 fixes.** If you find nothing, say DRY and name the three things
you attacked hardest — that is a complete answer and I need it to be a truthful one, because
the dryness determination IS the deliverable here. A manufactured finding does not just cost
a real one its attention; it makes the question unanswerable.

## What round 5 changed, and why

**1. A synchronous audit throw escaped the guard.** The fire-and-forget audit was wrapped in
`.catch()` so a rejected promise could not kill the process on a denial path. That is half a
guard: a throw during argument evaluation happens before `Promise.resolve` is reached. Now a
try/catch. Caught by my own test, which included the synchronous case because one of you
named it.

**2. Two parsers guarded one input and disagreed.** The lane used a strict parse; the resolver
used `Number.parseInt`, which is lenient — `'12px'` became trainer 12 there and was refused
here. Safety held only because the lane guard runs FIRST, which is a property of call order,
not of either function. Both now share one coercion in a new leaf module
`services/ai/positiveInteger.mjs` — a leaf because `commandExecutor` imports `clientResolver`,
so exporting from the executor would make the resolver import its own importer.

**3. The denial audit named a bystander.** It recorded `targetClientId: plan.userId` —
attesting "user X probed a plan belonging to client Y" on the strength of a guess that
collided. Now records `planId` (the caller's own input) instead.

**4. The absence probe is audited too**, under a different errorCode — most of an id walk hits
ids that do not exist, so the signal is the volume of misses.

**5.** Renamed a variable that was shadowing the success path's own `plan` with a different
meaning. **6.** M42 decomposed: the resolver guard now has its own direct unit suite and its
own mutation; the lane guard stays deliberately redundant and is adjudicated as an equivalent
mutant WITH AN EXPIRY (if the resolver guard is relaxed, the adjudication dies).

## ATTACK THESE SPECIFICALLY

1. **The new leaf module.** Is `toPositiveInteger` correct for every input the resolver and
   the lane actually receive? It refuses leading zeros, exponent notation, floats and
   whitespace beyond trimming. Did tightening the RESOLVER from lenient to strict break a
   legitimate caller? There are exactly two importers of `clientResolver` — verify that.
2. **`hasTrainerScope` is now `scopedTrainerId !== null`.** Does any downstream use of
   `scopedTrainerId` assume the old parseInt semantics?
3. **The try/catch around the audit.** Does it swallow anything it should not? Is there a
   third failure shape neither a rejection nor a synchronous throw?
4. **Dropping `targetClientId`.** Does anything read that field for these rows? Does the
   metrics aggregation break? Is `params: { planId }` actually retained through redaction, or
   have I recorded nothing at all?
5. **The equivalent-mutant adjudication.** Is the reasoning sound, or am I excusing a weak
   assertion with an official-looking document?
6. **Anything else in the diff, and any assertion that cannot fail.**

```diff
diff --git a/backend/services/ai/clientResolver.mjs b/backend/services/ai/clientResolver.mjs
index b5ca5bddf..5a48e5a70 100644
--- a/backend/services/ai/clientResolver.mjs
+++ b/backend/services/ai/clientResolver.mjs
@@ -15,6 +15,7 @@
  */
 import { QueryTypes } from 'sequelize';
 import logger from '../../utils/logger.mjs';
+import { toPositiveInteger } from './positiveInteger.mjs';
 
 // ── Levenshtein Distance ────────────────────────────────────────────────────
 
@@ -109,8 +110,13 @@ function scoreMatch(client, ref) {
  */
 export async function resolveClient(clientRef, sequelize, options = {}) {
   const { trainerId, maxSuggestions = 3 } = options;
-  const scopedTrainerId = Number.parseInt(trainerId, 10);
-  const hasTrainerScope = Number.isInteger(scopedTrainerId) && scopedTrainerId > 0;
+  // The SAME coercion the command lane uses. These were two different rules: `parseInt` is
+  // lenient by design — it reads as far as it can and ignores the rest — so `'12px'` became
+  // trainer 12 here while the lane refused it, and `'1e3'` became trainer 1. Nothing
+  // exploitable came of the divergence, and only because the lane's guard happens to run
+  // first: the safety was a property of the call ORDER, not of either function.
+  const scopedTrainerId = toPositiveInteger(trainerId);
+  const hasTrainerScope = scopedTrainerId !== null;
 
   // "Unscoped by design" and "unscoped because the id was garbage" used to be the same
   // value, and the same value meant NO SCOPE CLAUSE — so a caller that asked to be scoped
diff --git a/backend/services/ai/commandExecutor.mjs b/backend/services/ai/commandExecutor.mjs
index 62bf4e137..4738171f9 100644
--- a/backend/services/ai/commandExecutor.mjs
+++ b/backend/services/ai/commandExecutor.mjs
@@ -22,6 +22,7 @@ import { getCommand } from './commandRegistry/index.mjs';
 import { createCommandErrorOutcome } from './commandOutcomeContract.mjs';
 import { authorizeCommandCapability } from './commandCapabilityPolicy.mjs';
 import { resolveClient } from './clientResolver.mjs';
+import { toPositiveInteger } from './positiveInteger.mjs';
 import { assertAssignmentOrAdmin } from '../../middleware/verifyClientAccess.mjs';
 import { rehydrateResponse } from './deIdentifier.mjs';
 import {
@@ -122,20 +123,6 @@ function createContext(rawInput, user, options = {}) {
 
 const CLIENT_ID_VALIDATION_SENTINEL = 1;
 
-const toPositiveInteger = (value) => {
-  if (typeof value === 'number') {
-    return Number.isSafeInteger(value) && value > 0 ? value : null;
-  }
-
-  if (typeof value !== 'string') return null;
-
-  const trimmed = value.trim();
-  if (!/^[1-9]\d*$/.test(trimmed)) return null;
-
-  const parsed = Number(trimmed);
-  return Number.isSafeInteger(parsed) ? parsed : null;
-};
-
 const debateTypeForCommandType = (commandType) => (
   typeof commandType === 'string' ? DEBATE_TYPE_BY_COMMAND[commandType] || null : null
 );
diff --git a/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs b/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs
index d8a43f4af..a08879adc 100644
--- a/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs
+++ b/backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs
@@ -28,6 +28,34 @@ import { transitionWorkoutPlanLifecycle } from '../../workoutPlanLifecycleServic
 import { assertAssignmentOrAdmin } from '../../../middleware/verifyClientAccess.mjs';
 import { recordCommandAudit } from '../commandAudit.mjs';
 
+/**
+ * Audit without being able to hurt the caller.
+ *
+ * `recordCommandAudit` already catches everything internally and resolves `false` on failure
+ * — that is verified in `tests/unit/commandAuditNeverRejects.test.mjs`, not assumed. But both
+ * calls below are fire-and-forget on a DENIAL path, and an unawaited promise that ever did
+ * reject would be an unhandled rejection, which Node treats as fatal by default. Best-effort
+ * auditing would become "the audit table hiccuped, so the process died".
+ *
+ * So the invariant is enforced HERE rather than borrowed from there. Same reasoning as the
+ * scope guard this file's sibling carries in two places: a caller should not depend on
+ * another module's internals for its own crash-safety, because that module's contract is
+ * free to change and nothing would fail loudly when it did.
+ *
+ * BOTH forms are contained, and the second is why this is a try/catch and not a bare
+ * `.catch()`. A rejected promise and a SYNCHRONOUS throw are different failures: the throw
+ * happens while the argument is being evaluated, before `Promise.resolve` is ever reached, so
+ * `.catch()` alone would let it escape. The first draft here was a bare `.catch()`; the test
+ * that names the synchronous case is what caught it.
+ */
+const auditQuietly = (entry) => {
+  try {
+    Promise.resolve(recordCommandAudit(entry)).catch(() => {});
+  } catch {
+    // Deliberately silent: the caller is already on a denial path and has an answer to give.
+  }
+};
+
 /**
  * Denial and absence are the same answer on purpose.
  *
@@ -62,9 +90,32 @@ export async function dispatchDeleteWorkoutPlan(params = {}, ctx = {}) {
   // and records it for audit, which is why its own comment says it applies one ALREADY
   // authorized action. Authorizing it is this caller's job, exactly as it is the REST
   // route's, and through the same helper that route's middleware uses.
-  const plan = await WorkoutPlan.findByPk(planId);
-  if (!plan) return planNotAvailable(planId);
-  const permitted = await assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, plan.userId);
+  //
+  // Named for its ROLE, not its type. The success path below binds its own "plan" from the
+  // lifecycle result — a different row at a different moment — and an earlier draft of this
+  // fix called both of them "plan", so a reader inside the try block saw a name that had
+  // silently changed meaning. In a function whose whole job is deciding who may act on which
+  // record, two rows sharing one name is not a style question.
+  const planForAuth = await WorkoutPlan.findByPk(planId);
+  if (!planForAuth) {
+    // The ABSENCE probe is audited too, and that is the half a review caught me missing.
+    // Recording only "exists, but not yours" sees the smallest slice of an enumeration
+    // attack: someone walking ids mostly hits ids that do not exist, so the signal is the
+    // VOLUME of misses, and that was the part going unrecorded. Distinguishable code so an
+    // operator can separate a probe sweep from a stale UI; identical response either way.
+    auditQuietly({
+      userId: ctx.user?.id,
+      userRole: ctx.user?.role,
+      commandType: 'delete_workout_plan',
+      params: { planId },
+      destructive: true,
+      confirmationState: 'confirmed',
+      outcome: 'not_wired',
+      errorCode: 'handler_plan_absent',
+    });
+    return planNotAvailable(planId);
+  }
+  const permitted = await assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, planForAuth.userId);
   if (!permitted) {
     // The RESPONSE stays indistinguishable from "no such plan" — that is the whole point of
     // the 404-parity design. The SERVER-SIDE record must not be. Without this line, a caller
@@ -72,11 +123,18 @@ export async function dispatchDeleteWorkoutPlan(params = {}, ctx = {}) {
     // enumeration attack the parity design anticipates is invisible in the only place
     // detection could live. Best-effort and never thrown: an audit write must not be able to
     // turn a denial into a 500.
-    recordCommandAudit({
+    // The probe TARGET is recorded; the probe's VICTIM is not. An earlier draft wrote
+    // `targetClientId: planForAuth.userId`, which attests "user X probed a plan belonging to
+    // client Y" — freezing Y's linkage into a retained security log on the strength of a
+    // guess that happened to collide. This file's own doctrine is bounded identifiers, and
+    // `planId` is the caller's OWN input: it reconstructs the campaign just as well, and the
+    // owner can be joined from the plans table at investigation time by someone who has a
+    // reason to look. Detection does not require naming the person who was nearly exposed.
+    auditQuietly({
       userId: ctx.user?.id,
       userRole: ctx.user?.role,
       commandType: 'delete_workout_plan',
-      targetClientId: plan.userId ?? null,
+      params: { planId },
       destructive: true,
       confirmationState: 'confirmed',
       outcome: 'denied',
diff --git a/backend/services/ai/positiveInteger.mjs b/backend/services/ai/positiveInteger.mjs
new file mode 100644
index 000000000..f82902121
--- /dev/null
+++ b/backend/services/ai/positiveInteger.mjs
@@ -0,0 +1,54 @@
+/**
+ * positiveInteger.mjs — one coercion, for the places where disagreeing about a number
+ * means disagreeing about who someone is.
+ *
+ * WHY THIS IS ITS OWN FILE
+ * ------------------------
+ * Two modules were parsing the same security-relevant input with different rules.
+ * `commandExecutor` used a strict parse (digits only, safe-integer, positive);
+ * `clientResolver` used `Number.parseInt`, which is lenient by design — it reads as far as
+ * it can and ignores the rest. On the values that matter they disagree:
+ *
+ *     '12px'   strict -> null (deny)      parseInt -> 12    (scope to trainer 12)
+ *     12.5     strict -> null (deny)      parseInt -> 12    (scope to trainer 12)
+ *     '1e3'    strict -> null (deny)      parseInt -> 1     (scope to trainer 1)
+ *
+ * Nothing exploitable came of it, and only because the executor's guard happens to run
+ * first — the safety was a property of the call ORDER, not of either function. Any new
+ * entry point that reached the resolver directly would pick the lenient rule, and the
+ * divergence would decide which trainer's clients a caller could see.
+ *
+ * It lives in a leaf module rather than being exported from either side because
+ * `commandExecutor` imports `clientResolver`: sharing it from the executor would make the
+ * resolver import its own importer, and a cycle in this path surfaces as an undefined
+ * function at runtime, on an authorization check.
+ *
+ * Raised by GLM 5.3 Flash, 2026-08-26, rated low-exploitability and correct anyway: a rule
+ * that holds because of the order two functions happen to run in is not a rule.
+ */
+
+/**
+ * Strictly coerce a value to a positive safe integer.
+ *
+ * Deliberately refuses anything that is not already a whole positive number or the exact
+ * decimal spelling of one. No trailing units, no exponent notation, no fractional part, no
+ * leading zeros, no whitespace tolerance beyond trimming.
+ *
+ * @param {unknown} value
+ * @returns {number|null} the integer, or null when the input is not unambiguously one
+ */
+export function toPositiveInteger(value) {
+  if (typeof value === 'number') {
+    return Number.isSafeInteger(value) && value > 0 ? value : null;
+  }
+
+  if (typeof value !== 'string') return null;
+
+  const trimmed = value.trim();
+  if (!/^[1-9]\d*$/.test(trimmed)) return null;
+
+  const parsed = Number(trimmed);
+  return Number.isSafeInteger(parsed) ? parsed : null;
+}
+
+export default toPositiveInteger;
diff --git a/backend/tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs b/backend/tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs
index c512ae405..60df2cd1c 100644
--- a/backend/tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs
+++ b/backend/tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs
@@ -161,7 +161,49 @@ describe('Swan Coach plan-archive ownership', () => {
     expect(row, 'a cross-tenant denial was not recorded anywhere').toBeTruthy();
     expect(row.errorCode).toBe('handler_denied_plan_access');
     expect(row.userId).toBe(OUR_TRAINER);
-    expect(row.targetClientId).toBe(FOREIGN_CLIENT);
+    // The probe TARGET is recorded — it is the caller's own input and reconstructs the
+    // campaign. The probe's VICTIM is deliberately NOT: an earlier version wrote
+    // `targetClientId: plan.userId`, which froze a third party's linkage into a retained
+    // security log on the strength of a guess that happened to collide. Detection does not
+    // require naming the person who was nearly exposed, and the owner can be joined from the
+    // plans table by someone who has a reason to look.
+    expect(row.params).toEqual({ planId: FOREIGN_PLAN });
+    expect(
+      row.targetClientId,
+      'the denial row names the client whose plan was probed',
+    ).toBeUndefined();
+  });
+
+  it('records the ABSENCE probe too — the larger half of an enumeration sweep', async () => {
+    // Panel round 5 (GLM Flash). Auditing only "exists, but not yours" sees the smallest
+    // slice of an id walk: most probes hit ids that do not exist, so the detection signal is
+    // the VOLUME of misses, and that was the part going unrecorded. The two are recorded
+    // under DIFFERENT codes so an operator can tell a sweep from a stale UI — while the
+    // caller's response stays identical, which is the property that must not move.
+    await dispatchDeleteWorkoutPlan({ planId: 999999 }, { user: trainer });
+    await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
+    const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.errorCode === 'handler_plan_absent');
+    expect(row, 'an absence probe left no record').toBeTruthy();
+    expect(row.userId).toBe(OUR_TRAINER);
+  });
+
+  it('denies normally even if the audit write itself blows up', async () => {
+    // Both audit calls are fire-and-forget on a DENIAL path. An unawaited promise that
+    // rejects is an unhandled rejection, which Node treats as fatal by default — so a
+    // best-effort audit could turn "the audit table hiccuped" into "the process died", on
+    // the least-observed path there is.
+    //
+    // `recordCommandAudit` catches internally (pinned in commandAuditNeverRejects.test.mjs),
+    // but this caller does not depend on that: `auditQuietly` enforces it locally. This is
+    // what proves the local guard is real rather than decorative.
+    auditMock.mockImplementation(() => Promise.reject(new Error('audit backend is down')));
+    const result = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
+    expect(result.planFound, 'a failing audit changed the denial the caller sees').toBe(false);
+    expect(transitionMock).not.toHaveBeenCalled();
+    // And a synchronous throw, which `.catch()` alone would not contain.
+    auditMock.mockImplementation(() => { throw new Error('audit threw synchronously'); });
+    const second = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
+    expect(second.planFound).toBe(false);
   });
 
   it('scopes on the plan\'s CLIENT, not its author — deliberately, for parity', async () => {
diff --git a/backend/tests/mutations/ownership.mutations.mjs b/backend/tests/mutations/ownership.mutations.mjs
index 01d1ac3f1..0f97cf2c3 100644
--- a/backend/tests/mutations/ownership.mutations.mjs
+++ b/backend/tests/mutations/ownership.mutations.mjs
@@ -31,8 +31,34 @@ export default {
     'tests/api/aiCommandTrainerScopeOwnership.contract.test.mjs',
     'tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs',
     'tests/api/aiCommandConfirmLaneReauthorization.contract.test.mjs',
+    'tests/unit/clientResolverScopeFailClosed.test.mjs',
+    'tests/unit/commandAuditNeverRejects.test.mjs',
   ],
   mutations: [
+    {
+      "id": "M47 plan archive: name the probed client in the denial audit row",
+      "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
+      "find": "      outcome: 'denied',",
+      "replace": "      outcome: 'denied', targetClientId: planForAuth.userId,"
+    },
+    {
+      "id": "M46 plan archive: a SYNCHRONOUS audit throw escapes auditQuietly",
+      "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
+      "find": "    Promise.resolve(recordCommandAudit(entry)).catch(() => {});",
+      "replace": "    if (entry) throw new Error('sync'); Promise.resolve(recordCommandAudit(entry)).catch(() => {});"
+    },
+    {
+      "id": "M44 resolver guard ALONE removed — now pinned directly, no longer needs the compound",
+      "file": "services/ai/clientResolver.mjs",
+      "find": "  if (scopeRequested && !hasTrainerScope) {",
+      "replace": "  if (false) {"
+    },
+    {
+      "id": "M45 plan archive: stop recording the ABSENCE probe (the larger half of an id sweep)",
+      "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
+      "find": "      errorCode: 'handler_plan_absent',",
+      "replace": "      errorCode: 'handler_denied_plan_access',"
+    },
     {
       "id": "M42 BOTH fail-open guards removed: trainer scope reverts to unscoped-by-garbage",
       "parts": [
@@ -51,8 +77,8 @@ export default {
     {
       "id": "M43 plan archive: deny silently, leaving no server-side record of the probe",
       "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
-      "find": "    recordCommandAudit({",
-      "replace": "    if (false) recordCommandAudit({"
+      "find": "  if (!permitted) {",
+      "replace": "  if (!permitted) { return planNotAvailable(planId);"
     },
     {
       "id": "M40 confirm lane: stop checking role at redemption entirely",
@@ -231,14 +257,14 @@ export default {
     {
       "id": "M17 plan archive: check access against the wrong id (the plan is not the client)",
       "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
-      "find": "assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, plan.userId)",
+      "find": "assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, planForAuth.userId)",
       "replace": "assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, ctx.user?.id)"
     },
     {
       "id": "M18 plan archive: distinguish denial from absence",
       "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
-      "find": "    recordCommandAudit({",
-      "replace": "    return { ...planNotAvailable(planId), denied: true }; recordCommandAudit({"
+      "find": "  if (!permitted) {",
+      "replace": "  if (!permitted) { return { ...planNotAvailable(planId), denied: true };"
     },
     {
       "id": "M19 assertAssignmentOrAdmin: fail OPEN when the lookup throws",
diff --git a/backend/tests/unit/clientResolverScopeFailClosed.test.mjs b/backend/tests/unit/clientResolverScopeFailClosed.test.mjs
new file mode 100644
index 000000000..84ec2f12b
--- /dev/null
+++ b/backend/tests/unit/clientResolverScopeFailClosed.test.mjs
@@ -0,0 +1,112 @@
+/**
+ * clientResolverScopeFailClosed.test.mjs
+ * ======================================
+ * The resolver's own guard, pinned without going through the lane.
+ *
+ * WHY THIS EXISTS
+ * ---------------
+ * `resolveClient` used to decide scope with one boolean:
+ *
+ *     hasTrainerScope = Number.isInteger(parseInt(trainerId)) && trainerId > 0
+ *
+ * and a `false` there omitted the scope clause entirely — producing the admin-wide query. So
+ * that value meant BOTH "no scope was requested" (correct for an admin) and "a scope was
+ * requested and could not be computed" (must deny), and the code acted on the permissive
+ * reading. A trainer whose own id was missing, zero, negative or unparseable was served every
+ * active client rather than refused.
+ *
+ * WHY IT IS A SEPARATE FILE FROM THE OWNERSHIP CONTRACT
+ * ----------------------------------------------------
+ * The fix landed in two places on purpose — here, and independently in `stepResolveClient` —
+ * because the lane should not depend on a shared helper's internals for its own safety, and
+ * this helper serves callers outside the lane.
+ *
+ * That redundancy has a cost a panel named (GLM Flash, 2026-08-26): with both guards in
+ * place, deleting EITHER ONE fails no test, so the only pin was a compound mutation removing
+ * both at once. Each half was individually unprotected. This pins the resolver's half
+ * directly, which decomposes that compound and means a future edit to one guard cannot
+ * silently rely on the other still being there.
+ *
+ * The database is a mirror-fake: it applies the predicates the SQL actually carries, so a
+ * query that stops carrying the scope clause stops being filtered — rather than a fake that
+ * enforces assignment itself and would keep the tests green through the very regression they
+ * exist to catch.
+ */
+import { describe, it, expect } from 'vitest';
+
+import { resolveClient } from '../../services/ai/clientResolver.mjs';
+import { makeClientDirectory } from '../helpers/fakeClientDirectory.mjs';
+import { OUR_TRAINER, PEER_TRAINER, OWN_CLIENT, FOREIGN_CLIENT, DIRECTORY } from '../helpers/ownershipFixture.mjs';
+
+const directory = () => makeClientDirectory(DIRECTORY);
+
+describe('clientResolver scope decision', () => {
+  it('resolves an assigned client for a valid trainer — the positive control', async () => {
+    // Without this, every denial below could pass because the resolver refuses everything.
+    const db = directory();
+    const { resolved, error } = await resolveClient(`#${OWN_CLIENT}`, db, { trainerId: OUR_TRAINER });
+    expect(error, `a valid trainer was refused their own client: ${error}`).toBeNull();
+    expect(resolved?.id).toBe(OWN_CLIENT);
+  });
+
+  it('refuses a client assigned to someone else', async () => {
+    const { resolved, error } = await resolveClient(`#${FOREIGN_CLIENT}`, directory(), { trainerId: OUR_TRAINER });
+    expect(resolved).toBeNull();
+    expect(error).toBeTruthy();
+  });
+
+  it('REFUSES when a scope was requested but cannot be computed', async () => {
+    // The fail-open. Each of these produced `hasTrainerScope === false`, which used to mean
+    // "run unscoped" — the admin-wide query — for a caller who had explicitly asked to be
+    // scoped. They must be denials, and crucially they must not resolve OWN_CLIENT either:
+    // the failure is not "wrong client", it is "no restriction at all".
+    for (const bad of [0, -1, 'not-a-number', '', {}, [], NaN, 1.5]) {
+      for (const target of [OWN_CLIENT, FOREIGN_CLIENT]) {
+        const { resolved, error } = await resolveClient(`#${target}`, directory(), { trainerId: bad });
+        expect(resolved, `trainerId ${JSON.stringify(bad)} resolved client ${target}`).toBeNull();
+        expect(error, `trainerId ${JSON.stringify(bad)} produced no error`).toBeTruthy();
+      }
+    }
+  });
+
+  it('issues NO query at all when the scope cannot be computed', async () => {
+    // Stronger than "returned null": it must not reach the database unscoped and then filter
+    // in JavaScript, because a later refactor of the JS side would reopen the hole.
+    const db = directory();
+    await resolveClient(`#${OWN_CLIENT}`, db, { trainerId: 'garbage' });
+    expect(db.calls, 'an unscoped query was issued for an uncomputable scope').toEqual([]);
+  });
+
+  it('still runs UNSCOPED when no scope was requested — the admin path', async () => {
+    // The other half of the distinction. Omitting the option entirely is how an admin asks
+    // for the unrestricted query, and that must keep working — a guard that also broke admins
+    // would be reverted within a day, and then the fail-open would be back.
+    const db = directory();
+    const { resolved, error } = await resolveClient(`#${FOREIGN_CLIENT}`, db, {});
+    expect(error).toBeNull();
+    expect(resolved?.id).toBe(FOREIGN_CLIENT);
+    expect(db.calls.some((c) => c.scopedByAssignment), 'an admin query carried an assignment scope').toBe(false);
+  });
+
+  it('applies the scope by NAME as well as by id', async () => {
+    // The fuzzy branch carries its own copy of the scope clause. A suite that only ever
+    // passes an id leaves the branch a trainer hits saying "log Bo's workout" untested.
+    const own = await resolveClient('Ada', directory(), { trainerId: OUR_TRAINER });
+    expect(own.resolved?.id).toBe(OWN_CLIENT);
+
+    const foreign = await resolveClient('Bo', directory(), { trainerId: OUR_TRAINER });
+    expect(foreign.resolved, 'a name resolved a client assigned to another trainer').toBeNull();
+    // And the near-miss suggestions must not disclose that Bo exists.
+    expect(JSON.stringify(foreign.suggestions || [])).not.toContain('Foreign');
+  });
+
+  it('binds the scope to the CALLER, not to any trainer', async () => {
+    // If the clause were emitted but bound to the wrong value, every assertion above would
+    // still pass. The peer trainer must see their own client and not ours.
+    const peer = await resolveClient(`#${FOREIGN_CLIENT}`, directory(), { trainerId: PEER_TRAINER });
+    expect(peer.resolved?.id).toBe(FOREIGN_CLIENT);
+
+    const crossed = await resolveClient(`#${OWN_CLIENT}`, directory(), { trainerId: PEER_TRAINER });
+    expect(crossed.resolved).toBeNull();
+  });
+});
diff --git a/backend/tests/unit/commandAuditNeverRejects.test.mjs b/backend/tests/unit/commandAuditNeverRejects.test.mjs
new file mode 100644
index 000000000..fa38768f7
--- /dev/null
+++ b/backend/tests/unit/commandAuditNeverRejects.test.mjs
@@ -0,0 +1,81 @@
+/**
+ * commandAuditNeverRejects.test.mjs
+ * =================================
+ * Two properties that several call sites depend on and nothing asserted.
+ *
+ * WHY THIS EXISTS
+ * ---------------
+ * `recordCommandAudit` is called fire-and-forget — deliberately, because an audit write must
+ * never be able to turn a user's command into a failure. Four call sites in the command lane
+ * do not await it, including two denial paths added this week.
+ *
+ * That pattern is only safe if the function CANNOT REJECT. An unawaited promise that rejects
+ * is an unhandled rejection, and Node's default for those is to terminate the process — so
+ * "best effort" auditing would become "the database hiccuped and the server died". A panel
+ * (GLM Flash, 2026-08-26) put it exactly right: crash-safety was resting on an unverified
+ * property of another module. It holds — its `try` wraps both awaits — but it was holding by
+ * inspection, and inspection is not a guard.
+ *
+ * The second property is subtler and is why the import smoke is here: the contract suites
+ * MOCK this module, so a genuine import cycle through it would be invisible to every test
+ * that exercises the code depending on it. A cycle surfaces as an undefined function at
+ * runtime, in production, on the denial path — the least observed path there is.
+ */
+import { describe, it, expect, vi, afterEach } from 'vitest';
+
+describe('recordCommandAudit as a fire-and-forget dependency', () => {
+  afterEach(() => {
+    vi.resetModules();
+    vi.doUnmock('../../models/AiCommandAuditLog.mjs');
+  });
+
+  it('RESOLVES rather than rejects when the model write throws', async () => {
+    // The property every unawaited call site depends on. If this ever regresses, the failure
+    // mode is not a missing audit row — it is an unhandled rejection on a denial path.
+    vi.resetModules();
+    vi.doMock('../../models/AiCommandAuditLog.mjs', () => ({
+      default: { create: vi.fn(async () => { throw new Error('database is unwell'); }) },
+    }));
+    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');
+
+    await expect(recordCommandAudit({
+      userId: 1, userRole: 'trainer', outcome: 'denied', errorCode: 'probe',
+    })).resolves.toBe(false);
+  });
+
+  it('RESOLVES rather than rejects when the model module itself cannot load', async () => {
+    // The import is dynamic and inside the try, so a broken model module is caught too.
+    // Asserted separately because it is a different failure at a different moment.
+    vi.resetModules();
+    vi.doMock('../../models/AiCommandAuditLog.mjs', () => { throw new Error('module is gone'); });
+    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');
+
+    await expect(recordCommandAudit({
+      userId: 1, userRole: 'trainer', outcome: 'denied',
+    })).resolves.toBe(false);
+  });
+
+  it('returns false rather than throwing on a malformed entry', async () => {
+    vi.resetModules();
+    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');
+    await expect(recordCommandAudit(null)).resolves.toBe(false);
+    await expect(recordCommandAudit({ userId: 1 })).resolves.toBe(false);
+  });
+});
+
+describe('the plan dispatcher imports for real', () => {
+  it('loads with NOTHING mocked, so an import cycle cannot hide behind the test seam', async () => {
+    // The contract suites mock the model registry, the lifecycle service and the audit
+    // module. A cycle through any of them would be masked in every one of those tests and
+    // would surface only in production, as an undefined function, on a denial path.
+    //
+    // This is the ad-hoc check that found nothing when the audit import was added, made
+    // permanent — a check that ran once is a check that will not run again.
+    vi.resetModules();
+    const mod = await import('../../services/ai/dispatchers/workoutPlanCommandDispatchers.mjs');
+    expect(typeof mod.dispatchDeleteWorkoutPlan).toBe('function');
+
+    const audit = await import('../../services/ai/commandAudit.mjs');
+    expect(typeof audit.recordCommandAudit).toBe('function');
+  });
+});
diff --git a/backend/tests/unit/mutationHarnessAnchorGuard.test.mjs b/backend/tests/unit/mutationHarnessAnchorGuard.test.mjs
index b7e6a83b4..7c6290e3d 100644
--- a/backend/tests/unit/mutationHarnessAnchorGuard.test.mjs
+++ b/backend/tests/unit/mutationHarnessAnchorGuard.test.mjs
@@ -62,7 +62,11 @@ describe('mutation harness anchor guard', () => {
     // The set is the harness's real input. If it ever stops satisfying the guard, the
     // guard is what fails — loudly, before anything is modified.
     expect(unusableAnchors(ownershipMutations.mutations)).toEqual([]);
+    // Floors, not exact counts. An exact count fails every time the set GROWS, which trains
+    // the next person to edit the number without reading why it moved — and this one did
+    // exactly that the first time two suites were added. A floor still catches the failure
+    // that matters: a set silently shrinking to nothing.
     expect(ownershipMutations.mutations.length).toBeGreaterThanOrEqual(29);
-    expect(ownershipMutations.suites.length).toBe(4);
+    expect(ownershipMutations.suites.length).toBeGreaterThanOrEqual(4);
   });
 });
```

## The new leaf module in full

```javascript
/**
 * positiveInteger.mjs — one coercion, for the places where disagreeing about a number
 * means disagreeing about who someone is.
 *
 * WHY THIS IS ITS OWN FILE
 * ------------------------
 * Two modules were parsing the same security-relevant input with different rules.
 * `commandExecutor` used a strict parse (digits only, safe-integer, positive);
 * `clientResolver` used `Number.parseInt`, which is lenient by design — it reads as far as
 * it can and ignores the rest. On the values that matter they disagree:
 *
 *     '12px'   strict -> null (deny)      parseInt -> 12    (scope to trainer 12)
 *     12.5     strict -> null (deny)      parseInt -> 12    (scope to trainer 12)
 *     '1e3'    strict -> null (deny)      parseInt -> 1     (scope to trainer 1)
 *
 * Nothing exploitable came of it, and only because the executor's guard happens to run
 * first — the safety was a property of the call ORDER, not of either function. Any new
 * entry point that reached the resolver directly would pick the lenient rule, and the
 * divergence would decide which trainer's clients a caller could see.
 *
 * It lives in a leaf module rather than being exported from either side because
 * `commandExecutor` imports `clientResolver`: sharing it from the executor would make the
 * resolver import its own importer, and a cycle in this path surfaces as an undefined
 * function at runtime, on an authorization check.
 *
 * Raised by GLM 5.3 Flash, 2026-08-26, rated low-exploitability and correct anyway: a rule
 * that holds because of the order two functions happen to run in is not a rule.
 */

/**
 * Strictly coerce a value to a positive safe integer.
 *
 * Deliberately refuses anything that is not already a whole positive number or the exact
 * decimal spelling of one. No trailing units, no exponent notation, no fractional part, no
 * leading zeros, no whitespace tolerance beyond trimming.
 *
 * @param {unknown} value
 * @returns {number|null} the integer, or null when the input is not unambiguously one
 */
export function toPositiveInteger(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export default toPositiveInteger;

```

## The dispatcher in full

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
 * Audit without being able to hurt the caller.
 *
 * `recordCommandAudit` already catches everything internally and resolves `false` on failure
 * — that is verified in `tests/unit/commandAuditNeverRejects.test.mjs`, not assumed. But both
 * calls below are fire-and-forget on a DENIAL path, and an unawaited promise that ever did
 * reject would be an unhandled rejection, which Node treats as fatal by default. Best-effort
 * auditing would become "the audit table hiccuped, so the process died".
 *
 * So the invariant is enforced HERE rather than borrowed from there. Same reasoning as the
 * scope guard this file's sibling carries in two places: a caller should not depend on
 * another module's internals for its own crash-safety, because that module's contract is
 * free to change and nothing would fail loudly when it did.
 *
 * BOTH forms are contained, and the second is why this is a try/catch and not a bare
 * `.catch()`. A rejected promise and a SYNCHRONOUS throw are different failures: the throw
 * happens while the argument is being evaluated, before `Promise.resolve` is ever reached, so
 * `.catch()` alone would let it escape. The first draft here was a bare `.catch()`; the test
 * that names the synchronous case is what caught it.
 */
const auditQuietly = (entry) => {
  try {
    Promise.resolve(recordCommandAudit(entry)).catch(() => {});
  } catch {
    // Deliberately silent: the caller is already on a denial path and has an answer to give.
  }
};

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
  //
  // Named for its ROLE, not its type. The success path below binds its own "plan" from the
  // lifecycle result — a different row at a different moment — and an earlier draft of this
  // fix called both of them "plan", so a reader inside the try block saw a name that had
  // silently changed meaning. In a function whose whole job is deciding who may act on which
  // record, two rows sharing one name is not a style question.
  const planForAuth = await WorkoutPlan.findByPk(planId);
  if (!planForAuth) {
    // The ABSENCE probe is audited too, and that is the half a review caught me missing.
    // Recording only "exists, but not yours" sees the smallest slice of an enumeration
    // attack: someone walking ids mostly hits ids that do not exist, so the signal is the
    // VOLUME of misses, and that was the part going unrecorded. Distinguishable code so an
    // operator can separate a probe sweep from a stale UI; identical response either way.
    auditQuietly({
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
      commandType: 'delete_workout_plan',
      params: { planId },
      destructive: true,
      confirmationState: 'confirmed',
      outcome: 'not_wired',
      errorCode: 'handler_plan_absent',
    });
    return planNotAvailable(planId);
  }
  const permitted = await assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, planForAuth.userId);
  if (!permitted) {
    // The RESPONSE stays indistinguishable from "no such plan" — that is the whole point of
    // the 404-parity design. The SERVER-SIDE record must not be. Without this line, a caller
    // walking plan ids leaves a trail identical to someone mistyping one, and the
    // enumeration attack the parity design anticipates is invisible in the only place
    // detection could live. Best-effort and never thrown: an audit write must not be able to
    // turn a denial into a 500.
    // The probe TARGET is recorded; the probe's VICTIM is not. An earlier draft wrote
    // `targetClientId: planForAuth.userId`, which attests "user X probed a plan belonging to
    // client Y" — freezing Y's linkage into a retained security log on the strength of a
    // guess that happened to collide. This file's own doctrine is bounded identifiers, and
    // `planId` is the caller's OWN input: it reconstructs the campaign just as well, and the
    // owner can be joined from the plans table at investigation time by someone who has a
    // reason to look. Detection does not require naming the person who was nearly exposed.
    auditQuietly({
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
      commandType: 'delete_workout_plan',
      params: { planId },
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

- 12/12 plan-archive, 16/16 client-ownership, 7/7 resolver-direct, 4/4 audit-never-rejects
- Full backend 9755 passed; 25 failing tests across 23 files, matching the per-test baseline
- **46/46 mutations fire**; no import cycle (verified by loading both modules unmocked)
- Nothing deployed; 18 unpushed commits; no CI has ever run any of this

## Known and accepted — do not re-report

- Tenancy derived from caller-supplied linkage rather than from the record — the PLANNED
  NEXT SLICE (a required registry field per id-taking command, plus an enumeration contract).
- TOCTOU on plan archive; shared with the REST route rather than introduced here.
- ~56 test stubs return `{id: 1}`, which is why the consumer guard treats absent fields as
  non-mismatches.
- `client_access_check_failed` unreachable in production.
- Admin name resolution breaks past 50 clients.
- In-flight confirmations die at deploy now that `clientId` is in the HMAC payload.

## OUTPUT FORMAT

```
VERDICT: DRY | NOT DRY
If NOT DRY: ### [SEVERITY] title — where / failure scenario / smallest fix / confidence
If DRY: the three things you attacked hardest and why each held.
VACUOUS TESTS: any assertion that cannot fail, with file:line.
ONE LINE: what next?
```