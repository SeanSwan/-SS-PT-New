# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 82.2s
> **Files:** docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md
> **Generated:** 4/6/2026, 3:22:09 PM

---

# DATA SAFETY AUDIT REPORT
## SwanStudios SaaS Platform — AI Chat Feature Review
**Auditor Role:** Production Data Safety Auditor
**Date:** 2026-04-06
**Severity Scale:** CRITICAL → HIGH → MEDIUM → LOW
**Scope:** 8 specific data safety questions against the Comprehensive Site Refactor Brief

---

> ⚠️ **AUDITOR NOTICE:** This platform serves real paying customers at sswanstudios.com. Every finding below must be treated as a live production risk. The plan document reviewed is a *planning brief*, not an implementation spec — meaning several of these risks exist in the **gap between what the plan assumes and what the codebase actually does**. Those gaps are the most dangerous category.

---

## FINDING 1: Conversation JSONB Growth with File Attachments

**Severity: HIGH**

### Risk Description

PostgreSQL JSONB columns have a practical storage limit of 255MB per row (the TOAST threshold is 2KB inline; beyond that PostgreSQL transparently compresses and stores out-of-line up to 1GB per field technically, but query performance degrades severely well before that). The plan references storing messages as a JSONB array within a single conversation row. If file attachment *metadata* (base64 previews, embedded content, or large reference objects) is stored inside the JSONB rather than as pure references, a single conversation row can grow to hundreds of megabytes.

### Specific Failure Modes

```
Scenario A: Trainer uploads 10 workout images per session
  → Each image reference object: ~2KB metadata + thumbnail base64
  → 50 sessions × 10 images = 500 objects in JSONB array
  → Array scan on every message append: O(n) full array rewrite
  → PostgreSQL must rewrite entire JSONB column on every INSERT

Scenario B: Voice transcription stored in message metadata
  → Transcript text: 500-2000 chars per message
  → Token counts, model metadata, timestamps per message
  → 1000-message conversation: full JSONB rewrite on every new message
  → Table bloat, autovacuum pressure, WAL amplification
```

### PostgreSQL Behavior You Must Know

```sql
-- JSONB append is NOT atomic update of one element
-- This is what actually happens on every new message:
UPDATE conversations
SET messages = messages || '{"role":"user","content":"..."}'
WHERE id = $1;
-- PostgreSQL reads ENTIRE messages column, deserializes,
-- appends, reserializes, writes ENTIRE column back.
-- At 50MB, this is catastrophic for write throughput.
```

### Database-Safe Recommendations

**Immediate (before any file attachment feature ships):**

1. **Enforce a hard JSONB size guard at the application layer:**

```typescript
// In your message append service
const MAX_CONVERSATION_JSONB_BYTES = 5 * 1024 * 1024; // 5MB hard limit

async function appendMessage(conversationId: string, message: MessageObject) {
  const conversation = await Conversation.findByPk(conversationId);

  // Measure current size before append
  const currentSize = Buffer.byteLength(
    JSON.stringify(conversation.messages),
    'utf8'
  );

  if (currentSize > MAX_CONVERSATION_JSONB_BYTES) {
    // Archive old messages to a separate table, start fresh segment
    await archiveConversationSegment(conversationId, conversation.messages);
    conversation.messages = []; // Reset with archived reference
  }

  // Never store base64 in JSONB — store R2 URL reference only
  if (message.attachments) {
    message.attachments = message.attachments.map(a => ({
      type: a.type,
      r2Key: a.r2Key,       // Reference only
      filename: a.filename,
      sizeBytes: a.sizeBytes,
      mimeType: a.mimeType
      // NO base64, NO thumbnail data, NO embedded content
    }));
  }

  conversation.messages = [...conversation.messages, message];
  await conversation.save();
}
```

2. **Add a PostgreSQL-level size monitoring query to your ops dashboard:**

```sql
-- Run this weekly in production
SELECT
  id,
  user_id,
  pg_column_size(messages) as messages_bytes,
  jsonb_array_length(messages) as message_count,
  pg_size_pretty(pg_column_size(messages)) as human_size
FROM conversations
WHERE pg_column_size(messages) > 1048576  -- Flag anything over 1MB
ORDER BY pg_column_size(messages) DESC
LIMIT 50;
```

3. **Long-term migration path** (plan for this now, implement before 1000+ active users):

```sql
-- Migrate to normalized message storage
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',  -- Small metadata only: tokens, model, timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sequence_number INTEGER NOT NULL
);

CREATE INDEX idx_conv_messages_conversation_id
  ON conversation_messages(conversation_id, sequence_number);
```

---

