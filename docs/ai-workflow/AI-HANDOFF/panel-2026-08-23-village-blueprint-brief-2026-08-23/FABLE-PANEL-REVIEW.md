# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/VILLAGE-BLUEPRINT-BRIEF-2026-08-23.md
**Seed:** (none)
**Tokens:** 7884 in / 8785 out · **Cost:** ~$0.5181 · **Wall:** 121.6s

---

## VERDICT
REVISE — The brief's epistemics are the best I've seen on this programme, but it commissions six executable deliverables from ground truth it admits is stale (2,209 commits behind), scope-truncated (all 84 packets excluded), and only 35.5% verified — and it contains at least one internal contradiction (§2 vs §5.9) it hasn't noticed.

## BLOCKERS

1. **P0 — Stale-branch ground truth will silently repeal rules 74–83.** Every measurement (§2 table) is on `wip/comms-notifications-2026-07-05`, 2,209 commits behind `origin/main`. The tracking issue records 83 rules; this branch defines 73. Failure scenario: worker-bot executes the Deliverable-1 rewrite from this blueprint → merges → up to 10 rules added on `main` are silently deleted, plus every other unmeasured divergence. This is exactly the "truncated catalogue silently repeals" failure the brief quotes GLM on (§9, constraint preamble) — and then doesn't list "re-measure on `main` first" as a prerequisite anywhere. §5.6 acknowledges the risk and §8 proceeds anyway.

2. **P0 — The zero-PII and spend compliance gates exist only in `35a886bf5` on this WIP branch.** §6 says the PII gate (`egress-privacy-gate`, Rule 8) and spend gate were untracked until *today*, committed on a branch 2,209 behind. If any agent boots from `main` — the normal case — the house rule "zero PII to LLMs" is enforced by nothing there. Failure scenario: agent on `main` sends client PII to an LLM; no hook fires; drift-check 8 "reports clean" only on this branch. The brief never states the gates' status on `main`.

3. **P1 — Deliverable 4 is circular and will manufacture the false ground truth it warns against.** 4b demands a budget "derived *from* 4a," but 4a's telemetry does not exist and §9 demands zero-further-questions execution in one pass. A worker-bot will invent the number. The brief names this failure mode in its own text and then specifies a contract that produces it.

4. **P1 — Deliverable 5 (guard set) is ordered before the experiment that would validate it.** The class ranking driving mechanism selection excludes all 450 packet issues and labels 35.5% of the corpus, with `D_number_drift` leading plausibly because it's regex-friendly (§5.1). Qwen's split-first/measure/then-hooks prescription (§7.6) is the correct sequencing and the deliverable order contradicts it.

5. **P1 — Internal contradiction: §2 vs §5.9.** §2 states `AGENTS.md` contains "a **byte-for-byte duplicate** of `CLAUDE.md`'s 988-line body." §5.9 states "the mirror has **already diverged** (a live drift finding on this branch today)." Both cannot be true as written. This is a `D_number_drift`-class defect inside the evidence table of the document about `D_number_drift`.

6. **P1 — The brief violates its own Fable ruling twice.** (a) The lane-staged guard is "opt-in by claiming" (§6), while §3's corollary says "a mechanism the agent must choose to invoke is not a mechanism." (b) 7 of 14 registered hooks have no documented trigger, command, or failure mode (§2 last row) — by the brief's own standard, half the shipped guard set is lore.

7. **P2 — Spec defects that break zero-question execution.** "6b. SUCCESS METRIC" is nested inside Deliverable 5 (numbering collision with Deliverable 6). The §9 output contract (PREMISE AUDIT first) conflicts with this panel harness's mandated heading order — at least one contract is unexecutable as given. The ≤300-line cap vs the 988-line `CLAUDE.md` body is flagged but the load mechanism for a multi-file split is unspecified: Claude auto-discovers only `CLAUDE.md`; "on-trigger tier" has no named import/read mechanism, so Deliverable 1 cannot be executed without a further question.

8. **P2 — Shipped gates that are themselves `C_green_not_correct`.** `mistake_terminal_state` passes `MECHANISM: I will try harder` (token-presence only, §6); review-debt closes on any artifact that exists (`README.md` closes anything, §6/§7.2). Both are known holes shipped as "mechanisms," inflating the mechanism count the thesis rests on.

9. **P2 — 6b measures only one side.** §5.8 admits zero false-positive telemetry, yet 6b's required metric is recurring-error rate only. Without a wrongful-block counter baselined at the same time, attrition — named as "the kill condition for every mechanism" — stays unmeasured.

## ATTACKS

