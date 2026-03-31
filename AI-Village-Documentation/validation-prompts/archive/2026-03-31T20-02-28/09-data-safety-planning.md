# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 76.3s
> **Files:** docs/ai-workflow/blueprints/NUTRITION-ECOSYSTEM-MASTER-PLAN.md
> **Generated:** 3/31/2026, 1:02:28 PM

---

# SwanStudios Nutrition Ecosystem — Data Safety Audit Report

**Auditor:** Data Safety Review  
**Date:** 2026-03-31  
**Scope:** NUTRITION-ECOSYSTEM-MASTER-PLAN.md  
**Environment:** Production — sswanstudios.com — Real paying customers  
**Verdict:** ⚠️ **DO NOT DEPLOY Phase 1 without addressing CRITICAL and HIGH findings**

---

## Executive Summary

The plan is architecturally sound for a greenfield feature but contains **2 CRITICAL**, **3 HIGH**, **2 MEDIUM**, and **1 LOW** data safety findings. The most dangerous issues are the JSONB race condition on concurrent writes and the R2 orphan file accumulation. Several findings expose real user health data — a category requiring heightened protection given your wealthy, privacy-conscious target demographic.

---

## Finding 1: Conversation JSONB Growth with File Attachments

**Rating: 🔴 CRITICAL**

### Problem Analysis

PostgreSQL JSONB has a **1GB hard limit per row** (via TOAST storage). The plan stores messages as a JSONB array on the conversation row. With the nutrition ecosystem adding:

- Photo food recognition (Phase 6) — base64-encoded images in JSONB
- Voice transcriptions stored alongside messages
- AI nutrition context blobs (7-day macro summaries embedded per message)
- Restaurant search results cached in message history

A single conversation could realistically grow as follows:

```
Typical text message:     ~500 bytes
With nutrition context:   ~8,000 bytes (7-day macro JSON)
With photo (base64):      ~500,000 bytes (400KB food photo)
With AI response:         ~3,000 bytes

Scenario: Power user, 6 months, 3 nutrition queries/day with photos:
6 months × 90 days × 3 messages × ~510KB = ~138GB per conversation row
```

This will **silently corrupt or crash** before hitting 1GB because:
1. TOAST decompression overhead causes query timeouts well before the 1GB limit
2. Every message read loads the **entire array** — no pagination at the row level
3. Sequelize will attempt to deserialize the full JSONB blob into memory on every `findOne`

### What the Plan Says vs. Reality

The plan states "no new models needed for Phase 1" — but Phase 6 adds photo food recognition which, if naively implemented, will embed image data into existing JSONB message arrays.

### Database-Safe Recommendations

**Immediate (before Phase 1 ships):**

```sql
-- Add a hard size guard at the database level
-- Run this migration NOW, before any new features land

ALTER TABLE conversations 
ADD CONSTRAINT check_messages_size 
CHECK (octet_length(messages::text) < 10485760); -- 10MB hard cap per conversation

-- Add monitoring query to your health check cron:
SELECT 
  id,
  octet_length(messages::text) as size_bytes,
  jsonb_array_length(messages) as message_count,
  user_id
FROM conversations 
WHERE octet_length(messages::text) > 5242880 -- Alert at 5MB
ORDER BY size_bytes DESC
LIMIT 20;
```

**Architectural fix (required before Phase 6, strongly recommended now):**

```sql
-- Migrate to a proper messages table
-- This is the correct architecture for any chat system

CREATE TABLE conversation_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role              VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content           TEXT NOT NULL,           -- Text content only
  attachment_id     UUID REFERENCES message_attachments(id), -- FK to separate table
  nutrition_context JSONB,                   -- Nullable, only when relevant
  token_count       INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent unbounded growth per conversation
  CONSTRAINT content_length_check CHECK (char_length(content) <= 32000)
);

CREATE INDEX idx_conv_messages_conversation_id 
  ON conversation_messages(conversation_id, created_at DESC);

CREATE INDEX idx_conv_messages_created_at 
  ON conversation_messages(created_at DESC);

-- Separate attachments table — NEVER store binary in JSONB
CREATE TABLE message_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID REFERENCES conversation_messages(id) ON DELETE CASCADE,
  r2_key          VARCHAR(500) NOT NULL,     -- R2 storage path only
  mime_type       VARCHAR(100) NOT NULL,
  size_bytes      INTEGER NOT NULL,
  deleted_at      TIMESTAMPTZ,               -- Soft delete for cleanup coordination
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT size_limit CHECK (size_bytes <= 10485760) -- 10MB per file
);
```

**If you cannot migrate immediately, add these guards:**

