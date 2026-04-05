# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 92.1s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md
> **Generated:** 4/5/2026, 1:05:13 PM

---

# Code Review: `SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md`

> **Reviewer Note:** This file is a **Markdown planning document** (architecture blueprint), not executable TypeScript/React/styled-components code. The standard code-quality rubric (TypeScript typing, React hooks, styled-components tokens, etc.) does not directly apply. However, as a **senior engineer reviewing a blueprint that will drive production code**, I am obligated to flag every issue that will cause downstream implementation problems — architectural gaps, ambiguities, missing constraints, and decisions that will produce bad code if followed literally.
>
> All findings below are rated by the **impact they will have on the resulting production codebase**.

---

## Executive Summary

| Severity | Count |
|---|---|
| CRITICAL | 3 |
| HIGH | 7 |
| MEDIUM | 8 |
| LOW | 5 |

The plan is **well-structured and clearly intentioned** but contains several decisions that will produce security vulnerabilities, unmaintainable code, and broken UX if implemented without correction. The most dangerous issues are around credential handling, missing auth/RBAC specification, and the absence of any data-model definitions.

---

## 🔴 CRITICAL Findings

---

### CRIT-01 — No Authentication / RBAC Specification for Marketing Routes

**Location:** Section 2 (Marketing Dashboard), Section 7 (`marketingRoutes.mjs`)

**Problem:**

The plan defines a new admin route group (`/dashboard/admin/marketing`) and a new backend file (`marketingRoutes.mjs`) with zero mention of authentication middleware, role guards, or permission scoping. Based on the existing SwanStudios codebase pattern, every admin route must be gated. If a developer implements this plan literally, they will ship unauthenticated marketing API endpoints — including blog publish, social post dispatch, and email send — to production.

**Specific risk:** `POST /api/marketing/blog/publish` and `POST /api/marketing/social/distribute` without auth guards are **critical security vulnerabilities**. Anyone who discovers the endpoint can publish to sswanstudios.com and distribute to all connected social accounts.

**Required fix before implementation:**

```typescript
// backend/routes/marketingRoutes.mjs — MUST include:
// 1. authenticateToken middleware on ALL routes
// 2. requireRole('admin') or requireRole('trainer') guard
// 3. Rate limiting on AI generation endpoints (Gemini calls cost money)
// 4. Input sanitization on blog content (XSS vector)

// The plan MUST specify:
// - Which roles can access Marketing Dashboard? (admin only? trainer?)
// - Can Sean delegate to a VA? If so, what permission level?
// - Are analytics read-only for non-admin roles?
```

**Add to plan — mandatory section:**

```markdown
### Auth & RBAC Requirements (NON-NEGOTIABLE)
- All /api/marketing/* routes: requireAuth + requireRole(['admin'])
- Frontend route /dashboard/admin/marketing: AdminRoute wrapper (already exists)
- Gemini generation endpoints: rate limit 10 req/min per user
- Blog publish endpoint: additional `canPublish` permission flag
- Social distribute endpoint: additional `canDistribute` permission flag
- Audit log: every publish/distribute action logged with userId + timestamp
```

---

### CRIT-02 — API Key Handling Strategy is Architecturally Dangerous

**Location:** Section 4 (Paid Tool Strategy), Section 3B (Distribution Hub)

**Problem:**

The plan describes a "toggle via API keys" pattern where the presence/absence of environment variables controls feature availability. This is described as a UI concern (`CrystallineLockOverlay`). This conflates **runtime feature detection** with **secret management** in a way that will produce serious problems:

1. **The plan implies the frontend checks for API key presence.** If the frontend ever receives any signal about which keys are configured (even a boolean), and that check is done client-side, it is bypassable. The lock overlay is cosmetic, not a security control.

2. **No mention of where keys are stored.** Are these in `.env` on Render? In a database `settings` table? In Render environment variables UI? Each has different implications for the `CrystallineLockOverlay` pattern.

