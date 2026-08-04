# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs/ai-workflow/AI-HANDOFF/RAIL-NAV-CONSULT-KIMI-BRIEF-2026-07-31.md
**Seed:** (none)
**Tokens:** 2261 in / 1712 out · **Cost:** ~$0.0325 · **Wall:** 64.5s

---

# KIMI REVIEW — Focus Flow nav relocation + Lens seam

## (a) VERDICT: **SHIP-WITH-CHANGES**

Direction A is correct and eliminates the jump class entirely. Direction B fixes a real, verified bug but has one unresolved law collision (Dual-Button Glow vs world seam) that ships broken-by-default if not ruled on now. Details below, most severe first.

---

## (b) Design weaknesses (most severe first)

**1. The arrows are the wrong mental model — you're cloning the ThumbBar's flaw into the header.**
`◀ ▶` flanking a rail that also scrolls = two navigation paradigms fused. Sean's complaint #1 was "no scroll affordance on desktop," and your answer gives him buttons that *navigate exercises*, not scroll the rail — so a desktop mouse user who wants to *see* exercise 9 without leaving exercise 3 still has nothing until drag/wheel ships. Worse: on touch, the arrows duplicate swipe, adding two 44px chrome elements eating ~96px of the exact rail width you're trying to reclaim. **Fix: arrows on ≥768px only; touch is swipe-only.** Rule on (3): arrows navigate exercises (correct call), but they're desktop chrome, not universal chrome.

**2. Compact number-chips create a wayfinding hole the hero doesn't fully backfill.**
Number-only circles work for sets 1–3 done, but mid-workout, exercise 7 of 11, the user glancing at the rail gets zero semantic info about what's *ahead* — "what's after bench?" requires tapping. Fitbod/Hevy win here by showing the queue. Your defense ("name is huge in the NOW hero") covers the present, not the future. **Fix: active chip expands (your design) AND the next-incomplete chip renders a 3–4 char truncated name** (Bench…, Incl…) — one extra named chip, ~80px cost, restores the forward affordance without resurrecting full pills.

**3. Missing signature moment.** This brief is all chrome surgery, no soul. The exercise *completion* event (chip flips gold ✓) is the single most repeated reward loop in the product — 24+ times per session — and nothing in the brief gives it a moment. A 300ms GPU-safe gold radial pulse + chip scale 1→1.12→1 on completion (transform/opacity only, reduced-motion = instant flip) is cheap and turns the rail into the product's signature. Without it you've built a better tab bar, not a SwanStudios component.

**4. Depthlessness of the new cluster.** Number-circle chips on `--world-panel` with a border are flat, template-feeling. The active pill needs elevation: `--world-accent` 16% tint fill + inner 1px top highlight + glow shadow (accent at 35% alpha, blur 12, spread -2). Done chips get the gold treatment at lower intensity. Inactive circles: ghost. Three tiers of depth = hierarchy readable at arm's length, mid-set.

**5. Superset ⛓ glyph.** Chain-link emoji is the cheapest possible icon choice — inconsistent rendering across platforms, looks like a bug in a premium UI. Inline SVG link icon, currentColor, 12px, positioned between the two chips as a connector, not a badge.

---

## (c) Implementation-fidelity attacks

- **ThumbBar deletion — audit `bottom: ActionBar+96px` dependents.** Anything else positioned off that var (toasts, swipe affordances) silently misplaces. Grep before delete.
- **Drag vs roving-tablist conflict:** pointer capture with a 5px threshold on elements that are also `role="tab"` — ensure the click still fires `select` after a sub-threshold press, and that drag doesn't swallow the click for keyboard-adjacent pointer users. Test mouse-down → release-no-move = select.
- **Non-passive wheel listener on hover:** scope it to the rail, and only `preventDefault` when the rail can actually scroll in that direction — otherwise you hijack page scroll at rail ends. Classic desktop-hostility bug.
- **414px density:** ◀ + ▶ + 8 chips + gaps = tight. Verify with superset connectors added. If it dips below 6 visible chips, drop arrows at ≤767 (per b.1) — this is the second reason that ruling is right.
- **Gradient at 165deg** on the NOW hero: fine, but `color-mix` needs a fallback for older Safari (iOS < 16.2). Gym users on old iPhones. Provide a `background: var(--world-panel)` flat declaration *before* the gradient line.
- **Sticky-later ruling (2): later is correct.** Sticky-under-ContextBar requires a measured offset var that changes when NoticeLane appears/disappears — that's a new jump vector you've just spent the whole brief eliminating. Don't reintroduce it for a convenience the "Next up →" chip already provides.
- **Focus rings on 44px circle chips:** outline on circles clips awkwardly with border-radius; use `box-shadow` ring or `outline-offset: 3px`. Verify at 200% zoom.
- **Reduced-motion:** the keep-in-view `scrollLeft` is already instant — good — but the new chip expand (number → pill) is a width animation = layout thrash per activation. Animate `max-width`/`opacity` or accept the instant swap; do not animate `width` on a flex row of 11 items mid-scroll.

## (d) The ONE highest-impact change

**Make exercise completion a staged micro-celebration on the rail + hero, brand-locked gold, GPU-only.** Sequence: set logged → active chip's number morphs to ✓ with a 280ms gold pulse ring (transform scale + opacity, `will-change: transform`), the rail advances the accent to the next chip with a 160ms accent-glow sweep, and the NOW hero's "Next up →" chip breathes once. Three properties, zero layout, ~450ms total, reduced-motion collapses to instant states. This is the moment Strong/Hevy/Fitbod all skip — they treat logging as bookkeeping. SwanStudios should treat it as *earned*, which is already your gold-semantics law. It costs maybe 60 lines and it converts the entire relocation from "fixing Sean's bug" into "the thing competitors don't have."

## (e) What a design-savvy competitor out-builds

- **The ActionBar primary question (4): rule it now.** Ruling: **Save/Finish stays brand Dual-Button Glow; world seam owns surfaces, text, accents — never the commit action.** The primary is the one element a user must find blind, mid-fatigue, under any palette. Letting a user recipe restyle the commit button is a theming footgun AND breaks Dual-Button Glow law. Document it: `--world-action` may tint the *glow shadow color* but the gradient itself is brand-constant.
- A competitor ships **set-progress inside the chip** (tiny 2/4 tick marks under the number). You have the data; 8px of vertical space; it makes the rail a progress map, not just nav. Add it.
- A competitor audits **every recipe × new combo for contrast** — you have the test, good — but they also ship a **per-palette hero art direction** (the 165deg gradient angle/stops tuned per world so Crystalline feels icy, an ember world feels warm). Your single fixed gradient will feel samey across palettes. Cheap win: two gradient stops derived from `--world-accent` hue rotation ±12deg.

**Bottom line:** approve the relocation and the seam pass; gate merge on (1) arrows-desktop-only, (2) ActionBar primary ruling, (3) completion micro-moment, (4) color-mix fallback.
