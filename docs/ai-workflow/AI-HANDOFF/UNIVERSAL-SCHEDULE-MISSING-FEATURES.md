# Universal Master Schedule - Missing Features & Gap Analysis

**Date:** 2026-02-11
**Analyst:** Claude Code (Opus 4.6)

## Feature Gap Matrix

### Priority Legend
- **P0:** Required for launch / blocking clients
- **P1:** Important for professional experience
- **P2:** Nice-to-have enhancement
- **P3:** Future roadmap

---

### Missing Features

| # | Feature | Priority | Role | Description | Suggested Implementation |
|---|---------|----------|------|-------------|--------------------------|
| 1 | Print/PDF Export | P2 | Admin, Trainer | No print stylesheet or PDF export for schedule views | Add `@media print` styles + react-to-print integration |
| 2 | CSV Session Export | P2 | Admin | Export button exists but full CSV generation unclear | Wire ScheduleExport.tsx to generate downloadable CSV |
| 3 | Trainer Approval UI | P2 | Trainer | No dedicated approval queue for session requests | Add approval tab/filter in Agenda view for pending requests |
| 4 | Calendar Sync (iCal) | P3 | All | No external calendar integration | Generate .ics download or Google Calendar API integration |
| 5 | Session Notes | P2 | Trainer | No inline notes for individual sessions | Add notes field to SessionDetailPanel |
| 6 | Recurring Session Edit | P2 | Admin | Can create recurring but editing series is limited | Add "Edit all in series" option to session context menu |
| 7 | Session Conflict Detection | P1 | Admin | Double-booking prevention not visually indicated | Add visual overlap warning in Day/Week views |
| 8 | Keyboard Navigation | P1 | All | Tab navigation through calendar cells is limited | Add arrow key navigation between days/sessions |
| 9 | Session Search/Filter | P2 | Admin | No text search within schedule | Add search input to header with client/trainer name filter |
| 10 | Undo/Redo for Drag | P3 | Admin | No undo after drag-and-drop reschedule | Implement action stack with Ctrl+Z support |

### Existing Features That Need Polish

| # | Feature | File | Issue | Fix Needed |
|---|---------|------|-------|------------|
| 1 | AdvancedFilter | AdvancedFilter.tsx | Uses MUI components | Refactor to styled-components (P2) |
| 2 | Session Cards | WeekView.tsx | Some lack ARIA descriptions | Add `aria-label` with session details (P1) |
| 3 | Empty State | MonthView.tsx | Generic "no sessions" message | Add contextual empty states per role (P2) |
| 4 | Error Boundaries | UniversalMasterSchedule.tsx | Exists but generic | Add schedule-specific recovery UI (P2) |
| 5 | Loading States | ScheduleCalendar.tsx | Uses generic spinner | Add skeleton loading for calendar grid (P3) |

### Features Present and Working Well

| Feature | Rating | Notes |
|---------|--------|-------|
| Month/Week/Day/Agenda views | Excellent | All 4 views functional, responsive |
| Drag-and-drop | Excellent | @dnd-kit with Pointer + Touch + Keyboard sensors |
| Real-time updates | Good | Polling-based, functional |
| Role-based filtering | Excellent | Admin/Trainer/Client views properly scoped |
| Session creation | Good | Modal with recurring support |
| Bulk operations | Good | Multi-select with batch actions |
| Credit display (client) | Good | Shows remaining credits with low warning |
| Stats overview | Good | Total/Available/Scheduled/Completed counts |
| Responsive layout | Good | Works across all tested breakpoints |
| Theme integration | Excellent (after fix) | All colors now use Galaxy-Swan tokens |

## Recommendations for Next Sprint

1. **P1: Session Conflict Detection** - Prevent double-bookings with visual overlap warning
2. **P1: Keyboard Navigation** - Arrow keys through calendar for accessibility compliance
3. **P2: AdvancedFilter MUI Removal** - Last remaining MUI dependency in schedule
4. **P2: Print Stylesheet** - Trainers frequently print weekly schedules
5. **P2: Session Notes** - Trainers need to record session-specific notes
