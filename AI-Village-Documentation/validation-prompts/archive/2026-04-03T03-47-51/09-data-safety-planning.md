# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 75.7s
> **Files:** docs/ai-workflow/blueprints/ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md
> **Generated:** 4/2/2026, 8:47:53 PM

---

# SwanStudios AI Onboarding Overhaul — Data Safety Audit Report

**Auditor Role:** Production Data Safety Auditor
**Platform:** sswanstudios.com (Live Production, Real Paying Customers)
**Document Reviewed:** ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md
**Audit Date:** 2025
**Classification:** PRODUCTION SAFETY REVIEW — TREAT ALL FINDINGS AS LIVE RISK

---

## AUDIT SUMMARY TABLE

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | JSONB Conversation Growth with Attachments | **HIGH** | ⚠️ Unaddressed in Plan |
| 2 | Soft Delete Integrity — Sidebar Exclusion | **MEDIUM** | ⚠️ Partially Addressed |
| 3 | R2 Storage Orphan Risk on Conversation Delete | **HIGH** | 🔴 Not Addressed |
| 4 | Voice Recording Storage & Privacy | **CRITICAL** | 🔴 Not Addressed |
| 5 | Migration Safety — "Zero Backend Changes" Claim | **HIGH** | ⚠️ Claim Unverifiable |
| 6 | Concurrent JSONB Write Race Condition | **CRITICAL** | 🔴 Not Addressed |
| 7 | Token Usage Tracking Integrity | **LOW** | ✅ Acceptable Risk |
| 8 | Rate Limiting Coverage Gap | **MEDIUM** | 🔴 Not Addressed |
| BONUS | Health Data via AI — Regulatory Gap | **CRITICAL** | 🔴 Not Addressed |

---

## FINDING 1 — JSONB Conversation Growth with File Attachments

**Severity: HIGH**

### The Problem

PostgreSQL JSONB has a **hard row size limit of 1 GB** (via TOAST storage), but the practical danger arrives far earlier. The plan proposes storing messages as a JSONB array on the conversation row. Each message object likely contains:

```json
{
  "id": "uuid",
  "role": "user",
  "content": "text content...",
  "timestamp": "ISO8601",
  "attachments": [
    {
      "url": "https://r2.../ai-chat/conv-123/file.pdf",
      "mimeType": "application/pdf",
      "originalName": "intake-form.pdf",
      "sizeBytes": 2097152,
      "transcription": "Full extracted text from 50-page document..."
    }
  ],
  "tokenUsage": { "prompt": 4200, "completion": 800 }
}
```

**Real-world growth scenario for a SwanStudios power user:**

```
Trainer with 50 clients, uses AI daily for 6 months:
- 180 sessions × avg 20 messages = 3,600 messages
- Each message ~2KB base
- 10% include file attachments with transcriptions ~50KB each
- Single conversation JSONB: 3,600 × 2KB + 360 × 50KB = 7.2MB + 18MB = ~25MB

PostgreSQL TOAST threshold: 2KB per row
TOAST kicks in at 2KB, compresses, stores out-of-line
Performance degrades significantly above ~10MB per row
At 25MB: every message append requires full JSONB deserialize → append → reserialize → write
```

**The compounding problem:** Every `UPDATE conversations SET messages = messages || $1` on a 25MB JSONB field:
1. Reads the entire 25MB from TOAST storage
2. Deserializes to in-memory JSON
3. Appends one message
4. Reserializes the entire array
5. Writes 25MB+ back to TOAST
6. Invalidates all TOAST chunks

This is an **O(n) write operation** that gets slower with every message. At scale with concurrent trainers, this creates table bloat and autovacuum pressure.

### Database-Safe Recommendations

**Immediate (before Phase 1 ships):**

```sql
-- Add a hard size guard at the database level
-- Prevents runaway growth from destroying performance
ALTER TABLE conversations 
ADD CONSTRAINT check_messages_size 
CHECK (pg_column_size(messages) < 5242880); -- 5MB hard limit

-- Add monitoring query to run weekly
SELECT 
  id,
  pg_size_pretty(pg_column_size(messages)::bigint) as messages_size,
  jsonb_array_length(messages) as message_count,
  created_at,
  updated_at
FROM conversations
WHERE pg_column_size(messages) > 1048576 -- Alert above 1MB
ORDER BY pg_column_size(messages) DESC
LIMIT 20;
```

**Architectural fix (Phase 2 or before attachments ship):**

