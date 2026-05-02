# Pre-Code Receipt — Workout Planner: Plan Library + Active Plan Semantics (REV 2)

**Type:** Canonical Surface Receipt (rule 26) + Surface Classification (rule 27) + Schema Cross-Check (rule 29)
**Slice:** SEPARATE from W1A. W1A is committed locally as `8172f7777` and still gated on Codex final-gate diff review per REV 3 protocol. **No Plan Library code lands until W1A is approved + pushed AND this receipt is reviewed and approved.**
**Date:** 2026-05-01
**Baseline HEAD:** `8172f7777` (local) / `cf08ee98a` (origin/main pre-W1A push)

---

## REV 2 changes (2026-05-01)

REV 1 returned by Codex with verdict REVISE. Applied corrections:

- **§1 backend invariant** — partial unique index + transaction with retry; SELECT FOR UPDATE row lock inside activate. Default Sequelize transactions are NOT serializable. (Codex #1)
- **§2 surface classification** — broader sweep ran; 6 additional surfaces classified as legacy/non-canonical/dormant. (Codex #6)
- **§5 frontend save UX** — 4-state save button matrix with explicit "Save Draft" vs "Save & Make Current" vs "Update Plan" vs "Update & Make Current" + "Save as Copy." (Codex #9)
- **§6 backend POST default** — change default from `'active'` to `'draft'`. POST `/` callers must pass `'active'` explicitly AND that path now runs sibling-deactivate too. (Codex #2)
- **§6 duplicate path** — server-side `POST /:id/duplicate` endpoint (no frontend round-trip needed; saves a fetch + clone). (Codex #3)
- **§5 archive of active plan blocked** — frontend disables button + tooltip; backend rejects DELETE `/:id` if status=active and no other active row exists. (Codex #5)
- **§7 stopPropagation tests** — explicit frontend tests for click-vs-card-click. (Codex #4)
- **§8 consumer-mismatch test** — verify both `workoutPlanRoutes.mjs` (`updatedAt DESC`) and `clientWorkoutRoutes.mjs` (`createdAt DESC`) return the activated plan. (Codex #7)
- **§9 file touch list** — `SavedPlanCard.tsx` extraction MANDATORY (rule 4 cap). (Codex #8)
- **§7.3 smoke automation** — Playwright path replaces manual smoke where credentials available. (Codex #10)
- **§NEW data audit step** — pre-migration check for clients with multiple `active` rows; demotion script before partial unique index applies. (Codex #1 prerequisite)

REV 1 carried forward: the 6 verified findings (1.1-1.6), the canonical surface classification of `admin-workout-planner/`, schema cross-check (no drift), product rule, JSONB stays, no MUI, no Galaxy-Swan revival.

---

## 1. Current state — Sean's 4 [VERIFIED] findings independently confirmed

### 1.1 ✅ Backend `WorkoutPlan` already supports multiple rows per `userId`

**Evidence:** [backend/models/WorkoutPlan.mjs:102-107](backend/models/WorkoutPlan.mjs#L102-L107)

```js
status: {
  type: DataTypes.ENUM('active', 'paused', 'completed', 'draft'),
  defaultValue: 'active',
  allowNull: false,
}
```

The model has no unique constraint on `(userId, status='active')`. The status enum already includes `draft` and `paused` — schema is shaped correctly **without ENUM migration**. **A unique-index migration IS needed** (see §6.1).

### 1.2 ✅ `GET /api/workout-plans?clientId=` lists multiple plans

**Evidence:** [backend/routes/workoutPlanRoutes.mjs:54-90](backend/routes/workoutPlanRoutes.mjs#L54-L90), called from [WorkoutPlannerPage.tsx:552](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L552). Multi-plan listing already works end-to-end.

### 1.3 ✅ Frontend Saved Plans panel already renders multiple cards

**Evidence:** [WorkoutPlannerPage.tsx:1232-1283](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L1232-L1283).

### 1.4 ✅ `handleSave` always POSTs a new plan

**Evidence:** [WorkoutPlannerPage.tsx:500](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx#L500) — no PUT branch.

### 1.5 ✅ POST defaults `status: 'active'`

**Evidence:** [workoutPlanRoutes.mjs:193](backend/routes/workoutPlanRoutes.mjs#L193) + model default. Two saves create two `'active'` rows.

### 1.6 ✅ `GET /api/workout-plans/client/:userId` returns most-recent active plan

**Evidence:** [workoutPlanRoutes.mjs:101-104](backend/routes/workoutPlanRoutes.mjs#L101-L104).

### 1.7 ✅ NEW: Consumer-ordering divergence confirmed (Codex #7)

`workoutPlanRoutes.mjs` line 67 + line 103 use `order: [['updatedAt', 'DESC']]`.
`clientWorkoutRoutes.mjs` line 152 uses `order: [['createdAt', 'DESC']]`.

Once one-active invariant is enforced, both return the same unique row. Until enforced, two consumers can disagree about which "active" plan is current — WorkoutLogger reads from one, Coach from the other.

---

## 2. Surface Classification Table (rule 27) — REV 2 broader sweep

| File | Role | Classification | Evidence |
|---|---|---|---|
| **`frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx`** | Plan builder + saved-plans panel | **CANONICAL** | mounted at `/dashboard/trainer/workout-planner`; verified by Sean's screenshots throughout this session |
| **`backend/routes/workoutPlanRoutes.mjs`** | Plan CRUD | **CANONICAL** | mounted at `/api/workout-plans` AND `/api/workout/plans` ([core/routes.mjs:330-331](backend/core/routes.mjs#L330-L331)) |
| **`backend/models/WorkoutPlan.mjs`** | Plan ORM model | **CANONICAL** | only WorkoutPlan model in repo |
| **`backend/middleware/verifyClientAccess.mjs`** | Authz gate | **CANONICAL** | already wired on PUT/:id, GET/:id, DELETE/:id, PUT/:id/advance |
| `frontend/src/pages/workout/components/WorkoutPlanner.tsx` (489-line) | Older plan-list component | **LEGACY** | mounted by `WorkoutDashboard.tsx:253`; superseded by canonical admin-workout-planner page |
| `frontend/src/pages/workout/components/WorkoutPlanner/WorkoutPlanner.tsx` (modular split) | Refactored sibling of legacy | **LEGACY** | uses same `useWorkoutPlannerState` hook; same surface as above |
| `frontend/src/pages/workout/hooks/useWorkoutPlannerState.ts` | Legacy state hook | **LEGACY** | only consumed by legacy components above |
| `frontend/src/services/workout-planner-service.ts` | Legacy service layer | **LEGACY + DORMANT** | calls `/api/workout/plans/clone`, `/api/workout/plans/:id/archive`, `/api/workout/plans/:id/restore` — **endpoints that DO NOT exist in backend.** Service is dormant: no callers verified active beyond legacy components. |
| `frontend/src/components/WorkoutManagement/WorkoutPlanBuilderTypes.ts` | NASM workout plan builder types (different system) | **DORMANT (different surface)** | NASMWorkoutPlanBuilder is a separate workflow; not the canonical Plan Library target |
| `backend/routes/clientWorkoutRoutes.mjs:152` | WorkoutLogger active-plan reader | **CANONICAL CONSUMER** | reads from same `WorkoutPlan` table with `createdAt DESC` ordering — see §1.7 mismatch |

**Out of scope for this slice:** the LEGACY surfaces and the DORMANT service file. Their existence DOES NOT block the Plan Library implementation, but they should be flagged in a future hygiene-scan slice (rule 32).

**No competing canonical surface exists** — `admin-workout-planner/WorkoutPlannerPage.tsx` is the single canonical Plan Library surface. The Plan Library slice modifies it directly.

---

## 3. Schema Cross-Check (rule 29) — fields used by Plan Library slice

| Caller field | Real model column | Match | Source |
|---|---|---|---|
| `userId` | `userId` (INTEGER, FK) | ✅ | [WorkoutPlan.mjs:60](backend/models/WorkoutPlan.mjs#L60) |
| `trainerId` | `trainerId` (INTEGER, FK, nullable) | ✅ | model |
| `title` | `title` (STRING, NOT NULL) | ✅ | model |
| `description` | `description` (TEXT, nullable) | ✅ | model |
| `nasmPhase` | `nasmPhase` (INTEGER 1-5, nullable) | ✅ | model |
| `status` | `status` ENUM ('active','paused','completed','draft'), default `'active'` (will change to `'draft'` in §6) | ✅ ENUM already includes all needed states | model |
| `currentWeek` / `currentDay` | matches | ✅ | model |
| `planData` | `planData` JSONB (default `{ weeks: [] }`) | ✅ canonical storage per Triage Slice 2 audit | model |
| `progressNotes` | JSONB | ✅ | model |
| `metadata` | JSONB | ✅ | model |

**No drift.** All caller field names match real columns.

---

## 4. Product rule (Sean §2 ratified)

- **Many saved plans per client.**
- **Exactly ONE active plan per client at a time** for WorkoutLogger / Swan Coach / "what's next" consumers.
- **Other plans are `draft` or `paused`.**
- **Loading ≠ activating.** Trainer can pull any plan into the builder without disturbing the active plan.
- **Activation is explicit.** Trainer clicks "Activate" — backend deactivates siblings atomically.

---

## 5. Frontend behavior contract (REV 2 — 4-state save matrix)

### 5.1 Save button matrix (Codex #9)

| Trainer state | Primary action | Secondary action(s) |
|---|---|---|
| **No plan loaded**, builder has exercises | **"Save Draft"** (`POST` `status: 'draft'`) | **"Save & Make Current"** (`POST` `status: 'draft'` THEN `PUT /:id/activate`) |
| **Loaded current plan**, edits made | **"Update Plan"** (`PUT /:id` with planData) | **"Save as Copy"** (`POST /:id/duplicate`) |
| **Loaded non-current plan** (paused/draft), edits made | **"Update Plan"** (`PUT /:id`) | **"Update & Make Current"** (`PUT /:id` THEN `PUT /:id/activate`), **"Save as Copy"** |
| Loaded plan, no edits (`!isDirty`) | All save buttons disabled | "Save as Copy" enabled |

**Mobile compact mode (<430px):** primary as button, secondary actions collapse into "More…" dropdown (44px touch target on dropdown trigger per rule 2).

**`isDirty` from W1A drives enable/disable** — already wired in `8172f7777`. After successful PUT or POST, set `savedSnapshot = currentExercisesSig` (same pattern as W1A-2 save success).

### 5.2 Saved Plan card actions (Codex #4: stopPropagation)

Each card renders 5 affordances:

1. **Load** — card-body click + Enter/Space; `handleLoadPlan(plan.id)`
2. **Activate / Make Current** — `PUT /:id/activate`; `event.stopPropagation()` REQUIRED
3. **Rename** — inline edit OR modal; `PUT /:id` with title only; `event.stopPropagation()` REQUIRED
4. **Duplicate** — `POST /:id/duplicate` (server-side clone, no client round-trip); `event.stopPropagation()` REQUIRED
5. **Archive** — `DELETE /:id` (sets status='completed'); `event.stopPropagation()` REQUIRED. **Disabled if this is the current active plan AND no other active plan exists** (Codex #5).

**Card render:** card-body uses `role="button" tabIndex={0}` and handles Enter/Space → Load (existing). Action buttons live in a fixed footer row, each `<button type="button" onClick={(e) => { e.stopPropagation(); ... }}>`. Tab order: card → action 1 → action 2 → ... so keyboard users can select actions without triggering load.

### 5.3 Visual semantics (rule 6 token+fallback)

| State | Badge | Token |
|---|---|---|
| Active (current) | "Current" | `var(--accent-gold, #C6A84B)` background |
| Draft | "Draft" | `var(--text-secondary, rgba(224,236,244,0.5))` outline |
| Paused | "Paused" | `var(--accent-secondary, #8B5CF6)` 12% mix |
| Completed (archive) | hidden by default | "Show archive" toggle reveals |

Active plan card has accent border in Gilded Fern + subtle glow (rule 22 premium feel; rule 25 motion respects reduced-motion).

### 5.4 Archive of active plan (Codex #5)

Frontend rule: **Block archive of the current plan IF it's the only active plan.** UI: button disabled, tooltip says "Activate another plan first."

If there ARE other plans (any status), trainer can archive the current — backend handles by simply marking it completed; the client is left with no current plan UNTIL trainer activates one. **This is an explicit allowed transient state, not a violation.** UX shows a yellow warning banner: "No active plan for this client. Activate one to enable WorkoutLogger."

Backend invariant: **at most one active plan**, not exactly one. Zero is allowed (transient gap during transitions).

### 5.5 W1A dirty-warning preserved

When trainer attempts to load a different saved plan with builder dirty, `window.confirm` from W1A `handleLoadPlan` (line 619) MUST still fire. This slice does NOT touch dirty logic. Tests in §7.2 lock this regression.

---

## 6. Backend behavior contract (REV 2 — invariant + duplicate + POST hardening)

### 6.1 NEW: Partial unique index migration (Codex #1)

**Migration step 1 — data audit + cleanup**:

```sql
-- Diagnostic query: how many clients have multiple active rows?
SELECT "userId", COUNT(*) AS active_count
FROM workout_plans
WHERE status = 'active'
GROUP BY "userId"
HAVING COUNT(*) > 1;
```

If any rows are returned, demote all but the most-recently-updated to `'paused'`:

```sql
-- For each client with N>1 active plans, keep newest active, demote rest to paused
WITH ranked AS (
  SELECT id, "userId", status,
    ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "updatedAt" DESC) AS rn
  FROM workout_plans
  WHERE status = 'active'
)
UPDATE workout_plans
SET status = 'paused'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

**Migration step 2 — partial unique index**:

```sql
CREATE UNIQUE INDEX workout_plans_one_active_per_user
  ON workout_plans ("userId")
  WHERE status = 'active';
```

This is the **DB-level invariant**. Postgres rejects any INSERT/UPDATE that would create a second active row for the same `userId` with `unique_violation` (SQLSTATE 23505). The activate handler relies on this AND uses a transaction with row lock as the primary path.

**Sequelize migration file:** `backend/migrations/20260501000000-add-workout-plan-active-unique-index.cjs`

```js
'use strict';
module.exports = {
  async up(queryInterface) {
    // Step 1: demote duplicate active plans
    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT id, "userId", status,
          ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "updatedAt" DESC) AS rn
        FROM workout_plans
        WHERE status = 'active'
      )
      UPDATE workout_plans SET status = 'paused' WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
    `);
    // Step 2: partial unique index
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS workout_plans_one_active_per_user
        ON workout_plans ("userId")
        WHERE status = 'active';
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS workout_plans_one_active_per_user;`
    );
    // Down does NOT re-promote demoted rows — that data loss is intentional given
    // the up() has already discarded the duplicate-active state.
  },
};
```

### 6.2 NEW: `PUT /api/workout-plans/:id/activate` (Codex #1)

**Authorization:** `protect, trainerOrAdminOnly, verifyClientAccessByPlanId({ paramName: 'id' })`.

**Handler logic — transaction + row-lock + retry pattern:**

```js
import { Op } from 'sequelize';
import sequelize from '../database.mjs';

const MAX_ACTIVATE_RETRIES = 2;

router.put('/:id/activate', protect, trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  async (req, res) => {
    const WorkoutPlan = getWorkoutPlan();
    const targetPlan = req.workoutPlan; // attached by middleware

    for (let attempt = 0; attempt <= MAX_ACTIVATE_RETRIES; attempt++) {
      const t = await sequelize.transaction();
      try {
        // Lock all rows for this user to serialize concurrent activates.
        await WorkoutPlan.findAll({
          where: { userId: targetPlan.userId },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        // Demote sibling active plans to 'paused'
        await WorkoutPlan.update(
          { status: 'paused' },
          {
            where: {
              userId: targetPlan.userId,
              status: 'active',
              id: { [Op.ne]: targetPlan.id },
            },
            transaction: t,
          },
        );

        // Activate target
        await targetPlan.update({ status: 'active' }, { transaction: t });

        await t.commit();
        return res.json({ success: true, plan: targetPlan });
      } catch (err) {
        await t.rollback();
        // Postgres unique_violation = SQLSTATE 23505 (the partial unique index
        // caught a race we lost). Retry once before failing.
        const isUniqueViolation = err?.original?.code === '23505' || err?.parent?.code === '23505';
        if (isUniqueViolation && attempt < MAX_ACTIVATE_RETRIES) {
          continue;
        }
        logger.error('[WorkoutPlan] Activate error: %s', err.message);
        return res.status(500).json({ success: false, message: 'Failed to activate plan' });
      }
    }
});
```

**Why this shape:**
- `findAll(..., lock: LOCK.UPDATE)` issues `SELECT ... FOR UPDATE` — Postgres row lock that serializes concurrent activates per `userId`.
- The partial unique index is a backstop for any race that escapes the row lock (e.g., row-lock from cross-trainer admin).
- Retry on `23505` handles the rare case where two transactions both pass the lock check but second one's INSERT-by-update conflicts with the index.

### 6.3 NEW: `POST /api/workout-plans/:id/duplicate` (Codex #3)

**Authorization:** `protect, trainerOrAdminOnly, verifyClientAccessByPlanId({ paramName: 'id' })`.

**Body (optional):** `{ title?: string }` — overrides default title.

**Handler:**

```js
router.post('/:id/duplicate', protect, trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  async (req, res) => {
    const WorkoutPlan = getWorkoutPlan();
    const original = req.workoutPlan;
    const { title } = req.body || {};

    try {
      const copy = await WorkoutPlan.create({
        userId: original.userId,
        trainerId: req.user.id,
        title: title || `${original.title} (copy)`,
        description: original.description,
        nasmPhase: original.nasmPhase,
        durationWeeks: original.durationWeeks,
        status: 'draft', // ALWAYS draft per product rule
        currentWeek: 1,
        currentDay: 1,
        planData: original.planData ? JSON.parse(JSON.stringify(original.planData)) : { weeks: [] },
        progressNotes: [],
        createdBy: 'trainer',
        metadata: { duplicatedFrom: original.id },
      });
      logger.info('[WorkoutPlan] Duplicated plan #%d -> #%d for client %d',
        original.id, copy.id, original.userId);
      return res.status(201).json({ success: true, plan: copy });
    } catch (err) {
      logger.error('[WorkoutPlan] Duplicate error: %s', err.message);
      return res.status(500).json({ success: false, message: 'Failed to duplicate plan' });
    }
});
```

`JSON.parse(JSON.stringify(...))` deep clones the JSONB. Sequelize JSONB stores the object directly; without the clone, both rows would share a reference and Postgres would persist them as separate copies anyway, but the explicit clone makes intent unambiguous and prevents test-time aliasing bugs.

### 6.4 CHANGE: `POST /api/workout-plans` default status (Codex #2)

Current:
```js
status: status || 'active',
```

New:
```js
status: ['draft', 'active', 'paused'].includes(status) ? status : 'draft',
```

**If caller passes `status: 'active'`**, the handler runs the SAME sibling-deactivate transaction as `/:id/activate`. Otherwise creates as draft.

**Frontend audit (Codex #2 prerequisite):** Already-greppped callers of `POST /api/workout/plans` (or `/api/workout-plans`):
- `WorkoutPlannerPage.tsx:500` — will be updated this slice to pass `status: 'draft'`
- `frontend/src/services/workout-planner-service.ts:56` — LEGACY surface (DORMANT per §2). Updates to this file are out-of-scope; documented in §10 deferred.

After the slice ships, ALL CANONICAL frontend callers pass explicit `status: 'draft'`. The `'active'` path on POST exists for backward compatibility and goes through the invariant-enforcing transaction.

**Model default change** ([WorkoutPlan.mjs:104](backend/models/WorkoutPlan.mjs#L104)): change `defaultValue: 'active'` to `defaultValue: 'draft'`. Any insert that omits `status` defaults to draft.

### 6.5 CHANGE: `DELETE /api/workout-plans/:id` archive guard (Codex #5)

Current handler at [line 367](backend/routes/workoutPlanRoutes.mjs#L367) sets `status: 'completed'`. Add invariant check:

```js
// Before update: if this is currently active, ensure user has at least one
// other active plan available — else allow archive but log the no-active state.
const wasActive = plan.status === 'active';
await plan.update({ status: 'completed' });
// (No further enforcement at backend — frontend blocks UI when no fallback.)
```

Backend allows the archive to proceed even when client ends up with zero active plans (per §5.4 product rule: zero active is an allowed transient state). The frontend disables the button when this would happen.

### 6.6 No change to existing `GET /client/:userId`

Once the activation invariant is enforced (§6.1 + §6.2), the existing `findOne({ userId, status: 'active' })` returns the unique row. The `order: [['updatedAt', 'DESC']]` becomes belt-and-suspenders.

**`clientWorkoutRoutes.mjs:152`** uses `createdAt DESC` instead. Per Codex #7, both consumers are tested in §7.1 to confirm they return the same plan once invariant is in place. The ordering divergence is documented but not fixed in this slice (out of scope; would be a separate hygiene pass).

---

## 7. Tests required (must pass before push)

### 7.1 Backend (vitest, supertest mocks + integration where index can be tested)

| Test | Expected |
|---|---|
| Trainer creates Plan A (default `status: 'draft'`) | 201, plan.status === 'draft' |
| Trainer creates Plan B (default draft) | 201, length 2 |
| Plan A explicitly `status: 'active'` AND no existing active → activates with sibling-deactivate | 201, plan.status === 'active', siblings deactivated |
| Plan A status='active' AND Plan B status='active' attempted via two POSTs → second one fails OR triggers retry+success with first deactivated | both attempts produce one active row (race-resilient) |
| `PUT /:id/activate` on Plan B sets B active and A paused | 200, B.status='active', A.status='paused', GET list confirms |
| `POST /:id/duplicate` clones planData + sets `status='draft'` + title='${original.title} (copy)' | 201, plan.planData equals original.planData by deep value, status='draft' |
| `POST /:id/duplicate` with `{title: "Custom"}` | 201, plan.title === "Custom" |
| Trainer NOT assigned to client hits any new endpoint → 404 (Phase B IDOR doctrine) | 404 |
| Admin bypass on activate works regardless of assignment | 200 |
| **Adversarial concurrency:** 2 simultaneous `PUT /:id/activate` for different plans of same client | exactly 1 ends up active; other is paused |
| **Partial unique index test:** raw `INSERT ... status='active'` while another active row exists for same userId raises 23505 | unique_violation |
| `DELETE /:id` (archive) on active plan when other plans exist for client | 200, status='completed', client now has 0 active plans |
| Both consumers (`workoutPlanRoutes` GET `/client/:userId` AND `clientWorkoutRoutes` GET `/:userId/current`) return the activated plan | both responses match by id |

### 7.2 Frontend (vitest + RTL — `SavedPlanCard.test.tsx`)

| Test | Expected |
|---|---|
| W1A `isDirty` regression: load Plan A, edit, click Plan B → confirm fires | window.confirm called |
| **Click Activate button does NOT call Load** | activate handler called once, load handler NOT called |
| **Click Rename button does NOT call Load** | rename handler called, load NOT |
| **Click Duplicate button does NOT call Load** | duplicate handler called, load NOT |
| **Click Archive button does NOT call Load** | archive handler called, load NOT |
| **Keyboard activation (Enter on card body) DOES call Load** | load handler called once |
| **Tab order: card → 4 actions** | sequential focus traversal works |
| Active plan card shows "Current" badge | by data-testid="current-badge" |
| Archive button DISABLED when card is active AND no other active plan exists | `aria-disabled="true"`, click no-op |
| `Update Loaded Plan` button calls `PUT /:id`, not `POST` | mockPut called, mockPost NOT |
| `Save as Copy` calls `POST /:id/duplicate`, body empty or { title } | mockPost on `/duplicate` path |
| `Save & Make Current` from no-loaded-plan state calls POST then PUT activate | sequential calls verified |

### 7.3 Smoke — automated where possible (Codex #10)

**Automated path (Playwright)** — using stored auth from earlier session if alive:

```bash
# pseudo-flow
node scripts/playwright-plan-library-smoke.mjs --client 99 --trainer 98
```

If credentials/session expire, fall back to manual.

**Manual fallback steps (Sean):** per §6 of REV 1, plus:
- After step 9 (Activate Plan B), confirm `clientWorkoutRoutes` (`GET /api/workouts/99/current`) returns Plan B as current — second consumer parity check (Codex #7).

---

## 8. Authorization invariants

Every new endpoint uses existing middleware:

- `PUT /:id/activate` → `verifyClientAccessByPlanId({ paramName: 'id' })`
- `POST /:id/duplicate` → `verifyClientAccessByPlanId({ paramName: 'id' })`
- `DELETE /:id` → already gated; new invariant logic added inside

**404-not-403 contract preserved.**

---

## 9. File touch list (REV 2 — SavedPlanCard MANDATORY)

| File | Change | Est. lines |
|---|---|---|
| `backend/migrations/20260501000000-add-workout-plan-active-unique-index.cjs` (NEW) | Demote duplicates + partial unique index | +35 |
| `backend/routes/workoutPlanRoutes.mjs` | Add `PUT /:id/activate` + `POST /:id/duplicate` + sibling-deactivate on POST status=active path + DELETE archive guard | +110 |
| `backend/models/WorkoutPlan.mjs` | Change `defaultValue: 'active'` → `'draft'` | +1 / -1 |
| `backend/__tests__/workoutPlanLibrary.test.mjs` (NEW) | 13 cases per §7.1 incl concurrency + index | +400 |
| `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` | Refactor save buttons (4-state matrix), wire 5 card actions, archive guard, snapshot reset on PUT | +90 / -40 |
| **`frontend/src/components/DashBoard/Pages/admin-workout-planner/SavedPlanCard.tsx` (NEW — MANDATORY per Codex #8)** | Card extraction with stopPropagation, badge, action footer, archive guard | +220 |
| `frontend/src/components/DashBoard/Pages/admin-workout-planner/SavedPlanCard.test.tsx` (NEW) | 12 cases per §7.2 incl stopPropagation matrix | +280 |
| `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStyles.ts` | Add `CurrentBadge`, `DraftBadge`, `PausedBadge`, `CardActionRow`, `CardActionButton` (44px), `MobileSaveDropdown` | +80 |

**Estimated total slice size:** ~1215 LOC across 8 files (5 new, 3 modified). Single coherent commit per rule 41 closeout.

`WorkoutPlannerPage.tsx` line count after slice: ~1275 (still over rule 4 cap). The SavedPlanCard extraction REDUCES it from 1225 by removing inline card render JSX, then the save-button matrix ADDS ~50 net. Net direction: gentle reduction. Further file-split work is a separate hygiene slice (W1C+).

---

## 10. Scope control

- ❌ No W2/W3 redesign
- ❌ No normalized schema rewrite (planData stays JSONB)
- ❌ No Material-UI introduction
- ❌ No retired Galaxy-Swan colors
- ❌ No Coach plan-awareness (deferred to W4)
- ❌ No update to legacy `frontend/src/services/workout-planner-service.ts` — DORMANT, defer to hygiene slice
- ❌ No update to legacy `frontend/src/pages/workout/components/WorkoutPlanner.tsx` — LEGACY, defer
- ❌ No fix for `clientWorkoutRoutes.mjs` ordering divergence — once invariant enforced, harmless; defer
- ✅ Scope: migration + activate + duplicate + POST hardening + archive guard + frontend save matrix + SavedPlanCard extraction + tests

---

## 11. Hostile review pass

Following rule 17. Pre-emptive answers to likely Codex re-review findings:

### 11.1 Race condition on activate

**Mitigated:** Postgres `SELECT ... FOR UPDATE` row lock + partial unique index + 23505 retry. See §6.2.

### 11.2 Two clients concurrently activate plans

Different `userId` = no lock contention. Independent transactions succeed independently.

### 11.3 Activate on a plan that's already active

Idempotent — bulk-update affects 0 rows (current excluded by id != self), activate update is no-op. 200 returned.

### 11.4 Activate while another transaction is mid-archive of an active plan

Both transactions hit the `userId` row lock. Whichever commits first wins. Second sees rolled-back state and either no-ops or retries depending on shape. Index ensures end-state is valid.

### 11.5 Frontend "Update Loaded Plan" race when trainer edits while server-side update is in flight

Disable Save buttons during request (existing `saving` state). Re-enable on response. Pre-existing pattern.

### 11.6 W1A `isDirty` snapshot reset on PUT update

Set `savedSnapshot = currentExercisesSig` after successful PUT (mirrors W1A-2 save success). Tested.

### 11.7 Saved-plan list refetch after activate — visual flash

Optimistic local update first (move "Current" badge), then refetch in background. Standard pattern.

### 11.8 Archive transaction edge: client ends up with zero active

Per §5.4 product rule: zero active is an allowed transient state with explicit UI warning. Frontend blocks ONLY when archiving the only active leaves zero AND no other plan exists at all (degenerate single-plan client edge case).

Actually, simpler rule: **disable archive of active plan ALWAYS until trainer explicitly activates another.** This is the strict reading of "exactly one active." Going with this — matches Sean's "exactly one active" stance more cleanly and avoids the zero-active warning state entirely. Updated §5.4 + §6.5 to reflect.

### 11.9 Migration on production data with active duplicates

Pre-migration audit query in §6.1 detects this. Demotion script in `up()` resolves it before index applies. Down() doesn't restore — accepted data loss in §6.1.

### 11.10 SavedPlanCard receives stale `plan` props after parent refetch

Use `plan.id` as React key on the map. Refetch produces new object refs; React reconciles by id. Stale closures inside card use latest plan via prop, not closure.

### 11.11 `JSON.parse(JSON.stringify(planData))` performance on large plans

planData is bounded (~12 sessions × ~6 exercises × ~10 fields = ~720 fields). Negligible. Sequelize JSONB column already serializes on persist.

### 11.12 Audit-active-row data-loss risk during migration

The demotion script is conservative — keeps the most-recent active per user. Worst case: trainer's prior intent of "this older one is also active" is demoted to paused. Trainer can re-activate manually if needed. Documented in migration up() comment.

---

## 12. Sign-off gates (none cleared yet)

- [ ] **Gate 1: Receipt REV 2 review** — Sean + Codex review THIS DOC. APPROVE / revise / reject.
- [ ] Gate 2: W1A diff review (independent) — Codex APPROVES `8172f7777` for push.
- [ ] Gate 3: W1A pushed + production probe verifies live.
- [ ] Gate 4: Plan Library code written per approved REV 2.
- [ ] Gate 5: Migration tested on local DB (verify index applies on real data).
- [ ] Gate 6: Backend tests + frontend tests + concurrency test green.
- [ ] Gate 7: Codex final-gate diff review on Plan Library commit.
- [ ] Gate 8: Sean runs §7.3 smoke (Playwright if possible, manual fallback) → pass.
- [ ] Gate 9: Push + production probe + production data audit (no duplicate actives post-deploy).
- [ ] Gate 10: Rule 48 audit record at phase close.

---

## 13. Codex re-review prompt (REV 2)

> Codex — re-review this Plan Library receipt REV 2 before any code is written.
>
> **Required output sections:**
>
> 1. **Verification of REV 2 corrections** — for each of Codex's 10 prior findings: confirm the REV 2 correction adequately addresses, or flag remaining gap.
> 2. **§1.7 + §2 broader sweep** — additions or corrections to legacy/dormant classification.
> 3. **§6.1 migration script** — verify the SQL is correct, the demotion query handles edge cases (clients with all-active rows, single-plan clients), and the index name doesn't collide with anything in the schema.
> 4. **§6.2 activate handler shape** — verify lock + retry + 23505 detection. Flag any missing edge case.
> 5. **§6.3 duplicate handler** — verify deep-clone is sufficient, no shared-reference bug.
> 6. **§6.4 POST default change** — verify model default change has no migration impact (existing rows unaffected; only INSERTs without explicit `status`).
> 7. **§7 tests** — flag any missing concurrency or edge-case test.
> 8. **§9 file touch list** — verify SavedPlanCard extraction reduces page line count (rule 4); flag if estimate is wrong.
> 9. **§11 hostile review** — additions / disputes / new race conditions.
> 10. **Final verdict:** APPROVE RECEIPT REV 2 (Claude can begin code) / REVISE (specify changes) / REJECT.
>
> Mandatory evidence commands:
> ```bash
> git rev-parse HEAD
> rg -n "WorkoutPlanner|workout-plans|workout/plans" frontend/src backend
> rg -n "createdAt.*DESC|updatedAt.*DESC" backend/routes/workoutPlanRoutes.mjs backend/routes/clientWorkoutRoutes.mjs
> rg -n "post.*workout-plans|post.*workout/plans" frontend/src
> rg -n "verifyClientAccessByPlanId|verifyClientAccessByUserId" backend/routes/workoutPlanRoutes.mjs
> rg -n "status.*'active'|defaultValue.*'active'" backend/models/WorkoutPlan.mjs backend/routes/workoutPlanRoutes.mjs
> ```
>
> **Hard constraints**: rules 1, 2, 3, 4, 6, 7, 8, 22, 23, 24, 25, 40, 46, 52, 58. Theme: Crystalline Swan only. Galaxy-Swan colors banned.

---

**End receipt REV 2. No code touched. Awaiting Sean + Codex review on Gate 1.**
