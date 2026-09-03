---
title: A $0.04 reviewer found three real bugs two of my own hostile rounds missed — and confidently called a broken thing correct
date: 2026-09-03
originating_model: claude-opus-5
tier: fable
surface: seats / egress (consult-muse, training-tier-gate)
models_used:
  - model: claude-opus-5 / builder, hostile reviewer, decider / built the gate, ran 2 hostile rounds, verified and fixed Muse's findings / subscription
  - model: meta/muse-spark-1.3 / cheap external reviewer, first ever call / 5 findings — 4 real, 1 false "this holds"; found 3 live defects Opus 5 had missed / $0.0369, 99.7s
skills_touched:
  - id: scripts/lib/training-tier-gate.mjs / created / redact-egress.mjs hit 429 lines, 43% over the Rule 4 cap, from my own additions
  - id: SWA-237 (bind the API key to the gate) / proposed / fetchForEgress is opt-in, so every control layered on it is opt-in
  - id: ground-truth probe method / created / no way existed to score a new paid seat except vibes
---

## The lesson

**Grade a new model against an answer key you already hold, not against its reputation.**

Before hiring Muse Spark 1.3 I needed to know if it could reason about code. Benchmarks
were useless — it tops Terminal Bench 2.1 and fails 4.0, a spread Opus 5 does not show,
which means the benchmarks disagree with each other and neither can be trusted. So instead
of asking it something whose answer I did not know, I handed it **my own pre-fix draft of a
security gate — code whose real defects I had found and fixed the day before.** It did not
know that. Every claim it made was gradeable.

That single design choice turned an unfalsifiable impression ("seems smart") into four
hard facts: it hit one known defect exactly, **missed** the other, found three live bugs I
had not, and produced essentially zero noise. Cost: **$0.0369 and 99.7 seconds.**

**The second lesson is the uncomfortable one. My own two hostile rounds had already run on
that code, and a model priced at a fraction of my seat found three real defects in it anyway.**
Not style nits — a fail-open `catch` in a fail-closed gate, a coverage gap that let
`...-contributor:free` reach the training weights, and canonicalisation living in the
caller instead of the gate. A cheap adversary with no stake in the design is worth more
per dollar than another self-review round, because **the thing a self-review cannot supply
is a reader who does not already believe the design.**

**Third, and this is the calibration that matters most: it stated a broken thing was
correct.** Under a heading called "What holds", it wrote that the single-use arming was
`Correct` — in code where the arming was *not* consumed on non-training calls, which was
the exact bug I had fixed. **A confident false negative is the worst failure shape a
reviewer has**, because unlike noise it does not announce itself. This is precisely why the
seat is wired as an executor with a hypothesis banner and why Rule 46's decider chain is
untouched: its findings are worth acting on, its *reassurances* are worth nothing.

## Who did what

**Opus 5** built the gate, ran two hostile rounds, designed the ground-truth probe, then
**verified all five of Muse's findings against HEAD before touching anything** — three were
live, one was already-known-and-accepted, one was the false "this holds." Fixed the three,
extracted the module, disclosed the test delta.

**Muse Spark 1.3** produced the review. Four of five findings real, ~zero noise, one
confident false negative. **It found something I had explicitly warned against in a comment
and then done anyway, one function below the warning** — `realpathSync` sitting in the
caller rather than in the gate, in a file whose own header says a control enforced by its
callers is not a control. An outsider reading the code cold caught the contradiction
between what I wrote and what I did; two rounds of my own review did not, because I was
reading my intent instead of my code.

Its `models` fallback-array finding was one I could not have reached by reasoning about my
own code at all — it required knowing an OpenRouter API affordance I did not know existed.
**That is a distinct category of value from a cheap external seat: vendor-surface knowledge,
not reasoning.**

## Skills created or changed

- **`scripts/lib/training-tier-gate.mjs`** — created. Motivating failure: my own additions
  took `redact-egress.mjs` from 251 to 429 lines, 43% over the cap. Re-exported from
  redact-egress so no caller changed — the low-risk shape for extracting a live module.
- **SWA-237** — proposed, from Muse's #1. `fetchForEgress` is documented as "the transport"
  and reasoned about as a chokepoint, but **it is a function you have to remember to call**,
  so the redactor, the subscription guard and the training gate are all opt-in. The fix is
  to make the API key unobtainable outside the gate. Not built: architecture across all seats.
