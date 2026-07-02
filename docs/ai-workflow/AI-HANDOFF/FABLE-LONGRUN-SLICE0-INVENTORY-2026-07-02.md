# FABLE LONG-RUN — Slice 0 Hostile Inventory (2026-07-02)

**Base:** isolated worktree `c:/tmp/ss-fable`, branch `fable/command-center-longrun`, checked out at **origin/main @ 4aad4e87f** (deploy truth). Shared checkout untouched (it is 66 commits behind origin with 174 divergent dirty files — building there was rejected).
**Method:** 6 parallel read-only Explore agents + direct verification. Subagent findings marked (agent) are hypotheses until re-verified at build time (Rule 30); receipts are re-proven per slice before code.
**Toolchain:** backend vitest proven green in worktree (workoutPlanRoutes.mounted + workoutBuilderTrainingStyle: 2 files / 33 tests). Backend `npm install` on Windows is broken by `dcraw-vendored-linux` pinned as a direct dep (backend/package.json:118) — Linux-only binary; Render unaffected; `dcrawr` already vendors per-OS. Fix candidate (1-line + lockfile).

## 1. Canonical surface map (agent-reported, spot-verified)

| Surface | Canonical | Evidence | Legacy/dormant competitors |
|---|---|---|---|
| Admin client mgmt | `/dashboard/admin/client-management` → `ClientsWorkspace` → `ClientsWorkspace.view` → `ClientHubGridCard` grid (card-first) | UniversalDashboardLayout.routes.tsx:100; ClientsWorkspace.tsx:67 | `EnhancedAdminClientManagementView.tsx` (2445L) DORMANT — not in route tree |
| Workout planner | `/dashboard/{admin,trainer}/workout-planner` → `WorkoutPlannerPage` (admin-workout-planner/) | routes.tsx:131,159 | AdminWorkoutPlansRedirect redirects away from old surface |
| Client plan view | `/workout/:userId` → `WorkoutDashboard` → GET `/api/workouts/:userId/current` (active WorkoutPlan) | WorkoutDashboard.tsx:31-132; clientWorkoutRoutes.mjs:58 | — |
| Workout logging | POST `/api/workout-forms` (dailyWorkoutFormRoutes.mjs:572, ~2431L) writes DailyWorkoutForm + WorkoutSession(completed) + WorkoutLog set rows | dailyWorkoutFormRoutes.mjs:572-1249 | adminWorkoutLoggerController legacy path |
| Progress charts | Phase-14 canonical 12-chart grid, client `/dashboard/client/progress` + admin `AdminClientProgressView.V2`; ALL REAL DATA via `/api/client/analytics/chart-*` (chartDataController) | clientAnalyticsRoutes.mjs:32-55 | legacy ClientProgressCharts dir (hex-heavy) |
| Bootcamp | `/dashboard/bootcamp-builder` (admin+trainer shared) | main-routes.tsx:604-614 | `/bootcamp` route NOT found (mission prompt stale) |
| Theme | tokens.css + UniversalThemeContext (4 themes) | tokens.css:1-118 | — |

## 2. Built / missing / broken / unproven (per mission slice)

**Slice 1 (Client Command Center)** — Card grid EXISTS and is canonical. Card already shows: name, initials avatar, source badge, active/inactive, sessions remaining w/ tone, last workout, onboarding %, goal, experience, quick actions. **MISSING on card:** real next-session date (renders "check schedule" although backend list endpoint returns `nextSession`), waiver/readiness badges, accountStatus (stub/invited/active), streak, risk flag, AI next-best action, photo image. **MISSING on surface:** status filter chips (backend supports `?status=`), stats strip, deactivated visibility.

**Slice 2 (Lifecycle)** — Backend COMPLETE: soft-delete only (hard delete 403 adminClientController.mjs:1324-29), clientDeactivationService cancels future sessions + 6-mo retention (svc:29-67), restore endpoint EXISTS (`PUT /api/admin/clients/:id/restore`, routes:299, controller:1228). **MISSING frontend:** no deactivate confirm dialog on canonical surface, no restore UI, no restoreClient() in adminClientService, no status filters.

**Slice 3 (Onboarding)** — Backend paths: (a) SwanStudios create → server-only password + reset-link email + `forcePasswordChange` + fallback resetUrl (controller:892-1120); (b) external claim token SWAN-XXXX 30-day (claimTokenService:48-63; accountStatus stub→invited at /claim); (c) `POST /api/clients/onboard` transactional. Resend endpoint EXISTS (`POST .../send-password-reset`, routes:338) + frontend service method EXISTS (adminClientService.ts:211-222) but **no UI trigger**. **UNPROVEN:** invited→active flip; forced-password-change frontend route. **MISSING:** admin readiness visibility (accountStatus/waiver/claim-expiry/lastLogin not surfaced).

