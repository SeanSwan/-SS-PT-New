# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 55.3s
> **Files:** docs/ai-workflow/blueprints/COACH-ASSISTANT-UPGRADE-PLAN.md
> **Generated:** 3/30/2026, 9:51:35 PM

---

# Security Review: Swan Coach Assistant Upgrade Plan

## Executive Summary
The upgrade plan introduces significant functionality that expands the attack surface for PHI/PII handling. While the platform's "Identity-blind AI" principle is commendable, several critical gaps exist in the plan's security documentation. **Most concerning: RBAC enforcement assumptions, PII in conversation metadata, and voice data retention policies are not addressed.**

---

## 1. PII Exposure in Conversation History

**Finding:** Conversation titles/previews are user-generated and likely contain PHI (e.g., "Knee rehab after surgery," "Golf swing analysis for John"). The plan does not specify:
- Whether titles are sanitized before storage
- Whether titles are included in AI context prompts
- Whether search indexes expose PII

**Rating:** CRITICAL  
**Justification:** Direct violation of Zero PII to LLMs policy if titles are used as context. Search functionality could also expose PII through autocomplete or logs.

**Mitigations:**
1. **Title sanitization pipeline:** Before saving conversation title:
   ```typescript
   // Pseudocode for title sanitization
   const sanitizeTitle = (rawTitle: string): string => {
     // Remove client names (cross-reference with client DB)
     // Remove medical conditions, dates, locations
     // Replace with generic terms: "[Client]" → "Client", "knee surgery" → "rehab"
     // Truncate to 50 chars, strip special chars
     return genericTitle;
   };
   ```
2. **AI context exclusion:** Never include conversation titles in system prompts or context windows. Only include message content after PII-stripping.
3. **Search index sanitization:** Build search index from sanitized titles only. Log search queries (anonymized) for audit.
4. **UI preview truncation:** In sidebar, show only first 30 chars of title, ellipsize mid-word to avoid cutting PII.

---

## 2. File Attachment Risks

