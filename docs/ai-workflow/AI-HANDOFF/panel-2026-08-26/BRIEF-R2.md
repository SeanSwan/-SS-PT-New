# HOSTILE REVIEW — ROUND 2. Attack the fixes, and attack my rejections.

You reviewed this work in round 1. Six of your findings were accepted and fixed; four were
rejected with evidence. **This round has three jobs, in priority order:**

1. **Attack the ROUND-1 FIXES.** New code is new attack surface. The fix for a real defect
   is the most likely place for the next one.
2. **Challenge my REJECTIONS.** I disproved four findings below. If I am wrong about any of
   them, that is the most valuable thing you can return — a defect I have now formally
   convinced myself does not exist is worse than one nobody looked at.
3. **Find what round 1 missed.** Both of us have now stared at the same code; say what
   neither of us has looked at.

If you have nothing, say so plainly and name the three things you attacked hardest. A
review that manufactures findings to look thorough is worse than one that returns clean.

---

## WHAT I ACCEPTED AND FIXED

| # | finding | who | fix |
|---|---|---|---|
| 1 | Destructive lane read `params.clientId`, non-destructive read `operation.clientId` — two sources for one question, and `delete_workout_plan` has no `params.clientId`, so the client re-check ran on `null` | Ox CRITICAL, GLM MEDIUM | The operation now RECORDS the authorized client, HMAC-signed alongside `commandType`; both lanes read that one field; params and operation must agree or `target_mismatch` |
| 2 | The self-scope branch fabricated `resolvedClient` and returned, skipping `"isActive" = true` — a DEACTIVATED account could act on itself while a trainer could not act on it | GLM MEDIUM | Pin the id to self, then fall THROUGH to the same resolver everyone else uses. The special case is gone |
| 3 | A stored operation with `commandType: null` had NOTHING checked | Ox HIGH, Qwen CRITICAL | `malformed_operation` — null is an input guard, not a valid persisted shape |
| 4 | The gate's only unconditional-allow branch was never taken by any test | Ox HIGH | Asserted, including that the honest `not_wired` answer survives |
| 5 | `UNSYNTHESIZABLE` pins excluded commands from EVERY sweep, and "no stale pins" passed precisely because they stayed unsynthesizable. Three of five pins are client-data WRITES | GLM MEDIUM | Hand-written fixtures; pinned client-ref commands now run the full ownership assertion; a new pin without a fixture fails |
| 6 | A lookup FAILURE was recorded as a revocation — during an incident those mean opposite things | Qwen LOW | `client_access_check_failed` vs `client_access_revoked` |

Plus: the docblock claimed to ask "what every other gate in this lane asks" (overclaim — the
capability gate is deliberately not re-run, since it asks about browser surface state and
there is no envelope at redemption); and the ordering scan now matches un-awaited and
aliased dispatch, not only `await dispatch(`.

## WHAT I REJECTED — CHALLENGE THESE

**R1. "Strict `clientId !== toPositiveInteger(ctx.user.id)` denies legitimate string ids."**
(All three of you raised this.) `clientId` is `selectedClientId || paramsClientId`, and BOTH
are outputs of `toPositiveInteger`, whose body I withheld from round 1 — that omission is my
fault. It is:
```javascript
const toPositiveInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};
```
It returns `number | null`, never a string. So the comparison is number-vs-number and a
string id is normalised before it arrives. **Tell me if I have missed a path that reaches
that comparison without passing through `toPositiveInteger`.**

**R2. "Exact `roleRequired` membership breaks the admin superset at redemption."** (Ox HIGH.)
An admin cannot mint a command whose `roleRequired` omits `admin` — `stepRBAC` applies the
SAME predicate at mint that redemption applies. A role that could not mint cannot arrive at
redemption. I have replaced that argument with an assertion: a registry-wide test that the
mint role-set and the redeem role-set are identical for every confirmable command.
**Tell me if there is a way to reach `executeConfirmedOperation` without having minted
through `stepRBAC`.**

**R3. "Client-role callers are permanently denied at redemption because a client is not
their own trainer."** (GLM MEDIUM, Qwen HIGH.) `assertAssignmentOrAdmin` special-cases
`client`/`user` by self-comparison before ever reaching the assignment table:
```javascript
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
    return !!assignment;
  } catch (err) {
    logger.warn('[verifyClientAccess] ClientTrainerAssignment check failed - denying access', {
      userId, clientId, error: err?.message,
    });
    return false;
  }
}
```
A client-role positive control now passes (`request_plan_adjustment`, roles `client|user`,
`requiresConfirmation: true`).

