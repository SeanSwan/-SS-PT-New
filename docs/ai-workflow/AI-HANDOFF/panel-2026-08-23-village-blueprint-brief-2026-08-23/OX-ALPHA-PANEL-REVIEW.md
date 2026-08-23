# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/VILLAGE-BLUEPRINT-BRIEF-2026-08-23.md
**Seed:** (none)
**Tokens:** 3120 in / 4608 out · **Cost:** ~$0.0000 · **Wall:** 165.0s · **finish:** stop

---

## VERDICT

REVISE — the brief's self-audit (§5) is genuinely rare and valuable, but it commissions six deliverables on top of unreconciled core counts, a silently lossy extraction pipeline, unversioned enforcement infrastructure, and a branch 2,209 commits behind the code anyone will actually ship against.

## BLOCKERS

1. **P0 — The enforcement layer is not in version control.** §6 (drift-check 8) states three hooks are "live in one tree and in no commit, **including the spend gate and the PII gate**." Concrete failure: any fresh clone, any second agent tree, any CI runner boots with *zero* PII gating and *zero* spend gating while everyone believes the guards are "shipped." You are proposing to build more mechanisms (Deliverable 5) on rails that a `git clean` would delete. Evidence: §6 table, drift-check 8 row. This is a hotfix, not context for a blueprint.

2. **P0 — The corpus arithmetic does not reconcile, and the loss is silent.** §2 says 2,546 issues recorded; §4 says the machine extract holds 2,096 bullets; §5.4 uses a third denominator, 2,523. That is **450 records (≈18%) lost between inventory and extract with no explanation**, and the brief's own §5.1 admits only the classification gap (43%), not the extraction gap. Effective verified coverage of the true corpus is therefore ~2,096 × 0.431 ≈ 903 of 2,546 ≈ **35%**, not 43%. Every ranking in §4 and the "governing finding" in §3 describe an unknown subset of an unknown subset. Evidence: §2 rows 8–10, §4 header, §5.1, §5.4.

3. **P1 — All measurements were taken on a branch 2,209 commits behind `main`.** The deliverables (rewrite `CLAUDE.md`, `AGENTS.md`, Hermes workflow) will be executed against files that measurably differ from what was audited — the 73-vs-83 rule count is the *known* instance. Re-measuring on `main` (or rebasing first) is a precondition for Deliverables 1 and 4, not a caveat. Evidence: header line, §5.6.

4. **P1 — A known authorization flaw is live in production but parked as open item #2.** §6: review-debt "closes by naming any artifact that EXISTS — `README.md` closes any debt. Known hole." Any agent can clear its own review obligation by pointing at an arbitrary pre-existing file. This is a one-line tightening (require artifact hash + creation-during-session), not a backlog item. Evidence: §6 row 2, §7.2.

5. **P2 — Gate inventory mismatch: 13 live hook gates (§2) vs 7 mechanisms documented (§6).** Six gates are running with no documented trigger, command, or failure mode — precisely the fields Deliverable 5 demands of *future* mechanisms. Evidence: §2 last row vs §6.

6. **P2 — Three unreconciled scalar claims carried forward unresolved:** rulebook size (215 KB framing vs 164 KB measured, §5.7), rule count (66 claimed / 73 defined / 83 tracked, §2), and the §5.4 denominator (2,523, matching neither 2,096 nor 2,546). The brief's own thesis is that number-drift is the #1 error class (331 hits) — the document exhibits the disease while diagnosing it.

## ATTACKS

**Correctness**
- **Exit-status gate is string-match bypassable.** PreToolUse(Bash) blocking `pipeline + bare $?` catches the literal pattern only. `cmd > out.txt; test $? ...`, `set -o pipefail` inside a script file, or `bash script.sh` all evade it. The "44 corpus hits" measures catches, not evasions — survivorship bias applied to your own newest guard.
- **`settle()` two-phase write (§7.3)** has a crash window between phases leaving half-committed settlement state; the brief correctly notes an atomic rename suffices but leaves it ranked below leased-claims synthesis.
- **Panel anti-clobber is TOCTOU-prone** unless the collision check and the write share one atomic step; "refuses a colliding write before any seat spends" describes check-then-act.
- **Classifier precision is unmeasured, only coverage.** §5 admits 57% of bullets escape the regexes but never asks how many *matched* bullets are misclassified. "caught because ran/checked … 84" could include agents who checked and were wrong anyway. Hand-labeling 100 random matches would settle this in an hour and was not done.
- **Schema validity scoped by wall-clock date (§7.4)** fails in *both* directions — a fast clock false-fails valid packets, a slow clock accepts invalid ones — and NTP drift across agent machines is routine, not exotic.

