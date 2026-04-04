# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 35.1s
> **Files:** docs/ai-workflow/blueprints/TEACH-ME-COMPREHENSIVE-UPGRADE-PLAN.md
> **Generated:** 4/4/2026, 2:43:41 AM

---

# Security Review: Teach Me Comprehensive Upgrade Plan

## Executive Summary
The **content upgrade plan itself is low-risk** as it focuses on educational material depth. However, the **implementation of associated AI/voice features** (referenced in your questions) introduces **CRITICAL security gaps** that must be addressed *before* any development begins. The plan document does not address data handling, privacy, or security controls for these new features.

---

## Detailed Risk Assessment & Mitigations

### 1. PII Exposure in Conversation History
**Rating: CRITICAL**  
**Plan Gap:** The plan mentions "Conversation history" in context but has **zero controls** for PII sanitization before any AI processing or storage.

**Required Mitigations:**
- Implement **client-side PII redaction** before any data leaves the browser (names, emails, phone numbers, health conditions).
- Use deterministic tokenization for any necessary PII references in AI prompts (e.g., `[CLIENT_NAME]`).
- **Never** send raw conversation text to external LLMs. Use only sanitized, aggregated context.
- Audit all `Teach Me` content templates to ensure they cannot be tricked into echoing user PII via dynamic insertion.

### 2. File Attachment Risks (R2 + AI Analysis)
**Rating: HIGH**  
**Plan Gap:** Mentions image uploads for AI analysis but lacks validation, scanning, or SSRF prevention.

**Required Mitigations:**
- **Strict file validation:** Allow only image formats (JPEG, PNG, WebP). Validate magic bytes, not just extensions.
- **Virus/Malware scanning:** Integrate ClamAV or similar before R2 upload.
- **SSRF Prevention:** If AI service fetches URLs, use a allowlist of approved domains or a proxy that validates/rewrites URLs.
- **R2 Bucket Policies:** Set bucket to private, use pre-signed URLs with short expiry (5-15 min). Never expose bucket publicly.
- **Metadata stripping:** Remove EXIF data (GPS, device info) on upload.

### 3. Voice Data Privacy (Gemini Transcription)
**Rating: CRITICAL**  
**Plan Gap:** No mention of storage duration, retention policy, or explicit user consent for voice processing.

**Required Mitigations:**
- **Ephemeral processing:** Audio streams **must not be stored** in your systems. Send directly to Gemini API, receive transcript, then **immediately delete** the audio blob from memory/disk.
- **Transient storage only:** If temporary storage is unavoidable for reliability, encrypt at rest and auto-delete within **1 hour**.
- **Explicit consent:** UI must have a clear, separate opt-in for "Voice transcription via Google Gemini" with link to Google's data processing terms.
- **Audit logs:** Log all transcription requests (user ID, timestamp, file hash) for compliance, but **never log raw audio or transcripts** in plaintext logs.
- **Update Privacy Policy:** Explicitly state: "Voice recordings are processed by Google Gemini for transcription and are not stored by SwanStudios."

### 4. Conversation Data at Rest (PostgreSQL JSONB)
**Rating: CRITICAL**  
**Plan Gap:** No mention of encryption, field-level security, or access logging for sensitive JSONB message stores.

**Required Mitigations:**
- **Encryption at rest:** Enable PostgreSQL TDE (Transparent Data Encryption) or use encrypted EBS volumes.
- **Field-level encryption:** For highly sensitive PII/health data within JSONB, use application-level encryption (e.g., `pgcrypto` with per-user keys).
- **Row-Level Security (RLS):** Implement PostgreSQL RLS policies so users can **only** query rows where `user_id = current_user_id()`.
- **Column masking:** For admin views, mask PII fields unless explicit "view PII" permission is granted.
- **Audit trail:** Log all access to conversation tables (who, when, which conversation ID).

### 5. RBAC Enforcement
**Rating: HIGH**  
**Plan Gap:** Role definitions exist but no technical enforcement strategy described.

