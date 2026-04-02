# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 3
> **Tokens:** 15,172 input / 5,616 output

---

## Creative Director (Lead Design Authority) — Round 1

Listen up. You handed me the UX research for the Bootcamp Sprint Planner and Pain Chart, but your explicit Round 1 directive targets the **Coach Assistant UI components**. As your Creative Director, I don't get confused by mixed briefs—I execute the mandate. 

If we are integrating AI deeply into the trainer's workflow (as the Bootcamp plan demands), the Coach Assistant interface must be flawless. We are deploying the **Crystalline Swan** theme. It is cold, precise, premium, and deeply technical. I have zero tolerance for the retired Galaxy-Swan palette—if I see `#00FFFF` anywhere in the codebase, the PR will be rejected immediately.

Here are my absolute, non-negotiable visual specifications for the Coach Assistant components. Hand this directly to the frontend engineers.

***

### 1. Conversation Sidebar
This is the trainer’s history command center. It must feel grounded but highly responsive.

*   **Width:** `320px` fixed on desktop. `100vw` on mobile.
*   **Background Color:** `--color-carbon` (`#141419`) with a subtle gradient at the absolute bottom fading into `--color-midnight-sapphire` (`#002060`) at 15% opacity to ground the scroll area.
*   **Item Height:** `48px` fixed. Do not let text wrap; truncate with an ellipsis.
*   **Hover State:** 
    *   Background shifts to `--color-graphite` (`#1A1A24`).
    *   Left border highlight: `3px solid --color-ice-wing` (`#60C0F0`).
    *   Text brightens to `--color-frost-white` (`#E0ECF4`).
*   **Active State:** 
    *   Background: `rgba(0, 48, 128, 0.2)` (Royal Depth at 20% opacity).
    *   Left border highlight: `3px solid --color-wing-purple` (`#8B5CF6`).
    *   Text: `--color-frost-white` (`#E0ECF4`) with `font-weight: 600`.
*   **Transition Timing:** `0.2s` for color shifts, `ease-in-out`.
*   **Mobile Drawer Animation:** 
    *   Transform: `translateX(-100%)` to `translateX(0)`.
    *   Duration: `0.35s`.
    *   Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (Snappy entrance, smooth deceleration).

### 2. Markdown Renderer
AI outputs complex data (like the 3-Month Sprint plans). The typography and data presentation must be immaculate and highly legible against our dark backgrounds.

*   **Code Block Background:** `--color-obsidian-black` (`#0A0A0F`) with a `1px solid --color-graphite` (`#1A1A24`) border. `border-radius: 8px`.
*   **Syntax Highlighting Colors:**
    *   Keywords/Operators: `--color-wing-purple` (`#8B5CF6`)
    *   Strings/Values: `--color-ice-wing` (`#60C0F0`)
    *   Functions/Methods: `--color-arctic-cyan` (`#50A0F0`)
    *   Comments: `--color-swan-lavender` (`#4070C0`) at `70%` opacity.
*   **Table Style (Crucial for Sprint/Workout grids):**
    *   Header Background: `--color-carbon` (`#141419`).
    *   Borders: `1px solid --color-graphite` (`#1A1A24`).
    *   Alternating Rows: `transparent` and `rgba(26, 26, 36, 0.4)` (Graphite with opacity).
    *   Cell Padding: `12px 16px`.
*   **Blockquote Border:** 
    *   Left border: `4px solid --color-gilded-fern` (`#C6A84B`).
    *   Background: `rgba(198, 168, 75, 0.05)` (Gilded Fern at 5%).
    *   Text: Italicized, `--color-frost-white` (`#E0ECF4`) at `85%` opacity.
*   **Heading Sizes:**
    *   H1: `24px`, `--color-frost-white` (`#E0ECF4`), `font-weight: 700`, `margin-bottom: 16px`.
    *   H2: `20px`, `--color-ice-wing` (`#60C0F0`), `font-weight: 600`, `margin-bottom: 12px`.
    *   H3: `16px`, `--color-arctic-cyan` (`#50A0F0`), `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.05em`.

### 3. Thinking Indicator
When the AI is generating a 3-month sprint, the user needs visual reassurance that heavy computation is happening. No generic spinners.

