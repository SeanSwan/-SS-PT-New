# Gemini 3.1 Pro — Design Spec Generation

> **Generated:** 3/5/2026, 12:02:05 PM
> **Mode:** design
> **Duration:** 63.7s
> **Tokens:** 2846 in / 4946 out

---

## Input

# Gemini 3.1 Pro — V4.1 Homepage Complete Redesign Brief

## YOUR ROLE
You are the Lead Design Authority and Co-Orchestrator for SwanStudios. You are redesigning the homepage from scratch using the Cinematic Web Design System. Your previous V4 design was good but incomplete. The owner wants a COMPREHENSIVE redesign that is BETTER than V4 and includes ALL sections that V3 had.

## CRITICAL OWNER FEEDBACK ON V4
1. **NO PRICES on the front page** — Remove all pricing. Programs section should 

---

## Gemini 3.1 Pro Response

**To: Claude (Lead Software Engineer)**
**From: Lead UI/UX Design Authority & Co-Orchestrator**
**Subject: Architectural Blueprint & Design Specification — SwanStudios V4.1 Homepage Redesign**

Claude, we are executing a complete, ground-up redesign of the SwanStudios homepage. The V4 iteration lacked the depth, narrative flow, and cinematic quality our brand demands. We are moving to V4.1. 

This is not a standard SaaS landing page. This is a **Cinematic Web Experience**. Every pixel must earn its place. We are utilizing heavy glassmorphism, weighted motion, multi-layered parallax, and a strict "No AI Slop" policy. 

Below is the definitive design specification. You will use this to implement the React/TypeScript/styled-components architecture. Do not deviate from these values.

---

### 1. GLOBAL DESIGN TOKENS & SYSTEM RULES

#### A. Color Palette (Galaxy-Swan Theme)
```css
/* Theme Object Reference */
colors: {
  galaxyCore: '#0a0a1a',
  swanCyan: '#00FFFF',
  cosmicPurple: '#7851A9',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  glassBg: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassHover: 'rgba(255, 255, 255, 0.06)',
  cyanGlow: 'rgba(0, 255, 255, 0.15)',
  purpleGlow: 'rgba(120, 81, 169, 0.15)'
}
```

#### B. Typography & Fluid Sizing
- **Font Family**: Inter (or system sans-serif), fallback to sans-serif.
- **Headings**: `clamp(2.5rem, 5vw + 1rem, 5.5rem)`, Weight: 800, Tracking: `-0.02em`, Line-height: `1.1`.
- **Subheadings**: `clamp(1.25rem, 2vw + 0.5rem, 1.75rem)`, Weight: 400, Tracking: `0.01em`, Line-height: `1.4`.
- **Body**: `clamp(1rem, 1vw + 0.5rem, 1.125rem)`, Weight: 400, Line-height: `1.6`.

#### C. Cinematic Motion & Easing
- **Weighted Easing Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` (Mandatory for all transforms/opacity).
- **Stagger Delay**: `0.1s` between sibling elements.
- **Hover Transitions**: `0.3s ease-out`.

#### D. Global Effects
1. **Noise Overlay**: A fixed, pointer-events-none SVG `<feTurbulence>` filter covering the viewport at `0.04` opacity.
2. **Section Dividers**: `height: 1px; background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent);`
3. **Touch Targets**: Minimum `44px` height/width on all interactive elements.

---

### 2. FRAMER MOTION VARIANTS (Copy-Paste Ready)

Claude, implement these exact variants using `framer-motion`. Wrap them in a check for `useReducedMotion`.

```typescript
// Cinematic Blur-to-Sharp Reveal
export const cinematicReveal = {
  hidden: { opacity: 0, y: 40, filter: 'blur(12px)', scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)', 
    scale: 1,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
  }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 }
  }
};

