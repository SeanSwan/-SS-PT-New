# Universal Master Schedule - Changelog

**Date:** 2026-02-11
**Commit scope:** `fix(schedule): resolve inner scroll bug + theme alignment`

## Changes Summary

### Scroll Fix (P0 Blocker)

| File | Change | Impact |
|------|--------|--------|
| `UniversalMasterSchedule.tsx` | `height: 100%` → `calc(100dvh - 80px)`, removed `transform: translateZ(0)` | Enables inner scroll |
| `ScheduleCalendar.tsx` | `overflow: auto` → `overflow-x: auto; overflow-y: visible` | Delegates vertical scroll to parent |
| `ScheduleHeader.tsx` | Removed `transform: translateZ(0)` | Fixes scroll input routing |
| `DragDropManager.tsx` | Added `TouchSensor` with delay constraint | Touch scroll works alongside drag |
| `AgendaView.tsx` | Removed nested `max-height` + `overflow-y: auto` | Eliminates scroll-within-scroll |
| `ViewSelector.tsx` | Added `position: sticky; top: 0; z-index: 5` | View tabs persist during scroll |

### Theme Alignment (P1)

| File | Change | Impact |
|------|--------|--------|
| `ui/Typography.tsx` | Replaced hardcoded `#ffffff`, `#3b82f6`, `#94a3b8` → Galaxy-Swan tokens | Consistent theming |
| `ui/StyledButton.tsx` | Focus-visible + PrimaryButton gradient → theme tokens | Brand consistency |
| `ui/Spinner.tsx` | Spinner color `#3b82f6` → `galaxySwanTheme.primary.main` | Brand consistency |
| `ui/StyledCard.tsx` | StatCard colors → theme tokens | Brand consistency |
| `components/ScheduleStats.tsx` | Inline color overrides → theme tokens | Brand consistency |

### Files Modified (11 total)

1. `frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx`
2. `frontend/src/components/UniversalMasterSchedule/components/ScheduleCalendar.tsx`
3. `frontend/src/components/UniversalMasterSchedule/components/ScheduleHeader.tsx`
4. `frontend/src/components/UniversalMasterSchedule/DragDrop/DragDropManager.tsx`
5. `frontend/src/components/UniversalMasterSchedule/Views/AgendaView.tsx`
6. `frontend/src/components/UniversalMasterSchedule/Views/ViewSelector.tsx`
7. `frontend/src/components/UniversalMasterSchedule/ui/Typography.tsx`
8. `frontend/src/components/UniversalMasterSchedule/ui/StyledButton.tsx`
9. `frontend/src/components/UniversalMasterSchedule/ui/Spinner.tsx`
10. `frontend/src/components/UniversalMasterSchedule/ui/StyledCard.tsx`
11. `frontend/src/components/UniversalMasterSchedule/components/ScheduleStats.tsx`

### Build & Test Results

- **Frontend build:** PASS (6.93s, Vite)
- **Frontend tests:** 25/25 PASS (vitest)
- **Type check:** No new errors introduced
- **Playwright QA:** Before-deploy screenshots captured at 375w, 768w, 1280w, 1920w
