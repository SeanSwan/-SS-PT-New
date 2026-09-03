# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF-R7.md
**Tokens:** 3760 in / 12027 out (reasoning: 11183) | total 15787
**Wall:** 205.7s

---

```
VERDICT: DRY
```

**1. The model-seam join (your #1) — traced every kill condition.** Drop `params` from the entry → `paramsRedacted` is `{}`/undefined → `toEqual({ planId: 72 })` fails. Stop storing the redactor's result → fails. Scrub planId in the redactor → fails twice (loop test and row test). Hoist planId into `targetClientId` → `toBeNull()` fails. Drop `errorCode` → fails. Never reach `create` → `toHaveBeenCalledTimes(1)` fails. The property round 6 demanded is pinned at the row: WHICH plan was probed survives, and the bystander doesn't. One honest residual, named rather than inflated: because the payload is exactly `{ planId: 72 }`, the row test cannot distinguish `redactParams(params)` from raw passthrough — the `recordCommandAudit`→`redactParams` edge is now the one unpinned edge on that path. It's not a live defect (the dispatcher call site sends only planId), but it is the same borrowed-invariant shape this file exists to kill, one link down the chain: add a would-be-scrubbed key to the row test's params and assert its absence. Next-round hardening, not this round's blocker.

**2. The grep reading (your #2) — held, with one boundary stated.** The hits partition cleanly: two schema pairs (migration + model) that should remain since the executor still writes the column legitimately; four service clusters (context engine, clientAccess, brief dispatcher, voice tier) where `targetClientId` is the natural name for the client a command targets — none is a plausible reader of the audit model; and the one real consumer (metrics, grouping by `commandType, outcome`) selects neither column. The boundary: a name-grep is blind to attribute-agnostic reads — an `findAll()` with no `attributes` would consume the column without ever typing it. Your safety there rests on the inventory claim that metrics is the only consumer of audit rows, which this grep corroborates but does not alone prove. Nothing in the hits contradicts it; I accept it as established from prior rounds.

**3. The positive control's disjunction (your #3) — too loose to prove the channel, not too loose to do its job.** Two loosenesses: the `resolved !== null` arm means the control passes in a world where suggestion generation is entirely dead, provided 'Adaa' exact-resolves — whether that world exists depends on the fixture ('Adaa' reads as a deliberate near-miss, in which case the arm never fires); and it probes an in-scope query while the leak assertion runs on the out-of-scope 'Bo' query, so a scope-filtering refactor can empty Bo's list with the control green. Why it doesn't block: in every world where the control is green-but-useless, Bo's list is empty, an empty list cannot disclose Bo, and any world where the list contains 'Foreign' fails the leak assertion outright, control or no control. The disjunction can cost you *coverage* of the negative assertion; it cannot cost you a *missed leak*. Tighten when convenient (assert suggestions non-empty, drop the resolved arm) — hygiene, not a defect.

```
VACUOUS TESTS: none. Every assertion shown can fail: the three resolves-to-false
(reject, or return true), the redactor loop (planId scrubbed), all four row expects
(kills traced in attack 1), the import smoke (undefined export), the control (both
arms false), and the leak assertion ('Foreign' present). The closest candidate is
the control's resolved-arm — it can satisfy liveness without the suggestion channel
being live — but the assertion as a whole can fail, and the leak assertion it guards
cannot be fooled into a false pass, which is why it is argued in attack 3 rather
than listed here.
```
