# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** C:/tmp/ss-build-swan-lens/docs/ai-workflow/AI-HANDOFF/KIMI-SWAN-LENS-BLUEPRINT-2026-07-17.md
**Seed:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/5fc53ba5-c4c0-459b-90db-02db460a54ce/scratchpad/kimi-slice2-motion-real-substrate-seed.md
**Tokens:** 10040 in / 27438 out · **Cost:** ~$0.4417 · **Wall:** 1038.2s

---

# SWAN LENS v2 — SLICE 2 (RE-ISSUED, SEED-GROUNDED) — "MOMENT + MATRIX"

**Author:** Kimi K3, SwanStudios Design Architect · **Scope:** C4 Crystallize + C5 viewport/density only · **Base:** `origin/main`, post-S1-A/B (built), S1-C finalizing elsewhere.
`SL = frontend/src/adapters/style-lens-swan`. Design lane only. Zero Lane-A edits. The design (choreography, easings, durations, matrix) is unchanged from the original contract; only the substrate bindings move.

---

## 2.1 CORRECTED FILE PLAN

| # | File | Action | Budget |
|---|---|---|---|
| 1 | `SL/motion/useCrystallizeTransition.ts` | CREATE | ≤170 |
| 2 | `SL/motion/CrystallizeOverlay.tsx` | CREATE | ≤130 |
| 3 | `SL/motion/__tests__/crystallize.test.tsx` | CREATE | ≤260 |
| 4 | `SL/viewport/useLensViewport.ts` | CREATE | ≤100 |
| 5 | `SL/viewport/__tests__/lensViewport.test.tsx` | CREATE | ≤150 |
| 6 | `SL/styles/lensViewportStyles.ts` | CREATE | ≤280 |
| 7 | `SL/index.ts` (barrel re-exports) | MODIFY (optional, +10; deferrable to S1-C finalization) | — |

**Deleted vs original:** `motion/lensMotionTokens.ts` — **not created.** Choreography constants co-locate inside the controller; tier gating is consumed from the real system.
**Consumed, not modified:** `core/motion/surfaceMotionTiers.ts` (`resolveMotionTier`, `tierAllows`, `MOTION_TIERS`), `hooks/useAnimationTier.ts`, `core/style-lens-os/types.ts` (type-only).
**Not touched:** `StyleLensProvider`, `AppearanceStudioPanel`, `ScopedLensFrame`, `core/style-lens-os`, the 36 surfaces, manifests, `styles/lensCoreStyles.ts` (S1-C territory — Slice-2 CSS ships as a separate module, §2.5).

---

## 2.2 C4 — CRYSTALLIZE CONTROLLER (signature + exact semantics)

```ts
// SL/motion/useCrystallizeTransition.ts
import type { AppearanceProfile } from '../../../core/style-lens-os/types'; // type-only, read-only
// consumes: useAnimationTier() → 'essential'|'balanced'|'full'
//           resolveMotionTier(surfaceId, capability), tierAllows(tier, atLeast)
//           useLensViewport() → 'hand'|'lap'|'desk'|'wall'

export type CrystallizePhase   = 'idle' | 'charging' | 'settling';
export type CrystallizeVariant = 'static' | 'fade' | 'sweep';

/** Mirrors the appearance-settings surface. UNLICENSED today → resolveMotionTier fails safe to M0
 *  until Lane A registers it (integration note §2.9, step 1). */
export const CRYSTALLIZE_SURFACE_ID = 'settings.appearance';

/** Design-spec choreography constants — NOT a token file. Durations are viewport-keyed. */
export const CRYSTALLIZE_TIMING = {
  hand: { charge: 100, total: 320 },
  lap:  { charge: 110, total: 400 },
  desk: { charge: 120, total: 480 },
  wall: { charge: 120, total: 480 },
} as const; // settle = total − charge → 220 / 290 / 360 / 360

export interface CrystallizeOverlayProps {
  phase: CrystallizePhase; variant: CrystallizeVariant;
  chargeMs: number; settleMs: number; announcement: string;
}
export interface CrystallizeController {
  phase: CrystallizePhase;
  reduced: boolean;            // §2.4 predicate
  variant: CrystallizeVariant; // resolved at call time
  overlayProps: CrystallizeOverlayProps; // spread straight onto <CrystallizeOverlay/>
  crystallizeTo(commit: () => void, opts?: { settleAnnouncement?: string }): void;
}
export function useCrystallizeTransition(options?: {
  motionMode?: AppearanceProfile['motionMode']; // wire from Lane A profile; default 'auto'
  surfaceId?: string;                           // default CRYSTALLIZE_SURFACE_ID
}): CrystallizeController;
```

