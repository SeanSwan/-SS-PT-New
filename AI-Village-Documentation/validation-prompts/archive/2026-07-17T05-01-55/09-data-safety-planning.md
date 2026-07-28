# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 | **Duration:** 87.5s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16.md
> **Generated:** 7/16/2026, 10:01:55 PM

---

# DATA SAFETY AUDIT REPORT
## Plan: VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16
**Auditor role:** Production Data Safety Auditor — SwanStudios SaaS Platform
**Audit date:** 2026-07-16
**Severity scale:** CRITICAL → HIGH → MEDIUM → LOW

---

## Executive Summary

This plan is **primarily a design-language ratification document** — it selects a visual system, not a data architecture. However, it contains **several implicit write paths, data-truth assertions, and schema-adjacent claims** that carry real production risk if implemented without explicit safety guardrails. The plan's "no re-architecture" framing creates a **schema-drift trap**: reskinning surfaces that read from real tables will expose any existing drift, and the plan's data-truth constraints will force new read paths that may not exist yet.

**No findings are purely cosmetic.** Every finding below traces to a real table, column, or write path implied by the plan.

---

## Finding 1 — Unbounded Growth Risk in "Evidence Lens" Proof Numbers

**Severity: HIGH**

### What the plan says
> "a gold Evidence Lens circles exactly ONE real-proof number per screen (the only badge allowed to mark proof)"
> "charts come from real logged workouts (Victory only); numeric truth is monospace; no invented stats"
> "log the workout → save it → turn it into progress proof → decide the next training action → make milestones shareable"

### Derived tables and columns
The Evidence Lens must source from real logged data. Implied write paths:
- `workouts` table (or equivalent) — each session log entry
- `workout_sets` / `workout_exercises` — child rows per session
- `milestones` or `achievements` — shareable proof events
- `progress_snapshots` — if the plan caches "proof numbers" for display

### The risk
The plan mandates **"real logged workouts"** as the source of truth for every proof number displayed. If the implementation caches these aggregates (e.g., a `user_stats` JSONB column or a `cached_proof_number` field updated on each workout save), that cache can grow unbounded or drift. Specifically:

1. **JSONB array growth:** If milestone history or streak data is stored as a JSONB array appended on each workout, there is no stated size cap. A user with 5 years of daily sessions accumulates 1,825+ array entries in a single cell.
2. **No pagination contract stated:** The plan says "Victory charts only" but does not specify the query window. A Victory chart rendering 3 years of daily workout data in one query will cause both a slow query and a large client-side payload.
3. **Shareable milestones:** "make milestones shareable" implies a new write path (milestone record creation + possibly a share token). No size limit on milestone records per user is stated.

### Recommendations
```sql
-- If workout history is queried for charts, enforce a window:
SELECT * FROM workout_sessions
WHERE user_id = $1
  AND session_date >= NOW() - INTERVAL '90 days'  -- or configurable window
ORDER BY session_date DESC
LIMIT 500;  -- hard cap regardless of date range

-- If proof numbers are cached, use a separate aggregate table, NOT JSONB:
CREATE TABLE user_proof_aggregates (
  user_id        UUID        NOT NULL REFERENCES users(id),
  metric_key     VARCHAR(64) NOT NULL,  -- e.g. 'total_sessions_90d'
  metric_value   NUMERIC     NOT NULL,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, metric_key)
);
-- Upsert on each workout save; never append.
```

- Define a **maximum chart window** (recommend 90 days default, 1 year max) in the Victory chart query layer before implementation begins.
- If milestones use a JSONB array anywhere, **migrate to a normalized `milestones` table** with `user_id FK`, `created_at`, and a row-count limit enforced at the application layer (e.g., retain last 500 per user, archive older).

---

## Finding 2 — Soft-Delete Integrity on "Shared" Milestone Records

**Severity: HIGH**

### What the plan says
> "make milestones shareable"
> "the product core loop: log the workout → save it → turn it into progress proof → decide the next training action → make milestones shareable"

### Derived tables and columns
- `milestones` table — `id`, `user_id`, `share_token` (implied), `deleted_at` (if soft-deleted)
- `workout_sessions` — parent record; if soft-deleted, child milestone may become orphaned

### The risk
If a user deletes their account or a trainer removes a client, and the platform uses soft-delete on `users` or `workout_sessions`, **shared milestone URLs remain resolvable** unless the share-token lookup explicitly joins against `deleted_at IS NULL` on every ancestor table.

The plan does not specify a soft-delete strategy, which means the existing platform's soft-delete behavior (whatever it is) will be inherited by any new milestone share path without explicit review.

### Recommendations
- **Audit the existing soft-delete chain** before implementing share tokens. Every share-token lookup must traverse: `share_tokens → milestones → workout_sessions → users`, checking `deleted_at IS NULL` at every join.
- Share tokens must have an **explicit expiry column** (`expires_at TIMESTAMPTZ NOT NULL`) — no indefinite public URLs.
- On user account deletion (soft or hard), **immediately invalidate all share tokens** for that user via a cascading update or a deletion hook:

