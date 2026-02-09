# Full Homepage Redesign — Combined Analysis & Enhancement Plan

> **Scope:** Entire homepage (hero + all sections) — Ethereal Wilderness production theme
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
| 320px | clamp(60px) | 2.2rem | no video | 4 | 1 | hidden |
| 375px | clamp(70px) | 2.4rem | no video | 5 | 1 | hidden |
| 430px | clamp(80px) | 2.6rem | no video | 6 | 2 | hidden |
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

## 4. Full Homepage Section-by-Section Enhancement Plan

> **Scope expansion:** The redesign covers the ENTIRE homepage, not just the hero. Each section gets upgraded to the Ethereal Wilderness aesthetic while preserving its purpose. The V1ThemeBridge wrapper will be removed as each section is upgraded.

### 4.1 Programs Overview V3 — "Choose Your Path"

**Current file:** `frontend/src/pages/HomePage/components/ProgramsOverview.V3.tsx` (391 lines)

**Current state:**
- 3 program cards (Express Precision, Signature Performance, Transformation Programs)
- Hardcoded colors (`#00ffff`, `#0a0a15`, white) — no theme tokens
- System fonts only — no custom typography
- Unsplash stock images as card backgrounds
- GlowButton per card + footer CTA
- Cards are 600px fixed height, gradient overlay

**Enhancement plan:**
- **Typography:** Cormorant Garamond for card titles, Source Sans 3 for body/outcomes
- **Colors:** Replace hardcoded `#00ffff` → Ethereal Wilderness `#00D4AA` primary, `#48E8C8` accent
- **Background:** Swap solid `#0a0a15` for subtle mist gradient matching hero
- **Cards:** Add glass-morphism surface (backdrop-filter: blur), subtle teal glow on hover instead of cyan
- **Copy upgrade:** More premium, organic language — "Precision Sculpting" instead of "Express Precision", "Your Signature Journey" instead of generic coaching language
- **Section header:** "Discover Your Path" with Cormorant Garamond display weight
- **Orbs:** 4-6 floating orbs in background (lighter than hero, atmospheric)
- **Grid overlay:** Faint 0.02 opacity grid (consistent with hero)

**Copy direction:**
| Current | Proposed |
|---------|----------|
| "Choose Your Path" | "Discover Your Path" |
| "Express Precision — Built for Busy Schedules" | "Precision Sculpting — Crafted for Your Rhythm" |
| "Signature Performance — Premium Coaching Experience" | "Signature Journey — Your Elite Coaching Experience" |
| "Transformation Programs — Commit to Lasting Change" | "Total Transformation — Commit to Lasting Evolution" |

---

### 4.2 Features Section V2 — "Our Premium Services"

**Current file:** `frontend/src/components/FeaturesSection/FeaturesSection.V2.tsx` (417 lines)

**Current state:**
- 8 feature cards in grid using FrostedCard + ParallaxSectionWrapper
- Partially uses theme tokens (`theme.text`, `theme.colors`)
- Background: hardcoded `linear-gradient(135deg, #09041e, #1a1a3c)`
- Uses `useReducedMotion` hook ✓
- Feature `linkTo` routes may not exist (e.g., `/services/personal-training`)

**Enhancement plan:**
- **Typography:** Cormorant Garamond for section title, Source Sans 3 for descriptions
- **Background:** Replace hardcoded gradient with Ethereal Wilderness dark palette
- **Icon colors:** Update from `#00FFFF`/`#7851A9`/`#00E8B0` → `#00D4AA`/`#7851A9`/`#48E8C8`
- **Card effects:** Add subtle mist drift behind card grid
- **Copy upgrade:** More evocative, premium language
- **Route audit:** Verify all `linkTo` paths exist; replace broken ones with `/shop` or `/contact`

**Copy direction:**
| Current | Proposed |
|---------|----------|
| "Our Premium Services" | "The SwanStudios Experience" |
| "Comprehensive fitness solutions designed to transform..." | "Every element of your journey, refined to perfection." |
| "Elite Personal Training" | "One-on-One Mastery" |
| "Performance Assessment" | "Movement Intelligence" |
| "Nutrition Coaching" | "Nourish & Thrive" |
| "Recovery & Mobility" | "Restore & Renew" |

---

### 4.3 Creative Expression — "Forge Your Body, Free Your Spirit"

**Current file:** `frontend/src/pages/HomePage/components/CreativeExpressionSection.tsx` (443 lines)

**Current state:**
- 4 expression cards (Dance, Art, Vocal, Community & Heart)
- Uses `useUniversalTheme` for colors ✓
- T-shaped grid (3 + 1 full-width)
- Copy is very aggressive/hype ("warriors", "ARE YOU READY?!", "EVERY POSITIVE ACTION IS REWARDED")
- Currently wrapped in V1ThemeBridge

