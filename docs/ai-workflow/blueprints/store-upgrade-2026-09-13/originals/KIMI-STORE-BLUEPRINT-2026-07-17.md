# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** .ai-workflow/fusion/kimi-store.md
**Seed:** (none)
**Tokens:** 1232 in / 28837 out · **Cost:** ~$0.4363 · **Wall:** 829.0s

---

# SWANSTUDIOS STORE V4 — "THE CRYSTAL CASE"
### Build-Exact Blueprint · Kimi K3, Design Architect · DESIGN-ONLY (binds to existing money path, never redesigns it)

**Verdict on V3:** it sells, but it sells *flat* — a 1027-line monolith with Galaxy DNA in its route DNA, no merchandising hierarchy, no proof, no reversibility. We do not edit it. We build **StoreV4** beside it, gated by a flag, fail-closed back to V3 on any fault.

**Design concept:** the storefront as a jeweler's case — midnight-sapphire vault, chrome-edged crystal cards, ice/wing refractions, gold spent exactly twice (flagship tag + Crystallize ring). The 12-month block receives **The Crystallize**, the signature achievement moment, on first reveal. Mobile gets the same story with the optics simplified for battery and thumb.

**Version + flag strategy (summary, full spec in §6):** `StoreGate.tsx` mounts at the existing route (one-line router diff). Flag `VITE_FF_STORE_V4` (default `0`), QA override `localStorage.ff_storeV4`. Any V4 error → ErrorBoundary → V3. Revert = flip flag. Zero data loss.

---

## 1. HOSTILE REVIEW — Top 5 Weaknesses (with evidence)

**H1 — Monolithic, money-adjacent file. 3.4× the line cap.**
Evidence: `frontend/src/pages/shop/StoreV3.tsx` = **1027 lines** (repo audit, main `96ac6bd3d`). Data fetching, card rendering, cart calls, copy, and motion are co-located, so every marketing tweak re-risks the Stripe-adjacent path. Violates the 300-line cap outright.

**H2 — Galaxy-Swan DNA residue; palette audit is mandatory, not optional.**
Evidence: route comment historically tags the page "Galaxy themed" (per repo audit). The file predates the Crystalline token law. Policy: banned palette `#0a0a1a / #00FFFF / #7851A9` **including as `var()` fallbacks**. Treat every raw hex in V3 as hostile. Verification command (must run in Slice 1 against all new files):
```bash
grep -REi '0a0a1a|#00ffff|7851a9' frontend/src/pages/shop/StoreV4.tsx frontend/src/pages/shop/store-v4/ && echo "FAIL: GALAXY DNA" || echo "CLEAN"
```

**H3 — Flat merchandising; conversion leaks at three points.**
Evidence: the verified feature set (packages grid + "Ask About Pricing") shows: (a) no flagship hierarchy — a $175 single and a 12-month block are presented as equals; (b) no per-session anchoring, the single most effective PT pricing lever; (c) the signed-out "Ask About Pricing" is a dead end with no consult-funnel story around it; (d) zero social proof on a page whose entire job is trust.

**H4 — No central motion/a11y gate.**
Evidence: 1027 lines with no extracted motion module means reduced-motion handling, if present, is hand-scattered and unverifiable; 44px targets unenforced; ice-on-sapphire contrast unverified. On a cinematic-tier page this is a WCAG AA lawsuit-shaped risk.

**H5 — Zero reversibility.**
Evidence: V3 is mounted directly at the route and edited in place. No flag, no boundary, no side-by-side version. A bad marketing deploy takes the storefront down with it, and "revert" means a git revert + redeploy of the *money page*.

---

## 2. ENHANCED ARCHITECTURE — Files, Line Budgets, Signatures

All new code lives in two trees. **No existing file is modified except: one router line, one feature-flags file (additive key), one backend routes index (additive mount, Slice 3).**

