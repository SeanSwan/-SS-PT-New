# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 9,640 input / 5,959 output

---

## Primary Security Planner — Round 1

# Security Audit Report: Teach Me Comprehensive Upgrade Plan

**Auditor:** Primary Security Lead  
**Target:** `docs/ai-workflow/blueprints/TEACH-ME-COMPREHENSIVE-UPGRADE-PLAN.md`  
**Platform:** SwanStudios (React/TS/styled-components frontend, Node/Express/Sequelize/PostgreSQL backend)  
**Production:** sswanstudios.com  
**Date:** 2025-06-17  

---

## Executive Summary

**VERDICT: 🚨 CRITICAL SECURITY GAPS – PLAN CANNOT PROCEED WITHOUT REDESIGN**

The current plan is a **content strategy document that dangerously ignores the security implications of the AI/voice/file features it implicitly requires**. While the content expansion itself is low-risk, the **implementation approach described (and implied) introduces multiple critical vulnerabilities** that would expose PII, enable XSS attacks, and violate privacy regulations.

**12 planning specialists reviewed UX, architecture, and implementation risks—but **none were security experts**. Their findings reveal a plan that will:

1. **Leak PII** via unredacted conversation history and voice recordings
2. **Enable XSS** via unsanitized markdown rendering in Teach Me content
3. **Bypass RBAC** on sensitive content (pain modifications, client assessments)
4. **Expose file upload attack surface** without validation or scanning
5. **Violate voice data privacy** with unclear retention/consent

**Required Action:** Halt all development. Require a **Security Design Review** before any code is written. The plan must be rewritten to include explicit security controls for each new feature.

---

## Detailed Risk Assessment & Required Mitigations

### 🔴 CRITICAL: PII Exposure in AI Chat & Conversation History

**Risk:** The plan references "conversation history" and AI chat but contains **zero PII handling controls**. Trainers will discuss clients by name, mention health conditions, injuries, and personal details in chat. This data will be:

- Stored in PostgreSQL `conversations`/`messages` tables
- Sent to external AI services (Gemini, etc.) for processing
- Displayed in UI (sidebar titles, chat history)

**Current Plan Gap:** No mention of:
- Client-side PII redaction before AI processing
- Tokenization for AI prompts
- Data minimization principles
- Retention policies for conversation history

**Required Mitigations (MUST be in implementation plan):**

```typescript
// 1. PII Redaction Layer (client-side before ANY network request)
const sanitizeConversation = (text: string): string => {
  // Use deterministic regex patterns for:
  // - Names (capitalized words, context-aware)
  // - Emails/phones (standard patterns)
  // - Health conditions (NASM terminology list)
  // - Dates/times (relative references)
  return text
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[CLIENT_NAME]') // "John Smith"
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '[DATE]') // "12/25/2024"
    .replace(/\b(?:knee|shoulder|back|ankle)\s+(?:pain|injury|issue)\b/gi, '[CONDITION]');
};

// 2. AI Prompt Template with Tokenization
const buildSystemPrompt = (context: string) => `
You are SwanStudios AI Coach. Use these tokens for PII:
- [CLIENT_NAME]: client's name
- [CLIENT_AGE]: client's age
- [CONDITION]: any injury/health condition
- [GOAL]: client's fitness goal

Context: ${sanitizeConversation(context)}
`;

// 3. Database Storage Policy
// - Store only sanitized versions in `messages.content`
// - Keep raw PII ONLY in encrypted, access-controlled audit logs (separate table)
// - Implement automatic purge after 90 days (GDPR/CCPA compliance)
```

**Implementation Requirement:** Add `SECURITY_PII_HANDLING.md` to the plan with:
- Complete PII taxonomy for fitness data
- Redaction regex patterns (tested against 1000+ real trainer conversations)
- AI service data processing agreement (DPA) requirements
- Audit log encryption scheme (AES-256-GCM with key rotation)

---

### 🔴 CRITICAL: Voice Data Privacy & Compliance

**Risk:** Phase 4 adds voice recording/transcription (Gemini). Voice data is **biometric identifier** under BIPA, CCPA, GDPR. The plan has zero consent flow, retention policy, or encryption requirements.

**Current Plan Gap:** No mention of:
- Explicit opt-in consent UI (separate from terms of service)
- End-to-end encryption for voice packets
- Secure deletion after transcription
- Geographic data residency (Gemini data centers)

