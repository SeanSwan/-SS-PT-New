# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 77.1s
> **Files:** docs/ai-workflow/blueprints/COMPREHENSIVE-APP-AUDIT-2026-04-04.md
> **Generated:** 4/4/2026, 5:23:34 PM

---

# Data Safety Audit Report — SwanStudios AI Chat Feature
**Auditor Role:** Production Data Safety Auditor
**Platform:** sswanstudios.com (Live Production — Real Paying Customers)
**Date:** 2026-04-04
**Audit Scope:** 8 data safety concerns against the Comprehensive App Audit plan

---

> ⚠️ **PRODUCTION ALERT:** Every finding below represents a risk to real user data, real billing relationships, and real HIPAA-adjacent fitness health information for paying clients of a NASM-certified trainer. Treat accordingly.

---

## Finding 1: Conversation JSONB Growth — File Attachments

**Rating: 🔴 CRITICAL**

### Analysis

PostgreSQL JSONB has a **hard limit of 1GB per field value** (via TOAST storage). However, the practical danger is far below that ceiling.

**Attack surface calculation:**

```
Single message with base64-encoded attachment:
  - 5MB file → ~6.7MB base64 string in JSONB
  - 10 messages with attachments → ~67MB per conversation row
  - 100 active users × 10 attachment messages → 6.7GB table growth
  - PostgreSQL TOAST threshold: 2KB → every message with attachment
    triggers TOAST chunking, causing severe index bloat
```

**Specific risks for SwanStudios:**

- Golf swing video clips, form-check photos, workout PDFs — all plausible attachments from wealthy 30-55 demographic
- JSONB array appends require **full row rewrite** in PostgreSQL — no in-place update
- Each append to `messages[]` array = full TOAST decompression + recompression + rewrite
- At scale: table bloat, autovacuum falling behind, query timeouts on conversation load

### Database-Safe Recommendations

```sql
-- NEVER store binary data or base64 in JSONB messages array
-- Store only the R2 reference, not the content

-- Safe message structure:
{
  "id": "uuid",
  "role": "user",
  "content": "Check my squat form",
  "timestamp": "2026-04-04T10:00:00Z",
  "attachments": [
    {
      "attachmentId": "uuid-v4",        -- FK to separate table
      "filename": "squat-form.mp4",
      "mimeType": "video/mp4",
      "sizeBytes": 4823040,
      "r2Key": "ai-chat/conv-123/att-uuid.mp4"
      -- NO base64, NO binary content
    }
  ],
  "tokenUsage": { "input": 1200, "output": 340 }
}
```

```sql
-- Create a separate attachments table
CREATE TABLE conversation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL,          -- which message in the array
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                  -- soft delete aligned with conversation

  CONSTRAINT valid_size CHECK (size_bytes > 0 AND size_bytes <= 52428800) -- 50MB max
);

CREATE INDEX idx_conv_attachments_conversation
  ON conversation_attachments(conversation_id)
  WHERE deleted_at IS NULL;
```

```sql
-- Add JSONB size guard at the database level
ALTER TABLE conversations ADD CONSTRAINT check_messages_size
  CHECK (octet_length(messages::text) <= 10485760); -- 10MB hard cap per conversation
```

```javascript
// Backend middleware: enforce message size before append
const MAX_CONVERSATION_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_SINGLE_MESSAGE_BYTES = 512 * 1024;      // 512KB per message

async function validateMessageSize(conversationId, newMessage) {
  const conv = await Conversation.findByPk(conversationId, {
    attributes: ['id'],
    // Use raw query to check size without loading full JSONB
  });

  const { rows } = await sequelize.query(
    `SELECT octet_length(messages::text) as size_bytes
     FROM conversations WHERE id = :id`,
    { replacements: { id: conversationId }, type: QueryTypes.SELECT }
  );

  const currentSize = rows[0]?.size_bytes ?? 0;
  const newMessageSize = Buffer.byteLength(JSON.stringify(newMessage), 'utf8');

  if (newMessageSize > MAX_SINGLE_MESSAGE_BYTES) {
    throw new Error('MESSAGE_TOO_LARGE');
  }
  if (currentSize + newMessageSize > MAX_CONVERSATION_BYTES) {
    throw new Error('CONVERSATION_FULL'); // Prompt user to start new conversation
  }
}
```

---

## Finding 2: Soft Delete Integrity — Sidebar Listing

**Rating: 🟠 HIGH**

### Analysis

The plan states it uses "existing soft-delete (status='deleted')" but does **not explicitly confirm** the sidebar listing query filters on this status. This is a data exposure risk.

