# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 12,445 input / 5,225 output

---

## Primary Security Planner — Round 1

# SECURITY AUDIT REPORT: SwanStudios Multi-Workstream QA Enhancement Plan

**Auditor:** Primary Security Lead  
**Date:** 2025-12-19  
**Plan Version:** MULTI-WORKSTREAM-QA-ENHANCEMENT-PLAN.md  
**Production Environment:** sswanstudios.com  
**Severity Scale:** 🔴 CRITICAL → 🟠 HIGH → 🟡 MEDIUM → 🟢 LOW  

---

## EXECUTIVE SUMMARY

The plan demonstrates strong technical ambition but contains **multiple CRITICAL security gaps** that must be addressed before any implementation begins. The most severe issues involve **PII exposure to LLMs**, **unvalidated file uploads**, **missing RBAC enforcement**, and **voice biometric data handling**. These are not merely "best practices" but **legal and compliance requirements** given SwanStudios handles health data, payment-adjacent session data, and high-net-worth client information.

**Overall Security Posture:** 🟠 **HIGH RISK** — Do not proceed to implementation without addressing CRITICAL findings below.

---

## CRITICAL FINDINGS (Block Implementation)

### 🔴 CRITICAL 1: Zero PII to LLMs Policy Not Technically Enforced

**Risk:** The plan explicitly states a "zero PII to LLMs" policy (Workstream 2 test protocol mentions verifying PII stripping) but provides **zero implementation details**. This creates a false sense of security while actual PII (client names, health conditions, trainer notes) will flow to external AI providers.

**Affected Workstreams:** 1 (Coach Assistant), 2 (AI Testing), 7 (Auto Research)

**Attack Vectors:**
- Conversation titles auto-generated from first user message contain client names
- Context chips like "John's shoulder injury" or "Client: Sarah Johnson" expose PII
- 17 data enrichment sources include `clientProfiles`, `workoutLogs`, `bodyMetrics` — all containing PII
- Voice transcriptions may include names, addresses, health details
- File attachment metadata (filenames, EXIF data) may contain PII

**Required Mitigations:**

```typescript
// backend/services/aiChatService.mjs — ADD BEFORE ANY PROMPT CONSTRUCTION
const { PresidioAnalyzer, PresidioAnonymizer } = require('microsoft-presidio');

class PIIProtectionService {
  constructor() {
    this.analyzer = new PresidioAnalyzer();
    this.anonymizer = new PresidioAnonymizer();
    this.piiTypes = [
      'PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'ADDRESS',
      'DATE_TIME', 'MEDICAL_CONDITION', 'MEDICATION', 'AGE',
      'IP_ADDRESS', 'URL', 'CREDIT_CARD', 'US_SSN'
    ];
  }

  async sanitizeForLLM(text) {
    // 1. Analyze for PII
    const results = await this.analyzer.analyze(text, this.piiTypes);
    
    // 2. Anonymize with consistent replacement
    const anonymized = await this.anonymizer.anonymize(text, results, {
      replaceWith: '[REDACTED]',
      keepMetadata: false // NEVER send PII metadata to LLMs
    });
    
    // 3. Log detection for audit (without storing PII)
    if (results.length > 0) {
      console.log(`PII_DETECTED: ${results.length} entities redacted`);
    }
    
    return anonymized.text;
  }

  async sanitizeConversationContext(context) {
    // Recursively sanitize all string values in context object
    const sanitizeValue = (value) => {
      if (typeof value === 'string') return this.sanitizeForLLM(value);
      if (Array.isArray(value)) return value.map(sanitizeValue);
      if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)])
        );
      }
      return value;
    };
    
    return sanitizeValue(context);
  }
}

// In aiChatService.mjs — wrap all AI calls:
async function callAIWithProtection(prompt, context) {
  const piiService = new PIIProtectionService();
  
  // Sanitize both prompt and context
  const sanitizedPrompt = await piiService.sanitizeForLLM(prompt);
  const sanitizedContext = await piiService.sanitizeConversationContext(context);
  
  // Build final prompt with sanitized data
  const finalPrompt = buildPrompt(sanitizedPrompt, sanitizedContext);
  
  // Call AI provider
  return await callAIProvider(finalPrompt);
}
```

