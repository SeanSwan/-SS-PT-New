# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 74.2s
> **Files:** docs/ai-workflow/brainstorms/training-command-unification-village-brief-2026-06-28.md
> **Generated:** 6/28/2026, 3:44:46 PM

---

# Data Safety Audit: Training Command Unification Plan
**Auditor Role:** Production Data Safety Review
**Date:** 2026-06-28
**Platform:** SwanStudios (sswanstudios.com) — Real paying customers, real billing credits
**Plan Source:** `training-command-unification-village-brief-2026-06-28.md`

---

## Executive Summary

This plan touches **billing credits, XP/engagement side effects, plan advancement cursors, and historical workout records** — all of which affect real client data and real money. The staged build order proposed by Codex is directionally correct, but several write paths have critical gaps that could cause **silent credit deductions, phantom plan advancement, or unbounded storage growth** before the safety contract is locked. Seven findings require action before any slice ships to production.

---

## Finding 1: Missing `isHistorical` / Source Flag in AI Daily-Form Write Path

**Severity: CRITICAL**

### What the Plan Says

> `backend/services/ai/coachActionProposalApprovalService.mjs:189` approves workout-log proposals by calling `submitAiWorkoutLogAsDailyForm`.
> Coach historical-import instructions say no paid-session deduction, but the backend approval path currently lacks a first-class historical source flag in the call to `submitAiWorkoutLogAsDailyForm`.

### Derived Write Path

```
CoachCommandCenter (voice intent: historical_import)
  → coachActionProposalClassifier.mjs (workout_log proposal)
  → coachActionProposalApprovalService.mjs:189
  → aiWorkoutDailyFormService.mjs:50   ← WRITE to DailyWorkoutForm, WorkoutSession, WorkoutLog
  → workoutLogService.mjs              ← paid-session deduction, XP side effects
```

### The Gap

`adminWorkoutLoggerController.mjs:73` already has `historical_import` and `move_fitness_historical_import` source strings that trigger `suppressEngagementSideEffects`. The AI daily-form path does **not** pass this flag. A Coach-approved historical backfill today will:

1. Deduct paid-session credits from a real client's balance.
2. Fire XP/social celebration side effects as if the client trained today.
3. Potentially advance the plan cursor (see Finding 6).

This is a **billing correctness defect** affecting real money on a live platform.

### Recommendations

```sql
-- Verify the current column set before adding anything
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('workout_logs', 'daily_workout_forms', 'workout_sessions')
  AND column_name ILIKE '%source%'
ORDER BY table_name, column_name;
```

**Backend contract change required:**

```javascript
// aiWorkoutDailyFormService.mjs — add to input contract
/**
 * @param {Object} params
 * @param {string} params.source
 *   Allowed values: 'live' | 'historical_import' | 'move_fitness_historical_import' | 'ai_generated_backfill'
 * @param {boolean} params.suppressEngagementSideEffects  // derived from source, not caller-set
 * @param {boolean} params.suppressPlanAdvancement        // derived from source
 * @param {boolean} params.suppressPaidSessionDeduction   // derived from source, overridable only by explicit trainer action
 */
const HISTORICAL_SOURCES = new Set([
  'historical_import',
  'move_fitness_historical_import',
  'ai_generated_backfill',
]);

function deriveSuppressionFlags(source) {
  const isHistorical = HISTORICAL_SOURCES.has(source);
  return {
    suppressEngagementSideEffects: isHistorical,
    suppressPlanAdvancement: isHistorical,
    suppressPaidSessionDeduction: isHistorical,
  };
}
```

**Do not allow callers to set suppression flags directly.** Derive them from `source` inside the service. This prevents a future caller from accidentally or maliciously passing `suppressPaidSessionDeduction: false` on a historical write.

**Schema change needed** (migration required — see Finding 5):

```sql
-- Add source tracking to workout_logs if not present
ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS log_source VARCHAR(64) NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS is_historical_filler BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_by_trainer BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_workout_logs_source
  ON workout_logs (log_source, is_historical_filler);
```

---

## Finding 2: `sessionStorage` Prefill Creates Orphaned Draft State

**Severity: HIGH**

### What the Plan Says

> Option C: Store a review-gated draft in **sessionStorage** or route state, open the Training tab logger mode with date/source/exercises/notes prefilled, and require human save.

### The Gap

`sessionStorage` is tab-scoped and survives page navigation within the same tab. This creates several production risks:

1. **Stale client mismatch**: Trainer opens Client A's history preview, gets interrupted, switches to Client B in the same tab. `sessionStorage` still holds Client A's prefill data. If the trainer saves without noticing, Client B gets Client A's workout logged against their record.
2. **No TTL**: The draft persists indefinitely within the session. A trainer returning hours later may not realize the prefill is stale.
3. **No server-side audit trail**: A draft that is never saved leaves no trace. If a billing dispute arises ("I never approved that backfill"), there is no record of what was staged.
4. **XSS exposure**: Any `sessionStorage` key holding exercise/notes data is readable by any script on the same origin.

