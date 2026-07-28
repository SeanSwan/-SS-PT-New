# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** .ai-workflow/fusion/kimi-swan-lens.md
**Seed:** (none)
**Tokens:** 1390 in / 17630 out · **Cost:** ~$0.2686 · **Wall:** 512.3s

---

# SWAN LENS v2 — "CRYSTALLINE CONTRACT" — BUILD-EXACT BLUEPRINT

**Author:** Kimi K3, SwanStudios Design Architect
**Scope:** `frontend/src/adapters/style-lens-swan/` + its consumers. DESIGN/front-end only. No auth/billing/PII.
**Contract status:** This document is the build. Deviations are defects.

---

## 1. HOSTILE REVIEW — top 5 weaknesses, most severe first

### W1 — Three drifting token namespaces = the contract is forking (SEVERE, theming fragility)
**Evidence:** `SwanStyleLensGlobalStyles.ts` emits `--lens-*`; `manifests/auroraConsole.ts` introduced a parallel `--console-*` family; surfaces consume `--world-*`. Three namespaces, zero enforced mapping between them. Aurora Console — the *reference* lens — had to invent its own namespace to express atmosphere, which proves `--lens-*` is under-specified. Every future lens will fork the same way. When `--console-*` and `--lens-*` disagree, whichever CSS loads later wins — order-dependent theming.
**Failure mode:** New lens ships → skins 90% of a dashboard, silently misses the surfaces reading the other namespace → "the lens doesn't take" bug class Sean is describing.

### W2 — Load-time validation checks contrast/motion/44px but NOT token completeness (SEVERE, fail-open hole)
**Evidence:** documented validation = "contrast ≥4.5 / reduced-motion / 44px validated at load." Nothing validates that a manifest actually *emits* the 11 `--world-*` vars or the `--lens-*` set. `SurfaceLensGate` (consumed by ~36 surfaces) gates on `data-style-lens` presence, not on token coverage. A manifest missing `--world-accent` passes load, flips the attribute, and 36 surfaces render inherited garbage.
**Failure mode:** Partially-skinned app in production with no console error, no fallback, no audit trail.

### W3 — Monolithic global stylesheet ships all ~28 lenses to every user (HIGH, architecture)
**Evidence:** `SwanStyleLensGlobalStyles.ts` is a single `css` template keyed on `data-style-lens` for the entire `SWAN_STYLE_LENS_REGISTRY` (~28 manifests). Every client downloads and parses every lens's rules; every edit touches one shared file (merge-conflict magnet); one malformed block risks the whole sheet; and the file is either over the 300-line cap or will be.
**Failure mode:** Payload bloat, review bottlenecks, one bad lens poisons all lenses.

### W4 — Lens switch is an un-choreographed attribute flip; the Crystallize doesn't exist in-app (HIGH, experience)
**Evidence:** Apply writes `data-style-lens` / `data-layout-profile` / `data-motion-mode` / `data-density` in one commit. Every `--lens-*` var repaints in the same frame. No staged transition, no overlay, no live-region announcement. The brand's signature moment — the Crystallize — is absent from the product it names. Instant full-surface repaint also flashes on OLED mobile.
**Failure mode:** Switching lens feels like a bug (flash), not a feature (moment).

### W5 — No responsive lens contract; mobile gets desktop geometry (HIGH, mobile)
**Evidence:** attributes written are lens/layout/motion/density — no viewport signal, no per-breakpoint geometry. Load validation includes 44px targets but nothing budgets `backdrop-filter` blur, glow spread, or atmosphere cost per device class. Glass blur at desktop values on a 375px GPU is the #1 mobile perf tax, and there is no `prefers-reduced-transparency` or `forced-colors` path at all.
**Failure mode:** Battery drain + jank on hand devices; lens unreadable under forced-colors; desktop-only QA passes while mobile degrades silently.

---

## 2. THE ENHANCED LENS — EXACT ARCHITECTURE (capabilities C1–C7)

