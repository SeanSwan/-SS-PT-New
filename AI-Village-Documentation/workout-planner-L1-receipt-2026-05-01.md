# L1 Receipt REV 3 — Long-horizon `planData` schema + populator
## Canonical Surface Receipt (rule 26) + Surface Classification (rule 27) + Schema Cross-Check (rule 29)

**Phase:** L1 (foundation — must ship before L2/L3/L4)
**Spec:** REV 2 of `workout-planner-long-horizon-spec-enhanced-2026-05-01.md` §3.5 + §4 L1
**Baseline HEAD:** `f5d7a4e47` (W1A + Plan Library + TDZ hotfix all live)
**Date:** 2026-05-01
**Status:** REV 3 — Codex returned REV 2 with REVISE verdict (compat regression in §4 schema). 4 new findings applied below.

---

## REV 3 changes (Codex follow-up review — all 4 verified)

| # | Codex finding | REV 3 fix | Verification |
|---|---|---|---|
| D1 | REV 2 schema introduced top-level `durationWeeks` + mesocycle fields like `block`/`weekStart`/`weekEnd` — would break frontend consumers reading `generatedPlan.planSummary.durationWeeks` and `mesocycles[].mesocycle`/`mesocycles[].weeks` (string range like "1-4") | Schema is now **strictly additive**. ALL existing top-level fields preserved EXACTLY (`clientId`, `trainerId`, `clientName`, `generatedAt`, `planSummary{...}`, `rationale[]`, `mesocycles[...current shape...]`, `weeklySchedule[]`, `constraints`, `compensations`, `equipmentContext`, `recommendations: string[]`). NEW top-level fields ONLY: `weeks[]` (populated long-horizon data) + `recommendationDetails[]`. R1 test asserts additive compat. | Read `workoutBuilderService.mjs:711-786` + `WorkoutPlannerTypes.ts:84-106` + `WorkoutPlannerPage.tsx:1356-1465` — all confirmed. |
| D2 | R4 said "reference-equal" across HTTP response fields — JSON.parse breaks reference equality | R4 split: helper unit test asserts reference-equal (in-memory); HTTP route test asserts **deep-equal**. | Conceptually verified. |
| D3 | `backend/__tests__/clientWorkoutRoutes.current.test.mjs:28` imports `planDataToWorkoutDays` from the route. L1.0 migration would break it. | Update the existing test in the SAME commit to import from the new shared module. Re-exporting from route also acceptable; choose updating since cleaner. File added to §8 file-touch list. | `rg -n "planDataToWorkoutDays" backend/__tests__/clientWorkoutRoutes.current.test.mjs` confirms `import { planDataToWorkoutDays } from '...'` at line 28 |
| D4 | R9 "no knee-aggravating" depends on fuzzy registry tags | R9 rewritten to use **controlled exercise fixtures** in a test helper. Each fixture has explicit `painExclusions: ['knee']` and `equipmentRequirements: ['barbell']` etc. Tests verify tag-driven filtering, not name-string matching. | Verified — registry today has `equipment` field but `painExclusions` is implicit. |

REV 2 carryforwards (C1-C8) stand.

---

## REV 2 changes (Codex hostile-review fixes — all 8 verified independently)

| # | Codex Finding | REV 2 Fix | Verification |
|---|---|---|---|
| C1 | `extractCurrentSession()` returns `currentSession.session.exercises` (nested), not `.exercises` directly | Modify the shared helper to ALSO lift `exercises` to top level (preserve `session` for legacy). R3 test reads BOTH paths to lock the contract. | Read `workoutPlanRoutes.mjs:541-568` — confirmed nested `session` shape |
| C2 | `extractCurrentSession()` is private inside `workoutPlanRoutes.mjs` (not exported) | NEW sub-slice **L1.0** — extract plan-shape helpers to `backend/services/workoutPlanShapeService.mjs`. Both routes import from there. | `function extractCurrentSession(plan)` — no `export` keyword; line 541 |
| C3 | Frontend `recommendations: string[]` would crash if backend changed it to `object[]` | Producer keeps `recommendations: string[]` (frontend-compatible); ADD additive `recommendationDetails: { type, text, sourceCitation }[]` for cited/source-aware recommendations. Frontend types unchanged in L1. | `WorkoutPlannerTypes.ts:106` confirms `recommendations: string[]` |
| C4 | `useCurrentWorkout.ts` does `setData(result.data)` — only `data.*` is consumed by the hook | Response shape ADDITIVE: top-level `currentSession` + `data.currentSession` + `plan.currentSession`. Hook automatically picks up via `data`. | `useCurrentWorkout.ts:91` confirms `setData(result.data)` |
| C5 | Frontend `PLAN_DURATIONS` still has `'52'` ("12 Months (52 weeks)") — contradicts 4-week-month math | L1 is BACKEND-ONLY. Backend accepts any durationWeeks 1-52 (existing clamp). Dropdown label correction deferred to L2 (separate frontend slice). L1 tests do NOT enforce dropdown values. | `WorkoutPlannerTypes.ts:120, 133` confirms `'52'` + "12 Months (52 weeks)" label |
| C6 | R7 backwards-compat test was vague ("null OR synthesized") — not deterministic | R7 LOCKED: if legacy planData has `weeklySchedule[]` AND any entry has `exercises[]`, synthesize a `currentSession` from `weeklySchedule[currentDay-1]`. Otherwise `currentSession === null` (logger falls back to legacy `plan.days[]` rendering). | n/a — receipt clarification |
| C7 | Rotation rule (R5) contradicted depletion fallback in §9 H-pre-1 | LOCKED: strict no-repeat within 7-session window IF eligible pool ≥ 7 distinct exercises matching category × phase × equipment. ELSE least-recent fallback with `exercises[i].rotationFallback: true` metadata. Two distinct test cases. | n/a — receipt clarification |
| C8 | REV 2 spec cited `frontend/.../WorkoutLogger/dailyWorkoutFormService.ts` — wrong | Actual path: `frontend/src/services/nasmApiService.ts`. REV 2 spec also patched. | `find` confirms `nasmApiService.ts` exists; no `dailyWorkoutFormService.ts` |