export const glassCardHover = {
  rest: { y: 0, scale: 1, boxShadow: '0px 4px 20px rgba(0,0,0,0.2)' },
  hover: { 
    y: -8, 
    scale: 1.02, 
    boxShadow: '0px 20px 40px rgba(0, 255, 255, 0.1)',
    borderColor: 'rgba(0, 255, 255, 0.3)',
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  }
};
```

---

### 3. SECTION-BY-SECTION ARCHITECTURE

#### Section 1: HERO — "The Event Horizon"
- **Layout**: `100dvh`, `display: flex`, `align-items: center`, `justify-content: center`, `text-align: center`.
- **Background Layering (z-index)**:
  1. `z-0`: `<video src="/videos/swan.mp4" autoPlay loop muted playsInline object-fit="cover" />`
  2. `z-1`: `<div background="rgba(10, 10, 26, 0.6)" />` (Darkening overlay)
  3. `z-2`: `<motion.div>` Parallax Image (`/images/parallax/hero-swan-bg.png`). Parallax mapping: `y: useTransform(scrollYProgress, [0, 1], ['0%', '30%'])`.
  4. `z-3`: Noise Overlay.
  5. `z-10`: Content Container.
- **Content**: Logo (floating animation: `y: [0, -10, 0]`, duration 4s, repeat infinity), Eyebrow ("PREMIUM PERSONAL TRAINING"), Headline ("ELEVATE YOUR EXISTENCE"), Subhead, 2 CTAs (GlowButton).
- **Scroll Indicator**: Bottom 40px, absolute, chevron down, bouncing.

#### Section 2: FEATURES — "The Arsenal"
- **Background**: Parallax Image (`/images/parallax/features-swan-bg.png`), `opacity: 0.4`. Parallax mapping: `y: [-15%, 15%]`.
- **Layout**: CSS Grid. `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;`
- **Cards**: Glassmorphism. Padding `32px`. Icon size `32px`, color `swanCyan`.
- **Data**:
  ```javascript
  [
    { icon: Dumbbell, title: "Elite Personal Training", desc: "Bespoke 1-on-1 protocols." },
    { icon: Activity, title: "Performance Assessment", desc: "Biomechanical analysis." },
    { icon: Apple, title: "Nutrition Coaching", desc: "Metabolic optimization." },
    { icon: Heart, title: "Recovery & Mobility", desc: "Tissue regeneration." },
    { icon: Monitor, title: "Online Coaching", desc: "Global digital access." },
    { icon: Users, title: "Group Performance", desc: "Synchronized team training." },
    { icon: Target, title: "Sports-Specific", desc: "Athletic translation." },
    { icon: Building2, title: "Corporate Wellness", desc: "Executive health scaling." }
  ]
  ```

#### Section 3: PROGRAMS — "Ascension Protocols" (NO PRICES)
- **Layout**: Flexbox, `flex-direction: row` (stacks to column on `< 1024px`). `gap: 32px`.
- **Cards**: 3 cards. The middle card ("Signature Performance") has `transform: scale(1.05)` on desktop and a subtle `cyanGlow` box-shadow.
- **Content per card**: Title, Session Duration (e.g., "60-Minute Sessions"), "What's Included" (ul > li with checkmarks). NO DOLLAR AMOUNTS.
- **CTA**: Centered below cards. "View All Packages" -> `/shop`.

#### Section 4: GOLF PERFORMANCE — "The Fairway"
- **Background**: Parallax Image (`/images/parallax/golf-section-bg.png`), `opacity: 0.5`. Parallax mapping: `y: [-20%, 20%]`.
- **Layout**: Split 50/50 on desktop (`grid-template-columns: 1fr 1fr`), stacks on mobile.
- **Left Column**: Title "Master The Fairway". List of 5 features with Lucide `Target` icons.
  - *Rotational Power Training, Core Stability & Balance, Flexibility & Mobility, Injury Prevention, Movement Analysis.*
- **Right Column**: Large Glass Card. Summary text of Sean's golf biomechanics expertise. CTA "Improve Your Game" -> `/shop`.

#### Section 5: ABOUT SEAN SWAN — "The Architect"
- **Layout**: Container max-width `1200px`. Top section: Bio text + Floating Logo. Bottom section: 3 Approach Cards in a grid.
- **Key Facts to Include**: NCEP-certified (1998), 25+ years experience, NASM protocols, LA Fitness/Gold's Gym/24 Hour experience.
- **Approach Cards**:
  1. Deep Client Research
  2. AI-Optimized Programming
  3. Privacy & Rehabilitation

#### Section 6: TESTIMONIALS — "The Echoes"
- **Background**: Parallax Image (`/images/parallax/testimonials-swan-bg.png`), `opacity: 0.3`.
- **Cards**: 3 cards. Include 5 solid stars (Lucide `Star`, fill `#00FFFF`).
- **Data**:
  1. Sarah J., Corporate Exec — "Lost 42 lbs in 7 months" (Badge: Weight Loss)
  2. Robert T., Avid Golfer — "Added 35 yards to drive, handicap dropped 6 strokes" (Badge: Golf Performance)
  3. Officer Martinez, Law Enforcement — "1.5 mile run improved by 2:30" (Badge: Tactical Fitness)

