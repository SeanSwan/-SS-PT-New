# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 86.7s
> **Files:** docs/ai-workflow/blueprints/SUBSCRIPTION-STORE-MASTER-BUILD-PLAN.md
> **Generated:** 4/4/2026, 11:51:48 PM

---

# DATA SAFETY AUDIT REPORT
## SwanStudios — SUBSCRIPTION-STORE-MASTER-BUILD-PLAN.md
**Auditor:** Data Safety AI | **Date:** 2026-04-04 | **Classification:** PRODUCTION CRITICAL

---

> ⚠️ **AUDIT SCOPE NOTE:** This document is a **planning blueprint (Markdown spec)**, not executable code. However, it contains **explicit implementation instructions, SQL snippets, code patterns, and architectural decisions** that — if implemented as written — would create real data destruction risks. Every finding below targets a specific instruction in this plan that would cause harm when a developer follows it.

---

## EXECUTIVE THREAT SUMMARY

| Severity | Count | Highest Risk Area |
|----------|-------|-------------------|
| 🔴 CRITICAL | 4 | Migration safety, seeder patterns, trial abuse check |
| 🟠 HIGH | 6 | Cascade deletes, RBAC gaps, transaction safety, soft-cap logic |
| 🟡 MEDIUM | 7 | PII exposure, rate limiter, frontend trust, session invalidation |
| 🟢 LOW | 3 | Monitoring gaps, documentation debt |

---

## 🔴 CRITICAL FINDINGS

---

### CRITICAL-01: Migration Has No `down()` Function — Cannot Rollback If Deployment Fails

**Severity:** CRITICAL
**Data at Risk:** `trainerType` column integrity; if migration fails mid-deploy, table could be left in locked/inconsistent state with no recovery path
**Blast Radius:** ALL users — the `Users` table is locked during ALTER; if it fails, the entire platform goes down
**File & Line:** Section 11 (Phase 6: Trainer Access Tiers) — Migration block

**What's Wrong:**

The plan specifies this migration:

```sql
ALTER TABLE "Users" ADD COLUMN "trainerType" VARCHAR(20) NULL;
```

And the file manifest lists:
```
backend/migrations/2026XXXX-add-trainer-type.cjs
```

But **no `down()` function is specified anywhere in the plan.** The plan gives zero guidance on rollback. A developer following this spec will likely write:

```javascript
// What a developer will write following this plan — DANGEROUS
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'trainerType', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },
  // down() MISSING — developer didn't know to add it
};
```

If the deployment fails **after** this migration runs but **before** the application code is fully deployed, you cannot rollback. `sequelize db:migrate:undo` will throw an error or do nothing. The `Users` table may be in a state where the new column exists but the application code referencing it is broken — causing 500 errors for every login attempt.

**Fix — The plan must specify the complete migration file:**

```javascript
// backend/migrations/20260404000001-add-trainer-type.cjs
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists before adding (idempotent)
    const tableDescription = await queryInterface.describeTable('Users');
    if (tableDescription.trainerType) {
      console.log('trainerType column already exists — skipping');
      return;
    }

    await queryInterface.addColumn('Users', 'trainerType', {
      type: Sequelize.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['affiliated', 'independent']],
      },
      comment: 'Trainer affiliation type — null for non-trainers',
    });
  },

  async down(queryInterface, Sequelize) {
    // Safe rollback — only removes the column we added
    const tableDescription = await queryInterface.describeTable('Users');
    if (!tableDescription.trainerType) {
      console.log('trainerType column does not exist — skipping down');
      return;
    }
    await queryInterface.removeColumn('Users', 'trainerType');
  },
};
```

**The plan must be updated to include the full `down()` specification.** Every migration in the file manifest must have a corresponding rollback strategy documented.

---

### CRITICAL-02: Auto-Permission Granting Has No Transaction Wrapper — Partial Writes Will Corrupt Trainer State

**Severity:** CRITICAL
**Data at Risk:** Trainer permission records — a trainer could be marked `affiliated` in the Users table but have zero permissions granted (or vice versa), permanently locking them out of their dashboard
**Blast Radius:** All trainers created during a period of database instability; could affect any trainer if the DB hiccups during creation
**File & Line:** Section 11 — "Auto-Permission Granting" subsection

**What's Wrong:**

The plan states:

> When `trainerType = 'affiliated'`, automatically grant all 6 permissions.
> When `trainerType = 'independent'`, grant only `view_progress` + `manage_clients`.

This implies a multi-step write operation:
1. Write `trainerType` to `Users` table
2. Write 6 permission records to `TrainerPermissions` table (or equivalent)

The plan **never mentions transactions**. A developer following this spec will write something like:

```javascript
// What a developer will write — DANGEROUS (no transaction)
await user.update({ trainerType: 'affiliated' });
// ← If server crashes here, user is 'affiliated' but has ZERO permissions
await TrainerPermissions.bulkCreate(allSixPermissions);
```

