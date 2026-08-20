---
title: Promoting an element changes what its failure modes cost
originating_model: claude-opus-5
tier_basis: Sean's designation 2026-08-10 — Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist.
date: 2026-08-20
decision: a redesign that raises an element's prominence inherits responsibility for that element's empty and wrong states, because prominence is the multiplier on what those states cost; and no negative observation may be believed until one command has distinguished a real negative from a broken instrument
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
models_used:
  - model: claude-opus-5
    role: builder and sole hostile reviewer
    did: answered the parked design question with the owner rather than guessing; queried the local Swan Brain for design evidence and applied two ideas that changed the code; built the COLD PORCELAIN chrome; ran six hostile rounds; drove the real UI over CDP to prove behaviour tests cannot show; found and fixed seven defects in its own work, four of which were false alarms from broken probes
    cost: subscription (flat)
skills_touched:
  - id: src/worlds/engine/chromeAccent.ts
    change: created
    failure: a ratified chrome identity ("the frame's one colour is stolen from the painting, live") had gone unbuilt for months because its stated form — an 8x8 readPixels sample of the rendered frame — required a rendering-config change with a frame cost, and nobody separated the idea from that one implementation of it
  - id: Rule 73 (proof-before-done)
    change: reinforced
    failure: four separate negative observations this session were artifacts of the measuring apparatus, not of the code; the rule's existing "validate the instrument" clause was in context the whole time and did not prevent a single one
---

## What happened

A standalone visualizer's chrome was called generic by its owner. The fix was to build a
chrome identity a panel had ratified long ago and nobody had implemented, and to promote
the world's identity — the string the owner can write down and return to — from 7pt grey
text ellipsised in the corner of a control row to the largest type in the interface.

The build was straightforward. Everything expensive happened afterwards, in review.

## Who did what

**claude-opus-5** did all of it, and was wrong repeatedly in a specific, patterned way.

It got two things right that are worth keeping. First, it asked the owner the question the
previous agent had deliberately parked — "Apple, but not Apple. Makes it Android" reads as
either Apple-grade refinement with its own language, or a Material-influenced direction,
and those lead somewhere very different. One message resolved it and prevented a whole
wasted gate cycle. Parking a genuinely ambiguous question is better work than resolving it
by coin-flip, and the parked question should be the successor's first action.

Second, it used the local book corpus as evidence rather than decoration, and two ideas
from it changed the code rather than the commit message. That only worked after
discovering the corpus is keyword search, not semantic: broad design queries returned a car
hacking manual and a PC magazine. The access pattern that works is to locate a known title
by path match in the index and grep its extracted text directly.

What it got wrong is below, and the pattern matters more than any individual instance.

## Skills created or changed

`chromeAccent.ts` exists because of a specific failure of imagination that had frozen a
good idea for months. The ratified identity said the chrome's one colour is sampled live
from the rendered frame. That form needs a readable drawing buffer, which is a rendering
change with a real frame cost, so it never got built and the chrome stayed generic. The
idea and that implementation are separable: the same colour is available at the data level,
from the palette the shader is already uploading — deterministic, unit-testable across 120
seeds, zero GL cost. **A ratified idea blocked on its most expensive form should be
re-examined for a cheaper form that satisfies the same intent, rather than left unbuilt.**

## Mistakes I made

- **Trusted a server I did not start.** A dev server was already on the port and served my
  first round of changes, so I assumed it was live. It had silently stopped picking up
  edits. I screenshotted the second round of fixes and saw nothing change, and my first
  instinct was that my CSS was wrong. The disproof cost one command: fetch the served asset
  and grep for a string only the new version contains.
- **Attached to the wrong browser target, then to a dead execution context.** My driver
  picked the first page target, which was a blank tab, so every read returned null and
  looked like a missing element. Having fixed that, I navigated an already-attached target
  and evaluated against the destroyed pre-navigation context — the identical null, the
  identical false conclusion, immediately afterwards.
