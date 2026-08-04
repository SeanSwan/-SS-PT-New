---
decision: "Consult brief — Focus Flow exercise-nav relocation + Lens world-seam theming pass (Sean live-logger report #1)"
status: open
supersedes: none
---

# KIMI CONSULT BRIEF — Focus Flow exercise nav + Lens seam (2026-07-31)

## Context (shipped state you are reviewing against)
The SwanStudios Workout Logger is a six-zone SESSION SHELL (live in production):
sticky **ContextBar** (client · date · plan chip · 2 numbers, z70) → **NoticeLane** (one notice max)
→ **StageRail** (Setup·Train·Finish free tabs) → **StageCanvas** (document scrolls; per-stage scroll memory)
→ fixed bottom **ActionBar** (z80: mic + coach icons left, center = rest countdown when resting / "12/24 sets"
meter otherwise, ONE stage-aware primary right: Save / Finish workout). Default Train skin = **Focus Flow**:
one exercise at a time — a horizontal **ProgressRail** of pill chips (one per exercise, number-dot + full
exercise name, gold when done, world-accent when active), a **NOW hero panel** (kicker "Exercise 3 of 11 /
SET 2 OF 4", big exercise name, trend chip, warm-up-ramp button, mandatory "Next up →" chip), the proven
exercise card, then a **sticky bottom ThumbBar** (`bottom: ActionBar+96px`): Prev ← | "12/24 sets" | → Next.

Laws that bind any change: M3 anti-jump (NO scrollIntoView / smooth scrolling / window.scrollTo anywhere in
runner/**; rail keep-in-view is done via instant `rail.scrollLeft` assignment — already shipped); Law 0
(assigned-session cold load = first incomplete set loggable in ONE tap, nothing ever jumps); skins render
ZERO rest controls; gold = earned ONLY; purple = Coach ONLY; 44px targets; ≤300-line files; tokens via
`var(--token, #fallback)`.

**Swan Lens (Appearance Studio) seam:** the logger sits inside a WorldContractRoot exposing per-palette
custom properties — `--world-bg`, `--world-panel`, `--world-text`, `--world-muted`, `--world-accent`,
`--world-action` (Crystalline defaults at class level; a committed Lens recipe overrides them inline).
ONLY `--world-*` respond to palette switching inside the logger. App tokens (`--surface-raised`,
`--surface-elevated`, `--bg-deep`, `--text-primary`, …) are static.

## Sean's live report (owner, 2026-07-31)
1. The exercise chips ("orange circular tabs") run off-screen; on desktop there's no way to hold-and-drag
   the rail. (The flex-shrink clipping root cause is already fixed and live; hidden scrollbar means desktop
   mouse users still have no scroll affordance.)
2. The bottom Next/Prev ThumbBar makes the screen "jump a little" on every press. He wants exercise
   navigation at the TOP, "where the header is", so nothing moves.
3. "The whole setup seems kinda backwards — improve the area, make it more functional, next level, ultra
   mobile responsive (iPhone XR 414px)."
4. Lens theming: "the main panel stays blue no matter what theme I choose; not every element changes color
   with the theme." VERIFIED root cause: the NOW hero uses `var(--surface-raised, #003080)` and
   `--surface-raised` is defined NOWHERE — the blue fallback always wins, under every palette. Same class of
   drift: rail chips on `--surface-elevated`, shell chrome on `--bg-surface`/`--text-primary`/`--text-muted`.

## Proposed direction (attack this)
**A. One top navigation cluster (replaces the ThumbBar entirely):**
```
[◀] [ ①✓ ②✓ ③-Bench Press——— ④ ⑤ ⑥ ⑦ ⑧ … ] [▶]      ← one row, top of the Train canvas
```
- 44px ◀ ▶ arrow buttons FLANK the existing scrollable chip rail — they navigate prev/next exercise
  (disabled at the ends); the shipped keep-in-view effect (instant scrollLeft) brings the active chip into
  view. One mental model: the rail IS the navigation.
- **Compact chips:** inactive = number-only circle (44px hit target, done = gold ✓, ⛓ edge for supersets);
  ACTIVE chip expands to a pill with the exercise name. 11 exercises ≈ ~8 visible at once on 414px instead
  of ~2.5 full-name pills today. Full names stay in aria-labels; the active name is huge in the NOW hero
  anyway.
- **Desktop hold-and-drag** on the rail (pointer capture, mouse pointerType only, ~5px click-vs-drag
  threshold, cursor grab/grabbing) + vertical-wheel→horizontal-scroll on hover (non-passive listener).
  Touch keeps native scrolling (overscroll-behavior-x: contain already shipped).
- Arrow-key roving tablist (matches the StageRail's shipped WAI-ARIA pattern).
- **Delete the ThumbBar.** Its meter is redundant (the ActionBar center already shows "12/24 sets"); its
  Prev/Next move into the top cluster. Bottom of screen = ONLY the ActionBar again. Nothing sticky-bottom
  remains in the skin, so nothing can jump when card height changes.
- NOT sticky in v1 (normal flow at canvas top; nothing above it changes height, so it cannot jump; the
  mandatory "Next up →" chip in the NOW hero still advances without scrolling). Sticky-under-ContextBar
  (measured-offset var) is a candidate follow-up — is it worth the complexity now?

**B. Lens world-seam pass (the theming fix):**
- NOW hero: `linear-gradient(165deg, color-mix(in srgb, var(--world-accent, #60c0f0) 16%,
  var(--world-panel, #141419)) 0%, var(--world-bg, #0a0a0f) 90%)`; name/text → `--world-text`; kicker keeps
  TRAIN.active (already rides `--world-accent`).
- FocusFlow chrome (chips, next-up, trend, borders) → `--world-panel` / `--world-text` / `--world-muted`
  mixes. Gold(done/PR) + purple(Coach) stay brand-fixed semantics — they must NOT re-theme.
- Shell zones (ContextBar / ActionBar / NoticeLane surfaces + text) → same world seam, so the whole logger
  answers the palette. ActionBar's primary Save button currently wears the brand blue→lavender gradient —
  should it ride `--world-accent/--world-action` instead, or stay brand-constant? (Dual-Button-Glow is a
  house law; the world seam is newer. Give a ruling.)
- Sibling skins (Ledger Pro, Sheet Stack) get the same-class token sweep.
- Every combo must hold computed WCAG ≥4.5:1 per palette (a contrast audit test exists for recipes; it will
  be extended to the new combos).

## Your job
Hostile-review direction A + B against the laws above, then add YOUR OWN ideas (creative peer, not just
critic): what would make this exercise-navigation area feel best-in-class in a 2026 training app — better
than Strong/Hevy/Fitbod — while staying one-hand-usable mid-set on a phone at the gym? Specifically rule on:
(1) compact number-chips vs full-name pills; (2) sticky-now vs sticky-later; (3) arrows: navigate exercises
vs page the rail; (4) the ActionBar primary brand-vs-world question; (5) anything that breaks Law 0 / M3 /
the one-notice / zero-rest-in-skins laws that I missed.
