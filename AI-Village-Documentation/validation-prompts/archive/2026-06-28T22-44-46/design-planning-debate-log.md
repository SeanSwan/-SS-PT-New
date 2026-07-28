# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 6
> **Tokens:** 53,895 input / 15,714 output

---

## Creative Director (Lead Design Authority) — Round 1

# CREATIVE DIRECTOR'S VISUAL SPECIFICATION — Training Command Unification

**Authority note:** The plan introduces/modifies exactly seven surfaces. I will spec each one with pixel-exact, token-bound, motion-defined, accessibility-complete detail. No invented surfaces. Every color is `var(--token, #fallback)`. Dark-first. Mobile-first. 44px minimum touch targets. WCAG 4.5:1 enforced.

---

## SURFACES UNDER REVIEW (derived strictly from the plan)

1. **Training Command Workspace Shell** (Option D — the unified mode shell)
2. **In-Logger Generated Plan/Day Picker** (Option A — new within WorkoutLogger)
3. **WorkoutLogger — Backfill Prefill Mode** (Option C — prefilled historical draft state)
4. **HistoricalWorkoutImportPanel — "Backfill in Logger" action** (Option C enhancement)
5. **Voice-First Command Overlay** (voice entry, transcription, review-gate)
6. **Review & Approve Modal** (review-gated AI writes)
7. **Contextual Missing-Info Prompt** (partial onboarding gaps, non-blocking)

---

## 1. TRAINING COMMAND WORKSPACE SHELL

The Training tab refactored into a single unified shell. Five command modes: Log Today, Choose Generated, Generate Plan, Backfill History, History/Charts. Existing child components remain internally; the shell fuses the flow.

### Layout

**Mobile (320–375px):**
- Shell container: `100vw`, `min-height: 100dvh`, `padding: 12px 16px 88px 16px` (88px bottom reserves space for the Voice FAB + safe area).
- Mode selector: horizontal scrollable chip rail, `height: 44px`, `gap: 8px`, `padding: 4px 0`, sticky at `top: 0`, `z-index: 20`. Background `var(--surface-shell-rail, #141419)` with `backdrop-filter: blur(12px)`.
- Each mode chip: `min-height: 44px`, `min-width: 44px`, `padding: 10px 16px`, `border-radius: 999px`, `font-size: 13px`, `font-weight: 600`, `white-space: nowrap`.
- Active content area: `padding: 16px 0`, fills remaining height.
- Voice FAB: fixed, `bottom: 20px`, `right: 20px`, `z-index: 30`.

**Tablet (768–1023px):**
- Shell container: `max-width: 720px`, `margin: 0 auto`, `padding: 20px 24px 96px`.
- Mode selector: same chip rail, centered, `max-width: 680px`.

**Desktop (1024–1439px):**
- Shell container: `max-width: 1080px`, `padding: 28px 32px 120px`.
- Mode selector: chip rail becomes a segmented control, `height: 48px`, `border-radius: 12px`, `max-width: 720px`, centered.

**Ultrawide/4K (1440px+):**
- Shell container: `max-width: 1280px`, centered. Mode selector `max-width: 880px`.
- Content area gains a two-column inner grid for History/Charts mode only (`grid-template-columns: 1fr 1fr; gap: 24px`).

### Tokens — Mode Chip

| State | Background | Text | Border | Glow |
|---|---|---|---|---|
| default | `var(--carbon, #141419)` | `var(--frost-white, #E0ECF4)` | `1px solid var(--graphite, #1A1A24)` | none |
| hover | `var(--royal-depth, #003080)` | `var(--frost-white, #E0ECF4)` | `1px solid var(--swan-lavender, #4070C0)` | `0 0 12px rgba(64,112,192,0.3)` |
| active (selected) | `var(--midnight-sapphire, #002060)` | `var(--ice-wing, #60C0F0)` | `1px solid var(--ice-wing, #60C0F0)` | `0 0 16px rgba(96,192,240,0.4)` |
| focus-visible | `var(--carbon, #141419)` | `var(--frost-white, #E0ECF4)` | `2px solid var(--arctic-cyan, #50A0F0)` | none |
| disabled | `var(--carbon, #141419)` | `var(--frost-white, #E0ECF4)` at 40% opacity | `1px solid var(--graphite, #1A1A24)` | none |
| loading | `var(--royal-depth, #003080)` | `var(--frost-white, #E0ECF4)` | `1px solid var(--swan-lavender, #4070C0)` | pulsing glow (see motion) |

### Motion
- Chip selection slide indicator: `transform: translateX()` over `220ms ease-out`.
- Mode content crossfade: `opacity 0→1`, `transform: translateY(8px)→0`, `200ms ease-out`.
- `prefers-reduced-motion`: all transitions set to `0ms`; crossfade becomes instant opacity swap.

### Accessibility
- Chip rail: `role="tablist"`, each chip `role="tab"`, `aria-selected`, `aria-controls` pointing to content panel `role="tabpanel"`.
- Keyboard: `ArrowLeft`/`ArrowRight` traverse chips; `Enter`/`Space` activates; `Tab` moves into panel content.
- Focus ring: `2px solid var(--arctic-cyan, #50A0F0)`, `outline-offset: 2px`.

---

## 2. IN-LOGGER GENERATED PLAN/DAY PICKER

A modal/bottom-sheet launched from within WorkoutLogger. Consumes `/api/workout-plans/client/:userId`. Lets trainer load any generated plan/day into the logger without leaving it.

### Layout

**Mobile (320–375px):**
- Full-screen modal: `position: fixed; inset: 0; z-index: 50`.
- Background: `var(--obsidian-black, #0A0A0F)` at 96% opacity.
- Header bar: `height: 56px`, `padding: 0 16px`, flex row: Back chevron (44×44), title "Choose Plan & Day" (`font-size: 16px; font-weight: 700; color: var(--frost-white, #E0ECF4)`), Close X (44×44).
- Search input: `height: 44px`, `margin: 12px 16px`, `padding: 0 14px`, `border-radius: 10px`, `background: var(--graphite, #1A1A24)`, `border: 1px solid var(--royal-depth, #003080)`, `color: var(--frost-white, #E0ECF4)`, `font-size: 15px`.
- Plan list: vertical stack, `gap: 8px`, `padding: 0 16px 16px`.
- Plan card: `min-height: 44px`, `padding: 14px 16px`, `border-radius: 12px`, `background: var(--carbon, #141419)`, `border: 1px solid var(--graphite, #1A1A24)`. Shows plan name (`font-size: 15px; font-weight: 600; color: var(--frost-white, #E0ECF4)`), creation date (`font-size: 12px; color: var(--swan-lavender, #4070C0)`), workout count badge.
- Tapping a plan card expands inline day list: `padding: 8px 0 4px 16px`, each day row `min-height: 44px`, `padding: 10px 12px`, `border-radius: 8px`, `background: var(--graphite, #1A1A24)`, shows "Day N: [label]" and a load chevron.

