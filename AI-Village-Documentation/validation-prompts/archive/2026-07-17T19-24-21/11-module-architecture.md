# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 28.4s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/WORLD-SWITCHER-MARKETING-REDESIGN-PLAN-2026-07-17.md
> **Generated:** 7/17/2026, 12:24:21 PM

---

**SwanStudios Marketing Redesign + World‑Switcher – Architecture Review**  
*Based solely on the supplied PLAN (no external assumptions).*

---

## 1. Decomposition – Is the plan’s file breakdown right?

| Plan artifact | Suggested file/folder | Comments / Risks |
|---------------|----------------------|------------------|
| **UniversalThemeToggle** (existing) | `src/components/ThemeToggle/UniversalThemeToggle.tsx` | Will be **upgraded** to a picker; keep the file – it is the natural home for the UI. |
| **UniversalThemeContext.tsx** (line 1576) | `src/context/ThemeContext.tsx` | Holds the current **World** setting and provides the `WorldLayer`/`ChromeLayer` contract. |
| **WorldLayer** (net‑new) | `src/components/WorldLayer/WorldLayer.tsx` | Renders the atmosphere (CSS/SVG/gradient/particle) based on the active World. |
| **ChromeLayer** (net‑new) | `src/components/ChromeLayer/ChromeLayer.tsx` | Thin wrapper that forces all content to use Crystalline Swan tokens only. |
| **World catalog → theme registry bridge** | `src/theme/worlds.ts` (data) + `src/theme/worldRegistry.ts` (mapper) | `worlds.ts` holds the 10 world objects (id, palette‑accent, atmosphere recipe, motion default). `worldRegistry.ts` translates a world ID into the Lens OS `--world-*` CSS custom properties. |
| **World Switcher UI** (upgrade) | `src/components/WorldPicker/WorldPicker.tsx` (replaces/extends `UniversalThemeToggle`) | Shows live previews, groups, keyboard‑operable, 44px, persists selection (localStorage). |
| **Per‑page rebuilds** (home, about, contact, store, gallery, video‑library, waiver) | `src/pages/` with one folder per route (e.g., `src/pages/Home/`, `src/pages/About/`…) | Each folder contains the page component (`index.tsx`) and any page‑specific sub‑components or hooks. |
| **Swan video hero enhancements** | `src/components/Hero/SwanHero.tsx` (uses `WorldLayer` internally) | Keeps the video, adds poster, world‑graded overlay, depth‑beat, reduced‑motion safeguards. |
| **Shared UI primitives** (buttons, cards, focus‑rings, Dual‑Button Glow) | `src/components/UI/` (styled‑components only) | Guarantees Palette Law A – all colors come from CSS custom properties with fallbacks. |
| **Tokens & utilities** | `src/styles/tokens.css` (canonical) <br> `src/utils/themeUtils.ts` (sole semantic injector) <br> `src/utils/LensPlanFrame.ts` (`makeLensFrame`) | Already shipped; no new files needed. |
| **Motion‑tier map** | `src/utils/motionTiers.ts` (exports `SURFACE_MOTION_TIERS` & `resolveMotionTier`) | Existing; keep as‑is. |
| **Tests / contracts** | `src/__tests__/` (e.g., `tokenDiscipline.contract.test.ts`) | Existing; unchanged. |

**Verdict:** The decomposition is logical. The only *over‑fragmented* area is the **per‑page folder** – if a page is very simple (e.g., Waiver) it could live directly under `src/pages/` without a sub‑folder, but keeping a folder scales better for future sub‑components. No file appears *too thin* that would merit merging.

---

## 2. Styles/ organization – Are the proposed style files / barrels well‑organized?

*Current state (from plan):*  
- `tokens.css` – canonical CSS custom property definitions (with fallbacks).  
- No other style files mentioned.

**Recommendation:** Keep a **single global stylesheet** for the token definitions and a **StyledComponents GlobalStyle** for any base resets. All component‑level styling stays inside the `.tsx` files using `styled-components`. This avoids over‑fragmentation.

```
src/
  styles/
    tokens.css          # canonical CSS vars (never edited by hand)
    GlobalStyle.ts      # styled-components createGlobalStyle (reset, base fonts)
    index.ts            # barrel: export * from './tokens.css'; export * from './GlobalStyle';
```

**Why this works:**  
- Every color in a component is `var(--token-name, #fallback)`.  
- No hard‑coded hex except the fallback inside the `var()` call.  
- The barrel lets other files import `{ /* tokens */ } from '@/styles'` without knowing the internal file names.

---

## 3. Hooks/ separation – Is the separation of concerns clean?

The plan does not explicitly list hooks, but we can infer the needed ones from the described responsibilities:

