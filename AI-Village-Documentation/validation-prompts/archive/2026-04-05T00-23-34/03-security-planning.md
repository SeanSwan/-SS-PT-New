# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 35.8s
> **Files:** docs/ai-workflow/blueprints/COMPREHENSIVE-APP-AUDIT-2026-04-04.md
> **Generated:** 4/4/2026, 5:23:34 PM

---

# Security Review: SwanStudios AI Feature Plan
**Policy:** Zero PII to External LLMs | **Platform:** Health Data (PHI) | **Review Date:** 2026-04-04

---

## 1. PII Exposure in Conversation History
**Rating:** CRITICAL
**Plan Gap:** No mention of sanitization for titles/previews before storage or AI processing.
**Risks:**
- User-generated conversation titles (e.g., "John's knee injury") could contain names/conditions.
- Previews sent to AI for context may include PII from message snippets.
**Violates:** Zero PII to LLMs policy.
**Mitigations:**
- Implement **pre-processing sanitization pipeline**:
  - Strip all proper nouns, dates, locations, medical IDs using regex + NLP entity recognition (local, offline).
  - Replace PII with tokens (e.g., `[CLIENT_NAME]`) before any AI interaction.
  - Sanitize **both** user-facing titles and AI-generated summaries.
- **Never** send raw conversation history to external AI; only send sanitized, tokenized text.
- Audit all AI prompt templates for PII leakage vectors.

---

## 2. File Attachment Risks (R2 Uploads for AI Analysis)
**Rating:** HIGH
**Plan Gap:** No validation, SSRF protection, or content-type enforcement described.
**Risks:**
- Malicious files (e.g., SVG with XSS, polyglot files) uploaded to R2 could compromise AI processing or downstream systems.
- SSRF if AI service fetches image URLs from attacker-controlled servers.
**Mitigations:**
- **Strict file validation**:
  - Allow only `image/jpeg`, `image/png`, `image/webp`.
  - Validate magic bytes, not just extensions.
  - Re-scan images with antivirus (ClamAV) in isolated container.
- **SSRF prevention**:
  - AI service must **never** fetch arbitrary URLs; only process files from R2 with signed, time-limited URLs.
  - Block private IP ranges in any URL parsing (if URLs are ever used).
- **R2 bucket policies**:
  - Bucket private; access only via presigned URLs (expire in ≤15 min).
  - Enable S3 Block Public Access.
- **AI processing sandbox**: Run image analysis in ephemeral, network-restricted container.

---

