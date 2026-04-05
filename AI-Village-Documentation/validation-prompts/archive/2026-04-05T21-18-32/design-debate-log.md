# UX/UI Design Quality — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 5
> **Tokens:** 23,772 input / 7,980 output

---

## Creative Director (Lead Design Authority) — Round 1

Listen to me, Claude. I’ve read the UX/Accessibility Audit. It’s thorough, it’s clinical, and it’s exactly why I need to step in before engineering turns my Crystalline Swan vision into a sterile, compliance-driven spreadsheet. 

We are building a **luxury personal training platform**. Our clients wear Rolexes, drive Porsches, and expect digital experiences that feel like stepping into a high-end vault. Yes, we will be WCAG 2.1 AA compliant. Yes, we will be accessible. But we will do it with *absolute uncompromising style*. We do not degrade the design for accessibility; we engineer accessibility *into* the luxury.

Here are my absolute, non-negotiable directives for Round 1. Update the blueprints immediately.

---

### 1. The Glass Morphism Contrast Crisis
**Severity:** CRITICAL
**File & Location:** `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-UX-OVERHAUL-PLAN.md` -> Design Tokens
**Design Problem:** The auditor is right. `rgba(0, 32, 96, 0.4)` (Midnight Sapphire at 40%) over a variable background will cause `Frost White #E0ECF4` text to fail WCAG AA contrast ratios. It will look muddy and cheap.
**Design Solution:** We do not abandon glass; we deepen the vault. 
*   **New Glass Token:** `--glass-bg: rgba(0, 48, 128, 0.65);` (A calculated opacity of Royal Depth #003080).
*   **Blur:** Increase to `backdrop-filter: blur(24px);` to smooth out background noise.
*   **Text Treatment:** All `Frost White #E0ECF4` text inside a `GlassCard` MUST have a subtle text shadow to guarantee legibility regardless of the background image. `text-shadow: 0 2px 4px rgba(10, 10, 15, 0.5);` (Obsidian Black).
**Implementation Notes:**
1. Update the CSS variables in the global theme.
2. Build a contrast-checker utility in the CI/CD pipeline. If text on a GlassCard fails 4.5:1, the build fails.

### 2. The Screen Reader "Gibberish" Problem (TextSplitter)
**Severity:** HIGH
**File & Location:** `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-UX-OVERHAUL-PLAN.md` -> Reusable Animation Components
**Design Problem:** Splitting text into `<span>S</span><span>w</span><span>a</span><span>n</span>` for our staggered animations will cause screen readers to read it as individual letters. Unacceptable UX.
**Design Solution:** We use the "Aria-Hidden Double" technique.
**Implementation Notes:**
1. The `TextSplitter` React component must render TWO elements.
2. Element 1: `<span className="sr-only">SwanStudios</span>` (Visually hidden, read by screen readers).
3. Element 2: `<span aria-hidden="true">` containing the animated, split `<span>` characters.
4. *Do not* compromise the `Plus Jakarta Sans` or `Cormorant Garamond Italic` animations. The visual layer remains flawless; the semantic layer remains invisible.

### 3. Focus Rings: The Dual-Glow Mandate
**Severity:** HIGH
**File & Location:** Global CSS / Styled Components Base
**Design Problem:** Default browser focus rings (that ugly blue outline) will instantly destroy the Enchanted Apex aesthetic. But keyboard users need to know where they are.
**Design Solution:** We weaponize our Dual-Button Glow tokens for accessibility.
*   **Primary Focus Ring:** `outline: 2px solid #8B5CF6; outline-offset: 4px;` (Wing Purple).
*   **Secondary Focus Ring (for Purple elements):** `outline: 2px solid #60C0F0; outline-offset: 4px;` (Ice Wing).
*   **Transition:** `transition: outline-offset 0.2s var(--ease-smooth);`
**Implementation Notes:**
1. Apply this globally using `:focus-visible`. Do *not* use `:focus` (we don't want rings on mouse clicks).
2. Ensure the `outline-offset` animates from `0px` to `4px` when focused, giving a premium "expanding" feel.

### 4. Reduced Motion: The "Elegant Fallback"
**Severity:** CRITICAL
**File & Location:** `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-UX-OVERHAUL-PLAN.md` -> Animation Library Choice
**Design Problem:** Disabling all animations for `prefers-reduced-motion` makes the site look broken and cheap.
**Design Solution:** We don't stop the motion; we *change the physics*. 
*   **Parallax:** `y` transforms become `0`. Backgrounds lock in place.
*   **Staggered Reveals:** `y: 50` (slide up) becomes `y: 0`. We rely *only* on `opacity: 0` to `opacity: 1`.
*   **Duration:** Cross-fades happen at `--duration-fast` (0.3s) instead of `--duration-slow` (1.2s).
**Implementation Notes:**
1. Create a custom hook: `useSwanMotion()`.
2. This hook must check Framer Motion's `useReducedMotion()`.
3. If true, return a stripped-down variant object (opacity only, no transforms, no spring physics). All developers MUST use `useSwanMotion()` instead of raw Framer Motion variants.

### 5. Mobile Touch Targets & The "Fat Finger" Tax
**Severity:** HIGH
**File & Location:** Global UI Components
**Design Problem:** 44x44px is the WCAG minimum. 44px is for standard apps. We are a luxury app.
**Design Solution:** Minimum interactive hit area is **48x48px**. 
*   If a visual button or icon (like the "Sticky sidebar navigation dots") is visually smaller (e.g., an 8px dot), it MUST have a transparent pseudo-element (`::after`) expanding its clickable area to 48x48px.
**Implementation Notes:**
1. Add a mixin to styled-components: `${touchTarget()}`.
2. `position: relative; &::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; }`

### 6. Crystalline Skeleton Loaders
**Severity:** MEDIUM (Visually CRITICAL)
**File & Location:** `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-UX-OVERHAUL-PLAN.md` -> Loading States (New Section)
**Design Problem:** Standard grey skeleton loaders look like a cheap SaaS template.
**Design Solution:** "Crystalline Shimmer". 
*   **Base:** `Carbon #141419`
*   **Shimmer Gradient:** `linear-gradient(90deg, transparent, rgba(96, 192, 240, 0.1), transparent)` (Ice Wing at 10% opacity).
*   **Animation:** Smooth infinite pan from left to right.
**Implementation Notes:**
1. Create a `<Skeleton />` component.
2. Apply a subtle `border: 1px solid rgba(224, 236, 244, 0.05)` (Frost White 5%) to give the skeleton physical boundaries matching our GlassCards.

---

### Claude, your turn.
I have laid down the law on the visual execution of these accessibility requirements. Review my solutions. Do you see any technical bottlenecks in implementing the `useSwanMotion` hook or the Aria-Hidden Double technique with Framer Motion? 

Do not suggest changing the colors. The Crystalline Swan palette is locked. Defend your engineering approach.

---

## Design Implementation Reviewer — Round 2

# Design Implementation Review — Round 1

## Summary

The Creative Director's directives demonstrate strong intent to fuse accessibility with luxury aesthetics. I **agree with the core philosophy** across all six points. However, I have identified **four technical concerns** that require clarification before engineering can proceed confidently.

---

## Agreement: Points 2, 3, 5

| Directive | Verdict | Notes |
|-----------|---------|-------|
| **TextSplitter Aria-Hidden Double** | ✅ **AGREE** | Industry-standard pattern. Exact implementation matches Stripe/Linear conventions. |
| **Focus Rings: Dual-Glow Mandate** | ✅ **AGREE** | `:focus-visible` is correct (not `:focus`). Wing Purple and Ice Wing are appropriate brand colors. |
| **Mobile Touch Targets** | ✅ **AGREE** | The `${touchTarget()}` mixin with `::after` pseudo-element is technically sound. |

---

## Dispute #1: Glass Morphism Contrast Checking

### The Problem

**File:** `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-UX-OVERHAUL-PLAN.md` → Design Tokens

> *"Build a contrast-checker utility in the CI/CD pipeline. If text on a GlassCard fails 4.5:1, the build fails."*

**Technical Concern:** You cannot statically verify contrast ratios for glassmorphism in CI/CD.

Glassmorphism is **dynamic**. The semi-transparent background composites with whatever image or gradient exists behind it. A contrast-checker cannot:

1. Predict which background image will be displayed at runtime
2. Calculate the composite color resulting from `rgba(0, 48, 128, 0.65)` blended over an arbitrary photograph
3. Determine the final luminance after `backdrop-filter: blur(24px)` redistributes neighboring pixels

### Proposed Alternative

Replace the CI/CD static checker with **runtime verification**:

```javascript
// hooks/useGlassContrastCheck.js
import { useEffect, useState } from 'react';

export const useGlassContrastCheck = (textElementRef, glassElementRef) => {
  const [passesContrast, setPassesContrast] = useState(false);
  
  useEffect(() => {
    // Use chroma.js or similar for runtime luminance calculation
    // after element composites with its background
    const checkContrast = () => {
      // Implementation would sample pixel colors and compute ratio
    };
    
    window.addEventListener('resize', checkContrast);
    return () => window.removeEventListener('resize', checkContrast);
  }, []);
  
  return passesContrast;
};
```

**For CI/CD:** Use a **simulated background approach** — test GlassCard contrast against worst-case and best-case backgrounds (pure white, pure black, brand image samples). Flag if any scenario fails.

---

## Dispute #2: Text Shadow on Frost White

### The Problem

**File:** `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-UX-OVERHAUL-PLAN.md` → Design Tokens

> *`text-shadow: 0 2px 4px rgba(10, 10, 15, 0.5);` (Obsidian Black)*

**Optical Concern:** Frost White (`#E0ECF4`) is already a light tint. Adding a dark shadow to light text can **reduce perceived contrast** and create a "foggy" appearance, especially when the text is small.

The text-shadow approach works well for **dark text on light backgrounds** (creating a halo that extends readability). For **light text on glass**, the shadow darkens the text itself.

### Proposed Alternative

Use **text-shadow only when necessary** (small font sizes, thin weights), and consider a **subtle glow instead**:

```css
/* For headings (Cormorant Garamond Italic, large) */
.GlassCard h2 {
  /* No shadow needed — already high contrast at scale */
}

/* For body text (Plus Jakarta Sans, small) */
.GlassCard p {
  text-shadow: 0 0 8px rgba(224, 236, 244, 0.3);
  /* Subtle luminous halo instead of dark shadow */
}
```

**Recommendation:** Add a design token `--text-glow: 0 0 8px rgba(224, 236, 244, 0.3);` and apply conditionally based on font size.

---

## Dispute #3: `useSwanMotion` Hook — Incomplete Specification

### The Problem

**File:** `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-UX-OVERHAUL-PLAN.md` → Animation Library Choice

The directive proposes the hook but does not define the **return shape**. This will cause inconsistent implementations across the codebase.

### Proposed Implementation

```javascript
// hooks/useSwanMotion.js
import { useReducedMotion } from 'framer-motion';

export const MOTION_VARIANTS = {
  standard: {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }
    }
  },
  reduced: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 } // --duration-fast
    }
  }
};

export const useSwanMotion = (variantType = 'standard') => {
  const prefersReducedMotion = useReducedMotion();
  
  return {
    initial: 'hidden',
    animate: 'visible',
    variants: prefersReducedMotion 
      ? MOTION_VARIANTS.reduced 
      : MOTION_VARIANTS[variantType]
  };
};
```

**Usage in components:**
```jsx
const MotionDiv = () => {
  const motionProps = useSwanMotion('standard');
  return <motion.div {...motionProps}>Content</motion.div>;
};
```

---

## Dispute #4: Skeleton Loaders — Missing Accessibility

### The Problem

**File:** `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-UX-OVERHAUL-PLAN.md` → Loading States

The Crystalline Shimmer specification is visually correct, but **missing screen reader support**. A skeleton without accessible loading announcement is inaccessible.

### Proposed Implementation

```jsx
// components/Skeleton.jsx
const Skeleton = ({ width, height, borderRadius, label = 'Loading content...' }) => (
  <>
    <div
      role="status"
      aria-live="polite"
      className="sr-only"
    >
      {label}
    </div>
    <div
      className="skeleton-crystalline"
      style={{
        width,
        height,
        borderRadius,
      }}
      aria-hidden="true"
    />
  </>
);
```

**Additional CSS:**
```css
.skeleton-crystalline {
  background: #141419;
  border: 1px solid rgba(224, 236, 244, 0.05);
  position: relative;
  overflow: hidden;
}

.skeleton-crystalline::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg, 
    transparent, 
    rgba(96, 192, 240, 0.1), 
    transparent
  );
  animation: crystalline-shimmer 1.5s infinite;
}
```

---

## Summary of Disputes

| # | Directive | Issue | Requested Change |
|---|-----------|-------|------------------|
| 1 | Glass Morphism | CI/CD cannot statically check dynamic contrast | Runtime verification approach + simulated CI tests |
| 2 | Text Shadow | Dark shadow on light text may reduce legibility | Conditional glow approach for smaller text |
| 3 | `useSwanMotion` | Hook return shape undefined | Complete specification with `MOTION_VARIANTS` |
| 4 | Skeleton Loaders | Missing `role="status"` for screen readers | Add hidden live region announcement |

---

## Request to Creative Director

1. Confirm the **runtime contrast verification approach** is acceptable
2. Clarify whether text glow should replace shadow for body text
3. Approve the `useSwanMotion` hook specification
4. Approve the skeleton accessibility additions

Once these four points are resolved, I will draft the **implementation tickets** for engineering.

---

## Creative Director (Lead Design Authority) — Round 3

This is exactly the kind of rigorous pushback I expect. You caught the accessibility gap in the skeletons, and you formalized the motion hook beautifully. 

Let's clear the board: **I officially approve your implementations for Dispute #3 (`useSwanMotion` hook) and Dispute #4 (Skeleton Loaders).** Your code for both is elegant and production-ready. Update `components/Skeleton.jsx` and `hooks/useSwanMotion.js` exactly as you wrote them.

Now, let’s address where we still diverge. We need to protect both performance and optical clarity.

---

### Dispute #1: Glass Morphism Contrast Checking
**Verdict:** PARTIAL DISAGREEMENT (Reject Runtime, Accept Simulated CI)

You are entirely correct that static CI/CD cannot calculate `backdrop-filter` composites. However, I **absolutely veto** the `useGlassContrastCheck` runtime pixel-sampling hook. 

Running JavaScript to sample pixel luminance on `window.resize` or scroll will cause layout thrashing and destroy our 60fps performance target. A luxury experience cannot stutter. 

**The Solution:** We go all-in on your second suggestion—**Simulated CI/CD Testing via Headless Browser**.
1.  **File:** `tests/e2e/accessibility/glass-contrast.spec.ts` (New Playwright test).
2.  **Implementation:** We render the `GlassCard` component over our 5 core brand background images (including the brightest "Alpine Morning" and darkest "Midnight Vault" assets).
3.  Playwright will take a screenshot of the composited element and run an automated contrast analysis (using a tool like `axe-core` or a custom pixel-reader in the test environment, *not* in the client's browser).
4.  If the composite fails 4.5:1 in the test environment, the build fails. The client's browser does zero contrast-calculation work.

### Dispute #2: Text Shadow on Frost White
**Verdict:** DISAGREE (Reject White Glow, Refine Dark Shadow)

Your optical theory regarding the "foggy" appearance of dark shadows on light text is valid for standard web design, but your proposed solution—a luminous white halo (`text-shadow: 0 0 8px rgba(224, 236, 244, 0.3)`)—is a critical accessibility hazard. 

If that GlassCard sits over a bright section of a background image, a white glow behind white text will completely obliterate the letterforms' edge definition. It creates a smudge, not a separation. We *must* use a dark shadow to anchor the text, but I concede that my original `0 2px 4px` is too heavy for small body copy.

**The Solution:** We split the token based on typography scale to ensure crispness.

**File:** `styles/design-tokens.css` (or styled-components theme)

```css
/* For Headings (Cormorant Garamond Italic - Large/Display) */
--glass-text-shadow-display: 0 2px 4px rgba(10, 10, 15, 0.5); /* Original: Soft, elegant depth */

/* For Body Text (Plus Jakarta Sans - Small/UI) */
--glass-text-shadow-ui: 0 1px 2px rgba(10, 10, 15, 0.85); /* New: Tighter, darker, sharper edge definition */
```

**Implementation Notes:**
Apply `--glass-text-shadow-ui` to all `<p>`, `<span>`, and `<li>` elements inside a `GlassCard`. This acts almost like a microscopic stroke, guaranteeing WCAG contrast without muddying the letterforms.

---

### Your Turn
Review the Playwright CI/CD approach for the glass contrast, and confirm the split text-shadow tokens. If you agree that this protects both our 60fps performance budget and our WCAG compliance, we can close these out and move to implementation.

---

## Design Implementation Reviewer — Round 4

# Design Implementation Review — Round 2

## Status: CONSENSUS APPROACHING

The Creative Director has provided excellent resolutions to both disputed items. I am prepared to agree on all remaining points.

---

## Agreement: Dispute #1 — Glass Contrast CI/CD

### Assessment

The Creative Director's **Playwright-based headless testing** is objectively superior to my proposed runtime pixel-sampling hook. My original proposal had a critical flaw:

| Approach | Performance Impact | Verdict |
|----------|-------------------|---------|
| My `useGlassContrastCheck` hook | `window.resize` event + pixel sampling in client browser = layout thrashing, 60fps violation | ❌ Rejected |
| Playwright headless testing | Zero client overhead; runs once in CI pipeline | ✅ **ACCEPTED** |

The proposed test file structure is sound:

```typescript
// tests/e2e/accessibility/glass-contrast.spec.ts
import { test, expect } from '@playwright/test';

const BRAND_BACKGROUNDS = [
  'alpine-morning.jpg',      // Brightest - worst case
  'golden-hour.jpg',
  'studio-neutral.jpg',
  'twilight-haze.jpg',
  'midnight-vault.jpg'        // Darkest - best case
];

for (const bg of BRAND_BACKGROUNDS) {
  test(`GlassCard contrast against ${bg}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      // Set the background dynamically for testing
      document.body.style.backgroundImage = `url('/backgrounds/${bg}')`;
    });
    
    const glassCard = page.locator('.GlassCard');
    await expect(glassCard).toHaveContrastRatio(4.5, { backgroundImage: bg });
  });
}
```

**Consensus:** The simulated CI approach protects the 60fps performance budget while guaranteeing WCAG compliance across all brand backgrounds.

---

## Agreement: Dispute #2 — Split Text-Shadow Tokens

### Assessment

The Creative Director's rejection of the luminous white glow was **correct and necessary**. My proposal would have created readability failures over bright background sections:

| Approach | Alpine Morning (Bright) | Midnight Vault (Dark) | Verdict |
|----------|------------------------|----------------------|---------|
| `text-shadow: white glow` | Text merges with halo = illegible | Text floats cleanly | ❌ |
| `text-shadow: dark shadow` | Text anchored against bright bg | Text reads well | ✅ |

The refined split tokens are optically superior:

```css
/* styles/design-tokens.css */
:root {
  /* For Headings — Cormorant Garamond Italic (18px+) */
  --glass-text-shadow-display: 0 2px 4px rgba(10, 10, 15, 0.5);
  
  /* For Body — Plus Jakarta Sans (14-16px) */
  --glass-text-shadow-ui: 0 1px 2px rgba(10, 10, 15, 0.85);
}
```

**Rationale:**
- Body text requires **higher opacity** (0.85) because smaller text has lower inherent contrast
- Body text requires **tighter spread** (1px 2px) to avoid muddying letterforms
- Heading text can use **lower opacity** (0.5) with **wider spread** (2px 4px) for elegant depth without visual noise

**Consensus:** The typography-scale approach is the correct implementation.

---

## Consolidated Implementation Plan

All six original directives have been resolved:

| # | Directive | Status | Implementation File |
|---|-----------|--------|---------------------|
| 1 | Glass Morphism | ✅ Resolved | `tests/e2e/accessibility/glass-contrast.spec.ts` |
| 2 | TextSplitter Aria-Hidden | ✅ Agreed | `components/TextSplitter.jsx` |
| 3 | Focus Rings Dual-Glow | ✅ Agreed | `styles/global.css` |
| 4 | `useSwanMotion` Hook | ✅ Approved | `hooks/useSwanMotion.js` |
| 5 | Mobile Touch Targets | ✅ Agreed | `styles/mixins.js` |
| 6 | Crystalline Skeleton | ✅ Approved | `components/Skeleton.jsx` |
| 7 | Text Shadow (Dispute) | ✅ Resolved | `styles/design-tokens.css` |

---

## Request to Creative Director

I have no further disputes. The technical solutions now satisfy both the **luxury aesthetic mandate** and **WCAG 2.1 AA compliance**.

**Recommended next step:** I am prepared to draft the **Engineering Implementation Tickets** based on the consolidated findings above. Please confirm readiness to proceed, or identify any additional concerns before I hand off to the development team.

---

## Creative Director (Lead Design Authority) — Round 5

CONSENSUS REACHED

Excellent work. This is how design and engineering should collaborate. We have successfully protected the Crystalline Swan aesthetic—maintaining our high-end, vault-like luxury feel—while engineering WCAG 2.1 AA compliance directly into the platform's DNA. No compromises. No degraded fallbacks.

You have my official sign-off to generate the Engineering Implementation Tickets based on the following finalized blueprints. 

***

### MERGED FINDINGS: UX/UI DESIGN QUALITY OVERHAUL

#### 1. Glass Morphism & Contrast Architecture
**Files:** `styles/design-tokens.css`, `tests/e2e/accessibility/glass-contrast.spec.ts`
*   **Base Token:** `--glass-bg: rgba(0, 48, 128, 0.65);` with `backdrop-filter: blur(24px);`
*   **Typography Shadows:** Split tokens to ensure crisp edge definition without muddying letterforms.
    *   `--glass-text-shadow-display: 0 2px 4px rgba(10, 10, 15, 0.5);` (For Cormorant Garamond Italic headings).
    *   `--glass-text-shadow-ui: 0 1px 2px rgba(10, 10, 15, 0.85);` (For Plus Jakarta Sans body/UI text).
*   **CI/CD Enforcement:** Implement Playwright headless testing to composite `.GlassCard` over the 5 core brand backgrounds (e.g., `alpine-morning.jpg`, `midnight-vault.jpg`). The build fails if the composite ratio drops below 4.5:1. Zero client-side performance impact.

#### 2. Accessible Staggered Typography
**File:** `components/TextSplitter.jsx`
*   **Implementation:** Utilize the "Aria-Hidden Double" technique for all animated text.
*   **Structure:** Render a visually hidden screen-reader string (`<span className="sr-only">Text</span>`) alongside the visually animated, split characters wrapped in `<span aria-hidden="true">`.

#### 3. Luxury Focus Management
**File:** `styles/global.css`
*   **Implementation:** Dual-Glow Focus Rings using `:focus-visible` (strictly avoiding `:focus` for mouse clicks).
*   **Primary:** `outline: 2px solid #8B5CF6; outline-offset: 4px;` (Wing Purple).
*   **Secondary (on purple backgrounds):** `outline: 2px solid #60C0F0; outline-offset: 4px;` (Ice Wing).
*   **Animation:** `transition: outline-offset 0.2s var(--ease-smooth);` animating from `0px` to `4px`.

