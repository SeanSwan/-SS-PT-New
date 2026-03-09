# SwanStudios Style Handoff — Homepage, Store, & About Us

> **Purpose:** Complete style reference for Gemini to suggest refactors to the Homepage, Store, and About Us pages. Contains every component file path, every styled-component definition, design tokens, animations, fonts, and current visual state (screenshots taken March 2026).

---

## Table of Contents

1. [Global Design System](#1-global-design-system)
2. [Shared UI Components](#2-shared-ui-components)
3. [Homepage](#3-homepage)
4. [Store Page](#4-store-page)
5. [About Us Page](#5-about-us-page)
6. [Current Visual State (Screenshots)](#6-current-visual-state)
7. [Known Issues & Refactor Opportunities](#7-known-issues--refactor-opportunities)

---

## 1. Global Design System

### Tech Stack
- **Framework:** React 18 + TypeScript
- **Styling:** styled-components (NO Material-UI)
- **Animations:** Framer Motion + CSS keyframes
- **Build:** Vite
- **Routing:** React Router v6

### Design Language: "Ethereal Wilderness" (EW) v2.0

All three pages use the **Ethereal Wilderness** design tokens — a cosmic dark theme built on the Crystalline Swan brand palette.

### EW Design Tokens (used on Homepage & Store)

```typescript
const T = {
  bg: '#0a0a1a',              // Galaxy Core — deepest background
  surface: 'rgba(15, 25, 35, 0.92)', // Glass surface (semi-transparent)
  primary: '#00D4AA',          // Swan Cyan / Teal — primary accent
  secondary: '#7851A9',        // Cosmic Purple — secondary accent
  accent: '#48E8C8',           // Light Cyan — highlight accent
  text: '#F0F8FF',             // Alice Blue — primary text
  textSecondary: '#8AA8B8',    // Steel Blue — muted text
  warningRed: '#ff416c',       // Error/warning red
};
```

### Crystalline Swan Master Palette (used on About page)

The About page uses slightly different tokens — the older Galaxy-Swan theme colors:

```typescript
// Core colors
'#0a0a1a'  — Galaxy Core (background)
'#1e1e3f'  — Dark Navy (gradient endpoint)
'#00FFFF'  — Swan Cyan (accent)
'#7851A9'  — Cosmic Purple (secondary)

// Glass surfaces
'rgba(30, 30, 60, 0.3)'  — Card backgrounds
'rgba(30, 30, 60, 0.25)' — Section overlays

// Text
'white' / 'rgba(255, 255, 255, 0.9)' — Primary text
'rgba(255, 255, 255, 0.8)' — Secondary text
'rgba(255, 255, 255, 0.7)' — Muted text
```

### Extended Crystalline Swan Token File

**File:** `frontend/src/styles/galaxy-swan-theme.ts`

```typescript
// Foundation colors
background.primary: '#002060'  // Midnight Sapphire
background.secondary: '#003080' // Royal Depth

// Primary (Ice Wing / Arctic Cyan)
primary.main: '#60C0F0'   // Ice Wing — MAIN PRIMARY
primary.blue: '#50A0F0'   // Arctic Cyan
primary.deep: '#4070C0'   // Swan Lavender
primary.light: '#90D4F8'  // Light ice

// Secondary (Swan Lavender / Royal Depth)
secondary.main: '#4070C0' // Swan Lavender
secondary.nebula: '#003080' // Royal Depth

// Swan brand
swan.pure: '#E0ECF4'      // Frost White
swan.gold: '#C6A84B'      // Gilded Fern
swan.cyan: '#60C0F0'      // Ice Wing

// Accent
accent.gold: '#C6A84B'    // Gilded Fern
accent.warm: '#D8C478'    // Light gold
```

### Font Stack

| Usage | Font | Weight | Style |
|-------|------|--------|-------|
| Headlines | `'Cormorant Garamond', 'Georgia', serif` | 600 | italic on section titles |
| Body | `'Source Sans 3', 'Source Sans Pro', sans-serif` | 300-500 | normal |
| Buttons | `'Inter', sans-serif` | 500 | normal |
| Fallback | `'Segoe UI', sans-serif` | — | — |

### Responsive Breakpoints

The project targets a 10-breakpoint responsive matrix:
- 320px, 375px, 430px, 768px, 1024px, 1280px, 1440px, 1920px, 2560px, 3840px

In practice, most components use:
- `768px` (tablet → mobile)
- `1024px` (desktop → tablet)
- `600px` / `480px` (small mobile)
- `1200px` (large desktop grid adjustments)

### Core Visual Patterns

1. **Glassmorphism:** `backdrop-filter: blur(10-16px)` + `rgba(15, 25, 35, 0.92)` backgrounds
2. **Gradient borders:** `linear-gradient(45deg, #00D4AA/#00FFFF, #7851A9)`
3. **Glow effects:** `box-shadow: 0 0 20px rgba(0, 212, 170, 0.3)`
4. **Hover lift:** `transform: translateY(-8px)` + intensified box-shadow
5. **Video backgrounds:** Full-bleed video with gradient overlay for text readability
6. **Section dividers:** Subtle gradient lines or mist-drift animations between sections
7. **44px minimum touch targets** on all interactive elements

---

## 2. Shared UI Components

### GlowButton

**File:** `frontend/src/components/ui/buttons/GlowButton.tsx` (655 lines)

The premium CTA button used across all 3 pages. Key features:
- 6 color schemes: `primary`, `accent`, `gilded`, `success`, `danger`, `ghost`
- CSS custom properties for dynamic glow: `--button-glow`, `--button-shine-left`, etc.
- Cursor-tracking glow effect (pointer-x/pointer-y CSS vars)
- Ripple click animation
- Loading spinner state
- `startIcon` / `endIcon` props for icons

```typescript
// Core structure
<ButtonContainer>
  <StyledGlowButton>
    <Gradient />      // Rotating shine layer
    <ButtonSpan>      // Inner content with background + glow spot
      {children}
    </ButtonSpan>
  </StyledGlowButton>
</ButtonContainer>
```

Key styled bits:
```css
/* Rotating gradient border */
.Gradient::before {
  background: linear-gradient(90deg, var(--button-shine-left), var(--button-shine-right));
  animation: rotate 2s linear infinite;
}

/* Hover glow spot follows cursor */
.ButtonSpan::before {
  width: 32px; height: 32px;
  background-color: var(--button-glow);
  filter: blur(20px);
  transform: translate(var(--pointer-x), var(--pointer-y));
}
```

### SectionTitle

**File:** `frontend/src/components/ui/SectionTitle.tsx`

EW-style section title with italic Cormorant Garamond and gradient text (cyan → purple).

### FrostedCard

**File:** `frontend/src/components/ui-kit/glass/FrostedCard.tsx`

Glass card with configurable:
- `glassLevel`: thin | mid | thick | opaque
- `elevation`: 1 | 2 | 3
- `interactive`: boolean (hover effects)
- Respects `prefers-reduced-transparency`

### ParallaxImageBackground

**File:** `frontend/src/components/ui/backgrounds/ParallaxImageBackground.tsx`

Window-scroll-based parallax with spring-smoothed motion. Disables on mobile and `prefers-reduced-motion`.

### Swan Theme Utilities

**File:** `frontend/src/styles/swan-theme-utils.tsx` (413 lines)

Exports reusable styled-components:
- `SwanContainer` — theme-aware container with variant props
- `SwanHeading` — gradient glow heading with level-based sizing
- `GalaxySwanText` — animated shimmer gradient text
- `SwanCard` — interactive glass card
- `glassMorphism` — CSS mixin for glass effects
- Keyframe exports: `swanGlide`, `galaxySwanShimmer`, `elegantGlow`

---

## 3. Homepage

**Route:** `/` (index route)
**Live URL:** `https://sswanstudios.com/`

### Component Tree

```
HomePage.V2.component.tsx          ← Main wrapper
├── HeroSectionV2                  ← Full-viewport hero with video bg
├── SectionDivider
├── ProgramsOverviewV3             ← 3-card program grid
├── SectionDivider
├── FeaturesSectionV2              ← 8-card feature grid
├── SectionDivider
├── CreativeExpressionSection      ← 4-card creative grid
├── SectionDivider
├── TrainerProfilesSection         ← Trainer carousel
├── TestimonialSlider (lazy)       ← Testimonial carousel
├── FitnessStats (lazy)            ← Stats + charts
├── InstagramFeed (lazy)           ← Social feed cards
└── NewsletterSignup (lazy)        ← Email signup form
```

### File Paths

| Component | File Path | Lines |
|-----------|-----------|-------|
| HomePage (main) | `frontend/src/pages/HomePage/components/HomePage.V2.component.tsx` | ~120 |
| Hero Section | `frontend/src/pages/HomePage/components/Hero-Section.V2.tsx` | ~350 |
| Programs Overview | `frontend/src/pages/HomePage/components/ProgramsOverview.V3.tsx` | ~400 |
| Features Section | `frontend/src/components/FeaturesSection/FeaturesSection.V2.tsx` | ~350 |
| Creative Expression | `frontend/src/pages/HomePage/components/CreativeExpressionSection.tsx` | ~400 |
| Trainer Profiles | `frontend/src/pages/HomePage/components/TrainerProfilesSection.tsx` | ~655 |

### Section-by-Section Styles

#### 3.1 Hero Section V2 (`Hero-Section.V2.tsx`)

Full-viewport hero with video background, floating orbs, grid overlay, and glass content card.

**Layout:**
```
┌────────────────────────────────────────────┐
│ [VideoBackground + GradientBackground]      │
│ [MistLayer x3] [GridOverlay] [Orb x5]      │
│                                              │
│      ┌──────────────────────────┐            │
│      │ [Logo - circular, glow]  │            │
│      │ [Badge - "ELITE TRAINING"]│           │
│      │ [Title - Cormorant serif] │           │
│      │ [Subtitle - Source Sans]  │           │
│      │ [Button] [Button]         │           │
│      └──────────────────────────┘            │
│                   glass card                  │
└────────────────────────────────────────────┘
```

**Key Styles:**
- `HeroContainer`: `min-height: 100vh; background: #0a0a1a`
- `VideoBackground`: video at `opacity: 0.35`, gradient overlay: `rgba(10,10,26,0.55)` → `rgba(10,10,26,0.75)`
- `ContentWrapper`: Glass card with `backdrop-filter: blur(16px)`, `border-radius: 24px`, border `rgba(0,212,170,0.08)`
- `Logo`: Circular with `logoHalo` glow animation (pulsing box-shadow) + `gentleFloat` bob
- `Title`: `font-size: clamp(2.4rem, 5vw, 5rem)`, gradient text `#F0F8FF → #48E8C8`
- `Badge`: Pill shape with `rgba(0,212,170,0.08)` bg, cyan text, `letter-spacing: 1.5px`

**Animations:**
- `mistDrift` — slow horizontal drift with scale (18s cycle)
- `orbFloat` — orbs rise 360px then fade out
- `gridPulse` — subtle opacity pulse on dot grid overlay
- `logoHalo` — pulsing cyan box-shadow on logo
- `gentleFloat` — 8px vertical bob

#### 3.2 Programs Overview V3 (`ProgramsOverview.V3.tsx`)

3-column grid of tall program cards with video backgrounds.

**Key Styles:**
- `Section`: `padding: 6rem 2rem`, `border-top: 1px solid rgba(0,212,170,0.25)`
- `Grid`: `grid-template-columns: repeat(3, 1fr)` → 2 at 1024px → 1 at 768px (max-width: 450px centered)
- `Card`: `height: 600px`, glass surface, `border-radius: 16px`, hover lifts -8px with cyan glow shadow
- `VideoBackground`: gradient overlay from `rgba(10,10,26,0.3)` top to `0.98` bottom
- `Badge`: Absolute positioned top-right pill
- `PlanName`: Cormorant Garamond 2rem
- `OutcomeItem`: Checkmark list with cyan SVG icons

#### 3.3 Features Section V2 (`FeaturesSection.V2.tsx`)

4-column grid of feature cards with icon circles.

**Key Styles:**
- `FeaturesGrid`: `repeat(4, 1fr)` at 1024px+ → `repeat(2, 1fr)` → 1 column at 768px
- Each card uses `FrostedCard` (glass effect) with `min-height: 280px`
- `IconContainer`: 72px circle with colored bg `${color}15` and `box-shadow: 0 0 20px ${color}30`
- `FeatureTitle`: Cormorant Garamond 1.4rem
- `FeatureDescription`: Source Sans 0.95rem, muted text
- `BackgroundGlow`: Large blurred radial gradient positioned absolute

#### 3.4 Creative Expression Section (`CreativeExpressionSection.tsx`)

3+1 grid layout (3 cards top row, 1 "Community & Heart" card spans full width).

**Key Styles:**
- `CardGrid`: `repeat(3, 1fr)`, 4th child spans `grid-column: 1 / -1`
- At 1024px: `repeat(2, 1fr)` → 700px: single column
- `ExpressionCard`: Glass card `rgba(15,25,35,0.92)`, `padding: 2.5rem 2rem`
- `.heart-card` variant: `linear-gradient(135deg, surface, rgba(0,212,170,0.06))`, stronger border
- `IconContainer`: 48px SVG with cyan `drop-shadow` glow
- `CardTitle`: 1.8rem Cormorant, gradient text cyan → purple
- `BenefitItem`: Custom `✦` bullet in cyan

#### 3.5 Trainer Profiles Section (`TrainerProfilesSection.tsx`)

Carousel of trainer cards with navigation dots and prev/next buttons.

**Key Styles:**
- `TrainerCard`: Glass card with `diagonalGlimmer` animation (sweeping light)
- `TrainerImage`: `border-radius: 50%` with gradient border ring
- `SpecialtyTag`: Cyan-tinted pill badges
- `Rating`: Gold star icons with count
- `NavigationButton`: 48px circle buttons with glass bg
- `DotsContainer`: Navigation dots with active state glow

---

## 4. Store Page

**Route:** `/store` (also `/swanstudios-store`, `/shop`)
**Live URL:** `https://sswanstudios.com/store`

### Component Tree

```
OptimizedGalaxyStoreFront.tsx     ← Main container + state
├── HeroSection.tsx                ← Full-viewport store hero
├── PackagesWrapper
│   ├── PackagesGrid.tsx           ← Section titles + grid layout
│   │   ├── PackageCard.tsx x5     ← Individual package cards
│   │   │   └── SpecialBadge.tsx   ← Limited offer badges
│   │   └── ...
│   └── ConsultationButtonContainer
└── FloatingCart.tsx                ← FAB cart button
```

### File Paths

| Component | File Path | Lines |
|-----------|-----------|-------|
| StoreFront (main) | `frontend/src/pages/shop/OptimizedGalaxyStoreFront.tsx` | 685 |
| Hero Section | `frontend/src/pages/shop/components/HeroSection.tsx` | 456 |
| Packages Grid | `frontend/src/pages/shop/components/PackagesGrid.tsx` | 320 |
| Package Card | `frontend/src/pages/shop/components/PackageCard.tsx` | 731 |
| Floating Cart | `frontend/src/pages/shop/components/FloatingCart.tsx` | 326 |
| Special Badge | `frontend/src/pages/shop/components/SpecialBadge.tsx` | 120 |

### Section-by-Section Styles

#### 4.1 Store Container (`OptimizedGalaxyStoreFront.tsx`)

**Key Styles:**
- `GalaxyContainer`: `background: #0a0a1a`, star particle pseudo-element (`::before` with radial gradients at fixed positions, `opacity: 0.15`)
- `AuthBanner`: Fixed top bar for non-authenticated users, `backdrop-filter: blur(15px)`, `z-index: 999`
- `SectionContainer`: `max-width: 1400px; padding: 5rem 2rem`
- `LoadingContainer`: Spinner with cyan `border-left` animation
- `ErrorContainer`: Warning red title with retry button

#### 4.2 Store Hero (`HeroSection.tsx`)

Full-viewport hero, same pattern as homepage but with different content.

**Key Styles:**
- `HeroContainer`: `min-height: 100vh; flex centering`
- `VideoBackground`: Dark overlay: `rgba(10,10,26,0.5) → 0.75 → 0.95`
- `LogoContainer`: `height: 160px`, floating animation, cyan drop-shadow
- `HeroContent`: Glass card: `backdrop-filter: blur(16px)`, `border-radius: 16px`, `border: 1px solid rgba(0,212,170,0.15)`
- `PremiumBadge`: Absolute top-right, pill shape, `letter-spacing: 3px`
- `HeroTitle`: Cormorant Garamond 3.2rem
- `AnimatedName`: Shimmer gradient text (`background-size: 200% auto`, 4s cycle)
- `HeroSubtitle`: Source Sans 1.5rem, cyan color
- `ScrollIndicator`: Arrow bounce at bottom, uppercase label

**Animations:**
- `float` — 10px vertical bob (6s)
- `shimmer` — background-position slide (-200% → 200%, 4s)

#### 4.3 Packages Grid (`PackagesGrid.tsx`)

Separates fixed packages and monthly subscriptions into titled sections.

**Key Styles:**
- `SectionTitle`: Cormorant 2.8rem italic, gradient text, underline `::after` (80px gradient line)
- `GalaxyGrid`: `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))` → 3 cols at 1200px → 2 at 900px → 1 at 768px (max-width: 450px centered)
- `PackageSection`: `margin-bottom: 5rem`

#### 4.4 Package Card (`PackageCard.tsx`)

Individual package display with video/image media, price reveal, and CTA.

**Layout:**
```
┌──────────────────────┐
│ [3px accent top bar] │
│ ┌──────────────────┐ │
│ │ CardMedia 220px  │ │  ← Video or gradient image
│ │ [Badge]          │ │
│ └──────────────────┘ │
│ CardContent           │
│  Title (Cormorant)    │
│  Description          │
│  SessionInfo box      │
│  PriceBox (reveal)    │
│  [Add to Cart]        │
└──────────────────────┘
```

**Key Styles:**
- `CardContainer`: `min-height: 520px`, glass surface, `border-radius: 16px`
- `::after`: 3px accent color bar at top (theme-based)
- Hover: `-8px` lift, cyan glow shadow, `z-index: 25`
- `CardMedia`: `height: 220px`, gradient overlay bottom fade
- Video plays inline, no controls visible
- `PriceBox`: Glass sub-card with shimmer `::before`, `min-height: 110px`
- `Price`: Cormorant 2.5rem bold
- `ValueBadge`: Conditional pill (good value = cyan tint, normal = muted)
- `CardActions`: Auto-pushed to bottom with `margin-top: auto`

**Animations:**
- `shimmer` — Subtle background sweep on price box (8s)

#### 4.5 Floating Cart (`FloatingCart.tsx`)

Fixed FAB button bottom-right.

**Key Styles:**
- `CartButton`: `width: 64px; height: 64px; border-radius: 50%`
- `background: linear-gradient(135deg, #7851A9, #00D4AA)`
- `box-shadow: 0 8px 25px rgba(0,0,0,0.4), 0 0 20px rgba(0,212,170,0.3)`
- When items in cart: `PulsingCartButton` with `stellarPulse` animation (glow pulsing 2.5s)
- `CartCount`: Red gradient badge (`#ff416c → #ff6b9d`), `-8px` offset, `border: 2px solid #0a0a1a`

---

## 5. About Us Page

**Route:** `/about`
**Live URL:** `https://sswanstudios.com/about`

### Component Tree

```
About.jsx                          ← Page wrapper with nav dots + orbs
├── Hero.tsx                        ← Full-viewport hero with video
├── AboutContent.tsx                ← Main content (story, stats, timeline, philosophy)
│   ├── TextContent                 ← Founder bio + feature list
│   ├── ImageContainer              ← Logo with ornamental rings
│   ├── StatsContainer              ← 4 animated stat cards
│   ├── TimelineSection             ← 6-node vertical timeline
│   └── PhilosophyCards             ← 4 philosophy cards
├── FixedTestimonialSection.tsx     ← Testimonials section
│   ├── FeaturedCard                ← Featured testimonial (large)
│   ├── TShapedGrid                 ← 4 testimonial cards
│   │   └── Testimonial.tsx x4      ← Individual card
│   └── CTAContainer                ← Call to action
├── ScrollToTopButton
└── FloatingCTABar                  ← Sticky bottom CTA bar
```

### File Paths

| Component | File Path | Lines |
|-----------|-----------|-------|
| About (wrapper) | `frontend/src/pages/about/About.jsx` | ~350 |
| Hero | `frontend/src/pages/about/Hero.tsx` | ~400 |
| AboutContent | `frontend/src/pages/about/AboutContent.tsx` | ~600 |
| FixedTestimonialSection | `frontend/src/pages/about/FixedTestimonialSection.tsx` | ~400 |
| Testimonial (card) | `frontend/src/pages/about/Testimonial.tsx` | ~250 |

### Section-by-Section Styles

#### 5.1 About Page Wrapper (`About.jsx`)

**Key Styles:**
- `AboutPage`: `background-color: #0a0a1a` with dot-grid pattern (`radial-gradient` 50px spacing, purple + cyan dots)
- `::before` overlay: `linear-gradient(135deg, rgba(10,10,26,0.97), rgba(30,30,63,0.97))`
- 3 fixed decorative orbs (TopLeft, BottomRight, Center) with `filter: blur(60px)`, floating animation, hidden on mobile
- `NavDotsContainer`: Fixed right-side nav dots with tooltips on hover
- Active dot: `conic-gradient` spinning ring (cyan → purple, 4s rotation)
- `ScrollToTopButton`: 50px circle, gradient border mask, arrow with cyan glow
- `FloatingCTABar`: Sticky bottom bar with glass bg, border-top cyan

#### 5.2 Hero (`Hero.tsx`)

Full-viewport with video background and animated content.

**Key Styles:**
- `HeroContainer`: `height: 100vh`, gradient bg `#0a0a1a → #1e1e3f`
- `VideoBackground`: `opacity: 0.8`, no gradient overlay (Overlay component handles it)
- `Overlay`: `rgba(10,10,26,0.75)` + animated gradient shift `::before` (cyan + purple, 15s)
- `Content`: flex column center, `::before` glass backdrop appears on hover
- `LogoContainer`: 180px square, floating animation, pulsing glow `::after`
- `Title`: 5rem, gradient text shimmer (`#a9f8fb → #46cdcf → #7b2cbf → #c8b6ff`, 4s)
- `Tagline`: 1.8rem, animated word reveal with `fadeInUp` per word
- `AwardBadges`: Fixed top-right, glass pill badges with cyan dot indicator
- `ScrollIndicator`: Mouse icon with scrolling wheel dot

**Animations:**
- `shimmer`, `float`, `pulseGlow`, `gradientShift` (15s bg animation), `scroll` (wheel), `reveal` (underline), `fadeInUp` (word reveal), `sparkle`

#### 5.3 AboutContent (`AboutContent.tsx`)

Two-column layout (text + image) followed by stats, timeline, and philosophy.

**Key Styles:**
- `AboutSection`: `padding: 6rem 0`, `background: linear-gradient(135deg, #0a0a1a, #1e1e3f)`
- `VideoBackground`: Secondary video at `opacity: 0.5` with dark gradient overlay
- `Title`: 3rem, gradient `span` shimmer, underline `::after` (80px cyan line)
- `Content`: 2-column grid (1fr 1fr) → 1 column at 768px
- `TextContent`: `::first-letter` enlarged (3.5rem cyan), `<strong>` tags are cyan
- `TypedTextContainer`: Left cyan border (3px), italic typed quote with blinking cursor
- `ImageWrapper`: Logo image with `pulseGlow` animation, gradient border mask `::before`
- `OrnamentalElement`: Decorative rotating dashed circles behind image
- `StatCard`: Glass card, hover lifts -10px, counter animation
- `StatNumber`: 3rem, cyan, text-shadow glow
- `TimelineLine`: Vertical gradient line (cyan → purple → cyan)
- `TimelineYear`: 60px gradient circle with dashed spinning outer ring (10s)
- `PhilosophyCard`: Glass card with gradient border mask, hover sweep light `::after`
- `PhilosophyIcon`: 70px circle with dashed spinning border, breathing animation

#### 5.4 Testimonial Section (`FixedTestimonialSection.tsx`)

Featured testimonial + T-shaped grid of 4 more testimonials.

**Key Styles:**
- `TestimonialSectionContainer`: `padding: 6rem 0`, gradient bg with glass `::before` overlay
- `DecorativeOrb`: Blurred colored circles, pulsing animation
- `FeaturedCard`: Large glass card, gradient border mask, 2-column grid (image + text)
- `FeaturedImage`: 120px circle with pulsing glow ring
- `TShapedGrid`: 3-column grid with 4th card centered below (`grid-template-areas`)
  - At 1100px: 2x2 grid
  - At 768px: single column

#### 5.5 Individual Testimonial Card (`Testimonial.tsx`)

**Key Styles:**
- `TestimonialCard`: Glass card `rgba(30,30,60,0.25)`, `border-radius: 20px`
- `::before`: 4px gradient top bar (cyan → purple)
- `::after`: Large decorative `"` character at bottom-right (opacity 0.03)
- `ImageContainer`: 120px circle with gradient pulsing ring `::before`
- `TestimonialName`: On hover → gradient shimmer text
- `Star`: Gold stars with floating animation, staggered delays

---

## 6. Current Visual State

### What Each Page Looks Like (March 2026)

**Screenshots were captured via Playwright on the live production site (sswanstudios.com).**

#### Homepage (`/`)
- Full-viewport hero with smoke/atmospheric video, SwanStudios logo centered, glass content card
- "Forge Your Body, Free Your Spirit" headline in Cormorant Garamond
- Two CTA buttons: "View Packages in Store" (primary glow) + "Book Free Movement Screen"
- Below: 3 program cards with video backgrounds (Express Precision, Signature Performance, Transformation)
- 8-card feature grid (Elite Personal Training, Performance Assessment, Nutrition, Recovery, etc.)
- Creative Expression 4-card section (Dance, Art, Vocal, Community)
- Trainer carousel (Jasmine Hearon featured)
- Testimonial slider with metrics (sprint times, vertical jump, strength gains)
- Stats section with animated charts
- Social feed cards (Facebook, Instagram, YouTube)
- Newsletter signup form
- Full footer with links, contact info, social icons

#### Store (`/store`)
- Hero with swan-on-lake video background, glass content card
- "Elite Training Designed by Sean Swan" with animated name shimmer
- Two CTAs: "Book Consultation" + "View Packages"
- "Premium Training Packages" section with 5 cards:
  - SwanStudios 10-Pack (10 sessions)
  - SwanStudios 24-Pack (24 sessions)
  - SwanStudios 6 Month (108 sessions)
  - SwanStudios 12 Month (208 sessions)
  - SwanStudios Express (10 sessions, 30 min)
- Each card: video media, session count badge, price reveal on click, "Add to Cart" GlowButton
- Floating cart FAB bottom-right with item count badge
- "Schedule Consultation" CTA at bottom

#### About Us (`/about`)
- Hero with palm tree video, SwanStudios logo, animated word-by-word tagline
- Award badges (Top Rated 2025, Excellence Award, #1 Fitness Studio)
- Right-side navigation dots (Welcome, Our Story, Success Stories)
- About content: 2-column layout (story text + logo image with ornamental circles)
- Founder bio (Sean Swan — 25+ years, NASM certified, Kerlan Jobe physical therapy)
- Co-founder mention (Jasmine Swan)
- Certification badges (NASM, ACE, Precision Nutrition, TRX)
- 4 stat cards with animated counters
- Timeline (1998 → 2025) with vertical gradient line
- Philosophy cards (Science-Backed, Personalized, Sustainable, Community)
- Featured testimonial (Emily Carter) with quote
- T-shaped grid of 4 more testimonials
- CTA: "Ready for Your Transformation?"
- Scroll-to-top button with gradient border
- Sticky bottom CTA bar

---

## 7. Known Issues & Refactor Opportunities

### Consistency Issues Across Pages

1. **Two different token systems:** Homepage/Store use EW tokens (`#00D4AA` primary), About uses legacy Galaxy-Swan tokens (`#00FFFF` primary). These need unifying.

2. **Font inconsistency:** About page uses raw `font-weight: 300` everywhere with `'Georgia', serif` fallback. Homepage/Store consistently use Cormorant Garamond for headlines.

3. **Glass surface opacity:**
   - Homepage/Store: `rgba(15, 25, 35, 0.92)`
   - About: `rgba(30, 30, 60, 0.3)` (much more transparent)

4. **Primary accent mismatch:**
   - Homepage/Store: `#00D4AA` (teal-green)
   - About: `#00FFFF` (pure cyan)
   - Crystalline Swan token file: `#60C0F0` (Ice Wing blue)
   - Three different "primary" colors across the site

5. **Section padding inconsistency:**
   - Homepage: `6rem 2rem` → `4rem 1rem` mobile
   - Store: `5rem 2rem` → `3rem 1rem` → `2.5rem 0.75rem`
   - About: `6rem 0` → `4rem 0`

6. **Hover animations:** About page uses `translateY(-10px)`, Homepage/Store use `translateY(-8px)`

### Specific Refactor Targets

- **About page (`About.jsx`):** Written in JSX (not TSX) — should be TypeScript
- **Duplicate keyframes:** `shimmer`, `float`, `pulseGlow` are redefined in every component file. Should be extracted to a shared animation constants file.
- **About page background pattern:** Uses `background-attachment: fixed` which causes jank on mobile Safari. Should be replaced with a pseudo-element or removed on mobile.
- **No semantic CSS variables:** Neither `var(--bg-base)` nor theme context CSS vars are injected. Components hardcode color values.
- **Store card videos:** Auto-play with no controls, which is fine for decoration but lacks `aria-hidden="true"` for accessibility.
- **Button inconsistency:** About page mixes GlowButton with custom-styled buttons that don't match the GlowButton appearance.

### Recommended Unification

| Token | Unified Value | Current Source |
|-------|--------------|----------------|
| `--bg-base` | `#0a0a1a` | All pages agree |
| `--bg-surface` | `rgba(15, 25, 35, 0.92)` | EW standard |
| `--text-primary` | `#F0F8FF` | EW standard |
| `--text-muted` | `#8AA8B8` | EW standard |
| `--accent-primary` | `#00D4AA` or `#60C0F0` | **DECISION NEEDED** |
| `--accent-secondary` | `#7851A9` | EW standard |
| `--accent-gold` | `#C6A84B` | Crystalline Swan |
| `--border-glow` | `rgba(0, 212, 170, 0.12)` | EW standard |
| `--glass-blur` | `blur(16px)` | EW standard |
| `--hover-lift` | `translateY(-8px)` | EW standard |
| `--section-padding` | `6rem 2rem` | Unify to one value |

---

## Appendix: All Animation Keyframes

These keyframes appear across multiple files and should be consolidated:

```css
/* Shared across all pages */
@keyframes shimmer {
  0% { background-position: -200% 0; }  /* or -100% 0 on About */
  100% { background-position: 200% 0; }
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }  /* varies: -5px to -15px */
  100% { transform: translateY(0px); }
}

@keyframes pulseGlow {
  0% { box-shadow: 0 0 15px rgba(120,81,169,0.4); }
  50% { box-shadow: 0 0 25px rgba(120,81,169,0.7); }
  100% { box-shadow: 0 0 15px rgba(120,81,169,0.4); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Homepage-specific */
@keyframes mistDrift { /* horizontal drift with scale */ }
@keyframes orbFloat { /* vertical rise with fade */ }
@keyframes gridPulse { /* opacity 0.015 → 0.04 */ }
@keyframes logoHalo { /* cyan box-shadow pulse */ }
@keyframes gentleFloat { /* 8px vertical bob */ }
@keyframes diagonalGlimmer { /* trainer card light sweep */ }
@keyframes stellarGlow { /* large glow pulse */ }

/* Store-specific */
@keyframes stellarPulse { /* cart FAB glow + scale pulse */ }
@keyframes cartBounce { /* cart count badge bounce */ }

/* About-specific */
@keyframes breathe { /* subtle scale 1 → 1.03 pulse */ }
@keyframes gradientShift { /* background-position 0% → 100% */ }
@keyframes scroll { /* mouse wheel dot scroll */ }
@keyframes reveal { /* scaleX(0) → scaleX(1) underline */ }
@keyframes fadeInUp { /* opacity 0, Y+20 → visible */ }
@keyframes sparkle { /* scale(0) → scale(1) → scale(0) */ }
@keyframes typeWriter { /* width: 0 → 100% */ }
@keyframes revealText { /* same as typeWriter */ }
```

---

*Document generated March 2026 by Claude Code for Gemini style refactor review.*
*Screenshots available: `homepage-full.png`, `store-full.png`, `about-full.png`*
