# Frontend Client Dashboard Stale Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

This enhanced workouts section was unreferenced by the active client dashboard route tree and contained mock workout plans/exercises. The canonical client dashboard imports `MyWorkoutsSection.tsx`, not this enhanced variant.

## Files

- `EnhancedMyWorkoutsSection.tsx`

## Restore Rule

Restore only after proving the canonical route should mount it and replacing mock workout data with real API-backed contracts.
