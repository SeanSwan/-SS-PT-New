# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 66.4s
> **Files:** backend/services/voiceTranscriptionService.mjs, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/components/AIAssistant/VoiceUpload.tsx, backend/routes/aiChatRoutes.mjs
> **Generated:** 3/20/2026, 2:09:12 AM

---

# DATA SAFETY AUDIT REPORT — SwanStudios Voice Transcription & AI Chat

**Audit Date:** 2025-01-20  
**Auditor:** Data Safety Auditor  
**Scope:** Voice transcription service, AI chat routes, dictation UI components  
**Production URL:** sswanstudios.com

---

## EXECUTIVE SUMMARY

**CRITICAL FINDINGS:** 0  
**HIGH SEVERITY:** 2  
**MEDIUM SEVERITY:** 3  
**LOW SEVERITY:** 2

**Overall Risk Level:** MEDIUM

The codebase shows **good data safety practices** with no destructive database operations, proper soft-deletes, and transaction safety. However, there are **significant risks** around:
1. **Memory leaks** that could crash the production server (HIGH)
2. **Unbounded data growth** in conversation messages (HIGH)
3. **Missing transaction wrappers** for multi-step operations (MEDIUM)

---

## FINDINGS

### 🔴 HIGH SEVERITY

---

#### **FINDING H-1: Memory Leak Risk — In-Memory Rate Limiter Without Bounds**

**Severity:** HIGH  
**Data at Risk:** Server availability, all user sessions  
**Blast Radius:** ALL USERS (server crash would terminate all active sessions)  
**File:** `backend/services/voiceTranscriptionService.mjs`  
**Lines:** 13-14, 42-47

**What's Wrong:**

The `userTranscriptions` Map stores per-user rate limit data in memory with a cleanup interval, but:

1. **No maximum size limit** — if an attacker creates 100,000 user accounts and makes 1 transcription each, the Map grows to 100K entries
2. **Cleanup runs every 30 minutes** — between cleanups, memory can grow unbounded
3. **No process restart recovery** — rate limits reset on server restart, allowing users to bypass limits by timing requests around deployments

```mjs
const userTranscriptions = new Map(); // ⚠️ No size limit
const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of userTranscriptions.entries()) {
    if (entry.resetAt < now) userTranscriptions.delete(id);
  }
}, 30 * 60 * 1000); // Only cleans every 30 min
```

**Risk Scenario:**
- Attacker creates 50,000 accounts via automated signup
- Each account makes 1 transcription request
- Map grows to 50K entries × ~100 bytes = 5MB
- Over multiple attack waves, memory grows to hundreds of MB
- Node.js process hits memory limit and crashes
- **ALL USERS LOSE THEIR ACTIVE SESSIONS** (JWT tokens remain valid, but WebSocket connections drop, in-progress requests fail)

**Fix:**

```mjs
// Add LRU cache with maximum size
import LRU from 'lru-cache';

const userTranscriptions = new LRU({
  max: 10000, // Maximum 10K users tracked
  ttl: 60 * 60 * 1000, // 1 hour TTL
  updateAgeOnGet: false,
});

export function checkTranscriptionLimit(userId) {
  const now = Date.now();
  const entry = userTranscriptions.get(userId);

  if (!entry || entry.resetAt < now) {
    userTranscriptions.set(userId, { count: 0, resetAt: now + 60 * 60 * 1000 });
    return { allowed: true, remaining: MAX_TRANSCRIPTIONS_PER_HOUR };
  }

  const remaining = MAX_TRANSCRIPTIONS_PER_HOUR - entry.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

// Remove manual cleanup interval (LRU handles it)
```

**Alternative Fix (Database-Backed):**
For production resilience, store rate limits in Redis or PostgreSQL:

```mjs
// Use PostgreSQL with a rate_limits table
async function checkTranscriptionLimit(userId) {
  const result = await sequelize.query(`
    INSERT INTO rate_limits (user_id, resource, count, reset_at)
    VALUES (:userId, 'transcription', 1, NOW() + INTERVAL '1 hour')
    ON CONFLICT (user_id, resource)
    DO UPDATE SET
      count = CASE
        WHEN rate_limits.reset_at < NOW() THEN 1
        ELSE rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at < NOW() THEN NOW() + INTERVAL '1 hour'
        ELSE rate_limits.reset_at
      END
    RETURNING count, reset_at
  `, { replacements: { userId }, type: QueryTypes.SELECT });
  
  const { count } = result[0];
  return {
    allowed: count <= MAX_TRANSCRIPTIONS_PER_HOUR,
    remaining: Math.max(0, MAX_TRANSCRIPTIONS_PER_HOUR - count)
  };
}
```

