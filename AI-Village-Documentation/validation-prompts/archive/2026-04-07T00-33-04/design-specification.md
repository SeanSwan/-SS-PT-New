# Design Specification Consensus

> Phase 2C: Gemini 3.1 Pro (CTO) ↔ MiniMax M2.7
> Consensus: YES

---

### ✅ CONSENSUS REACHED (Phase 1 Finalization)

You are absolutely right about the screen reader duplication issue with `role="img"`. I will not push an accessibility flaw to a "Phase 2 Backlog." We fix it now.

Your recommendation to use `role="presentation"` and `aria-hidden="true"` on the badge, while moving the semantic `aria-label` to the parent message container, is **APPROVED**. Update the Phase 1 PR with this final adjustment and merge it.

---

## Phase 2: Data Visualization & Charting Specifications

Listen closely. Data visualization is where fitness apps usually fall apart. They become cluttered, colorful messes that look like a child's toy. The **Crystalline Swan** theme demands that our charts look like high-end telemetry dashboards—sharp, luminous, and instantly readable on a gym floor.

We are implementing custom SVG charts. Do not use heavy, generic charting libraries (like Chart.js) that inject inline styles and ruin our token system. We build these components to our exact specifications.

Here are the directives for the `VolumeLoadGraph` and the `1RM-Trendline`.

### 1. Global SVG Chart Standards
**File Reference:** `components/charts/ChartBase.css`

*   **Crisp Rendering:** All SVG lines and strokes MUST use `vector-effect="non-scaling-stroke"`. This ensures our 1px or 2px lines don't become blurry or bloated when the SVG scales responsively on mobile devices.
*   **Gridlines:**
    *   Color: `var(--color-graphite)` (`#1A1A24`).
    *   Style: `stroke-width="1"`, `stroke-dasharray="4 4"`.
    *   *Rule:* Horizontal gridlines only. Vertical gridlines create unnecessary visual noise.
*   **Axis Typography:**
    *   Font: `10px`, `font-weight: 600`, `font-variant-numeric: tabular-nums`.
    *   Color: `var(--color-frost-white)` at `50%` opacity.
    *   Padding: `12px` offset from the chart area.

### 2. VolumeLoadGraph (Bar Chart)
**File Reference:** `components/charts/VolumeLoadGraph.tsx`

This chart tracks cumulative tonnage. It needs to feel grounded and heavy, but highly responsive to touch.

*   **Bar Geometry:**
    *   Width: Dynamic based on container, but `max-width: 32px`.
    *   Border Radius: `rx="4"` on the top corners ONLY. The bottom must be perfectly flat against the X-axis.
*   **Bar States:**
    *   **Default:** `fill="var(--color-royal-depth)"` (`#003080`).
    *   **Hover/Active (Touch):** `fill="var(--color-arctic-cyan)"` (`#50A0F0`).
    *   **Active Glow:** When a bar is active, it must cast a glow upwards: `filter: drop-shadow(0 -4px 12px rgba(80, 160, 240, 0.4))`.
*   **Animation:**
    *   Bars must grow from the bottom up on mount.
    *   `transform-origin: bottom;`
    *   `animation: bar-rise 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;`
    *   Stagger the animation by `0.05s` per bar from left to right.

### 3. 1RM-Trendline (Line Chart)
**File Reference:** `components/charts/OneRepMaxTrendline.tsx`

This tracks a client's One Rep Max progression. It is the hero metric. It must look like a laser cutting through the dark UI.

*   **The Trendline (Path):**
    *   Stroke Color: `var(--color-ice-wing)` (`#60C0F0`).
    *   Stroke Width: `3px`.
    *   Fill: `none`.
    *   **Mandatory Glow:** The path must have an SVG filter applied to create the Crystalline effect.
        ```xml
        <filter id="crystal-glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        ```
*   **Data Nodes (Points):**
    *   Radius: `r="5"`.
    *   Fill: `var(--color-obsidian-black)` (`#0A0A0F`).
    *   Stroke: `var(--color-wing-purple)` (`#8B5CF6`) at `2px` width.
    *   Hover State: Radius expands to `r="7"`, fill changes to `var(--color-frost-white)`.
*   **Draw Animation:**
    *   The line must "draw" itself from left to right on mount.
    *   Use the `stroke-dasharray` and `stroke-dashoffset` technique.
    *   Timing: `1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards`.

### 4. Universal Chart Tooltip (HTML Overlay)
**File Reference:** `components/charts/ChartTooltip.tsx`

Do NOT use native SVG `<title>` tags. They are slow, ugly, and inaccessible. We are using an absolutely positioned HTML `div` that tracks the user's touch/mouse position.

*   **Container:**
    *   Background: `var(--color-obsidian-black)` at `85%` opacity.
    *   Filter: `backdrop-filter: blur(8px)`.
    *   Border: `1px solid var(--color-graphite)`.
    *   Border Radius: `6px`.
    *   Padding: `8px 12px`.
    *   Pointer Events: `pointer-events: none;` (Crucial so it doesn't block hover states on the chart itself).
*   **Typography:**
    *   Value (e.g., "315 lbs"): `14px`, `font-weight: 700`, `color: var(--color-arctic-cyan)`.
    *   Date (e.g., "Oct 12"): `11px`, `font-weight: 500`, `color: var(--color-frost-white)` at `70%` opacity.

Review these specifications. Pay special attention to the SVG filter logic and the animation staggers. If the math and accessibility hold up, we build it.
