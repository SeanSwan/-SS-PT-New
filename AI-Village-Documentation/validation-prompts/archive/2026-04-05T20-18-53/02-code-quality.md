# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 87.5s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md
> **Generated:** 4/5/2026, 1:18:53 PM

---

# Code Review: `SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md`

---

## ⚠️ Reviewer Preamble

This file is a **Markdown planning document**, not TypeScript/React/styled-components source code. The standard code review rubric (TypeScript typing, React hooks, styled-components tokens, etc.) does not apply directly. However, as a **senior engineer reviewing a production SaaS blueprint**, I will evaluate it against the criteria that *do* apply: architectural soundness, security posture, DRY violations in the *planned* code patterns, missing error handling specifications, and performance anti-patterns in the *described* system design. Findings are rated by the same severity scale.

---

## 🔴 CRITICAL Findings

---

### CRIT-01 — API Key Storage: "Encrypted, not plain text in .env" is Underspecified to the Point of Being Dangerous

**Location:** Section 2 (Security Requirements), Section 4 (Paid Tool Strategy)

**Finding:**
The plan states *"API key storage must be encrypted, not plain text in .env"* but then the entire toggle pattern in Section 4 is built around checking `LATE_API_KEY`, `BLOTATO_API_KEY`, `HIGGSFIELD_API_KEY`, etc. — which are `.env` variables. These two statements directly contradict each other, and the contradiction is unresolved.

The toggle pattern as described:
```
If LATE_API_KEY configured → service works
If NOT configured → CrystallineLockOverlay
```

This implies the backend reads `process.env.LATE_API_KEY` at runtime — which *is* plain text in `.env`. There is no specification for:
- Where encrypted keys are stored (database column? secrets manager?)
- What encryption algorithm (AES-256-GCM? KMS envelope encryption?)
- Who holds the decryption key and how it's rotated
- Whether Render's environment variable injection counts as "encrypted" (it does not — it's plaintext at runtime)

**Risk:** If a developer implements this plan as written, they will store API keys in `.env` (the only pattern described), believing they've satisfied the security requirement. They have not.

**Required Fix:**
```markdown
## API Key Storage Specification (REQUIRED before implementation)

Option A — Render Secret Files (minimum viable):
  - Store keys as Render Secret Files (encrypted at rest by Render)
  - Access via process.env at runtime (acceptable for MVP)
  - Document that this is the approved pattern

Option B — Database-encrypted (recommended for OAuth tokens):
  - Store OAuth tokens in `api_credentials` table
  - Encrypt with AES-256-GCM using APP_MASTER_KEY (itself a Render Secret)
  - Rotate APP_MASTER_KEY annually
  - Never log decrypted values

Option C — AWS Secrets Manager / HashiCorp Vault (enterprise):
  - Out of scope for current budget

The CrystallineLockOverlay toggle pattern checks DB presence,
NOT process.env presence, for user-configured OAuth tokens.
Static vendor API keys (Late.dev, Blotato) use Render Secret Files.
```

---

### CRIT-02 — OAuth Token Security: No Refresh Token Rotation Strategy Specified

**Location:** Section 3B (Distribution Hub), Security Requirements

**Finding:**
The plan mentions *"Social platform OAuth tokens must be securely stored and refreshable"* but provides zero specification for:
- Token storage schema
- Refresh token rotation (PKCE flow? server-side only?)
- What happens when a refresh fails (token revoked by platform)
- Whether tokens are per-admin or per-platform-account
- Facebook/Instagram token expiry (60-day long-lived tokens that must be re-exchanged)
- TikTok's 24-hour access token + 365-day refresh token lifecycle

**Risk:** A developer implementing `socialDistributionService.mjs` without this spec will either (a) store tokens in `.env` defeating the security requirement, or (b) build an ad-hoc solution that breaks when tokens expire, silently failing distribution jobs.

**Required Addition:**
```markdown
## OAuth Token Lifecycle (REQUIRED spec for socialDistributionService.mjs)

Schema: `social_platform_tokens` table
  - platform: enum('facebook','instagram','tiktok','bluesky','linkedin')
  - access_token: text (encrypted at rest)
  - refresh_token: text (encrypted at rest, nullable)
  - expires_at: timestamp
  - scopes: text[]
  - connected_by: FK → users.id (must be admin)
  - created_at / updated_at

Refresh strategy:
  - Check expires_at before every distribution job
  - If expires_at < now + 1 hour → attempt refresh before job
  - If refresh fails → mark platform as DISCONNECTED, notify admin via
    in-app alert (NOT silent failure), pause scheduled posts for that platform
  - Facebook-specific: long-lived tokens expire in 60 days, no refresh token —
    must re-auth via OAuth. Alert admin at 50 days.

Token never leaves the backend. Frontend receives only:
  { platform, connected: boolean, expires_at: string, scopes: string[] }
```

---

### CRIT-03 — Blog Content Sanitization: DOMPurify Scope Undefined

**Location:** Security Requirements, Section 3C (Blog Writer)

