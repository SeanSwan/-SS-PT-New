# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 89.6s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md
> **Generated:** 4/5/2026, 1:18:53 PM

---

# DATA SAFETY AUDIT REPORT
## SwanStudios — SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md
**Auditor Role:** Production Data Safety Auditor
**Audit Date:** 2026-04-05 (Round 2 Validation)
**Classification:** PLANNING DOCUMENT — Pre-Implementation Review

---

## EXECUTIVE SUMMARY

This document is a **feature planning blueprint**, not executable code. It contains **zero direct database operations, migrations, or destructive SQL**. However, as a data safety auditor treating every finding as production-critical, I am flagging **significant data safety architecture gaps** embedded in this plan that, if implemented as written, **will create real data destruction vectors** in production.

**The danger is not what this document does — it's what it will cause developers to build.**

A plan document that omits safety requirements is a blueprint for unsafe code. Every gap identified below represents a future production incident waiting to happen.

---

## FINDINGS

---

### FINDING 001
**Severity:** 🔴 CRITICAL
**Data at Risk:** OAuth refresh tokens, social platform credentials, API keys for all connected services
**Blast Radius:** All users + platform operator (Sean) — complete loss of social distribution capability + potential credential theft
**File & Line:** Section 3B — "Upgrade Distribution Hub → Multi-Platform Social Publisher" / Section 4 — "Toggle On/Off" pattern

**What's Wrong:**

The plan describes storing multiple OAuth tokens and API keys across Late.dev, Blotato, Higgsfield, ElevenLabs, Mailchimp, SendGrid, BlueSky, Facebook, Instagram, TikTok, and Nextdoor. The storage strategy is described only as "toggle via API keys" with zero specification for:

1. **Where tokens are stored** — The plan implies `.env` files ("LATE_API_KEY → Late.dev handles 13 platforms"). Plain `.env` storage of OAuth tokens is not the same as encrypted credential storage. If the `.env` file is ever committed, logged, or exposed via a misconfigured endpoint, every connected social platform is compromised simultaneously.

2. **OAuth token refresh lifecycle** — Social platform OAuth tokens (Facebook, Instagram, TikTok) expire. The plan mentions tokens must be "securely stored and refreshable" in the Security Requirements section but provides **zero architecture for how refresh happens**. If a refresh token is stored in a database column that gets wiped during a migration, or overwritten during a re-auth flow, the platform loses the ability to post to that social account permanently — requiring manual re-authorization for every platform.

3. **BlueSky credentials** — The plan specifies `BLUESKY_HANDLE + BLUESKY_APP_PASSWORD` stored as environment variables. App passwords are long-lived credentials. If these are ever logged (e.g., in a request body log, an error trace, or a startup log that prints env vars), they are permanently compromised.