Base path abbreviated as `SL = frontend/src/adapters/style-lens-swan`. `CREATE` = new file, `MODIFY` = existing file. Every file ≤ 300 lines; if a family file would exceed it, split as `<family>.a.ts` / `<family>.b.ts` — splitting is the only permitted remedy.

### C1 — Unified 3-tier token spine + `--console-*` retirement
**Files:**
- `CREATE SL/contract/lensTokens.ts` (≤200 lines)
- `CREATE SL/contract/consoleAlias.ts` (≤60)
- `CREATE SL/contract/worldProjection.ts` (≤140)

**Tiers:** `--lens-core-*` (18 tokens, REQUIRED — missing one rejects the manifest), `--lens-geo-*` (9, required), `--lens-fx-*` (8, optional — fallbacks below), `--lens-elev-*` (5, optional). The 11 existing `--world-*` names are **preserved verbatim** and are now *projected from* core tokens in exactly one place. 12 new `--world-*` tokens are additive only.

**Signatures:**
```ts
// lensTokens.ts
export const LENS_CORE_TOKENS = [
  '--lens-core-bg','--lens-core-surface-1','--lens-core-surface-2','--lens-core-surface-3',
  '--lens-core-text-1','--lens-core-text-2','--lens-core-text-3','--lens-core-border',
  '--lens-core-accent-primary','--lens-core-accent-secondary','--lens-core-accent-rare',
  '--lens-core-focus-ring','--lens-core-selection-bg','--lens-core-selection-text',
  '--lens-core-danger','--lens-core-success','--lens-core-warning','--lens-core-shadow-color',
] as const;
export const LENS_GEO_TOKENS = [
  '--lens-geo-radius-sm','--lens-geo-radius-md','--lens-geo-radius-lg','--lens-geo-radius-xl',
  '--lens-geo-border-w','--lens-geo-blur-sm','--lens-geo-blur-md','--lens-geo-blur-lg',
  '--lens-geo-target-min',
] as const;
export const LENS_FX_TOKENS = [
  '--lens-fx-glow-primary','--lens-fx-glow-secondary','--lens-fx-glow-strength',
  '--lens-fx-atmosphere','--lens-fx-noise-opacity','--lens-fx-surface-alpha',
  '--lens-fx-crystallize-sheen','--lens-fx-hover-lift',
] as const;
export const LENS_ELEV_TOKENS = ['--lens-elev-0','--lens-elev-1','--lens-elev-2','--lens-elev-3','--lens-elev-4'] as const;
export const LENS_TOKEN_FALLBACKS: Readonly<Record<string, string>> = { /* §3, verbatim */ };
```
```ts
// worldProjection.ts — the ONLY place --world-* is written
export function projectLensToWorld(recipe: LensTokenRecipe): Readonly<Record<string, string>>;
// mapping is 1:1 fixed: --world-bg ← --lens-core-bg, --world-surface ← --lens-core-surface-1,
// --world-accent ← --lens-core-accent-primary, … plus the 12 new world tokens in §3.
```
```ts
// consoleAlias.ts — emitted inside [data-style-lens='aurora-console'] only
// :where() zero-specificity aliases: --console-glow: var(--lens-fx-glow-primary, <fallback>); etc.
// Header comment: "DEPRECATED — remove after all aurora-console surfaces migrate (Slice 3 audit)."
```
**Composition:** Precedence is fixed and total: **recipe value → palette-derived default (`paletteThemeId` maps core color roles when recipe omits an FX token) → `LENS_TOKEN_FALLBACKS`**. `motionMode` never writes color tokens; palette never writes geometry; lens never writes typography. `--world-*` is the only namespace surfaces may read.
**Fail-closed:** `consoleAlias.ts` values are `var()` references with hard fallbacks — if the alias file is deleted, nothing breaks; if a lens emits `--console-*` directly, the validator rejects it (W1 fix).

