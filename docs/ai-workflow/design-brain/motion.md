# motion.md — Swan Motion Doctrine (Design Brain core)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
- **Extends:** `design.md` §8 · **Source of truth:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §A (motion tools, Full/Lean/Still runtime quality, Reduced Motion override), §B (motion bans), §C1–C12 (per-pattern fallbacks). That doc wins conflicts.

---

## 1. Motion tiers

Every animation in Swan belongs to exactly one tier. If you can't name the tier, the animation has no job — cut it (source §B ban 9: "no motion for motion's sake").

| Tier | Job | Duration token | Easing token | Examples |
|---|---|---|---|---|
| **Ambient** | Set atmosphere; user did nothing | `--motion-ambient: 6000–20000ms` loops | `linear` or `ease-in-out`, seamless | hero video loop, aurora drift, skeleton shimmer, legendary-rarity gradient, grain |
| **Response** | Answer a user action within one perceptual beat | `--motion-response-fast: 120ms` (press/toggle) · `--motion-response: 200ms` (hover/focus/reveal) · `--motion-response-slow: 320ms` (modal/drawer enter) | `--ease-out-quint: cubic-bezier(0.16, 1, 0.3, 1)` enter · `--ease-in-quad: cubic-bezier(0.55, 0.085, 0.68, 0.53)` exit | button glow intensify, card lift, modal open, toast in, tab underline |
| **Narrative** | Tell the page's story as the user scrolls/progresses | `--motion-narrative: 400–900ms` per beat; scroll-scrubbed beats are position-tied, not time-tied | `--ease-out-quint` for reveals; C6 flip uses `cubic-bezier(0.16, 1, 0.3, 1)` at 700ms (source §C6) | C2 parallax, C3 sticky cross-fade, C9 count-up (2s, source §C9), C10 divider reveal |

Rules across tiers:
- Response motion never exceeds 320ms — a dashboard that makes the user wait for chrome is broken.
- Ambient loops never demand attention: ≤5% opacity for texture layers, no hard cuts, no flashing (never >3 flashes/sec — seizure threshold).
- Narrative motion fires **once** per visit (IntersectionObserver `once`), never re-triggers on every scroll pass.

**Licensed M4 pointer.** `experience-mode.md` defines an M4 Experience budget for eligible non-product/approved-marketing surfaces. It changes none of this file's M0–M3, product, calm-zone, reduced-motion, or earned-motion rules. Full/Lean/Still remain runtime quality modes; M4 still ships all three.

## 2. GPU-safe properties only

Animate **`transform` and `opacity`. Nothing else** without an explicit exception in review.

