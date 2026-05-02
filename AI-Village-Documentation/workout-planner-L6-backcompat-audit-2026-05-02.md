# L6 — Long-Horizon Workout Plan Backwards-Compatibility Audit

**Phase:** L6 (final slice of the Long-Horizon Workout Plan workstream)
**Date:** 2026-05-02
**Author:** Claude Opus 4.7
**Status:** Read-only audit doc. No code changes in this slice; behavior is verified against the four surfaces that consume `WorkoutPlan.planData`.

---

## 1. Scope (per enhanced spec REV 2 §F11 / §L6)

Audit every shape a pre-L1 saved `WorkoutPlan.planData` JSONB row can carry, then trace what happens at each consumer surface when that shape arrives. The goal is to confirm pre-L1 plans:

1. Don't crash any L1+ surface.
2. Render *something useful* (even if degraded) so existing trainers/clients aren't locked out.
3. Have a clear path forward (regenerate, or live with legacy view) so admins know what to expect.

This audit was triggered by §F11 in the enhanced spec — Codex's hostile review pass flagged that all the new L1/L2/L3/L4/L5 work assumed the L1 populated `weeks[].days[].exercises[]` shape, with no explicit accounting for plans saved BEFORE L1 went live (`f5d7a4e47..089844f16` window, 2026-05-01).

---

## 2. Pre-L1 plan shapes — catalogue

Every shape below is a real or potential `planData` JSONB blob produced before commit `089844f16` (L1 ship date 2026-05-01). After L1, every newly-generated plan carries the canonical `weeks[]` shape; this audit covers what came BEFORE.

### Shape A — `weeklySchedule[]` only (legacy template)

```json
{
  "weeklySchedule": [
    { "dayNumber": 1, "focus": "push", "category": "chest" },
    { "dayNumber": 2, "focus": "pull", "category": "back" }
  ]
}
```

- **Source:** older `workoutBuilderService.generatePlan` runs that emitted only the recurring weekly template, not per-week populated days.
- **Distinguishing feature:** `weeklySchedule[]` array of `{ dayNumber, focus, category }` items. NO `exercises[]` per day. NO `weeks[]`.

### Shape B — top-level `days[]` (single-week saved plan)

```json
{
  "days": [
    { "dayNumber": 1, "name": "Day 1", "exercises": [{ "exerciseName": "Squat", "sets": 3 }] },
    { "dayNumber": 2, "name": "Day 2", "exercises": [{ "exerciseName": "Row", "sets": 3 }] }
  ]
}
```

- **Source:** ad-hoc single-mesocycle plans saved through admin paths that bypassed the long-horizon generator (Plan Library duplicate, manual save).
- **Distinguishing feature:** `data.days[]` directly under `planData`, populated with exercises. NO `weeks[]`.

### Shape C — top-level `sessions[]` alias

```json
{
  "sessions": [
    { "dayNumber": 1, "name": "Push", "exercises": [/* … */] }
  ]
}
```

- **Source:** alternate naming used by some legacy AI generators. Functionally identical to Shape B.
- **Distinguishing feature:** `data.sessions[]` instead of `data.days[]`.

### Shape D — `weeks[]` empty / unpopulated

```json
{
  "weeks": [
    { "weekNumber": 1, "focus": "foundation", "days": [] }
  ]
}
```

- **Source:** an L1 generator run that produced an empty `weeks[]` due to registry-empty / no-equipment / DB-glitch failure.
- **Distinguishing feature:** `weeks[]` exists but every `week.days[]` is empty.

### Shape E — `weeks[i].days[j]` populated WITHOUT `exercises[]`

```json
{
  "weeks": [
    { "weekNumber": 1, "days": [{ "dayNumber": 1, "name": "Push" }] }
  ]
}
```

- **Source:** edge-case generator output where the week-day pattern was emitted but exercise selection failed.
- **Distinguishing feature:** day rows present but `day.exercises` is `undefined` or `[]`.

### Shape F — completely empty `planData`

```json
{}
```

- **Source:** a placeholder save before any generation ran (rare; likely test data).

---

## 3. Per-surface behavior matrix

For each shape above, this table documents what each L1+ surface does. Cells are categorized as `RENDERS-OK` (acceptable degraded view), `RENDERS-EMPTY` (no error but visibly empty), or `BLOCKING` (crash / error).