```
frontend/src/pages/shop/
├── StoreV3.tsx                          # UNTOUCHED (1027 lines — violation noted, grandfathered)
├── StoreGate.tsx                        # 48  — flag + boundary, the ONLY router-mounted piece
├── StoreV4.tsx                          # 172 — orchestrator: sections, state, addingId
└── store-v4/
    ├── storeV4.types.ts                 # 64
    ├── storeV4.tokens.ts                # 118 — every token + fallback (the ONLY file with hex)
    ├── storeV4.copy.ts                  # 148 — ALL copy (§3). Builder writes zero strings.
    ├── storeV4.motion.ts                # 76  — easings, durations, keyframes (§4)
    ├── storeV4.utils.ts                 # 92  — toStorePackage, formatMoney, sortAndFlag
    ├── storeV4.styles.ts                # 196 — Root, Section, Container, Eyebrow, H2, hairlines
    ├── hooks/
    │   ├── useStorePackages.ts          # 112 — wraps the EXISTING store API V3 uses
    │   ├── useCartBinding.ts            # 64  — anti-corruption layer over EXISTING cart context
    │   ├── useReveal.ts                 # 58  — IntersectionObserver scroll-story
    │   └── useTestimonials.ts           # 72  — NEW endpoint (Slice 3)
    └── components/
        ├── StoreV4ErrorBoundary.tsx     # 62  — fail-closed → V3
        ├── CrystallineCanvas.tsx        # 232 — hero optics (≥768px only)
        ├── StoreV4Hero.tsx              # 188
        ├── StoreV4TrustBar.tsx          # 108
        ├── StoreV4PackageGrid.tsx       # 88
        ├── SwanPackageCard.tsx          # 258 — the Swan card standard
        ├── StoreV4HowItWorks.tsx        # 126
        ├── StoreV4SocialProof.tsx       # 152
        ├── StoreV4WhySwan.tsx           # 148
        ├── StoreV4FinalCTA.tsx          # 108
        ├── StoreV4CartPill.tsx          # 156 — binds to existing cart, read+navigate only
        └── StoreV4Skeleton.tsx          # 68

backend/  (SLICE 3 ONLY — ADDITIVE)
├── migrations/YYYYMMDDHHMMSS-create-store-testimonials.cjs   # 62
├── models/StoreTestimonial.mjs                               # 54
├── controllers/storeTestimonialController.mjs                # 42
└── routes/storeTestimonialRoutes.mjs                         # 22 (+1 mount line in existing index)

scripts/
├── check-degalaxy.sh                  # 12 — banned-hex grep (all slices)
├── check-token-discipline.mjs         # 34 — hex/rgba legal ONLY inside var() fallbacks
├── check-line-cap.sh                  # 10 — fails if any new file >300 lines
└── check-motion-props.mjs             # 40 — keyframes may contain transform/opacity ONLY

e2e/
├── store-v4.slice1.spec.ts            # flag + parity + a11y
├── store-v4.slice2.spec.ts            # motion + reduced-motion
└── store-v4.slice3.spec.ts            # contract + revert drill + cart e2e
```

### Core signatures (verbatim)

```ts
// storeV4.types.ts
export interface StorePackage {
  id: string;
  name: string;
  priceCents: number;            // REAL — from store API, never hardcoded
  currency: 'USD';
  sessionsIncluded: number | null;   // null if API doesn't expose it → anchor line hidden
  durationMonths: 1 | 3 | 6 | 12 | null;
  perSessionCents: number | null;    // derived: Math.round(priceCents / sessionsIncluded)
  isFlagship: boolean;               // derived: highest priceCents in the set (deterministic)
}
export type PricingVisibility = 'visible' | 'ask';   // EXACT predicate V3 uses today
export interface StoreTestimonial {
  id: string; quote: string; authorRole: string;     // role label only — zero PII
  rating: 1 | 2 | 3 | 4 | 5; programLabel: string | null;
}
export type LoadStatus = 'loading' | 'ready' | 'error';
```

```ts
// hooks/useStorePackages.ts — the fetch is EXTRACTED VERBATIM from StoreV3's data path.
// Same endpoint, same client, same auth predicate. No new endpoint for packages. Ever.
export function useStorePackages(): {
  packages: StorePackage[];
  status: LoadStatus;                 // 'error' → throw to boundary → V3 (fail-closed)
  pricingVisibility: PricingVisibility;
};

// hooks/useCartBinding.ts — wraps the EXACT cart context/hook StoreV3 imports.
// If existing addItem's signature differs, adapt INSIDE this hook only. Context file is never edited.
export function useCartBinding(): {
  itemCount: number;
  addItem: (itemId: string) => Promise<void>;
  isAdding: boolean;
  goToCart: () => void;               // navigates to the EXACT cart route string V3 uses
};

// components/SwanPackageCard.tsx
export interface SwanPackageCardProps {
  pkg: StorePackage;
  pricingVisibility: PricingVisibility;
  index: number;                      // entrance stagger index (×90ms)
  onAddToCart: (id: string) => void;
  isAdding: boolean;
}
```

```tsx
// StoreGate.tsx — COMPLETE FILE (this is the whole reversibility story)
import StoreV3 from './StoreV3';
import StoreV4 from './StoreV4';
import StoreV4ErrorBoundary from './store-v4/components/StoreV4ErrorBoundary';
import { resolveFlag } from '../../config/featureFlags';

export default function StoreGate(): JSX.Element {
  if (!resolveFlag('storeV4')) return <StoreV3 />;
  return (
    <StoreV4ErrorBoundary fallback={<StoreV3 />}>
      <StoreV4 />
    </StoreV4ErrorBoundary>
  );
}
```

```ts
// config/featureFlags.ts — additive key; if the file exists, add only this key.
const ENV: Record<FeatureFlag, string | undefined> = {
  storeV4: import.meta.env.VITE_FF_STORE_V4,
};
export function resolveFlag(flag: FeatureFlag): boolean {
  try {                                   // QA override — instant revert drill lever
    const qa = window.localStorage.getItem(`ff_${flag}`);
    if (qa === '1') return true;
    if (qa === '0') return false;
  } catch { /* private mode → fall through */ }
  return ENV[flag] === '1';               // DEFAULT FALSE — fail-closed
}
```

