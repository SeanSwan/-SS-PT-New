# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 20,211 input / 8,861 output

---

## Creative Director (Lead Design Authority) — Round 1

As the Creative Director, I have reviewed the PLAN-INPUT and derived the exact surfaces introduced. Below is the authoritative visual specification for the four primary surfaces mandated by the plan: **Smart Lens Lab (Style-mode Detail Card & Catalog)**, **Workout Logger (Quick Log Mode)**, **Swan Coach "Jarvis" Chat Interface**, and **Wearable Integration Consent (Fitbit)**. 

All designs adhere to the "Enchanted Apex: Crystalline Swan" dark-first theme, utilizing CSS custom properties with brand fallbacks, styled-components, and the Dual-Button Glow rule.

---

### 1. Smart Lens Lab — Style-mode Detail Card & Catalog
**Context:** Fixing §2 imperfections (dead space, glyph collision, cramped catalog) and introducing the "Apply" morph beat.

**Layout & Dimensions:**
*   **Mobile (320–414px):** Catalog is a single-column vertical scroll. "Current Lens" is pinned to the top with a `2px` left border in `var(--ss-accent-gilded, #C6A84B)`. Detail Card is a bottom-sheet (`position: fixed; bottom: 0; width: 100%; border-radius: 16px 16px 0 0;`). 
*   **Desktop (1440px+):** Catalog is a left sidebar (`width: 320px; height: 100vh;`). Detail Card is a right-docked panel (`width: 400px;`). 
*   **Spacing:** `padding: 24px` internal for Detail Card; `gap: 12px` between catalog chips.

**Tokens & States:**
*   **Background:** `var(--ss-bg-obsidian, #0A0A0F)`
*   **Surface (Card/Panel):** `var(--ss-surface-graphite, #1A1A24)`
*   **Catalog Chip (Default):** `background: var(--ss-surface-carbon, #141419); color: var(--ss-text-frost, #E0ECF4); border: 1px solid transparent;`
*   **Catalog Chip (Hover):** `border-color: var(--ss-accent-arctic, #50A0F0);`
*   **Catalog Chip (Active/Selected):** `background: var(--ss-accent-sapphire, #002060); color: var(--ss-text-frost, #E0ECF4); box-shadow: 0 0 12px var(--ss-accent-wing, #8B5CF6);` *(Blue bg -> Purple glow)*
*   **Apply Button:** `background: var(--ss-accent-wing, #8B5CF6); color: var(--ss-text-frost, #E0ECF4); min-height: 44px; width: 100%; border-radius: 8px; box-shadow: 0 0 12px var(--ss-accent-arctic, #50A0F0);` *(Purple bg -> Cyan glow)*
*   **Confirmation Chip (Post-Apply):** `background: var(--ss-surface-carbon, #141419); color: var(--ss-accent-gilded, #C6A84B); position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);`

**Motion Spec:**
*   **Apply Morph Beat:** On click, the Apply button scales `1.0 -> 0.95 -> 1.0` over `200ms` with `ease-out`. The main stage background pulses opacity `1.0 -> 0.8 -> 1.0` over `400ms`.
*   **Confirmation Chip:** Slides up `translateY(20px) -> translateY(0)` over `300ms`, holds for `2000ms`, fades out `opacity 1 -> 0` over `300ms`.
*   **Reduced Motion:** Disable scale and slide; use instant opacity transitions only.

**Accessibility:**
*   **Keyboard:** Catalog chips are `role="radio"`. Tab moves sequentially. Spacebar selects. Apply button is `role="button"`.
*   **ARIA:** Detail Card has `aria-live="polite"` to announce the selected lens details. Confirmation chip has `aria-live="assertive"`.

---

### 2. Workout Logger (Quick Log Mode)
**Context:** Workstream B P0. Extreme efficiency, minimal taps, pre-fill values.

**Layout & Dimensions:**
*   **Mobile:** Full-width stack. Set rows are `min-height: 44px` touch targets. Sticky bottom bar for "Add Exercise" (`height: 56px; width: 100%`).
*   **Desktop:** Max-width `800px` centered container. Set rows use a 4-column grid: `Set # | Weight | Reps | Log Check`.
*   **Spacing:** `padding: 16px` between set rows. `gap: 8px` between input fields.

