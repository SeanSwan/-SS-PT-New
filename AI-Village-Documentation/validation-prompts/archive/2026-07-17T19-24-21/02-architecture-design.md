# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 | **Duration:** 87.4s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/WORLD-SWITCHER-MARKETING-REDESIGN-PLAN-2026-07-17.md
> **Generated:** 7/17/2026, 12:24:21 PM

---

# Architectural Review: World-Switcher Marketing Redesign Plan
**Reviewer:** Senior React/TypeScript Architect
**Date:** 2026-07-17
**Plan:** `WORLD-SWITCHER-MARKETING-REDESIGN-PLAN-2026-07-17.md`

---

## Executive Summary

The plan's core architectural idea — World = Setting, Chrome = Constant — is **sound and adoptable with modifications**. The separation of concerns is clean in theory. However, the implementation plan has **seven significant architectural gaps** that will cause production incidents if not addressed before build begins. The P0 build break is a hard blocker; nothing else matters until it is resolved.

**Verdict:** `ADOPT WITH MODIFICATIONS` — the Chrome/World separation is the right call; the switcher UI, state management, and file budget proposals need structural fixes before implementation.

---

## Finding 1: `WorldLayer` Component Will Exceed 300-Line Budget

**Severity:** 🔴 HIGH
**File:** `WorldLayer` (proposed, net-new)

### Issue

The plan asks `WorldLayer` to do all of: read active World from context, render atmosphere (CSS/SVG/gradient/particle), respect motion tier, handle poster-first, handle reduced-motion static, and be `aria-hidden`. That is at minimum four distinct responsibilities. A single component handling particle rendering, gradient composition, motion-tier resolution, and reduced-motion fallback will exceed 300 lines before the first world variant is added. With 10 worlds, the atmosphere switch logic alone will push past budget.

### Recommended Fix

Split into a strict four-file decomposition:

```
WorldLayer/
  index.tsx          ← thin orchestrator, <50 lines, reads context, delegates
  WorldAtmosphere.tsx ← CSS/gradient/SVG layer per world, world-keyed map
  WorldParticles.tsx  ← particle/light layer, M3-only, lazy-loaded
  useWorldMotion.ts   ← resolves motionTier + reducedMotion, returns tier enum
```

`WorldAtmosphere` uses a `Record<WorldId, AtmosphereConfig>` map — no switch statements, no inline conditionals. Each config is a data object (gradient stops, overlay blend mode, scrim opacity). The component maps config → CSS custom properties injected on the layer's root element. This keeps the component under 80 lines regardless of how many worlds are added.

```typescript
// WorldAtmosphere.tsx — pattern sketch
const ATMOSPHERE_CONFIGS: Record<WorldId, AtmosphereConfig> = {
  'swan-deep-field': {
    gradientStops: ['var(--world-deep-1, #002060)', 'var(--world-deep-2, #0A0A0F)'],
    blendMode: 'screen',
    scrimOpacity: 0.72,
    lightLeakColor: 'var(--ice-wing, #60C0F0)',
  },
  // ... other worlds as data, not code
};
```

---

## Finding 2: `UniversalThemeContext` State Management — Circular Dependency Risk

**Severity:** 🔴 HIGH
**File:** `UniversalThemeContext.tsx` (existing, line ~1576)

### Issue

The plan proposes upgrading `UniversalThemeToggle` into a World Switcher while the existing context already owns 18 palette themes via a cycle mechanism. The plan does not specify whether World selection is a **new axis of state** or a **replacement** for the existing theme cycle. This ambiguity will produce one of two failure modes:

1. **If World replaces theme:** the existing `themeUtils.ts` sole-injector contract breaks — two systems writing to the same CSS custom properties.
2. **If World is additive:** you now have two independent state axes (palette theme + world atmosphere) that can produce invalid combinations (e.g., `cyberpunk-edgerunners` palette + `Glacier Cathedral` atmosphere). No validation layer is proposed.

The plan's own Section 2 says "Chrome = Crystalline Swan, ALWAYS" — but the existing context has 18 palette themes, not one. This is a direct contradiction that will cause a production incident.

### Recommended Fix

**Explicit state model with two separate axes, validated at the context boundary:**

```typescript
// types — derive from plan's own language
type PaletteTheme = 'crystalline-dark' | 'cyberpunk-edgerunners' | /* ...16 more */;
type WorldId = 'swan-deep-field' | 'chrome-sovereign' | /* ...8 more */;

interface UniversalThemeState {
  paletteTheme: PaletteTheme;   // existing axis — controls Chrome tokens
  activeWorld: WorldId;          // new axis — controls WorldLayer atmosphere
  motionCapability: MotionTier;  // existing — M0–M3
}
```

The `WorldLayer` reads ONLY `activeWorld`. The `ChromeLayer` reads ONLY `paletteTheme`. They never cross-read. The context exposes two separate setters: `setPaletteTheme` and `setActiveWorld`. The World Switcher UI calls `setActiveWorld`; the existing cycle button calls `setPaletteTheme`. These are orthogonal controls.

