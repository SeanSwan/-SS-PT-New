# Security Planning Debate (Phase 2A) — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free ↔ nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 115.3s
> **Files:** docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-VISION-REFACTOR-2026-04-05.md
> **Generated:** 4/4/2026, 7:32:59 PM

---

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

*Part of SwanStudios 14-Brain Recursive Consensus System*