**Implementation Checkpoints (Must Complete Before Code):**
- [ ] Integrate Microsoft Presidio or similar PII detection library in backend
- [ ] Wrap **all 17 data enrichment sources** with `sanitizeConversationContext()`
- [ ] Add client-side PII detection in `useAIChat.ts` as defense-in-depth (warn users before sending)
- [ ] Implement conversation title generation from **sanitized** first message
- [ ] Add audit logging for every PII detection event (timestamp, user ID, count, no PII stored)
- [ ] Update Workstream 2 test protocol to include **PII injection tests** (send "Client John Smith needs help" and verify LLM never sees "John Smith")
- [ ] Document PII types covered and limitations in CLAUDE.md

---

### 🔴 CRITICAL 2: File Attachment Attack Surface Completely Unaddressed

**Risk:** The plan mentions file attachments (Workstream 1: "File attachments" in context chips, Workstream 2: "file attachment metadata") but has **zero security controls**. This opens multiple attack vectors: malware distribution, path traversal, DoS via large files, and PII exposure via file metadata.

**Affected Workstreams:** 1, 2, 4 (if schedule allows attachments), 5, 6

**Attack Vectors:**
1. **Malicious Uploads:** Users upload .exe, .js, or HTML files that could be downloaded by other users
2. **Path Traversal:** Filenames like `../../../etc/passwd` or `..\..\Windows\System32\config\sam`
3. **DoS via Large Files:** Upload 10GB files filling up R2 storage
4. **PII in Metadata:** Images with GPS coordinates, documents with author names
5. **MIME Type Spoofing:** Upload .jpg with Content-Type: application/x-msdownload
6. **XSS via Image Metadata:** SVG files with embedded JavaScript
7. **Unlimited Storage:** No per-user quota leading to unlimited storage costs

**Required Mitigations:**

```typescript
// backend/services/fileUploadService.mjs — NEW SERVICE
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp'); // For image processing
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

class SecureFileUploadService {
  constructor() {
    this.s3 = new S3Client({ region: 'auto' }); // R2 configuration
    this.allowedExtensions = new Set([
      '.jpg', '.jpeg', '.png', '.gif', '.webp', // Images
      '.pdf', '.txt', '.md', // Documents
      '.mp3', '.wav', '.m4a' // Audio (voice recordings)
    ]);
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.allowedMimeTypes = new Set([
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/markdown',
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'
    ]);
  }

  async validateFile(file) {
    // 1. Size check
    if (file.size > this.maxFileSize) {
      throw new Error(`File too large. Max ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // 2. Extension check (case-insensitive)
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.allowedExtensions.has(ext)) {
      throw new Error(`File type ${ext} not allowed`);
    }

    // 3. MIME type verification (read first 512 bytes)
    const buffer = await file.arrayBuffer();
    const mime = await this.detectMimeType(buffer);
    if (!this.allowedMimeTypes.has(mime)) {
      throw new Error(`MIME type ${mime} not allowed`);
    }

    // 4. Sanitize filename
    const sanitizedName = this.sanitizeFilename(file.name);
    
    // 5. For images: strip EXIF, resize if needed
    if (mime.startsWith('image/')) {
      const sanitizedBuffer = await this.processImage(buffer, mime);
      return {
        buffer: sanitizedBuffer,
        filename: sanitizedName,
        mime,
        size: sanitizedBuffer.length
      };
    }

    return {
      buffer: Buffer.from(buffer),
      filename: sanitizedName,
      mime,
      size: file.size
    };
  }

  sanitizeFilename(filename) {
    // Remove path traversal attempts, special chars
    return filename
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Allow only safe chars
      .substring(0, 100); // Limit length
  }

  async detectMimeType(buffer) {
    // Use file-type library for accurate detection
    const fileType = require('file-type');
    const type = await fileType.fromBuffer(Buffer.from(buffer));
    return type ? type.mime : 'application/octet-stream';
  }

  async processImage(buffer, mime) {
    // Strip all metadata (EXIF, GPS, etc.)
    const metadata = await sharp(buffer).metadata();
    return sharp(buffer)
      .rotate() // Auto-orient based on EXIF, then strip
      .withMetadata({ exif: null, icc: null, iptc: null })
      .resize({ width: 2000, withoutEnlargement: true }) // Max width
      .toBuffer();
  }

  async uploadToR2(processedFile, userId, conversationId) {
    const key = `uploads/${userId}/${conversationId}/${uuidv4()}-${processedFile.filename}`;
    
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: processedFile.buffer,
      ContentType: processedFile.mime,
      Metadata: {
        userId,
        conversationId,
        originalName: processedFile.filename
      }
    }));

    return {
      url: `https://${process.env.R2_BUCKET}.r2.dev/${key}`,
      key,
      size: processedFile.size,
      mime: processedFile.mime
    };
  }
}

