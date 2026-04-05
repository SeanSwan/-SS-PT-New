# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 83.9s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md
> **Generated:** 4/5/2026, 1:32:42 PM

---

# Code Review: `SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md`

---

## ⚠️ Preliminary Classification Notice

> **This file is a Markdown planning document — not TypeScript, React, styled-components, or any executable code.** The standard code review rubric (TypeScript typing, React hooks, styled-components tokens, performance anti-patterns) does not apply directly. However, this document **drives implementation decisions** that will produce reviewable code, and several sections contain **architectural specifications, pseudo-code patterns, and security directives** that carry real engineering risk.
>
> This review is therefore conducted as: **Architecture & Implementation-Readiness Review** — evaluating the plan against the same quality bar the resulting code will be held to.

---

## Summary Scorecard

| Category | Rating | Notes |
|---|---|---|
| Security Architecture | ⚠️ HIGH RISK | Several gaps despite strong intent |
| API Architecture | ⚠️ MEDIUM RISK | Multi-backend toggle pattern has failure modes |
| Content Pipeline | ✅ SOUND | Well-structured, clear approval gates |
| TypeScript Readiness | ❌ UNDER-SPECIFIED | No type contracts defined for any new API surface |
| React/Component Readiness | ⚠️ PARTIAL | Component list exists, no prop contracts or state shapes |
| Theme Compliance | ❌ NOT ADDRESSED | No color/token guidance in any component spec |
| Error Handling Strategy | ❌ MISSING | No error states defined for any flow |
| Scalability | ⚠️ PARTIAL | Blog CDN addressed, social queue not |

---

## CRITICAL Findings

---

### CRITICAL-01 — OAuth Token Encryption: AES-256-GCM Key Derivation Unspecified

**Location:** Section 9 — Credential Storage

**The Plan States:**
```
AES-256-GCM encryption, key from Render secrets
```

**The Problem:**

This is dangerously underspecified. "Key from Render secrets" describes *where* the key lives, not *how it is derived, rotated, or used*. The resulting implementation will almost certainly produce one of these critical mistakes:

```typescript
// ❌ What a developer will write without a spec:
const encrypt = (token: string) => {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // static key, never rotated
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  // ... no auth tag verification on decrypt
  // ... no key versioning
  // ... no rotation strategy
};
```

**What the plan must specify:**

```typescript
// ✅ Required spec additions:

// 1. Key derivation: raw key vs HKDF-derived per-record key
// 2. IV: must be unique per encryption operation (random 96-bit)
// 3. Auth tag: MUST be stored and verified on decrypt (GCM integrity)
// 4. Key versioning: encrypted records must store key version ID
//    so old records can be re-encrypted after rotation
// 5. Key rotation procedure: documented, tested, runnable without downtime

interface EncryptedCredential {
  ciphertext: string;      // base64
  iv: string;              // base64, 12 bytes
  authTag: string;         // base64, 16 bytes — GCM integrity proof
  keyVersion: number;      // which encryption key was used
  encryptedAt: Date;
}
```

**Why this is CRITICAL:** If auth tags are not verified on decrypt, AES-GCM provides no integrity guarantee — it degrades to AES-CTR. A developer following this spec without the auth tag requirement will ship broken encryption that *appears* to work.

**Required Action:** Add a `PlatformCredential` model spec with explicit field list, auth tag requirement, key versioning, and rotation runbook before any implementation begins.

---

### CRITICAL-02 — RSS Feed XSS: "Sanitized Before Rendering" Is Not a Spec

**Location:** Section 8 — Security of the Security Panel

**The Plan States:**
```
RSS feeds fetched server-side, sanitized before rendering (prevent XSS from RSS content)
```

**The Problem:**

This is a security directive with no implementation contract. The developer will choose a sanitizer, and the wrong choice ships XSS to production. RSS feeds from The Hacker News and Krebs on Security contain:

- HTML in `<description>` fields (intentional rich text)
- Embedded `<script>` tags in malicious feeds (if feed URL is ever compromised)
- `javascript:` href values
- `data:` URI payloads
- SVG with embedded event handlers

