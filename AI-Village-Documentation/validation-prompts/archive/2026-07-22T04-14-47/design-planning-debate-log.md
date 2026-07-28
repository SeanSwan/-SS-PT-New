# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 3
> **Tokens:** 14,137 input / 7,727 output

---

## Creative Director (Lead Design Authority) — Round 1

As Creative Director, I have reviewed the Master Plan. The directive is clear: we are executing two distinct workstreams with specific visual identities. SwanGuard will adopt the "family watchtower at night" aesthetic (obsidian base, guardian amber, signal teal) reconciled to our brand tokens. SwanStudios will embrace "cinematic photographic luxury" where photography is the primary surface and UI recedes to glass layers. 

Here is the exact design specification for the surfaces explicitly introduced in the plan.

---

### Surface 1: SwanGuard Desktop Navigation Rail + ⌘K Command Palette
**Context:** Replaces the 14-module sprawl. Collapses to 3 destinations (Today, Intel, Trust) + 2 utilities (Inbox, Settings). Desktop uses pointer+keyboard with a command palette.

**Layout & Dimensions:**
*   **Nav Rail:** Fixed left, `width: 72px` (collapsed) / `240px` (expanded on hover). `height: 100vh`. `padding: 16px 12px`.
*   **Nav Items:** `height: 44px` (touch target min), `width: 100%`, `border-radius: 8px`, `margin-bottom: 8px`. Icon `24x24px` + Label (Grotesk, 14px, 600 weight).
*   **⌘K Palette:** Centered overlay. `max-width: 640px`, `width: 90vw`. `background: var(--color-graphite, #1A1A24)`, `border: 1px solid var(--color-swan-lavender, #4070C0)`, `border-radius: 12px`, `box-shadow: 0 20px 50px rgba(0,0,0,0.5)`.
*   **Breakpoints:** Desktop only (`min-width: 1024px`). Hidden on mobile.

**Tokens & States:**
*   **Rail BG:** `var(--color-obsidian-black, #0A0A0F)`
*   **Item Default:** Text `var(--color-frost-white, #E0ECF4)` at 60% opacity.
*   **Item Hover:** BG `var(--color-carbon, #141419)`, Text 100% opacity.
*   **Item Active:** BG `var(--color-midnight-sapphire, #002060)`, Left border `2px solid var(--color-gilded-fern, #C6A84B)` (Guardian Amber).
*   **Palette Input:** BG `var(--color-carbon, #141419)`, Text `var(--color-frost-white, #E0ECF4)`. Focus-visible: `outline: 2px solid var(--color-arctic-cyan, #50A0F0)` (Signal Teal).
*   **Dual-Button Glow (Execute Action in Palette):** Blue BG (`var(--color-midnight-sapphire, #002060)`) -> `box-shadow: 0 0 12px var(--color-wing-purple, #8B5CF6)`.

**Motion:**
*   **Rail Expand:** `width` transition `200ms ease-out`.
*   **Palette Open:** `opacity: 0 to 1`, `transform: translateY(-10px) to translateY(0)`, `150ms ease-in`.
*   **Reduced Motion:** Disable transitions, instant state changes.

**Accessibility:**
*   `role="navigation"` for rail, `aria-label` for expand/collapse. 
*   Palette: `role="dialog"`, `aria-modal="true"`. Focus must trap inside palette. `Esc` closes and returns focus to trigger.

---

### Surface 2: SwanGuard Mobile Bottom Tab Bar + Swipe Deck
**Context:** Mobile navigation for the 5 spaces. Includes real swipe gestures on decks for alerts/briefs.

**Layout & Dimensions:**
*   **Tab Bar:** Fixed bottom, `height: 64px` (includes safe-area insets). `width: 100vw`. `padding: 10px 16px`. BG: `var(--color-obsidian-black, #0A0A0F)` with top border `1px solid var(--color-graphite, #1A1A24)`.
*   **Tab Item:** `flex: 1`, `height: 44px` (touch target). Icon `24x24px` + Label (10px, uppercase, letter-spacing 0.5px).
*   **Swipe Deck:** `width: 100vw`, `height: calc(100vh - 64px)`. Cards inside deck: `margin: 16px`, `border-radius: 16px`, `padding: 24px`.

