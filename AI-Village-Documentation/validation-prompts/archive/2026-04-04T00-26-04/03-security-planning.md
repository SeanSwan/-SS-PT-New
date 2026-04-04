# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 45.5s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-BUILDER-OVERHAUL-PLAN.md
> **Generated:** 4/3/2026, 5:26:04 PM

---

# Security Review: Bootcamp Builder Overhaul Plan

## Executive Summary
**Overall Risk Level: CRITICAL**  
The plan introduces significant AI/voice/data handling features that directly conflict with the **ZERO PII TO LLMs** policy. Multiple components risk exposing personal health information (PHI) to external AI providers (Gemini) or inadequate storage/access controls. **Do not implement until all CRITICAL/HIGH findings are resolved.**

---

## Detailed Findings & Mitigations

### 1. PII Exposure in AI Features
**Risk Rating: CRITICAL**  
**Finding:** The plan integrates Gemini LLM via `aiChatService.mjs` for exercise selection, explanations, modifications, and post-class recommendations. No sanitization mechanism is described for:
- Conversation history/titles that may contain client names, trainer names, or health conditions
- Exercise detail context that could reference specific client pain entries or profiles
- "Ask AI for help" feature in Exercise Detail Panel that may include client-specific context

**Required Mitigations:**
```javascript
// BEFORE any LLM call, implement:
1. STRICT_SANITIZATION_LAYER:
   - Remove all proper nouns (names, locations)
   - Replace client IDs with anonymized tokens (e.g., "Client_ABC123")
   - Strip explicit health data (pain descriptions, injuries) unless absolutely necessary
   - Use a whitelist approach: only allow NASM terminology, exercise names, equipment types

2. CONTEXT_WINDOW_LIMITING:
   - Truncate conversation history to last 3-5 messages
   - Never send full class history or client profiles

3. AUDIT_LOGGING:
   - Log all LLM inputs/outputs with user_id, timestamp, and PII-scan result
   - Daily automated scans for PII leakage patterns

4. POLICY_VIOLATION_GUARD:
   - Pre-flight check that rejects any payload containing:
     * Email patterns, phone numbers
     * Full names (detected via NER)
     * Exact dates (use relative: "last week" not "2024-01-15")
```

### 2. File Attachment Risks (R2 Image Uploads)
**Risk Rating: HIGH**  
**Finding:** Plan mentions "image uploads to R2 for AI analysis" without specifying:
- File type validation (could allow .html, .svg with scripts)
- Malware scanning before R2 upload
- SSRF prevention if AI fetches URLs from image metadata
- R2 bucket permissions (public vs private)

**Required Mitigations:**
```javascript
// Upload pipeline:
1. VALIDATION:
   - Accept only: image/jpeg, image/png, image/webp
   - Max 10MB per file
   - Use `sharp` library to re-encode (strips metadata/scripts)

2. SSRF_PROTECTION:
   - If AI fetches URLs: implement URL allowlist (only sswanstudios.com domains)
   - Or: proxy all fetches through backend with timeout/circuit breaker

3. R2_SECURITY:
   - Bucket: private, no public access
   - Generate presigned URLs (5min expiry) for AI analysis only
   - Auto-delete after 24h unless explicitly saved

4. MALWARE_SCANNING:
   - Integrate ClamAV or cloud-based scanning before R2 upload
   - Quarantine suspicious files
```

### 3. Voice Data Privacy (Gemini Transcription)
**Risk Rating: CRITICAL**  
**Finding:** Audio recordings sent to Gemini for transcription. Plan is silent on:
- Storage duration of raw audio files
- Encryption at rest for recordings
- Whether transcriptions are linked to client IDs
- Consent mechanisms for recording

**Required Mitigations:**
```javascript
// Voice data handling:
1. MINIMIZE_RETENTION:
   - Raw audio: delete immediately after transcription (success/failure)
   - Transcriptions: store only as encrypted JSONB, auto-delete after 30 days
   - Exception: only retain if user explicitly "saves session"

2. ANONYMIZATION:
   - Never send client/trainer names in audio metadata
   - Use session tokens instead of user IDs in transcription requests

3. CONSENT_FLOW:
   - Explicit opt-in per session: "This recording will be sent to Google Gemini for transcription and deleted immediately after."
   - Record consent timestamp in audit log

4. ENCRYPTION:
   - At rest: PostgreSQL pgcrypto for transcriptions
   - In transit: TLS 1.3 for all Gemini API calls
```