```typescript
// ❌ What will be written without a spec:
const sanitized = content.replace(/<script>/gi, ''); // trivially bypassed
// or:
const sanitized = DOMPurify.sanitize(content); // correct library, wrong config

// ✅ What the spec must require:
import DOMPurify from 'isomorphic-dompurify';

const RSS_SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
  ALLOWED_ATTR: ['href'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
  // Force all links to open externally, never javascript:
  FORCE_BODY: true,
} as const;

// Must happen SERVER-SIDE before storage, not client-side before render
// Client-side sanitization is defense-in-depth, not primary defense
```

**Required Action:** Specify `DOMPurify` (or equivalent) with explicit `ALLOWED_TAGS` allowlist. Sanitization must occur at ingestion (before DB storage), not at render time. Document this in the plan.

---

### CRITICAL-03 — Blog Content Injection: "Sanitized Before Rendering" Repeated Without Spec

**Location:** Section 2 Security Requirements + Section 3C

**The Plan States:**
```
Blog content must be sanitized before rendering (prevent injection)
XSS prevention on user-generated content displayed on site
```

**The Problem:**

Blog content is rich text (H1/H2/H3, internal links, images per the SEO spec). A naive sanitizer will strip legitimate formatting. An overly permissive one will allow XSS. The plan must specify:

```typescript
// ✅ Required spec:

// Blog content is TRUSTED (Sean-approved) but must still be sanitized
// because the AI generation pipeline could theoretically produce malicious markup

const BLOG_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li',
    'a', 'img', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody',
    'tr', 'th', 'td', 'figure', 'figcaption'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
  // img src must be relative or from approved CDN only
  // href must not be javascript:
} as const;

// React rendering: NEVER use dangerouslySetInnerHTML without this sanitization
// Preferred: use a React-aware rich text renderer (react-markdown, Tiptap viewer)
// that never calls dangerouslySetInnerHTML at all
```

**Required Action:** Specify the rich text rendering strategy. `dangerouslySetInnerHTML` with DOMPurify is acceptable; a component-based renderer (Tiptap, react-markdown) is preferred and should be the default recommendation.

---

### CRITICAL-04 — Rate Limiting on Content Generation: No Spec for Gemini API Cost Exposure

**Location:** Section 2 Security Requirements

**The Plan States:**
```
Rate limiting on all content generation endpoints
```

**The Problem:**

Gemini API calls cost money. An authenticated admin (Sean) cannot exhaust the budget, but the plan does not address:

1. What happens if Sean's session is hijacked?
2. What are the per-endpoint rate limits?
3. Is there a monthly spend cap enforced in code?

```typescript
// ✅ Required additions to marketingRoutes.mjs spec:

// Per-endpoint rate limits (express-rate-limit):
const contentGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,                   // 20 Gemini calls per hour per IP
  message: 'Content generation rate limit reached. Try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Monthly spend guard (application-level):
// Track Gemini token usage in DB
// If monthly_tokens > GEMINI_MONTHLY_CAP → reject with 429
// Alert Sean at 80% of cap

// The plan must specify these limits explicitly
// or the developer will ship with no limits at all
```

**Required Action:** Add explicit rate limit values (requests/hour, tokens/month) to the security requirements section. Add a `GeminiUsageLog` model to the file manifest.

---

## HIGH Findings

---

### HIGH-01 — Multi-Backend Toggle Pattern: No Fallback Priority Order Specified

**Location:** Section 3B — Distribution Hub

**The Plan States:**
```
LATE_API_KEY → Late.dev handles 13 platforms
BLOTATO_API_KEY → Blotato handles its platforms
NEXTDOOR_API_KEY → Direct Nextdoor
BLUESKY_HANDLE + BLUESKY_APP_PASSWORD → Direct AT Protocol
```

**The Problem:**

What happens when *multiple* keys are configured? The plan implies they're independent toggles, but the implementation will need a priority/routing decision:

```typescript
// ❌ Ambiguous — what will a developer write?
// Option A: Use whichever key exists (first-wins, non-deterministic)
// Option B: Use all simultaneously (duplicate posts)
// Option C: Use most capable service (Late.dev > Blotato > direct)

// ✅ Required spec:

type DistributionBackend = 'late' | 'blotato' | 'direct';

interface PlatformRoutingConfig {
  platform: SocialPlatform;
  preferredBackend: DistributionBackend;
  fallbackBackend: DistributionBackend | null;
}

// The plan must define:
// 1. Which backend handles which platforms when multiple are configured
// 2. Whether fallback is automatic or manual
// 3. What "manual mode" returns to the UI (structured content object, not just a string)
```

