# Universal Master Schedule - Scroll Bug Root Cause Analysis

**Date:** 2026-02-11
**Severity:** P0 (Blocker - core navigation broken)
**Status:** FIXED

## Symptom

When users navigate to the Universal Master Schedule inside the Admin/Trainer/Client dashboard, vertical scrolling within the schedule container does not work. Only scrolling outside the schedule (i.e., the browser's outer scroll) functions. This prevents users from seeing the Week View calendar, session cards, and any content below the "Schedule Overview" stats panel.

## Root Cause: CSS Height Resolution Chain Failure

### The Chain (5 layers deep)

```
Root Box (height: 100vh, display: flex)
  └─ Main Box (flexGrow: 1)
      └─ Inner Wrapper (minHeight: calc(100vh - 64px), mt: 64px)  ← PROBLEM
          └─ Content Box (flex: 1, overflow: hidden)
              └─ ScheduleContainer (height: 100%)  ← BROKEN
```

### Why It Broke

1. **`minHeight` vs `height`**: The Inner Wrapper in `main-layout.tsx` uses `minHeight: calc(100vh - 64px)` instead of `height`. Per CSS spec, `minHeight` does NOT create a **definite height** for child percentage resolution. This means when ScheduleContainer uses `height: 100%`, it cannot resolve against `minHeight` — so the container GROWS to its full content height rather than being viewport-constrained.

2. **No scroll trigger**: Since ScheduleContainer grows to fit all its content (header + stats + calendar), `overflow-y: auto` never triggers — there's no overflow because the container is already as tall as the content.

3. **`transform: translateZ(0)` interference**: Both ScheduleContainer and ScheduleHeader used `transform: translateZ(0)` for "GPU acceleration." This creates new compositing layers and stacking contexts that can interfere with native scroll input routing on Chromium-based browsers, especially on Windows.

4. **`flex: 1 0 auto` on CalendarContainer**: The `flex-shrink: 0` prevents CalendarContainer from shrinking to fit within ScheduleContainer, further breaking the containment.

5. **Nested scroll in AgendaView**: AgendaView had its own `max-height: 620px` + `overflow-y: auto`, creating a scroll-within-scroll that competed with the parent container for scroll events.

## Fix Applied (5 changes)

### Fix 1: ScheduleContainer — Viewport-relative height
**File:** `UniversalMasterSchedule.tsx`
- Changed `height: 100%` → `height: calc(100dvh - 80px)` (bypasses broken parent chain)
- Replaced `transform: translateZ(0)` → `will-change: scroll-position` (no stacking context)
- Removed mobile `height: auto` overrides that disabled scroll containment
- Added responsive breakpoints: `calc(100dvh - 72px)` tablet, `calc(100dvh - 64px)` mobile

### Fix 2: CalendarContainer — Remove competing overflow
**File:** `ScheduleCalendar.tsx`
- Changed `overflow: auto` → `overflow-x: auto; overflow-y: visible`
- Delegates vertical scroll to parent ScheduleContainer

### Fix 3: ScheduleHeader — Remove transform
**File:** `ScheduleHeader.tsx`
- Removed `transform: translateZ(0)` from HeaderContainer
- Kept `position: relative; z-index: 10` for proper layering

### Fix 4: DragDropManager — Touch scroll compatibility
**File:** `DragDropManager.tsx`
- Added `TouchSensor` with `{ delay: 200, tolerance: 6 }` activation constraint
- Lets browser distinguish scroll gestures from drag gestures on touch devices

### Fix 5: AgendaView — Eliminate nested scroll
**File:** `AgendaView.tsx`
- Removed `max-height: 620px`, `overflow-y: auto`, `padding-right`
- Removed `onScroll` handler from AgendaContainer JSX

### Bonus: ViewSelector — Sticky positioning
**File:** `ViewSelector.tsx`
- Added `position: sticky; top: 0; z-index: 5` for persistent view tabs during scroll

## Verification

- Frontend build: PASS (6.93s)
- Frontend tests: 25/25 PASS
- Playwright screenshots captured at 375w, 768w, 1280w, 1920w (before-deploy)

## Key Lesson

When building scrollable containers inside flex layouts, always verify the height resolution chain from viewport to target container. `minHeight` breaks `height: 100%` resolution — use viewport-relative units (`dvh`) to bypass broken chains.
