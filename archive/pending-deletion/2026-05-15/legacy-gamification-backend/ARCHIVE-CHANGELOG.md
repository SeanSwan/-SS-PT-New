# Legacy Gamification Backend Archive - 2026-05-15

## Scope

Moved the standalone `gamification-backend` service out of the repo root after reference checks found no active mounts, scripts, package references, or Render deployment paths.

## Archived Folder

- `gamification-backend` -> `archive/pending-deletion/2026-05-15/legacy-gamification-backend/gamification-backend`

## Runtime Replacement

The active app uses the main backend gamification routes mounted from `backend/core/routes.mjs`, including `/api/v1/gamification` and related API services.

## Verification

`rg -n "gamification-backend"` found only documentation and hygiene inventory references before the move.