---

## 0. Codex audit answers (REV 2 prerequisite — answered before code)

### Audit A: `extractCurrentSession()` shape (C1)
**Verified at `backend/routes/workoutPlanRoutes.mjs:541-568`:**

```js
function extractCurrentSession(plan) {
  const planData = plan.planData || { weeks: [] };
  const weekIndex = plan.currentWeek - 1;
  const dayIndex = plan.currentDay - 1;
  if (!planData.weeks || !planData.weeks[weekIndex]) return null;
  const week = planData.weeks[weekIndex];
  const entries = week.sessions || week.days || [];
  const session = entries[dayIndex] || null;
  if (!session) return null;
  return {
    weekNumber: plan.currentWeek,
    weekFocus: week.focus || session.focus || null,
    dayNumber: plan.currentDay,
    dayLabel: session.dayLabel || session.name || `Day ${plan.currentDay}`,
    session,                           // ← exercises live HERE, not at top
    totalWeeks: planData.weeks.length,
    totalSessionsThisWeek: entries.length,
    isLastSessionOfWeek: plan.currentDay >= entries.length,
    isLastWeek: plan.currentWeek >= planData.weeks.length
  };
}
```

**Decision (C1 + C2):** the new shared helper at `backend/services/workoutPlanShapeService.mjs::extractCurrentSession` returns:

```js
{
  weekNumber, weekFocus, dayNumber, dayLabel,
  session,                                 // legacy nested — preserved
  exercises: session?.exercises || [],     // NEW: lifted to top level
  totalWeeks, totalSessionsThisWeek,
  isLastSessionOfWeek, isLastWeek
}
```

This is **additive only** — no consumer breaks; new consumers can read `currentSession.exercises` directly without going through `.session.exercises`.

### Audit B: useCurrentWorkout consumes `result.data` (C4)
**Verified at `frontend/src/hooks/useCurrentWorkout.ts:91`:**
```ts
setData(result.data);
```
The hook only surfaces what's in `data`. Response shape decision below.

### Audit C: `recommendations` is `string[]` (C3)
**Verified at `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerTypes.ts:106`:**
```ts
recommendations: string[];
```
The component renders `{rec}` directly. Producer must keep emitting `string[]`. Source citations get a separate field.

### Audit D: `nasmApiService.ts` location (C8)
**Verified:** `frontend/src/services/nasmApiService.ts` exists. `frontend/src/services/nasmApiService.submitWorkoutForm.test.ts` confirms `submitWorkoutForm` is exported from there.

---

## 1. What this slice does + does NOT do (REV 2)

### Does
1. Define + freeze the canonical `LongHorizonPlanData` JSONB schema (§3.5 of REV 2 spec; refined in §4 below).
2. **NEW (C2): create `backend/services/workoutPlanShapeService.mjs`** — shared module exporting `extractCurrentSession()` and `planDataToWorkoutDays()`. Both consumer routes import from here.
3. Extend `extractCurrentSession()` to additively return `exercises` at top level (C1).
4. Extend `backend/services/workoutBuilderService.mjs::generatePlan()` to emit the new shape with populated `weeks[i].days[j].exercises[]` per session.
5. Reuse existing `selectExercises` + `applyOPTParams` + `getClientContext` to populate per-day exercise selections.
6. Apply rotation: strict no-repeat within 7-session window when pool sufficient; least-recent fallback with `rotationFallback: true` metadata when pool < 7 distinct.
7. Producer emits `recommendations: string[]` (existing frontend-compatible) AND `recommendationDetails: object[]` (new additive field with `{type, text, sourceCitation}`).
8. Modify `clientWorkoutRoutes.mjs:GET /:userId/current` response shape (C4): include `currentSession` at top level AND inside `data.currentSession` AND inside `plan.currentSession`.
9. Add round-trip schema tests R1-R8.