**R4. "The mirror fake does not prove its filter binds to the CALLER rather than to any
trainerId."** (Ox HIGH sub-point.) The fixture has two clients assigned to two DIFFERENT
trainers. If the fake bound to any value, `FOREIGN_CLIENT` (assigned to `PEER_TRAINER`)
would resolve for `OUR_TRAINER` and the denial tests would fail. The binding is proven by
the fixture shape. **Your other sub-points I accept as real and unfixed** — a fail-open SQL
construct like `WHERE (... OR :trainerId IS NULL)` contains the substring and the fake would
filter while PostgreSQL would not. Tell me the cheapest honest guard against that.

---

# THE ROUND-1 FIX DIFF (attack this)

```diff
diff --git a/backend/services/ai/commandExecutor.mjs b/backend/services/ai/commandExecutor.mjs
index d60b54d46..761922caa 100644
--- a/backend/services/ai/commandExecutor.mjs
+++ b/backend/services/ai/commandExecutor.mjs
@@ -427,26 +427,32 @@ async function stepResolveClient(ctx) {
 
   const selectedClientId = toPositiveInteger(ctx.options.selectedClientId);
   const paramsClientId = toPositiveInteger(ctx.intent.params?.clientId);
-  const clientId = selectedClientId || paramsClientId;
-  const clientRef = selectedClientId ? null : (ctx.intent.clientRef || ctx.options.selectedClientName);
+  let clientId = selectedClientId || paramsClientId;
+  let clientRef = selectedClientId ? null : (ctx.intent.clientRef || ctx.options.selectedClientName);
 
   if (!RESOLVER_SCOPED_ROLES.has(ctx.user.role)) {
     // An unscoped role may only ever be its own client. Asking for someone else by id is
     // refused outright rather than silently retargeted, so the caller is not told about a
     // record they may not see and is not misled about whose data they received. A name
-    // reference falls through to self for the same reason it does for a self-service
-    // command: there is no one else in scope for it to mean.
-    if (clientId && clientId !== toPositiveInteger(ctx.user.id)) {
+    // reference is replaced by self for the same reason it is for a self-service command:
+    // there is no one else in scope for it to mean.
+    const selfId = toPositiveInteger(ctx.user.id);
+    if (clientId && clientId !== selfId) {
       ctx.error = 'You can only run this on your own record.';
       return ctx;
     }
-    ctx.resolvedClient = {
-      id: ctx.user.id,
-      firstName: ctx.user.firstName,
-      lastName: ctx.user.lastName,
-    };
-    if (ctx.intent.params) ctx.intent.params.clientId = ctx.user.id;
-    return ctx;
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
   }
 
   if (clientId) {
@@ -549,6 +555,11 @@ async function stepConfirmation(ctx) {
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
@@ -829,7 +840,15 @@ function outcomeFromPipelineCtx(ctx) {
  *
  * The check is against the CURRENT role rather than the minted one. The operation never
  * recorded what it was minted under, and that is the wrong question anyway: what matters
- * is whether this caller may do this now, which is what every other gate in this lane asks.
+ * is whether this caller may do this now.
+ *
+ * It re-runs the IDENTITY gates — role, and access to the operation's client — and
+ * deliberately not the capability gate. `authorizeCommandCapability` answers a different
+ * question: whether the browser surface that sent the request is in a state that permits
+ * the command. At redemption there is no context envelope to answer it with, and a
+ * surface's state is not a permission that gets revoked from a person. An earlier draft of
+ * this comment claimed to ask "what every other gate in this lane asks", which was an
+ * overclaim a review caught: capability is one of those gates and it is not re-run.
  *
  * Note on ordering: retrieval is single-use and deletes the operation, so a denial here
  * also consumes it. That is the safe direction — a denied caller cannot retry — at the
@@ -837,27 +856,49 @@ function outcomeFromPipelineCtx(ctx) {
  *
  * @returns {string|null} a denial reason for the audit log, or null when still permitted
  */
-async function confirmLaneDenialReason(commandType, clientId, user) {
-  if (commandType) {
-    const command = getCommand(commandType);
-    const required = Array.isArray(command?.roleRequired) ? command.roleRequired : null;
-    if (!required) {
-      // Unknown to the registry: there is no roleRequired to check against. If the type
-      // can still reach a dispatcher, refuse — "cannot tell" must not mean "allow". If it
-      // cannot, leave the lane's honest `not_wired` answer intact rather than replacing it
-      // with a permission error that would be false: nothing can execute either way.
-      return hasDispatcher(commandType) ? 'unregistered_command' : null;
-    }
-    if (!required.includes(user.role)) return 'role_revoked';
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
   }
+  if (clientId == null && paramsClientId != null) return 'target_mismatch';
+
   if (clientId != null) {
-    let permitted = false;
+    // A denial caused by the lookup FAILING is recorded separately from a denial caused by
+    // the answer being no. Both refuse — that is not negotiable — but during an incident the
+    // two mean opposite things: one is a revoked user being correctly stopped, the other is
+    // the database being unhealthy and every caller being stopped with them. A forensics
+    // trail that cannot tell them apart turns an outage into a false access-abuse signal.
     try {
-      permitted = await assertAssignmentOrAdmin(user.id, user.role, clientId);
+      const permitted = await assertAssignmentOrAdmin(user.id, user.role, clientId);
+      if (!permitted) return 'client_access_revoked';
     } catch {
-      permitted = false;
+      return 'client_access_check_failed';
     }
-    if (!permitted) return 'client_access_revoked';
   }
   return null;
 }
@@ -886,9 +927,7 @@ export async function executeConfirmedOperation(operationId, user, sequelize) {
   const ndResult = retrievePendingConfirmation(operationId, user.id);
   if (ndResult.verified) {
     const { operation } = ndResult;
-    const ndDenial = await confirmLaneDenialReason(
-      operation.commandType, operation.clientId ?? null, user,
-    );
+    const ndDenial = await confirmLaneDenialReason(operation, user);
     if (ndDenial) {
       auditConfirm('denied', {
         commandType: operation.commandType,
@@ -1037,8 +1076,12 @@ export async function executeConfirmedOperation(operationId, user, sequelize) {
   // stores the command-lane dispatcher key signed into the pending operation.
   const commandType = operation.commandType || null;
   if (commandType && hasDispatcher(commandType)) {
-    const clientId = operation.params?.clientId ?? null;
-    const denial = await confirmLaneDenialReason(commandType, clientId, user);
+    // ONE canonical source in both lanes: the client the operation was authorized against
+    // at mint, not whatever a params field happens to hold. `params.clientId` was the
+    // earlier reading and it is absent on exactly the commands that matter most —
+    // `delete_workout_plan` carries `planId` — so the check quietly ran on `null`.
+    const clientId = operation.clientId ?? null;
+    const denial = await confirmLaneDenialReason(operation, user);
     if (denial) {
       auditConfirm('denied', {
         commandType,
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
```

