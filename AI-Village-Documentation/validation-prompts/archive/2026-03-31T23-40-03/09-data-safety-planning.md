# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 82.6s
> **Files:** docs/ai-workflow/blueprints/MULTI-WORKSTREAM-QA-ENHANCEMENT-PLAN.md
> **Generated:** 3/31/2026, 4:40:03 PM

---

# SwanStudios Data Safety Audit Report
## Multi-Workstream QA & Enhancement Plan — Production Safety Review

**Auditor Role:** Data Safety Auditor  
**Platform:** SwanStudios (sswanstudios.com) — Live Production with Real Paying Customers  
**Date:** Current Review Cycle  
**Severity Scale:** CRITICAL → HIGH → MEDIUM → LOW

---

## Executive Summary

The plan document reviewed is **primarily a frontend UX and QA planning document** with **significant data safety gaps** — specifically in what it *doesn't address*. Several findings below are CRITICAL precisely because the plan proposes changes without acknowledging the data safety implications. Real user data, including health metrics, voice recordings, and payment-adjacent session data, is at risk if these gaps are not closed before implementation.

---

## Finding 1: Conversation JSONB Growth with File Attachments

**Severity: HIGH**

### Analysis

The plan references `useAIChat.ts` with full CRUD operations and mentions the 17 data enrichment sources feeding into AI context. The plan does **not** address JSONB size constraints anywhere.

**PostgreSQL JSONB facts relevant to production:**
- PostgreSQL has no hard per-row size limit beyond the 1GB page limit, but TOAST kicks in at ~2KB per field
- TOAST (The Oversized-Attribute Storage Technique) transparently compresses and stores large JSONB values out-of-line — this works, but has performance implications
- A single conversation with 17 enrichment sources per message could easily produce:
  - System prompt: ~2,000–5,000 tokens ≈ 8–20KB
  - Per message with enrichment: ~500–2,000 tokens ≈ 2–8KB
  - 50-message conversation: **100KB–400KB per row**
  - With file attachment metadata: add 1–5KB per attachment reference
- At scale (1,000 active users × 10 conversations × 400KB average): **~4GB in JSONB alone**

**The plan proposes no size cap, no pagination of message history sent to AI, and no archival strategy.**

### Specific Risks

```sql
-- This query becomes catastrophically slow with large JSONB:
SELECT messages FROM ai_conversations 
WHERE user_id = $1 AND status != 'deleted'
ORDER BY updated_at DESC;
-- If messages column is 400KB, loading 20 conversations = 8MB per sidebar load
```

### Database-Safe Recommendations

```sql
-- 1. Add a size guard at the database level immediately
ALTER TABLE ai_conversations 
ADD CONSTRAINT messages_size_check 
CHECK (pg_column_size(messages) < 10485760); -- 10MB hard limit

-- 2. Add a message count column for fast pagination
ALTER TABLE ai_conversations 
ADD COLUMN message_count INTEGER DEFAULT 0;

-- 3. Create a separate messages table (long-term migration path)
-- This is the correct architecture for production scale:
CREATE TABLE ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_acm_conversation_id ON ai_conversation_messages(conversation_id, created_at);

-- 4. For sidebar listing, NEVER select the messages column:
-- BAD (current likely pattern):
SELECT * FROM ai_conversations WHERE user_id = $1;
-- GOOD:
SELECT id, title, context_type, status, message_count, updated_at, created_at
FROM ai_conversations 
WHERE user_id = $1 AND status != 'deleted'
ORDER BY updated_at DESC
LIMIT 50;
```

**Immediate action required:** Audit `aiChatService.mjs` to confirm the sidebar list endpoint does NOT select the `messages` JSONB column. If it does, this is a production performance bomb waiting to detonate.

---

## Finding 2: Soft Delete Integrity

**Severity: HIGH**

### Analysis

The plan states: *"Already implemented! `useAIChat.ts` has full CRUD: `listConversations()`, `loadConversation(id)`, `renameConversation(id, title)`, `archiveConversation(id)`, `deleteConversation(id)`"*

The plan does **not** verify that soft-deleted conversations are properly excluded from all query paths. This is a classic data leak vector.

### Specific Risks Identified

**Risk 1: Sidebar listing may expose deleted conversations**

```javascript
// If aiChatRoutes.mjs has a query like this, deleted conversations leak:
const conversations = await AiConversation.findAll({
  where: { userId: req.user.id }
  // Missing: status: { [Op.ne]: 'deleted' }
});
```

**Risk 2: Cross-user access via direct ID load**

```javascript
// If loadConversation(id) doesn't verify ownership AND non-deleted status:
const conversation = await AiConversation.findByPk(conversationId);
// A user could load another user's deleted conversation if they know the UUID
```

**Risk 3: Archive vs. Delete ambiguity**

