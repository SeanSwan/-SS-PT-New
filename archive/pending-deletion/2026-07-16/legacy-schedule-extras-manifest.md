# Legacy Schedule Extras Archive - 2026-07-16

## Purpose

This companion manifest records a closed 23-file Universal Master Schedule analytics, hooks, fallback, and alternate-integration island moved during the pre-launch audit. Original paths remain recoverable; no source file was permanently deleted.

## Evidence

- Fallow classified every archived runtime module as `UNREACHABLE`; every export from the dead hooks and analytics barrels was unused.
- Resolved-import tracing found that the archived modules were referenced only by their dead barrels, by one another inside the closed island, or by source-reading tests archived or narrowed in the same slice.
- `UniversalMasterSchedule.tsx` directly imports `hooks/useCalendarData.ts`; that reachable hook and all of its focused tests remain active.
- The dashboard route tree mounts `Schedule/UniversalSchedule.tsx`, not `AdminScheduleIntegration.tsx`; the emergency schedule route continues to use `EmergencyAdminScheduleIntegration.tsx`.
- Exact filename, symbol, route, entrypoint, and package-script searches found no runtime launcher outside the closed island.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/UniversalMasterSchedule/AdminScheduleIntegration.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/AdminScheduleIntegration.tsx` | unmounted alternate admin schedule integration |
| `frontend/src/components/UniversalMasterSchedule/AdminScheduleIntegration.retryContract.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/AdminScheduleIntegration.retryContract.test.ts` | source-only contract for the unmounted integration |
| `frontend/src/components/UniversalMasterSchedule/BulkSessionCreator.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/BulkSessionCreator.tsx` | unreachable bulk-session component |
| `frontend/src/components/UniversalMasterSchedule/Analytics/AdvancedAnalyticsDashboard.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/Analytics/AdvancedAnalyticsDashboard.tsx` | dependency used only by the dead analytics barrel |
| `frontend/src/components/UniversalMasterSchedule/Analytics/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/Analytics/index.ts` | unreachable analytics barrel |
| `frontend/src/components/UniversalMasterSchedule/Analytics/SocialIntegrationAnalytics.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/Analytics/SocialIntegrationAnalytics.tsx` | dependency used only by the dead analytics barrel |
| `frontend/src/components/UniversalMasterSchedule/Analytics/TrainerPerformanceAnalytics.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/Analytics/TrainerPerformanceAnalytics.tsx` | dependency used only by the dead analytics barrel |
| `frontend/src/components/UniversalMasterSchedule/CalendarFallback/CalendarFallback.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/CalendarFallback/CalendarFallback.tsx` | unreachable alternate calendar fallback |
| `frontend/src/components/UniversalMasterSchedule/CalendarFallback/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/CalendarFallback/index.ts` | barrel used only by the dead fallback |
| `frontend/src/components/UniversalMasterSchedule/hooks/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/index.ts` | unreachable legacy hooks barrel |
| `frontend/src/components/UniversalMasterSchedule/hooks/useAdminNotifications.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useAdminNotifications.ts` | hook consumed only by the dead barrel |
| `frontend/src/components/UniversalMasterSchedule/hooks/useBulkOperations.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useBulkOperations.ts` | hook consumed only by the dead barrel |
| `frontend/src/components/UniversalMasterSchedule/hooks/useBusinessIntelligence.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useBusinessIntelligence.ts` | hook consumed only by the dead barrel |
| `frontend/src/components/UniversalMasterSchedule/hooks/useBusinessIntelligence.exportContract.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useBusinessIntelligence.exportContract.test.ts` | source-only contract for the dead hook |
| `frontend/src/components/UniversalMasterSchedule/hooks/useCalendarHandlers.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useCalendarHandlers.ts` | hook consumed only by the dead barrel |
| `frontend/src/components/UniversalMasterSchedule/hooks/useCalendarHandlers.gamificationContract.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useCalendarHandlers.gamificationContract.test.ts` | source-only contract for the dead hook |
| `frontend/src/components/UniversalMasterSchedule/hooks/useCalendarState.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useCalendarState.ts` | hook consumed only by the dead barrel |
| `frontend/src/components/UniversalMasterSchedule/hooks/useCollaborativeScheduling.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useCollaborativeScheduling.ts` | hook consumed only by the dead barrel |
| `frontend/src/components/UniversalMasterSchedule/hooks/useFilteredCalendarEvents.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useFilteredCalendarEvents.ts` | hook consumed only by the dead barrel |
| `frontend/src/components/UniversalMasterSchedule/hooks/useFilteredCalendarEvents.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useFilteredCalendarEvents.test.tsx` | focused test for the dead hook |
| `frontend/src/components/UniversalMasterSchedule/hooks/useMicroInteractions.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useMicroInteractions.ts` | dependency used only by dead hook code |
| `frontend/src/components/UniversalMasterSchedule/hooks/useMobileCalendarOptimization.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useMobileCalendarOptimization.ts` | hook consumed only by the dead barrel |
| `frontend/src/components/UniversalMasterSchedule/hooks/useRealTimeUpdates.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useRealTimeUpdates.ts` | hook consumed only by the dead barrel |

## Canonical surface retained

`frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx`, `hooks/useCalendarData.ts`, the schedule service layer, session-detail workflow, and `EmergencyAdminScheduleIntegration.tsx` remain in place.

## Restore procedure

Restore only after proving a distinct mounted product need and reconnecting the complete dependency chain. Then rerun schedule route contracts, lifecycle billing tests, typecheck, build, full frontend tests, lint, and browser smoke.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.