### Recommendations

```typescript
// Replace raw sessionStorage with a typed, validated, TTL-bound prefill contract

interface WorkoutLoggerPrefill {
  prefillId: string;           // uuid — for dedup guard
  clientId: string;            // MUST match active client context on load
  source: 'historical_import' | 'ai_generated_backfill';
  workoutDate: string;         // ISO 8601 — must be in the past for historical
  exercises: PrefillExercise[];
  notes?: string;
  createdAt: number;           // Date.now() — for TTL check
  ttlMs: number;               // max 3_600_000 (1 hour)
}

// On logger mount, validate before applying prefill:
function validateAndConsumePrefill(
  stored: WorkoutLoggerPrefill,
  activeClientId: string
): WorkoutLoggerPrefill | null {
  if (stored.clientId !== activeClientId) {
    console.error('[PREFILL] Client mismatch — discarding stale prefill');
    sessionStorage.removeItem('workoutLoggerPrefill');
    return null;
  }
  if (Date.now() - stored.createdAt > stored.ttlMs) {
    sessionStorage.removeItem('workoutLoggerPrefill');
    return null;
  }
  if (new Date(stored.workoutDate) >= new Date()) {
    // Historical backfill must be in the past
    sessionStorage.removeItem('workoutLoggerPrefill');
    return null;
  }
  sessionStorage.removeItem('workoutLoggerPrefill'); // consume once
  return stored;
}
```

**Additionally:** Consider a server-side draft table instead of `sessionStorage` for audit trail:

```sql
CREATE TABLE IF NOT EXISTS workout_log_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id INTEGER NOT NULL REFERENCES users(id),
  trainer_id INTEGER NOT NULL REFERENCES users(id),
  source VARCHAR(64) NOT NULL,
  workout_date DATE NOT NULL,
  draft_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  consumed_at TIMESTAMPTZ,
  -- Prevent duplicate drafts for same client/date/source
  CONSTRAINT uq_draft_client_date_source UNIQUE (client_id, workout_date, source)
);

-- Cleanup job: delete expired unconsumed drafts
CREATE INDEX IF NOT EXISTS idx_workout_log_drafts_expires
  ON workout_log_drafts (expires_at)
  WHERE consumed_at IS NULL;
```

---

## Finding 3: Unbounded JSONB Growth in Draft Payloads and History Preview

**Severity: HIGH**

### What the Plan Says

> `backend/services/historicalWorkoutImportService.mjs:174-194` returns `draftOnly: true`, parsed drafts, and missing draft requests; it does not persist workouts.
> `backend/routes/workoutLogUploadRoutes.mjs:257-260` returns draft-only preview data.

### The Gap

The plan does not specify:

1. **Maximum number of exercises per draft** — A malicious or erroneous upload could contain thousands of exercise entries in a single JSONB payload.
2. **Maximum number of drafts per preview request** — Bulk historical imports could return hundreds of draft objects in a single response.
3. **Maximum payload size for the `/history-preview` POST** — No size limit mentioned.
4. **JSONB column size** — PostgreSQL JSONB has no built-in size limit per row. A single `draft_payload` column can grow to gigabytes.

If `workout_log_drafts.draft_payload` (Finding 2) or any existing JSONB column stores unbounded exercise arrays, a single bad import can:
- Exhaust database row storage
- Cause OOM on the Node.js process during serialization
- Slow down all queries on the table due to TOAST bloat

### Recommendations

```javascript
// workoutLogUploadRoutes.mjs — add before handler
const HISTORY_PREVIEW_LIMITS = {
  maxBodyBytes: 512 * 1024,        // 512 KB upload limit
  maxDraftsPerRequest: 50,          // max historical sessions per batch
  maxExercisesPerDraft: 30,         // max exercises per session
  maxNotesLength: 2000,             // characters
};

// Middleware
app.use('/api/workout-logs/history-preview',
  express.json({ limit: '512kb' }),
  (req, res, next) => {
    const drafts = req.body?.drafts ?? [];
    if (drafts.length > HISTORY_PREVIEW_LIMITS.maxDraftsPerRequest) {
      return res.status(400).json({
        error: `Maximum ${HISTORY_PREVIEW_LIMITS.maxDraftsPerRequest} sessions per import batch`
      });
    }
    for (const draft of drafts) {
      if ((draft.exercises?.length ?? 0) > HISTORY_PREVIEW_LIMITS.maxExercisesPerDraft) {
        return res.status(400).json({ error: 'Too many exercises in a single session draft' });
      }
    }
    next();
  }
);
```

