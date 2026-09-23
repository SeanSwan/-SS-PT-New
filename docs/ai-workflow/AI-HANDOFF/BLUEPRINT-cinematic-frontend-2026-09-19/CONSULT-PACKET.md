# CONSULT PACKET — Cinematic Frontend Landing + React 19 Staging

**Mega Blueprint**

- **Prepared:** 2026-09-19 · **Prepared by:** Sable (WorkBuddy / deepseek-v4.1-flash)
- **Repo root:** `<REPO>`
- **Branch:** `creator-brains-engine-r2-20260915` (dirty tree)
- **Package target:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-cinematic-frontend-2026-09-19/`
- **Builder (decided by operator):** a WorkBuddy agent session on deepseek-v4.1-flash — a
  flash-tier, context-limited builder with repo read access but NO architectural judgment
  budget. Every decision must be made in the package. Slices must be small enough to
  execute and verify inside one agent session.

---

## 0. REMIT

Two workstreams, one package, because they share a dependency surface and the first is a
prerequisite for the second.

**Workstream A — land the first cinematic surface.** The operator's own words: *"the more
advanced animated sites, the beautiful sites… this is pretty much what I want to be
building."* The stack he named is Three.js + GSAP + a third he could not recall — the answer
is **React Three Fiber (R3F)**, with **Drei** as its companion, and **Lenis** as the
scroll-physics glue. Doctrine already names R3F and GSAP in `motion.md` §9 and
`cinematic-pages.md` §7. The target surface is the **marketing home page**.

**Workstream B — stage the React 19 migration.** Measured this session: the source tree is
clean, but 6 dependency pins and a 162-hit TypeScript surface stand between the repo and
React 19. Four of the six blockers have current versions that support React 18 *and* 19, so
they can be cleared without a React version change.

**CRITICAL FRAMING — the foundation already exists.** Three.js and GSAP are already
installed and already used in this repo. A three-tier performance ladder already exists and
is already wired into the marketing home page. This is NOT a greenfield adoption of a
cinematic stack; it is **finishing a partially-built cinematic foundation** and removing the
contradictions that have accumulated in it. A package that proposes rebuilding what exists
is wrong. See §3 and §6.

---

## 1. DECIDED SCOPE — do not re-decide

These were decided by the operator on 2026-09-19. The package must honour them.

| Decision | Value |
|---|---|
| Package subject | Both workstreams, one package |
| First cinematic surface | **Marketing home page** (`HomePage.V4`) |
| Builder | flash-tier agent session (see header) |
| Doctrine authority | `docs/ai-workflow/design-brain/` is canonical; `SWAN-CINEMATIC-DESIGN-SYSTEM.md` outranks it |
| React 19 sequencing | Stage 1 on React 18; Stage 2 is a bounded later phase |

**NOT decided — the package must decide these, or delegate with explicit bounds:**
- Whether `useAnimationTier` (`full/balanced/essential`) or `PerformanceTierProvider`
  (`enhanced/standard/minimal`) becomes the single canonical tier source. See §6.1.
- Which doctrine tier names the code adopts. See §6.1.
- Whether Lenis is introduced at all, given `PremiumParallax` already does GSAP scroll work
  without it. See §6.8.
- The exact R3F accent subject (the "one signature moment") on the marketing home.
- Whether the motion token system (`--motion-*`, `--ease-*`) is implemented as CSS custom
  properties, TS constants, or both. See §6.3.

---

## 2. THE BUILD TARGET — `HomePage.V4.tsx` (verbatim, 113 lines)

Mount point — `frontend/src/routes/main-routes.tsx:58-61`:

```tsx
const HomePage = lazyLoadWithErrorHandling(
  () => import('../pages/HomePage/components/HomePage.V4'),
  // fallback:
  () => import('../pages/HomePage/components/HomePage.V3')
);
```

Rendered at `main-routes.tsx:319` as `<HomePage />`.

```tsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { Helmet } from 'react-helmet-async';
import { useAnimationTier, useTierFlags } from '../../../hooks/useAnimationTier';
import { ScrollProgress } from '../../../components/ui/animations';
import { SectionTransition } from '../../../components/ui/animations';
import OrientationForm from '../../../components/OrientationForm/orientationForm';