#### Section 7: STATISTICS — "The Proof"
- **Layout**: Grid of 6. `grid-template-columns: repeat(3, 1fr)` on desktop, `repeat(2, 1fr)` tablet, `1fr` mobile.
- **Interaction**: Use `framer-motion` `useInView`. When in view, trigger a count-up animation from 0 to target number over `2.5s` using `easeOut`.
- **Stats**: 25+ (Years), 500+ (Clients), 10,000+ (Sessions), 312 (Swimmers), 12,450+ (Lbs Lost), 98% (Satisfaction).

#### Section 8: SOCIAL COMMUNITY — "Beyond the Gym"
- **Background**: Video (`/videos/smoke.mp4`), `opacity: 0.4`, `mix-blend-mode: screen`.
- **Layout**: Masonry or staggered grid of 6 cards.
- **Categories**: Dance & Movement, Music & Singing, Art & Expression, Gaming, Fitness Challenges, Community Meetups.
- **Visuals**: Each card needs a subtle gradient overlay matching the `cosmicPurple` token.

#### Section 9: FINAL CTA — "The Singularity"
- **Layout**: Full-width container, `padding: 120px 24px`.
- **Design**: Massive glassmorphism panel (`max-width: 1000px`, `margin: 0 auto`). Heavy blur (`24px`).
- **Content**: "Ready to Ascend?", "Join the elite tier of human performance.", 2 Buttons (Primary GlowButton -> `/shop`, Secondary Glass Button -> `/contact`).

---

### 4. STYLED-COMPONENTS ARCHITECTURE (Implementation Code)

Claude, use the following foundational styled-components. I have pre-calculated the responsive clamps, glassmorphism math, and touch targets.

```typescript
import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';

// --- GLOBAL UTILS ---
export const SectionDivider = styled.div`
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg, 
    transparent 0%, 
    ${({ theme }) => theme.colors?.swanCyan || '#00FFFF'}40 50%, 
    transparent 100%
  );
  margin: 0;
  opacity: 0.6;
`;

export const NoiseOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
`;

// --- LAYOUT COMPONENTS ---
export const PageWrapper = styled.main`
  background-color: ${({ theme }) => theme.colors?.galaxyCore || '#0a0a1a'};
  color: ${({ theme }) => theme.colors?.textPrimary || '#FFFFFF'};
  overflow-x: hidden;
  position: relative;
`;

export const Section = styled.section<{ $padding?: string }>`
  position: relative;
  width: 100%;
  padding: ${({ $padding }) => $padding || 'clamp(4rem, 10vw, 8rem) clamp(1rem, 5vw, 2rem)'};
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
`;

export const Container = styled.div`
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
`;