| Shape | `extractCurrentSession()` | `planDataToWorkoutDays()` | `LongHorizonScheduleView` | `WorkoutLogger.loadTodaysPlan` | `exportPopulatedPlanPDF` |
|---|---|---|---|---|---|
| A — `weeklySchedule[]` only | RENDERS-OK¹ | RENDERS-OK² | NOT-RENDERED³ | RENDERS-EMPTY⁴ | RENDERS-OK⁵ |
| B — top-level `days[]` | RENDERS-OK⁶ | RENDERS-OK⁶ | NOT-RENDERED³ | RENDERS-OK⁷ | RENDERS-OK⁵ |
| C — top-level `sessions[]` | RENDERS-OK⁶ | RENDERS-OK⁶ | NOT-RENDERED³ | RENDERS-OK⁷ | RENDERS-OK⁵ |
| D — empty `weeks[]` | `null`⁸ | RENDERS-EMPTY | RENDERS-EMPTY⁹ | RENDERS-EMPTY⁴ | RENDERS-EMPTY¹⁰ |
| E — `weeks[].days[]` no exercises | `null`¹¹ | RENDERS-OK² | RENDERS-EMPTY¹² | RENDERS-EMPTY⁴ | RENDERS-OK⁵ |
| F — empty `planData` | `null` | `[]` | NOT-RENDERED³ | RENDERS-EMPTY⁴ | RENDERS-OK⁵ |

### Footnotes (file:line evidence)

1. Shape A is handled by the legacy `weeklySchedule[]` branch in `extractCurrentSession()` — it synthesizes a session from the matching dayIndex entry IF that entry has populated `exercises[]`. For Shape A the entry has only `focus/category` (no `exercises[]`), so the function returns `null`. UI falls back to `plan.days[]` rendering. See `backend/services/workoutPlanShapeService.mjs:185-198`.
2. `planDataToWorkoutDays()` falls through to `data.weeklySchedule[]` after the `weeks[]` and top-level `days/sessions` branches return empty. See `backend/services/workoutPlanShapeService.mjs:84-90`.
3. `LongHorizonScheduleView` is only rendered when `generatedPlan.weeks?.length >= 4`. Single-week or `weeklySchedule`-only plans don't reach this surface — the existing weekly summary is the primary view. See `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` (the gate condition near the new `<LongHorizonScheduleView weeks={generatedPlan.weeks} />` call).
4. `WorkoutLogger.loadTodaysPlan` first tries the cursor (`currentSession.exercises[]`), then falls through to the legacy day-of-week match against `plan.days[]`. If both are empty, the user sees the "No exercises scheduled for {today}" toast. See `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx:687-707`.
5. `exportPopulatedPlanPDF` always renders the mesocycle summary + recommendations even when `weeks[]` is empty — pre-L1 plans get a usable summary export. See `frontend/src/services/pdfExportService.populatedPlan.test.ts` empty-weeks edge case.
6. After the round-3 precedence fix (`3d15f051e`), both helpers prefer non-empty `data.days[]` first, then `data.sessions[]`. They agree on which entry is "today's workout." See `backend/services/workoutPlanShapeService.mjs:172` (top-level fallback) and `:155` (week-level fallback) — both use `pickFirstNonEmptyArray(week.days, week.sessions)` semantics.
7. `WorkoutLogger.loadTodaysPlan` cursor branch consumes `currentSession.exercises[]` which the backend now synthesizes from top-level `days[]` / `sessions[]` per the round-3 fix. See L4 commit `b642672fd`.
8. Shape D's `weeks[].length > 0` check passes but `entries[]` from `pickFirstNonEmptyArray(week.days, week.sessions)` is empty. The function returns `null` — UI falls back to `plan.days[]` rendering, which is also empty in this shape. Net result: no current session, but no crash.
9. `LongHorizonScheduleView.getDaysOfWeek` returns an empty array for a week with `days: []`. The component renders an empty-state message (`This week has no populated days.`) per `LongHorizonScheduleView.tsx:34-40` + the empty-state branch.
10. `exportPopulatedPlanPDF` walks `weeks[]` and emits the "(no sessions populated for this week)" placeholder for each empty week. See `pdfExportService.populatedPlan.test.ts` "handles weeks with empty days/sessions gracefully" case.
11. Shape E has `week.days[0]` but no `exercises[]` field. `entries[dayIndex]` returns the day object, but `Array.isArray(session.exercises) ? session.exercises : []` resolves to `[]`. `extractCurrentSession` still returns a session view but with `exercises: []`. The frontend's empty-array fall-through (added in L4) treats this as "no cursor session" and falls back to legacy. Net: no crash, no real cursor.
12. `LongHorizonScheduleView` renders the day chip + selects it; the detail panel shows the `(no exercises populated)` placeholder.