**Finding:**
The plan states *"Blog content must be sanitized before rendering (prevent injection)"* and *"Input sanitization on all blog/social content before publish."* However, the plan describes a rich blog editor (H1/H2/H3, internal links, SEO meta) — which requires HTML output. The sanitization strategy must distinguish between:

1. **Sanitization at write-time** (before storing to DB) — strip dangerous tags, keep formatting
2. **Sanitization at render-time** (before displaying to site visitors) — second pass
3. **What HTML is *allowed*** — `<h1>`, `<h2>`, `<a href>`, `<img>`, `<strong>`, `<em>` yes; `<script>`, `<iframe>`, `<object>`, `onclick` no

Without this, a developer might either (a) strip all HTML making the blog plain text, or (b) allow all HTML defeating the XSS requirement.

**Required Addition:**
```markdown
## Blog Sanitization Contract

Backend (blogService.mjs) — before DB write:
  - Use `sanitize-html` npm package
  - Allowlist: h1, h2, h3, h4, p, ul, ol, li, strong, em, a[href|title],
    img[src|alt|width|height], blockquote, code, pre, figure, figcaption
  - Strip: script, iframe, object, embed, form, input, style (inline)
  - Strip all event handlers: onclick, onload, onerror, etc.
  - Validate all href values: must start with https:// or / (no javascript:)

Frontend (blog render component) — before display:
  - Use DOMPurify with same allowlist
  - dangerouslySetInnerHTML ONLY on sanitized content
  - Never render raw AI output without sanitization pass
```

---

## 🟠 HIGH Findings

---

### HIGH-01 — "NEVER auto-publish without Sean's approval" Has No Technical Enforcement Mechanism

**Location:** Section 2 (Content Cadence), Section 3C (Blog Writer)

**Finding:**
This is stated as a business rule but there is no specification for how it's *technically enforced*. A blog post in `status: 'approved'` could be published by any code path that calls `blogService.publish()`. The plan needs:

