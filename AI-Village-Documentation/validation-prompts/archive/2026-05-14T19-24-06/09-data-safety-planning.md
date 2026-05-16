# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 69.9s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

# Data Safety Audit Report: SwanStudios Coach Command Center + PLAUD Unified Workflow

**Auditor Role:** Production Data Safety Auditor
**Platform:** SwanStudios (sswanstudios.com) — Real paying customers
**Audit Date:** 2026-05-14
**Severity Framework:** CRITICAL → HIGH → MEDIUM → LOW

---

## Executive Summary

This plan touches **five distinct data surfaces simultaneously**: AI conversation storage, file/audio storage, client PII, workout logging, and a new unified intake queue. Several findings represent **genuine production data risks** that could affect real client records, expose PII to external APIs, or corrupt workout history. Two findings are CRITICAL and require resolution before any Phase 1 code ships.

---

## Finding 1: Conversation JSONB Growth with File Attachments

**Severity: HIGH**

### The Risk

PostgreSQL JSONB has a **1 GB hard limit per cell** (TOAST threshold is 8 KB before compression, but the row can grow to 1 GB). In practice, the real danger is not hitting the 1 GB ceiling — it is silent, unbounded growth that degrades query performance and backup size long before that limit.

Consider the realistic math for a production trainer:

```
Daily voice session: ~3 messages × 500 tokens each = ~2 KB text
File attachment metadata stored inline: ~1-5 KB per attachment
One month of daily sessions: ~30 sessions × ~10 KB = ~300 KB per conversation
One year: ~3.6 MB per active conversation
10 active clients × 1 year = ~36 MB in JSONB cells
```

This is manageable in isolation, but the plan introduces **file attachment metadata** (R2 URLs, MIME types, sizes, transcription results) stored inline in the same JSONB array. If audio transcription results are stored inline rather than by reference, a single verbose transcription can add 5–50 KB per message. At scale with 50+ clients, individual JSONB cells can reach 50–200 MB, causing:

- Full table scans on `AiConversation` become extremely slow
- `pg_dump` backup times increase nonlinearly
- Any query that touches the `messages` column loads the entire array into memory
- Sequelize's default behavior is to deserialize the entire JSONB on every `findOne`

### Specific File to Inspect

`backend/models/AiConversation.mjs` — verify the `messages` column definition and whether any index exists on it.

### Database-Safe Recommendations

**Immediate (before Phase 1 ships):**

```sql
-- Add a hard size guard at the database level
ALTER TABLE ai_conversations
ADD CONSTRAINT messages_size_limit
CHECK (octet_length(messages::text) < 5242880); -- 5 MB hard cap per conversation
```

**Architectural (Phase 1 requirement, not optional):**

```sql
-- Create a normalized messages table instead of JSONB array
CREATE TABLE ai_conversation_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  metadata        JSONB,           -- token counts, model info only — NO attachment content
  attachment_refs JSONB,           -- R2 keys only, NOT inline content or transcriptions
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acm_conversation_id ON ai_conversation_messages(conversation_id);
CREATE INDEX idx_acm_created_at ON ai_conversation_messages(conversation_id, created_at);
```

**If normalized table is deferred (not recommended):**

```typescript
// In AiConversation model — enforce at application layer
const MAX_MESSAGES_PER_CONVERSATION = 200;
const MAX_INLINE_CONTENT_BYTES = 10_000; // per message

// Before any message append:
if (conversation.messages.length >= MAX_MESSAGES_PER_CONVERSATION) {
  // Archive oldest 50 messages to a separate archive table
  // Keep only last 150 in active JSONB
}
```

**Never store inline in JSONB:**
- Raw audio bytes (obvious, but verify the webhook controller)
- Full transcription text longer than 2000 characters (store in a `transcriptions` table, reference by ID)
- R2 presigned URLs (these expire; store the R2 key and generate presigned URLs at read time)

---

## Finding 2: Soft Delete Integrity — Deleted Conversations in Sidebar

**Severity: CRITICAL**

### The Risk

The plan states it uses "existing soft-delete (status='deleted')" but **does not verify that every query path excludes deleted records**. This is a classic production data leak pattern. If any of the following are true, deleted conversations appear in the sidebar for real users:

1. The `useAIChat` hook's list query does not filter `status != 'deleted'`
2. A search/filter operation queries without the status clause
3. The new "named conversation" feature adds a second list endpoint that omits the filter
4. Pagination or cursor-based queries lose the filter on subsequent pages

The specific danger in this plan: **Phase 1 adds new sidebar list operations** (search, filter by client, rename). Each new code path that queries conversations is a new opportunity to forget the soft-delete filter.

