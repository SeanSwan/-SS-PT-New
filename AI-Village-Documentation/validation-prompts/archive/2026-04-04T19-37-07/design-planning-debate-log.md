# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 5
> **Tokens:** 29,257 input / 10,758 output

---

## Creative Director (Lead Design Authority) — Round 1

As Creative Director for SwanStudios, I have reviewed the UX research and the Bootcamp Format Comprehensive Upgrade Plan. The functional logic is sound, but the execution of the Coach Assistant interface—the very conduit through which our trainers will interact with this new complexity—must be visually flawless. 

We are building a premium, voice-first AI coaching experience for high-end trainers. The interface cannot feel like a generic chat wrapper; it must feel like a high-performance command center. 

Here is my **FINAL VISUAL SPECIFICATION** for the Coach Assistant UI components, strictly utilizing the **Crystalline Swan** design system. Do not deviate from these exact values.

---

### 🎨 Crystalline Swan CSS Custom Properties (Base Tokens)
Implement these exactly as written before building the components:
```css
:root {
  --swan-midnight: #002060;
  --swan-royal: #003080;
  --swan-ice: #60C0F0;
  --swan-arctic: #50A0F0;
  --swan-fern: #C6A84B;
  --swan-frost: #E0ECF4;
  --swan-lavender: #4070C0;
  --swan-wing: #8B5CF6;
  --swan-obsidian: #0A0A0F;
  --swan-carbon: #141419;
  --swan-graphite: #1A1A24;
  
  /* Dual-Glow Tokens */
  --glow-blue-purple: 0 0 15px rgba(96, 192, 240, 0.4), 0 0 30px rgba(139, 92, 246, 0.4);
  --glow-purple-cyan: 0 0 15px rgba(139, 92, 246, 0.4), 0 0 30px rgba(80, 160, 240, 0.4);
}
```

---

### 1. Conversation Sidebar
This is the trainer's primary workspace for interacting with the AI to build the new `2x8_r3` or `mixed_unilateral` formats. It must feel grounded but fluid.

*   **Width:** `380px` fixed on desktop. `100vw` on mobile.
*   **Background Color:** `--swan-carbon` (`#141419`) with a `1px solid --swan-graphite` (`#1A1A24`) left border to separate it from the main builder.
*   **Item Height:** Auto-expanding based on content, but with strict base padding of `16px 20px`.
*   **Hover State (History Items):** Background shifts to `--swan-graphite` (`#1A1A24`). Left border highlights with `2px solid --swan-ice` (`#60C0F0`).
*   **Active State (Current Session):** Background shifts to a 20% opacity wash of `--swan-midnight` (`rgba(0, 32, 96, 0.2)`). Left border locks to `3px solid --swan-arctic` (`#50A0F0`).
*   **Transition Timing:** `transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);`
*   **Mobile Drawer Animation:** 
    *   *Hidden:* `transform: translateX(100%); opacity: 0;`
    *   *Visible:* `transform: translateX(0); opacity: 1;`
    *   *Animation:* `350ms cubic-bezier(0.2, 0.8, 0.2, 1)` (A fast slide-in with a smooth, premium deceleration).

### 2. Markdown Renderer
When the AI outputs the new complex format tables (e.g., the 15-row format library) or code snippets, readability is non-negotiable.

*   **Code Block Background:** `--swan-obsidian` (`#0A0A0F`) with a `1px solid --swan-graphite` (`#1A1A24`) border. Border radius: `8px`. Padding: `16px`.
*   **Syntax Highlighting Colors:**
    *   Keywords/Operators: `--swan-wing` (`#8B5CF6`)
    *   Strings/Values: `--swan-ice` (`#60C0F0`)
    *   Numbers/Booleans (like the new `unilateral` flag): `--swan-fern` (`#C6A84B`)
    *   Comments: `--swan-arctic` at 60% opacity (`rgba(80, 160, 240, 0.6)`)
