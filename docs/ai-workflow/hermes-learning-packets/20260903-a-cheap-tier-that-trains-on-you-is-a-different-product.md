---
title: A cheap tier that trains on you is a different product, not a discount — and one hostile round is not a dry loop
date: 2026-09-03
originating_model: claude-opus-5
tier: fable
surface: seats / egress (consult-muse, redact-egress)
models_used:
  - model: claude-opus-5 / builder + hostile reviewer + final decider / verified vendor claims, built the seat and the transport gate, ran two hostile rounds / subscription
  - model: none-external / no paid seat was consulted / verification plus bounded implementation did not need one / $0.00
skills_touched:
  - id: scripts/consult-muse.mjs / created / no executor-tier seat existed between free-local and the $3/M Kimi seat
  - id: redact-egress armTrainingTierEgress / created / a data-training tier has no rotation path, so the existing content-permissive redactor was not enough
  - id: spend-guard-gate PRICES + INVOCATION / amended / a new paid seat outside the gated set spends unmetered
---

## The lesson

**A vendor tier that is 12x cheaper *because it trains on your data* is not a cheaper version
of the same product. It is a different product with a different failure mode, and the
difference is that it has no undo.** A leaked API key is bad and rotatable. Proprietary
source absorbed into a foundation model's weights is neither detectable nor reversible.
Every control this repo already had — the egress redactor, the secret scanner, the path
denylist — is built for the *rotatable* class. None of them is sufficient for this one.

Three design consequences, each of which was a live hole in my own first draft:

1. **Allowlist, never denylist.** The redactor's own header records a content scan
   returning "no matches" on a file that demonstrably contained the string. A denylist of
   "sensitive-looking content" fails open exactly the same way. Default must be: nothing
   is cleared, so every call is refused until a human names a prefix.
2. **The gate belongs at the transport, not in the script.** A `--i-accept-training` flag
   inside one script is bypassed by writing a second script. Putting the refusal inside
   `fetchForEgress` means a caller that never heard of the gate is still refused. This is
   the same reasoning already recorded for the subscription-seat guard — the pattern
   generalises: *a permission that lives in the thing it permits is not a permission.*
3. **A clearance must be consumed by any outbound call, not only by the one it guards.**
   My first version cleared the arming only when it saw a training-tier model. That let a
   script arm for cleared document A, make an unrelated standard-tier call, and have the
   still-live clearance authorise a second contributor call carrying uncleared document B.

And the fourth, which is the one that generalises furthest: **the allowlist names FILES,
so any channel that is not a file bypasses it.** `--remit` was free text assembled into
the same prompt and never passed the allowlist at all. Whenever a gate validates one input
class, enumerate every *other* input that reaches the same destination.

**Separately: one hostile round is not a dry loop.** Round 1 of my own review found
nothing. Round 2 found two real holes (the arming lifecycle and the `--remit` channel).
Had I reported after round 1 — which felt complete — I would have shipped both. The DRY-LOOP
law's "rounds until nothing found **plus one confirming round**" is not ceremony; the
second round is where the yield was.

## Who did what

**Opus 5** did all of it: read the transcript, refused to accept its numbers, checked them
against the vendor and OpenRouter pages, found that two of the transcript's load-bearing
claims were wrong or overstated, built the seat and the gate, and ran the hostile rounds.