### C2 — Fail-closed token validator + registry integrity
**Files:**
- `CREATE SL/contract/lensValidator.ts` (≤230)
- `CREATE SL/contract/__tests__/lensValidator.test.ts` (≤260)
- `MODIFY SL/index.ts` (+45 lines: wrap aggregation in `assertRegistryIntegrity()`)

**Signatures:**
```ts
export interface LensAuditReport {
  ok: boolean; lensId: string;
  missing: string[]; invalid: string[]; forbiddenNamespace: string[];
  contrastFailures: { pair: [string, string]; ratio: number; required: number }[];
}
export function validateLensRecipe(lensId: string, recipe: LensTokenRecipe): LensAuditReport;
export function assertRegistryIntegrity(registry: Record<string, LensTokenRecipe>): void; // dev + CI only
```
**Rules (exact):** (a) every `LENS_CORE_TOKENS` + `LENS_GEO_TOKENS` entry present; (b) sanitizer (existing banned-pattern scan) runs on **every value including fallbacks**: rejects `url(`, `;`, `{`, `}`, `\`, `<`, `>`, `@import`, `expression(`, `javascript:`; (c) color values must match `/^#([0-9a-fA-F]{6})$/` or `rgba(n,n,n,α)`; (d) retired-palette literals `#0a0a1a`, `#00ffff`, `#7851a9` (case-insensitive) rejected anywhere; (e) contrast pairs: text-1/2/3 vs surface-1 ≥ **4.5**, focus-ring vs surface-1 ≥ **3.0**, accent-rare vs surface-1 ≥ **3.0**, each `--world-data-*` vs `--world-bg` ≥ **3.0**.
**Behavior:** dev → `assertRegistryIntegrity` throws with `[SwanLens] lens "${id}" rejected: ${reason}`; prod → try/catch at Apply, reject to safety lens `swan-crystalline-default`, set `data-lens-fallback="true"`, announce (copy §6 Slice 1). `SurfaceLensGate` MODIFIED (+20 lines): in dev, writes `data-lens-audit="ok|degraded"` on its root and warns once per surface on missing `--world-*`.

### C3 — Active-only style injection (kill the monolith)
**Files:**
- `MODIFY SL/SwanStyleLensGlobalStyles.ts` → reduced to a re-export shell (≤30)
- `CREATE SL/styles/lensCoreStyles.ts` (≤260) — tier fallbacks, world projection CSS, density/viewport/a11y media blocks (§4–§5)
- `CREATE SL/styles/families/auroraConsole.ts` (≤300), `CREATE SL/styles/families/<existing families grouped by manifest family>.ts` — one file per family, each ≤300
- `CREATE SL/styles/activeLensStyles.ts` (≤90)

**Signature:**
```ts
// activeLensStyles.ts
const FAMILY_STYLE: Readonly<Record<string, RuleSet>> = { /* lensId → family css, static imports */ };
export const ActiveLensGlobalStyles: React.FC = () => {
  const lensId = document.documentElement.getAttribute('data-style-lens') ?? SAFETY_LENS_ID; // via hook subscription
  return createGlobalStyle`${lensCoreCss} ${FAMILY_STYLE[lensId] ?? familyStyleFallback}` as any; // styled-components
};
```
Only core CSS + the **active** family's CSS is in the DOM. No `import()` / no runtime fetch — lens CSS ships in the bundle and is **selected from a static allowlist** (data-not-code preserved). Budget: core ≤ 6 KB gzip, each family ≤ 4 KB gzip.

### C4 — The Crystallize (signature moment, in-app calm — two-speed law enforced)
**Files:**
- `CREATE SL/motion/lensMotionTokens.ts` (≤80)
- `CREATE SL/motion/useCrystallizeTransition.ts` (≤160)
- `CREATE SL/motion/CrystallizeOverlay.tsx` (≤120)
- `CREATE SL/motion/__tests__/crystallize.test.tsx` (≤240)
- `MODIFY` Appearance Studio apply handler — wrap the existing profile commit in `crystallizeTo(...)`

**Signatures:**
```ts
export type CrystallizePhase = 'idle' | 'charging' | 'settling';
export interface CrystallizeController {
  phase: CrystallizePhase;
  reduced: boolean; // prefers-reduced-motion OR data-motion-mode !== 'full'
  crystallizeTo(commit: () => void): void; // commit = the EXISTING attribute write, unchanged
}
export function useCrystallizeTransition(): CrystallizeController;
```
**Choreography (exact, also §4):** `idle → charging` (overlay mounts, `data-lens-transition="charging"`) → at **t=120ms** (desk/wall) / **110ms** (lap) / **100ms** (hand) `commit()` runs (attribute swap mid-transition, masked by sheen) → `settling` → `idle` at **480/400/320ms**. Overlay: `position:fixed; inset:0; z-index: var(--world-z-overlay); pointer-events:none;` background `var(--lens-fx-crystallize-sheen)`; animates **opacity + transform only**. Desk/lap/wall: sheen sweeps (`transform: translateX(-30%) → translateX(30%)`, width 160%). Hand: **fade only, no sweep**. App root gets `transform: scale(1 → 0.995 → 1)` during charge/settle (desk/lap only; hand: none).
**Fail-closed:** exception in any timer → clear all, force `idle`, run `commit()` synchronously. Reduced → `commit()` synchronously, overlay never mounts, total 0ms. Live-region: `aria-live="polite"` div announces on settle.

### C5 — Responsive density + viewport engine (mobile AND desktop)
**Files:**
- `CREATE SL/viewport/useLensViewport.ts` (≤90)
- `CREATE SL/viewport/__tests__/lensViewport.test.tsx` (≤140)
- `MODIFY SL/styles/lensCoreStyles.ts` (media blocks, within its 260-line budget)

**Signature:**
```ts
export type LensViewport = 'hand' | 'lap' | 'desk' | 'wall';
export function useLensViewport(): LensViewport; // writes data-viewport on <html>, debounced 150ms on resize
```
**Queries (exact):** hand `(max-width: 767px)` · lap `(min-width:768px) and (max-width:1023px)` · desk `(min-width:1024px) and (max-width:1919px)` · wall `(min-width:1920px)`. No `matchMedia` → fail-closed default `'lap'`.
**`data-layout-profile` fixed mapping:** hand→`stack`, lap→`rail`, desk→`console`, wall→`panorama`.
**Density:** `[data-density="compact"]{--lens-density-scale:0.875}` / `cozy:1` / `spacious:1.125`. Defaults: hand/lap/desk = cozy, wall = spacious. `--world-target-size: max(44px, calc(44px * var(--lens-density-scale,1)))` — **44px can never be scaled below**. `--world-space-unit: calc(8px * var(--lens-density-scale,1))`.
**Mobile enhancements (exact):** blur caps §5; `--lens-fx-surface-alpha: 0.92` on hand (glass *look* without blur cost) vs `0.72` desk; noise off; glow-strength 0.75; edge padding 16px at 320–414; fade-only Crystallize.
**Desktop enhancements (exact):** full blur, atmosphere noise 0.04, sweep Crystallize, and `@media (hover:hover) and (pointer:fine)` card hover: `transform: translateY(var(--lens-fx-hover-lift,-1px))` + `box-shadow: var(--lens-fx-glow-primary)` with `transition: transform 180ms var(--lens-ease-standard), box-shadow 180ms var(--lens-ease-standard)`. Wall: glow-strength 1.15.
**A11y media blocks (exact):** `@media (prefers-reduced-transparency: reduce)` → surface-alpha 1, noise 0, blur 0. `@media (forced-colors: active)` → all `--lens-fx-*` ignored; borders `1px solid CanvasText`; focus ring `2px solid Highlight`.

### C6 — Elevation, overlay, focus & selection skinning (a11y as first-class tokens)
**Files:** `MODIFY SL/styles/lensCoreStyles.ts` (already budgeted) + `MODIFY SL/contract/worldProjection.ts` (+30).
Focus ring, global, exact: `:where(a,button,[role='button'],input,select,textarea,[tabindex]):focus-visible { outline: 2px solid var(--lens-core-focus-ring,#8FE8FF); outline-offset: 2px; border-radius: var(--lens-geo-radius-sm,6px); }` · Selection: `::selection { background: var(--lens-core-selection-bg,#1B3A5C); color: var(--lens-core-selection-text,#F2F6FF); }` · Z-scale tokens §3 — z-index literals banned repo-wide (Do-NOT #7).

### C7 — Victory chart bridge + Appearance Studio preview
**Files:**
- `CREATE SL/charts/victoryLensBridge.ts` (≤140)
- `CREATE SL/charts/__tests__/victoryLensBridge.test.ts` (≤180)
- `MODIFY` Appearance Studio panel (+60 lines: 4-swatch preview strip rendering `--world-bg/-surface/-accent/-accent-2` of the *selected, unapplied* lens via the manifest recipe — pure data render, no attribute write until Apply)

**Signature:**
```ts
export interface LensChartTheme { palette: string[5]; gridStroke: string; axisStroke: string; tooltipBg: string; fontFamily: string; }
export function buildVictoryThemeFromLens(root: HTMLElement = document.documentElement): LensChartTheme;
```
Reads computed `--world-data-1..5/-grid/-axis`, validates each against `/^#([0-9a-fA-F]{6})$/`, substitutes `LENS_TOKEN_FALLBACKS` on miss (fail-closed), returns a plain object for Victory's `theme` prop. Charts re-skin on lens switch by re-calling inside the existing appearance subscriber. Victory-only — no new chart dependency.

---

## 3. EXACT TOKENS + VALUES (verbatim `LENS_TOKEN_FALLBACKS`)

| Token | Fallback |
|---|---|
| `--lens-core-bg` | `#060B16` |
| `--lens-core-surface-1` | `#0A1224` |
| `--lens-core-surface-2` | `#101A33` |
| `--lens-core-surface-3` | `#16224A` |
| `--lens-core-text-1` | `#F2F6FF` |
| `--lens-core-text-2` | `#B9C4DE` |
| `--lens-core-text-3` | `#7C89A8` |
| `--lens-core-border` | `#263454` |
| `--lens-core-accent-primary` | `#6FE3FF` |
| `--lens-core-accent-secondary` | `#9B7BFF` |
| `--lens-core-accent-rare` | `#E8C15A` |
| `--lens-core-focus-ring` | `#8FE8FF` |
| `--lens-core-selection-bg` | `#1B3A5C` |
| `--lens-core-selection-text` | `#F2F6FF` |
| `--lens-core-danger` | `#FF7A8A` |
| `--lens-core-success` | `#45D483` |
| `--lens-core-warning` | `#F5B84C` |
| `--lens-core-shadow-color` | `rgba(2,6,18,0.6)` |
| `--lens-geo-radius-sm` / `-md` / `-lg` / `-xl` | `6px` / `10px` / `16px` / `24px` |
| `--lens-geo-border-w` | `1px` |
| `--lens-geo-blur-sm` / `-md` / `-lg` | `4px` / `12px` / `24px` (desk fallbacks; §5 overrides) |
| `--lens-geo-target-min` | `44px` |
| `--lens-fx-glow-primary` | `0 0 16px 0 rgba(111,227,255,0.28)` |
| `--lens-fx-glow-secondary` | `0 0 16px 0 rgba(155,123,255,0.24)` |
| `--lens-fx-glow-strength` | `1` |
| `--lens-fx-atmosphere` | `radial-gradient(1200px 800px at 70% -10%, rgba(111,227,255,0.08), transparent 60%), radial-gradient(1000px 700px at 10% 110%, rgba(155,123,255,0.07), transparent 60%)` |
| `--lens-fx-noise-opacity` | `0.04` |
| `--lens-fx-surface-alpha` | `0.72` |
| `--lens-fx-crystallize-sheen` | `linear-gradient(105deg, transparent 40%, rgba(143,232,255,0.14) 50%, transparent 60%)` |
| `--lens-fx-hover-lift` | `-1px` |
| `--lens-elev-0` / `-1` / `-2` / `-3` / `-4` | `none` / `0 1px 2px rgba(2,6,18,0.5)` / `0 4px 12px rgba(2,6,18,0.5)` / `0 8px 24px rgba(2,6,18,0.55)` / `0 16px 48px rgba(2,6,18,0.6)` |
| `--lens-density-scale` | `1` |
| `--lens-ease-standard` / `-enter` / `-exit` / `-crystallize` | `cubic-bezier(0.2,0,0,1)` / `cubic-bezier(0,0,0.2,1)` / `cubic-bezier(0.4,0,1,1)` / `cubic-bezier(0.16,1,0.3,1)` |
| `--lens-dur-micro` / `-fast` / `-base` / `-crystallize` | `120ms` / `180ms` / `240ms` / `480ms` |

**New `--world-*` (12, additive; existing 11 names unchanged):** `--world-selection-bg #1B3A5C` · `--world-selection-text #F2F6FF` · `--world-danger #FF7A8A` · `--world-success #45D483` · `--world-warning #F5B84C` · `--world-data-1 #6FE3FF` · `--world-data-2 #9B7BFF` · `--world-data-3 #E8C15A` · `--world-data-4 #45D483` · `--world-data-5 #FF7A8A` · `--world-data-grid rgba(185,196,222,0.14)` · `--world-data-axis #7C89A8` · `--world-target-size 44px` · `--world-space-unit 8px` · `--world-density-scale 1` · `--world-z-base 0` · `--world-z-raised 100` · `--world-z-sticky 200` · `--world-z-overlay 300` · `--world-z-modal 400` · `--world-z-toast 500`.

---

## 4. MOTION SPEC (exact)

| Name | Easing | Duration | Animates |
|---|---|---|---|
| `swan-hover` | `cubic-bezier(0.2,0,0,1)` | 180ms | transform, box-shadow (static paint) |
| `swan-enter` | `cubic-bezier(0,0,0.2,1)` | 240ms | opacity, transform |
| `swan-exit` | `cubic-bezier(0.4,0,1,1)` | 180ms | opacity, transform |
| `swan-crystallize` | `cubic-bezier(0.16,1,0.3,1)` | **480 desk/wall · 400 lap · 320 hand** (total) | opacity, transform ONLY |

**Crystallize timeline (desk/wall):** t=0 `charging`: sheen opacity 0→1 over 120ms, translateX -30%→0%; root scale 1→0.995. **t=120ms: attribute commit.** t=120–480 `settling` (360ms): sheen translateX 0%→+30%, opacity 1→0, root scale→1. Lap: 110/290. Hand: 100/220, **fade only** (no translateX, no root scale). Nothing else animates. No width/height/top/left/filter/backdrop-filter is ever transitioned.
**Reduced-motion** (`prefers-reduced-motion: reduce` OR `data-motion-mode ≠ "full"`): commit synchronous, overlay unmounted, all durations treated as 0ms; `[data-motion-mode="off"] .lens-animatable { transition: none; animation: none; }`.
**Perf budget:** full switch ≤ 480ms wall-clock, ≤ 2 style recalcs, 0 layout thrash (transform/opacity only), active-lens CSS ≤ 10 KB gzip total.

---

## 5. RESPONSIVE MATRIX (exact)

| VP px | `data-viewport` | layout-profile | default density | target | blur sm/md/lg | Crystallize | noise | glow-strength | surface-alpha | edge pad |
|---|---|---|---|---|---|---|---|---|---|---|
| 320 | hand | stack | cozy | 44px | 0 / 4px / 8px | 320ms fade | 0 | 0.75 | 0.92 | 16px |
| 375 | hand | stack | cozy | 44px | 0 / 4px / 8px | 320ms fade | 0 | 0.75 | 0.92 | 16px |
| 414 | hand | stack | cozy | 44px | 0 / 4px / 8px | 320ms fade | 0 | 0.75 | 0.92 | 16px |
| 768 | lap | rail | cozy | 44px | 4px / 8px / 16px | 400ms sweep | 0.02 | 0.9 | 0.8 | 24px |
| 1024 | desk | console | cozy | 44px | 4px / 12px / 24px | 480ms sweep | 0.04 | 1 | 0.72 | 32px |
| 1440 | desk | console | cozy | 44px | 4px / 12px / 24px | 480ms sweep | 0.04 | 1 | 0.72 | 32px |
| 2560 | wall | panorama | spacious | 44px | 6px / 16px / 32px | 480ms sweep | 0.04 | 1.15 | 0.72 | 48px |
| 3840 | wall | panorama | spacious | 44px | 6px / 16px / 32px | 480ms sweep | 0.04 | 1.15 | 0.72 | 48px |

Density `compact` user-selectable at every width; `--world-target-size` clamps at 44px regardless. Wall content max-width 1600px, centered.

---

## 6. BUILD ORDER — 3 SLICES

### SLICE 1 — "Spine" (C1 + C2 + C3)
**(a) Files:** `contract/lensTokens.ts`, `contract/worldProjection.ts`, `contract/consoleAlias.ts`, `contract/lensValidator.ts`, `contract/__tests__/lensValidator.test.ts`, `styles/lensCoreStyles.ts`, `styles/families/*.ts` (one per existing family, manifests untouched), `styles/activeLensStyles.ts`, `MODIFY index.ts` (+45), `MODIFY SwanStyleLensGlobalStyles.ts` (→ re-export shell).
**(b) Acceptance (executable):**
1. `lensValidator.test.ts` green: rejects recipe missing `--lens-core-bg`; rejects `url(`, `;`, `<`; rejects literals `#0a0a1a` / `#00ffff` / `#7851a9` (case-insensitive); flags a text-3/surface-1 pair below 4.5.
2. DOM test: apply `aurora-console` → `getComputedStyle(document.documentElement).getPropertyValue('--world-accent').trim()` === manifest's `--lens-core-accent-primary`; `document.head` contains **no** CSS text of any non-active family (assert a unique selector string per family is absent).
3. Grep gate (CI): `grep -Rn "console-" frontend/src` matches only `consoleAlias.ts` and its test.
4. Gzip: core ≤ 6 KB, each family ≤ 4 KB.
**(c) Fail-closed check:** apply a lens whose recipe is deleted at runtime → `data-style-lens="swan-crystalline-default"`, `data-lens-fallback="true"` present, live-region announces **"That style couldn't be applied safely, so the default look was restored."** Apply success announces **"Appearance applied: {lens display name}."**

### SLICE 2 — "Moment + Matrix" (C4 + C5)
**(a) Files:** `motion/lensMotionTokens.ts`, `motion/useCrystallizeTransition.ts`, `motion/CrystallizeOverlay.tsx`, `motion/__tests__/crystallize.test.tsx`, `viewport/useLensViewport.ts`, `viewport/__tests__/lensViewport.test.tsx`, `MODIFY styles/lensCoreStyles.ts` (media/density blocks), `MODIFY` Appearance Studio apply handler (wrap commit in `crystallizeTo`).
**(b) Acceptance:**
1. Fake-timer test (desk mock): phase log === `['charging@0','commit@120','settling@120','idle@480']` exactly; overlay props animate only `opacity`/`transform` (assert no other `transition-property` values in rendered style).
2. Reduced-motion mock: `commit` called synchronously, overlay never in DOM, elapsed 0ms.
3. Viewport test: width 375 → `data-viewport="hand"`, `data-layout-profile="stack"`, computed `--lens-geo-blur-md` === `4px`, `--lens-fx-surface-alpha` === `0.92`; width 1440 → `desk`/`console`/`12px`/`0.72`; width 2560 → `wall`/`panorama`, density `spacious`.
4. Playwright: full Apply at 1440 completes ≤ 480ms; CLS = 0 during switch.
**(c) Fail-closed check:** `matchMedia` stubbed to throw → `data-viewport="lap"`, app renders, no console error; exception injected into settle timer → `idle` forced, commit still executed exactly once.

### SLICE 3 — "Surfaces" (C6 + C7)
**(a) Files:** `charts/victoryLensBridge.ts`, `charts/__tests__/victoryLensBridge.test.ts`, `MODIFY styles/lensCoreStyles.ts` (focus/selection/elev CSS — within budget), `MODIFY` Appearance Studio (+60 preview strip), `MODIFY` the four dashboard shells behind `SurfaceLensGate` (admin `/admin`, trainer `/trainer`, client `/client`, user `/dashboard`) — replace any local z-index/shadow/focus literals with tokens; zero layout changes.
**(b) Acceptance:**
1. `victoryLensBridge.test.ts`: lens A vs lens B → different `palette`, all entries match hex regex; corrupt token → fallback substituted, no throw.
2. axe-core on all 4 dashboard routes × 2 lenses (`swan-crystalline-default`, `aurora-console`): **0 serious/critical violations**; `::selection` and `:focus-visible` computed styles match §3 tokens.
3. Playwright target audit at 375 and 1440: every interactive element bounding box ≥ 44×44.
4. Visual: Victory chart on each dashboard reflects `--world-data-*` of the active lens after a Slice-2 Apply, with no chart-lib code changed.
**(c) Fail-closed check:** delete `--world-data-3` from the active recipe → validator rejects the lens to safety default (Slice 1 path), chart bridge emits fallback `#E8C15A`, dashboard never renders an unskinned chart.

---

## 7. DO NOT LIST — decisions already made; the builder makes none

1. **Do NOT** write a raw hex anywhere except `LENS_TOKEN_FALLBACKS` and manifest recipes. No hex in components, tests (except assertions), or stories.
2. **Do NOT** use `#0a0a1a`, `#00FFFF`, `#7851A9` anywhere — including fallbacks, comments, fixtures, or "harmless" test data. The validator rejects them; so does review.
3. **Do NOT** create a fourth token namespace. New need → extend `--lens-fx-*` (optional) or `--world-*` (additive) — never invent `--<thing>-*`.
4. **Do NOT** rename, reorder, or re-semantics any of the existing 11 `--world-*` vars or the 4 data attributes. Additive only.
5. **Do NOT** animate width, height, top, left, margin, padding, filter, or backdrop-filter. Opacity + transform. The Crystallize never exceeds 480ms; no marketing-grade motion in-app.
6. **Do NOT** use `import()`, runtime fetch, or string-evaluated CSS for lens styles. Static imports + allowlist lookup. Recipes stay DATA through the existing sanitizer.
7. **Do NOT** write z-index or px-shadow literals. `--world-z-*` and `--lens-elev-*` only. No `!important` anywhere, including reduced-motion overrides (use the attribute selectors specified).
8. **Do NOT** add light mode, per-surface lens overrides outside `SurfaceLensGate`, telemetry, or any user data in the appearance flow. Zero PII.
9. **Do NOT** swap Victory, styled-components, or the single-Apply `AppearanceProfile { paletteThemeId, styleLensId, motionMode }` shape. `crystallizeTo` wraps the existing commit; it does not replace it.
10. **Do NOT** exceed 300 lines per file — split, don't compress. Do NOT "simplify" the validator, drop a breakpoint row, round a token value, or substitute an easing. If this document and instinct disagree, the document wins; if the document is silent, stop and ask — do not improvise.

**Opus verifies fidelity to this blueprint only. Build order is Slice 1 → 2 → 3. No slice merges without its acceptance tests green and its fail-closed check demonstrated.**
