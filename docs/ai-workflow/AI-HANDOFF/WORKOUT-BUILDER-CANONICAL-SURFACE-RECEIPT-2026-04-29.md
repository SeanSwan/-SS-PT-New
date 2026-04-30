# Workout Builder - Canonical Surface Receipt - 2026-04-29

**Status:** Canonical receipt (REV 3) with Phase A implementation addendum. Sections 1-9 preserve the pre-code surface evidence; Section 10 records the final implementation and Codex gate verification.
**Scope:** Trainer/Admin Workout Builder upgrade - Phase A (goal+phase shape generation), Phase B (saved plans hydration + IDOR fix), Phase C (rolodex visual upgrade).
**Verdict from prior review chain:** Codex REVISE rounds 1 and 2 (2026-04-29). All requested corrections applied in this revision: TrainerWorkoutForgePage marked active competing (not dormant); plan-by-id endpoint corrected to the canonical workoutPlanRoutes mounts; mounted-JSX proof added per Rule 26; progressNotes type corrected to JSONB; surface #4 approval gate tightened; GOAL_CONFIG relocated to its own helper module; receipt normalized to ASCII for Windows-shell readability.
**Authority:** CLAUDE.md rules 26 (Canonical Surface Receipt), 27 (Surface Classification), 29 (Schema Cross-Check), 31 (Backend Route Ownership), 46 (3-Brain review loop), 51 (Confidence tags), 4 (file size discipline).

---

## Section 1 - Surface Classification Table (Rule 27) + Mounted-JSX Proof (Rule 26)

Every row carries file:line evidence per rule 26. Confidence tags per rule 51.

### 1.1 - Mounted-JSX proof (Rule 26 part b)