*   **Table Style (CRITICAL FOR MOBILE):**
    *   *Wrapper:* `overflow-x: auto; -webkit-overflow-scrolling: touch;`
    *   *Header (TH):* Background `--swan-midnight` (`#002060`), Text `--swan-frost` (`#E0ECF4`), Font weight `600`, Padding `12px 16px`.
    *   *Cells (TD):* Background `--swan-carbon` (`#141419`), Border-bottom `1px solid --swan-graphite` (`#1A1A24`), Padding `12px 16px`.
*   **Blockquote Border:** `4px solid --swan-wing` (`#8B5CF6`). Background: `rgba(20, 20, 25, 0.5)` (Carbon at 50%). Padding: `12px 16px`.
*   **Heading Sizes:** 
    *   H1: `24px`, `--swan-frost` (`#E0ECF4`), `font-weight: 700`, `letter-spacing: -0.02em`.
    *   H2: `20px`, `--swan-ice` (`#60C0F0`), `font-weight: 600`.
    *   H3: `16px`, `--swan-arctic` (`#50A0F0`), `font-weight: 600`, uppercase, `letter-spacing: 0.05em`.

### 3. Thinking Indicator
When the AI is calculating the timing preview for a complex `death_by` or `chipper` format, the user needs visual reassurance that the system is working, not frozen.

*   **Bubble Shape:** Pill-shaped. `border-radius: 20px; padding: 10px 18px; width: fit-content;`
*   **Background:** `--swan-carbon` (`#141419`) with a `1px solid --swan-graphite` (`#1A1A24`).
*   **Shimmer Animation Spec:** A subtle, sweeping gradient across the background.
    *   `background: linear-gradient(90deg, #141419 0%, #002060 50%, #141419 100%);`
    *   `background-size: 200% 100%;`
    *   `animation: shimmerSweep 2s infinite linear;`
*   **Dots:** 3 circular dots, `6px` diameter, `--swan-arctic` (`#50A0F0`).
*   **Dot Animation:** `animation: dotPulse 1.4s infinite ease-in-out both;` (Staggered delays: `0s`, `0.2s`, `0.4s`). Opacity pulses from `0.2` to `1.0`.

### 4. Voice Recording Overlay
This is the centerpiece of the "voice-first" experience. It must feel alive, responsive, and distinctly "Crystalline Swan."

*   **Orb Size:** `80px` diameter base. `border-radius: 50%`.
*   **Base Color:** `--swan-midnight` (`#002060`) with an inner shadow to give it depth.
*   **Amplitude Ring Specs (Dynamic based on mic input):**
    *   *Ring 1 (Inner):* `border: 2px solid --swan-arctic` (`#50A0F0`). Max scale `1.2`. Opacity `0.8`.
    *   *Ring 2 (Middle):* `border: 2px solid --swan-wing` (`#8B5CF6`). Max scale `1.5`. Opacity `0.4`.
    *   *Ring 3 (Outer):* `background: rgba(96, 192, 240, 0.1)` (Ice Wing wash). Max scale `1.8`. Opacity `0.2`.
    *   *Easing:* `transition: transform 100ms ease-out;` (Must be fast to match voice amplitude).
*   **Duration Label Style:** Positioned `24px` below the orb. Font size `18px`, `font-weight: 700`, color `--swan-frost` (`#E0ECF4`), `font-variant-numeric: tabular-nums;` (prevents jittering as seconds tick).
*   **Color Transitions (The Dual-Glow):** 
    *   *Idle/Listening:* Subtle `--glow-blue-purple`.
    *   *Active Speech (High Amplitude):* Orb background transitions to `--swan-wing` (`#8B5CF6`) and emits the intense `--glow-purple-cyan`. `transition: background-color 300ms ease, box-shadow 300ms ease;`

### 5. Provider Badge
Identifies whether the message is from the "System", "Trainer", or "Swan AI".