*   **Bubble Shape:** Pill-shaped, `border-radius: 24px`, padding `10px 20px`.
*   **Background:** `--color-carbon` (`#141419`) with a `1px solid --color-graphite` (`#1A1A24`) border.
*   **Shimmer Animation Spec:** 
    *   CSS: `background: linear-gradient(90deg, transparent 0%, rgba(96, 192, 240, 0.05) 50%, transparent 100%);`
    *   Background Size: `200% 100%`.
    *   Animation: `shimmer 2s infinite linear`.
*   **Dot Specs:** 3 dots, `6px` diameter, `--color-ice-wing` (`#60C0F0`).
    *   Animation: `pulse 1.4s infinite ease-in-out both`.
    *   Staggered Delays: Dot 1 (`0s`), Dot 2 (`0.15s`), Dot 3 (`0.3s`).

### 4. Voice Recording Overlay
Trainers on the gym floor will use voice to log pain data or request class modifications. This needs to be a massive, unmistakable touch target.

*   **Orb Size:** `72px` diameter.
*   **Base State:** `--color-carbon` (`#141419`) with a `--color-arctic-cyan` (`#50A0F0`) microphone icon.
*   **Active/Recording State (Dual-Button Glow Mandatory):**
    *   Orb Background: `--color-royal-depth` (`#003080`).
    *   Glow Animation: **Blue → Purple Glow**. `box-shadow: 0 0 20px 5px rgba(0, 48, 128, 0.6), 0 0 40px 10px rgba(139, 92, 246, 0.4);`
*   **Amplitude Ring Specs:** 
    *   2 concentric rings behind the orb.
    *   Color: `--color-wing-purple` (`#8B5CF6`).
    *   Animation: `scale(1)` to `scale(1.8)`. Opacity fades from `0.5` to `0`.
    *   Timing: Tied to actual mic amplitude via JS, but fallback CSS animation is `1.2s ease-out infinite`.
*   **Duration Label Style:** 
    *   Font: `14px`, monospace (`'JetBrains Mono', monospace` or system equivalent).
    *   Color: `--color-frost-white` (`#E0ECF4`).
    *   Placement: Centered `16px` below the orb.

### 5. Provider Badge
Transparency is key. Trainers need to know which model is generating their bootcamp classes.

*   **Size:** Height `20px`, padding `2px 8px`.
*   **Font:** `10px`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.06em`.
*   **Color:** 
    *   Text: `--color-obsidian-black` (`#0A0A0F`).
    *   Background: `--color-ice-wing` (`#60C0F0`) for standard models, `--color-wing-purple` (`#8B5CF6`) for advanced reasoning models.
*   **Placement:** Inline, exactly `8px` to the right of the "Coach AI" avatar name in the message header. `border-radius: 4px`.

### 6. Attachment Preview
For when trainers upload client posture photos or previous workout CSVs.

*   **Container:** `border: 1px solid --color-graphite` (`#1A1A24`), `background: --color-carbon` (`#141419`), `border-radius: 12px`, padding `8px`, display `flex`, gap `12px`.
*   **Thumbnail Size:** `64px` by `64px`.
*   **Thumbnail Border Radius:** `8px`. Object-fit: `cover`.
*   **Remove Button Placement:** 
    *   Absolute positioning. Top-right corner of the *thumbnail* (not the container).
    *   Offset: `top: -6px`, `right: -6px` (overlaps the edge).
    *   Size: `22px` by `22px`, `border-radius: 50%`.
    *   Background: `--color-obsidian-black` (`#0A0A0F`).
    *   Icon (X): `12px` size, `--color-frost-white` (`#E0ECF4`).
    *   Hover: Background shifts to `--color-graphite` (`#1A1A24`), icon shifts to `--color-ice-wing` (`#60C0F0`).

***

### Creative Director's Note on the Bootcamp Plan:
I have reviewed the UX research for the Sprint Planner and Pain Chart. The recommendations for mobile-first accordion views and touch-target optimization are spot on. When we move to Round 2 to spec out the **Pain Chart Anatomical Upgrade**, be prepared: I will demand a layered SVG approach over AI-generated WebP bases. We are not compromising on performance or visual fidelity. 

Implement these Coach Assistant specs exactly as written. Do not deviate. Let me know when the components are in Storybook for my review.

---

## Design Implementation Reviewer — Round 2

## Design Implementation Review — Round 1 Response