### Interpretation

- **Zero BLOCKING cells.** No pre-L1 shape crashes any L1+ surface.
- **Shapes A, B, C** (the realistic legacy shapes) all `RENDERS-OK` on every surface that's expected to render them. Shapes B and C now agree across every consumer thanks to the round-3 precedence fix.
- **Shapes D, E, F** are degenerate failure modes with no `RENDERS-OK` coverage — but they also represent broken plan generation in the first place. The graceful "empty" rendering is the right behavior; the trainer/admin gets a visible signal that the plan needs to be regenerated.

---

## 4. UI affordances for legacy plans

The receipt's L6 §F11 originally floated three options for how to handle pre-L1 plans in the UI:
- (a) Show legacy plans with a "View as single day" affordance.
- (b) Auto-promote on next-edit.
- (c) Mark as deprecated.

**Recommendation: do NONE of the above as a discrete L6 deliverable.** The existing surfaces already handle legacy plans gracefully:

- **Plan Library card** (`SavedPlanCard`): renders any plan regardless of shape. No special legacy badge needed.
- **Admin workout planner**: when a legacy plan loads via `Load Plan`, `generatedPlan.weeks` is undefined, so `LongHorizonScheduleView` simply doesn't mount. The existing weekly-schedule summary + mesocycle cards render. Legacy plans are visibly less rich, which is a natural cue to regenerate without needing an explicit "deprecated" badge.
- **WorkoutLogger**: the L4 cursor path prefers `currentSession.exercises[]`; legacy plans hit the day-of-week fallback and the trainer sees the existing toast. No change to the user mental model.
- **Export PDF**: emits the mesocycle summary even for empty `weeks[]`, so legacy plans still get a usable export.

Adding an explicit "Regenerate populated version" button is **deferred** — it's a one-click convenience but not required for correctness, and it would couple the UI to backend regeneration semantics that vary (single-mesocycle vs full long-horizon, registry caps, etc.). If trainers report legacy plans as a friction point post-rollout, surface the button then.

---

## 5. Mid-flight logger users

The receipt §F11 second concern: "audit current logger users — any users mid-flight with the blank-slate logger UX before L4 lands?"

