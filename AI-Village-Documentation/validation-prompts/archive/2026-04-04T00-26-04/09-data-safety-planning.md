# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 83.4s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-BUILDER-OVERHAUL-PLAN.md
> **Generated:** 4/3/2026, 5:26:04 PM

---

# Data Safety Audit Report
## SwanStudios Bootcamp Builder Overhaul Plan
**Auditor Role:** Production Data Safety Auditor
**Platform:** sswanstudios.com (Live Production, Real Paying Customers)
**Date:** Review of BOOTCAMP-BUILDER-OVERHAUL-PLAN.md
**Severity Scale:** CRITICAL → HIGH → MEDIUM → LOW

---

> ⚠️ **AUDITOR'S NOTE:** This plan document is primarily a **feature planning document for the Bootcamp Builder**, not an AI chat/conversation system. However, the audit questions reference an AI chat system (JSONB messages, R2 storage, voice recordings, sidebar conversations) that appears to be a **separate existing system** on the platform. This audit addresses both: (1) data safety issues **within the Bootcamp Builder plan itself**, and (2) the referenced AI chat system questions as they relate to production safety. Where the plan is silent on a topic, that silence is itself flagged as a finding.

---

## FINDING 1: Conversation JSONB Growth with File Attachments

**Severity: HIGH**

### Analysis

PostgreSQL JSONB has a **hard limit of 1GB per field value** (via TOAST storage), but this is a misleading ceiling — the real danger is operational, not theoretical.

**Growth calculation for a single conversation:**

```
Base message:           ~500 bytes JSON
With file attachment metadata:  ~2KB per message
With base64-encoded audio:      ~133KB per 10s of audio (base64 overhead ~33%)
With embedded thumbnails:       ~50-200KB per image
```

**Realistic worst-case scenario:**

```
Trainer uses AI chat daily for 6 months:
- 20 messages/day × 180 days = 3,600 messages
- Each with voice memo (30s avg) stored as base64: ~400KB each
- Total JSONB field: 3,600 × 400KB = ~1.4GB → EXCEEDS PostgreSQL TOAST limit
- Even at metadata-only: 3,600 × 2KB = ~7.2MB per conversation (slow queries)
```

**PostgreSQL behavior at scale:**

```sql
-- JSONB fields >8KB trigger TOAST compression
-- JSONB fields >2KB trigger TOAST out-of-line storage
-- Each JSONB access on a large array deserializes THE ENTIRE ARRAY
-- No partial reads — you load all 3,600 messages to display the last 10
```

### Specific Risks

1. **No pagination at the storage layer** — if messages are one JSONB array, every `SELECT` loads the entire conversation history
2. **Append race conditions** (see Finding 6) compound with size — larger arrays = longer lock windows
3. **Backup/restore time** — a 500MB JSONB field in a pg_dump will block table-level operations
4. **Index performance** — GIN indexes on large JSONB arrays degrade significantly past ~10MB

### Recommendations

```sql
-- IMMEDIATE: Add a size guard at the application layer
-- In your message service, before appending:

SELECT pg_column_size(messages) as msg_size
FROM ai_conversations
WHERE id = $1;

-- Reject or archive if > 5MB (configurable threshold)
```

```sql
-- MEDIUM-TERM: Migrate to a normalized messages table
-- This is the architecturally correct solution

CREATE TABLE ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  token_count     INTEGER,
  has_attachment  BOOLEAN DEFAULT FALSE,
  attachment_ref  VARCHAR(500),  -- R2 key, NOT the content
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata        JSONB DEFAULT '{}'::jsonb  -- small metadata only
);

CREATE INDEX idx_ai_messages_conversation_created
  ON ai_messages(conversation_id, created_at DESC);

-- Pagination becomes trivial and performant:
SELECT * FROM ai_messages
WHERE conversation_id = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET $2;
```

```typescript
// SHORT-TERM GUARD (before migration):
// In aiChatService.mjs — add before every message append

const MAX_CONVERSATION_SIZE_BYTES = 5 * 1024 * 1024; // 5MB hard limit
const MAX_MESSAGES_PER_CONVERSATION = 500;

async function appendMessage(conversationId: string, message: Message) {
  const { rows } = await db.query(
    `SELECT
       pg_column_size(messages) as size_bytes,
       jsonb_array_length(messages) as message_count
     FROM ai_conversations WHERE id = $1`,
    [conversationId]
  );

  if (rows[0].size_bytes > MAX_CONVERSATION_SIZE_BYTES) {
    // Auto-archive: create new conversation, link to parent
    throw new ConversationSizeLimitError(
      'Conversation archived. Starting fresh context window.'
    );
  }

  if (rows[0].message_count >= MAX_MESSAGES_PER_CONVERSATION) {
    throw new ConversationLengthLimitError(
      'Maximum message count reached.'
    );
  }

  // Proceed with append
}
```

