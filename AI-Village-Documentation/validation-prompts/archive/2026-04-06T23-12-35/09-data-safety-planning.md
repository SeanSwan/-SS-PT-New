# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 85.7s
> **Files:** docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md
> **Generated:** 4/6/2026, 4:12:35 PM

---

# Data Safety Audit Report
## SwanStudios Production Platform — AI Chat Feature Review
**Auditor Role:** Data Safety Auditor | **Date:** 2026-04-06
**Classification:** PRODUCTION SYSTEM — Real paying customers affected

---

> **Preliminary Note:** The plan document reviewed (`COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md`) is a *broad platform refactor brief*, not a dedicated AI chat architecture document. This means several of the eight specific data safety questions cannot be fully answered from the plan alone — the plan does not define the JSONB schema, the R2 cleanup strategy, the voice recording pipeline, or the concurrent write model. **The absence of this documentation is itself a finding.** Each gap is rated accordingly below.

---

## Executive Summary

Of the eight data safety questions raised, **2 are CRITICAL**, **3 are HIGH**, **2 are MEDIUM**, and **1 is LOW**. The most dangerous issues are the JSONB race condition on concurrent writes and the absence of any documented R2 cleanup strategy for deleted conversations. The plan's claim of "zero backend changes" for Phase 1 is unverified and potentially false. Voice recording privacy is undocumented. All findings below should be resolved before any AI chat feature ships to production.

---

## Finding 1: Conversation JSONB Growth with File Attachments

**Rating: HIGH**

### Problem

PostgreSQL JSONB columns have a hard storage limit of 1 GB per value (the TOAST limit). In practice, a single JSONB array storing conversation messages with embedded file metadata — or worse, base64-encoded file content — can grow unbounded. With wealthy golf clients and working professionals who may share workout videos, form-check recordings, meal photos, and PDF programs, attachment-heavy conversations are not a theoretical edge case. They are the expected use pattern for this target market.

### Impact

- A conversation that exceeds PostgreSQL's TOAST threshold will begin spilling to disk, causing severe query slowdown on every read of that row.
- If any code path attempts to load the full JSONB array into application memory before paginating, Node.js heap exhaustion becomes possible on large conversations.
- A single pathological conversation can degrade the entire database connection pool if the query holds a lock or takes excessive time.
- There is no mention in the plan of pagination, chunking, or archival for old messages.

### Likely Root Cause

The plan references "Messages stored as JSONB array" as an existing pattern. This is a common early-stage architectural shortcut that works fine for small message counts but was never designed for file-attachment scale.

### Probable Code Areas

- `models/Conversation.js` or equivalent Sequelize model — the JSONB column definition
- `routes/ai-chat` or equivalent — the append logic that pushes new messages into the array
- Any `findOne` or `findAll` call that returns the full conversation row without field selection

### Database-Safe Recommendations

```sql
-- 1. Add a size guard trigger to reject oversized JSONB before it commits
CREATE OR REPLACE FUNCTION check_conversation_size()
RETURNS TRIGGER AS $$
BEGIN
  IF octet_length(NEW.messages::text) > 10485760 THEN  -- 10 MB hard limit
    RAISE EXCEPTION 'Conversation messages exceed maximum allowed size (10MB). Start a new conversation.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_conversation_size_limit
BEFORE INSERT OR UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION check_conversation_size();

-- 2. Add a monitoring query to your ops runbook
SELECT 
  id,
  user_id,
  octet_length(messages::text) AS messages_bytes,
  jsonb_array_length(messages) AS message_count,
  created_at,
  updated_at
FROM conversations
WHERE octet_length(messages::text) > 1048576  -- alert at 1 MB
ORDER BY messages_bytes DESC
LIMIT 20;
```

**Architectural recommendation:** File attachment metadata (R2 key, filename, MIME type, size, upload timestamp) should be stored in a separate `conversation_attachments` table with a foreign key to `conversations.id`, not embedded in the JSONB array. The JSONB message objects should store only a reference ID, not the metadata blob itself. This keeps the JSONB lean and makes attachment queries, cleanup, and auditing independently manageable.

```sql
-- Recommended separate table
CREATE TABLE conversation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL,  -- which message in the array this belongs to
  r2_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- soft delete for cleanup coordination
);

CREATE INDEX idx_conv_attachments_conversation_id 
  ON conversation_attachments(conversation_id);
CREATE INDEX idx_conv_attachments_deleted_at 
  ON conversation_attachments(deleted_at) 
  WHERE deleted_at IS NULL;
```

---

## Finding 2: Soft Delete Integrity — Deleted Conversations in Sidebar

**Rating: HIGH**

### Problem

The plan states it uses "existing soft-delete (status='deleted')" but does not show the actual query used to populate the sidebar conversation list. The safety of this pattern depends entirely on whether every query path that returns conversations to the frontend includes a `WHERE status != 'deleted'` or `WHERE deleted_at IS NULL` clause. If even one query path omits this filter, deleted conversations will reappear in the sidebar — potentially exposing conversation content the user believed they had deleted.

