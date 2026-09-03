---
title: A gait law that bounds numbers cannot see a body leave its hitbox — and a second economy door with no cashier
date: 2026-09-02
originating_model: claude-fable-5-1
tier: fable
surface: aftertaste (SWA-211)
models_used:
  - model: claude-fable-5-1 / final decider + hostile reviewer / reviewed the night's shipped work, wrote build blueprint v3 / subscription
  - model: claude-fable-5 / builder (earlier in the same session) / blueprint v1-v2, S1-S4 / subscription
  - model: glm-5.3 / hostile reviewer of blueprint v1 / 27 findings, ~14 verified on read-back / $0 Z.ai
  - model: glm-5.3-flash / hostile reviewer, player-facing lane / 22 findings, ~20 verified / $0 Z.ai
skills_touched:
  - id: memory feedback_report_after_schedulewakeup_always / created / three turns in one night ended on a tool call and showed the owner nothing
  - id: decision doctrine D1-D14 (blueprint v3 §0) / created / each rule paid for by a named defect
---

## The lesson

A test that bounds a pose's NUMBERS is not a test that the rendered body stays inside its hit shapes.
Tonight's gait system shipped with a "gait/hitbox law" test that asserted sway ≤ 0.15 rad, lift ≤ a
declared ceiling, jitter ≤ the row's value — and it could not fail on the actual defect: the lean
was written to the wrapper group the hit shapes are anchored to, so a Regular leaning at 1.7 units
carried its rendered head ~15 cm away from the sphere that decides a headshot. The law had to be
restated in the unit that matters: DISPLACEMENT in metres at the top of the body, against the head
radius. **Bound the consequence, not the parameter.**

Second, the same shape one layer up: an economy with "one choke point" (`awardForShot`) had a
second door — `melee()` — that killed things and paid nothing. A choke point is only a choke point
if every path that produces the event goes through it; the test that proves it is "list every
site that can produce a kill, assert each pays", not "the award function is correct".

## Who did what

- **Fable 5 (builder, earlier):** wrote the gait law that bounded numbers; wrote `awardForShot`
  and wired it into `shoot()` but not `melee()`. Both are the author's blind spots, not the seat's.
- **Fable 5.1 (reviewer):** found both by grepping for the CONSUMER side (`grep "\.y\b"
  combat.js` → no y offset; `sed melee | grep award` → empty), not by re-reading the code that
  was written. The review method that worked: for every claimed invariant, find the second
  place it must hold and grep THERE.
- **GLM 5.3 / Flash:** reviewed the blueprint, not the code; neither could have caught these.

## Skills created or changed

- Blueprint v3 §0 decision doctrine — 14 rules, each cited to the defect that paid for it, so the
  next builder (Opus 5) inherits the method rather than the memory.

## Mistakes I made

- **Wrote a law test that could not fail on the defect it was named for** (gait/hitbox). Caught
  only by the 5.1 review pass. Rule: when a test is named after an invariant, the assertion must
  be in the invariant's own units.
- **Declared "ONE choke point" and left a second door open** (melee → no points). Caught by
  grepping the melee body for `award`. Rule: enumerate producers, not just the consumer.
- **Let App.jsx cross 300 lines** across three slices without noticing. The line cap is a
  per-commit check, not a per-phase one.
- **A heredoc write failed under the shell hook** ("unexpected EOF") and I switched to the file
  tool rather than fighting it — correct call, but the first attempt cost a full document's tokens.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Invariant test asserts parameters, not consequence | 1 | no | restate in the invariant's units (metres vs radius) |
| "One choke point" with an un-routed producer | 1 | no | grep every producer for the award call |
| Report placed before the final tool call | 3 | yes, after #1 | memory file + doctrine D12; still recurred twice AFTER the write-up — the procedural fix (order tool calls first) held only once explicitly restated |
| Two rates on one number unmultiplied | 3 | after #1 | D3 named check |

## External-model calibration

- GLM 5.3 on blueprint v1: ~14/16 accepted findings verified; 1 rejected on merit. $0. Strong
  on systems contradictions and slice-size dishonesty.
- GLM 5.3-Flash: ~20/22 verified; lane split (player-facing) made it non-overlapping. $0.
- Neither seat reviewed CODE tonight; the two code defects above needed a code-level pass.
