# Legacy Nested Workout Planner Archive - 2026-07-16

## Purpose

This companion manifest records the closed nested workout-planner implementation moved during the pre-launch audit. Original paths remain recoverable; no source file was permanently deleted.

## Evidence

- `/workout/:userId` mounts `pages/workout/WorkoutDashboard.tsx`, which imports the top-level `components/WorkoutPlanner.tsx` file.
- Exact path and symbol searches found no runtime import for the nested `components/WorkoutPlanner/` directory or the three archived state hooks.
- The only external consumer was `workoutConfirmations.contract.test.ts`, which read the dead implementation as source text and was archived with it.
- A later mounted-provider audit proved `store/slices/workoutSlice.ts` and `hooks/useWorkoutProgress.ts` form a separate unreachable state island; their archive is recorded in `dormant-workout-state-island-manifest.md`.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/pages/workout/components/WorkoutPlanner/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/components/WorkoutPlanner/index.ts` | unused barrel for the nested legacy planner |
| `frontend/src/pages/workout/components/WorkoutPlanner/WorkoutPlanner.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/components/WorkoutPlanner/WorkoutPlanner.tsx` | unmounted duplicate planner root |
| `frontend/src/pages/workout/components/WorkoutPlanner/components/DaySelector.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/components/WorkoutPlanner/components/DaySelector.tsx` | dependency used only by the duplicate planner |
| `frontend/src/pages/workout/components/WorkoutPlanner/components/ExerciseList.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/components/WorkoutPlanner/components/ExerciseList.tsx` | dependency used only by the duplicate planner |
| `frontend/src/pages/workout/components/WorkoutPlanner/components/PlanForm.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/components/WorkoutPlanner/components/PlanForm.tsx` | dependency used only by the duplicate planner |
| `frontend/src/pages/workout/components/WorkoutPlanner/components/PlanHeader.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/components/WorkoutPlanner/components/PlanHeader.tsx` | dependency used only by the duplicate planner |
| `frontend/src/pages/workout/components/WorkoutPlanner/components/PlanList.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/components/WorkoutPlanner/components/PlanList.tsx` | dependency used only by the duplicate planner |
| `frontend/src/pages/workout/components/WorkoutPlanner/components/SaveControls.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/components/WorkoutPlanner/components/SaveControls.tsx` | dependency used only by the duplicate planner |
| `frontend/src/pages/workout/hooks/useWorkoutPlannerState.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/hooks/useWorkoutPlannerState.ts` | unconsumed state hook for the duplicate planner |
| `frontend/src/pages/workout/hooks/useWorkoutSessionsState.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/hooks/useWorkoutSessionsState.ts` | unconsumed legacy sessions hook |
| `frontend/src/pages/workout/hooks/useDashboardState.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/hooks/useDashboardState.ts` | unconsumed legacy dashboard hook |
| `frontend/src/pages/workout/hooks/workoutConfirmations.contract.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/workout/hooks/workoutConfirmations.contract.test.ts` | source-only contract for the dead island |

## Canonical surface retained

The route-mounted `frontend/src/pages/workout/components/WorkoutPlanner.tsx`, its logic/styles/tests, `WorkoutDashboard.tsx`, and the active Redux workout slice remain in place.

## Restore procedure

Restore only after proving a distinct mounted product need and reconnecting the complete component/hook chain, then rerun workout route contracts, typecheck, build, full frontend tests, lint, and browser smoke.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.
