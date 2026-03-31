# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 70.1s
> **Files:** docs/ai-workflow/blueprints/TEACH-MODE-EXPANSION-PLAN.md
> **Generated:** 3/31/2026, 12:58:53 AM

---

# DATA SAFETY AUDIT REPORT
## SwanStudios — TEACH MODE EXPANSION PLAN
**Auditor Role:** Production Data Safety Auditor
**Platform:** sswanstudios.com (Live Production with Real Paying Customers)
**Date:** Current Review Cycle
**Severity Scale:** CRITICAL → HIGH → MEDIUM → LOW

---

> ⚠️ **AUDITOR PREFACE:** This plan is primarily a **frontend UI expansion** (Teach Mode sidebars, tabbed exercise data, educational content). However, several architectural decisions embedded in the plan — and several *absences* of decisions — create real data safety risks for production. The plan's silence on certain topics is itself a finding. Every finding below assumes real trainer accounts, real client data, and real revenue are at stake on sswanstudios.com.

---

## FINDING 1: Conversation JSONB Growth with File Attachments

**Severity: HIGH**

### The Risk
The plan references Coach Assistant conversation management (Phase 2) including "Voice & Attachment Features" and "Saving, searching, organizing conversations." If conversations are stored as JSONB arrays in PostgreSQL, and if file attachment *metadata* (or worse, base64-encoded content) is embedded in that JSONB, the array can grow without bound.

### PostgreSQL JSONB Reality Check

```
PostgreSQL JSONB hard limit: 1 GB per field value
Practical danger zone:       > 1 MB per field
Performance cliff:           > 100 KB per field (index degradation)
```

**Realistic size projections per conversation:**

| Scenario | Per Message | 50 Messages | 200 Messages |
|---|---|---|---|
| Text only | ~500 bytes | ~25 KB | ~100 KB ✅ |
| Text + token metadata | ~800 bytes | ~40 KB | ~160 KB ✅ |
| Text + voice transcript | ~2 KB | ~100 KB | ~400 KB ⚠️ |
| Text + file attachment metadata | ~3 KB | ~150 KB | ~600 KB ⚠️ |
| Text + base64 audio inline | ~50 KB | ~2.5 MB | ~10 MB 🚨 |
| Text + base64 image inline | ~200 KB | ~10 MB | ~40 MB 🚨 |

### Specific Danger: "Attachment Features" in Phase 2
The plan mentions attachment features for Coach Assistant but provides **zero specification** of what gets stored in the JSONB vs. what gets stored as a reference. This ambiguity is the risk. If any developer implements this by serializing file content into the message object, production databases will bloat silently until queries time out.

### Database-Safe Recommendations

**1. Enforce a JSONB message size guard at the application layer:**

```typescript
// backend/middleware/conversationSizeGuard.ts
const MAX_MESSAGE_JSONB_BYTES = 512 * 1024; // 512 KB hard limit per conversation
const MAX_SINGLE_MESSAGE_BYTES = 32 * 1024; // 32 KB per individual message

export function validateMessageSize(
  existingMessages: ConversationMessage[],
  newMessage: ConversationMessage
): void {
  const newMessageSize = Buffer.byteLength(
    JSON.stringify(newMessage), 
    'utf8'
  );
  
  if (newMessageSize > MAX_SINGLE_MESSAGE_BYTES) {
    throw new AppError(
      'Message payload exceeds maximum size. ' +
      'File content must be stored as references, not inline.',
      413
    );
  }
  
  const totalSize = Buffer.byteLength(
    JSON.stringify([...existingMessages, newMessage]),
    'utf8'
  );
  
  if (totalSize > MAX_MESSAGE_JSONB_BYTES) {
    throw new AppError(
      'Conversation has reached maximum storage size. ' +
      'Please start a new conversation.',
      413
    );
  }
}
```

**2. NEVER store file content in JSONB — only references:**

```typescript
// WRONG — never do this
interface MessageAttachment {
  filename: string;
  content: string; // base64 — THIS WILL DESTROY YOUR DATABASE
  mimeType: string;
}

// CORRECT — store only the R2 reference
interface MessageAttachment {
  filename: string;
  r2Key: string;           // "ai-chat/conv-123/msg-456/document.pdf"
  r2PublicUrl: string;     // CDN URL for display
  mimeType: string;
  fileSizeBytes: number;   // For display only
  uploadedAt: string;      // ISO timestamp
}
```

**3. Add a PostgreSQL-level check constraint:**

```sql
-- Migration: add JSONB size constraint
ALTER TABLE conversations 
ADD CONSTRAINT conversations_messages_size_check 
CHECK (
  pg_column_size(messages) < 524288  -- 512 KB
);

-- Monitor existing conversations approaching the limit
CREATE INDEX idx_conversations_messages_size 
ON conversations ((pg_column_size(messages))) 
WHERE pg_column_size(messages) > 262144; -- Flag at 256 KB
```