**Tokens & States:**
*   **Background:** `var(--ss-bg-obsidian, #0A0A0F)`
*   **Set Row Surface:** `var(--ss-surface-carbon, #141419)`
*   **Input Fields (Pre-filled):** `background: var(--ss-surface-graphite, #1A1A24); color: var(--ss-text-ice, #60C0F0); border: 1px solid var(--ss-surface-graphite, #1A1A24);`
*   **Input Fields (Focus-visible):** `border-color: var(--ss-accent-arctic, #50A0F0); outline: 2px solid var(--ss-accent-arctic, #50A0F0);`
*   **Log Check Button (Default):** `background: var(--ss-surface-graphite, #1A1A24); color: var(--ss-text-frost, #E0ECF4); border-radius: 50%; height: 44px; width: 44px;`
*   **Log Check Button (Active/Logged):** `background: var(--ss-accent-sapphire, #002060); color: var(--ss-text-frost, #E0ECF4); box-shadow: 0 0 8px var(--ss-accent-wing, #8B5CF6);` *(Blue bg -> Purple glow)*
*   **Add Exercise Button:** `background: var(--ss-accent-wing, #8B5CF6); color: var(--ss-text-frost, #E0ECF4); box-shadow: 0 0 12px var(--ss-accent-arctic, #50A0F0);` *(Purple bg -> Cyan glow)*

**Motion Spec:**
*   **Log Check:** On tap, button scales `1.0 -> 0.9 -> 1.0` over `150ms` with `ease-in-out`.
*   **New Set Row:** When added, slides in from bottom `translateY(10px) -> translateY(0)` over `200ms` with `ease-out`.
*   **Reduced Motion:** Disable slide-in; new rows appear instantly.

**Accessibility:**
*   **Keyboard:** Inputs are `role="spinbutton"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`. Tab moves horizontally across Weight -> Reps -> Log.
*   **ARIA:** Log Check button has `aria-pressed="true/false"`.

---

### 3. Swan Coach "Jarvis" Chat Interface
**Context:** Workstream C. Voice-first, persistent chat on home, inline custom chart builder with "Save to Dashboard".

**Layout & Dimensions:**
*   **Mobile:** Full viewport height minus header. Chat bubbles max-width `85%`. Input bar sticky at bottom (`height: 64px`). Mic button is `48px` diameter, centered.
*   **Desktop:** Max-width `600px` centered column. 
*   **Inline Chart:** Victory chart rendered inside a chat bubble. "Save to Dashboard" button is full-width below the chart (`min-height: 44px`).

**Tokens & States:**
*   **Chat Background:** `var(--ss-bg-obsidian, #0A0A0F)`
*   **User Bubble:** `background: var(--ss-accent-sapphire, #002060); color: var(--ss-text-frost, #E0ECF4); border-radius: 16px 16px 4px 16px; box-shadow: 0 0 10px var(--ss-accent-wing, #8B5CF6);` *(Blue bg -> Purple glow)*
*   **Coach Bubble:** `background: var(--ss-surface-graphite, #1A1A24); color: var(--ss-text-frost, #E0ECF4); border-radius: 16px 16px 16px 4px; border: 1px solid var(--ss-accent-wing, #8B5CF6);`
*   **Mic Button (Idle):** `background: var(--ss-accent-sapphire, #002060); color: var(--ss-text-frost, #E0ECF4); box-shadow: 0 0 12px var(--ss-accent-wing, #8B5CF6);` *(Blue bg -> Purple glow)*
*   **Mic Button (Listening):** `background: var(--ss-accent-arctic, #50A0F0); color: var(--ss-bg-obsidian, #0A0A0F); box-shadow: 0 0 16px var(--ss-accent-wing, #8B5CF6);`
*   **Mic Button (Thinking):** `background: var(--ss-accent-wing, #8B5CF6); color: var(--ss-text-frost, #E0ECF4); box-shadow: 0 0 16px var(--ss-accent-arctic, #50A0F0);` *(Purple bg -> Cyan glow)*
*   **Save to Dashboard Button:** `background: transparent; color: var(--ss-accent-gilded, #C6A84B); border: 1px solid var(--ss-accent-gilded, #C6A84B); border-radius: 8px;`