### 4. Conversation Data at Rest (PostgreSQL JSONB)
**Risk Rating: HIGH**  
**Finding:** Messages stored as JSONB in PostgreSQL. Plan doesn't specify:
- Encryption at rest (PostgreSQL default is unencrypted)
- Row-Level Security (RLS) implementation
- Backup encryption
- Access logging for conversation queries

**Required Mitigations:**
```sql
-- Database hardening:
1. ENCRYPTION:
   - Enable PostgreSQL TDE (Transparent Data Encryption) or use filesystem encryption (LUKS)
   - For JSONB fields: use pgcrypto for sensitive subfields

2. ROW_LEVEL_SECURITY:
   CREATE POLICY conversation_access_policy ON conversations
   USING (
     -- Client sees only own
     (role = 'client' AND client_id = current_user_id())
     -- Trainer sees only assigned clients
     OR (role = 'trainer' AND client_id IN (
         SELECT client_id FROM trainer_assignments 
         WHERE trainer_id = current_user_id()
     ))
     -- Admin sees all
     OR (role = 'admin')
   );

3. ACCESS_CONTROLS:
   - All API routes must verify: `user_id === conversation.client_id` OR trainer-assignment check
   - Never expose conversation IDs in URLs (use UUIDs, not sequential)

4. AUDIT:
   - Log all conversation reads with user_id, conversation_id, timestamp
   - Alert on: trainer accessing >20 conversations/day, bulk exports
```

### 5. RBAC Enforcement Gaps
**Risk Rating: HIGH**  
**Finding:** Plan describes intended RBAC ("Admin sees all, Trainer sees assigned, Client sees own") but provides **zero implementation details**. New routes (`/api/bootcamp/*`) and AI endpoints likely bypass existing checks.

**Required Mitigations:**
```javascript
// Centralized RBAC middleware:
1. NEW_ENDPOINT_PROTECTION:
   - All bootcampRoutes.mjs must use: `authorize(['admin', 'trainer', 'client'])`
   - Trainer endpoints: additionally check `trainer_assignments` table

2. OWNERSHIP_VERIFICATION:
   // Example for GET /api/bootcamp/conversations/:id
   async function getConversation(req, res) {
     const conv = await Conversation.findByPk(req.params.id);
     
     if (req.user.role === 'client' && conv.client_id !== req.user.id) {
       return res.status(403).json({error: 'Access denied'});
     }
     
     if (req.user.role === 'trainer') {
       const assignment = await TrainerAssignment.findOne({
         where: {trainer_id: req.user.id, client_id: conv.client_id}
       });
       if (!assignment) return res.status(403).json({error: 'Not your client'});
     }
   }

3. FRONTEND_GUARD:
   - Hide UI elements based on role (already planned)
   - But backend must enforce regardless of UI

4. REGULAR_AUDIT:
   - Weekly scan: "Find all conversations where trainer_id != current trainer but accessed"
```

### 6. MediaRecorder API Risks
**Risk Rating: MEDIUM**  
**Finding:** Browser microphone access for voice recordings. Risks:
- Permission not revoked after use (stream leak)
- Data stored in browser memory before upload
- No clear UI indicator when recording

**Required Mitigations:**
```typescript
// Frontend voice handling:
1. PERMISSION_SCOPES:
   navigator.mediaDevices.getUserMedia({ audio: true })
     .then(stream => {
       // Immediately stop all tracks when done
       stream.getTracks().forEach(track => track.stop());
     });

2. MEMORY_CLEANUP:
   // After upload:
   audioBlob = null;
   mediaRecorder = null;
   stream = null;

3. VISUAL_INDICATOR:
   - Red pulsing dot when recording
   - "Recording... 00:45" with stop button always visible

4. FALLBACK:
   - If MediaRecorder unsupported, disable voice feature (don't polyfill with insecure alternatives)
```

### 7. Markdown Rendering XSS
**Risk Rating: HIGH**  
**Finding:** `react-markdown` with user-generated content (Teach Me mode, AI explanations). Without sanitization, allows:
- `<script>` tags
- `onerror` attributes in images
- `javascript:` URLs

