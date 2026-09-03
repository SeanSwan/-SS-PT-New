---
name: a-determinism-test-that-never-asserts-difference
date: 2026-08-18
originating_model: claude-opus-5
tier: fable-tier
surface: swan-visualizer
decision: Determinism tests must assert difference as well as repeatability; a metric that passes is not the intent it stands for.
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: Final Decider + builder
    did: adjudicated the world-engine panel, built the engine and first kernel, ran the dry loop, made every mistake below
    cost: subscription
  - model: glm-5.3
    role: panel seat (engine architecture, SPACE/NATURE)
    did: best architectural proposal of the panel ("Chapter Light"); three hostile findings refuted by grep
    cost: $0
  - model: moonshotai/kimi-k3
    role: panel seat (feasibility pricing, 24h engine, WATER/LIGHTNING)
    did: sharpest costing and the substrate-monotony thesis; one HUD claim refuted
    cost: $0.327 (paid 2026-08-17)
  - model: openai/gpt-5.6-sol
    role: panel seat (determinism, licensing, ICE/EARTH)
    did: the dissent that reversed a standing ruling; strongest determinism contract
    cost: $0.488 (paid 2026-08-17)
  - model: qwen3.8-local
    role: free hostile seat
    did: full-spectrum blunt review; one recommendation rejected as stated
    cost: $0
skills_touched:
  - id: rule-73 proof-before-done
    change: reinforced
    failure: a numeric check passed while the picture failed the same law it was standing in for
  - id: feedback_validate_probe_before_absence_claim
    change: reinforced
    failure: a canvas readback reported black for a working renderer; the instrument, not the code, was wrong
---

# A determinism test that never asserts difference proves nothing

## The lesson

I built a seeded generator whose whole purpose was to produce a different world for every
seed. It produced **one world for a thousand seeds**, and the determinism test passed the
entire time — because "same seed → same output" is trivially true when *all* outputs are
identical. The bug surfaced only when a second test asserted that two different seeds must
produce different output.

Generalised: **a test of stability is not a test of function.** Any property of the form
"the same input gives the same result" is satisfied by a constant. Whenever repeatability
is the thing under test, the assertion that seeds/inputs *diverge* must be written in the
same file, or the suite reports green over a generator that has quietly become a constant.

The proximate cause is worth carrying too: `SeededRng(seed, path)` keys its stream from
`path` and treats `seed` as a display label when a path is supplied. Passing an explicit
override silently disabled the argument that looked like the important one. **When an API
accepts both a convenience argument and an explicit override, assume the override wins
completely — and test that the convenience argument still reaches the output.**

## Who did what

- **Opus 5 (me)** wrote the bug, shipped it into three call sites, and caught it — but only
  because I wrote the divergence test. I also measured a law, passed it, and shipped a
  picture that violated the law; the correction came from looking at a screenshot.
- **Sol** produced the dissent that reversed a standing project ruling ("bespoke feedback is
  killed"), arguing that killing all original feedback while keeping third-party feedback
  abandons the exact craft the owner asked to learn. A grep confirmed the premise in one
  command. **A well-argued dissent from a model that cannot see the code was still right,
  because it reasoned from stated architecture rather than from guessed detail.**
- **GLM** produced both the panel's best idea and its three worst claims — all three about
  runtime behaviour it could not observe. It labelled them HYPOTHESIS honestly.
- **Kimi** priced the programme in dev-months, which is the number nobody volunteers.
- **Qwen** (free, local) held its own against the paid seats on diagnosis quality.

## Skills created or changed

No new skill. Two existing disciplines were reinforced by live failure:

- **Proof-before-done (Rule 73)**: extended in practice — a *numeric* proof of a taste law
  ("all four corners lit") passed while the picture failed the law it encoded ("density to
  the corners"). Numbers are necessary and not sufficient for anything whose acceptance
  criterion is aesthetic. Look at the artefact.
- **Validate the instrument before believing a negative**: paid off directly. A canvas
  readback reported a working renderer as pure black; the context had
  `preserveDrawingBuffer: false`, which makes post-composite readback black *by
  specification*. Had that lesson not already been in memory, I would have filed a phantom
  regression against my own change.

## Mistakes I made

1. Left the seed out of the RNG's keying path, collapsing 1000 worlds into 1. Caught by test.
2. Repeated the identical mistake in a second function (`driftGenome`) in the same file.
3. Accepted a passing corner-luminance measurement as satisfaction of a composition law;
   the screenshot showed the exact failure the owner had already rejected once.
4. Over-corrected the fix into the opposite failure (blown highlights, posterised plateaus)
   and needed a second art round.
5. Shipped a feature whose identity readout was overwritten by an unrelated per-frame update
   — the world id existed for about a third of a second.
6. Fought Bash heredocs through two silent failures before switching tools.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What finally stopped it |
|---|---|---|---|
| Seed omitted from RNG keying path | 2 (both call sites, one file) | no | A test asserting different seeds diverge — not the determinism test |
| Metric passed, intent failed | 2 (empty corners, then blown field) | partially (Rule 73 covers "proof", not "proof of the right thing") | Reading the rendered screenshot, twice, and treating my own eye as a gate |
| Trusting a readback without checking the instrument | 1 (caught, no false claim filed) | **yes** — the lesson was already in memory | Checking `getContextAttributes()` before believing the negative |
| Shell heredoc mangling template literals | 2 | no | Switching to the file-write tool instead of escaping harder |

The repeat that matters is row 1: the same mistake twice in one file, minutes apart, because
I copied the pattern rather than the understanding. The procedural fix is the test, not the
resolve — "assert divergence whenever you assert determinism" is executable; "be careful
with seeded RNGs" is not.

## External-model calibration

| Seat | Findings real | Findings refuted | Cost | Worth |
|---|---|---|---|---|
| Sol | reversed a standing ruling; determinism contract adopted wholesale | — | $0.488 (prior day) | highest per-dollar on architecture and contracts |
| Kimi | substrate-monotony thesis, honest dev-month pricing | 1 (HUD reports an average) | $0.327 (prior day) | best at naming what nobody wants to say |
| GLM | "Chapter Light" — best single idea in the panel | 3 (dt bomb, HUD cost, and its severity ranking) | $0 | free breadth; verify every runtime claim it makes |
| Qwen (local) | correct on the substrate ceiling and pHash | 1 (rejected "do not cap resolution") | $0 | genuinely competitive with paid seats; run it always |

The standing pattern, now with numbers behind it: **external seats are strong on
architecture, pricing and dissent, and weak on claims about code they cannot read.** Three
of the panel's most alarming findings — including one flagged as the most likely crash in
the product — died to single grep commands. Budget review time for verification, not for
absorbing findings.
