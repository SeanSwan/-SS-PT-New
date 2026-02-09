# Hero Section Redesign — Combined Analysis & Enhancement Plan

> **Status:** ANALYSIS COMPLETE — Awaiting cross-AI review before implementation
> **Backup:** Commit `e97bb240` — `BACKUP --- SAFE REVERT POINT BEFORE HERO SECTION REDESIGN`
> **Revert command:** `git reset --hard e97bb240`
> **Date:** 2026-02-08

---

## 1. Combined Vision (Original + Enhanced Prompt)

### Owner's Original Direction
- Keep the current homepage aesthetic but **enhance the hero section quality**
- Add **video background** (swan/nature video from existing assets)
- **Floating orbs** like a Japanese anime mystic forest scene
- Blend the **Ethereal Wilderness** concept (nature + luxury + Galaxy-Swan colors) into production
- Use the existing **GlowButton** component
- Make it feel **premium for wealthy clients** (ages 16-80)
- "Digital nature that looks organically real" — clouds, tropical mist, mystic forest vibes
- Just a **smidge of cyberpunk** (subtle grid overlay, not overt)
- Improve **logo clarity, scaling, and responsiveness**
- Fix **mobile-first responsive design** across the 10-breakpoint matrix

### Enhanced Prompt Specifications
- Primary focus: **homepage hero section** (logo + surrounding content)
- Secondary: confirm no regressions on nav/header/footer/CTA flow
- Do NOT redesign the whole site from scratch
- Preserve brand direction already present
- Use Playwright for visual inspection and regression checks
- Use `frontend-design` and `ui-ux-pro-max` skills for guidance
- Test at: 320, 375, 430, 768, 1024, 1280, 1440, 1920, 2560, 3840
- Keep route/API/backend behavior unchanged

---

## 2. Current State Analysis (Playwright Findings)

### 2.1 What's Live Now

**Production uses `Hero-Section.V2.tsx`** (nebula gradient background, no video):
- File: `frontend/src/pages/HomePage/components/Hero-Section.V2.tsx`
- Background: Pure CSS nebula (`#050510` base + radial gradients + blur)
- Logo: `Logo.png` (795KB PNG), 130px height desktop, 90px mobile
- Title: "Forge Your Body, Free Your Spirit" (system font, 5rem→2.5rem responsive)
- Subtitle: Generic system sans-serif
- CTAs: 2x GlowButton (cosmic + primary)
- Animations: Framer Motion entrance, CSS float on logo, nebulaPulse on background

**V1 exists as fallback** (`Hero-Section.tsx`) with `swan.mp4` video background and glass-morphism card.

### 2.2 Video Assets Available

| File | Orientation | Duration | Content | Best For |
|------|-------------|----------|---------|----------|
| `swan.mp4` (26MB) | **Portrait** | ~30s | Swans on misty alpine lake, mountains, moody blue | Mobile hero, stunning but portrait |
| `Swans.mp4` (18MB) | **Landscape** | 25s | Dark moody water, forest reflections, ambient | Desktop ambient background |
| `Waves.mp4` (7.2MB) | **Landscape** | ~15s | Aerial turquoise beach, palm shadows, crystal water | Tropical nature feel, lightest file |

**Note:** `swan-golden.mp4` and `swan-silver-wing.mp4` exist in source but are NOT deployed to the public directory.

### 2.3 Issues Found at Each Breakpoint

#### Desktop (1280px)
- Logo is **PNG at 795KB** — no SVG version loaded (logo.svg exists at 4.4KB)
- Logo has cyan drop-shadow but lacks the "premium polish" feel
- Nebula background is very dark/flat — minimal visual depth
- Large empty space between nav and logo (banner takes ~100px)
- Title uses system font — no custom display typography loaded
- "View Packages in Store" button text wraps awkwardly at some sizes

#### Tablet (768px)
- Logo drops to implied 90px but transition is abrupt (130→90, no clamp)
- Banner still consumes significant viewport space
- Buttons still side-by-side but spacing feels cramped
- Background nebula not responsive — gradients fixed at viewport-relative positions

#### Mobile (375px) — Evidence: `hero-375w-current.png`
- Banner consumes significant viewport space above the fold. In the captured screenshot (`hero-375w-current.png`, 375x812 viewport), the nav bar (~56px) + notification banner (~180px) occupy ~236px of 812px visible height (~29%). The banner contains two CTA buttons, close icon, and multi-line text which pushes hero content down. **Note:** Exact % depends on banner content/state — this is measured from the Playwright capture, not asserted generically.
- Logo is small (90px) and the drop-shadow makes edges slightly blurry
- Title "Forge Your Body, Free Your Spirit" drops to ~2.5rem — could be larger
- CTA buttons should stack but the wrapping is inconsistent
- No video or motion adds to the "flat" feel on mobile
- Significant scroll needed before content starts