*   **Size:** Height `22px`, Padding `0 10px`. `border-radius: 6px`.
*   **Font:** `11px`, `font-weight: 700`, uppercase, `letter-spacing: 0.06em`.
*   **Color:** 
    *   *AI Badge:* Text `--swan-frost` (`#E0ECF4`), Background `--swan-royal` (`#003080`), Border `1px solid --swan-ice` (`#60C0F0`).
    *   *Trainer Badge:* Text `--swan-obsidian` (`#0A0A0F`), Background `--swan-fern` (`#C6A84B`), Border `none`.
*   **Placement:** Absolute positioned relative to the message bubble. `top: -11px; left: 16px;` (Breaks the border of the message bubble for a layered, dimensional look).

### 6. Attachment Preview
For when a trainer uploads a reference image or a CSV of their old class formats.

*   **Thumbnail Size:** `64px` width × `64px` height. `object-fit: cover;`
*   **Border Radius:** `8px`.
*   **Border:** `1px solid --swan-graphite` (`#1A1A24`).
*   **Hover State:** Border transitions to `1px solid --swan-arctic` (`#50A0F0`). Image opacity drops to `0.8`.
*   **Remove Button Placement:** Absolute positioned at `top: -8px; right: -8px;` (Overlapping the top-right corner).
*   **Remove Button Specs:** `20px` diameter circle. Background `--swan-obsidian` (`#0A0A0F`). Icon (X) color `--swan-frost` (`#E0ECF4`). Border `1px solid --swan-graphite` (`#1A1A24`). Hovering the button turns the icon `--swan-wing` (`#8B5CF6`).

---

**Creative Director's Final Note:** 
The success of this Bootcamp Builder upgrade hinges on managing cognitive load. The trainer is dealing with unilateral flags, work/rest ratios, and complex class styles like `death_by`. The UI must *never* add to that friction. Implement these specs with pixel-perfect precision. Do not use generic component libraries without overriding them to match this exact token architecture.

---

## Design Implementation Reviewer — Round 2

# Design Implementation Review — Round 1

## Overall Assessment

The Creative Director's visual specification demonstrates strong understanding of the Crystalline Swan design system. The token usage is consistent, the mobile considerations are thorough, and the voice-first experience specifications are well-conceived. However, several technical gaps require addressing before implementation.

---

## Agreement Points

| Component | Assessment |
|-----------|------------|
| **Conversation Sidebar** | Width, colors, hover/active states, and transition timing are correct. Mobile drawer animation spec is appropriate for premium feel. |
| **Markdown Renderer** | Table overflow handling (`overflow-x: auto`, `-webkit-overflow-scrolling: touch`) is essential for mobile. Header/cell contrast ratios are accessible. |
| **Thinking Indicator** | Pill shape geometry (`border-radius: 20px; padding: 10px 18px`) will render correctly. Dot pulse specification with staggered delays is appropriate. |
| **Voice Recording Overlay** | Dual-glow color transitions and amplitude ring layering create the "alive" quality required. Orb size and ring scaling specs are reasonable. |
| **Provider Badge** | Absolute positioning at `top: -11px; left: 16px` creates the "breaking the border" dimensional effect correctly. Color coding is clear. |
| **Attachment Preview** | 64×64 thumbnail with `object-fit: cover` handles various aspect ratios. Remove button overlap positioning is standard. |

---

## Disputed Points & Proposed Alternatives

### 1. Thinking Indicator Shimmer — Hardcoded Hex Values

**Issue:** The shimmer animation uses raw hex values instead of CSS custom properties:

```css
/* CURRENT (lines 47-50) */
background: linear-gradient(90deg, #141419 0%, #002060 50%, #141419 100%);
```

These map to `--swan-carbon` and `--swan-midnight` respectively, but hardcoding breaks the token system. If we update `--swan-midnight` for brand adjustments, the shimmer animation won't reflect the change.

**Proposed Fix:**
```css
/* Add to :root */
--shimmer-dark: var(--swan-carbon);
--shimmer-bright: var(--swan-midnight);

/* Update thinking indicator */
.thinking-indicator {
  background: linear-gradient(90deg, 
    var(--shimmer-dark) 0%, 
    var(--shimmer-bright) 50%, 
    var(--shimmer-dark) 100%
  );
  background-size: 200% 100%;
  animation: shimmerSweep 2s infinite linear;
}
```

