# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 48.3s
> **Files:** docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md
> **Generated:** 4/6/2026, 4:12:35 PM

---

# Security Review: SwanStudios Refactor Plan
**Policy Context:** ZERO PII TO LLMs — No client names, emails, or personal data may reach external AI providers.
**Review Date:** 2026-04-06
**Scope:** Comprehensive site refactor plan for personal health data platform.

---

## 1. PII Exposure in AI Conversation History
**Rating:** CRITICAL
**Issue:** Conversation titles/previews in AI terminals (Coach Assistant, Swan Coach) may contain PII from user queries (e.g., "John's knee injury workout"). Plan does not mention sanitization before storage or AI processing.
**Impact:** Direct violation of ZERO PII TO LLMs policy; PII could be sent to Gemini/other LLMs or exposed in logs/previews.
**Mitigations:**
- Implement **client-side PII redaction** before any text is sent to AI APIs. Use deterministic masking (e.g., replace names/emails with `[CLIENT]`).
- Store only redacted conversation history in PostgreSQL JSONB.
- Audit all AI prompt engineering to ensure no PII is embedded in system/user prompts.
- Add automated tests verifying PII never leaves the client browser/backend.

---

## 2. File Attachment Risks (R2 Uploads)
**Rating:** HIGH
**Issue:** Equipment images uploaded to Cloudflare R2 for AI analysis. Plan lacks:
- File type validation (malicious `.svg` with scripts, `.html` uploads).
- SSRF protection if AI service fetches user-provided URLs.
- Virus/malware scanning.
**Impact:** Malicious file upload could lead to XSS, SSRF, or R2 bucket compromise.
**Mitigations:**
- **Validate file types** server-side (allow only `image/jpeg`, `image/png`, `image/webp`).
- **Scan uploads** with ClamAV or similar before processing.
- **Isolate R2 bucket**: Private bucket with presigned URLs; AI service accesses via temporary signed URLs, not user-supplied URLs.
- **Set strict CORS** on R2 to prevent unauthorized access.
- **Rate-limit** upload endpoints per user/IP.

---

## 3. Voice Data Privacy
**Rating:** HIGH
**Issue:** Audio recordings sent to Gemini for transcription. Plan silent on:
- Whether raw audio is stored (and where).
- Retention period.
- Encryption in transit/at rest.
- User consent for recording.
**Impact:** Voice recordings are biometric PII; unauthorized storage/retention violates GDPR/HIPAA and privacy policy.
**Mitigations:**
- **Never store raw audio**. Process in-memory, discard after transcription.
- If storage is unavoidable:
  - Encrypt at rest (AES-256).
  - Auto-delete within 24 hours.
  - Log access with audit trail.
- **Explicit consent** UI before recording (per GDPR Art. 9).
- Update privacy policy to detail voice data handling.
- Verify Gemini's data retention policy (disable storage if possible).

---

## 4. Conversation Data at Rest (PostgreSQL JSONB)
**Rating:** HIGH
**Issue:** Messages stored as JSONB in PostgreSQL. Plan does not address:
- Encryption at rest (PostgreSQL TDE).
- Row-level access controls (who sees which conversations).
- Backup security.
**Impact:** Database compromise exposes full conversation history (potential PII).
**Mitigations:**
- Enable **PostgreSQL TDE** (transparent data encryption) or use encrypted volumes.
- Implement **row-level security (RLS)** policies:
  ```sql
  CREATE POLICY conversation_access ON conversations
  USING (user_id = current_user_id() OR
         EXISTS (SELECT 1 FROM trainers_clients WHERE trainer_id = current_user_id() AND client_id = conversations.user_id));
  ```
- **Encrypt JSONB fields** containing PII with application-level encryption (e.g., `pgcrypto`).
- **Audit logs** for all conversation access (admin/trainer views).
- **Backup encryption** and restricted access.

---