4. **The CrystallineLockOverlay pattern checks for API key presence** — This implies the application reads API keys at runtime to determine UI state. If this check is implemented naively (e.g., passing the key value to the frontend to check if it's truthy), API keys will be exposed in API responses.

**Fix — Specific Implementation Requirements the Plan Must Mandate:**

```typescript
// REQUIRED: Encrypted credential storage model
// backend/models/PlatformCredential.mjs
// NEVER store OAuth tokens in .env — .env is for bootstrap secrets only

// Database model (encrypted at rest):
{
  platform: 'facebook' | 'instagram' | 'tiktok' | 'bluesky' | ...,
  credentialType: 'oauth_access_token' | 'oauth_refresh_token' | 'api_key' | 'app_password',
  encryptedValue: string,  // AES-256-GCM encrypted, key from KMS or Render secrets
  expiresAt: Date | null,  // NULL for non-expiring keys, Date for OAuth tokens
  lastRefreshedAt: Date,
  isActive: boolean,
  createdBy: userId,       // audit trail
  updatedAt: Date
}

// NEVER:
// - Store raw tokens in .env (bootstrap only, not OAuth tokens)
// - Log token values anywhere
// - Return token values to frontend (return boolean: isConfigured only)
// - Store tokens in localStorage or sessionStorage on frontend

// Frontend check pattern (SAFE):
// GET /api/marketing/platform-status
// Response: { facebook: { configured: true, expiresAt: '2026-05-01' } }
// NEVER: { facebook: { token: 'EAABwzLixnjYBO...' } }
```

The plan must be updated to mandate:
- All OAuth tokens stored in encrypted database columns (not `.env`)
- Token refresh jobs run on a schedule (not on-demand at post time — that's a race condition)
- Frontend only ever receives `{ isConfigured: boolean }` — never token values
- Credential rotation does not delete old tokens until new tokens are confirmed valid

---

### FINDING 002
**Severity:** 🔴 CRITICAL
**Data at Risk:** Blog posts, published content, content calendar entries — potential complete data loss on redeploy
**Blast Radius:** All published content — could wipe weeks/months of approved blog posts
**File & Line:** Section 3C — "Add Blog Writer Tab" / Section 3E — "Content Calendar — add backend persistence"

**What's Wrong:**

The plan introduces **new database tables** (blog posts, content calendar entries, social post queue, email drafts) with zero migration safety specification. The phrase "add backend persistence" for the Content Calendar is particularly dangerous — it implies a new table is being added to an existing system.

The specific risk: When a developer implements `blogService.mjs` and creates the Blog and ContentCalendarEntry models, they will run `sequelize db:migrate`. If the migration is written carelessly (which is likely without explicit safety requirements in this plan), it could include:

```javascript
// DANGEROUS pattern a developer might write without guidance:
// migrations/YYYYMMDD-create-blog-posts.js
async up(queryInterface, Sequelize) {
  // Developer thinks: "let me start fresh"
  await queryInterface.dropTable('BlogPosts');  // DESTROYS existing data
  await queryInterface.createTable('BlogPosts', { ... });
}

// OR the seeder pattern:
// seeders/YYYYMMDD-seed-blog-templates.js
async up(queryInterface) {
  await queryInterface.bulkDelete('BlogPosts', null, {});  // null WHERE = ALL ROWS
  await queryInterface.bulkInsert('BlogPosts', [...]);
}
```

The plan also mentions the Content Calendar currently has "no persistence" — meaning when persistence is added, a developer might seed it with template data using a destructive pattern that wipes any manually-entered calendar entries that existed in a transitional state.

**Fix — The plan must explicitly mandate:**

```markdown
## DATABASE SAFETY REQUIREMENTS (MANDATORY — Add to Plan)

### New Table Creation Rules
1. ALL new tables created via additive migrations ONLY
2. Migration `up()` functions MUST use `createTable` with `ifNotExists` check
3. Migration `down()` functions MUST exist but MUST NOT drop tables in production
   - down() should be a no-op or rename (not drop) for production safety
4. NO seeder may use bulkDelete with null/empty WHERE clause
5. Seeders that insert reference data MUST use upsert/bulkCreate with ignoreDuplicates: true

### Content Calendar Persistence Migration
// SAFE pattern:
async up(queryInterface, Sequelize) {
  const tableExists = await queryInterface.tableExists('ContentCalendarEntries');
  if (!tableExists) {
    await queryInterface.createTable('ContentCalendarEntries', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      // ... columns
    });
  }
  // NEVER: dropTable then createTable
}

async down(queryInterface) {
  // In production: NO-OP. Never drop tables in a rollback.
  // Document why: data preservation > rollback purity
  console.warn('DOWN migration is a no-op to preserve production data');
}
```

---

### FINDING 003
**Severity:** 🔴 CRITICAL
**Data at Risk:** All blog posts, social queue, email drafts — permanent deletion via admin endpoint
**Blast Radius:** All published content — single API call could wipe entire content history
**File & Line:** Section 7 — `backend/routes/marketingRoutes.mjs` (planned file)

**What's Wrong:**

The plan describes a content management system with publish, distribute, and compose endpoints but **specifies zero soft-delete architecture**. Marketing content systems routinely implement delete operations. Without explicit soft-delete requirements in this plan, the developer implementing `marketingRoutes.mjs` will implement hard deletes:

```javascript
// What a developer will write without guidance:
router.delete('/blog/:id', protect, adminOnly, async (req, res) => {
  await BlogPost.destroy({ where: { id: req.params.id } });
  // PERMANENT. No recovery. No audit trail. No confirmation.
  res.json({ success: true });
});

// Even more dangerous — bulk operations:
router.delete('/social-queue/clear', protect, adminOnly, async (req, res) => {
  await SocialQueueEntry.destroy({ where: {} }); // WHERE {} = ALL ROWS
  // This wipes the entire social queue in one API call
});
```

The audit log requirement is mentioned ("who published what, when, to which platforms") but **audit logs are useless if the data they reference is hard-deleted**. You cannot audit what no longer exists.

**Fix — The plan must mandate soft-delete architecture:**

```typescript
// ALL content tables MUST include:
{
  deletedAt: Date | null,     // Sequelize paranoid mode
  deletedBy: userId | null,   // who deleted it
  deleteReason: string | null // why (required for bulk operations)
}

// Sequelize model config:
const BlogPost = sequelize.define('BlogPost', { ... }, {
  paranoid: true,  // Adds deletedAt, makes destroy() set deletedAt instead of DELETE
});

// Route-level protection:
router.delete('/blog/:id', protect, adminOnly, async (req, res) => {
  const { confirmationText, reason } = req.body;

  // Require explicit confirmation for destructive operations
  if (confirmationText !== `DELETE-${req.params.id}`) {
    return res.status(400).json({
      error: 'Confirmation required. Send confirmationText: "DELETE-{id}"'
    });
  }

  await BlogPost.destroy({
    where: { id: req.params.id },
    // paranoid: true means this sets deletedAt, not a real DELETE
  });
});

// NEVER implement a "clear all" endpoint without:
// 1. Row count check (refuse if count > threshold)
// 2. Explicit confirmation token
// 3. Soft delete only (paranoid mode)
// 4. Audit log entry BEFORE the operation
```

---

### FINDING 004
**Severity:** 🔴 CRITICAL
**Data at Risk:** User purchase history, client workout sessions, trainer assignments — cascade deletion risk
**Blast Radius:** Potentially all users with connected marketing/content data
**File & Line:** Section 7 — New models implied by `blogService.mjs`, `socialDistributionService.mjs`

**What's Wrong:**

The plan introduces new database models (BlogPost, SocialQueueEntry, ContentCalendarEntry, EmailDraft) that will likely reference the Users table (for `createdBy`, `approvedBy`, `publishedBy` fields — implied by the audit log requirement). The plan specifies **zero foreign key constraint strategy**.

If a developer implements these with `ON DELETE CASCADE` referencing the Users table:

```sql
-- What a careless developer might write:
ALTER TABLE BlogPosts
ADD CONSTRAINT fk_blog_created_by
FOREIGN KEY (createdBy) REFERENCES Users(id) ON DELETE CASCADE;

-- Now: if Sean's admin account is ever deleted (accidentally, during a user cleanup,
-- or via a bug in user management), ALL blog posts are silently deleted.
-- Years of content. Gone. No warning.
```

Conversely, if they use `ON DELETE RESTRICT` without thinking it through, deleting a test user account during development could fail silently or throw an unhandled error that corrupts the transaction.

**Fix — The plan must specify FK strategy explicitly:**

```markdown
## FOREIGN KEY STRATEGY (MANDATORY)

All new content tables that reference Users:
- createdBy, approvedBy, publishedBy → FK to Users(id) ON DELETE SET NULL
- NEVER ON DELETE CASCADE for content ownership references
- Rationale: If a user account is deleted, content must be preserved
  (orphaned content is recoverable; deleted content is not)

// Migration example:
await queryInterface.addConstraint('BlogPosts', {
  fields: ['createdBy'],
  type: 'foreign key',
  references: { table: 'Users', field: 'id' },
  onDelete: 'SET NULL',  // NOT CASCADE
  onUpdate: 'CASCADE'
});
```

---

### FINDING 005
**Severity:** 🔴 CRITICAL
**Data at Risk:** Client PII (email addresses, names) — mass exposure via email digest system
**Blast Radius:** All newsletter subscribers — could expose entire subscriber list
**File & Line:** Section 3E — "Email Digest Composer" / Section 4 — Mailchimp/SendGrid integration

**What's Wrong:**

The plan describes an email digest system that sends to subscribers via Mailchimp, SendGrid, or built-in SMTP. The plan specifies **zero data handling requirements** for the subscriber list:

1. **Who is in the subscriber list?** — Are these Users from the SwanStudios database? Are they a separate subscriber table? The plan doesn't say. If a developer queries `User.findAll()` to get email addresses for the digest, they will send marketing emails to ALL users including those who never opted in.

2. **Unsubscribe handling** — The plan mentions no unsubscribe mechanism. Sending marketing email without an unsubscribe link violates CAN-SPAM (US), GDPR (EU), and CASL (Canada). A single complaint to Mailchimp can result in account suspension, which would also disable transactional emails if they share the same account.

3. **The "built-in SMTP" fallback** — If a developer implements a raw SMTP sender as a fallback, it will have none of the bounce handling, unsubscribe management, or compliance features of Mailchimp/SendGrid. A bad SMTP implementation could:
   - Log email addresses in server logs
   - Send to invalid addresses and get the domain blacklisted
   - Expose the subscriber list in error messages

4. **Mailchimp API key** — If stored in `.env` and the Mailchimp API key is compromised, an attacker can export the entire subscriber list (names, emails, engagement history) via the Mailchimp API.

**Fix — The plan must mandate:**

```markdown
## EMAIL SYSTEM SAFETY REQUIREMENTS

1. Subscriber list is SEPARATE from Users table
   - Explicit opt-in required (checkbox at signup, not pre-checked)
   - Store: email, optInDate, optInSource, unsubscribedAt, unsubscribeToken
   - NEVER query Users table for marketing emails

2. Every email send MUST:
   - Include unsubscribe link with signed token (not guessable)
   - Honor unsubscribe within 10 business days (CAN-SPAM) / immediately (GDPR)
   - Log: recipient count, send timestamp, campaign ID (NOT individual addresses in logs)

3. Email preview MUST NOT display actual subscriber emails in UI
   - Show: "Sending to 247 subscribers" NOT a list of addresses

4. Mailchimp/SendGrid API keys:
   - Stored encrypted in database (same pattern as OAuth tokens)
   - Scoped to minimum permissions (send only, not export list)
   - Separate keys for staging vs production

5. Built-in SMTP fallback:
   - ONLY for single-recipient transactional email (password reset, receipts)
   - NEVER for bulk marketing sends
   - Rate limit: max 10 emails/minute to prevent accidental spam runs
```

---

### FINDING 006
**Severity:** 🔴 CRITICAL
**Data at Risk:** All marketing content, social queue, blog posts — race conditions during concurrent operations
**Blast Radius:** Any content being published simultaneously — corrupted publish state
**File & Line:** Section 2 — Content Research Flow (steps 4-7) / Section 3D — Social Post Generator

**What's Wrong:**

The content pipeline described in Section 2 (Research → Write → Approve → Publish →

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
