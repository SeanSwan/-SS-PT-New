# SWAN VISUALIZER — HOSTILE PANEL PACKET — 2026-08-20

**Remit: attack the architecture against the owner's stated vision, then say what one month of work should actually be spent on.** Do not be polite. The builder of this system is asking you to find the reason it will fail.

---

## 1. The owner's vision, in his own words

Sean Swan, across sessions, on what this product must become:

> beat iTunes/WinAmp → MilkDrop level and above → the level of the Microsoft photographers who make the Windows Spotlight images

> **"I need to watch this thing for 24 hours and think: did I even see a repeat yet?"**

> "we're completely developing something from scratch… original… something I can claim as my art process."

> **"I needed the granular level control in order to be able to create different visuals and themes as well. And we're supposed to be coming from a granular level to develop these new themes and these new worlds that last long enough for 24 hours to go by and you not see the same thing over again."**

Standing taste law, learned expensively: density to the corners, never mostly-empty; realistic physicality over abstract noise; options must be visible and one click away; defaults must open on what he loves; he judges on his own hardware (RTX 5090) and rejects anything choppy.

**The two claims under test in this packet are the two in bold: granular authoring control, and 24 hours without perceived repeat.**

---

## 2. What actually exists (verified this session, not asserted)

A standalone TS + Vite WebGL2 visualizer. Audio in (file or mic) → a "world" renders.

**The world engine.** A *kernel* is a GLSL fragment shader defining a visual grammar. A *genome* is a quantised u16 vector of bounded axes that parameterises it. Four kernels are registered, closed and statically imported:

| kernel | axes | machine |
|---|---|---|
| swanFeedback | 20 | energy field advected through itself (feedback) |
| inkVortex | 17 | feedback |
| nave | 16 | feedback |
| pelagos | 17 | **Gerstner heightfield, no history, has a horizon** (added today) |

Supporting machinery that works and is tested (504 tests, tsc clean, build clean):
- Per-axis seeded genome substreams; identity is the stored vector, not the seed; hashed to a shareable world id.
- OKLab palette generator with five enforced laws (monotonic luminance spine, min adjacent ΔE, chroma floor, ≤2 hue families, accent budget). **One generator, shared by every kernel.**
- Breeding: mutate + crossover, per-axis inheritance, axis-group locks (motion/form/colour/energy).
- A 16-term deterministic natural-language command layer ("slower", "warmer", "more chaos"). No model.
- Favourites persisting the genome; set-list with farthest-first ordering.
- A variety harness that samples the rendered canvas into a 76-dim descriptor and computes cluster counts and distances.

**UI surface:** New world · Breed · Cross · Surf 9 · four axis-group locks · Keep · Saved worlds · a command box · six scene buttons · MilkDrop preset controls.

---

## 3. The measurement, and why it is the crux

The engine is scored against the bundled 100-preset MilkDrop pack under one descriptor, n=24, both arms in one build.

**Distinguishable looks (cluster count, median over 40–60 seeded permutations):**

| θ | 0.04 | 0.06 | 0.08 | 0.10 | 0.12 | 0.16 |
|---|---|---|---|---|---|---|
| MilkDrop pack | 24 | 23 | 23 | 23 | 19 | 11 |
| Swan engine | 24 | 21 | **18** | 16 | 11 | 9 |

The hand-authored pack wins at every θ ≥ 0.06 and the gap widens. **The generative engine is currently LESS various than 100 files someone wrote by hand.**

**Cross-kernel breadth (n=24/kernel, two independent runs, RTX 5090, today):**

| pair | combined | structure-only | colour-only |
|---|---|---|---|
| feedback × inkVortex | 1.12 | **0.99** | 1.13 |
| feedback × nave | 1.10 | **0.99** | 1.11 |
| inkVortex × nave | 1.14 | **0.92** | 1.16 |
| feedback × pelagos | 1.07 | **1.85** | 1.00 |
| inkVortex × pelagos | 1.11 | **1.87** | 1.04 |
| nave × pelagos | 1.06 | **1.50** | 1.02 |

(Ratio = across-kernel mean distance ÷ within-kernel mean distance. 1.0 means "two different kernels are no further apart than two genomes of the same kernel".)

Two findings, both replicated:

1. **The three original kernels are structurally ONE grammar.** 0.92–1.02 against each other — at or *below* their own within-kernel baseline.
2. **The acceptance metric cannot see grammar.** The descriptor is 36 colour dims at full weight + 16 orientation and 12 motion at 0.6. Colour comes from the *shared* palette generator, so it is kernel-invariant by construction. It drags a real 1.85 structural separation down to a combined 1.07.

The standing acceptance bar ("a new kernel counts only if it beats the within-kernel mean by ≥50% against every existing kernel") therefore **failed Pelagos at 1.07**, using a metric that is roughly half blind to the property it adjudicates.

---

## 4. The questions. Answer these, hostilely and specifically.

**Q1 — Is 24 hours without perceived repeat reachable from this architecture at all?**
Do the arithmetic rather than asserting. A viewer watching continuously, worlds changing every N seconds. What is the actual number of *perceptually distinct* worlds required, and what does the measured cluster count (18 at θ=0.08 across the whole genome space of one kernel) imply about the ceiling? If the answer is "no", say so plainly and say what architecture WOULD reach it. Consider: is perceived repeat a function of distinct worlds, or of *grammar* recurrence — i.e. does a viewer tire of the machine long before they exhaust the parameters?

**Q2 — Is the descriptor salvageable as the governing instrument, or should it be replaced?**
It currently drives breeding selection, set-list ordering, and the acceptance gate for new kernels. Colour is kernel-invariant. Occupancy is excluded from distance. Motion is 12 dims at 0.6. Specifically: should the acceptance metric drop colour; and separately, is a hand-rolled 76-dim descriptor the right instrument at all versus a perceptual/learned embedding, given the standing constraint of NO ML WEIGHTS IN THE SHIPPED RUNTIME (an offline-only measurement tool is permissible)?

**Q3 — What does "granular level control" actually require that does not exist?**
Today the owner gets: reroll, breed, cross, four axis-group locks, and 16 English commands. He does NOT get: direct per-axis manipulation, a visible parameter surface, save/name/version of a *theme* as distinct from a *world*, layering or composition of kernels, or any authoring of new grammars without writing GLSL. Which of these is the actual bottleneck for his stated goal? Be concrete about the UI and the data model, not aspirational.

**Q4 — Goodhart risk.** Breeding selects on the descriptor. The descriptor rewards edge spread. The owner's taste explicitly forbids "abstract noise" and demands "realistic physicality" and "density to the corners". Two prior reviewers ruled the taste instrument a fig leaf because it is a *gauge, not a governor* — it measures but constrains nothing. What is the correct fix, and what breaks if taste becomes a term in the fitness function?

**Q5 — The one-month plan.** Given ~1 month of a competent builder, ranked by value-per-week, what should be built? Name what to CUT as well as what to build. The owner's revealed priorities are, in order: granular authoring control; 24h non-repeat; original art he can claim; beauty at Windows-Spotlight level. Assume a single builder, no new paid infrastructure, no ML weights shipped in the runtime.

**Q6 — What is the thing nobody has said yet?** The builder has been measuring diligently and may be measuring the wrong thing entirely. Name the assumption underneath this whole architecture that is most likely to be wrong.

---

## 5. Standing constraints (violating these makes a recommendation useless)

- **Never generate, breed, or import shader/preset equation TEXT.** MilkDrop presets are executable code (`new Function` verified). Kernels are reviewed source; genomes are bounded numeric vectors. "Generation" means numbers into vetted kernels.
- **No ML weights in the shipped runtime.** No network calls at runtime; no provider key in the browser.
- Reduced-motion honoured. Every feature reachable in ≤2 clicks. 44px minimum touch targets. Deterministic where identity matters.
- The owner rejects choppiness on sight; he runs a 5090 but the thing must not depend on one.
- Judged on HIS hardware, by HIS eye. No recommendation may end at "and then measure it" — he is the instrument of last resort.

---

## 6. Output format

For each question: a direct answer in the first sentence, then the reasoning, then what you would DO. Flag disagreements with the packet's own framing — especially if you think the 24-hour goal, the descriptor, or the kernel architecture is the wrong frame. Rank every recommendation by value-per-week for a single builder over one month. If you believe the honest answer is "this cannot work, change the goal", say that.
