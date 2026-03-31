# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 77.7s
> **Files:** docs/ai-workflow/blueprints/COACH-ASSISTANT-UPGRADE-PLAN.md
> **Generated:** 3/30/2026, 9:51:35 PM

---

# Swan Coach Assistant — Data Safety Audit Report

**Auditor:** Data Safety Review  
**Platform:** SwanStudios (sswanstudios.com) — Production SaaS  
**Document Reviewed:** `docs/ai-workflow/blueprints/COACH-ASSISTANT-UPGRADE-PLAN.md`  
**Date:** 2025  
**Treat all findings as affecting real user data in production.**

---

## Executive Summary

8 findings identified: **2 CRITICAL**, **3 HIGH**, **2 MEDIUM**, **1 LOW**. The plan's frontend-focused framing obscures several backend data integrity risks that will affect production users immediately upon deployment. The most dangerous issues are the JSONB race condition (silent data loss) and the R2 orphan file accumulation (unbounded storage cost + privacy violation). Both require backend schema changes before Phase 5 ships.

---

## Finding 1: JSONB Race Condition on Concurrent Message Writes

**Rating: 🔴 CRITICAL**

### The Problem

PostgreSQL JSONB columns do not have row-level array append semantics. When two browser tabs (or a mobile app + desktop) send messages to the same conversation simultaneously, both read the current `messages` JSONB array, append their message, and write back. The second write **silently overwrites the first**.

```
Tab A reads:  messages = [msg1, msg2]
Tab B reads:  messages = [msg1, msg2]
Tab A writes: messages = [msg1, msg2, msgA]  ← stored
Tab B writes: messages = [msg1, msg2, msgB]  ← OVERWRITES Tab A's message
Result:       msgA is permanently lost. No error thrown.
```

This is not theoretical. SwanStudios targets working professionals 30-55 who routinely use multiple devices. A client on mobile while their desktop session is open will lose messages with no indication anything went wrong.

### Why the Plan Misses This

The plan describes `sendMessage` as a simple POST but does not address the backend's write strategy. If the backend does:

```javascript
// DANGEROUS — current likely implementation
conversation.messages = [...conversation.messages, newMessage];
await conversation.save();
```

...this is a read-modify-write cycle with no concurrency protection.

### Database-Safe Recommendations

**Option A — PostgreSQL JSONB append operator (minimal change, immediate fix):**

```sql
-- Use jsonb_insert or || operator at the database level
-- This is atomic at the SQL level
UPDATE ai_conversations
SET messages = messages || $1::jsonb
WHERE id = $2
  AND user_id = $3;  -- always scope to user
```

In Sequelize:

```javascript
await AiConversation.update(
  {
    messages: Sequelize.literal(
      `messages || '${JSON.stringify([newMessage])}'::jsonb`
    ),
    updated_at: new Date()
  },
  {
    where: { id: conversationId, userId: req.user.id }
  }
);
```

**Option B — Optimistic locking with version column (recommended for production):**

```sql
ALTER TABLE ai_conversations ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
```

```javascript
// In the message send handler
const [rowsUpdated] = await AiConversation.update(
  {
    messages: Sequelize.literal(`messages || '${JSON.stringify([newMessage])}'::jsonb`),
    version: Sequelize.literal('version + 1'),
    updated_at: new Date()
  },
  {
    where: {
      id: conversationId,
      userId: req.user.id,
      version: clientVersion  // client sends the version it read
    }
  }
);

if (rowsUpdated === 0) {
  // Conflict detected — return 409 Conflict
  return res.status(409).json({
    error: 'conversation_modified',
    message: 'This conversation was updated in another tab. Please refresh.'
  });
}
```

**Option C — Migrate messages to a separate table (architecturally correct long-term):**

```sql
CREATE TABLE ai_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_user_id ON ai_messages(user_id);
```

This eliminates the race condition entirely because each INSERT is atomic. It also solves Finding 2 (size limits) and Finding 7 (token tracking integrity).

**Immediate action required:** Implement Option A before Phase 1 ships. Plan Option C for the next sprint. Option B is the production-safe middle ground if Option C is not feasible now.

---

## Finding 2: JSONB Array Unbounded Growth with File Attachments

**Rating: 🔴 CRITICAL**

### The Problem

PostgreSQL has an 8KB page size limit, but JSONB values are stored via TOAST (The Oversized-Attribute Storage Technique) which allows up to **1GB per cell**. The limit is not the concern — the behavior is.

**Current state (text only):** A message with 2,000 characters of text + metadata ≈ 3-5KB per message. 100 messages ≈ 300-500KB. Manageable.