# THE NEW AND CHANGED TESTS

```javascript
/** Every command that can reach the confirm lane at all. */
function allConfirmableCommands() {
  initializeRegistry();
  const all = getAllCommands();
  return (Array.isArray(all) ? all : Object.values(all))
    .filter((c) => c.requiresConfirmation === true || c.destructive === true);
}

/** The roles the registry grants a command — the one source redemption consults. */
function getRegistryRoles(type) {
  initializeRegistry();
  const command = getCommand(type);
  return Array.isArray(command?.roleRequired) ? command.roleRequired : [];
}

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

function mintDestructive(userId = OUR_TRAINER, overrides = {}) {
  const { operationId } = prepareDestructiveOperation({
    type: 'UPDATE',
    endpoint: '/api/sessions/9/cancel',
    commandParams: { id: 9, clientId: OWN_CLIENT },
    commandType: DESTRUCTIVE_COMMAND,
    // The client the operation was AUTHORIZED against, as the pipeline records at mint.
    clientId: OWN_CLIENT,
    userId,
    description: 'cancel a session',
    ...overrides,
  });
  return operationId;
}

/**
 * A destructive operation whose target is NOT a client id — the `delete_workout_plan`
 * shape. This is the case that made the old reading vacuous: it read `params.clientId`,
 * which this shape does not have, so the client re-check silently ran on `null`.
 */
function mintDestructivePlanShape(userId = OUR_TRAINER) {
  const { operationId } = prepareDestructiveOperation({
    type: 'DELETE',
    endpoint: '/api/workout-plans/71',
    commandParams: { id: 71, planId: 71 },
    commandType: DESTRUCTIVE_COMMAND,
    clientId: OWN_CLIENT,
    userId,
    description: 'archive a plan',
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

    it('lets a CLIENT redeem their own operation — the second positive control', async () => {
      // Panel finding (Qwen, 2026-08-26): every positive control here used a trainer, so if
      // `assertAssignmentOrAdmin` treated a client-role caller differently — it resolves them
      // by self-comparison, not by assignment — this suite would not have noticed the entire
      // client population being locked out of their own confirmed actions.
      const CLIENT_SELF = { id: OWN_CLIENT, role: 'client', firstName: 'C', lastName: 'L' };
      const { operationId } = preparePendingConfirmation({
        commandType: 'request_plan_adjustment',
        params: { clientId: OWN_CLIENT },
        clientId: OWN_CLIENT,
        userId: OWN_CLIENT,
        description: 'request a plan adjustment',
      });
      const result = await executeConfirmedOperation(operationId, CLIENT_SELF, sequelize);
      expect(
        dispatchMock,
        `a client could not redeem their own operation (${result.type}: ${result.message})`,
      ).toHaveBeenCalledTimes(1);
      expect(assertAccessMock).toHaveBeenCalledWith(OWN_CLIENT, 'client', OWN_CLIENT);
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

      // And it is recorded as a DIFFERENT denial from a revocation. Both refuse, but during
      // an incident the two mean opposite things: one is a revoked user correctly stopped,
      // the other is an unhealthy database stopping everyone. A trail that cannot tell them
      // apart turns an outage into a false access-abuse signal.
      await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
      const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.outcome === 'denied');
      expect(row?.errorCode).toBe('client_access_check_failed');
    });

    it('asks about the OPERATION\'s client, not the caller', async () => {
      // The distinction matters: asking about the caller's own id would pass for any
      // trainer and quietly authorize nothing.
      await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(assertAccessMock).toHaveBeenCalledWith(OUR_TRAINER, 'trainer', OWN_CLIENT);
    });

    it('checks the destructive lane\'s client too, for the stated reason', async () => {
      assertAccessMock.mockResolvedValue(false);
      const result = await executeConfirmedOperation(mintDestructive(), TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      // The REASON matters. An earlier version of this test passed while the client check
      // never ran — the denial came from elsewhere — which is exactly the vacuity a panel
      // predicted for it. Asserting the audit reason is what tells the two apart.
      await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
      const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.outcome === 'denied');
      expect(row?.errorCode).toBe('client_access_revoked');
    });

    it('checks a destructive op whose target is NOT a client id — the plan shape', async () => {
      // `delete_workout_plan` carries `planId`, never `params.clientId`. Reading the target
      // out of params meant the client re-check ran on `null` for precisely the destructive
      // commands that matter most; it survived only because that one dispatcher happens to
      // self-gate. The operation now records the client it was authorized against.
      assertAccessMock.mockResolvedValue(false);
      const result = await executeConfirmedOperation(mintDestructivePlanShape(), TRAINER, sequelize);
      expect(dispatchMock, 'a revoked trainer redeemed a destructive op with no clientId param').not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(assertAccessMock).toHaveBeenCalledWith(OUR_TRAINER, 'trainer', OWN_CLIENT);
    });

    it('refuses when the operation and its params name different clients', async () => {
      // A gate that authorizes one id while dispatch acts on another authorizes nothing.
      const operationId = mintDestructive(OUR_TRAINER, { clientId: FOREIGN_CLIENT });
      const result = await executeConfirmedOperation(operationId, TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
      const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.outcome === 'denied');
      expect(row?.errorCode).toBe('target_mismatch');
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

```

