# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/OX-LED-REVIEW-ROUND-2-2026-08-23.md
**Seed:** (none)
**Tokens:** 4084 in / 8247 out · **Cost:** ~$0.0000 · **Wall:** 270.1s · **finish:** stop

---

RESTATED POSITION (round 1, mine, before engaging the advisors): The dominant failure is environmental, not model capability — a ~164KB always-loaded constitution plus five blocking Stop-gates makes paperwork the path of least resistance, and Sean experiences that as hedging. I refused to triage 73 rules or rule on 14 hooks without their identities, and I flagged the 35.5%-vs-86% figure as an unchecked number. I said: do not create SOUL.md, do not build the requested skill, and instrument before cutting. I hold all of that. Where I now diverge from the emerging consensus is below — notably, I think pure "instrument-then-cut" is itself becoming a procrastination mechanism, and several cuts need zero telemetry.

## VERDICT

REVISE — the round-2 document successfully supplies the rule/hook inventory, but its own dataset contains a miscount, a hole it claims doesn't exist, and it defers a P0 deployment drift (three gates missing from `origin/main`, including the PII gate) behind a two-week telemetry program that should not gate a ten-minute fix.

## BLOCKERS

1. **P0 — Zero-PII enforcement is absent on `origin/main`.** Failure scenario: any agent or contributor boots from `main` → `egress-privacy-gate` is not registered in `.claude/settings.json` → a prompt containing client health/PII data goes to the LLM unblocked, violating standing rule 8 and, for a production personal-training SaaS, potentially HIPAA-adjacent exposure. Evidence: §1b closing paragraph ("on `origin/main`, `egress-privacy-gate`, `exit-status-gate` and `drift-check-gate` are ABSENT entirely"). The document treats this as a trivia footnote; it is the single worst fact in the file. Worse irony: Rule 58 (Proactive Schema-Drift Detection, 6,692B) evidently does not cover config/deployment drift — the repo's own governance missed its most important drift.

2. **P1 — The document's own hook-test count is wrong.** Count the TESTS column in §1b: tested = db-blast-radius, egress-privacy, exit-status, hermes-closeout, dry-loop, dual-tier, drift-check = **7**; untested = push-blast-radius, spend-guard, prompt-watcher, linear-sync, backup-after-work, lane-session-start, hermes-learning-surface = **7**. The document asserts "6 of 14 have no tests." A round-2 document that opens by congratulating me for checking arithmetic contains an unchecked count. This matters beyond pedantry: if one transcribed cell is wrong, cell-level trust in the whole table drops, and worker-bots will act on it.

3. **P1 — "The data you demanded is here" is false.** `hermes-learning-surface.mjs` BYTES = `?`. An incomplete inventory presented as complete will produce a keep/retire decision (deliverable E) made partly blind. Demand the byte count and test status before E is executed.

4. **P1 — Three unbounded hooks remain unbounded with no immediate remediation scheduled.** `prompt-watcher.mjs` fires on `UserPromptSubmit` with no timeout and no tests: any slow network call hangs *every prompt*. `db-blast-radius-gate.mjs` (PreToolUse, no timeout) is the proven commit-hanger. Telemetry-first is the right strategy for *keep/retire* decisions; it is the wrong strategy for adding a one-line timeout, which should ship today, before any instrumentation.

5. **P2 — GLM's acceptance criteria are internally inconsistent and will wedge the worker-bot.** "≤200 lines" and "~8k tokens" cannot both hold: 200 lines at realistic density is ~10KB ≈ 2.5k tokens; 8k tokens ≈ 32KB. Pick one bound. My ruling (Annex A) uses: **hard cap 300 lines and ≤12KB, whichever binds first.**

6. **P2 — Packet issues have 0% classification coverage.** Of 2,546 issues, 450 are packet issues and the classifier labels none of them. Any future "prune with data" decision built on the classified corpus silently excludes 17.6% of the record. State this in the instrumentation plan or the data will be over-trusted.