The plan mentions both `archiveConversation` and `deleteConversation`. If `status` has values `['active', 'archived', 'deleted']`, every query must explicitly handle all three states. The sidebar should show only `active` (and optionally `archived` in a separate section), never `deleted`.

**Risk 4: Admin/trainer access to deleted client conversations**

The plan mentions `client_review` context type where trainers review client data. If a client deletes a conversation, can their trainer still see it? This needs an explicit policy decision documented and enforced at the query level.

### Database-Safe Recommendations

```sql
-- 1. Verify current data integrity immediately:
SELECT status, COUNT(*) 
FROM ai_conversations 
GROUP BY status;
-- If you see unexpected statuses, you have a data integrity problem now.

-- 2. Add a database-level constraint to prevent invalid status values:
ALTER TABLE ai_conversations 
ADD CONSTRAINT valid_status 
CHECK (status IN ('active', 'archived', 'deleted'));

-- 3. Create a view that enforces soft-delete exclusion:
CREATE VIEW active_conversations AS
SELECT * FROM ai_conversations 
WHERE status NOT IN ('deleted');
-- Use this view in all application queries

-- 4. Add deleted_at timestamp for audit trail:
ALTER TABLE ai_conversations 
ADD COLUMN deleted_at TIMESTAMPTZ,
ADD COLUMN deleted_by_user_id UUID REFERENCES users(id);
```

```javascript
// Mandatory pattern for ALL conversation queries in aiChatService.mjs:
const conversations = await AiConversation.findAll({
  where: { 
    userId: req.user.id,
    status: { [Op.notIn]: ['deleted'] }  // Explicit, not just != 'deleted'
  },
  attributes: ['id', 'title', 'contextType', 'status', 'updatedAt', 'createdAt'],
  // NEVER include 'messages' in sidebar list queries
  order: [['updatedAt', 'DESC']],
  limit: 50
});

// For loadConversation - ALWAYS verify ownership:
const conversation = await AiConversation.findOne({
  where: { 
    id: conversationId,
    userId: req.user.id,  // Ownership check
    status: { [Op.notIn]: ['deleted'] }  // Soft-delete check
  }
});
if (!conversation) {
  return res.status(404).json({ error: 'Conversation not found' });
  // Do NOT return 403 — don't confirm existence of deleted/other-user conversations
}
```

---

## Finding 3: R2 Storage Cleanup for Attachments

**Severity: CRITICAL**

### Analysis

The plan mentions `ai-chat/` bucket path for file uploads but provides **zero discussion of cleanup strategy**. This is a CRITICAL finding because:

1. **GDPR/CCPA compliance:** When a user deletes a conversation or their account, R2 objects must also be deleted. Orphaned files containing user health data (workout photos, body composition images, form check videos) in cloud storage is a compliance violation.

2. **Cost accumulation:** Orphaned R2 objects accumulate indefinitely. A fitness platform where users upload form-check videos could accumulate gigabytes of orphaned data.

3. **Data breach surface:** Files in R2 with predictable paths (`ai-chat/{userId}/{conversationId}/{filename}`) could be enumerated if bucket permissions are misconfigured.

4. **The plan has no R2 cleanup implementation at all.** This is not a future concern — if file uploads are being implemented now, cleanup must be implemented simultaneously.

### Specific Risks

```
Scenario: User uploads 5 form-check videos to a conversation, 
then deletes the conversation.

Current plan result:
- Database row: status='deleted' ✓
- R2 objects: STILL EXIST ✗
- User's health data (body on video): persists indefinitely in cloud storage
- GDPR right-to-erasure: VIOLATED
```

### Database-Safe Recommendations

```sql
-- 1. Track R2 objects in database (REQUIRED before any file upload goes live):
CREATE TABLE ai_conversation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  message_index INTEGER, -- which message in the JSONB array
  r2_key TEXT NOT NULL,  -- full R2 object key: ai-chat/{userId}/{convId}/{filename}
  r2_bucket TEXT NOT NULL DEFAULT 'swanstudios-assets',
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- soft delete mirrors conversation
  purged_at TIMESTAMPTZ    -- actual R2 deletion confirmed
);

CREATE INDEX idx_aca_conversation_id ON ai_conversation_attachments(conversation_id);
CREATE INDEX idx_aca_pending_purge ON ai_conversation_attachments(deleted_at) 
  WHERE purged_at IS NULL AND deleted_at IS NOT NULL;
```

```javascript
// Cleanup worker - MUST exist before file uploads go live:
// scripts/workers/r2-cleanup-worker.mjs

async function purgeDeletedConversationAttachments() {
  const pendingPurge = await AiConversationAttachment.findAll({
    where: {
      deleted_at: { [Op.not]: null },
      purged_at: null,
      deleted_at: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24hr grace
    },
    limit: 100
  });

  for (const attachment of pendingPurge) {
    try {
      await r2Client.deleteObject({
        Bucket: attachment.r2Bucket,
        Key: attachment.r2Key
      });
      await attachment.update({ purgedAt: new Date() });
      logger.info(`Purged R2 object: ${attachment.r2Key}`);
    } catch (err) {
      logger.error(`Failed to purge R2 object: ${attachment.r2Key}`, err);
      // Do NOT mark as purged — retry on next run
    }
  }
}

// Run every hour via cron
// Also trigger immediately on account deletion (GDPR compliance)
```

