# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 90.6s
> **Files:** FABLE-BRIEF-TO-REVIEW.md
> **Generated:** 7/5/2026, 8:28:03 PM

---

# Data Safety Audit Report
## SwanStudios — "Fable Vision" Master Build Brief v2
**Auditor:** Data Safety Auditor | **Date:** 2026-07-05 | **Platform:** sswanstudios.com (Production)

> **Audit scope:** This plan touches real revenue-bearing data (`User.availableSessions`, `WorkoutSession`, `WorkoutLog`, `DailyWorkoutForm`, `ClientPainEntry`, `DailyMacroLog`, `FoodProduct`, `WorkoutPlan`, `LongTermProgramPlan`, `Session`). Every finding below could affect real paying customers in production.

---

## CRITICAL Findings

---

### CRITICAL-1 — `sessionService.completeSession()` hardcodes `deductSessionCredit: false`

**Workstream:** L (Sessions & Credits)
**Affected tables:** `User.availableSessions`, `Session` (status), `WorkoutSession`

**Finding:**
The plan explicitly states:

> `sessionService.completeSession()` **hardcodes `deductSessionCredit: false`** (quick "Complete" NEVER downgrades)

This means every trainer who taps "Complete" on a session is silently waiving a credit deduction. On a production platform with real paying customers, this is a **revenue leak and a data integrity failure** — the session is marked complete but the credit balance is not decremented. The customer's `availableSessions` count is wrong. Any downstream logic that reads `availableSessions` to gate access, display balance, or trigger "buy more" prompts is operating on stale, inflated data.

**Compounding risk:** The plan proposes relabeling this button as "Mark done without charge (waived)" — but if the relabel ships before the hardcoded `false` is fixed, trainers will continue silently waiving credits while believing they are making an intentional choice. The fix order matters.

**Database-safe recommendations:**
1. **Fix the hardcode before any UI relabel ships.** The correct default must be `deductSessionCredit: true`. The waive path must be an explicit, separate, audited action.
2. Wrap the deduction + session status update in a **single database transaction** with a row-level lock on `User.availableSessions` (see CRITICAL-2 for the race condition).
3. Add a `deduction_waived_by` + `waived_at` + `waive_reason` audit column to the `Session` table (or a separate `SessionCreditAudit` table) so every waive is traceable.
4. **Backfill audit:** Run a reconciliation query against all `Session` rows with `status = 'completed'` where no corresponding credit deduction event exists in the audit trail. Quantify the revenue gap before the fix ships.
5. Write a regression test: complete a session via the service, assert `User.availableSessions` decremented by exactly 1, assert the audit row exists.

---

### CRITICAL-2 — Race condition on `User.availableSessions` across 5 concurrent deduction paths

**Workstream:** L (Sessions & Credits), F (Workout Logger)
**Affected tables:** `User.availableSessions`

