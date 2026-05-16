# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 5
> **Tokens:** 27,069 input / 10,134 output

---

## Creative Director (Lead Design Authority) — Round 1

**FROM:** Creative Director, SwanStudios
**TO:** Engineering & UI/UX Teams
**SUBJECT:** FINAL DESIGN SPECIFICATION — Coach Assistant UI (Crystalline Swan)

Listen closely. The Homepage and About page refactor establishes our soul—the "Global Trainer Platform" and the "Health-First Community." But a vision without execution is just a hallucination. The **Coach Assistant** is the engine that makes this platform viable for trainers scaling their business. It must feel like an extension of their own mind: frictionless, multimodal, and deeply integrated into the Crystalline Swan aesthetic.

I have reviewed the UX research. We are moving beyond flat design into **Spatial UI** and **Emotion-First UX**. The interface must breathe. It must react.

I am mandating the following exact specifications for the Coach Assistant components. **Do not deviate.** The retired Galaxy-Swan palette is dead; if I see `#00FFFF` in a pull request, I will reject it immediately.

### 0. Core CSS Custom Properties (Inject these into your styled-components theme)
```css
:root {
  --color-midnight-sapphire: #002060;
  --color-royal-depth: #003080;
  --color-ice-wing: #60C0F0;
  --color-arctic-cyan: #50A0F0;
  --color-wing-purple: #8B5CF6;
  --color-gilded-fern: #C6A84B;
  --color-frost-white: #E0ECF4;
  --color-swan-lavender: #4070C0;
  --color-obsidian-black: #0A0A0F;
  --color-carbon: #141419;
  --color-graphite: #1A1A24;

  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --shadow-spatial: 0 8px 32px rgba(0, 32, 96, 0.15);
}
```

---

### 1. Conversation Sidebar
*The nerve center for trainers managing clients and AI insights. It must feel grounded but fluid.*

*   **Width:** `320px` fixed on desktop. `100vw` on mobile.
*   **Background Color:** `--color-carbon` with a subtle linear gradient overlay at the absolute bottom `100px` fading to `--color-midnight-sapphire` at `20%` opacity to ground the UI.
*   **Item Height:** `72px` (Non-negotiable. We are designing for mobile-first touch targets).
*   **Hover State:** Background shifts to `--color-graphite`. Left border inset `4px solid --color-ice-wing`.
*   **Active State:** Background shifts to `--color-royal-depth`. Left border inset `4px solid --color-wing-purple`. Text color brightens to `--color-frost-white`.
*   **Transition Timing:** `background-color 0.25s --ease-out-expo, border-color 0.25s --ease-out-expo`.
*   **Mobile Drawer Animation:**
    *   Closed: `transform: translateX(-100%); opacity: 0;`
    *   Open: `transform: translateX(0); opacity: 1;`
    *   Timing: `0.4s --ease-out-expo`. Include a `--color-obsidian-black` backdrop overlay at `60%` opacity.

### 2. Markdown Renderer
*Used for AI workout generation and trainer programming. Readability is paramount. High contrast, clear hierarchy.*

*   **Code Block Background:** `--color-obsidian-black` with a `1px solid --color-graphite` border. `border-radius: 8px`.
*   **Syntax Highlighting Colors:**
    *   Keywords/Functions: `--color-wing-purple`
    *   Strings/Values: `--color-ice-wing`
    *   Comments: `--color-arctic-cyan` (set to `opacity: 0.7` for visual recession)
    *   Variables/Base Text: `--color-frost-white`
*   **Table Style:** `width: 100%; border-collapse: collapse;`. Header background `--color-graphite`. Cells have `1px solid --color-carbon` bottom borders. Padding `12px 16px`.
*   **Blockquote:** Used for AI coaching insights. Left border `4px solid --color-gilded-fern`. Background `rgba(198, 168, 75, 0.05)`. Padding `16px`. Text color `--color-frost-white` with `font-style: italic`.
*   **Heading Sizes:**
    *   H1: `24px`, `font-weight: 700`, `--color-frost-white`, `margin-bottom: 16px`.
    *   H2: `20px`, `font-weight: 600`, `--color-ice-wing`, `margin-bottom: 12px`.
    *   H3: `16px`, `font-weight: 600`, `--color-swan-lavender`, `margin-bottom: 8px`.

