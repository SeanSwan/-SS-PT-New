# Astra Request — Swan Theme Lens: hostile review + enhancement blueprint

**Requested by:** Sean, via the WorkBuddy seat (Sable), 2026-09-19
**Transport:** ChatGPT subscription (`consult-astra-subscription.mjs`) — no OpenRouter, no per-token bill
**Doctrine:** Mega Blueprint — hostile review of the existing blueprints, documentation refresh
(blueprints, wireframes, flowcharts, mermaid, tests), a second hostile review of your own package
for hardening, and the decision-density self-test.
**Seat:** you are a review / adjudication seat. You are **not** a builder seat. Produce a plan, not a patch.

---

## 1. The mandate in Sean's words

> "Have Astra go ahead and use [Mega] Blueprint to make a hostile review for enhancing, updating,
> making better, adding missing gaps to take this to the next level. Again, I would like to make sure
> that we are utilizing [Three.js], GSAP, react fiber and all the things that we need to just make
> the site beautiful."

Three things are being asked for, and they are not the same thing:

1. **A hostile review of what exists now** — the theme lens, its guards, its evidence.
2. **An enhancement blueprint** — what is missing to take it to the next level.
3. **A technology mandate** — Three.js, GSAP, react-three-fiber, and whatever else earns its place,
   in service of the site being *beautiful*. Beauty is a requirement here, not a garnish.

---

## 2. What the theme lens is

A theme changer in the application header, sitting between the logo and the cart. It opens a
popover listing every registered theme as a radio option, with a "Match system" switch, a cycle
button, and full keyboard grid navigation (arrows, Home/End, Escape, Tab).

### 2.1 Measured inventory

| Fact | Measured value | How |
|---|---|---|
| Registered themes | **28** (18 base literals + 10 premium colorways) | `themePalettes.ts` (18) + `UniversalThemePremiumThemes.ts` (10) |
| Emitted CSS custom properties | **130**, identical name set across all 28 themes | `themeTokens.test.ts` gate |
| Theme-lane test files | **12** | `src/context/ThemeContext/**` |
| Theme-lane tests | **114**, all green | `npx vitest run src/context/ThemeContext` |
| Scoped `tsc --noEmit` | **0 errors** | `tmp/tsconfig.themelens-lane-only.json` |
| Production build | **✓ 21.03s** | `npx vite build` |
| Largest lane file | **290 / 300 lines** (`UniversalThemeContext.tsx`) | Rule 4 cap |

### 2.2 Lane file inventory (`src/context/ThemeContext/`)

**Runtime**
`UniversalThemeContext.tsx` (290) · `useCrossTabThemeSync.ts` (108) · `themeStorageWrites.ts` (74) ·
`useThemeGridNavigation.ts` · `themePalettes.ts` · `UniversalThemePremiumThemes.ts` ·
`themePersistence.ts` · `themeColorMath.ts` · `themeAccessors.ts` · `themeSwatch.ts` ·
`themeToggleMetadata.tsx` · `themeLensMetrics.ts` · `index.ts`

**Lens UI**
`ThemeLensButton.tsx` + `.styles.ts` · `ThemeLensPopover.tsx` + `.styles.ts` ·
`ThemeLensSwitch.styles.ts` · `UniversalThemeToggle.tsx`

**Guards**
`themeTokens.test.ts` · `themeTextTokenGaps.test.ts` · `themeContrast.test.ts` ·
`themeContrastInstrument.ts` · `themePaletteIntegrity.test.ts` · `themePrePaint.test.ts` ·
`themeSwatch.test.ts` · `themePersistence.test.ts` · `themeCrossTab.test.tsx` ·
`themeRule4.test.ts` · `UniversalThemeContext.themeCycle.test.ts` ·
`ThemeLensPopover.test.tsx` · `ThemeLensButton.test.tsx`

### 2.3 The measuring apparatus (this is unusual — read it)

`themeContrastInstrument.ts` is a **247-line measuring instrument**, not a mock. It reads the real
lens stylesheets off disk, extracts each styled-component's CSS block, pulls every `color:`
declaration, resolves the `var(--token)` names it references, and evaluates contrast against the
surface that component is actually painted on — including alpha compositing for the translucent
washes (`panel + accent 14%`, `panel + bgBase 55%`, etc.). Its `SITES` table declares, per component,
the surfaces and the AA threshold.

**Build on this.** It is the reason the lens's colour claims are checkable rather than asserted. A
blueprint that adds animation should extend this apparatus rather than bypass it.

---

## 3. The defect ledger — what a hostile pass found and fixed (2026-09-19)

All of the following were **measured**, not reasoned. Each has a re-runnable check.