**Finding:**
The plan states there are **5 real deduction paths** for `availableSessions`. With concurrent writes (trainer taps "Complete" while the workout logger's `POST /api/workout-forms` atomically deducts, or two trainers logging for the same client simultaneously), a classic lost-update race condition can silently over-decrement or under-decrement the balance.

PostgreSQL's default `READ COMMITTED` isolation does not protect against this pattern:

```
T1: SELECT availableSessions WHERE id=X  → 5
T2: SELECT availableSessions WHERE id=X  → 5
T1: UPDATE SET availableSessions = 4
T2: UPDATE SET availableSessions = 4   ← should be 3
```

On a real paying customer's account, this means either:
- Credits are consumed without sessions being delivered (customer complaint, chargeback risk), or
- Sessions are delivered without credits being consumed (revenue leak).

**Database-safe recommendations:**
1. **All 5 deduction paths must use `SELECT ... FOR UPDATE` (pessimistic lock) on the `User` row** before reading and decrementing `availableSessions`. This must be inside a transaction.
2. Alternatively, use a single atomic `UPDATE users SET available_sessions = available_sessions - 1 WHERE id = :id AND available_sessions > 0 RETURNING available_sessions` and check the returned value — if `null` or unchanged, the deduction failed (insufficient credits), surface the error.
3. Add a `CHECK (available_sessions >= 0)` constraint at the database level as a last-resort guard. This will cause a transaction rollback rather than a silent negative balance.
4. Consolidate all 5 paths through a **single `CreditLedger` service** with the lock logic in one place. The plan already recommends consolidation — make the lock a non-negotiable part of that consolidation.
5. Add a `credit_transactions` ledger table (append-only: `user_id`, `delta`, `reason`, `session_id`, `created_at`) so the balance is always reconstructible from the ledger, not just from the mutable column.

---

### CRITICAL-3 — Two backend write paths produce different DB footprints for `WorkoutSession`

**Workstream:** F (Workout Logger)
**Affected tables:** `WorkoutSession`, `WorkoutLog`, `DailyWorkoutForm`, XP tables

**Finding:**
The plan states:

> A SECOND write path (`adminWorkoutLoggerController` → `workoutLogService.logWorkoutForClient`, used by PLAUD voice-merge apply) writes `WorkoutSession`+`WorkoutLog`+XP but **NOT** `DailyWorkoutForm` → different DB footprints.

This means:
- Workouts logged via the UI have a `DailyWorkoutForm` row.
- Workouts applied via voice/PLAUD do not.
- Any query that JOINs or filters on `DailyWorkoutForm` to find "all workouts" will silently miss voice-applied sessions.
- Charts, progress calculations, streak counters, and the Next-Best-Action engine (H) that read `DailyWorkoutForm` will produce **wrong results for clients whose workouts are applied via voice**.
- The one-form-per-day 409 guard (mentioned in Workstream F) only fires on the UI path — voice-applied workouts bypass it, potentially creating duplicate sessions on the same day without the guard.

**Database-safe recommendations:**
1. **Before consolidating the write paths, audit production data** for `WorkoutSession` rows with no corresponding `DailyWorkoutForm`. Count them. Determine if backfill is needed.
2. The consolidation plan must explicitly include creating the missing `DailyWorkoutForm` row in the voice path — not just as a code comment but as a tested assertion.
3. The 409 one-form-per-day guard must be applied at the **service layer**, not the controller layer, so it fires on both paths.
4. Add a database-level unique constraint or partial index on `DailyWorkoutForm(user_id, date)` to enforce the one-per-day invariant at the DB level, not just in application code.
5. Write a cross-path integration test: apply a workout via the voice path, assert `DailyWorkoutForm` exists, assert charts include it.

---

### CRITICAL-4 — `SessionContext.tsx` hitting dead endpoints → silent data loss

**Workstream:** L (Sessions & Credits)
**Affected tables:** Offline session queue (localStorage), `WorkoutSession`

**Finding:**
The plan states:

> `SessionContext.tsx` (offline localStorage tracker hitting **dead endpoints** → silent empty)

This means the offline session queue is writing to localStorage but the sync-to-server step is silently failing. On a mobile device (Sean's primary use case — training clients on a phone), a trainer could log an entire session, believe it was saved, and the data never reaches the database. The customer's workout history is lost. Credits may not be deducted (or may be deducted without the workout being recorded, depending on which path fires first).

This is not a future risk — this is happening in production right now.

**Database-safe recommendations:**
1. **Immediate hotfix before any other Workstream L work:** identify the dead endpoints, either restore them or redirect `SessionContext` to the live endpoints.
2. Add explicit error surfacing in `SessionContext` — if the sync fails, the user must see a persistent, non-dismissible error banner (not a silent empty). "Your session data could not be saved. Tap to retry."
3. Add a sync-status indicator to the offline queue: pending / syncing / synced / failed, persisted in localStorage alongside the queue.
4. Before retiring `SessionContext` (as the plan proposes), **drain the queue** — check all active users' localStorage for unsynced sessions and provide a recovery path.
5. The retirement slice must include a migration step: on app load, if `SessionContext` queue has unsynced items, attempt one final sync before the context is removed.

---

## HIGH Findings

---

### HIGH-1 — Unbounded growth: JSONB arrays and log tables with no size limits

**Workstream:** C (Bootcamp), D (Pain Charts), E (Nutrition), F (Logger)
**Affected tables:** `ClientPainEntry`, `BootcampClassLog`, `DailyMacroLog`, `WorkoutLog`, `FoodProduct` cache

**Finding:**
The plan introduces or expands several append-only or JSONB-heavy tables:

- **`ClientPainEntry`** — pain entries accumulate per client with no mentioned retention policy or pagination on the read path. The pain→workout constraint engine (D) reads these to derive constraints. If a long-term client has years of entries, this query is unbounded.
- **`BootcampClassLog`** — the "Log class as taught" feature (C) will create a new row per class taught. The freshness engine reads "2-week" history, but the table grows forever. No archival strategy mentioned.
- **`DailyMacroLog`** — the nutrition consolidation (E) adds voice/photo/barcode paths, increasing write frequency. No partition or archival strategy mentioned.
- **`FoodProduct` cache** — barcode scanner caches products. No eviction policy mentioned. A cache without eviction is a table that grows until it causes problems.
- **Hermes Learning Packets** (K) — `docs/ai-workflow/hermes-learning-packets/` is a file-based append corpus. The plan notes the closeout log trims at 30KB but the new durable packet directory has no size limit mentioned.

**Database-safe recommendations:**
1. **`ClientPainEntry`:** Add a `LIMIT` + date-range filter on all reads. The constraint engine should only read entries from the last N months (configurable, default 12). Add a `created_at` index.
2. **`BootcampClassLog`:** Add a `created_at` index. Archive rows older than 6 months to a `bootcamp_class_log_archive` table or add a soft-delete + scheduled cleanup job.
3. **`DailyMacroLog`:** Add a composite index on `(user_id, date)`. Consider range partitioning by month if the table is already large.
4. **`FoodProduct` cache:** Add `last_accessed_at` + a scheduled job to evict rows not accessed in 90 days. Add a `COUNT(*)` alert if the table exceeds a threshold (e.g., 500K rows).
5. **Hermes packets:** Define a max packet count or total directory size. Implement rotation (keep last N packets, archive older ones).

---

### HIGH-2 — Schema drift: `WorkoutPlan` camelCase/snake_case + `ClientTrainerAssignment.isActive` method vs column

**Workstream:** G (Program Creation), L (Sessions & Credits)
**Affected tables:** `WorkoutPlan`, `ClientTrainerAssignment`

**Finding:**
The plan explicitly names these as "Rule 58" landmines:

> `WorkoutPlan` hybrid camelCase/snake_case columns need explicit `field:` mappings; `ClientTrainerAssignment.isActive()` is a METHOD, the DB column is `status` (STRING) — never read `.isActive` as a property.

These are not hypothetical — they are documented, named failure modes in the existing codebase. Any new code in Workstream G (program creation verification, the two-system decision, the "Program Studio" unification) or Workstream L (session lifecycle) that touches these models without explicit `field:` mappings or that reads `.isActive` as a property will silently return `undefined` or `null` instead of the real value, causing authorization failures, incorrect program visibility, or broken assignment checks.

**Database-safe recommendations:**
1. **Before any Workstream G or L code ships**, run a grep across all files that reference `WorkoutPlan` columns and `ClientTrainerAssignment.isActive` — produce an exhaustive list of every call site.
2. Add a Sequelize model-level test that instantiates each model from a real DB row and asserts every mapped column returns the correct type and value. This test must be in the regression suite and must run on every PR.
3. For `ClientTrainerAssignment`: add a linter rule (ESLint custom rule or a comment-based grep in CI) that flags `.isActive` property access (not method call) on this model.
4. For `WorkoutPlan`: add explicit `field: 'snake_case_column'` to every camelCase attribute in the Sequelize model definition. Do not rely on Sequelize's auto-underscore behavior.
5. Document the full column mapping in the model file's blueprint header.

---

### HIGH-3 — Two program models (`WorkoutPlan` vs `LongTermProgramPlan`) with no bridge → client never sees macro plan

**Workstream:** G (Program Creation)
**Affected tables:** `WorkoutPlan`, `LongTermProgramPlan`, `ProgramMesocycleBlock`

**Finding:**
The plan states:

> A 12-month macro plan never reaches the client.

A trainer can create a 12-month `LongTermProgramPlan` with `ProgramMesocycleBlock` entries, believe they have assigned a program to a client, and the client sees nothing. This is a silent data integrity failure — the trainer's work exists in the database but is invisible to the client. The client's `GET /api/workouts/:userId/current` returns `null` or a stale plan.

The plan proposes two resolution options but does not mandate one. **This ambiguity is itself a risk** — if the worker-bot implements the bridge without a clear decision, the migration could corrupt existing `WorkoutPlan` rows or create orphaned `ProgramMesocycleBlock` rows.

**Database-safe recommendations:**
1. **The decision must be made before any migration runs.** The audit recommends Option A (macro plan auto-seeds executable `WorkoutPlan` mesocycles) because it preserves the client-visible write path and avoids a breaking change to `GET /api/workouts/:userId/current`.
2. If Option A: the bridge must be a **transactional seed** — either all mesocycle blocks become `WorkoutPlan` rows or none do. Use a database transaction with rollback on any failure.
3. Add a FK constraint: `WorkoutPlan.source_long_term_plan_id` (nullable) → `LongTermProgramPlan.id` so the lineage is traceable.
4. Add a migration that backfills existing `LongTermProgramPlan` rows — either seeds them into `WorkoutPlan` (Option A) or marks them `coach_only = true` (Option B). Do not leave the two systems in an ambiguous state post-migration.
5. Write an integration test: create a `LongTermProgramPlan`, trigger the bridge, assert `GET /api/workouts/:userId/current` returns the correct first mesocycle.

---

### HIGH-4 — Farm finder on deprecated USDA AMS endpoint → likely returning empty data in production

**Workstream:** E (Nutrition)
**Affected tables:** (external API, no local table — but the plan proposes self-hosting)

**Finding:**
The plan states:

> farm finder on **deprecated USDA AMS** endpoint (likely empty in prod)

Real users are currently seeing an empty farm finder. If the plan's self-hosted dataset strategy ships, there is a new risk: a self-hosted farm/CSA dataset is a **new table with unbounded growth potential** (farm profiles, locations, operating hours, CSA schedules) and a **new write path** (who can add/edit farm records? what validation?). The plan does not specify the schema or the data provenance strategy.

**Database-safe recommendations:**
1. **Immediate:** add a user-visible "Farm finder is temporarily unavailable" state rather than silently returning empty results. Do not show a spinner that never resolves.
2. For

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