**Motion Spec:**
*   **Mic Pulse (Listening):** `box-shadow` expands `0 0 12px -> 0 0 24px` over `1000ms` infinite alternate, `ease-in-out`.
*   **Thinking Spinner:** Mic icon replaced by a rotating circle `transform: rotate(360deg)` over `800ms` linear infinite.
*   **Chat Bubble Entry:** `opacity: 0 -> 1` and `translateY(8px) -> translateY(0)` over `250ms` `ease-out`.
*   **Reduced Motion:** Disable mic pulse and spinner rotation; use static color changes and opacity fades.

**Accessibility:**
*   **Keyboard:** Input field is `role="textbox"`. Mic button is `role="button"` with `aria-label="Dictate to Swan Coach"`. 
*   **ARIA:** Chat transcript container has `aria-live="polite"`. Mic button state changes announce `aria

---

## Design Reviewer & Implementation Challenger — Round 2

While I agree with the foundational application of the "Enchanted Apex" theme, the Dual-Button Glow rules, and the general token mapping, I **DISAGREE** with several implementation details that will cause layout breakage, accessibility failures, and visual fatigue. 

Furthermore, your specification truncated mid-sentence in Section 3 and completely omitted the mandated **Surface 4: Wearable Integration Consent (Fitbit)**. 

Here are my challenges and the required implementation adjustments:

### 1. Smart Lens Lab — Mobile Scroll Obscuration
**Disagreement:** You specified the Mobile Detail Card as `position: fixed; bottom: 0; width: 100%;` but failed to account for the Catalog's scroll area. Without a bottom spacer, the fixed bottom sheet will permanently obscure the last 1-2 items in the catalog, making them unclickable.
**File:** `src/components/SmartLens/Catalog.tsx` & `src/components/SmartLens/DetailCard.tsx`
**Proposed Code Change:**
*   Add a dynamic padding to the catalog container based on the Detail Card's height and safe areas.
*   Add a strict `z-index` to prevent the fixed card from being overlaid by other sticky elements.
```css
/* Catalog.tsx */
.catalog-container {
  padding-bottom: calc(env(safe-area-inset-bottom) + 120px); /* 120px accounts for Detail Card */
  overflow-y: auto;
}

/* DetailCard.tsx */
.detail-card-bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 40; /* Ensure it sits above catalog chips */
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 2. Workout Logger — Mobile Row Layout Ambiguity
**Disagreement:** You defined the mobile layout simply as a "Full-width stack" with `min-height: 44px`. If the inputs (Weight, Reps) stack vertically on mobile, it violates the "extreme efficiency, minimal taps" P0 requirement by pushing the Log Check button below the fold on long workouts.
**File:** `src/components/WorkoutLogger/SetRow.tsx`
**Proposed Code Change:**
Mobile rows must remain on a single horizontal axis using CSS Grid to ensure the Log Check button is always immediately accessible next to the inputs.
```css
.set-row-mobile {
  display: grid;
  grid-template-columns: 32px 1fr 1fr 48px; /* Set# | Weight | Reps | LogBtn */
  gap: 8px;
  align-items: center;
  min-height: 56px; /* Increased from 44px to accommodate touch target spacing */
}
```

### 3. Swan Coach "Jarvis" — Visual Noise & Truncated ARIA
**Disagreement A (Visual Noise):** Applying `border: 1px solid var(--ss-accent-wing, #8B5CF6)` to every single Coach Bubble will create a harsh "neon grid" effect during long conversations, causing severe eye strain in a dark-first theme.
**File:** `src/components/SwanCoach/ChatBubble.tsx`
**Proposed Code Change:** Remove the full border. Use a subtle gradient fill with a left-border accent to ground the text without overwhelming the user.
```css
.coach-bubble {
  background: linear-gradient(145deg, var(--ss-surface-graphite, #1A1A24), var(--ss-surface-carbon, #141419));
  border-left: 2px solid var(--ss-accent-wing, #8B5CF6);
  /* Removed full border */
}
```

**Disagreement B (Truncation):** Your spec cut off at `aria`. 
**Completion:** 
*   `aria-live="polite"` on the transcript container is correct.
*   **Missing:** Mic button state changes must announce `aria-label="Listening..."` or `aria-label="Processing..."` dynamically. The inline chart must have `role="img"` and an `aria-label` summarizing the data (e.g., "Bar chart showing volume progression over 4 weeks").

---

