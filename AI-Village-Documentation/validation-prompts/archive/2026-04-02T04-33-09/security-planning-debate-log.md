# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 13,729 input / 5,416 output

---

## Primary Security Planner — Round 1

# SECURITY AUDIT REPORT: BOOTCAMP CREATOR UPGRADE PLAN

**Auditor:** Primary Security Lead  
**Document:** `docs/ai-workflow/blueprints/BOOTCAMP-CREATOR-UPGRADE-PLAN.md`  
**Date:** 2026-04-02  
**Status:** **BLOCKED** — 4 CRITICAL, 7 HIGH, 3 MEDIUM findings require resolution before Phase 0

---

## EXECUTIVE SUMMARY

The Bootcamp Creator upgrade introduces **multiple critical security violations** that directly conflict with SwanStudios' security policies and compliance obligations. The plan's enthusiasm for AI integration has **completely overlooked data protection fundamentals**. Most alarming:

1. **ZERO PII TO LLMs POLICY** is being violated by design — the plan explicitly sends client injury/health data to external AI providers without sanitization.
2. **Voice recordings** (biometric data) are mentioned as a feature but have **zero privacy controls, storage policies, or consent mechanisms**.
3. **File uploads** for equipment profiles lack any security validation, creating malware/SSRF risks.
4. **Database race conditions** in JSONB conversation storage could corrupt client data.

**DO NOT PROCEED** to Phase 0 until all CRITICAL findings are resolved with documented mitigations.

---

## CRITICAL FINDINGS (BLOCKERS)

### 🔴 CRITICAL-1: PII Exposure to External LLMs (Policy Violation)

**Finding:** The plan states AI receives "recent class history" and "injury flags for the class" (Section 3, AI Hive Mind Integration). This includes:
- Client names, identifiers from class history
- Specific injury data (knee/shoulder/back issues)
- Exercise preferences and performance history
- Health conditions affecting workout modifications

**Violation:** Direct breach of **ZERO PII TO LLMs policy**. Sending protected health information (PHI) to Gemini/Qwen violates:
- HIPAA (if US clients with health data)
- GDPR Article 9 (special category data)
- CCPA/CPRA
- SwanStudios' own privacy policy

**Impact:** Regulatory fines, lawsuits, loss of enterprise clients, forced feature shutdown.

**Required Mitigations (ALL mandatory):**

1. **PII Sanitization Layer** (Backend - `bootcampGenerator.mjs`):
```javascript
// BEFORE sending to any AI provider
function sanitizeClassHistory(classHistory) {
  return {
    equipment: classHistory.equipment, // OK
    exerciseTypes: classHistory.exerciseTypes, // OK
    duration: classHistory.duration, // OK
    format: classHistory.format, // OK
    // AGGREGATE ONLY - no individual identifiers
    injuryCounts: {
      knee: classHistory.clients.filter(c => c.kneeIssue).length,
      shoulder: classHistory.clients.filter(c => c.shoulderIssue).length,
      back: classHistory.clients.filter(c => c.backIssue).length
    },
    abilityRange: {
      beginner: classHistory.clients.filter(c => c.level === 'beginner').length,
      intermediate: classHistory.clients.filter(c => c.level === 'intermediate').length,
      advanced: classHistory.clients.filter(c => c.level === 'advanced').length
    },
    // REMOVE: client.name, client.email, client.id, client.healthRecords
  };
}
```

2. **Whitelist Schema Enforcement**:
```javascript
const AI_PAYLOAD_SCHEMA = {
  type: 'object',
  properties: {
    equipment: { type: 'array', items: { type: 'string' } },
    exerciseTypes: { type: 'array', items: { type: 'string' } },
    duration: { type: 'number' },
    format: { type: 'string' },
    injuryCounts: {
      type: 'object',
      properties: {
        knee: { type: 'number' },
        shoulder: { type: 'number' },
        back: { type: 'number' },
        wrist: { type: 'number' },
        ankle: { type: 'number' }
      }
    },
    abilityRange: {
      type: 'object',
      properties: {
        beginner: { type: 'number' },
        intermediate: { type: 'number' },
        advanced: { type: 'number' }
      }
    }
  },
  required: ['equipment', 'exerciseTypes', 'duration', 'format']
};
// Reject any payload with extra fields
```