```sql
-- Migrate to a normalized messages table
-- This is the correct long-term architecture
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_usage JSONB,          -- Small metadata only
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_conversation 
    FOREIGN KEY (conversation_id) 
    REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_conv_messages_conversation_id 
  ON conversation_messages(conversation_id, sequence_number);

CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
  r2_key VARCHAR(500) NOT NULL,     -- Store key, not full URL
  original_filename VARCHAR(255),
  mime_type VARCHAR(100),
  size_bytes INTEGER,
  transcription_text TEXT,          -- Separate column, not in JSONB
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**If JSONB must be kept short-term:**

```javascript
// In aiChatRoutes.mjs — enforce before every append
const MAX_MESSAGES_PER_CONVERSATION = 200;
const MAX_ATTACHMENT_TRANSCRIPTION_CHARS = 10000; // Truncate, don't store full doc

async function appendMessage(conversationId, newMessage) {
  // Truncate transcriptions before storage
  if (newMessage.attachments) {
    newMessage.attachments = newMessage.attachments.map(att => ({
      ...att,
      transcription: att.transcription?.substring(0, MAX_ATTACHMENT_TRANSCRIPTION_CHARS),
      transcriptionTruncated: att.transcription?.length > MAX_ATTACHMENT_TRANSCRIPTION_CHARS
    }));
  }
  
  // Atomic append with size guard
  const result = await sequelize.query(`
    UPDATE conversations 
    SET messages = CASE 
      WHEN jsonb_array_length(messages) >= :maxMessages 
      THEN (messages - 0) || :newMessage::jsonb  -- Drop oldest, append newest
      ELSE messages || :newMessage::jsonb
    END,
    updated_at = NOW()
    WHERE id = :conversationId
    AND pg_column_size(messages) < 5242880  -- 5MB guard
    RETURNING id, pg_column_size(messages) as current_size
  `, {
    replacements: { 
      conversationId, 
      newMessage: JSON.stringify(newMessage),
      maxMessages: MAX_MESSAGES_PER_CONVERSATION
    }
  });
  
  if (result[0].length === 0) {
    throw new Error('CONVERSATION_SIZE_LIMIT_EXCEEDED');
  }
}
```

---

## FINDING 2 — Soft Delete Integrity: Sidebar Exclusion

**Severity: MEDIUM**

### The Problem

The plan references existing soft-delete via `status='deleted'`. The audit question is whether deleted conversations are **properly excluded** from sidebar listing queries. This is a data integrity issue — a deleted conversation appearing in the sidebar exposes content the user intended to remove.

**The risk pattern in Sequelize:**

```javascript
// DANGEROUS — common mistake, returns deleted conversations
const conversations = await Conversation.findAll({
  where: { userId: req.user.id }
  // Missing: status exclusion
});

// Also dangerous if using a scope that doesn't cover all query paths
Conversation.addScope('defaultScope', {
  where: { status: { [Op.ne]: 'deleted' } }
});
// But then someone does: Conversation.unscoped().findAll(...)
// And deleted records leak through
```

**Additional concern specific to this plan:** The onboarding workflow creates `ClientOnboardingQuestionnaire` records with `status='deleted'` as a soft-delete mechanism. If the sidebar query for "incomplete onboarding" clients uses a similar pattern, deleted questionnaires could appear in the trainer's "needs onboarding" list — exposing that a client record existed even after deletion.

### Verification Checklist

```sql
-- Run these queries against production to verify current state

-- 1. Check if any deleted conversations appear in typical sidebar query
-- (Replace with your actual query pattern)
SELECT COUNT(*) as deleted_conversations_without_status_filter
FROM conversations c
WHERE c.user_id = 'any-user-uuid'
-- If this returns rows, your query is missing the status filter

-- 2. Verify soft-delete field exists and is indexed
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND column_name IN ('status', 'deleted_at', 'is_deleted');

-- 3. Check index exists for status filter (critical for performance)
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'conversations'
AND indexdef LIKE '%status%';

-- 4. Verify no deleted questionnaires appear in onboarding incomplete query
SELECT COUNT(*) 
FROM client_onboarding_questionnaires
WHERE status IN ('in_progress', 'submitted')
AND completed_at IS NULL;
-- Manually verify none of these belong to deleted/deactivated users
```

### Database-Safe Recommendations

```javascript
// In your Sequelize model definition — make soft-delete exclusion the DEFAULT
// backend/models/Conversation.js (or .mjs)

Conversation.addScope('defaultScope', {
  where: {
    status: { [Op.notIn]: ['deleted', 'archived'] }
  }
}, { override: true });