**Enhancement plan:**
- **Typography:** Cormorant Garamond for section title + card titles, Source Sans 3 for body
- **Copy upgrade:** Tone down aggressive language to match premium luxury target. Keep the energy but refine it for wealthy clients ages 16-80
- **Cards:** Enhance glass-morphism, add subtle mist/particle effect behind grid
- **Heart card:** Keep the special treatment but use Ethereal Wilderness accent colors
- **Remove V1ThemeBridge:** Section gets direct Ethereal Wilderness styling
- **Benefit markers:** Replace "✦" with subtler teal dot or line accent

**Copy direction:**
| Current | Proposed |
|---------|----------|
| "FORGE YOUR BODY, FREE YOUR SPIRIT" | "Express. Create. Transform." |
| "we build warriors and artists" | "where strength meets artistry" |
| "EVERY POSITIVE ACTION IS REWARDED" | "Every step forward is celebrated" |
| "Unleash your power through rhythm" | "Discover strength through movement" |
| "Find the strength in your own voice" | "Unlock the power of expression" |

---

### 4.4 Trainer Profiles — "Meet Our Expert Coaching Team"

**Current file:** `frontend/src/pages/HomePage/components/TrainerProfilesSection.tsx` (791 lines)

**Current state:**
- Carousel with 2 trainers (Sean Swan, Jasmine Hearon)
- **Using Logo.png as trainer images** (placeholder — needs real photos!)
- Background: `swan-tile-big.png` with gradient overlay + grid lines
- Uses `useUniversalTheme` ✓
- Auto-rotate, touch swipe, keyboard nav
- Uses both `lucide-react` AND `react-icons/fa` (inconsistent)

**Enhancement plan:**
- **Typography:** Cormorant Garamond for trainer names, Source Sans 3 for bio/specialties
- **Background:** Replace tile background with subtle Ethereal Wilderness mist gradient
- **Card styling:** Enhance glass-morphism, use Ethereal Wilderness surface colors
- **Grid overlay:** Keep but reduce to 0.02 opacity (the "smidge")
- **Icon cleanup:** Migrate react-icons/fa arrows to lucide-react for consistency
- **Copy upgrade:** More refined bios that emphasize luxury coaching experience
- **Images:** Flag that Logo.png placeholders need real trainer photos
- **Remove V1ThemeBridge:** Direct Ethereal Wilderness styling

**Copy direction:**
| Current | Proposed |
|---------|----------|
| "Meet Our Expert Coaching Team" | "Your Coaches. Your Guides." |
| "certified trainers combine decades of experience..." | "Over two decades of expertise, distilled into your personal journey." |

---

### 4.5 Testimonials — "Success Stories"

**Current file:** `frontend/src/components/TestimonialSlider/TestimonialSlider.tsx` (673 lines)

**Current state:**
- Carousel with 3 testimonials (Sarah, Carlos, David)
- Hardcoded colors throughout (`#00ffff`, `#080818`, `#1a1a3a`, `gold`, `#b0b0d0`)
- Before/after stats with color-coded values
- Client photos from public dir (`/femaleoldwht.jpg`, `/male2.jpg`, `/male1.jpg`)
- Uses only `lucide-react` icons ✓

**Enhancement plan:**
- **Typography:** Cormorant Garamond italic for testimonial quotes, Source Sans 3 for stats/labels
- **Colors:** Replace all hardcoded values with Ethereal Wilderness palette
- **Background:** Match mist gradient, add subtle floating orbs (2-3, slow)
- **Card styling:** Glass-morphism with teal glow border instead of harsh cyan
- **Stats:** Use teal/green for "after" values instead of `#50fa7b`, muted teal for "before"
- **Copy upgrade:** Refine testimonial text to feel more polished (less generic)
- **Remove V1ThemeBridge**

**Copy direction:**
- Keep testimonial content authentic but polish grammar and flow
- Section title: "Success Stories" → "Real Transformations"

---

### 4.6 Fitness Stats — "Our Results in Numbers"

**Current file:** `frontend/src/components/FitnessStats/FitnessStats.tsx` (882 lines)

**Current state:**
- 6 stat cards with animated counters + 3 Recharts (line, bar, pie)
- Hardcoded colors and gradients throughout
- Uses `react-icons/fa` (not lucide-react — inconsistent)
- Large complex file (882 lines)
- diagonalGlimmer animation on cards

**Enhancement plan:**
- **Typography:** Cormorant Garamond for stat values (big numbers), Source Sans 3 for labels
- **Colors:** Update all stat colors to Ethereal Wilderness palette
- **Background:** Replace hardcoded gradient with Ethereal Wilderness mist
- **Charts:** Update Recharts color schemes to teal/purple palette
- **Icon cleanup:** Migrate react-icons/fa to lucide-react
- **Cards:** Glass-morphism with subtle mist, consistent with other sections
- **Remove V1ThemeBridge**

