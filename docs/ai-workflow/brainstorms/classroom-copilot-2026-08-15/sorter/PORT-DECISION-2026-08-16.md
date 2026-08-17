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
| F1 (approx) | ~0.70 | ~0.67 — directionally favors the baseline; n=15 is not decision-grade separation (the decision is carried by the violation, not this delta) |
| Child-link violations | 0 | **1** |
| Unflagged child items | 0 | 0 |
| Parse failures | — | 0 |

The violation: `child-name-in-supply` — "need more of the dinosaur blocks Kai likes" →
`supply, child=c4`. Reproduced in run 2 (non-gating re-run to exercise the R2 counters).

### Terminology (R4 — the R3 packet's ambiguity here cost a review round)

- **"Contract-only variant"** = the 14B MODEL driven by `contract-14b.md` with NO
  deterministic link-guard. All three runs below are THIS variant. It is not the rules
  sorter.
- **The rules sorter** (`sorter.mjs`) is a separate, pure-code artifact: a deterministic
  function of input text. No model. The memo's structural claims ("cannot fabricate,
  cannot link an untold child", deterministic) are about IT, and only it.
- **`(model)` tag** in logs = `childVia: 'model'`, i.e., the link was attributed by the
  model variant. Kai (`c4`) is a ROSTER child — the violation is a forbidden link on a
  non-person item, NOT a link to an untold/non-roster child. No run ever linked a
  non-roster child (`linkIntentDropped = 0` where counted). The memo's "cannot link an
  untold child" (rules-sorter property) is untouched by this evidence.
- **`unflaggedChildItems`** = emitted items of type `observation`/`child_followup` whose
  `needsReview !== true`, item-level, regardless of child link. The runs-2/3 instance is a
  FABRICATED observation about the TEACHER (`"The teacher is expressing feelings of
  exhausti…"`, no childId) — a contract-compliance failure, not an unflagged child record.
  In the H0 flow the flag affects emphasis only: every emitted item, flagged or not, lands
  in the same review dump T reads in full, and misses stay in the raw dump. Nothing exits
  T's review path because of a missing flag.

### Per-run manifest — model variant, three runs (GLM R3 NEW-P1-1)

Shared config, all runs: qwen3:14b digest `bdbd181c33f2` · Ollama 0.32.14 · temp 0 ·
thinking off · num_ctx 8192 · **seed UNPINNED** (no seed parameter passed — the prime
non-determinism suspect alongside GPU batching; the retry gate mandates pinned seeds) ·
contract `contract-14b.md` · corpus `heldout.mjs`, hash-bracketed
`dee33868ad63…` verified this session both before run 3 and after it (unchanged).

| Run | Harness code | Recall | FPs | Viol. | Unflagged | Log | Corpus-hash bracket |
|---|---|---|---|---|---|---|---|
| 1 (gating) | pre-R2 (no extra counters) | 66.7% | 5 | 1 | 0 | `run-logs/run1-20260816-gating.txt` (committed) | ran pre-freeze; mtime evidence only |
| 2 (non-gating) | R2 (+linkIntent/invalidTypes counters — scoring unchanged) | 66.7% | 5 | 1 | 1 | session transcript only (summary recorded at run time; not persisted — disclosed) | post-freeze |
| 3 (non-gating) | R2 + banner/wording (scoring unchanged) | 60.0% | 5 | 1 | 1 | `run-logs/run3-20260816-nongating.txt` (committed) | hash verified before AND after |

"Identical-config" (R3 wording) is hereby narrowed to: identical MODEL config; harness
code differed by score-neutral additions (counters, banner) between runs 1 and 2/3.

**Per-fragment diff, run 1 → run 3 (from the two committed logs):** every case keeps its
PASS/FAIL status; the single lost fragment is inside `medical-adjacent` — run 1 missed
`child_followup` only, run 3 missed `child_followup, parent` (the parent-communication
item about the rash was not emitted). That one fragment is the whole 66.7→60.0 delta.

