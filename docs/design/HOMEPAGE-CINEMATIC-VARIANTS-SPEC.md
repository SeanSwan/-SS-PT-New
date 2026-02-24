# Homepage Cinematic Variants Specification

> **Created:** 2026-02-23 | **Build Status:** Passing | **Location:** `frontend/src/pages/HomePage/cinematic/`

## Overview

Three design variants for the SwanStudios homepage cinematic overhaul, accessible via the admin Design Lab at `/dashboard/content/design`. All variants share the same content model (`HomepageContent.ts`), section structure, and CTAs — only palette, motion intensity, and surface styling differ.

---

## Variant A: Enchanted Apex (Preset F)

**Token File:** `cinematic-tokens.ts` → `enchantedApexTokens`

| Token | Value | Purpose |
|-------|-------|---------|
| bg | `#0B1A0F` (Forest Throne) | Primary background |
| surface | `#2A1F14` (Ancient Bark) | Card/panel surfaces |
| accent | `#C6A84B` (Gilded Fern) | Luxury gold accent |
| gaming | `#39FF6B` (Biolume Green) | Gaming/action accent |
| textPrimary | `#FAF5E8` (Ivory Parchment) | Primary text |
| motion | `high` | Maximum fantasy energy |

**Mood:** Warm enchanted forest, bioluminescent particles, gold-leaf UI, moss/vine aesthetic.
**Best for:** Maximum fantasy/nature immersion. Strong gamification identity.

---

## Variant B: Crystalline Swan (Preset F-Alt) — RECOMMENDED

**Token File:** `cinematic-tokens.ts` → `crystallineSwanTokens`

| Token | Value | Purpose |
|-------|-------|---------|
| bg | `#002060` (Midnight Sapphire) | Primary background |
| surface | `#003080` (Royal Depth) | Card/panel surfaces |
| accent | `#C6A84B` (Gilded Fern) | Luxury gold accent |
| gaming | `#60C0F0` (Ice Wing) | Gaming/action accent |
| secondary | `#50A0F0` (Arctic Cyan) | Secondary accent |
| textPrimary | `#E0ECF4` (Frost White) | Primary text |
| motion | `medium-high` | Balanced energy |

**Mood:** Frozen enchanted forest, ice crystals, aurora borealis, sapphire glass, crystalline formations.
**Best for:** Brand-exact match to SwanStudios logo palette. Most likely final candidate.

---

## Variant C: Hybrid Editorial (F-Alt + Low Motion)

**Token File:** `cinematic-tokens.ts` → `hybridTokens`

| Token | Value | Purpose |
|-------|-------|---------|
| Palette | Same as Variant B | Brand consistency |
| cardRadius | `1.5rem` (vs 2rem) | Tighter editorial feel |
| headingWeight | `800` (vs 700) | Sharper hierarchy |
| noiseOpacity | `0.03` (vs 0.05) | Subtler texture |
| motion | `low` | Minimal animation |

**Mood:** Crystalline Swan aesthetic with editorial restraint — fewer particles, more whitespace, sharper typography hierarchy, premium professional feel.
**Best for:** If Variant B feels too "fantasy" for conversion. Maximum professional trust.

---

## Shared Architecture

### Content Model
`HomepageContent.ts` — single TypeScript interface with all text, CTAs, routes, SEO meta. All 3 variants render from this exact same data.

### Section Components (11)
All in `sections/` directory, parameterized by `tokens: CinematicTokens`:

1. `CinematicNavbar` — Floating island, morph-on-scroll, `useHeaderState` for auth/cart/role
2. `CinematicHero` — 100dvh, gradient overlay, weighted text animation, particles
3. `CinematicPrograms` — 3 interactive cards with badges, feature lists, CTAs
4. `CinematicFeatures` — 4-col responsive grid with glass cards
5. `CinematicCreative` — 2-col grid with bullet lists and discipline icons
6. `CinematicTrainers` — Carousel with cert badges, ratings, social links
7. `CinematicTestimonials` — Carousel with stat metrics and program links
8. `CinematicStats` — 3-col grid with gradient value text
9. `CinematicSocialFeed` — Platform cards with follow links
10. `CinematicNewsletter` — Form + 3 benefit cards
11. `CinematicFooter` — 4-col grid with "System Operational" badge

### Design System
- `cinematic-tokens.ts` — Palette, typography, surface, motion tokens per variant
- `cinematic-animations.ts` — Framer Motion variants weighted by motion intensity
- `cinematic-shared.ts` — Shared styled-components (NoiseOverlay, GlassCard, MagneticButton, etc.)

### Admin Preview
- Tab: Content Studio > "Design" (`/dashboard/content/design`)
- Component: `HomepageDesignLab.tsx` — variant toggler with portal-based chromeless preview
- Portal: `z-index: 2000`, `position: fixed; inset: 0`, escape WorkspaceContainer DOM

---

## Typography

| Role | Font | Weight | Used For |
|------|------|--------|----------|
| Headings | Plus Jakarta Sans | 700-800 | Section titles, card titles, buttons |
| Drama | Cormorant Garamond Italic | 400-500 | Accent phrases, subtitles |
| Body | Source Sans 3 | 400 | Paragraphs, descriptions |
| Mono | Fira Code | 400-500 | Badges, metrics, technical labels |

---

## Files Created

```
frontend/src/pages/HomePage/cinematic/
├── HomepageContent.ts
├── cinematic-tokens.ts
├── cinematic-animations.ts
├── cinematic-shared.ts
├── ASSET-MANIFEST.md
├── sections/
│   ├── index.ts
│   ├── CinematicNavbar.tsx
│   ├── CinematicHero.tsx
│   ├── CinematicPrograms.tsx
│   ├── CinematicFeatures.tsx
│   ├── CinematicCreative.tsx
│   ├── CinematicTrainers.tsx
│   ├── CinematicTestimonials.tsx
│   ├── CinematicStats.tsx
│   ├── CinematicSocialFeed.tsx
│   ├── CinematicNewsletter.tsx
│   └── CinematicFooter.tsx
└── variants/
    ├── VariantA.tsx
    ├── VariantB.tsx
    └── VariantC.tsx
```

## Files Modified

| File | Change |
|------|--------|
| `frontend/index.html` | Added Plus Jakarta Sans + Fira Code Google Fonts link |
| `frontend/src/components/DashBoard/workspaces/ContentWorkspace.tsx` | Added "Design" tab with Palette icon |
| `frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx` | Added `/content/design` route with lazy-loaded HomepageDesignLab |

---

## Next Steps (Phase 5 — After Admin Approval)

1. Create `HomePage.V3.component.tsx` rendering approved variant
2. Add route-based layout suppression (`pathname === '/'`) to `layout.tsx`
3. Update `main-routes.tsx` to point `/` to V3
4. Keep V2 as fallback (rename, don't delete)
5. Keep Design Lab for future iterations
