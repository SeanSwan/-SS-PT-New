# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 37.9s
> **Files:** docs/ai-workflow/AI-HANDOFF/MASTER-FIX-PLAN-2026-04-06.md
> **Generated:** 4/6/2026, 5:33:04 PM

---

# Security Review: SwanStudios Master Fix Plan (2026-04-06)

## Executive Summary
**Overall Risk Assessment: HIGH** — The plan focuses heavily on functional bug fixes and UI refactoring but **fails to address critical PII/PHI protection requirements** for the AI workflow features. The ZERO PII TO LLMs policy is not reflected in implementation details. Several security controls are mentioned in Phase 2 but lack specificity for health data handling.

---

## Detailed Findings & Mitigations

### 1. **PII Exposure in Conversation History**
**Rating: CRITICAL**
**Plan Coverage: ❌ NOT ADDRESSED**
The plan mentions conversation JSONB storage but **no sanitization logic** before AI processing. With voice-first AI coach and chat features, user messages likely contain names, conditions, injuries, etc.

**Required Mitigations:**
```javascript
// BEFORE sending to any LLM API:
const sanitizeForLLM = (text) => {
  // 1. Redact patterns: names, emails, phones, addresses, medical IDs
  // 2. Replace with generic tokens: [NAME], [EMAIL], [CONDITION]
  // 3. Log redactions for audit (encrypted)
  // 4. Validate output contains no PII via regex/NER
};

// In all AI-handoff code paths:
const safeMessages = messages.map(msg => ({
  ...msg,
  content: sanitizeForLLM(msg.content)
}));
```

**Implementation Points:**
- Add `sanitizePII()` utility in `backend/utils/pii-sanitizer.mjs`
- Apply in **all** AI request handlers (`geminiService.mjs`, `openaiService.mjs`)
- **Never** store unsanitized PII in `conversations.messages` JSONB
- Audit trail: `pii_redaction_logs` table (encrypted, 90-day retention)

---

### 2. **File Attachment Risks (R2 + AI Analysis)**
**Rating: HIGH**
**Plan Coverage: ⚠️ PARTIAL (P0-4 mentions equipment scan but no security)**
Image uploads to R2 for AI analysis risk:
- Malicious files (XSS via SVG, polyglots)
- SSRF if AI service fetches user-provided URLs
- PII in EXIF data (GPS, device info)

**Required Mitigations:**
```javascript
// Upload validation middleware:
const validateImageUpload = async (req, res, next) => {
  const file = req.file;

  // 1. Type validation (magic bytes, not extension)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Invalid image type' });
  }

  // 2. Strip EXIF (use sharp: .withMetadata({ exif: false }))
  // 3. Re-encode to prevent polyglots (convert to PNG/JPEG)
  // 4. Max 10MB, dimension limits (4000x4000)
  // 5. Virus scan (ClamAV integration)

  // 6. For AI analysis: NEVER pass user URLs to external services
  //    Instead: download from R2 → sanitize → send bytes to AI
  next();
};

// SSRF Prevention for any URL fetching:
const validateExternalUrl = (url) => {
  const parsed = new URL(url);
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];
  if (blocked.some(ip => parsed.hostname.includes(ip))) {
    throw new Error('SSRF attempt blocked');
  }
  // Only allow https, specific AI domains
};
```

**Files to Modify:**
- `backend/middleware/uploadValidation.mjs` (new)
- `backend/services/equipmentScanService.mjs` (P0-4 fix)
- `backend/routes/equipmentRoutes.mjs:473` (add validation before `scanEquipmentImage()`)

---

### 3. **Voice Data Privacy & Retention**
**Rating: CRITICAL**
**Plan Coverage: ❌ NOT ADDRESSED**
Audio recordings sent to Gemini **must not be stored** per HIPAA/PHI requirements. Plan doesn't mention:
- Storage duration (should be transient: delete after transcription)
- Encryption at rest for temporary storage
- Gemini data retention configuration (must set `storageConfig: { ttl: '0s' }`)

**Required Mitigations:**
```javascript
// In voice transcription service:
const transcribeAudio = async (audioBuffer) => {
  // 1. Store temporarily in encrypted R2 (AES-256) with 5min TTL
  const tempKey = await encryptAndStore(audioBuffer, { ttl: 300 });

  // 2. Call Gemini with STORAGE_CONFIG:
  const response = await geminiClient.generateContent({
    audio: { fileUri: tempKey },
    config: {
      storageConfig: { ttl: '0s' }, // DO NOT STORE in Gemini
      dataRedaction: { enabled: true } // if available
    }
  });

  // 3. Immediately delete temp file (fire-and-forget)
  await deleteTempFile(tempKey);

  // 4. Return ONLY text transcript (never store audio)
  return response.text;
};

// Privacy policy update required:
// "Voice recordings are processed in real-time and deleted within 5 minutes.
//  We do not store audio recordings."
```

**Files to Create:**
- `backend/services/voiceTranscriptionService.mjs` (new, with TTL enforcement)
- `backend/config/geminiConfig.mjs` (set `storageConfig: { ttl: '0s' }`)

---

### 4. **Conversation Data at Rest (PostgreSQL JSONB)**
**Rating: HIGH**
**Plan Coverage: ⚠️ MENTIONED BUT NOT IMPLEMENTED**
Phase 2 mentions "IDOR Vulnerability Assessment" but **no encryption or column-level security** for `conversations.messages` JSONB containing PII/PHI.

**Required Mitigations:**
```sql
-- 1. Enable PostgreSQL TDE (Transparent Data Encryption) at cluster level
--    (Render PostgreSQL: enable "Encryption at rest" in dashboard)

-- 2. Column-level encryption for messages JSONB (application-managed):
--    Store encrypted: messages_encrypted BYTEA
--    Decrypt on read via app layer (never in DB logs)

-- 3. Row-Level Security (RLS) policies:
CREATE POLICY conversation_access_policy ON conversations
  USING (
    -- Client: own only
    (auth.uid() = client_id)
    OR
    -- Trainer: assigned clients only
    (auth.uid() IN (
      SELECT trainer_id FROM client_assignments
      WHERE client_id = conversations.client_id
    ))
    OR
    -- Admin: all (audit required)
    (auth.role() = 'admin')
  );

-- 4. Audit table for conversation access:
CREATE TABLE conversation_access_log (
  id UUID PRIMARY KEY,
  conversation_id UUID,
  user_id UUID,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET


---

*Part of SwanStudios 15-Brain Recursive Consensus System*
