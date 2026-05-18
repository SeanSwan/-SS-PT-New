# Frontend Unreferenced Lint Candidates 4

Archived on 2026-05-17 during the frontend-only cleanup pass.

Scope:
- Files were selected from the current ESLint report only after `rg` showed no external active `frontend/src` references by component basename.
- Backend was not touched.
- These files are preserved for recovery and review instead of being deleted.

Verification notes:
- `RealTimeConnectionStatus` had only self references in `frontend/src/components/UniversalMasterSchedule/RealTimeConnectionStatus.tsx`.
- The workout progress chart files had only self references under `frontend/src/pages/workout/components/progress/`.
- No route mount or parent index export was found for this slice.