// In aiChatService.mjs — when handling file attachments:
async function handleFileAttachment(userId, conversationId, file) {
  const uploadService = new SecureFileUploadService();
  
  try {
    const validated = await uploadService.validateFile(file);
    const upload = await uploadService.uploadToR2(validated, userId, conversationId);
    
    // Store metadata in DB (never store file content)
    await sequelize.models.FileAttachment.create({
      conversationId,
      userId,
      storageKey: upload.key,
      url: upload.url,
      mimeType: upload.mime,
      size: upload.size,
      originalName: validated.filename
    });
    
    return upload;
  } catch (error) {
    console.error(`File upload failed for user ${userId}:`, error.message);
    throw new Error(`Upload failed: ${error.message}`);
  }
}
```

**Implementation Checkpoints:**
- [ ] Create `SecureFileUploadService` with validation pipeline
- [ ] Implement per-user storage quotas (e.g., 500MB total)
- [ ] Add virus scanning integration (ClamAV or VirusTotal API) for all uploads
- [ ] Store only metadata in PostgreSQL, files in R2 with strict bucket policies
- [ ] Generate pre-signed URLs with short expiry (15 min) for downloads
- [ ] Add rate limiting: max 10 uploads/minute per user
- [ ] Log all upload attempts (success/failure) with IP, user agent
- [ ] Update Workstream 2 test protocol to include malicious file upload attempts

---

### 🔴 CRITICAL 3: RBAC Enforcement Gaps in Multi-Trainer & Session Flows

**Risk:** The plan's Universal Master Schedule (Workstream 4) and Session Routes (Workstream 3) lack explicit RBAC checks. Trainers could see other trainers' clients, modify other trainers' schedules, or purchase sessions for other users.

**Affected Workstreams:** 3, 4, 5, 6

**Missing Controls:**
- No verification that trainer can only access their own clients
- No check that client can only book with available trainers
- No ownership validation on session purchase/decrement
- Multi-trainer view may expose other trainers' client data
- File attachments lack access control (any authenticated user could access any file if they guess the URL)

**Required Mitigations:**

```typescript
// backend/middleware/rbac.mjs — NEW MIDDLEWARE
const RBAC = {
  ROLES: {
    CLIENT: 'client',
    TRAINER: 'trainer',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
  },

  PERMISSIONS: {
    // Session permissions
    SESSION_PURCHASE: ['client', 'admin'],
    SESSION_USE: ['client', 'trainer', 'admin'],
    SESSION_VIEW_OWN: ['client', 'trainer', 'admin'],
    SESSION_VIEW_ALL: ['admin', 'super_admin'],
    
    // Schedule permissions
    SCHEDULE_VIEW_OWN: ['trainer', 'admin'],
    SCHEDULE_VIEW_ALL: ['admin', 'super_admin'],
    SCHEDULE_EDIT_OWN: ['trainer'],
    SCHEDULE_EDIT_ALL: ['admin'],
    
    // File permissions
    FILE_UPLOAD: ['client', 'trainer', 'admin'],
    FILE_DOWNLOAD_OWN: ['client', 'trainer', 'admin'],
    FILE_DOWNLOAD_ANY: ['admin'],


---

## Secondary Security Planner (120B MoE) — Round 2

CONSENSUS REACHED

The Primary Security Planner's analysis correctly identifies three CRITICAL security gaps that must be resolved before implementation: unenforced PII-to-LLMs policy, unsecured file attachment handling, and missing RBAC enforcement in multi-trainer/session flows. These findings are valid and address legal/compliance risks for health, payment-adjacent, and high-net-worth client data. No additional disputes or new issues are raised; the proposed mitigations (Presidio integration, SecureFileUploadService, RBAC middleware) are technically sound and scope-appropriate. Implementation must prioritize these blocks before any workstream execution proceeds.

---

