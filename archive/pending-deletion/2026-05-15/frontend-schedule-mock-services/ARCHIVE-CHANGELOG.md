# Frontend Schedule Mock Services Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

The canonical schedule path now uses `UniversalSchedule` and `universal-master-schedule-service.ts`. These older schedule services contained local mock toggles and automatic mock fallback behavior that could mask API failures and confuse route analysis.

## Files

- `schedule-service.ts`
- `enhanced-schedule-service.js`
- `enhanced-schedule-service-safe.js`

## Restore Rule

Restore only if an explicit local simulator is needed, and keep it outside the production import graph.
