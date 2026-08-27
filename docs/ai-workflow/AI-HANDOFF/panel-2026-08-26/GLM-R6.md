# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF-R6.md
**Tokens:** 11461 in / 16208 out (reasoning: 15270) | total 27669
**Wall:** 333.7s

---

```
VERDICT: NOT DRY
```

### [MEDIUM] The denial/absence audits are verified only up to the mock — persistence of `params.planId` is pinned nowhere, and `targetClientId` readers are confirmed absent nowhere — `workoutPlanCommandDispatchers.mjs` (both `auditQuietly` call sites) / `tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs`

**Failure scenario:** Both assertions that matter — `expect(row.params).toEqual({ planId: FOREIGN_PLAN })` and the absence-probe `find(r => r?.errorCode === 'handler_plan_absent')` — inspect `auditMock.mock.calls`, i.e. the entry **before** `recordCommandAudit` touches it. If `commandAudit.mjs` sanitizes `params` through an allowlist or redactor (the mechanism your own question 4 presupposes), `planId` is dropped at persistence and every denial/absence row lands as outcome+errorCode with no target: a 10k-id walk leaves 10k rows from which the campaign cannot be reconstructed, fixes 3 and 4 silently deliver no detection value, and every suite stays green. Symmetrically, if any aggregation reads `targetClientId` for `outcome='denied'` rows, it goes permanently to zero with nothing failing. This is not a hypothetical seam in your own terms — `commandAuditNeverRejects.test.mjs` exists precisely because "a property several call sites depend on and nothing asserted" is a defect in this codebase's own doctrine, and row-content persistence is now that property. Note the hole is inherited (round 5's original `targetClientId` assertion ran against the same mock), but round 5 is what made the persisted field the *entire* detection claim.

**Smallest fix:** ~6 lines in the `commandAuditNeverRejects` pattern: `vi.doMock` the model with a `create` spy, call the **real** `recordCommandAudit` with a denial entry, assert the `create()` payload retained `params.planId` (and did not require `targetClientId`). Plus an author-side grep for `targetClientId`/`params` readers in metrics — that half I cannot do from this material.

**Confidence:** The gap is certain — the mock provably sits upstream of persistence, and no visible test observes a persisted row. Whether redaction actually strips `planId` is unknown from the provided files (plausibly it doesn't); hence MEDIUM, not HIGH.

Everything else attacked, for the record: **(1)** `toPositiveInteger` — checked number/string/thenable edge cases (`'9007199254740993'` → 2^53 → not safe → null; `'1e3'`, `'12px'`, `'042'`, `'+42'`, BigInt, boxed numbers all → null; every change vs `parseInt` is in the deny direction, which is the fix). The two-importer claim is unverifiable from the diff but the semantic change (garbage→deny, admin path untouched and pinned) contains the risk regardless. **(2)** `scopedTrainerId !== null` — downstream can now only ever see a valid positive integer where the old code could pass NaN/12-from-'12px'; holds. **(3)** Third audit failure shape — none: async functions never throw synchronously, a thenable whose `then` getter throws assimilates to a rejection, a broken import throws the synchronous TypeError the try/catch already catches, and a hang is harmless unawaited. Holds. **(4)** The equivalent-mutant adjudication is sound: M44 plus the direct suite makes resolver-guard relaxation loud, so the expiry condition is mechanically enforced, not merely documented. M43/M45/M46/M47 are all killed by the updated assertions (M46 dies via the denial row never being recorded, not the sync test — worth knowing, but dead is dead).

```
VACUOUS TESTS: none found — every new assertion can fail, including both sync-throw assertions (a bare `.catch()` would reject `dispatchDeleteWorkoutPlan` and fail the `await`). The `row.params` assertion is not vacuous but is blind past the mock boundary; that is the finding above.
ONE LINE: Add the six-line persisted-payload test and run the `targetClientId`/metrics grep — if both come back clean, this is DRY next round.
```
