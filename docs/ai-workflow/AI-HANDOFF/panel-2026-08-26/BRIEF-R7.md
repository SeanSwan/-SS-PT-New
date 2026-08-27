# ROUND 7 — dry confirmation

Round 6: you both returned NOT DRY on the same finding, and you both said the same thing
about what would settle it. Quoting you:

> **GLM 5.3:** "Add the six-line persisted-payload test and run the `targetClientId`/metrics
> grep — if both come back clean, this is DRY next round."
>
> **GLM 5.3 Flash:** "Add the audit-payload round-trip pin at the model seam, and then push."

Both are done. This round exists to confirm that, not to assume it — you predicted DRY and
a prediction is not a verification.

## 1. The persisted-payload pin, at the model seam

A real `recordCommandAudit` call against a mocked `AiCommandAuditLog.create`, asserting the
probed planId reaches `paramsRedacted` on the ROW and that `targetClientId` is still null
there. Plus the redactor itself across every shape a planId arrives as.

```javascript
/**
 * commandAuditNeverRejects.test.mjs
 * =================================
 * Two properties that several call sites depend on and nothing asserted.
 *
 * WHY THIS EXISTS
 * ---------------
 * `recordCommandAudit` is called fire-and-forget — deliberately, because an audit write must
 * never be able to turn a user's command into a failure. Four call sites in the command lane
 * do not await it, including two denial paths added this week.
 *
 * That pattern is only safe if the function CANNOT REJECT. An unawaited promise that rejects
 * is an unhandled rejection, and Node's default for those is to terminate the process — so
 * "best effort" auditing would become "the database hiccuped and the server died". A panel
 * (GLM Flash, 2026-08-26) put it exactly right: crash-safety was resting on an unverified
 * property of another module. It holds — its `try` wraps both awaits — but it was holding by
 * inspection, and inspection is not a guard.
 *
 * The second property is subtler and is why the import smoke is here: the contract suites
 * MOCK this module, so a genuine import cycle through it would be invisible to every test
 * that exercises the code depending on it. A cycle surfaces as an undefined function at
 * runtime, in production, on the denial path — the least observed path there is.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('recordCommandAudit as a fire-and-forget dependency', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../../models/AiCommandAuditLog.mjs');
  });

  it('RESOLVES rather than rejects when the model write throws', async () => {
    // The property every unawaited call site depends on. If this ever regresses, the failure
    // mode is not a missing audit row — it is an unhandled rejection on a denial path.
    vi.resetModules();
    vi.doMock('../../models/AiCommandAuditLog.mjs', () => ({
      default: { create: vi.fn(async () => { throw new Error('database is unwell'); }) },
    }));
    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');

    await expect(recordCommandAudit({
      userId: 1, userRole: 'trainer', outcome: 'denied', errorCode: 'probe',
    })).resolves.toBe(false);
  });

  it('RESOLVES rather than rejects when the model module itself cannot load', async () => {
    // The import is dynamic and inside the try, so a broken model module is caught too.
    // Asserted separately because it is a different failure at a different moment.
    vi.resetModules();
    vi.doMock('../../models/AiCommandAuditLog.mjs', () => { throw new Error('module is gone'); });
    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');

    await expect(recordCommandAudit({
      userId: 1, userRole: 'trainer', outcome: 'denied',
    })).resolves.toBe(false);
  });

  it('returns false rather than throwing on a malformed entry', async () => {
    vi.resetModules();
    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');
    await expect(recordCommandAudit(null)).resolves.toBe(false);
    await expect(recordCommandAudit({ userId: 1 })).resolves.toBe(false);
  });
});

describe('the investigation key survives redaction', () => {
  it('keeps a probed planId in the redacted params, in every shape it arrives as', async () => {
    // The plan dispatcher's denial row records `params: { planId }` INSTEAD of the probed
    // client's id — deliberately, so a bystander's linkage is not frozen into a security log
    // on the strength of a guess that collided. That minimization is only sound if the thing
    // it kept actually survives: if redaction ever scrubbed the id, the row would record the
    // fact of a probe and nothing about WHICH, and the whole detection value would quietly
    // become zero without a single test going red.
    //
    // Same borrowed-invariant shape as the never-rejects property above: a fix in one module
    // resting on an untested promise from another.
    const { redactParams } = await import('../../services/ai/commandAudit.mjs');
    for (const value of [72, '72', 12345678, '12345678', 'plan-abc']) {
      expect(
        redactParams({ planId: value }),
        `a planId of ${JSON.stringify(value)} did not survive redaction`,
      ).toEqual({ planId: value });
    }
  });

  it('and reaches the ROW, not just the redactor', async () => {
    // Pinning `redactParams` alone leaves the join unpinned: `recordCommandAudit` could stop
    // passing params to it, or stop storing the result, and the assertion above would stay
    // green while the audit row recorded nothing about WHICH plan was probed. A review
    // (GLM Flash) called this the difference between the mock seam and the model seam, and
    // it is the difference between testing a function and testing the behaviour that
    // function exists to produce.
    vi.resetModules();
    const create = vi.fn(async () => ({}));
    vi.doMock('../../models/AiCommandAuditLog.mjs', () => ({ default: { create } }));
    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');

    await recordCommandAudit({
      userId: 500,
      userRole: 'trainer',
      outcome: 'denied',
      errorCode: 'handler_denied_plan_access',
      params: { planId: 72 },
    });

    expect(create).toHaveBeenCalledTimes(1);
    const row = create.mock.calls[0][0];
    expect(row.paramsRedacted, 'the probed planId never reached the row').toEqual({ planId: 72 });
    expect(row.errorCode).toBe('handler_denied_plan_access');
    // And the bystander is still absent at the row, which is the point of recording planId.
    expect(row.targetClientId).toBeNull();
  });
});

describe('the plan dispatcher imports for real', () => {
  it('loads with NOTHING mocked, so an import cycle cannot hide behind the test seam', async () => {
    // The contract suites mock the model registry, the lifecycle service and the audit
    // module. A cycle through any of them would be masked in every one of those tests and
    // would surface only in production, as an undefined function, on a denial path.
    //
    // This is the ad-hoc check that found nothing when the audit import was added, made
    // permanent — a check that ran once is a check that will not run again.
    vi.resetModules();
    const mod = await import('../../services/ai/dispatchers/workoutPlanCommandDispatchers.mjs');
    expect(typeof mod.dispatchDeleteWorkoutPlan).toBe('function');

    const audit = await import('../../services/ai/commandAudit.mjs');
    expect(typeof audit.recordCommandAudit).toBe('function');
  });
});

```

