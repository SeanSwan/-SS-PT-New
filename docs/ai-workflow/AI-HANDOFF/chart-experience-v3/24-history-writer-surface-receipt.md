---
artifact_id: SWAN-CHART-HISTORY-WRITER-RECEIPT
version: 3.2
status: SOURCE VERIFIED; NO ROUTE ACTIVATION CLAIM
owner: lead independent source checks; Luna bounded census input
---

# Canonical history writer receipt

Runtime source root: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/chart-experience-v3-20260904`.
Branch `codex/chart-experience-v3-20260904`, base `53120649f356c3efccee32872b530096d386642f`.
All file:line references below are relative to this root at the pre-KG1c0 snapshot.
This is source evidence, not an authenticated browser or production receipt.

## Mount and consumer proof

| Link | Evidence |
|---|---|
| Dashboard URL | `frontend/src/routes/main-routes.tsx:936-940`: `dashboard/*`, ProtectedRoute, actual `<UniversalDashboardLayout />` |
| Role routing | `components/DashBoard/UniversalDashboardLayout.routes.tsx:114,188`: admin `/client-management`, trainer `/clients`; prefix in `UniversalDashboardLayout.shellPieces.tsx:94` |
| Actual route render | `UniversalDashboardLayout.tsx:193` shell; `.shell.tsx:133` `<DashboardRoutes>`; `.shellPieces.tsx:96-108` route map and `<Component />` (not merely lazy imports) |
| Workspace | `workspaces/ClientsWorkspace.tsx:233,242`: tab renderers and `<ClientsWorkspaceView>`; trainer wrapper `TrainerClientsWorkspace.tsx:14` mounts same workspace |
| Selected client | `ClientsWorkspace.view.tsx:207,213` mounts `<ClientDetailView renderTraining=...>`; `clients-team/ClientDetailView.tsx:128` invokes training renderer |
| Training → history | `ClientsWorkspaceTabs.tsx:58-60` mounts `<TrainingTabContent>`; `clients-team/tabs/TrainingTabContent.tsx:267` mounts `<TrainingTabSectionContent>`; section content `:146` mounts `<WorkoutHistoryPanel>` |
| Hook | `Pages/admin-clients/components/WorkoutHistoryPanel.tsx:147` calls `useWorkoutAnalytics`; `:176-183` editor hook |
| GET literal | `frontend/src/hooks/analytics/useWorkoutAnalytics.ts:67`: `/api/admin/clients/${analyticsUserId}/workouts` |
| PATCH literal | `Pages/admin-clients/components/useWorkoutHistoryEditor.ts:90-93`: `/api/admin/clients/${clientId}/workouts/${workoutId}`, current body `{ exercises }` |

Unprefixed component paths in the table are under `frontend/src/components/DashBoard/`.
Canonical source URLs: `/dashboard/admin/client-management` and `/dashboard/trainer/clients`.
Trainer frontend mount does NOT prove trainer API reachability (see shadow below).

## Competing surface classification

| Surface | Classification | Evidence |
|---|---|---|
| WorkoutHistoryPanel embedded | canonical source-mounted | TrainingTabSectionContent.tsx:146 |
| EnhancedWorkoutsModal panel | same shared consumer, not a different chart system | Pages/admin-clients/components/EnhancedWorkoutsModal.tsx:97 mounts WorkoutHistoryPanel |
| WorkoutHistoryTimeline | legacy for this route; no runtime importing consumer found | full `frontend/src` search for its name found its own implementation/styles/types and explanatory comments, but no external import/JSX mount; its own declaration is not a caller |
| Daily logger / admin create / AI writer | separate active write families, not this editor | census18 and this receipt below; must migrate separately |

No files moved/deleted. Root clutter and old chart-worktree inventory remain in prior
baseline/adoption receipts; this slice adds only five proposed source/test files and scoped docs.

## Backend matching order and authorization

The same-prefix route walk is below, in `backend/core/routes.mjs` order. Narrower
`/api/admin/flags`, payment-settings, storefront, videos, finance and other unrelated prefixes
do not match `/api/admin/clients/:clientId/workouts[/:sessionId]` and are excluded.

| Core line | Matching prefix/router | Relevant middleware / matched route |
|---|---|---|
|498| `/api/admin` adminRoutes | adminRoutes.mjs:30-31 global authenticateToken/authorizeAdmin; :67 nests adminClientRoutes again |
|499| `/api/admin` adminDebugRoutes (routes/admin.mjs) | admin.mjs:18 global protect; POST sync-data/restart/test routes do not match |
|502| `/api/admin` adminClientRoutes | global protect/admin-only at290-291; no exact workout GET/PATCH |
|516 conditional| `/api/admin` adminMcpRoutes | ENABLE_MCP_ROUTES==='true' only; global protect/requireAdmin/rate limit35-37 and unqualified410 catch-all52 |
|551| `/api/admin` adminNotificationsRoutes | per-route auth; notifications paths only81,167,198,303,338,378,417 |
|552| `/api/admin` adminAlertStateRoutes | per-route auth; alert-state paths68,83,97,113,149,178,223,255 |
|554| `/api/admin` adminSessionLiabilityRoutes | per-route auth; GET session-liability36 only |
|555| `/api/admin` adminOpsAggregateRoutes | per-route auth; GET ops paths45,143,199 |
|556| `/api/admin` adminOpsPipelineRoutes | per-route auth; GET ops paths37,103 |
|557| `/api/admin` adminOnboardingRoutes | global protect/admin-or-trainer18-19; onboarding/baseline paths26-49 do not match |
|558| `/api/admin` adminWorkoutLoggerRoutes | intended GET101 / PATCH104 / separate single-log DELETE107; global protect/admin-or-trainer8-9 |
|566,572,574,586,744| later `/api/admin` enterprise, orders, verification, compliance, AI usage | only reached if intended handler passes onward; no exact workout route found; global gates in enterprise32-33, orders103-105, verification56-57, compliance38; AI usage per-route21,109 |
|745| later `/api` creditsRoutes | POST credit-purchase routes24,37 do not match |
|833| later `/api` apiRoutes | api.mjs:41 mounts `/admin` adminRoutes again; same global admin-only gate, not another workout handler |

`auth.mjs:173-176` aliases authenticateToken to protect and authorizeAdmin to adminOnly;
`authMiddleware.mjs:436-451` adminOnly rejects a trainer. The FIRST admin-only shadow is
thus498, with another nested and another direct adminClientRoutes guard. The conditional
MCP catch-all would also intercept an authenticated admin if enabled. Runtime flag state is
unproven; do not assume it is enabled or change it in this slice.

1. `backend/routes/adminClientRoutes.mjs:290-291` installs global `protect`,
   `authorize(['admin'])`. Its listed GET/PUT client routes are not the exact workout PATCH,
   but its GLOBAL middleware still matches the prefix.
2. `backend/routes/adminWorkoutLoggerRoutes.mjs:8-9` installs `protect`,
   `authorize(['admin','trainer'])`; `:101` GET `/clients/:clientId/workouts`;
   `:104` PATCH `/clients/:clientId/workouts/:sessionId`; `:107` distinct single-log DELETE.
3. `backend/middleware/authMiddleware.mjs:459-492` grants admin or listed role; otherwise403.
   Therefore the earlier admin-only routers are a SOURCE-VERIFIED trainer shadow risk even
   though no exact competing PATCH was found. No live trainer probe has been run.
4. Controller `ensureClientAccess` (`backend/utils/clientAccess.mjs:46-92`) validates client
   and requester IDs, verifies target is client/user, permits admin or active assigned trainer.
   The workout router itself does not permit client-role callers. Never remove these checks.

**Release blocker:** trainer API access must be reproduced with mounted Express middleware
and resolved in a separately scoped authentication/routing slice. Pure KG1c0 needs no auth edit.

## Model and destructive current save behavior

`backend/models/WorkoutLog.mjs`: actual `id` INTEGER PK (`:8`), `sessionId` UUID FK (`:14`),
`exerciseName` (`:22`), `circuitName/circuitOrder/exerciseRole` (`:26-40`), `setNumber/reps`
(`:41-52`), old `weight` FLOAT (`:53`), nullable `enteredWeight` DECIMAL12/6 (`:63`) and
`enteredWeightUnit` TEXT lb/kg (`:67`), tempo/rest/rpe/notes/exerciseNote (`:74-113`),
setType/isometricHoldSeconds (`:114-124`), `workout_logs` + timestamps (`:128-129`).
Full field/caller drift census18 and migration/model receipt22 apply.

`backend/controllers/adminWorkoutLoggerController.mjs:218-258` authorizes GET and returns
full `logs`, including persisted IDs and, after migration, explicit unit pairs. Session
whitelist does not return an edit revision. `workoutAnalyticsData.ts:75-86` currently drops
units, circuit metadata, timestamps; payload builder `workoutHistoryEditPayload.ts:7-69`
drops persisted log IDs as well. Its grouping by exercise name is not circuit-safe.

PATCH `adminWorkoutLoggerController.mjs:297-301` scopes session by ID and client userId,
but has no row lock/revision guard. `:335` destroys all logs; `:338-375` recreates them;
`:379-383` recalculates old numeric aggregates. Untouched known pairs would be lost.
New frontend negative IDs are UI-only; actual existing log IDs are positive persisted integers.
`WorkoutSession.clientRequestId` is creation idempotency, not an edit revision.

Separate replacement writers remain: daily forms (`core/routes.mjs:774`,
`dailyWorkoutFormRoutes.mjs:1072-1078`); AI/admin-create shared service
`services/workout/aiWorkoutDailyFormService.mjs:192-193`. They cannot be pronounced unit-ready
by testing the canonical editor or KG1c0 alone. See18 for full caller paths.

## Bounded next step and baseline

KG1c0 in25 implements ONLY reusable strict entered/preserve operations and source-preserving
form draft logic. It imports no ORM, server config, auth, or live hook and activates no writer.
This is useful independently of the later concurrency adapter; it cannot serve as its proof.
Later mounted integration must define an authoritative session/log revision and atomic
identity-based reconciliation, retain untouched field metadata, and audit cross-writer locking.
Do not invent a revision field or silently retrofit the old replace-all branch.

Frontend dependencies installed using `npm ci --ignore-scripts --no-audit --no-fund`:
1029 packages, exit0. Lock SHA256 before/after identical:
`81bbc6b6f9af968743cd5fb9149063fe20e72295e1528dcd176268e75d3d672d`.
Baseline4 Vitest files /17 tests pass: WorkoutLogger.setRowIdentity, workoutHistoryEditPayload,
workoutHistoryEditSession, workoutHistoryEditRows. This is regression baseline, not new-feature proof.
Synthetic PG remains stopped; no production connection, app server, commit, push or deployment.
