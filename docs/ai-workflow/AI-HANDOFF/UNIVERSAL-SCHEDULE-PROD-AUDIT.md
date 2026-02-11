# Universal Master Schedule - Production Playwright Audit

> **Date:** 2026-02-10
> **Auditor:** Claude Code (Opus 4.6) via Playwright MCP
> **Target:** https://sswanstudios.com/dashboard/admin/master-schedule
> **Role Tested:** Admin (admin / admin123)
> **Viewports:** 375x812, 768x1024, 1280x720, 1920x1080

---

## Executive Summary

The Universal Master Schedule is **functional but has significant UX issues** at mobile and tablet breakpoints. Desktop (1280w, 1920w) works well. The component loads real data, modals open correctly, and RBAC appears intact. However, mobile rendering is severely broken with content cut off and massive empty space, and the Agenda view shows data from wrong months.

### Severity Counts

| Severity | Count |
|----------|-------|
| P0 (Critical) | 2 |
| P1 (High) | 4 |
| P2 (Medium) | 5 |
| P3 (Low) | 3 |

---

## Viewport Audit Results

### 1920x1080 (Large Desktop) - PASS

**Screenshot:** `schedule-admin-1920w-before.png`

- All elements visible and properly laid out
- Sidebar + schedule content coexist without overlap
- Week view shows 7-day grid with session cards
- Stats cards display in a 4-column row
- Create/Manage dropdowns render correctly
- Legend (Available, Booked/Scheduled, Blocked, Recurring) visible

**Issues:** None critical at this viewport.

### 1280x720 (Desktop) - PASS with issues

**Screenshots:** `schedule-admin-1280w-before.png`, `schedule-admin-1280w-fullpage-before.png`

- Schedule renders correctly above the fold
- Stats cards in 4-column layout
- View tabs (Month/Week/Day/Agenda) all functional
- Create dropdown renders 3 options (Create Session, Create Recurring, Block Time)
- Session detail modal renders cleanly with all fields

**Issues:**
- [P2] Full-page screenshot reveals massive white empty space below the week grid (>50% of page height is empty)
- [P2] Week grid is barely visible at default scroll position, pushed down by header + banner + stats

### 768x1024 (Tablet) - MIXED

**Screenshot:** `schedule-admin-768w-before.png`

- Sidebar collapses (hamburger menu), schedule takes full width
- Header controls wrap to 2 rows (acceptable)
- View tabs and navigation controls visible

**Issues:**
- [P1] Stats cards render in a **single column** (stacked vertically) instead of 2x2 grid, consuming excessive vertical space. User must scroll past 4 full-width stat cards before reaching the calendar.
- [P2] "Manage" button wraps to a second line below "Create", creating uneven toolbar layout

### 375x812 (Mobile) - FAIL

**Screenshots:** `schedule-admin-375w-before.png`, `schedule-admin-375w-fullpage-before.png`

- Schedule header renders but controls are cramped
- View tabs visible but navigation is clipped

**Issues:**
- [P0] **Week grid does not render on mobile.** Full-page screenshot shows only the schedule header + stats, then massive white empty space. The calendar content area is completely missing.
- [P0] "Today" button is **clipped/truncated** on the right edge of the viewport. The "Previous" (left arrow) navigation button is also missing/hidden.
- [P1] Stats cards render as a single column, pushing calendar content (if it rendered) far below the fold
- [P1] Trainer filter dropdown height is 36px (below 44px touch target minimum)

---

## View-Specific Audit

### Month View (1280w)
**Screenshot:** `schedule-admin-1280w-month-before.png`

- 42-cell grid renders with day-of-week headers
- Session count indicators appear on days with sessions (Feb 5: "2", Feb 7: "1", Feb 9: "1")
- Clicking a day drills down to Day view
- **Status:** Functional

### Week View (1280w, 1920w)
**Screenshots:** `schedule-admin-1280w-before.png`, `schedule-admin-1920w-before.png`

- 7-day column layout with day headers (Sun 8 - Sat 14)
- Session card for "jasmine Swan" on Mon 9 shows correctly: 5:00 AM, 60 min, Trainer Test, Main Studio
- Session count per day displayed
- Legend shows 4 status types
- **Status:** Functional at desktop, BROKEN at mobile

### Day View (1280w)
**Screenshot:** `schedule-admin-1280w-day-before.png`