**Phase 5 state (with file attachments):** The plan states:

> "Image: encoded as base64 inline data for Gemini multimodal"

If base64-encoded images are stored in the `messages` JSONB array:

```
10MB image → base64 encoded → ~13.3MB
1 conversation with 10 image messages → ~133MB in a single JSONB cell
```

This is not a PostgreSQL limit violation — it will store. The problems are:

1. **Every message load fetches the entire JSONB blob.** Loading a conversation with 10 images transfers 133MB from PostgreSQL to Node.js to the browser. This will time out for real users.
2. **The `GET /api/ai-chat/conversations` sidebar list endpoint** — if it returns full conversation objects including messages, it fetches ALL messages for ALL conversations on every sidebar load. With 20 conversations containing images, this could be gigabytes per page load.
3. **TOAST decompression overhead** — large JSONB values trigger TOAST storage, which adds decompression overhead on every read. Query times will degrade non-linearly.
4. **Backup and replication lag** — large JSONB cells increase WAL (Write-Ahead Log) size, slowing replication to read replicas.

### Verification Needed

Check the current `GET /api/ai-chat/conversations` implementation:

```javascript
// DANGEROUS if it does this:
const conversations = await AiConversation.findAll({
  where: { userId, status: { [Op.ne]: 'deleted' } }
  // No attributes restriction — returns full messages JSONB
});

// SAFE — what it should do:
const conversations = await AiConversation.findAll({
  where: { userId, status: { [Op.ne]: 'deleted' } },
  attributes: ['id', 'title', 'context', 'status', 'created_at', 'updated_at'],
  // Explicitly exclude messages column from list endpoint
});
```

**Verify this immediately.** If the sidebar list endpoint returns full message arrays, every sidebar load is already a performance bomb even without attachments.

### Database-Safe Recommendations

**Immediate (before Phase 5):**

```javascript
// Enforce message content size limit at the API layer
const MAX_MESSAGE_CONTENT_BYTES = 50 * 1024; // 50KB per message

if (Buffer.byteLength(messageContent, 'utf8') > MAX_MESSAGE_CONTENT_BYTES) {
  return res.status(413).json({
    error: 'message_too_large',
    message: 'Message content exceeds maximum size. Please use file attachment instead.'
  });
}
```

**For Phase 5 — never store base64 in JSONB:**

```javascript
// WRONG — what the plan implies
const message = {
  role: 'user',
  content: 'Check my squat form',
  attachments: [{
    type: 'image',
    data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgAB...' // 13MB string in JSONB
  }]
};

// CORRECT — store R2 URL reference only
const message = {
  role: 'user',
  content: 'Check my squat form',
  attachments: [{
    type: 'image',
    mimeType: 'image/jpeg',
    r2Key: 'ai-chat/user-123/conv-456/attach-789.jpg',
    r2Url: 'https://r2.sswanstudios.com/ai-chat/...',
    sizeBytes: 2847392,
    uploadedAt: '2025-01-15T10:30:00Z'
  }]
};
```

**Add a JSONB size guard at the database level:**

```sql
-- Add a check constraint to prevent runaway growth
-- 10MB per conversation is generous for text; adjust if needed
ALTER TABLE ai_conversations
ADD CONSTRAINT chk_messages_size
CHECK (pg_column_size(messages) < 10485760); -- 10MB
```

**Long-term:** Migrate to the `ai_messages` table described in Finding 1. The messages column becomes a foreign key count, not a data store.

---

## Finding 3: R2 Orphan Files — No Cleanup on Conversation Delete

**Rating: 🔴 HIGH**

### The Problem

The plan describes:
- Files uploaded to `ai-chat/` bucket path in R2
- Soft delete via `status='deleted'` on conversations
- **No cleanup strategy mentioned**

When a user deletes a conversation (or when a conversation is soft-deleted), the R2 objects at `ai-chat/user-{id}/conv-{id}/*` are never deleted. This creates:

1. **Unbounded storage cost accumulation** — R2 charges per GB stored. A user who uploads form-check photos across 50 conversations then deletes them all leaves all files in R2 forever.
2. **Privacy violation** — GDPR/CCPA "right to erasure" requires that when a user requests data deletion, ALL their data is deleted. Files orphaned in R2 violate this. SwanStudios' wealthy client base includes users with heightened privacy expectations.
3. **No audit trail** — There is no record of which R2 keys belong to which conversation, making manual cleanup impossible.

### The Soft Delete Trap

