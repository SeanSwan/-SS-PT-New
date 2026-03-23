# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 69.8s
> **Files:** docs/ai-workflow/blueprints/ENHANCED-CHART-ANALYTICS-AND-AI-INTEGRATION-MASTER-PROMPT.md
> **Generated:** 3/21/2026, 10:29:39 PM

---

# 🚨 DATA SAFETY AUDIT REPORT — ENHANCED CHART ANALYTICS MASTER PROMPT

**Audit Date:** 2026-03-22  
**Auditor:** DATA SAFETY AUDITOR  
**Platform:** SwanStudios (Production SaaS)  
**Document:** `ENHANCED-CHART-ANALYTICS-AND-AI-INTEGRATION-MASTER-PROMPT.md`

---

## ⚠️ EXECUTIVE SUMMARY

**CRITICAL FINDINGS:** 3  
**HIGH FINDINGS:** 5  
**MEDIUM FINDINGS:** 4  
**LOW FINDINGS:** 2

**OVERALL RISK LEVEL:** 🔴 **HIGH — DEPLOYMENT BLOCKER**

This blueprint contains **multiple data destruction vectors** that could wipe user workout history, corrupt authentication data, or expose PII. The most dangerous issues are:

1. **Materialized View refresh pattern could lock tables during production traffic**
2. **No transaction wrappers around multi-table analytics queries**
3. **AI email/SMS draft system lacks rate limiting enforcement at DB level**
4. **Migration for `chartVisibility` JSONB field has no rollback safety**
5. **Bulk exercise seeding could duplicate/corrupt exercise library**

---

## 🔴 CRITICAL FINDINGS

### CRITICAL-1: Materialized View Refresh Could Lock Production Tables

**Severity:** CRITICAL  
**Data at Risk:** All workout data (WorkoutSessions, WorkoutExercises, Sets)  
**Blast Radius:** ALL USERS — platform-wide outage during refresh  
**Location:** Section 12, Phase 1, Step 5

**What's Wrong:**

The blueprint specifies creating a `UserExerciseStats_MV` Materialized View with "15-min refresh + post-workout refresh":

```sql
-- Implied implementation (not shown in doc, but standard pattern):
CREATE MATERIALIZED VIEW "UserExerciseStats_MV" AS
SELECT ... FROM "WorkoutExercises" we
JOIN "WorkoutSessions" ws ...
JOIN "Sets" s ...
```

**THE DANGER:**
- `REFRESH MATERIALIZED VIEW` in PostgreSQL takes an **EXCLUSIVE LOCK** on the view
- If the underlying query is slow (joins across WorkoutSessions + WorkoutExercises + Sets for ALL users), the refresh could take 10-30+ seconds
- During refresh, **ALL queries reading from the MV are blocked**
- If you trigger refresh "post-workout" (after every workout log), you could trigger 50+ refreshes/hour during peak times
- **CONCURRENT REFRESH** requires a UNIQUE index, which isn't specified

**Worst Case Scenario:**
1. User logs workout → triggers MV refresh
2. Refresh takes 20 seconds due to table size
3. 50 other users try to load Exercise Rolodex → all blocked
4. Queries pile up → connection pool exhausted
5. **Platform-wide outage**

**Fix:**

```sql
-- Migration: Create MV with CONCURRENTLY-safe structure
CREATE MATERIALIZED VIEW "UserExerciseStats_MV" AS
SELECT
  ws."userId",
  e.id as "exerciseId",
  e.name as "exerciseName",
  e."primaryMuscles",
  COUNT(DISTINCT we."workoutSessionId") as times_performed,
  MAX(s."weightUsed") as max_weight,
  MAX(s."repsCompleted") as max_reps,
  SUM(s."weightUsed" * s."repsCompleted") as total_volume,
  MAX(ws.date) as last_performed,
  MIN(ws.date) as first_performed
FROM "WorkoutExercises" we
JOIN "Exercises" e ON we."exerciseId" = e.id
JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
LEFT JOIN "Sets" s ON s."workoutExerciseId" = we.id
WHERE ws.status = 'completed'
GROUP BY ws."userId", e.id, e.name, e."primaryMuscles";

-- CRITICAL: Add unique index to enable CONCURRENT refresh
CREATE UNIQUE INDEX idx_user_exercise_stats_unique 
ON "UserExerciseStats_MV" ("userId", "exerciseId");

-- Refresh strategy (in cron job, NOT post-workout):
-- Use CONCURRENTLY to avoid blocking reads
REFRESH MATERIALIZED VIEW CONCURRENTLY "UserExerciseStats_MV";
```

