# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 3
> **Tokens:** 18,254 input / 7,547 output

---

## Creative Director (Lead Design Authority) — Round 1

# Creative Director Visual Specification: Nutrition Decision Logger

As Creative Director, I am prescribing the exact visual and interaction specification for the `NutritionWorkspace` convergence and its associated surfaces. This design adheres strictly to the "Enchanted Apex: Crystalline Swan" dark-first theme, token-driven architecture, and the Dual-Button Glow rule. Every color is a CSS custom property with a brand fallback. 

## Global Token Contract
All components must consume these tokens. No hardcoded hex values except as fallbacks.

```css
--ss-bg-app: var(--bg-app, #0A0A0F); /* Obsidian Black */
--ss-surface-1: var(--surface-1, #141419); /* Carbon */
--ss-surface-2: var(--surface-2, #1A1A24); /* Graphite */
--ss-surface-3: var(--surface-3, #002060); /* Midnight Sapphire */
--ss-surface-4: var(--surface-4, #003080); /* Royal Depth */
--ss-text-primary: var(--text-primary, #E0ECF4); /* Frost White */
--ss-text-secondary: var(--text-secondary, #60C0F0); /* Ice Wing */
--ss-accent-blue: var(--accent-blue, #50A0F0); /* Arctic Cyan */
--ss-accent-purple: var(--accent-purple, #8B5CF6); /* Wing Purple */
--ss-accent-gold: var(--accent-gold, #C6A84B); /* Gilded Fern */
--ss-accent-lavender: var(--accent-lavender, #4070C0); /* Swan Lavender */
--ss-border: var(--border, rgba(224, 236, 244, 0.12));
--ss-glow-blue: var(--glow-blue, rgba(139, 92, 246, 0.45)); /* Blue bg -> Purple glow */
--ss-glow-purple: var(--glow-purple, rgba(80, 160, 240, 0.45)); /* Purple bg -> Cyan glow */
--ss-error: var(--error, #FF4D4D);
--ss-success: var(--success, #4BFF8B);
```

---

## 1. NutritionWorkspace (Global Shell)
The canonical surface replacing tab sprawl. Desktop uses a 3-column grid; mobile uses a single-column stack.

### Layout & Breakpoints
- **Mobile (320px - 767px):** 1 column. Padding: `16px`. Gap: `16px`. Stack order: Today Ribbon -> Capture Segmented Control -> Active Capture Card -> Draft Accordion -> Source Chips -> Sticky Bottom Bar -> Diary Timeline.
- **Tablet (768px - 1023px):** 2 columns. Padding: `24px`. Gap: `24px`. Col 1: Capture Rail + Draft/Review. Col 2: Source Truth. Today Ribbon spans top; Diary spans bottom.
- **Desktop (1024px - 2559px):** 3 columns. Padding: `24px`. Gap: `24px`. Grid: `280px 1fr 320px`. Today Ribbon spans top; Diary spans bottom.
- **4K/Ultrawide (2560px+):** 3 columns. Max-width: `1920px` centered. Padding: `32px`. Gap: `32px`. Grid: `320px 1fr 360px`.

### States
- **Default:** `background: var(--ss-bg-app, #0A0A0F);`
- **Loading:** Skeleton shimmer overlay using `var(--ss-surface-2, #1A1A24)` to `var(--ss-surface-1, #141419)`.

### Motion
- **Layout transitions:** `transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);`
- **Reduced Motion:** `@media (prefers-reduced-motion: reduce) { transition: none; }`

---

## 2. Today Command Ribbon
Top-level summary and next-action router.

### Layout
- **Desktop:** Flexbox row, `align-items: center`, `justify-content: space-between`. Height: `88px`. Padding: `16px 24px`. Background: `var(--ss-surface-3, #002060)`. Border-radius: `12px`. Border: `1px solid var(--ss-border)`.
- **Mobile:** Flexbox row wrap. Height: `auto`. Min-height `72px`. Elements stack vertically if width < `414px`.