**If the owner's intent is that "Crystalline Swan is always the chrome," then `paletteTheme` should be locked to `crystalline-dark` for the marketing pages** via a surface-level override, not by removing the other themes from the context. This preserves the 18-theme system for power users while enforcing Law A on the face of the site.

---

## Finding 3: `ContactPage` Decomposition — No Error Boundary Proposed

**Severity:** 🔴 HIGH
**File:** `ContactPage` (existing, 1,182 lines → to be decomposed)

### Issue

The plan correctly identifies the 1,182-line file as needing decomposition and correctly mandates that the `/api/contact` pipeline must be "byte-identical." However, no error boundary strategy is proposed for the decomposed form. A form that submits to a real API endpoint, inside a page that is being rebuilt, with no error boundary, will produce a blank page on any render error during the transition period. This is a money-path risk — contact form failures = lost leads.

Additionally, the plan does not specify where the form state lives after decomposition. If the 1,182-line file currently holds form state at the top level and it is split into sub-components, prop drilling of `formState` + `handleSubmit` + `errors` across 3–4 levels is the default outcome.

### Recommended Fix

**Error boundary placement:**

```
ContactPage/
  index.tsx                    ← route entry, mounts ErrorBoundary
  ContactFormBoundary.tsx      ← ErrorBoundary wrapping the form subtree
  ContactForm/
    index.tsx                  ← form orchestrator
    useContactForm.ts          ← ALL form state, validation, submit logic
    ContactFormFields.tsx      ← pure presentational, receives field props
    ContactFormStatus.tsx      ← success/error/loading states
  ContactAtmosphere.tsx        ← M2 world layer for this surface
```

`useContactForm.ts` owns all state. `ContactFormFields` and `ContactFormStatus` receive only what they render — no drilling through intermediaries. The `ContactFormBoundary` catches render errors without killing the page chrome.

**The `/api/contact` call must be isolated in `useContactForm.ts` with an explicit `AbortController` cleanup on unmount** — the current 1,182-line file almost certainly does not have this, and the decomposition is the right moment to add it.

---

## Finding 4: Swan Video Hero — Race Condition on World-Graded Overlay

**Severity:** 🟡 MEDIUM
**File:** `HeroSection.tsx` (existing) + proposed world-overlay logic

### Issue

The plan proposes a "world-graded overlay — CSS/gradient over the `<video>`" where each World applies a color-grade scrim. The race condition: the `<video>` element fires `canplay` asynchronously; the World context may update (user switches world) while the video is mid-load. If the overlay is applied via a CSS class that depends on both `activeWorld` state AND the video's load state, a world switch during video load will produce a frame where the overlay is mismatched to the video's current poster.

Additionally, the plan notes the poster `/swans-poster.webp` **does not exist**. If the overlay is applied as a CSS layer over the `<video>` element, and the video has no poster, the overlay renders over a black rectangle during load — which may look broken depending on the world's scrim color.

### Recommended Fix

**Ship the poster first (this is a P0.5 — it is blocking LCP and the reduced-motion hero).** Extract the best frame before any other work on `HeroSection.tsx`.

**Overlay architecture:**

```typescript
// HeroSection.tsx — overlay is a sibling element, not a child of video
<HeroContainer>
  <VideoElement
    ref={videoRef}
    poster="/swans-poster.webp"  // must exist before deploy
    src={videoSrc}
    aria-hidden
  />
  <WorldOverlay
    world={activeWorld}          // reads from context
    isVideoReady={isVideoReady}  // local state from canplay event
  />
  <HeroContent>                  // z-index above both
    {/* CTA, headline */}
  </HeroContent>
</HeroContainer>
```

`WorldOverlay` is a positioned `div` with `pointer-events: none`, `aria-hidden`, and a `data-world` attribute. The CSS for each world's scrim is authored as:

```css
[data-world="glacier-cathedral"] { --hero-scrim: linear-gradient(…var(--ice-wing, #60C0F0)…); }
[data-world="chrome-sovereign"]  { --hero-scrim: linear-gradient(…var(--royal-depth, #003080)…); }
```

No JavaScript color logic. No race condition — the overlay is always present; its appearance is data-attribute-driven CSS. The `isVideoReady` flag controls only whether the overlay transitions from poster-grade to video-grade opacity.

---

## Finding 5: World Switcher UI — File Budget and Touch Target Compliance

**Severity:** 🟡 MEDIUM
**File:** World Switcher UI (proposed upgrade of `UniversalThemeToggle`)

### Issue

The plan specifies: "header control showing worlds with tiny live previews, grouped (Natural / Cosmic / Luxury / Gaming / Editorial), keyboard-operable, 44px, persisted per-user." A grouped picker with live previews, keyboard navigation, 5 groups × 2 worlds average, persistence logic, and the existing cycle-button fallback will exceed 300 lines in a single file.

The "tiny live previews" are architecturally unspecified. If they are canvas-rendered or DOM-rendered mini-atmospheres, they will cause jank on open — the picker opens in the header, which is on the critical rendering path.

### Recommended Fix

**Split the switcher:**