---

### 2. Thinking Indicator — Missing Keyframe Definitions

**Issue:** The spec references `shimmerSweep` and `dotPulse` animations but doesn't define the `@keyframes`. Implementation cannot proceed without these.

**Proposed Keyframes:**
```css
/* shimmerSweep — 2s infinite linear (from spec) */
@keyframes shimmerSweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* dotPulse — 1.4s infinite ease-in-out both (from spec) */
@keyframes dotPulse {
  0%, 80%, 100% { 
    opacity: 0.2; 
    transform: scale(0.8); 
  }
  40% { 
    opacity: 1.0; 
    transform: scale(1.0); 
  }
}
```

**Staggered delays as specified:**
```css
.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
```

---

### 3. Voice Recording Overlay — Ring Overflow on Mobile

**Issue:** The amplitude rings scale up to 1.8× on the 80px orb (144px potential diameter). On mobile devices with smaller viewports or constrained overlay containers, these rings may bleed beyond visible bounds or clip incorrectly.

**Proposed Addition:**
```css
.voice-recording-overlay {
  position: relative;
  overflow: visible; /* Allow rings to extend slightly */
}

.voice-recording-orb-container {
  width: 80px;
  height: 80px;
  position: relative;
  /* Ensure orb is centered and clips inner rings */
  overflow: hidden; 
}

/* Allow outer ring (Ring 3) to overflow for effect */
.ring-3 {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* Ring 3 should overflow to create "glow" effect */
  pointer-events: none;
}

@media (max-width: 480px) {
  .voice-recording-orb-container {
    /* On very small screens, cap the orb to viewport-safe size */
    width: 70px;
    height: 70px;
  }
  
  .ring-3 {
    /* Reduce max scale on mobile to prevent overflow */
    max-scale: 1.5; /* Was 1.8 */
  }
}
```

---

### 4. Conversation Sidebar — Missing Message Bubble Specification

**Issue:** The spec defines history item and active session states but doesn't specify how individual message bubbles within the active conversation should render. For the `2x8_r3` and `mixed_unilateral` format discussions, bubble differentiation (AI vs. Trainer) is critical for scanability.

**Proposed Addition:**
```css
/* Message Bubble Base */
.message-bubble {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
  margin-bottom: 8px;
}

/* AI Message Bubble */
.message-bubble.ai {
  background: var(--swan-graphite);
  border: 1px solid var(--swan-carbon);
  border-bottom-left-radius: 4px; /* Speech bubble tail effect */
  margin-right: auto;
}

/* Trainer Message Bubble */
.message-bubble.trainer {
  background: linear-gradient(135deg, 
    rgba(96, 192, 240, 0.15), 
    rgba(139, 92, 246, 0.1)
  );
  border: 1px solid var(--swan-ice);
  border-bottom-right-radius: 4px;
  margin-left: auto;
}
```

---

### 5. Markdown Renderer — Missing Horizontal Rule Styling

**Issue:** Complex `death_by` and `chipper` format outputs often use horizontal rules to separate sections. The spec doesn't include HR styling, leading to browser defaults that clash with Crystalline Swan.

**Proposed Addition:**
```css
/* Horizontal Rule */
.markdown-renderer hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent, 
    var(--swan-ice) 20%, 
    var(--swan-wing) 50%, 
    var(--swan-ice) 80%, 
    transparent
  );
  margin: 24px 0;
}
```

---

## Summary of Disputed Items

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Shimmer uses hardcoded hex instead of CSS variables | Medium | Requires fix before implementation |
| 2 | Missing `@keyframes` definitions for animations | High | Blocking |
| 3 | Amplitude rings may overflow on mobile | Low | Edge case, add media query |
| 4 | Message bubble styling omitted | Medium | Needed for conversation clarity |
| 5 | Horizontal rule styling omitted | Low | Consistency with dark theme |

---

## Round 2 Action Items

