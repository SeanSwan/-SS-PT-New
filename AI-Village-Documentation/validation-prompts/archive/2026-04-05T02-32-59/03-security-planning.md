# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 31.4s
> **Files:** docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-VISION-REFACTOR-2026-04-05.md
> **Generated:** 4/4/2026, 7:32:59 PM

---

# Security Review: SwanStudios Homepage & About Page Vision Refactor

## Executive Summary
The proposed changes are **content-only updates** (text replacements, new static sections) with **no new data processing, storage, or AI integration** introduced. The plan itself poses **minimal direct security risk**. However, the **contextual references to AI features** (voice transcription, image analysis, conversation history) reveal **critical gaps** in the platform's overall security posture for PII handling. The plan's status ("AI Village Review Required") correctly identifies that **security review must focus on the unimplemented AI workflows**, not these static content changes.

---

## Detailed Finding Analysis

### 1. PII Exposure in Conversation History
**Rating:** CRITICAL (for the AI feature, not this plan)
**Plan Relevance:** ❌ Not addressed in this plan.
**Issue:** The plan's context mentions "conversation history" for the AI coach, but this document contains **zero implementation details** about sanitization. If user messages (text/voice transcripts) contain PII (names, locations, health details) and are stored/processed without stripping, this violates the ZERO PII TO LLMs policy.
**Mitigation Required:**
- Implement **PII detection/redaction** (using local models like Microsoft Presidio or AWS Comprehend Medical) **before** any data leaves the trusted environment.
- **Never** send raw conversation history to external AI providers. Use synthetic/aggregated data for training.
- Audit all conversation storage (PostgreSQL JSONB) for existing PII and purge/redact.

### 2. File Attachment Risks (Image Uploads to R2)
**Rating:** HIGH (for the AI feature, not this plan)
**Plan Relevance:** ❌ Not addressed in this plan.
**Issue:** The context mentions image uploads to Cloudflare R2 for AI analysis. The plan provides **no security controls** for:
- **Malicious file uploads**: No mention of file type validation, virus scanning, or content inspection.
- **SSRF via image URLs**: If the AI feature fetches user-provided URLs, no safeguards against internal network access.
**Mitigation Required:**
- **Strict validation**: Allow only image MIME types (`image/jpeg`, `image/png`, `image/webp`). Reject SVG (XSS risk).
- **Virus/Malware scanning**: Integrate ClamAV or similar on upload.
- **Content Disarm & Reconstruction (CDR)**: Strip metadata (EXIF) that could contain GPS/PII.
- **SSRF protection**: If fetching external URLs, use a sandboxed service with egress restrictions and URL allowlisting.
- **R2 bucket policies**: Private buckets, signed URLs with short expiry, CORS restrictions.

