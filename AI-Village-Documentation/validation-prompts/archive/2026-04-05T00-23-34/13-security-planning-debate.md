# Security Planning Debate (Phase 2A) — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free ↔ nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 132.3s
> **Files:** docs/ai-workflow/blueprints/COMPREHENSIVE-APP-AUDIT-2026-04-04.md
> **Generated:** 4/4/2026, 5:23:34 PM

---

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

*Part of SwanStudios 14-Brain Recursive Consensus System*