I request the Creative Director provide:
1. Confirmation of `@keyframes` definitions (or acknowledgment that implementation team should infer from spec).
2. Decision on message bubble differentiation (AI vs Trainer styling).
3. Approval of proposed CSS variable usage for shimmer animation.

---

*Awaiting Creative Director's Round 2 response before finalizing implementation-ready spec.*

---

## Creative Director (Lead Design Authority) — Round 3

As Creative Director, I appreciate the rigorous technical review. A design system is only as strong as its implementation, and your catch regarding the hardcoded hex values in the shimmer animation (Dispute 1) is exactly why this review process exists. I fully **AGREE** with your proposed CSS variable fix for the shimmer, as well as your elegant gradient solution for the Horizontal Rule (Dispute 5). 

However, we have some critical discrepancies regarding the execution of the animations, the voice orb's DOM physics, and the message bubble aesthetics. 

Here are my rulings and required adjustments for Round 2.

---

### ❌ DISPUTE 2: Keyframe Definitions (Partial Disagreement)
**Why I disagree:** I accept the necessity of defining the `@keyframes` in the spec, and your `shimmerSweep` logic is mathematically sound. However, your `dotPulse` animation is purely structural (opacity and scale). In the Crystalline Swan system, active elements must *emit light*. 

**Proposed Alternative (The Fix):**
We must inject the `--swan-arctic` glow into the 40% keyframe to ensure the dots don't just get larger, but actually illuminate.

```css
/* APPROVED: shimmerSweep */
@keyframes shimmerSweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* REVISED: dotPulse (Adding Luminescence) */
@keyframes dotPulse {
  0%, 80%, 100% { 
    opacity: 0.2; 
    transform: scale(0.8); 
    box-shadow: 0 0 0 rgba(80, 160, 240, 0);
  }
  40% { 
    opacity: 1.0; 
    transform: scale(1.0); 
    /* NEW: Crystalline Swan signature glow */
    box-shadow: 0 0 8px rgba(80, 160, 240, 0.6); 
  }
}
```

---

### ❌ DISPUTE 3: Voice Recording Overlay Overflow (Critical Rejection)
**Why I disagree:** Your proposed fix applies `overflow: hidden;` to the `.voice-recording-orb-container`. **Do not do this.** If the container clips the inner rings, the amplitude effect is completely destroyed. The rings must radiate *outward* from behind the base orb, breaking the orb's bounding box. 

**Proposed Alternative (Z-Index Stacking Context):**
Instead of clipping, we must use proper z-indexing so the rings sit behind the orb, and we will accept your mobile media query to prevent viewport bleed.

```css
/* REVISED: Voice Overlay Stacking Context */
.voice-recording-wrapper {
  position: relative;
  width: 144px; /* Accommodates the max 1.8x scale of the 80px orb */
  height: 144px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-recording-orb-base {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--swan-midnight);
  z-index: 10; /* Orb sits on top */
  position: relative;
}

/* Rings sit behind the orb and scale outward */
.amplitude-ring {
  position: absolute;
  border-radius: 50%;
  top: 0; left: 0; right: 0; bottom: 0;
  margin: auto;
  z-index: 1; 
  pointer-events: none;
}

/* APPROVED: Mobile scaling adjustments */
@media (max-width: 480px) {
  .voice-recording-orb-base {
    width: 70px;
    height: 70px;
  }
  .ring-3 {
    transform: scale(1.5); /* Capped from 1.8 */
  }
}
```

---

### ❌ DISPUTE 4: Message Bubble Specification (Rejection of Gradient)
**Why I disagree:** Your structural additions for the message bubbles (max-width, border-radius, tail effect) are excellent and approved. However, your proposed background for the `.message-bubble.trainer` uses a linear gradient `linear-gradient(135deg, rgba(96, 192, 240, 0.15), rgba(139, 92, 246, 0.1))`. 

This introduces too much visual noise. The Trainer bubble will already have the `--swan-fern` (Gold) Provider Badge attached to it (as agreed in Round 1). Mixing a blue/purple gradient bubble with a gold badge will look muddy and break our premium aesthetic. The Trainer bubble needs to be grounded.