## 5. RBAC Enforcement
**Rating:** HIGH
**Issue:** Plan describes RBAC (admin sees all, trainer sees assigned clients, client sees own) but no enforcement mechanism specified.
**Impact:** Broken RBAC could allow trainers to view other trainers' clients or clients to see others' data.
**Mitigations:**
- **Enforce RBAC at API layer** (Express middleware):
  ```javascript
  const authorize = (role, resourceOwnerId) => {
    if (role === 'admin') return true;
    if (role === 'trainer' && isAssignedTrainer(userId, resourceOwnerId)) return true;
    if (role === 'client' && userId === resourceOwnerId) return true;
    throw new ForbiddenError();
  };
  ```
- **Database-level checks** (Sequelize scopes/RLS as above).
- **Unit/integration tests** for each role accessing unauthorized data.
- **Admin audit dashboard** showing all access logs to conversations.

---

## 6. MediaRecorder API Risks
**Rating:** MEDIUM
**Issue:** Browser microphone access for voice input. Plan notes reliability issues but not:
- Permission denial handling.
- Stream cleanup (memory leaks, accidental recording).
- Data leakage (e.g., recordings cached in browser).
**Impact:** Unreleased microphone streams could be exploited by malicious scripts or leave audio in memory.
**Mitigations:**
- **Immediately stop tracks** on component unmount/error:
  ```javascript
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);
  ```
- **Clear blobs/URLs** after upload: `URL.revokeObjectURL(blobUrl)`.
- **Permission UI**: Clear indicator when recording is active; require user gesture to start.
- **Sandbox iframes** for any third-party voice processing.

---

## 7. Markdown Rendering XSS
**Rating:** HIGH
**Issue:** `react-markdown` used for AI responses; plan notes raw HTML tags appearing. If user-generated content (e.g., client notes) is rendered without sanitization, XSS possible.
**Impact:** XSS could steal session tokens, impersonate users, or exfiltrate data.
**Mitigations:**
- **Sanitize all markdown** with `DOMPurify` before rendering:
  ```javascript
  import DOMPurify from 'dompurify';
  const clean = DOMPurify.sanitize(markdown);
  ```
- **Disable HTML in `react-markdown`**: `skipHtml={true}`.
- **Content Security Policy (CSP)** headers: `default-src 'self'; script-src 'self' 'nonce-...'`.
- **Audit all `react-markdown` instances** (AI terminals, exercise descriptions, client notes).

---

## Summary & Critical Actions

| Finding | Rating | Immediate Action Required |
|---------|--------|---------------------------|
| PII in AI conversations | CRITICAL | Implement PII redaction before any AI call; halt AI features until fixed. |
| File uploads to R2 | HIGH | Add file validation, scanning, SSRF protection. |
| Voice data storage | HIGH | Define retention policy; ensure no raw audio storage. |
| Conversation encryption/RBAC | HIGH | Encrypt DB; enforce RLS; test RBAC bypasses. |
| RBAC gaps | HIGH | Add middleware checks; write penetration tests. |
| MediaRecorder cleanup | MEDIUM | Add stream stop/cleanup in all voice components. |
| Markdown XSS | HIGH | Sanitize all markdown; enable CSP. |

**Overall Risk:** **CRITICAL** — Multiple high-risk items could lead to PII exposure, data breaches, or policy violations.
**Recommendation:** **Pause all AI/voice/file-upload features** until mitigations are implemented and audited. Prioritize:
1. PII redaction for AI.
2. RBAC enforcement.
3. File upload security.
4. Conversation encryption.

**Next Steps:**
- Conduct threat modeling session for AI workflows.
- Review all external AI provider agreements for data retention.
- Implement security testing in Playwright suite (XSS, RBAC bypass, PII leakage).
- Update privacy policy and consent flows.

---

**Reviewer:** Security Engineer
**Approval Required:** CTO, Legal, Compliance before proceeding with AI/voice/file features.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
