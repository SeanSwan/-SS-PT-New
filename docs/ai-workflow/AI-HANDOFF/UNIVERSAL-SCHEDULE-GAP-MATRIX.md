# Universal Master Schedule - Gap Matrix

> **Date:** 2026-02-10
> **Source:** Production Playwright Audit + Code Analysis
> **Reference:** `UNIVERSAL-SCHEDULE-PROD-AUDIT.md`, `UNIVERSAL-SCHEDULE-SYSTEM-MAP.md`

---

## Gap Matrix

| ID | Severity | Category | Current State | Desired State | Root Cause | Affected Files | Effort |
|----|----------|----------|---------------|---------------|------------|----------------|--------|
| F01 | P0 | Responsive | Week grid invisible at 375w, massive empty space | Full week grid renders as single-column stacked cards on mobile | `ScheduleContainer` uses `height: 100%` + `min-height: 0` + `flex: 1` on child `CalendarContainer` with `contain: layout style`. On mobile dashboard embed, parent gives insufficient height. `contain: layout` prevents content from expanding container. | `UniversalMasterSchedule.tsx:812-838`, `ScheduleCalendar.tsx:306-357` | Medium |
| F02 | P0 | Responsive | "Today" button clipped, "Previous" (‹) nav hidden at 375w | All navigation controls visible and tappable at all breakpoints | `ScheduleHeader` navigation row doesn't wrap properly at 375w. Likely `overflow: hidden` or flex container not wrapping. | `ScheduleHeader.tsx` (navigation row styles) | Small |
| F03 | P1 | Responsive | Stats cards single-column at 768w, wasting vertical space | 2x2 grid at tablet, 4-across at desktop, compact summary at mobile | `GridContainer` uses `grid-template-columns: 1fr` at `<768px`. No 2-column intermediate step. | `ui/StyledCard.tsx:118-130`, `ScheduleStats.tsx` | Small |
| F04 | P1 | Data | Agenda shows sessions from all months regardless of current month | Agenda only shows sessions within the viewed date range (current month or visible week) | `AgendaView.tsx` receives `date` prop but never uses it for filtering. Displays ALL sessions in the array. | `AgendaView.tsx:39-66` | Small |
| F05 | P1 | Touch | Trainer filter `<select>` at 36px height | Minimum 44px height on all interactive elements | Native `<select>` element missing explicit height/min-height override in `ScheduleHeader.tsx` | `ScheduleHeader.tsx` (trainer filter select) | Small |
| F06 | P1 | UX | No loading indicator during data fetch | Skeleton UI or spinner while sessions load | `UniversalMasterSchedule.tsx` renders schedule immediately without checking loading state from `useCalendarData` | `UniversalMasterSchedule.tsx`, new `ScheduleSkeleton.tsx` | Medium |
| F07 | P2 | Layout | Massive empty space below week grid in full-page view | Calendar fills available space, no excessive whitespace | `ScheduleContainer` body has `min-height: 100dvh` on mobile but desktop doesn't properly size. Footer renders below with gap. | `UniversalMasterSchedule.tsx:812-838` | Small |
| F08 | P2 | UX | Agenda shows "Open Slot" / "Trainer TBD" entries | Filter out available/unbooked slots from agenda, or provide toggle | `AgendaView` displays all sessions including status=available with no trainer. These should be hidden or togglable. | `AgendaView.tsx` or `ScheduleCalendar.tsx:276` (pre-filter) | Small |
| F09 | P2 | Layout | "Manage" button wraps to second row at 768w | Toolbar controls fit on one line or gracefully collapse | Toolbar flex container doesn't compress items enough at tablet width | `ScheduleHeader.tsx` (toolbar section) | Small |
| F10 | P2 | Auth | Full page nav causes auth flash (momentary unauthenticated state) | Smooth auth restoration without visible flash | Token exists in localStorage but takes time to validate. Schedule route wrapper shows "Verifying access..." during this. | `UniversalSchedule.tsx`, `EmergencyAdminScheduleIntegration` | Small |
| F11 | P2 | API | Notifications endpoint returns 403 | Clean error handling, no console errors | `/notifications` endpoint rejects current auth. Likely CORS or middleware issue. | Backend `notificationRoutes` | Out of scope (backend) |
| F12 | P3 | A11y | Heading hierarchy: h1 → h4 (skips h2, h3) | Proper heading hierarchy: h1 → h2 → h3 | `PrimaryHeading` component renders as h4. Used in `ScheduleStats` and `ScheduleCalendar` where h2/h3 would be correct. | `ScheduleStats.tsx:27`, `ScheduleCalendar.tsx:117`, `ui/StyledCard.tsx` | Small |
| F13 | P3 | A11y | Day numbers (8, 9, 10...) rendered as h4 | Day numbers should be styled text, not heading elements | `PrimaryHeading` used for day numbers in week view, but day numbers are not section headings | `ScheduleCalendar.tsx:156` | Small |
| F14 | P3 | UX | Cancelled sessions show Edit/Cancel buttons in agenda | Hide or disable action buttons on cancelled/completed sessions | `AgendaView.tsx` renders action buttons unconditionally regardless of status | `AgendaView.tsx` (session row rendering) | Small |

---

## Priority Summary

| Priority | Count | Implementation Scope |
|----------|-------|---------------------|
| P0 (Critical) | 2 | Must fix - mobile UX completely broken |
| P1 (High) | 4 | Should fix - significant UX/data issues |
| P2 (Medium) | 5 | Nice to fix - polish and edge cases |
| P3 (Low) | 3 | Cosmetic/semantic improvements |
| **Total** | **14** | |

---

## Dependencies

```
F01 (mobile rendering) → blocks F07 (empty space)
F04 (agenda filtering) → related to F08 (open slot filtering)
F12 (heading hierarchy) → related to F13 (day number headings)
```

---

## Out of Scope

- Backend API changes (except noting F11)
- Auth/RBAC system changes
- Payment/session/booking flow changes
- EW design token migration (tracked separately)
- Real-time WebSocket improvements
- Performance optimization beyond current bottlenecks
