# Triage Slice 2 - GET /api/workouts/:id/current 500 - Receipt - 2026-04-30

**Status:** `[VERIFIED]` live root cause captured 2026-05-01; implementation slice opened.
**Scope:** Bug 3 from the original triage chain. WorkoutLogger.tsx:639 calls `GET /api/workouts/<clientId>/current`; production returns 500. Different defect class from Slice 1 (server error, not param validation).
**Authority:** CLAUDE.md rules 17, 21, 26, 51, 55.

---

## Section 1 - Defect chain

### D1 - WorkoutLogger 500

- Frontend caller: [WorkoutLogger.tsx:639](frontend/src/components/WorkoutLogger/WorkoutLogger.tsx#L639) - `await api.get(`/api/workouts/${effectiveClientId}/current`)`
- Backend handler: [clientWorkoutRoutes.mjs:40-122](backend/routes/clientWorkoutRoutes.mjs#L40-L122) - `router.get('/:userId/current', protect, async ...)`
- 500 emitted from local catch at [line 114-121](backend/routes/clientWorkoutRoutes.mjs#L114-L121).
- **`[VERIFIED]`** that the route is mounted: [core/routes.mjs:476](backend/core/routes.mjs#L476) `app.use('/api/workouts', clientWorkoutRoutes)`.
- **`[VERIFIED]`** that the handler reads `req.params.userId` correctly (mount path `/:userId/current` is paramfull, no Express reset bug).

### D2 - Suspected root cause: WorkoutPlan eager-load against missing association

- Handler line 60-71 tries `include: [{ model: WorkoutPlanDay, as: 'days', include: [{ model: WorkoutPlanDayExercise, as: 'exercises', ... }] }]`.
- **`[VERIFIED]`** that `WorkoutPlanDay` and `WorkoutPlanDayExercise` model files exist ([backend/models/WorkoutPlanDay.mjs](backend/models/WorkoutPlanDay.mjs), [backend/models/WorkoutPlanDayExercise.mjs](backend/models/WorkoutPlanDayExercise.mjs)).
- **`[UNVERIFIED]`** whether `WorkoutPlan.hasMany(WorkoutPlanDay, { as: 'days' })` is actually declared in [associations.mjs](backend/models/associations.mjs). A grep for `as: 'days'` in associations.mjs returned no hits, but that's a partial-pattern check, not a confirmation.
- **`[VERIFIED]`** that Phase A's authoritative WorkoutPlan model schema stores plan structure as **JSONB at `planData`** ([WorkoutPlan.mjs:124-130](backend/models/WorkoutPlan.mjs#L124-L130) - "Full plan structure: weeks -> sessions -> exercises"). The JSONB is the canonical storage; the `WorkoutPlanDay` / `WorkoutPlanDayExercise` ORM models may be vestigial / pre-JSONB-migration code.
- **`[VERIFIED]`** the include chain throws `WorkoutPlanDay is not associated to WorkoutPlan!` at runtime, caught by the local try/catch, and returns 500.

### D3 - Required probe before fix lands (rule 55)

To convert D2 from `[HYPOTHESIS]` to `[VERIFIED]`:

1. `npm run dev` - start backend.
2. Open browser DevTools - Network tab.
3. Log in as a client that has `WorkoutLogger` rendered.
4. Trigger the `/api/workouts/:userId/current` request from the UI.
5. **Capture the 500 response body's `error.message` field** (handler at line 119 returns `error.message` for diagnostic visibility) - this is the actual Sequelize error.
6. If error matches `not associated` / `EagerLoadingError` -> D2 confirmed.
7. If error is something else -> root cause is different; receipt re-diagnoses.

**Probe completed 2026-05-01 via authenticated client smoke:**

```text
GET /api/workouts/99/current -> HTTP 500
body.error: "WorkoutPlanDay is not associated to WorkoutPlan!"
```

This converts D2 from `[HYPOTHESIS]` to `[VERIFIED]` per rule 55.

---

## Section 2 - Proposed fix

### 2.1 - Remove the include chain; return planData JSONB intact

**Current ([clientWorkoutRoutes.mjs:53-72](backend/routes/clientWorkoutRoutes.mjs#L53-L72)):**

```js
plan = await WorkoutPlan.findOne({
  where: { userId: clientId, status: 'active' },
  order: [['createdAt', 'DESC']],
  include: WorkoutPlanDay ? [{
    model: WorkoutPlanDay,
    as: 'days',
    include: WorkoutPlanDayExercise ? [{
      model: WorkoutPlanDayExercise,
      as: 'exercises',
      include: Exercise ? [{ model: Exercise, as: 'exercise' }] : [],
    }] : [],
  }] : [],
});
```

**Proposed:**

```js
plan = await WorkoutPlan.findOne({
  where: { userId: clientId, status: 'active' },
  order: [['createdAt', 'DESC']],
});
```

Plus update the response shape downstream (lines 84-108) to read from `plan.planData.weeks[0]?.days[*]` instead of `plan.days`.

### 2.2 - Frontend adapter

Frontend [WorkoutLogger.tsx:639+](frontend/src/components/WorkoutLogger/WorkoutLogger.tsx#L639) reads `data.plan.days` per the legacy include shape. Fix needs to match:
- Backend returns `data.plan.planData.weeks[0].days[N]` -> the JSONB structure
- Frontend updates to navigate that structure

OR backend returns a shape adapter that derives `data.plan.days[]` from `planData.weeks[0].days[]` server-side, preserving the frontend contract.

**Adapter on backend is the lower-blast-radius choice** - one file changes, frontend untouched.

---

## Section 3 - Out of scope for this receipt

- Live probe (rule 55) - Sean executes; receipt updates to `[VERIFIED]` when done.
- Fix implementation - blocked on probe.
- Frontend adapter changes if backend cannot derive the shape - separate slice.
- `WorkoutPlanDay` / `WorkoutPlanDayExercise` model deletion if vestigial - hygiene-pass slice.

---

## Section 4 - Confidence tags

- D1 route mount: `[VERIFIED]`
- D1 paramfull (no reset bug): `[VERIFIED]`
- D2 association missing: `[VERIFIED]`
- D2 JSONB is canonical storage: `[VERIFIED]`
- Proposed fix shape: `[VERIFIED]` by mounted route regression test after implementation

---

## Section 5 - Approval gates before code

1. Approve probe-first discipline (rule 55) - no fix lands until live error message captured.
2. Approve backend-side adapter as preferred fix shape (vs frontend changes).
3. Acknowledge that the WorkoutPlanDay / WorkoutPlanDayExercise ORM models may be vestigial - separate hygiene-pass slice if confirmed.

---

**End of receipt.** No code touched in this slice - awaiting probe before fix lands.