**Required Mitigations:**
- **Enforce in API layer:** Every endpoint fetching conversations must filter by `userId` (client) or `trainerId` (trainer). **Never** rely on frontend hiding UI elements.
- **Database-level RLS** (see #4) as ultimate fail-safe.
- **Admin role separation:** "Super Admin" (platform ops) vs "Studio Admin" (trainer-owner). Studio Admin should **not** see other studios' data.
- **Regular access reviews:** Quarterly audit of role assignments.

### 6. MediaRecorder API Risks (Browser Mic)
**Rating: MEDIUM**  
**Plan Gap:** No mention of secure stream handling or cleanup.

**Required Mitigations:**
- **Permission handling:** Request mic permission **only** when user initiates recording. Explain why in browser prompt context.
- **Stream cleanup:** On stop/cancel, call `stream.getTracks().forEach(track => track.stop())` to release hardware.
- **Memory safety:** Avoid storing large blobs in React state. Use `URL.createObjectURL()` and revoke after upload.
- **Tab/window close:** Add `beforeunload` listener to ensure streams are killed if user navigates away.

### 7. Markdown Rendering XSS
**Rating: HIGH**  
**Plan Gap:** `react-markdown` with user-generated content is a known XSS vector if not configured securely.

**Required Mitigations:**
- **Use `rehype-sanitize`:** Configure with a strict allowlist (only `a`, `strong`, `em`, `ul`, `ol`, `li`, `p`, `code`, `pre`). **Disable** `img` tags entirely unless absolutely necessary (then require `src` from trusted CDN).
- **No raw HTML:** Ensure `react-markdown` `skipHtml` is `true` (default, but verify).
- **CSP headers:** Implement Content Security Policy that disallows `unsafe-inline` scripts and restricts `script-src` to your domains.
- **Input validation:** Sanitize on backend as well (defense in depth) using `DOMPurify` or similar.

---

## Additional Critical Concerns Not in Original List

### A. AI Prompt Injection via Teach Me Content
**Rating: HIGH**  
If `Teach Me` content is dynamically constructed from user input (e.g., "Show me how to train [client goal]"), an attacker could inject malicious prompts.

**Mitigation:**
- **Static content only:** `Teach Me` sections should be **pre-written, static markdown** stored in your repo/database. No dynamic user input in prompts.
- If dynamic, use a strict template system with parameterized inputs (no string concatenation).

### B. Third-Party AI Provider Data Logging
**Rating: CRITICAL**  
Gemini/OpenAI may log prompts by default for model improvement.

**Mitigation:**
- **Opt-out of logging:** For all AI providers, configure API calls with `logprobs: false` and use provider-specific "do not log" flags (e.g., Google's `logit_bias` or OpenAI's `user` parameter with pseudonymized ID).
- **Business associate agreements:** Ensure AI providers sign BAAs if handling PHI (unlikely for transcription only, but verify).

### C. Insecure Direct Object References (IDOR) in Teach Me
**Rating: MEDIUM**  
If `Teach Me` sections are fetched by ID (e.g., `/api/teach-me/:sectionId`), ensure users can't access sections meant for other roles (e.g., client accessing "Admin Strategy").

**Mitigation:**
- **Authorization middleware:** Check `section.requiredRole` against `user.role` on every fetch.
- **Frontend hiding ≠ security:** Backend must enforce even if frontend UI hides sections.

---

## Actionable Next Steps

1. **Pause development** on any AI/voice features until these mitigations are designed.
2. **Create a Security Requirements Document** that must be signed off before any PR touching:
   - `MediaRecorder` usage
   - R2 upload endpoints
   - Gemini/LLM API calls
   - Conversation storage/retrieval
3. **Conduct a threat model** specifically for the "Voice-First AI Coach" feature.
4. **Update `docs/ai-workflow/blueprints/TEACH-ME-COMPREHENSIVE-UPGRADE-PLAN.md`** to include a **Security Appendix** with:
   - Data flow diagrams for voice/chat/file uploads.
   - PII handling checklist.
   - RBAC matrix with technical enforcement methods.
   - Retention/deletion schedules for all data types.

**Final Verdict:** The content upgrade is **safe**, but the **surrounding AI infrastructure is currently insecure by design**. Address CRITICAL items (#1, #3, #4, #B) before writing a single line of code for those features.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
