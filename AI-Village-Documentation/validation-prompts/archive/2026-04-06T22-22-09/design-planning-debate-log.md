# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 7
> **Tokens:** 47,796 input / 13,863 output

---

## Creative Director (Lead Design Authority) — Round 1

**FROM THE DESK OF THE CREATIVE DIRECTOR**
**PROJECT:** SwanStudios Coach Assistant Upgrade (Crystalline Swan)
**STATUS:** FINAL DESIGN SPECIFICATION — ROUND 1

Listen up, engineering and product teams. The current state of our AI interfaces is fragmented, desktop-biased, and frankly, unacceptable for an enterprise-grade platform. We are building the *Enchanted Apex*, not a weekend hackathon project. 

The Coach Assistant is the beating heart of our AI-driven periodization and client management. It must feel like a unified, premium, and highly responsive intelligence layer. I have reviewed the UX research, and I am laying down the absolute visual law for the Coach Assistant refactor. 

No deviations. No "close enough" approximations. You will build exactly to these specifications using the Crystalline Swan design tokens. 

Here is your CSS custom property foundation. Inject this globally:
```css
:root {
  --color-midnight-sapphire: #002060;
  --color-royal-depth: #003080;
  --color-ice-wing: #60C0F0;
  --color-arctic-cyan: #50A0F0;
  --color-wing-purple: #8B5CF6;
  --color-gilded-fern: #C6A84B;
  --color-frost-white: #E0ECF4;
  --color-obsidian-black: #0A0A0F;
  --color-carbon: #141419;
  --color-graphite: #1A1A24;
}
```

---

### 1. Conversation Sidebar (Unified AI Terminal)
This is the persistent intelligence layer. It must slide in flawlessly and never trap the user.

*   **Width:** 
    *   Desktop: `380px` fixed.
    *   Mobile (iPhone XR focus): `calc(100vw - 16px)` floating drawer, centered.
*   **Background Color:** `var(--color-carbon)` with a `1px solid var(--color-graphite)` border. Add an inner top-edge highlight: `inset 0 1px 0 rgba(96, 192, 240, 0.1)`.
*   **Item Height (Chat Bubbles/History):** `auto`, but enforce a `min-height: 64px` for WCAG AA touch targets. Padding must be `16px 20px`.
*   **Hover State (History Items):** Background shifts to `var(--color-graphite)`. Left border accent appears: `4px solid var(--color-ice-wing)`.
*   **Active State (Current Session):** Background shifts to `rgba(0, 32, 96, 0.4)` (Midnight Sapphire at 40%). Left border accent locks in: `4px solid var(--color-wing-purple)`.
*   **Transition Timing:** `background-color 250ms ease, border-left 200ms ease`.
*   **Mobile Drawer Animation:** 
    *   Pattern: Bottom Sheet.
    *   Keyframes: `transform: translateY(100%)` → `transform: translateY(0)`.
    *   Timing: `350ms`.
    *   Easing Curve: `cubic-bezier(0.2, 0.8, 0.2, 1)` (Fast entry, smooth deceleration).

### 2. Markdown Renderer
Raw HTML tags in the AI output are a P0 visual failure. The AI speaks in Markdown; we render it beautifully.

*   **Code Block Background:** `var(--color-obsidian-black)` with a `1px solid var(--color-graphite)` border. Border-radius: `8px`. Padding: `16px`.
*   **Syntax Highlighting Colors:**
    *   Keywords/Logic: `var(--color-wing-purple)`
    *   Strings/Values: `var(--color-arctic-cyan)`
    *   Functions/Methods: `var(--color-ice-wing)`
    *   Comments: `var(--color-gilded-fern)` (Opacity: `0.7`)
*   **Table Style:**
    *   Header Background: `var(--color-royal-depth)`
    *   Row Background: Alternating `transparent` and `rgba(26, 26, 36, 0.4)` (Graphite).
    *   Borders: `1px solid var(--color-graphite)`.
    *   Cell Padding: `12px 16px`.
*   **Blockquote Border:** `4px solid var(--color-wing-purple)`. 
    *   Background: `linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, transparent 100%)`.
    *   Padding: `12px 16px`.
*   **Heading Sizes (Responsive):**
    *   **H1:** `24px` (Mobile: `22px`), Weight: `700`, Color: `var(--color-frost-white)`, Margin-bottom: `16px`.
    *   **H2:** `20px` (Mobile: `18px`), Weight: `600`, Color: `var(--color-ice-wing)`, Margin-bottom: `12px`.
    *   **H3:** `16px` (Mobile: `16px`), Weight: `600`, Color: `var(--color-frost-white)`, Margin-bottom: `8px`.

### 3. Thinking Indicator
No generic spinners. The AI is "thinking" and it needs to feel crystalline and alive.

*   **Bubble Shape:** Pill-shaped container. `border-radius: 20px`. Padding: `12px 20px`. Background: `var(--color-carbon)`. Border: `1px solid var(--color-graphite)`.
*   **Shimmer Animation Spec:** Three distinct dots (`6px x 6px`, `border-radius: 50%`), spaced `6px` apart.
    *   Dot 1 Color: `var(--color-ice-wing)`
    *   Dot 2 Color: `var(--color-arctic-cyan)`
    *   Dot 3 Color: `var(--color-wing-purple)`