### 4. MISSING SPECIFICATION: Wearable Integration Consent (Fitbit)
Since you omitted this, I am providing the required implementation spec to ensure we meet the plan's mandate.

**Context:** Workstream D. High-trust surface for OAuth/Health data syncing. Needs to feel secure, branded, and clear.

**Layout & Dimensions:**
*   **Mobile/Desktop:** Rendered as a centered Modal Dialog (`role="dialog"`, `aria-modal="true"`). Max-width `400px`.
*   **Header:** Fitbit Logo + Swan Logo with a syncing animation between them.
*   **Content:** Bulleted list of requested data (Steps, Heart Rate, Sleep).
*   **Actions:** Sticky bottom footer with "Allow" (Primary) and "Deny" (Ghost) buttons.

**Tokens & States:**
*   **Backdrop:** `rgba(10, 10, 15, 0.8)` with `backdrop-filter: blur(4px)`.
*   **Modal Surface:** `var(--ss-surface-graphite, #1A1A24)` with `border: 1px solid var(--ss-surface-carbon, #141419)`.
*   **Allow Button:** `background: var(--ss-accent-sapphire, #002060); color: var(--ss-text-frost, #E0ECF4); box-shadow: 0 0 12px var(--ss-accent-wing, #8B5CF6);` *(Blue bg -> Purple glow)*.
*   **Deny Button:** `background: transparent; color: var(--ss-text-ice, #60C0F0); border: none;`

**Motion Spec:**
*   **Modal Entry:** `scale(0.95) -> scale(1)` and `opacity: 0 -> 1` over `200ms` `ease-out`.
*   **Sync Animation (Header):** A small SVG link icon between the logos pulses `opacity: 0.4 -> 1` infinitely while the modal is open.

**File:** `src/components/Wearable/ConsentModal.tsx`

Do you accept these layout corrections, the visual noise reduction on the chat bubbles, and the inclusion of the missing Fitbit Consent spec?

---

## Creative Director (Lead Design Authority) — Round 3

## Creative Director (GLM 5.2) — Round 2

I accept the majority of Gemini 3.1 Pro's corrections — they are technically sound and improve the specification. However, I have **one dispute** on the Fitbit Consent spec and **two minor refinements** to propose.

---

### ACCEPTED CORRECTIONS

**1. Smart Lens Lab — Mobile Scroll Obscuration:** Accepted in full. The `padding-bottom: calc(env(safe-area-inset-bottom) + 120px)` and `z-index: 40` are correct and necessary. No further changes.

**2. Workout Logger — Mobile Row Layout:** Accepted. The `grid-template-columns: 32px 1fr 1fr 48px` with `min-height: 56px` is superior to my ambiguous "full-width stack." This preserves the P0 efficiency mandate.

**3. Swan Coach — Visual Noise Reduction:** Accepted. The gradient fill with `border-left: 2px solid var(--ss-accent-wing)` is a strong alternative that maintains brand identity without the neon-grid fatigue. Adopted.

**4. Truncated ARIA Completion:** Accepted. Dynamic `aria-label` on mic state changes and `role="img"` with descriptive `aria-label` on inline charts are both required. Adopted.

---

### DISPUTE: Fitbit Consent — Allow Button Glow Direction

**Disagreement:** Gemini specified the Allow button as `background: var(--ss-accent-sapphire, #002060)` (Blue) with `box-shadow: 0 0 12px var(--ss-accent-wing, #8B5CF6)` (Purple glow). This maps to the **Blue→Purple** pattern, which I established for *secondary/confirmation* actions (Log Check, Catalog Chip Selected, Mic Idle).

The Allow button is the **primary consent action** on this surface — it is the equivalent of "Apply" or "Add Exercise." Per the design system hierarchy I established in Round 1, primary actions use **Purple bg → Cyan glow**.

**File:** `src/components/Wearable/ConsentModal.tsx`
**Proposed Correction:**
```css
.allow-button {
  background: var(--ss-accent-wing, #8B5CF6);   /* Purple bg */
  color: var(--ss-text-frost, #E0ECF4);
  box-shadow: 0 0 12px var(--ss-accent-arctic, #50A0F0); /* Cyan glow */
  min-height: 44px;
  border-radius: 8px;
  width: 100%;
}
```

This maintains visual hierarchy consistency: **Purple→Cyan = "commit/primary action"** across all four surfaces.

---

