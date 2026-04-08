# TIER 5 COMPREHENSIVE PLAN — Opus CEO Deep Research
## Date: 2026-04-08
## Status: APPROVED — Opus CEO + Gemini CTO + Codex Consensus R4

---

## Executive Summary

7 Tier 5 items need implementation. After thorough research, I've categorized them into 3 priority tiers based on (1) existing readiness, (2) business impact, (3) dependency chains. The plan sequences work to avoid rework and maximize revenue-critical features first.

---

## PRIORITY ORDER (Revenue Impact × Readiness)

### TIER A — Ship Now (existing plans + code, highest revenue impact)
1. **6.1 Subscription Tier Restructuring** — Revenue gating. Without this, everything is free.
2. **6.5 Nutrition Intelligence** — 90% built, CEO approved, 6-phase plan exists.
3. **6.9 Client Dashboard Consolidation** — 10 P0 bugs blocking client/trainer experience.

### TIER B — Build Next (architecture ready, moderate effort)
4. **6.8 Teach Me Mode** — DB fields exist, just need UI. Differentiator for premium tier.
5. **6.6 Content Studio Overhaul** — Marketing engine. Builds on existing Remotion/badge work.

### TIER C — Foundation (enables future but no immediate revenue)
6. **6.7 Calendar System Overhaul** — Working but needs polish. Not broken.
7. **6.11 Playwright QA Test Suite** — Quality gate. Run after all features ship.

---

## DETAILED PLANS

### 6.1 SUBSCRIPTION TIER RESTRUCTURING
**Readiness: 80% planned, 20% built | Effort: 5-7 days | Revenue: CRITICAL**

**Existing:** Master plan approved (14-brain, 11/12 passed), 3-tier model defined, backend tier IDs exist.

**Build Plan (3 phases):**

**Phase 0: Prerequisites (1 day)**
- Canonical tier naming migration: `free` → `starter`, `pro` → `guardian`, `elite` → `crystalline`
- Create Stripe products/price IDs (Starter free, Guardian donation mode:payment, Crystalline $24.99/mo mode:subscription)
- Add `subscriptionTier` to auth JWT payload + `/api/auth/me` response
- Webhook endpoint: `POST /api/stripe/webhook` with idempotency key (event.id dedup)
- Feature flag: `TIER_GATING_ENABLED` — if false, all features remain open (rollback safety)

**Phase 1: /ascension Page + Store Integration (1-2 days)**
- New route `/ascension` with 3 tier cards (Starter FREE, Guardian DONATION $1+, Crystalline $24.99/mo)
- Guardian auto-upgrades to Crystalline at $25+ donation (existing CEO decision)
- Stripe Checkout integration for Crystalline (webhook → update user.subscriptionTier)
- Donation slider for Guardian tier (minimum $1, no cap)
- Wire into Store page "Memberships" tab

**Phase 2: Feature Gating Middleware (1-2 days)**
- Backend: `requireTier(minTier)` middleware — checks user.subscriptionTier against hierarchy (free < pro < elite)
- Frontend: `FrostedPaywall` component — overlay on locked features with "Upgrade" CTA
- `CrystallineLockOverlay` for specific locked widgets
- Gate these features:
  - AI Coach: 10 chats/mo free, unlimited Guardian+
  - Badge generation: 3/mo free, 50/mo Guardian+
  - Video form check: Crystalline only
  - Trainer messaging: Crystalline only
  - Advanced analytics: Guardian+

**Phase 3: Admin Controls + Anti-Abuse (1 day)**
- Admin can grant/revoke tiers per user
- Admin/trainers bypass all tier gating (existing CEO decision)
- Rate limiting: 100+ requests/hour = bot flag
- $5/day global AI cost ceiling with alert

**Key Files to Create/Modify:**
- NEW: `frontend/src/pages/AscensionPage.tsx`
- NEW: `backend/middleware/tierGating.mjs`
- NEW: `frontend/src/components/shared/FrostedPaywall.tsx`
- MODIFY: `backend/routes/*.mjs` (add requireTier to gated endpoints)
- MODIFY: Store page (add Memberships tab)

---

### 6.5 NUTRITION INTELLIGENCE
**Readiness: 90% built | Effort: 4-6 days for Phase 1-2 | Revenue: HIGH (differentiator)**

**Existing:** CEO approved (2026-03-31), 16/17 AI Village passed, full backend live, 90% frontend built.

