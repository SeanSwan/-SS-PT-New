# Design Recommendations — UX/UI Consensus

> Generated from Phase 2C specialty debate (Gemini 3.1 Pro ↔ MiniMax M2.7)
> Consensus: YES

---

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