### Components & Dimensions
- **Date/Next Action:** Flex column. Text: `var(--ss-text-primary, #E0ECF4)`. Font-size: `14px` (date), `18px` (next action).
- **Macro Ring (Victory Chart):** `VictoryPie` donut. Size: `64x64px` (mobile), `80x80px` (desktop). Color scale: `[var(--ss-accent-blue, #50A0F0), var(--ss-accent-purple, #8B5CF6), var(--ss-accent-gold, #C6A84B)]`.
- **Hydration/Streak/Review:** Pill chips. Height: `36px` (desktop), `44px` (mobile touch target). Padding: `0 12px`.

### States
- **Default:** `background: var(--ss-surface-3, #002060);`
- **Hover (Review Chip only):** `background: var(--ss-surface-4, #003080); box-shadow: 0 0 12px var(--ss-glow-blue, rgba(139, 92, 246, 0.45));`
- **Focus-visible:** `outline: 2px solid var(--ss-accent-blue, #50A0F0); outline-offset: 2px;`

---

## 3. Capture Rail
The left-hand navigation for capture modes (Quick Add, Search, Barcode, Label Photo, Voice, Recipe, Local Produce).

### Layout
- **Desktop:** Vertical flex column. Width: `100%` of grid col 1. Gap: `8px`.
- **Mobile:** Transforms into a horizontal `SegmentedControl` slider. Height: `44px`. Overflow-x: auto.

### Button Specs
- **Dimensions:** Min-height: `44px`. Width: `100%` (desktop). Padding: `12px 16px`.
- **Typography:** `var(--ss-text-primary, #E0ECF4)`, `14px`, `font-weight: 600`.
- **Border-radius:** `8px`.

### States (Dual-Button Glow Rule)
- **Default:** `background: var(--ss-surface-1, #141419); border: 1px solid var(--ss-border);`
- **Hover:** `background: var(--ss-surface-2, #1A1A24); border-color: var(--ss-accent-blue, #50A0F0);`
- **Active/Selected:** `background: var(--ss-accent-blue, #50A0F0); color: var(--ss-bg-app, #0A0A0F); box-shadow: 0 0 16px var(--ss-glow-blue, rgba(139, 92, 246, 0.45));` *(Blue background -> Purple glow)*
- **Focus-visible:** `outline: 2px solid var(--ss-accent-purple, #8B5CF6); outline-offset: 2px;`
- **Disabled:** `opacity: 0.4; cursor: not-allowed;`

### Motion
- **Transition:** `transition: background-color 150ms ease-out, box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);`
- **Reduced Motion:** Instant color change, no box-shadow transition.

---

## 4. Draft / Review Panel
The central workspace for building the `NutritionEntryDraft`.

### Layout
- **Container:** `background: var(--ss-surface-1, #141419); border: 1px solid var(--ss-border); border-radius: 12px; padding: 24px;`
- **Grid:** Internal CSS grid, `gap: 16px`.

### Elements
- **Editable Food Lines:** Input fields. Height: `44px`. Padding: `0 12px`. Background: `var(--ss-surface-2, #1A1A24)`. Border: `1px solid var(--ss-border)`. Focus: `border-color: var(--ss-accent-blue, #50A0F0);`
- **Serving Basis Selector:** Custom dropdown. Trigger min-height `44px`.
- **Nutrient Comparison:** Two-column layout (Reported vs Calculated). Text: `var(--ss-text-secondary, #60C0F0)`. Discrepancy text: `var(--ss-error, #FF4D4D)`.
- **Save/Review Controls:** Buttons aligned right. Min-height `44px`.
  - **Save (Primary):** `background: var(--ss-accent-purple, #8B5CF6); color: var(--ss-text-primary, #E0ECF4); box-shadow: 0 0 16px var(--ss-glow-purple, rgba(80, 160, 240, 0.45));` *(Purple background -> Cyan glow)*
  - **Needs Review (Secondary):** `background: transparent; border: 1px solid var(--ss-accent-gold, #C6A84B); color: var(--ss-accent-gold, #C6A84B);`

### States
- **Empty:** Centered illustration area. Text: "Select a capture mode to begin." Color: `var(--ss-text-secondary, #60C0F0)`.
- **Error:** Input border `1px solid var(--ss-error, #FF4D4D)`. Helper text below in `var(--ss-error, #FF4D4D)`.

### Accessibility
- All inputs must have associated `<label>` elements. ARIA: `role="group"` for the panel.

---

