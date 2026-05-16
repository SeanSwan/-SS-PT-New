# UX/UI Design Planning Debate (Phase 2C) — Validation Report

> **Status:** PASS | **Model:** gemini-3.1-pro-preview ↔ minimax/minimax-m2.7 | **Duration:** 198.1s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

CONSENSUS REACHED

As you have raised no further objections to my revised specifications, I am officially declaring consensus on the Round 1 components. Your silence indicates approval of the engineering-design compromises we established.

### Merged Findings: Round 1 Source of Truth
*   **Theme Variables:** `--color-swan-indigo` is officially `#4070C0`.
*   **Thinking Indicator:** Implemented via hardware-accelerated opacity transitions on `::after` pseudo-elements attached to the individual shards to prevent GPU paint overhead while maintaining individual shard refraction.
*   **Attachment Remove Button:** Visual size set to `24px`, but utilizes an invisible `::before` pseudo-element (`44px x 44px`) to strictly satisfy WCAG 2.5.5 Target Size requirements without obscuring the thumbnail.
*   **Voice Recording Overlay:** Hardware acceleration (`will-change: transform, opacity; transform: translateZ(0);`) applied to the outer ring to prevent blur-scaling jank on mobile.
*   **Provider Badge (PLAUD):** Text color shifted to `var(--color-frost-white)` for AAA contrast, while `var(--color-ice-wing)` is retained on the border to preserve brand identity.

***

## Creative Director Specification — Round 2: The Workout Builder & Analytics

With the foundational UI and intake mechanisms locked, we must now tackle the core of the Swan Coach platform: **The Workout Builder (The "Forge")** and **Client Analytics Graphs (The "Telemetry")**.

Trainers will spend 60% of their time here. The data density is high, and the risk of visual clutter is extreme. Strict adherence to these specifications is mandatory.

### 1. Workout Builder: Superset Brackets (The "Link")
When a trainer links exercises into a superset or circuit, the UI must clearly group them without relying on heavy, nested background cards that waste horizontal space on mobile.

*   **The Bracket (Left Edge):**
    *   Positioning: Absolute, left side of the exercise group container. `left: 8px; top: 24px; bottom: 24px;`
    *   Width: `12px`.
    *   Border: `2px solid var(--color-swan-indigo)` `#4070C0`.
    *   Border Radius: Top-left and bottom-left corners `8px`. Right borders `none`.
*   **Exercise Card (Inside Superset):**
    *   Margin Left: `24px` (To accommodate the bracket).
    *   Background: `transparent`. (Do not nest backgrounds; rely on the bracket for grouping).
*   **Superset Label:**
    *   Placement: Vertically centered on the bracket, rotated `-90deg`.
    *   Typography: `10px`, `font-weight: 800`, `text-transform: uppercase`, `letter-spacing: 0.1em`.
    *   Color: `var(--color-ice-wing)` `#60C0F0`.
    *   Background: `var(--color-carbon)` `#141419` (to mask the bracket line behind the text).

### 2. Workout Builder: Set Data Grid (The "Matrix Rows")
Inputting reps, weight, and RPE must be lightning-fast. We are using a strict CSS Grid layout.

*   **Grid Layout (`workout-grid.css`):**
    *   Columns (Mobile): `grid-template-columns: 32px 1fr 1fr 1fr 32px;` (Set #, Weight, Reps, RPE, Action Menu).
    *   Gap: `8px`.
    *   Row Height: `40px`.
*   **Input Fields (`.set-input`):**
    *   Background: `var(--color-obsidian-black)` `#0A0A0F`.
    *   Border: `1px solid transparent`.
    *   Border Radius: `6px`.
    *   Typography: `16px` (Prevents iOS auto-zoom), `font-family: monospace`, `text-align: center`, `color: var(--color-frost-white)`.
*   **Interaction States:**
    *   Hover: `background: var(--color-graphite)` `#1A1A24`.
    *   Focus: `border: 1px solid var(--color-ice-wing)` `#60C0F0`; `box-shadow: 0 0 0 2px rgba(96, 192, 240, 0.2);` `outline: none;`
*   **Completed State (Checkbox Toggle):**
    *   When a set is marked complete, the entire row's opacity drops to `0.5`, and a subtle `linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent)` washes over the row background.

### 3. Client Analytics: Volume & 1RM Graphs (The "Telemetry")
We are using SVG-based line charts. No generic charting library defaults will be accepted. The charts must look like glowing data streams in the dark.

*   **Chart Container:**
    *   Background: `var(--color-carbon)` `#141419`.
    *   Padding: `24px`.
    *   Border Radius: `16px`.
    *   Border: `1px solid var(--color-graphite)` `#1A1A24`.
*   **Grid Lines (X-Axis Only):**
    *   We are eliminating vertical grid lines to reduce clutter.
    *   Horizontal Lines: `stroke: var(--color-graphite)` `#1A1A24`, `stroke-width: 1px`, `stroke-dasharray: 4 4`.
*   **The Data Line (Primary Metric - e.g., Volume):**
    *   Stroke Color: `var(--color-wing-purple)` `#8B5CF6`.
    *   Stroke Width: `3px`.
    *   Line Cap/Join: `round`.
    *   Filter: `drop-shadow(0px 4px 8px rgba(139, 92, 246, 0.4))` (Glow effect).
*   **The Area Fill (Under the Line):**
    *   Fill: `url(#purple-gradient)`.
    *   Gradient Definition: `linear-gradient(180deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0) 100%)`.
*   **Interactive Tooltip (Hover/Touch):**
    *   A vertical tracking line (`1px solid var(--color-ice-wing)`) follows the cursor/finger.
    *   Tooltip Box: Absolute positioned, `background: var(--color-midnight-sapphire)` `#002060`, `border: 1px solid var(--color-swan-indigo)` `#4070C0`, `border-radius: 8px`, `padding: 8px 12px`.
    *   Tooltip Typography: Value in `16px font-weight: 700 var(--color-frost-white)`, Date in `12px var(--color-ice-wing)`.
    *   Z-Index: `100` (Must break out of chart container clipping if near edges).

**Implementation Directive:**
Review these Round 2 components. Pay special attention to the CSS Grid layout for the Set Data Grid and the SVG filter performance on the Analytics Graphs. Let me know if you spot any accessibility or rendering bottlenecks.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
