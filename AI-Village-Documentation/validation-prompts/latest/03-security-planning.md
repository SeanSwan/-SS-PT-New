# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 57.0s
> **Files:** docs/ai-workflow/blueprints/TEACH-MODE-EXPANSION-PLAN.md
> **Generated:** 3/31/2026, 12:58:53 AM

---

# Security Review: TEACH MODE EXPANSION PLAN

## Executive Summary
**Overall Risk Rating: HIGH** — The plan introduces multiple vectors for PII exposure, insufficient data protection, and inadequate access controls that directly violate the ZERO PII TO LLMs policy. Critical gaps exist in conversation sanitization, voice data handling, and RBAC enforcement. **Do not proceed without addressing CRITICAL findings.**

---

## Detailed Findings & Mitigations

| # | Finding | Rating | Specific Mitigation Required |
|---|---------|--------|------------------------------|
| 1 | **PII Exposure in Conversation History** — Plan mentions "conversation history" and "titles/previews" but provides **zero sanitization strategy**. Titles could contain client names/goals (e.g., "John's shoulder rehab"). If sent to external AI (Gemini) for Coach Assistant features, this violates ZERO PII policy. | **CRITICAL** | 1. **Implement deterministic PII scrubbing** before any AI processing: <br>   - Use regex + NER (spaCy) to redact names, emails, dates, locations from conversation titles/previews.<br>   - Maintain a PII hash map for audit trails (store only hashes, never raw PII).<br>2. **Never send conversation metadata** (titles, timestamps) to external AI. Only send sanitized message bodies after redaction.<br>3. **Add pre-send validation** in `CoachAssistantService.ts`: `sanitizeForLLM(content: string): string` that strips all PII patterns. |
| 2 | **File Attachment SSRF & Malicious Uploads** — Plan states "Image uploads to R2 for AI analysis" but lacks: <br>• File type validation (executables disguised as images)<br>• Virus/malware scanning<br>• SSRF protection if AI service fetches URLs from image metadata/exif. | **HIGH** | 1. **Validate uploads server-side**: <br>   - Use `sharp` to reprocess all images (strips exif, re-encodes).<br>   - Allow only `image/jpeg`, `image/png`, `image/webp`.<br>2. **SSRF Prevention**: <br>   - In `ImageAnalysisService.ts`, when fetching URLs for AI, use a **deny-list** of private IP ranges (RFC 1918, link-local, cloud metadata endpoints).<br>   - Prefer **proxy fetching** through internal service that validates destination URLs.<br>3. **R2 Bucket Policies**: <br>   - Set `x-amz-acl: private`.<br>   - Generate pre-signed URLs with 5-min expiry for AI service only.<br>   - Never expose R2 URLs directly to client. |
| 3 | **Voice Data Privacy & Retention** — "Audio recordings sent to Gemini for transcription" but plan **omits**: <br>• Storage location/duration<br>• Encryption at rest<br>• Whether raw audio is retained after transcription<br>• Gemini data processing addendum compliance. | **CRITICAL** | 1. **Never store raw audio**. Stream directly to Gemini via secure channel, discard after transcription.<br>2. **If storage is unavoidable** (e.g., for re-analysis): <br>   - Encrypt with AES-256-GCM using KMS (AWS/GCP).<br>   - Auto-delete after 24 hours (configurable via `VOICE_RETENTION_HOURS=24`).<br>3. **Update Privacy Policy**: Explicitly state voice data is processed by Gemini, not stored, and PII is redacted pre-send.<br>4. **Add consent flow**: UI must display "Audio will be sent to Google Gemini for transcription. No recording will be stored." with explicit opt-in. |
| 4 | **Conversation Data at Rest** — JSONB in PostgreSQL. Plan **assumes** encryption/access controls exist but provides **no details**. Health data requires encryption at rest and strict access. | **HIGH** | 1. **Enable PostgreSQL TDE** (Transparent Data Encryption) or use cloud provider's encrypted storage (RDS/Aurora encryption).<br>2. **Column-level encryption** for `messages.jsonb` using `pgcrypto` with per-tenant keys.<br>3. **Audit all access**: <br>   - Add `accessed_by` and `accessed_at` triggers on `conversations` table.<br>   - Log all SELECTs to CloudWatch/Stackdriver.<br>4. **Encryption key management**: Use AWS KMS/GCP KMS, rotate annually. |
| 5 | **RBAC Enforcement Gaps** — Plan describes roles (Admin/Trainer/Client) but **no implementation details**. Risk of horizontal privilege escalation (trainer viewing other trainers' clients). | **CRITICAL** | 1. **Enforce RBAC at API layer** (Express middleware): <br>   ```typescript<br>   // middleware/requireRole.ts<br>   export const requireRole = (role: UserRole) => {<br>     return async (req: Request, res: Response, next: NextFunction) => {<br>       const user = await req.auth;<br>       if (user.role !== role && user.role !== 'ADMIN') {<br>         return res.status(403).json({ error: 'Insufficient role' });<br>       }<br>       next();<br>     };<br>   };<br>   ```<br>2. **Row-Level Security (RLS) in PostgreSQL**: <br>   - Enable RLS on `conversations`, `clients`, `workouts` tables.<br>   - Policy: `USING (client_id = current_user_id() OR trainer_id = current_user_id())`.<br>3. **Never rely on frontend hiding** — backend must validate every request: `GET /api/conversations/:id` must check ownership. |
| 6 | **MediaRecorder API Data Leaks** — Browser microphone access. Plan **ignores**: <br>• Permission revocation on tab close<br>• Stream cleanup to prevent background recording<br>• Secure transmission (TLS) of audio chunks. | **MEDIUM** | 1. **Cleanup on unmount**: <br>   ```typescript<br>   // in TeachModeVoiceInput.tsx<br>   useEffect(() => {<br>     return () => {<br>       if (mediaStream) {<br>         mediaStream.getTracks().forEach(t => t.stop());<br>       }<br>     };<br>   }, []);<br>   ```<br>2. **Permission handling**: Request mic only when user clicks "Record", not on page load.<br>3. **Secure transmission**: Send audio via `WebSocket` over `wss://` or encrypted POST to `/api/voice/transcribe`.<br>4. **Visual indicator**: Always show "Recording..." badge with red dot. |
| 7 | **Markdown XSS via react-markdown** — User-generated content in exercise instructions/coaching cues. If `instructions` field contains malicious markdown (e.g., `<img src=x onerror=stealCookies>`), XSS possible. | **HIGH** | 1. **Sanitize ALL markdown** using `rehype-sanitize`:<br>   ```typescript<br>   import rehypeSanitize from 'rehype-sanitize';<br>   const Markdown = ({ content }) => (<br>     <ReactMarkdown rehypePlugins={[rehypeSanitize]}> {content} </ReactMarkdown><br>   );<br>   ```<br>2. **Content Security Policy (CSP)**: Add header `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'` (tighten further).<br>3. **Validate DB input**: On exercise creation/update, sanitize markdown server-side with `sanitize-html` before saving. |

---

## Additional Critical Concerns Not in Original List

| Finding | Rating | Mitigation |
|---------|--------|------------|
| **AI-Generated Exercise Content** — Plan proposes AI-generating `instructions`/`coachingCues` for 880+ exercises. **Risk**: AI could hallucinate unsafe advice (e.g., "arch your back during bench press"). | **CRITICAL** | 1. **Human-in-the-loop**: All AI-generated exercise content **must be reviewed** by NASM-certified trainer before publishing.<br>2. **Safety filter**: Before saving AI output, run through a **rule-based validator** that checks for contraindicated phrases (e.g., "ignore pain", "hyperextend").<br>3. **Versioning**: Store AI-generated content with `source: 'ai-generated'` flag and `reviewed_by` field. |
| **Cross-Tab Data Leakage** — Teach Mode spans 5 tabs. Risk: Trainer on "Client Management" tab could see another client's data if RBAC fails in one tab. | **HIGH** | 1. **Centralized data fetching**: All tab components must use the **same API endpoints** with consistent RBAC checks.<br>2. **Client ID scoping**: Every API call must include `clientId` (if applicable) and server must verify `clientId` belongs to `trainerId`.<br>3. **Integration test**: Write test simulating trainer A accessing trainer B's client via each tab's endpoint. |
| **Third-Party AI Provider Compliance** — Gemini (Google) processes voice/text. Plan **does not address**: <br>• Data Processing Agreement (DPA) with Google<br>• Whether Gemini stores/uses data for training<br>• HIPAA/BAA coverage (if applicable). | **CRITICAL** | 1. **Sign BAA with Google** for Gemini API (if handling PHI).<br>2. **Configure Gemini** to disable logging/storage: Use `safetySettings` and `storageConfig` to prevent retention.<br>3. **Document in Privacy Policy**: "We use Google Gemini for transcription. Google does not retain your data. See Google's privacy policy."<br>4. **Consider on-prem alternative** if BAA unavailable (e.g., self-hosted Whisper). |

---

## Required Plan Revisions

### 1. **Add Security Section to Plan**
Insert after "Technical Constraints":
```markdown
## Security Requirements
- All AI-bound data (text, audio, images) must pass through `SanitizationService` before external transmission.
- No PII (names, emails, exact locations, dates) may appear in conversation titles, exercise instructions, or voice transcripts sent to LLMs.
- All file uploads must be virus-scanned and reprocessed to strip metadata.
- PostgreSQL must use RLS + TDE. All API endpoints must enforce RBAC.
- Voice data: never stored raw; encrypted in transit; auto-deleted after 24h.
```

### 2. **Update "Data Requirements" Section**
Change:
> "For exercises missing `instructions`/`coachingCues` in DB, use AI-generated defaults..."

To:
> "For exercises missing `instructions`/`coachingCues`, generate AI defaults **only after** sanitizing exercise name/type (no PII). All AI output **must be reviewed** by a certified trainer before display. Store with `source: 'ai-generated'` and `reviewed_by`."

### 3. **Add "Sanitization Pipeline" Diagram**
```
User Input → Express Middleware (PII Redactor) → DB (Encrypted) → 
AI Request? → SanitizationService (Strip PII) → External AI → 
Response → SanitizationService (XSS/Unsafe Advice Filter) → UI
```

### 4. **Specify RBAC in "Implementation"**
For each tab's Teach Mode, add:
> "All API calls from this component must include `trainerId`/`clientId` and be validated by `requireRole` middleware. Test with `supertest` for privilege escalation."

---

## Final Verdict

**DO NOT IMPLEMENT** as written. The plan violates the ZERO PII TO LLMs policy in multiple areas and lacks fundamental security controls. **Priority fixes**:

1. **CRITICAL**: Implement PII sanitization for all AI-bound data (conversations, voice, exercise content).
2. **CRITICAL**: Define voice data retention/destruction policy and obtain proper consents.
3. **HIGH**: Enforce RBAC at API layer with RLS; add audit logging.
4. **HIGH**: Sanitize markdown and validate AI-generated exercise content for safety.
5. **HIGH**: Secure file uploads with validation, reprocessing, and SSRF protection.

**Recommended Action**: Halt development until security architecture is reviewed and the above mitigations are implemented in a separate "Security Spike" (estimated 2-3 weeks). The current plan assumes security is handled elsewhere — it is not.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
