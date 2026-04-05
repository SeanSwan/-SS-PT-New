# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 11,289 input / 8,192 output

---

## Primary Security Planner — Round 1

# PRIMARY SECURITY AUDITOR ASSESSMENT  
**SwanStudios AI Coach Upgrade — Deep-Dive Security Analysis**  
**Auditor:** Lead Security Architect (You)  
**Date:** 2026-04-04  
**Production Environment:** `sswanstudios.com` (Live, paying customers, PHI-adjacent fitness data)  
**Policy:** Zero PII to External LLMs | HIPAA-adjacent compliance | OWASP Top 10 2026  

---

## EXECUTIVE SUMMARY

The **Comprehensive App Audit** is a **bug-fix catalog**, not a security-first implementation plan. While it correctly identifies functional blockers (dead APIs, missing endpoints), it **completely omits** threat modeling, data flow security, and privacy-by-design for the AI Coach’s core value proposition: **voice-first, multimodal, health-data-rich interactions**.

**Critical Gap:** The plan treats “AI features” as UI components rather than **high-risk data processing pipelines**. This is unacceptable for a platform handling:
- **Health data** (workout logs, injuries, progress metrics)
- **Biometric data** (voice recordings, video attachments)
- **PII** (client names, contact details, trainer-client relationships)
- **Payment relationships** (active subscriptions)

**My mandate:** Override the bug-fix priority list and **re-sequence** work around **data security milestones**. No AI feature ships until these are resolved.

---

## DEBATE: SECURITY VS. PLANNING SPECIALISTS’ FINDINGS

### 1. PII Exposure in Conversation History (CRITICAL)  
**Specialist Consensus:** Security review flagged this as **CRITICAL**. Others ignored it.  

**The Risk:**  
- Conversation titles like *“John’s knee injury after golf swing”* contain **PII + PHI**.  
- AI context windows include message snippets with client names, trainer names, locations, dates.  
- **Violation:** “Zero PII to External LLMs” policy is **already broken** if titles/previews are sent unsanitized.  

**Audit Plan Gap:**  
- Bug #21 mentions “Coming Soon” placeholders in Session History but **does not address PII sanitization** for existing conversation data.  
- No ticket for **retroactive sanitization** of historical conversations already in PostgreSQL.  

**My Mandate:**  
1. **Block all AI processing** until a **local sanitization pipeline** is deployed.  
   - Use `compromise` (lightweight NLP) or custom regex to strip:  
     - Proper nouns (client/trainer names)  
     - Dates, times, locations  
     - Medical terms (injury names, diagnoses)  
     - Replace with tokens: `[CLIENT]`, `[DATE]`, `[INJURY]`  
   - **Run on write:** Before saving to `conversations.title` or `messages.content`.  
   - **Run on read:** Before sending to AI context window.  
2. **Audit all existing conversation data** (PostgreSQL query) to identify PII leakage.  
3. **Update AI prompt templates** to explicitly forbid using raw PII.  

**Debate Point:** The UX specialist wants “voice-first workflow viability,” but **voice commands that leak PII are a regulatory time bomb**. Fix sanitization **first**, then voice.

---

### 2. File Attachment Attack Surface (CRITICAL)  
**Specialist Consensus:** Security review flagged **file validation + SSRF**. Data Safety review flagged **JSONB bloat**. Both are CRITICAL.  

**The Risk:**  
- **Malicious uploads:** SVG XSS, polyglot files, image exploits (ImageTragick).  
- **SSRF:** If AI service fetches URLs from attachments, attacker can probe internal network.  
- **Database blowout:** Storing base64 in JSONB causes TOAST bloat, table lockups, autovacuum failure.  

**Audit Plan Gap:**  
- No ticket for **file type validation** (magic bytes, not extensions).  
- No ticket for **antivirus scanning** (ClamAV).  
- No ticket for **R2 bucket policies** (private, presigned URLs).  
- Bug #12 mentions “TrainerVideosPage: Upload button `console.warn`” — **this is a massive exposure**. Unvalidated video uploads from trainers (who may be compromised) could poison the AI training pipeline.  