The plan uses `status='deleted'` (soft delete). This means:
- The conversation row still exists in PostgreSQL
- The `messages` JSONB still contains the R2 key references
- The R2 files still exist
- The user believes their data is deleted

If a hard delete is later performed (database cleanup job), the R2 keys in the messages JSONB are the only reference to those files — and if the row is deleted first, the R2 keys are gone with no way to clean up.

### Database-Safe Recommendations

**Step 1 — Create an attachment tracking table before Phase 5 ships:**

```sql
CREATE TABLE ai_conversation_attachments (
  id BIGSERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  r2_key VARCHAR(500) NOT NULL UNIQUE,
  r2_bucket VARCHAR(100) NOT NULL DEFAULT 'swanstudios-assets',
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  original_filename VARCHAR(255),
  deleted_at TIMESTAMPTZ,  -- soft delete tracking
  purged_at TIMESTAMPTZ,   -- R2 deletion confirmed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_conversation_id ON ai_conversation_attachments(conversation_id);
CREATE INDEX idx_attachments_user_id ON ai_conversation_attachments(user_id);
CREATE INDEX idx_attachments_purge_queue ON ai_conversation_attachments(deleted_at)
  WHERE purged_at IS NULL AND deleted_at IS NOT NULL;
```

**Step 2 — R2 cleanup job (runs nightly):**

```javascript
// jobs/cleanupOrphanedAttachments.js
async function cleanupOrphanedAttachments() {
  // Find attachments marked for deletion but not yet purged from R2
  const toDelete = await AiConversationAttachment.findAll({
    where: {
      deleted_at: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24hr grace
      purged_at: null
    },
    limit: 100 // batch to avoid timeout
  });

  for (const attachment of toDelete) {
    try {
      await r2Client.deleteObject({
        Bucket: attachment.r2Bucket,
        Key: attachment.r2Key
      });
      await attachment.update({ purged_at: new Date() });
      logger.info(`Purged R2 object: ${attachment.r2Key}`);
    } catch (err) {
      logger.error(`Failed to purge R2 object ${attachment.r2Key}:`, err);
      // Don't mark as purged — retry next run
    }
  }
}
```

**Step 3 — Cascade soft delete when conversation is deleted:**

```javascript
// In the DELETE /api/ai-chat/conversations/:id handler
await sequelize.transaction(async (t) => {
  // Soft delete the conversation
  await AiConversation.update(
    { status: 'deleted', deleted_at: new Date() },
    { where: { id: conversationId, userId: req.user.id }, transaction: t }
  );

  // Mark all attachments for cleanup
  await AiConversationAttachment.update(
    { deleted_at: new Date() },
    { where: { conversationId, userId: req.user.id }, transaction: t }
  );
});
// Cleanup job handles actual R2 deletion asynchronously
```

**Step 4 — GDPR hard delete path:**

```javascript
// When user requests full data deletion
async function hardDeleteUserData(userId) {
  const attachments = await AiConversationAttachment.findAll({
    where: { userId, purged_at: null }
  });

  // Delete from R2 synchronously for GDPR compliance
  await Promise.all(
    attachments.map(a => r2Client.deleteObject({ Bucket: a.r2Bucket, Key: a.r2Key }))
  );

  await AiConversationAttachment.destroy({ where: { userId } });
  await AiConversation.destroy({ where: { userId } });
}
```

---

## Finding 4: Voice Recording — Storage and Privacy Ambiguity

**Rating: 🔴 HIGH**

### The Problem

The plan states audio blobs are sent to `POST /api/ai-chat/transcribe` but does not specify:

1. Whether audio is stored server-side before/after transcription
2. Whether audio is forwarded to Gemini as raw audio or transcribed first
3. What Gemini's data retention policy is for audio submitted via API
4. Whether the audio blob is stored in R2 alongside the transcribed text

This ambiguity is a privacy risk. Voice recordings of fitness clients discussing health conditions, injuries, medications, and body composition are **sensitive health-adjacent data**. SwanStudios' wealthy golf client base has heightened privacy expectations and legal exposure.

### Specific Risks

**Risk A — Gemini API audio retention:**  
Google's Gemini API (via Google AI Studio) retains submitted data for up to 30 days for safety review by default. If audio recordings of clients discussing health conditions are sent to Gemini, this may conflict with SwanStudios' privacy policy and potentially HIPAA-adjacent obligations (even if not formally HIPAA-covered, wealthy clients expect equivalent protection).

**Risk B — Server-side audio temp storage:**  
If the transcription service writes the audio blob to disk (even temporarily) before sending to Gemini, that file must be:
- Written to a non-persistent temp directory
- Deleted immediately after

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