- **The ground-truth probe method** — created. Give a candidate model a defect you already
  fixed; score hits, misses, novel finds and noise. Reusable for every future seat.

## Mistakes I made

- **I made the exact mistake my own comment warns about, one function below the warning.**
  `redact-egress.mjs` says a control enforced by its callers is not a control — and I put
  `realpathSync` in `consult-muse.mjs` instead of in `armTrainingTierEgress`. **Writing the
  principle down did not make me follow it.** Only an outside reader caught it.
- **I left the one fail-open branch in a fail-closed gate**, by copying `catch { return }`
  from the sibling guard's style. Style-matching (Rule 3, and correct in general) silently
  imported the wrong failure posture into a gate with a different threat model. *Match the
  surrounding style, but never the surrounding failure direction without deciding it again.*
- **Two of my own hostile rounds ran dry on code with three live defects.** I reported round
  2 as clean. It was not clean; it was exhausted. Rounds running dry means *I* stopped
  finding things, not that there is nothing to find.
- **I hit the shell-escaping trap a THIRD time in two sessions** — `node -e` with escaped
  anchors, failing on CRLF this time. I had already written the procedural fix into a
  learning packet the same day ("use Write/Edit, never `node -e` with escaped strings") and
  reached for `node -e` again anyway. **Writing the rule down is not the fix; the fix was
  switching to `sed` with line numbers.**
- **I nearly shipped a "44/44 pass" without saying I had rewritten two of the assertions.**
  One of them had encoded the fail-open bug itself. Caught it, disclosed it in the commit
  and on the issue — but the instinct to quote the clean number first is the thing to watch.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| `node -e` / heredoc escaping through this shell | **3 across 2 sessions** | **Yes — by me, hours earlier, in a packet naming the exact fix** | Abandoning the tool (`sed` + line numbers). Prose had already failed twice |
| Hostile rounds "run dry" while defects remain | 1 (2 rounds, 3 defects survived) | Yes — DRY-LOOP LAW | An **external** reviewer. No number of self-rounds fixed this |
| Violated a principle written in the same file | 1 | Yes — the comment is three lines above | External review only |
| Test-delta quoted without disclosure | 1 (caught) | Yes — `feedback_test_delta_disclosure` | Self-caught before reporting |

**The pattern, sharper than yesterday's:** every row was pre-documented, and prose stopped
none of them. Yesterday's packet concluded "the two that cost time have no hook." Today
gives the stronger reading — **two of these four are not hook-shaped at all.** "You violated
your own comment" and "your review ran dry too early" cannot be regex-matched. Their control
is *a second reader who does not share your beliefs*, and it now costs four cents.

## External-model calibration

**`meta/muse-spark-1.3` — first call, standard tier ($1.25/$4.25 per M).**

| Metric | Result |
|---|---|
| Findings real on verification | **4 of 5** |
| Live defects found that Opus 5 missed | **3** |
| False "this is correct" claims | **1** (the worst kind) |
| Noise / style padding | ~0 |
| Cost · latency | **$0.0369** · **99.7s** (2,059 in / 8,081 out, `finish=stop`) |
| Estimate accuracy | guard predicted $0.0610 — over by 1.65x, the safe direction |

**Routing verdict.** Hire as **executor and cheap adversarial second reader** on bounded,
well-specified work. **Never as a decider or a verifier** — it produced a confident false
"holds" on the one thing it was most important to get right. Latency suits batch review,
not interactive work. Best per-dollar value observed on this repo to date: three live
security defects for four cents, on code that had already passed two rounds of Opus 5.

**Method note for the routing table:** the number that made this decision possible was not
the price or the benchmark, it was **findings-real-on-verification against a known answer
key**. Adopt the ground-truth probe before hiring any new seat.

## Carry forward

- Muse Spark's **standard** tier is the seat; the contributor tier remains gated with
  `SWAN_TRAINING_TIER_ALLOWLIST` unset by design.
- **SWA-237 is the real outstanding risk**, not anything in the gate itself: every egress
  control here is opt-in because `fetchForEgress` is a function, not a chokepoint.
- The Meta local lane is still **Muse Glimmer 30B** (Apache 2.0, under 20GB at 4-bit) —
  planned, not built.