### Does NOT
- Frontend dropdown correction for "12 Months" label (C5 — deferred to L2).
- WorkoutLogger pre-fill from `currentSession.exercises` (C5 / spec L4 — deferred).
- PDF generation (L3).
- Client access flag (L5).
- Audit existing pre-L1 saved plans (L6).
- Update legacy AI-gen flows (`workoutPlanPersistence.mjs` / `workoutService.mjs`) for partial unique index — separate hardening slice.

---

## 2. Canonical Surface evidence (rule 26)

| Concern | File:line | Status |
|---|---|---|
| Backend service that produces plan | `backend/services/workoutBuilderService.mjs::generatePlan` (~line 668) | **Modified** |
| Canonical persistence | `backend/models/WorkoutPlan.mjs` `planData` JSONB field | **Read-only** — schema lives in JSONB |
| **NEW: Shared plan-shape helpers** | `backend/services/workoutPlanShapeService.mjs` (NEW) | **Created** in L1.0 |
| Existing canonical-plan endpoint (admin/trainer view) | `backend/routes/workoutPlanRoutes.mjs:124, 151, 482` (3 callers of extractor) + `:541` (private impl) | **Modified** — imports from shared module instead of private function |
| Existing logger endpoint (the actual logger consumer) | `backend/routes/clientWorkoutRoutes.mjs:152` `GET /:userId/current` | **Modified** — adds `currentSession` to response at multiple levels |
| Existing `planDataToWorkoutDays` adapter | `backend/routes/clientWorkoutRoutes.mjs:~75-115` | **Migrated** to shared module (L1.0) |
| Frontend logger consumer | `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx:635` + `frontend/src/hooks/useCurrentWorkout.ts:91` | **Read only** — frontend changes deferred to L4 |
| Frontend Plan Library save flow | `frontend/.../admin-workout-planner/WorkoutPlannerPage.tsx::handleSaveDraft` etc. | **Read only** |
| Frontend recommendations type | `frontend/.../admin-workout-planner/WorkoutPlannerTypes.ts:106` `string[]` | **Preserved** — producer emits `string[]` for existing field; adds `recommendationDetails` (additive) |
| Service-side per-exercise selection | `backend/services/workoutBuilderService.mjs::selectExercises` + `applyOPTParams` | **Reused** in new per-day populator |
| Client context source | `backend/services/clientIntelligenceService.mjs::getClientContext` | **Read** for `recommendationDetails[]` |

---

## 3. Surface Classification (rule 27)

| Component | Classification | Evidence |
|---|---|---|
| `generatePlan()` | **canonical, expanded** | sole producer of long-horizon plans |
| `clientWorkoutRoutes.mjs:GET /:userId/current` | **canonical** | the endpoint logger actually calls |
| `workoutPlanRoutes.mjs:GET /client/:userId` | **canonical secondary** | admin/trainer view |
| **`workoutPlanShapeService.mjs` (NEW)** | **canonical, shared** | single source of plan-shape transformations |
| `extractCurrentSession()` private function in workoutPlanRoutes.mjs | **REMOVED** | moved to shared module; routes import from there |
| `planDataToWorkoutDays()` in clientWorkoutRoutes.mjs | **MIGRATED** | moved to shared module |
| `workoutPlanPersistence.mjs::WorkoutPlan.create` | **legacy, untouched** | separate hardening slice |
| `workoutService.mjs::createWorkoutPlan` | **legacy, untouched** | same |

No competing canonical surface. The schema is the contract. The shared module is the canonical shape boundary.

---

## 4. Schema Cross-Check (rule 29) — REV 3 STRICTLY ADDITIVE schema

The L1 schema covers TWO related-but-distinct shapes. Both must preserve existing consumer contracts.

### 4.A — `generatePlan()` RESPONSE shape (what backend returns to frontend)

**Existing shape preserved EXACTLY (verified at `workoutBuilderService.mjs:711-786` + `WorkoutPlannerTypes.ts:84-106`):**