**Tokens & States:**
*   **Tab Default:** Icon/Text `var(--color-swan-lavender, #4070C0)`.
*   **Tab Active:** Icon/Text `var(--color-ice-wing, #60C0F0)`. 
*   **Dual-Button Glow (Hold-to-confirm critical action):** Purple BG (`var(--color-wing-purple, #8B5CF6)`) -> `box-shadow: 0 0 16px var(--color-arctic-cyan, #50A0F0)`.
*   **Swipe-to-dismiss:** Left swipe reveals `var(--color-gilded-fern, #C6A84B)` background (Alert/Acknowledge). Card opacity scales with drag distance.

**Motion:**
*   **Tab Press:** `transform: scale(0.95)`, `100ms ease-out`.
*   **Swipe:** Follows finger (1:1). Release snap: `300ms cubic-bezier(0.25, 1, 0.5, 1)`.
*   **Reduced Motion:** Swipe requires tapping an explicit "Acknowledge" button instead of gesture.

**Accessibility:**
*   `role="tablist"` on bar, `role="tab"` on items, `aria-selected="true/false"`.
*   Swipe gestures must have accessible button alternatives (e.g., "Dismiss" button visible on card focus).

---

### Surface 3: SwanGuard "Today" Space (Morning Brief Signature Moment)
**Context:** The primary landing space. Features a photographic Morning Brief header and digestible intelligence cards.

**Layout & Dimensions:**
*   **Header (Signature Moment):** `height: 40vh` (desktop) / `30vh` (mobile). Full-bleed background image. `padding: 48px`. Serif display headline (`font-size: clamp(32px, 5vw, 64px)`).
*   **Brief Cards Grid:** `display: grid`, `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`, `gap: 24px`, `padding: 24px 48px`.
*   **Card:** `padding: 24px`, `border-radius: 12px`, `min-height: 120px`.

**Tokens & States:**
*   **Header Overlay:** `background: linear-gradient(to bottom, transparent, var(--color-obsidian-black, #0A0A0F))`.
*   **Card BG:** `var(--color-carbon, #141419)`.
*   **Card Text:** `var(--color-frost-white, #E0ECF4)`.
*   **Critical Alert (Guardian Amber):** `border-left: 4px solid var(--color-gilded-fern, #C6A84B)`.
*   **Standard Intel (Signal Teal):** `border-left: 4px solid var(--color-arctic-cyan, #50A0F0)`.
*   **Card Hover:** `transform: translateY(-2px)`, `box-shadow: 0 8px 16px rgba(0,0,0,0.3)`.
*   **Loading:** Skeleton shimmer using `var(--color-graphite, #1A1A24)`.

**Motion:**
*   **Header Parallax:** Background image moves at `0.5x` scroll speed.
*   **Card Stagger:** `opacity: 0 to 1`, `transform: translateY(20px) to translateY(0)`, staggered `50ms` delay per card, `400ms ease-out`.
*   **Reduced Motion:** Disable parallax. Cards fade in instantly without transform.

**Accessibility:**
*   Background image requires `aria-hidden="true"`; textual equivalent provided in headline.
*   Cards must use semantic headings (`h2`, `h3`).

---

### Surface 4: SwanStudios Homepage Hero (Cinematic)
**Context:** Full-bleed National-Geographic-grade imagery. Tiny centered logo, one-line promise, 2 buttons. UI recedes to glass layers.

**Layout & Dimensions:**
*   **Hero Container:** `height: 100vh`, `width: 100vw`. `display: flex`, `flex-direction: column`, `justify-content: center`, `align-items: center`.
*   **Logo:** `height: 40px`, `margin-bottom: 32px`.
*   **Headline (Serif Drama):** `font-size: clamp(48px, 8vw, 120px)`, `text-align: center`, `max-width: 1200px`, `line-height: 1.1`.
*   **CTA Container:** `margin-top: 48px`, `display: flex`, `gap: 24px`.
*   **Buttons:** `min-height: 44px`, `padding: 12px 32px`, `border-radius: 4px` (sharp, editorial).

**Tokens & States:**
*   **Text:** `var(--color-frost-white, #E0ECF4)`.
*   **Primary Button:** BG `var(--color-midnight-sapphire, #002060)`, Text `var(--color-frost-white, #E0ECF4)`.
    *   *Hover/Active:* Dual-Button Glow -> `box-shadow: 0 0 24px var(--color-wing-purple, #8B5CF6)`.
