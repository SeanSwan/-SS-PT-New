# Dormant Dashboard Islands Archive - 2026-07-16

## Purpose

This companion manifest records the 30 files moved during the bounded dashboard cleanup slice. Every original path is preserved below `archive/pending-deletion/2026-07-16/`; no file was deleted.

## Evidence

- Production-only Fallow marked the files unreachable from the active bundle graph.
- Repo-wide import, dynamic-import, symbol, route, script, and test-path searches found no consumer outside the closed islands or source-contract tests archived with them.
- `/dashboard/admin/workout-planner` mounts `WorkoutPlannerPage` at `UniversalDashboardLayout.routes.tsx:144,174` through `routeComponents.tsx:64`; the archived exercise command center has no registered route.
- `/dashboard/admin/admin-sessions` mounts `EnhancedAdminSessionsView` at `UniversalDashboardLayout.routes.tsx:125` through `routeComponents.tsx:20`; its active dialog stack imports `AdminSessionsNewSessionDialog` and `AdminSessionsEditSessionDialog`.
- `WorkspaceContainer.tsx` and `berryAdminConfig.ts` were false-positive unused candidates and remain active because current workspace and integration-helper modules import them.
- The archived client-progress wrapper has no source consumer, is Fallow-unreachable, and is explicitly documented as dormant; the mounted `/dashboard/client/progress` route uses `ClientProgressDashboardPage.tsx`.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/DashBoard/AdminLayout.styles.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/AdminLayout.styles.ts` | unused legacy dashboard shell helper |
| `frontend/src/components/DashBoard/AdminLayoutTheme.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/AdminLayoutTheme.ts` | unused legacy dashboard shell helper |
| `frontend/src/components/DashBoard/client-progress-chart.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/client-progress-chart.tsx` | closed unmounted legacy dashboard island |
| `frontend/src/components/DashBoard/dashboard-styles.css` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/dashboard-styles.css` | closed unmounted legacy dashboard island |
| `frontend/src/components/DashBoard/dashboard-view.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/dashboard-view.tsx` | closed unmounted legacy dashboard island |
| `frontend/src/components/DashBoard/fitness-metrics-chart.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/fitness-metrics-chart.tsx` | closed unmounted legacy dashboard island |
| `frontend/src/components/DashBoard/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/index.ts` | unused dashboard barrel |
| `frontend/src/components/DashBoard/Pages/admin-exercises/AdminExerciseCommandCenter.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/AdminExerciseCommandCenter.tsx` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/components/AdminAchievementCelebration.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/components/AdminAchievementCelebration.tsx` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/components/ExerciseCreationWizard.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/components/ExerciseCreationWizard.tsx` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/components/ExerciseLibraryManager.retryContract.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/components/ExerciseLibraryManager.retryContract.test.ts` | source-contract test for archived exercise island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/components/ExerciseLibraryManager.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/components/ExerciseLibraryManager.tsx` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/components/ExercisePreviewModal.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/components/ExercisePreviewModal.tsx` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/components/ExerciseStatsPanel.actionsContract.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/components/ExerciseStatsPanel.actionsContract.test.ts` | source-contract test for archived exercise island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/components/ExerciseStatsPanel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/components/ExerciseStatsPanel.tsx` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/components/VideoUploadProcessor.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/components/VideoUploadProcessor.tsx` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/hooks/useExerciseGamification.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/hooks/useExerciseGamification.ts` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/hooks/useExerciseStats.dataTruthContract.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/hooks/useExerciseStats.dataTruthContract.test.ts` | source-contract test for archived exercise island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/hooks/useExerciseStats.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/hooks/useExerciseStats.ts` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/hooks/useNASMValidation.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/hooks/useNASMValidation.ts` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/hooks/useVideoUpload.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/hooks/useVideoUpload.ts` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/index.ts` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/styles/exerciseCommandTheme.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/styles/exerciseCommandTheme.ts` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-exercises/styles/gamificationAnimations.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-exercises/styles/gamificationAnimations.ts` | closed unmounted exercise-command-center island |
| `frontend/src/components/DashBoard/Pages/admin-sessions/CreateSessionModal.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-sessions/CreateSessionModal.tsx` | superseded unmounted session dialog |
| `frontend/src/components/DashBoard/Pages/admin-sessions/EditSessionModal.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-sessions/EditSessionModal.tsx` | superseded unmounted session dialog |
| `frontend/src/components/DashBoard/ParamRedirect.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/ParamRedirect.tsx` | unused legacy dashboard shell helper |
| `frontend/src/components/DashBoard/popular-workouts-card.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/popular-workouts-card.tsx` | closed unmounted legacy dashboard island |
| `frontend/src/components/DashBoard/training-sessions-card.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/training-sessions-card.tsx` | closed unmounted legacy dashboard island |
| `frontend/src/components/DashBoard/Pages/client-progress/ClientProgressDashboard.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/client-progress/ClientProgressDashboard.tsx` | dormant zero-consumer wrapper superseded by the canonical mounted client-progress page |

## Restore procedure

Restore a file only after proving a mounted consumer, moving it back to the exact original path, and rerunning frontend typecheck, production build, lint, focused tests, and the full sharded test suite.

Permanent deletion remains a separate destructive pass requiring a fresh reference check and Sean's explicit approval.