*   **Timing:** `1.4s` infinite loop.
*   **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`.
*   **Keyframes (`swanThink`):**
    *   `0%, 100% { transform: translateY(0) scale(0.8); opacity: 0.4; }`
    *   `50% { transform: translateY(-4px) scale(1.2); opacity: 1; box-shadow: 0 0 8px currentColor; }`
    *   *Stagger:* Dot 1 (`animation-delay: 0s`), Dot 2 (`animation-delay: 0.2s`), Dot 3 (`animation-delay: 0.4s`).

### 4. Voice Recording Overlay
The microphone experience is currently broken. We are fixing it with a highly visible, multimodal voice orb.

*   **Orb Size:** `72px x 72px` (Massive, unmistakable touch target). `border-radius: 50%`.
*   **Color Transitions & Dual-Button Glow (MANDATORY):**
    *   *Idle State:* Background `var(--color-royal-depth)`.
    *   *Hover State:* Background `var(--color-midnight-sapphire)`. Box-shadow: `0 0 20px var(--color-wing-purple)` (Blue → Purple glow).
    *   *Recording State:* Background `var(--color-wing-purple)`. Box-shadow: `0 0 24px var(--color-arctic-cyan)` (Purple → Cyan glow).
*   **Amplitude Ring Specs (While Recording):** Three concentric pseudo-element rings pulsing outward.
    *   Ring 1: `var(--color-ice-wing)` at `20%` opacity.
    *   Ring 2: `var(--color-wing-purple)` at `15%` opacity.
    *   Ring 3: `var(--color-arctic-cyan)` at `10%` opacity.
    *   Animation: `transform: scale(1)` to `scale(1.8)`, `opacity: 1` to `opacity: 0`. Duration: `1.2s` ease-out, infinite.
*   **Duration Label Style:** 
    *   Position: Absolute, `bottom: -28px` (centered below orb).
    *   Font: `14px`, `font-variant-numeric: tabular-nums` (prevents jitter as seconds tick).
    *   Color: `var(--color-frost-white)`. Weight: `600`.

### 5. Provider Badge
Users need instant visual confirmation of who is speaking.

*   **Size:** Container padding `4px 10px`. `border-radius: 4px`.
*   **Font:** `11px`, Weight: `700`, Letter-spacing: `0.08em`, Text-transform: `uppercase`.
*   **Placement:** Inline, directly above the message text bubble. `margin-bottom: 6px`.
*   **Colors:**
    *   **AI (Coach):** Text `var(--color-obsidian-black)`, Background `var(--color-ice-wing)`.
    *   **User (Client/Trainer):** Text `var(--color-frost-white)`, Background `var(--color-midnight-sapphire)`.
    *   **System (Error/Alert):** Text `var(--color-obsidian-black)`, Background `var(--color-gilded-fern)`.

### 6. Attachment Preview
For equipment scans and form videos. Must be clean, uniform, and easily dismissible on mobile.

*   **Thumbnail Size:** `64px x 64px`. Object-fit: `cover`.
*   **Border Radius:** `8px`.
*   **Border:** `1px solid var(--color-graphite)`.
*   **Remove Button Placement:** Overlapping top-right corner.
    *   Size: `22px x 22px`. `border-radius: 50%`.
    *   Position: `top: -8px`, `right: -8px`.
    *   Background: `var(--color-obsidian-black)`.
    *   Border: `1px solid var(--color-graphite)`.
    *   Icon (X): `12px` size, Color: `var(--color-frost-white)`.
    *   Hover State: Background shifts to `var(--color-wing-purple)`, Icon shifts to `var(--color-obsidian-black)`. Transition: `150ms ease`.

---
**DIRECTOR'S NOTE:** 
If I see *Galaxy-Swan* hex codes anywhere in the PR for this, I will reject it immediately. Build this exactly as spec'd. Mobile-first means you test these touch targets and animations on the iPhone XR simulator *before* you request a review. 

Execute.

---

## Design Implementation Reviewer — Round 2

# Design Implementation Review — Round 1

## INITIAL ASSESSMENT

The Creative Director's Round 1 specification is **comprehensive and well-structured**. I agree with the overwhelming majority of the design direction. However, I have identified several **implementation-critical clarifications** and **two areas of concern** that require resolution before this spec can be marked as implementation-ready.

---

## AGREEMENTS (No Disputes)

### ✅ 1. CSS Custom Property Foundation
The token set is properly namespaced and uses semantic naming conventions. The hex values are well-chosen for a premium dark theme.

### ✅ 2. Conversation Sidebar Structure
The 64px minimum touch target enforces WCAG AA compliance (2.5.5 Target Size). The hover/active state differentiation is clear and visually distinct.

### ✅ 3. Markdown Renderer
Table alternating rows (`transparent` vs `rgba(26, 26, 36, 0.4)`) is a subtle but effective pattern. The code block obsidian background provides proper contrast for syntax highlighting.

### ✅ 4. Thinking Indicator
The staggered `swanThink` keyframes with `currentColor` box-shadow is **creative and performant**. Using `transform` and `opacity` ensures GPU acceleration.

### ✅ 5. Provider Badge
The three-variant system (AI/User/System) is straightforward. The `letter-spacing: 0.08em` with `text-transform: uppercase` creates proper badge hierarchy.

### ✅ 6. Attachment Preview
The overlapping remove button (-8px offset) is standard UX. The 150ms hover transition is snappy without being jarring.

---

## DISPUTES & CLARIFICATIONS REQUIRED

### ⚠️ ISSUE 1: Missing Responsive Breakpoint Definition
**Severity:** Medium — Implementation Blocker

The spec references "Mobile" and "Desktop" variants throughout (e.g., H1: `24px` (Mobile: `22px`)), but **no breakpoint is explicitly defined**.

**Current Spec Fragment:**
```css
/* H1 Size (stated in spec) */
font-size: 24px; /* (Mobile: 22px) */
```

**Required Clarification:**
What is the mobile breakpoint? Is it:
- `max-width: 768px` (tablet/mobile split)?
- `max-width: 480px` (phone-only)?
- `max-width: 390px` (iPhone 12/13/14 Pro focus)?

**Proposed Resolution:**
Define a single breakpoint for simplicity:
```css
/* File: _variables.scss */
$breakpoint-mobile: 480px;