// --- TYPOGRAPHY ---
export const Eyebrow = styled(motion.span)`
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: ${({ theme }) => theme.colors?.swanCyan || '#00FFFF'};
  margin-bottom: 1rem;
  display: block;
  font-weight: 600;
`;

export const Headline = styled(motion.h1)`
  font-size: clamp(2.5rem, 5vw + 1rem, 5.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 1.5rem;
  background: linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const SectionTitle = styled(motion.h2)`
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
  text-align: center;
  margin-bottom: clamp(2rem, 5vw, 4rem);
`;

// --- GLASSMORPHISM CARDS ---
export const GlassCard = styled(motion.div)`
  background: ${({ theme }) => theme.colors?.glassBg || 'rgba(255, 255, 255, 0.03)'};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${({ theme }) => theme.colors?.glassBorder || 'rgba(255, 255, 255, 0.08)'};
  border-radius: 24px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  transition: border-color 0.3s ease;

  /* 44px Touch Target enforcement for internal links/buttons */
  a, button {
    min-height: 44px;
    min-width: 44px;
  }
`;

// --- PARALLAX BACKGROUNDS ---
export const ParallaxBg = styled(motion.div)<{ $bgImage: string, $opacity?: number }>`
  position: absolute;
  top: -20%;
  left: 0;
  width: 100%;
  height: 140%; /* Extra height to accommodate parallax travel */
  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  opacity: ${({ $opacity }) => $opacity || 0.4};
  z-index: 1;
  pointer-events: none;
`;

// --- RESPONSIVE GRIDS ---
export const Grid = styled(motion.div)<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  width: 100%;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(${({ $cols }) => $cols || 4}, 1fr);
    gap: 2rem;
  }
`;
```

---

### 5. PARALLAX IMPLEMENTATION LOGIC

Claude, you must use `useScroll` and `useTransform` for the 4 generated Nano Banana 2 images. Here is the exact hook implementation pattern you will use for each section:

```typescript
import { useRef } from 'react';
import { useScroll, useTransform } from 'framer-motion';

// Inside your Section Component:
const sectionRef = useRef<HTMLElement>(null);
const { scrollYProgress } = useScroll({
  target: sectionRef,
  offset: ["start end", "end start"]
});

// Parallax speed 0.3x - 0.5x
const yParallax = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

// In JSX:
// <Section ref={sectionRef}>
//   <ParallaxBg style={{ y: yParallax }} $bgImage="/images/parallax/features-swan-bg.png" />
//   <Container>...</Container>
// </Section>
```

---

### 6. ACCESSIBILITY & RESPONSIVE STRATEGY

1. **prefers-reduced-motion**: Wrap all `framer-motion` variants with the custom hook. If `useReducedMotion` is true, strip the `y` transforms and `filter` blurs, leaving only a simple `opacity: 0 -> 1` fade.
2. **Breakpoints**: 
   - `< 768px` (Mobile): Grids collapse to 1 column. Padding reduces to `4rem 1rem`. Typography scales down via `clamp`.
   - `768px - 1024px` (Tablet): Grids to 2 columns. Golf section remains stacked but image/text side-by-side.
   - `> 1024px` (Desktop): Full cinematic layout. Hover effects active. Parallax fully visible.
3. **ARIA**: Ensure all `GlowButton` and interactive elements have descriptive `aria-label`s. Ensure the video backgrounds have `aria-hidden="true"`.

---

### EXECUTION MANDATE

Claude, this specification provides the exact CSS values, animation curves, and structural layout required. 
1. Build the `Homepage.tsx` integrating all 9 sections.
2. Create sub-components for complex sections (e.g., `HeroSection.tsx`, `GolfPerformanceSection.tsx`) to keep the file clean.
3. Inject the `SectionDivider` between every section.
4. Ensure **NO PRICES** are hardcoded in the Programs section.

Proceed with the implementation. I will review the PR for pixel-perfect adherence to this cinematic vision.

---

*SwanStudios Co-Orchestrator — Gemini 3.1 Pro (Lead Design Authority)*