**4. Add a monitoring query to run weekly:**

```sql
-- Identify conversations approaching size limits
SELECT 
  id,
  user_id,
  title,
  pg_column_size(messages) as messages_bytes,
  pg_size_pretty(pg_column_size(messages)) as messages_size,
  jsonb_array_length(messages) as message_count,
  created_at,
  updated_at
FROM conversations
WHERE pg_column_size(messages) > 262144  -- 256 KB
ORDER BY pg_column_size(messages) DESC
LIMIT 50;
```

---

## FINDING 2: Soft Delete Integrity — Sidebar Listing Exclusion

**Severity: HIGH**

### The Risk
The plan states it uses "existing soft-delete (status='deleted')" but provides **no verification** that the sidebar listing query actually filters on this status. In a production SaaS, soft-deleted conversations appearing in the sidebar is a data integrity failure — trainers would see "deleted" conversations they believe are gone, potentially including sensitive client discussions.

### The Specific Failure Mode
Soft delete is only safe if **every** query path that lists conversations includes the filter. The common failure pattern:

```typescript
// Developer A writes the original query correctly:
const conversations = await Conversation.findAll({
  where: { userId, status: { [Op.ne]: 'deleted' } }
});

// Developer B adds a new sidebar endpoint 3 months later:
const conversations = await Conversation.findAll({
  where: { userId }  // Forgot the status filter — deleted convos reappear
});

// Developer C adds search:
const conversations = await Conversation.findAll({
  where: { 
    userId,
    title: { [Op.iLike]: `%${query}%` }
    // status filter missing — deleted convos appear in search results
  }
});
```

### Database-Safe Recommendations

**1. Create a Sequelize default scope that cannot be bypassed accidentally:**

```typescript
// models/Conversation.ts
@Table({ tableName: 'conversations' })
class Conversation extends Model {
  
  // Default scope automatically excludes deleted records
  // Developer must explicitly opt-out with .unscoped() — making it visible
  static readonly defaultScope = {
    where: {
      status: { [Op.ne]: 'deleted' }
    }
  };
  
  // Named scope for admin/audit access to deleted records
  static readonly scopes = {
    withDeleted: {},  // Empty scope overrides default
    deletedOnly: {
      where: { status: 'deleted' }
    }
  };
}
```

**2. Write an explicit audit query to verify no leakage:**

```sql
-- Run this before and after any sidebar-related deployment
-- Should return 0 rows if soft-delete is working correctly

-- Check 1: Deleted conversations appearing in any active listing
SELECT 
  c.id,
  c.user_id,
  c.title,
  c.status,
  c.deleted_at,
  'LEAKED_TO_ACTIVE_LISTING' as finding
FROM conversations c
WHERE c.status = 'deleted'
  AND c.deleted_at IS NOT NULL
  AND EXISTS (
    -- Simulate what the sidebar query returns
    SELECT 1 FROM conversations c2 
    WHERE c2.user_id = c.user_id 
      AND c2.id = c.id
      -- If this subquery finds it, the outer query is missing the filter
  );

-- Check 2: Conversations with status='deleted' but no deleted_at timestamp
-- (data integrity inconsistency)
SELECT id, user_id, status, deleted_at
FROM conversations
WHERE status = 'deleted' AND deleted_at IS NULL;

-- Check 3: Conversations with deleted_at set but status != 'deleted'
-- (inverse inconsistency)
SELECT id, user_id, status, deleted_at
FROM conversations  
WHERE deleted_at IS NOT NULL AND status != 'deleted';
```

**3. Enforce dual-field consistency with a database trigger:**

```sql
-- Ensure status and deleted_at are always consistent
CREATE OR REPLACE FUNCTION enforce_soft_delete_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- If status set to 'deleted', ensure deleted_at is set
  IF NEW.status = 'deleted' AND NEW.deleted_at IS NULL THEN
    NEW.deleted_at = NOW();
  END IF;
  
  -- If status changed FROM 'deleted' (restore), clear deleted_at
  IF OLD.status = 'deleted' AND NEW.status != 'deleted' THEN
    NEW.deleted_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_soft_delete_consistency
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_soft_delete_consistency();
```

**4. Integration test that must pass before any sidebar PR merges:**