**Tablet (768–1023px):**
- Modal: `max-width: 640px`, `height: 80dvh`, centered, `border-radius: 16px`, `top: 10dvh`.
- Two-column inner: left column plan list (`width: 280px`), right column day list for selected plan.

**Desktop (1024px+):**
- Modal: `max-width: 880px`, `height: 72dvh`, centered, `border-radius: 16px`.
- Left plan list `width: 320px`, right day list fills remaining.

### Tokens — Plan Card

| State | Background | Text | Border | Glow |
|---|---|---|---|---|
| default | `var(--carbon, #141419)` | `var(--frost-white, #E0ECF4)` | `1px solid var(--graphite, #1A1A24)` | none |
| hover | `var(--royal-depth, #003080)` | `var(--frost-white, #E0ECF4)` | `1px solid var(--swan-lavender, #4070C0)` | `0 0 10px rgba(64,112,192,0.25)` |
| active (selected plan) | `var(--midnight-sapphire, #002060)` | `var(--ice-wing, #60C0F0)` | `1px solid var(--ice-wing, #60C0F0)` | `0 0 14px rgba(96,192,240,0.35)` |
| focus-visible | `var(--carbon, #141419)` | `var(--frost-white, #E0ECF4)` | `2px solid var(--arctic-cyan, #50A0F0)` | none |
| loading | `var(--royal-depth, #003080)` | `var(--frost-white, #E0ECF4)` | `1px solid var(--swan-lavender, #4070C0)` | pulsing |
| empty | `var(--carbon, #141419)` | `var(--swan-lavender, #4070C0)` | `1px dashed var(--graphite, #1A1A24)` | none |
| error | `var(--carbon, #141419)` | `var(--gilded-fern, #C6A84B)` | `1px solid var(--gilded-fern, #C6A84B)` | none |

### Day Row — "Load" Button

| State | Background | Text | Glow |
|---|---|---|---|
| default | `var(--swan-lavender, #4070C0)` | `var(--frost-white, #E0ECF4)` | none |
| hover | `var(--arctic-cyan, #50A0F0)` | `var(--obsidian-black, #0A0A0F)` | `0 0 14px rgba(96,192,240,0.5)` (purple→cyan glow rule: blue bg → purple glow; here bg is blue so glow is `rgba(139,92,246,0.4)`) |
| active | `var(--midnight-sapphire, #002060)` | `var(--ice-wing, #60C0F0)` | `0 0 10px rgba(139,92,246,0.3)` |
| focus-visible | `var(--swan-lavender, #4070C0)` | `var(--frost-white, #E0ECF4)` | `2px outline var(--arctic-cyan, #50A0F0)` |
| disabled | `var(--graphite, #1A1A24)` | `var(--frost-white, #E0ECF4)` 40% | none |

### Motion
- Modal entrance: `opacity 0→1`, `transform: translateY(16px)→0`, `240ms cubic-bezier(0.22, 1, 0.36, 1)`.
- Plan card expand: `max-height: 0→400px`, `200ms ease-out`.
- Day row load confirmation: subtle `scale(0.98)` tap feedback, `120ms ease-out`.
- `prefers-reduced-motion`: modal appears instantly; expand uses instant `display` swap.