### Verification Steps Required Before Phase 1

**Step 1: Audit the backend route**

```javascript
// In backend/routes/aiChatRoutes.mjs — verify this WHERE clause exists on EVERY list query:
// WHERE status != 'deleted' AND (userId = :userId OR targetUserId = :targetUserId)

// RED FLAG: Any query that looks like this is dangerous:
AiConversation.findAll({ where: { userId } }) // Missing status filter!

// SAFE pattern:
AiConversation.findAll({
  where: {
    userId,
    status: { [Op.ne]: 'deleted' }  // Must be present on EVERY query
  }
})
```

**Step 2: Verify the new search endpoint**

The plan adds conversation search. Verify the search endpoint includes the status filter:

```javascript
// DANGEROUS — full text search without status filter:
AiConversation.findAll({
  where: {
    title: { [Op.iLike]: `%${searchTerm}%` }
    // Missing: status filter!
  }
})

// SAFE:
AiConversation.findAll({
  where: {
    title: { [Op.iLike]: `%${searchTerm}%` },
    status: { [Op.ne]: 'deleted' },
    userId: authenticatedUserId  // Scope to user — always
  }
})
```

**Step 3: Add a database-level default scope**

```javascript
// In backend/models/AiConversation.mjs
const AiConversation = sequelize.define('AiConversation', { /* ... */ }, {
  defaultScope: {
    where: {
      status: { [Op.ne]: 'deleted' }
    }
  },
  scopes: {
    withDeleted: {}, // Explicit opt-in to see deleted records
    deleted: {
      where: { status: 'deleted' }
    }
  }
});
```

**Step 4: Write a regression test that must pass before deployment**

```typescript
describe('Conversation sidebar — soft delete integrity', () => {
  it('MUST NOT return deleted conversations in list', async () => {
    const deleted = await createConversation({ status: 'deleted', userId });
    const active = await createConversation({ status: 'active', userId });

    const response = await request(app)
      .get('/api/ai-chat/conversations')
      .set('Authorization', `Bearer ${token}`);

    const ids = response.body.conversations.map(c => c.id);
    expect(ids).not.toContain(deleted.id);  // This MUST pass
    expect(ids).toContain(active.id);
  });

  it('MUST NOT return deleted conversations in search', async () => {
    const deleted = await createConversation({
      status: 'deleted', title: 'SearchableTitle', userId
    });

    const response = await request(app)
      .get('/api/ai-chat/conversations?search=SearchableTitle')
      .set('Authorization', `Bearer ${token}`);

    const ids = response.body.conversations.map(c => c.id);
    expect(ids).not.toContain(deleted.id);  // This MUST pass
  });
});
```

### Additional Integrity Risk

The plan mentions conversations can have a `targetUserId` (client context). Verify that a trainer cannot list another trainer's deleted conversations by manipulating the `targetUserId` parameter. This is an authorization gap, not just a soft-delete gap.

---

## Finding 3: R2 Storage Cleanup on Conversation Delete

**Severity: HIGH**

### The Risk

When a conversation is soft-deleted (status='deleted'), the R2 objects at `ai-chat/` paths are **never cleaned up**. This creates:

1. **Indefinite PII storage**: Audio transcription source files, uploaded documents, and voice memos remain in R2 storage forever, even after the user "deletes" the conversation
2. **Storage cost growth**: Unbounded R2 storage accumulation with no cleanup path
3. **Compliance risk**: If a client requests data deletion (GDPR/CCPA), soft-deleting the conversation record does NOT delete the R2 objects — this is a compliance failure
4. **Orphaned files on hard delete**: If conversations are ever hard-deleted (purge jobs, retention policies), the R2 objects become permanently orphaned with no recovery path

### The Plan's Gap

The plan mentions a `retention` endpoint in `coachIntakeRoutes.mjs` and a `purge-plan` endpoint, but **does not specify R2 cleanup as part of the delete/purge flow**. The `ai-chat/` bucket path is new and has no documented cleanup strategy.

### Database-Safe Recommendations

**Step 1: Track R2 objects in the database, not just inline in JSONB**

```sql
CREATE TABLE ai_conversation_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  message_id      UUID,            -- References ai_conversation_messages if normalized
  r2_key          TEXT NOT NULL,   -- e.g., 'ai-chat/conv-uuid/msg-uuid/filename.pdf'
  r2_bucket       TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  original_name   TEXT,            -- Sanitized, not raw user input
  upload_status   TEXT NOT NULL DEFAULT 'active'
                  CHECK (upload_status IN ('active', 'pending_delete', 'deleted')),
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_aca_conversation_id ON ai_conversation_attachments(conversation_id);
CREATE INDEX idx_aca_pending_delete ON ai_conversation_attachments(upload_status)
  WHERE upload_status = 'pending_delete';
```

