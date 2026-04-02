# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 80.2s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 10:59:40 PM

---

# Data Safety Audit Report
## SwanStudios — Bootcamp Sprint Planner + Pain Chart Upgrade + Bootcamp Calendar
**Auditor Role:** Production Data Safety Auditor
**Platform:** sswanstudios.com (Live Production, Real Paying Customers)
**Date:** Audit of BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md

---

> ⚠️ **PREAMBLE — SCOPE CLARIFICATION**
>
> The plan under review is the **Bootcamp Sprint Planner + Pain Chart + Calendar** document. However, the 8 audit questions submitted reference **AI Chat features** (JSONB message arrays, R2 storage, voice recording, sidebar listing, concurrent message access, token tracking, rate limiting). These features **do not appear in the reviewed plan document**.
>
> **Interpretation:** These questions likely reference a *separate* AI Chat plan that shares the same codebase and production database. This audit will:
> 1. Answer all 8 questions as they apply to the production system (cross-referencing where the reviewed plan intersects)
> 2. Flag additional data safety findings discovered within the reviewed plan itself
> 3. Treat all findings as production-critical per audit mandate
>
> Every finding below could affect real user data on sswanstudios.com.

---

## AUDIT FINDINGS SUMMARY

| # | Finding | Severity | Category |
|---|---------|----------|----------|
| 1 | Conversation JSONB unbounded growth | **CRITICAL** | Data Integrity / Storage |
| 2 | Soft delete exclusion verification | **HIGH** | Data Exposure |
| 3 | R2 attachment orphan accumulation | **HIGH** | Storage / Cost / Privacy |
| 4 | Voice recording storage ambiguity | **CRITICAL** | Privacy / HIPAA-Adjacent |
| 5 | "Zero backend changes" Phase 1 claim | **HIGH** | Migration Safety |
| 6 | Concurrent JSONB write race condition | **CRITICAL** | Data Integrity |
| 7 | Token usage tracking integrity | **MEDIUM** | Data Integrity |
| 8 | Rate limiting gaps on new endpoints | **HIGH** | Security / Abuse |
| 9 | *(Plan-specific)* exerciseMemory JSONB unbounded growth | **HIGH** | Data Integrity |
| 10 | *(Plan-specific)* Pain data PHI exposure in AI context injection | **CRITICAL** | Privacy / Compliance |
| 11 | *(Plan-specific)* Sprint generation bulk AI call — no circuit breaker | **HIGH** | Reliability / Cost |
| 12 | *(Plan-specific)* SprintClassSlot JSONB exerciseKeys — no schema validation | **MEDIUM** | Data Integrity |
| 13 | *(Plan-specific)* Cross-sprint exercise exclusion — JSONB query performance | **MEDIUM** | Performance / Correctness |
| 14 | *(Plan-specific)* Calendar merge query — unindexed date range scans | **MEDIUM** | Performance |
| 15 | *(Plan-specific)* Anatomical image generation — no content policy guardrails | **LOW** | Compliance / Brand |

---

## DETAILED FINDINGS

---

### FINDING 1 — Conversation JSONB Unbounded Growth
**Severity: 🔴 CRITICAL**
**Category:** Data Integrity / Storage Exhaustion

#### Problem

PostgreSQL JSONB columns have a **hard limit of 1 GB per field value** (TOAST storage). In practice, the real danger is far lower:

- A single conversation JSONB array storing messages grows with every turn
- With file attachments: each attachment reference adds metadata (filename, size, MIME type, R2 URL, dimensions if image)
- With voice transcriptions: full transcript text stored inline
- With AI responses: Gemini responses can be 2,000–8,000 tokens (~8–32 KB per response)
- A power user with 500 messages + 50 file attachments could reach **50–200 MB in a single JSONB field**
- PostgreSQL TOAST will handle this silently — **you will not get an error until the row becomes unqueryable or causes heap bloat**
- Every `SELECT *` on the conversation row fetches the entire JSONB blob — no lazy loading

#### What breaks in production

```
Scenario: Trainer uses AI coach daily for 6 months
- 3 sessions/day × 180 days = 540 sessions
- Each session: ~20 messages avg = 10,800 messages
- Each message: ~2 KB avg (with metadata) = ~21 MB
- 10 file attachments per week × 26 weeks = 260 attachments
- Each attachment metadata: ~500 bytes = 130 KB
- Total JSONB field: ~21.1 MB per conversation

At 100 active trainers: 2.1 GB of JSONB data
PostgreSQL row size limit: effectively ~8 KB per row without TOAST
TOAST threshold: 2 KB — this field is ALWAYS TOASTed
TOAST read amplification: every message query reads entire TOAST chain
```

