# Dormant Workout State Island Archive - 2026-07-16

## Purpose

This companion manifest records the two-file workout Redux island moved during the pre-launch audit. Both original paths remain recoverable below `archive/pending-deletion/2026-07-16/`; no file was permanently deleted.

## Mounted-provider evidence

- `App.tsx:54` imports the canonical `redux/store.ts`, and `App.tsx:239` mounts that exact store in the application `Provider`.
- The canonical reducer registry at `redux/store.ts:21-26` has no `workout` key.
- The active competing store registry at `store/index.ts:21-26` also has no `workout` key.
- `useWorkoutProgress.ts:67` reads `state.workout`, but the hook has zero consumers and Fallow marks both the hook and `workoutSlice.ts` unreachable.
- Repo-wide import and symbol searches found no consumer outside this closed two-file island. Live workout routes, services, types, and logger/planner components remain in place.

## Surface classification

| Path | Classification | Evidence |
| --- | --- | --- |
| `frontend/src/redux/store.ts` | canonical | mounted by `App.tsx` |
| `frontend/src/store/index.ts` | active competing/legacy | imported by notification, auth, social-profile, and dev helpers; not archived in this slice |
| `frontend/src/store/slices/workoutSlice.ts` | dormant | reducer registered in neither store; default export unused |
| `frontend/src/hooks/useWorkoutProgress.ts` | dormant | zero consumers; its only store key is absent from both reducer registries |

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/store/slices/workoutSlice.ts` | `archive/pending-deletion/2026-07-16/frontend/src/store/slices/workoutSlice.ts` | unreachable unregistered workout reducer |
| `frontend/src/hooks/useWorkoutProgress.ts` | `archive/pending-deletion/2026-07-16/frontend/src/hooks/useWorkoutProgress.ts` | unreachable hook coupled only to the unregistered reducer |

## Restore procedure

Restore only after selecting one canonical store, registering a typed `workout` reducer in that mounted store, proving a mounted consumer for the hook, and rerunning typecheck, build, lint, workout tests, and route smoke.

Permanent deletion remains a separate destructive pass requiring a fresh reference check and Sean's explicit approval.
