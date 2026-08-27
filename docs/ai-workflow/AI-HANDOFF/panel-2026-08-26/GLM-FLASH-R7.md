# GLM Consult

**Model:** glm-5.3-flash
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF-R7.md
**Tokens:** 3760 in / 13518 out (reasoning: 12436) | total 17278
**Wall:** 283.2s

---

VERDICT: DRY

Both round-6 conditions are met as delivered, not assumed: the pin exists at the model seam (not just the mock seam), and the grep is clean with the raw hits shown. I attacked all three of the offered surfaces plus the kill conditions; here is what held and what is now on the record as residual.

**1. The model-seam pin — kill conditions traced, all live.**
- `recordCommandAudit` stops putting params on the row → `row.paramsRedacted` is `undefined` → `toEqual({ planId: 72 })` fails.
- Redaction scrubs the id → fails twice: the 5-shape loop (with a message naming the shape) and the row assert. The shape set is well-chosen — `12345678`/`'12345678'` kill a "scrub anything digit-shaped" redactor, `'plan-abc'` kills a strict-numeric whitelist.
- The bystander returns: impl writes the probed id into `targetClientId` → number ≠ null fails; impl stops writing the key → `undefined`, and `toBeNull` is strict, so that fails too. The null is pinned as an *explicit write*, not an absence.
- Subtle one: the throw-mock tests would pass even with a misshapen mock seam (any error inside the try → `false`, same observable), but the row test proves the seam — `create.mock.calls[0][0]` only exists if the mock actually intercepted — which de-vacuousifies them by symmetry. 46/46 mutations reportedly exercise this empirically.

**Honest limit, stated so it's on the record:** the suite pins planId-*survival*, not redaction-*removal*. An implementation that stored raw `params` directly under `paramsRedacted` passes every assertion in this file, because planId survives trivially. Whether the removal axis is pinned lives in the redactor's own suite, which I can't see from here; if it isn't, one assertion — `redactParams({ planId: 72, <sensitive> })` → sensitive gone — closes it. Likewise the upstream join (dispatcher actually passing `params: { planId }`) rests on the contract suite's params assertion, not this file. Neither reopens round 6, which was specifically about persistence of the planId, and that is now pinned at the row.

**2. The grep reading — checks out.**
The four non-schema clusters are consistent with locals: tight hit ranges (2–5 lines, declaration-plus-use shape) in files whose domains — context build, access check, briefs, voice ctx — naturally use the name, none showing an import-the-model-then-read pattern. The strongest positive signal is an absence: the metrics summary, the only named audit-row consumer, does not appear in the hit list at all. A `GROUP BY commandType, outcome` cannot select the column, so it *shouldn't* grep — and it doesn't. Keeping column + index is consistent with the executor's legitimate writes continuing.

Residual a name-grep structurally cannot see, noted but not charged: a `SELECT *` consumer followed by dynamic property access or a spread into a response leaves no identifier to grep. Round 6 pre-registered the identifier grep as the settle condition and it is clean; closing the residual means walking the `AiCommandAuditLog` importers — next hardening, not a reopen.

**3. The positive control — holds, weaker than advertised.**
It can fail (a fully degenerate resolver → `channelIsLive` false → red), so it is not vacuous, and it is strictly stronger than the unguarded `not.toContain` it guards. But the `|| nearMiss.resolved !== null` disjunct proves the *resolver*, not the *suggestion channel*. If `'Adaa'` exactly matches a fixture client, the control passes with zero suggestions and Flash's named tautology — refactor stops suggesting, leak check goes vacuous — revives. Whether that branch is live depends on the fixture I can't see; the name reads as an intentional near-miss (typo-form of an in-scope client), which would make the loose disjunct dead weight rather than a hole. Tightening is one line: drop the second disjunct so the control can only survive on `(suggestions || []).length > 0`. This does not block confirmation — the two pre-registered conditions are met, and this was a voluntarily closed nearest-miss, not part of the settle contract.

VACUOUS TESTS: none. Every assertion traced has a concrete failure mode. Two weakest, for the record: the malformed-entry test's `false` is near-guaranteed by the same catch test 1 pins — its only kill condition is validation hoisted above the try (a plausible refactor, so it stays); and the resolver control's disjunction at `clientResolverScopeFailClosed.test.mjs:~104-106` is weak-but-failable, per attack 3.

Both predictions from round 6 held. This is the DRY they bought.