**Copy direction:**
| Current | Proposed |
|---------|----------|
| "Our Results in Numbers" | "The Numbers Speak" |
| "Proven success metrics from years..." | "A legacy built on real results." |

---

### 4.7 Instagram Feed — "Follow Our Journey"

**Current file:** `frontend/src/components/InstagramFeed/InstagramFeed.tsx` (647 lines)

**Current state:**
- 6 Instagram posts in grid, linked to real Instagram URLs
- Hardcoded colors (`#0a0a0a`, `#121212`, `#00ffff`)
- Uses `react-icons/fa` for social icons
- GlowButton for "Follow Us On Instagram"
- Stock images from public dir

**Enhancement plan:**
- **Typography:** Source Sans 3 for captions/meta, keep author names clean
- **Colors:** Replace hardcoded values with Ethereal Wilderness palette
- **Background:** Mist gradient matching rest of homepage
- **Card styling:** Glass-morphism, teal accent borders
- **GlowButton:** Keep `emerald` or switch to match other CTAs
- **Remove V1ThemeBridge**

**Copy direction:**
| Current | Proposed |
|---------|----------|
| "Follow Our Journey" | "Join the Movement" |
| "Follow our latest posts for training insights..." | "Behind the scenes of transformation. Follow our community's journey." |

---

### 4.8 Newsletter Signup — "Join Our Fitness Community"

**Current file:** `frontend/src/components/NewsletterSignup/NewsletterSignup.jsx` (557 lines) — **NOTE: .jsx not .tsx**

**Current state:**
- Email/name signup form with simulated submission
- 3 benefit cards (Exclusive Workouts, Nutrition Guides, Mindset Coaching)
- Background: `swan-tile-big.png` with gradient + grid lines
- Hardcoded colors, uses `lucide-react` ✓
- GlowButton for submit

**Enhancement plan:**
- **Convert to .tsx** (TypeScript consistency)
- **Typography:** Cormorant Garamond for title + benefit titles, Source Sans 3 for body
- **Background:** Replace tile background with Ethereal Wilderness mist
- **Form styling:** Glass-morphism container, teal focus states
- **Colors:** Ethereal Wilderness palette throughout
- **Copy upgrade:** More premium language
- **Remove V1ThemeBridge**

**Copy direction:**
| Current | Proposed |
|---------|----------|
| "Join Our Fitness Community" | "Begin Your Journey" |
| "Subscribe to receive exclusive workouts..." | "Curated insights, exclusive content, and the first step toward transformation." |
| "Exclusive Workouts" | "Elite Training Blueprints" |
| "Nutrition Guides" | "Nourishment Science" |
| "Mindset Coaching" | "Mental Mastery" |

---

### 4.9 Section Dividers

**Current:** Inline styled component in `HomePage.V2.component.tsx` — 150px shimmer divider with cyan/purple gradient.

**Enhancement plan:**
- Replace mechanical shimmer with organic mist fade transition
- Reduce height to 80-100px
- Use Ethereal Wilderness gradient (teal/purple, not pure cyan)
- Optional: Add subtle floating orbs crossing the divider for continuity

---

### 4.10 V1ThemeBridge Removal

The V1ThemeBridge wrapper will be removed from `HomePage.V2.component.tsx` as each section gets its own Ethereal Wilderness styling. After all sections are upgraded, V1ThemeBridge.tsx becomes unused.

---

## 5. What NOT to Change

- Navigation header component
- Footer component
- Any backend routes or API endpoints
- Redux store or theme context
- Routing configuration
- Checkout/booking/store flows (sacred monetization paths)
- GlowButton component internals (use as-is)

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Video increases page weight | High | Medium | Desktop only, no `<video>` in DOM on mobile (conditional render) |
| Orb animations cause jank | Low | Medium | Pure CSS, will-change, reduced-motion |
| Logo SVG rendering differs | Low | Low | Test at all breakpoints, PNG fallback |
| Title font FOUT/FOIT | Medium | Low | font-display: swap, system fallback |
| Multi-file changes cause regressions | Medium | High | Section-by-section implementation, build after each |
| Copy changes feel inconsistent | Low | Medium | Single pass review of all copy at end |
| .jsx → .tsx conversion breaks build | Low | Medium | Type-check after conversion |
| Feature routes don't exist | High | Low | Audit all linkTo/navigate paths, replace broken ones |

---

## 7. Acceptance Criteria