---

#### **FINDING H-2: Unbounded Conversation Growth — Potential Database Bloat**

**Severity:** HIGH  
**Data at Risk:** Database performance, conversation history integrity  
**Blast Radius:** ALL USERS (database slowdown affects entire platform)  
**File:** `backend/routes/aiChatRoutes.mjs`  
**Lines:** 229-233

**What's Wrong:**

The conversation message limit is checked AFTER fetching the conversation from the database:

```mjs
if (conversation.messages && conversation.messages.length >= 200) {
  return res.status(400).json({ success: false, error: 'Conversation limit reached (100 exchanges)...' });
}
```

**Problems:**

1. **Inconsistent limit** — code checks `>= 200` but error says "100 exchanges" (200 messages = 100 exchanges, but confusing)
2. **JSONB column bloat** — each conversation stores ALL messages in a single JSONB column, which grows without bound until the 200-message limit
3. **No archival strategy** — old conversations with 200 messages remain in the `messages` JSONB forever, slowing down queries
4. **Race condition** — two simultaneous requests could both pass the length check and add messages, exceeding the limit

**Risk Scenario:**
- User has 50 conversations, each with 200 messages
- Each message averages 500 characters
- Total data per user: 50 × 200 × 500 = 5MB of JSONB data
- With 10,000 active users: 50GB of conversation data in a single table
- PostgreSQL JSONB queries slow down as column size grows
- **Backup/restore times increase**, risking data loss during incidents

**Fix:**

```mjs
// 1. Add database constraint to prevent over-limit inserts
// Migration: add a CHECK constraint
await queryInterface.sequelize.query(`
  ALTER TABLE ai_conversations
  ADD CONSTRAINT messages_count_limit
  CHECK (jsonb_array_length(messages) <= 200)
`);

// 2. Use a transaction with row-level lock to prevent race conditions
router.post('/conversations/:id/messages', aiRateLimiter, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const conversation = await AiConversation.findOne({
      where: { id: req.params.id, userId: req.user.id, status: 'active' },
      lock: transaction.LOCK.UPDATE, // Row-level lock
      transaction,
    });

    if (!conversation) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Active conversation not found' });
    }

    // Check limit BEFORE adding messages
    if (conversation.messages.length >= 200) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Conversation limit reached (200 messages). Please start a new conversation.',
      });
    }

    // ... rest of message processing ...

    await conversation.save({ transaction });
    await transaction.commit();

    return res.json({ success: true, ... });
  } catch (err) {
    await transaction.rollback();
    logger.error('[AIChatRoutes] Send message error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// 3. Add archival job to move old messages to separate table
// Run daily via cron
async function archiveOldConversations() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  const oldConvos = await AiConversation.findAll({
    where: {
      lastMessageAt: { [Op.lt]: cutoff },
      status: 'active',
    },
  });

  for (const convo of oldConvos) {
    await ArchivedConversation.create({
      conversationId: convo.id,
      userId: convo.userId,
      messages: convo.messages,
      archivedAt: new Date(),
    });
    await convo.update({ messages: [], status: 'archived' });
  }
}
```

---

### 🟡 MEDIUM SEVERITY

---

#### **FINDING M-1: Missing Transaction Wrapper for AI Data Updates**

**Severity:** MEDIUM  
**Data at Risk:** Client profile data, workout plans, macro targets  
**Blast Radius:** 1 USER per failed request (data left in inconsistent state)  
**File:** `backend/routes/aiChatRoutes.mjs`  
**Lines:** 276-295

**What's Wrong:**

The AI data update flow calls `processAIDataUpdates()` OUTSIDE the conversation update transaction:

```mjs
await conversation.update({
  messages: updatedMessages,
  messageCount: updatedMessages.length,
  lastMessageAt: new Date(),
  metadata: updatedMetadata,
  title: conversation.title || generateTitle(message.trim()),
});

// ⚠️ No transaction wrapper — if this fails, conversation is updated but data isn't
let dataUpdateResult = null;
if (aiResult.content && (conversation.role === 'admin' || conversation.role === 'trainer')) {
  try {
    const actionMatch = aiResult.content.match(/```json\s*(\{[\s\S]*?"action"\s*:\s*"update_client_data"[\s\S]*?\})\s*```/);
    if (actionMatch) {
      const actionPayload = JSON.parse(actionMatch[1]);
      const targetId = conversation.targetUserId;
      if (targetId && actionPayload.updates) {
        dataUpdateResult = await processAIDataUpdates(
          targetId,
          actionPayload.updates,
          req.user.id,
          sequelize
        );
      }
    }
  } catch (parseErr) {
    logger.warn('[AIChatRoutes] Failed to parse AI data update action:', parseErr.message);
  }
}
```

