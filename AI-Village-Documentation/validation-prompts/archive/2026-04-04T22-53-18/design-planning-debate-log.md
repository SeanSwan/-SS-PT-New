# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 5,130 input / 4,444 output

---

## Creative Director (Lead Design Authority) — Round 1

As the Creative Director of SwanStudios, I must immediately correct a fundamental disconnect in your request. You asked for design specs for a "Conversation Sidebar," "Markdown Renderer," and "Voice Recording Overlay." **Those components belong to an AI Chat interface, not the Board 2 Exercise Modifications plan you submitted for review.** 

I do not design blindly. I design to solve the exact UX friction points identified in the research: **Information Overload** and the **Missing "Apply" Workflow**. 

To execute the Board 2 Redesign flawlessly under the **Crystalline Swan** design system, we are discarding the static, overwhelming 10-row table. Instead, we are implementing a **Progressive Disclosure Accordion** and a **Contextual Action Sheet**. 

Here is my definitive, prescriptive visual specification for the *actual* components required for Board 2.

---

### 1. The Modification Accordion (Progressive Disclosure)
*To prevent the cognitive overload identified in UX Phase 1, the 10 modification fields will be hidden behind an elegant, tappable accordion header attached to each exercise.*

*   **Container Height:** `56px` (Collapsed), Auto (Expanded)
*   **Background Color:** `var(--swan-carbon, #141419)`
*   **Border:** `1px solid var(--swan-graphite, #1A1A24)`
*   **Border Radius:** `12px`
*   **Hover State:** `background-color: var(--swan-graphite, #1A1A24); cursor: pointer;`
*   **Active/Expanded State:** Border-bottom changes to `1px solid rgba(96, 192, 240, 0.2)` (Ice Wing tint) to separate header from the table.
*   **Typography (Header):** `15px` Inter, SemiBold, `var(--swan-frost, #E0ECF4)`
*   **AI Context Badge (If client has known pain):** `background: rgba(139, 92, 246, 0.15); color: var(--swan-wing-purple, #8B5CF6); border-radius: 4px; padding: 2px 6px; font-size: 11px;`
*   **Chevron Icon:** `16x16px`, `color: var(--swan-ice-wing, #60C0F0)`
*   **Animation (Expand/Collapse):** 
    *   Height transition: `0.35s cubic-bezier(0.2, 0.8, 0.2, 1)`
    *   Chevron rotation: `transform: rotate(180deg); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);`

### 2. The Modification Data Grid (The Table)
*I am overriding the generic "green/red" suggestion in the plan. We are a premium platform. We use Crystalline Swan tokens to denote regression (Ice Wing) and progression (Wing Purple).*

*   **Row Height:** `48px` (Strict Apple HIG standard for touch targets).
*   **Row Layout:** CSS Grid `grid-template-columns: 120px 1fr 32px;` (Label, Exercise Name, Action Icon).
*   **Easy Variation Row (Regression):** 
    *   Background: `rgba(96, 192, 240, 0.06)` (Ice Wing)
    *   Label Color: `var(--swan-ice-wing, #60C0F0)`
*   **Hard Variation Row (Progression):** 
    *   Background: `rgba(139, 92, 246, 0.06)` (Wing Purple)
    *   Label Color: `var(--swan-wing-purple, #8B5CF6)`
*   **Pain Mod Rows (Alternating):** 
    *   Even Rows: `var(--swan-obsidian, #0A0A0F)`
    *   Odd Rows: `var(--swan-carbon, #141419)`
*   **Typography (Exercise Name):** `14px` Inter, Medium, `var(--swan-frost, #E0ECF4)`
*   **Typography (Joint Label):** `13px` Inter, Regular, `rgba(224, 236, 244, 0.45)`
*   **"N/A" Empty State:** `opacity: 0.15; pointer-events: none; filter: grayscale(100%);` (Do not hide them, maintain grid structure, but remove them from visual hierarchy).
*   **Row Hover/Tap State:** `background-color: rgba(224, 236, 244, 0.05);`

### 3. Joint & Pain Badges
*Visual anchors replacing generic text labels for faster scanning by trainers on the gym floor.*

*   **Size:** `Height: 24px`, `Padding: 0 8px`
*   **Background:** `rgba(26, 26, 36, 0.6)` (Graphite with opacity)
*   **Border:** `1px solid rgba(224, 236, 244, 0.08)`
*   **Border Radius:** `6px`
*   **Icon Size:** `14px` (Emoji or SVG)
*   **Text:** `12px`, `font-weight: 500`, `color: rgba(224, 236, 244, 0.7)`
*   **Spacing:** `6px` gap between icon and text.

### 4. Contextual Action Sheet (The "Apply" Workflow)
*When a trainer taps a modification row, this bottom sheet slides up, solving the critical UX gap of "How do I apply this?"*