#### Database-Safe Recommendations

**Immediate (before any new features ship):**

```sql
-- 1. Add a size guard trigger
CREATE OR REPLACE FUNCTION check_conversation_jsonb_size()
RETURNS TRIGGER AS $$
BEGIN
  IF octet_length(NEW.messages::text) > 10485760 THEN -- 10 MB hard limit
    RAISE EXCEPTION 'Conversation messages exceed maximum size limit. 
                     Start a new conversation to continue.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_size_guard
  BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION check_conversation_jsonb_size();
```

**Architectural fix (required before file attachments ship):**

```sql
-- 2. Migrate to normalized messages table
CREATE TABLE conversation_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  token_count     INTEGER,
  metadata        JSONB DEFAULT '{}',  -- small metadata only, NOT content
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ  -- soft delete individual messages if needed
);

CREATE INDEX idx_conv_messages_conversation_id 
  ON conversation_messages(conversation_id, created_at);

CREATE INDEX idx_conv_messages_created_at 
  ON conversation_messages(created_at) 
  WHERE deleted_at IS NULL;

-- 3. Separate attachments table
CREATE TABLE message_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
  r2_key          VARCHAR(500) NOT NULL,
  filename        VARCHAR(255) NOT NULL,
  mime_type       VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**If JSONB must be kept short-term:**

```sql
-- 4. Add monitoring query — run daily
SELECT 
  id,
  user_id,
  title,
  jsonb_array_length(messages) AS message_count,
  pg_column_size(messages) AS messages_bytes,
  pg_size_pretty(pg_column_size(messages)::bigint) AS messages_size
FROM conversations
WHERE pg_column_size(messages) > 1048576  -- alert on > 1 MB
ORDER BY pg_column_size(messages) DESC;
```

---

### FINDING 2 — Soft Delete Integrity
**Severity: 🟠 HIGH**
**Category:** Data Exposure

#### Problem

The plan states it uses "existing soft-delete (status='deleted')". This pattern is safe **only if** every query that lists conversations explicitly filters on status. Common failure modes in production:

1. A new developer adds a sidebar query without the status filter
2. An ORM scope is defined but not applied to all query paths
3. Admin "view all" endpoints bypass the scope intentionally but expose deleted conversations to wrong roles
4. Sequelize `findAll` without a `where` clause on a model without a default scope returns deleted records

#### Verification checklist

```typescript
// UNSAFE — missing status filter
const conversations = await Conversation.findAll({
  where: { userId: req.user.id }
  // ❌ deleted conversations appear in sidebar
});

// SAFE — explicit filter
const conversations = await Conversation.findAll({
  where: { 
    userId: req.user.id,
    status: { [Op.ne]: 'deleted' }
    // OR: status: ['active', 'archived']
  }
});

// SAFEST — Sequelize default scope
class Conversation extends Model {}
Conversation.addScope('defaultScope', {
  where: {
    status: { [Op.ne]: 'deleted' }
  }
}, { override: true });
// Now ALL queries exclude deleted unless .unscoped() is explicitly called
```

#### Database-Safe Recommendations

```sql
-- 1. Add a partial index to make the filter fast AND enforce the pattern
CREATE INDEX idx_conversations_active_by_user 
  ON conversations(user_id, updated_at DESC)
  WHERE status != 'deleted';

-- 2. Add a CHECK constraint to prevent invalid status values
ALTER TABLE conversations 
  ADD CONSTRAINT chk_conversation_status 
  CHECK (status IN ('active', 'archived', 'deleted'));

-- 3. Audit query — find any conversation queries missing the status filter
-- Run this against your query logs:
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE query ILIKE '%conversations%'
  AND query NOT ILIKE '%status%'
  AND query NOT ILIKE '%deleted%'
ORDER BY calls DESC;
```

```typescript
// 4. Add Sequelize default scope to Conversation model immediately
Conversation.addScope('defaultScope', {
  where: {
    status: { [Op.notIn]: ['deleted'] }
  },
  attributes: { 
    // Never return full messages array in list queries
    exclude: ['messages'] 
  }
}, { override: true });