**Correctness**
- `settle()` two-phase write (§7.3): crash between phases leaves torn state; atomic rename is the stated fix and it's still open.
- Wall-clock-scoped schema validity (§7.4): clock skew → gate bypass or false-fail; two packets minutes apart validated under different rules. Nondeterministic gate = untrustable gate.
- Rule-count regex bounded to column zero (§5.11): indented/fenced/tabled rules are invisible by construction. 73 is reproducible, not correct — and drift-check 9 is built on it.
- Token math: 3.36 chars/token was measured on *this brief* (prose) and applied to a rulebook full of tables and fences; bytes conflated with chars (UTF-8). The §2 table still presents "≈49k tokens" as measured fact while 4b concedes ±30%.
- Catch-profile (§3): ~268 classified against 2,546 issues (~10.5%) via an unaudited prose classifier — and the programme's motivating thesis rests on it. The brief admits this (§5.4) but §4/§3 are still typeset as findings.

**Security**
- **The off-switch for every hook is one editable file.** All 14 hooks register in `.claude/settings.json`. An annoyed agent edits it, the fail-CLOSED classification of the PII/spend gates is irrelevant, and no audit record exists unless drift-check 8 runs *in someone else's tree, later*. There is no guard on the guard registry — a meta-gate gap the brief never names despite §8.5 asking how each gate gets switched off.
- Review-debt authz-by-existence (§7.2): closure authorization checks existence, not content — IDOR-shaped in spirit; any artifact satisfies any debt.
- PII gate provenance on `main` (Blocker 2): the multi-tenant/compliance-critical gate is unverified where agents actually boot.
- Hook test suites: "13, all passing, self-attested, on this branch" — self-attested green from the corpus's #2 error class (`C_green_not_correct`, 313 hits) is not evidence.

**Data-truth / schema drift**
- 66 vs 73 vs 83 rule counts — detected, unreconciled.
- 164 KB vs 215 KB rulebook size (§5.7) — unreconciled; one is wrong.
- 2,523 figure — unexplained, correctly quarantined, still an open instrument defect.
- §2 "byte-for-byte" vs §5.9 "already diverged" — see Blocker 5.
- §6 commit SHA `35a886bf5` and all "shipped" labels — asserted, not verified (§5.5), and the programme has already burned two panels on exactly this table shape.
- Extract scope drift: `memo-mistakes.json` silently means "memos only"; the file name doesn't say so and nobody documented the boundary until ox-alpha forced it (§5.10). The instrument's schema drifted from its implied contract.

**House rules check:** the brief itself complies (no yoga/meditation language, credentials framing not misused, constraint list of 11 matches the binding set). One live tension: the ≤300-line cap vs the 988-line rulebook body — the brief cites the cap as binding on Deliverable 1 without stating whether `.md` operating files are in scope for it. The blueprint must decide; if yes, both operating files are in violation today.

## HIGHEST RISK
**The PII egress gate's existence on `origin/main` is unverified** (Blocker 2). Every other defect here costs rework; this one is an irreversible compliance breach — client PII to an LLM with no gate firing, in violation of binding constraint 9. Cheapest de-risk, doable today before any deliverable work: `git show origin/main:.claude/settings.json` and confirm all three gates (`egress-privacy-gate`, `spend-guard-gate`, `exit-status-gate`) are registered there; if not, cherry-pick `35a886bf5` to `main` and re-run drift-check 8 against `origin/main` HEAD. One command to check, one to fix.

## CONFIDENCE
What I could **not** verify from the document alone:
- Any file size, byte count, commit SHA, hook registration, or test result — all self-reported from an unverifiable branch. Settled by: `git show origin/main:.claude/settings.json`, `wc -c` on both files at `main` HEAD, and a diff of `CLAUDE.md` branch-vs-main.
- Whether the §2/§5.9 contradiction (byte-for-byte vs already-diverged) reflects a drift found-and-fixed today or a live error in the table. Settled by: `diff <(tail -n 988 AGENTS.md) CLAUDE.md` on this branch.
- Whether Claude Code in this harness supports an import/on-trigger load mechanism for a split rulebook — Deliverable 1 is unexecutable without knowing. Settled by: one boot transcript showing what files were actually injected.
- Whether the 300-line cap applies to `.md` operating files or only source. Settled by: the rule's own text in `CLAUDE.md` — which I cannot see.
- Whether this panel's heading contract supersedes §9's. I assumed yes (my instructions are binding); if the harness scores against §9, this ruling is format-nonconforming, and that ambiguity is itself a defect I've logged as Blocker 7.

My genuine uncertainty: I rate the Qwen thesis (§7.6) **probably right in part** — semantic failures like `C_green_not_correct` are largely unguardable by deterministic hooks — but I could not verify the 313 count or its composition; some fraction (e.g., tautological assertions, tests asserting on mocks) *is* mechanically detectable. The experiment that settles it: split the rulebook, hold the guard set frozen for a fixed window, and compare recurring-error rate per class against the baseline 6b demands — with a wrongful-block counter running alongside, or the result is one-eyed either way.