3. **The plan lists `BLUESKY_HANDLE + BLUESKY_APP_PASSWORD` as env vars.** App passwords are credentials, not API keys. Storing them in `.env` alongside `DATABASE_URL` is acceptable for a solo operator, but the plan must explicitly state they are **never sent to the frontend** and **never logged**.

**Required fix:**

```markdown
### API Key Architecture (MUST specify in plan)

**Storage:** All third-party credentials stored in backend .env / Render 
environment variables ONLY. Never in database. Never sent to frontend.

**Feature detection flow:**
  Frontend → GET /api/marketing/config/capabilities
  Backend → reads process.env, returns boolean capability map:
  {
    socialDistribution: { late: boolean, blotato: boolean, bluesky: boolean, nextdoor: boolean },
    videoGeneration: { seedance: boolean },
    voiceSynthesis: { elevenlabs: boolean },
    email: { mailchimp: boolean, sendgrid: boolean, smtp: boolean }
  }
  Frontend → renders CrystallineLockOverlay based on booleans (NOT raw keys)

**The frontend NEVER knows the key values. Only booleans.**
**The /api/marketing/config/capabilities endpoint: requireAuth + requireRole(['admin'])**
```

---

### CRIT-03 — "Auto-publish Social Posts" Without Content Moderation Pipeline

**Location:** Section 2 (Content Cadence), Section 3D (Social Post Generator)

**Problem:**

The plan states: *"Social posts can auto-schedule but Sean can review queue."* The word "can" is doing enormous work here. If auto-scheduling is implemented without a mandatory review gate, the system will eventually post AI-generated content to sswanstudios.com's social accounts without human review. This is a **brand safety and legal liability issue** for a health/fitness platform making NASM-backed claims.

The plan also states Swan Coach generates content with "NASM-expert" authority. AI-generated health/fitness claims that are factually wrong and auto-published to social media expose SwanStudios to FTC scrutiny (health claims regulations) and potential NASM trademark issues.

**Required fix:**

```markdown
### Content Approval State Machine (MANDATORY)

All generated content MUST follow this state machine — no exceptions:

DRAFT → PENDING_REVIEW → APPROVED → SCHEDULED → PUBLISHED
                       ↓
                    REJECTED → DRAFT (with feedback)

Rules:
- Blog posts: NEVER skip PENDING_REVIEW → APPROVED. Sean must click Approve.
- Email digests: NEVER skip PENDING_REVIEW → APPROVED. Sean must click Approve.  
- Social posts: Default PENDING_REVIEW. Sean can enable "auto-approve social" 
  per-platform in Settings — but this is OPT-IN, not default.
- Auto-schedule only moves APPROVED content, never DRAFT or PENDING_REVIEW.
- Database: content_status enum('draft','pending_review','approved',
  'scheduled','published','rejected') — NOT a boolean published flag.
```

---

## 🟠 HIGH Findings

---

### HIGH-01 — Zero Data Model Definitions

**Location:** Section 7 (File Manifest)

**Problem:**

The plan lists 10 new files but defines **zero database schemas**. The Content Calendar needs persistence (explicitly noted as missing). The Blog Writer needs a posts table. The Social Post Generator needs a queue table. The Lead Funnel needs analytics storage. Without schema definitions in the plan, every developer will invent their own models, producing inconsistent naming, missing indexes, and migration conflicts.

**Required addition:**

