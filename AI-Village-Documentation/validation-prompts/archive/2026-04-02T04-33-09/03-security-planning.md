# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 44.8s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-CREATOR-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 9:33:09 PM

---

# Security Review: Bootcamp Creator Upgrade Plan

## Executive Summary
The plan introduces significant AI integration and data handling changes that **directly conflict** with the ZERO PII TO LLMs policy. Multiple critical gaps exist around data sanitization, storage, and access controls. **DO NOT PROCEED** without addressing these issues.

---

## Detailed Findings

### 1. PII Exposure in AI Hive Mind Integration
**Rating: CRITICAL**

**Issue:** The plan states AI receives "recent class history" which contains client identifiers, exercise preferences, and potentially injury/health data. No sanitization mechanism is described before sending to external providers (Gemini, Qwen).

**Violation:** Direct breach of ZERO PII TO LLMs policy.

**Mitigations Required:**
- **Immediate:** Implement a **PII stripping layer** in `bootcampGenerator.mjs` that:
  - Removes all client names, emails, phone numbers from class history
  - Replaces client identifiers with anonymized tokens (e.g., "Client_A", "Client_B")
  - Aggregates injury flags to counts only (e.g., "3 clients with knee issues" vs. "John Doe, Jane Smith have knee issues")
  - Uses a whitelist approach: only send equipment types, exercise names, duration, rounds, setup times
- **Architectural:** Route all AI requests through a **sanitization proxy** that validates payloads against a PII schema before forwarding
- **Policy:** Update privacy policy to explicitly state what aggregated, anonymized data is shared with AI providers
- **Audit:** Implement logging of all AI payloads (pre- and post-sanitization) for compliance review

---

### 2. File Attachment Risks (R2 Uploads)
**Rating: HIGH**

**Issue:** Plan mentions "equipment profile picker" and potential image uploads, but **no security controls** described for:
- File type validation (executable uploads)
- Virus/malware scanning
- SSRF via image URLs (if AI fetches external URLs)
- R2 bucket permissions (public vs. private)

**Mitigations Required:**
- **Validation:** Implement strict file type whitelist (jpg, png, pdf only) with magic number verification
- **Scanning:** Integrate ClamAV or similar for malware scanning before R2 upload
- **SSRF Protection:** If AI analyzes images, use a **proxy service** that fetches URLs server-side with:
  - Private VPC egress only
  - Blocklist for internal IP ranges (127.0.0.1, 10.0.0.0/8, 192.168.0.0/16)
  - URL scheme whitelist (http/https only)
- **R2 Security:** 
  - Buckets must be **private** with presigned URLs for access
  - CORS restrictions to specific domains
  - Lifecycle policy to auto-delete after 30 days (unless flagged for retention)
- **Rate Limiting:** Per-user upload limits to prevent DoS

---

### 3. Voice Data Privacy
**Rating: CRITICAL** (if voice features exist in platform)

**Issue:** Plan doesn't mention voice, but platform has "voice-first AI coach" as differentiator. **If** voice recordings are stored or processed:
- No retention policy defined
- No encryption at rest specified
- Gemini transcription sends raw audio to external provider (PII violation)

**Mitigations Required:**
- **Retention Policy:** Auto-delete raw audio after transcription (max 24 hours). Store only text transcripts.
- **Encryption:** Encrypt audio files at rest in R2 with SSE-C or client-side encryption
- **Transcription:** Use **on-premise** transcription engine (e.g., Whisper.cpp) instead of cloud APIs. If cloud is required:
  - Send only **anonymized** audio (no client names in metadata)
  - Use regional data processing restrictions
  - Update privacy policy with explicit consent for voice processing
- **Access Controls:** Only the owning trainer can access client voice data; clients can delete their recordings

---

### 4. Conversation Data at Rest (Coach Assistant)
**Rating: HIGH**

**Issue:** Coach Assistant conversations stored as JSONB in PostgreSQL. Plan doesn't specify:
- Encryption at rest (PostgreSQL TDE?)
- Field-level encryption for sensitive messages
- Access controls beyond basic RBAC
- Retention/deletion policies

**Mitigations Required:**
- **Encryption:** Enable PostgreSQL TDE (transparent data encryption) or application-level encryption for `messages` JSONB field
- **Retention:** Auto-delete conversations after 90 days (configurable per compliance requirement)
- **Access Logging:** Audit table for all conversation access with user_id, timestamp, action
- **Data Minimization:** Store only necessary context; prune old messages beyond 30-day window
- **Backup Security:** Encrypted backups with same retention policy

---

### 5. RBAC Enforcement Gaps
**Rating: CRITICAL**

**Issue:** Plan describes roles but **no implementation details** for:
- Row-level security (RLS) in PostgreSQL
- API middleware enforcing ownership
- Board 2 visibility (should clients see alternative exercises?)

**Missing Controls:**
- Admin: Can view all bootcamp templates BUT should not see client conversations without explicit audit trail
- Trainer: Must only see templates they created AND clients assigned to them
- Client: Should see only their own class logs and assigned bootcamps (not other clients' Board 2 alternatives if they reveal trainer's modifications for others)

