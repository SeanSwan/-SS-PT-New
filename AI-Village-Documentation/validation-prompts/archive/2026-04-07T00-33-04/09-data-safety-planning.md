# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 79.3s
> **Files:** docs/ai-workflow/AI-HANDOFF/MASTER-FIX-PLAN-2026-04-06.md
> **Generated:** 4/6/2026, 5:33:04 PM

---

# DATA SAFETY AUDIT REPORT
## SwanStudios SaaS Platform — Master Fix Plan 2026-04-06
### Auditor Role: Production Data Safety Review
### Classification: PRODUCTION SYSTEM — Real User Data at Risk

---

> **AUDITOR NOTE**: This plan is primarily a bug-fix/refactor plan for existing features (P0 blockers, code quality, security hardening, UX). It does **not** introduce the AI chat sidebar, R2 storage, voice recording, or JSONB conversation features described in questions 1–4. Those features are **absent from the reviewed document**. This audit will:
> - Answer each question based on what the plan *does* contain
> - Flag where the plan is **silent** on data safety concerns that *should* be addressed
> - Rate findings against the actual plan text, not hypothetical future features
> - Treat silences as findings where production data is at risk

---

## FINDING INDEX

| # | Topic | Severity | Status in Plan |
|---|-------|----------|----------------|
| F-01 | JSONB Conversation Growth | HIGH | ⚠️ NOT ADDRESSED — Feature absent from plan |
| F-02 | Soft Delete Integrity | CRITICAL | ⚠️ NOT ADDRESSED — Plan silent |
| F-03 | R2 Storage Cleanup | HIGH | ⚠️ NOT ADDRESSED — Feature absent from plan |
| F-04 | Voice Recording Privacy | CRITICAL | ⚠️ NOT ADDRESSED — Feature absent from plan |
| F-05 | Migration Safety / "Zero Backend Changes" | HIGH | ✅ Partially addressed — verify required |
| F-06 | Concurrent JSONB Access Race Condition | CRITICAL | ⚠️ NOT ADDRESSED — Feature absent from plan |
| F-07 | Token Usage Tracking Integrity | MEDIUM | ⚠️ NOT ADDRESSED — Plan silent |
| F-08 | Rate Limiting Adequacy | HIGH | ⚠️ Partially addressed — gaps remain |

---

## DETAILED FINDINGS

---

### F-01 — JSONB Conversation Growth with File Attachments
**Severity: HIGH**
**Plan Status: FEATURE NOT IN THIS PLAN — No AI chat sidebar or JSONB conversation storage appears anywhere in the reviewed document**

#### What the Plan Contains
The plan contains no AI chat sidebar implementation, no JSONB message storage, and no file attachment handling. DESIGN-3 specifies a "Coach Assistant Chat UI" visual spec only (glassmorphism container, bubble colors) with zero backend data design.

#### Why This Is Still a HIGH Finding
If this UI spec (DESIGN-3) is implemented by a developer following this plan, there is **no data architecture guidance whatsoever**. A developer will make ad-hoc decisions about storage that could cause production data loss or unbounded growth.

#### PostgreSQL JSONB Size Reality
```
PostgreSQL row size limit: 1.6 GB (theoretical)
PostgreSQL TOAST threshold: 2 KB (row goes to TOAST storage)
Practical JSONB conversation limit: No hard cap, but:
  - 1000 messages × 500 chars avg = ~500 KB (fine)
  - 1000 messages × base64 image = 50-500 MB (catastrophic)
  - Single voice transcript + metadata = 2-10 KB per message (manageable)

TOAST storage: Automatic for rows > 2KB, but:
  - TOAST rows cannot be partially updated
  - Full JSONB array must be rewritten on every append
  - At 10MB+, every message append rewrites 10MB to disk
  - At 100MB+, this causes table bloat and index corruption risk
```

#### Database-Safe Recommendations

**IMMEDIATE — Before any chat feature ships:**

```sql
-- DO NOT store messages as JSONB array on conversation row
-- CORRECT pattern: separate messages table

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Attachments: reference only, never inline binary
  attachment_refs JSONB DEFAULT '[]'::jsonb
);

-- attachment_refs stores R2 keys, NOT base64 data:
-- [{"key": "ai-chat/user-123/conv-456/file-789.pdf", "mime": "application/pdf", "size_bytes": 204800}]

CREATE INDEX idx_ai_messages_conversation_id
  ON ai_messages(conversation_id, created_at DESC);

-- Hard limit enforcement at application layer:
-- Max 500 messages per conversation before archival
-- Max attachment size: 10MB per file, enforced in upload middleware
-- Max total attachment storage per user: configurable per plan tier
```