- Banned from animation: `width`, `height`, `top`, `left`, `margin`, `padding`, `box-shadow` (animate a pre-rendered glow layer's `opacity` instead), `filter: blur()` on large surfaces, `background-position` on big images.
- Glow-on-hover recipe: stack a pseudo-element carrying the full glow `box-shadow`, animate its `opacity 0 → 1`. Same look, compositor-only.
- `will-change: transform` only while animating; remove after. Standing `will-change` on dozens of cards eats VRAM.
- `translateZ(0)` creates stacking contexts — give the parent `position: relative; z-index` (design.md §9 — z-scale / stacking).

## 3. Reduced motion — MANDATORY dual gating

**One gate is a half-fix. Every animated component ships BOTH:**

1. **CSS gate** — `@media (prefers-reduced-motion: reduce)` inside the styled-component: kill nonessential keyframes, transitions, and scroll effects; keep the complete authored Still composition intact per source §A.
2. **JS gate** — framer-motion `useReducedMotion()` (or `<MotionConfig reducedMotion="user">` at the surface root) disabling variants, springs, `useMotionValue` count-ups, and rAF loops.

**The CSS media query does NOT govern JS-driven entrances.** Lesson of 2026-06-20: a surface shipped with the CSS query in place and framer springs still animating for reduced-motion users — CSS `@media` cannot stop what framer applies as inline styles from JS. Reviewers reject any slice that gates only one layer (see `adapters/builders.md` §"Reduced motion, both layers", `adapters/reviewers.md` §A2 lens 4 (accessibility)).

- Reduced Motion means **reduced, not gutted**: content, layout, and tokens all remain through the authored Still composition (source §A). A blank hero is a failure; a static poster is the spec.
- Video/canvas under reduced motion: show the poster frame; do not autoplay.
- Count-up numbers: render the final value immediately.

## 4. Where motion is banned — calm zones

Data-dense operator and work surfaces stay **calm**: response-tier only, no ambient loops, no narrative beats, no signature moments.

- **Hermes operator surfaces (Cyberforest):** ambient banned, response ≤200ms (design.md §5 (ops world) — "a cockpit, not a brand page").
- **Coach Command Center** approval queue / receipt ledger (design.md §5 — pro world): response-tier only.
- **Data cards** (client/trainer/admin/biometrics/program/workout-log): no pointer tracking, no animation loops, no hover-only actions (Swan Card/Button Standard; design.md §11).
- Tables, forms mid-entry, and anything a trainer uses live in a session (low-tap flows, design.md §11): motion must never delay the next tap.

SheenCard sell/showcase surfaces are the licensed exception (design.md §11) — and even they honor §3.

## 5. Signature-moment budget

**One deliberate motion beat per page** (design.md principle 5; source §B: one memorable visual per *section*, one page-level signature). Budget rules:

- Marketing pages: the signature lands in **Act 1** (source §B2.1). Everything after earns attention with composition, not competing spectacle.
- Dashboards: Phase 1 may carry a small momentum beat (XP tick, streak pulse); Phases 2–3 stay calm; Phase 4's CTA may glow, not dance.
- If two candidate moments compete, cut the weaker one. Two signatures = zero signatures.

## 6. Loop integrity (hero video / canvas loops)

- Loops must be **seamless**: last frame flows into first — no visible cut, no luma pop. Seedance briefs must request loop closure (`SWAN-ASSET-STORYBOARDING.md`).
- Header loops 4–8s; scroll-scrubbed sequences 10–20s (source §E).
- `<video autoplay muted loop playsinline>` + poster; pause when off-viewport (IntersectionObserver) and on `document.hidden`.
- Canvas/rAF loops: cap to display refresh, stop entirely off-viewport, tear down on unmount. A hidden ticking loop is a battery bug.
- Audio is opt-in only (source §C1 audio toggle) — never autoplay sound.

## 7. Scroll-choreography restraint

- **Max 2 simultaneously animated properties per element**, and ≤3 elements animating at once in any viewport. More = noise, jank, or both.
- Parallax multiplier 0.2–0.4, ceiling 0.6 (source §C2). Hover tilt ceiling 6–10° (source §C7).
- Scroll scenes (C3 sticky panels): one viewport-height per panel, 3–5 panels max; sticky must release at the section boundary (source §C3 anti-pattern).
- Scroll listeners: `requestAnimationFrame`-tied, never raw `onScroll` work (source §A). Reveals via IntersectionObserver, threshold-based, fire-once.
- Stagger: ≤80ms between siblings, ≤5 staggered children per group. A 12-item cascade is a loading screen pretending to be design.

## 8. The "motion must be earned" test

Before shipping any animation, it must pass all four — otherwise delete it:

1. **Job:** name which it does — reveal information / cue hierarchy / transition state / reward interaction (source §B ban 9). "Looks nice" is not a job.
2. **Tier:** name its tier (§1) and stay inside that tier's duration/easing tokens.
3. **Absence check:** if removed, does the user lose understanding or feedback? If nothing is lost, it was decoration.
4. **Calm-zone check:** is this a §4 surface? Then only response-tier survives.

## 9. Implementation guardrails (styled-components)

- **Rule 43 (CLAUDE.md):** any shared animation/mixin fragment containing `${}` interpolation that composes into a styled component **MUST** be wrapped in the `` css`` `` tagged helper. A plain JS template string calls `toString()` on `keyframes` objects and crashes at mount with styled-components error #12 — build passes, types pass, prod dies (2026-04-12 `AdminOverviewPanel` incident). If a template literal interpolates a styled-components primitive, it is `` css`` ``.
- `keyframes` defined once at module scope, composed via `` css`` `` fragments — never re-declared per render.
- Framer for enter/exit/hover/layout; GSAP only for genuinely long pinned timelines; R3F only when 3D is the point (source §A). All three sit behind the §3 dual gate and ship Full/Lean/Still modes in the same surface; Reduced Motion overrides nonessential movement across all three.

## 10. Motion QA hooks

Verified per `qa-gates.md` Gate 2 (reduced-motion checks) and Gate 3 (dead/noisy-motion critique). The QA receipt must state: signature moment (or "none — calm surface"), tiers used, and dual-gate verification for BOTH CSS and JS paths.