## 3. Voice Data Privacy (Gemini Transcription)
**Rating:** CRITICAL
**Plan Gap:** No retention policy, storage details, or consent flow described.
**Risks:**
- Audio recordings may contain background PII (names, addresses).
- Unclear if recordings are stored post-transcription (violates data minimization).
- Gemini processes audio externally → PII exposure if not sanitized.
**Mitigations:**
- **Retention policy**:
  - Delete raw audio immediately after successful transcription (≤5 min retention).
  - Store **only** text transcripts (already sanitized per #1).
- **Consent & disclosure**:
  - Explicit UI consent: "Audio will be sent to Google Gemini for transcription. No recordings stored."
  - Update privacy policy to list Gemini as sub-processor.
- **Technical controls**:
  - Stream audio directly to Gemini via API; **never** write to disk or R2.
  - Use Gemini's `enableAutomaticPunctuation` only; disable speaker diarization if not needed (reduces PII).
- **Audit logs**: Log all transcription requests (user ID, timestamp, file hash) for compliance.

---

## 4. Conversation Data at Rest (PostgreSQL JSONB)
**Rating:** HIGH
**Plan Gap:** No encryption, access controls, or audit logging specified.
**Risks:**
- Unencrypted PHI in DB (conversations contain health data).
- No row-level security; admin role may access all conversations (see #5).
- Backups may be unencrypted.
**Mitigations:**
- **Encryption**:
  - Enable PostgreSQL TDE (transparent data encryption) or use encrypted EBS volumes.
  - Encrypt JSONB fields application-side with AES-256-GCM (key in AWS KMS).
- **Access controls**:
  - Implement **row-level security (RLS)** in PostgreSQL:
    ```sql
    CREATE POLICY client_access ON conversations
    FOR SELECT USING (client_id = current_user_id());
    ```
  - Application must enforce `WHERE client_id = ?` on all queries (defense in depth).
- **Audit logging**:
  - Log all conversation access (who, when, which client) to separate audit table.
  - Retain logs for 7 years (HIPAA requirement).
- **Backup encryption**: Ensure all DB backups are encrypted with KMS-managed keys.

---

## 5. RBAC Enforcement Gaps
**Rating:** HIGH
**Plan Gap:** RBAC described conceptually but no enforcement mechanism in code/bug list.
**Evidence from Plan:**
- Admin sees all conversations (bug #12: mock data shown to trainers → suggests no scoping).
- Dead endpoints (#5) may bypass auth checks.
- No mention of middleware for route-level RBAC.
**Risks:**
- Trainer could view other clients' conversations via direct API calls.
- Admin over-privileged (should need justification to view PHI).
**Mitigations:**
- **Middleware enforcement**:
  - All `/api/conversations/*` routes must pass through `rbacMiddleware`:
    ```javascript
    const rbacMiddleware = (role, resourceOwnerIdParam) => {
      return async (req, res, next) => {
        if (req.user.role !== role && !isOwner(req.user.id, req.params[resourceOwnerIdParam])) {
          return res.status(403).json({ error: "Forbidden" });
        }
        next();
      };
    };
    // Usage: router.get('/:clientId', rbacMiddleware('trainer', 'clientId'), getConversations);
    ```
- **Database-level RLS** (as in #4) as second layer.
- **Admin restrictions**:
  - Admin access to PHI requires MFA + justification field (audit trail).
  - Implement "break glass" protocol with alerting.
- **Test coverage**: Add integration tests for RBAC bypass attempts (e.g., trainer accessing another client's `/api/conversations/999`).

---

## 6. MediaRecorder API Risks (Client-Side)
**Rating:** MEDIUM
**Plan Gap:** No mention of permission handling, stream cleanup, or client-side data protection.
**Risks:**
- Microphone permission granted but stream not stopped → background recording.
- Audio chunks stored in memory/IndexedDB could be extracted via XSS.
- No UI indicator when recording is active (user unaware).
**Mitigations:**
- **Strict lifecycle management**:
  - Use `MediaRecorder` with `ondataavailable` → immediately stream to server; **never** store locally.
  - On component unmount/stop, call `stream.getTracks().forEach(t => t.stop())`.
- **UI/UX controls**:
  - Persistent recording indicator (red dot) with stop button.
  - Auto-stop after 5 minutes of silence (using Web Audio API silence detection).
- **Security hardening**:
  - Set `MediaRecorder` `mimeType` to `audio/webm;codecs=opus` (no metadata).
  - Clear all buffers after transmission: `chunks = []`.
  - Disable right-click/DevTools during recording (via `document.addEventListener('contextmenu', e => e.preventDefault())`).

---

## 7. Markdown Rendering XSS (react-markdown)
**Rating:** HIGH
**Plan Gap:** No mention of sanitization library or CSP.
**Risks:**
- User-generated markdown (e.g., workout notes) could contain:
  - `<script>` tags (if `dangerouslySetInnerHTML` used elsewhere).
  - `javascript:` URLs in links.
  - HTML injection via `{{}}` in some markdown parsers.
- Compromised trainer account could inject XSS to steal client sessions.
**Mitigations:**
- **Sanitize before rendering**:
  - Use `rehype-sanitize` with strict schema:
    ```javascript
    import rehypeSanitize from 'rehype-sanitize';
    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
      {content}
    </ReactMarkdown>
    ```
  - Allow only: `a`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `code`, `pre`.
  - Disallow all `img` (images should be uploaded via separate flow).
- **Content Security Policy (CSP)**:
  - `default-src 'self'; script-src 'self' 'nonce-{RANDOM}'; style-src 'self' 'unsafe-inline';`
  - Disable `unsafe-inline` for scripts; use nonces.
- **Input validation**:
  - Backend validates markdown length/structure; reject if >10KB or contains `<`/`>` in raw form.

---

## Summary of Critical Dependencies
| Finding | Depends on | Blocking? |
|---------|------------|-----------|
| PII Sanitization (#1) | NLP library (compromise: regex-only initially) | Yes (policy violation) |
| Voice Data Retention (#3) | Audio streaming architecture | Yes (legal risk) |
| RBAC Enforcement (#5) | Auth middleware refactor | Yes (PHI access) |
| DB Encryption (#4) | DevOps/KMS setup | No (can be phased) |

**Recommendation:** Halt AI feature rollout until #1, #3, #5 are resolved. Implement #2, #4, #7 in parallel.

**Next Steps:**
1. Threat model session with product/engineering to map all PII flows.
2. Penetration test focused on:
   - RBAC bypass (IDOR) in conversation endpoints.
   - File upload SSRF/XSS.
   - Markdown XSS in trainer/client notes.
3. Update privacy policy & consent screens before Gemini integration.

**Compliance Note:** This platform handles PHI → HIPAA Business Associate Agreement (BAA) required with Google (Gemini) and any sub-processors. Verify Google's HIPAA compliance status for Gemini API.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