```ts
{
  clientId: number,
  trainerId: number,
  clientName: string,
  generatedAt: string,                      // ISO
  planSummary: {
    durationWeeks: number,                  // <-- existing top-level location, NOT to be moved
    sessionsPerWeek: number,
    totalSessions: number,
    primaryGoal: string,
    startingPhase: number,
    equipmentProfileId: number | null,
  },
  rationale: string[],                      // existing structured rationale array
  mesocycles: Array<{
    mesocycle: number,                      // <-- "mesocycle" NOT "block"
    weeks: string,                          // <-- string range like "1-4" NOT weekStart/weekEnd
    nasmPhase: 1|2|3|4|5,
    phaseName: string,
    focus: string,
    params: { sets, reps, intensity, intensityBias, tempo, rest },
    goalBias: object,
    overloadStrategy: string,
    deloadWeek: number | null,
  }>,
  weeklySchedule: Array<{                   // 1 week's day pattern (existing)
    dayNumber: number,
    focus: string,
    category: string,
  }>,
  constraints: object,                      // from clientIntelligenceService.context
  compensations: Array<{ type, trend }>,
  equipmentContext: object | null,
  recommendations: string[],                // <-- string[] preserved (rule C3 lock)

  // ── NEW ADDITIVE FIELDS (L1) ──
  weeks: Array<{                            // NEW: full long-horizon populated structure
    weekNumber: number,                     // 1..durationWeeks
    monthNumber: number,                    // 1..ceil(durationWeeks/4) — 4-week mesocycle month
    weekInMonth: number,                    // 1..4
    mesocycleNumber: number,                // 1..N — matches mesocycles[i].mesocycle
    isDeloadWeek: boolean,
    days: Array<{
      dayNumber: number,                    // 1..sessionsPerWeek (per-week ordinal)
      dayInPlan: number,                    // 1..(durationWeeks * sessionsPerWeek) — absolute
      name: string,                         // e.g. "Day 1: Full Body"
      focus: string,                        // matches weeklySchedule[i].focus pattern
      dayType: 'training'|'recovery'|'deload',
      optPhase: string,
      exercises: Array<{
        exerciseId: string,
        exerciseName: string,
        orderInWorkout: number,
        sets: number,                       // resolved scalar (mesocycle params still emit ranges)
        reps: string,                       // "12-20" (range string, matches existing pattern)
        setScheme: string,                  // "3x12-20"
        repGoal: string,
        restPeriod: number,                 // seconds
        tempo: string,                      // "4-2-1"
        intensityGuideline: string,         // "60% 1RM" | "RPE 7"
        notes: string,
        source: 'auto-populated'|'trainer-edited'|'imported',
        reason?: string,                    // optional — why selected
        rotationFallback?: boolean,         // true if least-recent fallback (R7 metadata)
      }>
    }>
  }>,
  recommendationDetails: Array<{            // NEW additive — pairs with recommendations[]
    type: 'pain'|'equipment'|'baseline'|'goal'|'progression',
    text: string,                           // matches recommendations[i] for round-trip
    sourceCitation: string,                 // SCHEMA-PATH only (rule 8); never raw client data
  }>,
}
```