@mixin mobile {
  @media (max-width: #{$breakpoint-mobile}) {
    @content;
  }
}
```

Without this, engineers will make assumptions, leading to inconsistency across components.

---

### ⚠️ ISSUE 2: Thinking Indicator — Screen Reader Inaccessibility
**Severity:** High — Accessibility Gap

The spec defines the visual animation (`swanThink` keyframes), but there is **no ARIA live region** specified for screen reader users.

**Current Spec:**
```css
/* Shimmer dots defined, but no SR announcement */
<div class="thinking-indicator">
  <span class="dot dot-1"></span>
  <span class="dot dot-2"></span>
  <span class="dot dot-3"></span>
</div>
```

**Problem:** A screen reader user will encounter silent content while the AI "thinks," with no indication that processing is occurring. This fails WCAG 2.1 Success Criterion 4.1.3 (Status Messages).

**Proposed Fix:**
```html
<!-- File: _thinking-indicator.html -->
<div class="thinking-indicator" role="status" aria-live="polite" aria-label="AI is analyzing your request">
  <span class="dot dot-1" aria-hidden="true"></span>
  <span class="dot dot-2" aria-hidden="true"></span>
  <span class="dot dot-3" aria-hidden="true"></span>
</div>
```

**Reasoning:** The `aria-hidden="true"` hides the decorative dots from screen readers, while `role="status"` and `aria-live="polite"` announce that the AI is processing without interrupting current speech. This is a **P0 accessibility fix**.

---

### ⚠️ ISSUE 3: Voice Recording Overlay — State Transition Timing Ambiguity
**Severity:** Low — Implementation Clarity

The spec defines three states (Idle, Hover, Recording) with different colors and shadows, but **does not specify the CSS transition timing** between states.

**Current Spec Fragment:**
```css
/* Recording State */
.recording-orb {
  background: var(--color-wing-purple);
  box-shadow: 0 0 24px var(--color-arctic-cyan);
}

/* Hover State */
.recording-orb:hover {
  background: var(--color-midnight-sapphire);
  box-shadow: 0 0 20px var(--color-wing-purple);
}
```

**Problem:** Without explicit `transition` declarations, browsers will use default timings (often 0ms or inconsistent values), causing jarring color shifts instead of smooth transitions.

**Proposed Fix:**
```css
/* File: _voice-orb.scss */
.recording-orb {
  background: var(--color-royal-depth);
  box-shadow: 0 0 0px transparent;
  transition: 
    background-color 200ms ease-out,
    box-shadow 200ms ease-out;
}

.recording-orb:hover {
  background: var(--color-midnight-sapphire);
  box-shadow: 0 0 20px var(--color-wing-purple);
}