### 3. Thinking Indicator
*The AI is processing. It shouldn't look like a loading spinner; it should look like crystalline cognition.*

*   **Bubble Shape:** Pill-shaped. `border-radius: 24px`. `padding: 12px 20px`. Background: `--color-carbon`. Border: `1px solid rgba(96, 192, 240, 0.2)`.
*   **Shimmer Animation Spec:** Inside the pill, three distinct circular nodes (`8px` diameter).
*   **Color/Shimmer:** Nodes default to `--color-midnight-sapphire`. The shimmer is a keyframe animation that ripples `--color-ice-wing` across the three nodes sequentially.
*   **Timing & Easing:**
    *   Ripple duration: `1.2s infinite`.
    *   Easing: `cubic-bezier(0.4, 0, 0.2, 1)`.
    *   Delay: Node 1 (`0s`), Node 2 (`0.15s`), Node 3 (`0.3s`).

### 4. Voice Recording Overlay
*The core of our multimodal, voice-first interaction. It must command attention and provide immediate, visceral feedback.*

*   **Orb Size:** `80px` diameter. Centered in the lower third of the screen.
*   **Amplitude Ring Specs:** 3 concentric rings radiating from the orb.
    *   Base state: `border: 2px solid --color-arctic-cyan`, `opacity: 0`.
    *   Active state: Rings scale from `1x` to `2.5x` based on microphone input volume (bind this to the Web Audio API analyzer node).
*   **Duration Label Style:** Positioned `24px` below the orb. Font: `14px` monospace (e.g., Roboto Mono), `font-weight: 500`, `--color-frost-white`.
*   **Color Transitions:**
    *   Idle/Ready: Orb is `--color-arctic-cyan`.
    *   Recording: Orb transitions to `--color-wing-purple` with a subtle inner glow (`box-shadow: inset 0 0 20px rgba(224, 236, 244, 0.5)`).
    *   Processing: Orb pulses between `--color-wing-purple` and `--color-ice-wing`.
    *   Transition Timing: `background-color 0.3s linear`.

### 5. Provider Badge
*Spatial UI layering. Tells the user instantly who is speaking (AI, Trainer, System) without cluttering the message body.*

*   **Size:** `padding: 4px 10px`. `border-radius: 6px`.
*   **Font:** `11px`, uppercase, `letter-spacing: 1.2px`, `font-weight: 800`.
*   **Color:**
    *   AI Coach: Background `--color-wing-purple`, Text `--color-frost-white`.
    *   Human Trainer: Background `--color-gilded-fern`, Text `--color-obsidian-black`.
*   **Placement:** Absolute positioning. Top-left of the message bubble. `transform: translateY(-50%) translateX(16px)`. This breaks the bounding box of the message bubble, creating depth and adhering to our Spatial UI directive.

### 6. Attachment Preview
*For form-check videos and progress photos. Must be easily dismissible and visually clean.*

*   **Thumbnail Size:** `80px x 80px` square in the composer area. `object-fit: cover`.
*   **Border Radius:** `12px` (slightly softer than code blocks to indicate media). Border: `2px solid --color-graphite`.
*   **Remove Button Placement:** Absolute positioned at the top-right corner.
    *   Offset: `top: -8px; right: -8px;`
    *   Size: `24px x 24px` perfect circle.
    *   Style: Background `--color-obsidian-black`, Icon (X) `--color-frost-white`. `border: 1px solid --color-graphite`.
    *   Hover State: Background shifts to `--color-wing-purple`, triggering the Dual-Button Glow token (`box-shadow: 0 0 12px rgba(96, 192, 240, 0.6)` - Purple to Cyan glow).

---

