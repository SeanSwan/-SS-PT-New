# Swan Coach + Marketing Dashboard + Content Studio Upgrade — Master Plan

> **Status:** ROUND 2 VALIDATION — First Village run approved, running deep security + enhancement pass
> **Created:** 2026-04-05 | **Village Run 1:** APPROVED ($0.24, 11/12 passed)
> **Research:** 4 YouTube transcripts analyzed, Content Studio audited, competitor analysis complete
>
> ## ROUND 1 VILLAGE FINDINGS (Already Incorporated)
> - Auth guards MANDATORY on all marketing endpoints (protect + adminOnly)
> - Touch targets 44x44px on all interactive elements
> - Platform preview accessibility (text descriptions for screen readers)
> - Sean's "Approve & Publish" button must be prominent and unmistakable
> - SEO scans run as background jobs (high-latency, don't block UI)
> - Blog Writer needs "draft" state before publish
> - Social Post Generator shows character counts per platform
> - Content Calendar color-coded by platform AND content type
> - Plan B workaround messaging should feel empowering, not consolation
>
> ## SECURITY REQUIREMENTS (CRITICAL — Sean's Top Priority)
> - ALL marketing API endpoints require protect + adminOnly middleware
> - No unauthenticated access to publish, distribute, or compose endpoints
> - Rate limiting on all content generation endpoints
> - Input sanitization on all blog/social content before publish
> - XSS prevention on user-generated content displayed on site
> - CSRF protection on all state-changing marketing operations
> - API key storage must be encrypted, not plain text in .env
> - Social platform OAuth tokens must be securely stored and refreshable
> - Blog content must be sanitized before rendering (prevent injection)
> - Distribution queue must validate payload before sending to external APIs
> - Audit log: who published what, when, to which platforms
> - Sean (admin) is the ONLY role that can access marketing features
> - No trainer or client role can touch marketing endpoints
>
> ## ENHANCEMENT REQUEST FOR ROUND 2
> The Village should specifically:
> 1. Deep dive into SECURITY — attack vectors, injection risks, OAuth token security, API key protection
> 2. Identify MISSING GAPS — what features are competitors doing that we haven't thought of?
> 3. Suggest ENHANCEMENTS — what would take this from good to industry-leading?
> 4. Validate the ARCHITECTURE — is the multi-backend toggle pattern (Late.dev/Blotato/direct APIs) sound?
> 5. Review the CONTENT PIPELINE — any bottlenecks or failure points in the research→write→approve→publish→distribute flow?
> 6. Assess SCALABILITY — will this architecture handle 10,000+ users viewing blog content?

---

## 1. SWAN COACH REBRAND (AI → SwanStudios Coach Assistant)

### The Change
All user-facing "AI" references become "Swan Coach" or "SwanStudios Coach Assistant."
- Technology IS AI (Gemini Flash-Lite / Flash) — but branding is human-centered
- Terms of Service can mention "AI-powered" — product name stays branded
- Sean curated the coaching philosophy — it's HIS vision, not generic chatbot

### What Gets Renamed
- Chat interface: "Swan Coach" as assistant name
- FrostedPaywall: "Swan Coach conversations" not "AI chat"
- /ascension page: "Coach-designed workouts" not "AI-generated"
- Tier features: "Swan Coach nutrition guidance" not "AI Nutrition coaching"
- Workout generation: "Coach-designed workout plan"
- System-wide: audit every user-facing string containing "AI"

### Personality Upgrade Goals
- Closest to AGI possible — natural, human-like conversations
- Benevolent, caring, supportive, nice, eager to help
- NASM-expert with PhD-level fitness/nutrition knowledge
- Knows SwanStudios mission: help people first, community always
- Remembers context across conversations (client goals, history, injuries)
- Proactive suggestions based on client data
- Motivational without being fake — authentic encouragement

---

## 2. MARKETING DASHBOARD (New Admin Sidebar Tab)

### Architecture (Following YouTube Video 1: AI Marketing Team)

**4 Marketing Agents + 10 Skills:**

```
Marketing Dashboard (/dashboard/admin/marketing)
├── SEO Command Center
│   ├── Site Audit (PageSpeed + technical SEO scan)
│   ├── Keyword Research (Gemini search grounding)
│   ├── Competitor Analysis (scan competitor sites)
│   └── Ranking Tracker (monitor keyword positions)
│
├── Content Engine
│   ├── Trending Topics (Gemini grounding — health/science news)
│   ├── Blog Writer (NASM-expert articles, Sean approves before publish)
│   ├── Social Post Generator (platform-specific content for 6+ platforms)
│   └── Email Digest Composer (bimonthly newsletter, all-in-one)
│
├── Distribution Hub (Upgraded from Content Studio)
│   ├── Multi-Platform Publisher (Facebook, Instagram, TikTok, Nextdoor, BlueSky, +more)
│   ├── Content Calendar (visual weekly/monthly, drag-drop scheduling)
│   └── Post Templates (reusable templates for common post types)
│
└── Analytics
    ├── Traffic Dashboard (site visitors, sources, trends)
    ├── Social Performance (engagement per platform)
    ├── Content ROI (which posts drive traffic/leads)
    └── Lead Funnel (Visit → Sign Up → Trial → Subscriber → Client)
```

### Content Cadence (Sean's Rules — Non-Negotiable)
- Blog: 1x/week OR 1x every 2 weeks — quality over quantity
- Email: 2x/month MAXIMUM — digest format, all-in-one
- Social: 3-5 posts/week across platforms (auto-generated from blog + topics)
- NEVER auto-publish blog or email without Sean's approval
- Social posts can auto-schedule but Sean can review queue

### Content Research Flow
1. Swan Coach uses Gemini search grounding for trending health/fitness/science news
2. Compiles ranked list of 5-10 topics with relevance scores
3. Sean picks 1-2 topics from the list
4. Swan Coach writes NASM-expert article with trending angle
5. Sean reviews and approves
6. Published to blog → auto-generates social posts → queues for distribution
7. End of month: Swan Coach compiles digest email from published content

---

## 3. CONTENT STUDIO UPGRADE

### Current State (What Exists)
- ✅ Remotion video templates (8 templates, working)
- ✅ Badge Creator (Gemini, working)
- ✅ Exercise Coverage Tracker (hexagonal grid, working)
- ⚠️ Voice Studio (ElevenLabs UI ready, backend missing)
- ⚠️ Distribution Hub (Blotato UI ready, backend missing)
- ⚠️ Content Calendar (UI ready, no persistence)
- ❌ Blog writing, SEO content, social post generation

### Upgrades Needed

**A. Replace Kling AI → Seedance 2.0 (via Higgsfield)**
- Update service card: "Kling AI" → "Seedance 2.0"
- Update env var: KLING_API_KEY → HIGGSFIELD_API_KEY
- Backend route for video generation via Seedance 2.0 API
- Toggle on/off via API key (same pattern as existing services)

**B. Upgrade Distribution Hub → Multi-Platform Social Publisher**
- Currently: Blotato-only UI, backend route missing
- Upgrade to: Support multiple distribution backends

Plan A ($19/mo): Late.dev unified API — 13 platforms including BlueSky
Plan B ($0): Direct API integrations (BlueSky free + Facebook/Instagram/TikTok via Meta/TikTok APIs)
Plan C (existing): Blotato (already in UI, just needs backend route)

Each option is a toggle — Sean enables whichever he can afford:
- LATE_API_KEY → Late.dev handles 13 platforms
- BLOTATO_API_KEY → Blotato handles its platforms
- NEXTDOOR_API_KEY → Direct Nextdoor Publish API (always separate, no third party supports it)
- BLUESKY_HANDLE + BLUESKY_APP_PASSWORD → Direct AT Protocol (always free)

If NO paid service configured → show manual mode:
- Swan Coach generates the post content + image
- User copies text, downloads image, manually posts
- Still valuable — 80% of the work (writing) is done

**C. Add Blog Writer Tab**
- New tab in Content Studio: "Blog Writer"
- Grounding search for trending topics → ranked list → Sean picks → Swan Coach writes
- SEO-optimized (meta tags, H1/H2/H3, internal links, keywords)
- Preview before publish
- Publish to sswanstudios.com blog section (new frontend route needed)

**D. Add Social Post Generator Tab**
- New tab in Content Studio: "Social Posts"
- Generate platform-specific posts from: blog content, manual topic, campaign theme
- Platform previews: see how post looks on each platform
- Hashtag suggestions per platform
- Image generation via Gemini (already working for badges — extend)
- Queue to Content Calendar → distribute via chosen method

**E. Add Email Composer Tab**
- New tab in Content Studio: "Email Digest"
- Auto-compiles published blog posts + community highlights
- Swan Coach writes intro/outro copy
- Sean previews and approves
- Sends via: Mailchimp free tier (up to 500 contacts), SendGrid free tier (100/day), or built-in SMTP
- 2x/month MAX cadence enforced in UI

---

## 4. PAID TOOL STRATEGY (Toggle On/Off)

### Services Sean Already Pays For
- Gemini API ($20/mo) — powers Swan Coach, badges, content generation
- Render ($60/mo) — hosting
- Claude Code subscription — development

### Optional Paid Add-Ons (Toggle via API keys)
| Service | Purpose | Cost | Alternative (Free) |
|---------|---------|------|-------------------|
| Late.dev | Social distribution (13 platforms) | $19/mo | Direct APIs (free, more dev work) |
| Higgsfield | Seedance 2.0 video gen | $15-34/mo | Remotion templates (free, already working) |
| ElevenLabs | Voice synthesis | $5-22/mo | Google TTS (free) or skip |
| Blotato | Social distribution | Varies | Late.dev or direct APIs |
| Arvo | SEO blog auto-writing | $30-100/mo | Swan Coach writes articles (free via Gemini) |
| Mailchimp | Email newsletters | $0 (free tier up to 500) | SendGrid free or built-in SMTP |

### CrystallineLockOverlay Pattern
Every optional service follows the same pattern:
1. If API key configured → service works
2. If NOT configured → CrystallineLockOverlay shows:
   - What the service does
   - "Configure [Service Name]" CTA → Settings tab
   - **Plan B workaround** shown below the lock:
     "Don't have [Service]? Swan Coach can still generate the content — copy and paste manually."

---

## 5. PLATFORM-SPECIFIC POST GENERATION

### What Swan Coach Generates Per Platform

**Facebook:** Community-focused, longer form, 1-2 hashtags, encourage comments
**Instagram:** Visual-first, 20-30 hashtags, story-friendly, carousel content
**TikTok:** Trendy, hook-first (first 3 seconds), relevant sounds suggested, short captions
**Nextdoor:** Local-focused, neighborhood tone, mention Charlotte/local area, no hard sell
**BlueSky:** Conversational, thread-friendly, link posts, community engagement
**YouTube:** Video descriptions, thumbnails, tags, chapters (for longer content)
**LinkedIn:** Professional tone, industry insights, longer posts, B2B angle
**Email Digest:** Warm, personal, curated highlights, clear CTAs

### Post Template Library
1. **New Blog Post** — Announce new article with hook + link
2. **Client Success Story** — Before/after or testimonial (with permission)
3. **Workout Tip** — Quick NASM-backed training tip
4. **Nutrition Tip** — Clean eating, macro info, meal prep
5. **Community Event** — Promote meetups, challenges, group workouts
6. **Golf Performance** — Sport-specific content for golf market
7. **Motivational Quote** — Branded graphic with Swan Coach wisdom
8. **Behind the Scenes** — SwanStudios journey, Sean's story
9. **Training Package Promo** — Soft sell, value-focused
10. **Platform Feature Highlight** — Show what SwanStudios can do

---

## 6. SEO STRATEGY (From YouTube Research)

### Immediate Actions
1. Run site audit on sswanstudios.com (PageSpeed, schema, meta, sitemaps)
2. Identify 25-50 keywords for fitness/training/golf in Sean's local market
3. Categorize by intent: emergency, service, problem, local
4. Build dedicated landing pages for high-intent keywords
5. Internal linking structure optimization
6. Google Business Profile setup/optimization

### Ongoing (Automated via Marketing Dashboard)
- Weekly: Swan Coach identifies new keyword opportunities
- Biweekly: New blog post targeting specific keyword
- Monthly: SEO audit report (rankings, traffic, technical issues)
- Quarterly: Competitor analysis refresh

### Tools
- Google PageSpeed Insights (free)
- Google Search Console (free)
- Gemini search grounding for keyword research (free via Sean's API)
- claude-seo skill (open source, 19 sub-skills) — optional install

---

## 7. FILE MANIFEST (New/Modified)

### New Files
| File | Purpose |
|------|---------|
| `frontend/src/components/DashBoard/Pages/admin-marketing/MarketingDashboard.tsx` | Main marketing dashboard |
| `frontend/src/components/DashBoard/Pages/admin-marketing/SEOAuditPanel.tsx` | Site audit tool |
| `frontend/src/components/DashBoard/Pages/admin-marketing/TrendingTopicsPanel.tsx` | Grounding search for topics |
| `frontend/src/components/DashBoard/Pages/admin-marketing/BlogWriterPanel.tsx` | Blog article composer |
| `frontend/src/components/DashBoard/Pages/admin-marketing/SocialPostGenerator.tsx` | Multi-platform post creator |
| `frontend/src/components/DashBoard/Pages/admin-marketing/EmailDigestComposer.tsx` | Bimonthly newsletter builder |
| `frontend/src/components/DashBoard/Pages/admin-marketing/LeadFunnelPanel.tsx` | Lead tracking visualization |
| `backend/routes/marketingRoutes.mjs` | Marketing API endpoints |
| `backend/services/socialDistributionService.mjs` | Multi-platform posting (Late.dev/direct APIs/Blotato) |
| `backend/services/blogService.mjs` | Blog CRUD + SEO optimization |

### Modified Files
| File | Changes |
|------|---------|
| Content Studio Hub | Replace Kling → Seedance 2.0, add Blog/Social/Email tabs |
| Distribution Hub | Support Late.dev + Blotato + direct APIs as togglable backends |
| Content Calendar | Add backend persistence |
| CLAUDE.md | Add Marketing Dashboard reference |
| Sidebar config | Add Marketing tab to admin sidebar |
| Swan Coach system prompts | Rebrand "AI" → "Swan Coach", add marketing expertise |

---

---

## 8. SECURITY INTELLIGENCE PANEL (Admin Dashboard)

### What This Feature Does (Defensive Security Monitoring)
A daily automated background scan of SwanStudios' own dependencies against known CVE databases.
Filtered specifically to our tech stack: Node.js, Express, Sequelize, React, PostgreSQL, Render.
Admin panel showing critical/high severity vulnerabilities that affect packages we actually use.

**What it is NOT:** Not a general hacker news feed, not a tool for scanning external targets, not offensive security. This is DEFENSIVE security monitoring — the right move for a platform holding health data.

### The 6 Free API Sources

**Tier 1 — Direct Dependency Scanning (Most Important)**

1. **GitHub Advisory Database API** — `GET https://api.github.com/advisories`
   - Powers npm audit, single source of truth for npm package vulnerabilities
   - Free, no auth required, returns JSON
   - Filter by ecosystem: npm, match against our package.json

2. **npm Audit API** — `POST https://registry.npmjs.org/-/npm/v1/security/audits`
   - Post package-lock.json structure → get "what's broken right now"
   - Fastest way to check SwanStudios dependencies automatically
   - No CLI required, direct API call from backend

**Tier 2 — CVE Intelligence (Broader Threat Awareness)**

3. **NVD (National Vulnerability Database)** — `GET https://services.nvd.nist.gov/rest/json/cves/2.0`
   - Free, no API key, queryable by keyword (express, sequelize, node, etc.)
   - Catches things GitHub Advisory might lag on

4. **CISA KEV (Known Exploited Vulnerabilities)** — JSON feed
   - `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
   - US government's authoritative list of CVEs actively exploited in the wild
   - If our dependencies hit this list = **911-level alert**

5. **CVEFeed.io API** — `https://api.cvefeed.io`
   - SQL-like query language (CVEQL): `vendor = "expressjs" AND cvss_score >= 7.0`
   - Continuous ingestion from NVD, CISA KEV, vendor advisories
   - Free forever tier

**Tier 3 — Human-Curated Security News (Context Layer)**

6. **The Hacker News RSS + Krebs on Security RSS**
   - `https://feeds.feedburner.com/TheHackersNews`
   - `https://krebsonsecurity.com/feed/`
   - Real-world breach analysis and zero-day context
   - Powers "Security Headlines" section — read-only, no automated action

### Architecture

```
Background Job (node-cron, daily at 3AM):
  1. Read backend/package-lock.json
  2. POST to npm audit API → get dependency vulnerabilities
  3. GET CISA KEV feed → filter against known packages
  4. GET NVD API → query "nodejs", "express", "sequelize", "postgresql"
  5. GET CVEFeed.io → query specific stack
  6. Deduplicate results by CVE ID
  7. Store in SecurityAlerts table (PostgreSQL)
  8. If any CRITICAL severity → email/notification to Sean

Admin Panel "Security" Tab:
  - Live dashboard: open alerts by severity (Critical/High/Medium/Low)
  - Each alert: CVE ID, affected package, installed version, fixed version,
    CVSS score, description
  - "Mark Resolved" button per alert
  - Headlines feed from THN/Krebs RSS (read-only context)
  - Last scan timestamp + "Run Scan Now" manual trigger
```

### New Files Needed
| File | Purpose |
|------|---------|
| `backend/models/SecurityAlert.mjs` | Sequelize model for vulnerability alerts |
| `backend/migrations/2026XXXX-create-security-alerts.cjs` | Database migration |
| `backend/services/securityScannerService.mjs` | Scans all 6 APIs, deduplicates, stores |
| `backend/jobs/securityScanJob.mjs` | node-cron daily scheduler |
| `backend/routes/securityRoutes.mjs` | Admin endpoints (GET alerts, POST mark-resolved, POST run-scan) |
| `frontend/src/components/DashBoard/Pages/admin-security/SecurityPanel.tsx` | Admin dashboard UI |

### Security of the Security Panel Itself
- ALL routes require `protect + adminOnly` middleware
- No client/trainer access to security data
- CVE details are NOT sensitive — they're public information
- But our specific package versions ARE operationally sensitive — don't expose outside admin
- "Run Scan Now" is rate-limited (1 scan per hour max)
- RSS feeds fetched server-side, sanitized before rendering (prevent XSS from RSS content)

### Trust Signal
This becomes a marketing differentiator: "Your health data is protected by continuous security monitoring" — most platforms at this stage don't have this. Shows users and trainers that SwanStudios takes security seriously.

---

## 9. COMPREHENSIVE SECURITY ARCHITECTURE (Village Round 2 Findings)

### Authentication & Session Security
- Rate limiting on login: 5 attempts/min/IP, exponential backoff, CAPTCHA after 3 failures
- Session cookies: Secure, HttpOnly, SameSite=Strict
- HSTS header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
- All HTTP → HTTPS redirect enforced at Render level

### Content Security
- CSP (Content Security Policy) headers via helmet middleware
- XSS prevention: sanitize all user-generated content before render (blog posts, social posts)
- CSRF protection on all state-changing operations
- Input validation on all blog/social content endpoints

### Credential Storage (CRITICAL — Village Finding)
- OAuth tokens for social platforms stored in ENCRYPTED database model (PlatformCredential)
- NOT in .env files (those are for bootstrap secrets only)
- AES-256-GCM encryption, key from Render secrets
- Token refresh lifecycle managed per-platform
- Frontend NEVER receives actual tokens — only boolean `isConfigured`
- Audit trail: who created/modified credentials, when

### Data Privacy
- Audit logs sanitized for PII (log user IDs, not names/emails)
- GDPR right-to-deletion endpoint (scrub user data from all stores on request)
- Data retention policy defined and documented
- PII fields tagged for automated deletion workflows

### Infrastructure Security
- Dependency scanning: npm audit + Dependabot alerts in CI/CD
- WAF consideration: Cloudflare free tier with OWASP Core Rule Set
- DDoS mitigation: Render's built-in protections + Cloudflare if needed
- File upload security: MIME allow-list, virus scanning, randomized filenames

---

---

## 10. END-TO-END ENCRYPTION (WhatsApp-Style — Signal Protocol)

### Why This Matters
Sean wants WhatsApp-level privacy for ALL private communications on SwanStudios. This is a platform that holds health data, injury records, body measurements, and private client-trainer conversations. E2EE is the right thing to do — and it becomes a massive trust signal and competitive differentiator.

### Protocol: Signal Protocol (Same as WhatsApp)
- **Library:** `@signalapp/libsignal-client` (official, TypeScript API — replaces deprecated JS version)
- **Alternative:** `@privacyresearch/libsignal-protocol-typescript` (community, well-maintained)
- **Cost:** $0 — open source, all encryption happens client-side
- **2026 Update:** Signal now uses PQXDH (post-quantum key exchange) for new sessions — future-proof against quantum computing attacks

### How It Works

**Key Exchange (X3DH / PQXDH):**
- Each user generates 3 key types on their device: Identity Key (permanent), Signed Pre-Key (rotates), One-Time Pre-Keys (disposable)
- Pre-keys uploaded to server so messages can be sent even when recipient is offline
- Three Diffie-Hellman exchanges establish shared secret WITHOUT sending the secret over the network

**Message Encryption (Double Ratchet):**
- Each message encrypted with a UNIQUE key (derived from ratcheting forward)
- Forward secrecy: compromising current keys CANNOT decrypt past messages
- Primitives: Curve25519, AES-256, HMAC-SHA256

**Server Role:**
- Stores ONLY encrypted blobs — CANNOT read message content
- Routes messages between users
- Stores pre-keys for offline message initiation
- Deletes messages after delivery confirmation

### What Gets Encrypted

| Data | E2EE? | Priority | Notes |
|------|-------|----------|-------|
| Client ↔ Trainer messages | YES | Phase 1 | Highest priority — private coaching conversations |
| Swan Coach conversation history | YES (at rest) | Phase 2 | AES-256 encryption in database |
| Health data (pain, injuries, measurements) | YES (at rest) | Phase 3 | Sequelize field-level encryption |
| Progress photos | YES (at rest) | Phase 4 | Encrypted before R2 upload |
| Community DMs | YES (optional toggle) | Phase 5 | User chooses whether to encrypt |
| Social feed posts | NO | N/A | Public by design |
| Gamification data | NO | N/A | XP, badges not sensitive |
| Blog content | NO | N/A | Public content |

### Architecture

```
Client Device (React)                    SwanStudios Server                  Trainer Device
┌─────────────────────┐                ┌──────────────────────┐           ┌─��───────────────────┐
│ Generate keypair     │                │ Store encrypted blobs│           │ Generate keypair     │
│ Upload pre-keys  ────┼───────────────►│ Route messages       │◄──────────┼── Upload pre-keys   │
│ Encrypt locally  ────┼───────────────►│ NEVER decrypt        │───────────┼──► Receive encrypted │
│ Decrypt received ◄───┼────────────────│ Delete after delivery│           │ Decrypt locally      │
│ Store keys locally   │                │ Store pre-keys only  │           │ Store keys locally   │
└─────────────────────┘                └──────────────────────┘           └─────��───────────────┘
```

**The server NEVER has access to plaintext.** This is the fundamental principle.

### UX Design

- 🔒 Lock icon on all encrypted conversations (like WhatsApp)
- Banner: "Messages are end-to-end encrypted — only you and [Trainer Name] can read them"
- Safety number verification (optional): QR code or number comparison
- If user loses device → encrypted messages on that device are unrecoverable (security tradeoff — must communicate this clearly)
- Key backup: option to export encrypted backup to user's own cloud storage

### Implementation Files

| File | Purpose |
|------|---------|
| `frontend/src/services/encryption/signalProtocol.ts` | Signal Protocol wrapper (key gen, encrypt, decrypt) |
| `frontend/src/services/encryption/keyStore.ts` | IndexedDB-backed key storage (client-side only) |
| `backend/models/PreKeyBundle.mjs` | Store public pre-keys for offline messaging |
| `backend/models/EncryptedMessage.mjs` | Store encrypted message blobs (server can't read) |
| `backend/routes/encryptionRoutes.mjs` | Pre-key upload, message routing endpoints |
| `frontend/src/components/Chat/EncryptedChatBadge.tsx` | Lock icon + "encrypted" badge UI |

### Security of the Encryption System
- Server NEVER stores private keys — only public pre-keys
- Pre-key upload requires authentication (protect middleware)
- Message blobs are opaque to server — no content inspection possible
- Rate limiting on pre-key requests (prevent key exhaustion attacks)
- One-time pre-keys are deleted after first use (prevent replay attacks)
- If pre-keys run out, falls back to signed pre-key (less forward secrecy but still encrypted)

---

## 11. VILLAGE VALIDATION REQUEST — ROUND 4 (COMPREHENSIVE)

This plan now covers ALL systems. The Village should:

1. **SECURITY DEEP DIVE:** Validate the Security Intelligence Panel (6 APIs), E2EE Signal Protocol implementation, OAuth token storage, CSP headers, and all authentication guards
2. **UX/UI AUDIT:** Review the ENTIRE homepage (sswanstudios.com), about page, /ascension page, Marketing Dashboard, Content Studio, and Security Panel for design flaws, accessibility gaps, and mobile responsiveness
3. **ENHANCEMENT GAPS:** What are we missing? What would competitors do that we haven't thought of? What would take this from good to industry-leading?
4. **E2EE ARCHITECTURE:** Is Signal Protocol the right choice? Are there simpler alternatives for our use case? What are the UX pitfalls of E2EE (key loss, device switching, multi-device)?
5. **SCALABILITY:** Will this architecture handle 10,000+ users with encrypted messages, daily security scans, marketing automation, and AI content generation all running simultaneously?

---

*This plan compiled from: 4 YouTube transcript analyses, Content Studio audit, competitor research (Hootsuite/Buffer/Later/Sprout Social), API pricing research (Late.dev/Ayrshare/Blotato/direct APIs), Seedance 2.0 pricing research, Sean's directives on quality/cadence/budget, Sean's Security Intelligence Panel research (6 free APIs), and Signal Protocol E2EE deep research. Triple-validated by 14-brain AI Village (Rounds 1-3), Round 4 pending.*