```javascript
// R2 path structure - use non-guessable paths:
// BAD:  ai-chat/{userId}/{conversationId}/{originalFilename}
// GOOD: ai-chat/{sha256(userId)}/{uuid()}.{ext}
// This prevents enumeration even if bucket becomes public accidentally

const r2Key = `ai-chat/${crypto.createHash('sha256')
  .update(userId).digest('hex')
  .substring(0, 16)}/${uuidv4()}.${fileExtension}`;
```

**Pre-launch checklist for file uploads:**
- [ ] R2 bucket has NO public access (verify in Cloudflare dashboard)
- [ ] All file access goes through signed URLs with 1-hour expiry
- [ ] `ai_conversation_attachments` table exists before first upload
- [ ] Cleanup worker is deployed and tested
- [ ] Account deletion flow triggers immediate attachment soft-delete + purge queue

---

## Finding 4: Voice Recording Storage and Privacy

**Severity: CRITICAL**

### Analysis

The plan mentions "voice-first AI coach" as a key differentiator but provides **zero specification** of how voice recordings are handled. This is a CRITICAL privacy finding for a health/fitness platform.

**Why this is CRITICAL for SwanStudios specifically:**
- Target market includes wealthy clients who have heightened privacy expectations
- Voice recordings in a fitness context may capture: health conditions mentioned casually, financial information (discussing session packages), personal relationships, location information
- Several US states (Illinois BIPA, California CCPA, Texas CUBI) have specific biometric/voice data regulations
- GDPR Article 9 classifies health data as "special category" requiring explicit consent

**The plan states voice is sent to Gemini for transcription but does not specify:**
1. Whether the audio blob is stored anywhere before/after Gemini processing
2. Whether Gemini retains the audio (Google's data retention policies apply)
3. Whether the transcription text is stored (it would be in the JSONB messages array)
4. Whether users are informed their voice is being processed by Google's AI
5. Whether there's a consent mechanism before first voice use

### Specific Risks

```
Risk scenario: User says "I've been having chest pain during workouts 
but don't want my insurance to know"

If audio is stored → health data + insurance concern captured in storage
If transcription stored in JSONB → health data persists in database
If sent to Gemini → Google processes sensitive health data
None of this is disclosed in the plan
```

### Database-Safe Recommendations

```javascript
// Voice handling MUST follow this pattern:

// 1. Audio blob: NEVER store to database or R2
// Process in memory only, discard immediately after transcription
async function processVoiceInput(audioBlob, userId) {
  // Validate: max 60 seconds, max 10MB
  if (audioBlob.size > 10 * 1024 * 1024) {
    throw new Error('Voice recording too large');
  }
  
  // Send to Gemini - audio is NOT stored
  const transcription = await geminiClient.transcribeAudio(audioBlob);
  
  // audioBlob is now eligible for GC - do not persist
  // Only the transcription text enters the message flow
  return transcription;
  
  // Log the event (not the content) for audit:
  await AuditLog.create({
    userId,
    action: 'voice_transcription',
    metadata: { 
      durationMs: audioDurationMs,
      // NO audio content, NO transcription text in audit log
    }
  });
}

// 2. Add to user consent tracking:
ALTER TABLE users ADD COLUMN voice_processing_consent_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN voice_processing_consent_version VARCHAR(10);

// 3. Privacy policy must explicitly state:
// - Voice is processed by Google Gemini API
// - Audio is not stored by SwanStudios
// - Transcription text is stored as part of conversation history
// - Users can delete conversations to remove transcriptions
```

```sql
-- Audit trail for voice usage (metadata only, no content):
CREATE TABLE voice_processing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  conversation_id UUID REFERENCES ai_conversations(id),
  duration_ms INTEGER,
  transcription_token_count INTEGER,
  provider VARCHAR(50) DEFAULT 'gemini',
  processed_at TIMESTAMPTZ DEFAULT NOW()
  -- NO audio data, NO transcription text stored here
);
```

**Required before voice feature goes live:**
- [ ] Privacy policy updated to disclose Gemini voice processing
- [ ] Explicit consent UI before first voice use
- [ ] Confirm Google's Gemini API data retention policy and document it
- [ ] Verify audio never touches SwanStudios servers (client-side processing) OR document server-side handling
- [ ] Legal review for Illinois BIPA if any users are in Illinois

---

## Finding 5: Migration Safety — "Zero Backend Changes" Claim

**Severity: HIGH**

###

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