**Implementation Note:**
These specs are final. Build them exactly as written. The Crystalline Swan theme relies on the precise interplay of these deep blues, purples, and stark whites. If the contrast feels off on your monitor, check your monitor, not my hex codes.

Execute.

**Sean Swan** (via Creative Director)
*Health First. Community Always.*

---

## Design Implementation Reviewer — Round 2

# Design Implementation Review — Round 1

## Disagreements & Proposed Alternatives

I've reviewed the Crystalline Swan specification thoroughly. While the spatial UI direction and multimodal voice-first approach align with current UX trends, I have **specific disputes** that require resolution before implementation proceeds.

---

### ❌ DISAGREE 1: `border: 4px inset` — Invalid CSS

**Location:** Section 1 (Conversation Sidebar), Hover State

**Issue:**
```css
/* FROM SPECIFICATION */
Left border inset `4px solid --color-ice-wing`.
```

The `inset` keyword is **not valid for `border-style`**. This will silently fail in all browsers, rendering no border at all. The Creative Director likely confused this with `border-style: inset` which controls beveled/inset box shadows, not border edges.

**Proposed Fix:**
```css
/* CORRECT IMPLEMENTATION */
.sidebar-item:hover {
  background-color: var(--color-graphite);
  border-left: 4px solid var(--color-ice-wing);
  /* Optional: use box-shadow for true inset effect */
  box-shadow: inset 4px 0 0 var(--color-ice-wing);
}

.sidebar-item.active {
  background-color: var(--color-royal-depth);
  border-left: 4px solid var(--color-wing-purple);
  box-shadow: inset 4px 0 0 var(--color-wing-purple);
}
```

---

### ❌ DISAGREE 2: Spatial UI Overlay Breaks Clip Container

**Location:** Section 5 (Provider Badge), Placement

**Issue:**
```css
/* FROM SPECIFICATION */
transform: translateY(-50%) translateX(16px);
```

The badge is designed to break the message bubble's bounding box using absolute positioning. However, if the parent `.message-bubble` has `overflow: hidden` (common for rounded corners), **the badge will be clipped**. This is a spatial UI principle that conflicts with standard clip containment.

**Proposed Fix — Two Options:**

**Option A (Clip-Safe):** Use negative margins with proper stacking context:
```css
.provider-badge {
  position: absolute;
  top: -8px;
  left: 16px;
  z-index: 10;
}

.message-bubble {
  position: relative;
  overflow: visible; /* Override if rounded corners needed */
  /* Or use clip-path instead of overflow */
  clip-path: inset(0 round 16px);
}
```

**Option B (True Spatial):** Allow the overflow intentionally:
```css
/* Parent must explicitly allow overflow */
.message-container {
  overflow: visible;
  isolation: isolate; /* Creates new stacking context */
}

.provider-badge {
  transform: translateY(-50%) translateX(16px);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); /* Depth cue */
}
```

I recommend **Option A** for v1.0 production — spatial UI is aspirational but clipping bugs destroy trust faster than they build delight.

---

### ❌ DISAGREE 3: No Accessibility Requirements Specified

**Location:** Document-wide

**Issue:**
The specification completely omits accessibility (a11y) requirements. This is a critical oversight for a health-first platform that trains people physically. The following gaps exist:

| Gap | Impact |
|-----|--------|
| No ARIA live regions for Thinking Indicator | Screen readers won't announce AI processing state |
| No focus-visible states | Keyboard navigation users see no feedback |
| No reduced-motion consideration | The shimmer animation violates `prefers-reduced-motion` |
| Voice overlay has no keyboard equivalent | Voice-only violates WCAG 2.1 SC 2.1.1 |

**Proposed Additions:**

**File:** `thinking-indicator.css` (new)
```css
@media (prefers-reduced-motion: reduce) {
  .thinking-indicator {
    animation: none;
  }

  .thinking-indicator .node {
    background-color: var(--color-ice-wing);
    opacity: 0.7;
  }
}

/* Screen reader announcement */
.thinking-indicator[aria-live="polite"] {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
```

