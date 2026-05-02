# Final Codex Review Request — Long-Horizon Workout Plan workstream (L1 → L6)

You are GPT-5.5 acting as Codex, the **final gate** in the SwanStudios 3-brain review loop. Sean wants an end-of-workstream anti-sycophantic review covering 12 commits over ~36 hours that landed the long-horizon workout plan arc.

## Why this review

Each of the 12 commits below was either built to one of your prior reviews or fixed a finding from a prior round. After Codex's final APPROVE-or-REVISE on this single review, Sean considers the workstream **closed** and shifts to the next priority. So this is the gate between "shipped" and "monitored." The bar is high; do not approve casually.

## Scope

**12 commits, 33 files, +5518 / -184 lines.**

```
f653d3dd1  docs(workout-planner): L6 - backwards-compat audit (final phase doc)
1d634af8e  feat(workout-planner): L3 - branded PDF export of populated long-horizon plan
0e160bfd8  feat(workout-planner): L5.9 - client self-gen status pill + dormant gate
37453e29d  feat(admin): L5 admin toggle - canGenerateWorkoutPlans per-client switch
7536f64af  feat(workout-builder): L5 backend - client self-service gate (Codex-approved plan)
3d15f051e  fix(workout-planner): L1 REV 2 round-3 - top-level precedence + L5 prompt
ffceb50ac  fix(workout-planner): L1 REV 2 round-2 - Codex precedence + stale-comment fix
bba364bad  feat(workout-planner): L2.C - long-horizon Month/Week/Day drill-down
3b0f78cf1  feat(workout-planner): L2.A + L2.B - duration 48w + Rolodex desktop density
b642672fd  feat(workout-logger): L4 - cursor-driven plan pre-fill from currentSession
df879405c  fix(workout-planner): L1 REV 2 - Codex post-implementation fixes
089844f16  feat(workout-builder): L1 long-horizon planData populator + shared shape service
```

## Mandatory shell evidence (paste output, or call out env limits)

```bash
git -C . rev-parse HEAD                                     # should be f653d3dd1 or later
git -C . log --oneline 089844f16~1..HEAD                    # 12 commits
git -C . diff --stat 089844f16~1..HEAD                      # 33 files, ~5518/+, ~184/-
rg -n "pickFirstNonEmptyArray" backend                       # used in BOTH helpers + same precedence
rg -n "ENABLE_CLIENT_PLAN_SELFGEN" backend frontend          # env flag wired correctly?
rg -n "loadFreshCanGenerateFlag" backend                     # fresh DB read, not JWT
rg -n "canGenerateWorkoutPlans" backend frontend             # all consumers handle it
rg -n "exportPopulatedPlanPDF" frontend                      # one producer, one wired button
rg -n "rotationFallback" backend frontend                    # backend emits, frontend renders
rg -n "currentSession\.exercises" frontend/src               # L4 cursor consumers
rg -n "weeks\?:|recommendationDetails\?:" frontend/src       # additive type fields, optional
psql # information_schema sanity:
#   SELECT column_name, data_type FROM information_schema.columns
#   WHERE table_name = 'Users' AND column_name = 'canGenerateWorkoutPlans';
```

## Files loaded for this review (via --files)

- `backend/services/workoutPlanShapeService.mjs` — shared shape helpers (3-round precedence work).
- `backend/services/workoutBuilderService.mjs` — populator emitting `weeks[].days[].exercises[]` + `recommendationDetails[]`.
- `backend/routes/workoutBuilderRoutes.mjs` — L5 4-step gate (env → self → flag → assignment).
- `backend/middleware/verifyClientAccess.mjs` — `loadFreshCanGenerateFlag` helper.
- `backend/migrations/20260502000000-add-can-generate-workout-plans-to-users.cjs` — L5 migration + backfill.
- `backend/models/User.mjs` — new column.
- `backend/__tests__/workoutPlanShapeService.test.mjs` — 22 cases.
- `backend/__tests__/workoutBuilderRoutes.l5Gate.test.mjs` — 13 auth-matrix cases.
- `backend/routes/clientWorkoutRoutes.mjs`, `backend/controllers/adminClientController.mjs`, `backend/routes/userManagementRoutes.mjs`.
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` — L4 cursor prefill.
- `frontend/src/components/DashBoard/Pages/admin-workout-planner/LongHorizonScheduleView.tsx` — L2.C.
- `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` — L2/L3/L5.9 wire-up.
- `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerTypes.ts` — additive types.
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientPlanGenToggle.tsx` — L5.8.
- `frontend/src/services/pdfExportService.ts` — L3 exporter.
- `AI-Village-Documentation/workout-planner-L6-backcompat-audit-2026-05-02.md` — L6 audit.