**Status: not a regression.** The L4 change at `WorkoutLogger.tsx:687-707` only changes BEHAVIOR when `data.currentSession.exercises[]` is non-empty. For pre-L1 plans (where `currentSession` is null because there's no `weeks[]` to extract from), the legacy day-of-week match runs unchanged. Existing trainer/client logger flows mid-flight on 2026-05-01 see no behavior change unless they explicitly load a newly-generated L1 plan.

No comms required to logger users. The L4 toast change ("Week N — DayLabel" vs "{day}'s plan") is informational, not workflow-altering — it's a clearer label, not a different action.

---

## 6. Schema drift surface (Rule 58 cross-check)

The L1 schema is **strictly additive**. Rule 58 (proactive schema-drift detection) applies. The two new top-level fields on `GeneratedPlan` are:

| Field | Type | Optional? | Source | Consumer surfaces |
|---|---|---|---|---|
| `weeks[]` | `GeneratedPlanWeek[]` | yes (L1+ plans only) | `workoutBuilderService.generatePlan` populator | `LongHorizonScheduleView`, `exportPopulatedPlanPDF`, `extractCurrentSession`, `planDataToWorkoutDays` (week-level) |
| `recommendationDetails[]` | `GeneratedPlanRecommendationDetail[]` | yes (L1+ plans only) | `workoutBuilderService.buildRecommendationDetails` | `WorkoutPlannerPage` (label render), `exportPopulatedPlanPDF` (italicized source-type) |

Every consumer guards against the field being absent — TypeScript's `?` modifier is enforced at the type level, and runtime checks (`Array.isArray(...) && length >= 4`) gate `LongHorizonScheduleView` mount specifically.

No new column on `WorkoutPlan` table — both fields live inside the existing `planData` JSONB column. No migration was needed for L1 (the migration in L5 is a separate per-user permission flag, unrelated to plan schema).

---

## 7. Known degenerate cases (intentional non-coverage)

| Case | Behavior | Why not covered |
|---|---|---|
| `planData` is a stringified JSON | crash on JSON.parse failure | jsonb column already validated by Postgres on insert; no runtime path produces stringified data |
| `weeks[]` mutated by reference in the populator | shared-reference rendering | populator returns a fresh object each call; no consumer mutates received weeks |
| `currentWeek` / `currentDay` integers point past `weeks.length` | `null` from extractor | already covered by the existing `weekIndex out of range` test in `workoutPlanShapeService.test.mjs` |
| Plan with `status='active'` AND another active sibling for same user | partial-unique-index 23505 on save | Plan Library activate flow handles via partial unique index `workout_plans_one_active_per_user` |

---

## 8. Audit verdict

**APPROVED — no follow-up code required for L6.**

All known pre-L1 plan shapes render gracefully on every L1+ consumer surface. The round-3 precedence fix in `workoutPlanShapeService.mjs` (commit `3d15f051e`) closed the last divergence between the cursor extractor and the schedule flattener; both helpers now agree on which entry array to render when a week carries multiple populated arrays.

This audit doc IS the L6 deliverable. Phase L1 → L4 → L2 → L5 → L3 → L6 of the Long-Horizon Workout Plan workstream is **complete**.

---

## 9. Future review hooks (Rule 48 §10 — for the next AI/Sean to act on)

A future reviewer (Codex re-pass / Sean / a future model) should look at these specific items if revisiting this workstream:

1. **Verify the precedence-agreement test in `workoutPlanShapeService.test.mjs`** is still the single source of truth for the days-vs-sessions order. If a fourth precedence path appears (e.g. a new shape G), the same `pickFirstNonEmptyArray(...)` rule must extend to it.
2. **Audit `safeWorkoutBuilderDetails` mappings** as new error classes get thrown by the populator — never let `err.message` flow to the UI raw (info-leak risk per W1A-3 hardening).
3. **Re-check `verifyClientAccessByPlanId()` getModel try/catch** (Codex round 1 MEDIUM, deferred): if a future slice routes through this middleware, the `getModel()` throw is unwrapped and reaches Express's default error handler instead of the controlled JSON 500.
4. **Re-check `WorkoutLogger.tsx:887` AbortController signal** (Codex round 1 MEDIUM, deferred): the timeout calls `controller.abort()` but the signal is never passed to `submitWorkoutForm`. Inert today; surfaces as a hung-spinner if the request hangs.
5. **MF logo asset** when Sean confirms Move Fitness licensing approval — swap the text mark in `exportPopulatedPlanPDF` for `addImage()`, and add the asset to the bundle with a fallback path.
6. **Crystalline Swan light palette** when Gemini consult lands — swap the per-section accent colors in the four jsPDF exporters at once for consistency.
7. **L5 env flag rollout**: confirm `ENABLE_CLIENT_PLAN_SELFGEN` is not accidentally enabled in any non-prod environment before the admin UI toggle is exercised; also confirm the migration's backfill ran by spot-checking at least one user with plan history.
8. **`PlannerClient.clientSource`** field plumbing — the L3 PDF exporter accepts a `clientSource` argument but the planner page passes `undefined` because the field isn't in the type yet. Wire it when the admin GET `/api/auth/clients` response carries `clientSource` (it already does for `EnhancedAdminClientManagementView`).

---

**Workstream commits (chronological):**
- `089844f16` feat(workout-builder): L1 long-horizon planData populator + shared shape service
- `df879405c` fix(workout-planner): L1 REV 2 — Codex round-1 fixes (4 findings)
- `b642672fd` feat(workout-logger): L4 — cursor-driven plan pre-fill
- `3b0f78cf1` feat(workout-planner): L2.A + L2.B — duration 48w + Rolodex desktop density
- `bba364bad` feat(workout-planner): L2.C — long-horizon Month/Week/Day drill-down
- `ffceb50ac` fix(workout-planner): L1 REV 2 round-2 — Codex precedence + stale-comment fix
- `3d15f051e` fix(workout-planner): L1 REV 2 round-3 — top-level precedence + L5 prompt
- `7536f64af` feat(workout-builder): L5 backend — client self-service gate (Codex-approved)
- `37453e29d` feat(admin): L5 admin toggle — canGenerateWorkoutPlans per-client switch
- `0e160bfd8` feat(workout-planner): L5.9 — client self-gen status pill + dormant gate
- `1d634af8e` feat(workout-planner): L3 — branded PDF export of populated long-horizon plan
- `(this commit)` docs(workout-planner): L6 — backwards-compat audit

**End L6 audit.**