## FINDING 2: Soft Delete Integrity — Deleted Conversations in Sidebar

**Severity: CRITICAL**

### Risk Description

The plan states it uses "existing soft-delete (status='deleted')" but does **not explicitly confirm** that the sidebar listing query filters on this status. This is the most dangerous category of finding: an assumption of correctness without verification. If the sidebar query does not include `WHERE status != 'deleted'` (or equivalent), deleted conversations from any user could appear in any sidebar — including conversations belonging to other users if multi-tenancy scoping is also incomplete.

### Why This Is CRITICAL for SwanStudios Specifically

This platform handles:
- Client health data (pain charts, movement analysis, injury history)
- Trainer-client communications
- Potentially HIPAA-adjacent health information

A deleted conversation reappearing in a sidebar is not just a UX bug — it is a **data exposure incident** if the conversation belongs to a different user or contains health information the current user should not see.

### Verification Checklist

You must verify ALL of the following before shipping:

```typescript
// VERIFY THIS EXISTS in your conversation listing service:
// ✅ status filter
// ✅ user_id scoping (conversations belong to THIS user only)
// ✅ role-based scoping (trainers see only their clients' conversations)

// DANGEROUS — what a broken query looks like:
const conversations = await Conversation.findAll({
  where: { user_id: userId }
  // ❌ MISSING: status filter — deleted conversations appear
  // ❌ MISSING: role check — trainer could see admin conversations
});

// SAFE — what the query must look like:
const conversations = await Conversation.findAll({
  where: {
    user_id: userId,
    status: { [Op.ne]: 'deleted' }  // Explicit exclusion
  },
  attributes: ['id', 'title', 'created_at', 'updated_at', 'status'],
  // Never return messages array in listing — too large, unnecessary
  order: [['updated_at', 'DESC']],
  limit: 50  // Pagination required — no unbounded queries
});
```

### Database-Safe Recommendations

1. **Add a database-level constraint as a safety net:**

```sql
-- Partial index ensures deleted conversations are never accidentally
-- included in index scans for active conversation queries
CREATE INDEX idx_conversations_active_by_user
  ON conversations(user_id, updated_at DESC)
  WHERE status != 'deleted';

-- Verify the index is being used:
EXPLAIN ANALYZE
SELECT id, title, updated_at
FROM conversations
WHERE user_id = $1 AND status != 'deleted'
ORDER BY updated_at DESC;
```

2. **Add an integration test that explicitly verifies soft-delete exclusion:**