```markdown
### Database Schema Requirements

**Table: marketing_blog_posts**
- id (UUID, PK)
- title (VARCHAR 255, NOT NULL)
- slug (VARCHAR 255, UNIQUE, NOT NULL) -- SEO URL
- content_markdown (TEXT)
- content_html (TEXT) -- rendered, stored for performance
- meta_title (VARCHAR 60) -- SEO
- meta_description (VARCHAR 160) -- SEO
- target_keyword (VARCHAR 100)
- status (ENUM: draft|pending_review|approved|scheduled|published|rejected)
- scheduled_publish_at (TIMESTAMPTZ)
- published_at (TIMESTAMPTZ)
- created_by (UUID, FK → users.id)
- approved_by (UUID, FK → users.id, NULLABLE)
- created_at / updated_at

**Table: marketing_social_posts**
- id (UUID, PK)
- platform (ENUM: facebook|instagram|tiktok|nextdoor|bluesky|youtube|linkedin)
- content_text (TEXT)
- image_url (VARCHAR 500, NULLABLE)
- hashtags (TEXT[]) -- PostgreSQL array
- status (ENUM: draft|pending_review|approved|scheduled|published|failed)
- scheduled_at (TIMESTAMPTZ)
- published_at (TIMESTAMPTZ)
- source_blog_post_id (UUID, FK → marketing_blog_posts.id, NULLABLE)
- distribution_service (ENUM: late|blotato|bluesky_direct|manual)
- external_post_id (VARCHAR 255, NULLABLE) -- ID returned by distribution API
- created_by (UUID, FK → users.id)
- created_at / updated_at

**Table: marketing_email_digests**
- id (UUID, PK)
- subject (VARCHAR 255)
- preview_text (VARCHAR 150)
- content_html (TEXT)
- status (ENUM: draft|pending_review|approved|sent)
- recipient_count (INTEGER)
- sent_at (TIMESTAMPTZ)
- email_service (ENUM: mailchimp|sendgrid|smtp)
- created_by / approved_by / created_at / updated_at

**Table: marketing_content_calendar**
- id (UUID, PK)
- content_type (ENUM: blog|social|email)
- content_id (UUID) -- polymorphic FK
- scheduled_at (TIMESTAMPTZ)
- platform (ENUM, NULLABLE -- for social only)
- created_at / updated_at
```

---

### HIGH-02 — `SocialDistributionService` Has No Error Recovery Strategy

**Location:** Section 3B, `backend/services/socialDistributionService.mjs`

**Problem:**

Social API calls fail. Rate limits, token expiry, platform outages, content policy rejections — all are routine. The plan describes distribution as a fire-and-forget operation with no mention of:

- Retry logic (exponential backoff)
- Dead letter queue for failed posts
- Platform-specific error code handling (Meta API errors are notoriously cryptic)
- User notification when a scheduled post fails to publish
- Partial failure handling (post succeeds on 3/5 platforms — what happens to the other 2?)

**Required addition to plan:**

```markdown
### Distribution Error Handling Requirements

socialDistributionService MUST implement:
1. Per-platform retry: 3 attempts with exponential backoff (1s, 4s, 16s)
2. On final failure: update social_posts.status = 'failed', 
   store error_message (VARCHAR 500)
3. Failed post notification: in-app notification to admin user
4. Partial success: each platform tracked independently 
   (one row per platform per post, not one row for all platforms)
5. Token refresh: OAuth tokens for Meta/TikTok expire — 
   service must detect 401 and trigger re-auth flow
6. Content policy rejection (Meta error code 100, subcode 1487390):
   surface human-readable message, do NOT retry automatically
```

---

### HIGH-03 — Swan Coach "Remembers Context Across Conversations" — No Implementation Path

**Location:** Section 1 (Personality Upgrade Goals)

**Problem:**

*"Remembers context across conversations (client goals, history, injuries)"* is listed as a goal with no technical specification. This is not a prompt engineering task — it requires:

- A conversation history storage schema
- A retrieval strategy (full history? summarized? RAG over client profile?)
- A context window budget (Gemini Flash has limits — full history will exceed them)
- Privacy implications (injury history is sensitive health data — HIPAA-adjacent)
- A data retention policy

If a developer implements this naively (dump all conversation history into every prompt), costs will spike and latency will degrade. If they skip it, the feature doesn't exist.

**Required addition:**

