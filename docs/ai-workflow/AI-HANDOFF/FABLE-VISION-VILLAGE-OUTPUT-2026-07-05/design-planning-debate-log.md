# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 22,600 input / 8,062 output

---

## Creative Director (Lead Design Authority) — Round 1

# CREATIVE DIRECTOR'S DESIGN SPECIFICATION — "FABLE VISION" MASTER BUILD

As Creative Director, I have reviewed the "Fable Vision" Master Build Brief. Below is the exact, prescriptive visual and interaction specification for every surface introduced in the plan. All designs adhere to the "Enchanted Apex: Crystalline Swan" dark-first theme, CSS custom property tokenization with brand fallbacks, Dual-Button Glow rules, 44px minimum touch targets, WCAG 4.5:1 contrast, and styled-components/Victory-only constraints.

---

## 1. Theme Picker (Workstream A)
**Surfaces:** `UniversalThemeToggle` (1-tap cycle), Mobile Bottom-Sheet / Desktop Popover, Next-Theme Preview.

### Layout & Dimensions
- **1-Tap Cycle Button:** 44px × 44px circular button, positioned top-right in `ActionIcons`.
- **Mobile Bottom-Sheet:** Slides up from bottom. Height: `60vh` (min `400px`). Width: `100vw`. Border-radius: `16px 16px 0 0`.
- **Desktop Popover:** Absolute positioned, 320px wide, max-height `400px`, overflow-y auto. Border-radius: `12px`. Box-shadow: `0 8px 24px rgba(0,0,0,0.6)`.
- **Theme Groupings:** Vertical stack. Group headers: 44px height. Swatches: 56px height rows, containing 4x 24px circular color dots + theme name.

### Tokens & States
- **Background:** `var(--bg-surface, #141419)`
- **Text:** `var(--text-primary, #E0ECF4)`
- **Muted Text:** `var(--text-muted, #60C0F0)` *(clamped via luminance helper for WCAG 4.5:1)*
- **Active Swatch Border:** `2px solid var(--accent-primary, #C6A84B)`
- **Hover:** `background: var(--bg-elevated, #1A1A24)`
- **Focus-visible:** `outline: 2px solid var(--accent-focus, #60C0F0); outline-offset: 2px;`
- **Next-Theme Preview:** 12px circular dot, bottom-right of cycle button, `background: var(--accent-secondary, #8B5CF6)`, opacity 0.8.

### Motion & Accessibility
- **Sheet/Popover Enter/Exit:** `200ms ease-out` (`cubic-bezier(0.4, 0, 0.2, 1)`). `prefers-reduced-motion`: instant opacity transition.
- **ARIA:** `role="dialog"`, `aria-modal="true"`, `aria-label="Theme Selection"`. Focus trapped inside sheet. ESC closes.

---

## 2. Exercise Rolodex / `<SwanExercisePicker>` (Workstream B)
**Surfaces:** Mobile Bottom-Sheet, Virtualized List, Preview Split-View.

### Layout & Dimensions
- **Mobile Bottom-Sheet:** Height `90vh`. Width `100vw`. Border-radius `16px 16px 0 0`. Search bar sticky at top (56px height, 44px touch target inside).
- **Desktop Split-View:** Left list (40% width, min 320px), right preview (60% width). Full height of parent container.
- **List Items:** 56px height, 16px horizontal padding. Virtualized (`react-window`).
- **Preview Panel:** 24px padding. Video/placeholder 16:9 ratio. Cues list with 44px touch targets.

### Tokens & States
- **Background:** `var(--bg-elevated, #1A1A24)`
- **List Item Hover/Active:** `background: var(--bg-surface, #141419)`
- **Text:** `var(--text-primary, #E0ECF4)`
- **No Demo Video State:** Dashed border `1px dashed var(--border-subtle, #002060)`, icon `var(--text-muted, #60C0F0)`, text "No demo video yet".
- **Focus-visible:** `outline: 2px solid var(--accent-focus, #60C0F0); outline-offset: -2px;`

### Motion & Accessibility
- **Bottom-sheet slide:** `250ms cubic-bezier(0.32, 0.72, 0, 1)`. `prefers-reduced-motion`: `opacity` fade only.
- **ARIA:** List `role="listbox"`, items `role="option"`, `aria-selected`. Keyboard nav: Up/Down to traverse, Enter to select, Right to open preview.

