# Design Specification Consensus

> Phase 2C: Gemini 3.1 Pro (CTO) ↔ MiniMax M2.7
> Consensus: YES

---

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