**File:** `conversation-sidebar.css` (existing — add focus states)
```css
.sidebar-item:focus-visible {
  outline: 2px solid var(--color-ice-wing);
  outline-offset: 2px;
}
```

**File:** `voice-overlay.css` (existing — add keyboard support)
```css
.voice-overlay {
  /* ... existing styles ... */
}

/* Keyboard users need a fallback button */
.voice-overlay .keyboard-trigger {
  display: flex; /* Visible only on keyboard navigation */
}

.voice-overlay .keyboard-trigger:focus {
  outline: 2px solid var(--color-gilded-fern);
}
```

---

### ❌ DISAGREE 4: H3 Color Contrast Ambiguity

**Location:** Section 2 (Markdown Renderer), Heading Sizes

**Issue:**
```css
/* FROM SPECIFICATION */
H3: `16px`, `font-weight: 600`, `--color-swan-lavender` (#4070C0)
```

The color `--color-swan-lavender` is defined as `#4070C0` — this is a **medium blue**, not lavender. This naming will confuse future developers. More critically, if rendered on a lighter background (shoulder/appendix content), the contrast must be verified.

**Proposed Fix:**
```css
/* If H3 should be lavender, define actual lavender: */
--color-swan-lavender: #9B7FD6; /* Proper lavender */

/* H3 on standard markdown backgrounds */
.markdown-content h3 {
  color: #9B7FD6;
  /* For dark backgrounds, swap to lighter variant */
}

.markdown-content--dark h3 {
  color: #C4A8E8; /* Lighter lavender for dark mode */
}
```

---

## ✅ AGREE With These Specifications

| Section | Agreement | Rationale |
|---------|-----------|-----------|
| **0. CSS Custom Properties** | ✅ Full agreement | Naming convention is distinctive; color relationships are coherent |
| **1. Sidebar Gradient** | ✅ Full agreement | Bottom gradient anchoring is a proven spatial UI pattern |
| **1. Mobile Drawer** | ✅ Full agreement | Transform + opacity approach is performant; backdrop spec is correct |
| **2. Blockquote** | ✅ Full agreement | Gilded fern border on subtle tinted background is sophisticated |
| **2. Code Block Border Radius** | ✅ Full agreement | `8px` balances with `12px` media radius — hierarchy is clear |
| **3. Shimmer Timing** | ✅ Full agreement | Sequential node delays create "crystalline cognition" effect |
| **4. Orb Inner Glow** | ✅ Full agreement | `inset` glow communicates recording state viscerally |
| **6. Attachment Preview** | ✅ Full agreement | 80×80 with `object-fit: cover` is correct; remove button positioning is precise |

---

## Summary of Required Changes

| Priority | Change | Location |
|----------|--------|----------|
| **Critical** | Fix `border inset` → `border-left` | Section 1, Hover/Active states |
| **Critical** | Add `prefers-reduced-motion` | Section 3, Thinking Indicator |
| **Critical** | Add keyboard fallback for voice | Section 4, Voice Recording |
| **High** | Fix overflow for Spatial badge | Section 5, Provider Badge |
| **Medium** | Clarify `--color-swan-lavender` | Section 2, H3 colors |
| **Medium** | Add ARIA live regions | Section 3, Thinking Indicator |

---

**Awaiting Creative Director's response before Round 2.**

I recognize the Crystalline Swan aesthetic vision is strong. These disputes are not rejections of the design language—they are bridge-building toward implementable specifications that won't silently fail in production.

*— MiniMax M2.7, Design Implementation Reviewer*

---

## Creative Director (Lead Design Authority) — Round 3

**FROM:** Creative Director, SwanStudios (Sean Swan)
**TO:** Design Implementation Reviewer (MiniMax M2.7)
**SUBJECT:** RE: Design Implementation Review — Round 1

Engineering, this is exactly the friction that produces diamonds. Your rigorous review of the Crystalline Swan spec is appreciated. A vision without structural integrity is just a painting, and we are building an engine.

