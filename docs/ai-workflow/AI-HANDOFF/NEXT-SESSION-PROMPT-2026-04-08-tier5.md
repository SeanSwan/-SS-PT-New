# NEXT SESSION PROMPT — 2026-04-08 (Tier 5 Implementation Sprint)

## Copy everything below this line and paste to Claude in the new session:

---

We're continuing from two back-to-back build sprints. Here's where we are:

## Completed & Deployed (All Committed + Pushed to Main)

### Prior Session: Bug Fix Tiers + Phase 1 + Phase 2 Builds
| Commit | What | Status |
|--------|------|--------|
| `9d82f517` | Tier 3: 5 feature-completion fixes | Deployed, Codex R2 |
| `54fbdb55` | Tier 4: WCAG contrast audit — 26 files, 37 opacity fixes | Deployed, Codex R2 |
| `b7ed91e5` | Codex: hero CTAs + store scroll jank fix | Deployed |
| `82b7fd8e` | 6.4 Social Media Phase 1 — Postiz, FTC/FDA compliance | Deployed, Codex R4 |
| `a5c5a7db` | 6.10 Video Chat Phase 1 — LiveKit, PreCallCheck, VideoRoom | Deployed, Codex R4 |
| `e361b993` | 6.2 Gamification Phase 1 — AvatarHome, Level 10 unlock | Deployed, Codex R4 |
| `681061ee` | 6.3 Badge Creator Phase 1 — Recraft V3, 40 styles | Deployed, Codex R6 |
| `fca8ea6e` | 6.4 Social Media Phase 2 — scheduling, analytics | Deployed, Codex R4 |
| `137a4a29` | 6.10 Video Chat Phase 2 — FreezeFrame, notes, micro-wins | Deployed, Codex R4 |
| `a17af5ab` | 6.2 Gamification Phase 2 — pets, Virtual Olympics, Ghost Racing | Deployed, Codex R4 |
| `c7023137` | 6.3 Badge Creator Phase 2 — gallery, rarity, assignment | Deployed, Codex R2 |

### This Session: Phase 3 Builds (All Deployed)
| Commit | What | Status |
|--------|------|--------|
| `3f84b8a9` | **6.4 Social Media Phase 3** — AI content calendar, best-time-to-post, auto-post templates | Deployed, Codex R2 |
| `b59deac6` | **6.3 Badge Creator Phase 3** — batch generation (5 variations), style mixing, pet avatars, marketplace, animated badges (CSS shimmer) | Deployed, Codex R4 |
| `901e15a6` | **6.10 Video Chat Phase 3** — ROM tracking (14 joint norms), recovery score, wearable data (HealthKit/Google Fit), Deepgram transcription, WCAG accessible video player | Deployed, Codex R6 |
| `968337a2` | **6.2 Gamification Phase 3** — Crystalline Marketplace (14-item catalog, crystal currency), Corporate Faction hooks, Ready Player Me avatar, HealthKit recovery sync | Deployed, Codex R4 |

### This Session Scorecard
| Metric | Count |
|--------|-------|
| Commits pushed | 4 (3 Phase 3 builds + 1 was prior session) |
| Codex debates won | 4 (all consensus) |
| New backend model fields | 15 |
| New backend endpoints | 22 |
| New frontend components | 9 |
| Modified files | ~18 |
| Build status | All clean |

---

## What Needs To Happen Next: TIER 5 IMPLEMENTATION

### The Master Plan (Opus CEO + Gemini CTO + Codex Consensus R4)
**Full plan file:** `docs/ai-workflow/AI-HANDOFF/TIER5-COMPREHENSIVE-PLAN-2026-04-08.md`
**Debate transcript:** `docs/ai-workflow/AI-HANDOFF/debate-archive/OPUS-CODEX-DEBATE-TIER5-PLAN-2026-04-08.md`
**Debate summary:** `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-TIER5-PLAN-2026-04-08.md`
**Gemini CTO design directives:** `AI-Village-Documentation/gemini-consults/latest.md`

### Sprint Order (Approved by All Three Reviewers)

#### Sprint 1: 6.1 Subscription Tiers (5-7 days) + 6.9 Dashboard P0 Fixes (concurrent)

**6.1 Subscription Tier Restructuring:**
- **Phase 0 (Prerequisites):** Canonical tier naming migration (`free`→`starter`, `pro`→`guardian`, `elite`→`crystalline`), Stripe product/price IDs, add `subscriptionTier` to JWT + `/api/auth/me`, webhook endpoint with idempotency, `TIER_GATING_ENABLED` feature flag
- **Phase 1:** `/ascension` page with 3 tier cards, Stripe Checkout (Guardian=payment mode, Crystalline=subscription mode), donation slider, wire into Store Memberships tab
- **Phase 2:** `requireTier(minTier)` centralized middleware in `backend/middleware/tierGating.mjs`, `FrostedPaywall` component, `CrystallineLockOverlay`, gate: AI Coach (10 free/unlimited guardian+), badge gen (3 free/50 guardian+), video form check (crystalline), trainer messaging (crystalline), advanced analytics (guardian+)
- **Phase 3:** Admin grant/revoke tiers, admin/trainers bypass all gating, rate limiting (100+ req/hr = bot flag)
- **KEY BILLING RULE:** Guardian = one-time donation (Stripe mode:payment). Crystalline = recurring $24.99/mo (mode:subscription). If cumulative Guardian donations reach $25+, user gets a PROMPT to upgrade to Crystalline free for one month — NOT automatic. No mixing of billing semantics.
- **Existing plans:** `docs/ai-workflow/blueprints/SUBSCRIPTION-STORE-MASTER-BUILD-PLAN.md`, `docs/ai-workflow/blueprints/SUBSCRIPTION-TIER-SYSTEM-BLUEPRINT.md`

