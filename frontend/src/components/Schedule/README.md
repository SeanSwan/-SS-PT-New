# Schedule Compatibility Surface

The canonical SwanStudios schedule implementation is:

- `UniversalSchedule.tsx`
- `../UniversalMasterSchedule/UniversalMasterSchedule.tsx`
- `../../services/universal-master-schedule-service.ts`

Legacy imports through `components/Schedule`, `ScheduleContainer`, or
`schedule.tsx` are retained as compatibility shims and should delegate to
`UniversalSchedule`.

Do not reintroduce the archived mock-backed schedule services from
`archive/pending-deletion/2026-05-15/frontend-schedule-mock-services/` into the
production import graph.
