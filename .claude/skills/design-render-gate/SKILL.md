---
name: design-render-gate
description: >-
  MANDATORY before any design work is shown to Sean. Renders every board in real
  Chromium, measures dead space / overflow / broken images / unresolved template
  holes, writes PNGs, and requires the agent to actually LOOK at them. Also
  enforces the Reference Quality Ladder and the creative-is-the-heavy-lifter law
  from field-techniques.md. Load for any task that produces a page, artboard,
  canvas, mockup, theme, or visual variant — before publishing, not after.
---

# DESIGN RENDER GATE

You do not get to say a design is done, good, distinct, or ready until you have
**rendered it and looked at it.** Reading your own HTML is not looking.

## Why this exists

2026-08-20. Fifteen designs across four published canvases. Every one shipped
without the agent ever viewing a single rendered board. Every "gate" written for
those runs read strings inside HTML files. `render-check.mjs` was run afterwards
and found, in one pass, what no string gate had:

- **40–78% of every board was empty.** Frames declared at 3400px; ink stopped
  between 763px and 2028px. Two thirds of each design was void.
- **All ten overflowed horizontally at 414px.** Fixed 1280px roots, zero
  responsive behaviour, on a project whose rules require a 320–3840px matrix.

Sean saw all of it in one screenshot. No gate did. He was the only renderer in
the loop for an entire day of work.

## THE FIVE LAWS

### 1. RENDER BEFORE YOU CLAIM
Run it. Non-negotiable:
```bash
node scripts/design-brain/render-check.mjs --dir <dir-with-.dc.html> --widths 1440,414
```
Exit non-zero = you may not present. It measures what only pixels reveal: true
ink height vs declared frame, horizontal overflow, images that failed, template
holes rendered literally, sub-12px text, tap targets under 44px.

### 2. LOOK AT THE PNGs — with your eyes, not your inference
The tool writes `_render/<Board>-<width>.png`. **Read them.** If your Read tool
renders images, you have no excuse. If it does not, say so explicitly and hand
the PNGs to Sean rather than claiming a verdict you cannot support.

Numbers cannot tell you it is beautiful. A board can pass every check and still
be boring — and boring is the actual failure mode being fought here.

After looking, answer in writing, per board:
- What is the **signature moment**? If you cannot name one, there isn't one.
- Would this be mistaken for a template screenshot? (Rule 22 / LAW 11.)
- Where does the eye go first, and is that where it should go?

### 3. THE CREATIVE IS THE HEAVY LIFTER
From `docs/ai-workflow/design-brain/field-techniques.md`, distilled from six or
seven transcripts Sean supplied:

> *"Every site in these transcripts is carried by a bespoke 8-second generated
> hero. Swan generates almost none. The creative is the heavy lifter, and Swan
> isn't lifting it."*

A page built from CSS gradients, SVG shapes and a reused stock frame will be
boring **no matter how good the layout is.** That is not a taste problem, it is
a missing-asset problem.

- Budget the hero creative FIRST, before layout.
- **Image-first, then video** — triple-confirmed across independent sources.
  Generate at 480p (~$0.10–0.50), approve the art direction, *then* upscale.
  Finished video ≈ $1–2. Never explore at full res.
- **Transparent PNG, never vector.** *"AI likes to create really bad
  illustrations in vector formats. Instead use a transparent PNG — it can sit
  on top of anything: giant typography, or a video background."* CSS gradients
  and inline SVG are the vector failure mode wearing a different hat.
- Tools: `scripts/forge.mjs` (~$0.004/image, `--confirm-spend`) for stills;
  MiniMax H3 for film. **HY3 is a text reviewer and cannot generate images.**

### 4. THE REFERENCE QUALITY LADDER — declare your tier at Gate 0

| Tier | Reference supplied | Result |
|---|---|---|
| **S** | URL + repo + original prompt + live demo + stack | near-exact reproduction |
| **A** | URL of the target | agent inspects the live thing |
| **B** | Screen recording | motion captured, structure inferred |
| **C** | Screenshot only | static — **this is where vector-slop begins** |
| **D** | Prompt, no reference | worst |

**Below B on an *awe* surface requires written justification.** Hero, landing,
showcase and brand surfaces are awe surfaces. Mobbin returns screenshots — that
is **tier C**. Mobbin is the lane for *conventional working surfaces*; it is
explicitly NOT the lane for awe (CLAUDE.md rule 40 taste-ceiling doctrine).

If you are about to design a front page from Mobbin screenshots: **stop and ask
Sean for a tier A/B reference** — a URL or a screen recording of something he
loves. That single question is worth more than ten more variants.

### 5. FRAME HEIGHT IS MEASURED, NEVER GUESSED
Set the artboard frame from the rendered ink height + a stated margin. A guessed
frame is how two thirds of a design becomes void. `render-check.mjs` reports
`ink` per board — use that number.

## Order of operations

```
reference tier declared  →  hero creative generated + approved  →  layout
   →  render-check  →  LOOK at the PNGs  →  name the signature moment
   →  only then publish
```

Layout before creative is how you get fifteen boring pages.

## What this does NOT replace

Structural distinctness gates, copy-fidelity gates, LAW checks, the asset-harvest
gate. Those are necessary and were all passing while every board was two-thirds
empty. **Passing a string gate is not evidence about pixels.**

## Anti-pattern this exists to kill

Writing a gate that scores properties *adjacent* to the failure, then reporting
its PASS as proof. Before shipping any gate, state the exact bad artefact it must
reject, and confirm it would. If you cannot name that artefact, you wrote a
metric, not a gate.
