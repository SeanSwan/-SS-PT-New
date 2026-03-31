# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 50.1s
> **Files:** docs/ai-workflow/blueprints/COACH-ASSISTANT-UPGRADE-PLAN.md
> **Generated:** 3/30/2026, 9:40:46 PM

---

# Security Review: Swan Coach Assistant Upgrade Plan

## Overall Assessment
The plan introduces significant functionality with inherent data privacy and security risks. **CRITICAL gaps exist in PII handling for multimodal inputs (voice/images) and RBAC enforcement.** The zero-PII-to-LLMs policy must be explicitly engineered into all new data flows, not assumed.

---

## 1. PII Exposure in Conversation Titles/Previews
**Rating:** HIGH  
**Finding:** Auto-generated conversation titles (from first user message) may contain PII (names, health conditions, locations). The plan does not mention sanitizing titles before storage or display in the sidebar.  
**Impact:** PII exposed in UI, API responses, and database without redaction. Violates data minimization principles.  
**Mitigations:**
- Implement server-side PII detection/redaction on conversation titles before saving (use existing PII detection service from privacy proxy).
- Sanitize titles client-side before sending to backend (defense-in-depth).
- Ensure sidebar search/indexing operates on redacted titles.
- Add validation: truncate titles to 100 chars, strip special characters, and run through PII filter.

---

## 2. File Attachment Risks (Malicious Files & SSRF)
**Rating:** CRITICAL  
**Finding:** 
- **PII Leak to LLMs:** Images may contain visible PII (ID cards, documents, screenshots). Sending raw base64 to Gemini violates zero-PII policy unless redacted.
- **Malicious Uploads:** Unvalidated file uploads could contain scripts (SVG XSS), executable payloads, or oversized files causing DoS.
- **SSRF Vector:** If user messages contain URLs and AI is permitted to fetch them (not in current plan but possible future feature), could lead to SSRF.
**Impact:** Direct policy violation, data breach, system compromise.  
**Mitigations:**
- **PII Redaction for Images:** Before sending to Gemini, process images server-side:
  - Run OCR (Tesseract) on uploaded images.
  - Apply PII regex/ML model to detect and redact (blur) text regions containing PII.
  - Only send redacted image + extracted (redacted) text to AI.
  - Store original image encrypted in R2 with strict access controls; only redacted version used for AI.
- **File Validation:**
  - Enforce strict allow-list: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `text/plain`.
  - Validate magic numbers (not just extensions).
  - Scan for malware using ClamAV or similar in upload pipeline.
  - Limit dimensions (e.g., 4000x4000px) to prevent decompression bombs.
  - Rate-limit uploads per user (e.g., 10/hour).
- **SSRF Prevention:**
  - If future feature allows AI to fetch URLs, implement:
    - URL allow-list (only internal fitness data domains).
    - Block private IP ranges (RFC 1918, link-local, etc.).
    - Use cloud function with egress restrictions.
- **R2 Security:**
  - Bucket private, pre-signed URLs expire in 1 hour.
  - Enable bucket encryption (AES-256) and access logging.

---

## 3. Voice Data Privacy & Retention
**Rating:** CRITICAL  
**Finding:** Audio recordings transcribed via Gemini may contain PII (names, addresses, health details). Plan does not specify:
- Whether raw audio is stored and for how long.
- If transcription text is redacted before AI processing.
- User consent mechanisms for recording.
**Impact:** Storing raw voice data increases breach surface; sending PII to Gemini violates policy.  
**Mitigations:**
- **Ephemeral Processing:** 
  - Raw audio blobs **must not be stored** after transcription. Process in memory, then delete immediately.
  - Transcription endpoint should stream text to privacy proxy for PII redaction **before** forwarding to AI.
- **Retention Policy:**
  - If any audio must be stored (e.g., for quality assurance), encrypt at rest, retain <24 hours, and obtain explicit consent.
  - Document in privacy policy: "Voice recordings are processed in real-time and not stored."
- **Consent & Transparency:**
  - Add explicit opt-in toggle for voice recording in UI (disabled by default).
  - Show indicator when recording (already planned) and confirm before sending.
  - Update privacy policy to cover voice data processing.

---

## 4. Conversation Data at Rest (Encryption & Access)
**Rating:** HIGH  
**Finding:** JSONB messages in PostgreSQL likely contain PII (workout details, health metrics). Plan does not mention:
- Encryption at rest (PostgreSQL TDE or column-level encryption).
- Backup encryption.
- Database access controls beyond application layer.
**Impact:** Database compromise exposes all client health data.  
**Mitigations:**
- **Encryption:**
  - Enable PostgreSQL TDE (transparent data encryption) or use cloud provider's encrypted volumes.
  - Consider application-level encryption for highly sensitive fields (e.g., medical conditions) using AWS KMS or similar.
- **Access Controls:**
  - Database roles: separate read/write credentials for app; no direct human access.
  - Ensure backups are encrypted and stored in secure, access-controlled locations.
- **Audit Logging:** Log all access to conversation tables (who, when, which conversation).

---

## 5. RBAC Enforcement in Backend APIs
**Rating:** CRITICAL  
**Finding:** Plan describes intended RBAC (admin/trainer/client) but **does not confirm backend enforcement** for new or existing endpoints. Assumption that middleware exists is insufficient.  
**Impact:** Any user could query/delete/modify others' conversations via API if RBAC is not strictly enforced per endpoint.  
**Mitigations:**
- **Mandatory Row-Level Security (RLS):**
  - Implement RLS in PostgreSQL on `conversations` and `messages` tables:
    ```sql
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY conversation_access ON conversations
      USING (user_id = current_user_id() OR 
             EXISTS (SELECT 1 FROM trainers_cl

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