### Impact

- A user who deletes a sensitive conversation (e.g., a health condition discussed with their AI coach) may see it reappear in their sidebar.
- If the soft-delete filter is missing on admin-facing queries, an admin could browse conversations a client deleted, creating a privacy and trust violation.
- For a platform serving wealthy clients who discuss personal health data, this is a HIPAA-adjacent concern even if the platform is not formally HIPAA-covered.

### Likely Root Cause

Soft delete patterns in Sequelize are frequently implemented inconsistently. The `paranoid: true` Sequelize option adds `WHERE deletedAt IS NULL` automatically, but only if the model is configured correctly and only if raw queries are not used. Status-string soft deletes (`status='deleted'`) do not benefit from Sequelize's paranoid mode and must be manually filtered everywhere.

### Probable Code Areas

- `routes/conversations` — GET endpoint for sidebar list
- `routes/conversations/:id` — GET endpoint for loading a specific conversation
- Any admin panel query that lists all conversations
- Sequelize model scope definitions (or lack thereof)

### Database-Safe Recommendations

```javascript
// Option A: Add a default Sequelize scope to the Conversation model
// This ensures the filter is applied unless explicitly overridden

class Conversation extends Model {}
Conversation.init({
  // ... field definitions
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  }
}, {
  sequelize,
  modelName: 'Conversation',
  defaultScope: {
    where: {
      status: { [Op.ne]: 'deleted' }
    }
  },
  scopes: {
    // Explicit scope for admin audit use only
    includeDeleted: {
      where: {}
    },
    deletedOnly: {
      where: { status: 'deleted' }
    }
  }
});
```

```sql
-- Option B: Database-level view that enforces the filter
-- Use this view for all application queries; never query the base table directly
-- from application code for user-facing endpoints

CREATE VIEW active_conversations AS
SELECT * FROM conversations
WHERE status != 'deleted';

-- Revoke direct table access from the application DB user if your
-- security posture supports it, forcing all reads through the view
-- REVOKE SELECT ON conversations FROM app_user;
-- GRANT SELECT ON active_conversations TO app_user;
```

```sql
-- Audit query: find any conversation that is soft-deleted but 
-- whose messages are still being returned by any API call
-- Run this as a canary check in your staging environment

SELECT c.id, c.user_id, c.status, c.updated_at,
       jsonb_array_length(c.messages) AS message_count
FROM conversations c
WHERE c.status = 'deleted'
  AND c.updated_at > NOW() - INTERVAL '24 hours';
-- Any rows here after a delete operation indicate a query path 
-- that is writing to deleted conversations
```

---

## Finding 3: R2 Storage Cleanup When Conversations Are Deleted

**Rating: CRITICAL**

### Problem

The plan introduces file uploads to Cloudflare R2 under the `ai-chat/` bucket path. There is **no documented cleanup strategy** for what happens to R2 objects when a conversation is soft-deleted, hard-deleted, or when a user account is deleted. This is not a theoretical concern — it is a production data liability.

### Impact

- **Storage cost leak:** R2 objects for deleted conversations accumulate indefinitely, creating unbounded storage costs that scale with user churn.
- **Privacy violation:** A user who deletes their account or their conversation history has a reasonable expectation that their uploaded files (which may include personal health photos, body composition images, or form-check videos) are also deleted. If R2 objects persist, this expectation is violated.
- **GDPR/CCPA exposure:** If any user is in a jurisdiction covered by GDPR or CCPA, the right to erasure applies to all personal data including files stored in object storage. Orphaned R2 objects are a compliance failure.
- **No audit trail:** Without a cleanup strategy, there is no way to verify that a deletion request was honored.

### Likely Root Cause

The plan was written as a UX and feature brief, not a data lifecycle brief. File storage cleanup is a cross-cutting concern that is easy to omit when the focus is on the upload path.

### Probable Code Areas

- `routes/conversations/:id` — DELETE handler (currently only sets `status='deleted'`, does nothing to R2)
- `routes/users/:id` — account deletion handler (likely does not touch R2 at all)
- No existing cleanup job is mentioned anywhere in the plan

### Database-Safe Recommendations

**Immediate: Track R2 keys in the database before any attachment feature ships**

```sql
-- This table must exist BEFORE the first file is uploaded to R2
-- It is the source of truth for what needs to be cleaned up

CREATE TABLE r2_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  r2_key TEXT NOT NULL UNIQUE,
  bucket TEXT NOT NULL DEFAULT 'swanstudios-prod',
  entity_type TEXT NOT NULL,  -- 'conversation_attachment', 'equipment_image', etc.
  entity_id TEXT NOT NULL,    -- the ID of the owning record
  user_id INTEGER NOT NULL REFERENCES users(id),
  file_size_bytes BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deletion_requested_at TIMESTAMPTZ,
  deleted_from_r2_at TIMESTAMPTZ,
  deletion_error TEXT
);

CREATE INDEX idx_r2_objects_entity ON r2_objects(entity_type, entity_id);
CREATE INDEX idx_r2_objects_user_id ON r2_objects(user_id);
CREATE INDEX idx_r2_objects_pending_deletion 
  ON r2_objects(deletion_requested_at) 
  WHERE deletion_requested_at IS NOT NULL 
    AND deleted_from_r2_at IS NULL;
```