**Playwright screenshots captured during analysis:**
- `hero-1280w-current.png` — Desktop hero at 1280px
- `hero-768w-current.png` — Tablet hero at 768px
- `hero-375w-current.png` — Mobile hero at 375px
- `swan-video-frame.png` — swan.mp4 frame (portrait, alpine swans)
- `swans-video-frame.png` — Swans.mp4 frame (landscape, dark moody water)
- `waves-video-frame.png` — Waves.mp4 frame (landscape, tropical turquoise)

### 2.4 Logo-Specific Analysis

| Criterion | Finding | Severity |
|-----------|---------|----------|
| **Sharpness** | PNG at 795KB — pixel artifacts on retina | Medium |
| **SVG available** | `logo.svg` exists (4.4KB) but NOT used in hero | Quick win |
| **Container sizing** | Fixed height (130/90px), no clamp() | Low |
| **Vertical rhythm** | Too much gap between nav bar and logo | Medium |
| **Drop-shadow** | Cyan glow at 0.25 opacity — subtle but diffuses edges | Low |
| **Layout shift** | No explicit width/height attrs — potential CLS | Medium |
| **Object-fit** | Not needed (height-based scaling) but no max-width guard | Low |

---

## 3. Enhancement Plan — "Ethereal Wilderness Production Hero"

### 3.1 Concept: Mystic Forest Sanctuary

