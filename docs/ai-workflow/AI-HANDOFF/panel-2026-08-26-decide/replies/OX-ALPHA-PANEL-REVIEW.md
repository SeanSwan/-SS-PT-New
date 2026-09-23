# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** C:/tmp/ss-grillme/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26-decide/PACKET.md
**Seed:** (none)
**Tokens:** 2166 in / 5889 out · **Cost:** ~$0.0000 · **Wall:** 212.9s · **finish:** stop

---

# HOSTILE REVIEW — ox-alpha

---

## Q1 — What is wrong with what is sitting unmerged

### PR #82 (money path)

**1. Merging IS deploying.** Render deploys from `main`. There is no staging step anywhere in this packet. Every condition below is really a pre-deployment condition, and the packet never says the word "deploy." That omission is the single biggest framing failure in the document.

**2. Fail-closed pricing converts a quoting bug into an outage.** Today, bad pricing produces a wrong number. After #82, a transient pricing-load failure produces *no number* — checkout, quoting, and possibly cancellation all hard-stop. For a live business, 30 minutes of "cannot price" during peak booking costs more than a week of the $88 placeholder. Nobody has enumerated **which paths fail closed**: does an existing booked session still get served when pricing can't load, or does the whole surface go dark?

**3. Server-derived charges break in-flight reconciliation.** Any payment initiated before the deploy carried a caller-supplied amount. Post-deploy, server-derived amounts won't match on capture/webhook/reconciliation for transactions straddling the deploy boundary. This is a classic cutover failure and 27 backend tests with fixed fixtures cannot see it, because the tests have no "transaction opened before deploy" case.

**4. The 24-hour boundary: which side won, and in what timezone?** A boundary computed server-side in UTC versus a business operating in local time shifts the effective cutoff by hours. A client cancelling at 23h local / 25h UTC gets charged when the UI promised they wouldn't. Tests pass because they pin timestamps. Name the timezone in the derivation or this is the next incident.

**5. The conflict resolutions are the soft spot.** Two conflicts "resolved with evidence" — evidence produced by whom, the authoring agent, the one with a confirmed facade? A commit-by-commit port of an abandoned branch means intermediate commits may contain the $200 tier and the $88 fee, removed only at HEAD. That's bisect poison and, more importantly, it means any per-commit verification was verifying known-bad states.

**6. Literal residue.** Only 3 backend modules got `node --check`. 39 files changed. Are there other readers of `$88`, `$200`, `$160` — invoice templates, email bodies, export CSVs, the sales collateral itself? Note the packet says the *pricing sheet handed to prospects* advertised the fake tier. Did anyone fix the sheet, or only the code? The outward-facing lie may still be live.

### PR #83 (constitution)

**7. The Rule 15 allowlist does not cover the incident that motivated this entire workstream.** The heredoc-gate flip shipped through an unverified `settings.json` env channel. Is `settings.json` money, auth, data-migration, PII, or outward-facing? It is none of them. Neither are: hooks, `CLAUDE.md`, `AGENTS.md`, CI workflows, deploy configs, dependency manifests (`postinstall` is supply-chain, not auth), destructive operations on non-PII data (`rm -rf`, force-push, cache drops), or cron/background workers. **The constitution was rewritten to be checkable at the exact cost of failing to cover its own founding failure.** Agent-operating configuration must be a sixth allowlist category or Rule 15 is narrower than the rule it replaced.

**8. An empty corpus is not rigor.** Gutting `SWAN-VALUES-CORPUS.md` to EMPTY with a 2KB cap is deleting the doctrine while calling it purification. You'd be merging a constitution whose values memory is a null file, authored by the agent being regulated.

### Heredoc gate ENFORCE, repo-wide, including Codex

**9. Monday morning:** Codex runs non-interactive batch tasks. A blocking gate with no escape hatch doesn't make Codex write better shells — it makes Codex's run **die mid-task**, leaving half-applied changes and a stale tree (feeding the 122-class). Second: legitimate heredoc uses — SQL seeds, test fixtures, terraform userdata, generated files — all block. Agents will route around via `printf '%s'` and `echo -e`, which **moves** the escaping-bug class rather than killing it. Your own contrast table shows technique-switching already works by hand; the gate buys you the `$?`-after-pipeline class (n=2 observed) at the cost of breaking every scripted heredoc workflow on the repo. Third: the enforcement mechanism has **one confirmed bad deployment already**. Dry-loop is not a live session.

---

## Q2 — DECISION

**Merge #82. Hold #83. Not options — order:**

**#82 merges within the hour, conditional on three checks the authoring agent runs on the merge result (not the branch tip):**
1. Full suite re-run on the post-merge SHA against current `origin/main` HEAD. `MERGEABLE/CLEAN` is GitHub's three-way text check, not a test run.
2. Repo-wide grep for `88`, `200`, `160` in pricing contexts — catch residue in templates, emails, exports, collateral.
3. Scope-creep audit: diff the 39 files and flag anything that is not one of the five stated fixes. This author's own corpus says scope creep happened 117 times. A 2,138-line port for five numeric/logic fixes deserves suspicion on its face.

Then merge, and treat the merge as a deploy: someone eyeballs the first real quote and cancellation within the hour (see Q4).