### REFINEMENT 1: Deny Button Needs Hover Affordance

**Issue:** Gemini's Deny button (`background: transparent; border: none; color: var(--ss-text-ice, #60C0F0)`) lacks any interactive affordance. Users on touch devices will see a text-colored rectangle with no boundary — it reads as decorative text, not a tappable control.

**Proposed Addition:**
```css
.deny-button {
  background: transparent;
  color: var(--ss-text-ice, #60C0F0);
  border: 1px solid var(--ss-surface-carbon, #141419);
  border-radius: 8px;
  min-height: 44px;
  width: 100%;
  transition: border-color 150ms ease-out;
}

.deny-button:hover,
.deny-button:focus-visible {
  border-color: var(--ss-text-ice, #60C0F0);
  outline: none;
}
```

This gives the Deny button a subtle boundary that activates on hover/focus, maintaining the "ghost" aesthetic while ensuring discoverability.

---

### REFINEMENT 2: Sync Animation Must Respect Reduced Motion

**Issue:** Gemini's header sync animation (`opacity: 0.4 -> 1` infinite pulse) has no reduced-motion fallback. This is a compliance gap.

**Proposed Addition:**
```css
@media (prefers-reduced-motion: reduce) {
  .sync-icon {
    animation: none;
    opacity: 1; /* Static full opacity */
  }
}
```

---

### SUMMARY

| Point | Status |
|-------|--------|
| Smart Lens mobile scroll fix | ✅ Accepted |
| Workout Logger mobile grid | ✅ Accepted |
| Chat bubble visual noise reduction | ✅ Accepted |
| ARIA completion for Swan Coach | ✅ Accepted |
| Fitbit Allow button glow direction | ❌ Disputed — should be Purple→Cyan |
| Deny button hover affordance | ⚠️ Refinement proposed |
| Sync animation reduced-motion | ⚠️ Refinement proposed |

**Awaiting Gemini 3.1 Pro's response on the Allow button glow direction dispute and the two refinements.**

---

## Design Reviewer & Implementation Challenger — Round 4

CONSENSUS REACHED

Your logic regarding the Dual-Button Glow hierarchy is flawless. "Allow" is indeed a primary commit action and must utilize the Purple → Cyan pattern to maintain systemic consistency. Furthermore, your additions for the Deny button's interactive affordance and the strict reduced-motion compliance on the sync animation are excellent UX/A11y catches. 

Below is the finalized, merged UX/UI Design Specification for all four primary surfaces, incorporating all agreed-upon layouts, tokens, accessibility standards, and motion rules.

---

### MERGED UX/UI DESIGN SPECIFICATION: "Enchanted Apex: Crystalline Swan"

#### 1. Smart Lens Lab (Style-mode Detail Card & Catalog)
**Files:** `src/components/SmartLens/Catalog.tsx`, `src/components/SmartLens/DetailCard.tsx`
*   **Layout (Mobile):** Single-column vertical scroll. Catalog container includes `padding-bottom: calc(env(safe-area-inset-bottom) + 120px)` to prevent obscuration. Detail Card is a fixed bottom-sheet (`z-index: 40`).
*   **Layout (Desktop):** Left sidebar catalog (`width: 320px; height: 100vh;`), right-docked Detail Card panel (`width: 400px;`).
*   **Tokens & States:**
    *   Background: `var(--ss-bg-obsidian, #0A0A0F)` | Surface: `var(--ss-surface-graphite, #1A1A24)`
    *   Catalog Chip (Active): `background: var(--ss-accent-sapphire); box-shadow: 0 0 12px var(--ss-accent-wing);` *(Blue → Purple)*
    *   Apply Button (Primary): `background: var(--ss-accent-wing); box-shadow: 0 0 12px var(--ss-accent-arctic);` *(Purple → Cyan)*
*   **Motion:** Apply button scales `1.0 -> 0.95 -> 1.0` (200ms). Background pulses opacity `1.0 -> 0.8 -> 1.0` (400ms). Confirmation chip slides up (300ms). All disabled via `prefers-reduced-motion`.
*   **A11y:** Chips use `role="radio"`. Detail Card uses `aria-live="polite"`. Confirmation chip uses `aria-live="assertive"`.

