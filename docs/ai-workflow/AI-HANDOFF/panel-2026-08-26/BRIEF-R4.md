# HOSTILE REVIEW — ROUND 4. One question: is this dry?

Three rounds. Round 3 fixed two things — one from Qwen, one from Gemini. GLM returned DRY
in round 3 and its two author-checks are now closed in code.

**I am trying to establish whether this has run dry.** That determination is the deliverable.
A manufactured finding does not just waste a fix — it makes the dryness question
unanswerable, which is worse. If you find nothing, say DRY and name the three things you
attacked hardest and why they held. That is a complete and useful answer.

## What round 3 changed

**1. A registry invariant, because the gate rested on one nothing enforced.** (Qwen R3.)
`missing_client_target` fires only when `command.requiresClientRef === true` — strict, so a
command with the field ABSENT skips it. Loosening the equality would break
`delete_workout_plan`, which legitimately declares no client ref. So the invariant is now
enforced instead: no command may accept a client-identifying param while declaring neither
`requiresClientRef` nor `selfService`.

**2. The parity test finally tests behaviour.** It has been wrong twice — a tautology
(round 2), then brittle source-matching (round 3). It now EXECUTES redemption for every
confirmable command against all four roles and compares the observed verdict to the
registry.

**3. GLM's author-checks, closed in code rather than argued.** `requesterId` /
`targetClientId` are `parseStrictPositiveInteger` outputs — numbers, so coercing only the
row side is correct. And the `status: null` / `trainerId: null` asymmetry is gone.

## Attack these specifically

- **The role matrix.** It mints a real operation per (command, role) pair and reads
  `result.message` against a copied message constant. Is that a robust oracle? What does it
  fail to distinguish? Could it pass while the role check is broken?
- **The registry invariant** uses a regex over param NAMES
  (`clientId|clientRef|clientName|traineeId|memberId|athleteId`). What client-identifying
  parameter would that miss?
- **`present()` semantics** in the consumer guard: absent/null is not a mismatch, for ids
  AND now status. Is there a row shape where that is exploitable rather than merely lax?
- **Anything the previous three rounds and I have all walked past.**

```diff
diff --git a/backend/middleware/verifyClientAccess.mjs b/backend/middleware/verifyClientAccess.mjs
index 8795343e4..c06b85d85 100644
--- a/backend/middleware/verifyClientAccess.mjs
+++ b/backend/middleware/verifyClientAccess.mjs
@@ -120,11 +120,18 @@ export async function assertAssignmentOrAdmin(userId, userRole, clientId) {
     // ~56 such stubs exist across ten suites written before this guard. Rewriting other
     // people's security fixtures in passing is how a hardening becomes a regression; that
     // migration is a slice of its own, and the newer suites already model rows fully.
-    const mismatched = (actual, expected) => actual !== undefined && actual !== null
-      && Number(actual) !== expected;
+    // `requesterId` and `targetClientId` are `parseStrictPositiveInteger` outputs above —
+    // numbers, never strings — so coercing only the row side is correct rather than lucky.
+    // A review asked; this comment is the answer, so nobody has to ask twice.
+    const present = (value) => value !== undefined && value !== null;
+    const mismatched = (actual, expected) => present(actual) && Number(actual) !== expected;
     if (mismatched(assignment.trainerId, requesterId)) return false;
     if (mismatched(assignment.clientId, targetClientId)) return false;
-    if (assignment.status !== undefined && assignment.status !== 'active') return false;
+    // Same absent-is-not-a-mismatch rule as the ids. It read differently before — an
+    // explicit `status: null` denied while an explicit `trainerId: null` passed — which errs
+    // closed and so was never going to be caught by a test, but two rules for one idea is
+    // how the next person derives the wrong one.
+    if (present(assignment.status) && assignment.status !== 'active') return false;
     return true;
   } catch (err) {
     logger.warn('[verifyClientAccess] ClientTrainerAssignment check failed - denying access', {
```

### The role matrix, in full

```javascript

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

  describe('the gate\'s own allow branch', () => {
    it('permits an unregistered type ONLY when nothing can execute it', async () => {
      // Panel finding (Ox, 2026-08-26): this is the single unconditional-allow path in the
      // fix, and every test either used a registered command or mocked `hasDispatcher` true,
      // so the branch was never taken. The comment argued it was safe because nothing can
      // execute either way — an argument, not an assertion. This is the assertion.
      hasDispatcherMock.mockReturnValue(false);
      const { operationId } = preparePendingConfirmation({
```

### The registry invariant, in full

```javascript
      // `command.requiresClientRef === true`. Strict equality means a command with the field
      // ABSENT skips the check and the gate falls through to permitted — so the protection
      // rests on an invariant that nothing enforces.
      //
      // Loosening the equality would be the wrong fix: `delete_workout_plan` legitimately
      // declares no client ref and must keep working. The right fix is to enforce the
      // invariant the gate assumes. Today it holds for all 139 commands; this is what makes
      // it stay true when someone adds the 140th.
      const CLIENT_IDENTIFYING = /^(clientId|clientRef|clientName|traineeId|memberId|athleteId)$/;
      const undeclared = allCommands().filter((command) => {
        const names = paramNames(command).filter((n) => CLIENT_IDENTIFYING.test(n));
        if (!names.length) return false;
        return command.requiresClientRef !== true && command.selfService !== true;
      });
      expect(
        undeclared.map((c) => c.type),
        'these commands accept a client id but declare neither requiresClientRef nor selfService, '
        + 'so every gate keyed on those flags silently skips them',
      ).toEqual([]);
    });

    it('never lets a pin become an untested client-ref command', () => {
      // Panel finding (GLM, 2026-08-26): a pin excluded its command from every sweep, and
      // "no stale pins" passed precisely BECAUSE the command stayed unsynthesizable — so a
      // pinned command could leak a foreign client indefinitely while the suite reported
```

## Current state

- 21/21 confirm-lane, 15/15 client-ownership, 9/9 plan-archive, 8/8 trainer-scope
- Full backend 9732 passed; failing-file set identical to the recorded baseline (23 files)
- 40/40 mutations fire. One mutation was REMOVED as invalid rather than recorded as a
  survivor: it neutered the test's own filter instead of the code under test, and an
  oracle mutated into vacuity always survives. Was that the right adjudication?
- Nothing deployed; 12 unpushed commits; GitHub Actions billing-blocked, so no CI has run
  any of this.

## Known and accepted, so do not re-report unless you think the reasoning is wrong

- TOCTOU on plan archive: the access check sits outside the lifecycle service's row lock.
  `verifyClientAccessByPlanId` has the identical structure, so the window is shared with
  the REST route rather than introduced here.
- `client_access_check_failed` is unreachable through the current authorizer, which
  swallows its own failures. Documented in the code; kept as defence in depth.
- The consumer guard is narrowed (absent ≠ mismatch) because ~56 test stubs return
  `{id: 1}`. Fixing those stubs is a queued slice.
- The new denials CONSUME the single-use operation, so operations minted by pre-fix code
  and redeemed post-deploy burn with no retry. On the deploy checklist.

## OUTPUT FORMAT

```
VERDICT: DRY | NOT DRY

If DRY: the three things you attacked hardest, and why each held.
If NOT DRY: findings in severity order, each with a concrete failure scenario.

ONE LINE: what would you tell the author to do next?
```