**Risk Scenario:**
1. Trainer asks AI to update client's macro targets
2. AI responds with update action
3. Conversation is saved with the AI's response
4. `processAIDataUpdates()` fails due to validation error
5. **Conversation shows "I've updated your macros" but the database wasn't changed**
6. Client sees incorrect data, trainer thinks update succeeded

**Fix:**

```mjs
// Wrap entire operation in a transaction
const transaction = await sequelize.transaction();
try {
  // ... AI message generation ...

  // Update conversation
  await conversation.update({
    messages: updatedMessages,
    messageCount: updatedMessages.length,
    lastMessageAt: new Date(),
    metadata: updatedMetadata,
    title: conversation.title || generateTitle(message.trim()),
  }, { transaction });

  // Process data updates in same transaction
  let dataUpdateResult = null;
  if (aiResult.content && (conversation.role === 'admin' || conversation.role === 'trainer')) {
    const actionMatch = aiResult.content.match(/```json\s*(\{[\s\S]*?"action"\s*:\s*"update_client_data"[\s\S]*?\})\s*```/);
    if (actionMatch) {
      const actionPayload = JSON.parse(actionMatch[1]);
      const targetId = conversation.targetUserId;
      if (targetId && actionPayload.updates) {
        dataUpdateResult = await processAIDataUpdates(
          targetId,
          actionPayload.updates,
          req.user.id,
          sequelize,
          transaction // Pass transaction to data update service
        );
        
        // If data update failed, rollback conversation too
        if (dataUpdateResult.errors.length > 0 && dataUpdateResult.successful === 0) {
          throw new Error('All data updates failed');
        }
      }
    }
  }

  await transaction.commit();
  return res.json({ success: true, ... });
} catch (err) {
  await transaction.rollback();
  logger.error('[AIChatRoutes] Transaction failed:', err.message);
  return res.status(500).json({ success: false, error: 'Failed to process message' });
}
```

---

#### **FINDING M-2: Potential PII Exposure in Transcription Logs**

**Severity:** MEDIUM  
**Data at Risk:** User voice transcripts (may contain health data, personal info)  
**Blast Radius:** ALL TRANSCRIPTION USERS (logs persist indefinitely)  
**File:** `backend/services/voiceTranscriptionService.mjs`  
**Lines:** 117-125

**What's Wrong:**

The transcription service logs the full transcript text:

```mjs
logger.info('[VoiceTranscription] Transcription complete', {
  filename,
  model,
  audioSizeKB: Math.round(buffer.length / 1024),
  transcriptLength: transcript.length, // ⚠️ Logs length but not content (GOOD)
  inputTokens: data?.usageMetadata?.promptTokenCount,
  outputTokens: data?.usageMetadata?.candidatesTokenCount,
});
```

**Current State:** The code does NOT log transcript content (only length), which is GOOD. However:

1. **No explicit PII scrubbing policy** — if a developer adds `transcript: transcript.substring(0, 100)` for debugging, PII leaks
2. **Error messages may contain transcript snippets** — if Gemini API returns an error with the input text, it could be logged
3. **No log retention policy documented** — logs may persist indefinitely in production

**Risk Scenario:**
- User dictates: "My weight is 185 lbs, I'm taking metformin for diabetes"
- Transcription succeeds, but a future code change adds debug logging
- Transcript is logged to CloudWatch/Datadog
- **Health data (PHI under HIPAA) is now in logs accessible to all engineers**

**Fix:**

```mjs
// 1. Add explicit PII scrubbing utility
function sanitizeForLogging(text, maxLength = 50) {
  if (!text) return '[empty]';
  // Remove common PII patterns
  const scrubbed = text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]') // Phone
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email
    .replace(/\b\d{1,3}\s?(lbs?|kg|pounds?|kilograms?)\b/gi, '[WEIGHT]') // Weight
    .substring(0, maxLength);
  return scrubbed + (text.length > maxLength ? '...' : '');
}

logger.info('[VoiceTranscription] Transcription complete', {
  filename,
  model,
  audioSizeKB: Math.round(buffer.length / 1024),
  transcriptLength: transcript.length,
  transcriptPreview: sanitizeForLogging(transcript, 30), // Safe preview
  inputTokens: data?.usageMetadata?.promptTokenCount,
  output

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