*   **Secondary Button:**

---

## Design Reviewer & Implementation Challenger — Round 2

I agree with the structural foundations, layout dimensions, motion curves, and accessibility standards you have proposed. The structural differentiation between the utilitarian SwanGuard and the cinematic SwanStudios is well-articulated. 

However, I have specific disputes regarding token application, semantic color mapping, and the incomplete SwanStudios specification.

### DISPUTE 1: Token Bleed (Wing Purple in SwanGuard)
**Context:** Surface 1 (⌘K Palette) and Surface 2 (Mobile Tab Bar/Swipe Deck).
**Why:** You specified `var(--color-wing-purple, #8B5CF6)` for the "Dual-Button Glow" in SwanGuard. The Master Plan explicitly restricts SwanGuard to the "family watchtower at night" aesthetic (obsidian base, guardian amber, signal teal). Wing Purple is a high-drama brand token that belongs in SwanStudios, not the utilitarian security interface.
**Proposal:** Replace the purple glow with Signal Teal for standard execution, and Guardian Amber for critical actions.
**Exact Code Changes:**
*File: `apps/swan-guard/src/components/CommandPalette.css`*
```css
/* REJECTED */
.palette-execute-btn:focus-visible {
  box-shadow: 0 0 12px var(--color-wing-purple, #8B5CF6);
}

/* PROPOSED */
.palette-execute-btn:focus-visible {
  box-shadow: 0 0 12px var(--color-arctic-cyan, #50A0F0); /* Signal Teal */
}
```
*File: `apps/swan-guard/src/components/SwipeDeck.css`*
```css
/* REJECTED */
.hold-to-confirm-btn:active {
  background: var(--color-midnight-sapphire, #002060);
  box-shadow: 0 0 16px var(--color-wing-purple, #8B5CF6);
}

/* PROPOSED */
.hold-to-confirm-btn:active {
  background: var(--color-carbon, #141419);
  box-shadow: 0 0 16px var(--color-gilded-fern, #C6A84B); /* Guardian Amber for critical confirm */
}
```

### DISPUTE 2: Swipe-to-Dismiss Semantic Color Mapping
**Context:** Surface 2 (Swipe Deck).
**Why:** You mapped the left swipe "Alert/Acknowledge" background to `var(--color-gilded-fern, #C6A84B)`. In Surface 3, you correctly defined Gilded Fern as the "Critical Alert" token. Using a critical warning color for a standard "Acknowledge/Dismiss" action creates cognitive dissonance for the user.
**Proposal:** Use Signal Teal for standard acknowledgment, reserving Guardian Amber for escalation.
**Exact Code Changes:**
*File: `apps/swan-guard/src/components/SwipeDeck.tsx` (Line ~45)*
```tsx
// REJECTED
const swipeBackground = dragDistance > threshold ? 'var(--color-gilded-fern)' : 'transparent';

// PROPOSED
const swipeBackground = isEscalation 
  ? 'var(--color-gilded-fern)' // Amber for Escalate
  : 'var(--color-arctic-cyan)'; // Teal for Acknowledge/Dismiss
```

### DISPUTE 3: Incomplete Spec & Missing Glassmorphism
**Context:** Surface 4 (SwanStudios Homepage Hero).
**Why:** Your specification cut off at the Secondary Button. Furthermore, the Master Plan dictates that SwanStudios UI "recedes to glass layers." A solid Midnight Sapphire primary button is too heavy against cinematic photography.
**Proposal:** Complete the Secondary Button spec and apply a glassmorphic treatment to the CTA container to fulfill the "receding UI" directive.
**Exact Code Changes:**
*File: `apps/swan-studios/src/components/Hero.css`*
```css
/* PROPOSED ADDITIONS */
.hero-cta-container {
  /* Recede UI to glass layer */
  background: rgba(26, 26, 36, 0.4); /* Graphite base with opacity */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(224, 236, 244, 0.1); /* Frost white subtle border */
  padding: 16px;
  border-radius: 8px;
}

.btn-secondary {
  background: transparent;
  color: var(--color-frost-white, #E0ECF4);
  border: 1px solid var(--color-frost-white, #E0ECF4);
  transition: all 300ms ease;
}

.btn-secondary:hover {
  background: rgba(224, 236, 244, 0.1); /* Frost white hover state */
}
```