```javascript
// In your message save service — add BEFORE any Phase 1 ship
const MAX_CONVERSATION_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_MESSAGES_PER_CONVERSATION = 500;

async function appendMessage(conversationId, newMessage) {
  const conversation = await Conversation.findByPk(conversationId);
  
  const currentSize = Buffer.byteLength(
    JSON.stringify(conversation.messages), 'utf8'
  );
  
  if (currentSize > MAX_CONVERSATION_BYTES) {
    throw new ConversationSizeLimitError(
      'Conversation has reached maximum size. Please start a new conversation.'
    );
  }
  
  if (conversation.messages.length >= MAX_MESSAGES_PER_CONVERSATION) {
    throw new ConversationLengthLimitError(
      'Conversation has reached maximum message count.'
    );
  }
  
  // Strip any base64 or binary content before storage
  const sanitizedMessage = {
    ...newMessage,
    content: newMessage.content?.substring(0, 32000), // Hard truncate
    // Never store: image data, audio data, raw file bytes
  };
  
  // ... proceed with save
}
```

---

## Finding 2: Soft Delete Integrity — Deleted Conversations in Sidebar

**Rating: 🟠 HIGH**

### Problem Analysis

The plan states it uses "existing soft-delete (status='deleted')" but does not explicitly verify that sidebar listing queries include the `WHERE status != 'deleted'` filter. This is a classic soft-delete omission bug.

**Risk to real users:** A user who deletes a conversation could see it reappear in their sidebar. Worse — if the sidebar query uses a different field name or ORM scope than the delete operation, deleted conversations containing sensitive nutrition/health data remain visible.

With the nutrition ecosystem adding AI nutrition context to conversations (Section 3.9), deleted conversations may contain:
- 7-day macro summaries
- Dietary restriction data
- Health condition context passed to AI

### Verification Checklist

Search your codebase for every query that touches the conversations table:

```bash
# Run these searches in your backend directory
grep -rn "conversations" backend/routes/ | grep -i "findAll\|findOne\|select"
grep -rn "status" backend/models/Conversation* 
grep -rn "sidebar\|list\|getConversations" backend/routes/
```

**What you must find and verify for each query:**

```javascript
// ✅ CORRECT — explicit status filter
const conversations = await Conversation.findAll({
  where: { 
    userId: req.user.id,
    status: { [Op.ne]: 'deleted' }  // or status: 'active'
  },
  order: [['updatedAt', 'DESC']],
  limit: 50
});

// ❌ DANGEROUS — missing status filter
const conversations = await Conversation.findAll({
  where: { userId: req.user.id },
  order: [['updatedAt', 'DESC']]
});

// ❌ ALSO DANGEROUS — Sequelize default scope can be bypassed
// If you use Model.unscoped() anywhere, soft-delete scope is stripped
```

### Database-Safe Recommendations

```sql
-- Add a database-level view that enforces the filter
-- Use this view for all sidebar/listing queries

CREATE VIEW active_conversations AS
SELECT * FROM conversations 
WHERE status != 'deleted' 
  AND deleted_at IS NULL;  -- Belt AND suspenders

-- Add deleted_at column if not already present (belt-and-suspenders)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_active 
ON conversations(user_id, updated_at DESC) 
WHERE status != 'deleted';

-- Audit query: find any conversations that are 'deleted' 
-- but still appearing in recent queries (run weekly)
SELECT 
  c.id,
  c.user_id,
  c.status,
  c.deleted_at,
  c.updated_at,
  'LEAKED_DELETED_CONVERSATION' as alert_type
FROM conversations c
WHERE c.status = 'deleted'
  AND c.updated_at > NOW() - INTERVAL '7 days'
  AND c.deleted_at IS NULL; -- deleted_at not set = soft delete bug
```

```javascript
// Add a Sequelize default scope to the Conversation model
// This is the safest pattern — filter is automatic

class Conversation extends Model {}
Conversation.init({
  // ... your fields
}, {
  sequelize,
  modelName: 'Conversation',
  defaultScope: {
    where: {
      status: { [Op.ne]: 'deleted' }
    }
  },
  scopes: {
    // Explicit scope for admin queries that need deleted records
    withDeleted: {
      where: {} // overrides defaultScope
    },
    deleted: {
      where: { status: 'deleted' }
    }
  }
});

// Now Conversation.findAll() automatically excludes deleted
// Admin must explicitly use: Conversation.scope('withDeleted').findAll()
```

---

## Finding 3: R2 Storage Orphan Files — No Cleanup Strategy

**Rating: 🔴 CRITICAL**

### Problem Analysis

The plan introduces file uploads to the `ai-chat/` R2 bucket path but contains **zero mention of a cleanup strategy**. This is not a theoretical concern — it is a guaranteed cost and compliance problem.