3. **Proxy Architecture**:
   - Route all AI requests through `backend/services/aiSanitizationProxy.mjs`
   - Proxy validates payload against schema, strips non-whitelisted fields
   - Proxy logs pre/post sanitization for audit trail
   - Never send raw class history to AI providers

4. **Policy Updates**:
   - Update Privacy Policy: "We use aggregated, anonymized class data to improve AI recommendations. No individual client data is shared."
   - Add Data Processing Addendum (DPA) with AI providers confirming they don't store PHI
   - Train staff: "Never include client names in Coach Assistant conversations"

5. **Audit Controls**:
   - Log all AI payloads (sanitized version) to `ai_audit_logs` table
   - Weekly review: "Did any payload contain PII fields?" (should be 0)
   - Alert on schema violations (unknown fields detected)

**Verification Required:** Provide code review of sanitization implementation + DPA signatures from AI providers before Phase 1.

---

### 🔴 CRITICAL-2: Voice Recording Privacy & Storage

**Finding:** The plan mentions "voice-first AI coach" and "voice recording" in multiple sections but provides **zero security controls**:
- No consent mechanism for recording
- No encryption at rest for voice blobs
- No retention policy (how long are recordings stored?)
- No access controls (who can listen to recordings?)
- No data subject rights (can clients request deletion?)
- Voice = biometric data under GDPR/CCPA → special protections required

**Impact:** Biometric data breach, regulatory action, class-action lawsuits.

**Required Mitigations:**

1. **Explicit Consent Flow**:
   - Before ANY recording: "We'll record your voice to generate workout suggestions. Recordings are stored encrypted and deleted after 30 days. [Allow] [Deny]"
   - Store consent timestamp + IP in `voice_consent_logs`
   - Deny = disable voice features entirely

2. **Encryption & Storage**:
```javascript
// Store voice recordings in R2 with:
// - Server-side encryption (SSE-S3 or SSE-KMS)
// - Bucket policy: private, no public access
// - Object key: UUID only (no PII in filename)
// - Metadata: { userId: 'uuid', consentTimestamp: 'iso', retentionUntil: 'iso' }
```

3. **Retention & Deletion Policy**:
   - Auto-delete recordings after **30 days** via cron job
   - Immediate deletion on user request (GDPR Article 17)
   - Soft delete first, hard delete after 7 days
   - Audit log of all deletions

4. **Access Controls**:
   - Only `trainer:role` can access voice recordings (RBAC)
   - Never accessible by `admin:role` unless investigating abuse
   - All access logged: `voice_access_logs` (who, what, when, why)
   - No bulk export of voice data

5. **Data Minimization**:
   - Process voice in chunks (3-second intervals) — don't store full session
   - Delete chunk immediately after transcription/processing
   - Only retain final text transcript (if needed) — not raw audio

6. **Technical Implementation**:
```javascript
// In MediaRecorder implementation
const recorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus'
});
// Chunk every 3 seconds
recorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    uploadChunk(event.data, sessionId, chunkIndex);
    // Delete local blob immediately after upload
    URL.revokeObjectURL(event.data);
  }
};
```

**Verification Required:** Complete voice privacy implementation + consent UI mockups before Phase 4.

---

### 🔴 CRITICAL-3: Concurrent JSONB Write Race Conditions

**Finding:** The plan embeds Coach Assistant in `BootcampBuilderPage` with real-time updates. Multiple users (trainer + AI) may write to the same `ai_chat_conversations` JSONB `messages` array simultaneously, causing:
- Lost updates (last write wins)
- Corrupted JSON (partial writes)
- Conversation history gaps