- **Called a layout defect that was a screenshot artifact.** A control appeared to be
  missing at a narrow width. Measuring instead of looking showed the viewport was 476px,
  not the 414px I had passed as the window size, with zero horizontal overflow — the
  element was on screen and my screenshot canvas had cropped it.
- **Nearly attributed a pre-existing bug to myself.** The promoted label rendered a
  placeholder dash. Before fixing it I ran the original markup from HEAD on the same
  server and saw the identical placeholder. Pre-existing. What was mine was that my design
  turned a 7pt dash into a hero-sized stray rule across the screen.
- **Shipped a contrast failure in a token I introduced.** The neutral carrying the group
  labels, transport times and the whole telemetry rail measured 3.79:1 — small mono text,
  so the large-text allowance does not apply. Caught only because I computed ratios instead
  of trusting my eye on a dark ground, where everything looks fine.
- **Styled buttons by container and missed two.** Scoping the treatment to one wrapper left
  two rail buttons on native browser chrome: light grey fills, the brightest pixels on the
  screen, reading as the primary action — in a design whose entire thesis is one primary
  per group.

## Error → fix → repeat ledger

| error class | recurrences this session | previously written up? | what actually stopped it |
|---|---|---|---|
| Believed a negative produced by a broken instrument | **4** (stale server, wrong CDP target, dead execution context, cropped screenshot) | **Yes** — "validate the instrument before believing a negative" is already in this corpus, and was in context | Nothing yet, in-session. Each instance was caught only after wasted work, by a check I could have run first |
| Attributed a pre-existing defect to my own change | 1, caught before reporting | Yes (anti-rework burden of proof) | Running the original from HEAD against the same server before touching anything |
| Design regression invisible to tests, build and types | 3 (unstyled rail buttons, deck took 53% of the frame, mobile buttons collapsed under their labels) | Partially | Screenshots at several widths; none of the four green gates could see any of them |
| Accessibility floor breached in new tokens | 1 | No | Computing contrast ratios numerically instead of judging by eye |

The first row is the one worth Hermes's attention. **The lesson was already written down, in
this corpus, and I repeated it four times in a single session.** That is proof the write-up
was not a fix. A lesson phrased as an exhortation — "be careful", "validate first" — does
not survive contact with a plausible-looking failure, because at the moment of failure the
broken instrument is indistinguishable from a real defect and the mind reaches for the
explanation that is already loaded. The correction that survives is procedural and cheap
enough to run unthinkingly:

> Before believing any negative observation, run one command whose output distinguishes a
> real negative from a broken instrument, and paste that output beside the claim.

Concretely, in this domain: grep the *served* bytes, not the bytes on disk; print the
target you attached to; print the viewport the browser actually has, not the one you asked
for; run the *previous* revision through the same probe before blaming your change.

## The transferable finding

Prominence is a multiplier on failure. The promoted label in this session carried two
latent bugs that had been in the code for as long as the label had existed: an empty state
that rendered a placeholder, and a path that could name a world that was not on screen —
reachable because the announce call sits on the resolution of a scene switch, and a switch
that early-returns still resolves. Both were survivable at 7pt in a corner. Neither was
survivable at the largest size on screen, where naming a world the viewer cannot see is
simply false.

Nothing about the underlying bugs changed. What changed was the cost of them.

**So a redesign that raises an element's prominence inherits that element's empty state and
its wrong states, whether or not it introduced them, and cannot claim to be finished until
it has driven both.** Neither state is reachable from a static screenshot, and neither is
visible to tests, types or the build — all four of which were green through every version
of this work, including the versions with light grey buttons blaring out of a
zero-saturation design and a hero-sized dash across the top of the screen.

## External-model calibration

No paid model was consulted. The corpus queried is local and free; the hostile review was
my own, run to six rounds. The routing note worth keeping: **for a visual slice, the
expensive reviewer is a browser, not a model.** Every defect that mattered here was found by
driving the real page and reading computed values back — and four of the seven things that
looked like defects were the apparatus lying, which no model asked to review a diff could
have told me either way.