**Specific scenarios that create orphaned files:**

1. User uploads a food photo for AI recognition → conversation is deleted → R2 file persists forever
2. Upload succeeds → database write fails → R2 file exists with no database record
3. User account is deleted (GDPR/CCPA right to erasure) → R2 files remain
4. Conversation soft-deleted → R2 files never cleaned up
5. Failed/partial uploads leave incomplete multipart uploads in R2 (R2 charges for these)

**Cost projection:**
```
Assumption: 500 active users, 3 food photos/week each
Weekly upload: 500 × 3 × 400KB = 600MB/week
Annual accumulation (no cleanup): 600MB × 52 = ~31GB
R2 cost at $0.015/GB/month: $5.58/month growing to ~$465/month at year 5
Plus: GDPR violation fines if EU users' data persists after deletion request
```

**The GDPR/CCPA risk is the more serious concern for your wealthy client demographic.** A golf client who requests account deletion and later discovers their food photos are still in cloud storage is a legal and reputational liability.

### Database-Safe Recommendations

**Step 1: Track every R2 file in the database (non-negotiable)**

```sql
-- This table must exist BEFORE any file upload feature ships
CREATE TABLE user_file_uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  message_index   INTEGER,                    -- Which message in the JSONB array
  r2_key          VARCHAR(500) NOT NULL UNIQUE,
  r2_bucket       VARCHAR(100) NOT NULL DEFAULT 'swanstudios-assets',
  r2_path_prefix  VARCHAR(100) NOT NULL,      -- 'ai-chat/', 'nutrition-photos/', etc.
  mime_type       VARCHAR(100) NOT NULL,
  size_bytes      INTEGER NOT NULL,
  upload_status   VARCHAR(20) NOT NULL DEFAULT 'pending' 
                  CHECK (upload_status IN ('pending', 'complete', 'failed', 'orphaned')),
  deletion_status VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (deletion_status IN ('active', 'pending_deletion', 'deleted')),
  deletion_requested_at TIMESTAMPTZ,          -- GDPR erasure request timestamp
  deleted_from_r2_at    TIMESTAMPTZ,          -- Confirmed R2 deletion timestamp
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_uploads_user_id ON user_file_uploads(user_id);
CREATE INDEX idx_file_uploads_conversation_id ON user_file_uploads(conversation_id);
CREATE INDEX idx_file_uploads_deletion_status ON user_file_uploads(deletion_status) 
  WHERE deletion_status = 'pending_deletion';
CREATE INDEX idx_file_uploads_orphan_check ON user_file_uploads(upload_status, created_at)
  WHERE upload_status = 'pending';
```

**Step 2: Cleanup job (run every 6 hours)**

```javascript
// backend/jobs/r2CleanupJob.mjs

import { S3Client, DeleteObjectCommand, ListMultipartUploadsCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  }
});

export async function runR2Cleanup() {
  const results = { deleted: 0, errors: 0, orphansFound: 0 };
  
  // 1. Delete files pending deletion (conversation deleted, user deleted, GDPR request)
  const pendingDeletion = await UserFileUpload.findAll({
    where: { deletion_status: 'pending_deletion' },
    limit: 100 // Process in batches
  });
  
  for (const file of pendingDeletion) {
    try {
      await r2Client.send(new DeleteObjectCommand({
        Bucket: file.r2_bucket,
        Key: file.r2_key
      }));
      
      await file.update({
        deletion_status: 'deleted',
        deleted_from_r2_at: new Date()
      });
      
      results.deleted++;
    } catch (err) {
      // Log but don't throw — process remaining files
      logger.error('R2 deletion failed', { r2Key: file.r2_key, error: err.message });
      results.errors++;
    }
  }
  
  // 2. Mark stale 'pending' uploads as orphaned (upload started but never completed)
  const staleUploads = await UserFileUpload.update(
    { upload_status: 'orphaned' },
    {
      where: {
        upload_status: 'pending',
        created_at: { [Op.lt]: new Date(Date.now() - 2 * 60 * 60 * 1000) } // 2 hours old
      }
    }
  );
  results.orphansFound = staleUploads[0];
  
  // 3. Abort incomplete multipart uploads in R2 (R2 charges for these)
  // Run this weekly, not every 6 hours
  
  logger.info('R2 cleanup complete', results);
  return results;
}

// Cascade: when conversation is deleted, mark all its files for deletion
export async function markConversationFilesForDeletion(conversationId, userId) {
  await UserFileUpload.update(
    { 
      deletion_status: 'pending_deletion',
      deletion_requested_at: new Date()
    },
    {
      

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
