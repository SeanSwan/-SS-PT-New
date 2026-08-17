# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/93-PACKET-R3-CONFIRM.md
**Tokens:** 1487 in / 16173 out (reasoning: 14350) | total 17660
**Wall:** 221.5s

---

**R3 CONFIRMATION — review 93 (GLM seat).** Spot-checks executed myself, this session, per my own R2 dissent:

- `git hash-object sorter/heldout.mjs` → `dee33868ad63ff91524f1fb0ecd119fdde22da98` — matches the recorded freeze hash; `git cat-file -t` → `blob`. ✓ (ordering caveat → NEW-P2-2)
- `sorter/run-logs/run3-20260816-nongating.txt` — committed; tail is the quoted RESULT line, verbatim. ✓
- Run-1 log contains the violation line verbatim, including the `child=c4(model)` tag. ✓
- Programmatic counts reproduce: 12 / 15 / 3. ✓

## FINDING-BY-FINDING

1. **GLM N1 / Kimi NEW-P1-1 — gate provenance.** GENUINELY FIXED. The gate now binds the evidence-generation step itself: blind-authorship attestation in the corpus header, commit-before-run blob pre-registration, programmatic counts, per-run independence with divergence-as-fail. The blob check shows the discipline is real, not aspirational. P3 note: the attestation is self-attested; at the next freeze, have O countersign the header.
2. **GLM N2 / Kimi NEW-P2-2 — "baseline wins outright."** GENUINELY FIXED. "Directionally favors… n=15 is not decision-grade… carried by the violation," plus the plain statement that the rules baseline (F1≈0.70) also fails the bars. The overclaim class is gone; the memo now errers on the correct side.
3. **GLM N3 / Kimi NEW-P1-3 — minors exposure.** GENUINELY FIXED. The not-optional section, the 2026-08-23 date, a tripwire that exists and ran with the right semantics (exit 2 on signal; broken query counts as a trip — fail-closed), the tracker post, silence-re-asked-not-assumed. Residual risk is real but now O-owned and time-boxed. P3: define the re-ask cadence if the deadline passes silent, so "re-asked" can't decay into "indefinitely re-asked."
4. **GLM N4 / Kimi NEW-P1-2 — memo caveats/n.** GENUINELY FIXED as to R2: contamination, n, and indicative-not-certified are on the face; the case is re-rooted in structural properties. However, the fix's closing clause — "Determinism stated" — collides with this same packet's new three-run table. That is not the old defect recurring; it is a new one (NEW-P1-1). Fix accepted; memo not yet.
5. **GLM N5 — sensitivity scope.** GENUINELY FIXED. 9/14 cures label leakage only; roster+scorer exposure contaminates design-level choices across all 12; only the fresh-corpus gate de-biases. Correctly scoped, plainly stated.
6. **Kimi NEW-P2-1 — aggregation.** GENUINELY FIXED, and honored in practice: the divergence-producing runs were labeled *non-gating* rather than laundered toward a pass — under the new rule they would auto-fail. The gate has teeth and the team bit them.
7. **Kimi NEW-P2-3 — tracker reference.** GENUINELY FIXED. SWA-173 exists with fix sketch and file pointers; the ID resolves and the decision doc cites it.
8. **GLM-5 — rule-coverage table.** GENUINELY FIXED. A named retry-gate precondition artifact; the table is now load-bearing, not decorative.
9. **GLM-8a — live paid run trigger.** GENUINELY FIXED. "O's next Village need or the option-(b) decision, whichever first" is concrete and checkable.

Nine of nine genuinely fixed. None cosmetic.

## NEW FINDINGS

**NEW-P1-1 — The three-run divergence table is unattributed, and on its natural reading contradicts the amended memo.** The packet calls them "three identical-config runs," then separately identifies run 3 as "the contract-only variant." Both cannot be innocently true:

- *If all three runs are contract-only:* (a) a model-free path diverges run-to-run on frozen input — recall 66.7→60.0 is exactly one of 15 fragments flipping, and Unflagged flips 0→1 — so "determinism stated" is contradicted by committed logs unless scoped and unless the entropy source is named (stochastic scorer? seed not threaded through every call? shared state?); (b) run 1's verbatim violation is `supply c=0.9 child=c4(model)` — the contract-only variant linking supply to a model-origin, i.e. *untold*, child — which contradicts the on-its-face claim "cannot link an untold child" that the reframed option-(a) case now rests on. The kill is stable, yes; but the memo's surviving case for (a) would then be an assertion plus one committed log against it.
- *If the table rows are a different (model-assisted) config than run 3:* then "identical-config" is false as written, and there are two distinct "run 3"s with no manifest disambiguating them — a provenance defect in a packet whose entire purpose this round is provenance.

Required before CLEAN: a per-run manifest (variant, config, seed(s), corpus hash before/after, log path, commit) for all three runs; a per-fragment diff of run 1 vs run 3 localizing the flip; the determinism claim scoped ("deterministic given fixed input and fixed scorer seed — see manifest") or withdrawn; and an explicit reconciliation of the c4(model) link against "cannot link an untold child."

**NEW-P2-1 — Unflagged is undefined and its flip is unassimilated.** Run 2 shows Unflagged=1 at unchanged recall vs run 1 — internally coherent only under an unstated definition (fragment- vs case-level; relation to the 3 zero-expect fragments). In a child-safety frame, a miss count that varies on frozen input means the review dump varies run-to-run; the memo's fail-closed assurance ("misses stay in the dump T already fully reviews") must show the flipping fragment lands inside that path. Define metric denominators in the decision doc; commit the dump diff.

**NEW-P2-2 — Hash bracketing / run isolation.** Commit-before-run pre-registers but does not post-verify. Given unexplained divergence, each evidence run should record the corpus hash before AND after execution, and all three run logs — not only run 3 — should be committed and listed in the manifest. The packet's hash check "executed this session" has no stated ordering relative to run 3. Cheap; it closes (or confirms) the shared-mutable-state hypothesis.

P3s (non-blocking): O countersignature on the next corpus attestation; re-ask cadence post-deadline; bundle the Sean-gated paid-panel amendment into the 2026-08-23 ask so one O-touch carries all three child-safety items.

## DISSENT

- One framing objection: "the kill is stable; every recall figure is noise-banded" quietly downgrades the Unflagged flip to a precision nuisance. A safety miss-count that won't hold still on frozen input is not noise-band territory (NEW-P2-1). That sentence should not survive into the next packet unchanged.
- Standing declines: no new argument against any of them, and each now carries its mitigation (deadline, trigger, or recorded amendment path). History rewrite remains correctly declined under repo law.

## VERDICT

**NOT CLEAN.**

All nine ledger items are genuinely fixed — this was not a cosmetic round, and self-reporting the divergence data is exactly the behavior the loop is meant to induce. But a confirmation packet may not introduce a decision-grade evidence table that is unattributed and, on its natural reading, contradicts the determinism and cannot-link claims the amended memo now rests on. NEW-P1-1 blocks; NEW-P2-1/2 ride along. The path to CLEAN is short and fully specified: run manifests, per-fragment diff, scoped determinism statement, metric definitions, hash bracketing.