```typescript
// This test must exist and must pass before any deployment
describe('Conversation sidebar safety', () => {
  it('NEVER returns deleted conversations in sidebar listing', async () => {
    const userId = testUser.id;

    // Create and soft-delete a conversation
    const conv = await Conversation.create({ user_id: userId, status: 'active' });
    await conv.update({ status: 'deleted' });

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${testToken}`);

    const ids = response.body.map(c => c.id);
    expect(ids).not.toContain(conv.id); // This must pass
  });

  it('NEVER returns another users conversations', async () => {
    const otherUserConv = await Conversation.create({
      user_id: otherUser.id,
      status: 'active'
    });

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${testToken}`); // Authenticated as testUser

    const ids = response.body.map(c => c.id);
    expect(ids).not.toContain(otherUserConv.id); // Cross-user isolation
  });
});
```

3. **Audit your Sequelize model scopes:**

```typescript
// Ensure your Conversation model has a default scope
class Conversation extends Model {
  static associate(models) { /* ... */ }
}

Conversation.addScope('defaultScope', {
  where: { status: { [Op.ne]: 'deleted' } }
}, { override: true });

// WARNING: If you use Conversation.unscoped() anywhere,
// document exactly why and add a comment explaining the security exception
```

---

## FINDING 3: R2 Storage Cleanup on Conversation Deletion

**Severity: HIGH**

### Risk Description

The plan mentions new file uploads to an `ai-chat/` bucket path in Cloudflare R2. The plan does **not describe any cleanup strategy** when conversations are soft-deleted or hard-deleted. This creates two distinct problems:

1. **Storage cost accumulation:** Orphaned files in R2 accumulate indefinitely. At scale with wealthy clients uploading workout videos and images, this becomes a significant cost center.

2. **Privacy/compliance risk:** A user deletes a conversation expecting their data to be gone. The files remain in R2 indefinitely. If this platform ever faces a GDPR/CCPA right-to-erasure request, you have no mechanism to fulfill it for R2 objects.

### The Soft-Delete Complication

Soft delete makes R2 cleanup non-trivial:

```
Conversation soft-deleted → status='deleted'
  → Files still in R2 (correct — soft delete is recoverable)
  → But: when does hard delete happen?
  → And: who triggers R2 cleanup?
  → And: what if R2 cleanup fails — is the DB record still hard-deleted?
```

### Database-Safe Recommendations

1. **Create an attachment tracking table (do not rely on JSONB for this):**

```sql
CREATE TABLE conversation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  message_sequence INTEGER,           -- Which message this belongs to
  r2_key VARCHAR(1024) NOT NULL,      -- Full R2 object key
  r2_bucket VARCHAR(255) NOT NULL,    -- Bucket name
  filename VARCHAR(512) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,             -- Soft delete timestamp
  r2_deleted_at TIMESTAMPTZ,         -- Confirmed R2 deletion timestamp
  deletion_error TEXT                 -- Log R2 deletion failures
);

CREATE INDEX idx_conv_attachments_conversation
  ON conversation_attachments(conversation_id);
CREATE INDEX idx_conv_attachments_pending_cleanup
  ON conversation_attachments(deleted_at)
  WHERE r2_deleted_at IS NULL AND deleted_at IS NOT NULL;
```

2. **Implement a cleanup job with transactional safety:**

```typescript
// Run this as a scheduled job (cron) — NOT inline with delete request
async function cleanupOrphanedR2Objects() {
  // Find attachments soft-deleted more than 30 days ago
  // (grace period for account recovery)
  const pendingCleanup = await ConversationAttachment.findAll({
    where: {
      deleted_at: { [Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      r2_deleted_at: null
    },
    limit: 100  // Process in batches
  });

  for (const attachment of pendingCleanup) {
    try {
      await r2Client.deleteObject({
        Bucket: attachment.r2Bucket,
        Key: attachment.r2Key
      });

      // Only mark as deleted AFTER confirmed R2 deletion
      await attachment.update({
        r2_deleted_at: new Date(),
        deletion_error: null
      });

    } catch (error) {
      // Log failure but do NOT crash — retry next run
      await attachment.update({
        deletion_error: error.message
      });
      logger.error('R2 cleanup failed', {
        attachmentId: attachment.id,
        r2Key: attachment.r2Key,
        error: error.message
      });
    }
  }
}
```

3. **For GDPR/CCPA right-to-erasure, add an explicit user data deletion endpoint:**

```typescript
// This must exist for compliance
async function eraseUserData(userId: string) {
  // 1. Find all conversations for user
  // 2. Find all attachments for those conversations
  // 3. Delete from R2 immediately (not deferred)
  // 4. Hard delete attachment records
  // 5. Hard delete or anonymize conversation records
  // 6. Log the erasure event with timestamp for compliance audit
}
```

---

## FINDING 4: Voice Recording Storage and Privacy

**Severity: HIGH**

### Risk Description

The plan mentions voice/microphone functionality across multiple surfaces (Coach Assistant, Swan Coach Workout Builder, AI terminals). The plan does **not explicitly state** whether audio recordings are:

- Streamed directly to Gemini and never stored
- Temporarily buffered on your server before forwarding
- Stored in R2 or any other persistent storage
- Retained in any form after transcription

For a platform serving health-adjacent data for clients aged 30-55 (who are increasingly privacy-aware), **voice data is among the most sensitive personal data categories**. Voice recordings can be used for biometric identification. Several jurisdictions (Illinois BIPA, Texas, Washington) have specific biometric data laws with statutory damages.

### The Gemini API Consideration

If you are sending audio to Google Gemini API:

```
User speaks → Audio captured in browser → Sent to YOUR backend →
YOUR backend forwards to Gemini API → Gemini transcribes →
Transcript returned → Audio discarded (hopefully)

Questions that MUST be answered:
1. Does audio pass through your Node.js server, or go directly to Gemini from browser?
2. If through your server: is it written to disk at any point (even temp files)?
3. Does your server log request bodies? (Audio would be in the body)
4. Does Gemini retain audio for model training? (Check your API agreement)
5. Is the audio transmission encrypted in transit (TLS)?
6. What happens if the Gemini API call fails — is audio retried? Logged?
```

### Database-Safe Recommendations

1. **Establish and document an explicit voice data policy:**

```typescript
// This comment block must exist in your voice processing service
/**
 * VOICE DATA POLICY - SwanStudios Production
 *
 * Audio data handling:
 * - Audio is captured client-side as WebM/Opus or similar
 * - Audio is transmitted directly to Gemini API via browser (preferred)
 *   OR via server relay (document which)
 * - Audio is NEVER written to disk on SwanStudios servers
 * - Audio is NEVER stored in R2, PostgreSQL, or any persistent store
 * - Audio is NEVER logged (

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