**Mitigations Required:**
- **Database RLS:** Implement PostgreSQL Row Level Security policies:
  ```sql
  CREATE POLICY trainer_owns_bootcamp ON BootcampTemplate
    USING (trainer_id = current_user_id());
  CREATE POLICY client_sees_assigned ON BootcampClassLog
    USING (client_id = current_user_id());
  ```
- **API Middleware:** All bootcamp routes must validate:
  ```javascript
  // Example middleware
  const enforceOwnership = async (req, res, next) => {
    const bootcamp = await BootcampTemplate.findByPk(req.params.id);
    if (bootcamp.trainerId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
  ```
- **Board 2 Access:** Board 2 alternatives should be **trainer-only**; clients see only their assigned board (main or alternative) based on ability assessment

---

### 6. MediaRecorder API Risks
**Rating: MEDIUM** (if voice features exist)

**Issue:** Browser microphone access for voice-first features. Plan doesn't address:
- Permission revocation on component unmount
- Stream cleanup to prevent memory leaks
- Data buffering in browser memory (potential XSS target)

**Mitigations Required:**
- **Cleanup:** In `useEffect` cleanup functions:
  ```typescript
  useEffect(() => {
    let stream: MediaStream;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(s => { stream = s; /* use stream */ });
    return () => {
      stream.getTracks().forEach(track => track.stop());
    };
  }, []);
  ```
- **Permission UI:** Clear visual indicator when microphone is active (red dot)
- **Buffer Management:** Clear audio buffers immediately after upload; avoid storing in localStorage/IndexedDB
- **HTTPS Only:** Enforce HTTPS for all pages using MediaRecorder (browser policy)

---

### 7. Markdown Rendering XSS
**Rating: HIGH**

**Issue:** AI explanations and Coach Assistant render markdown via `react-markdown`. User-generated content (trainer chat) could contain malicious markdown:
- `<script>` tags
- `javascript:` URLs
- Event handlers (`onerror`, `onload`)
- CSS injection

**Mitigations Required:**
- **Sanitization:** Use `rehype-sanitize` with strict schema:
  ```typescript
  import rehypeSanitize from 'rehype-sanitize';
  const allowedSchemes = ['http', 'https', 'mailto'];
  const allowedElements = ['a', 'strong', 'em', 'p', 'ul', 'ol', 'li', 'code', 'pre'];
  
  <ReactMarkdown rehypePlugins={[[rehypeSanitize, { allowedElements, allowedSchemes }]]}>
    {content}
  </ReactMarkdown>
  ```
- **No Raw HTML:** Disable `remark-rehype` options that allow raw HTML
- **Link Targets:** Force `target="_blank"` with `rel="noopener noreferrer"` for external links
- **Content Security Policy:** Add CSP header:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline';
  ```

---

## Additional Security Concerns Not in Original List

### 8. AI Prompt Injection
**Rating: HIGH**

**Issue:** Coach Assistant accepts free-text input that becomes part of AI prompts. Malicious input could:
- Extract system prompts
- Override class generation logic
- Access unauthorized data via prompt injection

**Mitigations:**
- **Input Validation:** Reject inputs containing system-like patterns (`<`, `>`, `system:`, `role:`)
- **Prompt Sandboxing:** Use separate, read-only system prompt; user input appended with clear delimiter
- **Output Validation:** Validate AI responses against expected schema (JSON structure) before rendering

### 9. Equipment Profile Data Exposure
**Rating: MEDIUM**

**Issue:** Equipment profiles include location-specific details (gym layouts, equipment quantities). Could reveal business-sensitive information.

**Mitigations:**
- **API Scoping:** Equipment profile API must filter by `spaceProfileId` owned by trainer's organization
- **No Enumeration:** Use non-sequential IDs (UUIDs) to prevent scraping
- **Rate Limiting:** Prevent bulk export of equipment data

---

## Compliance Checklist

| Requirement | Status | Action |
|-------------|--------|--------|
| Zero PII to LLMs | ❌ FAIL | Implement PII stripping layer before any AI call |
| Data Encryption at Rest | ❌ FAIL | Enable PostgreSQL TDE; encrypt R2 objects |
| RBAC Enforcement | ❌ FAIL | Implement RLS + API middleware |
| Audit Logging | ❌ FAIL | Log all AI calls, conversation access, file uploads |
| Retention Policies | ❌ FAIL | Define and implement auto-deletion for conversations, voice, uploads |
| XSS Protection | ❌ FAIL | Add rehype-sanitize to all markdown rendering |
| SSRF Protection | ❌ FAIL | Implement proxy for external URL fetching |

---

## Recommended Actions

1. **HALT** all AI integration work until PII sanitization is implemented and tested
2. **Conduct** a full data flow mapping exercise: trace every piece of data from UI to storage to AI
3. **Implement** the mitigations above in **Phase 0** (decomposition) as security foundations
4. **Engage** legal team to review privacy policy updates required for AI processing
5. **Perform** penetration testing on file upload, markdown rendering, and RBAC before Phase 4 (AI Hive Mind)

---

**Bottom Line:** The plan is **not secure** in its current form. The AI integration, in particular, violates core policies. Security must be built into the decomposition phase, not bolted on later.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
