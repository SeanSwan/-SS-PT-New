# Universal Master Schedule - Implementation Plan

> **Date:** 2026-02-10
> **Phase:** 3 - Implementation
> **Prerequisite docs:** `UNIVERSAL-SCHEDULE-SYSTEM-MAP.md`, `UNIVERSAL-SCHEDULE-PROD-AUDIT.md`, `UNIVERSAL-SCHEDULE-GAP-MATRIX.md`

---

## Implementation Order

Fixes are ordered by severity (P0 first) and dependency chain.

---

### Fix 1: Mobile Calendar Rendering (F01) - P0

**Problem:** Week grid invisible at 375w with massive empty space below stats.

**Root Cause:** `ScheduleContainer` uses `height: 100%` + `min-height: 0` as a flex child. `CalendarContainer` uses `flex: 1` + `contain: layout style`. On mobile dashboard embed, the parent doesn't give enough height and `contain: layout` prevents content from expanding.

**Fix:**
1. In `UniversalMasterSchedule.tsx:812-838`: Remove `min-height: 0` from `ScheduleContainer`. Change mobile media query from `min-height: 100dvh` to `height: auto; min-height: auto`.
2. In `ScheduleCalendar.tsx:306-357`: Change `CalendarContainer` from `flex: 1` to `flex: 1 0 auto` (don't shrink). Remove `contain: layout style` on mobile. Change `contain: layout style` to just `contain: style` globally (layout containment prevents the container from sizing to its content).

**Files:** `UniversalMasterSchedule.tsx`, `ScheduleCalendar.tsx`

---

### Fix 2: Mobile Navigation Controls (F02) - P0

**Problem:** "Today" button clipped, "Previous" nav hidden at 375w.

**Root Cause:** `DateLabel` has fixed `width: 220px` at 480px. With Previous (44px) + DateLabel (220px) + Next (44px) + gap + TodayButton, total exceeds 375px container width.

**Fix:**
1. In `ViewSelector.tsx:284-301`: Change `DateLabel` from fixed `width` to `flex: 1; min-width: 0; text-overflow: ellipsis; overflow: hidden;` so it flexes to available space.
2. In `ViewSelector.tsx:228-243`: Add `flex-wrap: wrap` at 480px breakpoint so controls can wrap to two rows if needed.

**Files:** `ViewSelector.tsx`

---

### Fix 3: Stats Card Responsive Grid (F03) - P1

**Problem:** Stats cards single-column at 768w, wasting vertical space.

**Root Cause:** `GridContainer` in `ui/StyledCard.tsx:127-129` forces `1fr` below 768px.

**Fix:**
1. In `StyledCard.tsx:118-130`: Add intermediate breakpoint - `repeat(2, 1fr)` at `<768px` and `1fr` at `<480px` only.

**Files:** `ui/StyledCard.tsx`

---

### Fix 4: Agenda Date Filtering (F04) - P1

**Problem:** Agenda shows sessions from all months regardless of current month.

**Root Cause:** `AgendaView.tsx` receives `date` prop but never filters sessions by it.

**Fix:**
1. In `AgendaView.tsx:46-66`: Filter sessions to show only those within the current month (or a reasonable range like current month +/- 1 week).
2. Use the `date` prop to compute the visible date range.

**Files:** `AgendaView.tsx`

---

### Fix 5: Touch Target Sizing (F05) - P1

**Problem:** Multiple interactive elements below 44px minimum.

**Root Cause:** `TrainerSelect` (36px), `ScopeButton` (36px), `ToggleButton` (32px) all undersized.

**Fix:**
1. `ScheduleHeader.tsx:455`: Change `TrainerSelect` min-height from `36px` to `44px`.
2. `ScheduleHeader.tsx:368`: Change `ScopeButton` min-height from `36px` to `44px`.
3. `ScheduleHeader.tsx:420-421`: Change `ToggleButton` from `32px` to `36px` desktop, `44px` mobile.
4. `ViewSelector.tsx:313`: Change `TodayButton` min-height from `36px` to `44px`.
5. `ScheduleHeader.tsx:339`: Change `MenuItemButton` min-height from `40px` to `44px`.

**Files:** `ScheduleHeader.tsx`, `ViewSelector.tsx`

---

### Fix 6: Loading State (F06) - P1

**Problem:** No loading indicator during data fetch.

**Fix:**
1. Check if `useCalendarData` returns a loading state. If so, render a skeleton/spinner when loading.
2. Add a minimal inline skeleton (pulsing cards) in `UniversalMasterSchedule.tsx` before the calendar renders.

**Files:** `UniversalMasterSchedule.tsx`

---

### Fix 7: Empty Space Below Calendar (F07) - P2

**Problem:** Massive whitespace below week grid.

**Fix:** Addressed by Fix 1 (CalendarContainer containment fix). Additionally ensure `ScheduleContainer` doesn't force a min-height that creates whitespace.

**Files:** Same as Fix 1

---

### Fix 8: Agenda Open Slot Filtering (F08) - P2

**Problem:** "Open Slot" / "Trainer TBD" entries clutter agenda.

**Fix:**
1. In `AgendaView.tsx` or pre-filter in `ScheduleCalendar.tsx:276`: Filter out sessions with status `available` and no assigned client from the agenda view.
2. Alternatively, filter them in the `limitedSessions` passed to AgendaView.

**Files:** `ScheduleCalendar.tsx` or `AgendaView.tsx`

---

### Fix 9: Toolbar Wrapping (F09) - P2

**Problem:** "Manage" button wraps to second row at 768w.

**Fix:**
1. In `ScheduleHeader.tsx:307-332`: Adjust `HeaderActions` to use `flex-wrap: nowrap` at tablet with smaller button text, or allow graceful 2-row wrapping with center alignment.

**Files:** `ScheduleHeader.tsx`

---

### Fix 10: Heading Hierarchy (F12, F13) - P3

**Problem:** h1 jumps to h4, day numbers as h4.

**Fix:**
1. Change `PrimaryHeading` usage in `ScheduleStats.tsx:27` to use `h2` level.
2. Change `PrimaryHeading` usage in `ScheduleCalendar.tsx:117,156` to use `h2`/`h3` or styled span for day numbers.

**Files:** `ScheduleStats.tsx`, `ScheduleCalendar.tsx`

---

### Fix 11: Cancelled Session Actions (F14) - P3

**Problem:** Cancelled sessions show Edit/Cancel buttons in agenda.

**Fix:**
1. In `AgendaView.tsx`: Conditionally render action buttons only for non-terminal statuses (exclude `cancelled`, `completed`).

**Files:** `AgendaView.tsx`

---

## Non-Goals (Explicitly Excluded)

- No backend API changes
- No auth/RBAC modifications
- No payment/booking flow changes
- No EW design token migration (separate effort)
- No new features (only fixes and UX improvements)

## Testing Plan

After implementation:
1. Run `cd frontend && npx tsc --noEmit` - TypeScript check
2. Run `cd frontend && npm run build` - Vite build
3. Run `cd frontend && npx vitest run --reporter verbose` - Unit tests
4. Run `cd backend && npm test` - Backend tests (regression check)
5. Playwright visual verification at all 4 viewports
6. Touch target re-audit
7. Console error check