*   **Container:** `border-radius: 24px 24px 0 0;`
*   **Background:** `var(--swan-graphite, #1A1A24)`
*   **Backdrop Filter:** `blur(16px)` with a `rgba(10, 10, 15, 0.8)` overlay.
*   **Top Border:** `1px solid rgba(96, 192, 240, 0.15)` (Ice Wing)
*   **Drag Handle:** `width: 36px; height: 4px; border-radius: 2px; background: rgba(224, 236, 244, 0.2); margin: 12px auto 24px;`
*   **Animation (Slide Up):** `transform: translateY(0); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);`
*   **Primary Action Button ("Apply to Current Workout"):**
    *   **Height:** `52px`
    *   **Border Radius:** `12px`
    *   **Typography:** `16px` Inter, Bold, `var(--swan-frost, #E0ECF4)`
    *   **Background:** `linear-gradient(135deg, var(--swan-royal-depth, #003080), var(--swan-wing-purple, #8B5CF6))`
    *   **MANDATORY Dual-Button Glow (Hover/Active):** 
        *   `box-shadow: 0 0 24px rgba(139, 92, 246, 0.4), inset 0 0 12px rgba(96, 192, 240, 0.3);`
        *   Transition: `box-shadow 0.3s ease-out`
*   **Secondary Action Button ("Update Template Permanently"):**
    *   **Background:** `transparent`
    *   **Border:** `1px solid var(--swan-arctic-cyan, #50A0F0)`
    *   **Color:** `var(--swan-arctic-cyan, #50A0F0)`
    *   **Hover:** `background: rgba(80, 160, 240, 0.1);`

---

### Implementation Directive to Engineering:
Do not build the static 10-row table from the original plan. Implement the **Modification Accordion** (`ClassPreviewPanel.tsx`). When a row is tapped, trigger the **Contextual Action Sheet**. Use the exact CSS custom properties provided above. The Galaxy-Swan palette is strictly forbidden. Execute this with the precision expected of SwanStudios.

---

## Design Implementation Reviewer — Round 2

# Design Implementation Reviewer — Round 1 Response

## CONSENSUS REACHED

**Primary Agreement:** The Creative Director correctly identified the scope mismatch. The Board 2 Exercise Modifications plan does not require a Conversation Sidebar, Markdown Renderer, or Voice Recording Overlay. Those belong to a separate AI Chat feature. I retract my earlier request for those components within this review.

---

## Merged Findings & Consolidated Specifications

I agree with the **four-component architecture** proposed. The **Progressive Disclosure Accordion** + **Contextual Action Sheet** pattern is the correct solution for the "Apply" workflow gap. I endorse this direction.

Below are the merged specifications incorporating both plans.

---

## Component Specifications — Merged (Board 2 Exercise Modifications)

### 1. Modification Accordion (`ClassPreviewPanel.tsx`)

| Property | Value | Notes |
|----------|-------|-------|
| Container Height (Collapsed) | `56px` | ✅ Agree |
| Background | `var(--swan-carbon, #141419)` | ✅ Agree |
| Border | `1px solid var(--swan-graphite, #1A1A24)` | ✅ Agree |
| Border Radius | `12px` | ✅ Agree |
| Hover State | `background-color: var(--swan-graphite)` | ✅ Agree |
| Expanded Border-Bottom | `1px solid rgba(96, 192, 240, 0.2)` | ✅ Agree |
| Header Typography | `15px Inter, SemiBold, var(--swan-frost)` | ✅ Agree |
| AI Context Badge | Purple tint per spec | ✅ Agree |
| Chevron | `16x16px, var(--swan-ice-wing)` | ✅ Agree |

**⚠️ DISPUTE — Animation Timing:**
> **Original:** `0.35s cubic-bezier(0.2, 0.8, 0.2, 1)`
> **Proposed Alternative:** `0.25s cubic-bezier(0.4, 0, 0.2, 1)`
>
> **Reasoning:** 350ms is too slow for a mobile-first gym floor interface. Trainers will be rapidly scanning/tapping multiple accordions during class setup. The original easing also has significant overshoot (`0.2, 0.8, 0.2, 1` produces an elastic feel). This creates a "bouncy" sensation that feels inconsistent with the premium, crystalline aesthetic.
>
> **File:** `components/ClassPreviewPanel/ModificationAccordion.tsx`, Line ~89
> ```tsx
> // CHANGE FROM:
> style={{ height: '56px', transition: 'height 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
> 
> // TO:
> style={{ height: isExpanded ? 'auto' : '56px', transition: 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out' }}
> ```

---

### 2. Modification Data Grid

| Property | Value | Status |
|----------|-------|--------|
| Row Height | `48px` (Apple HIG) | ✅ Agree |
| Grid Layout | `grid-template-columns: 120px 1fr 32px` | ✅ Agree |
| Easy Variation Background | `rgba(96, 192, 240, 0.06)` | ✅ Agree |
| Hard Variation Background | `rgba(139, 92, 246, 0.06)` | ✅ Agree |
| Pain Mod Alternating Rows | Obsidian/Carbon pattern | ✅ Agree |