```typescript
// tests/integration/conversation-soft-delete.test.ts
describe('Soft Delete Integrity', () => {
  it('deleted conversations NEVER appear in sidebar listing', async () => {
    const userId = testUser.id;
    
    // Create and soft-delete a conversation
    const conv = await Conversation.create({ userId, title: 'Secret Session' });
    await conv.update({ status: 'deleted', deletedAt: new Date() });
    
    // Hit every endpoint that could list conversations
    const sidebarResponse = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${testToken}`);
    
    const searchResponse = await request(app)
      .get('/api/conversations/search?q=Secret')
      .set('Authorization', `Bearer ${testToken}`);
    
    // Assert deleted conversation is absent from ALL listing endpoints
    const sidebarIds = sidebarResponse.body.map((c: any) => c.id);
    const searchIds = searchResponse.body.map((c: any) => c.id);
    
    expect(sidebarIds).not.toContain(conv.id);
    expect(searchIds).not.toContain(conv.id);
  });
  
  it('direct access to deleted conversation returns 404, not 403', async () => {
    // 404 prevents enumeration attacks — attacker can't confirm the ID exists
    const response = await request(app)
      .get(`/api/conversations/${deletedConvId}`)
      .set('Authorization', `Bearer ${testToken}`);
    
    expect(response.status).toBe(404);
  });
});
```

---

## FINDING 3: R2 Storage Cleanup — Orphaned Attachments

**Severity: HIGH**

### The Risk
The plan specifies `ai-chat/` as the R2 bucket path for file attachments. When a conversation is soft-deleted (or hard-deleted), the plan provides **no cleanup strategy** for the associated R2 objects. This creates:

1. **Storage cost accumulation** — Orphaned files in R2 that are never cleaned up, billing real money
2. **Privacy violation risk** — Deleted conversations' file attachments remain accessible via their R2 URLs if those URLs are guessable or were bookmarked
3. **GDPR/CCPA exposure** — If a user requests data deletion, soft-deleting the DB record while leaving R2 files is **incomplete deletion** and potentially non-compliant

### The Orphan Accumulation Math
```
Assume: 100 active trainers, 5 file uploads/week each
= 500 files/week added to R2
= 26,000 files/year

If 20% of conversations are deleted without cleanup:
= 5,200 orphaned files/year
= Growing storage cost with zero business value
= Potential privacy liability on every one
```

### The URL Exposure Problem
```
R2 URL pattern: https://[account].r2.cloudflarestorage.com/ai-chat/conv-{id}/msg-{id}/file.pdf

If this URL was:
- Shared in a chat export
- Cached in a browser
- Logged in an access log
- Bookmarked by the trainer

...it remains accessible even after the conversation is "deleted"
```

### Database-Safe Recommendations

**1. Track R2 keys in a dedicated table, not just in JSONB:**

```sql
-- New table: conversation_attachments
-- This is the source of truth for cleanup, not the JSONB
CREATE TABLE conversation_attachments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id),
  message_index     INTEGER NOT NULL,  -- Position in messages JSONB array
  r2_key            TEXT NOT NULL UNIQUE,  -- "ai-chat/conv-123/msg-456/file.pdf"
  original_filename TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  file_size_bytes   BIGINT NOT NULL,
  uploaded_by       UUID NOT NULL REFERENCES users(id),
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,  -- Set when conversation is deleted
  purged_at         TIMESTAMPTZ,  -- Set when R2 object is actually deleted
  
  CONSTRAINT valid_mime_type CHECK (
    mime_type IN (
      'application/pdf',
      'image/jpeg', 
      'image/png',
      'image/webp',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg'
      -- Explicit allowlist — no wildcards
    )
  )
);

-- Index for cleanup job
CREATE INDEX idx_attachments_deleted_not_purged 
ON conversation_attachments (deleted_at) 
WHERE deleted_at IS NOT NULL AND purged_at IS NULL;
```

**2. Implement a cleanup job that runs on conversation deletion:**

```typescript
// services/attachmentCleanupService.ts
export class AttachmentCleanupService {
  
  async onConversationDeleted(
    conversationId: string, 
    transaction: Transaction
  ): Promise<void> {
    // Mark attachments as deleted (within the same transaction)
    await ConversationAttachment.update(
      { deletedAt: new Date() },
      { 
        where: { 
          conversationId,
          deletedAt: null  // Only mark ones not already deleted
        },
        transaction
      }
    );
    
    // Queue async R2 deletion (outside transaction — R2 is not transactional)
    await this.queueR2Cleanup(conversationId);
  }
  
  async purgeR2Objects(conversationId: string): Promise<void> {
    const attachments = await ConversationAttachment.findAll({
      where: {
        conversationId,
        deletedAt: { [Op.ne]: null },
        purgedAt: null
      }
    });
    
    for (const attachment of attachments) {
      try {
        await r2Client.deleteObject({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: attachment.r2Key
        });
        
        await attachment.update({ purgedAt: new Date() });
        
        logger.info('R2 object purged', {
          r2Key: attachment.r2Key,
          conversationId,
          // Do NOT log the filename — could contain PII
        });
        
      } catch (error) {
        // Log but don't throw — partial

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
