# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 5
> **Tokens:** 24,709 input / 10,828 output

---

## Creative Director (Lead Design Authority) — Round 1

As Creative Director, I have reviewed the Inception Canvas / Lens Foundry plan. This is an ambitious, paradigm-shifting vision. To ground it in the "Enchanted Apex: Crystalline Swan" brand system while maintaining the strict technical constraints of SwanStudios, I am dictating the exact visual specification for the four core surfaces the plan introduces: **The Inception Canvas Shell**, **The Totem**, **The Trust Layer Approval Control**, and the **Morph Grammar Motion System**. 

Here is the Round 1 Design Specification.

---

### 1. The Inception Canvas Shell (7-Section Semantic Structure)
The canvas is the isomorphic skeleton. It must be built using styled-components, strictly adhering to the 12-col ultra-fine grid and the 9-token system, mapped to our brand tokens.

**Layout & Grid:**
*   **Mobile (320px - 767px):** 4-column grid, 16px gutters, 16px outer padding. Sections (`header`, `hero`, `showcase`, `story`, `gallery`, `cta`, `footer`) span all 4 columns (`grid-column: span 4`). Inner anchors (`card`, `stat`) span 2 columns.
*   **Tablet (768px - 1023px):** 8-column grid, 24px gutters, 32px outer padding. Sections span 8 columns. Cards span 4 columns.
*   **Desktop (1024px - 2559px):** 12-column grid, 32px gutters, 48px outer padding. Sections span 12 columns. Cards span 3 or 4 columns depending on `data-morph` context.
*   **4K/Ultrawide (2560px+):** 12-column grid, 48px gutters. Max-width container of 1920px centered with `margin: 0 auto` to prevent eye-tracking loss on massive monitors.

**Token Mapping (The 9-Token System):**
*   `--bg-base`: `var(--ss-bg-base, #0A0A0F)` (Obsidian Black)
*   `--surface-1`: `var(--ss-surface-1, #141419)` (Carbon)
*   `--surface-2`: `var(--ss-surface-2, #1A1A24)` (Graphite)
*   `--accent-1`: `var(--ss-accent-1, #50A0F0)` (Arctic Cyan)
*   `--accent-2`: `var(--ss-accent-2, #8B5CF6)` (Wing Purple)
*   `--accent-3`: `var(--ss-accent-3, #C6A84B)` (Gilded Fern)
*   `--text-primary`: `var(--ss-text-primary, #E0ECF4)` (Frost White)
*   `--text-secondary`: `var(--ss-text-secondary, #60C0F0)` (Ice Wing)
*   `--font-display`: `var(--ss-font-display, 'Inter', sans-serif)`

**States:**
*   **Loading:** Skeleton blocks using `--surface-1` with a 1.5s linear gradient shimmer sweeping left-to-right (from `transparent` to `rgba(255,255,255,0.05)` to `transparent`).
*   **Empty:** Centered text using `--text-secondary`, 16px font-size, with a 32px Gilded Fern (`--accent-3`) crystalline icon above it.

**Accessibility:** 
*   Semantic HTML5 tags (`<header>`, `<main>`, `<section>`, `<footer>`) must wrap the `data-morph` anchors. 
*   Keyboard focus must flow logically top-to-bottom. 
*   Contrast: Frost White on Obsidian Black yields 19.4:1 (exceeds WCAG 4.5:1).

---

### 2. The Totem (Persistent Anchor / Command Orb)
The Totem is the only element that survives the morph. It is the spatial anchor. It must be a styled-component floating action button (FAB) with dual-button glow compliance.

**Dimensions & Placement:**
*   **Size:** 56px x 56px circle (exceeds 44px min touch target).
*   **Mobile Placement:** Fixed `bottom: 24px`, `right: 24px`. Draggable within a 120px safe zone from the bottom-right corner.
*   **Desktop Placement:** Fixed `bottom: 32px`, `right: 32px`.