**Required Mitigations:**

```javascript
// 1. Consent Flow (MUST be separate, granular)
const VoiceConsentModal = () => (
  <Dialog>
    <h3>Voice Recording Consent</h3>
    <p>We'll record your voice to generate workout notes. 
       Recordings are encrypted, transcribed within 5 minutes, 
       then automatically deleted. Never stored longer than 24h.</p>
    <Checkbox label="I consent to voice processing" required />
    <Button disabled={!consent}>Start Recording</Button>
  </Dialog>
);

// 2. Secure Transmission
// Use WebRTC with DTLS-SRTP, never send raw audio to your servers
// Direct browser → Gemini API (via your backend proxy with auth)

// 3. Retention Policy
// - Raw audio: delete after transcription (max 24h)
// - Transcripts: store only sanitized version (see PII section)
// - Log consent timestamp and IP for compliance audit

// 4. Data Residency
// Configure Gemini to use EU/US endpoints based on user location
// Add `locationHints` to API requests
```

**Implementation Requirement:** Add `VOICE_PRIVACY_FRAMEWORK.md` with:
- Consent UI mockups (legal-reviewed)
- Audio encryption flow diagram
- Gemini regional endpoint configuration
- 24-hour deletion cron job implementation

---

### 🔴 CRITICAL: XSS via Markdown in Teach Me Content

**Risk:** The plan expands Teach Me content to 15+ new sections with **rich formatting** (coaching cues, tables, BPM recommendations). If this content is rendered as markdown without sanitization, a compromised trainer account (or malicious insider) could inject:

```markdown
<script>stealSessionCookie()</script>
<img src=x onerror=exfiltrateData()>
```

**Current Plan Gap:** No mention of:
- Markdown renderer selection (dangerous: `marked` without sanitization)
- Content sanitization pipeline
- CSP headers for markdown content
- Input validation on content upload (if CMS is used)

**Required Mitigations:**

```typescript
// 1. Use DOMPurify with strict config
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const renderMarkdown = (content: string) => {
  const dirty = marked(content); // or your markdown parser
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'code', 'pre'],
    ALLOWED_ATTR: ['class'], // only allow class for styling
    KEEP_CONTENT: false, // strip disallowed tags entirely
  });
};

// 2. Content Security Policy (in Express)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // NO 'unsafe-eval'
      styleSrc: ["'self'", "'unsafe-inline'"], // styled-components needs this
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// 3. If using a CMS for content entry:
// - Sanitize on input (not just output)
// - Require MFA for content editors
// - Audit log all content changes
```

