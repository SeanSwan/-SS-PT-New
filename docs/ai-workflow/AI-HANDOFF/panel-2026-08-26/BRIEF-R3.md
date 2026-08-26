# HOSTILE REVIEW — ROUND 3. Two questions, and the second one matters more.

## QUESTION 1: is this dry?

Round 2 fixed five things you found. **Attack those fixes.** If you find nothing, say so
plainly — "no new findings, here are the three things I attacked hardest and why they held".
A manufactured finding is worse than a clean report, because it costs a real fix its
attention. I am trying to establish whether this work has run dry, and a false positive
makes that impossible to tell.

### What round 2 changed

1. **The mint/redeem parity test was a TAUTOLOGY** — it read `roleRequired` on both sides
   and compared it to itself. It now reads the two PREDICATES and asserts neither gate
   names a role literally (the carve-out asymmetry the finding was actually about).
2. **A client-ref command with no client recorded was permitted.** When both
   `operation.clientId` and `params.clientId` were null, every client check was skipped and
   the gate returned "permitted" by falling off the end. Now `missing_client_target` — but
   ONLY when `command.requiresClientRef === true`. A command with no client concept
   (`delete_workout_plan`, which carries a `planId`) legitimately records none, and its
   ownership belongs to its handler.
3. **Fail-open SQL is now caught at the consumer.** `assertAssignmentOrAdmin` re-asserts
   what the WHERE was supposed to guarantee, on the row that came back.
4. **`client_access_check_failed` is documented as unreachable in production** — the real
   authorizer swallows its own failures, so a DB outage is audited as a revocation. The
   branch stays as defence in depth; the comment says it does not work today.
5. Destructive-lane minter binding asserted; a second fail-open dimension asserted after a
   mutation SURVIVED showing only one of two guards was exercised.

### Specific things to attack in the round-2 diff

- **The narrowing in the consumer guard.** Absent fields are NOT treated as mismatches,
  because ~56 test stubs return `{id: 1}`. Is that narrowing exploitable, or is my
  reasoning (a real SELECT always returns the queried columns) sound?
- **`missing_client_target` keys on `command.requiresClientRef`.** Is there a command that
  handles a client WITHOUT declaring that flag, and would therefore skip the check?
- **The parity test now asserts neither gate contains the string `admin`.** What does that
  fail to catch that the tautology also failed to catch?
- **Does anything now DENY that previously worked?** Three fixes added denial paths. The
  availability question is as real as the security one.

```diff
diff --git a/backend/middleware/verifyClientAccess.mjs b/backend/middleware/verifyClientAccess.mjs
index 01ae3446a..8795343e4 100644
--- a/backend/middleware/verifyClientAccess.mjs
+++ b/backend/middleware/verifyClientAccess.mjs
@@ -103,7 +103,29 @@ export async function assertAssignmentOrAdmin(userId, userRole, clientId) {
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
+    const mismatched = (actual, expected) => actual !== undefined && actual !== null
+      && Number(actual) !== expected;
+    if (mismatched(assignment.trainerId, requesterId)) return false;
+    if (mismatched(assignment.clientId, targetClientId)) return false;
+    if (assignment.status !== undefined && assignment.status !== 'active') return false;
+    return true;
   } catch (err) {
     logger.warn('[verifyClientAccess] ClientTrainerAssignment check failed - denying access', {
       userId, clientId, error: err?.message,
diff --git a/backend/services/ai/commandExecutor.mjs b/backend/services/ai/commandExecutor.mjs
index 761922caa..d08b04ed7 100644
--- a/backend/services/ai/commandExecutor.mjs
+++ b/backend/services/ai/commandExecutor.mjs
@@ -887,12 +887,33 @@ async function confirmLaneDenialReason(operation, user) {
   }
   if (clientId == null && paramsClientId != null) return 'target_mismatch';
 
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
   if (clientId != null) {
     // A denial caused by the lookup FAILING is recorded separately from a denial caused by
     // the answer being no. Both refuse — that is not negotiable — but during an incident the
     // two mean opposite things: one is a revoked user being correctly stopped, the other is
     // the database being unhealthy and every caller being stopped with them. A forensics
     // trail that cannot tell them apart turns an outage into a false access-abuse signal.
+    //
+    // HONEST LIMIT, found by review 2026-08-26: `assertAssignmentOrAdmin` catches its own
+    // failures and returns false, so today a database outage arrives here as a plain "no"
+    // and IS audited as a revocation. This catch is therefore unreachable through the
+    // current authorizer — it is defence in depth against one that stops swallowing, and
+    // the distinction it draws is real only for such an authorizer. Closing the conflation
+    // properly means changing shared middleware the REST routes also depend on, which is a
+    // separate decision; claiming the distinction works today would be false.
     try {
       const permitted = await assertAssignmentOrAdmin(user.id, user.role, clientId);
       if (!permitted) return 'client_access_revoked';
```

