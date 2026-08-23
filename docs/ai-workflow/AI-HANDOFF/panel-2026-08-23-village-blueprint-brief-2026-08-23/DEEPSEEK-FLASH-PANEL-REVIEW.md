# DeepSeek V4 Flash — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-flash` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/VILLAGE-BLUEPRINT-BRIEF-2026-08-23.md
**Seed:** (none)
**Tokens:** 5276 in / 2927 out · **Cost:** ~$0.0015 · **Wall:** 49.6s · **finish:** stop

---

## VERDICT
REVISE — the brief is a thorough analysis of the problem space but fails to resolve its own documented weaknesses into a coherent, actionable blueprint; it presents unreliable data as evidence while simultaneously undermining it, and the deliverables section is a wishlist rather than a concrete plan.

## BLOCKERS
1. **P0** — The classifier used to rank error classes covers only 35.5% of the corpus (904/2546), yet §4’s class distribution is presented as the basis for mechanism prioritization. This is a direct violation of the brief’s own §5.1 warning. Any blueprint built on this ranking will optimize for the wrong errors.  
   *Evidence*: §4 table + §5.1: “904 / 2,546 = 35.5%.” The brief does not adjust its reasoning or propose a corrected ranking.

2. **P0** — The brief admits the entire corpus is self-reported and survivorship-biased (§5.3), yet uses it to derive the “mechanisms beat rules” finding (§3) and the catch-profile numbers (§3). This is a logical contradiction: you cannot claim a finding is valid while acknowledging the data is structurally incomplete. The programme’s motivating claim rests on an 11% coverage from an unaudited prose classifier (§5.4).  
   *Evidence*: §5.3, §5.4, §3 catch-profile totals (~268/2546 ≈ 10.5%).

3. **P1** — The brief states the branch is 2,209 commits behind `main` (§5.6) and that file measurements may differ, yet all measurements in §2 (file sizes, rule counts, hook counts) are taken from this branch. Recommendations for rewriting `CLAUDE.md` and `AGENTS.md` are based on stale data; the actual state on `main` could be significantly different.  
   *Evidence*: §5.6, §2 measurement table.

4. **P1** — The brief asserts that three hooks were committed in `35a886bf5` (§6), but also says “ASSERTED — verify before relying” and that §6 items are “claims from a brief, not verified facts” (§5.5). This creates a false sense of closure; a panel relying on this brief may treat fixed items as resolved when they may not be.  
   *Evidence*: §6 header, §5.5.

5. **P2** — The brief’s own rule-count instrument is acknowledged as possibly artifact-bound (§5.11: regex bounded to column zero cannot see indented rules). Yet the brief uses the 73/66/83 discrepancy as evidence of a problem without verifying against `main` or hand-checking. The instrument may be the source of the discrepancy, not the rulebook.  
   *Evidence*: §5.11, §2 rule count rows.

## ATTACKS
- **Correctness**: The brief’s happy-path assumption is that the error corpus is representative. It is not — silent wrong outputs are absent (§5.3). The “mechanisms beat rules” thesis is built on a biased sample. Also, the brief claims “a rule that does not name its trigger and its command is not a rule” (§3) but then in §6 lists mechanisms without specifying triggers or failure modes for 7 of 14 registered hooks (only 7 documented in §6). This is a self-contradiction: the brief itself fails its own standard.
- **Security**: The brief correctly identifies the review-debt closure as an authorization flaw (closes on existence, not content) and the PII gate as a compliance gate that must fail closed. However, it does not classify the 14 registered hooks into compliance vs convenience, leaving a gap. The brief also does not address replay/idempotency for the `settle()` two-phase write (§7.3) — an atomic rename would prevent partial state exposure.
- **Data-truth / schema drift**: The brief contains multiple numeric inconsistencies: 2,523 unexplained total (§5.10), 215 KB vs 164 KB rulebook size (§5.7), 66 vs 73 vs 83 rule counts (§2). These are not reconciled. The brief also uses PascalCase for section headers but snake_case for variable names in the text (e.g., `memo-mistakes.json`). The frontend response-shape drift is not addressed — the brief focuses on agent-side errors, not API contract drift.

## HIGHEST RISK
The single most dangerous item is that the entire error-class prioritization and the “mechanisms beat rules” thesis are derived from a 35.5% coverage, survivorship-biased, self-reported corpus. If the blueprint is built on this foundation, it will ship guards for the wrong error classes while the 64.5% unseen errors (including the 450 packet issues) continue to recur. The cheapest de-risk: before any new guard is built, run a random audit of 100 actual agent sessions (not memos) to measure the true recurring-error rate and distribution. This is exactly what deliverable 6b asks for, but the brief itself does not provide it — it must be done before the blueprint is executed.

## CONFIDENCE
I could not verify any of the measurements in §2 (file sizes, token counts, rule counts, hook counts, issue totals) because the branch is 2,209 commits behind `main` and I have no access to the repo. The brief’s own §5 warns that commit SHAs and shipped labels are unverified claims. Additionally, the tokenizer/runtime for the 49k token figure is not specified (the brief later demands this in deliverable 4b but does not provide it). To settle these gaps, I would need: (1) a checkout of `origin/main` and the `wip/comms-notifications-2026-07-05` branch, (2) execution of the measurement scripts (wc, git show, inventory index) to confirm the numbers, and (3) a hand-verified rule count on `main` to resolve the 66/73/83 discrepancy. Without that, any blueprint based on this brief is speculative.