.recording-orb.is-recording {
  background: var(--color-wing-purple);
  box-shadow: 0 0 24px var(--color-arctic-cyan);
}
```

**Reasoning:** The 200ms timing is fast enough to feel responsive but slow enough to register the color shift as intentional rather than accidental.

---

### ⚠️ ISSUE 4: Mobile Drawer — `calc(100vw - 16px)` Edge Case
**Severity:** Low — Edge Case Handling

**Current Spec:**
```css
/* Mobile Drawer */
width: calc(100vw - 16px);
```

**Problem:** This creates an 8px margin on each side. However, on devices with notches or dynamic islands (iPhone 14 Pro, 15 Pro), `100vw` may not account for safe-area insets, potentially causing content to be clipped or overlapped by hardware elements.

**Proposed Fix:**
```css
/* File: _sidebar-mobile.scss */
@media (max-width: 480px) {
  .conversation-sidebar {
    width: calc(100vw - 32px); /* 16px margin each side */
    max-width: calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 32px);
  }
}
```

**Reasoning:** Adding `env(safe-area-inset-*)` ensures the drawer respects iOS safe areas. Increasing margin to 16px per side (32px total) provides better visual breathing room on mobile.

---

## SUMMARY OF REQUESTS

| Issue | Severity | Type | Required Action |
|-------|----------|------|-----------------|
| Missing mobile breakpoint | Medium | Clarification | Define `$breakpoint-mobile` value |
| Thinking indicator ARIA | High | Accessibility Fix | Add `role="status"`, `aria-live`, `aria-hidden` |
| Voice orb transition timing | Low | Implementation Clarity | Add explicit `transition` declarations |
| Mobile safe-area insets | Low | Edge Case | Add `env(safe-area-inset-*)` support |

---

## VERDICT

**SPEC PARTIALLY APPROVED — Pending Clarifications**

The Creative Director's vision is sound. The Crystalline Swan design language is cohesive and premium. However, **three clarifications are blocking final approval**:

1. Define the mobile breakpoint value (REQUIRED before engineering kickoff)
2. Add ARIA attributes to the Thinking Indicator (REQUIRED for WCAG compliance)
3. Confirm state transition timing for Voice Orb (REQUIRED for visual consistency)

Once these three items are addressed, I will grant full approval for implementation.

---

**Awaiting Creative Director's response on the four issues above. Round 2, please.**

---

## Creative Director (Lead Design Authority) — Round 3

**FROM THE DESK OF THE CREATIVE DIRECTOR**
**PROJECT:** SwanStudios Coach Assistant Upgrade (Crystalline Swan)
**STATUS:** DESIGN SPECIFICATION — ROUND 2

Excellent review. This is exactly the level of rigorous pushback I expect from my Lead Implementation Reviewer. You caught critical gaps in accessibility and state transitions. 

However, we have a few discrepancies regarding spatial execution and breakpoints. Here are my rulings on your four issues.

### ⚠️ ISSUE 1: Responsive Breakpoint Definition (DISPUTE / ALTERNATIVE PROPOSED)
I reject `$breakpoint-mobile: 480px;` as the singular layout breakpoint. If we snap the 380px fixed sidebar to a drawer only at 480px, iPad Mini and standard iPads in portrait mode will be left with a cramped, unusable main content area. 

**The Ruling:** We will use a two-tier breakpoint system. 
1.  **Structural Breakpoint (Layout Shift):** `768px`. Below this, the fixed sidebar becomes the bottom-sheet drawer.
2.  **Typographic Breakpoint (Font Scaling):** `430px` (iPhone 14 Pro Max width). Below this, the heading sizes scale down as spec'd in Round 1.

**Code Change (`_variables.scss`):**
```scss
$breakpoint-tablet-portrait: 768px; /* Triggers Drawer */
$breakpoint-mobile-strict: 430px; /* Triggers Typography Scaling */

@mixin tablet-portrait-down {
  @media (max-width: #{$breakpoint-tablet-portrait}) {
    @content;
  }
}

@mixin mobile-strict {
  @media (max-width: #{$breakpoint-mobile-strict}) {
    @content;
  }
}
```

### ⚠️ ISSUE 2: Thinking Indicator — Screen Reader Inaccessibility (AGREED)
Approved. This was a P0 oversight on my part. The Enchanted Apex must be accessible to all coaches and clients. Your proposed ARIA implementation is flawless. 

**Code Change (`_thinking-indicator.html`):**
Implement exactly as you proposed.
```html
<div class="thinking-indicator" role="status" aria-live="polite" aria-label="AI is analyzing your request">
  <span class="dot dot-1" aria-hidden="true"></span>
  <span class="dot dot-2" aria-hidden="true"></span>
  <span class="dot dot-3" aria-hidden="true"></span>
</div>
```

### ⚠️ ISSUE 3: Voice Recording Overlay — State Transition Timing (AGREED)
Approved. `200ms ease-out` provides the exact snappy-yet-smooth tactile response I am looking for. 

**Code Change (`_voice-orb.scss`):**
Inject your exact transition properties into the `.recording-orb` base class.
```css
.recording-orb {
  /* ... existing styles ... */
  transition: 
    background-color 200ms ease-out,
    box-shadow 200ms ease-out;
}
```

### ⚠️ ISSUE 4: Mobile Drawer — Safe Area Insets & Margins (PARTIAL DISPUTE)
I accept your addition of `env(safe-area-inset-*)`. Modern iOS hardware requires this, and it was a good catch. 

However, **I reject your proposal to increase the margin to 16px per side (`calc(100vw - 32px)`)**. Screen real estate on mobile is our most precious commodity. An 8px margin per side is mathematically sufficient to frame the drawer without suffocating the text width. 

**The Ruling:** We keep the 8px per side margin (`16px` total reduction), but we integrate your safe-area logic.

**Code Change (`_sidebar-mobile.scss`):**
```scss
@include tablet-portrait-down {
  .conversation-sidebar {
    /* 8px margin on each side = 16px total */
    width: calc(100vw - 16px); 
    max-width: calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 16px);
    margin: 0 auto; /* Ensures centering within the safe area */
    
    /* Ensure bottom respects home indicator */
    padding-bottom: env(safe-area-inset-bottom); 
  }
}
```

---
**DIRECTOR'S NOTE:**
Update the implementation spec with the two-tier breakpoints and the corrected safe-area math. Confirm these adjustments, and we can lock this specification down.

---

## Design Implementation Reviewer — Round 4

# Design Implementation Review — Round 2

## ANALYSIS OF ROUND 2 RESPONSES

The Creative Director has provided clear, well-reasoned rulings on all four issues. I accept the majority of these decisions while raising one new technical concern and confirming resolution on two items.

---

## AGREEMENTS

### ✅ ISSUE 2: Thinking Indicator ARIA — FULLY RESOLVED

The Creative Director's acceptance of my proposed ARIA implementation is confirmed. The `role="status"`, `aria-live="polite"`, and `aria-hidden` attributes are now part of the specification.

**Final Implementation:**
```html
<!-- File: components/thinking-indicator/_thinking-indicator.html -->
<div class="thinking-indicator" role="status" aria-live="polite" aria-label="AI is analyzing your request">
  <span class="dot dot-1" aria-hidden="true"></span>
  <span class="dot dot-2" aria-hidden="true"></span>
  <span class="dot dot-3" aria-hidden="true"></span>
