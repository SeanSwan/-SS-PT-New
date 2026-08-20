---
surface: vs-claude
slug: grok-ran-and-returned-a-preamble
date: 2026-08-20
worktree: c:/tmp/sspt-atelier-studio @ feat/front-page-atelier-run
commits: 03a9fdec0
board: SWA-178
---

# Rule 12 was repealed and I refused anyway; then Grok no-showed

Sean asked for Grok in the review panel. I refused, citing Rule 12's "hard permanent
no". **The rule had already been repealed** (`8e9abb5b1`, `517e573ac`; the main tree's
CLAUDE.md line 103 now reads REPEALED, and `consult-grok.mjs` documents the repeal in
its own header). My refusal came from the copy of CLAUDE.md loaded into context at
session start — stale by the time I cited it. Sean said "it should be good now" and
he was right.

Ran it. Result, stated plainly: **Grok produced no review.**

- Attempt 1 (effort high, standard hostile remit): 11962 in / **417 out**, 7.2s,
  $0.0264. Output was a plan, not findings — *"I'll inspect the post-fix code and
  related models/consumers... I'll start with the createdAt mapping."* Then it stopped.
  It read as a model expecting tools it did not have.
- Attempt 2 (remit rewritten to forbid narration, state NO TOOLS, demand findings
  immediately): no output file written.
- Attempt 3 (same, foreground): ran >5 minutes with zero bytes emitted; killed.

Net: **1 completed call, 0 findings, ~$0.026.** Not a verdict on Grok's ability — a
verdict on this harness/remit shape with it. Worth one more try later with a different
effort setting or a smaller document before drawing conclusions.

**Because it no-showed, I verified its four assigned questions myself**, and one was a
real defect:
- `sampled` off-by-one — **REAL, FIXED** (`03a9fdec0`). See mistakes.
- `createdAt` under `underscored: true` — no `field:` override; standard mapping. Not
  executed against a DB.
- multi-intent per-row dedupe — tested, correct.
- `readIntentParam` under hydration — pure SPA (no `entry-server`, no SSR config) and
  try/catch guarded regardless. Non-issue, verified two ways.

## Mistakes I made

- **I refused a direct request on a rule that had already been repealed**, and asserted
  the prohibition as current fact without checking whether the constitution had moved.
  This is the branch-staleness class I have been fixing all session, applied to my own
  governing document. The instrument was my own context, and I did not validate it.
- **A reviewer handed me the correct formula and I shipped my own approximation.** GLM
  said to compute `sampled` as `total > rows.length`, using the count already in the
  handler. I wrote `rows.length >= CAP` instead and recorded no reason. At exactly 5000
  matching rows mine claims "this is a sample" when the data is complete. I only found
  it because Grok no-showed and I had to check its questions myself. Advice is only
  taken if you take the version they gave you.
- **I nearly let a null result pass as a run.** The first Grok output had a header, a
  cost, a token count and a wall time — everything that makes a result look like a
  result — wrapping zero findings. Had I skimmed it I would have logged "Grok: no
  findings" as though the seat had been filled.

## External-model calibration

- **grok-4.6** (x-ai, via OpenRouter, effort high) — $0.0264, 7.2s, 417 output tokens,
  **0 findings**. Emitted a plan-to-investigate rather than a review; two retries with an
  explicit no-tools/no-narration remit produced nothing at all. Unusable in this shape
  today. Re-test before assigning it a panel seat.
- Prior panel on the same work, for contrast: Kimi 9/9 real at $0.0592; GLM 7/8 with the
  only business-level find; Qwen 5/7 at $0.

## Governance note for Sean

The repeal has **not reached `origin/main`** — it still reads "No Grok/X-AI models
anywhere. Hard permanent no." at line 104. It lives on `claude/repeal-rule-12-20260820`
and in the main working tree. Until it merges, any agent booting from `origin/main` will
refuse Grok exactly as I did. The atelier worktree also still carries the old text.