**If JSONB array is already in production (existing schema):**
```sql
-- Add size monitoring immediately
CREATE OR REPLACE FUNCTION check_conversation_size()
RETURNS TRIGGER AS $$
BEGIN
  IF octet_length(NEW.messages::text) > 1048576 THEN -- 1MB warning
    RAISE WARNING 'Conversation % exceeds 1MB: %KB',
      NEW.id,
      octet_length(NEW.messages::text) / 1024;
  END IF;
  IF octet_length(NEW.messages::text) > 10485760 THEN -- 10MB block
    RAISE EXCEPTION 'Conversation size limit exceeded. Archive required.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_conversation_size_limit
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION check_conversation_size();
```

---

### F-02 — Soft Delete Integrity
**Severity: CRITICAL**
**Plan Status: NOT ADDRESSED — Plan references soft delete pattern in passing but provides zero verification**

#### What the Plan Contains
The plan contains **no mention** of soft delete verification for any entity. SEC-4 mentions IDOR vulnerability assessment but does not connect it to soft-delete bypass. No query audit is specified.

#### Why This Is CRITICAL
Soft delete (`status='deleted'`) is only safe if **every query** that lists or loads data includes `WHERE status != 'deleted'`. A single missing WHERE clause exposes deleted user data to other users. On a SaaS platform with paying customers, this is a data breach vector.

#### Specific Risk Scenarios for SwanStudios
```
Scenario A: Trainer deletes a client's workout plan
  → Client's dashboard still shows deleted plan if query lacks status filter
  → Client sees data they believe was removed

Scenario B: User deletes their account (status='deleted')
  → Another user with admin access queries all clients
  → Deleted user's PII appears in admin list
  → GDPR/CCPA violation

Scenario C: AI conversation marked deleted
  → Sidebar listing query lacks status filter
  → Deleted conversation reappears after page refresh
  → User data integrity failure, support ticket, trust loss

Scenario D: Session soft-deleted (P0-2 adds new session routes)
  → New /upcoming/:userId and /history/:userId routes added by P0-2
  → Developer writes query without status filter
  → Deleted sessions appear in client's upcoming list
```

#### Database-Safe Recommendations

**CRITICAL — Audit required before P0-2 ships:**

```javascript
// P0-2 adds new session routes. MANDATORY pattern for both new routes:

router.get('/upcoming/:userId', protect, async (req, res) => {
  const sessions = await Session.findAll({
    where: {
      [Op.or]: [
        { trainerId: req.params.userId },
        { clientId: req.params.userId }
      ],
      scheduledAt: { [Op.gt]: new Date() },
      status: { [Op.notIn]: ['deleted', 'cancelled'] }, // ← MANDATORY
      deletedAt: null  // ← if using paranoid mode
    }
  });
});
```

**Sequelize Paranoid Mode — Strongly Recommended:**
```javascript
// In Session model definition:
const Session = sequelize.define('Session', {
  // ... fields
}, {
  paranoid: true,  // Automatically adds deletedAt, excludes from all queries
  // This is safer than manual status checks — Sequelize handles it automatically
});

// WARNING: paranoid mode does NOT protect against raw SQL queries
// All raw queries must still include: WHERE deleted_at IS NULL
```

**Audit Query — Run Against Production Before Deploying P0-2:**
```sql
-- Find all queries missing soft-delete filter
-- (Manual code review required — this finds the data risk)
SELECT
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE tablename IN ('sessions', 'workout_plans', 'ai_conversations', 'users')
ORDER BY n_live_tup DESC;

-- Check for orphaned soft-deleted records that are still being served:
SELECT COUNT(*) as deleted_sessions_count
FROM sessions
WHERE status = 'deleted' OR deleted_at IS NOT NULL;
-- If this returns > 0, verify no active queries are returning these rows
```

---

### F-03 — R2 Storage Cleanup Strategy
**Severity: HIGH**
**Plan Status: FEATURE NOT IN THIS PLAN — No R2 storage, no file upload infrastructure appears in the reviewed document**

#### What the Plan Contains
Zero mention of Cloudflare R2, file storage, attachment handling, or any object storage. The plan does not introduce file uploads.

#### Why This Is Still HIGH
The question implies R2 storage is either planned or already exists. If it exists and this plan ships without addressing cleanup, deleted conversations will leave orphaned files in R2 indefinitely. This is both a cost issue and a **data retention compliance issue** (GDPR Article 17 — right to erasure).

#### Database-Safe Recommendations

**If R2 storage exists or is planned, this plan MUST include:**