## Review sections (please output ALL of these)

### A. Cross-slice regression hunt

The 12 commits ship in dependency order, but this final review is the first pass that sees them all together. Specifically check:

1. **L1 round 1, 2, 3 precedence fixes**: `extractCurrentSession` and `planDataToWorkoutDays` agree on (a) `week.days[]` vs `week.sessions[]` precedence (round 2), (b) top-level `planData.days[]` vs `planData.sessions[]` precedence (round 3), (c) `pickFirstNonEmptyArray` semantics in both fallback chains. Verify the precedence-agreement test in `workoutPlanShapeService.test.mjs` actually fails on the prior order.

2. **L4 cursor consumer**: `WorkoutLogger.loadTodaysPlan` reads `data.currentSession.exercises[]` first. Does it fall through correctly when:
   - `currentSession` is `null` (pre-L1 plans)?
   - `currentSession.exercises` is `[]` (empty cursor — degenerate)?
   - `data.currentSession` is `undefined` but `data.plan.currentSession` exists at the same JSON depth?
   The L1 contract embeds `currentSession` at three levels (`body.currentSession`, `body.data.currentSession`, `body.plan.currentSession`); confirm L4 picks ONE coherent path that is deep-equal to the others post-JSON.

3. **L2.C drill-down vs L3 PDF parity**: both `LongHorizonScheduleView.getDaysOfWeek()` and `exportPopulatedPlanPDF`'s `pickFirstNonEmpty` use the same `days[]`-then-`sessions[]` precedence. If a plan ever has both populated, the rendered schedule must match the PDF. Verify by trace.

4. **L5 migration + L5.9 planner**: confirm the migration's backfill (`UPDATE "Users" SET "canGenerateWorkoutPlans" = true WHERE id IN (SELECT DISTINCT "userId" FROM workout_plans)`) actually targets the canonical `"Users"` table (PascalCase quoted) AND the existing camelCase `workout_plans.userId` column. A typo here would either silently no-op (mismatch table) or fail the migration.

5. **L5 gate ordering attack**: confirm Codex's prescribed reproduction is closed:
   - Authenticated client with `canGenerateWorkoutPlans=false` POSTs `{ clientId: <own user id> }` with `ENABLE_CLIENT_PLAN_SELFGEN=true` → 403 (NOT 200). The "self-bypass-as-early-allow" attack must NOT be implemented.
   - Authenticated client with `canGenerateWorkoutPlans=true` but `clientId !== req.user.id` → 403 (cross-user spoofing).

### B. Test coverage audit

Total new test cases this workstream: **70+** across 6 test files. Are there test cases that SHOULD exist but don't?

- `extractCurrentSession` with `Array.isArray(ex.sets)` arrays (compound set lists, not just numeric counts)?
- `LongHorizonScheduleView` Month-1 → Month-6 → Month-1 selection-reset/clamp cycle?
- L5 gate `Case 11` (revoked-flag honored) is currently sequential; is there a race where two simultaneous requests with the same JWT could see stale state?
- L3 PDF: 24-week × 4×/wk plan = 96 day tables — does the autoTable invocation actually scale, or does jsPDF run out of memory at that size?
- L5.8 admin toggle: does the optimistic UI revert work when the API returns 400 (bad payload) vs 500 (server error) vs 403 (auth lost)?