**Required Action:** Add a routing matrix table to Section 3B showing which backend handles which platform, and what the fallback chain is.

---

### HIGH-02 — `SecurityAlert` Model: No Deduplication Key Defined

**Location:** Section 8 — Architecture

**The Plan States:**
```
6. Deduplicate results by CVE ID
7. Store in SecurityAlerts table (PostgreSQL)
```

**The Problem:**

The daily cron job will re-fetch the same CVEs every day. "Deduplicate by CVE ID" is the right intent but the model spec is missing the unique constraint:

```typescript
// ✅ Required model spec (add to plan):

interface SecurityAlertAttributes {
  id: string;                    // UUID primary key
  cveId: string;                 // UNIQUE — the dedup key
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  affectedPackage: string;
  installedVersion: string | null;
  fixedVersion: string | null;
  cvssScore: number | null;
  description: string;
  source: 'github_advisory' | 'npm_audit' | 'nvd' | 'cisa_kev' | 'cvefeed';
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;     // admin user ID
  firstSeenAt: Date;
  lastSeenAt: Date;              // updated on each scan, not a new record
}

// Migration must include:
// UNIQUE constraint on cveId
// Index on (severity, isResolved) for dashboard queries
// Index on lastSeenAt for "stale alert" detection
```

Without the unique constraint, the daily job will insert duplicate rows and the dashboard will show the same CVE 30 times after a month.

---

### HIGH-03 — "Run Scan Now" Rate Limiting: Admin Bypass Risk

**Location:** Section 8 — Security of the Security Panel

**The Plan States:**
```
"Run Scan Now" is rate-limited (1 scan per hour max)
```

**The Problem:**

Rate limiting by IP is bypassed if Sean uses multiple devices. Rate limiting by user ID is correct but not specified. Additionally, the NVD API has its own rate limits (5 requests/30 seconds without API key) that the plan does not account for:

```typescript
// ✅ Required spec additions:

// 1. Rate limit by userId, not IP:
const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1,
  keyGenerator: (req) => req.user!.id, // user-scoped, not IP-scoped
});

// 2. NVD API rate limit compliance:
// NVD: 5 requests per 30 seconds (no key) / 50 per 30 seconds (with key)
// The securityScannerService must implement:
//   - Sequential NVD queries with 6-second delays between calls
//   - Or: obtain free NVD API key (https://nvd.nist.gov/developers/request-an-api-key)
//   - Add NVD_API_KEY to optional env vars list

// 3. Total scan duration estimate:
// npm audit: ~2s
// CISA KEV: ~1s
// NVD (4 queries × 6s delay): ~30s
// CVEFeed.io: ~2s
// GitHub Advisory: ~2s
// Total: ~40s — must be async background job, never block HTTP response
```

---

### HIGH-04 — Content Calendar Persistence: No Conflict Resolution Strategy

**Location:** Section 3 — Content Studio Upgrade (Content Calendar)

**The Plan States:**
```
Content Calendar (UI ready, no persistence)
→ Add backend persistence
```

**The Problem:**

The plan adds persistence without specifying conflict behavior. What happens when:

- Two posts are scheduled for the same platform at the same time?
- A scheduled post fails to publish (API down)?
- Sean reschedules a post that's already in the distribution queue?

```typescript
// ✅ Required additions to plan:

interface ScheduledPost {
  id: string;
  platform: SocialPlatform;
  scheduledAt: Date;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
  retryCount: number;          // max 3 retries on failure
  lastError: string | null;    // store failure reason
  publishedAt: Date | null;
  externalPostId: string | null; // platform's ID for the published post
}

// Conflict strategy: allow multiple posts per platform per time slot
// (platforms support it) — no conflict, just warn if < 30 min apart

// Failure strategy: retry 3x with exponential backoff, then status = 'failed'
// Failed posts appear in dashboard with "Retry" button
// Sean gets notification on failure
```

---

### HIGH-05 — Swan Coach Rebrand: No Audit Mechanism Specified

**Location:** Section 1 — Swan Coach Rebrand

**The Plan States:**
```
System-wide: audit every user-facing string containing "AI"
```

**The Problem:**

"Audit every string" is a manual process that will be incomplete. The plan should specify a grep/AST-based audit that can be run in CI:

```bash
# ✅ Add to plan — automated audit command:

# Find all user-facing "AI" references (excludes comments, types, env vars):
grep -rn \
  --include="*.tsx"

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