**NEVER store binary content (audio, images) directly in JSONB.** Store only R2 keys.

---

## FINDING 2: Soft Delete Integrity — Deleted Conversations in Sidebar

**Severity: HIGH**

### Analysis

The plan states it uses "existing soft-delete (status='deleted')" but provides **zero specification** of how the sidebar listing query is constructed. This is a production data exposure risk.

**The dangerous query pattern (what may exist):**

```sql
-- UNSAFE — returns deleted conversations
SELECT id, title, created_at, updated_at
FROM ai_conversations
WHERE user_id = $1
ORDER BY updated_at DESC;
```

**The correct query pattern:**

```sql
-- SAFE — explicit exclusion required
SELECT id, title, created_at, updated_at
FROM ai_conversations
WHERE user_id = $1
  AND status != 'deleted'   -- explicit, not IS NULL check
  AND deleted_at IS NULL    -- belt-and-suspenders if column exists
ORDER BY updated_at DESC
LIMIT 50;  -- pagination required
```

### Specific Risks

1. **Deleted conversations visible in sidebar** — user sees conversations they intentionally deleted
2. **Deleted conversation content accessible via direct ID** — if sidebar hides them but the `GET /api/ai-chat/:id` endpoint doesn't filter by status, a user can still access deleted content by guessing/bookmarking the URL
3. **Cross-user access** — if `user_id` filter is missing or bypassable, User A sees User B's deleted conversations (CRITICAL escalation)
4. **Trainer-sees-client risk** — on a platform where trainers have elevated access, a trainer could potentially see a client's deleted AI conversations containing sensitive health/pain information

### Audit Checklist

```typescript
// VERIFY EACH OF THESE IN PRODUCTION CODE:

// ✅ 1. Sidebar list endpoint filters status
GET /api/ai-chat/conversations
// Must have: WHERE status != 'deleted' AND user_id = req.user.id

// ✅ 2. Single conversation fetch filters status
GET /api/ai-chat/conversations/:id
// Must have: WHERE id = $1 AND status != 'deleted' AND user_id = req.user.id

// ✅ 3. Message append checks conversation status
POST /api/ai-chat/conversations/:id/messages
// Must verify conversation is not deleted before appending

// ✅ 4. Soft delete sets timestamp, not just status
DELETE /api/ai-chat/conversations/:id
// Must set: status = 'deleted', deleted_at = NOW()

// ✅ 5. Admin/trainer elevated access is scoped
// Trainers should NOT see client AI conversations unless explicitly shared
```

### Recommendations

```sql
-- Add a database-level view to enforce safe access patterns
CREATE VIEW active_ai_conversations AS
SELECT * FROM ai_conversations
WHERE status != 'deleted'
  AND deleted_at IS NULL;

-- All application queries use the view, not the base table
-- This makes "accidentally querying deleted records" structurally impossible
```

```sql
-- Add a partial index for performance on the safe query
CREATE INDEX idx_ai_conversations_active_user
ON ai_conversations(user_id, updated_at DESC)
WHERE status != 'deleted';
```

```typescript
// Add middleware-level guard on all conversation routes
async function requireConversationOwnership(req, res, next) {
  const conversation = await AiConversation.findOne({
    where: {
      id: req.params.conversationId,
      userId: req.user.id,        // ownership check
      status: { [Op.ne]: 'deleted' }  // soft-delete check
    }
  });

  if (!conversation) {
    // Return 404, not 403 — don't confirm the conversation exists
    return res.status(404).json({ error: 'Conversation not found' });
  }

  req.conversation = conversation;
  next();
}
```

---

## FINDING 3: R2 Storage Cleanup for Deleted Conversations

**Severity: HIGH**

### Analysis

The plan mentions "New file uploads to ai-chat/ bucket path" but contains **no cleanup strategy**. This is a data retention compliance issue and a cost/privacy risk.

**The orphaned file problem:**

```
User uploads file → R2 stores at ai-chat/user-123/conv-456/attachment-789.pdf
User deletes conversation → status = 'deleted' in PostgreSQL
R2 file: STILL EXISTS, FOREVER
```

**Scale of the problem:**

```
100 active users × 5 file uploads/week × 52 weeks = 26,000 files/year
Average file size: 2MB
Annual orphaned storage: ~52GB if no cleanup
Annual R2 cost at $0.015/GB: ~$780/year in wasted storage
More importantly: GDPR/CCPA "right to erasure" requires actual deletion
```

### Specific Risks

1. **GDPR/CCPA compliance failure** — "right to be forgotten" requests require deleting R2 files, not just database records. Soft-delete alone does NOT satisfy erasure requests.
2. **Sensitive health data in files** — users may upload injury photos, medical documents. These must be deleted when requested.
3. **No audit trail** — if R2 files exist but DB records are soft-deleted, you cannot prove what was deleted when
4. **Storage cost accumulation** — orphaned files grow indefinitely
5. **R2 key predictability** — if keys follow a pattern (`ai-chat/user-{id}/conv-{id}/`), an authenticated user could potentially enumerate other users' files if the R2 bucket has misconfigured access