```sql
-- Add a CHECK constraint to cap JSONB size at the DB level
-- PostgreSQL does not support octet_length on JSONB directly in CHECK,
-- but you can enforce via a trigger:

CREATE OR REPLACE FUNCTION check_draft_payload_size()
RETURNS TRIGGER AS $$
BEGIN
  IF octet_length(NEW.draft_payload::text) > 65536 THEN  -- 64 KB per draft
    RAISE EXCEPTION 'draft_payload exceeds maximum allowed size (64KB)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workout_log_drafts_size
  BEFORE INSERT OR UPDATE ON workout_log_drafts
  FOR EACH ROW EXECUTE FUNCTION check_draft_payload_size();
```

---

## Finding 4: Plan Advancement Cursor Race Condition

**Severity: HIGH**

### What the Plan Says

> `backend/routes/workoutPlanRoutes.mjs:690` exposes plan advance.
> Product Requirement 7: Plan advancement should only happen for current planned assignments, not arbitrary historical imports.
> Option A: Needs a stable assignment key for non-current plan/day loads or a **read-only prefill mode that does not advance plan cursor**.

### The Gap

The plan identifies the need for a "read-only prefill mode" but does not specify how the plan advancement cursor is protected when:

1. A trainer loads a non-current plan/day into the logger (Option A).
2. Two browser tabs are open for the same client — one logs today's session (advancing the cursor), the other is mid-fill on a historical backfill.
3. A Coach approval fires concurrently with a manual logger save for the same client/date.

If the plan advancement endpoint (`/api/workout-plans/:id/advance`) is called without a concurrency guard, two concurrent saves could:
- Advance the cursor twice (skipping a session)
- Log the same session twice (duplicate billing)

### Recommendations

```sql
-- Add optimistic locking to workout_plans
ALTER TABLE workout_plans
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

-- Advancement must include version check:
-- UPDATE workout_plans
--   SET current_session_index = current_session_index + 1,
--       version = version + 1
--   WHERE id = $1
--     AND version = $expectedVersion  -- optimistic lock
-- If rows_affected = 0, return 409 Conflict to caller
```

```javascript
// workoutPlanRoutes.mjs — advance endpoint
async function advancePlan(req, res) {
  const { planId, expectedVersion, source } = req.body;

  // Historical sources MUST NOT advance the cursor
  if (HISTORICAL_SOURCES.has(source)) {
    return res.status(400).json({
      error: 'Historical backfill writes cannot advance the plan cursor'
    });
  }

  const result = await WorkoutPlan.update(
    {
      currentSessionIndex: sequelize.literal('current_session_index + 1'),
      version: sequelize.literal('version + 1'),
    },
    {
      where: { id: planId, version: expectedVersion },
      returning: true,
    }
  );

  if (result[0] === 0) {
    return res.status(409).json({
      error: 'Plan was modified concurrently. Reload and retry.',
      code: 'PLAN_VERSION_CONFLICT',
    });
  }

  return res.json({ success: true });
}
```

**Additionally:** The in-logger plan/day picker (Option A) must fetch plan data with the current `version` value and pass it back on any save that could trigger advancement. The frontend must handle `409` gracefully with a reload prompt.

---

## Finding 5: Schema-Drift Risk — "No Backend Changes" Claim vs. Actual Write Requirements

**Severity: HIGH**

### What the Plan Says

The plan does not explicitly claim "no backend changes," but Option A is described as:
> "Smallest frontend slice. No new generation engine."

Option C is described as primarily a UI flow. However, the plan's own requirements demand backend changes that are not fully enumerated.

### Derived Required Schema Changes

Cross-referencing all write paths in the plan:

| Requirement | Current State | Schema Change Needed |
|---|---|---|
| Historical source flag on AI daily-form path | Not present in `aiWorkoutDailyFormService` | `workout_logs.log_source`, `workout_logs.is_historical_filler` |
| `reviewed_by_trainer` flag on backfill records | Not mentioned in existing schema | `workout_logs.reviewed_by_trainer`, `workout_logs.reviewed_at` |
| Plan advancement version lock | Not mentioned | `workout_plans.version` |
| Draft storage for prefill (if server-side) | No draft table exists per plan | New `workout_log_drafts` table |
| Non-current plan/day load without cursor advance | No read-only load mode | Logic change in `clientWorkoutRoutes.mjs` |

### Migration Safety Rules

```sql
-- ALL migrations must be:
-- 1. Additive only (no column drops, no type changes)
-- 2. Non-blocking (use ADD COLUMN IF NOT EXISTS, not ALTER COLUMN)
-- 3. Backward-compatible (new columns must have DEFAULT values)
-- 4. Tested against a production-size data snapshot before deploy

-- Example safe

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