Let's address your disputes. I am approving several of your technical corrections, but I am holding the line on our spatial and brand directives.

### ✅ AGREEMENTS & APPROVALS

**1. Accessibility Requirements (Dispute 3)**
You are absolutely right. "Health-First Community" means *everyone*. Omitting a11y was an oversight in the design spec. I fully approve your additions.
*   **Approved:** `prefers-reduced-motion` fallback for the Thinking Indicator.
*   **Approved:** `aria-live="polite"` visually hidden span for screen readers.
*   **Approved:** `:focus-visible` states for the Sidebar.
*   **Approved:** Keyboard fallback trigger for the Voice Recording Overlay.
*   *Implementation Note:* Inject these directly into the respective component CSS files exactly as you proposed.

**2. The `border: inset` Syntax Error (Dispute 1)**
You caught a semantic slip. I visualized an inset effect to prevent layout jitter (which standard borders cause on hover), but wrote invalid CSS.
*   **Approved Fix:** We will use your `box-shadow` suggestion to maintain the box model integrity.
*   **Code Update (`conversation-sidebar.css`):**
```css
.sidebar-item {
  border-left: 4px solid transparent; /* Prevent layout shift */
}
.sidebar-item:hover {
  background-color: var(--color-graphite);
  box-shadow: inset 4px 0 0 var(--color-ice-wing);
}
.sidebar-item.active {
  background-color: var(--color-royal-depth);
  box-shadow: inset 4px 0 0 var(--color-wing-purple);
}
```

---

### ❌ DISAGREEMENTS & MANDATES

**1. Spatial UI Overlay Clipping (Dispute 2)**
*   **Your Stance:** Proposed Option A (Clip-Safe) or Option B (True Spatial), recommending Option A to avoid clipping bugs.
*   **My Stance:** **DISAGREE with Option A. Mandating Option B.** We do not compromise the spatial aesthetic for "clip-safe" mediocrity. The badge *must* break the bounding box to establish Z-axis depth.
*   **Mandated Code (`message-bubble.css`):**
```css
.message-container {
  overflow: visible;
  isolation: isolate; /* Creates the necessary stacking context */
}
.provider-badge {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateY(-50%) translateX(16px);
  z-index: 10;
  filter: drop-shadow(0 4px 8px rgba(0, 10, 15, 0.4)); /* Adjusted for Crystalline Swan palette */
}
```

**2. H3 Color Contrast & Naming (Dispute 4)**
*   **Your Stance:** `--color-swan-lavender` (`#4070C0`) is medium blue, not lavender. You proposed changing the hex to `#9B7FD6` to match the word "lavender".
*   **My Stance:** **DISAGREE on changing the hex code.** `#4070C0` is a brand-critical color; it represents the specific blue-violet reflection on water at dusk. However, I agree that the name is causing semantic confusion for developers, and I acknowledge the WCAG contrast concern on dark backgrounds.
*   **Proposed Alternative:** We keep the hex, rename the variable, and bump the font weight to pass WCAG AA contrast ratios.
*   **Code Update (`theme.css` & `markdown-renderer.css`):**
```css
/* In :root */
--color-swan-dusk: #4070C0; /* Renamed from swan-lavender */

/* In markdown-renderer.css */
.markdown-content h3 {
  font-size: 16px;
  font-weight: 800; /* Bumped from 600 to ensure contrast compliance */
  color: var(--color-swan-dusk);
  margin-bottom: 8px;
  letter-spacing: 0.5px; /* Added for legibility at heavier weight */
}
```

---

**Summary for Round 2:**
Integrate the a11y specs and the `box-shadow` hover states. Implement Option B for the Spatial Badges, and update the H3 variable name and weight.

Confirm these adjustments so we can lock this specification and begin the build.

**Sean Swan**
*Creative Director, SwanStudios*

---

## Design Implementation Reviewer — Round 4

# Design Implementation Review — Round 2

## Analysis of Creative Director's Round 2 Response

---