Merge the approved **Ethereal Wilderness** concept (#12) into the production hero while keeping the existing page structure intact. The hero becomes an immersive nature sanctuary with:

1. **Video background** — `Waves.mp4` (lightest at 7.2MB, gorgeous tropical turquoise) with a deep dark overlay tinted with the Galaxy-Swan palette. Use `Swans.mp4` as a fallback/alternative toggle for moody dark variant.

2. **Floating orbs** — 8-12 CSS-animated circles that drift upward and glow like bioluminescent spirits in a mystic forest. Teal/cyan primary, purple secondary, varying sizes (3-8px), staggered delays, 6-12s float cycles.

3. **Mist/cloud layers** — 2-3 radial-gradient "mist" elements that slowly drift horizontally (the tropical jungle mist effect from Ethereal Wilderness).

4. **Faint cyberpunk grid** — Extremely subtle (0.02-0.04 opacity) grid overlay that pulses gently. The "smidge."

5. **Logo upgrade** — Switch to `logo.svg` for crispness, add a luminous halo glow (not harsh drop-shadow), use `clamp()` for smooth responsive scaling.

6. **Typography upgrade** — Load Cormorant Garamond for the display title. Source Sans 3 for the subtitle. These are the Ethereal Wilderness fonts that blend Marble elegance with Nature warmth.

7. **GlowButton** — Keep existing `emerald` + `cosmic` variants (already on page).

8. **Color integration** — Apply Ethereal Wilderness dark palette tokens:
   - Primary: `#00D4AA` (cyan-teal blend)
   - Secondary: `#7851A9` (cosmic purple, unchanged)
   - Accent: `#48E8C8` (light teal for orbs/highlights)
   - Background overlay: `#0a0a1a` at 0.65 opacity over video

### 3.2 Component Architecture (Minimal Changes)

```
Hero-Section.V2.tsx  ← ONLY file modified (the hero)
├── VideoBackground       (NEW: video element with overlay)
├── MistLayer x3          (NEW: drifting cloud effects)
├── FloatingOrb x10       (NEW: anime-style spirit orbs)
├── GridOverlay            (NEW: faint cyberpunk grid)
├── Logo                   (MODIFIED: SVG, clamp sizing, halo glow)
├── Badge                  (EXISTING: minor color tweak)
├── Title                  (MODIFIED: Cormorant Garamond, gradient)
├── Subtitle               (MODIFIED: Source Sans 3)
├── ButtonGroup            (EXISTING: no changes)
│   ├── GlowButton        (EXISTING)
│   └── GlowButton        (EXISTING)
└── ScrollIndicator        (NEW: optional, from V1)
```

**Files to modify:** 1 (Hero-Section.V2.tsx)
**Files untouched:** All other sections, routes, backend, footer, nav

### 3.3 Video Strategy

```
Desktop (≥768px): Load Waves.mp4 — landscape, light file, tropical
Mobile (<768px):  No <video> element rendered — pure CSS gradient + orbs
Fallback:         Pure CSS nebula (current behavior) if video fails to load
Reduced motion:   No video, static gradient, no orb animation
```

**Critical: Conditional render, not just poster.** Many browsers fetch video metadata/content even with `poster` set if a `<video src>` is rendered in the DOM. The implementation MUST use a React conditional render based on viewport width:

```tsx
// Hook or media query check
const isDesktop = useMediaQuery('(min-width: 768px)');
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
const showVideo = isDesktop && !prefersReducedMotion;

// In JSX — video element is NOT in DOM on mobile at all
{showVideo && (
  <VideoBackground>
    <video autoPlay loop muted playsInline>
      <source src="/Waves.mp4" type="video/mp4" />
    </video>
  </VideoBackground>
)}
```

This ensures:
- **Mobile:** Zero video bytes downloaded. No `<video>` element in DOM.
- **Desktop:** Video loads and autoplays with `object-fit: cover`.
- **Reduced motion:** Video not rendered regardless of viewport.
- **Fallback:** If `showVideo` is false for any reason, the existing CSS nebula gradient remains visible beneath all layers.

Video overlay:
- Dark overlay: `linear-gradient(135deg, #0a0a1a99, #0d1a1a88)` over video
- Vignette: `box-shadow: inset 0 0 120px rgba(0,0,0,0.4)`
- The overlay ensures text readability over moving video content

### 3.4 Responsive Matrix

| Breakpoint | Logo Size | Title Size | Video | Orbs | Mist | Grid |
|------------|-----------|------------|-------|------|------|------|
| 320px | clamp(60px) | 2.2rem | poster only | 4 | 1 | hidden |
| 375px | clamp(70px) | 2.4rem | poster only | 5 | 1 | hidden |
| 430px | clamp(80px) | 2.6rem | poster only | 6 | 2 | hidden |
| 768px | clamp(100px) | 3.5rem | autoplay | 8 | 2 | 0.02 |
| 1024px | clamp(110px) | 4rem | autoplay | 10 | 3 | 0.025 |
| 1280px | clamp(120px) | 4.5rem | autoplay | 10 | 3 | 0.03 |
| 1440px | clamp(130px) | 5rem | autoplay | 12 | 3 | 0.03 |
| 1920px | clamp(140px) | 5rem | autoplay | 12 | 3 | 0.035 |
| 2560px | clamp(160px) | 5.5rem | autoplay | 14 | 3 | 0.035 |
| 3840px | clamp(180px) | 6rem | autoplay | 16 | 3 | 0.04 |

### 3.5 Animations (CSS Keyframes)

1. **orbFloat** — translateY(-180px) + slight X sway, 6-12s, opacity fade in/out
2. **mistDrift** — translateX(±60px) + scaleX, 18-24s, gentle opacity pulse
3. **gridPulse** — opacity 0.015↔0.04, 6s
4. **logoHalo** — box-shadow glow pulse (teal), 4s
5. **titleReveal** — Framer Motion staggered entrance (keep existing pattern)

All respect `prefers-reduced-motion: reduce` — set to `animation: none` or `opacity: static`.

### 3.6 Performance Budget

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| LCP | ~2.5s | ≤2.5s | SVG logo (4KB vs 795KB PNG), video lazy |
| CLS | ~0.1 | ≤0.05 | Explicit width/height on logo |
| Video load | N/A | ≤3s | Only on desktop, Waves.mp4 (7.2MB) |
| Orb paint | N/A | <1ms/frame | Pure CSS, no JS animation |
| Mist paint | N/A | <0.5ms/frame | CSS only, will-change: transform |

---

## 4. What NOT to Change

- Navigation header component
- Footer component
- Programs Overview V3 section
- Features Section V2
- Creative Expression section
- Trainer Profiles section
- Testimonials, Stats, Instagram, Newsletter sections
- Any backend routes or API endpoints
- Redux store or theme context
- Routing configuration
- Checkout/booking/store flows (sacred monetization paths)

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Video increases page weight | High | Medium | Desktop only, poster fallback on mobile |
| Orb animations cause jank | Low | Medium | Pure CSS, will-change, reduced-motion |
| Logo SVG rendering differs | Low | Low | Test at all breakpoints, PNG fallback |
| Title font FOUT/FOIT | Medium | Low | font-display: swap, system fallback |
| V1ThemeBridge sections mismatch | Low | Low | Hero-only changes, no theme context changes |

---

## 6. Acceptance Criteria

- [ ] Logo looks intentional and premium on all 10 breakpoints
- [ ] No clipping, blur, overflow, or awkward scaling on logo
- [ ] Video plays smoothly on desktop, poster/gradient on mobile
- [ ] Floating orbs are visible and atmospheric (not distracting)
- [ ] Mist effect adds depth without obscuring content
- [ ] Grid overlay is barely perceptible (the "smidge")
- [ ] Title typography is elegant (Cormorant Garamond loaded)
- [ ] GlowButtons unchanged and functional
- [ ] CTA flow preserved (Store → checkout, Book → contact)
- [ ] `prefers-reduced-motion` respected throughout
- [ ] 44px touch targets on all interactive elements
- [ ] No backend/route regressions
- [ ] Build passes (`npm run build`)
- [ ] Lighthouse performance ≥ 80 on mobile

---

## 7. Files Summary

### Will Modify (1 file)
```
frontend/src/pages/HomePage/components/Hero-Section.V2.tsx
```

### Will Reference (not modify)
```
frontend/src/assets/logo.svg                    — SVG logo (switch to this)
frontend/public/Waves.mp4                       — Video background
frontend/src/components/ui/buttons/GlowButton.tsx — Existing button
frontend/src/pages/DesignPlayground/concepts/EtherealWilderness/ — Theme tokens reference
```

### Unchanged
```
All other homepage sections, routes, backend, store, schedule, etc.
```