```sql
UPDATE milestone_share_tokens
SET   revoked_at = NOW()
WHERE user_id = $1
  AND revoked_at IS NULL;
```

- Add a **database-level check** (not just application-level) to prevent share token creation for soft-deleted parents:

```sql
-- Partial index to enforce: no active tokens for deleted milestones
CREATE UNIQUE INDEX idx_active_share_tokens
ON milestone_share_tokens (milestone_id)
WHERE revoked_at IS NULL;
-- Application must check milestone.deleted_at before issuing token.
```

---

## Finding 3 — "No Backend Changes" Claim vs. Actual Data Writes

**Severity: CRITICAL**

### What the plan says
> "This program reskins; it does not re-architect IA, tabs, or interaction contracts."
> "the trainer and client dashboards work well today… This program reskins"

### The risk — schema-drift trap
The plan explicitly frames this as a **reskin** with no architectural change. However, the plan simultaneously mandates:

1. **"charts come from real logged workouts"** — if the current dashboard uses mock/seeded data anywhere, the reskin will require new real-data query endpoints. That is a backend change.
2. **"honest empty states"** — empty states require the frontend to distinguish between "no data exists" and "data failed to load." This requires API responses to return explicit `null` vs. `[]` vs. error states — a contract change.
3. **"the admin Signal Bar shows no counts by design"** — if the current admin dashboard shows counts sourced from a `notifications` or `queue_items` table, removing counts from the UI does NOT remove the underlying query. If the query is removed, that is a backend change. If it is kept, it is wasted load.
4. **"numeric truth is monospace; no invented stats"** — if any current surface displays a hardcoded or seeded stat, replacing it with a real query is a new read path, potentially a new endpoint, potentially a new aggregation column.
5. **"urgent human-waiting queues ABOVE passive charts"** — reordering admin dashboard sections implies the admin API response either already returns priority metadata, or a new `priority` field must be added to queue items. If the latter, that is a schema change.

### Recommendations
- **Before any implementation begins**, conduct a **surface-by-surface data audit**:
  - For each of the 12 dashboard mocks, list every displayed value and trace it to an existing table + column.
  - Flag any value that currently comes from a seed, mock, or hardcoded source.
  - Each flagged value is a **required backend change** — document it explicitly so it is not discovered mid-sprint.
- The "no re-architecture" claim should be narrowed to: **"no IA or interaction contract changes."** It must not be interpreted as "no backend changes" because the data-truth constraint makes backend changes inevitable.
- Create a **schema-drift check** in CI: a test that compares Sequelize model definitions against the live DB schema and fails on any column mismatch. This prevents the reskin from silently reading columns that no longer exist or writing to columns that were renamed.

```javascript
// Recommended CI test pattern (pseudo-code)
describe('Schema drift check', () => {
  it('WorkoutSession model matches DB columns', async () => {
    const modelCols = Object.keys(WorkoutSession.rawAttributes);
    const dbCols = await queryInterface.describeTable('workout_sessions');
    expect(modelCols.sort()).toEqual(Object.keys(dbCols).sort());
  });
});
```

---

## Finding 4 — Sensitive Data Retention: "Swan Coach" AI Assistant

**Severity: CRITICAL**

### What the plan says
> "the AI assistant is always 'Swan Coach', never 'AI' user-facing"
> "decide the next training action" (implied AI recommendation in the core loop)

### The risk
The plan references Swan Coach as part of the product core loop ("decide the next training action"). This implies Swan Coach:
1. Receives user workout data as input context
2. Generates a recommendation
3. That recommendation may be displayed, logged, or stored

The plan **does not state**:
- Whether Swan Coach conversation history is stored
- Whether workout data sent to Swan Coach is transmitted to a third-party LLM API
- How long any stored conversation or recommendation data is retained
- Whether users are informed that their workout data is processed by an AI system
- Whether GDPR/CCPA deletion requests cascade to Swan Coach conversation logs

### Recommendations
This is the highest-risk finding in the document because it involves **potential third-party data transmission of health-adjacent information** (workout logs, body metrics, training history) with no stated retention or deletion policy.

**Immediate actions required before any Swan Coach feature ships:**

1. **Data Processing Agreement (DPA):** If Swan Coach calls an external LLM API (OpenAI, Anthropic, etc.), a DPA must be in place. Workout data is health-adjacent and may qualify as sensitive personal data under GDPR Article 9 in some jurisdictions.

2. **Retention policy — store or discard decision must be explicit:**

```sql
-- If conversation logs ARE stored:
CREATE TABLE swan_coach_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_start   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end     TIMESTAMPTZ,
  -- Do NOT store raw message content in this table.
  -- Store only structured recommendation outputs.
  recommendation_type  VARCHAR(64),
  recommendation_json  JSONB,
  retained_until  TIMESTAMPTZ NOT NULL  -- explicit expiry, e.g. 90 days
);

-- Scheduled cleanup job (run nightly):
DELETE FROM swan_coach_sessions
WHERE retained_until < NOW();
```