**Impact:** Data loss, corrupted AI conversations, broken continuity for trainers.

**Required Mitigations:**

1. **Optimistic Locking with Version Vector**:
```sql
-- Add version column to ai_chat_conversations
ALTER TABLE ai_chat_conversations ADD COLUMN version INTEGER DEFAULT 0;

-- Update with version check
UPDATE ai_chat_conversations 
SET messages = ?, version = version + 1
WHERE id = ? AND version = ?;
```

2. **Backend Service Lock** (`backend/services/aiChatConcurrency.mjs`):
```javascript
class ConversationLock {
  constructor() {
    this.locks = new Map(); // conversationId → { owner, expiresAt }
  }
  
  async acquire(conversationId, userId, ttlMs = 30000) {
    const existing = this.locks.get(conversationId);
    if (existing && existing.expiresAt > Date.now()) {
      throw new ConcurrencyError(`Conversation locked by ${existing.owner}`);
    }
    this.locks.set(conversationId, {
      owner: userId,
      expiresAt: Date.now() + ttlMs
    });
  }
  
  release(conversationId, userId) {
    const lock = this.locks.get(conversationId);
    if (lock && lock.owner === userId) {
      this.locks.delete(conversationId);
    }
  }
}
```

3. **Frontend Retry Logic**:
```typescript
async function addMessage(conversationId, message) {
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(`/api/ai-chat/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message, version: currentVersion })
      });
      if (response.status === 409) {
        // Conflict - reload and retry
        await reloadConversation(conversationId);
        retries--;
        continue;
      }
      return response;
    } catch (error) {
      retries--;
    }
  }
  throw new Error('Failed to add message after retries');
}
```

4. **WebSocket Alternative** (Recommended):
   - Use WebSocket for Coach Assistant to avoid HTTP race conditions
   - Server serializes messages through single socket connection
   - Eliminates concurrent write problem entirely

**Verification Required:** Concurrency control implementation + load test simulating 10 trainers editing same conversation.

---

### 🔴 CRITICAL-4: File Upload Attack Vectors

**Finding:** Plan mentions "equipment profile picker" and "potential image uploads" but has **no security controls**:
- No file type validation (could upload .exe, .php, .svg with XSS)
- No virus/malware scanning
- No SSRF protection if AI fetches external URLs
- R2 bucket permissions undefined (public access risk)
- No file size limits (DoS via huge uploads)

**Impact:** Malware distribution, SSRF to internal services, bucket takeover, XSS.

**Required Mitigations:**

1. **Strict File Validation**:
```javascript
// backend/middleware/fileValidation.mjs
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  // NO SVGs - XSS risk
  // NO PDFs - could contain JavaScript
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateFileUpload(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }
  
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  
  // Verify magic bytes (not just extension)
  const buffer = file.buffer.slice(0, 4);
  if (buffer.toString('hex').startsWith('ffd8ff')) return 'jpeg';
  if (buffer.toString('hex') === '89504e47') return 'png';
  if (buffer.toString('hex') === '52494646') return 'webp'; // RIFF
  
  throw new Error('File magic bytes mismatch');
}
```

2. **Virus Scanning**:
   - Integrate ClamAV or VirusTotal API
   - Scan ALL uploads before storing
   - Quarantine infected files, alert security team

3. **R2 Bucket Security**:
```javascript
// bucket policy - NO public access
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::swanstudios-equipment/*",
      "Condition": {
        "Bool": { "aws:SecureTransport": false }
      }
    }
  ]
}
```

4. **SSRF Protection** (if AI fetches URLs):
```javascript
// Blocklist internal IP ranges
const BLOCKED_IP_RANGES = [
  '127.0.0.0/8',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.169.254' // AWS metadata
];

async function validateUrl(url) {
  const hostname = new URL(url).hostname;
  const ip = await dns.resolve(hostname);
  
  for (const range of BLOCKED_IP_RANGES) {
    if (ipInRange(ip, range)) {
      throw new Error('SSRF attempt blocked');
    }
  }
}
```

5. **Content Security Policy** (for any displayed images):
```html
<meta http-equiv="Content-Security-Policy" 
      content="img-src 'self' https://r2.swanstudios.com;">
```

**Verification Required:** File upload security implementation + penetration test on upload endpoint.

---

## HIGH FINDINGS (MUST FIX)

### 🟠 HIGH-1: XSS via Markdown Rendering

**Finding:** Plan uses `react-markdown` for AI chat output. Without proper sanitization, AI could generate:
- `<script>alert('XSS')</script>`
- `<img src=x onerror=stealCookies()>`
- `javascript:` URLs
- Event handlers in markdown

**Impact:** Session hijacking, credential theft, defacement.

**Mitigation:**

1. **Use DOMPurify with rehype**:
```typescript
import

---

## Secondary Security Planner (120B MoE) — Round 2

CONSENSUS REACHED

I agree with all critical and high findings presented by the Primary Security Planner. The Bootcamp Creator upgrade plan contains significant security vulnerabilities that must be resolved before proceeding to Phase 0. All identified issues represent genuine policy violations and technical risks that align with SwanStudios' security obligations.

**MERGED FINDINGS SUMMARY:**

**CRITICAL FINDINGS REQUIRING IMMEDIATE RESOLUTION:**

1. **PII Exposure to External LLMs** - Requires implementation of PII sanitization layer in `bootcampGenerator.mjs`, whitelist schema enforcement, proxy architecture via `backend/services/aiSanitizationProxy.mjs`, policy updates, and audit controls.

2. **Voice Recording Privacy & Storage** - Requires explicit consent flow, encryption at rest for voice blobs in R2, 30-day retention policy with auto-deletion, RBAC access controls, and data minimization through chunked processing.

3. **Concurrent JSONB Write Race Conditions** - Requires optimistic locking with version vector in `ai_chat_conversations` table, backend service lock implementation, frontend retry logic with 409 handling, and consideration of WebSocket alternative for serialized message processing.

4. **File Upload Attack Vectors** - Requires strict file validation (MIME types, magic bytes, 5MB limit), virus scanning integration, R2 bucket security policies denying public access, SSRF protection via internal IP range blocking, and CSP for image display.

**HIGH FINDINGS REQUIRING RESOLUTION BEFORE PHASE 0:**

1. **XSS via Markdown Rendering** - Requires DOMPurify with rehype sanitization for all AI-generated markdown content in chat interfaces.

2. **IDOR in AI Chat Endpoints** - Requires authorization middleware verifying trainer ownership of `conversationId` before allowing message access/modification.

3. **Missing Rate Limiting on AI Endpoints** - Requires implementation of token bucket or fixed window rate limiting on `/api/ai-chat/*` endpoints with appropriate limits for trainer/AI interactions.

4. **Lack of Input Validation on Exercise Parameters** - Requires validation schema for exercise duration, intensity, and type parameters to prevent injection and logic flaws.

5. **Unencrypted AI API Keys in Frontend** - Requires moving API key storage to backend environment variables and creating proxy endpoints for AI service calls.

**VERIFICATION REQUIREMENTS BEFORE PHASE 0:**
- Code review of all sanitization and validation implementations
- DPA signatures from AI providers (Gemini/Qwen) confirming no PHI storage
- Voice privacy implementation with consent UI mockups
- Concurrency control implementation + load test (10 trainers editing same conversation)
- File upload security implementation + penetration test results
- XSS protection verification via automated scanning
- Authorization testing for IDOR vulnerabilities
- Rate limiting effectiveness testing
- Input validation boundary testing
- Secret scanning confirmation for frontend codebase

All mitigations proposed by the Primary Security Planner are technically sound, address the root causes, and comply with applicable regulations (HIPAA, GDPR, CCPA) and SwanStudios' security policies. No additional findings or alternative approaches are required at this stage.

---