| # | Defect | Evidence | Status |
|---|---|---|---|
| A | `--text-inverse` was the **last hand-maintained theme-id list** in the emitter — a 3-branch ternary on theme id. Worst case 1.17:1 (`obsidian-black`). | `themeUtils.ts`; measured against `--accent-primary` | **FIXED** — derived from `getReadableAccentText(theme.colors.primary)`. Every theme now clears 4.5:1 at the gradient start (worst 4.51:1); `obsidian-black` 1.17 → 15.27 |
| B | **Cross-tab sync, reverse direction.** A peer tab kept the system theme when another tab picked one, because the theme event was skipped while `follow` was still true and the follow event only flipped the flag. | `themeCrossTab.test.tsx` | **FIXED** — the follow branch adopts the stored theme |
| C | **Turning "Match system" off did not persist what was on screen.** Storage said `solar-gold` while the screen showed `crystalline-dark`; reload jumped. | measured: expected `crystalline-dark`, got `solar-gold` | **FIXED** — persists the on-screen theme |
| D | A 301-line `_probeOverCap.ts` was left in `src/`, turning the Rule 4 gate **RED in the delivered tree**. | `themeRule4.test.ts` 2/99 failing | **FIXED** — deleted |
| E | `themeRule4.test.ts`'s "dormant" assertion was actually **live** — a real failure read as noise. | mislabelled describe block | **FIXED** — promoted to the live block; dormant block relabelled |
| F | `crystalline-mono.effects.glowIntensity = 'none'` is outside the palette's union and was **silently coerced** to the default `0.4`. | `getThemeSwatch` | **RECORDED** as a coercion, not changed — a design decision |
| G | `--text-accent` fails AA and had **no ledger at all**. | measured: `frozen-aurora` 4.04:1, `nebula-crown` 3.77:1, `obsidian-black` 4.66:1 on page / **4.07:1** on the elevated panel | **TRACKED** — ledger keyed to the stricter of the two surfaces |
| H | **A false mechanism claim in a doc comment.** The code asserted that writing `THEME_STORAGE_KEY` before `FOLLOW_SYSTEM_STORAGE_KEY` was load-bearing, because writing the flag first "left a window in which a peer read the stale theme". | **Measured false.** `localStorage` is synchronous and origin-shared; `storage` events are queued as tasks, so both writes have landed before any peer listener runs, in either order. A test delivering the events in the **opposite** order passes; removing the *fresh read* turns 3 tests red. | **FIXED** — claim corrected in 4 places; order-independence now locked by test |

**H is the most instructive.** It is the class of defect where the *documentation* is the bug: a
plausible causal story written into a comment, which the next agent preserves out of respect for it.
The lens currently carries a large amount of such prose. **Interrogate it.** Treat every "this is
load-bearing because…" in the lane as a claim to be falsified, not a fact to be inherited.

---

## 4. Constraints — non-negotiable

**Design language — Crystalline Swan, closed token set**
midnight-sapphire `#002060` · ice-wing `#60C0F0` · gilded-fern `#C6A84B` · frost-white `#E0ECF4` ·
wing-purple `#8B5CF6` · obsidian-black `#0A0A0F`
**Banned outright:** `#0a0a1a`, `#00FFFF`, `#7851A9`
Dark-first. Tokens only — no raw hex in components.

**Code**
- **Rule 4:** 300 lines per file, enforced lane-wide by a live test. The largest lane file is at
  **290** — there are **10 lines of headroom**. A blueprint that adds code to an existing lane file
  without naming what is extracted from it cannot land.
- **styled-components** for styling. **Victory** for charts. No new styling system.
- **Additive to the engine.** The engine (zero-dependency Node YouTube-transcript engine) must not be
  touched to make the console prettier. This boundary is load-bearing and is checked.
- **React 18.2.0** — not 19. This matters for R3F version choice.

**Accessibility**
- WCAG AA 4.5:1 for text, 3:1 for non-text.
- 44px minimum touch targets.
- Responsive at 320 / 375 / 414 / 768 / 1024 / 1440 / 2560 / 3840.
- **Reduced-motion safety is mandatory.** 322 files in this repo already honour
  `prefers-reduced-motion`; the lens must too, and `framer-motion` is already in **394** files.

**Process**
- **Do not commit, do not push, do not `git add`.** The tree is at `fe388691f` on
  `creator-brains-engine-r2-20260915` with **1154 dirty files** spanning multiple workstreams. Any
  build order you propose is a *plan*; execution and the commit gate are Sean's.
- You are a review/adjudication seat. **No patches, no diffs, no "here is the file".** Blueprint,
  contracts, acceptance criteria, and explicit bans.