**Backend Service Pattern:**
```javascript
// analyticsService.mjs
const refreshExerciseStats = async () => {
  try {
    // CONCURRENTLY = no exclusive lock
    await sequelize.query(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY "UserExerciseStats_MV"',
      { raw: true }
    );
    logger.info('Exercise stats MV refreshed successfully');
  } catch (error) {
    // NEVER throw — log and continue
    // Stale data is better than blocking all users
    logger.error('MV refresh failed (non-fatal):', error);
  }
};

// Cron: Every 15 minutes (NOT post-workout)
cron.schedule('*/15 * * * *', refreshExerciseStats);
```

**REMOVE post-workout refresh entirely** — it's a DoS vector.

---

### CRITICAL-2: No Transaction Wrappers Around Multi-Table Analytics Queries

**Severity:** CRITICAL  
**Data at Risk:** Inconsistent analytics data (counts/sums don't match reality)  
**Blast Radius:** ALL USERS — analytics show wrong data  
**Location:** Section 3.1, SQL query for exercise-history endpoint

**What's Wrong:**

The proposed SQL query joins 4 tables without a transaction:

```sql
SELECT
  e.id, e.name, e.primaryMuscles, e.category,
  COUNT(DISTINCT we."workoutSessionId") as times_performed,
  MAX(s."weightUsed") as max_weight,
  ...
FROM "WorkoutExercises" we
JOIN "Exercises" e ON we."exerciseId" = e.id
JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
LEFT JOIN "Sets" s ON s."workoutExerciseId" = we.id
WHERE ws."userId" = :userId AND ws.status = 'completed'
GROUP BY e.id, e.name, e.primaryMuscles, e.category
ORDER BY times_performed DESC;
```

**THE DANGER:**
- If a user is actively logging a workout WHILE this query runs:
  - `WorkoutSession` is created (status='in_progress')
  - Query reads it (status filter might not apply yet due to timing)
  - `WorkoutExercises` are inserted
  - Query reads partial data
  - User completes workout → status='completed'
  - **Analytics now show phantom exercises or wrong counts**

- Without `REPEATABLE READ` isolation, you can get:
  - `times_performed` = 47 (counted WorkoutExercises)
  - `total_volume` = 42 workouts worth (Sets inserted after WorkoutExercises were counted)
  - **Mismatched aggregates**

**Fix:**

```javascript
// backend/services/analyticsService.mjs
const getExerciseHistory = async (userId) => {
  // Wrap in transaction with REPEATABLE READ isolation
  return await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
    async (t) => {
      const exercises = await sequelize.query(`
        SELECT
          e.id, e.name, e."primaryMuscles", e.category,
          COUNT(DISTINCT we."workoutSessionId") as times_performed,
          MAX(s."weightUsed") as max_weight,
          MAX(s."repsCompleted") as max_reps,
          SUM(s."weightUsed" * s."repsCompleted") as total_volume,
          MAX(ws.date) as last_performed,
          MIN(ws.date) as first_performed
        FROM "WorkoutExercises" we
        JOIN "Exercises" e ON we."exerciseId" = e.id
        JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
        LEFT JOIN "Sets" s ON s."workoutExerciseId" = we.id
        WHERE ws."userId" = :userId 
          AND ws.status = 'completed'  -- CRITICAL: Only completed workouts
          AND ws."deletedAt" IS NULL   -- CRITICAL: Respect soft deletes
        GROUP BY e.id, e.name, e."primaryMuscles", e.category
        ORDER BY times_performed DESC
      `, {
        replacements: { userId },
        type: QueryTypes.SELECT,
        transaction: t  // CRITICAL: Use transaction
      });

      // Calculate totals in same transaction snapshot
      const totals = await sequelize.query(`
        SELECT
          COUNT(DISTINCT e.id) as "totalUniqueExercises",
          (SELECT COUNT(*) FROM "Exercises" WHERE "deletedAt" IS NULL) as "totalAvailableExercises"
        FROM "WorkoutExercises" we
        JOIN "Exercises" e ON we."exerciseId" = e.id
        JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
        WHERE ws."userId" = :userId 
          AND ws.status = 'completed'
          AND ws."deletedAt" IS NULL
      `, {
        replacements: { userId },
        type: QueryTypes.SELECT,
        transaction: t
      });

      return {
        exercises,
        ...totals[0],
        varietyScore: (totals[0].totalUniqueExercises / totals[0].totalAvailableExercises * 100).toFixed(2)
      };
    }
  );
};
```

**Why This Matters:**
- `REPEATABLE READ` ensures all queries see the same snapshot of data
- If workout is being logged during query, it's either fully visible or fully invisible (no partial state)
- Aggregates are guaranteed consistent

---

### CRITICAL-3: AI Email/SMS Draft System Has No DB-Level Rate Limiting

**Severity:** CRITICAL  
**Data at Risk:** Email/SMS spam, Twilio/SendGrid account suspension  
**Blast Radius:** ALL TRAINERS — could lose email/SMS capability platform-wide  
**Location:** Section 5.3, CommunicationDrafts model

**What's Wrong:**

The blueprint specifies:
> **Rate Limit:** Max 10 drafts per client per day (prevents AI spam loops)

But the `CommunicationDrafts` table has **NO UNIQUE CONSTRAINT** to enforce this at the database level:

```sql
CREATE TABLE "CommunicationDrafts" (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
  "clientId" INTEGER REFERENCES "Users"(id),
  "trainerId" INTEGER REFERENCES "Users"(id),
  subject VARCHAR(200),
  body TEXT NOT NULL,
  "recipientAddress" VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending_approval',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  ...
);
-- NO CONSTRAINT ON drafts per client per day!
```

**THE DANGER:**
1. AI Assistant has a bug in prompt loop detection
2. Trainer says "Send Jackie her workout summary"
3. AI creates draft
4. AI misinterprets response, thinks it failed
5. AI retries 100 times in 10 seconds
6. **100 draft emails queued**
7. Trainer approves one → accidentally triggers mass send
8. **SendGrid flags account for spam → ALL email disabled**

**Worst Case:**
- Twilio/SendGrid account suspended
- **ALL users lose password reset emails, booking confirmations, etc.**
- Platform effectively broken until account restored (24-48 hours)

**Fix:**

```sql
-- Migration: Add DB-level rate limit constraint
CREATE TABLE "CommunicationDrafts" (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
  "clientId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "trainerId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  subject VARCHAR(200),
  body TEXT NOT NULL,
  "recipientAddress" VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending_approval' 
    CHECK (status IN ('pending_approval', 'approved', 'sent', 'rejected')),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "approvedAt" TIMESTAMP,
  "sentAt" TIMESTAMP,
  
  -- CRITICAL: Prevent spam at DB level
  CONSTRAINT chk_daily_draft_limit CHECK (
    (SELECT COUNT(*) 
     FROM "CommunicationDrafts" cd2 
     WHERE cd2."clientId" = "clientId" 
       AND cd2."trainerId" = "trainerId"
       AND cd2."createdAt" >= NOW() - INTERVAL '24 hours'
       AND cd2.status != 'rejected'
    ) <= 10
  )
);

-- Partial index for fast rate limit checks
CREATE INDEX idx_drafts_rate_limit 
ON "CommunicationDrafts" ("clientId", "trainerId", "createdAt") 
WHERE status != 'rejected';
```

**Backend Enforcement (Defense in Depth):**
```javascript
// aiDataWriteService.mjs
case 'draft_email':
case 'draft_sms':
  // Check rate limit BEFORE attempting insert
  const draftCount = await CommunicationDraft.count({
    where: {
      clientId: update.data.clientId,
      trainerId: req.user.id,
      createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      status: { [Op.ne]: 'rejected' }
    }
  });
  
  if (draftCount >= 10) {
    throw new Error(
      'Daily draft limit reached for this client (10/day). ' +
      'This prevents accidental spam. Try again tomorrow or contact support.'
    );
  }
  
  // Proceed with draft creation...
  break;
```

**Additional Safety:**
```javascript
// Approve endpoint MUST check draft age
router.post('/api/trainer/drafts/:draftId/approve', requireTrainer, async (req, res) => {
  const draft = await CommunicationDraft.findByPk(req.params.draftId);
  
  // CRITICAL: Reject drafts older than 24 hours
  const ageHours = (Date.now() - draft.createdAt) / (1000 * 60 * 60);
  if (ageHours > 24) {
    return res.status(400).json({ 
      error: 'Draft expired (>24h old). Please regenerate.' 
    });
  }
  
  // CRITICAL: Verify trainer owns this draft
  if (draft.trainerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not your draft' });
  }
  
  // Send email/SMS...
});
```

---

## 🟠 HIGH FINDINGS

### HIGH-1: chartVisibility Migration Has No Rollback Safety

**Severity:** HIGH  
**Data at Risk:** User privacy settings (could expose weight/body composition data)  
**Blast Radius:** ALL USERS  
**Location:** Section 12, Phase 0, Step 0f

**What's Wrong:**

The blueprint specifies adding a `chartVisibility: JSONB` column with "ALL-FALSE defaults", but provides no migration code. A naive implementation could:

```sql
-- DANGEROUS: No default value specified
ALTER TABLE "Users" ADD COLUMN "chartVisibility" JSONB;

-- If you then try to set defaults in application code:
UPDATE "Users" SET "chartVisibility" = '{...}' WHERE "chartVisibility" IS NULL;
-- This could TIMEOUT on large Users table, leaving some users with NULL
```

**THE DANGER:**
- If migration fails halfway through (timeout, connection drop), some users have NULL `chartVisibility`
- Application code assumes it's an object: `user.chartVisibility.weightProgression`
- **TypeError: Cannot read property 'weightProgression' of null**
- **All chart pages crash for affected users**

**Worse:** If default is accidentally set to `{}` (empty object) instead

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