// Add a paranoid-style composite index for performance
// Run as migration:
```

```sql
-- Migration: Add composite index for sidebar query performance
-- This makes the common query (user's active conversations) fast
CREATE INDEX CONCURRENTLY idx_conversations_user_active 
ON conversations(user_id, updated_at DESC) 
WHERE status NOT IN ('deleted', 'archived');

-- Same for onboarding questionnaires
CREATE INDEX CONCURRENTLY idx_onboarding_incomplete
ON client_onboarding_questionnaires(user_id, completion_percentage)
WHERE status IN ('in_progress', 'submitted') 
AND completed_at IS NULL;
```

```javascript
// Explicit guard in every sidebar/listing query — never rely on scope alone
// backend/routes/conversationRoutes.mjs

router.get('/conversations', authenticate, async (req, res) => {
  const conversations = await Conversation.findAll({
    where: {
      userId: req.user.id,
      status: { [Op.notIn]: ['deleted', 'archived'] }  // EXPLICIT, not just scope
    },
    attributes: ['id', 'title', 'updatedAt', 'status'],  // Never select messages here
    order: [['updatedAt', 'DESC']],
    limit: 50  // Always paginate
  });
  
  // Verify no deleted records leaked through (paranoid check in dev/staging)
  if (process.env.NODE_ENV !== 'production') {
    const leaked = conversations.filter(c => c.status === 'deleted');
    if (leaked.length > 0) {
      logger.error('SOFT_DELETE_LEAK', { count: leaked.length, userId: req.user.id });
    }
  }
  
  res.json(conversations);
});
```

---

## FINDING 3 — R2 Storage Orphan Risk on Conversation Delete

**Severity: HIGH**

### The Problem

The plan introduces file uploads to `ai-chat/` bucket path in Cloudflare R2. When a conversation is soft-deleted (or eventually hard-deleted), **the R2 objects are never cleaned up**. This creates:

1. **Storage cost accumulation** — Orphaned files continue to incur R2 storage charges indefinitely
2. **Privacy violation** — A "deleted" conversation's attachments remain accessible via direct R2 URL
3. **GDPR/CCPA risk** — User requests data deletion; database record is soft-deleted; R2 files persist; you are non-compliant
4. **Security risk** — If R2 URLs are not signed/expiring, the files are accessible to anyone with the URL even after the conversation is "deleted"

**The specific gap in this plan:** Section 3A describes creating questionnaire data from AI conversations. If a trainer uploads a client's health intake form as an attachment during the onboarding conversation, then that conversation is deleted, the health document remains in R2 forever.

**Health data in R2 is particularly dangerous:**
- HIPAA-adjacent (fitness/health information)
- PAR-Q+ data (medical screening)
- Client health concerns, injury history
- These are mentioned explicitly in the plan (healthConcerns, right knee issue, etc.)

### Database-Safe Recommendations

**Step 1: Never store full R2 URLs in JSONB — store keys only**

```javascript
// WRONG — stores full URL, key extraction becomes fragile
{ "url": "https://pub-xxx.r2.dev/ai-chat/conv-123/file.pdf" }

// CORRECT — store the key, construct URL at read time
{ "r2Key": "ai-chat/conv-123/uuid-file.pdf", "originalName": "intake.pdf" }
```

**Step 2: Track all R2 objects in a database table**

```sql
-- New table: tracks every R2 object for lifecycle management
CREATE TABLE r2_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  r2_key VARCHAR(500) NOT NULL UNIQUE,
  bucket_name VARCHAR(100) NOT NULL DEFAULT 'swanstudios-assets',
  associated_entity_type VARCHAR(50) NOT NULL, -- 'conversation', 'message', 'questionnaire'
  associated_entity_id UUID NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  uploaded_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,           -- Soft delete mirrors entity
  purged_at TIMESTAMPTZ,            -- Actual R2 deletion confirmed
  purge_scheduled_at TIMESTAMPTZ    -- When purge job should run
);

CREATE INDEX idx_r2_objects_entity 
  ON r2_objects(associated_entity_type, associated_entity_id);

CREATE INDEX idx_r2_objects_pending_purge 
  ON r2_objects(purge_scheduled_at) 
  WHERE purged_at IS NULL AND deleted_at IS NOT NULL;
```

**Step 3: Cleanup job**

```javascript
// backend/jobs/r2CleanupJob.mjs
// Run via cron: every hour

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  }
});

export async function purgeOrphanedR2Objects() {
  // Find objects scheduled for purge (deleted 24h+ ago, not yet purged)
  const pendingPurge = await R2Object.findAll({
    where: {
      deletedAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      purgedAt:

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