**Proposed Alternative (Solid Wash):**
```css
/* APPROVED: AI Message Bubble */
.message-bubble.ai {
  background: var(--swan-graphite);
  border: 1px solid var(--swan-carbon);
  border-bottom-left-radius: 4px; 
  margin-right: auto;
}

/* REVISED: Trainer Message Bubble */
.message-bubble.trainer {
  /* Replaced gradient with a subtle midnight wash */
  background: rgba(0, 32, 96, 0.3); /* --swan-midnight at 30% */
  border: 1px solid var(--swan-royal);
  border-bottom-right-radius: 4px;
  margin-left: auto;
  /* Ensure text remains high-contrast */
  color: var(--swan-frost); 
}
```

---

### Round 2 Summary for Implementation Reviewer:
1. Please confirm the updated `dotPulse` keyframes with the added `box-shadow` glow.
2. Please confirm the removal of `overflow: hidden` in favor of the flex/z-index stacking context for the Voice Orb.
3. Please confirm the revised solid-wash background for the Trainer message bubble to preserve visual hierarchy with the Provider Badges. 

Once these three points are aligned, we will have a flawless, implementation-ready specification.

---

## Design Implementation Reviewer — Round 4

# Design Implementation Review — Round 2

## Analysis of Creative Director's Round 2 Response

The Creative Director has provided thoughtful refinements that address the core issues. I find substantial agreement with the direction. Let me provide my assessment.

---

## Agreement Points

| # | Creative Director's Ruling | Assessment |
|---|---------------------------|------------|
| **1** | Approved `shimmerSweep` keyframes as proposed | ✅ **AGREE** — Mathematically sound, left-to-right sweep matches the 200% background-size. |
| **2** | Enhanced `dotPulse` with `box-shadow: 0 0 8px rgba(80, 160, 240, 0.6)` at 40% keyframe | ✅ **AGREE** — This is a superior approach. Injecting the `--swan-arctic` glow creates the "luminescent" quality the Crystalline Swan system requires. Structural opacity alone would feel flat. |
| **3** | Rejected `overflow: hidden`; replaced with Z-index stacking context | ✅ **AGREE** — This is definitively superior. My overflow suggestion would have destroyed the radial amplitude effect. The wrapper dimensions (144px) and z-index stacking (orb at 10, rings at 1) is the correct implementation. |
| **4** | Replaced trainer bubble gradient with solid midnight wash (`rgba(0, 32, 96, 0.3)`) | ✅ **AGREE** — The visual hierarchy reasoning is sound. A gold badge on a blue/purple gradient would create muddy color mixing. The 30% midnight wash provides sufficient differentiation while keeping the trainer bubble grounded. |

---

## Confirmation of Three Alignment Points

I confirm all three points from the Creative Director's summary:

1. ✅ **dotPulse with luminescent box-shadow** — Approved for implementation
2. ✅ **Z-index stacking context** for Voice Orb — Approved, overflow:hidden removed
3. ✅ **Solid midnight wash** for Trainer bubbles — Approved, gradient rejected

---

## One Technical Addition Required

### Mobile Wrapper Dimensions

The Creative Director's spec defines the `.voice-recording-wrapper` at `144px × 144px` to accommodate the 1.8× scaled orb. However, this should be reflected in the mobile media query to maintain the same proportion.

**Proposed Mobile Addition:**
```css
@media (max-width: 480px) {
  .voice-recording-wrapper {
    /* Reduce proportionally from 144px to 126px (144 × 70/80) */
    width: 126px;
    height: 126px;
  }
  
  .voice-recording-orb-base {
    width: 70px;
    height: 70px;
  }
  
  .ring-3 {
    transform: scale(1.5); /* Capped from 1.8 */
  }
}
```

This ensures the stacking context container scales with the orb, preventing any clipping or offset issues on smaller viewports.

---

## Summary

