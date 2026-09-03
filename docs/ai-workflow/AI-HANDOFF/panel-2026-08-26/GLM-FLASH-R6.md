# GLM Consult

**Model:** glm-5.3-flash
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF-R6.md
**Tokens:** 11461 in / 10832 out (reasoning: 10079) | total 22293
**Wall:** 286.1s

---

```
VERDICT: NOT DRY

### [MEDIUM] `params: { planId }` is asserted at the mock seam, not through `recordCommandAudit` — the enumeration-detection story rests on retention no test proves — workoutPlanCommandDispatchers.mjs (both `auditQuietly` payloads) + aiCommandPlanArchiveOwnership.contract.test.mjs (`expect(row.params).toEqual({ planId: FOREIGN_PLAN })`)
Failure scenario: the contract suites MOCK the audit module (your own note in commandAuditNeverRejects.test.mjs says exactly this). So `row.params` merely reflects the argument the dispatcher constructed — it can tell us nothing about what `recordCommandAudit` persists. The only properties pinned on the real `recordCommandAudit` are *negative* ones: it resolves `false` on a thrown write, a dead module, and on `{ userId: 1 }`. If its validation/redaction whitelist accepts `params` as an unknown/transient key and stores a projection (userId, role, commandType, outcome, errorCode — the fields the denial row historically carried as top-level columns), then production rows for BOTH new audit paths contain no `planId` at all: the "reconstruct the campaign / signal is the volume of misses" rationale is inert, and nothing goes red — the assertionSuite cannot see it because the mock faithfully echoes the input. Note the asymmetry with the fix it replaced: `targetClientId` was a top-level field with a dedicated test even if that test sat on the same seam; `planId` migrated from a named column into a nested payload, increasing its dependence on exactly the serialization step nobody exercises. Your stated bar is "verified, not assumed" — this property is inspected-by-optimism.
Smallest fix: one unit test next to commandAuditNeverRejects.test.mjs — `vi.doMock` ONLY `models/AiCommandAuditLog.mjs`, import the REAL `recordCommandAudit`, submit an entry shaped exactly as the dispatcher builds it, and assert the captured `create()` payload retains `params.planId` and the distinct `errorCode` (run it for the `handler_plan_absent` variant too, since the codes must remain distinguishable downstream, per M45).
Confidence: that the property is untested — certain. That it is actually dropped — ~40%; if you can show the `create()` payload passing through verbatim, this finding evaporates and the verdict flips to DRY. Everything else I attacked held (see vacuous-tests note for the near-miss).

VACUOUS TESTS: None strictly vacuous — every assertion examined has a live kill condition (I specifically chased M46: the inserted sync throw prevents `recordCommandAudit` from ever being invoked, so the row-existence assertions go truthy-fail — it fires, it is not equivalent). Nearest miss, worth knowing rather than fixing urgently: clientResolverScopeFailClosed.test.mjs, the suggestion-leak check `JSON.stringify(foreign.suggestions || []).not.toContain('Foreign')` weakens to a tautology if a future refactor returns NO suggestions — the assertion would pass without the disclosure channel ever having been populated. A one-line positive control (own-client fuzzy query asserting suggestions are non-empty upstream of the leak test) restores its teeth. It can fail today, so I am not counting it against dryness.

ONE LINE: Add the audit-payload round-trip pin at the model seam, and then push the 18 commits — 9755 passing tests have never been seen by CI, which means none of these guarantees has ever been observed outside your machine.
```