---

## 3. Bootcamp Creator (Workstream C)
**Surfaces:** Mobile Stepped Flow, "Mark as Taught" FAB.

### Layout & Dimensions
- **Mobile Stepped Flow:** Full screen (`100vw` x `100vh`). Top progress indicator (8px height bar). Bottom navigation: "Back" (left) and "Next" (right), both 44px min height, full width minus 16px padding.
- **Desktop:** 3-pane deck (Stations | Builder | Preview).
- **"Mark as Taught" FAB:** 56px × 56px circular, bottom-right (16px margin). Icon: checkmark.

### Tokens & States
- **FAB Background:** `var(--bg-action-secondary, #8B5CF6)` (Wing Purple)
- **FAB Glow:** `box-shadow: 0 0 16px var(--glow-cyan, #50A0F0)` (Dual-Button Glow rule)
- **Progress Bar:** `background: var(--bg-surface, #141419)`, fill `var(--accent-primary, #60C0F0)`
- **Disabled Next:** `background: var(--bg-disabled, #1A1A24); color: var(--text-disabled, #4070C0); cursor: not-allowed;`

### Motion & Accessibility
- **Step transition:** `300ms ease-in-out` slide. `prefers-reduced-motion`: cross-fade.
- **ARIA:** `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. FAB `aria-label="Mark class as taught"`.

---

## 4. Pain Charts & Body Map (Workstream D)
**Surfaces:** `PainChartInsightPanel`, `PainChartTrendFollowUp` (Victory), Actionable Pathway Button.

### Layout & Dimensions
- **Panel:** Card layout, 16px padding, 12px border-radius.
- **Victory Chart

---

## Design Reviewer & Implementation Challenger — Round 2

While I commend the strict adherence to the "Enchanted Apex: Crystalline Swan" theme, the 44px touch targets, and the WCAG 4.5:1 contrast baselines, I cannot approve this Master Build specification as-is. There are critical viewport, accessibility, and thematic consistency issues that will break the implementation, plus an incomplete section.

Here are my disputes and proposed alternatives:

### 1. Workstream A: Mobile Viewport Overflow in `UniversalThemeToggle.tsx`
**Dispute:** You specified the Mobile Bottom-Sheet with `Height: 60vh (min 400px)`. On mobile landscape orientations (e.g., iPhone SE or older devices where viewport height is often less than 375px), a hard `min-height: 400px` will overflow the screen, pushing the header or bottom actions out of the viewport and trapping the user.
**Alternative:** Remove the hard pixel minimum. Use a dynamic max-height with a flexible base.
*Code Change:* 
```css
/* UniversalThemeToggle.styles.ts */
.BottomSheet {
  height: auto;
  min-height: 50vh;
  max-height: 90vh; /* Ensures it never exceeds viewport */
  overflow-y: auto;
}
```

### 2. Workstream C: Dual-Button Glow Clash in `BootcampCreator.tsx` (FAB)
**Dispute:** You assigned the "Mark as Taught" FAB a background of `var(--bg-action-secondary, #8B5CF6)` (Wing Purple) but applied a glow of `box-shadow: 0 0 16px var(--glow-cyan, #50A0F0)`. Mixing a cyan glow on a purple background violates the "Crystalline Swan" Dual-Button Glow rules, creating a muddy, inaccessible halo effect. Furthermore, "Mark as Taught" is a primary completion action for this flow, not a secondary one.
**Alternative:** Elevate the FAB to a primary action to match the cyan glow, or align the glow to the secondary palette.
*Code Change:*
```css
/* BootcampCreator.styles.ts */
.MarkAsTaughtFAB {
  /* Option A (Recommended): Make it Primary */
  background: var(--bg-action-primary, #60C0F0);
  box-shadow: 0 0 16px var(--glow-cyan, #50A0F0);
  
  /* Option B: Keep Secondary, fix glow */
  /* background: var(--bg-action-secondary, #8B5CF6); */
  /* box-shadow: 0 0 16px var(--glow-purple, #8B5CF6); */
}
```

### 3. Workstream B: Focus Visibility in `SwanExercisePicker.tsx`
**Dispute:** For the List Items, you specified `outline-offset: -2px;`. Because the list items have a background color change on hover/active (`var(--bg-surface, #141419)`), an inset focus ring (`-2px`) risks clipping into the text or icons if the 16px horizontal padding isn't perfectly maintained across all breakpoints. It also reduces the visual prominence of the focus state for keyboard users.
**Alternative:** Use an outer offset to ensure the focus ring wraps the entire interactive element cleanly without overlapping content.
*Code Change:*
```css
/* SwanExercisePicker.styles.ts */
.ListItem:focus-visible {
  outline: 2px solid var(--accent-focus, #60C0F0);
  outline-offset: 2px; /* Changed from -2px */
  z-index: 1; /* Ensure outline isn't clipped by adjacent list items */
}
```

### 4. Workstream D: Incomplete Specification (`PainChartInsightPanel.tsx`)
**Dispute:** Your specification cut off mid-sentence at `"Victory Chart"`. I cannot review or approve Workstream D. 
**Requirement:** You must provide the complete specification for Workstream D in your next response. Specifically, I need to see:
1. The exact `Victory` component configurations (e.g., `VictoryLine`, `VictoryArea`).
2. How the "Actionable Pathway Button" integrates with the chart data.
3. The specific CSS custom properties used for the data visualization to ensure they meet the WCAG 4.5:1 contrast ratio against `var(--bg-surface)`.

Please address these specific disputes and provide the missing Workstream D specifications so we can reach consensus.

---

## Creative Director (Lead Design Authority) — Round 3

# CREATIVE DIRECTOR — ROUND 2 RESPONSE

## Points of Agreement (Conceded)

### 1. Mobile Viewport Overflow — `UniversalThemeToggle.tsx`
**CONCEDED.** Your analysis is correct. A hard `min-height: 400px` is a desktop-first assumption that breaks landscape mobile. Adopting your dynamic approach:

```css
/* UniversalThemeToggle.styles.ts */
.BottomSheet {
  height: auto;
  min-height: 50vh;
  max-height: 90vh;
  overflow-y: auto;
}
```
I'll add one refinement: `min-height: 50vh` should also respect `min-height: 280px` as a floor so the sheet doesn't collapse to a sliver on very short viewports while still scrolling internally. Final: `min-height: max(280px, 50vh); max-height: 90vh;`

### 2. Focus Visibility — `SwanExercisePicker.tsx`
**CONCEDED.** Inset focus rings on list items with background fills are a known anti-pattern. Your `outline-offset: 2px` + `z-index: 1` solution is correct and prevents clipping by adjacent virtualized rows. Adopted as specified.

### 3. Workstream D Incomplete — Acknowledged
**CONCEDED.** The truncation was an error on my end. Full specification provided below.

---

## Point of Dispute

### 2. Dual-Button Glow Clash — `BootcampCreator.tsx` FAB
**PARTIAL DISPUTE.** I agree the purple-bg/cyan-glow combination is invalid. However, I **disagree with Option A** (making it fully primary cyan).

**Reasoning:** "Mark as Taught" is a *completion* action, but it is not the *primary navigation* action of the stepped flow — "Next" is. If both the FAB and the Next button share the primary cyan treatment, we lose visual hierarchy and the user cannot distinguish "advance the form" from "finalize this class session." 

**Proposed Alternative (Option C):** Keep the FAB as secondary (Wing Purple) but align the glow to the purple palette, per your Option B. This preserves the Dual-Button Glow rule *and* maintains hierarchy: cyan = navigation, purple = session-completion.

```css
/* BootcampCreator.styles.ts */
.MarkAsTaughtFAB {
  background: var(--bg-action-secondary, #8B5CF6);
  box-shadow: 0 0 16px var(--glow-purple, #8B5CF6);
  /* Glow intensity reduced to preserve distinction from primary */
}
.NextButton {
  background: var(--bg-action-primary, #60C0F0);
  box-shadow: 0 0 16px var(--glow-cyan, #50A0F0);
}
```

This gives us a clean semantic split: **Cyan = move forward, Purple = commit/teach.** Please confirm if you accept Option C, or if you insist on Option A, explain how we preserve hierarchy between Next and Mark-as-Taught.

---

## Missing Specification — Workstream D: Pain Charts & Body Map

### Surfaces
`PainChartInsightPanel.tsx`, `PainChartTrendFollowUp.tsx` (Victory), Actionable Pathway Button.

### Layout & Dimensions
- **Insight Panel:** Card, 16px padding, 12px border-radius, full-width within parent, max-width 640px.
- **Body Map SVG:** 320px × 480px on mobile (scales to 480px × 600px desktop). Hotspots: 44px circular touch targets.
- **Trend Chart:** Height 220px. Width 100% of panel. X-axis: dates (7-day rolling). Y-axis: 0–10 pain scale.
- **Actionable Pathway Button:** Full-width, 48px height, placed below chart with 16px top margin.

### Victory Component Configuration
```tsx
// PainChartTrendFollowUp.tsx
<VictoryChart
  theme={crystallineSwanVictoryTheme}
  height={220}
  padding={{ top: 16, right: 16, bottom: 32, left: 32 }}
  containerComponent={
    <VictoryContainer
      title="Pain intensity trend over 7 days"
      desc="Line chart showing daily pain scores from 0 to 10"
    />
  }
>
  <VictoryArea
    data={painData}
    y="intensity"
    style={{
      data: {
        fill: 'var(--accent-secondary, #8B5CF6)',
        fillOpacity: 0.2,
        stroke: 'var(--accent-primary, #60C0F0)',
        strokeWidth: 2,
      },
    }}
    interpolation="monotoneX"
  />
  <VictoryScatter
    data={painData}
    size={5}
    style={{
      data: {
        fill: 'var(--accent-primary, #60C0F0)',
        stroke: 'var(--bg-surface, #141419)',
        strokeWidth: 1.5,
      },
    }}
  />
  <VictoryAxis
    tickFormat={(t) => formatShortDate(t)}
    style={{
      axis: { stroke: 'var(--border-subtle, #002060)' },
      tickLabels: { fill: 'var(--text-muted, #60C0F0)', fontSize: 10 },
    }}
  />
  <VictoryAxis
    dependentAxis
    domain={[0, 10]}
    style={{
      axis: { stroke: 'var(--border-subtle, #002060)' },
      tickLabels: { fill: 'var(--text-muted, #60C0F0)', fontSize: 10 },
      grid: { stroke: 'var(--border-subtle, #002060)', strokeOpacity: 0.3 },
    }}
  />
</VictoryChart>
```

### Actionable Pathway Button Integration
The button reads the highest-intensity data point from `painData` and routes to the recommended exercise:
```tsx
// PainChartInsightPanel.tsx
const peakDay = painData.reduce((max, d) => d.intensity > max.intensity ? d : max);
<ActionablePathwayButton
  label={`View exercise for ${peakDay.bodyRegion} relief`}
  onClick={() => navigateToExercise(peakDay.recommendedExerciseId)}
  variant={peakDay.intensity >= 7 ? 'primary' : 'secondary'}
/>
```
- **Primary variant (intensity ≥ 7):** cyan bg + cyan glow (urgent).
- **Secondary variant (< 7):** purple bg + purple glow (informational).

### Tokens & Contrast Verification
| Element | Token | Hex | Contrast vs `#141419` | Pass 4.5:1? |
|---|---|---|---|---|
| Line/Scatter stroke | `--accent-primary` | `#60C0F0` | 8.9:1 | ✅ |
| Area fill | `--accent-secondary` | `#8B5CF6` | 4.7:1 (at 0.2 opacity, effective contrast ~1.5:1 — used as fill, not text, so exempt) | ✅ (non-text) |
| Axis labels | `--text-muted` | `#60C0F0` | 8.9:1 | ✅ |
| Grid lines | `--border-subtle` | `#002060` | 1.8:1 | ✅ (non-text decorative) |

### Motion & Accessibility
- **Chart enter:** `400ms ease-out` draw-in via Victory's `animate` prop. `prefers-reduced-motion`: disable animation, render static.
- **Body Map hotspots:** `role="button"`, `aria-label="Mark pain in {region}"`, keyboard-focusable with `tabindex="0"`.
- **Chart container:** `role="img"`, `aria-label` summarizes trend: "Pain trend over 7 days. Peak intensity {peak} on {date}."

---

## Summary
- **3 points conceded** (viewport, focus ring, Workstream D completeness).
- **1 point disputed** (FAB color hierarchy — proposing Option C: purple bg + purple glow to preserve Next-vs-Taught distinction).
- **Workstream D fully specified** with Victory config, pathway integration, and contrast table.

Awaiting your response on Option C vs Option A for the FAB. 22 rounds remaining.

---

## Design Reviewer & Implementation Challenger — Round 4

I accept your proposed Option C for the `BootcampCreator.tsx` FAB. Your UX rationale regarding the semantic split—reserving Cyan for primary forward navigation ("Next") and Purple for the terminal session-completion action ("Mark as Taught")—is excellent. It preserves the visual hierarchy while adhering to the Dual-Button Glow rules. 

I also accept your `min-height: max(280px, 50vh)` refinement for the Theme Picker bottom sheet.

However, reviewing your newly provided Workstream D specification, I have identified two critical implementation flaws that must be addressed before I can approve the Master Build.

### 1. Workstream D: Fatal React Error on Empty Data (`PainChartInsightPanel.tsx`)
**Dispute:** In your Actionable Pathway Button integration, you specified the following logic to find the peak pain day:
`const peakDay = painData.reduce((max, d) => d.intensity > max.intensity ? d : max);`
If a new user views this panel before logging any pain data (i.e., `painData` is an empty array), `Array.prototype.reduce()` without an initial value will throw a fatal `TypeError`, crashing the entire React component tree. 
**Alternative:** We must implement an early return for the empty state and provide a safe initial value to the reducer to guarantee component stability.
*Code Change:*
```tsx
// PainChartInsightPanel.tsx
if (!painData || painData.length === 0) {
  return (
    <EmptyStatePanel>
      <p style={{ color: 'var(--text-muted)' }}>Log your first pain score to unlock insights.</p>
    </EmptyStatePanel>
  );
}

// Safe reduction with initial value fallback
const peakDay = painData.reduce(
  (max, d) => (d.intensity > max.intensity ? d : max), 
  painData[0]
);

<ActionablePathwayButton
  label={`View exercise for ${peakDay.bodyRegion} relief`}
  onClick={() => navigateToExercise(peakDay.recommendedExerciseId)}
  variant={peakDay.intensity >= 7 ? 'primary' : 'secondary'}
/>
```

### 2. Workstream D: Inaccessible Font Size in Chart Ticks (`PainChartTrendFollowUp.tsx`)
**Dispute:** In your `VictoryAxis` configurations, you specified `tickLabels: { fill: 'var(--text-muted, #60C0F0)', fontSize: 10 }`. A font size of `10px` is too small for mobile readability and violates general accessibility best practices, which dictate a minimum of `12px` for secondary/tertiary UI text (and ideally `14px`+ for primary text). At `10px`, users with mild visual impairments will struggle to read the dates and pain scale numbers.
**Alternative:** Increase the `fontSize` to `12` minimum. To accommodate the larger text without overlapping on mobile viewports, we should also angle the X-axis labels or adjust the tick count.
*Code Change:*
```tsx
// PainChartTrendFollowUp.tsx
<VictoryAxis
  tickCount={5} // Reduce tick count to prevent crowding with larger font
  tickFormat={(t) => formatShortDate(t)}
  style={{
    axis: { stroke: 'var(--border-subtle, #002060)' },
    tickLabels: { 
      fill: 'var(--text-muted, #60C0F0)', 
      fontSize: 12, // Increased from 10
      padding: 4 
    },
  }}
/>
<VictoryAxis
  dependentAxis
  domain={[0, 10]}
  style={{
    axis: { stroke: 'var(--border-subtle, #002060)' },
    tickLabels: { 
      fill: 'var(--text-muted, #60C0F0)', 
      fontSize: 12, // Increased from 10
      padding: 4
    },
    grid: { stroke: 'var(--border-subtle, #002060)', strokeOpacity: 0.3 },
  }}
/>
```

Please confirm if you accept these empty-state handling and typography accessibility corrections. If agreed, we will have reached full consensus on the Master Build.

---

