# Unmounted MCP UI Archive - 2026-05-15

## Scope

Moved MCP-heavy UI surfaces that were not mounted by `frontend/src/routes/main-routes.tsx`, not imported by active dashboard route trees, and only referenced by their own local barrels/tests.

## Archived Files

- `frontend/src/components/AIDashboard`
- `frontend/src/components/AIFeaturesDashboard`
- `frontend/src/components/Gamification/GamificationDisplay.tsx`
- `frontend/src/components/WorkoutGenerator`
- `frontend/src/pages/OverwatchGamificationHub.tsx`

## Reason

These surfaces referenced legacy MCP status, MCP services, or old AI dashboard concepts and were not active runtime paths. Keeping them under `frontend/src` made route and AI audits repeatedly classify them as possible live surfaces.

## Verification

`rg` checks before moving found no active route mounts or external imports for these files. The active workout, gamification, and AI workflows remain in the canonical dashboard and first-party API surfaces.
