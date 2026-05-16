# Frontend Gamification Stale Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

These files were explicitly stale, unreferenced by active frontend imports, or destructive one-off migration scripts. They contained mock gamification profile data, duplicated analytics ideas, or source-mutating behavior that could mislead future dashboard work.

## Files

- `useGamificationData-fixed.ts`
- `EnhancedSystemAnalytics.tsx`
- `update-gamification-views.js`

## Restore Rule

Restore only for historical comparison. Active gamification work should use the canonical hook/service path, the mounted `SystemAnalytics` implementation, and real API contracts.