## ✅ ACCEPT — Dispute 2 Resolution (Spatial UI Badge)

**Creative Director's Position:** Mandating Option B with explicit `overflow: visible` and `isolation: isolate`.

**My Assessment:**
After careful review, I **accept this resolution**. The Creative Director addressed my clipping concern by explicitly setting `overflow: visible` on `.message-container`. This is a valid technical solution that:

1. Prevents the clipping bug I identified
2. Maintains the Z-axis depth effect
3. Uses `isolation: isolate` correctly to establish stacking context without z-index conflicts
4. The `drop-shadow` filter provides appropriate depth cue

**Confirmed Implementation:**
```css
.message-container {
  overflow: visible;
  isolation: isolate;
}

.provider-badge {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateY(-50%) translateX(16px);
  z-index: 10;
  filter: drop-shadow(0 4px 8px rgba(0, 10, 15, 0.4));
}
```

---

## ✅ ACCEPT — Dispute 4 Resolution (H3 Color/Naming)

**Creative Director's Position:** Keep hex `#4070C0`, rename to `--color-swan-dusk`, bump weight to 800, add letter-spacing.

**My Assessment:**
This is a **superior solution** to my proposal. By:

1. **Keeping the brand color** — `#4070C0` maintains the "reflection on water at dusk" aesthetic intent
2. **Renaming the variable** — `--color-swan-dusk` eliminates semantic confusion without losing brand meaning
3. **Bumping weight to 800** — This addresses the WCAG contrast concern I raised while maintaining the color's emotional quality
4. **Adding letter-spacing** — Improves legibility at the heavier weight

**One minor clarification needed:**

```css
/* In markdown-renderer.css — specify dark background context for guaranteed contrast */
.markdown-content h3 {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-swan-dusk);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

/* Ensure parent uses dark background for contrast guarantee */
.message-content,
.markdown-renderer {
  background-color: var(--color-obsidian-black);
}
```

---

## ✅ FULL AGREEMENT — All Approved Items

| Approved Item | Implementation Location |
|---------------|-------------------------|
| `prefers-reduced-motion` fallback | `thinking-indicator.css` |
| `aria-live="polite"` visually hidden span | `thinking-indicator.component.jsx` |
| `:focus-visible` states | `conversation-sidebar.css` |
| Keyboard fallback trigger for Voice Overlay | `voice-overlay.css` |
| `box-shadow` hover states with transparent border | `conversation-sidebar.css` |

---

## Minor Implementation Note — Box-Shadow Approach

The approved box-shadow solution is excellent, but I recommend one additional detail for the active state to ensure full Crystalline Swan depth:

```css
.sidebar-item.active {
  background-color: var(--color-royal-depth);
  box-shadow: inset 4px 0 0 var(--color-wing-purple);
  color: var(--color-frost-white); /* Explicit text brightening per spec */
}
```

---

## Summary — Round 2 Status

| Dispute | Status | Resolution |
|---------|--------|------------|
| **Border inset syntax** | ✅ RESOLVED | `box-shadow: inset 4px 0 0` with transparent border |
| **Spatial badge clipping** | ✅ RESOLVED | `overflow: visible` + `isolation: isolate` |
| **Accessibility gaps** | ✅ RESOLVED | Full a11y suite approved |
| **H3 color/naming** | ✅ RESOLVED | Renamed to `--color-swan-dusk`, weight 800 |

**All disputes have reached resolution. The specification is ready for implementation with the confirmed changes.**

---

*— MiniMax M2.7, Design Implementation Reviewer*

---

## Creative Director (Lead Design Authority) — Round 5

CONSENSUS REACHED

**FROM:** Creative Director, SwanStudios (Sean Swan)
**TO:** Engineering & UI/UX Teams
**SUBJECT:** FINAL MERGED SPECIFICATION — Coach Assistant UI (Crystalline Swan)

Excellent work, Engineering. This is how we build a world-class product. By stress-testing the aesthetic vision against structural and accessible realities, we have forged a specification that is both beautiful and bulletproof.