**Finding:** Plan allows image/document uploads to R2 for AI analysis. Vectors:
- Malicious files (e.g., SVG XSS, PDF exploits, image polyglots)
- SSRF if system fetches URLs from metadata (plan doesn't specify)
- PHI in EXIF data (GPS coordinates, device names)
- R2 bucket misconfiguration exposing files publicly

**Rating:** HIGH  
**Justification:** File processing is a known attack vector. Gemini's multimodal processing may execute embedded scripts in certain formats.

**Mitigations:**
1. **Strict validation before upload:**
   ```typescript
   const ALLOWED_MIME = {
     image: ['image/jpeg', 'image/png', 'image/webp'],
     document: ['application/pdf', 'text/plain', 'text/csv'],
     audio: ['audio/mpeg', 'audio/wav', 'audio/webm']
   };
   // Validate MIME type, not just extension
   // Max sizes: 10MB images, 20MB docs, 25MB audio
   ```
2. **Server-side sanitization:**
   - Images: Strip EXIF data using `sharp` or `jimp`
   - PDFs: Convert to images first (no text extraction from original)
   - Re-encode all images to WebP (destroys embedded payloads)
3. **R2 security:**
   - Bucket private, access via presigned URLs (expire in 1 hour)
   - Path structure: `attachments/{conversationId}/{uuid}.webp` (no user-controlled filenames)
   - CORS restricted to your domain only
4. **No URL fetching:** Never fetch remote URLs from user input. Only accept direct uploads.
5. **Virus scanning:** Integrate ClamAV or similar for all uploads (even if re-encoded).

---

## 3. Voice Data Privacy

**Finding:** Audio recordings sent to Gemini for transcription. Plan lacks:
- Retention policy for raw audio blobs
- Whether Gemini stores recordings (Google's default: 30 days)
- Client consent mechanism for voice processing
- Deletion workflow after transcription

**Rating:** HIGH  
**Justification:** Voice recordings are PHI under HIPAA. Storing them without explicit consent and retention policy violates privacy regulations.

**Mitigations:**
1. **Ephemeral processing:**
   ```typescript
   // In transcribe endpoint:
   const transcribe = async (audioBlob: Buffer) => {
     const text = await gemini.transcribe(audioBlob);
     // Immediately delete blob from temp storage
     await fs.unlink(tempPath);
     return text;
   };
   ```
2. **No persistent storage:** Never store raw audio in database or R2. Keep only in memory/disk temporarily during transcription.
3. **Gemini data handling:**
   - Use Google's "data not used for training" flag
   - Set retention to 0 days if API supports (via `storageConfig`)
   - Document in privacy policy: "Voice data processed by Google Gemini, retained <24h, not used for training"
4. **Consent flow:**
   - First voice use: modal explaining "We'll send audio to Google for transcription. Audio deleted after processing."
   - Store consent timestamp in user settings
   - Allow opt-out per user
5. **Rate limiting:** 10/hr is good, but also implement per-user quota to prevent abuse.

---

## 4. Conversation Data at Rest

**Finding:** JSONB messages in PostgreSQL. Plan doesn't specify:
- Encryption at rest (PostgreSQL TDE)
- Encryption in transit (assume TLS but verify)
- Column-level encryption for message content
- Backup encryption
- Audit logging for access

**Rating:** HIGH  
**Justification:** PHI in database is a prime target. Encryption and access controls are mandatory for compliance.

**Mitigations:**
1. **Encryption:**
   - Enable PostgreSQL TDE (transparent data encryption) at rest
   - Use TLS 1.3 for all connections (verify `pgbouncer` or connection string)
   - Consider application-level encryption for `messages.content` using `pgcrypto`:
     ```sql
     INSERT INTO messages (content_encrypted) 
     VALUES (pgp_sym_encrypt('message text', '${ENCRYPTION_KEY}'));
     ```
2. **Access controls:**
   - Database roles: `app_user` (read/write own), `app_admin` (read all)
   - Row-Level Security (RLS) on `messages` table:
     ```sql
     CREATE POLICY user_messages ON messages
     FOR SELECT USING (
       conversation_id IN (
         SELECT id FROM conversations 
         WHERE user_id = current_user_id() -- from JWT
       )
     );
     ```
3. **Audit logging:**
   - Log all `SELECT` on `messages` table with user_id, conversation_id, timestamp
   - Alert on admin accessing >100 conversations/hour
4. **Backup encryption:** Ensure pg_dump backups are encrypted with `pgp_sym_encrypt`.

---

## 5. RBAC Enforcement

**Finding:** Plan describes RBAC logic but **does not specify implementation layer**. Biggest risk: RBAC enforced only in UI, not at API/database level.

**Rating:** CRITICAL  
**Justification:** UI-only RBAC is trivial to bypass via API calls. Trainers could access all client conversations by manipulating request IDs.

**Mitigations:**
1. **API-level scoping:**
   ```typescript
   // Middleware for all /api/ai-chat/* routes
   const enforceConversationAccess = async (req, res, next) => {
     const userId = req.user.id; // from JWT
     const conversationId = req.params.id || req.body.conversationId;
     
     const conversation = await Conversation.findByPk(conversationId);
     if (!conversation) return res.status(404).end();
     
     // Admin bypass
     if (req.user.role === 'admin') return next();
     
     // Trainer: check assignment
     if (req.user.role === 'trainer') {
       const assignment = await TrainerClientAssignment.findOne({
         where: { trainerId: req.user.id, clientId: conversation.userId }
       });
       if (!assignment) return res.status(403).json({ error: 'Forbidden' });
     }
     
     // Client: own only
     if (req.user.role === 'client' && conversation.userId !== userId) {
       return res.status(403).json({ error: 'Forbidden' });
     }
     
     next();
   };
   ```
2. **Database RLS (as above)** as defense-in-depth.
3. **Never trust frontend:** `useAIChat` hook must not accept arbitrary conversation IDs without server validation.
4. **List endpoint scoping:**
   - `GET /api/ai-chat/conversations` returns only conversations user can access
   - Admin gets all, trainer gets assigned clients' only, client gets own only
5. **Audit trail:** Log every conversation access with user role, IP, timestamp.

---

## 6. MediaRecorder API Risks

**Finding:** Browser microphone access via MediaRecorder. Risks:
- Permission not revoked after use
- Audio blob leaked to other tabs via SharedArrayBuffer (unlikely but possible)
- No indication of active recording in UI (plan has overlay but verify)
- Malicious site could trigger recording if user visits while tab open

**Rating:** MEDIUM  
**Justification:** Browser APIs are sandboxed but improper cleanup could leave streams open. Main risk is user confusion about when recording.

**Mitigations:**
1. **Explicit UI state:**
   - Full-screen overlay with clear "Recording..." indicator
   - Red pulsing border, timer, waveform
   - Must tap "Stop" explicitly (no auto-stop except 3s silence)
2. **Stream cleanup:**
   ```typescript
   // In useVoiceRecorder.ts
   const stop = () => {
     if (mediaRecorder.current) {
       mediaRecorder.current.stop();
       mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
     }
     // Revoke blob URL after upload
     if (audioBlobUrl.current) {
       URL.revokeObjectURL(audioBlobUrl.current);
     }
   };
   ```
3. **Permission handling:**
   - Request mic permission only when user taps mic button
   - Handle denial gracefully (fallback to text)
   - Show persistent indicator (tab title "Recording...") during recording
4. **Tab visibility API:** Pause recording if tab becomes hidden (user switched tabs).
5. **No background recording:** Ensure overlay blocks interaction with page below.

---

## 7. Markdown Rendering XSS

**Finding:** Using `react-markdown` with custom component overrides. While `react-markdown` is safe by default, custom components could introduce XSS if they use `dangerouslySetInnerHTML` or improper attribute handling.

**Rating:** LOW-MEDIUM  
**Justification:** `react-markdown` sanitizes by default, but custom table/code components might bypass sanitization for styling.

**Mitigations:**
1. **Never use `dangerouslySetInnerHTML`** in any custom markdown component.
2. **Validate all props:**
   ```typescript
   const CodeBlock = ({ children, className }: { children: string; className?: string }) => {
     // children is already sanitized by react-markdown
     // className comes from markdown (e.g., "language-js") - validate against allowed list
     const allowedLanguages = ['js', 'ts', 'python', 'bash', 'sql'];
     const lang = className?.replace('language-', '');
     if (!allowedLanguages.includes(lang)) return <pre>{children}</pre>;
     // ...
   };
   ```
3. **Rehype plugins:** Use `rehype-sanitize` explicitly even though react-markdown includes basic sanitization:
   ```typescript
   <ReactMarkdown
     rehypePlugins={[rehypeSanitize]}
     components={customComponents}
   >
     {content}
   </ReactMarkdown>
   ```
4. **CSS-only styling:** All visual styling via CSS, no inline styles from markdown.
5. **Content Security Policy (CSP):** Ensure CSP blocks `unsafe-inline` and `unsafe-eval`. Use nonce for any necessary inline scripts.

---

## Summary of Critical Actions Required Before Launch

| Issue | Severity | Required Action |
|-------|----------|-----------------|
| RBAC not enforced at API | CRITICAL | Implement middleware + RLS |
| PII in conversation titles | CRITICAL | Sanitize titles,

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
