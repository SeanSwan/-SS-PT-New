# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/VILLAGE-BLUEPRINT-BRIEF-2026-08-23.md
**Seed:** (none)
**Tokens:** 5264 in / 2802 out | **Cost:** ~$0.0578 | **Wall:** 91.9s | **finish_reason:** stop

---

## VERDICT
REVISE — the brief is unusually honest about its own instrument defects, but it still commissions six executable deliverables on a branch 2,209 commits behind main, from a corpus whose best case is 35.5% verified coverage, with no baseline metric and an unexplained third corpus total (2,523) still floating.

## BLOCKERS

1. **P0 — All ground truth is measured on a stale branch; the blueprint will be executed against files that may not exist in that form on `main`.** §2's entire evidence table (164 KB, 73 rules, 14 hooks, drift-check results) is measured on `wip/comms-notifications-2026-07-05`, "2,209 commits behind `origin/main`" (header, §5.6). The 83-vs-73 rule-count discrepancy is the *known* instance of drift; the brief itself concedes "there are probably others." A worker-bot executing Deliverable 1 "with zero further questions" (§9) will restructure `CLAUDE.md`/`AGENTS.md` as they exist *here*, producing a rewrite that either can't merge or silently repeals rules that exist only on main — the exact `D_number_drift` failure (331 hits, the #1 measured class) committed at programme scale. Evidence: §2 table, §5.6, §5.11.

2. **P0 — The success metric is required "before any new guard ships" (§8, 6b), but 14 hooks are already shipped with zero false-positive telemetry (§5.8), and the brief asks for more.** The ordering is internally contradictory: the programme has already done the thing 6b forbids, and Deliverable 5 asks a seat to classify 14 hooks into fail-open/fail-closed when **7 of the 14 have no documented trigger, command, or failure mode** (§2: "7 registered guards with no documented trigger"). You cannot classify what you cannot read. The deliverable as specified is unexecutable without a pre-step the brief never names: audit the 7 undocumented hooks first.

3. **P1 — The 2,523 corpus total is declared "unexplained and should not be cited" (§5.10) but no reconciliation task is assigned to anyone.** Three totals existed (2,546 / 2,096 / 2,523); two reconcile, one doesn't. An unreconciled count in the extraction pipeline means the pipeline's scope boundary is *still* not fully understood — the same class of defect as the missing packets, unresolved. Shipping a blueprint derived from this extract while a known-unexplained 23-record (or larger) discrepancy is parked is "green not correct" on the programme's own evidence.

4. **P1 — `SOUL.md` is a required deliverable target whose existence and purpose are explicitly open questions (§1, §8.1), which violates the brief's own "zero further questions" executability bar (§9).** A worker-bot cannot architect a file whose purpose is undecided without either inventing a purpose (manufacturing ground truth — the failure §8.4a warns against) or stopping to ask. The brief must either decide SOUL.md's scope or explicitly delegate the decision with decision criteria.

5. **P2 — §5.7 (215 KB vs 164 KB) is flagged as unreconciled and then never reconciled or assigned.** Same pattern as blocker 3: known contradiction in the motivating number, noted, parked. If 215 KB came from a different measurement point (e.g., both files + Hermes workflow), the real per-agent surface may be larger than 164 KB and the budget deliverable (4b) is calibrated wrong.

## ATTACKS

- **Correctness:**
  - The rule counter is "a regex bounded to the section, column zero" (§2, §5.11) — by construction blind to indented rules. The number 73 is *reproducible*, not *correct*, and the brief says so, yet §2's table still presents 73 as the headline "defined" count and Deliverable 1 will be sized against it.
  - The catch-profile classifier (§3) totals ~268 hits against 2,546 issues (~10.5%), and the programme's motivating thesis ("mechanisms beat rules") rests on that 11% sample of a survivorship-biased, self-reported corpus (§5.3, §5.4). This is happy-path reasoning about the error distribution: the silent-wrong-output class is structurally absent, so the guard set (Deliverable 5) is optimised for the visible tail.
  - Review-debt ledger "closes by naming any artifact that EXISTS — `README.md` closes any debt" (§6). That is a content-free check passing as verification — the `C_green_not_correct` class implemented in the programme's own tooling, listed as open item §7.2 but not gating any deliverable.
  - Schema validity scoped by wall-clock date (§7.4): a wrong clock bypasses or false-fails — an unhandled error path in an already-shipped mechanism, ranked below new construction.

- **Security:**
  - The fail-open/fail-closed correction in §8.5 is right, but it is a *classification request*, not an audit: with 7 of 14 hooks undocumented, the current failure direction of the PII gate and spend gate under error conditions (exception in hook → allow or deny?) is unknown from this document. A PreToolUse hook that throws and fails open is a specified leak path (Rule 8 PII egress) that has never been tested in its failure mode — §2 says 13 test suites pass, but "all passing" is self-attested (§2) and says nothing about exception paths.
  - Review-debt closing on artifact existence is an authorization-flavoured hole (§7.2): any agent can discharge any debt by naming any file. Combined with no audit record requirement for convenience-gate off-switches, the attrition/off-switch telemetry the brief demands in Deliverable 5 has no specified storage or tamper-resistance.

- **Data-truth / schema drift:**
  - 66 claimed vs 73 defined vs 83 on main (§2) — the rulebook cannot state its own size, and drift-check 9 *detects* but does not *fix*; the brief is silent on which number Deliverable 1 should treat as authoritative.
  - `AGENTS.md` is asserted "byte-for-byte duplicate" of `CLAUDE.md`'s body plus a 45-line adapter (§2) — but §5.9 simultaneously says "the mirror has already diverged." Both cannot be fully true today; one is stale. This is exactly the drift the brief warns about, present in its own evidence table, unreconciled.
  - House-rule check on the brief itself: no violations found — the 11 constraints are restated faithfully (styled-components, Victory, tokens, Dual-Button Glow, 44px, dark-first, 4.5:1, ≤300 lines, IDs-only, "stretching/flexibility", "NASM-protocol/26+ years"). Note the ≤300-line cap (constraint 8) applied to operating files means a compliant `CLAUDE.md` is ≤300 lines — the brief should state that this *is* the budget ceiling rather than leaving 4b open-ended; as written, 4b could produce a 49k→20k-token "budget" that still violates constraint 8.

## HIGHEST RISK

**Executing any part of the blueprint from this branch's measurements.** Every downstream artifact — budget, guard set, file split — inherits the 2,209-commit staleness, the 35.5% coverage, and the unresolved 2,523. Cheapest de-risk before ship: a half-day re-measurement script run against `origin/main` (file sizes, rule count hand-verified on a sample, hook registry, corpus totals reconciling all three figures), with the brief's §2 table regenerated and diffed. If the numbers hold, proceed; if not, the blueprint was about to be built on a fiction. This is strictly cheaper than any of the six deliverables and gates all of them.

## CONFIDENCE

I could not verify from the document alone:
- Whether commit `35a886bf5` exists and actually registers 14 hooks — §6 is explicitly labelled ASSERTED (§5.5), and this programme has twice burned panel capacity on fixed-vs-open confusion. Settled by `git show 35a886bf5 --stat` and `git show HEAD:.claude/settings.json` on main.
- Whether `AGENTS.md` is currently a byte-for-byte duplicate or already diverged — the brief asserts both (§2 vs §5.9). Settled by one `diff`.
- The 3.36 chars/token ratio and which tokenizer the 49k figure represents — §8.4b admits counts vary ±30% and the brief never names the tokenizer for its own headline number. Settled by running the target runtime's tokenizer.
- Whether the 13 hook test suites exercise failure/exception paths or only happy paths — "all passing, self-attested" (§2) is the `C_green_not_correct` signature. Settled by reading the suites for throw/timeout cases.
- The true size and content of the 84 learning packets — the entire class distribution excludes them (§5.10), so I cannot judge whether the guard-set priorities would survive their inclusion. Settled by re-running the classifier over packets before Deliverable 5 is accepted.

My own uncertainty: I am reasoning about a brief, not the repo. Every file:line-equivalent citation above is to the brief's self-report, which §5 documents as repeatedly wrong. My P0s are about *process ordering* (measure on main before building) precisely because no factual claim in the document can be treated as settled — including the ones my verdict relies on.
