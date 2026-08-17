# R3 CONFIRMATION PACKET — after your R2 verdicts (91-GLM, 92-Kimi, both NOT CLEAN)

## REMIT
Confirmation round. Every P1/P2 from both R2 verdicts has been addressed (ledger below,
keyed to your numbering). Verify genuinely-fixed vs cosmetic; surface anything NEW. Same
output format (`## FINDING-BY-FINDING`, `## NEW FINDINGS`, `## DISSENT`, `## VERDICT`
CLEAN / NOT CLEAN). Two consecutive CLEAN verdicts end the loop. Privacy frame unchanged.

## FIXES SINCE PACKET 90 (all committed, leak-gated)

**Kimi NEW-P1-1 = GLM N1 (gate omits the provenance controls that caused round 1):**
The retry gate now has an "evidence-generation step is part of the gate" section:
(a) blind authorship — corpus author must not have read scorer, roster, prior trap
labels, or prior run output; attestation in the corpus header; (b) commit-before-run —
blob hash recorded in the decision doc before any variant work; item/fragment counts
verified programmatically, never by grep; (c) aggregation rule — every seeded run must
independently clear every bar; no 2-of-3, no averaging; divergence on a gated metric is
itself a fail.

**Kimi NEW-P1-2 / GLM N4 (option memo rests on contaminated evidence, needs n):**
The memo now carries, on its face: the numbers rest on 12 cases / 15 fragments of an
under-sampled corpus (spec said ≥20) whose author had read scorer+roster; 53.3% is
"indicative, not certified." The case for option (a) is reframed on what survives the
caveat — the rules sorter's structural properties (cannot fabricate, cannot link an
untold child; fail-closed: misses stay in the dump T already fully reviews) vs the
model's fail-open mode. Determinism stated.

**Kimi NEW-P1-3 = GLM N3 (minors exposure open with no deadline/control):**
Three concrete changes: (1) the memo O reads now contains a "One decision that is NOT
optional" section — decide by **2026-08-23**: accept interim risk explicitly / schedule
the tripwire / order the gate slice now; silence gets re-asked, not assumed. (2) The
tripwire EXISTS and RAN: `--tripwire` mode on the probe exits 2 on any nonzero minor
signal, fail-closed on query errors (a broken signal query counts as a trip); executed
this session → "TRIPWIRE: clear", exit 0. Scheduling it is one of the three offered
choices (agent does not install cron jobs on O's machine without O naming the scheduler —
automation requires an owner and a kill switch by repo law). (3) The dated decision
request is posted to the production tracker issue.

**Kimi NEW-P2-1 (aggregation)** — folded into the gate as above.
**Kimi NEW-P2-2 = GLM N2 ("baseline wins outright"):** replaced with "directionally
favors the baseline; n=15 is not decision-grade separation; the decision is carried by
the violation." Also added plainly: the rules baseline (F1≈0.70) does NOT clear the
retry bars either — passing means a materially new artifact.
**Kimi NEW-P2-3 ("tracked separately" without reference):** the estimator-inflation
issue now has a real tracker ID (SWA-173, backlog, with fix sketch and file pointers),
cited in the decision doc.
**GLM N5 (sensitivity under-scopes):** decision doc now states the 9/14 exclusion cures
only label leakage; roster+scorer exposure contaminates design-level choices across all
12 cases; only the fresh-corpus gate de-biases.
**GLM-5 (formally unadjudicated in R2):** now adjudicated — the production↔compressed
rule-coverage table (every source rule: kept/dropped/moved-to-guard, with rationale) is
a named retry-gate precondition artifact.
**GLM-8a residual (no trigger for the live paid run):** ledger now names the trigger —
O's next Village need or the option-(b) decision, whichever first.

## SPOT-CHECK EVIDENCE (GLM's dissent demanded R3 verify, not trust)

- **Corpus blob:** `git hash-object sorter/heldout.mjs` → `dee33868ad63ff91524f1fb0ecd119fdde22da98`
  (matches the recorded freeze hash exactly); `git cat-file -t dee33868…` → `blob` (exists
  in the object database). Executed this session.
- **Run evidence:** run 3 executed teed to a committed file: `sorter/run-logs/run3-20260816-nongating.txt`
  — open it; it ends `RESULT: FAILED — the contract-only variant breaks a hard invariant`.
- **NEW DATA — the non-determinism is worse than R2 reported.** Three identical-config runs:

  | Run | Recall | FPs | Violations | Unflagged |
  |---|---|---|---|---|
  | 1 | 66.7% | 5 | 1 | 0 |
  | 2 | 66.7% | 5 | 1 | 1 |
  | 3 | 60.0% | 5 | 1 | 1 |

  Recall spans 6.7 points across identical configs; an invariant metric flipped; the
  violation recurred in ALL THREE runs. The kill is stable; every recall figure is
  noise-banded. Recorded in the decision doc with this table.
- **Violation line, verbatim from the run-1 log file:**
  `-> supply  c=0.9 child=c4(model) "need more of the dinosaur blocks Kai likes"`.
- **Corpus counts, programmatic:** 12 cases / 15 fragments / 3 zero-expect (node import,
  not grep). Recorded.

## STANDING DECLINES (unchanged from packet 90 — dispute only with new argument)

History rewrite of the sweep commit (offered to O, not executed — repo law); live paid
flat run (spend permission is O's; trigger now named); interim product/legal mitigations
(O's call, now with a deadline); paid-panel escalation tier for child-data paths (repo
constitutional law; Kimi's amendment proposal is recorded for O as a Sean-gated edit).
