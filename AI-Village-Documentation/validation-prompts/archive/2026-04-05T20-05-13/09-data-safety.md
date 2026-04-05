# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 79.6s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md
> **Generated:** 4/5/2026, 1:05:13 PM

---

# DATA SAFETY AUDIT REPORT
## SwanStudios — SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md
**Auditor:** Data Safety Auditor (Paranoia Level: Maximum)
**Date:** 2026-04-05 Review
**Platform:** sswanstudios.com (Production — Real Paying Customers)

---

## EXECUTIVE SUMMARY

This document is a **planning/blueprint markdown file** — it contains **zero executable code, zero SQL, zero migrations, zero API routes, and zero database operations**. There are no `DELETE`, `DROP`, `TRUNCATE`, `sync({ force: true })`, or any destructive database calls to audit.

**However — this is not a clean bill of health.**

A blueprint document is a *pre-crime scene*. The danger is not what's in this file — it's what this file will *cause to be written*. As a data safety auditor, my job is to flag every place where the planned implementation, if built naively, could destroy production data.

**I am treating this as a threat model for the implementation phase.**

---

## FINDINGS

---

### FINDING 001
**Severity:** 🔴 CRITICAL
**Data at Risk:** All blog posts, social post queue, content calendar entries, email drafts — potentially linked to User records and Order records if content is client-specific
**Blast Radius:** ALL DATA in any new content tables — permanent loss on every redeploy
**File & Line:** Section 3C — "Add Blog Writer Tab" / Section 3D — "Add Social Post Generator Tab" / Section 3E — "Add Email Composer Tab" / Section 2 — Content Calendar persistence
**What's Wrong:**

The plan calls for adding backend persistence to the Content Calendar and creating new blog/social/email tables. **The single most common way this gets implemented dangerously is with Sequelize seeders that run `await queryInterface.bulkDelete('BlogPosts', null, {})` before `bulkInsert` — the `null` WHERE clause wipes the entire table.** Every time the seeder runs on redeploy, all of Sean's approved blog posts, scheduled social content, and email drafts are gone. This has happened on this exact platform pattern dozens of times in production SaaS.

Additionally, if the new tables are created with `sync({ force: true })` or `sync({ alter: true })` anywhere in the startup sequence (a common shortcut during rapid feature development), every existing record in Users, Orders, Sessions, and any new content table is at risk.

**Fix:**

```javascript
// ❌ NEVER DO THIS in any seeder for content tables:
await queryInterface.bulkDelete('BlogPosts', null, {}); // WIPES ALL POSTS
await queryInterface.bulkDelete('SocialPostQueue', null, {}); // WIPES ALL QUEUED POSTS
await queryInterface.bulkDelete('ContentCalendarEntries', null, {}); // WIPES CALENDAR

// ✅ REQUIRED PATTERN — Use upsert, never delete-then-reinsert:
await queryInterface.bulkInsert('BlogPosts', seedData, {
  updateOnDuplicate: ['title', 'content', 'updatedAt'], // Only update specific fields
  // id and createdAt are NEVER overwritten
});

// ✅ For migrations creating new tables — ALWAYS check existence first:
const tableExists = await queryInterface.showAllTables()
  .then(tables => tables.includes('BlogPosts'));
if (!tableExists) {
  await queryInterface.createTable('BlogPosts', { /* schema */ });
}

// ✅ NEVER in production startup (app.mjs / server.mjs):
// sequelize.sync({ force: true })  ← DROPS AND RECREATES ALL TABLES
// sequelize.sync({ alter: true })  ← CAN DROP COLUMNS WITH DATA

// ✅ ONLY acceptable:
// sequelize.sync({ force: false }) // or just sequelize.authenticate()
// All schema changes go through numbered migrations ONLY
```

**Mandatory pre-implementation checklist item:** Before any new table migration is written, confirm `sync({ force: true })` does not exist anywhere in the server startup path.

---

### FINDING 002
**Severity:** 🔴 CRITICAL
**Data at Risk:** User purchase history, session data, workout records — any table with a foreign key to Users
**Blast Radius:** ALL USERS — cascade delete could orphan or destroy years of records
**File & Line:** Section 7 — New Files: `backend/services/blogService.mjs`, `backend/routes/marketingRoutes.mjs` — implied schema design
**What's Wrong:**

The plan introduces new entities: BlogPosts, SocialPostQueue, ContentCalendarEntries, EmailDrafts. These will almost certainly have a `createdBy` or `authorId` foreign key pointing to the Users table. **If that foreign key is defined with `ON DELETE CASCADE` and an admin user account is ever deleted or deactivated, every blog post, social post, and email draft that user created is silently and permanently destroyed.** If it's defined with `ON DELETE SET NULL` without a `NOT NULL` constraint, queries will start returning null-author content with no warning.

This is compounded by the fact that the plan mentions Sean as the sole approver — if Sean's admin account is ever accidentally deleted (password reset gone wrong, account merge, etc.), the entire content history disappears.