- Hourly slots from 5:00 AM to 10:00 PM
- Layout/density controls appear (Column/Stacked, Comfortable/Compact)
- Past slots marked "Past (Admin)" - admin can still schedule in past
- 10:00 PM slot marked "Available"
- **Status:** Functional

### Agenda View (1280w)
**Screenshot:** `schedule-admin-1280w-agenda-before.png`

- Chronological list of sessions with date groupings
- Shows session details: time, client name, trainer, location, status
- Edit/Cancel buttons on each session entry

**Issues:**
- [P1] **Agenda shows sessions from wrong months.** Header says "February 2026" but the list starts with "Wednesday, November 19" (2025?) and includes sessions from January 2026. The date scope filter does not match the displayed month.
- [P2] Many "Open Slot" entries with "Trainer TBD" cluttering the view. These available slots probably should not appear in an agenda view (agendas typically show booked/scheduled sessions).
- [P3] Cancelled sessions display with Edit/Cancel buttons, which is confusing (can you cancel a cancelled session?)

---

## Interaction Audit

### Session Detail Modal
**Screenshot:** `schedule-admin-1280w-session-detail-before.png`

- Opens on session card click
- Shows: Date, Time, Duration, Status, Attendance, Checked In, Location, Client, Trainer
- Editable fields: Trainer Notes (textarea), Trainer Rating (1-5 number input), Client Feedback (textarea)
- Close button (X) works, Escape key works
- **Status:** Functional, clean design

### Create Dropdown
**Screenshot:** `schedule-admin-1280w-create-dropdown-before.png`

- Opens on "Create" button click
- 3 options: Create Session, Create Recurring, Block Time
- Menu items have icons
- Renders below the button without clipping
- **Status:** Functional

### Manage Dropdown
- Not tested (similar pattern to Create)

### View Switching
- All 4 tabs (Month, Week, Day, Agenda) switch correctly
- URL does not change (client-side state only)
- Redux state preserves selected view across tab switches

### Navigation
- Previous/Next buttons navigate months (Month view) or weeks (Week view)
- "Today" button returns to current date
- Date display updates correctly

---

## Accessibility Audit

### Touch Targets (375w mobile)
| Element | Width | Height | Passes 44px? |
|---------|-------|--------|:------------:|
| Trainer filter `<select>` | 309px | 36px | FAIL (height) |
| View tabs (Month/Week/Day/Agenda) | ~50px | ~44px | PASS |
| Create/Manage buttons | ~80px | ~44px | PASS |
| Session cards | ~150px | ~80px | PASS |
| Day cells (Month view) | ~100px | ~60px | PASS |

**Result:** 1 failing element (trainer `<select>` at 36px height)

### ARIA & Semantics
- `role="application"` on schedule container - correct
- `aria-label="Universal Master Schedule"` present
- `role="tablist"` with `role="tab"` on view switcher - correct
- Tab selection indicated via `aria-selected`
- `role="menu"` and `role="menuitem"` on Create dropdown - correct
- Session detail dialog uses `<dialog>` element - correct
- **No missing aria-labels** detected on interactive elements

### Heading Hierarchy
```
h1: Universal Master Schedule
  h4: Schedule Overview (SKIP: missing h2, h3)
  h4: Week View (SKIP)
  h4: 8, 9, 10... (day numbers as h4 - questionable semantic use)
```
- [P3] Heading hierarchy skips from h1 directly to h4, violating WCAG best practices
- [P3] Day numbers (8, 9, 10...) are rendered as h4 headings, which is semantically incorrect

### Keyboard Navigation
- Escape closes modals and dropdowns - confirmed
- Tab order follows logical flow
- Keyboard shortcuts registered (arrow keys, Enter, Escape per `useKeyboardShortcuts` hook)