```javascript
// Pattern: Never delete R2 objects synchronously in request handler
// Pattern: Use a cleanup job with database-backed queue

// 1. When conversation is soft-deleted, queue R2 cleanup:
async function softDeleteConversation(conversationId, userId) {
  const transaction = await sequelize.transaction();
  try {
    // Soft delete the conversation
    await Conversation.update(
      { status: 'deleted', deletedAt: new Date() },
      { where: { id: conversationId, userId }, transaction }
    );

    // Queue R2 cleanup — do NOT delete R2 objects here
    // R2 deletion is async, non-transactional, can fail
    await R2CleanupQueue.create({
      conversationId,
      scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day grace period
      status: 'pending'
    }, { transaction });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// 2. Cleanup worker (runs daily):
async function processR2CleanupQueue() {
  const jobs = await R2CleanupQueue.findAll({
    where: {
      scheduledFor: { [Op.lte]: new Date() },
      status: 'pending'
    },
    limit: 100
  });

  for (const job of jobs) {
    try {
      const attachments = await getAttachmentKeysForConversation(job.conversationId);
      await Promise.all(attachments.map(key => r2Client.deleteObject(key)));
      await job.update({ status: 'completed', completedAt: new Date() });
    } catch (err) {
      await job.update({
        status: 'failed',
        errorMessage: err.message,
        retryCount: job.retryCount + 1
      });
      // Alert if retryCount > 3
    }
  }
}
```

**GDPR/CCPA Compliance Requirement:**
```
Right to Erasure (GDPR Art. 17) requires:
- R2 objects deleted within 30 days of deletion request
- Audit log of deletion completion
- No backup copies retained beyond stated retention period

SwanStudios must document:
- Retention period for AI conversation attachments
- Retention period for voice recordings (see F-04)
- Deletion verification mechanism
```

---

### F-04 — Voice Recording Storage and Privacy
**Severity: CRITICAL**
**Plan Status: NOT ADDRESSED — No voice recording handling, no audio data lifecycle, no privacy policy alignment**

#### What the Plan Contains
DESIGN-2 mentions a "Thinking Indicator" (visual). DESIGN-3 mentions "Coach Assistant Chat UI." Neither addresses voice data. The plan is completely silent on audio data handling.

#### Why This Is CRITICAL
Voice recordings are **biometric-adjacent data** under several privacy frameworks:
- **GDPR**: Special category data if used for identification
- **CCPA**: Biometric information category
- **BIPA (Illinois)**: Explicit consent + retention limits required
- **SwanStudios target market** (wealthy clients, 30-55): High privacy expectations, high litigation risk

#### Risk Matrix for Voice Data
```
IF voice audio is sent to Gemini API and discarded:
  ✓ Lower storage risk
  ✗ Google's data retention policy applies to API inputs
  ✗ Must be disclosed in privacy policy
  ✗ User consent required before first recording

IF voice audio is stored in R2:
  ✗ GDPR Art. 9 may apply (health/biometric data)
  ✗ Explicit consent required (not just ToS checkbox)
  ✗ Right to erasure applies with 30-day deadline
  ✗ Must be encrypted at rest (AES-256 minimum)
  ✗ Access logs required

IF voice transcripts are stored (text only):
  ✓ Lower regulatory risk than audio
  ✗ Still PII — health/fitness context makes it sensitive
  ✗ Must be included in data export (GDPR Art. 20)
  ✗ Must be deleted on account deletion
```

#### Database-Safe Recommendations

**BEFORE any voice feature ships:**

```javascript
// 1. Consent gate — MANDATORY before first recording
const VoiceConsentSchema = {
  userId: UUID,
  consentGiven: BOOLEAN,
  consentTimestamp: TIMESTAMPTZ,
  consentVersion: VARCHAR(20), // Track which privacy policy version
  ipAddress: INET, // For consent audit trail
  processingPurpose: VARCHAR(100) // 'transcription_only' | 'stored_coaching'
};

// 2. Audio handling — transcribe-and-discard pattern (RECOMMENDED)
async function processVoiceMessage(audioBuffer, userId) {
  // Validate: never log audio buffer to application logs
  const transcript = await geminiClient.transcribeAudio(audioBuffer);

  // audioBuffer goes out of scope here — GC handles it
  // DO NOT: store audioBuffer to disk, S3, R2, or database
  // DO NOT: log audioBuffer size or hash (fingerprinting risk)

  return {
    transcript,
    processingMethod: 'gemini_transcribe_discard',
    audioRetained: false
  };
}

// 3. If transcripts are stored, mark them appropriately:
// In ai_messages table:
// source_type: 'voice_transcript' | 'text_input'
// This enables targeted deletion if user revokes voice consent
```

**Privacy Policy Requirement (Non-Technical but CRITICAL):**
```
SwanStudios privacy policy MUST state before voice feature launch:
1. What audio data is sent to (Gemini/Google)
2. Whether audio is retained after transcription
3. Whether transcripts are stored and for how long
4. How to request deletion of voice data
5. Third-party sub-processors (Google, Cloudflare)

Failure to disclose = regulatory violation regardless of technical implementation
```

---

### F-05 — Migration Safety / "Zero Backend Changes" Claim
**Severity: HIGH**
**Plan Status: PARTIALLY ADDRESSED — Plan makes implicit "zero backend changes" assumption for Phase 1, but P0 phases add new routes and modify existing ones**

#### What the Plan Contains
The plan does NOT explicitly claim "zero backend changes for Phase 1" — that claim appears to come from context outside this document. However, the plan **does** make these backend changes:

| Phase |

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