**Slice 4 (Revenue/sessions)** — `User.availableSessions` single source (User.mjs:176-181). Stripe path REAL + idempotent + atomic (SessionGrantService.mjs:158-241; webhook + verify-session both grant; `sessionsGranted` flag). Deduction at logging time via sessionBillingPolicy.mjs:136-199 (non-deducting for move_fitness/external; 0-balance blocks logging). **(agent) claims NO dedicated admin grant-sessions endpoint/UI** (only trainer-assignment increment at adminClientController.mjs:1468-71) — VERIFY before building. verify-session idempotent replay returns `sessionsAdded: 0` (misleading). Cancel/refund schema exists, flow unproven.

**Slice 5 (Planner+PDF)** — Planner save/load/assign SOLID: POST/PUT `/api/workout-plans`, WorkoutPlan.planData JSONB, activate endpoint, SavedPlanCard vault, client sees active plan. PDF: jsPDF client-side generation FROM BUILDER STATE (useWorkoutPlannerPdfActions.ts:40 + workoutPlannerPlanPdfAdapter.ts:167); upload/attach + R2/local storage + authenticated streaming EXIST (workoutPlanRoutes.mjs:406-426; storage svc:100-176; content svc:90-114). `attachGeneratedPdf()` exists in save actions (:191) — exact auto-attach behavior to VERIFY. **MISSING:** guaranteed saved-plan→PDF fidelity (regenerate+attach on save), client Download-PDF affordance, PDF content tests.

**Slice 6 (AI intelligence)** — Generation deterministic (no Math.random in selection), recency+goal-bias+NASM-level scoring, pain exclusions ≥7 only, equipment filter. Rotation: variationEngine ROTATION_PATTERNS (standard 2-build/1-switch), getNextSessionType(history) fixed at 4aad4e87f. **GAPS (all agent-verified with file:line):** (1) **NO load progression** — phase %1RM only, never compares last comparable session (oneRepMaxService Brzycki 1RM exists but unused for increments); (2) **NO muscle-rest/push-pull balance**; (3) soreness <7 ignored in selection; (4) **no low-impact default / phase-aware exerciseType gate** (stability phase can get compound barbell); (5) selection has no impact/quality gate.

**Slice 7 (Write-through)** — Logger persists full structure (sets: weight/reps/rpe/tempo/rest/formQuality/notes; pain; intensity). **CRITICAL:** `VariationLog` is written ONLY by `/api/variation/suggest`+`/accept` (variationEngine.mjs:317-348, variationRoutes.mjs:124,160) — **POST /api/workout-forms never records rotation history**, so BUILD/SWITCH state goes stale for normal logging flow. Generated-then-logged and manual workouts DO land in workout_sessions/workout_logs (read by clientIntelligenceService 14-day window).

**Slice 8 (Progress)** — 12 canonical charts real-data, Victory-only, deprecated endpoints return empty (no 404). **MISSING:** streaks, explicit push/pull ratio, variety score, coach next-best-action, **tap-to-drill-down** (tooltips only).

**Slice 10 (Bootcamp)** — Builder AI+manual modes live, stations model, muscle-match selection (bootcampGenerator.mjs:33-77) with **no difficulty/impact/equipment-profile gating**; template save/load live; previewVideoUrl persistence UNPROVEN.

**Slice 11 (Theme)** — Canonical new surfaces tokenized; violations concentrated in DORMANT EnhancedAdminClientManagementView tree (~2000 hex) + legacy ClientProgressCharts (551). Policy: my slices are token-clean; legacy dirs = backlog, not this run.

## 3. Top risks
1. VariationLog write-through gap silently freezes rotation intelligence (Slice 7 first-class).
2. No admin manual session grant = cash/EFT clients can't be credited without hacks (verify then fix).
3. PDF can drift from saved plan (draft-state generation) — fidelity fix required.
4. Card/JSON field drift between list endpoint and card mapper (schema cross-check at build).
5. Windows backend install broken (dcraw pin) — dev-velocity + future-agent trap.
6. `ClientHubGridCard` is shared with trainer MyClientsView (lane history) — sibling sweep required for card changes.

## 4. Slice order for this run
1. **S1-3 combined:** Client Command Center on canonical ClientsWorkspace (card upgrade: readiness/waiver/next-session/status + filter chips + stats strip + lifecycle dialogs incl deactivate/restore + resend-login wiring).
2. **S4:** verify/land admin grant-sessions (+ audit trail) + honest verify-session replay response.
3. **S5:** PDF fidelity — regenerate-from-saved-planData + auto-attach on save + client download affordance + tests.
4. **S6+7:** write-through (record rotation history on workout-form completion) + micro-progression module (smallest-increment load/rep progression from last comparable session, RPE/pain guards) + quality gate (phase-aware type/impact filter, low-impact default, muscle-rest + push/pull balance) — all behind focused tests, zero regression on existing 8 builder suites.
5. **S8 (scoped):** streaks + push/pull + coach next-best-action endpoint + chart drill-down (as budget allows).
6. **S10 (scoped):** bootcamp generator reuses quality gate.
7. **S12:** full verification, secret scan, final report; commits on worktree branch only; push = Sean's call.

## 5. Tests to add (named at build time per slice)
Regression-first per bugfix standard; every new behavior gets a focused vitest; existing suites must stay green: clients-team suite, workoutBuilderService.* (8 files), dailyWorkoutFormRoutes.* (3), workoutPlanRoutes.*, money-path contracts.
