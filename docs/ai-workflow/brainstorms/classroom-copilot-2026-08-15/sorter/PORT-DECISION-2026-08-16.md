# Step 5(b) — Port test result: CONTRACT-ONLY VARIANT FAILED (pilot; hypothesis unresolved)

> **Revision 2 — after the GLM 5.3 + Kimi K3 + pre-read hostile round (files 86/87/88).**
> R1 of this doc titled the result "the port decision" and "the port hypothesis is dead."
> Both reviewers correctly attacked that as overclaim: the run tested the WEAKEST
> architectural variant (compressed contract, NO deterministic link-guard), with a known
> authoring defect, on a corpus smaller than prescribed. What died is **variant 1**. The
> hypothesis — model proposals + a deterministic approval layer that owns writes — is
> **unresolved and untested**, because the deterministic layer that defines it was absent
> from the test. Step 9 stays BLOCKED (bar unchanged); the reasoning below is corrected.

## The run (pinned)

2026-08-16 · `node model-heldout-run.mjs` · **qwen3:14b, digest `bdbd181c33f2`, Ollama
0.32.14, temp 0, thinking off, num_ctx 8192, single run** · contract: `contract-14b.md`
(~30-line compression of the ~90-line production proposal contract) · corpus:
`heldout.mjs` frozen at blob `dee33868ad63` (commit `50850bce8`).

**Corpus correction:** the corpus is **12 cases / 15 expected fragments / 3 zero-expect
trap cases** — NOT "20 cases" as R1, the handoff, and the review packet stated (a `grep -c`
counted ids inside item bodies; assert-without-checking). The prescription said "≥20
prompts"; **the run under-sampled the prescription.** This weakens every recall statement
further; it does not touch the violation.

## Results

| Metric | Rules baseline | 14B + compressed contract |
|---|---|---|
| Recall (15 fragments) | 53.3% (8/15) | 66.7% (10/15) — single sample, n too small; CI spans the baseline |
| Precision (approx) | 1.00 (8/8, 0 FP) | ≤0.67 (10 of ≥15 emitted) |
| F1 (approx) | ~0.70 | ~0.67 — **the baseline wins outright, violation aside** |
| Child-link violations | 0 | **1** |
| Unflagged child items | 0 | 0 |
| Parse failures | — | 0 |

The violation: `child-name-in-supply` — "need more of the dinosaur blocks Kai likes" →
`supply, child=c4`. Reproduced in run 2 (non-gating re-run to exercise the R2 counters).

**Non-determinism confirmed empirically:** run 2, identical config, diverged from run 1 —
unflagged child items 1 (was 0), while the violation and the 5 FPs recurred. Temp-0 Ollama
is NOT cross-run deterministic (Kimi-3's attack, now measured, not asserted). This is why
the retry gate requires ≥3 seeded runs all passing: a single clean run proves nothing.

## What the result actually supports

1. **Variant 1 (contract-only, this compression) FAILED** — violation + 5 fabricated
   items (including a self-care task invented from purely emotional input) + F1 below
   baseline. This is solid: the kill condition is reproducible and the precision loss is
   structural, not noise.
2. **The hypothesis is NOT resolved.** The production pattern under port includes a
   deterministic approval layer owning writes; link-suppression belongs in that layer as
   much as in the prompt (Kimi's dissent, accepted). A contract+deterministic-guard
   variant was never tested.
3. **The sharper lesson stands:** the "don't link a child named inside a non-person item"
   rule was never prompt-borne even in production — it lives in code. **Prompt contracts
   cannot carry code-shaped invariants at any length.** Any viable variant puts the
   invariant in a deterministic post-validator.

## Contamination + blinding disclosure (honesty section)

- The corpus was **never committed by its authoring session**; it existed only as a
  working-tree file until frozen today (blob above). Weak provenance: corpus mtime 05:21
  vs contract authoring 16:09 same day.
- The contract author (this agent) had read, before authoring: the roster, the harness
  scoring code, and the FIRST case's trap label ("negated need"). The contract's negation
  rule is therefore possibly informed by the corpus. Excluding `negation-supply`: model
  recall 9/14; the violation verdict is unaffected (different case).
- Scoring parity with the rules harness is **mirrored-by-construction, not shared-module**;
  "byte-identical" (R1 wording) is retracted. Shared-scorer extraction is a retry
  precondition (below).

## Retry gate — pre-registered NOW, before any fresh corpus exists

A retry is permitted ONLY against a fresh blind corpus (author has never seen it; sealed
by commit hash before any contract/variant work) sized to the bar (≥60 link-risk items for
a 95%-confident <5% violation-rate claim), and the gate is:

- child-link violations = 0 AND link-intent on non-roster ids = 0 (counted, never coerced)
- **fabricated child-related items = 0; total false positives ≤ 1** (the R1 gate had no FP
  bar — a hallucinating sorter could have passed; both reviewers, accepted)
- absolute bar, not beat-the-baseline: recall ≥ 90% AND precision ≥ 0.9
- ≥3 seeded runs, all passing; paired per-case reporting; invalid types counted
- one shared scorer module used by both harnesses, with an equivalence test
- the variant under test must include the deterministic link-guard (testing the actual
  architecture, not its weakest slice)

This seen corpus remains valid for **attribution and regression only** (e.g., a clearly
labeled non-gating thinking-on probe), never for gating.

## Design notes for any retry (from the panel, accepted)

- Constrained decoding (JSON schema/grammar) instead of trusting fence discipline —
  "0 parse failures" was luck, not structure.
- Replace the magic incident literal body-string with a structured flag
  (`subtype: "incident"`) consumed by the approval layer.
- Explicit routing for affect-only content (no items, or observation+needsReview) — the
  fabricated self-care task came from this hole.
- Roster-in-prompt is acceptable ONLY while the model is local; record that constraint in
  the approval layer's config validation. Harness logs must not persist roster+dump text.
- Add parent-comms link traps to the fresh corpus (current corpus tests link-suppression
  on supply only).
