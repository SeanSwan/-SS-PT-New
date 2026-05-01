# Workout Builder Phase B - Canonical Surface Receipt - 2026-04-30

**Status:** Pre-code receipt (REV 1). No runtime code touched in this artifact.
**Scope:** IDOR mitigation on WorkoutPlan routes + saved-plan click-to-load hydration in WorkoutPlannerPage.
**Predecessor:** Phase A shipped at commit `42566ccc9` (goal-driven generation). Phase B was deferred from Phase A because its feature (clickable saved plans) requires the IDOR fix to land first per Codex's rule-46 review chain directive.
**Authority:** CLAUDE.md rules 26 (Canonical Surface Receipt), 27 (Surface Classification), 31 (Backend Route Ownership), 21 (Definition of Done), 46 (3-Brain review loop), 51 (Confidence tags), 4 (file size discipline).

---

## Section 1 - Surface Classification (Rule 27)

Phase B touches the same canonical surface Phase A established: [WorkoutPlannerPage.tsx](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx) at `/dashboard/admin/workout-planner` and `/dashboard/trainer/workout-planner`. Mounted-JSX proof unchanged from Phase A receipt section 1.1 ([UniversalDashboardLayout.tsx:859-873](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L859-L873)).

No new surfaces introduced. No surface classification changes. `[VERIFIED]`

---

## Section 2 - Backend Route Ownership / IDOR Scope (Rule 31)

### 2.1 - Full IDOR enumeration on `workoutPlanRoutes.mjs`

The Phase A receipt (section 2.3) flagged IDOR on `GET /:id` only. Phase B re-audit shows **all seven endpoints share the same IDOR class**:

