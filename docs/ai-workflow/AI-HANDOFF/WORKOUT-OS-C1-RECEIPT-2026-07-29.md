---
decision: "C1 excision: dormant /workout stack + /workout-builder + outlet wrapper + mobile placeholder removed with role-aware redirect shims; shared types relocated; CorrectiveRecommendationsPanel kept dormant for C4/C6 re-surfacing"
status: shipped
supersedes: none
---

# WORKOUT OS — C1 Receipt: Dead-Surface Excision (2026-07-29)

Branch `claude/workout-os-build-20260729`. 60 files removed, git-recoverable. Authorized by Sean's 2026-07-29 full-refactor approval + §12.2 "excise early" ruling.

## Per-surface receipts (grep evidence before removal)

| Surface | Mount evidence | External importers found | Action |
|---|---|---|---|
| `pages/workout/**` (dormant dashboard stack, name-colliding `WorkoutPlanner.tsx`) | `main-routes.tsx:847` `/workout`, `:857` `/workout/:userId` (any authed role); lazy `:252` | ONLY `services/workout-planner-service.ts:8` + `services/workout-session-service.ts:8` — **type-only imports** | Types moved to `services/types/{plan,session}.types.ts` (git mv, imports updated); rest deleted; routes → role-aware shim |
| `components/WorkoutBuilder/**` (17 files) | `main-routes.tsx:646` `/workout-builder` (trainer/admin); lazy `:203` | `main-routes.tsx` + own tests + `CorrectiveRecommendationsPanel.styleExtraction.test.ts` (pin, rewritten) | Deleted; route → shim to role's Workout Planner |
| `DashBoard/workspaces/WorkoutOutletWrapper.tsx` | none (0 importers) | none | Deleted |
| `WorkoutLogger/MobileWorkoutLogger.tsx` (38-ln placeholder) | none (0 importers) | none | Deleted |

**False-positive pins verified live-API/live-helper, untouched:** 4 admin-workout-planner tests reference backend `/api/workout-builder/*` endpoints (the canonical planner's generation API — stays); 2 UserDashboard tests match only by substring (`getLogWorkoutDashboardPath`).

## Redirect shims (`main-routes.tsx`, `LegacyWorkoutRedirect`)
- `/workout`, `/workout/:userId` → client `/dashboard/client/workouts`; trainer/admin → role `client-progress`; unknown → `/dashboard`.
- `/workout-builder` → role Workout Planner (trainer/admin; ProtectedRoute gate preserved).
- Old contract pin replaced with its inverse: the dead mount must NOT return (`CorrectiveRecommendationsPanel.styleExtraction.test.ts`).

## Capability preservation ruling
`CorrectiveRecommendationsPanel` (+ `.styles`) lost its only consumer (the excised builder) but embodies the OHSA→corrective-recommendation capability. **KEPT, classified dormant**, slated for re-surfacing in C4 (Session Runner pain lane) or C6 (suggested-engine trainer surface). Nothing else removed had a live capability (receipts above).

## Gates
- `tsc --noEmit` exit 0 (full repo; `NODE_OPTIONS=--max-old-space-size=16384` — 8GB OOMs on this repo, real exit code checked per the W3 lying-gate gotcha).
- `npm run build` exit 0 (vite, 15.7s).
- Vitest: **92 files / 524 tests green** (entire `WorkoutLogger` dir + `mcp-retirement` + `no-dead-people-routes` + `sidebarRouteParity`).