**Router diff (the only existing-frontend-line touched):**
```diff
- <Route path="/store" element={<StoreV3 />} />
+ <Route path="/store" element={<StoreGate />} />
```
(If the route is lazy today, keep the lazy wrapper — point it at StoreGate.)

**Page section order (both viewports, zero decisions):**
1. `StoreV4Hero` → 2. `StoreV4TrustBar` → 3. `StoreV4PackageGrid` (`id="packages"`, `scroll-margin-top: 96px` desktop / `80px` mobile) → 4. `StoreV4HowItWorks` → 5. `StoreV4SocialProof` (renders `null` when empty) → 6. `StoreV4WhySwan` → 7. `StoreV4FinalCTA`. `StoreV4CartPill` fixed above all, `z-index: 60`.

---

## 3. EXACT TOKENS / PX / MS / COPY

### 3a. Tokens — the ONLY hex in the project lives here, as `var()` fallbacks. Fallbacks are Crystalline values; banned hexes never appear (CI-enforced).

```ts
// storeV4.tokens.ts — consumed by storeV4.styles.ts (StoreV4Root) and the canvas.
// Chain: --store-* → --world-*/--lens-* (Appearance Studio re-skins) → Crystalline fallback.
export const STORE_TOKENS = `
  --store-bg:        var(--world-bg-deep,        #060A18);
  --store-surface-1: var(--world-surface-1,      #0B1329);
  --store-surface-2: var(--world-surface-2,      #101A38);
  --store-card-1:    var(--world-card-hi,        #111B3D);
  --store-card-3:    var(--world-card-lo,        #080E20);
  --store-ice:       var(--lens-ice,             #7FD8FF);
  --store-ice-18:    var(--lens-ice-18,          rgba(127, 216, 255, 0.18));
  --store-ice-soft:  var(--lens-ice-soft,        rgba(127, 216, 255, 0.14));
  --store-wing:      var(--lens-wing,            #8E6FE8);
  --store-wing-22:   var(--lens-wing-22,         rgba(142, 111, 232, 0.22));
  --store-gold:      var(--lens-gold,            #E3C878);
  --store-gold-28:   var(--lens-gold-28,         rgba(227, 200, 120, 0.28));
  --store-chrome:    var(--lens-chrome-edge,     rgba(223, 236, 255, 0.55));
  --store-chrome-10: var(--lens-chrome-10,       rgba(223, 236, 255, 0.10));
  --store-text:      var(--world-text-primary,   #F0F5FF);
  --store-text-2:    var(--world-text-secondary, #B9C6E4);
  --store-text-3:    var(--world-text-muted,     #9AA9CE);
  --store-alert:     var(--lens-alert,           #FF8FA3);
  --store-ink-on-gold: var(--lens-ink-on-gold,   #20170A);
  --store-shadow-1:  var(--world-shadow-1,       rgba(3, 7, 18, 0.55));
  --store-shadow-2:  var(--world-shadow-2,       rgba(3, 7, 18, 0.65));
  --store-font-display: var(--world-font-display, 'Cormorant Garamond', Georgia, serif);
  --store-font-ui:      var(--world-font-ui,      'Inter', system-ui, sans-serif);
`;
```
Contrast floor (verify with axe in Slice 1 — do not eyeball): `--store-text` / `--store-text-2` / `--store-text-3` on `--store-card-2` must each pass **4.5:1**; gold `--store-gold` on card ≥ **4.5:1** (gold is restricted to ≥13px text and graphic accents anyway); gold tag uses ink `--store-ink-on-gold` on gold fill ≥ **7:1**.

### 3b. The Swan Card (exact geometry)

```ts
const CardShell = styled.article`
  position: relative;
  display: flex; flex-direction: column;
  min-height: 420px;                    /* ≥1024px only; auto below */
  padding: 28px;                        /* 20px below 768px */
  border-radius: 20px;                  /* 18px below 768px */
  border: 1px solid transparent;
  background:
    linear-gradient(165deg, var(--store-card-1) 0%, var(--store-surface-1) 46%, var(--store-card-3) 100%) padding-box,
    linear-gradient(135deg, var(--store-chrome) 0%, var(--store-ice-18) 30%, var(--store-wing-22) 62%, var(--store-chrome-10) 100%) border-box;
  box-shadow: 0 10px 30px var(--store-shadow-1);
  /* flagship ONLY: swap stop 4 of the border-box gradient to var(--store-gold-28)
     and add box-shadow 0 0 40px var(--store-gold-28) — gold appears nowhere else on cards */
`;
```
Card internals (exact): duration eyebrow `11px/700`, uppercase, `letter-spacing: 0.14em`, color `--store-wing`; name `22px/28px` display font, `--store-text`; price `clamp(30px, 1.6vw + 25px, 40px)` display font `--store-text` + suffix `/block` `13px` `--store-text-3`; per-session anchor `13px/600` `--store-gold`; hairline divider `1px`, gradient `--store-chrome-10 → transparent`, `margin: 18px 0`; feature bullets `14px/22px` `--store-text-2`, marker = `8px` diamond (rotated square, `--store-ice`), gap `10px`; CTA pinned via `margin-top: auto; padding-top: 22px`. **CTA = the existing `GlowButton` (same import V3 uses), wrapped locally:** `width: 100%; min-height: 48px; font: 600 15px/1 var(--store-font-ui); letter-spacing: 0.02em;` — never edit GlowButton itself. Flagship tag: absolute `top: -12px; right: 24px;` height `24px`, `padding: 0 12px`, radius `12px`, gold fill, ink text `11px/800` uppercase, `letter-spacing: 0.12em`.

Hover (pointer:fine only): `transform: translateY(-6px)`, `260ms`, `--ease-lux`; glow layer (radial `--store-ice-soft` at 50% -10%) `opacity 0 → 0.55`; shadow `0 18px 48px var(--store-shadow-2)`. Press: `scale(0.98)` `120ms`. Focus-visible (all interactive): `outline: 2px solid var(--store-ice); outline-offset: 3px;`

### 3c. Typography scale (clamps — matrix values in §5 are these clamps resolved)

| Element | Spec |
|---|---|
| H1 | `clamp(34px, 3vw + 24px, 72px) / 1.12`, display font, `--store-text`; `<em>` = ice→wing gradient text (paint-only, static) |
| Section H2 | `clamp(28px, 2.2vw + 18px, 44px) / 1.15` display |
| Section eyebrow | `12px/700`, uppercase, `ls 0.16em`, `--store-ice` |
| Body | `15px/26px` `--store-text-2` |
| Micro | `12px/18px` `--store-text-3` |
| Price | §3b |

Spacing: section pad-y `clamp(64px, 5vw + 32px, 112px)`; container `max-width 1200px` (`1320px` ≥2560, `1440px` ≥3840), side pad per §5; hero min-height per §5, `padding-top: 128px` desktop / `96px` mobile (clears existing header — header untouched).

### 3d. COPY DECK — final. Builder writes zero strings. Banned phrase "NASM-certified" never appears; approved claims are exactly "26+ years of coaching" and "the NASM OPT™ protocol."

| Slot | Copy |
|---|---|
| Hero eyebrow | `SWANSTUDIOS · ONE-ON-ONE PERSONAL TRAINING` |
| Hero H1 | `Sculpt the <em>Strongest</em> Version of You.` |
| Hero sub | `Private coaching refined over 26+ years and built on the NASM OPT™ protocol. Choose your training block — we engineer the rest.` |
| Hero CTA 1 | `Explore Training Blocks` (scrolls to `#packages`; `behavior: 'smooth'`, `'auto'` under reduced-motion) |
| Hero CTA 2 | `Book a Consultation` → **V3's existing consult handler, verbatim** |
| Hero micro-trust | `26+ years of coaching · Private studio · NASM OPT™ protocol` |
| Trust bar (4) | `26+ Years of Coaching` / `NASM OPT™ Protocol` / `Private 1-on-1 Studio` / `Flexible Scheduling` |
| Grid eyebrow / H2 | `THE CRYSTAL CASE` / `Choose Your Training Block` |
| Grid sub | `Every block is private, programmed, and scheduled around your life. Longer blocks cut the per-session rate.` |
| Per-session anchor | `Works out to {formatted} per session` (rendered ONLY when `perSessionCents ≠ null`) |
| Flagship tag | `BEST VALUE` |
| Card CTA | `Add to Cart` · aria-label `Add {name} to cart` |
| Card CTA (error, 2400ms) | `Couldn't add — try again` (text `--store-alert`, then auto-reset) |
| Signed-out price slot | `Ask About Pricing` (`24px` display) + micro `Sign in to see member pricing, or ask us directly.` + CTA `Ask About Pricing` → **V3's existing ask handler, verbatim** |
| HowItWorks eyebrow / H2 | `THE METHOD` / `How Blocks Work` |
| Step 1 | `Choose Your Block` — `A single session, a 30-minute pack, or a 3, 6, or 12-month block. Longer blocks cut the per-session rate.` |
| Step 2 | `Train on Your Schedule` — `Book sessions in-app at times that suit you. Every session is programmed for you before you walk in.` |
| Step 3 | `Watch It Compound` — `Progress is tracked across your block. Renew, extend, or adjust — your training evolves with you.` |
| Social proof eyebrow / H2 | `THE PROOF` / `Results, in Their Words` |
| Aggregate (only if ≥3) | `{avg} average across {n} client stories` (avg = Σrating/n, 1 decimal — computed from real rows) |
| WhySwan eyebrow / H2 | `THE CRAFT` / `Why SwanStudios` |
| Pillar 1 | `26+ Years of Coaching` — `Every session is informed by more than two decades of hands-on coaching — strength, mobility, and transformation at every level.` |
| Pillar 2 | `The NASM OPT™ Protocol` — `Programming follows the NASM Optimum Performance Training model: systematic, progressive, and built around how your body actually adapts.` |
| Pillar 3 | `A Truly Private Studio` — `No crowds, no waiting, no audience. One coach, one client, one plan — yours.` |
| Final H2 | `The Strongest Year of Your Life Starts With One Session.` |
| Final CTA 1 / 2 | `Choose Your Block` (→ `#packages`) / `Ask a Question` (→ V3 ask handler) |
| Footer micro | `Secure checkout powered by Stripe · Sessions scheduled in-app` |
| Empty grid (signed-in, 0 items) | `The case is being restocked.` / `New training blocks are being prepared. Ask us and we'll set yours up.` + CTA `Ask a Question` |
| Loading | `StoreV4Skeleton` ×3, root `aria-busy="true"`, sr-only `Loading training packages…` |
| Cart pill | `{count} {item|items} · View Cart` · `aria-live="polite"`, appears only when `count > 0` |

Feature bullets per package (presentation copy, keyed by real `durationMonths`/type; first bullet is REAL data when available): sessions-known → `{n} private sessions`; single → `One full 60-minute private session` / `Movement + goals assessment` / `The perfect first step`; 30-min pack → `Focused 30-minute sessions` / `Efficient, high-intensity format` / `Built for tight schedules`; 3-month → `Three months of guided training` / `Full program design` / `Progress reviews every four weeks`; 6-month → `Everything in the 3-month block` / `Advanced periodization` / `Priority scheduling`; 12-month → `Everything in the 6-month block` / `The lowest per-session rate` / `The full transformation arc`.

---

## 4. MOTION SPEC — transform/opacity only, everywhere

```ts
// storeV4.motion.ts
export const EASE = {
  lux:   'cubic-bezier(0.22, 1, 0.36, 1)',   // entrances, hovers
  glide: 'cubic-bezier(0.33, 1, 0.68, 1)',   // sweeps
  snap:  'cubic-bezier(0.16, 1, 0.30, 1)',   // count bump
} as const;
export const MS = { micro: 160, hover: 260, reveal: 640, stagger: 90, hero: 640, sweep: 560 } as const;
```

| # | Name | Target | From → To | Duration | Easing | Delay |
|---|---|---|---|---|---|---|
| 1 | `facetIn` | reveal blocks | `opacity 0, translateY(28px)` → `1, 0` | 640ms | lux | IO threshold `0.2`, `rootMargin 0px 0px -8% 0px`, once; stagger `index × 90ms` |
| 2 | Hero entrance | eyebrow/H1/sub/CTAs/trust | `opacity 0, translateY(26px)` → `1, 0` | 640ms | lux | 120/220/320/420/520ms |
| 3 | Card hover | §3b | — | 260ms | lux | — |
| 4 | **The Crystallize** (flagship first reveal, IO once) | chrome ring `::before` | `opacity 0, scale(0.94)` → `1, 1` | 340ms | lux | t+0 |
| | | refraction sweep `::after` (gradient bar, `rotate(18deg)`) | `translateX(-140%) → 140%` | 560ms | glide | t+140 |
| | | glow bloom layer | `opacity 0 → 0.65 → 0.30` | 620ms | lux | t+420 |
| | | gold tag | `opacity 0, translateY(-4px)` → `1, 0` | 280ms | lux | t+700 |
| 5 | Cart pill bump (add success) | pill | `scale 1 → 1.22 → 1` | 420ms | snap | on `itemCount` change |
| | | gold ring | `opacity 0 → 1 → 0`, `scale 0.9 → 1.15` | 340ms | lux | same tick |
| 6 | Scroll cue | chevron | `translateY 0 → 8px`, `opacity 0.9 → 0.3` | 1800ms | lux | infinite alternate |
| 7 | Skeleton shimmer | gradient bar | `translateX(-100%) → 100%` | 1400ms | glide | infinite |
| 8 | Mobile hero breathe (<768, no canvas) | glow layer | `opacity 0.45 → 0.6` | 9000ms | lux | infinite alternate |

**Reveal safety (fail-closed):** hidden-start styles apply ONLY under `@media (prefers-reduced-motion: no-preference)`; `useReveal` force-reveals after a 1200ms safety timeout and immediately if `IntersectionObserver` is undefined. Content can never be stuck invisible.

**Reduced-motion (`prefers-reduced-motion: reduce`), scoped to `StoreV4Root`:** all `animation-duration: 0.01ms; animation-iteration-count: 1; transition-duration: 0.01ms;` — parallax off, canvas renders one static frame (or CSS gradients on mobile), Crystallize = chrome ring + gold tag visible instantly, scroll cue static, no smooth-scroll.

**Canvas spec (`CrystallineCanvas`, ≥768px only):** hand-rolled 2D, **zero new deps**; prism shards = thin rotated linear-gradient slivers + radial glints; colors read via `getComputedStyle` on `--store-ice/--store-wing/--store-gold` at init and re-read on `resize` + `MutationObserver` on `documentElement[data-world]`; count per §5; DPR capped at 2; rAF paused when `document.hidden` OR canvas offscreen (IO); slow drift + opacity twinkle only; hero content parallax `translateY(scrollY × 0.12)` via rAF, **desktop ≥1024 only**. Canvas `try/catch` → on any failure set `data-static="true"` and fall back to the CSS gradient hero. `<768px`: no canvas element at all — layered CSS radial-gradients + motion #8.

**Perf budgets:** added JS ≤ **70KB gzip**; **0 new npm dependencies**; LCP element = hero H1 (text, not canvas); canvas init deferred to `requestIdleCallback` (fallback `setTimeout 0`).

---

## 5. RESPONSIVE MATRIX (all values = resolved px; clamps from §3c produce these)

| Viewport | Container max | Side pad | Grid cols | Grid gap | Card pad / radius | H1 | Price | Section pad-y | Hero min-h | Prisms | Cart pill |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **320** | 100% | 16 | 1 | 16 | 20 / 18 | 34 | 30 | 64 | 560 | 0 (CSS) | full-width: `left 16, right 16, bottom calc(16px + env(safe-area-inset-bottom))`, h 56 |
| **375** | 100% | 16 | 1 | 16 | 20 / 18 | 35 | 31 | 64 | 560 | 0 | same |
| **414** | 100% | 20 | 1 | 16 | 20 / 18 | 36 | 32 | 64 | 580 | 0 | same |
| **768** | 720 | 24 | 2 | 20 | 24 / 20 | 47 | 37 | 70 | 620 | 24 | floating: `right 24, bottom 24`, min-w 240, h 56 |
| **1024** | 960 | 32 | 3 | 24 | 26 / 20 | 55 | 41→40 | 83 | 680 | 32 | `right 32, bottom 32` |
| **1440** | 1200 | 32 | 3 | 24 | 28 / 20 | 67 | 40 | 104 | 720 | 36 | same |
| **2560** | 1320 | 48 | 3 | 28 | 32 / 22 | 72 | 40 | 112 | 760 | 48 | `right 48, bottom 48` |
| **3840** | 1440 | 48 | 3 | 32 | 32 / 22 | 72 | 40 | 112 | 760 | 48 (DPR ≤ 2) | same |

Breakpoints: `sm 480 · md 768 · lg 1024 · xl 1440 · xxl 2560` (min-width, mobile-first). Grid columns: 1 below 768 · 2 at 768–1023 · 3 at ≥1024 (never 4 — the case breathes; ultrawide gains whitespace, not columns). Trust bar: 2×2 grid <768, single row ≥768. Social proof: scroll-snap carousel <768 (`scroll-snap-type: x mandatory`, card `min-width: 82%`), 3-col grid ≥768, no autoplay ever. All interactive targets ≥ **44×44px** at every breakpoint (CTAs 48px, pill 56px).

---

## 6. BACKEND BINDING + REVERSIBILITY

### 6a. Money-path touchpoints — BIND-ONLY (never redesigned)

| # | Design element | Binds to | Rule |
|---|---|---|---|
| 1 | Card `Add to Cart` | The **exact cart context/hook StoreV3 imports**, via `useCartBinding` | Call `addItem` + read count only. Context file never edited. Signature mismatch is adapted inside the hook. |
| 2 | `StoreV4CartPill` → cart | The **exact route string V3's cart entry uses** | Navigate only. Checkout/cart pages untouched. |
| 3 | Signed-out gating (`pricingVisibility`) | V3's **exact existing auth predicate**, extracted verbatim into `useStorePackages` | If V3 hides prices for role X, V4 hides for role X. No reinterpretation. |
| 4 | "Ask About Pricing" / "Book a Consultation" / "Ask a Question" | V3's **existing handlers** (modal or route — whatever V3 does today) | Copied verbatim. |
| 5 | Prices / names / session counts | The **existing store items endpoint V3 consumes** (extracted into `useStorePackages`) | No new packages endpoint. `toStorePackage`'s FIELD_MAP is copied from the fields V3 renders; formatting verified by the parity test (§7 Slice 1). |
| 6 | Stripe / checkout / payment | — | **Out of scope. Not imported, not touched, not rendered.** |

### 6b. NEW backend surface — exactly one, flagged, Slice 3, additive-only

**Flag: NEW.** Social proof has no existing endpoint, and mocks are banned — so:

- **Migration** `...-create-store-testimonials.cjs` — `CREATE TABLE store_testimonials` ONLY (no alters, no drops): `id UUID PK default gen_random_uuid()` · `quote TEXT NOT NULL` · `author_role VARCHAR(60) NOT NULL` (role labels like `Client — 12-Month Block`; **never names**) · `rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5)` · `program_label VARCHAR(60) NULL` · `is_approved BOOLEAN NOT NULL DEFAULT false` · `display_order INT NOT NULL DEFAULT 0` · `createdAt/updatedAt`.
- **Model** `StoreTestimonial.mjs` — mirrors the table.
- **Controller** — `getApprovedTestimonials` only: `WHERE is_approved = true ORDER BY display_order ASC, createdAt DESC LIMIT 12`, attributes restricted to the five public fields.
- **Route** — `GET /api/store/testimonials`, public, mounted with **one additive line** in the existing store routes index; `Cache-Control: public, max-age=300`; reuses the existing public rate limiter (bind, don't add). **No public POST** — zero PII intake surface. Response: `{ "testimonials": [ { "id", "quote", "authorRole", "rating", "programLabel" } ] }`.
- **Data:** Sean inserts REAL curated quotes via SQL at deploy (`is_approved=true`). Admin CRUD UI is **out of scope** for this build. Empty table → `StoreV4SocialProof` returns `null` → section invisible. Endpoint error → `useTestimonials` swallows → `null`. The page never fails because of proof.

### 6c. Revert plan (exact)

1. **Instant:** `localStorage.setItem('ff_storeV4','0')` + reload (QA/support lever).
2. **Deploy-level:** set `VITE_FF_STORE_V4=0`, redeploy → StoreGate renders V3. V3 was never edited, so behavior is byte-identical to today.
3. **Nuclear:** revert the one-line router diff; all V4 code becomes dead code, removable later at leisure.
4. **Zero data loss:** the testimonials table/route remain dormant (additive-only policy — migrations are **never rolled back**). Cart, checkout, Stripe, packages API: untouched at every step.

---

## 7. THREE-SLICE BUILD ORDER — each shippable, each gated

### SLICE 1 — Foundation, gate, real-data grid, cart binding (no canvas, no motion beyond hover/focus)
Build: `featureFlags` key, router line, `StoreGate`, `StoreV4ErrorBoundary`, tokens/styles/copy/types/utils, `useStorePackages` (extracted from V3), `useCartBinding`, `StoreV4Hero` (static), `StoreV4TrustBar`, `SwanPackageCard`, `StoreV4PackageGrid`, `StoreV4CartPill`, `StoreV4Skeleton`, empty/ask states, all four scripts.

**Acceptance tests (must all pass):**
```bash
bash scripts/check-degalaxy.sh            # ZERO matches for 0a0a1a|#00FFFF|7851A9 (case-insens.)
node scripts/check-token-discipline.mjs   # every hex/rgba in store-v4 sits inside a var() fallback
bash scripts/check-line-cap.sh            # every new file ≤ 300 lines
```
```ts
// e2e/store-v4.slice1.spec.ts (Playwright)
test('flag OFF → V3, byte-identical root', async ({ page }) => {
  await page.goto('/store');                       // flag defaults off
  await expect(page.locator('[data-store-v4]')).toHaveCount(0);
  const html = await page.locator('main, #root > *').first().innerHTML();
  expect(html).toMatchSnapshot('v3-root.snap.html'); // captured from main BEFORE Slice 1
});
test('flag ON → real packages, price parity with V3', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ff_storeV4', '1'));
  await page.goto('/store');
  const cards = page.locator('[data-package-id]');
  await expect(cards.first()).toBeVisible();
  // MONEY PARITY: every V4 price string must equal V3's price string for the same package name
  const v4 = await cards.evaluateAll(ns => ns.map(n => ({ n: n.querySelector('h3')!.textContent, p: n.querySelector('[data-price]')!.textContent })));
  await page.addInitScript(() => localStorage.setItem('ff_storeV4', '0'));
  await page.reload();
  for (const row of v4) await expect(page.locator(`text=${row.p}`).first()).toBeAttached(); // V3 shows the same formatted price
});
test('signed-out → Ask About Pricing, zero price characters', async ({ page }) => { /* clear auth, flag on, expect [data-pricing-visibility="ask"], expect(/\$\d/ to have count 0 on cards) */ });
test('AA + targets', async ({ page }) => { /* axe-core: 0 serious/critical violations; every button/link boundingBox ≥ 44px */ });
```
**Fail-closed:** flag unresolved → V3; packages fetch `error` → boundary → V3; cart context missing → `StoreV4CartPill` returns `null`, cards still render (add disabled with tooltip copy from deck). **De-Galaxy:** grep above, CI-blocking.

### SLICE 2 — Cinematic layer
Build: `CrystallineCanvas`, `useReveal`, full motion module wired (hero entrance, scroll story, **The Crystallize** on flagship, pill bump), mobile CSS-optics fallback, reduced-motion scoping.

**Acceptance tests:**
```ts
test('reduced-motion → everything static, content visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('ff_storeV4', '1'));
  await page.goto('/store');
  const card = page.locator('[data-package-id]').first();
  expect(await card.evaluate(el => getComputedStyle(el).animationDuration)).toBe('0.01ms');
  await expect(page.locator('[data-store-v4] h1')).toBeVisible();     // nothing stuck at opacity 0
  await expect(page.locator('canvas[data-static="true"], [data-store-v4] >> nth=0')).toBeAttached();
});
test('canvas sleeps offscreen', async ({ page }) => { /* scroll past hero, expect window.__storeV4CanvasRunning === false (dev-only hook) */ });
```
```bash
node scripts/check-motion-props.mjs   # scans every keyframes block: ONLY transform/opacity/background-position-free props → else exit 1
bash scripts/check-degalaxy.sh && bash scripts/check-line-cap.sh
```
**Fail-closed:** canvas throw → `data-static` CSS hero; `IntersectionObserver` missing or 1200ms timeout → force-revealed; `prefers-reduced-motion` → all static. **De-Galaxy:** same grep.

### SLICE 3 — Proof backend, polish, revert drill
Build: backend migration/model/controller/route (additive), `useTestimonials`, `StoreV4SocialProof`, `StoreV4HowItWorks`, `StoreV4WhySwan`, `StoreV4FinalCTA`, ultrawide polish, perf audit.

**Acceptance tests:**
```ts
// backend contract (supertest)
it('GET /api/store/testimonials → 200, whitelisted shape, zero PII', async () => {
  const res = await request(app).get('/api/store/testimonials').expect(200);
  expect(res.headers['cache-control']).toContain('max-age=300');
  for (const t of res.body.testimonials) {
    expect(Object.keys(t).sort()).toEqual(['authorRole','id','programLabel','quote','rating'].sort());
    expect(t.authorRole).not.toMatch(/@|\b[A-Z][a-z]+ [A-Z][a-z]+\b/);   // no emails, no full names
  }
});
```
```ts
// e2e/store-v4.slice3.spec.ts
test('empty proof → section absent, page intact', ...); // truncate table in test env → [data-testimonials] count 0, grid still renders
test('MONEY PATH e2e: add flagship → pill bumps → existing cart page, unmodified', async ({ page }) => {
  // sign in (existing test helper), flag on, /store
  await page.locator('[data-package-id][data-flagship="true"] button').click();
  await expect(page.locator('[data-cart-pill]')).toContainText('1');
  await page.locator('[data-cart-pill]').click();
  await expect(page).toHaveURL(/cart/);                                  // the EXISTING cart route
  await expect(page.locator('[data-store-v4]')).toHaveCount(0);          // we have LEFT V4 — cart is not ours
});
test('REVERT DRILL: flip flag → V3, zero data loss', async ({ page, request }) => {
  const before = (await request.get('/api/store/testimonials')).status();
  await page.addInitScript(() => localStorage.setItem('ff_storeV4', '0'));
  await page.goto('/store');
  await expect(page.locator('[data-store-v4]')).toHaveCount(0);
  expect((await request.get('/api/store/testimonials')).status()).toBe(before); // additive backend dormant, intact
});
```
```bash
bash scripts/check-degalaxy.sh && bash scripts/check-line-cap.sh && node scripts/check-token-discipline.mjs
```
**Fail-closed:** proof endpoint down/empty → section `null`; backend absent behind flag → Slice 1+2 still fully shippable. **De-Galaxy:** same grep, CI-blocking on every slice.

---

## 8. DO NOT — decisions made FOR the builder

1. **Do NOT** edit `StoreV3.tsx`, the cart context, checkout, Stripe routes, or the packages endpoint. Not one line.
2. **Do NOT** write a single hex or `rgba()` outside `storeV4.tokens.ts`, and never outside a `var()` fallback there. The banned trio — `#0a0a1a`, `#00FFFF`, `#7851A9` — appears nowhere, including fallbacks. CI greps enforce this.
3. **Do NOT** invent copy. §3d is the whole dictionary, including error and empty states.
4. **Do NOT** say "NASM-certified." Approved claims only: "26+ years of coaching", "NASM OPT™ protocol".
5. **Do NOT** hardcode packages, prices, or testimonials. Prices from the store API; proof from the new endpoint; empty → hidden, never stubbed.
6. **Do NOT** animate `width/height/top/left/right/margin/padding`. Transform/opacity only. No marquee trust bar. No autoplay carousels.
7. **Do NOT** add dependencies — no MUI, no Tailwind, no animation/canvas/chart libs. No charts at all on this page (Victory-only law is moot here).
8. **Do NOT** exceed 300 lines per file. Extract until it fits; budgets in §2 are the map.
9. **Do NOT** use `createGlobalStyle`, new font files, images, JSON-LD, or analytics in this build. All optics are CSS/canvas; fonts are the app's existing brand fonts.
10. **Do NOT** render literal swans, feathers, wings, or any creature. Optics only: refraction, facets, chrome, light.
11. **Do NOT** render the canvas below 768px, run parallax below 1024px, or exceed DPR 2 / 48 prisms.
12. **Do NOT** show any price string to signed-out users — V3's exact predicate governs. The parity test enforces it.
13. **Do NOT** let a reveal leave content invisible: hidden-start styles exist only under `no-preference`, plus the 1200ms force-reveal.
14. **Do NOT** add a public POST to the testimonials route, store names/emails, or build an admin UI for it — Sean seeds real quotes via SQL.
15. **Do NOT** roll back the testimonials migration, ever. Additive-only means it stays; revert is the flag.
16. **Do NOT** give the grid a 4th column at any width, scale the flagship card, or spend gold anywhere except the flagship tag and the Crystallize ring. Rarity is the point.
17. **Do NOT** "improve" the one-line router diff into a refactor of routing. One line. That is the whole diff.
18. **Do NOT** ship a slice without its four gates green: acceptance spec, line-cap, token-discipline, de-Galaxy grep.

Build it in three slices, flag it off by default, and the day Sean flips `VITE_FF_STORE_V4=1`, the store stops listing packages and starts **presenting them** — a crystal case, a flagship that crystallizes, proof with real voices, and a money path we never touched.