// 5. Create explicit scope for sidebar (no message content)
Conversation.addScope('sidebar', {
  where: { status: { [Op.notIn]: ['deleted'] } },
  attributes: [
    'id', 'title', 'updatedAt', 'status', 
    'messageCount', 'lastMessagePreview'
    // ❌ NOT 'messages' — never send full JSONB to sidebar
  ],
  order: [['updatedAt', 'DESC']],
  limit: 50  // hard pagination limit
});
```

---

### FINDING 3 — R2 Storage Orphan Accumulation
**Severity: 🟠 HIGH**
**Category:** Storage Cost / Privacy / Data Retention

#### Problem

When a conversation is soft-deleted (status='deleted'), the R2 objects at `ai-chat/` are **never cleaned up**. This creates:

1. **Privacy risk:** Deleted files remain accessible via their R2 URLs indefinitely
2. **Cost accumulation:** Cloudflare R2 charges for storage; orphaned files accumulate silently
3. **Compliance risk:** If a user requests data deletion (GDPR/CCPA), soft-deleted conversations with live R2 URLs are **not actually deleted**
4. **Hard delete gap:** The plan has no hard delete path — soft delete only

#### Attack surface

```
User uploads sensitive document to AI chat
User "deletes" conversation → status='deleted'
R2 object at ai-chat/userId/conversationId/filename.pdf still exists
R2 URL (if not using signed URLs) is still accessible
If using public bucket: file is publicly accessible forever
```

#### Database-Safe Recommendations

```typescript
// 1. Track R2 keys in database (required for cleanup)
// If not already doing this, add to message metadata or attachments table:
interface AttachmentRecord {
  r2Key: string;           // 'ai-chat/userId/convId/uuid-filename.pdf'
  r2Bucket: string;        // bucket name
  uploadedAt: Date;
  deletedAt: Date | null;  // set when conversation is deleted
  purgedAt: Date | null;   // set when R2 object is actually deleted
}

// 2. Cleanup job — run nightly
async function purgeOrphanedR2Objects() {
  const orphaned = await MessageAttachment.findAll({
    where: {
      deletedAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      purgedAt: null
    },
    limit: 100  // batch size — don't delete everything at once
  });
  
  for (const attachment of orphaned) {
    try {
      await r2Client.deleteObject({
        Bucket: attachment.r2Bucket,
        Key: attachment.r2Key
      });
      await attachment.update({ purgedAt: new Date() });
    } catch (err) {
      logger.error('R2 purge failed', { key: attachment.r2Key, err });
      // Don't throw — continue with next object
    }
  }
}

// 3. Use signed URLs with short expiry (15 minutes max)
// NEVER serve R2 files via permanent public URLs
const signedUrl = await getSignedUrl(r2Client, new GetObjectCommand({
  Bucket: process.env.R2_BUCKET,
  Key: attachment.r2Key
}), { expiresIn: 900 }); // 15 minutes
```

```sql
-- 4. Add database tracking for R2 objects
CREATE TABLE r2_objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  r2_key          VARCHAR(500) NOT NULL UNIQUE,
  r2_bucket       VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,  -- 'conversation_attachment', 'voice_recording'
  entity_id       UUID NOT NULL,
  file_size_bytes BIGINT,
  mime_type       VARCHAR(100),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,  -- marked when parent entity deleted
  purged_at       TIMESTAMPTZ   -- marked when R2 object actually deleted
);

CREATE INDEX idx_r2_objects_pending_purge 
  ON r2_objects(deleted_at) 
  WHERE purged_at IS NULL AND deleted_at IS NOT NULL;
```

---

### FINDING 4 — Voice Recording Storage Ambiguity
**Severity: 🔴 CRITICAL**
**Category:** Privacy / HIPAA-Adjacent / Compliance

#### Problem

The plan does not specify whether voice recordings are:
- Streamed directly to Gemini and discarded (never persisted)
- Stored temporarily in memory/buffer
- Written to disk/R2 before transcription
- Retained after transcription

This ambiguity is **unacceptable in production** for the following reasons:

1. **Health data:** SwanStudios clients discuss pain, injuries, medical history with the AI coach. Voice recordings containing health information may constitute **PHI under HIPAA** if the platform is used by healthcare-adjacent professionals
2. **Biometric data:** Voice recordings are biometric identifiers under **CCPA, BIPA (Illinois), and GDPR**
3. **Consent:** Users must be informed if their voice is stored, for how long, and who can access it
4. **Breach surface:** A voice recording database is a high-value breach target
5. **Golf/wealthy client demographic:** These users have heightened privacy expectations and legal resources

#### What the plan must specify

```typescript
// REQUIRED: Explicit voice data lifecycle documentation

interface VoiceDataPolicy {
  // Is audio ever written to disk or object storage?
  persistedToStorage: false;  // MUST be false unless explicit consent obtained
  
  // How long is audio held in memory?
  maxMemoryRetentionMs: 30000;  // 30 seconds max — transcription only
  
  // Is transcript stored?
  transcriptStoredInMessages: true;  // acceptable with disclosure
  
  // Is audio sent to third party?
  sentToGemini: true;  // MUST be disclosed in privacy policy
  
  // Gemini data retention?
  geminiRetentionPolicy: 'review

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