If the server crashes, network drops, or the DB times out between these two operations:
- The `Users` table says `trainerType = 'affiliated'`
- The `TrainerPermissions` table has no records for this trainer
- The trainer logs in, the middleware checks permissions, finds none, denies access
- Sean has to manually diagnose and fix this for every affected trainer

**Fix — The plan must mandate transaction wrapping:**

```javascript
// backend/services/trainerService.mjs — REQUIRED pattern
export async function createTrainerWithPermissions(userId, trainerType, transaction = null) {
  const t = transaction || await sequelize.transaction();
  const isNewTransaction = !transaction;

  try {
    // Step 1: Update user type
    await User.update(
      { trainerType },
      { where: { id: userId }, transaction: t }
    );

    // Step 2: Determine permissions based on type
    const permissions = trainerType === 'affiliated'
      ? ALL_SIX_PERMISSIONS
      : ['view_progress', 'manage_clients'];

    // Step 3: Upsert permissions (never delete-then-insert)
    await TrainerPermission.bulkCreate(
      permissions.map(p => ({ userId, permission: p, granted: true })),
      {
        updateOnDuplicate: ['granted', 'updatedAt'],
        transaction: t,
      }
    );

    if (isNewTransaction) await t.commit();
    return { success: true };

  } catch (error) {
    if (isNewTransaction) await t.rollback();
    throw error; // Re-throw so caller knows it failed
  }
}
```

**The plan must explicitly state:** "All trainer creation/type-change operations MUST be wrapped in a Sequelize transaction. Partial writes that set `trainerType` without corresponding permissions are a data corruption bug."

---

### CRITICAL-03: Trial Abuse Check Could Permanently Lock Legitimate Users Out of Their Accounts

**Severity:** CRITICAL
**Data at Risk:** User account access — legitimate users could be permanently denied trial access due to false positive matching; worse, the check could be implemented against the wrong field
**Blast Radius:** Any user whose email appears in a previous trial record — could affect paying customers who cancelled and re-subscribed
**File & Line:** Section 12 (Phase 7) — "Trial Abuse Prevention" subsection; Section 15 — Risks table row "Trial abuse (multi-account)"

**What's Wrong:**

The plan states:

> Check if email has EVER had a trial (cross-account)
> Return 403 `TRIAL_ALREADY_USED` if found

This is a **permanent, irrevocable ban on trial access** based solely on email. The implementation risks are severe:

**Risk 1 — Email normalization attacks work in reverse:** `user@gmail.com` and `u.s.e.r@gmail.com` are the same inbox. If the check uses exact string match, a bad actor bypasses it. If it uses normalization, legitimate users with similar emails get false-positives.

**Risk 2 — No expiry on the ban:** The plan says "EVER had a trial." A user who tried the platform 3 years ago, cancelled, and now wants to return as a paying customer cannot get a trial. This is a business logic bug that will cause support tickets and lost revenue.

**Risk 3 — No appeal mechanism:** The plan has no admin override for `TRIAL_ALREADY_USED`. If a user is incorrectly flagged, Sean has no documented way to clear it.

**Risk 4 — The check queries the Users table by email:** If implemented naively, this is a full-table scan without an index on `email`, which will slow down every trial start as the user base grows.

**Risk 5 — Race condition:** Two simultaneous trial requests from the same user (double-click) could both pass the check before either writes the trial record.

**Fix — The plan must specify this implementation:**

```javascript
// backend/services/trialService.mjs

const TRIAL_REUSE_WINDOW_DAYS = 365; // Configurable — not permanent

export async function checkTrialEligibility(email, userId) {
  // Normalize email to prevent trivial bypass
  const normalizedEmail = email.toLowerCase().trim();

  // Use index on email — ensure migration adds: CREATE INDEX ON "Users" (email)
  const previousTrial = await User.findOne({
    where: {
      email: normalizedEmail,
      trialUsedAt: {
        [Op.not]: null,
        // Optional: only block within window, not forever
        [Op.gte]: new Date(Date.now() - TRIAL_REUSE_WINDOW_DAYS * 86400000),
      },
      id: { [Op.ne]: userId }, // Don't block the user's own account
    },
    attributes: ['id', 'trialUsedAt'], // Never return email in this query result
  });

  if (previousTrial) {
    return { eligible: false, reason: 'TRIAL_ALREADY_USED' };
  }

  return { eligible: true };
}

// Admin override endpoint (Sean can clear trial flags)
export async function adminClearTrialFlag(userId, adminId) {
  // Audit log first
  await AuditLog.create({
    action: 'TRIAL_FLAG_CLEARED',
    targetUserId: userId,
    performedBy: adminId,
    timestamp: new Date(),
  });

  await User.update(
    { trialUsedAt: null },
    { where: { id: userId } }
  );
}
```

**The plan must also specify:** Adding `trialUsedAt` as an indexed column in a migration, with a corresponding `down()` that removes the index and column.

---