**⚠️ DISPUTE — "N/A" Empty State:**
> **Original:** `opacity: 0.15; pointer-events: none; filter: grayscale(100%);`
>
> **Reasoning:** `grayscale(100%)` on all N/A rows will produce a jarring, desaturated visual spike in the middle of an otherwise vibrant table. This is especially problematic on OLED screens where `grayscale` + low opacity creates visual noise.
>
> **Proposed Alternative:**
> ```css
> .mod-row[data-state="unavailable"] {
>   opacity: 0.25;
>   pointer-events: none;
>   background: rgba(224, 236, 244, 0.03);
> }
> .mod-row[data-state="unavailable"] .exercise-name {
>   color: rgba(224, 236, 244, 0.2);
>   font-style: italic;
> }
> ```
>
> **File:** `components/ClassPreviewPanel/ModificationGrid.css`, Line ~45

---

### 3. Joint & Pain Badges

Specifications endorsed. ✅ **Full agreement.**

---

### 4. Contextual Action Sheet

| Property | Value | Status |
|----------|-------|--------|
| Border Radius | `24px 24px 0 0` | ✅ Agree |
| Background | `var(--swan-graphite)` | ✅ Agree |
| Backdrop Filter | `blur(16px)` | ✅ Agree |
| Drag Handle | Spec-compliant | ✅ Agree |
| Slide Animation | `0.4s cubic-bezier(0.16, 1, 0.3, 1)` | ✅ Agree (excellent) |

**⚠️ DISPUTE — Primary Button Glow:**
> **Original:** `box-shadow: 0 0 24px rgba(139, 92, 246, 0.4), inset 0 0 12px rgba(96, 192, 240, 0.3);`
>
> **Reasoning:** The dual glow creates an inner blue reflection that may not render consistently across browsers and could fail WCAG 2.1 Contrast requirements on the text.
>
> **Proposed Alternative (Maintain visual impact, improve accessibility):**
> ```css
> .action-sheet-primary-btn {
>   /* Replace inline glow with subtle gradient + drop shadow only */
>   box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35), 
>               0 0 0 1px rgba(96, 192, 240, 0.2);
> }
> .action-sheet-primary-btn:active {
>   box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5),
>               0 0 0 2px var(--swan-ice-wing); /* Focus ring for accessibility */
> }
> ```

---

## New Specification — Loading & Error States (Missing from Original)

The original plan omits critical states for the **"Apply" action**.

**File:** `components/ClassPreviewPanel/ContextualActionSheet.tsx`

```tsx
// ADD after line ~24 (Primary Button definition):

const [applyState, setApplyState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

<PrimaryButton 
  onPress={handleApply} 
  disabled={applyState === 'loading'}
>
  {applyState === 'loading' && <Spinner size={16} color="#E0ECF4" />}
  {applyState === 'idle' && 'Apply to Current Workout'}
  {applyState === 'loading' && 'Applying...'}
  {applyState === 'success' && '✓ Applied!'}
  {applyState === 'error' && 'Try Again'}
</PrimaryButton>

{applyState === 'error' && (
  <ErrorBanner variant="inline">
    Unable to apply modification. Check your connection.
  </ErrorBanner>
)}
```

---

## Accessibility — New Specification

**File:** `components/ClassPreviewPanel/ModificationAccordion.tsx`, Line ~52

```tsx
// ADD ARIA attributes:
<button 
  aria-expanded={isExpanded}
  aria-controls={`mod-content-${exerciseId}`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') toggleExpand();
    if (e.key === 'ArrowDown' && isExpanded) focusNextRow();
  }}
>
  <Chevron aria-hidden="true" />
</button>

<div 
  id={`mod-content-${exerciseId}`}
  role="region"
  aria-label={`Modifications for ${exerciseName}`}
>
```

---

## Summary of Disputes

| # | Original Spec | My Counter-Spec | Reason |
|---|---------------|-----------------|--------|
| 1 | Accordion: `0.35s` + overshoot easing | `0.25s` + standard ease | Performance on mobile; premium feel |
| 2 | N/A: `grayscale(100%)` | `opacity: 0.25` + subtle bg | OLED rendering; visual noise |
| 3 | Primary Button: Dual glow | Gradient + drop shadow | WCAG contrast; browser consistency |
| 4 | *(Missing)* | Add loading/error states | Critical for "Apply" workflow |
| 5 | *(Missing)* | Add ARIA attributes | Accessibility requirement |

---

## Consensus Statement

I agree with the **Core Architecture** (Accordion + Grid + Badges + Action Sheet). I agree with the **Crystalline Swan token usage**. The disputes above are refinements, not architectural objections.

**Awaiting Creative Director's response on disputes 1–5 before proceeding to Round 2.**

---