3. **No raw transcript storage** unless explicitly consented to by the user with a clear UI disclosure.
4. **GDPR/CCPA cascade:** The `ON DELETE CASCADE` on `user_id` above is the minimum. Verify that account deletion triggers a cascade to all Swan Coach data, not just a soft-delete.
5. **Privacy policy update** must precede any Swan Coach data collection in production.

---

## Finding 5 — Storage Cleanup: Photography and Video Library

**Severity: HIGH**

### What the plan says
> "remaining public surfaces (store, photography, video library, waiver)"
> "make milestones shareable" (implies media assets may be attached to milestones)

### Derived storage paths
- Photography surface: image assets stored in S3 or equivalent object storage
- Video library: video assets, potentially large
- Milestone sharing: if milestones can include a progress photo or video clip, user-generated media is involved

### The risk
The plan does not state a cleanup strategy for any of these. Specifically:

1. **When a video library item is deleted** (by admin), is the underlying S3 object deleted, or does it become an orphaned blob?
2. **When a user account is deleted**, are any user-uploaded progress photos or video clips purged from object storage?
3. **When a milestone is soft-deleted**, does its associated media remain accessible via its original S3 URL (which is not protected by the application's auth layer)?

### Recommendations

```javascript
// Recommended pattern: never store raw S3 URLs in the DB.
// Store only the S3 object key. Generate signed URLs at read time.

// media_assets table
{
  id: UUID,
  owner_id: UUID,           // FK to users, ON DELETE CASCADE triggers cleanup job
  owner_type: VARCHAR(32),  // 'user' | 'milestone' | 'video_library'
  s3_bucket: VARCHAR(128),
  s3_key: VARCHAR(512),     // store key, not full URL
  deleted_at: TIMESTAMPTZ,  // soft-delete first
  purge_after: TIMESTAMPTZ  // set to deleted_at + 30 days for recovery window
}
```

- Implement a **nightly S3 cleanup job** that hard-deletes objects where `purge_after < NOW()`.
- **Never store full S3 URLs** in the database — store only the object key and generate pre-signed URLs with a short TTL (e.g., 15 minutes) at read time. This prevents orphaned URLs from remaining accessible after soft-delete.
- For the video library specifically: if videos are served via a CDN, **CDN cache invalidation** must be triggered on deletion, not just the S3 object deletion.
- Add a **storage quota per user** to prevent unbounded media growth (see Finding 1 connection).

---

## Finding 6 — Concurrent Access: Workout Logging Write Path

**Severity: HIGH**

### What the plan says
> "log the workout → save it → turn it into progress proof"
> "charts come from real logged workouts"
> "the trainer and client dashboards work well today"

### The risk
The core product loop centers on workout logging. If the reskin introduces any **optimistic UI updates** (e.g., immediately updating the Evidence Lens proof number before the server confirms the write), there is a race condition:

1. User logs workout → UI immediately increments "total sessions" counter
2. Server write fails (network error, validation error, DB constraint)
3. UI shows incorrect proof number until next full page load
4. If the proof number is also cached in a `user_proof_aggregates` table (see Finding 1), the cache is now out of sync with the source of truth

Additionally, if a trainer and client are both viewing the same dashboard simultaneously and the trainer logs a session on behalf of the client, **two concurrent writes** to the same user's workout history could create duplicate session records if there is no uniqueness constraint or optimistic lock.

### Recommendations

```sql
-- Prevent duplicate session logging:
CREATE UNIQUE INDEX idx_workout_sessions_no_duplicate
ON workout_sessions (user_id, trainer_id, session_date, session_start_time)
WHERE deleted_at IS NULL;

-- For aggregate caches, use optimistic locking:
UPDATE user_proof_aggregates
SET   metric_value = $new_value,
      computed_at  = NOW(),
      version      = version + 1
WHERE user_id     = $user_id
  AND metric_key  = $metric_key
  AND version     = $expected_version;
-- If 0 rows updated, retry or surface conflict to client.
```

- The frontend must **not update the Evidence Lens number optimistically** — it must wait for server confirmation before displaying the new proof value. A proof number that flickers or reverts destroys user trust in the data-truth constraint the plan explicitly mandates.
- Implement **idempotency keys** on the workout-save endpoint so that network retries do not create duplicate records.

---

## Finding 7 — Data Integrity: Denormalized Counts and the Admin Signal Bar

**Severity: MEDIUM**

### What the plan says
> "the admin Signal Bar shows no counts by design"
> "urgent human-waiting queues ABOVE passive charts; finance demoted"
> "no invented stats"

### The risk
The plan states the admin Signal Bar shows **no counts by design**. This is a deliberate UI choice. However, the underlying queue data (human-waiting items, urgent tasks) must still be queried to determine **ordering and presence** — the admin needs to know something is waiting even without a count badge.

If the implementation uses a **denormalized

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