**Cleanup job (run every 15 minutes via cron or queue worker):**

```javascript
// cleanup-r2-objects.js — runs as a background worker
async function cleanupPendingR2Deletions() {
  const pending = await R2Object.findAll({
    where: {
      deletion_requested_at: { [Op.ne]: null },
      deleted_from_r2_at: null,
      deletion_error: null  // skip previously failed items for manual review
    },
    limit: 100  // process in batches to avoid overwhelming R2 API
  });

  for (const record of pending) {
    try {
      await r2Client.deleteObject({
        Bucket: record.bucket,
        Key: record.r2_key
      });
      
      await record.update({ 
        deleted_from_r2_at: new Date(),
        deletion_error: null
      });
      
      logger.info(`R2 cleanup: deleted ${record.r2_key} for user ${record.user_id}`);
    } catch (err) {
      await record.update({ 
        deletion_error: err.message,
        // Exponential backoff: don't retry immediately
      });
      logger.error(`R2 cleanup failed for key ${record.r2_key}: ${err.message}`);
    }
  }
}
```

**On conversation soft-delete, mark R2 objects for cleanup:**

```javascript
// In the conversation DELETE route handler
async function deleteConversation(req, res) {
  const { conversationId } = req.params;
  const userId = req.user.id;

  await sequelize.transaction(async (t) => {
    // 1. Soft-delete the conversation
    await Conversation.update(
      { status: 'deleted', deleted_at: new Date() },
      { where: { id: conversationId, user_id: userId }, transaction: t }
    );

    // 2. Mark all associated R2 objects for deletion
    // This is atomic with the conversation delete — either both happen or neither
    await R2Object.update(
      { deletion_requested_at: new Date() },
      { 
        where: { entity_type: 'conversation_attachment', entity_id: conversationId },
        transaction: t 
      }
    );
  });

  // 3. The background worker handles actual R2 deletion asynchronously
  // Do NOT delete from R2 synchronously in the request handler —
  // if R2 is slow or down, you don't want the user's delete request to fail
  
  res.json({ success: true });
}
```

**R2 bucket lifecycle policy as a safety net (set this in Cloudflare dashboard):**

```
Lifecycle rule: ai-chat/ prefix
Action: Delete objects with tag "pending-deletion" after 7 days
```

This is a backstop only — the application-level cleanup job is the primary mechanism.

---

## Finding 4: Voice Recording Storage and Privacy

**Rating: CRITICAL**

### Problem

The plan mentions voice/microphone functionality across multiple surfaces (Coach Assistant, Swan Coach Workout Builder, Boot Camp Creator) and references audio being sent to Gemini for transcription. There is **no documentation anywhere in the plan** about whether audio recordings are:

- Stored temporarily on the server before forwarding to Gemini
- Stored in R2 or any other persistent storage
- Retained by Gemini under Google's data processing terms
- Deleted after transcription
- Subject to any retention policy
- Disclosed to users in a privacy policy

For a platform where users discuss personal health conditions, injuries, pain levels, and body composition, audio recordings are among the most sensitive personal data that can be collected.

### Impact

- **Privacy policy violation:** If audio is stored anywhere without disclosure, this is a privacy violation regardless of jurisdiction.
- **GDPR Article 9:** Health-related voice data discussing injuries, pain, and medical conditions may qualify as special category data under GDPR, requiring explicit consent and stricter handling.
- **Google Gemini data retention:** Google's API terms for Gemini include data processing provisions. If audio is sent to Gemini, users must be informed that their voice data is processed by a third party.
- **Breach surface:** Stored audio files are a high-value breach target. A breach of workout audio discussing a client's knee surgery or chronic pain is far more damaging than a breach of workout log data.
- **The microphone reliability issues noted in the plan** (multiple surfaces where mic "does not work reliably") suggest the audio pipeline has not been thoroughly reviewed — making it more likely that audio is being handled inconsistently.

### Probable Code Areas

- Any component with microphone access (`getUserMedia` calls)
- Backend routes that receive audio blobs
- Gemini API integration code
- Any multer or file upload middleware that might be inadvertently persisting audio

### Database-Safe Recommendations

**Immediate actions before voice features are enabled in production:**

1. **Audit every code path that touches audio:**

```bash
# Run this in your codebase to find all audio handling
grep -r "getUserMedia\|MediaRecorder\|audio\|voice\|microphone\|transcri" \
  --include="*.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