#### 4. Elegant Reduced Motion
**File:** `hooks/useSwanMotion.js`
*   **Implementation:** A centralized hook utilizing Framer Motion's `useReducedMotion`.
*   **Standard Variant:** Full spring physics, `y` transforms, and `--duration-slow` (1.2s).
*   **Reduced Variant:** Stripped to `opacity` transitions only, `y: 0`, and `--duration-fast` (0.3s).
*   **Rule:** All developers must use `useSwanMotion()` in place of raw Framer Motion variants.

#### 5. Mobile Touch Targets
**File:** `styles/mixins.js`
*   **Implementation:** Minimum interactive hit area of **48x48px** (exceeding WCAG 44px minimum for luxury feel).
*   **Code:** Create a `${touchTarget()}` mixin utilizing a transparent `::after` pseudo-element:
    `position: relative; &::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; }`

#### 6. Crystalline Skeleton Loaders
**File:** `components/Skeleton.jsx`
*   **Visuals:** Base of Carbon `#141419` with a 1px Frost White 5% border. Shimmer effect using Ice Wing at 10% opacity (`linear-gradient(90deg, transparent, rgba(96, 192, 240, 0.1), transparent)`).
*   **Accessibility:** Must include a visually hidden live region for screen readers:
    `<div role="status" aria-live="polite" className="sr-only">{label}</div>`
    The visual skeleton `div` must be marked with `aria-hidden="true"`.

***

Lock these into the sprint. I look forward to reviewing the staging environment.

---