**Required Mitigations:**
```typescript
// Install: npm install react-markdown remark-gfm rehype-sanitize
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

<ReactMarkdown
  rehypePlugins={[rehypeSanitize]}
  components={{
    // Disallow all HTML except safe tags
    a: ({node, ...props}) => <a target="_blank" rel="noopener" {...props} />,
    img: ({node, ...props}) => <img {...props} /> // rehype-sanitize handles src validation
  }}
>
  {content}
</ReactMarkdown>

// Server-side: also sanitize before storing in DB
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userMarkdown);
```

---

## Additional Critical Concerns

### 8. AI Chat Service Data Flow
**Risk Rating: CRITICAL**  
The plan references `aiChatService.mjs` but doesn't define:
- What data is sent to Gemini (full conversation? just current prompt?)
- Whether Gemini API key is exposed in frontend (should be backend-only)
- Rate limiting to prevent data exfiltration via prompt injection

**Mitigation:**
```javascript
// aiChatService.mjs MUST:
1. Be backend-only (never imported in frontend)
2. Implement strict input validation:
   - Max 2000 characters per prompt
   - Block any string matching PII regex patterns
3. Use Google's Vertex AI with VPC-SC to prevent data egress
4. Log all prompts/responses for audit
```

### 9. Teach Me Mode Content Source
**Risk Rating: MEDIUM**  
If Teach Me content is AI-generated dynamically, it could leak PII from training data. If static markdown, ensure it's reviewed.

**Mitigation:**
- Start with **static, pre-approved markdown files** (no AI generation)
- If AI-generated later: use separate fine-tuned model **never trained on client data**
- All content must pass PII scan before display

### 10. Mobile Responsiveness & Data Leakage
**Risk Rating: LOW**  
New mobile layout may accidentally display client data in screenshots/previews. Ensure:
- No client names in class previews (use "Client A" or role-based)
- Screenshot protection (CSS `user-select: none` on sensitive areas)

---

## Implementation Checklist (Must Complete Before Launch)

### Phase 1: Data Sanitization (CRITICAL)
- [ ] Implement PII detection library (presidio, NER) in `aiChatService.mjs`
- [ ] Create "sanitizeForLLM()" function used by ALL AI features
- [ ] Test with sample conversations containing fake PII (e.g., "John Smith, knee pain")
- [ ] Audit log all LLM calls with sanitized input hash

### Phase 2: Access Controls (HIGH)
- [ ] Add RBAC middleware to ALL new bootcamp routes
- [ ] Implement Row-Level Security in PostgreSQL
- [ ] Test: trainer cannot access another trainer's client conversations
- [ ] Test: client cannot access other clients' data via URL manipulation

### Phase 3: Voice & Files (HIGH)
- [ ] Set R2 bucket to private, 24h auto-delete
- [ ] Add ClamAV scanning to upload pipeline
- [ ] Implement voice recording consent UI + audit log
- [ ] Delete raw audio immediately after transcription

### Phase 4: Frontend Security (HIGH)
- [ ] Add DOMPurify to ALL react-markdown instances
- [ ] Ensure MediaRecorder streams are stopped/cleaned
- [ ] Verify no PII in class preview titles (use generic: "Lower Body Day 3")

### Phase 5: Monitoring (MEDIUM)
- [ ] Set up alerts for:
  - >10 LLM calls/minute from single user
  - Failed PII scans
  - RBAC violations
- [ ] Weekly report: "PII leakage attempts detected"

---

## Policy Compliance Statement

**This plan currently violates the ZERO PII TO LLMs policy in multiple areas.**  
**Do not proceed with AI features until:**
1. A formal **Data Flow Diagram** is created showing exactly what data touches Gemini
2. **Legal/Privacy team** approves the sanitization approach
3. **Penetration test** includes AI prompt injection scenarios
4. **All CRITICAL findings** have technical mitigations implemented and verified

**Recommended Immediate Actions:**
1. **Pause** all AI integration work (3F, AI Chat features)
2. **First implement** RBAC enforcement and conversation encryption (findings #4, #5)
3. **Build PII sanitization PoC** and test with real conversation data
4. **Review voice recording** with legal—consider removing until retention policy is defined

**Risk if Unaddressed:**  
- HIPAA violation (PHI to third-party AI)
- GDPR Article 44 violation (international data transfer without safeguards)
- Client trust erosion, regulatory fines, platform shutdown

---

**Reviewer:** Security Engineer  
**Date:** 2025-02-15  
**Next Review:** After mitigations implemented  
**Approval Required:** CISO, Legal, Privacy Officer

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