**Fix:**

```javascript
// ❌ DANGEROUS — CASCADE on content authored by admin:
BlogPost.belongsTo(User, {
  foreignKey: 'authorId',
  onDelete: 'CASCADE', // Sean's account deleted = ALL BLOG POSTS GONE
});

// ✅ SAFE — RESTRICT prevents deletion of users who own content:
BlogPost.belongsTo(User, {
  foreignKey: 'authorId',
  onDelete: 'RESTRICT', // Cannot delete user if they have blog posts
  onUpdate: 'CASCADE',
});

// ✅ EVEN SAFER — Decouple content from user deletion entirely:
// Store authorName as a string snapshot at creation time
// Keep authorId as nullable reference for UI linking only
await queryInterface.createTable('BlogPosts', {
  id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  authorId: {
    type: Sequelize.INTEGER,
    allowNull: true, // Nullable — content survives user changes
    references: { model: 'Users', key: 'id' },
    onDelete: 'SET NULL', // User deleted → post stays, authorId becomes null
    onUpdate: 'CASCADE',
  },
  authorNameSnapshot: {
    type: Sequelize.STRING,
    allowNull: false, // Always captured at creation — never lost
  },
  // ... rest of schema
});
```

---

### FINDING 003
**Severity:** 🔴 CRITICAL
**Data at Risk:** All social post queue entries, scheduled posts, content calendar — could be permanently lost mid-operation
**Blast Radius:** All queued/scheduled content — silent data loss with no recovery
**File & Line:** Section 3B — Distribution Hub / `backend/services/socialDistributionService.mjs`
**What's Wrong:**

The social distribution service will perform multi-step operations: (1) fetch post from queue, (2) call external API (Late.dev / Blotato / direct platform API), (3) mark post as published, (4) update content calendar. **If the external API call succeeds but the database update fails — or if the server crashes between steps 2 and 3 — the post is published to social media but still marked as "pending" in the database.** The system will attempt to publish it again on the next run, causing duplicate posts. Worse: if the sequence is reversed (mark as published first, then call API), a failed API call leaves the post marked as published but never actually sent — silently dropped.