- A `blog_posts` table with `status` enum: `draft | pending_review | approved | published | archived`
- The publish endpoint must validate `status === 'approved'` AND `approved_by === req.user.id` (Sean's user ID)
- No background job or automation can call the publish endpoint — only the "Approve & Publish" button in the UI, which calls an authenticated admin endpoint
- Audit log entry on every status transition

**Without this:** A future developer adding a "schedule and auto-publish" feature could bypass the approval gate without realizing it violates a non-negotiable business rule.

---

### HIGH-02 — SEO Scans as Background Jobs: No Job Queue Architecture Specified

**Location:** Round 1 Village Findings ("SEO scans run as background jobs"), Section 6

**Finding:**
The plan correctly identifies that SEO scans are high-latency and shouldn't block the UI. But there is no specification for:
- What job queue system (Bull/BullMQ? pg-boss? simple DB polling?)
- How the frontend polls for results (WebSocket? SSE? polling interval?)
- Job failure handling and retry strategy
- Timeout limits (PageSpeed API can take 30+ seconds)
- Whether scan results are cached and for how long

**Risk:** Without this, a developer will either (a) make a synchronous HTTP call that times out, or (b) build an ad-hoc polling system that creates N+1 database queries.

**Recommended Addition:**
```markdown
## Background Job Architecture (SEO + Content Generation)

Queue: BullMQ (Redis-backed) — already available on Render
Job types:
  - seo:site-audit (timeout: 120s, retries: 2)
  - seo:keyword-research (timeout: 60s, retries: 3)
  - content:blog-generate (timeout: 90s, retries: 1)
  - distribution:publish-post (timeout: 30s, retries: 3, backoff: exponential)

Frontend polling: SSE endpoint /api/marketing/jobs/:jobId/status
  - Streams: { status: 'queued'|'active'|'completed'|'failed', progress: number, result?: T }
  - UI shows progress bar during active jobs
  - On failure: show error message with retry button

Cache: SEO audit results cached 24h in Redis (PageSpeed quota protection)
```

---

### HIGH-03 — Rate Limiting Specification is Missing Concrete Values

**Location:** Security Requirements

**Finding:**
*"Rate limiting on all content generation endpoints"* is stated but no values are given. Content generation endpoints have very different risk profiles:

| Endpoint | Risk | Suggested Limit |
|---|---|---|
| `POST /api/marketing/blog/generate` | High (Gemini API cost) | 10/hour per admin |
| `POST /api/marketing/social/generate` | Medium | 50/hour per admin |
| `POST /api/marketing/seo/audit` | High (external API quota) | 5/hour per admin |
| `POST /api/marketing/distribute` | Critical (external platform rate limits) | Per-platform limits |

Without concrete values, a developer will either skip rate limiting or apply a generic limit that's either too restrictive (blocks legitimate use) or too permissive (allows cost abuse).

---

### HIGH-04 — Distribution Queue Failure Handling: Silent Failures Not Addressed

**Location:** Section 3B (Distribution Hub)

**Finding:**
The plan describes a distribution queue but doesn't specify what happens when:
- Late.dev API returns 429 (rate limited)
- A platform rejects a post (content policy violation)
- Network timeout during distribution
- Partial success (3/5 platforms succeeded)

**Risk:** Without explicit failure handling, posts will silently fail to distribute. Sean will believe content was published when it wasn't.

**Required Spec:**
```markdown
## Distribution Job Failure Contract

Partial success: treat each platform as independent job
  - Platform A fails → does NOT cancel Platform B
  - Report per-platform status in Content Calendar

On failure:
  - Mark post as FAILED for that platform
  - Show red indicator in Content Calendar
  - In-app notification: "Post failed on [Platform]: [reason]"
  - Retry button available for 48 hours
  - After 3 retries: mark as PERMANENTLY_FAILED, require manual action

Rate limit (429): exponential backoff, max 3 retries over 2 hours
Content policy rejection: do NOT retry, flag for Sean's review
```

---

### HIGH-05 — Audit Log: Schema and Retention Policy Undefined

**Location:** Security Requirements ("Audit log: who published what, when, to which platforms")

**Finding:**
Audit logging is listed as a requirement but has no schema, retention policy, or query interface specified. For a compliance-relevant feature (content publishing), this needs:

```markdown
## Audit Log Schema (content_audit_log table)

Fields:
  - id: uuid
  - actor_id: FK → users.id
  - actor_role: string (snapshot at time of action)
  - action: enum('blog:draft','blog:submit','blog:approve','blog:publish',
                 'blog:archive','social:generate','social:schedule',
                 'social:publish','social:delete','distribution:send',
                 'email:compose','email:approve','email:send')
  - resource_type: enum('blog_post','social_post','email_digest','seo_scan')
  - resource_id: uuid
  - metadata: jsonb (platform, word_count, target_url, etc.)
  - ip_address: inet
  - user_agent: text
  - created_at: timestamp

Retention: 2 years (GDPR-compliant minimum for business records)
Query interface: Admin-only endpoint with date range + action type filters
```

---

## 🟡 MEDIUM Findings

---

### MED-01 — DRY Violation: CrystallineLockOverlay Pattern Described 4 Times

**Location:** Section 3 (A, B, C, D, E), Section 4

**Finding:**
The CrystallineLockOverlay pattern is described narratively in multiple sections. This will lead to inconsistent implementations across the 5+ tabs that use it. The plan should define it once as a canonical component contract:

```markdown
## CrystallineLockOverlay — Canonical Component Contract

Props:
  serviceName: string           // "Late.dev" | "ElevenLabs" | etc.
  serviceDescription: string    // What it does (1-2 sentences)
  configKey: string             // Which env/setting key to configure
  planBMessage: string          // Empowering workaround message
  onConfigureClick: () => void  // Navigate to Settings tab

Behavior:
  - Rendered OVER the feature panel (position: absolute, full coverage)
  - Does NOT unmount the underlying panel (preserve state)
  - "Configure [serviceName]" button → Settings tab, pre-scrolled to that service
  - Plan B message uses Swan Lavender (#4070C0) text, NOT warning/error colors
  - Plan B is a feature, not a consolation — tone must reflect this

Usage: Every optional service tab wraps its content in this component.
The check for "is service configured" happens in the parent panel,
passed as isLocked: boolean prop.
```

---

### MED-02 — Content Calendar Persistence: No Data Model Specified

**Location:** Section 3 (Content Calendar — "add backend persistence")

**Finding:**
The Content Calendar is listed as needing persistence but no schema is provided. Drag-drop scheduling implies a `scheduled_at` field that can be updated. Without a schema, the backend developer and frontend developer will make incompatible assumptions.

```markdown
## Content Calendar Schema

scheduled_posts table:
  - id: uuid
  - content_type: enum('blog','social','email')
  - content_id: uuid (FK to blog_posts | social_posts | email_digests)
  - platform: enum('facebook','instagram','tiktok','nextdoor','bluesky',
                   'linkedin','youtube','email') | null (for blog)
  - scheduled_at: timestamp with time zone
  - status: enum('scheduled','published','failed','cancelled')
  - created_by: FK → users.id
  - created_at / updated_at

Drag-drop = PATCH /api/marketing/calendar/:id { scheduled_at: newTimestamp }
Color coding: by platform (frontend constant map) AND content_type (secondary indicator)
```

---

### MED-03 — "Closest to AGI Possible" is an Unmeasurable Success Criterion

**Location:** Section 1 (Swan Coach Personality Upgrade Goals)

**Finding:**
From an engineering standpoint, *"closest to AGI possible"* cannot be tested, accepted, or rejected. This will cause scope creep and developer confusion. Replace with measurable criteria:

```markdown
## Swan Coach Quality Criteria (Measurable)

✅ Remembers client goals, injuries, and history within a session (context window)
✅ Remembers across sessions (stored client profile, retrieved via RAG or DB lookup)
✅ Responds in <3 seconds for standard queries (Gemini Flash-Lite latency target)
✅

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
