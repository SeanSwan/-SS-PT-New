# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/93-PACKET-R3-CONFIRM.md
**Seed:** (none)
**Tokens:** 1567 in / 5642 out | **Cost:** ~$0.0893 | **Wall:** 61.6s | **finish_reason:** stop

---

## FINDING-BY-FINDING

**Kimi NEW-P1-1 = GLM N1 (gate provenance controls) — GENUINELY FIXED.**
The three controls map exactly onto the round-1 failure modes: blind authorship + header attestation (kills the author-contamination vector), commit-before-run with programmatic counts (kills the grep-verified count inflation), and the aggregation rule — every seeded run independently clears every bar, divergence on a gated metric is itself a fail — is the correct fail-closed design, and it is *specifically* the right rule given the new non-determinism data (below). Spot-check supports the mechanics: the blob hash matches the recorded freeze hash and resolves in the object database. Not cosmetic.

**Kimi NEW-P1-2 / GLM N4 (contaminated evidence, n) — GENUINELY FIXED.**
The caveat is on the face of the memo, not in a footnote: 12/15, under-sampled vs the ≥20 spec, author had read scorer+roster, 53.3% demoted to "indicative, not certified." The reframe onto structural properties (cannot fabricate / cannot link an untold child / fail-closed into the dump T already reviews vs. fail-open) is the correct load-bearing argument — it survives the contamination caveat because it doesn't rest on the contaminated numbers. Importantly, the new three-run table *strengthens* rather than undermines this: the violation recurred in all three runs, so the kill is stable under the noise band.

**Kimi NEW-P1-3 = GLM N3 (minors exposure, no deadline/control) — GENUINELY FIXED, with one scope question (NEW-2 below).**
The dated decision (2026-08-23) with "silence gets re-asked, not assumed" closes the open-endedness. The tripwire existing, having run, and being fail-closed on query errors (a broken query = a trip) is real control design, not a promise. Declining to install cron without O naming the scheduler is consistent with repo law (automation needs an owner and a kill switch) and is properly framed as one of three offered choices rather than silently done or silently skipped. Tracker posting confirmed as claimed.

**Kimi NEW-P2-1 (aggregation) — FIXED** via the gate rule above.

**Kimi NEW-P2-2 = GLM N2 ("baseline wins outright") — GENUINELY FIXED.**
"Directionally favors… n=15 is not decision-grade… the decision is carried by the violation" is the honest framing. The added line — the rules baseline (F1≈0.70) does NOT clear the retry bars either, so passing means a materially new artifact — forecloses the quiet-slide risk where "baseline wins" becomes "ship the baseline."

**Kimi NEW-P2-3 (tracker reference) — FIXED.** SWA-173 with fix sketch and file pointers is a real citation, not "tracked separately."

**GLM N5 (sensitivity under-scopes) — FIXED.** Stating that 9/14 cures only label leakage while roster+scorer exposure contaminates design-level choices across all 12 cases is the correct scope admission; "only the fresh-corpus gate de-biases" follows.

**GLM-5 (unadjudicated) — ADJUDICATED, acceptably.** Making the production↔compressed rule-coverage table a named retry-gate *precondition* defers the artifact but binds it to the gate, which is where it has teeth. Acceptable because the gate cannot run without it.

**GLM-8a (no trigger) — FIXED.** "O's next Village need or the option-(b) decision, whichever first" is a named trigger.

## NEW FINDINGS

**R3-NEW-1 (P2) — Run-log provenance is partial, and the "run 3" naming collides.**
Only `run3-20260816-nongating.txt` is evidenced as a committed artifact. The violation line is quoted "verbatim from the run-1 log file," but run-1 and run-2 logs are not stated to be committed — and this entire review loop has established that uncommitted evidence is how round 1 happened. Worse, the committed run-3 log ends "the contract-only variant breaks a hard invariant," while the new table describes three *identical-config* runs with run 3 at 60.0% recall. Either the table's run 3 is the committed log (then "identical-config" is mislabeled — it's a different variant) or it's a fourth, uncommitted run (then the table's provenance is unattested). The kill is stable either way, so this doesn't move the decision — but the fix is cheap: commit run-1/run-2 logs or state their disposition, and disambiguate the run-3 collision in the decision doc.

**R3-NEW-2 (P2) — "TRIPWIRE: clear" is uninterpretable without scope.**
The tripwire is the concrete control answering the minors-exposure P1, but the packet never says (a) what production currently serves, or (b) whether the tripwire's minor-signal queries cover the leak class actually demonstrated — the violation line is a child-preference echo (`"need more of the dinosaur blocks Kai likes"`, c=0.9). If production serves the variant that produces this class of output and the tripwire cleared, either the queries don't cover preference-echo or the signal definition is too narrow; if production serves the baseline, the clear is consistent but should be stated. One line in the decision doc — what serves, what the tripwire queries, and that the demonstrated violation class is in-scope for it — closes this. Without it, the control's evidentiary value for the exact exposure it was built to bound is unverified.

**R3-NEW-3 (P3, nit cluster):**
- "Determinism stated" in the memo needs one qualifier given the new table: the determinism claim must be explicitly scoped to the rules sorter, since the model variant just demonstrated a 6.7-point recall spread and a flipped invariant metric across identical configs. As written, an unqualified "determinism" sentence sits one table away from its own counterexample.
- The 2026-08-23 re-ask has no named owner ("silence gets re-asked" — by whom, on what cadence). The tracker posting likely covers this; say so.
- Blind-authorship attestation is self-reported with no independent check. Acceptable as process — noting it so the gate's reviewers don't over-read it.

## DISSENT

No dispute with the standing declines — no new arguments. I want to be explicit about the shape of this verdict: every R2 finding from both 91 and 92 is genuinely fixed, not cosmetically — the caveats are on the face of the documents, the controls exist and were executed, the hash verifies, and the new non-determinism data was surfaced voluntarily when it would have been easier to omit. The NOT CLEAN rests solely on R3-NEW-1 and R3-NEW-2, both introduced by the new evidence itself, both one-paragraph fixes. Neither touches the decision, the gate design, or the kill's stability.

## VERDICT

**NOT CLEAN** — all R2 findings (91 + 92) verified genuinely fixed; two new P2s (run-log provenance/labeling collision; tripwire-clear scope unattested) introduced by the new spot-check data. Both are cheaply closable and neither reopens any prior finding.