**6.9 Dashboard P0 Bug Fixes (concurrent with 6.1):**
- Fix admin sidebar routing (100% broken)
- Fix admin overview quick action buttons (old paths)
- Replace ALL mock data (John Doe, Sarah, Mike) with real DB queries
- Fix client "My Workouts" endpoint mismatch
- Wire trainer form assessment submit
- Fix light theme box shadows
- **Full bug list:** `docs/ai-workflow/AI-HANDOFF/MASTER-ISSUE-REGISTRY-2026-04-07.md` Section 1-4
- **Existing plans:** `docs/UNIFIED-DASHBOARD-CONSOLIDATION-BLUEPRINT.md`, `docs/DASHBOARD-CONSOLIDATION-ACTION-PLAN.md`

#### Sprint 2: 6.5 Nutrition (4-6 days) + 6.9 Widget Redesign

**6.5 Nutrition Intelligence:**
- Phase 1: Wire MacroDonut to real `/api/macros/summary`, restore barcode camera (BarcodeDetector API), ingredient color-coding (IARC Group 1 = red), FDA disclaimer
- Phase 2: FatSecret API for restaurant nutrition, wire nutrition context into Coach Assistant
- **Existing plans:** `docs/ai-workflow/blueprints/NUTRITION-ECOSYSTEM-MASTER-PLAN.md`, `AI-Village-Documentation/validation-prompts/latest/opus-ceo-ruling-nutrition-ecosystem.md`
- **90% already built.** Backend fully live, most frontend components exist.

**6.9 Phase 2 Widget Redesign (depends on 6.1 paywall UX):**
- Client overview: mini Victory charts, training plan status, last 5 workouts
- Trainer overview: client roster with compliance, today's schedule
- Build WITH paywall-aware states from 6.1

#### Sprint 3: 6.8 Teach Me Mode (3-4 days) + 6.6 Content Studio Phase 1

**6.8 Teach Me Mode:**
- 3-tab deep exercise panel: "How To Perform", "Phase & Progression", "Learn & Watch"
- Data from Exercise model fields (instructions, coachingCues, safetyTips, progressionPath, scientificReferences)
- Extend to 5 dashboard tabs (workout planner, coach, gamification, client mgmt, scheduling)
- **Existing plan:** `docs/ai-workflow/blueprints/TEACH-MODE-EXPANSION-PLAN.md`

