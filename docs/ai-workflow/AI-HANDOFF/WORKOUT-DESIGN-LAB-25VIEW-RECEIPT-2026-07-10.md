# Workout Design Lab 25-View Pre-Implementation Receipt

Date: 2026-07-10
Branch: `codex/workout-design-lab-25views-20260710`
Worktree: `C:\\tmp\\sspt-workout-design-lab-25views-20260710`

## External reference receipt

Status: `[MOBBIN MCP UNAVAILABLE]`; public Mobbin research was available at `https://mobbin.com/` and `https://mobbin.com/discover/sites/latest`.
Surface: `/dashboard/admin/workout-design-lab`
User job: compare 25 complete workout-interface worlds without losing the shared workout session.
Primary action: select a world, open the canonical read-only Rolodex, then invoke a prototype action with a visible receipt.
Tools/queries: no callable Mobbin screens, flows, or sections tools were exposed. The public logged-out site was reviewed for research principles only: pattern/flow organization, restrained hierarchy, visible progress, and obvious actions. No screen or proprietary layout was reproduced.
Swan translation: four-phase dashboard arc; C12 low-motion data surfaces; C11 narrative data zones; 44px controls; single scroll owner; CSS/gradient environmental fallbacks; reduced motion.
Rejected patterns: copied proprietary layouts, hotlinked imagery, 25 wallpaper swaps, equal-card grids, hover-only controls, and multi-megabyte backgrounds.
Design impact: every composition receives independent geometry and hierarchy while sharing one typed session contract.

## Canonical surface receipt

1. `frontend/src/routes/DashboardRoutes.tsx:70-79` mounts `UniversalDashboardLayout` at `/dashboard/*`.
2. `UniversalDashboardLayout.tsx:157-165,177-188` provides the role registry; `UniversalDashboardLayout.shellPieces.tsx:90-107` renders each registered `<Component />`.
3. `UniversalDashboardLayout.routes.tsx:130` maps `/workout-design-lab` to `WorkoutDesignLabPage`; `routeComponents.tsx:61` lazy-loads that page.
4. `conceptRegistry.ts:1-11`, `conceptRegistry.partOne.ts:17-213`, `conceptRegistry.partTwo.ts:16-198`, and `WorkoutDesignLabPage.tsx:38-174` are the typed 25-view registry and selector/render chain. The registry composes one shared view model into 25 separately owned composition modules.
5. The canonical Rolodex is `WorkoutLogger/NASMExerciseRolodex.tsx:48-65` consuming `useExerciseSearch`.
6. The exact frontend read path is `GET /api/exercises/library` at `useExerciseSearch.ts:99`.
7. The only production mount is `backend/core/routes.mjs:683`; `exerciseRoutes.mjs:480-520` owns `router.get('/library', ...)`. No overlapping production mount or same-path shadow was found.
8. The authoritative model is `backend/models/Exercise.mjs:12-345`. Relevant real fields include `id`, `name`, `description`, `instructions`, `videoUrl`, `previewVideoUrl`, `imageUrl`, `thumbnailUrl`, `exerciseType`, `primaryMuscles`, `secondaryMuscles`, `difficulty`, `equipmentNeeded`, `recommendedSets`, `recommendedReps`, `recommendedDuration`, `restInterval`, `exercise_key`, `source`, `optPhases`, `nasmMovementPattern`, `defaultTempo`, `defaultRestSeconds`, and `bodyPartCategory`.
9. No API or model file is modified by this slice.

## Surface classification

| Surface | Classification | Evidence |
|---|---|---|
| Admin Workout Design Lab | canonical active runtime code | `UniversalDashboardLayout.routes.tsx:131`; rendered through `shellPieces.tsx:95-107` |
| 25 concept modules | canonical children after implementation | registry parts plus active render at `WorkoutDesignLabPage.tsx:174` |
| Design Playground | separate active/dev-gated surface | `main-routes.tsx:298-302,841` |
| Homepage Design Lab | separate homepage preview surface | `HomepageDesignLab.tsx:273-370` |
| Dirty shared-checkout workout lab files | QA/temp parallel-work artifact, excluded | not part of this origin/main worktree |

## Design and interaction receipt

Primary job: compare 25 directions while retaining workout state.
Primary action: prototype-only session action; secondary actions are world selection, previous/next, reset, and Rolodex open.
Dead-control sweep: every button must change state, navigate within the selector, open/close the Rolodex, or emit a receipt.
Desktop scale: compositions expand to monitor-class widths with deliberate asymmetric zones.
Scroll model: one page scroll; selector may horizontally scroll without owning vertical page scroll.
Mobile plan: 320-414px stacking, 44px targets, 16px body floor, no hover dependency.
Data stress: long concept labels, 25 selector items, library loading/error, and persistent selected exercises.
Assets: CSS/gradient/geometry interpretations only in this slice; no external or NASA asset is shipped.
Motion: transform/opacity only and disabled or flattened under `prefers-reduced-motion`.