# CURRENT VERIFICATION

- 14/14 client-ownership, 18/18 confirm-lane, 8/8 trainer-scope, 8/8 plan-archive
- Full backend 9727 passed; failing-file set identical to `known-failing-baseline` (23)
- **35/35 mutations fire** (5 added this round). Four anchors were invalidated by the
  refactor and reported as ANCHOR, not SURVIVED — the harness distinguishes "not applied"
  from "did not fail", which is why they were repaired rather than mistaken for vacuity.
- One mutation SURVIVED and was rewritten as a compound: making the fake ignore `isActive`
  alone is unobservable, because `clientResolver` ALSO checks `rows.isActive` explicitly.
  Both halves must be broken for the deactivated-client test to fail. Is that adjudication
  right, or am I excusing a weak assertion?

# STILL NOT PROVEN (unchanged)

- Dispatcher self-gating — handlers are mocked throughout
- A role changing DURING dispatch (between redemption and the write)
- TOCTOU on plan archive: the access check is outside the lock the lifecycle service takes.
  `verifyClientAccessByPlanId` has the identical structure, so the window is shared with the
  REST route rather than introduced here — closing it in one caller only would recreate the
  asymmetry this work exists to remove. Recorded as open.
- Real SQL — the fake mirrors predicates; PostgreSQL is never consulted
- Nothing deployed; GitHub Actions billing-blocked, so no CI has ever run this

# OUTPUT FORMAT

```
## VERDICT: APPROVE | REVISE | REJECT

## DID MY REJECTIONS HOLD?
R1 / R2 / R3 / R4 — for each: UPHELD or OVERTURNED, and why.

## NEW FINDINGS
### [SEVERITY] short title
- **Where / Failure scenario / Fix / Confidence**

## WHAT I ATTACKED AND COULD NOT BREAK
```