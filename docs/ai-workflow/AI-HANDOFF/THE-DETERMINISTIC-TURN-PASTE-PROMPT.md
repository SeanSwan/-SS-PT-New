# PASTE THIS INTO THE FRESH SESSION

Copy everything between the lines.

---

Read `docs/ai-workflow/AI-HANDOFF/THE-DETERMINISTIC-TURN-HANDOFF-2026-08-25.md` end to end
before doing anything else. It is a complete, self-contained handoff from a long session
you were not part of — the facts, numbers, SHAs, traps, and the work order are all in it.
Do not re-derive them and do not re-audit what it already measured.

Then execute Part 5: build a full-spectrum hostile-review packet from Parts 2, 3 and 4,
and run all six seats — **GLM 5.3, Ox Alpha, Grok 4.6, Kimi K3, HY3, and DeepSeek V4 Pro**.
Sean has authorized this panel explicitly. Disclose worst-case spend before you fire the
paid seats.

Hard requirements, all of which this repo has been burned by before:

- Every seat gets the **byte-identical** packet and answers the **complete** brief across
  every angle (Rule 82). `consult-kimi.mjs` and `consult-hy3-design.mjs` default to narrow,
  SwanStudios-branded remits — pass an explicit `--remit` or you silently reintroduce the
  lensing the rule bans.
- The packet must state plainly: **"You CANNOT read files — everything you need is in this
  packet."**
- Verify each paid seat's `**Served:**` header. Requested ≠ served.
- Exit code 75 is transient — back off 60–90s and retry, do not treat it as a verdict.
- Loop to **CLEAN×2**, gathering a new vantage each round, and remember the session's
  hardest-won lesson: **your fold is the next round's primary attack surface, and the axis
  you did not name is where it breaks.**

Then ship the surviving work into `CLAUDE.md`, `AGENTS.md`, and Hermes's `SOUL.md`.

The bar for "shipped" is inverted from usual, and this is the point of the whole exercise:
**success is measured in prose retired into mechanism, not prose added.** For every rule
you touch, first ask whether the failure can be made architecturally impossible; if not,
whether a deterministic check can catch it; and only then whether it must stay as prose.
A slice that adds three rules and removes none has failed even if every rule is correct.

Sean added an explicit instruction: **put the spec-driven conflict and the values question
to the seats directly** — he wants their reasoning on the record before he arbitrates, not a
parked "Sean's call" bullet. Every seat must answer, with a verdict and its reasoning:

- Which of Rules 15 / 64 / 68 genuinely fall to Bob Martin's "spec-maxing is the waterfall
  trap," and which survive — and why?
- Attack the working resolution: *keep the interview, kill the blueprint, keep the checks* —
  grill-me survives because it extracts **values** (which transfer to agents) rather than
  implementation steps; Rule 15 becomes plan-depth proportional to reversibility; Rule 68
  inverts so the expensive model produces **the acceptance check, not the plan.**
- `grill-me` is now domain-independent with a seven-tier values ladder and a durable output
  at `docs/ai-workflow/references/SWAN-VALUES-CORPUS.md`. Is a values corpus the right
  Direction layer, or just the next write-only artifact nobody drains? What makes it get
  READ? What is the cap and the eviction rule?
- Which of our rule *classes* are values (keep, compress, front-load) and which are
  disciplines (retire into gates, or delete)?

Sean still arbitrates the final call on all of it. These remain his, not yours:
1. The spec-driven conflict (Slice F): our recursive-planning and plan-then-build rules
   against Uncle Bob's finding that spec-maxing is the waterfall trap returning.
2. Any deletion of the orphan Hermes tree.

When the loop is dry and the work has shipped, mark the handoff `status: superseded` and
point it at whatever replaces it.

Track everything on **SWA-196**.

---