| Status | Count |
|--------|-------|
| **Agreed** | 4 of 4 disputed items |
| **New addition proposed** | 1 (mobile wrapper scaling) |
| **Blocking issues** | 0 |

---

## Implementation Readiness

**With the mobile wrapper addition, the specification is now implementation-ready.** All disputes have been resolved through constructive refinement. The Crystalline Swan token architecture remains intact, the voice-first experience specifications are technically sound, and the mobile considerations are comprehensive.

**Request:** If the Creative Director approves the mobile wrapper scaling addition, we can advance to final implementation without further review rounds.

---

*Awaiting Creative Director's Round 3 response for final approval.*

---

## Creative Director (Lead Design Authority) — Round 5

CONSENSUS REACHED

As Creative Director, I fully approve your mathematical deduction for the mobile wrapper dimensions. Scaling the `.voice-recording-wrapper` proportionally to `126px` on mobile viewports perfectly accommodates the `70px` base orb and prevents any layout shifting or clipping. This is exactly the kind of rigorous technical foresight this project requires.

With all disputes resolved, we have forged a flawless, implementation-ready specification that balances the premium aesthetics of the Crystalline Swan design system with robust, accessible DOM architecture.

Here is the **Final Merged Specification** for the engineering team.

***

# FINAL VISUAL SPECIFICATION: Coach Assistant UI

### 🎨 1. Crystalline Swan Base Tokens
```css
:root {
  /* Core Palette */
  --swan-midnight: #002060;
  --swan-royal: #003080;
  --swan-ice: #60C0F0;
  --swan-arctic: #50A0F0;
  --swan-fern: #C6A84B;
  --swan-frost: #E0ECF4;
  --swan-lavender: #4070C0;
  --swan-wing: #8B5CF6;
  --swan-obsidian: #0A0A0F;
  --swan-carbon: #141419;
  --swan-graphite: #1A1A24;
  
  /* Animation Variables */
  --shimmer-dark: var(--swan-carbon);
  --shimmer-bright: var(--swan-midnight);

  /* Dual-Glow Tokens */
  --glow-blue-purple: 0 0 15px rgba(96, 192, 240, 0.4), 0 0 30px rgba(139, 92, 246, 0.4);
  --glow-purple-cyan: 0 0 15px rgba(139, 92, 246, 0.4), 0 0 30px rgba(80, 160, 240, 0.4);
}
```

### 💬 2. Conversation Sidebar & Message Bubbles
**Sidebar Container:**
*   **Width:** `380px` fixed (desktop), `100vw` (mobile).
*   **Background:** `--swan-carbon` with `1px solid --swan-graphite` left border.
*   **History Item Hover:** Background `--swan-graphite`, left border `2px solid --swan-ice`.
*   **Active Session:** Background `rgba(0, 32, 96, 0.2)`, left border `3px solid --swan-arctic`.
*   **Mobile Drawer:** `transform: translateX(100%); opacity: 0;` to `transform: translateX(0); opacity: 1;` via `transition: all 350ms cubic-bezier(0.2, 0.8, 0.2, 1)`.

**Message Bubbles:**
```css
.message-bubble {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
  margin-bottom: 8px;
}

.message-bubble.ai {
  background: var(--swan-graphite);
  border: 1px solid var(--swan-carbon);
  border-bottom-left-radius: 4px; 
  margin-right: auto;
}

.message-bubble.trainer {
  background: rgba(0, 32, 96, 0.3); /* Solid midnight wash */
  border: 1px solid var(--swan-royal);
  border-bottom-right-radius: 4px;
  margin-left: auto;
  color: var(--swan-frost); 
}
```

### 🏷️ 3. Provider Badges
*   **Specs:** Height `22px`, Padding `0 10px`, `border-radius: 6px`, Font `11px/700` uppercase (`letter-spacing: 0.06em`).
*   **Placement:** `position: absolute; top: -11px; left: 16px;` (Breaks bubble border).
*   **AI Badge:** Text `--swan-frost`, Background `--swan-royal`, Border `1px solid --swan-ice`.
*   **Trainer Badge:** Text `--swan-obsidian`, Background `--swan-fern`, Border `none`.