### Recommendations

```typescript
// PATTERN 1: Synchronous cleanup on soft-delete (simpler, riskier)
// Risk: if R2 delete fails, conversation appears deleted but files remain

async function softDeleteConversation(conversationId: string, userId: string) {
  const conversation = await AiConversation.findOne({
    where: { id: conversationId, userId, status: { [Op.ne]: 'deleted' } }
  });

  if (!conversation) throw new NotFoundError();

  // Extract all R2 keys from messages BEFORE soft-deleting
  const r2Keys = extractR2KeysFromMessages(conversation.messages);

  // Soft delete in DB first
  await conversation.update({
    status: 'deleted',
    deletedAt: new Date(),
    r2KeysToClean: r2Keys  // store for async cleanup verification
  });

  // Attempt R2 cleanup (non-blocking, logged)
  cleanupR2Files(r2Keys, conversationId).catch(err => {
    logger.error('R2 cleanup failed for conversation', { conversationId, err });
    // Queue for retry — see Pattern 2
  });
}
```

```typescript
// PATTERN 2: Async cleanup queue (recommended for production)

// 1. On soft-delete: mark files for deletion, don't delete immediately
// 2. Background job runs every hour, cleans up marked files
// 3. Verify deletion, update audit log

// Schema addition:
// ALTER TABLE ai_conversations ADD COLUMN r2_cleanup_status VARCHAR(20) DEFAULT 'none';
// ALTER TABLE ai_conversations ADD COLUMN r2_cleanup_at TIMESTAMPTZ;

// Cleanup job (runs via cron or queue worker):
async function processR2Cleanup() {
  const pendingCleanup = await AiConversation.findAll({
    where: {
      status: 'deleted',
      r2CleanupStatus: 'pending',
      deletedAt: { [Op.lt]: new Date(Date.now() - 5 * 60 * 1000) } // 5min grace
    },
    limit: 100
  });

  for (const conv of pendingCleanup) {
    try {
      const keys = await getR2KeysForConversation(conv.id);
      await Promise.all(keys.map(key => r2Client.deleteObject({ Key: key })));

      await conv.update({
        r2CleanupStatus: 'completed',
        r2CleanupAt: new Date()
      });

      logger.info('R2 cleanup completed', { conversationId: conv.id, keyCount: keys.length });
    } catch (err) {
      await conv.update({ r2CleanupStatus: 'failed' });
      logger.error('R2 cleanup failed', { conversationId: conv.id, err });
    }
  }
}
```

```typescript
// PATTERN 3: Separate file tracking table (most robust)

CREATE TABLE ai_conversation_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  message_index   INTEGER,           -- which message in the JSONB array
  r2_key          VARCHAR(500) NOT NULL,
  file_name       VARCHAR(255),
  file_size_bytes INTEGER,
  mime_type       VARCHAR(100),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,       -- when R2 deletion was confirmed
  deletion_status VARCHAR(20) DEFAULT 'pending'
    CHECK (deletion_status IN ('pending', 'completed', 'failed'))
);

CREATE INDEX idx_conv_files_cleanup
ON ai_conversation_files(deletion_status, uploaded_at)
WHERE deleted_at IS NULL;
```

**R2 Bucket Security:**
```
# Ensure R2 bucket policy requires authentication for ALL operations
# No public read access on ai-chat/ prefix
# Use pre-signed URLs with short expiry (15 minutes max) for file access
# Never expose R2 keys directly to frontend — proxy through your API
```

---

## FINDING 4: Voice Recording Storage and Privacy

**Severity: CRITICAL**

### Analysis

The plan references voice-first AI coach as a key differentiator and mentions audio sent to Gemini for transcription. The plan document is **completely silent** on voice data handling. This is the highest-risk finding in this audit.

**What we don't know (and must know before shipping):**

1. Is raw audio stored anywhere before/after Gemini transcription?
2. Is audio stored in R2? In the JSONB messages array? In memory only?
3. What does Gemini's data retention policy say about audio sent via API?
4. Are users informed their voice is being sent to Google's Gemini API?
5. Are voice recordings subject to HIPAA if they contain health information (injuries, pain levels)?

**The HIPAA risk is real:**

```
SwanStudios collects:
- Pain entries (explicit health data)
- Injury information (explicit health data)
- Voice recordings discussing pain/injuries = PHI if combined with identity

HIPAA applies if you are a "covered entity" or "business associate"
Personal training platforms discussing medical conditions = gray area
Voice + health data = treat as PHI until legal review confirms otherwise
```

**Gemini API data retention (Google's current policy):**

```
Google Gemini API (as of 2024):
- Input data is NOT used to train models (with standard API)

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
