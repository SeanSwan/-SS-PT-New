---
decision: "Two jobs for each seat: hostile-review the five shipped console slices, then design the save-a-prompt / favourites feature as a full blueprint with mermaid and wireframes. Two independent designs, then a synthesis."
status: open
board: SWA-186
date: 2026-08-27
author: Opus 5 (VS Code terminal)
privacy: IDs and roles only. No PII, no keys, no client names.
---

# Panel packet — hostile review of the console, then design Favourites

You are one seat of two (GLM 5.3 and GLM 5.3 Flash), working independently. **Do not hedge toward
what you think the other seat will say.** Your two answers get audited against each other and the
best of each is taken, so a distinctive, well-argued position is worth more than a safe one.

There are **two parts**. Part A is a hostile review of work already shipped. Part B is a design
brief. Do both, in order, because what you find in A should inform B.

---

# PART A — hostile review of the five shipped slices

## A1. What the tool is

A local, single-URL creative tool. Plain **HTML + CSS + vanilla JS**, served by a small Node static
server. **No build step, no framework, no bundler, no runtime npm dependency.** Any proposal that
needs React, Tailwind, a component library, or a package install is rejected on arrival.

The loop: the owner judges grids of 12 photographs (the reason for a pick is locked in *before* the
picture is revealed; a picture is never shown twice; Undo restores a grid) → that compiles into
three named **Directions** → **Make** writes prompts in that memory's taste and queues them to the
owner's own local GPU → what he decides is right lands in **Gallery**.

**A "memory" is `profile × project`.** Profiles: the owner, a partner (her own business), and a
client mode used for sales role-play. A memory starts empty and inherits nothing. **The governing
law: a memory generates only from its own evidence.** The owner subscribes to a third-party
reference archive; only his own memories may ever draw on it. That law was found broken at six
separate layers in an earlier review, so it is treated as the highest-priority invariant.

## A2. What shipped, slice by slice

| Slice | What landed |
|---|---|
| 1 | Design tokens; a 3px **profile spine** across the top whose colour encodes the active profile, plus a text label so identity is never colour-only; a `.plate` treatment for gallery imagery. All inside `@layer slice1`. |
| 2 | **Three sections** (Judge / Make / Gallery) down from four tabs. Directions demoted from a destination to a **read-only Evidence rail inside Make**. CSS-only left rail on desktop, bottom bar on phones. Per-profile landing: client mode always opens in Gallery. |
| 3 | Gallery proper: plate grid, native `<dialog>` lightbox, a per-memory text filter, and image discipline (`loading=lazy`, `decoding=async`, real `alt`, width/height attributes). |
| 4 | A **queue pill** in the header (GPU ready / busy / offline), polling with back-off and pausing on a hidden tab. "Again" and "Four ways" on render plates. |
| 5 | **Presentation mode** and a printable brief. Both strip internal material — style codes and working notes — from the client-facing view. |

## A3. Decisions taken, with the reasoning, so you can attack the reasoning

1. **`@layer slice1` for almost everything.** Unlayered author CSS (the two pre-existing
   stylesheets) beats layered CSS regardless of specificity, so "the judging surface always wins"
   became a cascade guarantee rather than a hand audit.
2. **Seven deliberate exceptions sit unlayered**, each because it must beat a pre-existing rule:
   the rail's layout offset, the phone padding, a checkbox reset, `main > section[hidden]`, the
   presentation-mode block, the print block, and a search-field reset.
3. **The judge grid was never given the plate treatment.** The blueprint said `object-fit: cover`;
   the judging surface uses `contain`. Applying it would have started **cropping the photographs
   being judged**. Deferred behind a screenshot diff, still deferred today.
4. **Presentation mode is CSS-driven off one body class.** Nothing is removed from the DOM and
   nothing is re-fetched, so exiting is instant and there is no second render path to drift.
5. **The filter is `includes()` over on-card text.** A semantic/embedding search was refused twice:
   new dependency, and it would index across memory boundaries.