## 2. The `targetClientId` reader grep

Result: **nothing reads `AiCommandAuditLog.targetClientId` anywhere in the backend.** The
only consumer of audit rows is the metrics summary, which groups by `commandType, outcome`
and selects neither. Every other hit in the tree is an unrelated local variable of the same
name — in the context engine, the brief dispatcher, and the voice-confirmation tier. The
column and its index remain for the rows that populate it legitimately (the executor's own
audit calls, which are unchanged).

Raw hits, so you can check my reading rather than take it:

```
migrations/...create-ai-command-audit-logs.cjs:48,101   column + index definition
models/AiCommandAuditLog.mjs:45,105                     column + index definition
services/ai/contextEngine/coachContextEngine.mjs:132,144,146,159   local param
services/ai/contextEngine/clientAccess.mjs:70-75                   local param
services/ai/dispatchers/briefClientDispatcher.mjs:113,117          local variable
services/ai/voiceConfirmationTier.mjs:92,113,115,116,124           local ctx field
tests/... and the mutation set                                     mine
```

## 3. Also closed — a leak check that would have gone tautological

Flash's nearest-miss from round 6: `not.toContain('Foreign')` on the suggestion list passes
just as happily when the list is EMPTY. A positive control now proves the suggestion channel
is live before the leak assertion runs.