```
WorldSwitcher/
  index.tsx              ← trigger button + popover mount, <60 lines
  WorldSwitcherPanel.tsx ← grouped list, keyboard nav, <150 lines
  WorldPreviewSwatch.tsx ← pure CSS swatch (NO canvas, NO DOM atmosphere)
  useWorldSwitcher.ts    ← open/close state, keyboard handler, persistence
  worldGroups.ts         ← static data: groups, world metadata, swatch colors
```

**Live previews must be CSS-only swatches** — a 32×32px `div` with a `background: linear-gradient(…)` derived from the world's two signature tokens. No rendered atmosphere, no canvas. The "live" quality comes from the swatch using the same CSS custom properties as the actual WorldLayer, so if the user has already switched worlds, the swatch reflects it.

**Persistence:** `localStorage` write must be debounced (300ms) and wrapped in a try/catch — `localStorage` throws in private browsing on some iOS versions. The plan mentions "server later" — design the hook interface now so the storage adapter is swappable:

```typescript
// useWorldSwitcher.ts
const storage = useWorldStorage(); // adapter: localStorage now, API later
```

---

## Finding 6: Hook Design — Data Fetching vs UI State Not Separated

**Severity:** 🟡 MEDIUM
**Files:** Proposed hooks across the plan (no explicit hook inventory given)

### Issue

The plan describes several surfaces that will need hooks but provides no hook inventory. Based on the plan's data flows, the following hooks are implied but not specified:

- World selection + persistence (UI state + storage)
- Video load state + poster fallback (async/media)
- Motion tier resolution (business logic)
- Contact form (form state + API mutation)
- Claims-vs-reality audit data (if any marketing claims are DB-driven)

Without an explicit hook inventory, the implementation will default to monolithic hooks that mix concerns — a common failure mode on large refactors.

### Recommended Fix

**Explicit hook taxonomy before implementation begins:**

| Hook | Type | Owns |
|---|---|---|
| `useActiveWorld` | UI state | reads/writes `activeWorld` from context |
| `useWorldStorage` | data/storage | localStorage adapter, persistence |
| `useWorldMotion` | business logic | resolves `min(worldDefault, surfaceLicence, capability)` |
| `useVideoHero` | async/media | `canplay`, `canplaythrough`, poster fallback, off-viewport pause |
| `useContactForm` | form state + mutation | field state, validation, submit, abort |
| `useMotionCapability` | business logic | `prefers-reduced-motion`, battery API, existing `resolveMotionTier` |

**Rule:** no hook crosses categories. `useVideoHero` does not write to world state. `useActiveWorld` does not touch localStorage directly — it calls `useWorldStorage`. This is enforced by code review, not by the framework.

---

## Finding 7: Error Boundary Coverage — Gaps on High-Risk Surfaces

**Severity:** 🟡 MEDIUM
**Files:** `WorldLayer`, `HeroSection`, `WorldSwitcher`, per-page rebuilds

### Issue

The plan proposes net-new components on the critical rendering path (hero, header) with no error boundary strategy. `WorldLayer` failing (e.g., a malformed atmosphere config for a new world) will blank the entire page. The World Switcher failing in the header will break navigation. Neither has a proposed fallback.

### Recommended Fix

**Error boundary placement map:**

```
AppShell
  ├── HeaderErrorBoundary          ← fallback: header without switcher
  │   └── WorldSwitcher
  ├── WorldLayerErrorBoundary      ← fallback: no atmosphere (page still renders)
  │   └── WorldLayer
  ├── HeroErrorBoundary            ← fallback: static poster + headline
  │   └── HeroSection (incl. video + overlay)
  └── PageErrorBoundary            ← per-route, existing pattern
      └── [page content]
```

`WorldLayerErrorBoundary` is the most important: its fallback must render the page without atmosphere — content is never blocked by a world rendering failure. This also means `WorldLayer` must be **absolutely positioned behind content**, never in the document flow, so its removal does not reflow the page.

---

## Finding 8: `crystallineDark` Palette Drift — Unresolved Decision Blocks Default World

**Severity:** 🟡 MEDIUM
**File:** `UniversalThemeContext.tsx` (existing)

### Issue

The plan correctly identifies that `crystallineDark` uses GitHub-family darks (`#0D1117/#161B22`) instead of the documented Crystalline Swan palette (`#0A0A0F/#141419/#1A1A24`). The plan defers this as "owner's call." However, the **default world selection** (Section 6, item 6) depends on this decision — if the default world is "true-Crystalline," but `crystallineDark` is still GitHub-dark, the default experience is wrong on day one.

This is not just an aesthetic decision — it affects the `tokenDiscipline.contract.test.ts` fallback-parity test. If the fallback hex values in `var(--token, #fallback)` are authored against the GitHub-dark palette, they will be wrong when the palette is corrected.

### Recommended Fix

**Force the decision before WorldLayer implementation begins.** Add it to the sequencing as a prerequisite:

1. Fix P0 build break (`@zxing/browser`)
2. Audit `crystallineDark` — owner decides: GitHub-dark or true-Crystalline
3. Update `tokenDiscipline.contract.test.ts` fallback values to match the decision
4. Retire Galaxy

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