### The gate as it now stands, in full

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
```

---

## QUESTION 2: what should the NEXT SLICE be?

This is the question I most want your answer on, and I want you to disagree with me if you
do. I have been proposing **dispatcher self-gating** — proving that a handler would refuse a
caller on its own if reached by any means other than the pipeline. Handlers are mocked
throughout the current contracts, so nothing proves it.

**My own doubt about that choice:** all three known doors into `dispatch` are now gated, so
self-gating is defence in depth behind gates that hold. It may be the *safest*-sounding
next slice rather than the *highest-value* one.

### The full open list, so you can pick against it

| # | open item | why it might be next | why it might not |
|---|---|---|---|
| A | **Dispatcher self-gating** — handlers mocked everywhere; no handler is shown to refuse alone | closes the last authorization dimension in this lane | defence in depth behind three gates now proven |
| B | **TOCTOU on plan archive** — the access check sits outside the row lock the lifecycle service takes; `verifyClientAccessByPlanId` has the identical structure, so the window is shared with the REST route | a real race on a destructive write | tiny window, needs concurrent reassignment, and fixing one caller recreates the asymmetry this work removed |
| C | **The ~56 under-specified assignment stubs** across ten suites that return `{id: 1}` | they are why the consumer guard had to be narrowed; fixing them lets it be strict | pure test-fixture migration, no production behaviour changes |
| D | **Set-comparison baseline** hides intra-file regressions — a file already in the 23-file failing baseline can start failing for a NEW reason invisibly | every verification claim in this workstream rests on it | tooling, not product |
| E | **`allowedRoles` untrustworthy for 54% of registry rows** (from an earlier session) | authorization data nobody can rely on | unclear what depends on it |
| F | **A role changing DURING dispatch** — the window between redemption and the write | completes the re-authorization story | far narrower than the 120s window just closed |
| G | **Something none of the above** — say so |  |  |

### What I need from you

Rank your top three, and for the top one give: the concrete first move, what would prove it
done, and the strongest argument AGAINST doing it. If you think the whole workstream should
stop and something outside this list matters more, say that instead — this lane has had
three sessions of attention and "keep hardening the thing we are already hardening" is
exactly the bias I want checked.

Context on the product: SwanStudios is a trainer-led personal-training SaaS. Swan Coach is
a natural-language command lane over it. Nothing in this workstream is deployed — the
branch has 11 unpushed commits and the account's GitHub Actions are billing-blocked, so no
CI has ever run any of it.

## OUTPUT FORMAT

```
## PART 1 — DRY CHECK
VERDICT: DRY | NOT DRY
(if NOT DRY: findings in the usual severity format)
(if DRY: the three things you attacked hardest, and why they held)

## PART 2 — NEXT SLICE
1st: <letter + name> — first move / done-when / strongest argument against
2nd: <letter + name> — one line
3rd: <letter + name> — one line
DISAGREEMENT WITH MY PROPOSAL (A): <state it plainly, or say you agree and why>
```