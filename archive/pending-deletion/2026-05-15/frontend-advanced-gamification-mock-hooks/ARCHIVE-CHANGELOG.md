# Frontend Advanced Gamification Mock Hooks Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

These unreferenced AdvancedGamification hooks defaulted to local sample challenge data in development and mutated in-memory participation records. The mounted social/community challenge surfaces use the canonical `frontend/src/hooks/useChallenges.ts` path instead.

## Files

- `frontend/src/components/AdvancedGamification/hooks/useChallenges.tsx`
- `frontend/src/components/AdvancedGamification/hooks/admin/useAdminChallenges.tsx`
- `frontend/src/components/AdvancedGamification/utils/mockData.ts`

## Restore Rule

Restore only as isolated fixtures for storybook/test development. Do not reconnect these sample challenge records to live user dashboard, community, admin gamification, or reward flows.