```markdown
### Swan Coach Memory Architecture

**Storage:** conversation_messages table (likely already exists — verify)
  + client_profile table: goals, injuries, preferences (structured, not in chat)

**Context strategy (Gemini Flash context window budget):**
  - Always include: client_profile (structured, ~500 tokens)
  - Recent messages: last 10 exchanges (~2000 tokens)  
  - Summarized history: Swan Coach generates rolling summary every 20 messages
    stored in conversation_summaries table (~500 tokens)
  - Total context budget: ~3000 tokens for history (leaves room for response)

**Privacy:** injury_notes field: encrypted at rest (pgcrypto or app-level AES)
  Data retention: conversation history purged after 2 years or on account deletion
  GDPR/CCPA: user can request export or deletion of their conversation data
```

---

### HIGH-04 — Gemini Cost Controls Absent

**Location:** Sections 1, 2, 3, 5, 6 (everywhere Gemini is used)

**Problem:**

The plan uses Gemini for: Swan Coach conversations, badge generation, trending topic research, blog writing, social post generation, email composition, SEO keyword research, and image generation. Sean pays $20/month for Gemini API. There is **no mention of**:

- Token usage tracking
- Per-feature cost budgets
- Rate limiting on generation endpoints
- Caching of expensive operations (trending topics research — why run this 10 times a day?)
- Alerts when monthly spend approaches limit

A single runaway loop or a malicious user hammering the Swan Coach endpoint could exhaust the monthly budget in hours.

**Required addition:**

```markdown
### Gemini Cost Controls (MANDATORY)

1. Token tracking: log prompt_tokens + completion_tokens per request 
   in gemini_usage_log table
2. Daily budget alert: if daily spend > $2 (≈10% of monthly), 
   send admin notification
3. Hard rate limits per endpoint:
   - Swan Coach: 20 requests/hour per user
   - Blog Writer: 5 requests/hour per admin
   - Social Post Generator: 20 requests/hour per admin
   - Trending Topics: cache results 6 hours (same query = same result)
   - Badge Generator: 10 requests/hour per user
4. Caching: trending topics, keyword research → Redis or DB cache, 6hr TTL
5. Model selection: use Flash-Lite for short tasks (social posts, summaries),
   Flash for long tasks (blog articles) — cost difference is significant
```

---

### HIGH-05 — Blog Publishing Has No CMS / Routing Architecture

**Location:** Section 3C (Blog Writer Tab)

**Problem:**

*"Publish to sswanstudios.com blog section (new frontend route needed)"* is the entire specification for what is effectively a CMS. This will require:

- Dynamic routing (`/blog/:slug`)
- SSR or SSG consideration (React SPA blogs have poor SEO without SSR — this is a fitness SEO play, SEO is the entire point)
- Sitemap generation (new posts must be added to sitemap.xml automatically)
- RSS feed (standard for blogs, used by aggregators)
- Open Graph meta tags per post (required for social sharing previews)
- Image optimization pipeline (blog hero images)

A React SPA blog with client-side rendering will **undermine the entire SEO strategy** described in Section 6.

**Required addition:**

```markdown
### Blog Rendering Architecture Decision (REQUIRED before implementation)

**Option A: React SPA with prerendering (current stack)**
  - Add react-helmet-async for per-page meta tags
  - Add prerender.io or similar for crawler SSR
  - Add sitemap generation script (runs on publish)
  - Acceptable for low-traffic start, technical debt accumulates

**Option B: Next.js for blog routes only (recommended)**
  - Migrate /blog/* routes to Next.js app alongside existing React SPA
  - True SSR/SSG, best SEO, Google indexes immediately
  - Higher implementation cost but correct long-term architecture

**Option C: Headless CMS (Ghost, Contentful)**
  - Ghost on subdomain (blog.sswanstudios.com) — free self-hosted
  - Swan Coach generates content, publishes via Ghost API
  - Ghost handles SEO,

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