### C. Anti-rework gate (Rule 52)

Multiple slices touch `workoutPlanShapeService.mjs` (3 rounds) and `workoutBuilderRoutes.mjs` (Phase A + L5). Apply Rule 52 burden-of-proof to any flag you'd raise:

- If you flag a "missed bug" in either file, point to the failing test or specific reproduction.
- If you flag the deferred MEDIUMs from your round-1 review (verifyClientAccessByPlanId getModel try/catch, WorkoutLogger AbortController signal), accept Sean's deferral OR justify why they're now blocking.

### D. Schema-drift check (Rule 58)

The L1 work is strictly additive within `planData` JSONB. The L5 work adds ONE new column on the canonical `"Users"` table. Verify:

1. No raw SQL elsewhere in the codebase references `users.canGenerateWorkoutPlans` (lowercase, would fail).
2. No FK constraint or join relies on the new column.
3. Sequelize `User.mjs` field declaration matches the migration's `addColumn` shape exactly (BOOLEAN, allowNull: false, defaultValue: false).
4. The strict whitelist in `adminClientController.updateClient` coerces non-booleans correctly (`true`, `'true'`, `1`, `'1'` — what's the actual coercion rule?).

### E. Karpathy discipline

Per CLAUDE.md cross-cutting principles:

1. **Surgical Changes** — does any commit touch unrelated code? Specifically:
   - L4 only touches `WorkoutLogger.loadTodaysPlan` + tests, OR did it bleed into the ghost prefill path / submission flow?
   - L2.B Rolodex viewport adaptation only touches `NASMExerciseRolodex` + the hook, OR did styled-components leak elsewhere?
2. **Simplicity First** — `ClientPlanGenToggle.tsx` is 236 LOC. Is that the minimum, or is there boilerplate?
3. **Goal-Driven** — every test should map to a specific success criterion, not "happy path." Spot-check `workoutBuilderRoutes.l5Gate.test.mjs` cases 6 + 11 — do they exercise the actual contract or a degenerate one?

### F. L6 audit verification

`AI-Village-Documentation/workout-planner-L6-backcompat-audit-2026-05-02.md` claims "zero BLOCKING cells across the matrix." Verify a sample:

- Shape A (`weeklySchedule[]` only) → `extractCurrentSession()` returns `null`. UI falls back to `plan.days[]`. Confirm `plan.days[]` from `planDataToWorkoutDays()` actually contains rows for shape A (it should fall through to `data.weeklySchedule` per `:84-90`).
- Shape D (empty `weeks[]`) on `LongHorizonScheduleView` — claims `RENDERS-EMPTY` per the empty-state branch. Verify the gate at `WorkoutPlannerPage` (`weeks?.length >= 4`) prevents the empty-week mount in the first place.

If any cell is mis-classified, flag it.

### G. Final verdict

**APPROVE-WORKSTREAM** / **REVISE-AT-DIFF** (specify which commits and what) / **REJECT-RETROACTIVELY** (specify what to revert and why).

If APPROVE-WORKSTREAM: confirm the deferred MEDIUMs (verifyClientAccessByPlanId getModel + AbortController signal) are acceptable as backlog items, NOT regressions to fix in a 13th commit.

If REVISE-AT-DIFF: rank the issues by severity. Sean will decide which to fix in this slice vs defer.

If REJECT-RETROACTIVELY: name the specific commit(s) to revert and the production impact you anticipate.

## Hard constraints

- CLAUDE.md rules 1, 4, 6, 7, 8, 17, 26, 27, 28, 29, 41, 42, 46, 50, 51, 52, 56, 58 still apply.
- No new ORM models. No Material-UI. Crystalline Swan only.
- The L5 env flag `ENABLE_CLIENT_PLAN_SELFGEN` stays OFF on Render until Sean explicitly flips it. Do not assume rollout has happened.
- Be direct. Sean is paying for this review. Anti-sycophancy + specific reproduction steps. No padding.