**Failure mode:** If the sidebar `GET /api/ai/conversations` query omits the `WHERE status != 'deleted'` clause (or equivalent), deleted conversations reappear in the sidebar. For a personal training platform where clients may delete sensitive health discussions, this is a privacy violation.

**Secondary risk:** Sequelize's `paranoid: true` mode uses `deletedAt` timestamp, not a `status` field. If the model uses `paranoid` but the plan's soft-delete uses `status='deleted'`, there may be **two competing soft-delete mechanisms** that don't compose correctly.

### Verification Checklist

```javascript
// VERIFY this is the actual query used for sidebar:
// ✅ SAFE pattern:
const conversations = await Conversation.findAll({
  where: {
    userId: req.user.id,
    // If using status field:
    status: { [Op.ne]: 'deleted' },
    // If using Sequelize paranoid:
    // deletedAt: null  ← handled automatically by paranoid: true
  },
  attributes: ['id', 'title', 'updatedAt', 'messageCount'], // NOT messages JSONB
  order: [['updatedAt', 'DESC']],
  limit: 50,  // MUST have limit — no unbounded queries
});

// ❌ DANGEROUS pattern (do not allow):
const conversations = await Conversation.findAll({
  where: { userId: req.user.id },
  // Missing status filter → deleted conversations visible
});
```

```sql
-- Audit query: run against production to detect exposure
-- If this returns rows, deleted conversations ARE visible to users
SELECT
  c.id,
  c.user_id,
  c.status,
  c.deleted_at,
  c.title,
  COUNT(*) as times_would_appear_in_sidebar
FROM conversations c
WHERE c.status = 'deleted'
   OR c.deleted_at IS NOT NULL
GROUP BY c.id, c.user_id, c.status, c.deleted_at, c.title
HAVING COUNT(*) > 0;
```

### Database-Safe Recommendations

```sql
-- Create a VIEW that enforces soft-delete at the database level
-- This prevents any query from accidentally exposing deleted conversations
CREATE OR REPLACE VIEW active_conversations AS
SELECT
  id,
  user_id,
  title,
  status,
  created_at,
  updated_at,
  jsonb_array_length(COALESCE(messages, '[]'::jsonb)) as message_count
  -- Deliberately EXCLUDE the messages JSONB column from this view
  -- Sidebar never needs message content, only metadata
FROM conversations
WHERE status != 'deleted'
  AND deleted_at IS NULL;  -- Belt AND suspenders

-- Grant SELECT on view, not base table, to application role
GRANT SELECT ON active_conversations TO swanstudios_app;
```

```javascript
// Sequelize model: enforce BOTH mechanisms
// models/Conversation.js
Conversation.init({
  status: {
    type: DataTypes.ENUM('active', 'archived', 'deleted'),
    defaultValue: 'active',
    allowNull: false,
  },
  // ... other fields
}, {
  paranoid: true,        // Adds deletedAt column, auto-filters
  defaultScope: {
    where: {
      status: { [Op.ne]: 'deleted' }, // Belt
      // deletedAt: null handled by paranoid  // Suspenders
    }
  }
});

// Soft delete method that sets BOTH:
Conversation.prototype.softDelete = async function() {
  await this.update({
    status: 'deleted',
    deletedAt: new Date(),  // Even if paranoid handles this, be explicit
  });
};
```

---

## Finding 3: R2 Storage Cleanup — Orphaned Attachments

**Rating: 🔴 CRITICAL**

### Analysis

The plan introduces file uploads to `ai-chat/` bucket path but **does not specify a cleanup strategy**. This creates:

1. **Storage cost leak:** Deleted conversations leave orphaned R2 objects indefinitely
2. **Privacy violation (GDPR/CCPA):** User requests data deletion → conversation soft-deleted → files remain in R2 → user data not actually deleted
3. **For SwanStudios' wealthy clientele:** Health/fitness data (form videos, body composition photos) persisting after deletion is a serious trust violation

**Worst case scenario:** A client deletes a conversation containing embarrassing form-check videos. The conversation is soft-deleted in PostgreSQL. The R2 objects remain. If R2 bucket permissions are ever misconfigured, those files are accessible.

### Database-Safe Recommendations