Additionally, batch operations posting to 13 platforms simultaneously (Late.dev's capability) with no transaction wrapper means a partial failure leaves the database in an inconsistent state with no way to know which platforms succeeded.

**Fix:**

```javascript
// ❌ DANGEROUS — No transaction, no idempotency:
async function publishPost(postId) {
  const post = await SocialPost.findByPk(postId);
  await lateDevApi.publish(post); // If this succeeds but next line fails = duplicate on retry
  await post.update({ status: 'published', publishedAt: new Date() });
}

// ✅ SAFE — Idempotency key + transaction + explicit state machine:
async function publishPost(postId) {
  const transaction = await sequelize.transaction();
  try {
    // Lock the row — prevents race condition if two workers pick same post
    const post = await SocialPost.findOne({
      where: { id: postId, status: 'pending' },
      lock: transaction.LOCK.UPDATE, // Row-level lock
      transaction,
    });

    if (!post) {
      await transaction.rollback();
      return; // Already being processed or published
    }

    // Mark as IN_PROGRESS first — prevents duplicate processing
    await post.update({ status: 'in_progress' }, { transaction });
    await transaction.commit(); // Commit the lock state BEFORE calling external API

    // External API call is OUTSIDE the transaction (can't roll back external calls)
    let platformResult;
    try {
      platformResult = await lateDevApi.publish(post, {
        idempotencyKey: `post-${postId}-${post.updatedAt.getTime()}`, // Prevents duplicate sends
      });
    } catch (apiError) {
      // API failed — mark as failed, preserve content, allow retry
      await post.update({
        status: 'failed',
        lastError: apiError.message,
        retryCount: post.retryCount + 1,
      });
      throw apiError;
    }

    // API succeeded — now record the result
    await post.update({
      status: 'published',
      publishedAt: new Date(),
      platformPostIds: JSON.stringify(platformResult.postIds), // Store for deletion/editing later
      lastError: null,
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
}
```

---

### FINDING 004
**Severity:** 🔴 CRITICAL
**Data at Risk:** Sean's admin credentials, all user login sessions, JWT validity for all users
**Blast Radius:** ALL USERS locked out of platform simultaneously
**File & Line:** Section 1 — Swan Coach system prompts / Section 7 Modified Files — Swan Coach system prompts
**What's Wrong:**

The plan calls for modifying Swan Coach system prompts. **If the system prompt update mechanism is implemented as a database write to a `SystemConfig` or `AIConfig` table, and that table shares a migration with any Users or Sessions table alteration, a failed migration could lock the entire table.** More critically: if the JWT_SECRET or session configuration is stored in the same config table as the Swan Coach prompts, and a migration ALTERs that table's column types (e.g., changing `TEXT` to `JSONB` for prompt storage), PostgreSQL may lock the table during the migration, causing all active sessions to fail validation until the migration completes — or permanently if it fails mid-execution.

**Fix:**

```javascript
// ❌ DANGEROUS — Mixing auth config and content config in same migration:
// Migration: 20260405-update-system-config.mjs
await queryInterface.changeColumn('SystemConfig', 'value', {
  type: Sequelize.JSONB, // ALTER TYPE on column with JWT_SECRET stored in it
  // This locks the table — all session validations fail during migration
});

// ✅ SAFE — Separate tables, separate migrations, never alter auth config columns:
// Rule: JWT_SECRET lives in environment variables ONLY — never in the database
// Rule: System prompts get their OWN table, never share with auth config

await queryInterface.createTable('SwanCoachPrompts', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  promptKey: { type: Sequelize.STRING(100), allowNull: false, unique: true },
  promptText: { type: Sequelize.TEXT, allowNull: false }, // TEXT not JSONB — no ALTER needed later
  version: { type: Sequelize.INTEGER, defaultValue: 1 },
  isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
  createdAt: { type: Sequelize.DATE, allowNull: false },
  updatedAt: { type: Sequelize.DATE, allowNull: false },
});

// ✅ JWT_SECRET rotation policy — document this explicitly:
// NEVER rotate JWT_SECRET without:
// 1. Deploying new secret to env vars
// 2. Running a grace period where BOTH old and new secrets are valid
// 3. Notifying users that re-login will be required after grace period
// A hard rotation with no grace period = ALL users logged out simultaneously
```

---

### FINDING 005
**Severity:** 🔴 CRITICAL
**Data at Risk:** All marketing API endpoints — could expose all users' PII, purchase history, or allow mass data deletion by unauthenticated callers
**Blast Radius:** ALL USERS — data exposure or mass deletion
**File & Line:** Section 7 — `backend/routes/marketingRoutes.mjs`
**What's Wrong:**

The plan creates a new `marketingRoutes.mjs` file with no mention of authentication middleware, RBAC guards, or rate limiting. Marketing routes will handle: blog publishing (writes to DB), social post scheduling (writes to DB), SEO audit triggers (reads site data), lead funnel data (reads ALL user conversion data), and email digest sending (reads ALL user emails). **If these routes are registered without `requireAuth` + `requireAdmin` middleware — even temporarily during development — a single unauthenticated POST to `/dashboard/admin/marketing/blog/publish` could create spam content, and a GET to `/dashboard/admin/marketing/analytics/lead-funnel` could expose every user's email, signup date, and purchase history to anyone who knows the URL.**

This is especially dangerous because the plan mentions the route will be added to the admin sidebar — meaning the frontend URL structure will be publicly visible in the JavaScript bundle.

**Fix:**

```javascript
// ❌ DANGEROUS — Routes registered without auth guards:
// backend/routes/marketingRoutes.mjs
router.post('/blog/publish', blogController.publish); // No auth = anyone can publish
router.get('/analytics/lead-funnel', analyticsController.getFunnel); // No auth = all user PII exposed

// ✅ REQUIRED — Every single marketing route must have both guards:
import { requireAuth } from '../middleware/authMiddleware.mjs';
import { requireRole } from '../middleware/rbacMiddleware.mjs';

// Apply to ALL routes in this file — no exceptions:
router.use(requireAuth);           // Must be logged in
router.use(requireRole('admin'));  // Must be admin role

// Then define routes — auth is guaranteed for all of them:
router.post('/blog/publish', blogController.publish);
router.get('/analytics/lead-funnel', analyticsController.getFunnel);

// ✅ ADDITIONALLY — Rate limit destructive operations:
import rateLimit from 'express-rate-limit';

const marketingWriteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 write operations per minute per admin
  message: 'Too many marketing operations — slow down',
});

router.post('/blog/publish', marketingWriteLimiter, blogController.publish);
router.post('/social/schedule', marketingWriteLimiter, socialController.schedule);
router.post('/email/send', marketingWriteLimiter, emailController.send);

// ✅ ADDITIONALLY — Lead funnel must never return raw PII:
// analyticsController.getFunnel must return AGGREGATED data only:
// { totalVisitors: 1420, signups: 89, trials: 34, subscribers: 12 }
// NEVER: [{ email: 'user@example.com', signedUpAt: '...', purchasedAt: '...' }]
```

---

### FINDING 006
**Severity:** 🔴 CRITICAL
**Data at Risk:** All user emails in the platform — could be sent to wrong recipients or exposed via API response
**Blast Radius:** ALL USERS with email addresses stored in the system
**File & Line:** Section 3E — "Add Email Composer Tab" / Section 5 — Email Digest platform spec
**What's Wrong:**

The email digest system will query the Users table to get subscriber emails, then pass them to Mailchimp/SendGrid/SMTP. **Three catastrophic failure modes exist:**

1

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