#### 2. Workout Logger (Quick Log Mode)
**Files:** `src/components/WorkoutLogger/SetRow.tsx`, `src/components/WorkoutLogger/Logger.tsx`
*   **Layout (Mobile):** Single horizontal axis grid to ensure immediate tap access.
    ```css
    .set-row-mobile {
      display: grid;
      grid-template-columns: 32px 1fr 1fr 48px; /* Set# | Weight | Reps | LogBtn */
      gap: 8px;
      align-items: center;
      min-height: 56px;
    }
    ```
*   **Layout (Desktop):** Max-width `800px` centered. 4-column grid.
*   **Tokens & States:**
    *   Inputs (Focus): `border-color: var(--ss-accent-arctic); outline: 2px solid var(--ss-accent-arctic);`
    *   Log Check (Active): `background: var(--ss-accent-sapphire); box-shadow: 0 0 8px var(--ss-accent-wing);` *(Blue → Purple)*
    *   Add Exercise (Primary): `background: var(--ss-accent-wing); box-shadow: 0 0 12px var(--ss-accent-arctic);` *(Purple → Cyan)*
*   **Motion:** Log Check scales `1.0 -> 0.9 -> 1.0` (150ms). New rows slide in `translateY(10px) -> 0` (200ms). Disabled on reduced-motion.
*   **A11y:** Inputs use `role="spinbutton"` with min/max/now values. Log Check uses `aria-pressed="true/false"`.

#### 3. Swan Coach "Jarvis" Chat Interface
**Files:** `src/components/SwanCoach/ChatBubble.tsx`, `src/components/SwanCoach/ChatInterface.tsx`
*   **Layout:** Mobile full viewport (minus header) with sticky bottom input (`height: 64px`). Desktop max-width `600px` centered.
*   **Tokens & States:**
    *   User Bubble: `background: var(--ss-accent-sapphire); box-shadow: 0 0 10px var(--ss-accent-wing);` *(Blue → Purple)*
    *   Coach Bubble: `background: linear-gradient(145deg, var(--ss-surface-graphite), var(--ss-surface-carbon)); border-left: 2px solid var(--ss-accent-wing);` *(Gradient + Left Border to reduce visual noise)*
    *   Mic Button (Listening): `background: var(--ss-accent-arctic); box-shadow: 0 0 16px var(--ss-accent-wing);`
    *   Mic Button (Thinking): `background: var(--ss-accent-wing); box-shadow: 0 0 16px var(--ss-accent-arctic);` *(Purple → Cyan)*
*   **Motion:** Mic pulse expands box-shadow (1000ms infinite alternate). Thinking spinner rotates (800ms linear infinite). Disabled on reduced-motion.
*   **A11y:** Transcript container `aria-live="polite"`. Mic button dynamically updates `aria-label` ("Listening...", "Processing..."). Inline charts use `role="img"` with descriptive `aria-label`.

#### 4. Wearable Integration Consent (Fitbit)
**Files:** `src/components/Wearable/ConsentModal.tsx`
*   **Layout:** Centered Modal Dialog (`max-width: 400px`). Header with logos and sync icon. Sticky bottom footer for actions.
*   **Tokens & States:**
    *   Backdrop: `rgba(10, 10, 15, 0.8)` with `backdrop-filter: blur(4px)`.
    *   Modal Surface: `var(--ss-surface-graphite)` with `1px solid var(--ss-surface-carbon)`.
    *   Allow Button (Primary): `background: var(--ss-accent-wing); box-shadow: 0 0 12px var(--ss-accent-arctic);` *(Purple → Cyan)*
    *   Deny Button (Ghost):
        ```css
        .deny-button {
          background: transparent;
          color: var(--ss-text-ice, #60C0F0);
          border: 1px solid var(--ss-surface-carbon, #141419);
          border-radius: 8px;
          min-height: 44px;
          width: 100%;
          transition: border-color 150ms ease-out;
        }
        .deny-button:hover, .deny-button:focus-visible {
          border-color: var(--ss-text-ice, #60C0F0);
          outline: none;
        }
        ```
*   **Motion & A11y:** Modal scales `0.95 -> 1` and fades in (200ms). Sync icon pulses opacity `0.4 -> 1` infinitely.
    ```css
    @media (prefers-reduced-motion: reduce) {
      .sync-icon { animation: none; opacity: 1; }
    }
    ```
    Modal uses `role="dialog"` and `aria-modal="true"`.

---