### CRITICAL-04: `sync({ force: true })` or `sync({ alter: true })` Risk — Plan Does Not Prohibit It

**Severity:** CRITICAL
**Data at Risk:** ENTIRE DATABASE — all users, all orders, all sessions, all workout history
**Blast Radius:** 100% of all users, all data, permanent and unrecoverable
**File & Line:** Section 6 (Phase 1B) — "Update Tier Limits"; Section 11 — Database Change; implicitly throughout all phases

**What's Wrong:**

The plan modifies `backend/models/User.mjs` (adding `trainerType`) and `backend/models/Subscription.mjs`. It also modifies `backend/middleware/requireSubscription.mjs` with new tier limits.

**The plan never once mentions:** Do NOT use `sync({ force: true })` or `sync({ alter: true })` in production. It never references the migration system as the ONLY acceptable way to make schema changes.

A developer who is new to the codebase, or who is testing locally and accidentally leaves a flag set, could run:

```javascript
// The most dangerous line in any Sequelize codebase
await sequelize.sync({ force: true }); // DROPS AND RECREATES ALL TABLES
// or
await sequelize.sync({ alter: true }); // Can drop columns with existing data
```

`force: true` **drops every table and recreates it from scratch.** Every user, every order, every session, every workout log — gone. Permanently. No recovery without a backup.

This risk is elevated because:
1. The plan adds a new field to `User.mjs` — a developer might think "I need to sync the model"
2. The plan is being implemented by multiple developers ("14-Brain AI Village") — coordination failures happen
3. There is no mention of checking `NODE_ENV` before any sync operation

**Fix — The plan must include this as a mandatory constraint:**

```markdown
## ⛔ ABSOLUTE PROHIBITION — READ BEFORE TOUCHING ANY MODEL FILE

**NEVER use `sequelize.sync({ force: true })` or `sequelize.sync({ alter: true })` 
in ANY environment that has real data.**

- `force: true` = DROP TABLE + recreate = ALL DATA GONE FOREVER
- `alter: true` = can silently drop columns = DATA LOSS

**The ONLY acceptable way to make schema changes:**
1. Write a migration file in `backend/migrations/`
2. Include both `up()` AND `down()` functions
3. Test `up()` and `down()` on a copy of production data locally
4. Deploy via `sequelize db:migrate` (never via sync)

**If you see `sync({ force: true })` anywhere in the codebase outside of 
test files, STOP and report it immediately.**
```

Additionally, the plan should mandate adding this guard to the application startup:

```javascript
// backend/config/database.mjs — REQUIRED safety guard
if (process.env.NODE_ENV === 'production') {
  // Verify sync is never called with destructive options
  const originalSync = sequelize.sync.bind(sequelize);
  sequelize.sync = (options = {}) => {
    if (options.force || options.alter) {
      throw new Error(
        '🚨 PRODUCTION SAFETY: sync({ force }) and sync({ alter }) are ' +
        'PROHIBITED in production. Use migrations instead.'
      );
    }
    return originalSync(options);
  };
}
```

---

## 🟠 HIGH FINDINGS

---

### HIGH-01: CASCADE Delete Risk — `trainerType` Addition Has No Documented FK Constraints

**Severity:** HIGH
**Data at Risk:** TrainerPermissions records, client-trainer assignments, session bookings linked to trainers
**Blast Radius:** All clients assigned to any trainer whose record is modified
**File & Line:** Section 11 — Trainer Types table; Migration SQL block

**What's Wrong:**

The plan adds `trainerType` to the Users table and creates a new permission-granting system. But it never documents the foreign key relationships between:
- `Users` (trainers) → `TrainerPermissions`
- `Users` (trainers) → `ClientTrainerAssignments` (or equivalent)
- `Users` (trainers) → `Sessions`/`Bookings`

If any of these relationships use `ON DELETE CASCADE` and a trainer's User record is deleted or modified incorrectly, all their clients' session history, assignments, and permissions could be wiped.

The plan's "Independent trainers can ONLY see/manage their own assigned clients" implies a join table exists — but its cascade behavior is never specified.

**Fix:**

```markdown
## FK Constraint Requirements for trainerType Feature

All trainer-related join tables MUST use:
- `ON DELETE RESTRICT` (not CASCADE) for trainer → client assignments
  — Prevents accidental deletion of client records when trainer is removed
- `ON DELETE SET NULL` for session → trainer references
  — Sessions remain in history even if trainer account is deleted
- NEVER use `ON DELETE CASCADE` on the Users table for trainer relationships

Before implementing Phase 6, audit existing FK constraints:
SELECT conname, confdeltype FROM pg_constraint 
WHERE conrelid = 'TrainerPermissions'::regclass;
-- confdeltype 'a' = NO ACTION, 'r' = RESTRICT, 'c' = CASCADE
-- CASCADE ('c') on trainer records = HIGH RISK
```

---

### HIGH-02: Elite Soft Cap — "Warn, Don't Block" Has No Documented State Machine

**Severity:** HIGH

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