Please review these corrections. If you agree with aligning the tokens strictly to their respective workstreams and finalizing the glassmorphic properties, we can lock this specification.

---

## Creative Director (Lead Design Authority) — Round 3

CONSENSUS REACHED

### Merged Findings & Finalized UX/UI Design Specification

I agree with all points raised by the Design Reviewer. The token bleed was an oversight, the semantic mapping for swipe actions is logically sound, and the glassmorphic treatment is essential to fulfill the SwanStudios aesthetic directive. 

Here is the finalized, merged specification for the four surfaces.

---

### Surface 1: SwanGuard Desktop Navigation Rail + ⌘K Command Palette
**Layout & Dimensions:**
*   **Nav Rail:** Fixed left, `width: 72px` (collapsed) / `240px` (expanded on hover). `height: 100vh`. `padding: 16px 12px`.
*   **Nav Items:** `height: 44px`, `width: 100%`, `border-radius: 8px`, `margin-bottom: 8px`. Icon `24x24px` + Label (Grotesk, 14px, 600 weight).
*   **⌘K Palette:** Centered overlay. `max-width: 640px`, `width: 90vw`. `background: var(--color-graphite, #1A1A24)`, `border: 1px solid var(--color-swan-lavender, #4070C0)`, `border-radius: 12px`, `box-shadow: 0 20px 50px rgba(0,0,0,0.5)`.
*   **Breakpoints:** Desktop only (`min-width: 1024px`). Hidden on mobile.

**Tokens & States:**
*   **Rail BG:** `var(--color-obsidian-black, #0A0A0F)`
*   **Item Default:** Text `var(--color-frost-white, #E0ECF4)` at 60% opacity.
*   **Item Hover:** BG `var(--color-carbon, #141419)`, Text 100% opacity.
*   **Item Active:** BG `var(--color-midnight-sapphire, #002060)`, Left border `2px solid var(--color-gilded-fern, #C6A84B)` (Guardian Amber).
*   **Palette Input:** BG `var(--color-carbon, #141419)`, Text `var(--color-frost-white, #E0ECF4)`. Focus-visible: `outline: 2px solid var(--color-arctic-cyan, #50A0F0)` (Signal Teal).
*   **Dual-Button Glow (Execute Action in Palette):** Blue BG (`var(--color-midnight-sapphire, #002060)`) -> `box-shadow: 0 0 12px var(--color-arctic-cyan, #50A0F0)` (Signal Teal).

**Motion:**
*   **Rail Expand:** `width` transition `200ms ease-out`.
*   **Palette Open:** `opacity: 0 to 1`, `transform: translateY(-10px) to translateY(0)`, `150ms ease-in`.
*   **Reduced Motion:** Disable transitions, instant state changes.

**Accessibility:**
*   `role="navigation"` for rail, `aria-label` for expand/collapse. 
*   Palette: `role="dialog"`, `aria-modal="true"`. Focus must trap inside palette. `Esc` closes and returns focus to trigger.

---

### Surface 2: SwanGuard Mobile Bottom Tab Bar + Swipe Deck
**Layout & Dimensions:**
*   **Tab Bar:** Fixed bottom, `height: 64px` (includes safe-area insets). `width: 100vw`. `padding: 10px 16px`. BG: `var(--color-obsidian-black, #0A0A0F)` with top border `1px solid var(--color-graphite, #1A1A24)`.
*   **Tab Item:** `flex: 1`, `height: 44px`. Icon `24x24px` + Label (10px, uppercase, letter-spacing 0.5px).
*   **Swipe Deck:** `width: 100vw`, `height: calc(100vh - 64px)`. Cards inside deck: `margin: 16px`, `border-radius: 16px`, `padding: 24px`.

**Tokens & States:**
*   **Tab Default:** Icon/Text `var(--color-swan-lavender, #4070C0)`.
*   **Tab Active:** Icon/Text `var(--color-ice-wing, #60C0F0)`. 
*   **Dual-Button Glow (Hold-to-confirm critical action):** Carbon BG (`var(--color-carbon, #141419)`) -> `box-shadow: 0 0 16px var(--color-gilded-fern, #C6A84B)` (Guardian Amber).
*   **Swipe-to-dismiss:** Left swipe reveals `var(--color-arctic-cyan, #50A0F0)` (Signal Teal) background for standard Acknowledge/Dismiss. Escalation actions reveal `var(--color-gilded-fern, #C6A84B)` (Guardian Amber). Card opacity scales with drag distance.