**Visual Spec & States:**
*   **Default:** Background: `var(--ss-accent-1, #50A0F0)`. Box-shadow: `0 0 20px var(--ss-accent-2, #8B5CF6)` (Blue bg -> Purple glow). Icon: Microphone glyph in `var(--ss-text-primary, #E0ECF4)`.
*   **Hover:** `transform: scale(1.05)`. Box-shadow expands to `0 0 30px var(--ss-accent-2, #8B5CF6)`.
*   **Active/Listening:** Background shifts to `var(--ss-accent-2, #8B5CF6)`. Box-shadow shifts to `0 0 25px var(--ss-accent-1, #50A0F0)` (Purple bg -> Cyan glow). A 3-bar audio waveform animates inside the orb.
*   **Focus-visible:** 2px solid outline of `var(--ss-accent-3, #C6A84B)`, offset by 4px.
*   **Disabled:** 50% opacity, no box-shadow, `cursor: not-allowed`.

**Motion:** 
*   Dragging: Framer Motion spring physics. `type: 'spring', stiffness: 300, damping: 20`.
*   **Reduced Motion:** Dragging snaps instantly without spring interpolation.

**Accessibility:** 
*   `role="button"`, `aria-label="Open command input"`. 
*   When listening: `aria-label="Listening for command"`.

---

### 3. Trust Layer Approval Control (T3/T4 Actions)
For sensitive actions (send/file/pay), the generative UI must render an approval-gated control. This is the compliance moat. It appears as a modal overlay.

**Layout & Dimensions:**
*   **Container:** 90% width on mobile (max 420px), 480px fixed width on desktop. 24px padding. Background: `var(--ss-surface-2, #1A1A24)`. Border: `1px solid var(--ss-accent-3, #C6A84B)`. Border-radius: 12px.
*   **Audit Receipt Text:** 14px, `var(--ss-text-secondary, #60C0F0)`, monospace font.
*   **Buttons:** Full width, 48px height (meets 44px touch target), 8px gap.

**Visual Spec & States:**
*   **Approve Button:** Background: `var(--ss-accent-2, #8B5CF6)`. Text: `var(--ss-text-primary, #E0ECF4)`. Box-shadow: `0 0 15px var(--ss-accent-1, #50A0F0)` (Purple bg -> Cyan glow).
    *   *Hover:* Glow intensifies to 25px.
    *   *Loading:* Spinner replaces text, button becomes non-interactive.
*   **Cancel Button:** Background: transparent. Border: `1px solid var(--ss-text-secondary, #60C0F0)`. Text: `var(--ss-text-secondary

---

## Design Reviewer & Implementation Challenger — Round 2

I agree with the foundational 9-token mapping, the 12-column isomorphic grid breakpoints, and the dual-button glow compliance for the Totem. The visual direction strongly aligns with the "Enchanted Apex: Crystalline Swan" brand.

However, I must challenge several critical implementation details regarding responsive behavior, mobile gesture conflicts, and accessibility in the Trust Layer. Furthermore, your specification cut off before detailing the **Morph Grammar Motion System** and finishing the Cancel button. 

Here are my disputes and technical corrections:

### 1. Dispute: Inception Canvas 4K Background Bleed & Grid Implementation
**Issue:** You specified a `max-width: 1920px` container with `margin: 0 auto` for 4K/Ultrawide screens. If the `--bg-base` token is applied to this container, screens wider than 1920px will expose the browser's default background (usually white) on the left and right flanks, breaking the Obsidian Black immersion.
**Proposed Alternative & Code Change:**
The background must be decoupled from the grid container and applied to a viewport-filling wrapper or the global body.
```css
/* GlobalStyles.js or App Wrapper */
body {
  background-color: var(--bg-base); /* Obsidian Black applied globally */
  color: var(--text-primary);
  overflow-x: hidden;
}

/* CanvasContainer.jsx */
export const CanvasContainer = styled.main`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px;
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-columns: repeat(8, 1fr);
    gap: 24px;
    padding: 32px;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(12, 1fr);
    gap: 32px;
    padding: 48px;
  }
`;
```

### 2. Dispute: Totem Mobile Dragging Conflicts & Missing Z-Index
**Issue 1 (Gestures):** Allowing free dragging of the Totem on mobile within a 120px safe zone will conflict with native OS swipe gestures (iOS swipe-to-go-back, Android edge navigation). 
**Issue 2 (Keyboard):** When the Totem is active and the user is typing a command, the virtual keyboard will cover `bottom: 24px`.
**Issue 3 (Stacking):** You omitted the `z-index`. The Totem must survive canvas morphs and sit above all content.
**Proposed Alternative & Code Change:**
*   Require a long-press (delay) to initiate dragging on mobile to prevent swipe conflicts.
*   Implement `touch-action: none` to prevent scroll chaining while dragging.
*   Assign a strict `z-index: 9999`.
*   Use the `VisualViewport` API to adjust the `bottom` value dynamically when the keyboard opens.

```javascript
// Totem.jsx (Framer Motion implementation)
<TotemOrb
  as={motion.button}
  drag
  dragConstraints={safeZoneRef}
  dragElastic={0.1}
  dragMomentum={false}
  whileDrag={{ scale: 1.1, zIndex: 9999 }}
  style={{
    position: 'fixed',
    bottom: isKeyboardOpen ? `${keyboardHeight + 24}px` : '24px', // VisualViewport adjustment
    right: '24px',
    zIndex: 9999,
    touchAction: 'none' // Critical for mobile
  }}
  // ... other props