// Section components
import HeroSection from './sections/HeroSection';
import MissionSection from './sections/MissionSection';
import TrainersSection from './sections/TrainersSection';
import ArsenalSection from './sections/ArsenalSection';
import ProgramsSection from './sections/ProgramsSection';
import GolfSection from './sections/GolfSection';
import AboutSection from './sections/AboutSection';
import TestimonialsSection from './sections/TestimonialsSection';
import StatsSection from './sections/StatsSection';
import SocialSection from './sections/SocialSection';
import CTASection from './sections/CTASection';
import NewsletterSection from './sections/NewsletterSection';

const MainWrapper = styled.div` /* ... */ `;
const NoiseOverlay = styled.div` /* ... */ `;

const HomePageV4: React.FC = () => {
  // ...uses useAnimationTier() + useTierFlags(); passes `tier` to every section:
  //   <HeroSection ... /> <MissionSection tier={tier} /> <TrainersSection tier={tier} />
  //   <ArsenalSection tier={tier} /> <ProgramsSection tier={tier} /> <GolfSection tier={tier} />
  //   <AboutSection tier={tier} /> ... (12 sections total)
};
```

**Structural facts the package must respect:**
- 12 named sections, each already accepting a `tier` prop. The cinematic work lands as an
  **Act-1 signature** plus per-section accents — NOT a rewrite of the section list.
- `NoiseOverlay` already implements the doctrine's §7 grain layer.
- `ScrollProgress` and `SectionTransition` already exist in `components/ui/animations/`.
- The page is lazy-loaded with an error fallback to `HomePage.V3`. Any heavy cinematic
  chunk must not regress that lazy boundary.

---

## 3. EXISTING CINEMATIC FOUNDATION — EXTEND, DO NOT REBUILD (verbatim excerpts)

### 3.1 `frontend/src/hooks/useAnimationTier.ts` (verbatim, 58 lines) — THE LADDER

```ts
export type AnimationTier = 'full' | 'balanced' | 'essential';

export function useAnimationTier(): AnimationTier {
  const prefersReduced = useReducedMotion();
  const [tier, setTier] = useState<AnimationTier>('balanced');

  useEffect(() => {
    if (prefersReduced) { setTier('essential'); return; }
    const cores = navigator.hardwareConcurrency || 4;
    if (cores >= 8) { setTier('full'); }
    else if (cores >= 4) { setTier('balanced'); }
    else { setTier('essential'); }
  }, [prefersReduced]);

  return tier;
}

export function useTierFlags(tier: AnimationTier) {
  return useMemo(() => ({
    showParallax: tier === 'full',
    showParticles: tier === 'full',
    showBlur: tier !== 'essential',
    showCharSplit: tier === 'full',
    showStagger: tier !== 'essential',
    showHoverEffects: tier !== 'essential',
    showGlow: tier !== 'essential',
    isEssential: tier === 'essential',
    isFull: tier === 'full',
  }), [tier]);
}
```

This is the tier ladder `HomePage.V4` actually consumes. Any new cinematic component must
read its flags from here, or the package must replace this deliberately and update all
consumers.

### 3.2 `frontend/src/core/perf/PerformanceTierProvider.tsx` (key excerpt) — THE RIVAL

```tsx
// Performance Tiers:
// - enhanced: WebGL animations, 500+ particles, 60 FPS target
// - standard: Canvas 2D, 200 particles, 30 FPS target
// - minimal:  Static gradients, no animations