**Variant resolution (exact):**
```
reduced      = (motionMode !== 'auto') || capability === 'essential' || prmQuery.matches   // §2.4
effectiveTier = resolveMotionTier(surfaceId, capability)          // min(capability ceiling, licence)
if (reduced || !tierAllows(effectiveTier, 'M1'))  → 'static'      // covers M0 fail-safe
else if (viewport === 'hand' || !tierAllows(effectiveTier, 'M2')) → 'fade'
else                                            → 'sweep'
```
M3 gets nothing beyond M2 — the two-speed law caps the Crystallize at its authored budget even at the cinematic tier. Variant is snapshotted at `crystallizeTo` call time.

**Semantics (exact):**
- **static:** `commit()` runs synchronously inside `crystallizeTo`; overlay sheen never mounts; announcement set immediately; elapsed 0ms; no timers created.
- **fade/sweep:** phase `charging` → at `chargeMs` `commit()` runs (attribute swap masked mid-transition) → phase `settling` → at `totalMs` phase `idle`. Announcement revealed at settle start (commit moment).
- **Exactly-once:** a `committedRef` guards `commit()`.
- **Exception fail-closed:** every timer callback is try/catch-wrapped; on throw → clear all timers → force `idle` → run `commit()` synchronously (once). If `commit()` itself throws: force `idle`, then rethrow (Lane A's Apply catch owns the safety-lens fallback + its Slice-1 failure announcement).
- **Busy call:** `crystallizeTo` while non-idle → complete the in-flight transition synchronously (run its commit now), then start the new one from `idle`. No commit is ever dropped or doubled.
- **Unmount mid-transition:** timers cleared; pending `commit()` runs synchronously once — no half-applied lens.
- **DOM side effects** (owned here, cleaned up on unmount): while non-idle, `<html>` gets `data-lens-transition="<phase>"`, `data-lens-transition-variant="<variant>"`, and inline `--lens-crystallize-charge-ms` / `--lens-crystallize-settle-ms`; all removed at `idle`.
- The controller **never reads `data-motion-mode`** (ScopedLensFrame vocabulary — wrong axis; see §2.4).
- SSR/`window`-absent guard: behaves as `static`.

---

## 2.3 C4 — CRYSTALLIZE OVERLAY (signature + z-index decision)

```tsx
// SL/motion/CrystallizeOverlay.tsx
/** INTERIM numeric z — §3.C --world-z-* are Lane-A proposals, not ratified.
 *  300 = proposed --world-z-overlay value; sits below modal(400)/toast(500) so an open
 *  Appearance Studio panel stays crisp above the sheen. Single-line swap when Lane A ratifies. */
export const CRYSTALLIZE_OVERLAY_Z = 300;

export const crystallizeOverlayCss: string; // exported for the test regex gate (§2.7)
export function CrystallizeOverlay(props: CrystallizeOverlayProps): React.ReactPortal | null; // portal → document.body
```

**Structure:** the portal always mounts a visually-hidden `aria-live="polite"` div (announcements work on the static path too); the sheen div mounts only when `phase !== 'idle' && variant !== 'static'`, with `aria-hidden="true"`, `data-phase`, `data-variant`, and inline `--crystallize-charge-ms` / `--crystallize-settle-ms`.

**CSS (exact, transform/opacity only):**
```
sheen base:  position:fixed; top:0; bottom:0; left:0; z-index:300 (via const);
             pointer-events:none; opacity:0; will-change:opacity,transform;
             background: var(--lens-fx-crystallize-sheen,
               linear-gradient(105deg, transparent 40%, rgba(143,232,255,0.14) 50%, transparent 60%));
             /* fallback mirrors the S1-A spine fallback verbatim — sanctioned duplicate */
[data-variant='sweep'] → width:160%
[data-variant='fade']  → right:0
@keyframes crystallizeChargeSweep { from{opacity:0;transform:translateX(-30%)} to{opacity:1;transform:translateX(0)} }
@keyframes crystallizeSettleSweep { from{opacity:1;transform:translateX(0)}    to{opacity:0;transform:translateX(30%)} }
@keyframes crystallizeChargeFade  { from{opacity:0} to{opacity:1} }
@keyframes crystallizeSettleFade  { from{opacity:1} to{opacity:0} }
[data-phase='charging'][data-variant='sweep'] → animation: crystallizeChargeSweep var(--crystallize-charge-ms,120ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1)) both
[data-phase='settling'][data-variant='sweep'] → animation: crystallizeSettleSweep var(--crystallize-settle-ms,360ms) <same ease> both
[data-phase='charging'][data-variant='fade']  → animation: crystallizeChargeFade  var(--crystallize-charge-ms,100ms) <same ease> both
[data-phase='settling'][data-variant='fade']  → animation: crystallizeSettleFade  var(--crystallize-settle-ms,220ms) <same ease> both
```
Keyframe animations (not mount-transitions) are used deliberately: they start deterministically on mount and on the `charging→settling` attribute flip, with `both` fill guaranteeing visual continuity at the commit seam. Portal-to-body keeps the sheen outside `#root`, so the root-scale rule below never re-contains it.

**Kept design spec (unchanged):**

| Name | Easing | Duration | Animates |
|---|---|---|---|
| `swan-crystallize` | `cubic-bezier(0.16,1,0.3,1)` | **480 desk/wall · 400 lap · 320 hand** total | opacity, transform ONLY |

Timeline (desk/wall): t=0 charging, sheen opacity 0→1 + translateX −30%→0% over 120ms, root scale 1→0.995 · **t=120ms commit** · t=120–480 settling: sheen 0%→+30%, opacity 1→0, root scale→1. Lap 110/290. Hand 100/220, **fade only, no root scale**. Wall: sweep, **no root scale** (0.5% scale at ≥1920px buys nothing and re-contains fixed descendants). Nothing else animates; no width/height/top/left/filter/backdrop-filter is ever transitioned. Perf budget unchanged: ≤480ms wall-clock, transform/opacity only.

---

## 2.4 REDUCED-MOTION RECONCILIATION (SEED §C — three triggers, no `'full'` mode)

There is **no single `full` mode**. The two vocabularies stay un-conflated:

| Trigger | Vocabulary | Source | Controller behavior |
|---|---|---|---|
| Saved user preference | `AppearanceProfile.motionMode: 'auto'\|'reduced'\|'off'` | passed in by Lane A as `options.motionMode` (default `'auto'`) | `!== 'auto'` → **static** |
| OS/media | `prefers-reduced-motion: reduce` | direct `matchMedia` subscription inside the hook (live-updates) | `matches` → **static** |
| Device/user capability | `useAnimationTier(): 'essential'` | capability ceiling M0 (already *includes* PRM — checked anyway as belt-and-braces) | `=== 'essential'` → **static** |

`reduced = (motionMode !== 'auto') || (capability === 'essential') || prm.matches` — **ANY one suffices.** Additionally, `resolveMotionTier` failing safe to M0 (unlicensed surface) forces `static` even when `reduced` is false. PRM **read failure** (matchMedia throws) is treated as `reduce:true` — motion fails closed.

`data-motion-mode` (`ScopedLensFrame` prop, `'full'|'reduced'|'off'`) is a **per-frame attribute, not a profile signal**; the controller does not read it. It is honored only as a frame-scoped CSS kill-switch in `lensViewportStyles.ts` (descendant selectors, frame vocabulary respected inside its own frame):
```
[data-motion-mode='off'] :where(.lens-card,.lens-animatable) { transition:none; animation:none; }
[data-motion-mode='reduced'] :where(.lens-animatable) { animation:none; } /* feedback transitions stay */
```
The original predicate `data-motion-mode !== 'full'` is **deleted** — it was correct only against the frame attribute and wrong against the profile.

---

## 2.5 C5 — VIEWPORT HOOK + QUERY TABLE + DENSITY/MATRIX CSS

```ts
// SL/viewport/useLensViewport.ts — net-new (no existing hook; nothing duplicated)
export type LensViewport = 'hand' | 'lap' | 'desk' | 'wall';
export const LENS_VIEWPORT_QUERIES: Readonly<Record<LensViewport, string>> = {
  hand: '(max-width: 767px)',
  lap:  '(min-width: 768px) and (max-width: 1023px)',
  desk: '(min-width: 1024px) and (max-width: 1919px)',
  wall: '(min-width: 1920px)',
};
export const LENS_VIEWPORT_FALLBACK: LensViewport = 'lap'; // matchMedia absent OR throws → 'lap', silent
export function layoutProfileForViewport(vp: LensViewport): 'stack'|'rail'|'console'|'panorama';
//   hand→stack · lap→rail · desk→console · wall→panorama  (pure helper for Lane A — see §2.9 step 5)
export function useLensViewport(): LensViewport;
// writes data-viewport on <html>; evaluates hand→lap→desk→wall, first match wins;
// resize debounced 150ms; immediate evaluation on mount; SSR/no-window → 'lap'.
```

`useLensViewport` writes **`data-viewport` only.** It does **not** write `data-layout-profile` (Lane A's Apply-owned attribute) — the mapping ships as the pure helper above. All matrix CSS keys off `[data-viewport]` (hook = single source of truth; media queries live only in the query table).

**`SL/styles/lensViewportStyles.ts`** — exports `lensViewportCss: string` (plain string: test-regex-able; mounted by S1-C's injector or the current global-styles mount — §2.9 step 3). Contents, exact:

```
DENSITY (attribute-driven; data-density remains Lane-A-written):
  :root { --lens-density-scale: 1; }
  :root[data-density='compact']  { --lens-density-scale: 0.875; }
  :root[data-density='cozy']     { --lens-density-scale: 1; }
  :root[data-density='spacious'] { --lens-density-scale: 1.125; }
  :root[data-viewport='wall']:not([data-density]) { --lens-density-scale: 1.125; } /* wall default */

TARGET FLOOR (no --world-target-size — 44px already enforced by validateRecipeV2.minimumTouchTargetPx):
  .lens-target { min-block-size:  max(var(--lens-geo-target-min,44px),
                                      calc(var(--lens-geo-target-min,44px) * var(--lens-density-scale,1)));
                 min-inline-size: <same>; }
  /* opt-in class; Slice 3 applies it to surfaces. compact can never scale below the validated 44px. */

VIEWPORT MATRIX (values verbatim from the matrix table below):
  :root[data-viewport='hand'] { --lens-geo-blur-sm:0;   --lens-geo-blur-md:4px;  --lens-geo-blur-lg:8px;
                                --lens-fx-surface-alpha:0.92; --lens-fx-noise-opacity:0;
                                --lens-fx-glow-strength:0.75; --lens-geo-edge-pad:16px; }
  :root[data-viewport='lap']  { 4px/8px/16px;  alpha 0.8;  noise 0.02; glow 0.9;  pad 24px }
  :root[data-viewport='desk'] { 4px/12px/24px; alpha 0.72; noise 0.04; glow 1;    pad 32px }
  :root[data-viewport='wall'] { 6px/16px/32px; alpha 0.72; noise 0.04; glow 1.15; pad 48px }
  [data-viewport='wall'] .lens-content { max-width:1600px; margin-inline:auto; }
  /* --lens-geo-edge-pad: additive geo-tier token (Do-NOT #3 compliant), consumed by shells in Slice 3 */

DESKTOP HOVER (feedback tier; guarded by BOTH existing global switches):
  @media (hover:hover) and (pointer:fine) and (prefers-reduced-motion: no-preference) {
    :root:not([data-motion='off']) .lens-card:hover {
      transform: translateY(var(--lens-fx-hover-lift,-1px));
      box-shadow: var(--lens-fx-glow-primary);
    }
    :root:not([data-motion='off']) .lens-card {
      transition: transform 180ms var(--lens-ease-standard, cubic-bezier(0.2,0,0,1)),
                  box-shadow 180ms var(--lens-ease-standard, cubic-bezier(0.2,0,0,1));
    }
  }

ROOT SCALE (sweep variant, desk/lap only; #root exists continuously so attribute-driven transitions run):
  @media (prefers-reduced-motion: no-preference) {
    :root:not([data-motion='off'])[data-lens-transition-variant='sweep'][data-lens-transition='charging']
      :where([data-viewport='desk'],[data-viewport='lap']) #root
      { transform: scale(0.995); transition: transform var(--lens-crystallize-charge-ms,120ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1)); }
    …settling → scale(1) with var(--lens-crystallize-settle-ms,360ms)…
  }
  /* NOTE: transform on #root re-contains fixed descendants for ≤480ms at 0.5% scale — visually nil;
     the sheen is unaffected (portaled to body). Verify host mount id = #root at wire time. */

A11Y MEDIA BLOCKS (real media queries — no hook for these):
  @media (prefers-reduced-transparency: reduce) {
    :root { --lens-fx-surface-alpha:1; --lens-fx-noise-opacity:0;
            --lens-geo-blur-sm:0; --lens-geo-blur-md:0; --lens-geo-blur-lg:0; } }
  @media (forced-colors: active) {
    :root { --lens-fx-glow-primary:none; --lens-fx-glow-secondary:none; --lens-fx-atmosphere:none;
            --lens-fx-noise-opacity:0; --lens-geo-blur-sm:0; --lens-geo-blur-md:0; --lens-geo-blur-lg:0;
            --lens-fx-surface-alpha:1; }
    :where(.lens-card,.lens-surface) { border:1px solid CanvasText; box-shadow:none; background-image:none; }
    :where(a,button,[role='button'],input,select,textarea,[tabindex]):focus-visible
      { outline:2px solid Highlight; outline-offset:2px; } }
```

**Responsive matrix (kept, unchanged — now delivered via `[data-viewport]` blocks):**

| VP px | `data-viewport` | layout-profile (Lane A derives) | default density | target | blur sm/md/lg | Crystallize | noise | glow | surface-alpha | edge pad |
|---|---|---|---|---|---|---|---|---|---|---|
| 320/375/414 | hand | stack | cozy | 44px | 0/4/8px | 320ms fade | 0 | 0.75 | 0.92 | 16px |
| 768 | lap | rail | cozy | 44px | 4/8/16px | 400ms sweep | 0.02 | 0.9 | 0.8 | 24px |
| 1024/1440 | desk | console | cozy | 44px | 4/12/24px | 480ms sweep | 0.04 | 1 | 0.72 | 32px |
| 2560/3840 | wall | panorama | spacious | 44px | 6/16/32px | 480ms sweep | 0.04 | 1.15 | 0.72 | 48px |

`compact` selectable at every width; `.lens-target` clamps at 44px regardless; wall content max-width 1600px centered.

---

## 2.6 ACCEPTANCE TESTS (executable)

**`motion/__tests__/crystallize.test.tsx`** (tier module mocked to control `resolveMotionTier`/`tierAllows`; `useAnimationTier` mocked per case):
1. **Desk sweep timeline** (viewport hand-mocked to desk, tier M2, not reduced, fake timers): phase log === `['charging@0','commit@120','settling@120','idle@480']` exactly; commit called once; `data-lens-transition(-variant)` set then removed; `--lens-crystallize-charge-ms`/`settle-ms` present then removed.
2. **CSS property gate:** regex `crystallizeOverlayCss` + `lensViewportCss` — every `animation`/`transition`/keyframe touches only `opacity|transform`; banned substrings absent (`width`,`height`,`top`,`left`,`margin`,`padding`,`filter`,`backdrop-filter` inside animation contexts); assert `String(CRYSTALLIZE_OVERLAY_Z) === '300'`; assert **no** `--world-z-`, `--world-target-size`, `!important`, `#0a0a1a`, `#00ffff`, `#7851a9` anywhere in either module.
3. **Reduced matrix (parametrized ×4):** (a) `motionMode:'reduced'`, (b) `motionMode:'off'`, (c) capability `'essential'`, (d) PRM query matches — each with tier mocked M3: `commit` called synchronously, sheen never in DOM, 0 timers elapsed, announcement set, live region text present.
4. **Variant resolution:** hand + M3 → `data-variant='fade'`; desk + M1 → fade; wall + M2 → sweep; unmocked `resolveMotionTier` with default `CRYSTALLIZE_SURFACE_ID` (unlicensed today) → **static** (tripwire: update when Lane A registers the licence).
5. **Busy call:** second `crystallizeTo` at t=50ms → first commit ran synchronously, second animates; each commit called exactly once.
6. **Commit-throw:** commit throws → phase forced `idle`, sheen unmounted, error propagates, commit count = 1.
7. **PRM matchMedia throws** → treated as reduced (static path), no console error.

**`viewport/__tests__/lensViewport.test.tsx`** (matchMedia mocked per width):
8. Width 375 → `data-viewport="hand"`; 768 → `lap`; 1024 → `desk`; 2560 → `wall`. `layoutProfileForViewport` pure mapping: hand→stack, lap→rail, desk→console, wall→panorama.
9. **Debounce:** two resizes 100ms apart → single attribute write after 150ms.
10. **Fail-closed:** matchMedia stubbed to throw → `data-viewport="lap"`, render succeeds, zero console errors.
11. **CSS matrix assertions (string):** `[data-viewport='hand']` block contains `--lens-geo-blur-md: 4px` and `--lens-fx-surface-alpha: 0.92`; desk `12px`/`0.72`; wall block + `:root[data-viewport='wall']:not([data-density])` spacious-default selector present; `max(var(--lens-geo-target-min,44px)` clamp present.

**E2E (Playwright, requires Lane A wiring landed):** full Apply at 1440 completes ≤480ms; CLS = 0 during switch; axe on the settings surface post-switch: 0 serious/critical.

---

## 2.7 FAIL-CLOSED CHECKS

1. **matchMedia throws** (viewport) → `data-viewport="lap"`, app renders, no console error.
2. **Timer exception** (devtools: monkey-patch `setTimeout` to throw inside the settle callback) → all timers cleared, `idle` forced, commit executed **exactly once**, synchronously.
3. **Unlicensed surface** (today's default) → `resolveMotionTier` fails safe M0 → static path: commit synchronous, sheen never mounts. The Crystallize **structurally cannot** animate above its licence — two-speed law enforced by the substrate, not by discipline.
4. **PRM read failure** → treated as `reduce` → static. Motion fails closed, never open.
5. **z-token absent** (it is — §3.C unratified) → overlay uses documented constant `CRYSTALLIZE_OVERLAY_Z = 300`; deletion/change of the future token is a one-line swap, no behavior cliff.

---

## 2.8 LANE-A INTEGRATION NOTE (requires Lane A agreement; zero Lane-A edits in this slice)

Shipped READY-to-wire, same handoff pattern as S1-B's `safeResolveLensId`:

1. **Licence (Lane A owns `surfaceMotionTiers.ts`):** register `'settings.appearance': 'M2'`. Until then the Crystallize fails safe to M0/static — safe to ship before registration; the moment activates the day the licence lands.
2. **Apply handler (`AppearanceStudioPanel`/`StyleLensProvider` — Lane A edits, not me):**
   ```tsx
   const { crystallizeTo, overlayProps } = useCrystallizeTransition({ motionMode: profile.motionMode });
   const applyLens = (next) =>
     crystallizeTo(() => commitAppearance(next),   // the EXISTING commit, unchanged
                 { settleAnnouncement: `Appearance applied: ${next.displayName}.` }); // Slice-1 copy
   // render once near root: <CrystallizeOverlay {...overlayProps} />
   ```
   The existing try/catch → safety-lens fallback + *"That style couldn't be applied safely…"* path stays exactly as built in Slice 1 (a throwing commit propagates after the controller forces `idle`).
3. **CSS mount:** include `lensViewportCss` in S1-C's active-style injector (or the current global-styles mount) — one spread; or append into `lensCoreStyles.ts` during S1-C finalization, their call.
4. **Viewport mount:** call `useLensViewport()` once at app root (e.g., inside `StyleLensProvider`).
5. **Optional layout derivation:** when the user's profile layout is `'auto'`, Lane A may derive `data-layout-profile` via `layoutProfileForViewport(viewport)`; the attribute stays theirs.
6. **z-token:** on §3.C ratification, swap `CRYSTALLIZE_OVERLAY_Z` for `var(--world-z-overlay)`.
7. **Frame-vocab escape hatch:** if the Studio ever renders inside a `ScopedLensFrame motionMode='off'|'reduced'`, Lane A may map frame→profile vocab (`'full'→'auto'`, else pass-through) into `options.motionMode`. Usually unnecessary — profile + capability already cover user intent.

---

## 2.9 DELTA vs ORIGINAL SLICE 2

| Original | Corrected | Why (SEED) |
|---|---|---|
| CREATE `motion/lensMotionTokens.ts` | **Deleted.** Constants co-located in controller; tier gating consumed from `surfaceMotionTiers` + `useAnimationTier` | §A.1 — parallel token file duplicates a mature system |
| Reduced = `data-motion-mode !== 'full'` | Three-trigger OR: profile `motionMode!=='auto'` ‖ capability `'essential'` ‖ PRM query; plus tier-M0 fail-safe. `data-motion-mode` honored only as frame-scoped CSS kill-switch | §A.2/§C — no single `'full'` mode; two vocabularies un-conflated |
| MODIFY Appearance Studio apply handler | Zero Lane-A edits; hook + overlay + `overlayProps` shipped READY-to-wire + §2.8 note | §A.4 — Apply handler is Lane A's |
| `--world-target-size`, `--world-space-unit` | **Removed.** 44px floor cited from `validateRecipeV2.minimumTouchTargetPx` + `max()` clamp on `--lens-geo-target-min`; spacing via `--lens-density-scale` only | §D.2 — do not invent world tokens |
| Overlay `z-index: var(--world-z-overlay)` | Named constant `CRYSTALLIZE_OVERLAY_Z = 300`, documented, below modal/toast; one-line future swap | §D.1 — z-tokens are Lane-A proposals |
| Media blocks MODIFY `lensCoreStyles.ts` | New `styles/lensViewportStyles.ts` (string export), S1-C mounts it | S1-C finalizing separately — no collision |
| Hook writes `data-layout-profile` | Hook writes `data-viewport` only; `layoutProfileForViewport()` pure helper for Lane A | `data-layout-profile` is Apply-owned |
| Binary reduced/full choreography | Variant model `static/fade/sweep` = f(tier × viewport); M1→fade degradation; wall sweep w/o root scale clarified | §B — budget expressed through capability×licence, effective=min |
| Overlay transition-based mount | Keyframe-based (deterministic mount + phase-flip restart, `both` fill); portal-to-body; always-mounted polite live region; Lane A passes Slice-1 announcement copy | correctness under React mount semantics + fixed-containing-block safety |
| Tests assumed single motionMode | Tier module mocked; added unlicensed-M0 tripwire, 4-way reduced matrix, busy-call, commit-throw, CSS guard-grep (no `--world-z-*`/`--world-target-size`/`!important`/banned literals) | §D acceptance rigor |

**Unchanged (design is law):** easings, durations (480/400/320; commit 120/110/100), charging→commit→settling choreography, sweep-desk/fade-hand split, the full responsive matrix, transform/opacity-only, ≤300 lines/file, no `import()`/fetch, no `!important`, no new namespaces, no PII. Where this slice and instinct disagree, this slice wins; where it is silent, stop and ask.
