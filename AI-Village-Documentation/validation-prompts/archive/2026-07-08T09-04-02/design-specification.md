# Design Specification Consensus

> Phase 2C: GLM 5.2 (Lead Designer) ↔ Gemini 3.1 Pro (Reviewer)
> Consensus: YES

---

CONSENSUS REACHED

Your correction on the Aurora Bloom keyframes is spot on. Fading the aurora before the text finishes its entrance would indeed create an awkward visual vacuum. Holding the opacity at 0.8 and relying on a 2.5s auto-timeout or user tap for dismissal perfectly preserves the signature moment. I also agree with the addition of the WebKit scrollbar pseudo-element for cross-browser compliance on the Quick Post chips.

Here are the final, merged CSS and layout specifications for the Phase-1 Home architecture. We can now lock these and proceed to component state management and API integration.

### Merged Findings: SwanStudios Dashboard Redesign (Phase 1)

**1. Apex Header (Sticky)**
*   **File:** `styles/components/_apex-header.css`
*   **Mobile (320–767px):**
    ```css
    .apex-header {
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
      height: 112px; /* 80px rings + 16px padding */
      padding: 16px;
      background: rgba(20, 20, 25, 0.8);
      backdrop-filter: blur(12px);
      transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1), padding 300ms ease;
    }
    .apex-header.collapsed {
      height: 64px; /* 48px rings + 8px padding */
      padding: 8px 16px;
    }
    ```
*   **Desktop (768px+):** `max-width: 1280px; margin: 0 auto; height: 120px; padding: 24px; border-radius: 0 0 16px 16px;` (No collapse).
*   **CTA Button:** Dual-glow hover state (`box-shadow: 0 0 20px var(--wing-purple)`), focus-visible outlines, and reduced motion fallbacks applied.

**2. Ascension Rings**
*   **File:** `styles/components/_ascension-rings.css`
*   **Layout:** 80px (Mobile) / 120px (Desktop).
*   **Tokens:** Outer (Weekly) `#60C0F0`, Middle (Volume) `#4070C0`, Inner (Streak) `#C6A84B`. Track `#1A1A24`.
*   **A11y:** `role="progressbar"`, `aria-valuenow`, `aria-valuemax`. Keyboard navigable to trigger detail modal.

**3. Guide's Note**
*   **File:** `styles/components/_guides-note.css`
*   **Layout:** Pinned at top of feed. Mobile `margin/padding: 16px`, Desktop `margin/padding: 24px`.
*   **Tokens:** Background `#141419`, Border `#003080`. Play button `#60C0F0` with `#50A0F0` hover glow.

**4. Single-Column Feed & Quick Posts**
*   **File:** `styles/components/_feed.css`
*   **Container:** `max-width: 640px; margin: 0 auto; padding: 0 16px;`
*   **Quick Post Scroll Row:**
    ```css
    .quick-post-scroll-row {
      display: flex;
      overflow-x: auto;
      gap: 12px;
      padding: 16px 16px; /* Prevents shadow clipping */
      margin: -16px 0 16px 0; /* Maintains visual rhythm */
      scrollbar-width: none; /* Firefox */
    }
    .quick-post-scroll-row::-webkit-scrollbar {
      display: none; /* WebKit */
    }
    ```
*   **Active Chip:** `background: var(--wing-purple); box-shadow: 0 0 15px var(--ice-wing);`

**5. Signature Moment: "Aurora Bloom"**
*   **File:** `styles/components/_aurora-bloom.css`
*   **Trigger:** Successful workout save. Dismissed via tap or 2.5s auto-timeout.
*   **Animation:**
    ```css
    .aurora-gradient {
      background: radial-gradient(circle, var(--wing-purple) 0%, var(--midnight-sapphire) 50%, transparent 100%);
      will-change: transform, opacity;
      animation: expand 800ms ease-out forwards;
    }
    @keyframes expand {
      0% { transform: scale(0) translateZ(0); opacity: 0; }
      60% { opacity: 0.8; }
      100% { transform: scale(1.5) translateZ(0); opacity: 0.8; /* Holds for text */ }
    }
    ```
*   **Milestone Gleam:** Fades in at 300ms (400ms duration). Rings animate `stroke-dashoffset` to 100% via elastic cubic-bezier.

**6. Bottom Tab Bar (Mobile Navigation)**
*   **File:** `styles/components/_bottom-nav.css`
*   **Layout:** Fixed bottom, accounts for `env(safe-area-inset-bottom)`.
*   **Tab Items:**
    ```css
    .tab-item {
      min-width: 44px; min-height: 44px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: var(--frost-white); opacity: 0.6;
      border-top: 4px solid transparent; /* Prevents layout shift */
      transition: color 200ms ease, border-color 200ms ease, opacity 200ms ease;
    }
    .tab-item.active {
      color: var(--ice-wing, #60C0F0);
      opacity: 1;
      border-top: 4px solid var(--ice-wing, #60C0F0);
    }
    ```