**Step 2: Implement a two-phase delete pattern**

```javascript
// Phase A: Mark for deletion (synchronous, in the delete request handler)
async function softDeleteConversation(conversationId, userId) {
  await sequelize.transaction(async (t) => {
    // 1. Soft-delete the conversation
    await AiConversation.update(
      { status: 'deleted', deletedAt: new Date() },
      { where: { id: conversationId, userId }, transaction: t }
    );

    // 2. Mark all attachments as pending R2 deletion
    await AiConversationAttachment.update(
      { upload_status: 'pending_delete', deleted_at: new Date() },
      { where: { conversation_id: conversationId }, transaction: t }
    );
  });
  // Do NOT call R2 delete here — keep the transaction fast
}

// Phase B: Async cleanup job (runs every 15 minutes via cron/worker)
async function cleanupPendingR2Deletions() {
  const pending = await AiConversationAttachment.findAll({
    where: {
      upload_status: 'pending_delete',
      deleted_at: { [Op.lt]: new Date(Date.now() - 5 * 60 * 1000) } // 5 min grace period
    },
    limit: 100
  });

  for (const attachment of pending) {
    try {
      await r2Client.deleteObject({
        Bucket: attachment.r2_bucket,
        Key: attachment.r2_key
      });
      await attachment.update({ upload_status: 'deleted' });
    } catch (err) {
      logger.error('R2 cleanup failed', { r2_key: attachment.r2_key, err });
      // Do not mark as deleted — retry on next run
    }
  }
}
```

**Step 3: GDPR/CCPA data deletion path**

```javascript
// Must be implemented before any real client data is stored in R2
async function deleteAllUserData(userId) {
  // 1. Find all conversations for user
  const conversations = await AiConversation.findAll({
    where: { userId },
    include: [{ model: AiConversationAttachment }]
  });

  // 2. Delete all R2 objects immediately (not async — this is a legal request)
  const r2Keys = conversations.flatMap(c =>
    c.attachments.map(a => ({ Key: a.r2_key }))
  );

  if (r2Keys.length > 0) {
    await r2Client.deleteObjects({
      Bucket: R2_BUCKET,
      Delete: { Objects: r2Keys }
    });
  }

  // 3. Hard delete or anonymize records per your retention policy
}
```

---

## Finding 4: Voice Recording Storage and Privacy

**Severity: CRITICAL**

### The Risk

The plan is **ambiguous about voice recording lifecycle** — this is the most serious privacy finding in the audit. The plan states voice transcription exists in `SwanCoachAssistantPage.tsx` and audio is "sent to Gemini for transcription," but does not specify:

1. Whether raw audio is stored in R2 before, during, or after transcription
2. Whether Gemini receives raw audio or a transcription
3. Whether client names, session details, or other PII spoken in voice memos are sent to Google's Gemini API
4. Whether the PLAUD webhook audio (fetched by `applaudAudioFetcher.mjs`) is stored in R2 or only in memory during processing
5. What happens to audio if transcription fails mid-process

### Why This Is CRITICAL

The plan's Non-Negotiables state: **"No PII to external LLMs. Client names, emails, phone numbers, raw transcript identifiers, and sensitive notes must not be sent to external model providers unless privacy proxying/redaction is enforced."**

Voice memos from a personal trainer **will contain client names, health information, injury notes, and session details**. If raw audio or unredacted transcriptions are sent to Gemini, this violates the plan's own non-negotiable and potentially HIPAA-adjacent health data regulations.

### Specific Files to Inspect Immediately

```
backend/services/applaudAudioFetcher.mjs        — Does it write to R2 or only memory?
backend/controllers/plaud/plaudApplaudWebhookController.mjs — Where does audio go after fetch?
backend/controllers/plaud/plaudMergeController.mjs — What is sent to the AI model?
frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx
  — What does the voice transcription path send to the backend?
```

### Required Audit Questions (Must Be Answered Before Phase 1)

```
Q1: When a trainer records a voice memo and submits it:
    - Is the audio file written to R2? If yes, what is the R2 key path?
    - Is the audio file written to local disk? If yes, is it cleaned up?
    - Is the audio sent directly to Gemini as bytes? Or is it transcribed locally first?

Q2: What is the exact payload sent to Gemini/external AI?
    - Raw audio bytes?


---

*Part of SwanStudios 15-Brain Recursive Consensus System*