I've reviewed the Coach Assistant specifications thoroughly. **I agree with the majority** of the Crystalline Swan theme implementation—these are well-reasoned choices for a premium trainer workflow tool. However, I have **three substantive disputes** that require resolution before frontend handoff.

---

### ✅ CONSENSUS: Sections 2, 5, and 6 Approved

**Markdown Renderer (Section 2):** Typography hierarchy is excellent. The table alternating rows with `rgba(26, 26, 36, 0.4)` on dark backgrounds will provide necessary scanability for 3-Month Sprint grids. Approved as written.

**Provider Badge (Section 5):** 20px height with 8px right-margin placement is precise and non-intrusive. Approved as written.

**Attachment Preview (Section 6):** Remove button overlay positioning at `-6px` offset is a solid pattern for dense thumbnail grids. Approved as written.

---

### ⚠️ DISPUTE 1: Thinking Indicator — Accessibility Compliance Missing

**Location:** Section 3, Shimmer Animation Spec

**Issue:** The continuous shimmer animation (`2s infinite linear`) does not account for `prefers-reduced-motion`. WCAG 2.1 Success Criterion 2.3.3 requires that animations can be disabled for users with vestibular disorders.

**Proposed Fix:**

```css
/* Insert at file: src/components/CoachAssistant/styles/thinking-indicator.css */
@media (prefers-reduced-motion: reduce) {
  .thinking-indicator-shimmer {
    animation: none;
    background: var(--color-carbon);
  }
  
  .thinking-indicator-dots .dot {
    animation: none;
    opacity: 0.6; /* Static fallback */
  }
}
```

**Rationale:** This is not optional—failing this will block accessibility audit sign-off.

---

### ⚠️ DISPUTE 2: Conversation Sidebar Mobile — Full-Viewport Drawer is Dangerous

**Location:** Section 1, Width specification

**Issue:** Specifying `100vw` for mobile creates a **layout viewport overflow problem** on iOS Safari. When the voice recording overlay or keyboard triggers the browser chrome to retract, `100vw` recalculates and causes horizontal scroll jank.

**Proposed Fix — File:** `src/components/ConversationSidebar/MobileDrawer.tsx`

```tsx
// Line 12-14, replace:
const drawerWidth = '100vw';

// With:
const drawerWidth = '100%'; // Uses max-width container constraint instead
const drawerStyles = {
  width: '100%',
  maxWidth: '100vw', // Applied only as overflow boundary
  position: 'fixed',
  top: 0,
  left: 0,
  height: '100dvh', // Dynamic viewport height, not '100vh'
};
```

**Additional Fix — Line 45, add CSS:**

```css
/* File: src/components/ConversationSidebar/mobile.css */
.mobile-drawer {
  /* ... existing transforms ... */
  height: 100dvh; /* 'dvh' accounts for mobile browser chrome retraction */
  overscroll-behavior: contain; /* Prevents scroll chaining to main content */
}
```

---

### ⚠️ DISPUTE 3: Voice Recording Overlay — Orb Size Undersized for Gym Floor Context

**Location:** Section 4, Orb Size

**Issue:** 72px diameter is insufficient for a **gym floor environment** where trainers will have sweaty fingers, gloves, or be mid-exercise. WCAG 2.2 Success Criterion 2.5.8 (Minimum Target Size) recommends **44px × 44px as an absolute minimum**, and best practice for touch interfaces is 48px minimum.

While 72px technically exceeds this, gym-specific context (movement, gloves, stress) warrants **up-sizing to 88px** for primary action buttons.

**Proposed Fix — File:** `src/components/VoiceRecordingOverlay/RecordingOrb.tsx`

```tsx
// Line 8, replace:
const ORB_SIZE = '72px';

// With:
const ORB_SIZE = '88px'; // Increased for gym floor ergonomics
const ORB_TOUCH_PADDING = '12px'; // Invisible touch expansion beyond visual bounds
```

**Additional CSS — File:** `src/components/VoiceRecordingOverlay/styles/orb.css`

```css
.voice-recording-orb {
  width: 88px;
  height: 88px;
  /* Maintain existing glow and background specs */
  box-shadow: 0 0 20px 5px rgba(0, 48, 128, 0.6), 
              0 0 40px 10px rgba(139, 92, 246, 0.4);
}

/* Invisible touch target expansion */
.voice-recording-orb::before {
  content: '';
  position: absolute;
  inset: -12px; /* Expands effective touch area to 112px */
  border-radius: 50%;
}
```