| # | Endpoint | Line | Current auth | Risk |
|---|---|---|---|---|
| 1 | `GET /` | [49](backend/routes/workoutPlanRoutes.mjs#L49) | `protect + trainerOrAdminOnly` | Trainer can list any client's plans by passing `?clientId=` |
| 2 | `GET /client/:userId` | [84](backend/routes/workoutPlanRoutes.mjs#L84) | `protect + trainerOrAdminOnly` | Trainer can list any other trainer's clients' plans |
| 3 | `GET /:id` | [129](backend/routes/workoutPlanRoutes.mjs#L129) | `protect + trainerOrAdminOnly` | Trainer can read any plan by guessing UUID |
| 4 | `POST /` | [157](backend/routes/workoutPlanRoutes.mjs#L157) | `protect + trainerOrAdminOnly` | Trainer can create a plan with `userId` set to another trainer's client (mass-assignment) |
| 5 | `PUT /:id` | [219](backend/routes/workoutPlanRoutes.mjs#L219) | `protect + trainerOrAdminOnly` | Trainer can mutate any plan's title/planData/etc |
| 6 | `PUT /:id/advance` | [269](backend/routes/workoutPlanRoutes.mjs#L269) | `protect + trainerOrAdminOnly` | Trainer can advance any plan's session cursor |
| 7 | `DELETE /:id` | [372](backend/routes/workoutPlanRoutes.mjs#L372) | `protect + trainerOrAdminOnly` | Trainer can soft-delete any plan |

`[VERIFIED]` via direct read of the route file in current tree.

Same IDOR exists on the legacy mirror mount `/api/workout/plans/*` because [core/routes.mjs:331](backend/core/routes.mjs#L331) routes both prefixes to the same router instance. **One middleware fix covers both prefixes.**

### 2.2 - Existing mitigation pattern (re-use, don't reinvent)

[workoutBuilderRoutes.mjs:27-40](backend/routes/workoutBuilderRoutes.mjs#L27-L40) defines `verifyClientAccess(userId, userRole, clientId)`:
- Admin → returns `true` (bypass).
- Trainer → SQL query against `ClientTrainerAssignments` table (`trainerId + clientId + isActive`).
- Catch block → **fails closed**: if the table is missing or query throws, returns `false`. Logged but does not throw.

This is the correct pattern. Phase B extracts it to a shared module so all 7 endpoints can re-use it without duplication.

### 2.3 - Middleware extraction plan

**New file:** `backend/middleware/verifyClientAccess.mjs`

**Exports:**
- `verifyClientAccessByUserId({ paramName = 'userId', bodyField = 'userId' })` - returns Express middleware. Resolves `clientId` from `req.params[paramName]` first, then `req.body[bodyField]`. Returns 400 if neither present. For routes 1, 2, 4 above (GET /, GET /client/:userId, POST /).
- `verifyClientAccessByPlanId({ paramName = 'id', modelName = 'WorkoutPlan' })` - returns Express middleware. Looks up plan by `req.params[paramName]` first, then verifies trainer assigned to `plan.userId`. Returns 404 if plan missing (matches existing handler behavior to avoid leaking existence). For routes 3, 5, 6, 7 above. Attaches `req.workoutPlan = plan` so handlers don't have to refetch.
- `filterPlansByTrainerAssignment(req, plans)` - utility for GET / list endpoint to filter results to trainer-assigned clients only. Returns plans unchanged if admin.

**Behavior:** All three reuse the same `assertAssignmentOrAdmin(userId, role, clientId)` core helper, identical to the existing `verifyClientAccess` body. Fail-closed semantics preserved.

**Backward compatibility:** Phase A's `workoutBuilderRoutes.mjs:27-40` `verifyClientAccess` function stays in place. Phase B does NOT remove it. A follow-up cleanup pass can replace it with an import from the new middleware module after Phase B ships and is reviewed - explicit out-of-scope here per rule 37.

### 2.4 - Endpoint application matrix

| # | Endpoint | Phase B middleware applied | Notes |
|---|---|---|---|
| 1 | `GET /` | (none) + `filterPlansByTrainerAssignment` post-query | Filter results in handler; do not 403 list endpoint to avoid breaking admin clients |
| 2 | `GET /client/:userId` | `verifyClientAccessByUserId({ paramName: 'userId' })` | Pre-handler |
| 3 | `GET /:id` | `verifyClientAccessByPlanId({ paramName: 'id' })` | Pre-handler. Sets `req.workoutPlan` so handler's `findByPk` becomes redundant - drop the duplicate fetch |
| 4 | `POST /` | `verifyClientAccessByUserId({ bodyField: 'userId' })` | Pre-handler. Mass-assignment of `userId` becomes safe |
| 5 | `PUT /:id` | `verifyClientAccessByPlanId({ paramName: 'id' })` | Same as #3, plus existing whitelist guard preserved |
| 6 | `PUT /:id/advance` | `verifyClientAccessByPlanId({ paramName: 'id' })` | Same |
| 7 | `DELETE /:id` | `verifyClientAccessByPlanId({ paramName: 'id' })` | Same |

---

## Section 3 - Schema Cross-Check (Rule 29)

`WorkoutPlan` model fields are unchanged from Phase A receipt section 3.1. Phase B reads the same fields for hydration:

| Builder state | Source | Hydration logic |
|---|---|---|
| `phaseNumber` | `plan.nasmPhase` | direct integer |
| `goal` | `plan.planData.goal` | nested in JSONB; fall back to empty if missing |
| `category` | `plan.planData.category` | nested in JSONB; fall back to first day's `focus` if missing |
| `planDuration` | `plan.durationWeeks` | string for the existing select; map to `'4'`, `'8'`, `'12'`, `'24'`, `'single'` |
| `sessionsPerWeek` | not currently saved | default to current state value; do not clobber |
| `planExercises` | `plan.planData.weeks[0].days[0].exercises` | single-day plans (most common from `handleSave`) |
| `generatedPlan` | `plan.planData` (mesocycle-shaped) | for multi-week plans only - if `weeks.length > 1` |

The hydration is **direction-aware** - single-day plans hydrate `planExercises`, multi-week plans hydrate `generatedPlan`. The branching key is `plan.planData.weeks.length`. `[VERIFIED]` against the save-side code at [WorkoutPlannerPage.tsx:458-490](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L458-L490).

No phantom fields. No drift. No DB migration.

---

## Section 4 - Defect Chain (verified failures)

### 4.1 - Security defects

**S1.** IDOR on `GET /api/workout-plans/:id`. Trainer A can read trainer B's client plans by guessing UUID. `[VERIFIED]` Phase A receipt section 2.3.

**S2.** IDOR on `PUT /api/workout-plans/:id`. Trainer A can mutate any plan's title/planData/status. `[VERIFIED]`

**S3.** IDOR on `PUT /api/workout-plans/:id/advance`. Trainer A can advance any plan's session cursor. `[VERIFIED]`

**S4.** IDOR on `DELETE /api/workout-plans/:id`. Trainer A can soft-delete any plan. `[VERIFIED]`

**S5.** Mass-assignment on `POST /api/workout-plans`. Trainer A can create a plan with `userId` belonging to trainer B's client. `[VERIFIED]`

**S6.** Trainer-scope leak on `GET /api/workout-plans` and `GET /api/workout-plans/client/:userId`. Trainer A can list trainer B's clients' plans. `[VERIFIED]`

### 4.2 - UX defect (Phase B feature target)

**D7** (carried over from Phase A receipt section 4.2): [WorkoutPlannerPage.tsx:1088](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L1088) saved-plan card has `cursor: 'default'`, no `onClick`, no keyboard handler. User sees plans listed but cannot load them. Sean's words: "when I click on saved plans, it should pull up that saved plan and show it on the workout builder." `[VERIFIED]`

---

## Section 5 - Phase B Implementation Plan

### 5.1 - Module: `backend/middleware/verifyClientAccess.mjs` (new)

Pure helpers + Express middleware factories. Imports `sequelize` from `../database.mjs` and `getModel` from `../models/index.mjs` for the `verifyClientAccessByPlanId` plan lookup.

**Logger calls:** match the existing `[WorkoutBuilder] ClientTrainerAssignment check failed` warn pattern; include the request method + path for traceability without leaking IDs.

**404 vs 403 contract:**
- Plan missing → 404 (matches existing handler behavior at [workoutPlanRoutes.mjs:134](backend/routes/workoutPlanRoutes.mjs#L134-L136)).
- Plan exists but trainer not assigned → 404 (NOT 403). Reason: 403 leaks plan existence; 404 does not. Better security UX.
- Admin → always passes through.

### 5.2 - Route file: `backend/routes/workoutPlanRoutes.mjs` (modified)

Apply middleware per the matrix in section 2.4. Where `verifyClientAccessByPlanId` runs, it sets `req.workoutPlan`; the handler then uses `req.workoutPlan` instead of duplicating `WorkoutPlan.findByPk(req.params.id)`. Net effect: routes get shorter, not longer.

For `GET /` filtering: in-handler post-query filter via `filterPlansByTrainerAssignment(req, plans)`. Admin path unchanged.

### 5.3 - Frontend: `WorkoutPlannerPage.tsx` (modified)

**`MesocycleCard` becomes interactive:**
- `cursor: 'pointer'` (replace existing `'default'`).
- `onClick` handler calls `handleLoadPlan(plan.id)`.
- `tabIndex={0}`, `role="button"`, `onKeyDown` for Enter/Space (a11y).
- `aria-label={`Load plan: ${plan.name}`}`.

**`handleLoadPlan(planId)` new function:**
- GET `/api/workout-plans/${planId}` (canonical path; legacy `/api/workout/plans/${planId}` works equivalently per the dual mount in [core/routes.mjs:330-331](backend/core/routes.mjs#L330-L331) - canonical preferred).
- On 200: hydrate state per section 3 hydration map.
- On 404: toast "Plan not found or not authorized" (the IDOR-safe response).
- On 401/network error: toast "Failed to load plan."

**Dirty-state confirm:**
- New state: `isDirty` (boolean). Set true on any mutation of `planExercises` after hydration.
- If `isDirty && planExercises.length > 0`, the click handler shows a `window.confirm("You have unsaved changes. Load this plan and discard them?")` before fetching. Adequate for v1; Phase D could replace with a styled modal.

**"Loaded from" banner:**
- New state: `loadedPlanId: string | null`, `loadedPlanName: string | null`.
- When set, render a `LoadedFromBanner` styled-component above the builder showing the plan name + a "Save changes" button (PUT `/api/workout-plans/:id`) and a "Save as new copy" button (POST `/api/workout-plans`).
- "Save changes" only enabled when `isDirty`.
- Existing `handleSave` becomes "Save as new copy" path; new `handleSaveChanges` does PUT.

**Visual:** styled-components only, dark-first, no MUI. Matches existing Crystalline Swan tokens. 44px touch targets on the new buttons. Banner uses `var(--accent-primary, #60C0F0)` left border + sapphire glass background.

### 5.4 - Out of scope for Phase B (recorded for follow-up)

Per rule 37 (cleanup is a separate pass) and Codex's prior directive, Phase B does NOT touch:

1. Replace the inline `verifyClientAccess` function in [workoutBuilderRoutes.mjs:27-40](backend/routes/workoutBuilderRoutes.mjs#L27-L40) with an import from the new middleware module. Defer to a hygiene-pass slice.
2. Phase C rolodex visual cleanup (separate slice with its own scope).
3. Phase D Workout Forge consolidation (separate slice with its own rule 26/27 receipt).
4. Multi-week plan editing UI - Phase B hydrates `generatedPlan` for read display only when `weeks.length > 1`, but trainers cannot edit multi-week plans inline yet. That's its own slice.
5. Plan diff / comparison UI between current builder state and the loaded plan.
6. Audit logging on plan load (which trainer loaded which plan when). Defer to security-monitoring phase.

---

## Section 6 - Tests (Tier-A, TDD per rule 21)

Test order per rule 21: middleware tests first, then route tests, then frontend.

| Test file | Target | What it proves |
|---|---|---|
| `backend/__tests__/verifyClientAccess.test.mjs` | new middleware module | Admin bypass works; trainer with valid assignment passes; trainer without assignment returns 404 (not 403); missing plan returns 404; ClientTrainerAssignments table missing fails closed (not open); both `verifyClientAccessByPlanId` and `verifyClientAccessByUserId` tested independently. |
| `backend/__tests__/workoutPlanRoutes.idor.test.mjs` | route-level integration | Trainer A cannot GET trainer B's plans (404 not 200); trainer A cannot PUT/DELETE/PUT-advance trainer B's plans; trainer A cannot POST a plan with another trainer's `userId`; admin retains full access; GET / list filters to trainer's clients; GET /client/:userId blocks cross-trainer access; legacy `/api/workout/plans/*` mount enforces same gates (test both prefixes). |
| `frontend/src/components/DashBoard/Pages/admin-workout-planner/__tests__/WorkoutPlannerPage.savedPlanLoad.test.tsx` | frontend hydration | Click on saved plan card calls `GET /api/workout-plans/:id`; success populates `planExercises`, `phaseNumber`, `goal`, `category`, `planDuration`; 404 shows "not authorized" toast; dirty-state confirm appears when `planExercises.length > 0` and is dirty; keyboard Enter on focused card triggers load. |

Every test in `backend/__tests__/` runs under the existing vitest include pattern (Phase A confirmed). Frontend tests run via `cd frontend && npx vitest run`.

---

## Section 7 - Verification Matrix

- `cd backend && npx vitest run __tests__/verifyClientAccess.test.mjs __tests__/workoutPlanRoutes.idor.test.mjs` - pass.
- `cd frontend && npx vitest run` (targeted to changed component test) - pass.
- `cd frontend && npm run build` - pass.
- `cd frontend && npx tsc --noEmit` - report status honestly per rule 56. Slice-clean expected; baseline status reported as `[VERIFIED clean]` or `[UNVERIFIED carrying N pre-existing]` with explicit count.
- **Local pre-commit smoke (REQUIRED before push, rule 47 applies):**
  1. `npm run dev` from repo root.
  2. Login as a trainer with at least one assigned client AND one OTHER trainer's plan ID known (admin can fetch any plan to grab a foreign UUID).
  3. As trainer, GET `/api/workout-plans/<own-client-plan-id>` - expect 200.
  4. As trainer, GET `/api/workout-plans/<other-trainer-plan-id>` - expect **404** (not 200, not 403).
  5. In the UI: click a saved plan card. Expect builder hydrates with the plan. Verify `planExercises` populates and `phaseNumber` updates.
  6. Edit one exercise then click another saved plan card. Expect dirty-state confirm dialog.
  7. Click "Save changes" - expect PUT and a success toast.
- **Manual smoke (post-deploy):** repeat steps 3-7 against production with a real trainer login.

---

## Section 8 - Confidence Tag Summary (Rule 51)

- Endpoint inventory (section 2.1): `[VERIFIED]` against current tree.
- IDOR scope (section 2.1, defects S1-S6): `[VERIFIED]` - the auth chain is `protect + trainerOrAdminOnly` only on every endpoint, no per-resource owner check anywhere.
- Existing `verifyClientAccess` pattern (section 2.2): `[VERIFIED]` at workoutBuilderRoutes.mjs:27-40.
- Hydration field map (section 3): `[VERIFIED]` against the save path at WorkoutPlannerPage.tsx:458-490 (writes `userId, title, description, nasmPhase, planData{ weeks, goal, category }`).
- 404-not-403 contract (section 5.1): `[LIKELY]` better security UX; no project precedent reviewed - open to alternative if Sean prefers 403.
- Phase A's `req.user` shape (`{ id, role, ... }`): `[VERIFIED]` at authMiddleware.mjs reference.
- Mounted-JSX proof: same as Phase A receipt section 1.1, unchanged.

---

## Section 9 - Review Chain (Rule 46)

This receipt is the pre-code artifact. Implementation chain matches Phase A:

1. **Sean approval** of this REV 1 receipt as the authoritative pre-code surface map. <- gate
2. **Claude implements** Phase B (middleware module + route updates + frontend hydration + tests, in that order).
3. **Gemini reviews** the diff and writes findings to `AI-Village-Documentation/gemini-consults/latest.md`.
4. **Codex final gate** - reviews Claude's code AND Gemini's review. APPROVE / REVISE / REJECT.
5. **APPROVE → commit.** REVISE → iterate. REJECT → planning.
6. Post-Phase-B: rule-48 audit record at `docs/ai-workflow/AI-HANDOFF/WORKOUT-BUILDER-PHASE-B-AUDIT-RECORD-<DATE>.md`.

---

## Section 10 - Pending Approval Gates Before Code

1. Approve full IDOR lockdown scope (all 7 endpoints, not just `GET /:id`). Codex's Phase A directive named only `GET /:id` as the feature blocker; Phase B receipt expands to all 7 because the same middleware fixes them all and partial fixes invite finger-pointing later. Confirm.
2. Approve 404-not-403 response on cross-trainer access. This matches the IDOR-safe pattern (don't leak resource existence). Confirm.
3. Approve `req.workoutPlan` attachment so handlers drop their redundant `WorkoutPlan.findByPk` calls. Slight refactor; test coverage carries it.
4. Approve `MesocycleCard` becoming a button (cursor pointer + role + tabIndex + aria-label). v1 dirty-state guard via `window.confirm` is acceptable for ship - styled modal can come in a polish slice.
5. Approve out-of-scope locks in section 5.4 - particularly that the inline `verifyClientAccess` in `workoutBuilderRoutes.mjs` is NOT consolidated in this slice (deferred to hygiene pass).

**Once approved**, Claude proceeds to Phase B implementation on a fresh slice. No code is written before approval.

---

## ADDENDUM - Post-merge schema-mismatch hotfix - 2026-04-30

**Status:** Phase B shipped at commit `f34f1199c`. Codex post-merge REVISE 2026-04-30 caught a schema BLOCKER in BOTH the new shared middleware AND the original Phase A inline helper that the receipt's Section 2.2 promised to mirror.

### What broke

The new [backend/middleware/verifyClientAccess.mjs](backend/middleware/verifyClientAccess.mjs) was written by extracting the Phase A pattern at [backend/routes/workoutBuilderRoutes.mjs:27-40](backend/routes/workoutBuilderRoutes.mjs#L27-L40). That source pattern queried:

```js
SELECT 1 FROM "ClientTrainerAssignments"
WHERE "trainerId" = :trainerId AND "clientId" = :clientId AND "isActive" = true
```

But the real schema verified against [backend/models/ClientTrainerAssignment.mjs:88-115](backend/models/ClientTrainerAssignment.mjs#L88-L115) is:

- Table name: `client_trainer_assignments` (snake_case, NOT `"ClientTrainerAssignments"`)
- Active predicate: `status = 'active'` (string enum column, NOT `isActive` boolean)

The query targeted a non-existent table + non-existent column. The catch block converted the SQL error into a fail-closed deny. **Every trainer with a valid assignment got 404'd on every endpoint that consults this helper.** Bug invisible because Sean is admin (admins bypass the entire check).

### What landed in the hotfix

| File | Change |
|---|---|
| `backend/middleware/verifyClientAccess.mjs` | Replaced raw SQL with `getModel('ClientTrainerAssignment').findOne({ where: { trainerId, clientId, status: 'active' } })`. Removed `sequelize` import. Wrapped `getModel` + `findOne` in a single try/catch (getModel THROWS when model not in cache; the prior `if (!Model) return false` was unreachable code). |
| `backend/routes/workoutBuilderRoutes.mjs` | Same fix to inline `verifyClientAccess`. Replaced `sequelize` import with `getModel`. |
| `backend/__tests__/verifyClientAccess.test.mjs` | All `mockSequelizeQuery` references replaced with `mockAssignmentFindOne`. NEW regression test asserts `where.status === 'active'` AND `where` does NOT have `isActive`. NEW model-throw test exercises the corrected fail-closed path. **29 tests** (was 27). |
| `backend/__tests__/workoutBuilderRoutes.assignmentGuard.test.mjs` | NEW file. **5 tests** covering trainer-assignment guard in workoutBuilderRoutes via headers-based protect mock. Includes schema-shape regression assertion. |

### Test totals after hotfix

`backend && npx vitest run __tests__/`: **164/164 GREEN across 7 files.**

### Hostile-review revisions during the hotfix

1. Initial fix had `if (!Model) return false` after `getModel(...)`. Hostile-review caught: `getModel` throws on missing model, never returns null. The `if (!Model)` branch was unreachable AND the throw escaped the outer try/catch boundary. Re-fixed by moving `getModel` inside the try block in both files.
2. Initial test for "model unavailable" was a NOOP (asserted `typeof originalGetModel === 'function'`). Replaced with a real test that has `findOne` reject with the exact getModel throw signature.

### Carries

- `workoutBuilderRoutes.validation.test.mjs` mocks all users as admin - this is the structural gap that let the schema bug ship. New `assignmentGuard.test.mjs` covers it; original validation file should be amended in a follow-up to add at least one trainer-path test (M2 follow-up below addresses this).

### Confidence tags (Rule 51)

- Schema contract used by both call sites: `[VERIFIED]` against ClientTrainerAssignment.mjs:88-92, 115.
- Bug was unreachable to admin testing: `[VERIFIED]` - admin role bypass at function entry.
- Production trainer flow was broken since Phase A: `[LIKELY]` - same SQL pattern existed in workoutBuilderRoutes.mjs since Phase 9b; admin-only testing masked it.
- Fix safety on admin path: `[VERIFIED]` - admin still short-circuits at line 1.
- Fix safety on client path: `[VERIFIED]` - client self-equality check unchanged.
- Fail-closed semantics: `[VERIFIED]` - all error paths route through deny.

---

**End of receipt + addendum.** Hotfix is in working tree, awaiting Gemini -> Codex final gate per rule 46.
