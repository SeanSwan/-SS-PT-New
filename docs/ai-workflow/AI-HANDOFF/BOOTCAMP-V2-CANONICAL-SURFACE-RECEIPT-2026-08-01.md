# Bootcamp V2 Canonical Surface Receipt ? 2026-08-01

Baseline: `origin/main@75299b673`
Build branch: `codex/bootcamp-v2-crystalline-rail-20260801`
Worktree: `C:/tmp/sspt-bootcamp-crystalline-rail-20260801`

## Canonical mount receipt

| Evidence requirement | Canonical evidence |
|---|---|
| Route declarations | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:152` mounts the admin `/bootcamp` entry and `:203` mounts the trainer entry. Both select `BootcampBuilderPage`. |
| Lazy component | `frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx:86` imports `../BootcampBuilder/BootcampBuilderPage`. |
| Mounted JSX | `frontend/src/components/DashBoard/UniversalDashboardLayout.shellPieces.tsx:91-111` renders nested `Routes`; `:95-96` maps each visible role route into a real `<Route>`. |
| Mounted page | `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx:24` defines the page and `:298-299` exports the boundary/lens-wrapped mounted component. |
| Protected alias | `frontend/src/routes/main-routes.tsx:668-672` mounts `bootcamp-builder` to the same `BootcampBuilder` lazy component for trainer/admin roles. |
| Consumer hook | `BootcampBuilderPage.tsx:25` calls `useBootcampAPI()`; generation and save are invoked at `:180` and `:205`. |
| Exercise consumer | `frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx:4,84` consumes the shared `useExerciseSearch` hook. |
| Exact frontend paths | `frontend/src/hooks/useBootcampAPI.ts:79,87,101,119,131,137,151,162,168` owns the `/api/bootcamp/*` literals. `frontend/src/components/WorkoutLogger/useExerciseSearch.ts:102` owns `/api/exercises/library`. |
| Backend mount | `backend/core/routes.mjs:425` mounts `bootcampRoutes` at `/api/bootcamp`. |
| Backend handlers | `backend/routes/bootcampRoutes.mjs:59,122,138,154,191,207,218,246,267,283,304` declare generate, save, templates, log, history, spaces, trends, and bootcamp exercise handlers. |
| Exercise library handler | `backend/routes/exerciseRoutes.mjs:467` documents the canonical authenticated `GET /api/exercises/library` handler consumed by the Rolodex. |

## Backend mount and shadow audit

Mount order for the touched family is:

1. `app.use('/api/bootcamp', bootcampRoutes)` ? `backend/core/routes.mjs:425`
2. `app.use('/api/bootcamp/sprints', sprintRoutes)` ? `backend/core/routes.mjs:426`

These mounts overlap. The general router is evaluated first, but `bootcampRoutes.mjs` has no wildcard or `/sprints` handler, so unmatched sprint requests fall through to the specific sprint router. This implementation slice does not add or reorder backend routes.

## Authoritative model columns

The persisted template graph is authoritative in the model files, not frontend mapper assumptions:

- `BootcampTemplate` ? `id, trainerId, name, description, classFormat, targetDurationMin, demoDurationMin, clearDurationMin, dayType, difficultyBase, equipmentProfileId, spaceProfileId, maxParticipants, optimalParticipants, isActive, tags, aiGenerated, lastUsedAt, timesUsed, metadata, classStyle, intensityCategory, rounds, exerciseDurationSec, includeStretch, stretchDurationMin` (`backend/models/BootcampTemplate.mjs:24-124`).
- `BootcampStation` ? `id, templateId, stationNumber, stationName, equipmentNeeded, setupTimeSec, notes, sortOrder` (`backend/models/BootcampStation.mjs:9-36`).
- `BootcampExercise` ? `id, templateId, stationId, exerciseName, sourceExerciseName, durationSec, restSec, sortOrder, isCardioFinisher, muscleTargets, easyVariation, mediumVariation, hardVariation, kneeMod, shoulderMod, ankleMod, wristMod, elbowMod, footMod, hipMod, backMod, equipmentRequired, description, instructions, videoUrl, previewVideoUrl, imageUrl, thumbnailUrl, notes, board, setupTimeSec, pyramidStartWeight, pyramidDrops, supersetOrder, supersetGroupId, exerciseLibraryId` (`backend/models/BootcampExercise.mjs:9-130`).
- `BootcampStretch` ? `id, templateId, exerciseName, targetMuscles, durationSec, sortOrder, description, exerciseLibraryId` (`backend/models/BootcampStretch.mjs:16-45`).
- `BootcampOverflowPlan` ? `id, templateId, triggerCount, strategy, lapExercises, lapDurationMin, notes` (`backend/models/BootcampOverflowPlan.mjs:9-34`).
- `BootcampClassLog` ? `id, templateId, trainerId, classDate, dayType, actualParticipants, overflowActivated, exercisesUsed, modificationsMade, trainerNotes, classRating, energyLevel` (`backend/models/BootcampClassLog.mjs:9-50`).
- `BootcampSpaceProfile` ? `id, trainerId, name, locationName, totalAreaSqft, maxStations, maxPerStation, layoutData, mediaUrls, hasOutdoorAccess, outdoorDescription, notes` (`backend/models/BootcampSpaceProfile.mjs:9-49`).

No ORM model is being changed in the Crystalline Class Rail slice, so Rule 29's caller-field drift table is not triggered.

## Surface classification

| Surface | Classification | Evidence |
|---|---|---|
| `BootcampBuilderPage` at admin/trainer `/bootcamp` | canonical | Same mounted component at `UniversalDashboardLayout.routes.tsx:152,203` and real JSX route construction at `shellPieces.tsx:91-111`. |
| Protected `/bootcamp-builder` | canonical alias | Same lazy component at `main-routes.tsx:206,668-672`; not an independent implementation. |
| `BootcampDemoMode` | canonical child surface | Mounted only by `ClassPreviewPanel.tsx:103` when the page enters floor/run mode. |
| `SprintPlannerPage` | adjacent canonical product | Separate `/sprint-planner` route at `UniversalDashboardLayout.routes.tsx:158,205`; it plans multi-week sprints and does not compete with single-class operation. |
| Bootcamp blueprint and brainstorm documents | active/planned reference | No runtime imports; they define planned V2 work but are not mounted product surfaces. |

## Decision

All Crystalline Class Rail work will extend the proven `BootcampBuilderPage ? ClassPreviewPanel ? BootcampDemoMode` chain. No parallel page, duplicate route, duplicate exercise library, or replacement persistence model will be created.