**Build Plan (follow CEO-approved 6-phase plan):**

**Phase 1 (1-2 days) — Wire Existing Components:**
- Wire MacroDonut chart to real `/api/macros/summary` data (currently placeholder)
- Restore barcode camera in BarcodeScanner.tsx (BarcodeDetector API + WASM fallback)
- Ingredient color-coding: IARC Group 1 carcinogens = red, Group 2A = orange, rest = green
- FDA disclaimer on all nutrition screens: "Not medical advice"

**Phase 2 (2-3 days) — Restaurant & Coach Integration:**
- FatSecret API integration for restaurant menu nutrition data
- Wire nutrition context into Coach Assistant (so AI knows client's diet when planning workouts)
- Meal plan templates (golf client preset: high protein, anti-inflammatory)

**Phases 3-6 deferred** until Phase 1-2 validated in production.

**Key Files to Modify:**
- `frontend/src/components/NutritionHub/FoodIntelligenceDashboard.tsx` (wire MacroDonut)
- `frontend/src/components/NutritionHub/BarcodeScanner.tsx` (restore camera)
- `backend/routes/foodScannerRoutes.mjs` (ingredient safety DB)

---

### 6.9 CLIENT DASHBOARD CONSOLIDATION
**Readiness: Bug audit complete | Effort: 4-6 days | Revenue: HIGH (retention)**

**Existing:** 10 P0 bugs documented, consolidation blueprint + action plan exist.

**Build Plan (2 phases):**

**Phase 1: Fix P0 Bugs (2 days)**
1. Fix admin sidebar routing (100% broken)
2. Fix admin overview quick action buttons (old paths)
3. Replace ALL mock data (John Doe, Sarah, Mike) with real DB queries
4. Fix client "My Workouts" endpoint mismatch
5. Wire trainer form assessment submit
6. Fix light theme box shadows

**Phase 2: Widget-Based Overview Redesign (1-2 days)**
- Client overview: mini Victory progress charts, training plan status, last 5 workouts, quick stats
- Trainer overview: client roster with compliance status, today's schedule, quick-access buttons
- Admin overview: already mostly good, fix broken quick actions

**Key Files:** Per MASTER-ISSUE-REGISTRY line items with exact file paths + line numbers.

---

### 6.8 TEACH ME MODE
**Readiness: Architecture + DB ready | Effort: 3-4 days | Revenue: MEDIUM (premium differentiator)**

**Existing:** TEACH-MODE-EXPANSION-PLAN.md exists, Exercise model has all needed fields, 3 existing sidebar implementations.

**Build Plan:**

**Phase 1: Deep Exercise Intelligence (2 days)**
- 3-tab Teach Mode panel in Workout Planner:
  1. "How To Perform" — step-by-step instructions, coaching cues, muscles worked, biomechanics, safety
  2. "Phase & Progression" — OPT phase parameters, progression chain, prerequisites, variations
  3. "Learn & Watch" — video demos (from R2), scientific references
- Data source: Exercise model fields (`instructions`, `coachingCues`, `safetyTips`, `secondaryMuscles`, `progressionPath`, `prerequisites`, `scientificReferences`)

**Phase 2: Extend to Other Tabs (1 day)**
- Coach Assistant: nutrition context tooltips
- Gamification: achievement explanation overlays
- Client Management: trainer messaging help
- Scheduling: session type guidance

**Key Files:**
- NEW: `frontend/src/components/TeachMode/DeepExercisePanel.tsx` (3-tab)
- MODIFY: WorkoutPlannerPage.tsx (integrate panel)
- MODIFY: Existing TeachModeSidebar components (extend patterns)

---

### 6.6 CONTENT STUDIO OVERHAUL
**Readiness: 60% planned | Effort: 6-8 days | Revenue: MEDIUM (marketing engine)**

**Existing:** Current studio has Remotion, badge creator, exercise coverage. Round 2 validation in progress.

**Build Plan (3 phases):**

**Phase 1: Swan Coach Rebrand + Calendar Persistence (1-2 days)**
- Replace user-facing "AI" branding → "Swan Coach" / "SwanStudios Coach Assistant"
- Content Calendar: add persistence (save/load scheduled posts)
- Wire Content Studio distribution to social publishing routes (already built in Phase 3)

**Phase 2: Marketing Dashboard (2-3 days)**
- SEO Command Center: PageSpeed Insights API (free), keyword tracking
- Content Engine: trending topic suggestions, blog outline generator (Claude API)
- Distribution Hub: connect to Postiz (already have social publishing routes)
- Analytics: traffic + social performance dashboards

**Phase 3: Video AI Upgrade (1 day)**
- Replace Kling → Seedance 2.0 (via laozhang.ai API, $0.05/video)
- Fix Remotion template crash (styled-components error #12)

**Key Files:**
- MODIFY: Content Studio pages (rebrand)
- NEW: `frontend/src/components/DashBoard/workspaces/marketing/SEOCommandCenter.tsx`
- MODIFY: ContentCalendarPanel.tsx (add persistence)

---

### 6.7 CALENDAR SYSTEM OVERHAUL
**Readiness: Working backbone | Effort: 4-6 days | Revenue: LOW (not broken)**

**Existing:** Universal Schedule fully implemented with MinBody sync.

**Build Plan:**

**Phase 1: UX Polish (1-2 days)**
- Fix mobile sticky scroll issues (documented in registry)
- Add session reminders (email + push notification hooks)
- Cancellation/reschedule flow with policy enforcement

**Phase 2: 24hr + Coach AI (1 day)**
- After-hours booking flag (emergency sessions)
- Coach AI integration: suggest optimal session times based on client's recovery data (from HealthKit sync)
- Admin-only session creation controls (trainers can view, only admin creates)

**Key Files:**
- MODIFY: UniversalMasterSchedule components
- NEW: Session reminder system (backend job)

---

### 6.11 PLAYWRIGHT QA TEST SUITE
**Readiness: Full spec defined | Effort: 5-7 days | Revenue: N/A (quality gate)**

**Existing:** PLAYWRIGHT-QA-SPEC-2026-04-06.md with 8 smoke flows + 10 regression suites.

**Build Plan:**

**Phase 1: Smoke Suite (1 day)**
- 8 flows: login, coach, workout planner, content studio, marketing, security, store, schedule
- Screenshot on failure, console error capture

**Phase 2: Regression Suites (2-3 days)**
- A-J suites per spec (workout planner, boot camp, coach, auth, payment, nutrition, gamification, forms, mobile, performance)
- Run with Brave browser (user preference)
- CI/CD integration (run on pre-push hook or GitHub Actions)

**Environment:**
- Test against local dev (which uses production DB)
- Create test tenant for destructive flows
- Seeded test data for consistent assertions

**Key Files:**
- NEW: `tests/e2e/` directory
- NEW: `playwright.config.ts`
- NEW: Individual test files per suite

---

## IMPLEMENTATION SEQUENCE (Codex-Approved)

```
Sprint 1: 6.1 Subscription Tiers (Phase 0-3) + 6.9 Dashboard P0 Bug Fixes (Phase 1) — CONCURRENT
Sprint 2: 6.5 Nutrition (Phase 1-2) + 6.9 Dashboard Widget Redesign (Phase 2, informed by 6.1 paywall UX)
Sprint 3: 6.8 Teach Me Mode (Phase 1-2) + 6.6 Content Studio (Phase 1)
Sprint 4: 6.6 Content Studio (Phase 2-3) + 6.7 Calendar (Phase 1-2)
Sprint 5: 6.11 Playwright QA (Phase 1-2) — run against everything built
```

---

## CEO RULINGS (Opus 4.6 Final Authority)

1. **6.1 is #1 priority** — nothing else matters if features are all free
2. **6.5 Nutrition Phase 1 ships ASAP** — 90% built, just needs wiring
3. **6.9 P0 bugs before widget redesign** — broken features lose users
4. **6.11 QA runs LAST** — test everything after it's built
5. **6.7 Calendar is lowest priority** — it works, just needs polish
6. **LangGraph pet AI (from 6.2) stays deferred** — deterministic state machine is fine
7. **All items get 3-phase builds** — same pattern as Phase 1/2/3 sprint

---

## REVIEW STATUS

1. **Opus CEO** — ✅ Deep research + comprehensive plan written
2. **Gemini CTO** — ✅ Design directives added (glassmorphism, dual-button glow, fluid typography, z-index vault)
3. **Codex** — ✅ Feasibility review complete, consensus R4 (widened estimates, added prerequisites, clarified billing)
4. **Sean** — ⏳ Final approval on priority order + when to start Sprint 1