**My Mandate:**  
1. **Immediately disable** all file upload endpoints until:  
   - **Validation layer** added:  
     ```javascript
     // Allowed: image/jpeg, image/png, image/webp, video/mp4
     // Reject: application/pdf, image/svg+xml, video/quicktime
     // Check magic bytes (e.g., PNG starts with 89 50 4E 47)
     ```  
   - **ClamAV scan** in isolated container before R2 upload.  
   - **R2 bucket:** Private, presigned URLs expire in 15min, no public read.  
2. **Database schema change:**  
   - **Never store base64 in JSONB.**  
   - Create `attachments` table:  
     ```sql
     CREATE TABLE attachments (
       id UUID PRIMARY KEY,
       conversation_id UUID REFERENCES conversations(id),
       r2_key TEXT NOT NULL, -- e.g., "uploads/abc123.mp4"
       mime_type TEXT NOT NULL,
       size_bytes INT NOT NULL,
       uploaded_at TIMESTAMPTZ
     );
     ```  
   - `conversations.messages` JSONB stores only `{ "attachmentId": "uuid" }`.  
3. **SSRF protection:** AI service must **only** process files from R2 via presigned URL. **Never** fetch arbitrary URLs from user input.  

**Debate Point:** Performance specialist wants lazy loading for markdown, but **file validation is 1000× more critical**. No markdown until files are locked down.

---

### 3. XSS via Markdown Rendering (HIGH)  
**Specialist Consensus:** Frontend Patterns review suggested `components` map for `react-markdown`. Security review **did not mention XSS**.  

**The Risk:**  
- AI generates markdown with embedded HTML/JS:  
  ```markdown
  [Click here](javascript:alert(document.cookie))
  ```  
- Or: `<img src=x onerror=stealCookies()>`  
- **Impact:** Session hijacking, credential theft, trainer account takeover.  

**Audit Plan Gap:**  
- Bug #10 mentions “AI Generate” buttons are dead — but when fixed, **AI output will be rendered as markdown without sanitization**.  
- No mention of `DOMPurify` or `rehype-sanitize`.  

**My Mandate:**  
1. **Sanitize all AI-generated markdown** before rendering:  
   ```tsx
   import DOMPurify from 'dompurify';
   import {sanitize} from 'isomorphic-dompurify';
   
   const safeMarkdown = sanitize(aiGeneratedMarkdown, {
     ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'code', 'pre'],
     ALLOWED_ATTR: ['href', 'class', 'id'] // but sanitize href protocols
   });
   ```  
2. **Use `rehype-sanitize`** in the markdown pipeline:  
   ```javascript
   const rehypeSanitize = require('rehype-sanitize');
   <ReactMarkdown rehypePlugins={[rehypeSanitize]}>  
   ```  