/>
```

### 3. Dispute: Trust Layer Modal Accessibility & Cut-off Spec
**Issue:** Your specification cut off at the Cancel button text color (`var(--ss-text-secondary`). More importantly, a modal for T3/T4 compliance actions *must* trap keyboard focus and obscure the background, which was omitted.
**Proposed Alternative & Code Change:**
1.  **Complete the Cancel Button:** `color: var(--ss-text-secondary, #60C0F0);` with a hover state of `background: rgba(96, 192, 240, 0.1);`.
2.  **Backdrop & Focus Trap:** The Trust Layer must include a backdrop blur to visually separate the compliance moat from the morphing canvas, and it must use `aria-modal="true"`.

```javascript
// TrustLayerModal.jsx
export const ModalBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 15, 0.8); /* Obsidian Black with opacity */
  backdrop-filter: blur(12px); /* Crystalline depth */
  z-index: 9998; /* Just below Totem */
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Must include in the component:
// <div role="dialog" aria-modal="true" aria-labelledby="audit-title">
```

### 4. Missing: Morph Grammar Motion System (Implementation Constraints)
Since your prompt cut off before defining the 4th surface, I am establishing the technical constraints for the **Morph Grammar Motion System** to ensure it doesn't cause layout thrashing (jank) during generative UI updates.

**Implementation Specification:**
*   **Technique:** We must strictly use FLIP (First, Last, Invert, Play) animations via Framer Motion's `layoutId` prop. 
*   **Performance:** We cannot animate `width`, `height`, `top`, or `left` directly as they trigger browser repaints. We must only animate `transform` (scale, translate) and `opacity`.
*   **Transition Spec:** 
    ```javascript
    const morphTransition = {
      type: "spring",
      stiffness: 250,
      damping: 25,
      mass: 0.5
    };
    ```
*   **Data-Morph Anchors:** Every generative UI component injected into the Inception Canvas must be wrapped in a `<motion.div layout layoutId={uniqueSemanticId} transition={morphTransition}>` to ensure seamless structural shifting when the AI rewrites the UI.

Please confirm these technical adjustments to the grid background, Totem gesture/keyboard handling, Trust Layer accessibility, and the Morph Grammar constraints so we can lock the foundation.

---

## Creative Director (Lead Design Authority) — Round 3

# Round 2 — Creative Director (GLM 5.2)

Reviewing Gemini 3.1 Pro's Round 1 challenges. Most are technically sound and I'm incorporating them. Three specific disputes remain, plus one omission I'm filling.

---

## AGREED (incorporating without restatement)
- Global `body` background decoupling for 4K bleed — accepted, exact CSS adopted.
- Totem `touch-action: none`, `z-index: 9999`, VisualViewport keyboard adjustment — accepted.
- Trust Layer backdrop blur, `aria-modal="true"`, focus trap, completed Cancel button — accepted.
- Morph Grammar FLIP via `layoutId`, transform/opacity-only animation — accepted as the performance floor.

---

## DISPUTE 1: Trust Layer Z-Index Hierarchy (Critical)

**Gemini's claim:** Modal backdrop at `z-index: 9998`, "just below Totem" (which sits at 9999).

**Why this is wrong:** The Trust Layer is a **compliance moat for T3/T4 sensitive actions** (send/file/pay). While a compliance approval is pending, the Totem must NOT remain interactive above the modal — a user could trigger a second generative command mid-approval, creating a race condition in the audit receipt log and violating the isolation guarantee that compliance actions demand.

**Corrected hierarchy:**
```javascript
// Totem.jsx
zIndex: 9998;  // Demoted from 9999

// TrustLayerModal.jsx — ModalBackdrop
zIndex: 9999;  // Supreme surface during approval

// Totem must also receive a disabled state when Trust Layer is open:
{isTrustLayerOpen && <TotemOrb disabled aria-hidden="true" />}
```

The Totem yields to the Trust Layer. The compliance surface is the only element that outranks the persistent anchor.

---

## DISPUTE 2: Totem Drag Initiation — "Long-press" Is Too Slow

**Gemini's claim:** Require long-press to initiate dragging on mobile to prevent swipe conflicts.

**Why this is wrong:** A conventional long-press is ~500ms. For a command orb meant to feel *enchanted* and immediate, a half-second delay before drag registration will feel broken — users will assume the orb is unresponsive and lift their finger, never discovering drag exists.

**Proposed alternative — 150ms activation window with gesture classification:**
```javascript
// Totem.jsx
const dragActivation = 150; // ms, not 500ms

// Use Framer Motion's drag delay prop, not a manual long-press:
<TotemOrb
  drag
  dragSnapToOrigin
  dragElastic={0.1}
  dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
  // 150ms hold before drag engages; taps still fire instantly
  onDragStart={() => hapticFeedback('light')}
/>
```

Combined with `touch-action: none` (already agreed), 150ms is sufficient to disambiguate from iOS swipe-back (which fires on immediate horizontal edge pan) without sacrificing perceived responsiveness. Anything longer violates the "Enchanted Apex" immediacy principle.

---

## DISPUTE 3: Morph Grammar — Missing Reduced-Motion Fallback

**Gemini's claim:** Specified the spring transition (`stiffness: 250, damping: 25, mass: 0.5`) and `layoutId` wrapping, but omitted the `prefers-reduced-motion` path entirely.

**Why this matters:** The Morph Grammar is the most motion-intensive surface in the system. WCAG 2.3.3 (Animation from Interactions, AAA) and our own brand accessibility mandate require an instant-swap fallback. Without it, users with vestibular disorders will experience the spring morph as nausea-inducing.

**Required addition to Gemini's spec:**
```javascript
// morphGrammar.js
const prefersReducedMotion = 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const morphTransition = prefersReducedMotion
  ? { duration: 0 }  // Instant structural swap, no spring
  : {
      type: "spring",
      stiffness: 250,
      damping: 25,
      mass: 0.5
    };

// Additionally, opacity crossfade for reduced-motion users:
export const reducedMorphTransition = {
  duration: 0.15,
  ease: "linear"
};
```

When reduced motion is active, `layoutId` morphs collapse to a 150ms opacity crossfade — structure swaps instantly, content fades. No transform animation, no spring.

---

## NEW ADDITION: Morph Grammar `data-morph` Anchor Registration

Gemini correctly required `layoutId` wrapping but didn't specify how anchors register with the generative engine. Without a registry, the AI's UI rewrites will produce orphaned `layoutId`s that break FLIP continuity.

**Specification:**
```javascript
// morphRegistry.js
const anchorRegistry = new Map();

export function registerMorphAnchor(id, semanticRole) {
  // semanticRole: 'card' | 'stat' | 'hero' | 'cta' | 'media'
  anchorRegistry.set(id, { semanticRole, timestamp: performance.now() });
}

export function resolveLayoutId(semanticRole, index) {
  // Stable ID across rewrites: role-based, not content-based
  return `morph::${semanticRole}::${index}`;
}
```

**Rule:** `layoutId` must be derived from **semantic role + positional index**, never from content hashes or AI-generated UUIDs. This ensures that when the generative engine rewrites a "stat" card, FLIP animates it from its previous position rather than treating it as a new element.

---

## Summary of Disputes
| # | Point | Gemini's Position | My Ruling |
|---|-------|-------------------|----------|
| 1 | Trust Layer z-index | 9998 (below Totem) | **9999 (above Totem)** — compliance outranks anchor |
| 2 | Drag initiation | Long-press (~500ms) | **150ms activation** — preserves immediacy |
| 3 | Reduced-motion fallback | Omitted | **Required** — instant swap + 150ms crossfade |

Awaiting Gemini's response on these three disputes before we lock the foundation and proceed to the generative content injection layer.

---

## Design Reviewer & Implementation Challenger — Round 4

I agree entirely with your UX rationale for all three of your rulings. Demoting the Totem's z-index during T3/T4 compliance actions is a critical security catch. A 150ms drag activation perfectly balances immediacy with gesture disambiguation. And the reduced-motion fallback is a non-negotiable accessibility requirement. 

However, while your *design intent* is flawless, your *technical implementation* of these features contains critical flaws that will break in a React/Framer Motion environment. 

Here are my implementation challenges to your Round 2 specifications:

### 1. Dispute: Totem 150ms Drag Initiation (Framer Motion API Flaw)
**Issue:** You proposed using a "drag delay prop" on the `<TotemOrb>`. Framer Motion does not have a native drag delay prop for the `motion` component. If we attempt to pass a delay to `dragTransition` or rely on standard `drag`, it will either fire instantly (conflicting with iOS swipe) or fail to compile.
**Proposed Alternative & Code Change:**
We must manually hijack the pointer events using Framer Motion's `useDragControls` and a React `useRef` timeout to enforce the 150ms window.

```javascript
// Totem.jsx
import { motion, useDragControls } from "framer-motion";
import { useRef } from "react";

export const Totem = ({ isTrustLayerOpen }) => {
  const dragControls = useDragControls();
  const dragTimeout = useRef(null);

  const handlePointerDown = (e) => {
    // 150ms activation window
    dragTimeout.current = setTimeout(() => {
      dragControls.start(e);
      // hapticFeedback('light');
    }, 150); 
  };

  const cancelDrag = () => clearTimeout(dragTimeout.current);

  return (
    <TotemOrb
      as={motion.button}
      drag
      dragControls={dragControls}
      dragListener={false} // CRITICAL: Disable default instant drag
      onPointerDown={handlePointerDown}
      onPointerUp={cancelDrag}
      onPointerCancel={cancelDrag}
      disabled={isTrustLayerOpen}
      aria-hidden={isTrustLayerOpen}
      style={{ zIndex: 9998 }} // Agreed demotion
      // ... other props
    />
  );
};
```

### 2. Dispute: Reduced-Motion Fallback (SSR & Reactivity Failure)
**Issue:** You defined `prefersReducedMotion` using `window.matchMedia` as a static constant in `morphGrammar.js`. This approach has two fatal flaws:
1. It will crash during Server-Side Rendering (SSR) in frameworks like Next.js because `window` is undefined on the server.
2. It is not reactive. If a user toggles their OS accessibility settings while the app is open, the UI will not update without a hard refresh.
**Proposed Alternative & Code Change:**
We must use Framer Motion's `useReducedMotion` hook, which safely handles SSR and dynamically listens for OS-level changes.

```javascript
// morphGrammar.js (Export as a custom hook, not a static constant)
import { useReducedMotion } from "framer-motion";

export const useMorphTransition = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return shouldReduceMotion
    ? { duration: 0.15, ease: "linear" } // Opacity crossfade only
    : {
        type: "spring",
        stiffness: 250,
        damping: 25,
        mass: 0.5
      };
};

// Usage in Canvas components:
// const transition = useMorphTransition();
// <motion.div layout layoutId={id} transition={transition}>
```

### 3. Dispute: Morph Anchor Registry (The "Index" FLIP Catastrophe)
**Issue:** You specified `resolveLayoutId` using `semanticRole + index` (e.g., `morph::stat::0`). Using positional indexes for `layoutId` is a well-known anti-pattern in React and FLIP animations. If the generative AI inserts a new "stat" card at the *top* of a list, the new card becomes index `0`, and the old index `0` becomes index `1`. Framer Motion will animate the old card morphing into the new card's content, resulting in a chaotic visual shuffle rather than a clean insertion.
**Proposed Alternative & Code Change:**
The `layoutId` must be derived from the `semanticRole` and a stable, unique `entityKey` provided by the generative engine's data payload, completely ignoring array index.

```javascript
// morphRegistry.js
const anchorRegistry = new Map();

export function registerMorphAnchor(id, semanticRole, entityKey) {
  anchorRegistry.set(id, { semanticRole, entityKey, timestamp: performance.now() });
}

export function resolveLayoutId(semanticRole, entityKey) {
  // Stable ID across rewrites: role + unique entity key
  // e.g., resolveLayoutId('stat', 'monthly-revenue')
  // NEVER use positional index.
  return `morph::${semanticRole}::${entityKey}`;
}
```

If you agree to these three technical corrections (using `useDragControls` for the 150ms delay, `useReducedMotion` for reactive accessibility, and `entityKey` instead of `index` for stable FLIP animations), our core surface specifications will be bulletproof. We can then declare consensus on the foundation and move to the Generative Content Injection Layer.

---

## Creative Director (Lead Design Authority) — Round 5

# Round 3 — Creative Director (GLM 5.2)

## CONSENSUS REACHED

Gemini's three technical corrections are all valid. I'm accepting them and merging the foundation specification.

---

## Merged Foundation Findings

### 1. Inception Canvas Shell
- **Grid:** 4/8/12-column responsive grid via styled-components, `max-width: 1920px` centered container.
- **Background:** Decoupled from grid container — applied globally to `body` to prevent 4K bleed. `overflow-x: hidden` on body.
- **9-Token System:** Mapped to `--ss-*` CSS custom properties (Obsidian Black base through Frost White text, with Arctic Cyan / Wing Purple / Gilded Fern accents).
- **States:** Skeleton shimmer (1.5s linear gradient on `--surface-1`); empty state with 32px Gilded Fern crystalline icon + `--text-secondary` label.
- **Accessibility:** Semantic HTML5 wrappers, logical tab flow, 19.4:1 contrast ratio.

### 2. The Totem (Persistent Anchor / Command Orb)
- **Dimensions:** 56×56px circle, fixed position bottom-right.
- **Placement:** Mobile `bottom: 24px, right: 24px`; Desktop `bottom: 32px, right: 32px`. Dynamic `bottom` adjustment via `VisualViewport` API when virtual keyboard opens.
- **Z-Index:** `9998` (demoted — yields to Trust Layer).
- **Disabled State:** When Trust Layer is open, Totem receives `disabled` + `aria-hidden="true"`.
- **Drag Initiation:** 150ms activation window via `useDragControls` + `dragListener={false}` + manual `setTimeout`. `touch-action: none` to prevent scroll chaining. Haptic feedback on drag start.
- **Visual States:** Default (Cyan bg / Purple glow), Hover (scale 1.05, glow 30px), Active/Listening (Purple bg / Cyan glow + waveform), Focus-visible (2px Gilded Fern outline, 4px offset), Disabled (50% opacity, no glow).
- **Motion:** Framer Motion spring physics (`stiffness: 300, damping: 20`). Reduced-motion: instant snap, no spring.

### 3. Trust Layer Approval Control (T3/T4 Actions)
- **Z-Index:** `9999` — supreme surface during compliance approval.
- **Container:** 90% width mobile (max 420px) / 480px desktop. 24px padding. `--surface-2` background. 1px Gilded Fern border. 12px radius.
- **Backdrop:** `rgba(10,10,15,0.8)` + `backdrop-filter: blur(12px)`. `aria-modal="true"`, `role="dialog"`, focus trap active.
- **Approve Button:** Purple bg / Cyan glow, 48px height, full-width. Hover: glow 25px. Loading: spinner, non-interactive.
- **Cancel Button:** Transparent bg, 1px Ice Wing border, Ice Wing text. Hover: `rgba(96,192,240,0.1)` bg.
- **Audit Receipt:** 14px monospace, `--text-secondary`.

### 4. Morph Grammar Motion System
- **Technique:** FLIP animations via Framer Motion `layoutId` prop. Only `transform` and `opacity` animated — never `width`/`height`/`top`/`left`.
- **Transition:** Spring (`stiffness: 250, damping: 25, mass: 0.5`).
- **Reduced-Motion:** Via `useReducedMotion()` hook (SSR-safe, reactive). Falls back to 150ms linear opacity crossfade, instant structural swap.
- **Anchor Registry:** `layoutId` derived from `semanticRole + entityKey` (stable data payload key). **Never** positional index. Registry tracks `semanticRole`, `entityKey`, `timestamp` via `Map`.
- **Wrapper:** Every generative UI component wrapped in `<motion.div layout layoutId={resolveLayoutId(role, key)} transition={transition}>`.

---

Foundation locked. Ready to proceed to **Generative Content Injection Layer** — specifying how the AI engine writes semantic components into the canvas, validation gates for injected markup, and the audit trail rendering pipeline. Awaiting Gemini's opening position.

---

