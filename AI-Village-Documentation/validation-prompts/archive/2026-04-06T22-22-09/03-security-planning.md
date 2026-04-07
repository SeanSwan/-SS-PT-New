# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 45.7s
> **Files:** docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md
> **Generated:** 4/6/2026, 3:22:09 PM

---

# Security Review: SwanStudios Comprehensive Site Refactor Brief

## Executive Summary
The refactor plan introduces significant new data processing vectors (AI conversations, voice recordings, image uploads) that conflict with the **ZERO PII TO LLMs** policy. Critical gaps exist in data sanitization, encryption, RBAC enforcement, and file handling. **4 findings are CRITICAL**, 2 are HIGH, and 1 is MEDIUM. Immediate architectural changes are required before implementation.

---

## Detailed Findings & Mitigations

### 1. PII Exposure in AI Conversations
**Rating:** CRITICAL  
**Plan Reference:** Sections 1, 5 (B, D), 7, 8, 10  
**Issue:**  
- AI terminals (Coach Assistant, Swan Coach Workout Builder) accept free-text/voice inputs containing client PII (names, injuries, health conditions).  
- No mention of **client-side PII redaction** before sending to external AI providers (Gemini implied).  
- Conversation history stored in PostgreSQL JSONB may contain raw PII in user/AI messages.  
- "Teach Me" content generation could inadvertently include client-specific data.  

**Impact:**  
Direct violation of ZERO PII TO LLMs policy → regulatory penalties (HIPAA/GDPR), data breach, loss of client trust.

**Mitigations:**  
1. **Implement PII Detection/Redaction Layer**  
   - Use on-device/library PII detection (e.g., `presidio`, `spacy` NER) **before** any data leaves client browser.  
   - Redact: names, emails, phone numbers, addresses, exact dates, health identifiers, locations.  
   - Replace with generic tokens: `[CLIENT_NAME]`, `[INJURY]`, `[DATE]`.  
2. **AI Prompt Engineering**  
   - System prompts must explicitly forbid AI from requesting/storing PII.  
   - Example: *"Do not ask for or store personal identifiers. Use generic references like 'your client'."*  
3. **Conversation Storage Sanitization**  
   - Server-side middleware must re-sanitize stored JSONB messages before persistence.  
   - Maintain audit log of redaction actions.  
4. **Policy Enforcement**  
   - Block any API route sending data to external AI if PII detection confidence > threshold.  
   - Fallback: show error *"Please remove personal details from your request."*  

---

### 2. Conversation Data at Rest (PostgreSQL JSONB)
**Rating:** CRITICAL  
**Plan Reference:** Section 4, 5 (B, D)  
**Issue:**  
- Conversations stored as plain JSONB in PostgreSQL.  
- No mention of **encryption at rest** for health data.  
- RBAC described but **no database-level enforcement** (row-level security).  

**Impact:**  
Database compromise → bulk PII/PHI exposure. Insider threat (DBA/admin) accessing all conversations.

**Mitigations:**  
1. **Encrypt JSONB Column**  
   - Use PostgreSQL `pgcrypto` with per-row keys derived from user ID + server secret.  
   - Alternatively, encrypt entire tablespace with TDE (if using cloud-managed PostgreSQL).  
2. **Row-Level Security (RLS)**  
   - Enable RLS on `conversations` table:  
     ```sql
     CREATE POLICY conversation_access ON conversations
     USING (
       -- Admin: all rows
       (current_user_role() = 'admin') OR
       -- Trainer: only assigned clients
       (current_user_role() = 'trainer' AND client_id IN (
         SELECT client_id FROM trainer_assignments WHERE trainer_id = current_user_id()
       )) OR
       -- Client: own only
       (current_user_role() = 'client' AND client_id = current_user_id())
     );
     ```  
3. **Audit Logging**  
   - Log all conversation access with user ID, timestamp, client ID accessed.  
4. **Key Management**  
   - Store encryption keys in AWS Secrets Manager/HashiCorp Vault, not in code.  
   - Rotate keys annually.  

---

### 3. RBAC Enforcement Gaps
**Rating:** CRITICAL  
**Plan Reference:** Section 5 (B, D, I), 8  
**Issue:**  
- Plan describes intended RBAC (admin: all, trainer: assigned, client: own) but **no implementation details**.  
- "Admin sees all conversations" → risk of over-privileged admin accounts.  
- Trainer/client context switching mentioned (Section I) → risk of session fixation/confused deputy.  

**Impact:**  
Trainer accesses other trainers' clients; admin accidentally modifies wrong client data; client views other clients' plans.

**Mitigations:**  
1. **Middleware Enforcement**  
   - Create `@rbac('trainer:client:read')` decorator on all conversation/plan endpoints.  
   - Verify `trainer_id` matches `client_id` assignment table **on every request**.  
2. **Context Isolation**  
   - Include `current_client_id` in JWT token after login (scoped to selected client in trainer view).  
   - Reject requests where `current_client_id` ≠ resource `client_id` (unless admin).  
3. **Admin Privilege Separation**  
   - Split admin roles:  
     - `super_admin` (full access)  
     - `support_admin` (read-only, limited fields)  
   - Require MFA for admin actions.  
4. **Automated RBAC Tests**  
   - Playwright tests (Section 9) must include:  
     - Trainer attempting to access another trainer's client → 403.  
     - Client accessing another client's plan → 403.  

---

### 4. Voice Data Privacy & Retention
**Rating:** HIGH  
**Plan Reference:** Section 5 (D), 7  
**Issue:**  
- Audio recordings sent to Gemini for transcription.  
- **No retention policy** defined (how long stored? where?).  
- No mention of **encryption in transit/at rest** for voice blobs.  
- MediaRecorder API usage unclear (client-side storage?).  

**Impact:**  
Voice recordings = biometric data (PII/PHI). Unencrypted storage → breach. Indefinite retention → compliance violation.

**Mitigations:**  
1. **Ephemeral Processing**  
   - Stream audio directly to transcription service; **never store** raw recordings.  
   - If storage needed (e.g., for re-analysis), encrypt with client-specific key and auto-delete after 24h.  
2. **Transparency & Consent**  
   - Update privacy policy: *"Voice recordings are processed in real-time and not stored."*  
   - In-app consent modal before first recording: *"We'll send your voice to our AI coach. No recordings are stored."*  
3. **Secure Transmission**  
   - Use HTTPS + TLS 1.3 for all audio uploads.  
   - Implement certificate pinning in mobile app (if any).  
4. **Client-Side Cleanup**  
   - After `MediaRecorder.stop()`, revoke media stream tracks:  
     ```javascript
     stream.getTracks().forEach(track => track.stop());
     ```  
   - Clear any blob URLs: `URL.revokeObjectURL(blobUrl)`.  

---

### 5. File Upload (R2) & SSRF Risks
**Rating:** HIGH  
**Plan Reference:** Section 5 (E), 6  
**Issue:**  
- Equipment images uploaded to Cloudflare R2 for AI analysis.  
- **No file validation** (type, size, malware scanning).  
- AI analysis may fetch URLs from image metadata → **SSRF** risk.  
- "Batch-first" workflow → many concurrent uploads → DoS potential.  

**Impact:**  
Malicious file upload → RCE via image processing library (e.g., ImageMagick). SSRF → internal network scan/exploitation.

**Mitigations:**  
1. **Strict File Validation**  
   - Server-side:  
     - Allow only `image/jpeg`, `image/png`.  
     - Max size: 5MB per file.  
     - Use `sharp` or `jimp` to re-encode images (strips metadata/scripts).  
   - Client-side:

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