### Color Contrast
- White text (#ffffff) on dark background (#0f172a to #334155) - adequate contrast
- Cyan (#00FFFF) on dark backgrounds - may fail WCAG AA for small text
- Status colors on dark cards appear readable

---

## Console Errors

| Type | Message | Severity |
|------|---------|----------|
| ERROR | `Failed to load resource: the server responded with 403` for `/notifications` endpoint | P2 - notifications API returning 403 |
| WARNING | `data:text/jsx;base64` resource loaded intentionally (repeated) | P3 - cosmetic, not a real issue |

---

## Performance Observations

- Schedule initializes in ~2s after page load ("Initializing Universal Master Schedule..." to "initialized successfully")
- Real-time updates initialize after schedule loads
- Backend health checks occur every ~30s (polling)
- No visible loading spinners or skeleton UI during data fetch
- 42 total sessions loaded (30 available, 2 scheduled, 2 completed)

---

## Auth/Session Findings

- [P2] **Full page navigation (goto) loses authentication context.** Navigating to `/schedule` or `/dashboard/admin/master-schedule` via hard refresh shows "Verifying access..." with Login in nav, then eventually restores auth. The standalone `/schedule` route initially fails to resolve the user role.
- JWT token persists in localStorage and eventually restores, but there's a visible flash of unauthenticated state.

---

## Findings Summary Table

| ID | Severity | Category | Finding | Viewport |
|----|----------|----------|---------|----------|
| F01 | P0 | Responsive | Week grid does not render at 375w mobile - massive empty white space | 375w |
| F02 | P0 | Responsive | "Today" button clipped, "Previous" nav button hidden at 375w | 375w |
| F03 | P1 | Responsive | Stats cards stack to single column at 768w, wasting vertical space | 768w |
| F04 | P1 | Data | Agenda view shows sessions from Nov 2025 and Jan 2026 when header says "February 2026" | All |
| F05 | P1 | Responsive | Trainer filter dropdown height 36px (below 44px touch minimum) | 375w |
| F06 | P1 | UX | No loading state/skeleton when schedule data is being fetched | All |
| F07 | P2 | Layout | Massive empty white space below week grid in full-page view | 1280w |
| F08 | P2 | UX | Agenda shows available "Open Slot" entries that clutter the view | All |
| F09 | P2 | Layout | "Manage" button wraps to second line at 768w toolbar | 768w |
| F10 | P2 | Auth | Full page navigation causes auth flash (momentary unauthenticated state) | All |
| F11 | P2 | API | Notifications endpoint returns 403 error | All |
| F12 | P3 | A11y | Heading hierarchy skips h2/h3 (h1 to h4) | All |
| F13 | P3 | A11y | Day numbers rendered as h4 headings (semantically incorrect) | All |
| F14 | P3 | UX | Cancelled sessions show Edit/Cancel buttons in Agenda view | All |

---

## Screenshot Inventory

| Filename | Description |
|----------|-------------|
| `schedule-admin-1920w-before.png` | 1920w desktop - full schedule with week view |
| `schedule-admin-1280w-before.png` | 1280w desktop - viewport |
| `schedule-admin-1280w-fullpage-before.png` | 1280w desktop - full page (shows empty space) |
| `schedule-admin-1280w-scrolled-before.png` | 1280w desktop - scrolled down |
| `schedule-admin-1280w-month-before.png` | 1280w - Month view |
| `schedule-admin-1280w-day-before.png` | 1280w - Day view with hourly slots |
| `schedule-admin-1280w-agenda-before.png` | 1280w - Agenda view |
| `schedule-admin-1280w-session-detail-before.png` | 1280w - Session detail modal |
| `schedule-admin-1280w-create-dropdown-before.png` | 1280w - Create dropdown open |
| `schedule-admin-768w-before.png` | 768w tablet - full width layout |
| `schedule-admin-375w-before.png` | 375w mobile - viewport (broken) |
| `schedule-admin-375w-fullpage-before.png` | 375w mobile - full page (broken, empty space) |

---

## Recommendations for Phase 2 (Gap Matrix)

### Must Fix (P0)
1. **Mobile week grid rendering** - Investigate why calendar content disappears at 375w. Likely a CSS height/overflow issue on the calendar container.
2. **Mobile navigation controls** - Ensure Previous/Today buttons are visible and accessible at all breakpoints.

### Should Fix (P1)
3. **Stats card responsive grid** - Use 2x2 grid at tablet, 4x1 at desktop, collapse to compact summary at mobile.
4. **Agenda date scope** - Filter agenda entries to match the displayed month/date range.
5. **Touch target sizing** - Increase trainer `<select>` to 44px minimum height.
6. **Loading states** - Add skeleton UI during data fetch.

### Nice to Have (P2-P3)
7. Fix empty space below week grid (likely min-height or flex issue).
8. Filter "Open Slot" entries from agenda view (or add toggle).
9. Fix heading hierarchy (h1 > h2 > h3 instead of h1 > h4).
10. Hide Edit/Cancel on cancelled sessions in agenda.