**Critical contract:** the receipt EXPLICITLY MUST NOT introduce `durationWeeks` at top level (it's nested in `planSummary`), MUST NOT rename `mesocycle` to `block`, MUST NOT split `weeks: "1-4"` into `weekStart`/`weekEnd`, MUST NOT change `recommendations` from `string[]` to `object[]`. R1 test asserts every existing field is preserved by deep-equal against a snapshot of pre-L1 generate output (modulo the new additive fields).

### 4.B — `planData` JSONB shape (what gets persisted in `WorkoutPlan.planData`)

The `planData` JSONB column on `WorkoutPlan` rows is what frontend chooses to send via `POST /api/workout-plans`. Today the frontend's `buildPlanData()` in WorkoutPlannerPage builds a single-week structure from `planExercises` state.

**L1 does NOT change the frontend save handler.** L1's role:
- Backend produces a richer response from `generatePlan()` (the new `weeks[]`).
- The JSONB column is opaque passthrough — it ACCEPTS the new shape if a future caller (L2 frontend update) chooses to send it.
- Existing pre-L1 saved plans persist with their existing shape (`weeklySchedule[]` or `weeks[].days[]` per Triage Slice 2 fix).
- L1 backend consumers (`extractCurrentSession`, `planDataToWorkoutDays`) handle BOTH shapes via fallback chain.

**L2 closes the loop** — frontend captures `generatedPlan.weeks` and includes it in the save payload so trainers actually persist long-horizon plans.

### Consumer compatibility (verified — REV 3)

| Consumer | Reads | Source line | Compat |
|---|---|---|---|
| `WorkoutPlannerPage::generatedPlan.planSummary.durationWeeks` | top-level `planSummary.durationWeeks` | line 1356 | ✅ preserved |
| `WorkoutPlannerPage::generatedPlan.weeklySchedule.map` | `weeklySchedule[].dayNumber/focus/category` | line 1363 | ✅ preserved |
| `WorkoutPlannerPage::generatedPlan.mesocycles.map` | `mesocycles[].mesocycle/weeks/phaseName/...` | line 1419 | ✅ preserved (no shape change) |
| `WorkoutPlannerPage::generatedPlan.recommendations.map` | `recommendations[]: string[]` | line 1465 | ✅ preserved |
| `WorkoutPlannerTypes.ts::GeneratedPlan` | type definition | line 84-106 | ✅ no breaking change; `weeks[]` + `recommendationDetails[]` ARE additive — frontend type can be EXTENDED in L2 to surface them |
| `planDataToWorkoutDays` (now shared) | `data.weeks[i].days[j]` exercises | clientWorkoutRoutes.mjs (now migrated) | ✅ matches new `weeks[].days[]` populated shape |
| `extractCurrentSession` (now shared, with C1 lift) | `planData.weeks[currentWeek-1].days[currentDay-1]` (also handles `sessions[]` + legacy `weeklySchedule[]` fallback) | workoutPlanRoutes.mjs (now migrated) | ✅ matches; legacy R8 still passes |
| `useCurrentWorkout::setData(result.data)` | `data.currentSession` (NEW response field) | useCurrentWorkout.ts:91 | ✅ R4 deep-equal test (REV 3 — not reference-equal post-JSON) |
| Save → load round-trip via Plan Library | full `planData` object passed to POST/GET | n/a | ✅ JSONB passthrough; L1 R2 tests with manually-constructed planData containing `weeks[]` |
| PDF export (L3 future) | will read `planData.weeks[].days[].exercises[]` | future | ✅ schema forward-spec'd |

---

## 5. Sub-slice ordering inside L1 (REV 2 — L1.0 NEW)

L1 is one commit, but logically:

1. **L1.0 (NEW per C2)** — Create `backend/services/workoutPlanShapeService.mjs`. Migrate `extractCurrentSession()` from `workoutPlanRoutes.mjs:541-568` (export it; lift `exercises` to top level per C1). Migrate `planDataToWorkoutDays()` from `clientWorkoutRoutes.mjs:~75-115`. Both routes import from the shared module. **Verify both routes still work via existing tests before any other change.**

2. **L1.A** — Optional JSDoc types for `LongHorizonPlanData` in shared module (low priority — Codex earlier said "skip if it costs more than it earns").

3. **L1.B** — Implement per-day populator (`generateWeeklySchedule(...)` → returns `weeks[].days[].exercises[]`). Reuse `selectExercises` + `applyOPTParams`. Apply rotation rule (strict + fallback metadata).

4. **L1.C** — Modify `generatePlan` to call new populator and emit top-level `weeks` field. Keep `weeklySchedule` ALSO emitted for backward compat with anywhere that reads it. Emit both `recommendations: string[]` (rendered text) AND `recommendationDetails: object[]` (with citations).

5. **L1.D** — Modify `clientWorkoutRoutes.mjs:GET /:userId/current` response shape to include `currentSession` at top level + `data.currentSession` + `plan.currentSession` (C4). Use the shared extractor.

6. **L1.E** — Tests R1-R8 + rotation rules + duration math + recommendations contract.

All in one commit (rule 41 closeout). Estimated diff: ~600 LOC (service + shared module + route + tests).

---

## 6. Tests required (must pass before commit) — REV 2

### R1 — `generatePlan` returns ADDITIVE shape (REV 3 — D1 lock)
For inputs `{durationWeeks: 48, sessionsPerWeek: 3, primaryGoal: 'hypertrophy'}`:

**Existing fields preserved (must NOT regress):**
- `planSummary.durationWeeks === 48` (NOT moved to top level).
- `planSummary.sessionsPerWeek === 3`.
- `mesocycles` is array of objects with keys `{mesocycle, weeks, nasmPhase, phaseName, focus, params, goalBias, overloadStrategy, deloadWeek}` — exact existing key names.
- `mesocycles[i].weeks` is a STRING (e.g. `"1-4"`), NOT split into numbers.
- `mesocycles[i].mesocycle` is a NUMBER (1-based ordinal), NOT renamed to `block`.
- `weeklySchedule` is array of `{dayNumber, focus, category}` (existing 1-week pattern shape).
- `rationale` is `string[]` and non-empty.
- `recommendations` is `string[]` and non-empty.

**NEW additive fields (must be present after L1):**
- Top-level `weeks: Array(48)` (NEW).
- Each `weeks[i].days` has length === 3.
- Each `weeks[i].days[j].exercises` is a non-empty array.
- Each exercise has all required fields per §4.A `weeks[].days[].exercises[]`.
- `recommendationDetails: Array<{type, text, sourceCitation}>` exists and is non-empty.
- `recommendationDetails.length === recommendations.length` AND `recommendationDetails[i].text === recommendations[i]`.

**Snapshot-compat assertion:** capture a `generatePlan()` response BEFORE L1's code change (or use a recorded fixture from current main). After L1, run `generatePlan()` with the same inputs and assert: every key present in the pre-L1 response is also present in the post-L1 response with the same shape (additive only — no renames, no removals).

### R2 — Round-trip through Plan Library save → load
- POST `/api/workout-plans` with `planData` from generatePlan output.
- Read back via `GET /api/workout-plans/:id`.
- Round-tripped `planData.weeks[0].days[0].exercises[0]` matches input by deep equality.
- Round-tripped `recommendations` AND `recommendationDetails` both preserved.

### R3 — Shared `extractCurrentSession()` lifts `exercises` (C1) — DIRECT HELPER UNIT TEST
This test calls the shared module function directly, in-process. **Reference-equality is valid here** because no JSON serialization is involved.
- Call `extractCurrentSession(plan)` directly from the shared module.
- Returns object with `currentSession.session.exercises` (legacy nested) AND `currentSession.exercises` (top-level lift).
- Both arrays are **reference-equal**: `currentSession.exercises === currentSession.session.exercises`.
- This locks the C1 contract: future consumers can use either path; the lift is the same array reference.

### R4 — `/api/workouts/:userId/current` returns `currentSession` in 3 places (C4) — HTTP ROUTE TEST (REV 3 — D2 fix)
After plan saved + activated, GET the endpoint via supertest:
- `response.body.currentSession` exists (top level).
- `response.body.data.currentSession` exists.
- `response.body.plan.currentSession` exists.
- All three are **deep-equal** (`expect(...).toEqual(...)`) NOT reference-equal — JSON.parse breaks reference identity.
- All three describe the same session by `dayNumber`, `weekNumber`, and exercise list contents.

### R5 — Both consumers agree
- `GET /api/workout-plans/client/:userId` returns active plan + `currentSession`.
- `GET /api/workouts/:userId/current` returns active plan + `currentSession` (in 3 places per R4).
- Both endpoints' `currentSession` objects deep-equal each other.
- Both endpoints' `currentSession.exercises` deep-equal each other.

### R6 — Rotation: strict no-repeat WHEN pool sufficient (C7)
Generate 12-month plan with a category × phase × equipment combination known to have ≥ 7 eligible exercises (e.g., compound lower-body push with full equipment).
- Walk every 7-session window across all sessions in that category.
- Assert: no exercise key repeats within any window.
- Assert: NO exercise has `rotationFallback === true`.

### R7 — Rotation: least-recent fallback WITH metadata WHEN pool < 7 (C7)
Mock client context with `equipmentItems: ['bodyweight']` AND a phase × category combination known to have only 3-5 eligible exercises (e.g., bodyweight-only pull movements in stabilization phase).
- Generate 24-week plan.
- Assert: SOME exercises have `rotationFallback: true`.
- Assert: when fallback occurs, the chosen exercise is the LEAST-RECENTLY-USED among eligible (verify by manual ordering).

### R8 — Backwards-compat: legacy `weeklySchedule` plan still loads (C6)
- Construct a legacy `planData` with `{weeklySchedule: [{dayNumber:1, exercises:[{...}]}]}` and NO `weeks[]`.
- Call shared `extractCurrentSession(plan)` with `currentWeek=1, currentDay=1`.
- **Locked behavior**: returns synthesized `currentSession` with `session.exercises = weeklySchedule[0].exercises` and `exercises` lifted at top level.
- Repeat with legacy `planData` having `weeklySchedule: [{dayNumber:1}]` (no `exercises` key).
- **Locked behavior**: returns `null`. Logger UI falls back to `plan.days[]` rendering (which existing `planDataToWorkoutDays` provides).

### R9 — Equipment + pain constraints respected (REV 3 — D4 fixture-driven)
**Use a controlled exercise fixture, NOT live registry tags or fuzzy name matches.**

Test helper file: `backend/__tests__/fixtures/longHorizonRegistryFixture.mjs` (NEW). Exposes a small registry array (~12 exercises) with EXPLICIT tag fields:
```js
[
  { id: 'fx-bw-pushup', exerciseName: 'Push-up', category: 'push',
    equipment: ['bodyweight'], painExclusions: [] },
  { id: 'fx-bb-squat', exerciseName: 'Barbell Back Squat', category: 'squat',
    equipment: ['barbell', 'rack'], painExclusions: ['knee'] },
  { id: 'fx-db-lunge', exerciseName: 'DB Reverse Lunge', category: 'lunge',
    equipment: ['dumbbell'], painExclusions: ['knee'] },
  { id: 'fx-bw-glute-bridge', exerciseName: 'Glute Bridge', category: 'hinge',
    equipment: ['bodyweight'], painExclusions: [] },
  // ...
]
```

The new per-day populator accepts an optional `registryOverride` parameter for testability. Test injects the fixture.

**Test cases:**
- **R9.a — Pain exclusion**: client context has `painEntries: [{bodyPart: 'knee'}]`. Generate plan. Assert: NO exercise where `painExclusions` includes `'knee'` appears in any session. Specifically: `fx-bb-squat` and `fx-db-lunge` MUST NOT appear; `fx-bw-glute-bridge` MAY appear.
- **R9.b — Equipment exclusion**: client context has `equipmentItems: ['dumbbell', 'resistance_band']` (no barbell). Generate plan. Assert: NO exercise where `equipment` requires items not in the client's set appears. Specifically: `fx-bb-squat` MUST NOT appear; `fx-db-lunge` MAY appear.
- **R9.c — Both constraints stacked**: pain + limited equipment. Assert: only fixtures matching BOTH constraints appear. If pool is too narrow, `rotationFallback: true` is set per R7 — but the constraints are still respected (no excluded exercise EVER appears, even on fallback).

The receipt for L1.B implementation must verify the per-day populator function signature accepts a `registryOverride`.

### R10 — Recommendations contract (C3 lock)
- Generate plan.
- Assert `Array.isArray(plan.recommendations)` AND every entry is `typeof === 'string'`.
- Assert `Array.isArray(plan.recommendationDetails)` AND every entry is `{type, text, sourceCitation}`.
- Assert NO PII in `recommendations[i]` (no client name, no email, no body part) — `recommendationDetails[i].sourceCitation` carries the SCHEMA-PATH (e.g., `"client.painEntries[0].bodyPart"`), NOT the value.

---

## 7. Authorization invariants

No new endpoints in L1. Existing endpoints touched preserve their access checks:
- `clientWorkoutRoutes.mjs:GET /:userId/current` — already has `ensureClientAccess(req, userId)` at line ~152.
- `workoutPlanRoutes.mjs:GET /client/:userId` — already has `verifyClientAccessByUserId`.
- The shared module is service-layer-only (no routes), so no auth surface changes.

404-not-403 IDOR doctrine preserved.

---

## 8. File touch list (REV 2)

| File | Change | Est. LOC |
|---|---|---|
| **`backend/services/workoutPlanShapeService.mjs` (NEW — C2)** | Migrate `extractCurrentSession` (with C1 lift) + `planDataToWorkoutDays` from routes; export both | +180 |
| `backend/services/workoutBuilderService.mjs` | Add `generateWeeklySchedule(plan, context, registryOverride?)` per-day populator. Modify `generatePlan` to emit `weeks[]`. Preserve all existing top-level fields (`planSummary`, `mesocycles[]`, `weeklySchedule[]`, `rationale[]`, `recommendations: string[]`) per D1. Generate new `recommendationDetails[]`. | +220 |
| `backend/routes/workoutPlanRoutes.mjs` | Replace private `extractCurrentSession` with import from shared module. Remove the private function. | -28 / +3 |
| `backend/routes/clientWorkoutRoutes.mjs` | Replace inline `planDataToWorkoutDays` with import from shared module. Modify `GET /:userId/current` response to include `currentSession` at 3 levels (top, data, plan). | -45 / +30 |
| **`backend/__tests__/clientWorkoutRoutes.current.test.mjs` (D3 — UPDATE existing)** | Existing test imports `planDataToWorkoutDays` from the route at line 28. Update import path to `../services/workoutPlanShapeService.mjs`. No behavior change — same function, new module location. | +1 / -1 (just the import line) |
| **`backend/__tests__/fixtures/longHorizonRegistryFixture.mjs` (NEW — D4)** | Controlled exercise fixture array for R9 tag-driven tests. ~12 exercises covering category × equipment × painExclusions matrix. | +60 |
| `backend/__tests__/workoutPlanShapeService.test.mjs` (NEW) | Unit tests for shared module: extractCurrentSession C1 lift (R3 reference-equal in-memory), planDataToWorkoutDays, R8 legacy compat | +250 |
| `backend/__tests__/workoutBuilderLongHorizon.test.mjs` (NEW) | R1 additive snapshot, R2 round-trip, R6 strict rotation, R7 fallback metadata, R9 fixture-driven pain/equipment, R10 recommendations contract | +420 |
| `backend/__tests__/clientWorkoutRoutesCurrentSession.test.mjs` (NEW) | R4 deep-equal HTTP test, R5 cross-consumer agreement | +180 |

**Estimated total:** ~1270 LOC across 4 modified + 4 new files (D3 modification + D4 fixture added). Single commit per rule 41.

---

## 9. Hostile pre-emptive checks (rule 17 dual-pass — REV 2 cleaned up C7)

### H-pre-1: Registry depletion on 12-month plan (RESOLVED via C7 lock)
**Mitigation locked:** strict no-repeat within 7-session window WHEN eligible pool ≥ 7 distinct. ELSE least-recent fallback with `rotationFallback: true` metadata. R6 + R7 lock both behaviors.

### H-pre-2: Shared module circular import risk
**Concern:** `workoutPlanShapeService.mjs` is imported by both `workoutPlanRoutes.mjs` and `clientWorkoutRoutes.mjs`. If the shared module ever needs to import from those routes, circular import.

**Mitigation:** shared module imports ONLY from `models/index.mjs` (for getModel) and pure helpers. No route-layer imports. Receipt enforces.

### H-pre-3: Emitting both `weeks[]` AND `weeklySchedule[]` doubles JSONB size
**Mitigation:** acceptable transient (~1.05x bloat). Deprecate `weeklySchedule` in L2 once frontend consumes `weeks[]`.

### H-pre-4: Mock-heavy tests miss real-DB JSONB serialization edge cases
**Mitigation:** R2 round-trip test uses real DB session (per existing test infra at `workoutPlanLibrary.test.mjs`).

### H-pre-5: 7-session sliding window perf
**Mitigation:** O(n×7) for 144 sessions = 1008 lookups. Negligible.

### H-pre-6: `recommendationDetails[].sourceCitation` may leak PII (rule 8)
**Mitigation:** `sourceCitation` is a SCHEMA-PATH string (e.g., `"client.painEntries[0].bodyPart"`), NOT the actual data. R10 explicitly tests for no PII in `recommendations[]` text or `sourceCitation` strings.

### H-pre-7: Shared module location vs naming
**Concern:** "shape service" implies side effects; this is pure functions.

**Mitigation:** name remains `workoutPlanShapeService.mjs` for discoverability with adjacent `workoutBuilderService.mjs`. The functions are pure transformations — receipt notes this in the file's top comment.

### H-pre-8: Frontend may have OTHER consumers of recommendations[] besides WorkoutPlannerPage
**Mitigation:** L1 grep audit before code: `rg "recommendations" frontend/src` confirms only the planner uses this field. Receipt requires this grep run + paste of results before code commits.

---

## 10. Sign-off gates

- [ ] **Gate 1**: This receipt REV 2 reviewed by Sean + Codex.
- [ ] Gate 2: L1.0 implemented + existing routes still pass tests (no regression).
- [ ] Gate 3: L1.B-E implemented per §5 ordering.
- [ ] Gate 4: R1-R10 tests green; existing tests still green (Tier-A baseline).
- [ ] Gate 5: tsc clean; pre-commit secret scan clean.
- [ ] Gate 6: Codex final-gate diff review (rule 46).
- [ ] Gate 7: Sean's smoke — generate 6-month plan; inspect saved planData.
- [ ] Gate 8: Push.
- [ ] Gate 9: Production probe — both consumers agree on currentSession.

---

## 11. Codex re-review prompt (REV 3)

> Codex — review the L1 receipt REV 3 before code begins. REV 2 was returned with 4 new findings (D1-D4); REV 3 applies them all.
>
> Required output sections:
> 1. **C1-C8 carryforward verdicts**: confirm REV 2 fixes still hold under REV 3 changes.
> 2. **D1-D4 verdicts**: for each REV 3 fix, AGREE / DISAGREE / PARTIAL with paste of evidence command output.
> 3. **§4.A additive schema audit**: snapshot existing `generatePlan()` response shape against `WorkoutPlannerTypes.ts::GeneratedPlan`; confirm REV 3 schema is strictly additive (no renames, no removals).
> 4. **§4.B planData persistence shape**: any consumer that reads from `WorkoutPlan.planData` row that expects something REV 3 will break?
> 5. **§5 ordering**: L1.0 first is correct?
> 6. **§6 tests**: R1 additive-snapshot assertion concrete enough? R3 (reference-equal helper) vs R4 (deep-equal HTTP) split correct?
> 7. **§8 file touch list**: D3 update of `clientWorkoutRoutes.current.test.mjs` is in the same commit as the migration?
> 8. **§9 hostile**: missed risks?
> 9. **Final verdict**: APPROVE / REVISE / REJECT.
>
> Mandatory evidence commands:
> ```
> git rev-parse HEAD                                            # should be f5d7a4e47
> rg -n "extractCurrentSession" backend
> rg -n "planDataToWorkoutDays" backend
> sed -n '700,795p' backend/services/workoutBuilderService.mjs   # current generatePlan response
> sed -n '84,110p' frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerTypes.ts
> rg -n "generatedPlan\." frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx
> rg -n "planDataToWorkoutDays" backend/__tests__
> ```
>
> Hard constraints: rules 1, 4, 6, 7, 8, 26, 27, 29, 41, 46, 58. JSONB stays. No new ORM models. Schema is additive. No frontend changes in L1.

---

**End L1 receipt REV 3.** C1-C8 + D1-D4 all verified independently and applied. No code touched. Awaiting REV 3 verdict before §5 implementation begins.