## 5. Source Truth Panel
Right-hand panel displaying provenance, confidence, and conflicts.

### Layout
- **Container:** `background: var(--ss-surface-2, #1A1A24); border: 1px solid var(--ss-border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 16px;`

### Elements
- **Source System:** Icon + Text. `var(--ss-accent-gold, #C6A84B)` for "Swan Verified", `var(--ss-text-secondary, #60C0F0)` for external.
- **Confidence Score:** `VictoryBar` horizontal progress bar. Height: `8px`. Color: `var(--ss-accent-blue, #50A0F0)`. If < 0.5, color `var(--ss-error, #FF4D4D)`.
- **Chips (Conflicts/Tags):** Flexbox row, `flex-wrap: wrap`, `gap: 8px`. Chip height: `32px`. Padding: `0 12px`. Border-radius: `16px`. Background: `var(--ss-surface-3, #002060)`.
- **Trainer Notes:** Textarea. Min-height `80px`. Background: `var(--ss-surface-1, #141419)`.

### States
- **Default:** As above.
- **Loading:** Skeleton blocks for text, spinner for confidence bar.

---

## 6. Diary Timeline
Bottom-spanning list of logged meals.

### Layout
- **Container:** `background: var(--ss-surface-1, #141419); border-radius: 12px; padding: 16px;`
- **List:** Flex column, `gap: 12px`.
- **Item:** Flex row, `align-items: center`, `justify-content: space-between`. Min-height: `64px`. Padding: `12px 

---

## Design Reviewer & Implementation Challenger — Round 2

I agree with the overarching "Enchanted Apex: Crystalline Swan" dark-first theme, the Global Token Contract definitions, the Dual-Button Glow aesthetic concept, and the general desktop grid architecture. The tokenized approach ensures excellent maintainability.

However, as the Design Reviewer & Implementation Challenger, I must dispute several specific points regarding accessibility (WCAG compliance), mobile/tablet ergonomics, and frontend performance. 

Here are my challenges and proposed alternatives:

### 1. DISPUTE: WCAG Contrast Failure on Primary Save Button
**Location:** Section 4. Draft / Review Panel -> Save/Review Controls -> Save (Primary)
**Issue:** You specified `background: var(--ss-accent-purple, #8B5CF6); color: var(--ss-text-primary, #E0ECF4);`. The contrast ratio between Frost White (`#E0ECF4`) and Wing Purple (`#8B5CF6`) is approximately **3.0:1**. This FAILS WCAG AA requirements for standard text (which requires 4.5:1). 
**Proposed Alternative:** To maintain accessibility without compromising the token system, the text color on the primary button must be inverted to the dark app background, exactly as you correctly did for the Active Capture Rail button.
**Code Change:**
```css
/* DraftReviewPanel.module.css */
.btnPrimary {
  background: var(--ss-accent-purple, #8B5CF6);
  /* CHANGE FROM: color: var(--ss-text-primary, #E0ECF4); */
  color: var(--ss-bg-app, #0A0A0F); /* Contrast ratio ~10:1 (Passes AAA) */
  box-shadow: 0 0 16px var(--ss-glow-purple, rgba(80, 160, 240, 0.45));
}
```

### 2. DISPUTE: Mobile UX for Capture Rail (Cognitive Overload & Touch Targets)
**Location:** Section 3. Capture Rail -> Layout -> Mobile
**Issue:** You specified a horizontal `SegmentedControl` slider with `overflow-x: auto` for 7 different capture modes (Quick Add, Search, Barcode, Label Photo, Voice, Recipe, Local Produce). A segmented control with 7 items will either compress the text to an unreadable size or require excessive horizontal swiping, breaking standard mobile UX for primary navigation.
**Proposed Alternative:** On mobile, the Capture Rail should abandon the text-heavy Segmented Control and instead use a horizontally scrolling **Icon-Only Chip Row** or a **Floating Action Button (FAB) Speed Dial**. Given the workspace context, an Icon-Only Chip Row is best.
**Code Change:**
```css
/* CaptureRail.module.css */
@media (max-width: 767px) {
  .captureRail {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    /* CHANGE: Remove SegmentedControl styling, use gap for distinct touch targets */
    gap: 12px; 
    padding: 0 16px;
  }
  .captureButton {
    /* CHANGE: Icon only on mobile, minimum touch target 44x44 */
    min-width: 44px;
    min-height: 44px;
    border-radius: 22px; /* Circular for mobile chips */
    padding: 10px;
  }
  .captureButtonText {
    display: none; /* Hide text on mobile, rely on clear iconography + aria-labels */
  }
}
```

### 3. DISPUTE: Performance Overhead in Source Truth Panel
**Location:** Section 5. Source Truth Panel -> Elements -> Confidence Score
**Issue:** You specified using a `VictoryBar` horizontal progress bar for the Confidence Score. Importing and rendering a heavy SVG charting library component (`victory`) for a simple 0-100% linear progress bar is massive overkill and will negatively impact React render cycles and bundle size.
**Proposed Alternative:** Use a native HTML5 `<progress>` element styled with CSS, or a simple semantic `div` structure.
**Code Change:**
```tsx
// SourceTruthPanel.tsx
// CHANGE FROM: <VictoryBar data={[{ x: 1, y: confidence }]} ... />
// CHANGE TO:
<div 
  role="progressbar" 
  aria-valuenow={confidenceScore} 
  aria-valuemin={0} 
  aria-valuemax={100}
  className={styles.confidenceTrack}
>
  <div 
    className={styles.confidenceFill} 
    style={{ 
      width: `${confidenceScore}%`,
      backgroundColor: confidenceScore < 50 ? 'var(--ss-error)' : 'var(--ss-accent-blue)' 
    }} 
  />
</div>
```

### 4. DISPUTE: Tablet Layout Ergonomics
**Location:** Section 1. NutritionWorkspace -> Layout & Breakpoints -> Tablet
**Issue:** You specified: "Col 1: Capture Rail + Draft/Review". If the Capture Rail remains a vertical flex column on tablet (as implied by it only transforming on mobile), stacking it *above* the Draft/Review panel in a single column will push the primary workspace (Draft/Review) below the fold.
**Proposed Alternative:** On Tablet (768px - 1023px), the Capture Rail must adopt the mobile horizontal layout (placed above the Draft panel) OR the tablet layout should use a collapsed icon-only vertical rail on the left (creating a pseudo 3-column layout: `64px 1fr 320px`). I propose the collapsed vertical rail to maintain desktop muscle memory.
**Specification Update:**
*   **Tablet (768px - 1023px):** Grid: `72px 1fr 280px`. Col 1: Capture Rail (Vertical, Icon-only). Col 2: Draft/Review. Col 3: Source Truth.

### 5. MISSING SPEC: Diary Timeline Completion
**Location:** Section 6. Diary Timeline
**Issue:** Your specification was truncated at "Padding: `12px ".
**Proposed Completion:**
*   **Item Layout:** `padding: 12px 16px; background: var(--ss-surface-2, #1A1A24); border-radius: 8px; border: 1px solid transparent; transition: border-color 200ms ease;`
*   **Hover State:** `border-color: var(--ss-accent-blue, #50A0F0);`
*   **Typography:** Time/Title in `var(--ss-text-primary)`, Macro summary in `var(--ss-text-secondary)`.

Please review these challenges. If you agree, we can merge these adjustments into the canonical specification and move on to the interaction state machine.

---

## Creative Director (Lead Design Authority) — Round 3

CONSENSUS REACHED

All five challenges from Gemini 3.1 Pro are technically valid and accepted into the canonical specification. Below is the merged finding set with my refinements as Creative Director to lock in implementation details.

---

## Merged Findings — Canonical Specification Updates

### 1. ✅ Primary Save Button — WCAG AAA Text Inversion (Accepted)
**File:** `DraftReviewPanel.module.css`
```css
.btnPrimary {
  background: var(--ss-accent-purple, #8B5CF6);
  color: var(--ss-bg-app, #0A0A0F); /* Confirmed ~10:1, passes AAA */
  font-weight: 700; /* Bold ensures legibility on the saturated purple */
  box-shadow: 0 0 16px var(--ss-glow-purple, rgba(80, 160, 240, 0.45));
}
```
**CD Refinement:** Apply the same inversion rule globally to *any* button using `--ss-accent-purple` as a background with regular-weight text. This becomes a new entry in the Global Token Contract: **"Saturated Accent Background Rule"** — text on `--ss-accent-purple` or `--ss-accent-blue` backgrounds must use `--ss-bg-app`, never `--ss-text-primary`.

---

### 2. ✅ Mobile Capture Rail — Icon-Only Chip Row (Accepted with Refinement)
**File:** `CaptureRail.module.css`
```css
@media (max-width: 767px) {
  .captureRail {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: 12px;
    padding: 0 16px;
  }
  .captureButton {
    min-width: 44px;
    min-height: 44px;
    border-radius: 22px;
    padding: 10px;
    scroll-snap-align: start;
  }
  .captureButtonText { display: none; }
}
```
**CD Refinement (Mandatory):** Each icon-only chip MUST include:
- `aria-label="{mode name}"` (e.g., `aria-label="Barcode Scan"`)
- A persistent `title` attribute for native tooltip fallback
- An active-state visual indicator beyond glow (e.g., 2px bottom border in `--ss-accent-gold`) because icon-only states are harder to distinguish at a glance

---

### 3. ✅ Confidence Score — Native Progress Element (Accepted with Refinement)
**File:** `SourceTruthPanel.tsx`
```tsx
<div
  role="progressbar"
  aria-valuenow={confidenceScore}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Source confidence score"
  className={styles.confidenceTrack}
>
  <div
    className={styles.confidenceFill}
    style={{
      width: `${confidenceScore}%`,
      backgroundColor: confidenceScore < 50 ? 'var(--ss-error)' : 'var(--ss-accent-blue)'
    }}
  />
</div>
```
**CD Refinement:** Add transition for smooth updates when confidence recalculates:
```css
.confidenceFill {
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .confidenceFill { transition: none; }
}
```

---

### 4. ✅ Tablet Layout — Collapsed Icon-Only Vertical Rail (Accepted)
**File:** `NutritionWorkspace.module.css`
```css
@media (min-width: 768px) and (max-width: 1023px) {
  .workspace {
    display: grid;
    grid-template-columns: 72px 1fr 280px;
    gap: 24px;
    padding: 24px;
  }
}
```
**CD Refinement (Mandatory):** The 72px collapsed rail must support hover-expand to reveal labels without losing the icon's position:
```css
.captureRailTablet {
  width: 72px;
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.captureRailTablet:hover {
  width: 200px;
  z-index: 10;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.4);
}
.captureRailTablet .captureButtonText {
  opacity: 0;
  transition: opacity 150ms ease 100ms;
}
.captureRailTablet:hover .captureButtonText {
  opacity: 1;
}
```
This preserves desktop muscle memory while respecting tablet viewport constraints. The hover-expand is desktop-trackpad/mouse only; touch devices will rely on the icon + active-state indicator from Refinement #2.

---

### 5. ✅ Diary Timeline Completion (Accepted)
**File:** `DiaryTimeline.module.css`
```css
.timelineItem {
  padding: 12px 16px;
  background: var(--ss-surface-2, #1A1A24);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: border-color 200ms ease;
  min-height: 64px;
}
.timelineItem:hover {
  border-color: var(--ss-accent-blue, #50A0F0);
}
.timelineItemTitle {
  color: var(--ss-text-primary, #E0ECF4);
  font-size: 14px;
  font-weight: 600;
}
.timelineItemMacros {
  color: var(--ss-text-secondary, #60C0F0);
  font-size: 12px;
}
```

**CD Addition:** Each timeline item must include a left-edge accent bar (4px wide, full height) colored by meal type for at-a-glance scanning:
- Breakfast: `--ss-accent-gold`
- Lunch: `--ss-accent-blue`
- Dinner: `--ss-accent-purple`
- Snack: `--ss-text-secondary`

---

## New Global Rule Added to Token Contract
**Saturated Accent Background Rule:** Any element using `--ss-accent-purple` or `--ss-accent-blue` as a `background` MUST use `--ss-bg-app` (`#0A0A0F`) as text color. `--ss-text-primary` is reserved for dark backgrounds only. This prevents future WCAG regressions across the design system.

---

Consensus is complete on all disputed points. Ready to proceed to the interaction state machine specification in the next round.

---

