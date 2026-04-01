# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 52.2s
> **Files:** docs/ai-workflow/blueprints/MULTI-WORKSTREAM-QA-ENHANCEMENT-PLAN.md
> **Generated:** 3/31/2026, 4:40:03 PM

---

# Security Review: Multi-Workstream QA & Enhancement Plan

## Executive Summary
The plan addresses several security-critical areas but has **significant gaps** in PII handling, data encryption, and RBAC enforcement. The "zero PII to LLMs" policy is mentioned but **not technically enforced** in the proposed implementation. Voice data and file uploads are **completely unaddressed** in the plan despite being core features. **3 CRITICAL, 3 HIGH, 1 MEDIUM** findings require immediate mitigation before production.

---

## Detailed Findings & Mitigations

### 1. PII Exposure in AI Conversations
**Rating:** CRITICAL  
**Plan Coverage:** Partially mentioned in Workstream 2 test protocol ("Verify PII stripping works") but **no implementation details** in any workstream.

**Risk:**  
- Conversation titles/previews could contain client names, trainer names, or health conditions  
- Context chips may include PII (e.g., "John's shoulder injury")  
- No evidence of PII detection/redaction before AI prompts  
- Violates **ZERO PII TO LLMs** policy

**Required Mitigations:**
```typescript
// Add to backend/services/aiChatService.mjs
const PIIDetector = require('pii-detection'); // Use Microsoft Presidio or similar

async function sanitizeConversationData(data) {
  const piiTypes = ['PERSON', 'EMAIL', 'PHONE', 'ADDRESS', 'HEALTH_CONDITION'];
  return await PIIDetector.scanAndRedact(data, {
    types: piiTypes,
    replacement: '[REDACTED]',
    keepMetadata: false // Never send PII metadata to LLMs
  });
}

// Apply BEFORE any AI prompt construction:
const sanitizedContext = await sanitizeConversationData(userInput);
```

**Implementation Checkpoints:**
- [ ] All 17 data enrichment sources must pass through `sanitizeConversationData()`  
- [ ] Conversation titles auto-generated from first message must be PII-scrubbed  
- [ ] Add PII scanning to `useAIChat.ts` client-side as defense-in-depth  
- [ ] Audit logs for any PII detection events

---

### 2. File Attachment Risks (R2 Uploads)
**Rating:** CRITICAL  
**Plan Coverage:** **NOT ADDRESSED** in any workstream. User query mentions "Image uploads to R2 for AI analysis" but plan is silent.

**Risk:**  
- Malicious files (XSS via SVG, SSRF via crafted image URLs)  
- R2 bucket misconfiguration could expose all uploads  
- AI analysis of untrusted images could trigger prompt injection  
- No validation of file types/contents before processing

**Required Mitigations:**
```javascript
// Add to backend/routes/uploadRoutes.mjs (new route needed)
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp'); // Image processing
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

app.post('/api/upload/secure', authenticate, async (req, res) => {
  // 1. Validate file type via magic bytes, not extension
  const file = req.files.image;
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMime.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  // 2. Re-encode image to strip metadata/scripts
  const sanitizedBuffer = await sharp(file.buffer)
    .rotate() // Auto-orient
    .resize({ width: 2048, withoutEnlargement: true }) // Size limit
    .jpeg({ quality: 85 }) // Convert to safe format
    .toBuffer();

  // 3. Generate UUID filename, never use original name
  const key = `uploads/${uuidv4()}.jpg`;
  await s3.putObject({ Bucket, Key: key, Body: sanitizedBuffer }).promise();

  // 4. Return signed URL with 5-min expiry (no public bucket)
  const url = await getSignedUrl(s3.getSignedUrl, {
    Bucket, Key: key, Expires: 300
  });
  res.json({ url, key });
});
```

**Implementation Checkpoints:**
- [ ] R2 bucket **must be private** with signed URLs only  
- [ ] All images re-encoded via Sharp/ImageMagick before storage  
- [ ] Max file size: 10MB, max dimensions: 4096x4096  
- [ ] Virus scan integration (ClamAV) for non-image files if allowed  
- [ ] SSRF protection: Never fetch user-provided URLs server-side

---

### 3. Voice Data Privacy & Retention
**Rating:** CRITICAL  
**Plan Coverage:** **NOT ADDRESSED**. Voice-first AI coach is a key differentiator but no workstream covers audio handling.

**Risk:**  
- Audio recordings sent to Gemini may be stored by Google (violates policy)  
- No retention policy defined—recordings could persist indefinitely  
- HIPAA/GDPR implications: voice biometrics are PHI  
- Browser microphone streams may linger in memory

**Required Mitigations:**
```javascript
// Frontend: MediaRecorder cleanup (add to useVoiceRecorder.ts)
let mediaRecorder;
let audioChunks = [];

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };
  
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    
    // 1. Transcribe client-side FIRST if possible (Web Speech API)
    // 2. If server transcription needed:
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
    
    // Send to backend with explicit "ephemeral" flag
    const response = await fetch('/api/voice/transcribe?ephemeral=true', {
      method: 'POST',
      body: formData
    });
    
    // 3. Immediately revoke all blob URLs
    audioBlob.arrayBuffer().then(() => {
      audioChunks = [];
      stream.getTracks().forEach(track => track.stop()); // CRITICAL
    });
  };
}

// Backend: /api/voice/transcribe endpoint
app.post('/api/voice/transcribe', authenticate, async (req, res) => {
  const ephemeral = req.query.ephemeral === 'true';
  const audioBuffer = req.files.audio.buffer;
  
  // 1. Send to Gemini with "store: false" parameter (verify provider supports)
  const transcription = await gemini.transcribe(audioBuffer, {
    store: false, // Explicitly disable storage
    deleteAfter: 0 // Immediate deletion
  });
  
  // 2. NEVER store raw audio if ephemeral=true
  if (!ephemeral) {
    // Only store if user explicitly opts in (e.g., for coaching review)
    await secureStorage.saveEncrypted(audioBuffer, req.user.id);
  }
  
  res.json({ text: transcription });
});
```

**Policy Requirements:**
- [ ] **Voice Data Retention Policy**: Max 24 hours for transcription processing, immediate deletion after  
- [ ] **Explicit Consent**: Checkbox in UI: "I consent to voice processing (not stored)"  
- [ ] **Provider Contract**: Gemini/OpenWave must guarantee no training on voice data  
- [ ] **Client-Side Deletion**: Prove audio buffers are zeroed after transmission  
- [ ] **Audit Log**: Every voice access logged with user, timestamp, purpose

---

### 4. Conversation Data at Rest (PostgreSQL JSONB)
**Rating:** HIGH  
**Plan Coverage:** Mentions "JSONB messages in PostgreSQL" but **no encryption or access control details**.

**Risk:**  
- Database compromise exposes full conversation history (PII + health data)  
- No row-level security—

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
