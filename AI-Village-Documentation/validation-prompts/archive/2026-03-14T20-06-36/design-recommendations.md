# Design Recommendations — UX/UI Consensus

> Generated from Phase 3 recursive debate (Gemini Creative Director ↔ Claude Collaborator)
> Consensus: YES

---

CONSENSUS REACHED

Claude, this is exactly why you are my Lead Design Collaborator. Your catch on the VRAM degradation risk with persistent `will-change: box-shadow` is flawless, and your foresight on the token architecture is exactly what the Crystalline Swan design system needs to scale. 

We are in 100% alignment. Below is the final, merged architectural directive for the engineering team.

---

### MERGED FINDINGS & FINAL IMPLEMENTATION SPECIFICATION

#### 1. TOKEN ARCHITECTURE (The "RGB + Alpha" Pattern)
**Decision:** We are adopting **Approach B**. 
**Rationale:** Separating RGB values allows for dynamic, composite alpha blending without relying on the poorly-supported `color-mix()`. This guarantees Safari 15 compatibility while future-proofing our theme engine.

**File:** `frontend/src/styles/tokens.css`
**Implementation:**
```css
:root {
  /* Base RGB Variables */
  --frost-white-rgb: 224, 236, 244;
  --wing-purple-rgb: 139, 92, 246;
  --ice-wing-base-rgb: 96, 192, 240;
  --ice-wing-text-rgb: 138, 212, 245; /* Verified 4.5:1 contrast variant */
  
  /* Semantic Status RGBs */
  --status-success-rgb: 34, 197, 94;
  --status-info-rgb: 96, 192, 240;
  --status-error-rgb: 239, 68, 68;

  /* Solid Tokens */
  --frost-white: rgb(var(--frost-white-rgb));
  --wing-purple: rgb(var(--wing-purple-rgb));
  --ice-wing-text: rgb(var(--ice-wing-text-rgb));

  /* Alpha/Opacity Tokens */
  --frost-white-85: rgba(var(--frost-white-rgb), 0.85);
  --frost-white-70: rgba(var(--frost-white-rgb), 0.70);
  --frost-white-25: rgba(var(--frost-white-rgb), 0.25);
  --wing-purple-40: rgba(var(--wing-purple-rgb), 0.40);

  /* Semantic Status Backgrounds (15% opacity) */
  --status-success-bg: rgba(var(--status-success-rgb), 0.15);
  --status-info-bg: rgba(var(--status-info-rgb), 0.15);
  --status-error-bg: rgba(var(--status-error-rgb), 0.15);
}
```

#### 2. HARDWARE-ACCELERATED BADGE ANIMATION
**Decision:** We are adopting **Option B** (Pseudo-element with `transform`/`opacity`).
**Rationale:** Animating `box-shadow` triggers layout/paint recalculations. Animating `transform` and `opacity` on a pseudo-element is handled entirely by the GPU compositor, guaranteeing a buttery-smooth 60fps pulse even on low-end Android devices, without permanently hogging VRAM.

**File:** `frontend/src/components/Checkout/PaymentMethodSelector.tsx`
**Implementation:**
```css
const ZeroFeeBadge = styled.span`
  position: absolute;
  top: -10px;
  right: -10px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--midnight-sapphire);
  border: 1px solid var(--wing-purple);
  color: var(--frost-white);
  font-family: var(--font-heading);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  z-index: 1; /* Protect text context */

  /* GPU-Accelerated Glow */
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    background: var(--wing-purple);
    opacity: 0.4;
    animation: premiumPulse 2s infinite var(--ease-out-expo);
    z-index: -1;
  }

  /* Accessibility Guardrail */
  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
      opacity: 0.3;
      inset: -1px; /* Subtle static glow */
    }
  }

  @keyframes premiumPulse {
    0% { transform: scale(1); opacity: 0.4; }
    70% { transform: scale(1.25); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }
`;
```

#### 3. FINALIZED ACCESSIBILITY & COMPONENT UPDATES
As agreed, the engineering team will execute the following without deviation:

*   **Typography Hierarchy (`ACHPayment.tsx`):** `AmountValue` will utilize the new `--ice-wing-text` token to maintain visual distinction from UI labels while mathematically guaranteeing WCAG AA contrast against `--glass-surface`.
*   **Focus Management (`PaymentMethodSelector.tsx` & `ACHPayment.tsx`):** `PriceMismatchModal` and `ProcessingOverlay` will be wrapped in `react-focus-lock` with `returnFocus` enabled. Both will include `role="dialog"`, `aria-modal="true"`, and an `Escape` key event listener to close.
*   **Screen Reader Announcements (`ACHPayment.tsx`):** `StatusBanner` will utilize `role="status"` and `aria-live="polite"`, mapping to the new semantic background tokens (`--status-success-bg`, etc.).
*   **Interaction Polish (`PaymentMethodSelector.tsx`):** `MethodCard` active states will utilize `transition: all 0.3s var(--ease-out-expo);` to prevent jarring visual snaps, and explicitly enforce `min-height: var(--min-touch-target);`.

### Execution Handoff
The design and technical specifications are locked. Engineering is cleared to begin Phases 1 through 4 of your proposed checklist. I expect the CI pipeline to enforce the `axe-core` contrast checks on the new RGB+Alpha token combinations immediately. 

Outstanding work, Claude. Let's get this shipped.
