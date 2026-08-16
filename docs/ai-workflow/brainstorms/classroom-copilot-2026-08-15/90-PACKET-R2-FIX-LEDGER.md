# R2 FIX LEDGER — responses to reviews 86 (GLM) and 87 (Kimi)

## REMIT
You previously reviewed packet 85 and returned REVISE. This packet is the fix ledger.
Your job now: (1) verify each of YOUR findings is genuinely addressed or legitimately
declined — attack cosmetic fixes; (2) surface anything NEW the fixes broke or revealed.
Full-spectrum still applies; DISSENT still mandatory. Output format:
`## FINDING-BY-FINDING` (your findings, each: ADDRESSED / COSMETIC / DECLINED-DISPUTED) ·
`## NEW FINDINGS` (P0/P1/P2) · `## DISSENT` · `## VERDICT` (CLEAN / NOT CLEAN).
Verdict CLEAN means: no finding of yours remains unaddressed-without-reason and no new
P0/P1 exists. Privacy frame unchanged (T, C1..Cn, O, "the production SaaS").

## WHAT CHANGED (all committed; leak-gated)

**The decision doc was rewritten (R2), accepting the convergent P0s:**
- Retitled: "CONTRACT-ONLY VARIANT FAILED (pilot; hypothesis unresolved)." "Port is dead"
  retracted as overclaim [GLM-DISSENT, Kimi-1]. Step 9 stays blocked; reasoning corrected:
  the tested variant lacked the deterministic link-guard that DEFINES the pattern
  [Kimi-DISSENT accepted].
- Retry gate pre-registered NOW: fabricated child items = 0, total FP ≤ 1, absolute bars
  (recall ≥90%, precision ≥0.9) not beat-the-baseline, ≥3 seeded runs, ≥60 link-risk-item
  fresh SEALED corpus, shared scorer + equivalence test, link-intent and invalid-type
  counted never coerced, variant must include the deterministic guard [GLM-2, Kimi-2/3/5].
- Precision/F1 computed and published: rules ≈0.70 F1 vs model ≈0.67 — the baseline wins
  outright, violation aside [GLM-3].
- **Corpus correction (worse than you knew):** re-counting the corpus programmatically
  found **12 cases / 15 fragments / 3 zero-expect**, NOT "20 cases" as the packet told you
  — the 20 came from a sloppy grep. The run under-sampled the prescription's ≥20. Disclosed
  in the decision doc [GLM-12 was right to smell it].
- **Provenance (also worse than you knew):** the corpus was NEVER COMMITTED by its
  authoring session — no commit-order proof existed at all. It is now frozen as-found
  (blob `dee33868ad63`). Weak mtime evidence: corpus 05:21 vs contract 16:09 same day.
  Author-exposure disclosed: the contract author had read the roster, the scoring code,
  and the FIRST case's trap label before authoring; excluding that case → 9/14, violation
  unaffected [Kimi-4, GLM-14].
- **Non-determinism measured, not asserted:** a second identical-config run diverged
  (unflagged child items 1 vs 0; violation + 5 FPs recurred). Documented; it is now the
  stated reason the retry gate demands ≥3 seeded runs [Kimi-3, GLM-4].
- "Byte-identical scoring" retracted → "mirrored-by-construction"; shared-scorer module is
  a retry PREcondition [GLM-6, Kimi-5].
- Design notes recorded: constrained decoding, structured incident flag replacing the
  magic literal, affect-only routing, parent-comms traps for the fresh corpus, roster
  local-only constraint (also stamped into the contract header + harness) [Kimi-13/14].

**Harness:** counts `linkIntentDropped` (non-roster childId — in the pass gate, must be 0)
and `invalidTypes` (kept as FPs, never coerced); prints an ATTRIBUTION-ONLY banner; verdict
line reworded to variant-scope [GLM-7, Kimi-5].

**Orchestrator:** `PLAN_DEBATE_SEATS` is now a single constant consumed by BOTH the spend
gate and the Phase 2A/2B/2C seat definitions — the gate prices exactly the models that run;
drift is structurally impossible within plan mode [GLM-8b, Kimi-7]. Runtime/env coupling
was verified: the debate engine reads the same env var (recursive-consensus.mjs:50);
env-set-without-budget-profile over-prices, the safe direction [GLM-8c].

**Minors probe:** added sanity totals + DOB-coverage denominators. New data: 7 users / 12
waivers (tables non-empty → zeros are real, answering the manufactured-zeros attack), and
**3 of 7 users have NULL DOB, 1 of whom uses AI chat** — claim narrowed accordingly in the
handoff ("no minor detectable by either signal; DOB classifies only 4/7; current population
is O's personally-known adults") [Kimi-8, GLM-1].

**Delivery [GLM-11, Kimi-10]:** `89-OPTION-MEMO-FOR-O.md` shipped — one page: (a) ship the
rules sorter now (53.3%/0FP/0violations, the only never-violating artifact), (b) fresh-
corpus retry under the new gate, (c) hybrid model-proposes/rules-verifies; recommendation
(a) now, decide (b)/(c) after the H0 gate and T's month-end answer. Plan ledger with an
owner per step (1–10) added to the handoff.

**Git sweep [GLM-9, Kimi-11]:** full 19-file manifest + scanner identity + push status
(LOCAL-ONLY, never pushed, no deploy link) published in the coordination log. History
rewrite is offered to O as an option — his call, not the agent's (repo law forbids
unsanctioned rewrites even on unpushed work).

**5(a) [GLM-13]:** clause-level diff recorded: main's revision ADDS three clauses, DROPS
two explanatory parentheticals (listed verbatim in the draft file); restoring them = a
Sean-gated constitution edit.

## DECLINED / DISPUTED (with reasons — attack these if wrong)

- **"Interim mitigations this week" (age attestation, ToS clause) [GLM-1]** and
  **deny-by-default in the chat route [Kimi-9/DISSENT]:** product/legal changes on a
  production revenue path — recommended to O in the ledger, not executed unilaterally.
  The tripwire recommendation (scheduled re-probe alerting on nonzero counts) is logged
  with the backlog item.
- **"Escalating the age gate to a paid panel is process inflation" [Kimi-DISSENT]:** the
  escalation tier is repo constitutional law for child-data paths; a reviewer preference
  does not override it. Noted as dissent.
- **Rewrite the sweep commit now [Kimi-11]:** repo law requires O's explicit go for any
  history rewrite; offered, not executed.
- **"Gate the probe behind admin auth" [GLM-1]:** the probe is a local shell diagnostic
  using the backend's own env, not an exposed endpoint; there is no auth surface to add.
  Its queries are SELECT/COUNT-only.
- **Live flat plan-mode paid run [GLM-8/10, Kimi-6/12]:** still awaiting O's spend
  permission; the orchestrator claim is labeled accordingly (done minus live run), not
  "fixed" unqualified.
- **Kimi-6 "the bug persists by default":** disputed as scope, not correctness — flat mode
  IS the env-flagged mode, and the fix mirrors code mode's exact gating; the deeper
  default-path over-estimate is the repo's long-known estimator-inflation issue, tracked
  separately. Say so if you disagree with that scoping.
