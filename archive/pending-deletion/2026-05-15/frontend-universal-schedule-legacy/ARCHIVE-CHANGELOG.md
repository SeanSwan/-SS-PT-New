# Frontend Universal Schedule Legacy Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

These Universal Master Schedule variants and helper files were not referenced by the active route tree. The active route imports `UniversalMasterSchedule.tsx` and uses `EmergencyAdminScheduleIntegration.tsx` only as a chunk fallback, so these files were misleading alternatives.

## Files

- `README.md`
- `integration-test.js`
- `UniversalMasterSchedule-Modern.tsx`
- `UniversalMasterSchedule-EMERGENCY.tsx`
- `UniversalMasterSchedule.legacy.tsx`

## Restore Rule

Restore only after proving the target route import and confirming the restored variant is the intended canonical schedule implementation.
