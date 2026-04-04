# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 41.3s
> **Files:** docs/ai-workflow/blueprints/ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md
> **Generated:** 4/2/2026, 8:47:53 PM

---

# Security Review: SwanStudios Onboarding Workflow Overhaul

## Executive Summary
**Overall Risk Level: CRITICAL**  
The plan introduces multiple high-risk vectors for PII exposure, particularly violating the **ZERO PII TO LLMs** policy. The AI-driven client creation flow requires sending raw PII (names, ages, health concerns) to external LLMs for extraction—a direct policy violation requiring immediate redesign.

---

## 1. PII Exposure in New Features
**Rating: CRITICAL**  
**Issue:** The `ONBOARD_CLIENT_INTENT` flow sends raw PII (names, ages, health concerns, goals) to external AI providers (Gemini/Qwen) for JSON extraction. This violates the ZERO PII TO LLMs policy. The plan incorrectly states "PII stripping still applies" but provides no mechanism for stripping PII *before* AI processing.

**Mitigations:**
- **REDESIGN FLOW:** Replace AI extraction with a structured form interface. Admin/trainer inputs client data via a secure form that directly populates `ClientOnboardingQuestionnaire` without AI intermediary.
- **If AI extraction is mandatory:** Implement on-premise PII redaction:
  1. Pre-process admin/trainer voice/text input with a local NER model (e.g., spaCy) to redact PII.
  2. Send only redacted text (e.g., "[NAME]", "[AGE]", "[HEALTH_CONCERN]") to AI.
  3. Map AI's redacted-field responses back to actual PII in backend *after* AI processing.
- **Policy Enforcement:** Add automated pre-flight checks in `aiChatService.mjs` to block any message containing patterns matching PII (emails, phone numbers, full names) before external API calls.
- **Audit:** Log all AI requests with PII-detection flags for compliance monitoring.

---

## 2. File Attachment Risks
**Rating: HIGH**  
**Issue:** Plan mentions "image uploads to R2 for AI analysis" but lacks security controls. Risks include:
- Malicious file uploads (e.g., SVG XSS, executable scripts in images)
- SSRF if AI is given R2 URLs to fetch images (AI could probe internal metadata)
- Unvalidated content-type allowing non-image files

**Mitigations:**
- **File Validation:**
  - Frontend: Accept only `image/jpeg`, `image/png`, `image/webp`.
  - Backend: Verify magic numbers, re-encode images using `sharp` (strip EXIF/metadata).
  - Size limit: 5MB per file.
- **R2 Security:**
  - Store uploads in private bucket with presigned URLs (expire in 1 hour).
  - Never expose R2 URLs directly to AI. Instead:
    1. Backend downloads image to temp storage.
    2. Convert to base64 or send as binary to AI.
    3. Delete temp file immediately after AI processing.
- **SSRF Prevention:** If AI must fetch URLs, use a proxy service that validates URLs against a whitelist (only R2 domains) and blocks internal IP ranges.

---

## 3. Voice Data Privacy
**Rating: CRITICAL**  
**Issue:** Audio recordings sent to Gemini for transcription. Plan does not address:
- Storage location/duration of raw audio
- Consent mechanisms for recording
- Data retention policy
- Whether Gemini stores audio (check their DPA)

**Mitigations:**
- **Ephemeral Processing:**
  - Stream audio directly from `MediaRecorder` to backend via WebSocket.
  - Backend forwards *only* the audio stream to Gemini's transcription API (no local storage).
  - Immediately discard audio after transcription completes.
- **Consent & Disclosure:**
  - Add explicit checkbox in UI: "I consent to voice processing for transcription" (required before recording).
  - Update privacy policy: specify voice data is processed by Gemini, not stored by SwanStudios.
- **Contractual:** Ensure Gemini's DPA prohibits audio storage and uses data only for transcription.
- **Fallback:** If Gemini fails, do not store audio—prompt user to re-record or use text input.

---

## 4. Conversation Data at Rest
**Rating: HIGH**  
**Issue:** `JSONB messages` in PostgreSQL may contain PII (client names, health details). Plan lacks:
- Encryption at rest for JSONB fields
- Row-level security (RLS) for conversation access
- Retention/deletion policies

**Mitigations:**
- **Encryption:**
  - Use PostgreSQL `pgcrypto` to encrypt `messages` JSONB field with AES-256, key stored in AWS Secrets Manager.
  - Alternatively, encrypt entire PostgreSQL instance with AWS RDS encryption.
- **Access Controls:**
  - Implement Row Level Security (RLS) on `conversations` table:
    ```sql
    CREATE POLICY conversation_access ON conversations
    USING ( 
      -- Client: only own conversations
      (CURRENT_USER = 'client' AND client_id = auth.uid())
      OR
      -- Trainer: only assigned clients
      (CURRENT_USER = 'trainer' AND client_id IN (
        SELECT client_id FROM client_trainer_assignments 
        WHERE trainer_id = auth.uid()
      ))
      OR
      -- Admin: all
      (CURRENT_USER = 'admin')
    );
    ```
- **Retention:** Auto-delete conversations after 2 years (configurable) via cron job. Anonymize archived conversations.

---

## 5. RBAC Enforcement
**Rating: HIGH**  
**Issue:** Plan assumes RBAC but does not specify enforcement mechanisms. New endpoints (`/api/admin/clients` with onboarding status) and frontend components must enforce:
- Admin: sees all clients' onboarding status
- Trainer: sees only assigned clients
- Client: sees only own status

**Mitigations:**
- **Backend Enforcement:**
  - In

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