**Security**
- **Zero-PII house rule is currently unenforced everywhere except one working tree** (see Blocker 1). Worse: the memo corpus itself is agent-authored free text about live sessions — nothing in the brief states memos are PII-scrubbed before being fed to classifiers or quoted in panels. If any classification step is LLM-assisted, the corpus is an unscanned PII side-channel.
- **Leased-claims proposal (§7.1) imports two new attack surfaces unexamined:** (a) heartbeat DoS — a wedged agent spamming heartbeats holds a lock forever, recreating the problem with extra steps; (b) TTL auto-release clobbers legitimately slow work after a transient network blip. Neither trigger, nor failure mode, nor kill-switch is specified — the exact fields §8.5 demands of every other mechanism.
- **Lane-staged guard is opt-in, hence fail-open by default**: an agent that simply never claims files commits anything. The brief asks future mechanisms to declare failure-open behavior but exempts the shipped ones.
- **Replay/idempotency of `settle()` and ledger closeouts** is nowhere addressed; a retried closeout against the existence-based ledger double-clears or clears the wrong debt.

**Data-truth / schema drift**
- The document is a live specimen of its own top error class: 2,546 / 2,096 / 2,523 bullet counts; 66 / 73 / 83 rules; 215 / 164 KB; 13 / 7 gates. Four independent drift sets inside one page.
- §6 repeats the exact pattern §5.5 warns killed the previous panel — asserted "shipped" labels mixed with known-broken ones ("Token-presence only," "Known hole") in one undifferentiated table. The warning is present; the table structure that caused the failure is unchanged.
- The "Fable 5, Final-Decider ruling" quotation (§3) has no verifiable provenance — it is authority-shaped text doing load-bearing argumentative work, i.e., lore by the document's own definition.
- §7.1 credits "(ox-alpha's synthesis; unbuilt)" — I cannot verify I authored it, and neither can Sean. Same asserted-status problem.

## HIGHEST RISK

The most dangerous item is **commissioning the blueprint (Deliverables 1–5) against an evidence base that is ~35% verified coverage, taken on a stale branch, enforced by uncommitted hooks.** A confident wrong architecture gets baked into `CLAUDE.md` and becomes the next generation of recurring errors — the precise failure mode the programme exists to stop. Cheapest de-risk, in order, all under a day: (1) commit the three orphaned hooks and re-run drift-check 8 on `main`; (2) write one script that emits a single reconciled triple (issues / extracted / classified) and make it the only citable source; (3) hand-label 100 randomly sampled bullets to get classifier precision/recall before anyone ranks error classes again.

## CONFIDENCE

I could not verify from the document alone:
- **Any measurement.** No raw script output, no commit SHAs, no file paths for the inventory or `memo-mistakes.json`. Everything in §2–§4 is asserted-by-brief — the same epistemic status §5.5 grants §6, which §5 extends to everything else but the text doesn't quite admit.
- **What `main` actually contains.** Whether the 83-rule count, the 13 gates, or different file sizes hold there. One `git diff --stat origin/main...HEAD` plus re-running the two drift-checks would settle it.
- **Whether the memo corpus contains PII.** No scrubbing step is described either way. Sampling 20 memos answers it.
- **Which agents/models consume the 334 KB boot surface and with what tokenizer.** Deliverable 4 demands a "measured token target" with no model named; token counts vary ±30% across tokenizers. The brief must name the target runtime first.
- **Whether the 13 live gates overlap the 7 listed mechanisms** or include six undocumented ones (my Blocker 5 assumes partial overlap; an inventory dump settles it).
- **Whether "auto-discovered" applies uniformly** across Claude Code, Codex, and whatever Hermes runs on — the mirror/adapter claim in AGENTS.md suggests it does not, which changes the boot-budget math materially.

Where I am deliberately uncertain, I have said so above rather than resolving it by tone. The brief taught that lesson; I am applying it back.