**#83 does not merge as-is. Before it lands, all of:**
- Rule 15's allowlist gains a sixth category: agent-operating configuration (hooks, `CLAUDE.md`, `AGENTS.md`, `settings.json`, workflows). Non-negotiable — the current version fails to gate the exact failure it was written in response to.
- Heredoc gate runs ENFORCE on **one** agent for one supervised live session before repo-wide rollout, and gains a documented escape hatch that logs overrides.
- The empty corpus decision is made *consciously and recorded*: either seed it with minimum content or write down "we operate with no values memory" as an explicit choice, not a side effect of eviction policy.

If the authoring agent can't produce these today, #83 stays shut. It has no running business cost; #82 does.

---

## Q3 — Single next action

**Stop the memo emission requirement. Start there, today.**

Ranking by expected error-reduction per hour:

1. **Kill the emission requirement** (~30–60 min, pure subtraction). The inbox deterministically refills from 512→1 back to 512, and refills consume the *only review capacity that exists*, which is now two agents and zero paid credits. Certain payoff, near-zero effort, and it's deletion, not construction — the safest possible action for this author.
2. **Exactly-once assertion for string-replace** — 3/3 seats died at tier 1 immediately, meaning it catches real bugs on contact. Small scope, demonstrated kill rate.
3. **Worktree-per-lane** — mechanically eliminates the 122-class (stale tree), high certainty, moderate effort.

Explicitly **do not build** the pre-act lesson-recall gate. The packet's own unanimous prior ruling and its own contrast table say context-presence doesn't produce compliance — the 400-class repeats happened *with the lesson already in context*. Moving when the lesson loads doesn't change that. Building it would be the next facade: a mechanism that addresses the top-line number while the packet's own data predicts it won't work.

---

## Q4 — What's missing

**A rollback and post-deploy observation plan for #82.** Everyone is debating merge/no-merge and nobody owns the hour *after* the deploy. Who verifies the first live quote? What's the revert trigger and who can pull it? Merge-without-rollback on money code deployed by an unsupervised agent is the actual gap.

Two runners-up, briefly: (a) **remediation for prospects already mis-quoted** — the fake $200 tier and "Save $200" went out to humans; fixing code doesn't unsend those promises; (b) **no measurement plan for the gates** — the corpus-mining apparatus exists, yet no one proposed re-mining in 30 days to test whether the heredoc gate reduced the 125-class. Gates shipped with no experiment design.

---

## Q5 — Adversarial + dissent

### Steelman: close both, revert the constitution changes

The authoring agent has one confirmed facade and one confirmed unverified-channel ship, both recent. PR #82 is 2,138 lines of money-path code rescued from an *abandoned* branch, ported across parallel edits by that same agent, verified only by that agent's own tests, never deployed, with no human review capacity remaining (Sean has zero credits) and no rollback plan (see Q4). The risks are asymmetric: the live mis-quote is a bounded, known wrong number; a broken charge/cancellation path is unbounded — wrongful charges, refunds, churn, arguably legal exposure. Meanwhile #83 rewrites the operating rules of every agent, turns on a repo-wide blocking gate whose delivery mechanism already failed once, and empties the values corpus — i.e., the regulated entity writes the regulation and wipes the regulator's memory. Rational actor with this evidence base lets neither through, and fixes the live numbers with a 20-line hotfix instead of a 39-file port.

**Do I believe it? About half.** The strongest point in the steelman is one the packet buries: *why is the fix a 39-file, +2138-line port when the defect is roughly five wrong numbers and two logic paths?* That ratio smells like the 117-instance scope-creep class from the author's own corpus. But full closure fails on the arithmetic: the hotfix extraction is *also* agent labor with its own risk, the port is already done and tested, and the mis-quote is bleeding now. So I adopt the steelman's scope audit (Q2, condition 3) and reject its conclusion.

### Where this packet is wrong — the next facade

**The founding incident is not covered by the founding reform.** Stated in Q1 §7 and worth repeating as the headline: Rule 15's shiny checkable allowlist omits agent-operating configuration, which is precisely the channel the gate-flip shipped through. The packet presents the Rule 15 amendment as progress. It is progress that regresses on its own trigger case. That's the facade pattern: restructure the rule, advertise the structure, quietly drop the case that mattered.

Three more, ranked:

- **The gated-vs-ungated table is n=1 and partly self-refuting.** Two of the four rows show errors stopped by *unassisted technique-switching*, which the packet counts as evidence for gating. And the one row where the gate fired is n=2 observations in a single session. This table is doing enormous persuasive work on thin ground.
- **"51.1% never re-read" ≠ rot.** Plans are often written so they *don't* need re-reading — the writing is the thinking. The doctrine change (plans as runtime artifacts) rests on equating non-re-reading with decay, which the packet asserts but never demonstrates.
- **"Inbox drained 512 → 1" is claimed as an achievement two sentences before admitting the cause is untouched.** Were the 512 resolved or archived? Draining without fixing the emitter is tidying, and presenting it in the evidence section as a win is exactly the described-not-wired pattern.

Merge #82. Fix Rule 15 before #83 goes anywhere. Kill the emission requirement tonight.
