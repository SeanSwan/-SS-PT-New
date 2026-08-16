# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/90-PACKET-R2-FIX-LEDGER.md
**Seed:** (none)
**Tokens:** 1930 in / 4859 out | **Cost:** ~$0.0787 | **Wall:** 41.7s | **finish_reason:** stop

---

## FINDING-BY-FINDING

- **Kimi-1 ("port is dead" overclaim)** — **ADDRESSED.** Retraction + retitle + corrected Step 9 reasoning is the actual fix, not a wording patch.
- **Kimi-2 (retry gate pre-registration)** — **ADDRESSED with a hole** (see NEW-P1-1): absolute bars, seeded runs, sealed corpus, shared scorer, mandatory guard are all present. But the gate omits the two things whose absence caused this round's provenance failure.
- **Kimi-3 (non-determinism asserted, not measured)** — **ADDRESSED.** Second run executed, divergence quantified, and it is now the stated basis for the ≥3-run requirement. Genuine.
- **Kimi-4 (provenance)** — **ADDRESSED as disclosure; mitigation is COSMETIC-ADJACENT.** Freezing as-found (`dee33868ad63`) and disclosing author-exposure is honest. But the offered mitigation — "excluding that case → 9/14" — treats only the *trap-label* exposure of case 1. The author also read the **scoring code and the roster** before authoring. That exposure taints all 15 fragments, not one. Exclusion of case 1 does not restore corpus validity; it only removes the most visible symptom. The correct consequence is drawn anyway (fresh corpus for retry), so I do not escalate this to a finding against the decision doc — but I do against the option memo (NEW-P1-2).
- **Kimi-5 (scorer equivalence / harness counting)** — **ADDRESSED.** "Byte-identical" retracted, shared scorer is a precondition, `linkIntentDropped` in the pass gate, invalid types never coerced. Real.
- **Kimi-6 (bug persists by default)** — **DECLINED-DISPUTED (soft).** I accept the scoping argument: flat mode is env-flagged, the fix mirrors code mode, and over-pricing is the safe direction. But "tracked separately" with no issue ID, no link, no owner is a parking lot, not a disposition. Cite the tracker reference in the decision doc or this reappears in R3. (NEW-P2-3.)
- **Kimi-7 (seat/pricing drift)** — **ADDRESSED, unverifiable from the ledger.** A single constant consumed by both gate and seat definitions is the correct structural fix *if* the constant covers every priced seat (2A/2B/2C are named; synthesis/Phase-1 seats are not mentioned). I cannot verify coverage from a fix ledger; flagging as residual verification debt, not a finding.
- **Kimi-8 (minors claim)** — **ADDRESSED, and the new data is worse than my finding assumed — disclosed, which is correct.** The narrowed claim ("DOB classifies only 4/7") is honest. Residual exposure is not closed, however (NEW-P1-3).
- **Kimi-9 / DISSENT (deny-by-default in chat route)** — **DECLINED-DISPUTED.** "Product/legal change on a revenue path, O's call" is a legitimate reason not to execute unilaterally. It is *not* a legitimate reason to leave the path open with zero active controls and no decision deadline while a NULL-DOB user actively uses AI chat. See NEW-P1-3.
- **Kimi-10 (delivery to O)** — **ADDRESSED.** Memo shipped, plan ledger has per-step owners.
- **Kimi-11 (git sweep / history rewrite)** — **LEGITIMATELY DECLINED.** Repo law on unsanctioned rewrites is a valid constraint; offering the rewrite to O with the manifest published is the correct disposition.
- **Kimi-12 (live paid run)** — **LEGITIMATELY DECLINED.** Labeled "done minus live run," not "fixed." Honest scoping.
- **Kimi-13/14 (design notes, roster local-only)** — **ADDRESSED.** Stamped into contract header + harness, not just notes.

## NEW FINDINGS

**NEW-P1-1 — Retry gate repeats the provenance failure mode.** The pre-registered gate specifies a "fresh SEALED corpus" but does not specify (a) **blind authorship** (author must not have read the scorer, the roster, or prior trap labels) or (b) **commit-before-run with recorded hash** (this round's corpus was *never committed* — "sealed" must mean a frozen blob hash recorded before any run, with programmatic item-count verification, since the "20 cases" figure came from a sloppy grep). Without these two clauses, the gate pre-registers metrics while leaving the evidence-generation step exactly as broken as the run that just failed. Add both clauses; they cost nothing.

**NEW-P1-2 — Option memo recommendation (a) rests on contaminated evidence.** "Ship the rules sorter now (53.3%/0FP/0violations)" — those numbers were measured on the 12-case corpus whose author had read the scoring code and roster. The contamination argument the ledger itself makes against the model results applies symmetrically to the rules-sorter metrics that justify the memo's primary recommendation. The memo must disclose this provenance on its face, or (a) is being sold to O on evidence the packet elsewhere declares unreliable.

**NEW-P1-3 — Open child-data exposure with no deadline and no interim control.** The combined effect of two legitimate declines (GLM-1 mitigations, Kimi-9 deny-by-default) plus a backlog-logged tripwire is: a production chat route with one unclassifiable active user, no deny-default, no attestation, no tripwire, and no date by which O must decide. Each individual decline is defensible; the *aggregate state* is not. The packet must contain an explicit interim risk-acceptance request to O **with a decision deadline**, and the tripwire (SELECT/COUNT-only, no auth surface needed — by the ledger's own GLM-1 rebuttal) should be *scheduled*, not backlog-logged. The probe's own rebuttal removes the cost excuse for the tripwire.

**NEW-P2-1 — Gate aggregation rule undefined for a non-deterministic model.** "≥3 seeded runs" — pass criterion unstated (all 3 must clear the bars? 2 of 3? distribution reported?). Given measured run-to-run divergence on exactly the gated metric (unflagged child items 1 vs 0), an undefined aggregation rule is a future dispute baked into the gate. Specify: all runs must independently clear all bars.

**NEW-P2-2 — "Baseline wins outright" is small-n overreach.** F1 0.70 vs 0.67 on n=15 fragments is not decision-grade separation; the decision is carried by the violation, not the F1 delta. Temper the language or publish intervals. Also state the rules sorter's downstream failure mode (fail-open vs fail-closed) in the memo — 53.3% recall shipping to production needs that context.

**NEW-P2-3 — "Tracked separately" without a reference** (estimator-inflation issue, Kimi-6 disposition). Cite the tracker ID in the decision doc.

## DISSENT

I maintain my dissent on the paid-panel escalation tier. The ledger's answer — "repo constitutional law; reviewer preference does not override" — is procedurally correct and substantively evasive. A constitution that mandates a paid-panel escalation for a 7-user, personally-known-adult population with 12 waivers is miscalibrated to the actual risk surface, and "the law requires it" is an argument about the document, not about the risk. I am not asking the agent to violate the constitution; I am recording that the constitution itself should be amended (a Sean-gated edit, same mechanism as the 5(a) clause restoration the ledger already proposes). Noted as continuing dissent, not a blocking finding.

## VERDICT

**NOT CLEAN.**

Every R1 finding of mine is addressed or declined with a defensible reason — the ledger is honest, and several disclosures (corpus recount, never-committed provenance, measured non-determinism, NULL-DOB data) are *worse than reported* and were surfaced voluntarily, which is the correct behavior. But three new P1s exist: the retry gate omits blind-authorship and commit-before-run (the exact holes that produced this failure), the option memo's primary recommendation stands on the contaminated corpus the ledger itself discredits, and the minor-exposure path sits open with no deadline and no active control. Fix those three; the P2s are cheap.