### 📝 4. Markdown Renderer (Complex Formats)
*   **Code Blocks:** Background `--swan-obsidian`, Border `1px solid --swan-graphite`, Radius `8px`, Padding `16px`.
*   **Syntax:** Keywords `--swan-wing`, Strings `--swan-ice`, Numbers/Booleans `--swan-fern`, Comments `--swan-arctic` (60% opacity).
*   **Tables (Mobile-Safe):** Wrapper gets `overflow-x: auto; -webkit-overflow-scrolling: touch;`. TH gets `--swan-midnight` background / `--swan-frost` text. TD gets `--swan-carbon` background / `1px solid --swan-graphite` bottom border.
*   **Horizontal Rule:**
```css
.markdown-renderer hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--swan-ice) 20%, var(--swan-wing) 50%, var(--swan-ice) 80%, transparent);
  margin: 24px 0;
}
```

### 🧠 5. Thinking Indicator
```css
.thinking-indicator {
  border-radius: 20px;
  padding: 10px 18px;
  width: fit-content;
  border: 1px solid var(--swan-graphite);
  background: linear-gradient(90deg, var(--shimmer-dark) 0%, var(--shimmer-bright) 50%, var(--shimmer-dark) 100%);
  background-size: 200% 100%;
  animation: shimmerSweep 2s infinite linear;
}

.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background-color: var(--swan-arctic);
  animation: dotPulse 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes shimmerSweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes dotPulse {
  0%, 80%, 100% { 
    opacity: 0.2; 
    transform: scale(0.8); 
    box-shadow: 0 0 0 rgba(80, 160, 240, 0);
  }
  40% { 
    opacity: 1.0; 
    transform: scale(1.0); 
    box-shadow: 0 0 8px rgba(80, 160, 240, 0.6); /* Luminescent glow */
  }
}
```

### 🎙️ 6. Voice Recording Overlay (Z-Index Architecture)
```css
.voice-recording-wrapper {
  position: relative;
  width: 144px; 
  height: 144px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-recording-orb-base {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--swan-midnight);
  z-index: 10; 
  position: relative;
  transition: background-color 300ms ease, box-shadow 300ms ease;
}

/* Active Speech State applied to orb-base */
.voice-recording-orb-base.active {
  background: var(--swan-wing);
  box-shadow: var(--glow-purple-cyan);
}

.amplitude-ring {
  position: absolute;
  border-radius: 50%;
  top: 0; left: 0; right: 0; bottom: 0;
  margin: auto;
  z-index: 1; 
  pointer-events: none;
  transition: transform 100ms ease-out;
}

/* Ring Specifics */
.ring-1 { border: 2px solid var(--swan-arctic); opacity: 0.8; /* Max scale 1.2 */ }
.ring-2 { border: 2px solid var(--swan-wing); opacity: 0.4; /* Max scale 1.5 */ }
.ring-3 { background: rgba(96, 192, 240, 0.1); opacity: 0.2; /* Max scale 1.8 */ }

/* Mobile Scaling */
@media (max-width: 480px) {
  .voice-recording-wrapper {
    width: 126px;
    height: 126px;
  }
  .voice-recording-orb-base {
    width: 70px;
    height: 70px;
  }
  .ring-3 {
    transform: scale(1.5); /* Capped to prevent viewport bleed */
  }
}
```

### 📎 7. Attachment Preview
*   **Thumbnail:** `64px` × `64px`, `object-fit: cover`, `border-radius: 8px`, `border: 1px solid --swan-graphite`.
*   **Hover:** Border transitions to `--swan-arctic`, image opacity `0.8`.
*   **Remove Button:** `20px` circle, `position: absolute; top: -8px; right: -8px;`. Background `--swan-obsidian`, Icon `--swan-frost`, Border `1px solid --swan-graphite`. Hover turns icon `--swan-wing`.

***
*Engineering Team: You are cleared for immediate implementation based on this specification.*

---

