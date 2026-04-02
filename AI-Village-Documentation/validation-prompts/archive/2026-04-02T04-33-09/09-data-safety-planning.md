# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 81.5s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-CREATOR-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 9:33:09 PM

---

# Data Safety Audit Report: Bootcamp Creator Upgrade Plan

**Auditor Role:** Production Data Safety Auditor
**Platform:** SwanStudios (sswanstudios.com) — Live Production with Real Paying Customers
**Document Reviewed:** BOOTCAMP-CREATOR-UPGRADE-PLAN.md
**Audit Date:** 2026-04-02
**Audit Scope:** 8 specific data safety questions submitted for review

> ⚠️ **AUDITOR NOTE:** This plan is for the **Bootcamp Creator** feature, NOT the AI Chat system. The 8 questions submitted reference JSONB conversation arrays, R2 storage, voice recording, and sidebar listing — these are **AI Chat system concerns**, not Bootcamp Creator concerns. This audit answers all 8 questions as submitted, mapping each to what the Bootcamp Creator plan actually does or does not address. Where the plan is silent on a concern, that silence is itself a finding.

---

## Executive Summary

| # | Finding | Severity | Status in Plan |
|---|---------|----------|----------------|
| 1 | JSONB conversation growth with attachments | HIGH | ❌ Not addressed — plan is silent |
| 2 | Soft delete integrity for sidebar listing | MEDIUM | ⚠️ Partially addressed by existing pattern |
| 3 | R2 storage cleanup on conversation delete | HIGH | ❌ Not addressed — no cleanup strategy |
| 4 | Voice recording storage and privacy | CRITICAL | ❌ Not addressed — plan is silent |
| 5 | "Zero backend changes" claim for Phase 1 | HIGH | ❌ FALSE — plan explicitly adds schema changes |
| 6 | Concurrent JSONB write race conditions | CRITICAL | ❌ Not addressed — architectural gap |
| 7 | Token usage tracking integrity | LOW | ✅ Low risk, existing system unchanged |
| 8 | Rate limiting for new sidebar endpoints | MEDIUM | ❌ Not addressed — new endpoints unprotected |

**Overall Risk Level: HIGH** — Two CRITICAL findings require resolution before any Phase 1 deployment.

---

## Finding 1: JSONB Conversation Growth with File Attachments

**Severity: HIGH**

### What the Plan Says