### Accessibility
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="picker-title"`.
- Focus trap active; `Escape` closes; focus returns to launcher button.
- Plan cards: `role="button"`, `aria-expanded` when expanded.
- Day rows: `role="button"`, `aria-label="Load Day N: label into logger"`.

---

## 3. WORKOUTLOGGER — BACKFILL PREFILL MODE

When the logger receives prefilled historical data (from History Import or voice backfill), it enters a visually distinct mode. The plan requires: visibly marked as AI-estimated or imported historical filler, lower/regressed, no paid-session deduction, no XP/social side effects, no plan advancement.

### Layout

**Mobile (320–375px):**
- Historical Draft Banner: sticky at top of logger, `min-height: 44px`, `padding: 10px 16px`, `background: var(--royal-depth, #003080)`, `border-bottom: 2px solid var(--gilded-fern, #C6A84B)`, flex row.
  - Left: icon (24×24) using `var(--gilded-fern, #C6A84B)`.
  - Center: text "Historical Draft — AI Estimated Filler" (`font-size: 13px; font-weight: 600; color: var(--frost-white, #E0ECF4)`).
  - Right: "Source: [label]" tag, `font-size: 11px`, `color: var(--gilded-fern, #C6A84B)`.
- Date field: `height: 44px`, `padding: 0 14px`, `border-radius: 10px`, `background: var(--graphite, #1A1A24)`, `border: 1px solid var(--gilded-fern, #C6A84B)`, `color: var(--frost-white, #E0ECF4)`, `font-size: 15px`. Distinct from normal logger date field (which uses `var(--swan-lavender, #4070C0)` border).
- Prefilled exercise rows: `background: rgba(198,168,75,0.06)` overlay tint on the standard row surface, `border-left: 3px solid var(--gilded-fern, #C6A84B)`.
- Regression indicator: each prefilled set row shows a small "↓ regressed" chip, `font-size: 10px`, `padding: 2px 6px`, `border-radius: 4px`, `background: var(--graphite, #1A1A24)`, `color: var(--gilded-fern, #C6A84B)`.
- Save button: "Save Historical Workout" — distinct from "Log Today's Workout". `min-height: 44px`, `width: 100%`, `border-radius: 12px`, `background: var(--gilded-fern, #C6A84B)`, `color: var(--obsidian-black, #0A0A0F)`, `font-size: 15px`, `font-weight: 700`.

**Tablet/Desktop:** Banner spans full width; exercise rows gain wider set columns; regression chip moves inline with set number.

### Tokens — Save Historical Button

| State | Background | Text | Glow |
|---|---|---|---|
| default | `var(--gilded-fern, #C6A84B)` | `var(--obsidian-black, #0A0A0F)` | none |
| hover | `var(--gilded-fern, #C6A84B)` | `var(--obsidian-black, #0A0A0F)` | `0 0 16px rgba(198,168,75,0.5)` |
| active | `var(--gilded-fern, #C6A84B)` | `var(--obsidian-black, #0A0A0F)` | `0 0 8px rgba(198,168,75,0.4)` |
| focus-visible | `var(--gilded-fern, #C6A84B)` | `var(--obsidian-black, #0A0A0F)` | `2px outline var(--frost-white, #E0ECF4)` |
| disabled | `var(--graphite, #1A1A24)` | `var(--frost-white, #E0ECF4)` 40% | none |
| loading | `var(--royal-depth, #003080)` | `var(--frost-white, #E0ECF4)` | pulsing `rgba(198,168,75,0.3)` |

### Motion
- Banner slide-in: `transform: translateY(-100%)→0`, `200ms ease-out`.
- Prefilled row tint fade-in: `opacity 0→1`, `150ms ease-out`.
- Save success: button `scale(1)→0.97→1`, `180ms ease-out`, then

---

## Design Reviewer & Implementation Challenger — Round 2

I AGREE with the structural foundation, the dark-first/mobile-first approach, and the strict adherence to WCAG 4.5:1. The token mappings for the default and active states are excellent. 

However, I **DISAGREE** on several implementation details regarding CSS architecture, mobile layout constraints, and accessibility mechanics. 

Here are the specific disputes and required changes before we proceed to Surfaces 4-7:

### DISPUTE 1: Sticky Hover States on Touch Devices (Surfaces 1 & 2)
**Why:** You specified hover states (e.g., `var(--royal-depth)` backgrounds and glows) for the Mode Chips and Plan Cards. On mobile (iOS/Android), tapping these elements will result in a "sticky hover" state that remains active until the user taps elsewhere, degrading the UI feel.
**Proposed Alternative:** All hover tokens must be wrapped in a pointer media query.
**Exact Code Change (`src/styles/components/TrainingShell.css` & `PlanPicker.css`):**
```css
/* Instead of standard :hover */
@media (hover: hover) and (pointer: fine) {
  .mode-chip:hover {
    background: var(--royal-depth, #003080);
    border: 1px solid var(--swan-lavender, #4070C0);
    box-shadow: 0 0 12px var(--glow-blue-alpha-30); /* See Dispute 3 regarding hardcoded RGBA */
  }
}
```

### DISPUTE 2: Modal Header Overcrowding (Surface 2: In-Logger Picker)
**Why:** For the Mobile layout (320–375px), you specified: *"Header bar... flex row: Back chevron (44×44), title... Close X (44×44)."* 
On a 320px screen, subtracting 32px (padding) and 88px (two icons) leaves only 200px for the title ("Choose Plan & Day"). This will cause truncation or cramped touch targets. Furthermore, since this is a modal launched *over* the logger (not a stack push), a Back chevron is semantically incorrect.
**Proposed Alternative:** Remove the Back chevron. Use only a Close 'X' aligned to the right.
**Exact Code Change (`src/components/workout/PlanDayPickerModal.tsx`, approx line 45):**
```tsx
// REMOVE:
// <button aria-label="Back" className="w-[44px] h-[44px]..."> <ChevronLeftIcon /> </button>

// KEEP:
<header className="flex flex-row items-center justify-between h-[56px] px-4">
  <h2 id="picker-title" className="text-[16px] font-bold text-[var(--frost-white)] truncate">
    Choose Plan & Day
  </h2>
  <button aria-label="Close modal" onClick={onClose} className="w-[44px] h-[44px] flex items-center justify-center">
    <CloseIcon />
  </button>
</header>
```

### DISPUTE 3: Hardcoded RGBA Values Breaking Token Strictness (Surfaces 2 & 3)
**Why:** You stated: *"Every color is `var(--token, #fallback)`"*, but then used hardcoded RGBA values for glows and tints (e.g., `rgba(139,92,246,0.4)` for the Load button glow, and `rgba(198,168,75,0.06)` for the prefilled row tint). This breaks theme scalability.
**Proposed Alternative:** Use CSS `color-mix` to derive alphas dynamically from your established hex tokens, ensuring perfect synchronization if the base token changes.
**Exact Code Change (`src/styles/components/WorkoutLogger.css`):**
```css
/* Surface 3: Prefilled exercise rows */
.prefilled-row {
  /* Replace background: rgba(198,168,75,0.06); with: */
  background: color-mix(in srgb, var(--gilded-fern, #C6A84B) 6%, transparent);
  border-left: 3px solid var(--gilded-fern, #C6A84B);
}

/* Surface 2: Day Row Load Button Glow */
.load-button:active {
  /* Replace box-shadow: 0 0 10px rgba(139,92,246,0.3); with: */
  box-shadow: 0 0 10px color-mix(in srgb, var(--neon-purple, #8B5CF6) 30%, transparent);
}
```

### DISPUTE 4: Accessibility - Roving Tabindex Missing (Surface 1)
**Why:** You specified: *"Keyboard: ArrowLeft/ArrowRight traverse chips"*. A standard flex container with `overflow-x: auto` does not support arrow key traversal natively. If all chips are `tabindex="0"`, the user is forced to Tab through all of them.
**Proposed Alternative:** We must explicitly mandate a roving tabindex implementation in the React component.
**Exact Code Change (`src/components/training/TrainingCommandShell.tsx`, approx line 82):**
```tsx
{modes.map((mode, index) => (
  <button
    key={mode.id}
    role="tab"
    aria-selected={activeMode === mode.id}
    aria-controls={`panel-${mode.id}`}
    tabIndex={activeMode === mode.id ? 0 : -1} // Roving tabindex enforcement
    onKeyDown={(e) => handleArrowNavigation(e, index)}
    className="mode-chip ..."
  >
    {mode.label}
  </button>
))}
```

### DISPUTE 5: Truncated Motion Spec & Date Constraint (Surface 3)
**Why:** Your motion spec cut off at the end: *"Save success: button scale(1)→0.97→1, 180ms ease-out, then"*. Additionally, if a user is in Backfill mode, the Date field must be constrained so they cannot accidentally log a "Historical Draft" in the future.
**Proposed Alternative:** 
1. Complete the motion spec: "...then trigger a success toast and route the shell to History/Charts mode."
2. Add a strict `max={today}` attribute to the date picker in Backfill mode.
**Exact Code Change (`src/components/workout/WorkoutLogger.tsx`, approx line 115):**
```tsx
<input 
  type="date" 
  className="backfill-date-input border-[var(--gilded-fern)] ..."
  max={new Date().toISOString().split('T')[0]} // Prevent future dates in backfill
  value={draftDate}
  onChange={handleDateChange}
/>
```

Please acknowledge these corrections and proceed with specifying **Surfaces 4 through 7**.

---

## Creative Director (Lead Design Authority) — Round 3

# CREATIVE DIRECTOR — ROUND 2

I have reviewed Gemini 3.1 Pro's five disputes. All five are technically valid and improve the specification. I accept them in full with one minor refinement on Dispute 3 (browser baseline). No CONSENSUS yet — I still need to deliver Surfaces 4–7, which have not been specified.

## ACKNOWLEDGED CORRECTIONS (applied to Surfaces 1–3)

1. **Sticky hover** → Accepted. All `:hover` rules now wrapped in `@media (hover: hover) and (pointer: fine)`. Applied to Mode Chips, Plan Cards, Day Row Load buttons, and Save Historical button.
2. **Modal header** → Accepted. Back chevron removed from `PlanDayPickerModal.tsx`. Close 'X' right-aligned. Title gets `truncate` and full available width.
3. **Hardcoded RGBA** → Accepted with one caveat: `color-mix(in srgb, ...)` is Baseline 2023 (Chrome 111+, Safari 16.2+, Firefox 113+). For our target matrix this is safe, but I am adding a `@supports not (color: color-mix(in srgb, red, blue))` fallback block that falls back to the literal RGBA values. This preserves token-strictness on modern browsers without breaking older WebViews.
4. **Roving tabindex** → Accepted. `tabIndex={activeMode === mode.id ? 0 : -1}` enforced. Arrow-key handler restores focus to the newly-selected chip.
5. **Truncated motion + date constraint** → Accepted. Motion spec completed: "…then trigger a success toast (`var(--gilded-fern)` accent, 3s auto-dismiss) and route shell to History/Charts mode." Date input in Backfill mode gets `max={today}` and also `min={client.onboardingDate}` to prevent logging before the client existed.

---

## SURFACE 4 — HISTORICALWORKOUTIMPORTPANEL: "BACKFILL IN LOGGER" ACTION

The existing import panel gains a new primary action per imported historical workout row. Instead of a silent server-side insert, the action hands the prefilled draft to WorkoutLogger (Surface 3) and routes the shell to Log Today mode with the draft loaded.

### Layout

**Mobile (320–375px):**
- Import row: existing card layout, `min-height: 72px`, `padding: 12px 16px`, `border-radius: 12px`, `background: var(--carbon, #141419)`, `border: 1px solid var(--graphite, #1A1A24)`.
- New action button appended to row footer: "Backfill in Logger" — `min-height: 40px` (note: this is a secondary action inside a row, not a primary CTA; 40px is acceptable because the entire row is also tappable at 72px height, satisfying the 44px minimum touch target rule via the parent), `padding: 8px 14px`, `border-radius: 8px`, `background: transparent`, `border: 1px solid var(--gilded-fern, #C6A84B)`, `color: var(--gilded-fern, #C6A84B)`, `font-size: 13px`, `font-weight: 600`.
- Secondary action "Import Silently" retained as a text link, `font-size: 12px`, `color: var(--swan-lavender, #4070C0)`, `padding: 8px 4px`.

**Tablet/Desktop:** Action buttons move inline to the right of the row; "Backfill in Logger" gains an icon prefix (arrow-into-box, 16×16).

### Tokens — Backfill in Logger Button

| State | Background | Text | Border | Glow |
|---|---|---|---|---|
| default | transparent | `var(--gilded-fern, #C6A84B)` | `1px solid var(--gilded-fern, #C6A84B)` | none |
| hover (pointer:fine only) | `color-mix(in srgb, var(--gilded-fern, #C6A84B) 10%, transparent)` | `var(--gilded-fern, #C6A84B)` | `1px solid var(--gilded-fern, #C6A84B)` | `0 0 10px color-mix(in srgb, var(--gilded-fern, #C6A84B) 30%, transparent)` |
| active | `var(--gilded-fern, #C6A84B)` | `var(--obsidian-black, #0A0A0F)` | `1px solid var(--gilded-fern, #C6A84B)` | none |
| focus-visible | transparent | `var(--gilded-fern, #C6A84B)` | `2px solid var(--arctic-cyan, #50A0F0)` | none |
| disabled | transparent | `var(--frost-white, #E0ECF4)` 40% | `1px dashed var(--graphite, #1A1A24)` | none |
| loading | `color-mix(in srgb, var(--gilded-fern, #C6A84B) 15%, transparent)` | `var(--gilded-fern, #C6A84B)` | `1px solid var(--gilded-fern, #C6A84B)` | pulsing |

### Motion
- Button press: `scale(1)→0.96`, `100ms ease-out`, then release `scale(0.96)→1`, `120ms ease-out`.
- Handoff transition: WorkoutLogger shell crossfades in (`opacity 0→1`, `translateY(8px)→0`, `200ms ease-out`) with the Historical Draft Banner already mounted (banner does NOT slide in separately — it appears as part of the crossfade to avoid double-motion).
- `prefers-reduced-motion`: instant opacity swap; no scale.

### Accessibility
- Button: `role="button"`, `aria-label="Backfill workout from {date} into logger for review"`.
- Loading state: `aria-busy="true"`, `aria-live="polite"` on a status region announcing "Loading historical draft…".
- Disabled state: `aria-disabled="true"` (not `disabled` attribute — we still want it focusable for screen reader announcement of why it's unavailable via `aria-describedby`).

### Edge Case
If the logger already has unsaved entries when "Backfill in Logger" is tapped, surface a non-blocking confirmation sheet (not a modal — see Surface 7 pattern): "Replace current logger contents with this historical draft?" with "Replace" (`var(--gilded-fern)`) and "Cancel" (`var(--swan-lavender)`) actions.

---

## SURFACE 5 — VOICE-FIRST COMMAND OVERLAY

A full-screen overlay launched from the Voice FAB. Captures voice input, transcribes in real-time, parses intent, and routes to the appropriate command mode with prefilled data — all behind a review gate (Surface 6).

### Layout

**Mobile (320–375px):**
- Overlay: `position: fixed; inset: 0; z-index: 60`, `background: var(--obsidian-black, #0A0A0F)` at 98% opacity, `backdrop-filter: blur(20px)`.
- Top bar: `height: 56px`, `padding: 0 16px`, Close 'X' right-aligned (44×44), title "Voice Command" centered (`font-size: 16px; font-weight: 700; color: var(--frost-white, #E0ECF4)`).
- Voice orb: centered, `width: 120px; height: 120px`, `border-radius: 50%`, `background: radial-gradient(circle, var(--midnight-sapphire, #002060) 0%, var(--carbon, #141419) 70%)`, `border: 2px solid var(--ice-wing, #60C0F0)`.
- Orb idle state: subtle inner glow `box-shadow: inset 0 0 20px color-mix(in srgb, var(--ice-wing, #60C0F0) 20%, transparent)`.
- Orb listening state: three concentric pulsing rings, `border: 2px solid var(--ice-wing, #60C0F0)`, animated outward `scale(1)→1.8`, `opacity 0.6→0`, `1200ms ease-out infinite`, staggered by 400ms.
- Transcript region: below orb, `min-height: 120px`, `max-height: 40dvh`, `overflow-y: auto`, `padding: 16px`, `margin: 16px`, `border-radius: 12px`, `background: var(--graphite, #1A1A24)`, `border: 1px solid var(--royal-depth, #003080)`.
- Transcript text: `font-size: 15px`, `line-height: 1.5`, `color: var(--frost-white, #E0ECF4)`. Interim transcription in `color: var(--swan-lavender, #4070C0)` italic; finalized transcription in `var(--frost-white, #E0ECF4)` normal.
- Parsed intent preview: below transcript, `padding: 12px 16px`, `border-radius: 10px`, `background: color-mix(in srgb, var(--midnight-sapphire, #002060) 40%, transparent)`, `border-left: 3px solid var(--ice-wing, #60C0F0)`. Shows detected command ("Log Today", "Backfill History", etc.) and extracted entities (exercises, sets, reps, date).
- Action bar: fixed at bottom, `padding: 16px`, `padding-bottom: max(16px, env(safe-area-inset-bottom))`. Two buttons:
  - "Review & Apply" (primary): `min-height: 44px`, `width: 100%`, `border-radius: 12px`, `background: var(--ice-wing, #60C0F0)`, `color: var(--obsidian-black, #0A0A0F)`, `font-size: 15px`, `font-weight: 700`.
  - "Discard" (secondary): text button below, `min-height: 44px`, `color: var(--swan-lavender, #4070C0)`, `font-size: 14px`.

**Tablet/Desktop:** Overlay `max-width: 560px`, centered, `border-radius: 20px`, `height: 80dvh`, `top: 10dvh`. Orb scales to `140px`.

### Tokens — Review & Apply Button

| State | Background | Text | Glow |
|---|---|---|---|
| default | `var(--ice-wing, #60C0F0)` | `var(--obsidian-black, #0A0A0F)` | none |
| hover (pointer:fine) | `var(--ice-wing, #60C0F0)` | `var(--obsidian-black, #0A0A0F)` | `0 0 16px color-mix(in srgb, var(--ice-wing, #60C0F0) 50%, transparent)` |
| active | `var(--arctic-cyan, #50A0F0)` | `var(--obsidian-black, #0A0A0F)` | `0 0 10px color-mix(in srgb, var(--ice-wing, #60C0F0) 40%, transparent)` |
| focus-visible | `var(--ice-wing, #60C0F0)` | `var(--obsidian-black, #0A0A0F)` | `2px outline var(--frost-white, #E0ECF4)`, `outline-offset: 2px` |
| disabled | `var(--graphite, #1A1A24)` | `var(--frost-white, #E0ECF4)` 40% | none |
| loading | `var(--royal-depth, #003080)` | `var(--frost-white, #E0ECF4)` | pulsing cyan |

### Motion
- Overlay entrance: `opacity 0→1`, `240ms ease-out`. Orb scales in `scale(0.8)→1`, `200ms ease-out` with `120ms` delay.
- Listening rings: as above; `prefers-reduced-motion` → rings replaced by static `box-shadow: 0 0 0 4px color-mix(in srgb, var(--ice-wing, #60C0F0) 30%, transparent)`.
- Transcript text appearance: each finalized word fades in `opacity 0→1`, `80ms`.
- Intent preview slide-up: `translateY(12px)→0`, `opacity 0→1`, `180ms ease-out`.

### Accessibility
- Overlay: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="voice-overlay-title"`.
- Orb: `role="button"`, `aria-label="Start voice command"`, `aria-pressed` toggles with listening state. Keyboard-activatable via `Space`/`Enter`.
- Transcript: `role="status"`, `aria-live="assertive"` for finalized text, `aria-live="polite"` for interim.
- Intent preview: `role="region"`, `aria-label="Parsed command preview"`.
- Microphone permission denied state: orb replaced by error icon (`var(--gilded-fern, #C6A84B)`), message "Microphone access required. Enable in browser settings." with a "Open Settings" link.

### Edge Cases
- No speech detected after 5s: orb returns to idle, transcript shows hint "Tap the orb and try speaking, e.g., 'I did back squats, 3 sets of 5 at 225.'"
- Unparseable intent: "Review & Apply" disabled, intent preview shows "Couldn't parse a command. Try rephrasing." in `var(--gilded-fern, #C6A84B)`.
- Voice backfill intent (mentions past date): routes to Surface 3 Backfill Prefill Mode with the parsed date and exercises prefilled; Historical Draft Banner source label reads "Voice Transcription".

---

## SURFACE 6 — REVIEW & APPROVE MODAL

When AI-generated content (voice-parsed, plan-generated, or backfill-estimated) is about to be written to the workout log, this modal gates the write. Shows a diff-style preview of what will be inserted.

### Layout

**Mobile (320–375px):**
- Modal: `position: fixed; inset: 0; z-index: 70`, `background: var(--obsidian-black, #0A0A0F)` at 94% opacity.
- Card: `position: absolute; bottom: 0; left: 0; right: 0`, `max-height: 85dvh`, `border-radius: 20px 20px 0 0`, `background: var(--carbon, #141419)`, `border-top: 1px solid var(--ice-wing, #60C0F0)`. Bottom-sheet pattern.
- Drag handle: `width: 36px; height: 4px`, `border-radius: 2px`, `background: var(--graphite, #1A1A24)`, `margin: 8px auto`.
- Header: `padding: 8px 16px 12px`, title "Review & Approve" (`font-size: 18px; font-weight: 700; color: var(--frost-white, #E0ECF4)`), subtitle showing source ("From Voice Command" / "AI-Generated Plan" / "Historical Estimate") in `font-size: 12px; color: var(--swan-lavender, #4070C0)`.
- Diff preview: scrollable region, `padding: 0 16px`, `max-height: 50dvh`. Each entry:
  - Exercise name row: `padding: 12px 0`, `font-size: 15px; font-weight: 600; color: var(--frost-white, #E0ECF4)`, `border-bottom: 1px solid var(--graphite, #1A1A24)`.
  - Set rows: `padding: 8px 0 8px 16px`, `font-size: 14px; color: var(--frost-white, #E0ECF4)`. AI-estimated values tagged with a small "AI" chip (`font-size: 10px; padding: 1px 6px; border-radius: 4px; background: color-mix(in srgb, var(--ice-wing, #60C0F0) 20%, transparent); color: var(--ice-wing, #60C0F0)`).
  - Editable: each set row's reps/weight fields are inline-editable inputs (`width: 60px; height: 32px; padding: 0 8px; border-radius: 6px; background: var(--graphite, #1A1A24); border: 1px solid var(--royal-depth, #003080); color: var(--frost-white, #E0ECF4); font-size: 14px`).
- Action bar: sticky at bottom of card, `padding: 12px 16px`, `padding-bottom: max(12px, env(safe-area-inset-bottom))`, `background: var(--carbon, #141419)`, `border-top: 1px solid var(--graphite, #1A1A24)`.
  - "Approve & Save" (primary): `min-height: 44px`, `width: 100%`, `border-radius: 12px`, `background: var(--ice-wing, #60C0F0)`, `color: var(--obsidian-black, #0A0A0F)`, `font-size: 15px; font-weight: 700`.
  - "Discard" (secondary): text button, `min-height: 44px`, `color: var(--swan-lavender, #4070C0)`.
  - "Edit in Logger" (tertiary): text link, `font-size: 13px`, `color: var(--swan-lavender, #4070C0)` — routes to full WorkoutLogger with draft loaded instead of approving inline.

**Tablet/Desktop:** Card centered, `max-width: 640px`, `max-height: 80dvh`, `border-radius: 16px`, `

---

## Design Reviewer & Implementation Challenger — Round 4

I acknowledge your acceptance of the Round 1 corrections. The fallback for `color-mix` using `@supports` is an excellent, robust addition for older WebViews.

However, I **DISAGREE** with several critical implementation details in Surfaces 4, 5, and 6. Furthermore, your specification for Surface 6 was truncated, and Surface 7 is entirely missing. 

Here are the specific disputes and required changes:

### DISPUTE 1: Touch Target Justification Flaw (Surface 4)
**Why:** You justified a `40px` button for "Backfill in Logger" by stating the parent row is `72px`. If the parent row has its own interactive behavior (e.g., expanding or selecting), a user missing the 40px button by 2px will accidentally trigger the parent action. WCAG 2.5.8 (Target Size Minimum) requires the interactive target *itself* (or its pointer-event area) to be 44x44px to prevent accidental activation of adjacent interactive elements.
**Proposed Alternative:** Expand the hit area using a pseudo-element without changing the visual 40px height, or simply make the button 44px. Let's use the pseudo-element approach to preserve your visual density.
**Exact Code Change (`src/styles/components/HistoricalImport.css`):**
```css
.backfill-action-btn {
  min-height: 40px;
  position: relative;
  /* ... existing styles ... */
}

/* Expand touch target to 44px minimum */
.backfill-action-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  min-height: 44px;
  min-width: 44px;
}
```

### DISPUTE 2: `aria-disabled` Event Leakage (Surface 4)
**Why:** You correctly noted that using `aria-disabled="true"` instead of the `disabled` attribute allows screen readers to focus the element and read its `aria-describedby` explanation. However, without the `disabled` attribute, the browser will still fire `onClick` and `onKeyDown` (Enter/Space) events.
**Proposed Alternative:** We must explicitly mandate a JavaScript-level guard in the component to prevent the action if `aria-disabled` is true.
**Exact Code Change (`src/components/history/HistoricalWorkoutImportPanel.tsx`, approx line 85):**
```tsx
<button
  role="button"
  aria-disabled={isDrafting}
  aria-describedby={isDrafting ? "drafting-reason" : undefined}
  onClick={(e) => {
    if (isDrafting) {
      e.preventDefault();
      return;
    }
    handleBackfillHandoff(workout);
  }}
  className="backfill-action-btn ..."
>
  Backfill in Logger
</button>
```

### DISPUTE 3: Screen Reader Spam on Voice Transcript (Surface 5)
**Why:** You specified: *"Transcript: `role="status"`, `aria-live="assertive"` for finalized text, `aria-live="polite"` for interim."* 
Dynamically injecting text into an `assertive` live region word-by-word during real-time dictation will cause the screen reader to constantly interrupt itself, creating a chaotic and unusable auditory experience.
**Proposed Alternative:** Remove `aria-live` from the raw transcript entirely. Screen reader users know they are dictating. Instead, place `aria-live="polite"` *only* on the Parsed Intent Preview, so they are cleanly notified once the AI has successfully understood the command.
**Exact Code Change (`src/components/voice/VoiceCommandOverlay.tsx`):**
```tsx
{/* REMOVE aria-live from transcript */}
<div className="transcript-region overflow-y-auto ...">
  <span className="text-[var(--swan-lavender)] italic">{interimText}</span>
  <span className="text-[var(--frost-white)]">{finalText}</span>
</div>

{/* ADD aria-live to the parsed intent preview */}
<div 
  role="region" 
  aria-live="polite" 
  aria-atomic="true"
  aria-label="Parsed command preview" 
  className="intent-preview ..."
>
  {parsedIntent ? `Detected: ${parsedIntent.command}...` : 'Listening...'}
</div>
```

### DISPUTE 4: Missing Accessible Names for Inline Inputs (Surface 6)
**Why:** You specified inline-editable inputs for reps and weight in the diff preview. As standard `<input>` elements, they will fail WCAG 4.1.2 (Name, Role, Value) if they do not have explicit labels. Relying on visual context (the column header or row name) is insufficient for screen readers.
**Proposed Alternative:** Each inline input must have a dynamically generated `aria-label` that provides full context.
**Exact Code Change (`src/components/workout/ReviewApproveModal.tsx`, approx line 110):**
```tsx
<input
  type="number"
  className="inline-edit-input ..."
  value={set.reps}
  aria-label={`Edit reps for Set ${setIndex + 1} of ${exercise.name}`}
  onChange={(e) => handleRepChange(e, set.id)}
/>
<input
  type="number"
  className="inline-edit-input ..."
  value={set.weight}
  aria-label={`Edit weight for Set ${setIndex + 1} of ${exercise.name}`}
  onChange={(e) => handleWeightChange(e, set.id)}
/>
```

### DISPUTE 5: Truncated Spec & Bottom Sheet Physics (Surface 6)
**Why:** Your specification for Surface 6 cut off abruptly at: *"Tablet/Desktop: Card centered, max-width: 640px, max-height: 80dvh, border-radius: 16px, "*, omitting the motion, accessibility, and desktop layout completion. Furthermore, the mobile bottom sheet lacks scroll chaining prevention, meaning scrolling the diff preview could accidentally scroll the body underneath.
**Proposed Alternative:** 
1. Complete the Tablet/Desktop layout: `... border-radius: 16px, top: 10dvh, bottom: auto. Drag handle is hidden (`display: none`).`
2. Add `overscroll-behavior: contain` to the diff preview region to prevent scroll chaining.
**Exact Code Change (`src/styles/components/ReviewModal.css`):**
```css
.diff-preview-region {
  max-height: 50dvh;
  overflow-y: auto;
  overscroll-behavior: contain; /* Prevents body scroll chaining */
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 768px) {
  .review-modal-card {
    max-width: 640px;
    max-height: 80dvh;
    border-radius: 16px;
    top: 10dvh;
    bottom: auto;
  }
  .drag-handle {
    display: none;
  }
}
```

Please acknowledge these corrections, complete the Motion and Accessibility specs for **Surface 6**, and provide the full specification for **Surface 7 (Contextual Missing-Info Prompt)**.

---

## Creative Director (Lead Design Authority) — Round 5

# CREATIVE DIRECTOR — ROUND 3

I have reviewed Gemini 3.1 Pro's five disputes from Round 2. All five are technically sound and address critical accessibility and interaction design flaws. I accept them in full. 

## ACKNOWLEDGED CORRECTIONS (applied to Surfaces 4–6)

1. **Touch Target Justification (Surface 4)** → Accepted. The pseudo-element approach (`::before` with `min-height: 44px; min-width: 44px`) is the correct way to preserve visual density while satisfying WCAG 2.5.8. Applied to the "Backfill in Logger" button.
2. **`aria-disabled` Event Leakage (Surface 4)** → Accepted. Added the explicit JS guard `if (isDrafting) { e.preventDefault(); return; }` inside the `onClick` and `onKeyDown` handlers to prevent action execution while remaining focusable.
3. **Screen Reader Spam (Surface 5)** → Accepted. Removed `aria-live` from the raw transcript region entirely. Moved `aria-live="polite"` and `aria-atomic="true"` exclusively to the Parsed Intent Preview region.
4. **Accessible Names for Inline Inputs (Surface 6)** → Accepted. Added dynamic `aria-label` attributes (e.g., `Edit reps for Set ${setIndex + 1} of ${exercise.name}`) to all inline-editable inputs in the Review & Approve modal.
5. **Truncated Spec & Scroll Chaining (Surface 6)** → Accepted. Added `overscroll-behavior: contain` and `-webkit-overflow-scrolling: touch` to the diff preview region. Completed the Tablet/Desktop layout to hide the drag handle and center the card.

---

## SURFACE 6 — COMPLETION (Motion & Accessibility)

### Motion
- **Mobile bottom sheet entrance:** `transform: translateY(100%)→0`, `280ms cubic-bezier(0.22, 1, 0.36, 1)`. Backdrop fades in `opacity 0→1`, `200ms ease-out`.
- **Desktop modal entrance:** `opacity 0→1`, `transform: scale(0.96)→1`, `200ms ease-out`.
- **Drag handle interaction:** If user drags the handle down, `translateY` follows the pointer/finger dynamically. If released > 25% of card height, modal dismisses (Discard). If < 25%, snaps back to `translateY(0)` with `200ms ease-out`.
- **`prefers-reduced-motion`:** All entrance animations become instant (`translateY(0)`, `opacity: 1`). Drag-to-dismiss is replaced by a standard tap on the backdrop or the Discard button.

### Accessibility
- **Modal:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby="review-approve-title"`.
- **Focus trap:** Active upon mount. `Escape` key triggers the "Discard" action. Focus returns to the launching element (e.g., Voice Overlay's "Review & Apply" button) upon close.
- **AI Chips:** `aria-label="AI estimated value"`.
- **Action Buttons:** 
  - "Approve & Save": `aria-label="Approve and save workout"`.
  - "Discard": `aria-label="Discard workout draft"`.
  - "Edit in Logger": `aria-label="Edit this draft in full workout logger"`.

---

## SURFACE 7 — CONTEXTUAL MISSING-INFO PROMPT

A non-blocking, inline prompt that surfaces when the system detects a partial onboarding gap or missing prerequisite data relevant to the current action (e.g., missing 1RM for a prescribed exercise, or missing client bodyweight for a percentage-based load). It does not halt the user's flow but offers a quick path to resolve it.

### Layout

**Mobile (320–375px):**
- **Container:** Inline card inserted directly into the active content flow (e.g., above the exercise list in WorkoutLogger, or above the diff preview in Surface 6). `margin: 12px 0`, `padding: 12px 16px`, `border-radius: 10px`, `background: color-mix(in srgb, var(--royal-depth, #003080) 15%, transparent)`, `border: 1px solid var(--royal-depth, #003080)`, `@supports not (color: color-mix(in srgb, red, blue)) { background: rgba(0, 48, 128, 0.15); }`.
- **Header Row:** Flex row, `align-items: center`, `gap: 8px`.
  - Icon: 24×24, `color: var(--swan-lavender, #4070C0)`.
  - Title: "Missing info: [Field Name]" (`font-size: 13px; font-weight: 600; color: var(--frost-white, #E0ECF4)`).
- **Description:** `font-size: 12px; color: var(--frost-white, #E0ECF4)` at 80% opacity, `margin-top: 4px`. Explains why it's needed (e.g., "Required to calculate percentage-based loads for Back Squat.").
- **Inline Input (if applicable):** `height: 36px`, `margin-top: 8px`, `padding: 0 12px`, `border-radius: 8px`, `background: var(--graphite, #1A1A24)`, `border: 1px solid var(--royal-depth, #003080)`, `color: var(--frost-white, #E0ECF4)`, `font-size: 14px`.
- **Action Row:** Flex row, `justify-content: flex-end`, `gap: 8px`, `margin-top: 8px`.
  - "Skip" (Secondary): Text button, `min-height: 36px` (pseudo-element expands to 44px), `padding: 8px 12px`, `color: var(--swan-lavender, #4070C0)`, `font-size: 13px`.
  - "Save & Apply" (Primary): `min-height: 36px` (pseudo-element expands to 44px), `padding: 8px 14px`, `border-radius: 8px`, `background: transparent`, `border: 1px solid var(--ice-wing, #60C0F0)`, `color: var(--ice-wing, #60C0F0)`, `font-size: 13px; font-weight: 600`.

**Tablet/Desktop:** Container `max-width: 480px`, centered if floating, or aligns to the left edge of the parent content area. Inline input expands to `width: 200px`.

### Tokens — Save & Apply Button

| State | Background | Text | Border | Glow |
|---|---|---|---|---|
| default | transparent | `var(--ice-wing, #60C0F0)` | `1px solid var(--ice-wing, #60C0F0)` | none |
| hover (pointer:fine) | `color-mix(in srgb, var(--ice-wing, #60C0F0) 10%, transparent)` | `var(--ice-wing, #60C0F0)` | `1px solid var(--ice-wing, #60C0F0)` | `0 0 8px color-mix(in srgb, var(--ice-wing, #60C0F0) 30%, transparent)` |
| active | `var(--ice-wing, #60C0F0)` | `var(--obsidian-black, #0A0A0F)` | `1px solid var(--ice-wing, #60C0F0)` | none |
| focus-visible | transparent | `var(--ice-wing, #60C0F0)` | `2px solid var(--arctic-cyan, #50A0F0)` | none |
| disabled | transparent | `var(--frost-white, #E0ECF4)` 40% | `1px dashed var(--graphite, #1A1A24)` | none |

### Motion
- **Entrance:** `opacity 0→1`, `transform: translateY(-8px)→0`, `150ms ease-out`.
- **Dismissal (Skip):** `opacity 1→0`, `transform: translateY(-8px)`, `150ms ease-out`, then `display: none`.
- **Save & Apply success:** Button `scale(1)→0.96→1`, `120ms ease-out`, then the entire prompt card collapses: `max-height: 200px→0`, `opacity 1→0`, `margin: 12px 0→0`, `200ms ease-out`.
- **`prefers-reduced-motion:** Instant opacity swap for entrance/dismissal. No scale.

### Accessibility
- **Container:** `role="region"`, `aria-label="Missing information prompt"`.
- **Inline Input:** `aria-label="Enter [Field Name]"` (e.g., "Enter 1 Rep Max for Back Squat").
- **Buttons:** 
  - "Skip": `aria-label="Dismiss missing info prompt"`.
  - "Save & Apply": `aria-label="Save and apply [Field Name]"`.
- **Live Region:** The container has `aria-live="polite"` so if the prompt dynamically appears while the user is in the logger, the screen reader announces the missing info without interrupting critical actions.

---

## Design Reviewer & Implementation Challenger — Round 6

I accept your completions for Surface 6 and the introduction of Surface 7. The motion specs for the bottom sheet and the visual design of the contextual prompt are excellent. 

However, I **DISAGREE** with three specific implementation details regarding touch targets and accessibility anti-patterns in Surfaces 6 and 7. Since these are the final surfaces, resolving these will bring us to full consensus.

### DISPUTE 1: Drag Handle Touch Target (Surface 6)
**Why:** You specified a drag handle of `width: 36px; height: 4px`. While visually elegant, binding a drag gesture strictly to a 4px tall element guarantees user frustration, as it severely violates the 44px minimum touch target. Users will miss the handle and accidentally trigger content scrolling or do nothing.
**Proposed Alternative:** The visual handle must be wrapped in an invisible, full-width hit area that satisfies the 44px minimum and captures the `touch-action` correctly.
**Exact Code Change (`src/components/workout/ReviewApproveModal.tsx` & `ReviewModal.css`):**
```tsx
{/* src/components/workout/ReviewApproveModal.tsx */}
<div 
  className="drag-handle-hit-area" 
  onPointerDown={handleDragStart}
  aria-hidden="true"
>
  <div className="drag-handle-visual" />
</div>
```
```css
/* src/styles/components/ReviewModal.css */
.drag-handle-hit-area {
  width: 100%;
  height: 44px; /* Enforces touch target */
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none; /* Prevents browser scroll during drag */
  cursor: grab;
}
.drag-handle-visual {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--graphite, #1A1A24);
}
```

### DISPUTE 2: Interactive Elements Inside Live Regions (Surface 7)
**Why:** You specified: *"The container has `aria-live="polite"`"*. Placing a live region on a container that holds interactive elements (an `<input>` and `<button>`s) is a severe accessibility anti-pattern. When the user types into the input or clicks a button, the DOM changes can cause the screen reader to re-announce the *entire* container's text repeatedly, creating massive confusion.
**Proposed Alternative:** Remove `aria-live` from the container itself. Instead, fire a one-time announcement to a dedicated, visually hidden global live region when the prompt mounts, and rely on logical DOM placement (e.g., immediately preceding the exercise it references) for natural discovery.
**Exact Code Change (`src/components/training/MissingInfoPrompt.tsx`):**
```tsx
// REMOVE aria-live from the container
<div 
  role="region" 
  aria-label={`Missing information: ${fieldName}`}
  className="missing-info-container ..."
>
  {/* ... content ... */}
</div>

// ADD to a useEffect on mount:
useEffect(() => {
  announceToScreenReader(`Missing information required: ${fieldName}. Form available inline.`);
}, [fieldName]);
```

### DISPUTE 3: Input Touch Target Minimums (Surface 7)
**Why:** You specified the inline input as `height: 36px`. While you correctly used pseudo-elements to expand the 36px buttons to 44px hit areas, expanding an `<input>`'s hit area with a pseudo-element is unreliable because clicking the pseudo-element does not natively focus the input (unless wrapped in a carefully sized `<label>`). WCAG 2.5.8 applies to text inputs as well.
**Proposed Alternative:** Make the input natively `44px` tall on mobile devices, and scale it down to `36px` only on devices with a fine pointer (desktop).
**Exact Code Change (`src/styles/components/MissingInfoPrompt.css`):**
```css
.missing-info-input {
  min-height: 44px; /* Mobile-first touch target */
  padding: 0 14px;
  border-radius: 8px;
  background: var(--graphite, #1A1A24);
  border: 1px solid var(--royal-depth, #003080);
  color: var(--frost-white, #E0ECF4);
  font-size: 16px; /* 16px prevents iOS Safari auto-zoom */
}

@media (pointer: fine) {
  .missing-info-input {
    min-height: 36px; /* Desktop density */
    padding: 0 12px;
    font-size: 14px;
  }
}
```

Please acknowledge these final three corrections. If accepted, we will have a complete, accessible, and robust specification for all 7 surfaces, and I will declare consensus.

---

