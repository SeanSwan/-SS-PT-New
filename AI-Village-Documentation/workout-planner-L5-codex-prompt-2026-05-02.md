# Codex Review Request — L1 REV 2 + L4 + L2.A/B/C shipped, L5 about to land

You are GPT-5.5 acting as Codex, the **final gate** in the SwanStudios 3-brain review loop (Claude builds → Gemini reviews → Codex final gate). Sean wants an anti-sycophantic review of:

1. **What was just shipped (4 commits, all live on `origin/main` after Codex's prior REVISE):**
   - `df879405c` — L1 REV 2: applies your 4 prior findings (HIGH legacy-shape mismatch, MEDIUM empty-array-truthy, MEDIUM D3 test-import lock, LOW unused import). Adds 4 regression tests.
   - `b642672fd` — L4: WorkoutLogger now prefers `currentSession.exercises[]` over the legacy day-of-week match against `plan.days[]`. Toast announces "Week N — DayLabel". Falls through to legacy logic when cursor is null/empty. 4 new regression tests.
   - `3b0f78cf1` — L2.A + L2.B: dropdown 52w → 48w (12 mesocycles); Rolodex viewport-adaptive density (6 rows mobile, 10 rows desktop via `matchMedia('(min-width: 768px)')`).
   - `bba364bad` — L2.C: long-horizon Month → Week → Day drill-down for the populated `weeks[]`. New 414-LOC component + 8 regression tests + GeneratedPlan TypeScript extension.

2. **What is about to land (L5, blocked on your verdict):** see the L5 plan section below.

## Mandatory shell evidence commands

Run these and paste output (or call out if any environment limits you):

```bash
git -C . rev-parse HEAD                                       # should be bba364bad
git -C . log --oneline 089844f16..bba364bad                   # 4 commits
git -C . diff --stat 089844f16..bba364bad                     # 11 files, +1262 / -83
rg -n "extractCurrentSession" backend                          # Codex 2026-05-01 prior gate: shared module is the only producer
rg -n "planDataToWorkoutDays" backend                          # Codex 2026-05-01 prior gate: re-exports gone, test imports from shared
rg -n "pickFirstNonEmptyArray" backend                         # new helper in shape service - empty-array fallback
rg -n "currentSession" frontend/src/components/WorkoutLogger   # L4 cursor-driven prefill
rg -n "MAX_ROWS_DESKTOP|useVisibleRowCount" frontend/src       # L2.B viewport-adaptive
rg -n "LongHorizonScheduleView" frontend/src                   # L2.C surface
rg -n "canGenerateWorkoutPlans" backend frontend               # L5 - should currently return ZERO hits (not yet implemented)
```

## Files to review (loaded via --files in this consult)

**L1 REV 2:**
- `backend/services/workoutPlanShapeService.mjs` — fixed `extractCurrentSession` + `planDataToWorkoutDays`, added `pickFirstNonEmptyArray`
- `backend/routes/clientWorkoutRoutes.mjs` — re-exports dropped; unused import removed
- `backend/__tests__/workoutPlanShapeService.test.mjs` — +4 cases for top-level fallback + empty-array guard

**L4:**
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` — `loadTodaysPlan` cursor-driven path
- `frontend/src/components/WorkoutLogger/WorkoutLogger.l4Prefill.test.tsx` — 4 cases (cursor / fallback / empty / no-plan)

**L2.A + L2.B + L2.C:**
- `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerTypes.ts` — `'48'` instead of `'52'`; `weeks?: GeneratedPlanWeek[]` + `recommendationDetails?` additive
- `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.tsx` — `useVisibleRowCount` hook; `PreviewSide` media-query height
- `frontend/src/components/DashBoard/Pages/admin-workout-planner/LongHorizonScheduleView.tsx` — NEW 414-LOC drill-down
- `frontend/src/components/DashBoard/Pages/admin-workout-planner/LongHorizonScheduleView.test.tsx` — NEW 8 cases
- `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` — wire-up + recommendationDetails type label

**L5 (referenced but not yet implemented):**
- `backend/routes/workoutBuilderRoutes.mjs` — current state, soon to add gate
- `backend/models/User.mjs` — soon to add `canGenerateWorkoutPlans` column
- `backend/middleware/verifyClientAccess.mjs` — current trainer-client gate (will be wrapped, not replaced)

---

## Review sections (please output ALL of these)

### A. L1 REV 2 — were your prior 4 findings actually fixed?
For each finding from your 2026-05-01 review, classify: FIXED-CORRECTLY / FIXED-PARTIALLY / DEVIATES / NOT-FIXED.

1. **HIGH (blocking)**: `extractCurrentSession()` did not handle top-level `planData.days[]` / `planData.sessions[]` while `planDataToWorkoutDays()` did. Verify the new top-level fallback branch at `workoutPlanShapeService.mjs` actually fires for the legacy single-week shape AND lifts `exercises` per C1.
2. **MEDIUM**: `week.sessions || week.days` empty-array-truthy bug. Verify `pickFirstNonEmptyArray` is the consistent guard at every fallback chain in BOTH `extractCurrentSession` AND `planDataToWorkoutDays`.
3. **MEDIUM (D3)**: receipt §8 said update the existing test to import from shared service, NOT keep route re-exports. Verify route-level re-exports of `planDataToWorkoutDays` / `toCurrentWorkoutPlanResponse` are GONE and the test imports from `../services/workoutPlanShapeService.mjs`.
4. **LOW**: unused `extractCurrentSession` import in `clientWorkoutRoutes.mjs`. Verify removed.

Specifically check: did the regression tests actually exercise the bug class, or do they pass on degenerate cases?

### B. L4 — does the cursor-driven prefill match the L1 contract?

The L1 backend exposes `currentSession` at three levels (top-level, `data.currentSession`, `plan.currentSession`) all deep-equal post-JSON. The frontend reads ONE of those. Verify:

1. Which level is being read? Is the chosen path coherent with how the rest of the consumer reads response data?
2. Does the empty-array fall-through rule mirror the backend's? (i.e. `currentSession.exercises = []` falls through to legacy day-of-week match, NOT swallowed as a successful empty load.)
3. Is the day-name match in the legacy fallback case-insensitive (in case the backend ever emits `'Monday'` vs `'monday'`)?
4. Is the `restTime || restSeconds` adapter mapping consistent with what the L1 populator emits? (Backend emits `restSeconds`; frontend reads both — verify the precedence is correct so the cursor path doesn't overwrite a real `restTime` with a default.)
5. Tests use timezone-relative `new Date().getDay()` rather than fake timers — is this acceptable, or does it leave a flake hazard for tests run at midnight rolling boundaries?

### C. L2.A — duration union swap

`PlanDuration` type union changed from `'52'` to `'48'`. Backend Zod cap stays at 52. Verify:

1. Any string-literal `'52'` callers that would now fail TS check? (Should be NONE — receipt-tracked.)
2. Backend Zod `.max(52)` is still consistent with the new dropdown — does anything else read `'52'` as "annual"?
3. UI label "12 Months (48 weeks)" — does the new wording match how Sean described mesocycle math elsewhere?

### D. L2.B — Rolodex viewport adaptation

`useVisibleRowCount` uses `matchMedia('(min-width: 768px)')` with both `addEventListener` AND legacy `addListener` paths. Verify:

1. SSR-safe? (`typeof window === 'undefined'` guard — fine for Vite SPA, but does any test mount the component with a stubbed `matchMedia`?)
2. If `matchMedia` is missing on jsdom (it usually is), does the hook fall back gracefully or crash?
3. Memory leak risk: are there any code paths where the resize listener doesn't get cleaned up?
4. Mobile keyboard overlap: at 414px portrait with the keyboard up, does 6 rows × 56px still fit visibly above the keyboard, or does the input get pushed off-screen?

### E. L2.C — long-horizon drill-down

The new `LongHorizonScheduleView` renders Month → Week → Day → exercises. Specifically:

1. **Index clamping**: switching from Month 6 (24-week plan) to Month 5 — do `selectedWeek` / `selectedDay` clamp correctly so an invalid index doesn't crash? Is the clamping done BEFORE or AFTER the array lookup?
2. **`getDaysOfWeek` parity**: the helper picks `week.days[]` first, then `week.sessions[]`, but uses the same "non-empty wins" rule as the backend. Verify it matches `pickFirstNonEmptyArray` semantics exactly.
3. **Accessibility**: the Tab buttons have `role="tab"` + `aria-selected` but no `aria-controls` linking to the day-list / detail panel. Is that acceptable per WAI-ARIA Tabs Pattern, or a real a11y gap?
4. **Mobile responsiveness**: 24 month tabs × 4 week tabs × 4 day chips on a 320px screen — does the wrap behavior actually work, or does it overflow?
5. **`recommendationDetails` order drift**: receipt §C3 says `recommendations[i]` matches `recommendationDetails[i].text` in order. The new label render (`(${detail.type})`) assumes index alignment. Is that contract enforced anywhere, or is the frontend trusting it implicitly?
6. **Schema drift watch**: the `GeneratedPlan` interface now has optional `weeks` and `recommendationDetails`. Are there OTHER frontend consumers (besides `WorkoutPlannerPage`) that destructure `GeneratedPlan` and would benefit / break from these new fields?

### F. L5 plan validation (PRE-implementation review, anti-sycophantic)

The L5 plan from Sean's enhanced spec:

1. **Migration**: add `canGenerateWorkoutPlans BOOLEAN DEFAULT false` column on `"Users"` table (note: PascalCase quoted, per CLAUDE.md schema-drift rule 58 — there's also a `users` table that's stale; FK targets must be `"Users"`).
2. **Backfill**: set flag to `true` for any user with existing plan history so pre-L5 users keep access.
3. **Backend gate-ordering** in `backend/routes/workoutBuilderRoutes.mjs` (currently `authorize(['admin', 'trainer'])` — clients are blocked at router level):
   - Step 1: Self-bypass (`clientId === user.id` AND `user.role === 'client'`)
   - Step 2: Existing assignment check (`assertAssignmentOrAdmin`)
   - Step 3: Permission flag check (`role === 'client'` requires `canGenerateWorkoutPlans=true`)
4. **Role allowlist expansion**: `authorize(['admin', 'trainer', 'client'])` to let clients reach the route at all.
5. **Frontend admin client-settings UI toggle** (separate slice, not in scope yet).
6. **Frontend planner UI gate** — greyed-out generate button + tooltip; backend is the security.

For the L5 plan, please answer:

1. **Auth gate change risk**: expanding the role allowlist on a route currently restricted to admin/trainer is a security-sensitive change. Is the 3-step gate ordering (self-bypass → assignment → flag) actually safe, or is there an attack vector I'm missing? E.g., can a malicious client spoof `clientId === user.id` to bypass the flag check via the self-bypass branch?
2. **Default `false` deployment risk**: the migration defaults the column to `false`, locking ALL clients out until backfill runs. The spec says backfill `true` for users with existing plan history. What's the minimum-blast-radius migration order to avoid a "no client can generate plans" window? Should the column default to `true` and let admins opt-out, or default to `false` and accept the window?
3. **Schema drift hazard (Rule 58)**: adding a column to `"Users"` triggers proactive cross-check. Does the L5 column conflict with any existing field? Are there raw SQL queries or other Sequelize models that touch `"Users"` and would need a parallel update?
4. **Client self-mode in WorkoutLogger**: the existing logger already has an `isClientSelfMode` branch (see `WorkoutLogger.tsx`). Does the L5 client-side bypass align with that, or are there path mismatches?
5. **Tier-C trigger?** Per CLAUDE.md Rule 50, auth changes can warrant the AI Village (14-brain). Is this a Tier-C trigger, or is the 3-brain pipeline (you as Codex) sufficient given the well-defined scope?
6. **Feature-flag-then-rollout pattern**: should L5 ship behind a feature flag (e.g. `ENABLE_CLIENT_PLAN_SELFGEN=false` env var) rather than activated by the migration alone? That would let Sean toggle without code changes if something breaks.
7. **Test coverage required**: what test cases MUST exist before this lands? E.g., unauthenticated client → 401, authenticated unauthorized client → 403, authorized client with flag=false → 403, authorized client with flag=true → 200, admin bypass → 200, trainer-with-assignment → 200, trainer-without-assignment → 403.

### G. Hidden regression hunt across the 4 commits

What test cases SHOULD exist but don't?

- Did any commit mutate input by reference (e.g., `weeks[]` mutation in the drill-down view)?
- Does L4's `cursorExercises.map(exerciseToEntry)` correctly handle exercises with `Array.isArray(ex.sets)` (where `sets` is an array of set objects, not a count)?
- L2.C: switching Month 1 → Month 6 → Month 1 — does the day-index clamping leave selection at a stale Day, or reset to Day 1?
- The `rotationFallback` badge — is the assertion that `ex.rotationFallback === true` matches what the L1 populator actually emits? (Or is it `'true'` string?)
- L4 the toast `\`Loaded N exercises from Week M — DayLabel\`` — what if `weekNumber` is `undefined`? The fallback `?? '?'` exists but is the test coverage for that branch present?

### H. Final verdict

APPROVE / REVISE-AT-DIFF (specify what) / REJECT-RETROACTIVELY (specify why for each commit).

For L5: APPROVE-PLAN / REVISE-PLAN (specify what) / REJECT-PLAN (specify why) / RECOMMEND-VILLAGE (specify why).

---

## Hard constraints

- CLAUDE.md rules 1, 4, 6, 7, 8, 17, 26, 27, 28, 29, 41, 46, 50, 51, 52, 56, 58 still apply.
- No new ORM models. No Material-UI. Crystalline Swan only.
- Schema additions must be additive — no breaking changes to live DB.
- If L5 plan would violate an existing rule, reject it explicitly.
- Be direct. Sean is paying for this review. Anti-sycophancy + specific reproduction steps.