### 3. Voice Data Privacy (Gemini Transcription)
**Rating:** CRITICAL
**Plan Relevance:** ❌ Not addressed in this plan.
**Issue:** The context states audio recordings are sent to Gemini. The plan **does not specify**:
- **Storage duration**: How long are raw audio files and transcripts kept?
- **Retention policy**: Are they deleted after processing? After user deletion?
- **Consent**: Is explicit opt-in obtained? Is the privacy policy updated?
- **Data flow**: Does Gemini store the audio? (Check Google's data retention policy).
**Mitigation Required:**
- **Ephemeral processing**: Stream audio directly to transcription service; **never store raw audio** locally or in R2 unless explicitly consented for coaching memory.
- **Immediate deletion**: Auto-delete transcripts after 24h unless user saves to conversation history (which must be PII-sanitized per #1).
- **Clear consent**: UI must disclose "Audio will be sent to Google Gemini for transcription. We do not store raw audio. Transcripts are retained for X days." with granular opt-in.
- **Legal review**: Update privacy policy to cover biometric data (voiceprints) and third-party processing.

### 4. Conversation Data at Rest (PostgreSQL JSONB)
**Rating:** HIGH
**Plan Relevance:** ❌ Not addressed in this plan.
**Issue:** The plan assumes conversations exist but provides **no encryption or access control details**. JSONB fields may contain PII.
**Mitigation Required:**
- **Encryption at rest**: Ensure PostgreSQL uses TDE (Transparent Data Encryption) or disk-level encryption (AWS RDS default is sufficient if managed).
- **Column-level encryption**: For highly sensitive fields (e.g., health conditions), use application-level encryption (e.g., `pgcrypto`) with keys in KMS.
- **Access controls**: Enforce row-level security (RLS) in PostgreSQL so users can only query their own conversations. **Never rely solely on application-layer checks**.

### 5. RBAC Enforcement
**Rating:** HIGH
**Plan Relevance:** ❌ Not addressed in this plan.
**Issue:** The plan describes admin/trainer/client roles but **no implementation details** for enforcement. This is a classic "missing authorization" vulnerability.
**Mitigation Required:**
- **Backend middleware**: Every API endpoint fetching conversations must verify:
  ```javascript
  // Pseudo-code
  if (user.role === 'client') {
    where.clause = { userId: user.id }; // Strict filter
  } else if (user.role === 'trainer') {
    where.clause = { trainerId: user.id }; // Only assigned clients
  }
  // Admin role explicitly denied from this endpoint unless separate admin API
  ```
- **Database RLS**: Implement PostgreSQL Row Level Security policies as a second line of defense.
- **Audit logs**: Log all conversation access with user ID, timestamp, and conversation ID.

### 6. MediaRecorder API Risks (Browser Microphone)
**Rating:** MEDIUM
**Plan Relevance:** ❌ Not addressed in this plan.
**Issue:** The voice feature uses `MediaRecorder`. Risks:
- **Permission handling**: No mention of graceful denial handling or UI feedback.
- **Stream cleanup**: Forgetting to `track.stop()` can leave microphone active.
- **Data leak**: Audio chunks in memory could be intercepted by malicious extensions.
**Mitigation Required:**
- **Explicit UI**: Show clear "Recording" indicator with stop button. Request permission only when user initiates recording.
- **Cleanup**: In React `useEffect` cleanup, stop all media tracks.
- **Secure transport**: Use HTTPS only. Send audio chunks via `fetch` with `ReadableStream` to avoid storing in browser memory longer than needed.
- **Content Security Policy (CSP)**: Restrict `media-src` to trusted origins.

### 7. Markdown Rendering XSS
**Rating:** MEDIUM
**Plan Relevance:** ⚠️ **Indirectly relevant** — the plan updates text content that *may* be rendered as markdown.
**Issue:** The platform uses `react-markdown`. If any new text sections (e.g., "Why We Built This", promise cards) are stored as user-editable markdown (unlikely for static content), XSS is possible via `<script>` or `onerror` in images.
**Mitigation Required:**
- **Sanitization**: Use `rehype-sanitize` with a strict allowlist (only `<p>`, `<strong>`, `<em>`, `<ul>`, `<li>`, etc.). **Never** allow `iframe`, `script`, or event handlers.
- **Static content**: Ensure these new sections are **hardcoded strings**, not user-editable markdown. If they must be editable by admins, store as plain text and apply markdown server-side with sanitization.
- **CSP**: Add `default-src 'self'; script-src 'self'` to mitigate XSS impact.

---

## Risk Summary Table

| Finding | Rating | Plan Relevance | Status |
|---------|--------|----------------|--------|
| PII in Conversations | CRITICAL | ❌ Not addressed | **Gap** |
| File Upload Risks | HIGH | ❌ Not addressed | **Gap** |
| Voice Data Privacy | CRITICAL | ❌ Not addressed | **Gap** |
| Conversation Storage | HIGH | ❌ Not addressed | **Gap** |
| RBAC Enforcement | HIGH | ❌ Not addressed | **Gap** |
| MediaRecorder API | MEDIUM | ❌ Not addressed | **Gap** |
| Markdown XSS | MEDIUM | ⚠️ Indirect | **Monitor** |

---

## Critical Recommendations

1. **Halt AI Feature Development** until a **threat model** is created for the voice/image/chat features. The ZERO PII TO LLMs policy must be technically enforced, not just stated.
2. **Separate Security Review**: The "AI Village Review" must **not** approve this homepage plan until the **AI workflow security architecture** is documented and approved.
3. **Immediate Actions**:
   - Document **data flow diagrams** for voice transcription and image analysis, highlighting PII touchpoints.
   - Implement **PII redaction pipeline** for all text before external AI processing.
   - Design **encryption-at-rest** and **RBAC** for conversation JSONB.
   - Create **file upload security spec** (validation, scanning, SSRF protection).
4. **This Plan Itself**: The homepage/about changes are **low-risk** from a security perspective **if**:
   - All new text is hardcoded (no user-editable markdown).
   - No new API endpoints or data storage are introduced.
   - Existing XSS/RBAC protections in the codebase are not weakened.

**Final Verdict**: **APPROVE** this content-only plan **conditionally**, with the explicit requirement that **no AI features (voice, image, chat) are implemented until the critical gaps above are resolved and reviewed by security.** The plan's status ("AI Village Review Required") is correct—the review must focus on the **unbuilt AI systems**, not these static page updates.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