| Concern | Suggested hook | Location | Reason |
|---------|----------------|----------|--------|
| **World selection (UI‑state)** | `useWorldSelection()` | `src/hooks/useWorldSelection.ts` | Reads/writes the selected World ID from `localStorage` (or context) and returns `{ worldId, setWorldId }`. |
| **Theme context consumption** | `useWorld()` (thin wrapper) | `src/hooks/useWorld.ts` | Calls `useContext(ThemeContext)` and returns the resolved world object (palette‑accent, atmosphere recipe, motion default). |
| **Data‑fetch for showcase pages** | `useGalleryPhotos()`, `useVideos()`, `useStoreProducts()` | `src/hooks/` (one per domain) | Encapsulates API calls, caching, and loading state. Keeps page components focused on UI. |
| **Form handling (Contact)** | `useContactForm()` | `src/hooks/useContactForm.ts` | Manages form state, validation, and submits to `/api/contact` (byte‑identical). |
| **Motion‑tier resolution** | `useMotionTier(surface: string)` | `src/hooks/useMotionTier.ts` | Calls `resolveMotionTier(licence, capability)` and returns the tier (M0‑M3). |
| **Reduced‑motion media query** | `useReducedMotion()` | `src/hooks/useReducedMotion.ts` | Returns boolean from `window.matchMedia('(prefers-reduced-motion: reduce)')`. |

**Separation quality:**  
- **UI‑state** (`useWorldSelection`, `useWorld`) lives in `hooks/` but is *purely* state/logic, no DOM.  
- **Data‑fetch** hooks are isolated from UI, making them testable and reusable across pages.  
- **Business‑logic** (motion tier, reduced‑motion) is also isolated.  
- No hook appears to mix data‑fetch with UI‑state, so the separation is clean.

If the plan had lumped all of these into a single `useWorldAndData.ts`, that would violate the rule; the proposed split avoids that risk.

---

## 4. 300‑line budget – Which files are at risk? Proposed splits.

| File (as implied by plan) | Estimated responsibilities | Risk of >300 lines | Suggested split / mitigation |
|---------------------------|----------------------------|--------------------|------------------------------|
| **src/pages/Home/index.tsx** | Four‑act cinematic layout, hero (SwanHero), copy sections, call‑to‑action, world‑aware animations. | **High** – hero + multiple sections can easily exceed 300 lines. | Split into: <br>• `HomeLayout.tsx` (orchestrates sections) <br>• `HeroSection.tsx` (uses `SwanHero`) <br>• `ActOne.tsx` … `ActFour.tsx` (each < 100 lines). |
| **src/pages/About/index.tsx** | Mission/story/credentials rebuild, stats, NASM‑protocol copy. | **Medium‑High** – copy blocks + multiple card grids. | Extract reusable UI blocks: `StatsGrid.tsx`, `Timeline.tsx`, `CredentialsCard.tsx`. Keep the page file under 200 lines. |
| **src/pages/Contact/index.tsx** | Form UI, validation, submission (keep existing pipeline). | **Medium** – form logic can bloat. | Move form logic to `useContactForm.ts` hook; the component stays thin (< 150 lines). |
| **src/components/WorldLayer/WorldLayer.tsx** | Reads world ID, renders atmosphere (CSS/SVG/gradient/particle) respecting motion tier & reduced‑motion. | **Medium** – atmosphere logic + particle system could grow. | Isolate particle/gradient into `AtmosphereEffects.tsx` (pure visual) and keep `WorldLayer` as a thin wrapper (< 150 lines). |
| **src/components/ChromeLayer/ChromeLayer.tsx** | Simple wrapper that forces Crystalline Swan tokens; likely just a `<div>` with a className. | **Low** – should stay < 50 lines. |
| **src/components/WorldPicker/WorldPicker.tsx** | Picker UI with live previews, groups, keyboard navigation, persistence. | **Medium‑High** – preview rendering + group logic. | Extract `WorldPreview.tsx` (small card) and `WorldGroup.tsx` (header + list). Main file stays < 200 lines. |
| **src/components/Hero/SwanHero.tsx** | Video, poster, world‑graded overlay, depth‑beat, reduced‑motion safeguards. | **Medium** – overlay + depth‑beat logic. | Split overlay into `VideoOverlay.tsx` (CSS gradient) and `DepthBeat.tsx` (conditional particle). Main file < 200 lines. |
| **src/theme files (hooks, utils, tokens, GlobalStyle)** | Small, focused. | **Low** – each well under 100 lines. |

**Overall:** No file *must* exceed 300 lines if we apply the above splits. The plan’s original monolithic page files are the only risk; the suggested modularization keeps each file comfortably within the limit.

---

## 5. Import graph – Dependency tree & circular risks