---

## 5. Installed vs absent — the technology mandate needs this

| Package | State | Version |
|---|---|---|
| `three` | **INSTALLED** | ^0.169.0 |
| `framer-motion` | **INSTALLED** | ^10.16.5 |
| `victory` | **INSTALLED** | ^37.3.6 |
| `styled-components` | **INSTALLED** | ^6.1.6 |
| `react` | **INSTALLED** | ^18.2.0 |
| **`gsap`** | **ABSENT** | — |
| **`@react-three/fiber`** | **ABSENT** | — |
| `@react-three/drei` | **ABSENT** | — |
| `@react-three/postprocessing` | **ABSENT** | — |
| `postprocessing` | **ABSENT** | — |
| `@tabler/icons-react` | **ABSENT** | — (cause of ~20 pre-existing `components/Header/**` tsc errors) |

**So "utilize GSAP and react-three-fiber" is a request to add two dependencies, not to use two.**
Address that head-on: for each, say what it buys that `framer-motion` (already present) and raw
`three` (already present) do not — or recommend against it. A blueprint that recommends adding a
400 kB dependency without justifying it against what is already installed is not a blueprint.

Three.js is already in the production bundle and already used:

| Built chunk | Size | gzip |
|---|---|---|
| `three.module.WAXnx5F7.js` | 471.02 kB | 118.61 kB |
| `swan-mark.mesh.DH1ehJjj.js` | 297.21 kB | 90.07 kB |
| `index.C_YE8L4W.js` | 608.35 kB | 169.56 kB |

Three.js call sites today: `components/SwanMark3D/swanMarkScene.ts`,
`three/swanMark/{badgeField,swanMarkFactory,swanMarkSpec}.ts`,
`components/DashBoard/Pages/coach-assistant/CoachFocusLens.tsx`.

---

## 6. "Pre-JS" — two readings, answer both

Sean said "utilizing pre-JS". That is ambiguous and I am not going to silently pick one:

1. **Pre-hydration / pre-paint theming.** The lane already has `themePrePaint.test.ts` and applies CSS
   variables in `useLayoutEffect` so no frame shows the previous theme. If this is the reading, the ask
   is: how much further can first-paint correctness be taken (inline critical CSS, no FOUC, no
   hydration mismatch, theme resolved before first byte of paint)?
2. **"Three.js"**, mis-transcribed. Then it is the 3-D mandate and reading 1 is out of scope.

**Answer both explicitly, and say which one the blueprint is optimised for.**

---

## 7. What I want back

A single Mega Blueprint package containing, at minimum:

1. **Hostile review of the existing state** — including the existing *blueprints and guards*. Where is
   the lens over-guarded, under-guarded, or guarded against the wrong thing? What does each guard fail
   to cover? A green suite can certify a broken invariant; find the invariants the 114 tests do **not**
   pin down.
2. **The enhancement blueprint** — ranked by impact, with a named file for every change, exact API
   contracts, per-slice acceptance criteria, and explicit "do NOT" bans. Slice it so each slice is
   independently verifiable.
3. **A reachability audit of your own slices** — for every slice, list the files that must change for
   its deliverable to exist, and check the list against the slice's permitted changes. A slice whose
   file list cannot reach its own deliverable is a plan defect. (This repo has a history of exactly
   that failure class: eight verified slice-reachability defects in another blueprint.)
4. **Motion and 3-D design** — concrete, tokenised, reduced-motion-safe, and justified against bundle
   cost. Name the exact Three.js/R3F/GSAP APIs. Where you propose spectacle, state the measured cost.
5. **Documentation refresh** — mermaid flows, wireframes, state diagrams for the theme lifecycle.
6. **Decision-density self-test** — your own check that the package is specific enough to build from.
7. **A "not proven / unopened" section.** Name what you did not verify. "Unopened" is not "clean".

**State plainly, for every claim you make, whether it is measured, inferred, or unverified.** The
person who reads this next will act on it, and this repo's standard is that a claim without a
re-runnable check is marked as such.

---

## 8. What you must NOT do

- Do not produce code, diffs, or patches. Blueprint and contracts only.
- Do not commit, push, or stage anything.
- Do not propose touching the engine to improve the console.
- Do not recommend adding a dependency without measuring it against what is already installed.
- Do not widen a tracked ledger to make a number look better. Two ledgers (`--text-inverse` gradient
  end: 15 themes; `--text-accent`: 3 themes) exist precisely so their counts cannot drift silently.
- Do not assume "Astra" and "Astra Pro" are interchangeable — the pro tier is unreachable on this
  transport.