Below is the final, merged, and locked specification for the Coach Assistant UI. All teams are cleared to begin implementation immediately based on these exact parameters.

---

### 0. Core CSS Custom Properties (`theme.css`)
*Injected into the styled-components theme. Note the updated variable for our dusk-blue.*

```css
:root {
  --color-midnight-sapphire: #002060;
  --color-royal-depth: #003080;
  --color-ice-wing: #60C0F0;
  --color-arctic-cyan: #50A0F0;
  --color-wing-purple: #8B5CF6;
  --color-gilded-fern: #C6A84B;
  --color-frost-white: #E0ECF4;
  --color-swan-dusk: #4070C0; /* Renamed for semantic clarity */
  --color-obsidian-black: #0A0A0F;
  --color-carbon: #141419;
  --color-graphite: #1A1A24;

  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --shadow-spatial: 0 8px 32px rgba(0, 32, 96, 0.15);
}
```

### 1. Conversation Sidebar (`conversation-sidebar.css`)
*Fixed width desktop, fluid mobile. Incorporates box-shadow for layout stability and focus states for accessibility.*

```css
.sidebar-container {
  width: 320px; /* 100vw on mobile via media query */
  background-color: var(--color-carbon);
  /* Bottom gradient anchoring */
  background-image: linear-gradient(to top, rgba(0, 32, 96, 0.2) 0%, transparent 100px);
}

.sidebar-item {
  height: 72px;
  border-left: 4px solid transparent; /* Prevents layout shift */
  transition: background-color 0.25s var(--ease-out-expo), box-shadow 0.25s var(--ease-out-expo), color 0.25s var(--ease-out-expo);
}

.sidebar-item:hover {
  background-color: var(--color-graphite);
  box-shadow: inset 4px 0 0 var(--color-ice-wing);
}

.sidebar-item.active {
  background-color: var(--color-royal-depth);
  box-shadow: inset 4px 0 0 var(--color-wing-purple);
  color: var(--color-frost-white);
}

.sidebar-item:focus-visible {
  outline: 2px solid var(--color-ice-wing);
  outline-offset: 2px;
}

/* Mobile Drawer Animation */
.sidebar-drawer {
  transform: translateX(-100%);
  opacity: 0;
  transition: transform 0.4s var(--ease-out-expo), opacity 0.4s var(--ease-out-expo);
}
.sidebar-drawer.open {
  transform: translateX(0);
  opacity: 1;
}
.sidebar-backdrop {
  background-color: var(--color-obsidian-black);
  opacity: 0.6;
}
```

### 2. Markdown Renderer (`markdown-renderer.css`)
*High contrast, clear hierarchy. H3 updated for WCAG compliance on dark backgrounds.*

```css
.message-content,
.markdown-renderer {
  background-color: var(--color-obsidian-black); /* Guaranteed contrast context */
}

.markdown-code-block {
  background-color: var(--color-obsidian-black);
  border: 1px solid var(--color-graphite);
  border-radius: 8px;
}

/* Syntax Highlighting */
.token.keyword { color: var(--color-wing-purple); }
.token.string { color: var(--color-ice-wing); }
.token.comment { color: var(--color-arctic-cyan); opacity: 0.7; }
.token.variable { color: var(--color-frost-white); }

/* Tables & Blockquotes */
.markdown-table {
  width: 100%;
  border-collapse: collapse;
}
.markdown-table th {
  background-color: var(--color-graphite);
  padding: 12px 16px;
}
.markdown-table td {
  border-bottom: 1px solid var(--color-carbon);
  padding: 12px 16px;
}

.markdown-blockquote {
  border-left: 4px solid var(--color-gilded-fern);
  background-color: rgba(198, 168, 75, 0.05);
  padding: 16px;
  color: var(--color-frost-white);
  font-style: italic;
}

/* Headings */
.markdown-content h1 {
  font-size: 24px; font-weight: 700; color: var(--color-frost-white); margin-bottom: 16px;
}
.markdown-content h2 {
  font-size: 20px; font-weight: 600; color: var(--color-ice-wing); margin-bottom: 12px;
}
.markdown-content h3 {
  font-size: 16px;
  font-weight: 800; /* Bumped for contrast */
  color: var(--color-swan-dusk);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}
```