```
src/
 ├─ assets/ (images, posters)                     ← (no code imports)
 ├─ components/
 │   ├─ UI/                                        ← styled primitives (tokens.css)
 │   ├─ WorldLayer/
 │   │   ├─ WorldLayer.tsx        → uses ThemeContext, useWorld, useMotionTier, useReducedMotion
 │   │   └─ AtmosphereEffects.tsx → uses useMotionTier, useReducedMotion
 │   ├─ ChromeLayer/
 │   │   └─ ChromeLayer.tsx       → uses ThemeContext (only to read world‑independent tokens)
 │   ├─ WorldPicker/
 │   │   ├─ WorldPicker.tsx       → uses useWorldSelection, useWorld, WorldPreview
 │   │   ├─ WorldPreview.tsx      → uses useWorld (for palette accent)
 │   │   └─ WorldGroup.tsx        → UI only
 │   ├─ Hero/
 │   │   ├─ SwanHero.tsx          → uses WorldLayer (as background), useReducedMotion, useMotionTier
 │   │   ├─ VideoOverlay.tsx      → styled (tokens.css)
 │   │   └─ DepthBeat.tsx         → uses useReducedMotion
 │   └─ … (buttons, cards, etc.)  → tokens.css only
 ├─ context/
 │   └─ ThemeContext.tsx          → provides worldId, setWorldId (uses useWorldSelection internally)
 ├─ hooks/
 │   ├─ useWorldSelection.ts      → reads/writes localStorage (no React deps besides useState/useEffect)
 │   ├─ useWorld.ts               → uses ThemeContext
 │   ├─ useMotionTier.ts          → pure function (imports motionTiers util)
 │   ├─ useReducedMotion.ts       → pure (matchMedia)
 │   ├─ useContactForm.ts         → API call (axios/fetch)
 │   ├─ useGalleryPhotos.ts       → API
 │   ├─ useVideos.ts              → API
 │   └─ useStoreProducts.ts       → API
 ├─ pages/
 │   ├─ Home/
 │   │   ├─ index.tsx             → imports HomeLayout, SwanHero, etc.
 │   │   ├─ HomeLayout.tsx        → imports sections
 │   │   └─ sections/…            → may use UI primitives, useWorld (for accent)
 │   ├─ About/… (similar)
 │   ├─ Contact/…                 → uses useContactForm, UI primitives
 │   ├─ Store/…                   → browse uses useStoreProducts; checkout is M0 (no hooks)
 │   ├─ Gallery/…                 → uses useGalleryPhotos
 │   ├─ VideoLibrary/…            → uses useVideos
 │   └─ Waiver/…                  → minimal UI, no hooks
 ├─ theme/
 │   ├─ worlds.ts                 → data only (no React)
 │   └─ worldRegistry.ts          → returns CSS variable object (uses worlds.ts)
 ├─ styles/
 │   ├─ tokens.css
 │   ├─ GlobalStyle.ts
 │   └─ index.ts
 └─ utils/
     ├─ motionTiers.ts
     ├─ themeUtils.ts
     └─ LensPlanFrame.ts
```

**Circular risk check:**  
- The only place that *writes* to the world selection is `useWorldSelection.ts` (localStorage). It is **imported** by `ThemeContext.tsx` (to provide a setter) and by `WorldPicker.tsx`.  
- `ThemeContext.tsx` **does not import** `WorldPicker` or any UI component – it only exports the context provider and the hook `useWorld`.  
- No file imports a component that, in turn, imports the file that defines its context or hook.  
- Therefore **no circular dependencies** are apparent.

**Depth:** The longest chain is roughly:  
`Page → UI primitive (e.g., Button) → tokens.css` (2 hops) or  
`Page → SwanHero → WorldLayer → ThemeContext → useWorldSelection → localStorage` (4 hops). This is shallow and safe.

---

## 6. Barrel exports – Where do barrels help vs hurt?

| Directory | Barrel (`index.ts`) recommended? | Reason |
|-----------|----------------------------------|--------|
| `src/components/UI/` | **Yes** | Consumers import `{ Button, Card, FocusRing, DualButtonGlow } from '@/components/UI'` – keeps imports tidy. |
| `src/components/WorldLayer/` | **Optional** | Only `WorldLayer.tsx` is used externally; `AtmosphereEffects.tsx` is internal. A barrel exporting just `WorldLayer` is fine but not required. |
| `src/components/WorldPicker/` | **Yes** | `WorldPicker` is the public entry; internal preview/group files stay private. |
| `src/components/Hero/` | **Yes** | `SwanHero` is the public component; overlay/depth‑beat are internal. |
| `src/hooks/` | **Yes** | Each hook is a named export; a barrel lets `import { useWorldSelection, useWorld } from '@/hooks'`. |
| `src/theme/` | **Yes** | `worlds.ts` (data) and `worldRegistry.ts` (mapper) are both used by other layers; a barrel avoids remembering which file holds what. |
| `src/pages/` | **No** (per‑route folders) | Pages are imported by route via dynamic import (`lazy(() => import('@/pages/Home'))`). Barrels would add an unnecessary indirection and could cause accidental re‑exports of internal files. |
| `src/styles/` | **Yes** | `tokens.css` and `GlobalStyle.ts` are both needed globally; a barrel lets `import '@/styles'` pull in both. |
| `src/utils/` | **Yes** | `motionTiers`, `themeUtils`, `LensPlanFrame` are all utility helpers; a barrel

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