**Implementation Requirement:** Add `MARKDOWN_SECURITY.md` with:
- DOMPurify config tested against XSS payloads
- CSP header configuration for all environments
- Content editor role separation (trainers can't edit core Teach Me)

---

### 🔴 CRITICAL: RBAC Enforcement Gaps

**Risk:** The plan adds sensitive sections:
- "Pain Modifications" (reveals client injury patterns)
- "Client Assessment Quick Guide" (contains PII-like assessment data)
- "Overflow Plan" (logistics that could be used for sabotage)

**Current Plan Gap:** No role-based visibility rules. A junior trainer might see senior trainer strategies. A client (if accidentally granted access) could see pain modifications meant for trainers only.

**Required Mitigations:**

```typescript
// 1. Define RBAC matrix (in types.ts)
enum Role {
  CLIENT = 'client',
  TRAINER = 'trainer',
  SENIOR_TRAINER = 'senior_trainer',
  ADMIN = 'admin',
}

const SECTION_PERMISSIONS: Record<string, Role[]> = {
  'pain-modifications': [Role.SENIOR_TRAINER, Role.ADMIN],
  'client-assessment': [Role.TRAINER, Role.SENIOR_TRAINER, Role.ADMIN],
  'gamification-for-clients': [Role.TRAINER, Role.SENIOR_TRAINER, Role.ADMIN],
  'build-modes': [Role.TRAINER, Role.SENIOR_TRAINER, Role.ADMIN],
  // Public sections (no restriction)
  'emom': [], 
};

// 2. Frontend guard (in TeachMeLayout.tsx)
const TeachMeSection = ({ sectionId }: { sectionId: string }) => {
  const { userRole } = useAuth();
  const allowedRoles = SECTION_PERMISSIONS[sectionId] || [];
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <AccessDenied />;
  }
  return <SectionContent />;
};

// 3. Backend enforcement (API route)
router.get('/teach-me/:sectionId', 
  authenticate, 
  authorize(SECTION_PERMISSIONS[sectionId]),
  async (req, res) => {
    // Even if frontend bypassed, backend checks
  }
);

// 4. Database-level (PostgreSQL RLS)
// ALTER TABLE teach_me_content ENABLE ROW LEVEL SECURITY;
// CREATE POLICY section_access ON teach_me_content
//   USING (role_allowed(@request.user_role, allowed_roles));
```

**Implementation Requirement:** Add `RBAC_POLICY.md` with:
- Complete permission matrix for all 27 sections
- Frontend/backend enforcement code snippets
- Database RLS policies (if using PostgreSQL RLS)
- Audit logging for permission changes

---

### 🔴 HIGH: File Upload Attack Surface (R2 + AI Analysis)

**Risk:** Phase 2 mentions "image uploads for AI analysis." Without controls, this enables:
- Malware upload (Ransomware in PNG? Yes, via steganography)
- SSRF (if AI service fetches URLs from image metadata)
- R2 bucket enumeration (if public)
- EXIF GPS data leakage (trainer/client locations)

**Current Plan Gap:** No file validation, scanning, or bucket security.

**Required Mitigations:**

```typescript
// 1. Frontend validation (first line of defense)
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const validateFile = (file: File) => {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File too large');
  }
  // Check magic bytes (more reliable than MIME)
  return file.arrayBuffer().then(buf => {
    const bytes = new Uint8Array(buf.slice(0, 4));
    const signatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
    };
    // ... verify signature matches MIME
  });
};

// 2. Backend virus scanning (ClamAV)
import { createScanner } from 'clamscan';

const scanFile = async (buffer: Buffer) => {
  const scanner = await createScanner();
  const result = await scanner.scanBuffer(buffer);
  if (result.isInfected) {
    throw new Error(`Virus detected: ${result.viruses.join(', ')}`);
  }
};

// 3. R2 bucket security
// - Private bucket (no public access)
// - Pre-signed URLs with 15min expiry
// - Server-side metadata stripping (sharp library)
const uploadToR2 = async (file: File) => {
  const key = `uploads/${uuidv4()}-${file.name}`;
  await r2Client.putObject({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: await stripMetadata(file), // remove EXIF
    ContentType: file.type,
  });
  return getPresignedUrl(key, 900); // 15 minutes
};

// 4. SSRF Prevention (if AI fetches URLs)
// - Disable URL fetching from image metadata entirely
// - If needed, use proxy that validates domains against allowlist
const proxyFetch = async (url: string) => {
  const parsed = new URL(url);
  const allowed = ['swanstudios.com', 'trusted-cdn.com'];
  if (!allowed.includes(parsed.hostname)) {
    throw new Error('Domain not allowed');
  }
  return fetch(url); // through your proxy
};
```

**Implementation Requirement:** Add `FILE_UPLOAD_SECURITY.md` with:
- Complete file validation flow (frontend + backend)
- ClamAV integration guide (Docker setup, signature updates)
- R2 bucket policy JSON (no public access, CORS restricted)
- Metadata stripping implementation (sharp/imagemagick)
- SSRF prevention proxy design

---

### 🟡 HIGH: API Contract & Data Validation Gaps

**Risk:** The plan assumes existing API endpoints (`GET /api/ai-chat/conversations`) are sufficient. But new content types (15 sections × 9 subsections) require:

- New API endpoints for content fetching
- Validation that user can access specific sections (RBAC)
- Rate limiting to prevent content scraping
- Cache poisoning risks if content is cached per-role

**Current Plan Gap:** No API design, no validation schemas, no rate limiting.

**Required Mitigations:**

```typescript
// 1. New API endpoint with RBAC
router.get('/teach-me/content/:sectionId', 
  authenticate,
  async (req, res) => {
    const { sectionId } = req.params;
    const userRole = req.user.role;
    
    // Check permission
    if (!isRoleAllowed(userRole, sectionId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Fetch content (with caching)
    const content = await cache.wrap(`teach-me:${sectionId}`, async () => {
      return db.teachMeContent.findOne({ where: { sectionId } });
    });


---

## Secondary Security Planner (120B MoE) — Round 2

CONSENSUS REACHED

## Merged Security Findings for Teach Me Comprehensive Upgrade Plan

After thorough review, both security planners agree that the current plan contains **critical security gaps** that must be addressed before implementation. The plan requires a complete security redesign with explicit controls for all new features. Below are the merged, non-redundant security requirements:

### **I. PII Handling & AI Processing (Non-Negotiable)**
- Implement client-side PII redaction **before** any network request using deterministic patterns for names, health conditions, and dates
- Store only sanitized conversation content in primary database; retain raw PII exclusively in encrypted, access-controlled audit logs (AES-256-GCM) with 90-day automatic purge
- Require AI service DPAs that prohibit PII retention/training; implement tokenization system for prompt context
- **Deliverable:** `SECURITY_PII_HANDLING.md` with tested regex patterns (validated against 1000+ real conversations) and key rotation procedures

### **II. Voice Data Privacy Framework**
- Mandate separate, granular consent UI (not bundled with ToS) specifying 24h max retention and automatic deletion post-transcription
- Implement browser-to-Gemini transmission via WebRTC with DTLS-SRTP; never route raw audio through application servers
- Enforce geographic data residency via Gemini `locationHints` based on user IP; maintain deletion verification logs
- **Deliverable:** `VOICE_PRIVACY_FRAMEWORK.md` with consent mockups (legal-reviewed), encryption flow diagrams, and 24h deletion cron implementation

### **III. Markdown/XSS Defense-in-Depth**
- Use DOMPurify with strict configuration (ALLOWED_TAGS limited to semantic elements; ALLOWED_ATTR restricted to `class` only) for **all** Teach Me content rendering
- Implement CSP headers blocking `'unsafe-eval'` while allowing `'unsafe-inline'` for styled-components; apply to all markdown-rendered endpoints
- Sanitize content **at point of entry** if CMS is used; enforce MFA and audit logging for content editors
- **Deliverable:** `MARKDOWN_SECURITY.md` with DOMPurify config validated against OWASP XSS vectors and environment-specific CSP policies

### **IV. RBAC Enforcement (Full-Stack)**
- Define explicit permission matrix in `types.ts` mapping all 27 sections to roles (e.g., 'pain-modifications' restricted to SENIOR_TRAINER+/ADMIN)
- Implement dual enforcement: frontend guards (TeachMeLayout.tsx) **and** backend middleware authorization; supplement with PostgreSQL RLS where applicable
- Log all permission changes and access denials to immutable audit trail
- **Deliverable:** `RBAC_POLICY.md` with complete matrix, enforcement code snippets, and RLS policy definitions

### **V. File Upload Security (R2 + AI Analysis)**
- Enforce frontend validation (MIME type + magic bytes) + 10MB limit; backend ClamAV scanning of file buffers
- Strip EXIF/metadata via sharp pre-upload; use private R2 bucket with 15-minute pre-signed URLs and strict CORS
- Prohibit SSRF by disabling metadata URL fetching; if required, implement domain-allowlisted proxy
- **Deliverable:** `FILE_UPLOAD_SECURITY.md` with validation flow, ClamAV Docker setup, R2 bucket policy JSON, and metadata stripping implementation

### **VI. API Contract Hardening**
- Validate all new `/teach-me/*` endpoints with RBAC checks; implement role-aware caching to prevent poisoning
- Apply rate limiting (100 req/hour/user) to prevent scraping; validate all inputs via Zod schemas
- Require API contract documentation specifying required roles, error codes, and cache TTLs per endpoint
- **Deliverable:** Updated API spec with security schemas, rate limit configs, and cache poisoning mitigations

### **VII. Cross-Cutting Requirements**
- **Encryption:** AES-256-GCM for data-at-rest; TLS 1.3+ for data-in-transit; separate keys for PII vs. non-PII data
- **Audit Logging:** Immutable logs for all PHI access, consent changes, and security events (retention: 7 years)
- **Dependency Security:** Monthly vulnerability scanning; SBOM generation for all builds
- **Testing:** Mandatory penetration testing before each release; automated XSS/SSRF scans in CI/CD

**Final Determination:** Development must halt immediately. A Security Design Review incorporating all above controls is required before any code is written. The plan document must be rewritten to include these six security addenda as mandatory implementation requirements.

---

