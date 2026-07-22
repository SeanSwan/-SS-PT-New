---
name: swan-debate
description: Bounded N-round adversarial debate between two agents for genuinely contested decisions. Invoke via /swan-debate, "debate this", or fusion-router escalation when a Tier-2 triangle returns CONTRADICTIONS on a Sean-contested call. Runs on the existing fusion board; output is ADVISORY input to the Final Decider, never a gate by itself.
---

# Swan Debate — structured disagreement, bounded and arbitrated

**Origin:** SWA-32 Slice 2 (`MASTER-PROMPT-ADW-FUSION-UPGRADE-2026-07-21.md`). **Doctrine:** Rule 73; composes with the fusion tiers — it does not replace them.
**Why:** the triangle surfaces contradictions but doesn't resolve them; a bounded debate forces each side to answer the *strongest* counter instead of talking past it. Divergence is where the value lives.

## When to invoke
- Sean says "/swan-debate" or "debate this".
- `fusion-router` escalation: a Tier-2 triangle synthesis returned a CONTRADICTIONS section on a decision Sean marked contested.
- A Final Decider verdict would otherwise rest on a coin-flip between two defensible architectures.

**Not for:** settled doctrine (CLAUDE.md rules win — no debating rule 6), trivial choices, or anything Rule 16/50 Tier-C — a debate is ADVISORY input to the Final Decider and never closes a Tier-C question by itself.

## Procedure
1. **Frame:** one sentence stating the contested question + the two positions. If there aren't two genuine positions, stop — this is a consult, not a debate.
2. **Agents:** two, default = the session's builder-model vs the Codex lane, communicating via the existing fusion board conventions at `.ai-workflow/fusion/` (reuse `scripts/fusion-triangle.mjs` board format — do NOT invent a second board or polling mechanism).
3. **Rounds:** N rounds, **default 3, max 5**. Each round, each side writes: **position** (or updated position) → **strongest counter** to the opponent's last round → concession-or-rebuttal. A concession that narrows the disagreement is progress, not weakness — say it plainly.
4. **Verdict:** after N rounds the **Final Decider** (Fable chain, per the Co-Orchestrator hierarchy) writes the ruling using the standard synthesis contract: **consensus / contradictions / unique insights / blind spots / fused recommendation**. The verdict names which arguments moved it and which were discarded.
5. **Record:** one file — `.ai-workflow/fusion/debates/<topic-slug>-<YYYY-MM-DD>.md` — containing the frame, all rounds, and the verdict. Gitignored/local like the rest of the fusion board; durable outcomes get promoted to a committed handoff doc or catalog-visible decision separately.

## Bounds (hard)
- **Advisory only.** The Final Decider may rule against the debate's apparent winner; the debate's job is to sharpen the decision, not make it.
- **N is fixed at frame time** (default 3, max 5) — no "one more round" drift; if the question is still live after max rounds, that fact IS the finding: escalate to Sean.
- **No scope growth mid-debate:** new questions discovered during rounds get their own frame later.
- Standing rules govern throughout: Rule 8 (IDs/roles only in debate files), Rule 12, Rule 16 (nothing here authorizes paid runs).

## Retention
Debate files live under `.ai-workflow/fusion/debates/` and are swept by `scripts/fusion-prune.mjs` on its standard 90-day cadence. Verdicts worth keeping past that are promoted (handoff doc / catalog row), never hoarded on the board.