```javascript
// backend/services/r2CleanupService.mjs

import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Called when a conversation is soft-deleted.
 * Schedules R2 cleanup — does NOT delete immediately to allow undo window.
 */
export async function scheduleAttachmentCleanup(conversationId, delayMinutes = 1440) {
  // 1. Record pending deletion in database (audit trail)
  await PendingDeletion.create({
    resourceType: 'conversation_attachments',
    resourceId: conversationId,
    scheduledFor: new Date(Date.now() + delayMinutes * 60 * 1000),
    status: 'pending',
  });
}

/**
 * Cron job: runs every hour, processes pending deletions past their scheduled time.
 * NEVER delete R2 objects without first confirming DB record is soft-deleted.
 */
export async function processPendingDeletions() {
  const pending = await PendingDeletion.findAll({
    where: {
      status: 'pending',
      scheduledFor: { [Op.lte]: new Date() },
      resourceType: 'conversation_attachments',
    },
    limit: 100, // Process in batches
  });

  for (const deletion of pending) {
    const conversationId = deletion.resourceId;

    // SAFETY CHECK: Confirm conversation is still deleted before purging files
    const conversation = await Conversation.findByPk(conversationId, {
      paranoid: false, // Include soft-deleted
    });

    if (!conversation || conversation.status !== 'deleted') {
      // Conversation was restored — cancel deletion
      await deletion.update({ status: 'cancelled', reason: 'conversation_restored' });
      continue;
    }

    // Fetch all attachment keys for this conversation
    const attachments = await ConversationAttachment.findAll({
      where: { conversationId },
      paranoid: false,
      attributes: ['id', 'r2Key'],
    });

    if (attachments.length === 0) {
      await deletion.update({ status: 'completed', completedAt: new Date() });
      continue;
    }

    // Delete from R2 in batches of 1000 (S3 API limit)
    const keys = attachments.map(a => ({ Key: a.r2Key }));
    const batches = chunkArray(keys, 1000);

    for (const batch of batches) {
      await r2Client.send(new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: { Objects: batch, Quiet: false },
      }));
    }

    // Hard delete attachment records (they're orphaned anyway)
    await ConversationAttachment.destroy({
      where: { conversationId },
      force: true, // Hard delete attachment records
    });

    await deletion.update({
      status: 'completed',
      completedAt: new Date(),
      filesDeleted: attachments.length,
    });
  }
}
```

```sql
-- Pending deletions audit table
CREATE TABLE pending_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  files_deleted INTEGER,
  reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pending_deletions_scheduled
  ON pending_deletions(scheduled_for, status)
  WHERE status = 'pending';
```

```javascript
// R2 bucket lifecycle rule (set via Cloudflare dashboard or API)
// Belt-and-suspenders: even if cleanup job fails, R2 auto-expires orphans
// Set on ai-chat/ prefix: expire objects not accessed in 365 days
// This is a LAST RESORT — primary cleanup is the cron job above
```

---

## Finding 4: Voice Recording Storage — Privacy Implications

**Rating: 🔴 CRITICAL**

### Analysis

The plan is **ambiguous** about voice recording lifecycle. "Sent to Gemini for transcription then discarded" is stated as intent but not enforced architecturally. This is the highest-severity privacy finding in this audit.

**Why this is CRITICAL for SwanStudios:**

- Voice recordings of fitness clients discussing health conditions, injuries, medications, body image — this is sensitive health-adjacent data
- If audio is stored even temporarily in R2 or server disk, it becomes subject to breach disclosure requirements
- Gemini API terms: audio sent to Google's API — does SwanStudios' privacy policy disclose this?
- If audio is stored in R2 under `ai-chat/` alongside other attachments, the cleanup strategy above must explicitly cover it

**Failure modes:**

```
1. Audio blob uploaded to R2 "temporarily" → cleanup job fails → audio persists indefinitely
2. Audio stored in /tmp on server → server crash recovery → audio in crash dump
3. Audio sent to Gemini → Gemini stores for abuse monitoring → not disclosed in privacy policy
4. Browser MediaRecorder API → blob URL → developer adds "save for quality" → stored in DB
```

### Database-Safe Recommendations

```javascript
// backend/controllers/aiVoiceController.mjs

/**
 * VOICE TRANSCRIPTION: Audio must NEVER touch persistent storage.
 * Process entirely in memory, stream directly to Gemini, discard immediately.
 */
export async function transcribeVoiceMessage(req, res) {
  // Use multer memoryStorage — NEVER diskStorage for voice
  // Audio bytes live only in req.file.buffer (Node.js heap)

  const audioBuffer = req.file?.buffer;

  if (!audioBuffer) {
    return res.status(400).json({ error: 'No audio data received' });
  }

  // Size limit: voice messages should be < 10MB (Gemini limit is 20MB inline)
  if (audioBuffer.length > 10 * 1024 *

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