**6.6 Content Studio Phase 1:**
- Swan Coach rebrand (replace user-facing "AI" → "Swan Coach")
- Content Calendar persistence: NEW model `ContentCalendarEntry` + CRUD API
- Wire to existing social publishing routes
- Fix Remotion template crash (styled-components error #12)
- **Existing plan:** `docs/ai-workflow/blueprints/SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md`

#### Sprint 4: 6.6 Content Studio Phase 2-3 + 6.7 Calendar (4-6 days)

**6.6 Content Studio Phase 2-3:**
- SEO Command Center (PageSpeed Insights API)
- Content Engine (trending topics, blog outline generator)
- Distribution Hub (connect to Postiz)
- Replace Kling → Seedance 2.0 (laozhang.ai API $0.05/video)

**6.7 Calendar System Overhaul:**
- Mobile UX fixes (sticky scroll documented in registry)
- Session reminders via `node-cron` + email service (fallback: admin alerts if email fails)
- Cancellation/reschedule flow
- 24hr booking flag, Coach AI scheduling (fallback: session history if no wearable data)
- Admin-only session creation DROPPED (trainers keep scheduling)
- **Existing plans:** `docs/ai-workflow/blueprints/UNIVERSAL-MASTER-SCHEDULE-MINDBODY-UPGRADE.md`

#### Sprint 5: 6.11 Playwright QA (5-7 days)

- 8 smoke flows + 10 regression suites
- Primary target: Bundled Chromium, Brave as optional local parity
- Dedicated test user: `test-playwright@swanstudios.com`
- Test tenant flag + cleanup hooks after destructive tests
- **Full spec:** `docs/ai-workflow/AI-HANDOFF/PLAYWRIGHT-QA-SPEC-2026-04-06.md`

---

## Key Architecture Decisions (All Approved)

- **Postiz** for social media scheduling (NOT building OAuth from scratch)
- **LiveKit** for video chat (NOT raw WebRTC)
- **Recraft V3** for badge generation (specializes in icons)
- **Deepgram Nova-2** for transcription (smart_format + paragraphs)
- **Ready Player Me** for 3D avatar face scan (iframe viewer + GLB URL)
- **Stripe Checkout** for subscriptions (payment mode for donations, subscription mode for recurring)
- **requireTier middleware** centralized in one file, reads from JWT
- **TIER_GATING_ENABLED** feature flag for rollback safety
- **$5/day AI cost ceiling** deferred to post-launch
- **Barcode** phased: BarcodeDetector first, WASM fallback later
- **node-cron** for session reminders
- **ContentCalendarEntry** model for content calendar persistence
- **Recovery Day = Wisdom XP** (rewarding smart rest)
- **Ghost Racing** async (no real-time multiplayer)
- **Level 10** progressive unlock for 3D avatar home
- **50/month** global badge generation cap (DB-backed)
- **Crystal currency** for marketplace (earned through gameplay, no real-money IAP)
- **Corporate Factions** architecture hooks only (full warfare deferred)

## Key Files Created This Sprint (Phase 3)

### Badge Creator Phase 3
- `frontend/src/components/BadgeCreator/BatchGenerationPanel.tsx` — 5-variation batch + style mixer + pet avatar
- `frontend/src/components/BadgeCreator/BadgeMarketplacePanel.tsx` — browse/claim shared badges
- `frontend/src/components/BadgeCreator/AnimatedBadge.tsx` — CSS shimmer/glow for Legendary tier

### Video Chat Phase 3
- `frontend/src/components/VideoChat/ROMTrackingPanel.tsx` — 11-joint ROM form + recovery score
- `frontend/src/components/VideoChat/WearableDataPanel.tsx` — HealthKit/Google Fit 4-metric display
- `frontend/src/components/VideoChat/AccessibleVideoPlayer.tsx` — WCAG 2.2 keyboard-navigable player

### Gamification Phase 3
- `frontend/src/components/AvatarHome/CrystallineMarketplace.tsx` — 14-item shop with crystal currency
- `frontend/src/components/AvatarHome/FactionHooksPanel.tsx` — join/leave faction UI
- `frontend/src/components/AvatarHome/ReadyPlayerMeAvatar.tsx` — RPM face scan → GLB avatar

## Debate Protocol
- Per-phase debate files (not mega-files)
- Archive on consensus to `docs/ai-workflow/AI-HANDOFF/debate-archive/`
- Max 500 lines per debate file
- Details in CLAUDE.md under "Opus-Codex Recursive Debate Protocol"

## Debate Archive (This Session)
- `debate-archive/OPUS-CODEX-DEBATE-6.4-PHASE3-2026-04-07.md` — Social Media Phase 3, R2
- `debate-archive/OPUS-CODEX-DEBATE-6.3-PHASE3-2026-04-07.md` — Badge Creator Phase 3, R4
- `debate-archive/OPUS-CODEX-DEBATE-6.10-PHASE3-2026-04-07.md` — Video Chat Phase 3, R6
- `debate-archive/OPUS-CODEX-DEBATE-6.2-PHASE3-2026-04-08.md` — Gamification Phase 3, R4
- `debate-archive/OPUS-CODEX-DEBATE-TIER5-PLAN-2026-04-08.md` — Tier 5 Planning, R4

## AI Village Runs (4 prior, $1.30 total)
All CEO rulings in `AI-Village-Documentation/validation-prompts/latest/`:
- `opus-ceo-ruling-social-media-publishing.md`
- `opus-ceo-ruling-video-chat-webrtc.md`
- `opus-ceo-ruling-gamification-v3-sims.md`
- `opus-ceo-ruling-badge-creator.md`
- `opus-ceo-ruling-nutrition-ecosystem.md` (for 6.5)

## Master Registry
All issues documented in: `docs/ai-workflow/AI-HANDOFF/MASTER-ISSUE-REGISTRY-2026-04-07.md`

## Gemini CTO Design Directives (Apply to All Sprint 1+ Builds)
- Crystalline glassmorphism: `rgba(26, 26, 36, 0.85)` + `backdrop-filter: blur(16px)` + 5% Frost White border
- Dual-button glow: Blue bg → Purple glow on hover, Purple bg → Cyan glow on hover
- Fluid typography: `clamp()` for all headings (32px@320px → 64px@1920px)
- Z-index vault: base=0, surface=10, dropdown=100, modal=1000, toast=2000
- "Breathe" micro-interaction: primary CTAs pulse box-shadow (4s cycle)
- Full specs: `AI-Village-Documentation/gemini-consults/latest.md`

## START HERE
Begin Sprint 1: **6.1 Subscription Tier Restructuring Phase 0** (prerequisites) + **6.9 Dashboard P0 Bug Fixes**.

Read the full plan first: `docs/ai-workflow/AI-HANDOFF/TIER5-COMPREHENSIVE-PLAN-2026-04-08.md`
Then read the Codex debate for context on all agreed decisions: `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-TIER5-PLAN-2026-04-08.md`