const detectTier = (): PerformanceTier => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'minimal';
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if (cores !== undefined && cores < 4) return 'minimal';
  if (memory !== undefined && memory < 4) return 'minimal';
  const connection = (navigator as Navigator & { connection?: {
    saveData?: boolean; effectiveType?: string;
    addEventListener?: ...; removeEventListener?: ...; } }).connection;
  if (connection) {
    if (connection.saveData) return 'standard';
    if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') return 'standard';
  }
  return 'enhanced';
};
// ...
}, [forceTier, tier]);   // <-- line 127: see §6.2
```

### 3.3 `frontend/src/utils/motion-helpers.tsx` — THE SHARED FRAMER ABSTRACTION

Exports `createMotionComponent(Component, options)`, `animationVariants`, and
`withMotion(Component, defaultProps)`. Consumed by the 390 files that import `framer-motion`.

```tsx
export const animationVariants = {
  fadeIn:  { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } },
  fadeInUp:{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } },
  // ... fadeInLeft, fadeInRight, scaleUp — all duration: 0.5
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } },  // <-- §6.4
  },
  staggerItem: { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

export function withMotion<P extends object>(
  Component: React.ComponentType<P>,
  defaultProps: MotionProps = {}
): React.FC<P & MotionProps> {
  const WithMotion: React.FC<P & MotionProps> = (props) => {
    const motionProps = { ...defaultProps, ...props };
    return <Component {...motionProps} />;   // <-- §6.6
  };
  WithMotion.displayName = `WithMotion(${Component.displayName || Component.name || 'Component'})`;
  return WithMotion;
}
```

### 3.4 Three.js — the in-repo module pattern (5 files already use `three`)

- `frontend/src/three/swanMark/swanMarkSpec.ts` (95 lines) — declarative spec
- `frontend/src/three/swanMark/swanMarkFactory.ts` (267 lines) — factory
- `frontend/src/three/swanMark/badgeField.ts` — particle/field logic
- `frontend/src/components/SwanMark3D/swanMarkScene.ts` (281 lines) + `sceneSupport.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachFocusLens.tsx`

**The package must copy this separation: `spec` (data) → `factory` (scene construction) →
`scene` (lifecycle/render loop).** Do not invent a new structure.

### 3.5 WebGL / Canvas backgrounds already exist

- `frontend/src/components/ui-kit/background/WebGLBackground.tsx` (191 lines)
- `frontend/src/components/ui-kit/background/CanvasBackground.tsx` (214 lines)
- `frontend/src/components/ui/backgrounds/SectionVideoBackground.tsx` — line 114 does
  `if (nav.connection?.saveData) return false;` (a third ad-hoc capability check — §6.1)

### 3.6 GSAP — the only existing usage

`frontend/src/components/PremiumParallax/PremiumParallax.tsx` (680 lines):

```tsx
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// line 14:
gsap.registerPlugin(ScrollTrigger);
// useEffects at lines 472, 519, 557; gsap.to(...) at 528, 538
// a single cleanup return at line 549
```

### 3.7 Existing animation primitives — `frontend/src/components/ui/animations/`

`AnimatedCounter.tsx` · `ScrollProgress.tsx` · `SectionTransition.tsx` ·
`TextSplitter.tsx` · `index.ts`

### 3.8 Reduced-motion hooks — `frontend/src/hooks/`

`useReducedMotion.ts` — local `matchMedia('(prefers-reduced-motion: reduce)')` hook, returns
`boolean`. Also exports `useReducedTransparency()`. **Note: this is a local hook, NOT
framer-motion's `useReducedMotion`.** Both names exist in the repo; `motion-helpers.tsx`
imports neither.

---

## 4. CANONICAL BLUEPRINTS — A1 HOSTILE REVIEW TARGETS

These are the existing blueprints. Attack them. All under
`docs/ai-workflow/design-brain/`.

### 4.1 `motion.md` — the motion doctrine

**§1 Motion tiers.** Three tiers: Ambient (6000–20000ms loops), Response (120ms
press/toggle, 200ms hover/focus/reveal, 320ms modal enter), Narrative (400–900ms per beat).
Tokens named: `--motion-ambient`, `--motion-response-fast`, `--motion-response`,
`--motion-response-slow`, `--motion-narrative`, `--ease-out-quint`,
`cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in-quad`, `cubic-bezier(0.55, 0.085, 0.68, 0.53)`.

**§2 GPU-safe properties only.** Animate `transform` and `opacity`. Nothing else without an
explicit review exception. Banned from animation: `width`, `height`, `top`, `left`,
`margin`, `padding`, `box-shadow`, `filter: blur()` on large surfaces, `background-position`
on big images.

**§3 Reduced motion — MANDATORY dual gating.** Both a CSS gate
(`@media (prefers-reduced-motion: reduce)` inside the styled-component) and a JS gate
(framer-motion `useReducedMotion()` or `<MotionConfig reducedMotion="user">` at the surface
root) are required. Quoted lesson of 2026-06-20: *"a surface shipped with the CSS query in
place and framer springs still animating for reduced-motion users — CSS `@media` cannot stop
what framer applies as inline styles from JS."* Reduced motion means **reduced, not
gutted** — content, layout and tokens remain; a blank hero is a failure, a static poster is
the spec.

**§5 Signature-moment budget.** One deliberate motion beat per page. Marketing: the signature
lands in Act 1. *"If two candidate moments compete, cut the weaker one. Two signatures = zero
signatures."*

**§7 Scroll-choreography restraint.** Max 2 simultaneously animated properties per element;
≤3 elements animating at once in any viewport. Parallax multiplier 0.2–0.4, ceiling 0.6.
Hover tilt ceiling 6–10°. Scroll scenes: one viewport-height per panel, 3–5 panels max.
**Stagger: ≤80ms between siblings, ≤5 staggered children per group.**

**§9 Implementation guardrails.** Rule 43: any shared animation/mixin fragment containing
`${}` interpolation composed into a styled component MUST use the `css` tagged helper — a
plain JS template string crashes at mount with styled-components error #12. `keyframes`
defined once at module scope. And: *"Framer for enter/exit/hover/layout; GSAP only for
genuinely long pinned timelines; R3F only when 3D is the point. All three sit behind the §3
dual gate and the source §A three-tier fallback (full / lean / reduced) in the same file."*

### 4.2 `cinematic-pages.md` — §7, verbatim

> ## 7. 3D / GSAP / Three.js usage rules
>
> - **Progressive enhancement, always.** The page must be complete without 3D; R3F is a
>   surgical accent (hero object, geode, particle field) behind `<Suspense>` with a 2D
>   fallback — never page scaffolding (§A).
> - **GSAP earns its import** only for long ScrollTrigger sequences, pins, or multi-step
>   timelines; a fade-in is Framer/IO territory. One GSAP context per page, killed on
>   unmount.
> - one R3F canvas per page maximum
> - Lean cinema (low-power, save-data, slow network) → no R3F, no pins, CSS-only parallax,
>   posters for video
>
> `prefers-reduced-motion: reduce` disables: scroll-scrubbing, parallax, pins-with-animation,
> count-ups (render final values), video autoplay (posters), R3F (2D fallback). It preserves:
> layout, tokens, dividers-as-composition, all content, all CTAs.
>
> - **Chunking:** GSAP, R3F, and frame-sequence machinery load in lazy chunks behind route-
>   or viewport-level boundaries — never in the entry bundle.
>
> Perf budget: LCP ≤2.5s mobile; R3F ≤1 lazy scene; tier 1/2/3 in-file; per-act lazy chunks.
> R3F canvases: ≤1, DPR ≤2, <3ms/frame.

**The doctrine's tier ladder is named `full / lean / reduced`. The code names it
`full / balanced / essential` and `enhanced / standard / minimal`. Three vocabularies, one
concept.**

### 4.3 `website-archetypes.md` — archetype #2, verbatim

> | 2 | Cinematic 3D scroll site | brand awe → one CTA | Mkt 4-act stretched | C4 letterform or C1+R3F | M3 |
>
> - **Arc:** Mkt 4-act stretched over 8–14 viewport-heights. **Hero:** C4 embedded-media
>   letterform or C1 + surgical R3F accent. **Motion:** M3 — the full `cinematic-pages.md`
>   doctrine governs this archetype; this entry is the summary.

Also relevant: **M3 is licensed only for archetypes #2, #2b and #3.** Working surfaces
(#8 dashboards, #9 portal, #15 docs, #18 Hermes, #19 Coach Command, #20 Swan Coach) cap at
**M1**.

### 4.4 `design.md` — tokens and bans

Anti-patterns (§27): no MUI, no Tailwind for new Swan UI, no Galaxy-Swan palette, no equal
4-up grids, no centered-everything, no hero-dashboards, no fake metrics, no Arctic Cyan
buttons, no cards-in-cards, no hover-only, no lorem ipsum, no yoga/meditation language.
Retired and banned outright: `#0a0a1a`, `#00FFFF`, `#7851A9`. Never Inter/Roboto/Arial/
Helvetica as display faces. 300-line file cap (rule 4). 44px minimum touch targets.

---

## 5. MEASURED REPO STATE (audited this session — real numbers, not estimates)

- Source files scanned: **4,536** (`.ts/.tsx/.js/.jsx` under `frontend/src`)
- Files importing each library:

| library | files importing |
|---|---|
| styled-components | 1,350 |
| lucide-react | 1,013 |
| framer-motion | 390 |
| victory | 88 |
| react-helmet-async | 15 |
| @dnd-kit | 3 |
| react-simple-maps | 1 |
| react-leaflet | 1 (lazy `import()`, `FoodTracker/FarmFinderTab.tsx:48`) |
| three | 5 |
| gsap | 1 |

- `prefers-reduced-motion` appears in **339** files; `useReducedMotion(` hook calls in **32**;
  `MotionConfig` in **10**.
- **`--motion-ambient`, `--motion-response`, `--motion-narrative`, `--ease-out-quint`: 0
  occurrences anywhere in `src/`.** The doctrine's token system is entirely unimplemented.

### 5.1 Installed React 19 blockers (semver-checked against `react@19.3.0`)

| installed | latest | latest peer range | works on 18 | works on 19 |
|---|---|---|---|---|
| framer-motion 10.18.0 | `motion` 13.4.0 | `^18 \|\| ^19` | yes | yes |
| lucide-react 0.300.0 | 1.47.0 | `^16.5.1 \|\| ^17 \|\| ^18 \|\| ^19` | yes | yes |
| react-helmet-async 2.0.5 | 3.0.0 | `^16.6 \|\| ^17 \|\| ^18 \|\| ^19` | yes | yes |
| react-simple-maps 3.0.0 | 5.0.5 | `^16.8 \|\| 17 \|\| 18 \|\| 19` | yes | yes |
| react-leaflet 4.2.1 | 5.0.0 | `^19.0.0` | **no** | yes |
| react-dom 18.3.1 | 19.3.0 | — | — | yes |

**Source tree is clean for React 19**: zero occurrences of `findDOMNode`,
`ReactDOM.render`, `ReactDOM.hydrate`, `unmountComponentAtNode`, function-component
`defaultProps`, `propTypes`, `contextTypes`, string refs, or `react-test-renderer/shallow`.
Zero `findDOMNode` inside installed libs. `main.jsx` already uses `ReactDOM.createRoot`.

**Type surface for `@types/react` 19**: `useRef` 123 files (now requires an argument),
`JSX.Element` 32 files (global namespace → `React.JSX`), `ReactElement` 7 files (props
default `unknown`), `forwardRef` 2 files (still supported), ref-callback implicit returns 0.
`React.FC` at 1,417 files is unchanged in the 19 types.

**Build note:** `npm run build` is plain `vite build` (no type-check) — a React 19 bump would
not break the deploy. `build:check` and the QA gate run `tsc --noEmit` — it WOULD break the
gate.

**Runtime change that touches this repo:** React 19 no longer re-throws errors during render.
Error boundaries exist at `components/SessionDashboard/SessionErrorBoundary.tsx`,
`utils/error-boundary.tsx`, `routes/error-boundary.tsx`.

---

## 6. CONFIRMED DEFECTS — Phase 1 harvest (evidence, not speculation)

These are pre-verified with `file:line`. **A1 must attack the blueprints (§4); these are
supplied so the package does not have to rediscover them. Each still needs a decision in
PART B.** None of these may be silently dropped.

**6.1 — Three competing tier vocabularies, and the marketing home uses the wrong one.**
`motion.md` §3 says `full / lean / reduced`. `hooks/useAnimationTier.ts` implements
`full / balanced / essential` (cores + reduced-motion only). `core/perf/
PerformanceTierProvider.tsx` implements `enhanced / standard / minimal` and is the ONLY one
that checks `deviceMemory`, `connection.saveData` and `effectiveType` — the exact inputs
`cinematic-pages.md` §7 names for lean cinema ("low-power, save-data, slow network").
`HomePage.V4.tsx:14` imports `useAnimationTier` — the one that does **not** check save-data.
`SectionVideoBackground.tsx:114` does its own third ad-hoc `saveData` check. Consequence: a
user on a metered 2G connection with 8 cores is served the **full** cinematic tier on the
marketing home.

**6.2 — `PerformanceTierProvider.tsx:127` — `tier` in the dependency array.**
`}, [forceTier, tier]);` while the effect body calls `setTier`. Every tier change tears down
and re-adds the connection `change` listener and re-runs `detectTier()`. `tier` is read only
inside `handleConnectionChange` for a log string comparison. Fix: functional updater
(`setTier(prev => …)`) and drop `tier` from deps.

**6.3 — The motion token system does not exist.** `motion.md` §1 defines
`--motion-ambient`, `--motion-response-fast`, `--motion-response`, `--motion-response-slow`,
`--motion-narrative`, `--ease-out-quint`, `--ease-in-quad`. **0 occurrences in `src/`.** Every
animation in the repo uses hardcoded durations and easings. The doctrine's central
abstraction is unenforced.

**6.4 — `motion-helpers.tsx:125` violates `motion.md` §7.** `staggerChildren: 0.1` is 100ms;
the doctrine's ceiling is **≤80ms between siblings**. The shared abstraction that 390 files
inherit contradicts the canonical blueprint.

**6.5 — `motion-helpers.tsx` has no reduced-motion gate.** It imports neither framer-motion's
`useReducedMotion` nor `MotionConfig`. `motion.md` §3 makes the JS gate mandatory for every
animated component, and names this exact failure mode as the lesson of 2026-06-20. The gate
is applied ad-hoc in only 32 files (hook) / 10 files (`MotionConfig`) out of 390.

**6.6 — `motion-helpers.tsx:153-160` — `withMotion` spreads motion props onto a plain
component.** `<Component {...motionProps} />` where `Component: React.ComponentType<P>` is not
a motion component. The motion props are inert at best and leak to the DOM at worst. Either
wrap in `motion()` or delete the export.

**6.7 — `motion-helpers.tsx` durations map to no tier.** 0.5s and 0.3s appear in the shared
variants. `motion.md` §1 puts the response tier at 120/200/320ms and the narrative tier at
400–900ms. 500ms is in the narrative band but is used for hover/enter, which the doctrine
assigns to response.

**6.8 — `PremiumParallax.tsx` has no GSAP context teardown.** One cleanup `return () => {` at
line 549; no `gsap.context()`, no `.revert()`, no `ScrollTrigger.kill()`. `cinematic-pages.md`
§7 requires *"One GSAP context per page, killed on unmount."* A 680-line component with three
`useEffect` blocks and `gsap.to()` calls at 528/538 leaks ScrollTriggers.

**6.9 — Doctrine vocabulary vs. code vocabulary drift, unresolved in the docs.** `motion.md`
§9 says the three-tier fallback ships "in the same file" (source §A's full/lean/reduced);
the code's ladder lives in a hook consumed across 12 sections. The doctrine's file-local
requirement and the code's cross-cutting hook are structurally incompatible as written. The
package must state which is authoritative.

---

## 7. PALETTE — exact tokens (the builder must not invent colors)

Consumed as `var(--token, #fallback)`:

| Token | Hex |
|---|---|
| `--midnight-sapphire` | `#002060` |
| `--royal-depth` | `#003080` |
| `--ice-wing` | `#60C0F0` |
| `--arctic-cyan` | `#50A0F0` (DATA ONLY — never buttons, never glow) |
| `--gilded-fern` | `#C6A84B` |
| `--frost-white` | `#E0ECF4` |
| `--swan-lavender` | `#4070C0` |
| `--wing-purple` | `#8B5CF6` |
| `--obsidian-black` | `#0A0A0F` |
| `--carbon` | `#141419` |
| `--graphite` | `#1A1A24` |

Base bg fallback: `var(--bg-base, #030712)`. Banned: `#0a0a1a`, `#00FFFF`, `#7851A9`.
Dual-button glow rule: blue bg → purple glow; purple bg → cyan glow.

---

## 8. WHAT THE REPLY MUST CONTAIN

Standard contract, already stated in the mandate:

- `## PART A — HOSTILE REVIEW` (A1 against §4's blueprints; A2 against your own draft)
- `## PART B — FORGED PACKAGE` with `### 00-README.md` … `### 07-checkpoints.md` and
  `### 09-tests.md`, headings at fence depth 0
- `## PART C — DECISION-DENSITY SELF-TEST`

**Package-specific requirements:**

1. **Every file path, signature, prop and token must be real** — drawn from §2/§3/§5. If an
   excerpt is missing and you need it, say so in PART C rather than inventing it. A fabricated
   `file:line` is worse than an admitted gap.
2. **§6's nine defects must each be resolved or explicitly delegated-with-bounds.** Not
   summarised — decided.
3. **The tier-vocabulary collision (§6.1) is the single highest-value decision in this
   package.** Pick one canonical source and one vocabulary, and say exactly what happens to
   the other two implementations and their consumers.
4. **Slices must be sized for a flash-tier builder in one agent session.** The package is
   consumed by a context-limited model; each slice must be completable and verifiable inside
   a single session, with named test files and exact commands.
5. **`02-wireframes.md` must wireframe the marketing home Act 1** (desktop AND 375px), with
   exact copy strings and exact tokens from §7, plus the reduced-motion static composition.
6. **`09-tests.md` must include the doctrine's gates as executable checks**: the §3 dual-gate
   (CSS *and* JS paths), the §5 one-signature budget, the §7 stagger ceiling and
   simultaneously-animated-element caps, and the `cinematic-pages.md` perf budget (LCP ≤2.5s
   mobile, ≤1 R3F canvas, DPR ≤2, <3ms/frame).
7. **The React 19 staging must be a separate slice group with a rollback plan**, and must not
   block Workstream A.

---

## CORRECTION — appended after dispatch (2026-09-19)

**This section was added AFTER the packet was sent to Astra. The model reasoned from the
uncorrected text above. Both corrections below were surfaced by Astra's own A1 pass and
verified by me against the working tree. The sent text is preserved rather than edited, so the
divergence is auditable. See `VERIFICATION-NOTES.md` §2.**

**Correction 1 — §6.8 is REFUTED.** The claim that `PremiumParallax.tsx` "leaks ScrollTriggers"
is wrong. Reading the file: the GSAP effect cleans up both listeners at lines 549–552
(`card.removeEventListener` for `mousemove` and `mouseleave`), and **no ScrollTrigger is ever
created** — there is no `ScrollTrigger.create()` and no `scrollTrigger:` property anywhere.
`ScrollTrigger` is imported at line 6 and `gsap.registerPlugin(ScrollTrigger)` runs at line 14
but the plugin is never used, so the real defects are (a) a dead import plus needless
module-scope registration, and (b) the particle effect at lines 472–516 appending 50 DOM nodes
with **no cleanup function**, which under StrictMode double-invoke yields 100 particles.
The original claim was inferred from a truncated grep rather than from reading the effects.

**Correction 2 — §3.3 and §5's "390 files inherit `motion-helpers.tsx`" is FALSE.**
`motion-helpers.tsx` has **zero importers** in `frontend/src`. The 390 figure counts files
importing `framer-motion` directly, which is a different set. Consequence: packet defects
**§6.4, §6.5, §6.6 and §6.7 describe dead code** — they are accurate about the file's contents
but have **no runtime blast radius**. They are delete-or-revive decisions, not urgent fixes.
The remaining live defects are §6.1, §6.2, §6.3 and §6.9.

**Correction 3 — §5.1's "162 type hits" is an occurrence count, not a work count.**
It sums regex matches across three overlapping categories (`useRef` 123 + `JSX.Element` 32 +
`ReactElement` 7). A `useRef` occurrence does not prove a missing argument, and a file may
appear in more than one category. The migration manifest must be derived from `tsc`
diagnostics, not from this number.

**Correction 4 — §5.1's Stage-1 recommendation for `framer-motion` was suboptimal.**
Moving to `motion@13.4.0` is a **package rename with import changes across 390 files**.
`framer-motion@11.18.2` peers `^18.0.0 || ^19.0.0` (verified), so a dual-compatible
`framer-motion` release exists and the rename can be excluded from this migration entirely.