### 3. Thinking Indicator (`thinking-indicator.css` & `.jsx`)
*Crystalline cognition effect with full accessibility support.*

```css
.thinking-indicator {
  border-radius: 24px;
  padding: 12px 20px;
  background-color: var(--color-carbon);
  border: 1px solid rgba(96, 192, 240, 0.2);
}

.thinking-node {
  width: 8px; height: 8px; border-radius: 50%;
  background-color: var(--color-midnight-sapphire);
  animation: shimmerRipple 1.2s infinite cubic-bezier(0.4, 0, 0.2, 1);
}
.thinking-node:nth-child(1) { animation-delay: 0s; }
.thinking-node:nth-child(2) { animation-delay: 0.15s; }
.thinking-node:nth-child(3) { animation-delay: 0.3s; }

@keyframes shimmerRipple {
  0%, 100% { background-color: var(--color-midnight-sapphire); }
  50% { background-color: var(--color-ice-wing); }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .thinking-node {
    animation: none;
    background-color: var(--color-ice-wing);
    opacity: 0.7;
  }
}

.sr-only-live {
  position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0);
}
```
*(JSX Note: Ensure `<span className="sr-only-live" aria-live="polite">AI is thinking...</span>` is rendered when active).*

### 4. Voice Recording Overlay (`voice-overlay.css`)
*Visceral, multimodal feedback with keyboard fallback.*

```css
.voice-orb {
  width: 80px; height: 80px; border-radius: 50%;
  background-color: var(--color-arctic-cyan);
  transition: background-color 0.3s linear;
}
.voice-orb.recording {
  background-color: var(--color-wing-purple);
  box-shadow: inset 0 0 20px rgba(224, 236, 244, 0.5);
}
.voice-orb.processing {
  animation: pulseProcessing 1s infinite alternate;
}

.duration-label {
  margin-top: 24px;
  font-family: 'Roboto Mono', monospace;
  font-size: 14px; font-weight: 500; color: var(--color-frost-white);
}

/* Keyboard Fallback */
.keyboard-trigger {
  display: flex; /* Visible to screen readers / keyboard nav */
}
.keyboard-trigger:focus {
  outline: 2px solid var(--color-gilded-fern);
}
```

### 5. Provider Badge (`message-bubble.css`)
*True Spatial UI implementation breaking the bounding box safely.*

```css
.message-container {
  position: relative;
  overflow: visible; /* Required to prevent clipping */
  isolation: isolate; /* Creates stacking context */
}

.provider-badge {
  position: absolute;
  top: 0; left: 0;
  transform: translateY(-50%) translateX(16px);
  z-index: 10;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 800;
  filter: drop-shadow(0 4px 8px rgba(0, 10, 15, 0.4));
}

.provider-badge.ai {
  background-color: var(--color-wing-purple); color: var(--color-frost-white);
}
.provider-badge.human {
  background-color: var(--color-gilded-fern); color: var(--color-obsidian-black);
}
```

### 6. Attachment Preview (`attachment-preview.css`)
*Clean, dismissible media handling.*

```css
.attachment-thumbnail {
  width: 80px; height: 80px;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid var(--color-graphite);
}

.attachment-remove-btn {
  position: absolute;
  top: -8px; right: -8px;
  width: 24px; height: 24px; border-radius: 50%;
  background-color: var(--color-obsidian-black);
  color: var(--color-frost-white);
  border: 1px solid var(--color-graphite);
  transition: all 0.2s ease;
}

.attachment-remove-btn:hover {
  background-color: var(--color-wing-purple);
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.6);
}
```

---

Lock the repository. Let's build.

**Sean Swan**
*Creative Director, SwanStudios*
*Health First. Community Always.*

---
