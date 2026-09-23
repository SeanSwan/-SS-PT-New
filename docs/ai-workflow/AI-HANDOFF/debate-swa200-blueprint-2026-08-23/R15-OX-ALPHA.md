# Consult reply — Ox Alpha (stealth/ox-alpha) — 2026-08-23T21:41:20.978Z

> tokens: prompt=8647 completion=1560 | finish_reason: stop | max_tokens: 60000

## Rehearsal result: NOT CLEAN — three small defects, none blocking past ~15 minutes

Walked it literally: 0.1 → checkout #68 → baseline section 8 → start B0/A1 while waiting on Sean. The two Round-14 fixes hold. What a third path surfaces:

### 1. Section 2's own status table goes stale the moment B0 lands *(the doc's self-declared bug class, committed by the doc)*

The table describes the shipped guard as:

> lock → verify → pending-set → **backup** → runs migration as its child

B0 deletes the backup step. From the first commit of B0 onward, this row is false, and the header explicitly warns that stale self-references are how the next defect gets made. An agent re-reading section 2 mid-B0 will either think they broke something or "restore" the spawn. Add one clause: *"B0 removes the backup step; this row describes #68 as merged, pre-B0."*

### 2. A1's exit-code contract implies changing existing behavior, but never says so

"A1 · build exactly this" reads like an *addition*. But the contract — always emit POST, propagate the child's exit code as the guard's own — is a statement about the guard's **current** top-level control flow, and nothing confirms the present code already propagates rather than exiting 0 in warn mode. An implementer will spend ten minutes reading `decideOutcome`'s callers to find out whether they're adding a feature or rewiring one. One sentence fixes it: *"verify current propagation behavior first; if the guard currently swallows a non-zero child exit in warn mode, changing that IS part of A1."*

Related nit, same area: the 7.1 example shows `"mode":"warn"` alongside `"fatalInWarn":true`. Correct per the spec, but the field name invites a misread ("fatal *in* warn?" vs. "would be fatal if this were enforce"). Rename to something like `migrationFailureFatal` or add a one-line legend under the wireframe.

### 3. Baseline instruction has an ordering trap

B0 says "run section 8's suite **before** you start," but section 8's third command (`gh workflow run migration-shadow-check.yml`) is a queued CI round-trip, and the constitution-guard test note warns about 44–61s false failures. An agent who kicks off all three and starts editing while CI runs will get a red baseline they can't attribute. Say: *baseline the two local suites synchronously; fire the shadow check and treat it as background confirmation, not part of the green baseline.*

---

**What did NOT bite, confirming prior rounds held:** pooler path confusion (0.3), prod-DATABASE_URL instinct (0.2), missing-files-on-main (0.1), red-suite panic (B0 note), entryImports temptation (explicitly cut with reasoning intact).

Fix items 1–2 (one paragraph each) and item 3 (one sentence); then this is usable as written.