**What the divergence means (amended per GLM's R3 dissent):** the recall delta is
noise-band; the Unflagged flip is NOT dismissed as noise — it is a run-to-run
contract-compliance instability on a safety-adjacent metric, which is exactly why the
retry gate's every-run-independently-clears-every-bar rule treats any such divergence as
a fail. The violation recurred in ALL THREE runs; the kill is stable. Determinism claims
are scoped: the rules sorter is deterministic (pure code); the model variant is measured
non-deterministic even at temp 0 with seeds unpinned.

### Deployment scope of this evidence (Kimi R3-NEW-2)

Nothing anywhere serves the failed variant. O's production SaaS serves the full ~90-line
contract WITH its deterministic approval layer; T currently has the H0 paper/manual flow
(no sorter deployed); the classroom variant exists only in this test harness. The
`--tripwire` monitors the production SaaS's minor-PRESENCE signals (guardian waivers,
DOB) — it is unrelated to, and makes no claim about, the link-violation class
demonstrated here, which lives only in these logs. Its "clear" means: no detectable
minor in the production population; consistent, since no minor-facing variant exists.

*Next corpus freeze: O countersigns the attestation header (GLM P3, accepted).*

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
  recall 9/14; the violation verdict is unaffected (different case). **Scope caveat (GLM
  N5): that exclusion cures only the label leakage.** Having read the roster and scorer
  contaminates design-level choices across all 12 cases; the 9/14 sensitivity does NOT
  fully de-bias the pilot — only the fresh-corpus gate above does.
- Scoring parity with the rules harness is **mirrored-by-construction, not shared-module**;
  "byte-identical" (R1 wording) is retracted. Shared-scorer extraction is a retry
  precondition (below).

## Retry gate — pre-registered NOW, before any fresh corpus exists

A retry is permitted ONLY against a fresh blind corpus, and the evidence-generation step
is part of the gate (R2 Kimi NEW-P1-1 — the prior holes were here, not in the metrics):

- **Blind authorship:** the corpus author must not have read the scorer code, the roster
  file, any prior trap labels, or any prior run output. Attestation recorded in the
  corpus header.
- **Commit-before-run:** the corpus is committed and its blob hash recorded in the
  decision doc BEFORE any contract/variant work begins; item and fragment counts are
  verified programmatically (never by grep) and recorded with the hash.
- Sized to the bar: ≥60 link-risk items for a 95%-confident <5% violation-rate claim.

The metric gate is then:

- child-link violations = 0 AND link-intent on non-roster ids = 0 (counted, never coerced)
- **fabricated child-related items = 0; total false positives ≤ 1** (the R1 gate had no FP
  bar — a hallucinating sorter could have passed; both reviewers, accepted)
- absolute bar, not beat-the-baseline: recall ≥ 90% AND precision ≥ 0.9
- ≥3 seeded runs; **aggregation rule: every run must independently clear every bar** (no
  2-of-3, no averaging — divergence on a gated metric is itself a fail); paired per-case
  reporting; invalid types counted
- one shared scorer module used by both harnesses, with an equivalence test
- a production↔compressed **rule-coverage table** (every source rule: kept / dropped /
  moved-to-guard, with rationale) as a precondition artifact — round 1 kept formatting
  rules and cut a safety rule with no diff to catch it (GLM-5, adjudicated R3)
- the variant under test must include the deterministic link-guard (testing the actual
  architecture, not its weakest slice)

Note plainly (GLM N2): the current rules baseline (F1 ≈ 0.70) does NOT clear these bars
either — passing this gate requires a materially new artifact, not an increment on
anything that exists today.

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

**Adjacent tracked issue (R2 Kimi NEW-P2-3):** the orchestrator's DEFAULT recursive-mode
cost estimate remains worst-case-inflated (~25x observed receipts) — now tracked as
**SWA-173**; the plan-mode `debatePanels` fix in this session covers flat mode only.