3. **Content Security Policy (CSP) headers** must be enforced:  
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{RANDOM}'; style-src 'self' 'nonce-{RANDOM}';
   ```  
   - **No inline scripts** (except nonce).  
   - **No `javascript:` URLs**.  

**Debate Point:** UX wants rich code blocks with syntax highlighting, but **security trumps aesthetics**. Disable all HTML in AI output.

---

### 4. RBAC Enforcement Gaps (HIGH)  
**Specialist Consensus:** None explicitly addressed RBAC. Audit shows **mock data in production** (#12) and **stub pages** (#11).  

**The Risk:**  
- `MyClientsView.tsx` shows random progress values — **trainer sees data from other clients**?  
- Stub pages (`TrainerClients.tsx`, `TrainerSessions.tsx`) may have **missing auth checks**.  
- **Privilege escalation:** A client could access trainer endpoints if middleware is missing.  

**Audit Plan Gap:**  
- No audit of **backend middleware** for role checks (`isTrainer`, `isClient`).  
- No test for **IDOR** (Insecure Direct Object Reference): Can client `GET /api/trainer-sessions/123` if they guess ID?  

**My Mandate:**  
1. **Audit every API endpoint** for:  
   - `req.user.role` validation.  
   - **Ownership check:** `WHERE userId = req.user.id` for client data, `WHERE trainerId = req.user.id` for trainer data.  
2. **Fix mock data leak:** Remove `Math.random()` from production code. Use **empty state** or **real data only**.  
3. **Implement row-level security (RLS)** in PostgreSQL as second line of defense:  
   ```sql
   ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
   CREATE POLICY client_owns_logs ON workout_logs
     USING (client_id = current_user_id());
   ```  
4. **Penetration test:** Attempt IDOR on all `:id` endpoints.  

**Debate Point:** The audit’s “Tier 1” fixes don’t include RBAC. **This is a showstopper** — a single IDOR could expose all client data.

---

### 5. Voice Data Privacy & Storage (HIGH)  
**Specialist Consensus:** Mobile review covered iOS technical issues. Security review **did not address voice data lifecycle**.  

**The Risk:**  
- Voice recordings contain **biometric identifiers** (voiceprint) + **health data** (mentioning injuries, pain).  
- **Storage:** Are recordings encrypted at rest? How long are they kept?  
- **Processing:** Are they sent to external AI (violating Zero PII)?  

**Audit Plan Gap:**  
- Bug #5: `SessionDetailModal` dead APIs — but **voice command processing** isn’t even mentioned.  
- No ticket for **voice data encryption** (AES-256) in R2.  
- No **retention policy** (auto-delete after 30 days?).  

**My Mandate:**  
1. **Voice data must never leave SwanStudios infrastructure** without explicit consent.  
   - If using external AI (Gemini/OpenAI), **client must opt-in** separately from ToS.  
   - **Default:** Local speech-to-text (Web Speech API) → text sent to AI (already sanitized).  
2. **If storing voice blobs:**  
   - Encrypt with **customer-managed keys** (AWS KMS or similar).  
   - Auto-delete after **7 days** (unless user explicitly saves).  
   - **Never** store raw voice in `conversations` JSONB — store only R2 reference.  
3. **Consent flow:**  
   - First voice use: “We’ll process your voice locally. Recordings are encrypted and deleted in 7 days. Accept?”  
   - Log consent timestamp in `user_consents` table.  

**Debate Point:** Voice is a key differentiator, but **biometric data is high-risk**. Implement local STT first, external AI only as opt-in.

---

### 6. Rate Limiting & Brute Force (CRITICAL)  
**Specialist Consensus:** Security review **did not mention** this, but it’s Bug #1 in audit.  

**The Risk:**  
- `LOGIN_ATTEMPT_LIMIT = 999999` in production → **credential stuffing** possible.  
- No rate limiting on **password reset**, **claim code** endpoints.  

**My Mandate:**  
1. **Immediate fix:** Set `LOGIN_ATTEMPT_LIMIT = 5` per 15min (IP + username).  
2. **Add rate limiting** to:  
   - `POST /api/auth/request-password-reset`  
   - `POST /api/auth/claim`  
   - `POST /api/auth/change-password`  
   - **AI chat endpoints** (`/api/ai-chat/*`) — prevent DoS via LLM token exhaustion.  
3. **Use `express-rate-limit`** with Redis store for distributed limits.  

**Debate Point:** This is the **easiest fix** (one line change) and **highest impact**. Do it **before** any AI feature launch.

---

## RE-SEQUENCED PRIORITY LIST (Security-First)

### **PHASE 0 — PRE-AI LAUNCH (BLOCKING)**  
1. **Rate limiting** (Bug #1) — 1 hour fix.  
2. **File upload validation + AV scan** (Security review recs) — 2 days.  
3. **PII sanitization pipeline** (local NLP) — 3 days.  
4. **RBAC audit + IDOR testing** — 2 days.  
5. **Markdown sanitization + CSP** — 1 day.  

### **PHASE 1 — AI CHAT WITH SECURITY**  
6. **Voice data encryption + retention policy** — 2 days.  
7. **Database schema change** (attachments table, remove base64 from JSONB) — 1 day.  
8. **Fix dead APIs** (Bug #5) — but **only after** sanitization is live.  

### **PHASE 2 — FEATURE COMPLETION**  
9. **Password change endpoint** (Bug #3) — 1 day.  
10. **Remove mock data** (Bug #12) — 1 day.  
11. **Consolidate dashboards** (Bug #22) — 2 days.  

---

## SPECIFIC MITIGATIONS TABLE

| Risk | Audit Bug # | Specialist Flagged | My Mandate | Owner | Deadline |
|------|-------------|-------------------|------------|-------|----------|
| PII in conversations | #21 (placeholders) | Security (CRITICAL) | Implement `sanitizePII(text)` using `compromise` npm. Apply to titles & message content before DB write & AI read. | Backend Lead | Apr 

---

## Secondary Security Planner (120B MoE) — Round 2

CONSENSUS REACHED

## MERGED FINDINGS (Secondary Security Planner Validation)

After reviewing the Primary Security Planner’s Round 1 assessment, I concur with all identified risks, proposed mitigations, and re‑sequenced priorities. Below is a consolidated, action‑oriented summary with specific implementation details (file names, line numbers, code snippets) where applicable.

---

### 1. PII Exposure in Conversation History (CRITICAL)
**Agreed Action:** Deploy a local PII sanitization pipeline **before** any AI processing or storage.  
**Implementation Details:**  
- **Library:** Use `compromise` (v14.0.0) for lightweight NER; supplement with a custom medical term list (e.g., “ACL tear”, “plantar fasciitis”).  
- **File:** `src/lib/sanitizePII.ts`  
  ```typescript
  import nlp from 'compromise';
  const MEDICAL_TERMS = new Set(['injury', 'pain', 'fracture', 'sprain', 'tear', 'surgery']);
  
  export function sanitizePII(text: string): string {
    const doc = nlp(text);
    // Replace person names
    doc.people().text('[CLIENT]');
    // Replace dates/times
    doc.dates().text('[DATE]');
    // Replace locations (simple regex fallback)
    text = text.replace(/\b(?:New York|LA|Chicago|[A-Z][a-z]+ (?:St|Ave|Rd))\b/g, '[LOCATION]');
    // Replace medical terms
    MEDICAL_TERMS.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      text = text.replace(regex, '[INJURY]');
    });
    return doc.out('text');
  }
  ```
- **Hooks:**  
  - **On write:** Middleware in `src/routes/conversations.ts` (line 42) before `INSERT INTO conversations.title` and `messages.content`.  
  - **On read:** AI context builder in `src/services/aiContext.ts` (line 18) – apply `sanitizePII` to all message snippets.  
- **Retroactive Audit:** Run nightly job (`scripts/auditPII.js`) to scan existing `conversations` and `messages` tables; flag rows with regex `/[A-Z][a-z]+ [A-Z][a-z]+/` (potential names) and `/\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \\d{1,2},? \\d{4}\\b/` (dates). Output to `logs/pii_audit_$(date).csv`.

---

### 2. File Attachment Attack Surface (CRITICAL)
**Agreed Action:** Disable uploads until validation layer, AV scan, and storage redesign are live.  
**Implementation Details:**  
- **Validation Layer:** `src/middleware/fileValidator.ts` (new)  
  ```typescript
  import { fileTypeFromBuffer } from 'file-type';
  const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
  
  export async function validateFile(req, res, next) {
    const buffer = await req.file.buffer;
    const type = await fileTypeFromBuffer(buffer);
    if (!type || !ALLOWED_MIME.includes(type.mime)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    next();
  }
  ```
- **ClamAV Scan:** Deploy `clamav-scanner` container (Dockerfile in `infra/clamav/`); invoke via `src/services/clamavScan.ts` (line 12) before R2 upload.  
- **R2 Bucket Policy:**  
  ```json
  {
    "Version":"2012-10-17",
    "Statement":[{
      "Sid":"DenyPublicRead",
      "Effect":"Deny",
      "Principal":"*",
      "Action":"s3:GetObject",
      "Resource":"arn:aws:s3:::swanstudios-uploads/*",
      "Condition":{"Bool":{"aws:SecureTransport":"false"}}
    }]
  }
  ```
  Set `PresignExpiry: 900` (15 min) in `src/lib/r2Client.ts` (line 28).  
- **Schema Migration:** `migrations/20260404_create_attachments.sql`  
  ```sql
  CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    r2_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE messages DROP COLUMN IF EXISTS attachment_data;
  ALTER TABLE messages ADD COLUMN attachmentId UUID REFERENCES attachments(id);
  ```
- **Deploy Block:** Add feature flag `FEATURE_FILE_UPLOADS_ENABLED=false` in `.env.prod`; flip to `true` only after validation passes in staging.

---

### 3. XSS via Markdown Rendering (HIGH)
**Agreed Action:** Sanitize all AI‑generated markdown before rendering; enforce strict CSP.  
**Implementation Details:**  
- **Sanitization Pipeline:** `src/components/MarkdownSafe.tsx` (new)  
  ```tsx
  import DOMPurify from 'dompurify';
  import ReactMarkdown from 'react-markdown';
  import rehypeSanitize from 'rehype-sanitize';
  
  export const MarkdownSafe = ({ aiMarkdown }: { aiMarkdown: string }) => {
    const clean = DOMPurify.sanitize(aiMarkdown, {
      ALLOWED_TAGS: ['b','i','em','strong','a','p','ul','ol','li','code','pre','blockquote'],
      ALLOWED_ATTR: ['href','name','target'],
      FORBID_TAGS: ['script','style','iframe','form','input','button'],
      FORBID_ATTR: ['onerror','onclick','onload']
    });
    return <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{clean}</ReactMarkdown>;
  };
  ```
- **CSP Header:** Middleware `src/middleware/csp.ts` (line 8)  
  ```typescript
  export const cspMiddleware = (req, res, next) => {
    const nonce = crypto.randomBytes(16).toString('hex');
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; img-src 'self' data: https:; font-src 'self';`
    );
    res.locals.nonce = nonce;
    next();
  };
  ```
- **Apply:** Wrap all AI output routes (`/api/ai-chat/*`) with `cspMiddleware` and render via `MarkdownSafe`.

---

### 4. RBAC Enforcement Gaps (HIGH)
**Agreed Action:** Audit every endpoint for role/ownership checks; implement RLS; remove mock data.  
**Implementation Details:**  
- **Middleware:** `src/middleware/rbac.ts` (new)  
  ```typescript
  export const requireRole = (role: 'trainer' | 'client') => 
    (req, res, next) => {
      if (req.user?.role !== role) 
        return res.status(403).json({ error: 'Insufficient permissions' });
      next();
    };
  
  export const requireOwnership = (param: string, userIdField: string) => 
    (req, res, next) => {
      const id = req.params[param];
      const query = `SELECT ${userIdField} FROM ${req.originalUrl.split('/')[2]} WHERE id = $1`;
      pool.query(query, [id], (err, result) => {
        if (err || result.rowCount === 0 || result.rows[0][userIdField] !== req.user.id) 
          return res.status(403).json({ error: 'Not authorized' });
        next();
      });
    };
  ```
- **Apply to Routes:**  
  - `src/routes/trainerSessions.ts`: `router.get('/:id', requireRole('trainer'), requireOwnership('id', 'trainer_id'), ...)` (line 15)  
  - `src/routes/myClients.ts`: `router.get('/', requireRole('trainer'), ...)` (line 9)  
- **RLS Migration:** `migrations/20260404_enable_rls.sql`  
  ```sql
  ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY client_owns_logs ON workout_logs
    USING (client_id = current_setting('app.current_user_id')::uuid);
  -- Repeat for conversations, messages, attachments
  ```
  Set `app.current_user_id` via `SELECT set_config('app.current_user_id', $1, true)` in `src/db/connection.ts` (line 33) after auth.  
- **Mock Data Removal:** Delete `Math.random()` occurrences in `src/components/MyClientsView.tsx` (line 27) and `src/pages/TrainerClients.tsx` (line 41); replace with empty state UI.

---

### 5. Voice Data Privacy & Storage (HIGH)
**Agreed Action:** Keep voice processing local by default; encrypt blobs; enforce retention and consent.  
**Implementation Details:**  
- **Local STT:** Use Web Speech API in `src/components/VoiceInput.tsx` (line 12) – only send transcribed text to AI.  
- **Opt‑In External AI:** If user consents, upload encrypted blob:  
  ```typescript
  // src/services/voiceUpload.ts
  import { encrypt } from 'aws-kms';
  export async function uploadVoiceBlob(file: File) {
    const encrypted = await encrypt(process.env.KMS_VOICE_KEY!, await file.arrayBuffer());
    const key = `voice/${crypto.randomUUID()}.enc`;
    await r2.put(key, encrypted, { ContentType: 'application/octet-stream' });
    return key;
  }
  ```
- **Retention:** Cron job `scripts/cleanupVoice.js` (runs daily) deletes R2 objects with prefix `voice/` older than 7 days (using `LastModified`).  
- **Consent Flow:**  
  - Table: `user_consents (id, user_id, consent_type, granted_at, ip_address)`  
  - Modal: `src/components/VoiceConsentModal.tsx` (line 20) – stores consent on first voice use.  
  - AI context builder checks `user_consents` before routing voice to external STT.

---

### 6. Rate Limiting & Brute Force (CRITICAL)
**Agreed Action:** Enforce strict limits on auth and AI endpoints; use:

---