### Hero Section
- [ ] Logo looks intentional and premium on all 10 breakpoints
- [ ] No clipping, blur, overflow, or awkward scaling on logo
- [ ] Video plays smoothly on desktop, gradient-only on mobile (no `<video>` element rendered)
- [ ] Floating orbs are visible and atmospheric (not distracting)
- [ ] Mist effect adds depth without obscuring content
- [ ] Grid overlay is barely perceptible (the "smidge")
- [ ] Title typography is elegant (Cormorant Garamond loaded)

### All Sections
- [ ] Cormorant Garamond + Source Sans 3 loaded and rendering correctly
- [ ] Ethereal Wilderness color palette applied consistently (no stray `#00ffff` hardcodes)
- [ ] Glass-morphism surfaces consistent across all cards
- [ ] Copy upgraded to premium luxury tone throughout
- [ ] V1ThemeBridge removed from all sections
- [ ] react-icons/fa migrated to lucide-react where mixed
- [ ] All `linkTo` / `navigate()` paths verified as real routes

### Accessibility (A11y)
- [ ] Text contrast ratio ≥ 4.5:1 over all backgrounds (including video overlay)
- [ ] 44px minimum touch targets on all interactive elements
- [ ] Full keyboard navigation support (tab order, focus indicators)
- [ ] `prefers-reduced-motion` respected throughout (animations → none or static opacity)
- [ ] Screen reader landmarks and heading hierarchy intact
- [ ] Video is `muted`, `playsInline`, no autoplay audio

### Performance
- [ ] LCP ≤ 2.5s (SVG logo + deferred video should help)
- [ ] CLS ≤ 0.1 (explicit width/height on logo, no layout shift from font load)
- [ ] Bundle size impact < 5KB gzipped per section (no new heavy dependencies)
- [ ] No console errors on load at any breakpoint
- [ ] Lighthouse Performance ≥ 80, Accessibility ≥ 90 on mobile

### Global
- [ ] GlowButtons unchanged and functional throughout
- [ ] CTA flow preserved (Store → checkout, Book → contact)
- [ ] No backend/route regressions
- [ ] Build passes (`npm run build`)
- [ ] All 10 breakpoints tested with Playwright screenshots (320, 375, 430, 768, 1024, 1280, 1440, 1920, 2560, 3840)

---

## 8. Implementation Order

Recommended section-by-section to minimize risk:

1. **Hero Section** (biggest visual impact, already planned in detail)
2. **Section Dividers** (quick, sets consistent transitions)
3. **Programs Overview V3** (high-traffic, drives store clicks)
4. **Features Section V2** (already partially themed)
5. **Creative Expression** (needs copy refinement + V1ThemeBridge removal)
6. **Trainer Profiles** (needs placeholder image discussion)
7. **Testimonials** (needs color overhaul)
8. **Fitness Stats** (most complex, Recharts + counter animations)
9. **Instagram Feed** (mostly color/styling)
10. **Newsletter Signup** (.jsx → .tsx + styling)
11. **HomePage.V2.component.tsx** (remove V1ThemeBridge wrappers, update dividers)

Build and Playwright-verify after each section.

---

## 9. Files Summary

### Will Modify (10 files)
```
frontend/src/pages/HomePage/components/Hero-Section.V2.tsx           — Hero redesign
frontend/src/pages/HomePage/components/ProgramsOverview.V3.tsx       — Programs upgrade
frontend/src/components/FeaturesSection/FeaturesSection.V2.tsx       — Features upgrade
frontend/src/pages/HomePage/components/CreativeExpressionSection.tsx  — Creative upgrade
frontend/src/pages/HomePage/components/TrainerProfilesSection.tsx    — Trainer upgrade
frontend/src/components/TestimonialSlider/TestimonialSlider.tsx      — Testimonials upgrade
frontend/src/components/FitnessStats/FitnessStats.tsx                — Stats upgrade
frontend/src/components/InstagramFeed/InstagramFeed.tsx              — Instagram upgrade
frontend/src/components/NewsletterSignup/NewsletterSignup.jsx        — Newsletter upgrade (.jsx→.tsx)
frontend/src/pages/HomePage/components/HomePage.V2.component.tsx     — Remove V1ThemeBridge wrappers
```

### Will Reference (not modify)
```
frontend/src/assets/logo.svg                    — SVG logo (switch to this)
frontend/public/Waves.mp4                       — Video background
frontend/src/components/ui/buttons/GlowButton.tsx — Existing button
frontend/src/pages/DesignPlayground/concepts/EtherealWilderness/ — Theme tokens reference
frontend/src/components/ui/ThemeBridge/V1ThemeBridge.tsx — Remove usage, keep file
```

### Unchanged
```
Navigation, footer, backend routes, API endpoints, Redux store,
routing configuration, checkout/booking/store flows
```