## ATTACKS

**Correctness**
- I verified the document's arithmetic where it was checkable: rules 1–11 sum to 968B ✓; rules 46–73 sum to ~88.1KB ✓; the 12 fattest rules sum to **59,579B**, not "~57 KB" as claimed — minor overstatement, direction favors the thesis, but cite the real number.
- Stale-state class error, repo-wide: the working tree vs `origin/main` divergence in `.claude/settings.json` is precisely the "model column vs caller field" drift class this panel hunts for, manifesting in config instead of schema. Nothing in rules 26–44 (Canonical Surface Receipt, Schema Cross-Check, etc.) would have caught it. That is a governance gap, not a one-off.
- Race condition: multiple Stop-hooks (`hermes-closeout`, `dry-loop`, `linear-sync`, `dual-tier`) fire at session end; `backup-after-work` has no timeout. Concurrent Stop-gates each doing network I/O with 30s timeouts can stack multi-minute session tails. No document addresses ordering or short-circuiting.

**Security**
- Supply chain: all 14 hooks are `.mjs` executed with repo/tool privileges on every relevant event. Seven are untested (per my count, not the document's). An untested privileged script is an unaudited code path; `spend-guard-gate` especially deserves a test before it is trusted to guard spend.
- Replay/idempotency: `linear-sync-gate` at Stop with no tests — a crashed-and-retried session can double-sync tickets. Unknown, unverifiable from this document; flagging as an open question, not a finding.
- Secret handling: Rule 44 (secret scanning covers writes) and Rule 59 (read-time secret exposure) are enforced *by hooks* — the same hook layer that is demonstrably drifting out of `main`. The paper rule is only as good as the wiring, and the wiring is already broken for three gates.

**Data-truth / schema drift**
- Rule 12 is a REPEALED tombstone costing 539B of always-loaded context. Dead weight nobody in four seats listed for deletion. Delete it today.
- Frontend-response-shape analog: the document's prose claims ("6 of 14", "~57 KB") drift from its own tabular data (7 of 14, 59.6KB). Same class of bug as PascalCase-vs-snake_case: narrative asserting one thing, structured source another. Worker-bots consume the narrative.

## HIGHEST RISK

The PII-enforcement gap on `origin/main` (Blocker 1). Cheapest de-risk: one command — `git diff origin/main -- .claude/settings.json` — re-register `egress-privacy-gate`, `exit-status-gate`, `drift-check-gate` on main, push. Ten minutes, zero telemetry required, closes a compliance hole that exists *today* independent of every reform decision in this document. Do this before the instrumentation work, not after.

## CONFIDENCE

What I could NOT verify from the document alone, and what would settle it:
- **The entire §1a/§1b inventory is assertion, not evidence.** I confirmed internal consistency (band sums, hook counts) but I have not seen `CLAUDE.md`, `settings.json`, or any hook source. Evidence that settles it: raw `wc -c` output per rule and per hook, committed as a generated artifact alongside the refactor.
- **Whether "absent from origin/main" means unregistered vs script-file-missing.** Both are bad; the fix differs (re-register vs restore file + register). Settle with `git show origin/main:.claude/hooks/` listing.
- **Whether the 450 packet issues are truly 0% classified** or classified elsewhere. Settle with the classifier's output manifest.
- **My Blocker 2 (7-not-6)** assumes the TESTS column is itself accurate; if `hermes-learning-surface`'s status is also unknown rather than "no", the count could legitimately be 6. Its `?` byte count makes me suspicious of its whole row. Settle by running the test suite and recording results per hook.
- **Causal claims about hedging** (gates/context → Sean's observed behavior) remain hypothesis. The 3-task stripped-config experiment remains the only discriminator; I assign it maybe 60% prior probability of confirming environment-over-model, and I say that plainly so nobody treats my ruling as proof.

---

# ANNEX — DELIVERABLES A–G (executable; hand to worker-bot)

**A. `CLAUDE.md` triage.** Yes, rules 1–11 (<1KB verified: 968B) are the natural core. Always-loaded keep-list by number: **1, 2, 3, 4, 6, 7, 8, 9, 10, 11** (product invariants) **plus 13** (commit style, 86B), **18** (existing-pattern-first), **19** (no speculative success language — this is the anti-hedging rule; it must be always-loaded), **45** (no amend/rewrite without Sean). Fourteen rules, ~1.3KB. On-trigger (load when touching that area): 20, 21, 22, 23, 24, 25, 26–31, 42, 43, 44, 50, 55, 58, 59. Reference docs (`docs/rules/`, indexed, never auto-loaded): 5, 14–17, 32–41, 51–54, 56, 57, 60–67, 70–72. **Delete:** 12 (tombstone). **Merge:** 54→20; 32+37+38→one hygiene rule; 46+61→one review rule; 62+63→one gate rule. Net: 73 rules → ~28. Cap: 300 lines / 12KB, whichever binds first (resolves Blocker 5).

**B. `AGENTS.md`: adapter-only, mechanically generated.** A checked-in script generates it from `CLAUDE.md` in CI; hand-syncing has already failed once (2-line drift). No symlink (GLM is right about checkout fragility).

**C. `SOUL.md`: No. Final.** A second always-loaded voice file recreates the mechanism that produced a 164KB constitution. Sean gets instead: a ≤15-line voice/tone block at the top of `CLAUDE.md`, version-controlled in the same file, subject to the same cap. If he wants more voice later, it competes for budget inside the cap like everything else.

**D. The skill: not as asked.** A skill that fixes hedging by adding instructions is self-refuting (GLM is right). Substitute: the trimmed `CLAUDE.md` plus **one** closeout skill — trigger: session Stop; contents: a 10-line diff-summary template (files touched, product vs paperwork ratio, open questions); forbids: creating any new `.md` artifact at closeout. That replaces the *behavior* of rules 48/57/73 with ~10 loaded lines instead of ~16KB.

**E. The 14 hooks.**
- **Retire today, no telemetry:** `backup-after-work.mjs` (→ cron/systemd timer; verify the timer exists *before* removing the hook), `linear-sync-gate.mjs` (→ CI job on push), `prompt-watcher.mjs` (untested, unbounded, fires on every prompt — worst blast-radius-per-byte in the set; retire to a manual command unless someone will write its test this week).
- **Fix today regardless:** add timeouts to `db-blast-radius-gate.mjs` (this is the commit-hanger); re-register the three missing gates on `origin/main` (Blocker 1).
- **Shadow-mode for two weeks (block→warn+JSONL `{hook, fired, would_block, latency_ms}`):** `dry-loop-gate`, `dual-tier-gate`, `hermes-closeout-gate`. This gives DeepSeek his true-positive data with zero productivity risk — it dissolves the GLM-vs-DeepSeek disagreement instead of picking a side.
- **Keep as-is:** `exit-status-gate`, `egress-privacy-gate` (once on main), `drift-check-gate` (once on main), `push-blast-radius`, `spend-guard` (add tests within two weeks).
- **Merge:** `lane-session-start` + `hermes-learning-surface` into one SessionStart gate (same event, both small, both untested).

**F. What Sean notices next week:** (1) context meter starts ~40k tokens lighter every turn; (2) sessions end with a diff summary, not a `.md`; (3) prompts and commits stop hanging; (4) ≥1 product-file commit per session; (5) a printed paperwork-ratio. All directly observable; none require trusting our predictions.

**G. The model question, plain English:** Nothing in this record separates Opus 5's capability from its operating environment, because the model has never been observed without a 49k-token constitution and five end-of-session blockers strapped to it. Blaming the model now is blaming the engine for the trailer. Run the 3-task stripped-config experiment before changing subscriptions — it costs an afternoon; a wrong model decision costs a month and resets all institutional context.