</div>
```

**Status: CLOSED**

---

### ✅ ISSUE 3: Voice Orb Transition Timing — FULLY RESOLVED

The 200ms `ease-out` curve is approved. This ensures smooth state transitions without feeling sluggish.

**Final Implementation:**
```css
/* File: components/voice-orb/_voice-orb.scss */
.recording-orb {
  background: var(--color-royal-depth);
  box-shadow: 0 0 0px transparent;
  transition: 
    background-color 200ms ease-out,
    box-shadow 200ms ease-out;
}
```

**Status: CLOSED**

---

### ✅ ISSUE 1: Two-Tier Breakpoint System — ACCEPTED WITH CONFIRMATION

The Creative Director's two-tier approach is **superior** to my single-breakpoint proposal. Separating structural layout from typographic scaling is sound architectural thinking.

**Accepted Implementation:**
```scss
/* File: _variables.scss */
$breakpoint-tablet-portrait: 768px; /* Triggers Drawer */
$breakpoint-mobile-strict: 430px;   /* Triggers Typography Scaling */

@mixin tablet-portrait-down {
  @media (max-width: #{$breakpoint-tablet-portrait}) {
    @content;
  }
}

@mixin mobile-strict {
  @media (max-width: #{$breakpoint-mobile-strict}) {
    @content;
  }
}
```

**One Clarification Required:** Confirm whether `430px` is intentional (targeting iPhone 14 Pro Max at 430pt) or should be `414px` (iPhone 14 Pro Max CSS pixels). This is a minor discrepancy but should be explicitly documented.

---

### ✅ ISSUE 4: Mobile Drawer Margins — ACCEPTED

The Creative Director's ruling to maintain 8px per side margins is reasonable. The safe-area integration is the critical fix; the margin width is a subjective design choice within acceptable bounds.

**Final Implementation (as specified):**
```scss
/* File: components/sidebar/_sidebar-mobile.scss */
@include tablet-portrait-down {
  .conversation-sidebar {
    width: calc(100vw - 16px);
    max-width: calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 16px);
    margin: 0 auto;
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

**Status: CLOSED**

---

## NEW ISSUE IDENTIFIED

### ⚠️ ISSUE 5: Bottom Sheet — Missing Drag Handle & Gesture Specification
**Severity:** Medium — Interaction Gap

The mobile drawer is specified as a "Bottom Sheet" pattern, but **no drag handle or swipe-to-dismiss mechanism is defined**. Bottom sheets in modern mobile UX require physical affordances beyond a close button.

**Problem:** Without a visible drag handle, users may not realize the drawer can be dismissed via swipe. The iOS Human Interface Guidelines (and Material Design) specify that bottom sheets should include:

1. A visible drag handle (pill-shaped bar)
2. Optional swipe-to-dismiss gesture

**Proposed Addition:**
```scss
/* File: components/sidebar/_sidebar-mobile.scss */
@include tablet-portrait-down {
  .conversation-sidebar {
    /* ... existing styles ... */
    
    /* Drag handle — required by iOS HIG */
    &::before {
      content: '';
      display: block;
      width: 36px;
      height: 4px;
      background: var(--color-graphite);
      border-radius: 2px;
      margin: 12px auto 8px;
    }
  }
}
```

**Interaction Spec Required:**
The engineering team also needs guidance on swipe-to-dismiss behavior:
- Swipe down past threshold (e.g., 100px) → dismiss drawer
- Swipe down below threshold → spring back to open

**Request:** Add drag handle visual and confirm swipe-to-dismiss behavior (or note that it is out of scope for v1).

---

## UPDATED SUMMARY TABLE

| Issue | Status | Action Required |
|-------|--------|-----------------|
| Mobile breakpoint (768px/430px) | ✅ Accepted | Confirm 430px value |
| Thinking indicator ARIA | ✅ Resolved | None |
| Voice orb transition timing | ✅ Resolved | None |
| Mobile safe-area insets | ✅ Resolved | None |
| Bottom sheet drag handle | ⚠️ New | Add visual spec |

---

## VERDICT

**SPEC SUBSTANTIALLY APPROVED — One New Issue Pending**

Four of the five original issues are now fully resolved. The specification is 95% implementation-ready. The only outstanding item is the addition of a drag handle for the mobile bottom sheet, which is a standard UX pattern that should be explicitly defined.

**Awaiting Creative Director's ruling on:**
1. Confirm `$breakpoint-mobile-strict: 430px` (vs `414px`)
2. Approve/disapprove the drag handle addition
3. Define swipe-to-dismiss behavior (in scope or out of scope for v1?)

**Current Approval Status:** 95% — Ready for engineering kickoff pending the one issue above.

---

## Creative Director (Lead Design Authority) — Round 5

**FROM THE DESK OF THE CREATIVE DIRECTOR**
**PROJECT:** SwanStudios Coach Assistant Upgrade (Crystalline Swan)
**STATUS:** DESIGN SPECIFICATION — ROUND 3

Excellent diligence. You are proving to be a highly effective gatekeeper for the Crystalline Swan design system. Let's close out these final two items so we can hand this off to engineering.

### ⚠️ ISSUE 1: Mobile Breakpoint Clarification (CONFIRMATION)
I am officially confirming `$breakpoint-mobile-strict: 430px;`. 

This is not a typo. The logical viewport width of the iPhone 14 Pro Max and 15 Pro Max is exactly `430pt`. The `414px` dimension is a legacy metric for older hardware (iPhone 11 Pro Max, 8 Plus). We are building the *Enchanted Apex* for modern flagships first. Older devices will naturally fall under this breakpoint and scale down beautifully.

**Status: LOCKED.**

### ⚠️ ISSUE 5: Bottom Sheet — Drag Handle & Gesture Spec (AGREED WITH VISUAL TWEAK)
You are absolutely correct. A bottom sheet without a tactile drag handle and swipe-to-dismiss gesture is a UX failure. Good catch.

However, I am **rejecting your specific color choice** for the drag handle. `var(--color-graphite)` (`#1A1A24`) sitting on top of the drawer's `var(--color-carbon)` (`#141419`) background provides a contrast ratio of roughly 1.05:1. It will be invisible. 

We will use a frosted, semi-transparent approach to maintain the crystalline aesthetic, and I am increasing the bottom margin slightly to ensure the handle doesn't crowd the top of the chat history.

**Code Change (`components/sidebar/_sidebar-mobile.scss`):**
```scss
@include tablet-portrait-down {
  .conversation-sidebar {
    /* ... existing styles ... */
    
    /* Drag handle — required by iOS HIG */
    &::before {
      content: '';
      display: block;
      width: 36px;
      height: 4px;
      /* Frost White at 20% opacity for elegant contrast against Carbon */
      background: rgba(224, 236, 244, 0.2); 
      border-radius: 2px;
      margin: 12px auto 16px; /* Increased bottom margin to 16px for touch clearance */
    }
  }
}
```

**Interaction Specification (Swipe-to-Dismiss):**
Swipe-to-dismiss is strictly **IN SCOPE** for v1. A trapped user is a frustrated user. Engineering must implement the following physics:

1.  **Dismissal Threshold:** A downward drag of `120px`, OR a rapid downward swipe velocity exceeding `0.5px/ms`.
2.  **Spring Back (Cancel Dismiss):** If the user releases the drawer *before* the threshold, it must snap back to `translateY(0)`.
    *   *Animation:* `transition: transform 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275);` (This provides a premium, subtle physical bounce).
3.  **Successful Dismissal:** If the threshold is met, the drawer accelerates off-screen to `translateY(100%)`.
    *   *Animation:* `transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);` (Fast exit, matching our entry curve).

---
**DIRECTOR'S NOTE:**
Update the spec with the corrected drag handle contrast and the gesture physics. If you are aligned with these final refinements, we are ready to stamp this approved.

---

## Design Implementation Reviewer — Round 6

# Design Implementation Review — Round 3

## ANALYSIS OF ROUND 3 RESPONSES

The Creative Director has provided precise, well-reasoned rulings on both remaining issues. I accept the corrections and close out all remaining items.

---

## AGREEMENTS

### ✅ ISSUE 1: Mobile Breakpoint — `430px` CONFIRMED

The Creative Director's reasoning is sound. Building for modern flagship viewports (iPhone 14/15 Pro Max at 430pt logical width) is a valid design philosophy. Older hardware at 414px will still trigger this breakpoint and scale appropriately.

**Status: LOCKED**

---

### ✅ ISSUE 5: Drag Handle — Color Correction ACCEPTED

The Creative Director's rejection of `var(--color-graphite)` is **correct and justified**. A 1.05:1 contrast ratio against the carbon background is effectively invisible. The correction to `rgba(224, 236, 244, 0.2)` is elegant and crystalline.

**Final Implementation:**
```scss
/* File: components/sidebar/_sidebar-mobile.scss */
@include tablet-portrait-down {
  .conversation-sidebar {
    /* ... existing styles ... */
    
    /* Drag handle — iOS HIG compliant */
    &::before {
      content: '';
      display: block;
      width: 36px;
      height: 4px;
      background: rgba(224, 236, 244, 0.2);
      border-radius: 2px;
      margin: 12px auto 16px;
    }
  }
}
```

**Status: CLOSED**

---

### ✅ ISSUE 5: Swipe-to-Dismiss — Gesture Physics ACCEPTED

The Creative Director's physics specification is thorough and implementation-ready:

| Behavior | Threshold | Animation |
|----------|-----------|-----------|
| Dismiss | 120px drag OR velocity > 0.5px/ms | 250ms `cubic-bezier(0.4, 0, 0.2, 1)` |
| Spring Back | Release before threshold | 300ms `cubic-bezier(0.175, 0.885, 0.32, 1.275)` |

**Technical Note:** The bounce-back curve `cubic-bezier(0.175, 0.885, 0.32, 1.275)` is a classic elastic overshoot function, exceeding 100% to create a subtle "pop" effect. This is intentional and premium.

**Implementation Guidance for Engineering:**
```javascript
// File: components/sidebar/SidebarController.ts
const DISMISS_THRESHOLD = 120; // pixels
const VELOCITY_THRESHOLD = 0.5; // px/ms
const SPRING_BACK_DURATION = 300;
const DISMISS_DURATION = 250;

function handleDrag(translationY: number, velocity: number) {
  if (translationY > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
    // Dismiss with ease-in curve
    drawer.animate({ transform: 'translateY(100%)' }, DISMISS_DURATION, 'easeIn');
  } else {
    // Spring back with elastic overshoot
    drawer.animate({ transform: 'translateY(0)' }, SPRING_BACK_DURATION, 'spring');
  }
}
```

**Status: CLOSED**

---

## FINAL SPECIFICATION SUMMARY

All five issues from Round 1 have been fully resolved:

| Issue | Resolution | File Reference |
|-------|------------|----------------|
| Mobile breakpoint | Two-tier: 768px (layout) + 430px (typography) | `_variables.scss` |
| Thinking indicator ARIA | `role="status"`, `aria-live="polite"`, `aria-hidden` | `_thinking-indicator.html` |
| Voice orb transitions | `200ms ease-out` for background/shadow | `_voice-orb.scss` |
| Safe-area insets | `env(safe-area-inset-*)` integration | `_sidebar-mobile.scss` |
| Bottom sheet drag handle | `rgba(224, 236, 244, 0.2)`, 36px × 4px pill | `_sidebar-mobile.scss` |
| Swipe-to-dismiss | 120px/0.5px/ms threshold, elastic spring-back | `SidebarController.ts` |

---

## VERDICT

**SPECIFICATION FULLY APPROVED**

The Crystalline Swan design system for the Coach Assistant is implementation-ready. The spec is coherent, accessibility-compliant, and mobile-optimized.

**Approval Status: 100%**

All components are defined with:
- Exact CSS custom properties
- Responsive breakpoint architecture
- WCAG-compliant accessibility attributes
- Gesture physics for mobile interaction

**Ready for engineering kickoff.**

---

*Awaiting final confirmation from Creative Director before archival.*

---

## Creative Director (Lead Design Authority) — Round 7

CONSENSUS REACHED

**FROM THE DESK OF THE CREATIVE DIRECTOR**
**PROJECT:** SwanStudios Coach Assistant Upgrade (Crystalline Swan)
**STATUS:** FINAL MASTER SPECIFICATION — APPROVED FOR ENGINEERING KICKOFF

Outstanding work. This is how a world-class product team operates—rigorous debate, precise refinements, and zero compromises on the final user experience. We have successfully forged the *Enchanted Apex*. 

Below is the finalized, merged specification. Engineering is cleared to begin implementation immediately. No deviations from this master document are permitted.

---

### THE CRYSTALLINE SWAN: MASTER DESIGN SPECIFICATION

#### 1. Global Design Tokens (`_variables.scss`)
```scss
:root {
  --color-midnight-sapphire: #002060;
  --color-royal-depth: #003080;
  --color-ice-wing: #60C0F0;
  --color-arctic-cyan: #50A0F0;
  --color-wing-purple: #8B5CF6;
  --color-gilded-fern: #C6A84B;
  --color-frost-white: #E0ECF4;
  --color-obsidian-black: #0A0A0F;
  --color-carbon: #141419;
  --color-graphite: #1A1A24;
}

/* Two-Tier Breakpoint Architecture */
$breakpoint-tablet-portrait: 768px; /* Triggers Drawer Layout */
$breakpoint-mobile-strict: 430px;   /* Triggers Typography Scaling (iPhone 14/15 Pro Max) */

@mixin tablet-portrait-down {
  @media (max-width: #{$breakpoint-tablet-portrait}) { @content; }
}

@mixin mobile-strict {
  @media (max-width: #{$breakpoint-mobile-strict}) { @content; }
}
```

#### 2. Conversation Sidebar & Mobile Drawer (`components/sidebar/_sidebar.scss` & `_sidebar-mobile.scss`)
**Desktop (Default):**
*   Width: `380px` fixed.
*   Background: `var(--color-carbon)`. Border: `1px solid var(--color-graphite)`. Inner top-edge highlight: `inset 0 1px 0 rgba(96, 192, 240, 0.1)`.
*   Item Height: `auto`, min-height: `64px` (WCAG AA). Padding: `16px 20px`.
*   Hover State: Background `var(--color-graphite)`, Left border `4px solid var(--color-ice-wing)`.
*   Active State: Background `rgba(0, 32, 96, 0.4)`, Left border `4px solid var(--color-wing-purple)`.
*   Transitions: `background-color 250ms ease, border-left 200ms ease`.

**Mobile Drawer (`_sidebar-mobile.scss`):**
```scss
@include tablet-portrait-down {
  .conversation-sidebar {
    width: calc(100vw - 16px); 
    max-width: calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 16px);
    margin: 0 auto;
    padding-bottom: env(safe-area-inset-bottom);
    
    /* Drag handle — iOS HIG compliant */
    &::before {
      content: '';
      display: block;
      width: 36px;
      height: 4px;
      background: rgba(224, 236, 244, 0.2); /* Frosted contrast */
      border-radius: 2px;
      margin: 12px auto 16px;
    }
  }
}
```

**Mobile Swipe-to-Dismiss Physics (`components/sidebar/SidebarController.ts`):**
```typescript
const DISMISS_THRESHOLD = 120; // px
const VELOCITY_THRESHOLD = 0.5; // px/ms
const SPRING_BACK_DURATION = 300; // ms
const DISMISS_DURATION = 250; // ms

function handleDrag(translationY: number, velocity: number) {
  if (translationY > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
    // Dismiss with fast entry/exit curve
    drawer.animate({ transform: 'translateY(100%)' }, DISMISS_DURATION, 'cubic-bezier(0.4, 0, 0.2, 1)');
  } else {
    // Spring back with elastic overshoot
    drawer.animate({ transform: 'translateY(0)' }, SPRING_BACK_DURATION, 'cubic-bezier(0.175, 0.885, 0.32, 1.275)');
  }
}
```

#### 3. Markdown Renderer (`components/markdown/_markdown.scss`)
*   **Code Blocks:** Background `var(--color-obsidian-black)`, Border `1px solid var(--color-graphite)`, Radius `8px`, Padding `16px`.
    *   Syntax: Keywords `var(--color-wing-purple)`, Strings `var(--color-arctic-cyan)`, Functions `var(--color-ice-wing)`, Comments `var(--color-gilded-fern)` (0.7 opacity).
*   **Tables:** Header `var(--color-royal-depth)`. Alternating rows `transparent` and `rgba(26, 26, 36, 0.4)`. Borders `1px solid var(--color-graphite)`. Padding `12px 16px`.
*   **Blockquotes:** Border `4px solid var(--color-wing-purple)`. Background `linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, transparent 100%)`. Padding `12px 16px`.
*   **Typography (Responsive via `@include mobile-strict`):**
    *   H1: `24px` (Mobile: `22px`), Weight `700`, Color `var(--color-frost-white)`, Margin-bottom `16px`.
    *   H2: `20px` (Mobile: `18px`), Weight `600`, Color `var(--color-ice-wing)`, Margin-bottom `12px`.
    *   H3: `16px` (Mobile: `16px`), Weight `600`, Color `var(--color-frost-white)`, Margin-bottom `8px`.

#### 4. Thinking Indicator (`components/thinking-indicator/_thinking-indicator.html` & `.scss`)
**HTML (WCAG Compliant):**
```html
<div class="thinking-indicator" role="status" aria-live="polite" aria-label="AI is analyzing your request">
  <span class="dot dot-1" aria-hidden="true"></span>
  <span class="dot dot-2" aria-hidden="true"></span>
  <span class="dot dot-3" aria-hidden="true"></span>
</div>
```
**CSS:**
*   Container: Pill-shape, `border-radius: 20px`, Padding `12px 20px`, Background `var(--color-carbon)`, Border `1px solid var(--color-graphite)`.
*   Dots: `6px x 6px`, `border-radius: 50%`, spaced `6px`. Colors: Dot 1 `var(--color-ice-wing)`, Dot 2 `var(--color-arctic-cyan)`, Dot 3 `var(--color-wing-purple)`.
*   Animation (`swanThink`): `1.4s` infinite loop, `cubic-bezier(0.4, 0, 0.2, 1)`.
    *   `0%, 100% { transform: translateY(0) scale(0.8); opacity: 0.4; }`
    *   `50% { transform: translateY(-4px) scale(1.2); opacity: 1; box-shadow: 0 0 8px currentColor; }`
    *   Stagger: Dot 1 (`0s`), Dot 2 (`0.2s`), Dot 3 (`0.4s`).

#### 5. Voice Recording Overlay (`components/voice-orb/_voice-orb.scss`)
*   Orb Size: `72px x 72px`, `border-radius: 50%`.
*   Duration Label: Absolute, `bottom: -28px`, Font `14px`, `font-variant-numeric: tabular-nums`, Color `var(--color-frost-white)`, Weight `600`.
*   **States & Transitions:**
```scss
.recording-orb {
  background: var(--color-royal-depth);
  box-shadow: 0 0 0px transparent;
  transition: 
    background-color 200ms ease-out,
    box-shadow 200ms ease-out;

  &:hover {
    background: var(--color-midnight-sapphire);
    box-shadow: 0 0 20px var(--color-wing-purple);
  }

  &.is-recording {
    background: var(--color-wing-purple);
    box-shadow: 0 0 24px var(--color-arctic-cyan);
  }
}
```
*   **Amplitude Rings (`.is-recording::before/after`):** Three concentric rings scaling `1` to `1.8`, opacity `1` to `0`. Duration `1.2s` ease-out infinite. Colors: `var(--color-ice-wing)` (20%), `var(--color-wing-purple)` (15%), `var(--color-arctic-cyan)` (10%).

#### 6. Provider Badge & Attachment Preview (`components/chat/_badges.scss` & `_attachments.scss`)
*   **Provider Badge:** Padding `4px 10px`, `border-radius: 4px`, Font `11px`, Weight `700`, `letter-spacing: 0.08em`, `text-transform: uppercase`, `margin-bottom: 6px`.
    *   AI: Text `var(--color-obsidian-black)`, BG `var(--color-ice-wing)`.
    *   User: Text `var(--color-frost-white)`, BG `var(--color-midnight-sapphire)`.
    *   System: Text `var(--color-obsidian-black)`, BG `var(--color-gilded-fern)`.
*   **Attachment Preview:** `64px x 64px` thumbnail, `object-fit: cover`, `border-radius: 8px`, Border `1px solid var(--color-graphite)`.
    *   Remove Button: `22px x 22px`, `border-radius: 50%`, `top: -8px`, `right: -8px`. Background `var(--color-obsidian-black)`, Border `1px solid var(--color-graphite)`. Icon `12px` `var(--color-frost-white)`. Hover: BG `var(--color-wing-purple)`, Icon `var(--color-obsidian-black)`, Transition `150ms ease`.

---
**DIRECTOR'S SIGN-OFF:**
This concludes the design specification phase. Lock the repository and commence the build.

---

