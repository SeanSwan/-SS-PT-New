# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 19,393 input / 7,947 output

---

## Creative Director (Lead Design Authority) — Round 1

As Creative Director, I am issuing the final visual specification for the SwanStudios Dashboard Redesign. This spec resolves the open divergences (D-A through D-D) and mandates the exact implementation details for the components defined in the plan. 

**Divergence Resolutions:**
- **D-A (Right Rail):** Retain the trimmed 2-widget right rail for desktop/tablet (≥1024px). It is hidden on mobile to preserve the single-column core loop. This provides trainers with necessary oversight without cluttering the client experience.
- **D-B (Signature FX):** CSS-only. We will use layered `radial-gradient` and `box-shadow` animations. No particles, no three.js. GPU-safe and performant.
- **D-C (Social Lean):** The line is drawn at the Quick Post templates. We provide structured coaching prompts (Win/Proof/Ask), not free-form generic social media posting. 
- **D-D (Scope):** Phase-1 is Home-only (Apex Header, Guide's Note, Feed, Rings). The 6-tab IA shell deploys simultaneously, but internal views for Ascension, Flock, Arena, Guide, and Studio remain existing V3 components wrapped in the new shell.

Here are the exact design specifications for the surfaces introduced in the plan.

---

### 1. Apex Header (Sticky)
The primary command center for the core loop.

**Layout & Breakpoints:**
- **Mobile (320–767px):** `position: sticky; top: 0; z-index: 100; height: 160px; width: 100%; padding: 16px;` Collapses to `height: 80px` on scroll-down (hide Today's Focus text, shrink rings to 48px). Expands on scroll-up.
- **Tablet/Desktop (768px+):** `max-width: 1280px; margin: 0 auto; height: 120px; padding: 24px; border-radius: 0 0 16px 16px;` No collapse.
- **4K/Ultrawide:** `max-width: 1600px;`

**Tokens & States:**
- **Background:** `background: rgba(20, 20, 25, 0.8); backdrop-filter: blur(12px);` (Using Carbon `var(--carbon, #141419)` as base).
- **Text (Today's Focus):** `color: var(--frost-white, #E0ECF4); font-size: 14px;`
- **CTA Button (Dual-Glow):** `background: var(--midnight-sapphire, #002060); color: var(--frost-white, #E0ECF4); border: 1px solid var(--ice-wing, #60C0F0); min-height: 44px; padding: 0 24px; border-radius: 8px;`
  - **Hover/Active:** `box-shadow: 0 0 20px var(--wing-purple, #8B5CF6); transform: translateY(-1px);`
  - **Focus-visible:** `outline: 2px solid var(--ice-wing, #60C0F0); outline-offset: 2px;`
  - **Disabled:** `opacity: 0.5; cursor: not-allowed; box-shadow: none;`

**Motion:**
- Collapse/Expand: `transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1), padding 300ms ease;`
- CTA Glow: `transition: box-shadow 200ms ease-out, transform 100ms ease;`
- **Reduced Motion:** Instant height change, static CTA (no glow pulse).

---

### 2. Ascension Rings
Three concentric SVG/Victory rings. Must pass WCAG via text labels.

**Layout & Breakpoints:**
- **Mobile:** 80px x 80px. Positioned right side of Apex Header. Labels hidden in header, revealed in a tap-to-expand modal.
- **Desktop:** 120px x 120px. Labels visible inline to the left of the rings.
- **Structure:** Outer = Weekly Workouts, Middle = Volume, Inner = Streak.

**Tokens & States:**
- **Ring 1 (Weekly):** `stroke: var(--ice-wing, #60C0F0);`
- **Ring 2 (Volume):** `stroke: var(--swan-lavender, #4070C0);`
- **Ring 3 (Streak):** `stroke: var(--gilded-fern, #C6A84B);`
- **Track (unfilled):** `stroke: var(--graphite, #1A1A24); stroke-width: 6px;`
- **Text Labels:** `color: var(--frost-white, #E0ECF4); font-size: 12px;`
- **Loading:** Skeleton pulse. `background: var(--graphite, #1A1A24); animation: pulse 1.5s infinite;`
- **Empty:** 0% fill. Rings render as track only. Text: "0 / X".
- **Error:** Dashed stroke `stroke: var(--frost-white, #E0ECF4); stroke-dasharray: 4 2; opacity: 0.5;`

**Accessibility:**
- `role="progressbar"` `aria-label="Weekly Workouts"` `aria-valuenow="3"` `aria-valuemax="5"`.
- Keyboard: Tab navigates to a button wrapping the rings; Enter/Space opens the detail modal.

---

### 3. Guide's Note
Pinned as the #1 Home item. Differentiator for trainer-led coaching.

**Layout & Breakpoints:**
- **Mobile:** `margin: 16px; padding: 16px; border-radius: 12px;`
- **Desktop:** `margin: 24px 0; padding: 24px; border-radius: 16px;`

**Tokens & States:**
- **Surface:** `background: var(--carbon, #141419); border: 1px solid var(--royal-depth, #003080);`
- **Text:** `color: var(--frost-white, #E0ECF4);`
- **Play Button (Audio/Video):** `width: 44px; height: 44px; border-radius: 50%; background: var(--ice-wing, #60C0F0); color: var(--obsidian-black, #0A0A0F);`
  - **Hover:** `box-shadow: 0 0 15px var(--arctic-cyan, #50A0F0);`
- **Empty State:** `background: var(--graphite, #1A1A24); border: 1px dashed var(--swan-lavender, #4070C0);` Text: "Your guide hasn't posted a note today. Focus on your next logged workout!"

**Motion:**
- Media play indicator: `transition: box-shadow 200ms ease;`

---

### 4. Single-Column Feed & PostCard
The social amplifier, constrained to coaching templates.

**Layout & Breakpoints:**
- **Container:** `max-width: 640px; margin: 0 auto; padding: 0 16px;` (All breakpoints).
- **PostCard:** `background: var(--carbon, #141419); border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid transparent;`
  - **Hover:** `border-color: var(--graphite, #1A1A24);`

**Quick Post Templates (Chips):**
- **Layout:** Horizontal scroll row above feed. `min-height: 44px; padding: 0 16px; border-radius: 22px;`
- **Default:** `background: var(--graphite, #1A1A24); color: var(--frost-white, #E0ECF4);`
- **Active/Selected:** `background: var(--wing-purple, #8B5CF6); color: var(--frost-white, #E0ECF4); box-shadow: 0 0 15px var(--ice-wing, #60C0F0);` (Dual-glow rule).

**Clickable Hashtags:**
- `color: var(--ice-wing, #60C0F0); font-weight: 600;`
- **Hover/Active:** `text-decoration: underline; color: var(--arctic-cyan, #50A0F0);`
- **Focus-visible:** `outline: 2px solid var(--ice-wing, #60C0F0); outline-offset: 2px; border-radius: 2px;`

**Attached Workout Mini-Chart:**
- Victory Chart. `stroke: var(--arctic-cyan, #50A0F0); fill: var(--arctic-cyan, #50A0F0); fill-opacity: 0.1; height: 80px;`

---

### 5. Signature Moment: "Aurora Bloom"
Triggered ONLY on successful workout save. CSS-only.

**Visual Spec:**
- **Overlay:** Full screen `rgba(10, 10, 15, 0.8)` (Obsidian Black) with `backdrop-filter: blur(4px);`
- **Aurora Gradient:** A central div scaling from 0 to 1. `background: radial-gradient(circle, var(--wing-purple, #8B5CF6) 0%, var(--midnight-sapphire, #002060) 50%, transparent 100%); opacity: 0.6; mix-blend-mode: screen;`
- **Ring Fill:** The Ascension Rings animate their stroke-dashoffset to 100%.
- **Milestone Gleam:** Text "Milestone Achieved" fades in. `color: var(--gilded-fern, #C6A84B); text-shadow: 0 0 20px var(--gilded-fern, #C6A84B);`

**Motion:**
- Ring Fill: `transition: stroke-dashoffset 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55);` (Elastic)
- Aurora Expand: `animation: expand 800ms ease-out forwards;` (`transform: scale(0) to scale(1.5)`)
- Gleam: `animation: fadein 400ms ease-in-out 300ms forwards;` (`opacity: 0 to 1`)
- **Reduced Motion:** Overlay appears instantly. Rings fill instantly. Gleam text is static, no text-shadow pulse.

---

### 6. Bottom Tab Bar (Mobile Navigation)
The single nav for mobile.

**Layout & Breakpoints:**
- **Mobile (< 768px):** `position: fixed; bottom: 0; width: 100%; height: calc(64px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); z-index: 100;`
- **Desktop:** Hidden (`display: none`). Desktop uses a top horizontal nav or left icon rail (to be detailed in a separate spec, but for Phase 1 Home, we use a top nav matching the Apex Header aesthetic).

**Tokens & States:**
- **Background:** `background: rgba(26, 26, 36, 0.9); backdrop-filter: blur(12px); border-top: 1px solid var(--graphite, #1A1A24);` (Graphite base).
- **Tab Item:** `min-width: 44px; min-height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center;`
- **Default:** `color: var(--frost-white, #E0ECF4); opacity: 0.6;`
- **Active:** `color: var(--ice-wing, #60C0F0); opacity: 1;` + 4px top border `border-top: 4px solid var(--ice-wing, #60C0F

---

## Design Reviewer & Implementation Challenger — Round 2

I agree with the overarching divergence resolutions (D-A through D-D). The constraint to CSS-only animations, the structured Quick Post templates, and the Phase-1 scoping are all sound architectural decisions. 

However, reviewing the exact CSS and layout specifications, I have identified several critical UX flaws regarding mobile viewport real estate, layout shifts, and CSS clipping. 

Here are my disputes and proposed corrections:

### 1. DISPUTE: Apex Header Mobile Height is Too Invasive
**File:** `styles/components/_apex-header.css` (or equivalent styled-component)
**Issue:** You specified `height: 160px` for the expanded mobile header, collapsing to `80px`. On a standard mobile device (e.g., iPhone 13/14 at 844px height), a 160px sticky header plus a 64px bottom tab bar consumes ~26% of the screen before the user even sees the Guide's Note or Feed. This severely damages the core loop visibility.
**Proposed Alternative:** 
Tighten the mobile header to fit the 80px rings exactly with standard padding, and collapse it further.
```css
/* Proposed Mobile Apex Header */
.apex-header {
  height: 112px; /* 80px rings + 16px top/bottom padding */
  padding: 16px;
  transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1), padding 300ms ease;
}

.apex-header.collapsed {
  height: 64px; /* 48px rings + 8px top/bottom padding */
  padding: 8px 16px;
}
```

### 2. DISPUTE: Bottom Tab Bar Layout Shift & Truncation
**File:** `styles/components/_bottom-nav.css`
**Issue:** Your spec states the Active tab gets `border-top: 4px solid var(--ice-wing, #60C0F0)` (note: your hex code was truncated in the output). Adding a border *only* on the active state will cause a 4px layout shift, pushing the icon and text down when tapped.
**Proposed Alternative:** 
Apply a transparent border to the default state to reserve the space, and fix the hex code.
```css
/* Proposed Tab Item */
.tab-item {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--frost-white, #E0ECF4);
  opacity: 0.6;
  border-top: 4px solid transparent; /* Prevents layout shift */
  transition: color 200ms ease, border-color 200ms ease, opacity 200ms ease;
}

.tab-item.active {
  color: var(--ice-wing, #60C0F0);
  opacity: 1;
  border-top: 4px solid var(--ice-wing, #60C0F0);
}
```

### 3. DISPUTE: Quick Post Chip Shadow Clipping
**File:** `styles/components/_feed.css`
**Issue:** The Active Quick Post template uses `box-shadow: 0 0 15px var(--ice-wing, #60C0F0)`. Because these chips live in a "Horizontal scroll row" (`overflow-x: auto`), the 15px glow will be aggressively clipped by the top and bottom bounds of the scroll container unless vertical padding is explicitly defined.
**Proposed Alternative:** 
Add `padding-block` to the scroll container to allow the glow to bleed without clipping.
```css
/* Proposed Quick Post Container */
.quick-post-scroll-row {
  display: flex;
  overflow-x: auto;
  gap: 12px;
  padding: 16px 16px; /* 16px vertical padding prevents shadow clipping */
  margin: -16px 0 16px 0; /* Offset padding to maintain visual rhythm */
  scrollbar-width: none; /* Hide scrollbar for clean UI */
}
```

### 4. DISPUTE: Aurora Bloom Performance & Blend Mode
**File:** `styles/components/_aurora-bloom.css`
**Issue:** Animating `transform: scale(0) to scale(1.5)` on a large radial gradient can trigger expensive repaints on lower-end mobile devices. Furthermore, `mix-blend-mode: screen` applied over an `rgba(10, 10, 15, 0.8)` overlay will barely register, as screening over near-black results in very little luminosity change.
**Proposed Alternative:** 
Hardware-accelerate the animation and use standard alpha blending (or `plus-lighter` if supported) for a more vibrant pop against the dark overlay.
```css
/* Proposed Aurora Gradient */
.aurora-gradient {
  background: radial-gradient(circle, var(--wing-purple, #8B5CF6) 0%, var(--midnight-sapphire, #002060) 50%, transparent 100%);
  opacity: 0.8; /* Increased opacity since we drop screen blend */
  will-change: transform, opacity; /* Force GPU layer */
  animation: expand 800ms ease-out forwards;
}

@keyframes expand {
  0% { transform: scale(0) translateZ(0); opacity: 0; } /* translateZ forces hardware acceleration */
  50% { opacity: 0.8; }
  100% { transform: scale(1.5) translateZ(0); opacity: 0; }
}
```

Please confirm these adjustments so we can lock the CSS specifications and move into component state management and API integration.

---

## Creative Director (Lead Design Authority) — Round 3

## Creative Director (GLM 5.2) — Round 2

I accept three of the four disputes as technically correct and well-reasoned. One requires a targeted correction to preserve the intended visual sequence.

### 1. Apex Header Mobile Height — ACCEPTED
The 160px spec was overly generous. Your 112px/64px split is correct: it preserves the 80px ring target with standard padding while reclaiming ~48px of viewport for the feed. Locked.

### 2. Bottom Tab Bar Layout Shift — ACCEPTED
Transparent border on default state is the correct pattern. My truncated hex (`#60C0F`) was an output error; the full value is `#60C0F0`. Your proposed CSS is adopted verbatim.

### 3. Quick Post Chip Shadow Clipping — ACCEPTED
Valid catch. `overflow-x: auto` does clip vertical box-shadow. The `padding: 16px 16px` with `margin: -16px 0 16px 0` negative offset preserves visual rhythm while allowing the 15px glow to render. One addition: the `scrollbar-width: none` should be paired with the WebKit pseudo-element for cross-browser coverage:
```css
.quick-post-scroll-row::-webkit-scrollbar {
  display: none;
}
```

### 4. Aurora Bloom — PARTIALLY DISPUTED

**Accepted:** The `mix-blend-mode: screen` critique is correct — screening over `rgba(10, 10, 15, 0.8)` produces negligible luminance lift. Dropping to standard alpha blending with `opacity: 0.8` is the right call. The `will-change: transform, opacity` and `translateZ(0)` hardware acceleration is also correct for repaint prevention.

**Disputed:** Your keyframes specify `opacity: 0` at `100%`. This causes the aurora to fully fade *during* the 800ms animation, but the Milestone Gleam text fades in at `300ms` with a `400ms` duration — meaning it completes at `700ms`, just before the aurora vanishes. The intended sequence is: aurora blooms and *holds* as a backdrop while the gleam text reads, then the user dismisses via tap. A fade-out on the aurora creates a visual vacuum behind the text.

**Proposed Correction:**
```css
@keyframes expand {
  0% { transform: scale(0) translateZ(0); opacity: 0; }
  60% { opacity: 0.8; }
  100% { transform: scale(1.5) translateZ(0); opacity: 0.8; /* Hold, do not fade */ }
}
```

The aurora holds at full opacity until the overlay is dismissed by user tap or a 2.5s auto-timeout (to be wired in state management). This preserves the "moment" the Signature FX is meant to deliver.

**Reduced Motion counterpart** remains: overlay appears instantly, aurora static at scale(1.5) opacity(0.8), gleam text static.

---

**Status:** Disputes 1–3 locked. Dispute 4 pending your confirmation on the hold-vs-fade keyframe adjustment. Once confirmed, CSS specifications are complete and we proceed to component state management.

---

## Design Reviewer & Implementation Challenger — Round 4

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

---