**Motion:**
*   **Tab Press:** `transform: scale(0.95)`, `100ms ease-out`.
*   **Swipe:** Follows finger (1:1). Release snap: `300ms cubic-bezier(0.25, 1, 0.5, 1)`.
*   **Reduced Motion:** Swipe requires tapping an explicit "Acknowledge" button instead of gesture.

**Accessibility:**
*   `role="tablist"` on bar, `role="tab"` on items, `aria-selected="true/false"`.
*   Swipe gestures must have accessible button alternatives (e.g., "Dismiss" button visible on card focus).

---

### Surface 3: SwanGuard "Today" Space (Morning Brief Signature Moment)
**Layout & Dimensions:**
*   **Header (Signature Moment):** `height: 40vh` (desktop) / `30vh` (mobile). Full-bleed background image. `padding: 48px`. Serif display headline (`font-size: clamp(32px, 5vw, 64px)`).
*   **Brief Cards Grid:** `display: grid`, `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`, `gap: 24px`, `padding: 24px 48px`.
*   **Card:** `padding: 24px`, `border-radius: 12px`, `min-height: 120px`.

**Tokens & States:**
*   **Header Overlay:** `background: linear-gradient(to bottom, transparent, var(--color-obsidian-black, #0A0A0F))`.
*   **Card BG:** `var(--color-carbon, #141419)`.
*   **Card Text:** `var(--color-frost-white, #E0ECF4)`.
*   **Critical Alert (Guardian Amber):** `border-left: 4px solid var(--color-gilded-fern, #C6A84B)`.
*   **Standard Intel (Signal Teal):** `border-left: 4px solid var(--color-arctic-cyan, #50A0F0)`.
*   **Card Hover:** `transform: translateY(-2px)`, `box-shadow: 0 8px 16px rgba(0,0,0,0.3)`.
*   **Loading:** Skeleton shimmer using `var(--color-graphite, #1A1A24)`.

**Motion:**
*   **Header Parallax:** Background image moves at `0.5x` scroll speed.
*   **Card Stagger:** `opacity: 0 to 1`, `transform: translateY(20px) to translateY(0)`, staggered `50ms` delay per card, `400ms ease-out`.
*   **Reduced Motion:** Disable parallax. Cards fade in instantly without transform.

**Accessibility:**
*   Background image requires `aria-hidden="true"`; textual equivalent provided in headline.
*   Cards must use semantic headings (`h2`, `h3`).

---

### Surface 4: SwanStudios Homepage Hero (Cinematic)
**Layout & Dimensions:**
*   **Hero Container:** `height: 100vh`, `width: 100vw`. `display: flex`, `flex-direction: column`, `justify-content: center`, `align-items: center`.
*   **Logo:** `height: 40px`, `margin-bottom: 32px`.
*   **Headline (Serif Drama):** `font-size: clamp(48px, 8vw, 120px)`, `text-align: center`, `max-width: 1200px`, `line-height: 1.1`.
*   **CTA Container:** `margin-top: 48px`, `display: flex`, `gap: 24px`. 
    *   *Glassmorphic Treatment:* `background: rgba(26, 26, 36, 0.4)`, `backdrop-filter: blur(16px)`, `-webkit-backdrop-filter: blur(16px)`, `border: 1px solid rgba(224, 236, 244, 0.1)`, `padding: 16px`, `border-radius: 8px`.
*   **Buttons:** `min-height: 44px`, `padding: 12px 32px`, `border-radius: 4px` (sharp, editorial).

**Tokens & States:**
*   **Text:** `var(--color-frost-white, #E0ECF4)`.
*   **Primary Button:** BG `var(--color-midnight-sapphire, #002060)`, Text `var(--color-frost-white, #E0ECF4)`.
    *   *Hover/Active:* Dual-Button Glow -> `box-shadow: 0 0 24px var(--color-wing-purple, #8B5CF6)`.
*   **Secondary Button:** BG `transparent`, Text `var(--color-frost-white, #E0ECF4)`, `border: 1px solid var(--color-frost-white, #E0ECF4)`.
    *   *Hover/Active:* `background: rgba(224, 236, 244, 0.1)`, `transition: all 300ms ease`.

---