## A4. Bugs found during the five slices — the pattern is the point

These were all real, and most were self-inflicted. Read them as evidence about where this codebase
hides failure, and tell me what class is still unaddressed.

- **The sections never actually hid.** A pre-existing `main > section { display: block }` overrode
  the browser's `[hidden]` rule. `show()` had been setting `.hidden = true` correctly the entire
  time with **no visual effect** — every section rendered, stacked, and switching "tabs" only
  scrolled. Found by reading computed `display` after a screenshot looked wrong.
- **Every labelled input rendered 160px tall.** A pre-existing `input { flex: 1 1 160px }` was
  written for a ROW container; the label wrappers are `column`, where that basis becomes *height*.
- **Adding `width`/`height` attributes broke the layout.** The HTML `height` attribute is also a
  presentational hint, so cards became 100%-wide by a literal 500px tall and `aspect-ratio` was
  ignored. `height: auto` is the required other half of that pairing.
- **Two stale section-name guards.** After the rename, `current === 'kept'` and
  `current === 'directions'` never fired, so switching memory silently stopped refreshing Gallery.
- **The printable brief had no directions**, and the one print rule that forced it visible pointed
  at a section deleted two slices earlier.
- **Fourteen `--sref` style codes were sitting in the client-facing view**, one Ctrl+P from a
  client's hands.

## A5. The weakest part, stated plainly

**There are no automated tests for any of it.** The project has 10 Node suites (~494 assertions)
covering the corpus law, the writer, generation and the API — all still passing — but **every
console guard across all five slices was a manual browser probe, written ad hoc and thrown away.**
Nothing mechanical stops a future change from silently undoing the style-code stripping, the
section hiding, or the read-only evidence rail.

## A6. What Part A must return

1. **Defects, ranked.** What is broken, or will break. For each: the concrete trigger, the fix, and
   `CONFIRMED` (you can name the mechanism) or `SUSPECTED` (name the probe that would settle it).
2. **The unaddressed failure class.** Given A4, what kind of bug is this codebase still wide open
   to that none of those six were? Be specific, not "add more tests".
3. **The test question.** Given no build step and no test framework for the browser layer, what is
   the *smallest* mechanism that would actually hold these guards? Name what you would test first
   and what you would deliberately not bother testing.
4. **What you would delete.** Anything shipped across the five slices that is not worth its
   maintenance weight.

---

# PART B — design Favourites (save a prompt you like)

## B1. What the owner asked for

> "I would want there to be an option to save the prompts. So if there's a prompt that I really
> like, I should be able to save it and add it to favourites. And then that UI/UX should be pretty
> and beautiful. It shouldn't be some generic slop."

## B2. THE TRAP — read this before designing anything

**A "Keep" button already exists on every generated prompt. It is not a bookmark.**

A kept prompt is re-injected into generation as an exemplar with **score 1000**. The code's own
comment: *"dominates corpus scores; kept work is the strongest signal there is."* Keeping is the
compounding channel — it is how the tool becomes more like its owner.

So "save this prompt because I like it" is **ambiguous between two very different actions**:

- **Steer** — this is what I want more of. Changes every future batch. (Today's Keep.)
- **Shelf** — remember this one, I might use it again. Changes nothing about generation.

If Favourites is wired to the existing Keep, then a pretty ♥ silently reweights everything the tool
produces, forever, and the owner is never told. If Favourites is a *second* list, the tool now has
two save actions and the owner must understand the difference at a glance — and two lists that both
mean "I liked it" is exactly how tools rot.

**Take a position and defend it.** Options include, and are not limited to:
(a) Favourites *is* Keep, renamed and made beautiful and honest about what it does.
(b) Favourites is a separate shelf; Keep stays the steering action; the UI must make the
    distinction obvious without a tooltip.
(c) One action, two strengths (a save that can be *promoted* to steering later).
(d) Something better that neither of those is.

A design that does not resolve this is not finished, however pretty.

## B3. Where prompts exist today

- **Make** renders each generated prompt as a card with actions: `Keep`, `Make`, `Make 4`, `Copy`,
  `Prefix`, and a style-code rating control.
- **Gallery** lists kept prompts as text rows with `Make`, `Make 4`, `Copy`, `Drop`.
- Render plates in Gallery carry `Again` and `Four ways`.
- Everything is per-memory. A prompt saved in one memory must never surface in another.

## B4. Hard constraints

1. **No build step, no framework, no dependency.** Hand-written HTML/CSS/vanilla JS or it does not ship.
2. **Local-only.** Host-gated server, no CORS headers, nothing leaves the machine.
3. **Files stay under ~300 lines.** A new surface means a new file, not a longer one.
4. **44px minimum targets. WCAG 4.5:1 for text, 3:1 for non-text indicators. `prefers-reduced-motion`
   respected. `forced-colors` (Windows High Contrast) must not make state invisible.**
5. **A memory generates only from its own evidence.** Favourites must not become a cross-memory pipe.
6. **Presentation mode and print must stay clean.** If favourites show style codes, they must be
   stripped in front of a client exactly as everything else is.

## B5. The house design law this must obey

Palette (dark-first): Obsidian `#0A0A0F`, Carbon `#141419`, Graphite `#1A1A24`, Midnight Sapphire
`#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0`, Gilded Fern `#C6A84B`, Frost White `#E0ECF4`,
Wing Purple `#8B5CF6`.

- **Dual-Button Glow:** a blue surface takes a **purple** glow; a purple surface takes a **cyan** glow.
- **Wing Purple is a glow/border colour only, never text.** Measured: 4.66:1 on Obsidian, and it
  FAILS on every other surface — 4.34 Carbon, 4.07 Graphite, 3.61 Sapphire, 2.86 Royal.
- **A Frost White indicator on gold or ice fails 1.4.11** (1.92:1 and 1.70:1). Obsidian passes on
  all three profile colours (8.56 / 9.68 / 4.66).
- Typography available: Plus Jakarta Sans (UI), Sora (headings), Fira Code (prompts, codes, data),
  Cormorant Garamond Italic (one editorial flourish, client-facing only).
- Governing visual law for this tool: **the chrome recedes so the photographs carry all the colour.**
  Nearly monochrome interface; the only saturated things are the profile spine and the pictures.

**Explicitly banned** (the house rejects these even when a reference library suggests them): a
default equal 4-up box grid; decorative motion with no information job; any control that does not
execute, navigate, open a real surface, or toggle state; tab/action collisions on mobile; equal-card
grids that hide hierarchy or clip content; retired Galaxy-Swan tokens (`#0a0a1a`, `#00FFFF`,
`#7851A9`).

## B6. What Part B must return

1. **The B2 ruling**, argued in prose. One paragraph minimum. This is the load-bearing decision.
2. **A mermaid flowchart** of the save action end to end — from the moment the owner sees a prompt
   he likes, through what is written where, to where it resurfaces later and what it does to
   generation. Show the branch your B2 ruling creates.
3. **A mermaid state diagram** for a single prompt's save state (unsaved → … → and back).
4. **ASCII wireframes**: the save affordance in place on a Make prompt card; the favourites surface
   itself at desktop width; and the same surface at 390px.
5. **The signature moment.** One memorable visual move this feature is built around, described
   concretely enough to implement in CSS — actual properties, not adjectives.
6. **Where it lives.** A fourth section? Inside Gallery? A drawer? Defend it against the
   three-sections-not-four discipline that slice 2 established.
7. **Click cost.** Taps to save a prompt, to find one later, to use one again. Compare against
   today's Keep.
8. **Three ways your design fails.** Concrete.
9. **The tests you would write**, given A5 and the no-framework constraint.
10. **What I checked and found sound** — required, so the next reviewer does not re-tread it.

Be concrete enough that a builder needs to ask you nothing.