Route config tables alone are not mount proof. Real proof: [UniversalDashboardLayout.tsx:859-873](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L859-L873) maps `roleConfig.routes` into actual `<Route ... element={<Component />} />` JSX inside a `<Routes>` block scoped by `path={`/${activeRole}/*`}`. Excerpt:

```
roleConfig.routes.map(({ path, component: Component }) => (
  <Route key={path} path={path} element={<UniversalPageContainer ...><Component /></UniversalPageContainer>} />
))
```

This closes the "config row alone is not proof of mount" gap. Every route config row referenced below is rendered through this map. `[VERIFIED]`

### 1.2 - Classification table

| # | File | Mounted at | Classification | Evidence |
|---|---|---|---|---|
| 1 | [WorkoutPlannerPage.tsx](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx) | `/dashboard/admin/workout-planner` AND `/dashboard/trainer/workout-planner` | **CANONICAL** for trainer workout builder | Config rows: [UniversalDashboardLayout.tsx:553](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L553) (admin), [UniversalDashboardLayout.tsx:589](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L589) (trainer). Mounted-JSX proof: section 1.1 above. Three-panel layout (rolodex + builder + teach mode). Sends real POST to `/api/workout-builder/{generate,plan}`. `[VERIFIED]` |
| 2 | [TrainerWorkoutForgePage.tsx](frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerWorkoutForgePage.tsx) | `/dashboard/trainer/workout-forge` | **ACTIVE COMPETING** (not dormant) | Config row: [UniversalDashboardLayout.tsx:588](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L588). Mounted-JSX proof: section 1.1 above. Linked from [TrainerHomeTab.tsx:229](frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerHomeTab.tsx#L229) and [TrainerStellarSidebar.tsx:455](frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerStellarSidebar.tsx#L455). The "Generate with Swan Coach" button is currently a stub (`toast.info('...coming in Phase 3')`), but the page is shipped and visible to trainers via two navigation paths. `[VERIFIED]` |
| 3 | [Admin/WorkoutPlanBuilder.tsx](frontend/src/components/Admin/WorkoutPlanBuilder.tsx) | `/dashboard/admin/workouts/:clientId?` | **LEGACY BUT REFERENCED** | Config row: [UniversalDashboardLayout.tsx:511](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L511). Mounted-JSX proof: section 1.1 above. Older manual builder pattern; reachable from admin role config. `[VERIFIED]` |
| 4 | [WorkoutManagement/WorkoutPlanBuilder.tsx](frontend/src/components/WorkoutManagement/WorkoutPlanBuilder.tsx) | Indirect (parent components) | **LEGACY, REFERENCED, MOUNT-UNVERIFIED** | Imported by [AdminWorkoutManagement.tsx:24](frontend/src/components/WorkoutManagement/AdminWorkoutManagement.tsx#L24), [TrainerWorkoutManagement.tsx:21](frontend/src/components/TrainerDashboard/WorkoutManagement/TrainerWorkoutManagement.tsx#L21), and re-exported by [WorkoutManagement/index.ts:15](frontend/src/components/WorkoutManagement/index.ts#L15). Distinct file from #3. **End-to-end route mount through the parent components is NOT traced in this receipt.** This row is informational; it is NOT authoritative for any future cleanup, archive, or consolidation decision. Re-audit required before any touch. `[VERIFIED]` exists / `[UNVERIFIED]` end-to-end mount |
| 5 | [TeachModeSidebar](frontend/src/components/DashBoard/Pages/admin-workout-planner/TeachModeSidebar.tsx) | Child of #1 | **CANONICAL CHILD** | Imported at [WorkoutPlannerPage.tsx:52](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L52). `[VERIFIED]` |

**Out-of-scope for Phase A-C:** Surfaces #2, #3, #4 are not modified in this workstream. Consolidation requires a separate receipt per Codex directive.

---

## Section 2 - Backend Route Ownership / Shadow Audit (Rule 31)

### 2.1 - Mount order in `backend/core/routes.mjs`

The mount-order comment at [core/routes.mjs:328](backend/core/routes.mjs#L328) is already in place: `"/api/workout/plans MUST mount BEFORE /api/workout to prevent route shadowing"`. Mount order verified:

| Order | Path | Routes file | Notes |
|---|---|---|---|
| 1 | `/api/workout-plans` | `workoutPlanRoutes.mjs` | [routes.mjs:330](backend/core/routes.mjs#L330) - canonical plan CRUD |
| 2 | `/api/workout/plans` | `workoutPlanRoutes.mjs` | [routes.mjs:331](backend/core/routes.mjs#L331) - legacy mirror, same router |
| 3 | `/api/workout` | `workoutRoutes.mjs` | [routes.mjs:332](backend/core/routes.mjs#L332) - generic workout CRUD |
| 4 | `/api/workout/sessions` | `workoutSessionRoutes.mjs` | [routes.mjs:333](backend/core/routes.mjs#L333) |
| 5 | `/api/workout-builder` | `workoutBuilderRoutes.mjs` | [routes.mjs:354](backend/core/routes.mjs#L354) - AI generation only; **no plan-by-id handler exists here** |

**Shadow note:** Order is correct. `/api/workout/plans/:id` resolves to `workoutPlanRoutes.GET /:id`, NOT to `workoutRoutes`. `[VERIFIED]`

### 2.2 - Endpoints touched by Phase A and Phase B

| Endpoint | Method | Handler | Auth | Used by Phase | Notes |
|---|---|---|---|---|---|
| `/api/workout-builder/generate` | POST | [workoutBuilderRoutes.mjs:52](backend/routes/workoutBuilderRoutes.mjs#L52) | `protect` + `authorize(['admin','trainer'])` + `verifyClientAccess` | Phase A | **Currently does not accept `primaryGoal` or `nasmPhase` in body.** Service derives phase from client baseline only. |
| `/api/workout-builder/plan` | POST | [workoutBuilderRoutes.mjs:93](backend/routes/workoutBuilderRoutes.mjs#L93) | `protect` + `authorize(['admin','trainer'])` + `verifyClientAccess` | Phase A | Accepts `primaryGoal` (validated against `VALID_GOALS` at [line 108](backend/routes/workoutBuilderRoutes.mjs#L108)). Does **not** accept `startingPhaseOverride`. Service uses goal as response metadata only. |
| `/api/workout-plans/:id` | GET | [workoutPlanRoutes.mjs:129](backend/routes/workoutPlanRoutes.mjs#L129) | `protect` + `trainerOrAdminOnly` ONLY | Phase B | **IDOR risk** - see 2.3. |
| `/api/workout/plans/:id` | GET | Same handler (legacy mount) | Same | Phase B (legacy alias) | Same handler, same gap. |

### 2.3 - IDOR finding on plan-by-id (Phase B blocker)

[workoutPlanRoutes.mjs:129-145](backend/routes/workoutPlanRoutes.mjs#L129-L145) calls `WorkoutPlan.findByPk(req.params.id)` and returns the plan with no ownership check beyond `trainerOrAdminOnly`. Any authenticated trainer can read any other trainer's plans by guessing/iterating IDs. `[VERIFIED]`

**Mitigation already exists in this codebase:** [workoutBuilderRoutes.mjs:27-40](backend/routes/workoutBuilderRoutes.mjs#L27-L40) defines `verifyClientAccess(userId, userRole, clientId)` that queries `ClientTrainerAssignments` and **fails closed** if the table is missing. Phase B will extract this helper into `backend/middleware/verifyClientAccess.mjs` (or similar shared location) and apply it to GET /:id, the matching `/api/workout/plans/:id` legacy mount, PUT /:id, PUT /:id/advance, and DELETE /:id. The same IDOR exists on all of those handlers. `[VERIFIED]` - same `protect, trainerOrAdminOnly` only.

---

## Section 3 - Schema Cross-Check (Rule 29)

### 3.1 - `WorkoutPlan` model fields (authoritative)

Real columns from [backend/models/WorkoutPlan.mjs:46-163](backend/models/WorkoutPlan.mjs#L46-L163):

| Field | Type | Line |
|---|---|---|
| `id` | UUID PK | 47-52 |
| `userId` | INTEGER FK -> Users | 53-58 |
| `trainerId` | INTEGER FK -> Users | 59-64 |
| `title` | STRING | 65-69 |
| `description` | TEXT | 70-73 |
| `nasmPhase` | INTEGER 1-5 | 75-81 |
| `startDate` | DATEONLY | 82-87 |
| `endDate` | DATEONLY | 88-92 |
| `durationWeeks` | INTEGER 1-52 | 94-100 |
| `status` | ENUM(`active`,`paused`,`completed`,`draft`) | 102-107 |
| `currentWeek` | INTEGER | 108-115 |
| `currentDay` | INTEGER | 116-123 |
| `planData` | JSONB (weeks -> days -> exercises) | 124-130 |
| `progressNotes` | **JSONB** (array of trainer notes per week) | [131-137](backend/models/WorkoutPlan.mjs#L131-L137) |
| `createdBy` | STRING (`ai`/`trainer`/`admin`) | 138-144 |
| `metadata` | JSONB | 145-150 |

`[VERIFIED]` corrected from REV 1 (which incorrectly listed progressNotes as TEXT).

### 3.2 - Caller drift table (frontend save vs model)

Frontend at [WorkoutPlannerPage.tsx:458-490](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L458-L490) sends:

| Caller field | Real model column | Match status |
|---|---|---|
| `userId` | `userId` | match |
| `title` | `title` | match |
| `description` | `description` | match |
| `nasmPhase` | `nasmPhase` | match |
| `planData` | `planData` | match |
| `trainerId` | `trainerId` | NOT sent - backend must populate from `req.user.id` |
| `durationWeeks`, `status`, `startDate`, `endDate` | exist on model | NOT sent - model defaults apply |
| `metadata` (with `goal`, `category` already nested in `planData.goal`/`planData.category`) | `metadata` | goal+category currently buried in `planData`; consider `metadata` for queryability in a future phase |

No drift / no phantom fields. `[VERIFIED]`

### 3.3 - Phase B hydration field map

Once `GET /api/workout-plans/:id` returns a plan, Phase B will hydrate the WorkoutPlannerPage builder state from these real fields:

| Builder state | Source | Notes |
|---|---|---|
| `phaseNumber` | `plan.nasmPhase` | direct |
| `goal` | `plan.planData.goal` | nested in JSONB |
| `category` | `plan.planData.category` | nested in JSONB |
| `planExercises` | `plan.planData.weeks[0].days[0].exercises` | first day of first week, single-workout case |
| `durationWeeks` | `plan.durationWeeks` | direct |
| `sessionsPerWeek` | not currently saved | will display fallback or omit |

For multi-week plans, Phase B will iterate `plan.planData.weeks[*].days[*]` and hydrate the `generatedPlan` state instead of `planExercises`. Surface design for that case TBD in Phase B receipt addendum.

---

## Section 4 - Defect Chain (current verified failures)

### 4.1 - Phase A target defects

**D1.** [WorkoutPlannerPage.tsx:425-430](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L425-L430) sends `{clientId, durationWeeks, sessionsPerWeek, primaryGoal}` to `/api/workout-builder/plan`. **Does not send the trainer-selected `phaseNumber`.** `[VERIFIED]`

**D2.** [WorkoutPlannerPage.tsx:342-347](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L342-L347) sends `{clientId, category, exerciseCount, rotationPattern}` to `/api/workout-builder/generate`. **Does not send `primaryGoal` or `nasmPhase`.** `[VERIFIED]`

**D3.** [workoutBuilderRoutes.mjs:54](backend/routes/workoutBuilderRoutes.mjs#L54) destructures `{clientId, category, equipmentProfileId, exerciseCount, rotationPattern}`. No goal or phase accepted on `/generate`. `[VERIFIED]`

**D4.** [workoutBuilderRoutes.mjs:95](backend/routes/workoutBuilderRoutes.mjs#L95) destructures `{clientId, durationWeeks, sessionsPerWeek, primaryGoal, equipmentProfileId}`. No phase override accepted on `/plan`. `[VERIFIED]`

**D5.** [workoutBuilderService.mjs:582](backend/services/workoutBuilderService.mjs#L582): `const phase = Math.min(5, startingPhase + Math.floor(i / 2))`. Hardcoded ramp; `primaryGoal` is destructured at line 557 but only re-emerges as response metadata at line 641 (`planSummary.primaryGoal`) and as a recommendation string at line 675-676 keyed off `context.goals?.primaryGoal` (the client's stored goal, not the trainer's input). Goal does not branch the ramp, the set/rep params, or the exercise selection. `[VERIFIED]`

**D6.** [workoutBuilderService.mjs:259-447](backend/services/workoutBuilderService.mjs#L259-L447) `generateWorkout` (single-workout path) takes no `primaryGoal` parameter at all. Phase is derived only from `context.constraints.nasmPhase || 2` at line 295. Trainer's selection has no path to influence the result. `[VERIFIED]`

### 4.2 - Phase B target defects (out of scope this turn, recorded for completeness)

**D7.** [WorkoutPlannerPage.tsx:1088](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L1088): `<MesocycleCard key={plan.id} $phase={1} style={{ cursor: 'default' }}>` - saved plan cards have explicit `cursor: default`, no `onClick`, no keyboard handler, no hydration logic. `[VERIFIED]`

**D8.** IDOR on `GET /api/workout-plans/:id` and legacy `/api/workout/plans/:id`. See 2.3. `[VERIFIED]`

### 4.3 - Phase C target defects (out of scope this turn, recorded for completeness)

**D9.** Rolodex chip pile is a typography/hierarchy problem (presentation-layer), not data corruption. Exercise name reads at the same visual weight as four metadata chips (`bodyPartCategory`, `exerciseType`, equipment, impact), which collapses scanability for bodyweight-heavy categories where the chips repeat across rows. Confirmed by reading the rolodex render code; no DB drift evidence found. `[LIKELY]` - open to be re-flagged as data-layer if real data review surfaces malformed records.

---

## Section 5 - Phase A Plan (approved scope)

### 5.1 - Module split (Rule 4 discipline)

`backend/services/workoutBuilderService.mjs` is already large; adding the goal-strategy table and helpers in-place worsens the file-size debt. Phase A introduces a **new dedicated helper module** and keeps `workoutBuilderService.mjs` as the orchestrator.

**New file:** `backend/services/workoutBuilderGoalConfig.mjs`

**Exports:**
- `GOAL_CONFIG` - the strategy table keyed by the six allowed goal values.
- `normalizeGoal(primaryGoal)` - maps incoming string to a `GOAL_CONFIG` key; falls back to `'general_fitness'` for unknown values. Mirrors the route-layer `safeGoal` pattern.
- `resolveStartingPhase({ startingPhaseOverride, contextPhase })` - returns the trainer override (1-5) when present and valid, otherwise the client-context phase, otherwise 1.
- `buildGoalPhaseSequence({ primaryGoal, startingPhase, durationWeeks })` - returns the array of mesocycle phases for the given duration. Replaces the hardcoded `Math.floor(i / 2)` ramp with goal-aware phase-hold rules.
- `getGoalOptBias({ primaryGoal, phase })` - returns `{ setBias, repBias, restBias, intensityBias, exerciseBias }` modifiers that the service applies on top of the existing `OPT_PHASE_PARAMS` bands. All modifiers stay inside NASM-OPT bounds.

**Determinism:** All four functions are pure (no clock, no randomness, no `Math.random()`). Same inputs always yield identical outputs. Tests can assert exact expected sequences/biases.

**Allowlist (must match the route validator at [workoutBuilderRoutes.mjs:108](backend/routes/workoutBuilderRoutes.mjs#L108)):**
`general_fitness`, `hypertrophy`, `strength`, `fat_loss`, `athletic_performance`, `golf_performance`.

### 5.2 - Backend service refactor

`backend/services/workoutBuilderService.mjs` consumes the helpers:

1. `generatePlan` replaces the hardcoded ramp at line 582 with `buildGoalPhaseSequence({...})`. Calls `resolveStartingPhase({...})` for the starting phase. Applies `getGoalOptBias({...})` per mesocycle when computing set/rep params. Goal-aware exercise selection passes the bias into `selectExercises()` as a soft filter against existing exercise fields.

2. `generateWorkout` accepts new optional `primaryGoal` and `nasmPhase` parameters (in addition to existing args). Uses `normalizeGoal` and the override-or-context phase resolver. Passes goal bias into `selectExercises()`.

3. Both paths emit a structured `rationale` array on the response explaining how goal+phase shaped the result. UI does not have to render it in Phase A; backend just emits it.

4. **No DB migration.** Goal config is in-code. Persistence layer untouched.

### 5.3 - Backend route validation

[workoutBuilderRoutes.mjs](backend/routes/workoutBuilderRoutes.mjs) accepts and validates the new fields, matching the existing safe-fallback pattern in this file (`safeCategory`, `safePattern`, `safeGoal`):

- `/generate`: add `primaryGoal` (validate via `normalizeGoal`), `nasmPhase` (validate 1-5, fallback to `undefined` so service uses context).
- `/plan`: add `startingPhaseOverride` (validate 1-5, fallback to `undefined` so service uses context).

Invalid values fall back to safe defaults rather than 400 (matches existing route style; no new hard failure).

### 5.4 - Frontend changes (minimal in Phase A)

1. [WorkoutPlannerPage.tsx:425-430](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L425-L430) - add `startingPhaseOverride: phaseNumber` to the `/plan` POST body.
2. [WorkoutPlannerPage.tsx:342-347](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L342-L347) - add `primaryGoal: goal` and `nasmPhase: phaseNumber` to the `/generate` POST body.
3. **No UI restructure in Phase A.** The dropdown values being sent over the wire is the only frontend change.

### 5.5 - Tests (Tier-A, TDD per rule 21)

Test order: helper module first, then service behavior, then route validation. Frontend payload changes are verified by code review and frontend build because Phase A intentionally avoids UI restructuring.

| Test file | Target | What it proves |
|---|---|---|
| `backend/__tests__/workoutBuilderGoalConfig.test.mjs` | helper module (5.1) | `normalizeGoal` returns correct key for each of the 6 goals; falls back for unknown. `resolveStartingPhase` honors override > context > default. `buildGoalPhaseSequence` produces deterministic, goal-distinct sequences. `getGoalOptBias` stays inside OPT bands and keeps Phase 2 hypertrophy at canonical set/rep/rest bands while still changing exercise priority. |
| `backend/__tests__/workoutBuilderService.goalAware.test.mjs` | `generatePlan` + `generateWorkout` | All 6 goals produce distinct mesocycle plans for identical client input. Hypertrophy holds Phase 3 longer than legacy ramp. Strength holds Phase 4 longer. Athletic performance reaches Phase 5. Valid phase overrides beat baseline. Single-workout responses emit `primaryGoal`, `goalBias`, `rationale`, and raw `phaseParams` bands for smoke verification. |
| `backend/__tests__/workoutBuilderRoutes.validation.test.mjs` | routes | Invalid `primaryGoal` / `nasmPhase` / `startingPhaseOverride` fall back to safe defaults; valid values pass through unchanged; partially numeric phase strings are rejected rather than `parseInt`-coerced; existing `verifyClientAccess` and rate limiter remain in the route chain. |

### 5.6 - Verification matrix

- `cd backend && npm test` (targeted to new test files, plus existing workoutBuilder tests).
- `cd frontend && npx vitest run` (targeted to changed component path).
- `cd frontend && npm run build`.
- `cd frontend && npx tsc --noEmit` - report status honestly per Rule 56. Slice-clean expected; baseline status reported as `[VERIFIED clean]` or `[UNVERIFIED - N pre-existing errors carried forward]`.
- **Local pre-commit smoke (REQUIRED before push):** after tests and build pass, exercise `/api/workout-builder/generate` and `/api/workout-builder/plan` through the local app (`npm run dev`) or via direct API call (curl/Thunder/Postman) against `localhost:10000`. Verify the new `primaryGoal` and `nasmPhase`/`startingPhaseOverride` fields actually shape the response. AGENTS.md and the local-first workflow rule both require local caller-path smoke before push - production smoke is a regression check, not the first real verification.
- Manual smoke (post-deploy, repeats the same paths against production):
  - `/dashboard/admin/workout-planner` - generate single workout with goal+phase combinations, verify exercise pool and set/rep change.
  - `/dashboard/trainer/workout-planner` - same.
  - `/dashboard/trainer/workout-forge` - **verify behavior unchanged** (this surface is out of scope; regression check only).
  - Multi-week plan generation - verify mesocycle phase sequence reflects goal.

---

## Section 6 - Out of Scope for Phase A (recorded for follow-up receipts)

Per Codex directive, Phase A does not touch:

1. **Phase B (saved plans hydration).** Recorded above as defect chain D7+D8. Requires its own receipt addendum after Phase A ships, including the IDOR mitigation plan (extract `verifyClientAccess` to shared middleware, apply to all `WorkoutPlan` routes that accept `:id`).
2. **Phase C (rolodex visual upgrade).** Recorded above as D9. Frontend-only, surgical, defers until Phase B done.
3. **Surface consolidation.** TrainerWorkoutForgePage redirect/removal requires a separate Rule 26/27 receipt. Not started.
4. **Configurable goal-strategy admin UI.** Phase A ships opinionated NASM-safe defaults only.
5. **Two legacy `WorkoutPlanBuilder` files (#3, #4 in section 1).** Not modified, not classified for archive - out of scope. Surface #4 in particular is mount-unverified; do NOT use this row as authority for cleanup.
6. **DB migrations.** None planned for Phase A.

---

## Section 7 - Confidence Tag Summary (Rule 51)

- All file:line citations: `[VERIFIED]` (read directly from current tree).
- Surface mounts: `[VERIFIED]` for #1, #2, #3, #5; `[UNVERIFIED]` end-to-end for #4.
- Backend route mount order: `[VERIFIED]`.
- IDOR finding on `WorkoutPlan` GET /:id: `[VERIFIED]`.
- Defect chain D1-D8: `[VERIFIED]`.
- Defect D9 (rolodex presentation-layer): `[LIKELY]` - open to re-classify if data audit surfaces real DB drift.
- progressNotes type as JSONB: `[VERIFIED]` (corrected from REV 1).
- Mounted-JSX evidence at [UniversalDashboardLayout.tsx:859-873](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L859-L873): `[VERIFIED]`.

---

## Section 8 - Review Chain (Rule 46)

Sections 1-9 were the pre-code artifact. Implementation chain:

1. **Sean approval** of REV 2 receipt as the authoritative pre-code surface map. `[VERIFIED]`
2. **Claude implemented** Phase A (helper module + service refactor + route validation + frontend POST shape + tests). `[VERIFIED]`
3. **Gemini reviewed** the implementation diff and wrote findings to `AI-Village-Documentation/gemini-consults/latest.md`. `[VERIFIED]`
4. **Codex final gate** reviewed Claude's code and Gemini's review; Codex found one substantive gap (goal bias was initially response metadata only), patched it, and reran targeted verification. `[VERIFIED]`
5. **APPROVE -> commit.** REVISE -> iterate. REJECT -> return to planning.
6. Post-Phase-A: Rule 48 audit record at `docs/ai-workflow/AI-HANDOFF/WORKOUT-BUILDER-PHASE-A-AUDIT-RECORD-<DATE>.md`.

---

## Section 9 - Approved Scope Gates Before Code

1. Section 1 surface classification is authoritative for Phase A only. Surface #4 is referenced but end-to-end mount-unverified; it must be re-audited before any future cleanup, archive, or consolidation decision touches it.
2. Section 2.3 IDOR finding remains a Phase B blocker (no saved-plan click handler before middleware fix).
3. Section 5 is the Phase A scope: opinionated NASM-safe goal config in a NEW `workoutBuilderGoalConfig.mjs` module, no admin UI, no surface consolidation, no DB migration.
4. Phase A targets BOTH `/generate` and `/plan` (not just `/plan`).

These gates were cleared before coding and remain the scope boundaries for this commit.

---

## Section 10 - Phase A Implementation Addendum (Codex Gate - 2026-04-30)

### 10.1 - Actual files in the commit slice

| File | Status | Purpose |
|---|---|---|
| `backend/services/workoutBuilderGoalConfig.mjs` | new | Pure goal strategy helper: allowlist, normalization, starting phase resolver, goal-aware mesocycle phase sequence, OPT bias map. |
| `backend/services/workoutBuilderService.mjs` | modified | Consumes goal helper, applies goal bias to exercise selection and OPT set/rep/rest targets, emits `primaryGoal`, `goalBias`, `rationale`, and raw `phaseParams` bands. |
| `backend/routes/workoutBuilderRoutes.mjs` | modified | Accepts safe `primaryGoal`, `nasmPhase`, and `startingPhaseOverride` fields; invalid values fall back without 400. |
| `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` | modified | Sends selected `goal` and `phaseNumber` to `/generate` and `/plan`; no UI restructure. |
| `backend/__tests__/workoutBuilderGoalConfig.test.mjs` | new | Source-contract tests for helper determinism, allowed goals, phase sequence, and OPT bias behavior. |
| `backend/__tests__/workoutBuilderService.goalAware.test.mjs` | new | Service behavior tests for goal-distinct plans, phase overrides, response metadata, raw phase bands, and biased prescriptions. |
| `backend/__tests__/workoutBuilderRoutes.validation.test.mjs` | new | Supertest route validation for new fields and legacy caller preservation. |

### 10.2 - Codex review finding and remediation

Codex finding: the first implementation emitted `goalBias` and `rationale`, but did not prove the bias shaped exercise selection or set/rep/rest prescriptions. Remediation applied before approval:

- `selectExercises(...)` now takes `goalBias` and sorts by recency, then goal-fit score, then NASM level difference.
- `applyOPTParams(...)` now takes `goalBias` and narrows set/rep/rest selection inside the existing NASM OPT band where the goal intentionally biases that phase.
- Phase 2 hypertrophy keeps canonical OPT set/rep/rest bands while still changing exercise priority, so the smoke check can verify Phase 2 `8-12` reps and `0-60s` rest without losing goal-aware metadata.
- Tests assert substantive behavior, not metadata-only behavior.

### 10.3 - Verification

- `cd backend && npx vitest run __tests__/workoutBuilderGoalConfig.test.mjs __tests__/workoutBuilderService.goalAware.test.mjs __tests__/workoutBuilderRoutes.validation.test.mjs` -> 86/86 pass. `[VERIFIED]`
- `cd frontend && npm run build` -> pass; existing Vite chunk-size/dynamic-import warnings only. `[VERIFIED]`
- `cd frontend && NODE_OPTIONS=--max-old-space-size=16384 npx tsc --noEmit --pretty false` -> full project still fails on pre-existing baseline errors in archived/dead and unrelated utility/theme paths. No Phase A slice error appeared in the visible output, but the baseline is not clean. `[VERIFIED baseline-fail / LIKELY slice-clean from build + targeted diff review]`
- Secret-pattern scan over the eight Phase A paths -> no hits. `[VERIFIED]`
- `git diff --check -- <eight Phase A paths>` -> no whitespace errors. `[VERIFIED]`
- Gemini review -> backend correctness not blocked; Gemini's UI recommendations are deferred because Phase A is explicitly no-UI-restructure transport and generation plumbing. `[VERIFIED]`

### 10.4 - Residual smoke requirement

Authenticated browser smoke was not run in this Codex session. The pre-push substitute evidence is the route-level Supertest probe plus service behavior tests. Post-deploy smoke must still cover:

1. `/dashboard/admin/workout-planner` or `/dashboard/trainer/workout-planner`: generate a single workout with `hypertrophy` + Phase 2 and confirm response contains `primaryGoal: "hypertrophy"` plus raw Phase 2 `phaseParams.reps: "8-12"` and `phaseParams.rest: "0-60s"`.
2. Same client and phase with `strength`: confirm `goalBias` or exercise/prescription output differs.
3. Generate a 12-week plan with hypertrophy + Phase 2 starting override: confirm later mesocycles hold Phase 3.
4. `/dashboard/trainer/workout-forge`: regression check only; this commit does not touch the surface.

---

**End of receipt.** Sections 1-9 are pre-code evidence; Section 10 records the implemented Phase A gate.