```diff
diff --git a/backend/tests/unit/clientResolverScopeFailClosed.test.mjs b/backend/tests/unit/clientResolverScopeFailClosed.test.mjs
index 84ec2f12b..29e9550cd 100644
--- a/backend/tests/unit/clientResolverScopeFailClosed.test.mjs
+++ b/backend/tests/unit/clientResolverScopeFailClosed.test.mjs
@@ -96,7 +96,17 @@ describe('clientResolver scope decision', () => {
 
     const foreign = await resolveClient('Bo', directory(), { trainerId: OUR_TRAINER });
     expect(foreign.resolved, 'a name resolved a client assigned to another trainer').toBeNull();
-    // And the near-miss suggestions must not disclose that Bo exists.
+
+    // The near-miss suggestions must not disclose that Bo exists. But a `not.toContain` on
+    // an EMPTY list passes for the wrong reason, so first prove the channel exists at all:
+    // a miss inside the caller's own scope does produce suggestions. Without this the leak
+    // check would silently become a tautology the day the resolver stopped suggesting.
+    // (GLM Flash, round 6: "weakens to a tautology if a future refactor returns NO
+    // suggestions" — true, and cheaper to close than to remember.)
+    const nearMiss = await resolveClient('Adaa', directory(), { trainerId: OUR_TRAINER });
+    const channelIsLive = (nearMiss.suggestions || []).length > 0 || nearMiss.resolved !== null;
+    expect(channelIsLive, 'the suggestion channel produced nothing — the leak check below is vacuous').toBe(true);
+
     expect(JSON.stringify(foreign.suggestions || [])).not.toContain('Foreign');
   });
 
diff --git a/backend/tests/unit/commandAuditNeverRejects.test.mjs b/backend/tests/unit/commandAuditNeverRejects.test.mjs
index fa38768f7..2e23b3e3d 100644
--- a/backend/tests/unit/commandAuditNeverRejects.test.mjs
+++ b/backend/tests/unit/commandAuditNeverRejects.test.mjs
@@ -63,6 +63,55 @@ describe('recordCommandAudit as a fire-and-forget dependency', () => {
   });
 });
 
+describe('the investigation key survives redaction', () => {
+  it('keeps a probed planId in the redacted params, in every shape it arrives as', async () => {
+    // The plan dispatcher's denial row records `params: { planId }` INSTEAD of the probed
+    // client's id — deliberately, so a bystander's linkage is not frozen into a security log
+    // on the strength of a guess that collided. That minimization is only sound if the thing
+    // it kept actually survives: if redaction ever scrubbed the id, the row would record the
+    // fact of a probe and nothing about WHICH, and the whole detection value would quietly
+    // become zero without a single test going red.
+    //
+    // Same borrowed-invariant shape as the never-rejects property above: a fix in one module
+    // resting on an untested promise from another.
+    const { redactParams } = await import('../../services/ai/commandAudit.mjs');
+    for (const value of [72, '72', 12345678, '12345678', 'plan-abc']) {
+      expect(
+        redactParams({ planId: value }),
+        `a planId of ${JSON.stringify(value)} did not survive redaction`,
+      ).toEqual({ planId: value });
+    }
+  });
+
+  it('and reaches the ROW, not just the redactor', async () => {
+    // Pinning `redactParams` alone leaves the join unpinned: `recordCommandAudit` could stop
+    // passing params to it, or stop storing the result, and the assertion above would stay
+    // green while the audit row recorded nothing about WHICH plan was probed. A review
+    // (GLM Flash) called this the difference between the mock seam and the model seam, and
+    // it is the difference between testing a function and testing the behaviour that
+    // function exists to produce.
+    vi.resetModules();
+    const create = vi.fn(async () => ({}));
+    vi.doMock('../../models/AiCommandAuditLog.mjs', () => ({ default: { create } }));
+    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');
+
+    await recordCommandAudit({
+      userId: 500,
+      userRole: 'trainer',
+      outcome: 'denied',
+      errorCode: 'handler_denied_plan_access',
+      params: { planId: 72 },
+    });
+
+    expect(create).toHaveBeenCalledTimes(1);
+    const row = create.mock.calls[0][0];
+    expect(row.paramsRedacted, 'the probed planId never reached the row').toEqual({ planId: 72 });
+    expect(row.errorCode).toBe('handler_denied_plan_access');
+    // And the bystander is still absent at the row, which is the point of recording planId.
+    expect(row.targetClientId).toBeNull();
+  });
+});
+
 describe('the plan dispatcher imports for real', () => {
   it('loads with NOTHING mocked, so an import cycle cannot hide behind the test seam', async () => {
     // The contract suites mock the model registry, the lifecycle service and the audit
```

## What to attack

1. **Does the model-seam test actually pin the join?** Would it survive `recordCommandAudit`
   dropping params, or redaction scrubbing the id? Trace the kill condition.
2. **Is my grep reading right?** I claim every non-schema hit is an unrelated local. Check.
3. **The positive control** — `resolveClient('Adaa', ...)` accepts EITHER non-empty
   suggestions OR a resolved client. Is that disjunction too loose to prove the channel?
4. **Anything else, and any assertion that cannot fail.**

## Current verification

- 13/13 across the two unit suites; 12/12 plan-archive; 16/16 client-ownership
- Full backend 9757 passed; 25 failing tests across 23 files, matching the per-test baseline
- 46/46 mutations fire
- Nothing deployed; 19 unpushed commits; no CI has ever run any of it

## Known and accepted — do not re-report

- Tenancy derived from caller-supplied linkage — the PLANNED NEXT SLICE.
- TOCTOU on plan archive; shared with the REST route.
- ~56 test stubs return `{id: 1}`.
- `client_access_check_failed` unreachable in production.
- Admin name resolution breaks past 50 clients.
- In-flight confirmations die at deploy.
- The 19 commits are unpushed and CI has never run. I know. It is Sean's call, not mine.

## OUTPUT FORMAT

```
VERDICT: DRY | NOT DRY
If DRY: the three things you attacked hardest and why each held.
If NOT DRY: ### [SEVERITY] title — where / failure scenario / smallest fix / confidence
VACUOUS TESTS: any assertion that cannot fail, with file:line.
```