---

### Round 1 Summary

| Section | Status | Action Required |
|---------|--------|-----------------|
| 1. Sidebar Desktop | ✅ Approved | — |
| 1. Sidebar Mobile | ⚠️ Disputed | Fix `100vw` → `100dvh` per above |
| 2. Markdown Renderer | ✅ Approved | — |
| 3. Thinking Indicator | ⚠️ Disputed | Add `prefers-reduced-motion` query |
| 4. Voice Recording | ⚠️ Disputed | Increase orb to 88px + touch padding |
| 5. Provider Badge | ✅ Approved | — |
| 6. Attachment Preview | ✅ Approved | — |

**Awaiting your response on the three disputed points.** Once resolved, I will compile a clean implementation brief for frontend.

---

**Creative Director's Note on Pain Chart:** Noted and acknowledged. Layered SVG approach is the correct architecture for anatomical overlays—I agree the performance benefits are non-negotiable for mobile Sprint Planner contexts. Let's hold that debate for Round 2 per your directive.

---

## Creative Director (Lead Design Authority) — Round 3

Good catches on the accessibility and iOS viewport quirks. This is exactly why we have this review process. I am officially approving your implementations for **Dispute 1** (`prefers-reduced-motion` in `thinking-indicator.css`) and **Dispute 2** (`100%` width, `100dvh`, and `overscroll-behavior: contain` in `MobileDrawer.tsx` and `mobile.css`). Implement them exactly as you proposed.

However, we have a hard stop on your proposed solution for the Voice Recording Overlay.

### ⚠️ DISPUTE 3: Voice Recording Overlay — Visual Bloat vs. Functional Ergonomics

**Location:** Section 4, Orb Size
**Status:** Vetoed visual up-sizing; Proposing alternative.

**Why I disagree:**
Bumping the visual footprint of the orb to `88px` destroys the spatial harmony of the Crystalline Swan theme, particularly on smaller viewports (e.g., iPhone 13 Mini). It crosses the line from "accessible" to "clunky." The UI must remain cold, precise, and premium. We do not compromise the visual aesthetic for functional ergonomics when we can achieve *both* through smart CSS. 

Your logic regarding the gym floor context (sweaty hands, gloves, movement) is 100% correct, but your execution is visually heavy-handed. We will achieve your desired `112px` functional touch target by aggressively expanding the invisible touch padding, while keeping the visual orb locked at `72px`.

**My Counter-Proposal:**

**File:** `src/components/VoiceRecordingOverlay/RecordingOrb.tsx`
```tsx
// Line 8, enforce:
const ORB_SIZE = '72px'; // Visual size remains locked. Do not change.
const ORB_TOUCH_PADDING = '20px'; // Expanded invisible hit area to achieve 112px total.
```

**File:** `src/components/VoiceRecordingOverlay/styles/orb.css`
```css
/* Line 12: Enforce strict visual sizing and positioning */
.voice-recording-orb {
  width: 72px;
  height: 72px;
  position: relative; /* Mandatory for pseudo-element anchoring */
  /* Maintain existing glow and background specs */
  box-shadow: 0 0 20px 5px rgba(0, 48, 128, 0.6), 
              0 0 40px 10px rgba(139, 92, 246, 0.4);
}

/* Line 25: Aggressive invisible touch target expansion */
.voice-recording-orb::after {
  content: '';
  position: absolute;
  top: -20px;
  right: -20px;
  bottom: -20px;
  left: -20px;
  border-radius: 50%;
  z-index: 1; /* Ensure it sits above surrounding elements to catch touch events */
  cursor: pointer;
  /* Debugging only: background: rgba(255, 0, 0, 0.2); */
}
```

**Rationale:** 
`72px` (visual) + `20px` (top padding) + `20px` (bottom padding) = **`112px` total touch target**. This perfectly matches your ergonomic requirement for the gym floor without bloating the UI.

Review this counter-proposal. If you agree with this CSS-driven compromise, we will have full consensus on the Coach Assistant UI and can immediately pivot to Round 3: The Pain Chart Anatomical Upgrade.

---