The Bootcamp Creator plan embeds a **Coach Assistant** in the right pane (Section 3, Technical Decision #4) via `AITerminalPanel` or `/api/ai-chat`. This means the existing AI Chat JSONB message storage will receive **bootcamp-context messages** — potentially including exercise data, class configurations, and equipment profiles injected as system context.

The plan does not address JSONB size limits anywhere.

### The Actual Risk

```
PostgreSQL JSONB column: 1 GB theoretical max per row
Practical safe limit: ~10-50 MB before performance degrades
Toast threshold: 2 KB (above this, value moves to TOAST table)
```

**What a single bootcamp-context message could contain:**

```json
{
  "role": "system",
  "content": "Current bootcamp config: [full BootcampTemplate JSON] + [EquipmentProfile JSON with 840+ exercise mappings] + [class history for freshness check]",
  "timestamp": "2026-04-02T...",
  "metadata": { "tokenCount": 8000, "model": "gemini-2.5-flash" }
}
```

A single system context injection for a bootcamp session could be **50-200 KB** if it includes:
- Full equipment profile (all items at a location)
- Exercise database subset (exercises matching equipment)
- Recent class history (last 2 weeks of classes for freshness)
- Board 1 + Board 2 exercise lists with modifications

With a 3-brain AI Hive Mind (Gemini Flash → Qwen → Gemini Pro), each model's response is also stored. **One bootcamp generation session = potentially 500 KB–2 MB in a single conversation row.**

### PostgreSQL Behavior at Scale

```sql
-- What happens when JSONB gets large:
-- < 2 KB: Stored inline in heap
-- 2 KB - 1 GB: Moved to TOAST table (transparent, but slower)
-- > ~50 MB: Sequential scans become extremely slow
-- > 100 MB: Risk of out-of-memory errors during JSON parsing
-- > 1 GB: Hard PostgreSQL limit, INSERT will fail with error

-- The danger: No error until you hit the wall
-- A conversation that grows to 800 MB will work fine until it doesn't
```

### Database-Safe Recommendations

**Immediate (before Phase 4 AI integration):**

```sql
-- Add a size guard trigger to the messages column
CREATE OR REPLACE FUNCTION check_conversation_size()
RETURNS TRIGGER AS $$
DECLARE
  message_size_bytes BIGINT;
BEGIN
  message_size_bytes := octet_length(NEW.messages::text);
  
  -- Warn at 5 MB
  IF message_size_bytes > 5242880 THEN
    RAISE WARNING 'Conversation % messages array is % MB — approaching size limit',
      NEW.id, round(message_size_bytes / 1048576.0, 2);
  END IF;
  
  -- Hard block at 50 MB
  IF message_size_bytes > 52428800 THEN
    RAISE EXCEPTION 'Conversation messages array exceeds 50 MB safety limit. Archive old messages first.'
      USING ERRCODE = 'check_violation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_conversation_size_limit
  BEFORE INSERT OR UPDATE ON "Conversations"
  FOR EACH ROW EXECUTE FUNCTION check_conversation_size();
```

**Architectural fix for bootcamp context injection:**

```javascript
// BAD: Injecting full equipment profile into every message
const systemContext = {
  role: 'system',
  content: JSON.stringify(fullEquipmentProfile) // Could be 200 KB
};

// GOOD: Store context reference, not content
const systemContext = {
  role: 'system', 
  content: `Bootcamp context: templateId=${templateId}, equipmentProfileId=${profileId}`,
  metadata: {
    contextType: 'bootcamp',
    templateId: templateId,
    equipmentProfileId: profileId,
    // Resolve at query time, not storage time
  }
};
```

**Add a monitoring query to run weekly:**

```sql
-- Monitor conversation sizes in production
SELECT 
  id,
  "userId",
  jsonb_array_length(messages) as message_count,
  pg_size_pretty(octet_length(messages::text)) as messages_size,
  octet_length(messages::text) as messages_bytes,
  "createdAt",
  "updatedAt"
FROM "Conversations"
WHERE octet_length(messages::text) > 1048576  -- Flag anything over 1 MB
ORDER BY messages_bytes DESC
LIMIT 20;
```

---

## Finding 2: Soft Delete Integrity for Sidebar Listing

**Severity: MEDIUM**

### What the Plan Says

The plan references existing soft-delete via `status='deleted'` (Section 7, Phase 1 mentions database migrations). The Bootcamp Creator has its own models (`BootcampTemplate`, `BootcampClassLog`, etc.) and adds a **sidebar entry** for admin + trainer dashboards (Phase 0, marked ✅ DONE).

### The Actual Risk

The plan does not show the query used for sidebar listing. If the sidebar lists bootcamp templates or class logs, and soft-delete is not consistently applied, deleted templates could appear in the trainer's sidebar — potentially showing a client's private class history that was "deleted."

**The specific risk for Bootcamp Creator:**

```javascript
// DANGEROUS: Missing soft-delete filter
const templates = await BootcampTemplate.findAll({
  where: { trainerId: req.user.id }
  // Missing: status: { [Op.ne]: 'deleted' }
});

// SAFE: Explicit soft-delete exclusion
const templates = await BootcampTemplate.findAll({
  where: { 
    trainerId: req.user.id,
    status: { [Op.ne]: 'deleted' }
    // OR if using deletedAt (paranoid mode):
    // Sequelize paranoid: true handles this automatically
  }
});
```

**Additional risk: The new `BootcampStretch` table** (Phase 3) has no soft-delete design mentioned. If a template is soft-deleted, its associated stretches remain queryable.

### Database-Safe Recommendations

**Verify all listing queries have explicit soft-delete filters:**

```sql
-- Audit query: Find any Bootcamp queries missing status filter
-- Run this against your query logs or ORM query output
-- Look for: SELECT * FROM "BootcampTemplates" WHERE "trainerId" = ?
-- Without: AND "status" != 'deleted' OR AND "deletedAt" IS NULL

-- Recommended: Use Sequelize paranoid mode for all Bootcamp models
// In BootcampTemplate.mjs
BootcampTemplate.init({
  // ... fields
}, {
  sequelize,
  modelName: 'BootcampTemplate',
  paranoid: true,  // Automatically adds deletedAt, filters soft-deleted rows
  // This makes soft-delete automatic — no manual status filter needed
});
```

**For the new BootcampStretch table, add cascade soft-delete:**

```sql
-- When a BootcampTemplate is soft-deleted, 
-- its stretches should also be unreachable
-- Option 1: Add deletedAt to BootcampStretch
ALTER TABLE "BootcampStretches" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE;

-- Option 2: Join-based exclusion (no schema change needed)
SELECT s.* FROM "BootcampStretches" s
JOIN "BootcampTemplates" t ON s."templateId" = t.id
WHERE t."deletedAt" IS NULL  -- Excludes stretches from deleted templates
AND s."deletedAt" IS NULL;
```

---

## Finding 3: R2 Storage Cleanup for Attachments

**Severity: HIGH**

### What the Plan Says

The plan does not mention R2 storage, file attachments, or any cloud storage for the Bootcamp Creator. **However**, the Coach Assistant embed (Phase 4, Technical Decision #4) connects to `/api/ai-chat`, which — per the audit question — stores attachments in an `ai-chat/` R2 bucket path.

When a trainer uses the embedded Coach Assistant to share a photo of their whiteboard or a PDF of a class plan, that file goes to R2. When the conversation is deleted (soft or hard), **the R2 object is not cleaned up** by any mechanism described in this plan.

### The Actual Risk

```
Scenario: Trainer uploads whiteboard photo to Coach Assistant
→ File stored at: r2://swanstudios/ai-chat/{conversationId}/{messageId}/whiteboard.jpg
→ Trainer deletes conversation
→ Conversation row: status='deleted' (soft delete)
→ R2 object: STILL EXISTS, STILL ACCESSIBLE via direct URL
→ 6 months later: Trainer's client whiteboard data sitting in R2 with no owner
→ Storage costs accumulate indefinitely
→ If R2 URL is guessable/leaked: unauthorized access to training data
```

**This is a GDPR/CCPA concern.** If a client's name or health information appears in an uploaded file, soft-deleting the conversation does not satisfy "right to erasure" requirements.

### Database-Safe Recommendations

**Implement a deletion queue pattern:**

```sql
-- Create a cleanup queue table
CREATE TABLE "StorageCleanupQueue" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "storageProvider" VARCHAR(20) NOT NULL DEFAULT 'r2',
  "bucketPath" TEXT NOT NULL,
  "conversationId" UUID REFERENCES "Conversations"(id),
  "scheduledDeleteAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP WITH TIME ZONE,
  "deleteAttempts" INTEGER DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cleanup_queue_scheduled 
  ON "StorageCleanupQueue"("scheduledDeleteAt") 
  WHERE "deletedAt" IS NULL;
```

**Hook into conversation soft-delete:**

```javascript
// In conversation deletion handler
async function softDeleteConversation(conversationId, userId) {
  const transaction = await sequelize.transaction();
  
  try {
    // 1. Get all R2 paths before soft-deleting
    const conversation = await Conversation.findOne({
      where: { id: conversationId, userId },
      transaction
    });
    
    const attachmentPaths = extractR2Paths(conversation.messages);
    
    // 2. Soft-delete the conversation
    await conversation.update({ status: 'deleted' }, { transaction });
    
    // 3. Queue R2 cleanup (don't delete immediately — allow recovery window)
    if (attachmentPaths.length > 0) {
      await StorageCleanupQueue.bulkCreate(
        attachmentPaths.map(path => ({
          storageProvider: 'r2',
          bucketPath: path,
          conversationId: conversationId,
          scheduledDeleteAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7-day grace period
        })),
        { transaction }
      );
    }
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

**Add a scheduled cleanup worker:**

```javascript
// Run every hour via cron
async function processStorageCleanupQueue() {
  const items = await StorageCleanupQueue.findAll({
    where: {
      scheduledDeleteAt: { [Op.lte]: new Date() },
      deletedAt: null,
      deleteAttempts: { [Op.lt]: 3 } // Max 3 attempts
    },
    limit: 100
  });
  
  for (const item of items) {
    try {
      await r2Client.deleteObject({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: item.bucketPath
      });
      await item.update({ deletedAt: new Date() });
    } catch (error) {
      await item.increment('deleteAttempts');
      await item.update({ lastError: error.message });
      logger.error(`R2 cleanup failed for ${item.bucketPath}:`, error);
    }
  }
}
```

---

## Finding 4: Voice Recording Storage and Privacy

**Severity: CRITICAL**

### What the Plan Says

The Bootcamp Creator plan mentions a **"voice-first AI coach"** as a key differentiator in the platform description. The plan does not address voice recording storage, transcription pipeline, or data retention anywhere in its 10 sections.

The Coach Assistant embed (Phase 4) will inherit whatever voice handling the existing AI Chat system uses. **The plan is completely silent on this.**

### The Actual Risk

This is the highest-risk finding in the audit. Voice recordings of fitness coaching sessions may contain:

- **Health information:** "I have a bad knee," "I'm recovering from surgery," "I have high blood pressure"
- **Personal identifiers:** Names, addresses, payment discussions
- **Minor data:** If a client's child is mentioned or present
- **HIPAA-adjacent data:** While fitness coaching isn't strictly HIPAA-covered, health disclosures in voice recordings create significant liability

**Three possible architectures, each with different risk profiles:**

```
Architecture A (SAFE): Stream → Transcribe → Discard
Audio bytes → Gemini API → Text transcript → Store transcript only
Risk: LOW — Audio never persists

Architecture B (RISKY): Store → Transcribe → Keep audio
Audio bytes → R2 storage → Gemini API → Text transcript
Risk: HIGH — Audio stored indefinitely, no cleanup strategy

Architecture C (DANGEROUS): Store → Transcribe → Keep both
Audio bytes → R2 storage → Gemini API → Text transcript → Store both
Risk: CRITICAL — Voice biometric data + health disclosures stored without explicit consent
```

**The plan does not specify which architecture is in use.** This must be determined before Phase 4 deployment.

### Database-Safe Recommendations

**Immediate: Audit the existing voice pipeline:**

```javascript
// Find this code in your AI chat handler and verify:
// Does audio get stored to R2, or only the transcript?

// SAFE pattern (what it should look like):
async function handle

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