**The transcript was wrong twice, and both errors pointed the same direction — toward
spending.** It framed the 100x saving as the headline without foregrounding that the
saving *is* the training deal, and it stated Muse Spark 1.3 was going open-weight when
Meta has not decided (1.2's weights are the ones still planned). An agent that had
executed the prompt as given would have built around the training tier and told Sean to
wait for weights that may never ship. **The correction came from reading primary sources,
not from reasoning harder about the transcript.**

**No external model was consulted.** Worth recording as a calibration datapoint in the
other direction: this was a task class — verify public facts, then implement bounded code
with tests — where a paid panel would have added cost and no accuracy.

## Skills created or changed

- **`scripts/consult-muse.mjs`** — created because the seat ladder had a gap: free local
  Qwen at one end, the $3/$15 Kimi seat at the other, nothing in between for bulk executor
  work. Built as an executor explicitly: its own output file carries a banner saying the
  content is a hypothesis, so a future reader of the artifact cannot mistake it for a verdict.
- **`armTrainingTierEgress` / `assertTrainingTierArmed`** — created because no existing
  control covered the no-rotation class. Motivating failure: nothing had yet gone wrong;
  this was built *before* the first contributor call rather than after an incident, which
  is the only time such a gate is cheap to add.
- **`spend-guard-gate.mjs`** — amended. Motivating failure class: a paid seat outside the
  `INVOCATION` set spends completely unmetered. The contributor tier is deliberately *not*
  given its own price row, so every Muse call is priced at the standard rate — a spend
  guard may only ever overestimate.

## Mistakes I made

- **I repeated the same mistake inside one session, ten minutes apart.** A quoted bash
  heredoc ate a backslash level and corrupted a regex (`\\/g` → `\/g`, `SyntaxError`). I
  reverted, and then did the same thing again through `node -e` with escaped strings,
  which failed on an anchor match. **The repeat is the signal**: the first failure taught
  me nothing because I treated it as bad luck rather than as a property of this shell.
  The correction that survives is procedural — *anything containing a backslash goes
  through Write/Edit, never a heredoc or `node -e`* — not resolutional ("escape more carefully").
- **My first hostile round found nothing and I nearly believed it.** See the lesson above.
- **I claimed a lane for the files I planned to touch, then edited different ones**, and
  the lane-staged guard blocked my commit. The claim was made at task start and never
  updated when scope moved from a skill doc to a hook. Re-claim when scope changes, not
  only when work begins.
- **I read `$?` after a pipeline.** Caught by the exit-status gate before anything ran.
  This is the repo's most-recurring mechanism and I hit it anyway.
- **I took the source's framing before checking it.** My opening instinct was to build
  around the contributor tier because that is what the video emphasised. The standard tier
  being the actual win only appeared after reading the price pages.
- **I wrote the file 15 lines over the Rule 4 cap and my first instinct was to shave
  comments to hit 300.** That trades the load-bearing WHYs for a number, which is how
  files end up compliant and unreadable. Trimmed genuinely redundant prose to 304 and
  disclosed the overage with reasoning instead.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Backslash eaten by heredoc / `node -e` through this shell | **2** | Yes — `feedback_gitbash_pathconv_false_negative` covers a sibling Git-Bash quoting trap | Switching tools entirely (Write/Edit), not more careful escaping. A rule to "escape correctly" had already failed once |
| Reported/nearly reported after a single hostile round | 1 (caught) | Yes — DRY-LOOP LAW | Actually running round 2, which yielded 2 real defects |
| Lane claim not updated when scope moved | 1 | Yes — Rule 67 R2 | The deterministic lane-staged pre-commit guard, not memory |
| `$?` after a pipeline | 1 | Yes — 44 prior corpus hits | The deterministic exit-status hook, not memory |

**The pattern across all four rows: every one had already been written up, and prose
stopped none of them. The two that were caught cheaply were caught by hooks.** The two
that cost time (the heredoc repeat, the single-round review) have no hook. That is the
argument for where the next gate should go, and it is an argument the corpus keeps making.

## External-model calibration

No external model called. **Session paid-AI spend: $0.00.** Recording the negative case
deliberately: the routing table learns as much from "this class needed no paid seat" as
from a findings-real-vs-disproven count. Task class = *verify public facts against primary
sources, then implement bounded code with tests*. A panel here would have bought nothing
the vendor pages did not already settle.

## Carry forward

- Muse Spark 1.3 standard tier is a legitimate cheap executor. Its output quality on Swan
  work is **`[UNKNOWN]`** — no live call has been made. The benchmark spread (tops Terminal
  Bench 2.1, poor on 4.0, a spread Opus 5 does not show) is a reason to measure before
  trusting, not a reason to assume either way.
- The Meta local lane is **Muse Glimmer 30B today** (Apache 2.0, under 20GB at 4-bit,
  Ollama-ready, distilled from Muse Spark 1.2), not Muse Spark weights someday.
- `SWAN_TRAINING_TIER_ALLOWLIST` is unset on purpose. Setting it to `docs` wholesale would
  defeat it — the handoff and brainstorm trees carry business logic.
