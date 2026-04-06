# Next Session Prompt — Copy/Paste This to Start

---

## PROMPT:

Continue building SwanStudios. Phases 1-9 are COMPLETE and deployed. We are starting Phase 10 of 11. Everything is committed, pushed, and live on Render.

**IMPORTANT:** The full phase tracker with all 11 phases, file paths, and status is in this file:
`docs/ai-workflow/AI-HANDOFF/NEXT-SESSION-PROMPT.md`

Read that file first to get full context before starting work.

**What was already built and deployed (Phases 1-9):**

### Phase 1 — Dark Navy Default Theme + 4 New Themes
- 18 themes (dark navy = crystalline-dark default confirmed)
- Cyberpunk Cyan accent fix
- Kling→Seedance 2.0, AI→Swan Coach rebrand started

### Phase 2 — Homepage UX Overhaul
- `useAnimationTier` hook at `frontend/src/hooks/useAnimationTier.ts` — 3-tier device detection (full 8+ cores / balanced 4-7 / essential <4 or prefers-reduced-motion)
- `useTierFlags()` helper returns booleans: showParallax, showBlur, showCharSplit, showStagger, etc.
- 5 reusable animation components in `frontend/src/components/ui/animations/`
- Enhanced `ScrollReveal` + `GlassCard` (gold variant, hover glow)
- Homepage refactored from 2080-line monolith into 12 files (all <210 lines)

### Phase 3 — About Page UX Overhaul + Competitive Edge Showcase
- Refactored 1,260-line About.V3 into 13 files
- CompetitiveEdge luxury visual cards replace old WhySwanStudios comparison table

### Phase 4 — Swan Coach Full Rebrand (63 files)
- ALL user-facing "AI" strings replaced with "Swan Coach" / "Swan Coach Assistant"
- 214 string replacements across 63 files

### Phase 5 — Canada Immigration Tab Refactor + Privacy Hardening
- 6 files updated in `frontend/src/components/DashBoard/Pages/canada-immigration/`
- 5-phase structure aligned, CRS Calculator defaults, cost dashboard, study hub, privacy hardened

### Phase 6 — Workout Logging Speed Optimization
- 6 new files in `frontend/src/components/WorkoutLogger/`
- Ghost pre-fill, overload suggestions, session stats bar, offline queue, quick log mode

### Phase 7 — Admin Overview KPI Dashboard
- **5 new components** in `frontend/src/components/DashBoard/Pages/admin-dashboard/components/`:
  - `RevenueChart.tsx` — Victory area chart, gold Gilded Fern trend line, MRR/avg header, 30D/90D/1Y range selector
  - `UserGrowthChart.tsx` — Victory dual-line chart (active users + signups), retention rate pills, weekly/monthly stats
  - `SessionTrackingWidget.tsx` — Sessions today/week/month, trainer utilization %, top 5 clients with colored progress bars
  - `RecentActivityFeed.tsx` — Last 10 platform events (signups, workouts, payments, achievements), typed icons, relative timestamps
  - `GamificationSummaryWidget.tsx` — Total XP, achievements this week, active streaks, top 5 leaderboard with ranked XP bars
- **2 enhanced components**:
  - `AdminOverviewMetrics.tsx` — Now uses `AnimatedCounter` + Victory sparkline charts (replaces placeholder text)
  - `AdminOverviewPanel.tsx` — Reorganized bento grid: KPIs at top → revenue/growth charts → business KPI + sessions → 3-col quick actions/activity/gamification. Quick actions updated to 6 real routes
- **Bug fix**: `useSubscription.ts` — Added missing `fetchTiers` to return object, fixing MembershipsSection.tsx crash on Store page

### Phase 8 — Marketing Dashboard
- **Bug fix**: `ClientHeaderCard.tsx:152` — styled-components error #12 fixed (keyframe interpolation inside plain string literal → wrapped with `css` helper)
- **11 new files** in `frontend/src/components/DashBoard/workspaces/marketing/`:
  - `marketing.types.ts` — Shared TypeScript interfaces for all 7 panels
  - `marketing.styles.ts` — Shared styled-components (MarketingCard, StatusChip, CompetitionBadge, etc.)
  - `index.ts` — Barrel exports
  - `SEOAuditPanel.tsx` — Site health donut gauge (Victory), issue categories, issues table with demo data
  - `KeywordResearchWidget.tsx` — Sortable keyword table, category tabs (PT/Golf/Local SEO), Victory sparklines, track/untrack
  - `BlogWriterPanel.tsx` — 3-step wizard (topic→outline→draft), cadence guard (1x/week), draft queue sidebar
  - `SocialPostGenerator.tsx` — Platform selector (IG/FB/X), composer with char counter, hashtag chips, best time card, preview card
  - `EmailDigestBuilder.tsx` — 4 template cards, block editor (heading/paragraph/CTA/testimonial), personalization tokens, cadence guard (2x/month)
  - `MarketingCalendar.tsx` — Week view with channel color coding (blog=cyan, social=purple, email=gold, video=amber), filter chips, week navigation
  - `CompetitorAnalysisWidget.tsx` — 3 competitor cards with social followers/reviews/pricing/keywords, comparison table (SwanStudios vs selected), Victory sparklines
- **1 new workspace container**: `MarketingWorkspace.tsx` — Internal tab state + lazy loading (matches ContentStudioHub pattern, works with flat roleConfigurations routing)
- **3 modified files**:
  - `dashboard-tabs.ts` — Added marketing workspace to WORKSPACE_CONFIG (Megaphone icon)
  - `AdminStellarSidebar.tsx` — Added Megaphone to lucide imports + iconMap
  - `UniversalDashboardLayout.tsx` — Added lazy import + route in roleConfigurations.admin.routes

### Phase 9 — Security Intelligence Panel
- **8 new files** in `frontend/src/components/DashBoard/workspaces/security/`:
  - `security.types.ts` — Shared interfaces (Vulnerability, Dependency, Alert, CVE, Score types + SEVERITY_CONFIG)
  - `security.styles.ts` — Shared styled-components (SecurityCard, SeverityBadge, CVEStatusChip, DepStatusChip, AlertCard, DataTable, MetricRow, ScoreBadge, ActionButton)
  - `index.ts` — Barrel exports
  - `VulnerabilityScannerPanel.tsx` — Victory pie chart (severity breakdown) + Victory area chart (7-day trend), filterable vulnerability table, scan button
  - `DependencyHealthWidget.tsx` — npm audit summary metrics, filterable dependency table (current/outdated/vulnerable), fix suggestion banner
  - `SecurityAlertsFeed.tsx` — Real-time security events (failed logins, SQL injection blocks, rate limits, JWT forgery, config changes), filterable by severity, toggle resolved
  - `CVEWatchList.tsx` — CVE tracker for Node/Express/React/PG/Sequelize stack, CVSS scores, expandable rows, status filters (affected/monitoring/mitigated/patched)
  - `SecurityScoreCard.tsx` — Overall score (0-100) with grade, 6 category breakdown with progress bars, Victory 7-day trend chart
- **1 new workspace container**: `SecurityWorkspace.tsx` — 5-tab container (Vuln Scanner, Dependencies, Alerts Feed, CVE Watch, Score Card) with lazy loading + AnimatePresence
- **3 modified files**:
  - `dashboard-tabs.ts` — Added security workspace to WORKSPACE_CONFIG (ShieldCheck icon)
  - `AdminStellarSidebar.tsx` — Added ShieldCheck to lucide imports + iconMap
  - `UniversalDashboardLayout.tsx` — Added lazy import + `/security` route in roleConfigurations.admin.routes

### Codebase Security Audit Fix Pass (same deploy)
- CORS hardened to allowlisted origins in production (`backend/core/app.mjs`)
- Session requires real secret + Redis in production, fails closed (`backend/config/session.mjs`)
- Storefront XSS sanitized on write+read (`backend/routes/storeFrontRoutes.mjs`)
- `dangerouslySetInnerHTML` removed from `ProductDetail.tsx` + `TeachMeToggle.tsx`
- AI rate limiter ownership shifted to middleware (`backend/middleware/aiRateLimiter.mjs`)
- Privacy aliasing respects preferredAlias (`backend/services/deIdentificationService.mjs`, `backend/controllers/onboardingController.mjs`)
- Auth refresh unified to `/api/auth/refresh-token` (`frontend/src/context/AuthContext.tsx`)
- Trainer access uses `ClientTrainerAssignment` model (`backend/routes/authRoutes.mjs:746`)
- AI consent requires explicit userId for trainer/admin (`backend/controllers/aiConsentController.mjs`)
- `parse_error` standardized to 502 (`backend/controllers/aiWorkoutController.mjs`, `backend/controllers/longHorizonController.mjs`)

**Architecture note:** Live admin routing uses `roleConfigurations` in `UniversalDashboardLayout.tsx` (flat routes), NOT `UnifiedAdminRoutes.tsx`. New workspaces should use internal useState tab switching + lazy loading (see MarketingWorkspace.tsx or SecurityWorkspace.tsx as template).

---

**ALL PHASES:**

| Phase | What | Status |
|-------|------|--------|
| 1 | Dark navy default theme + 4 new themes + Cyberpunk Cyan fix | DONE |
| 2 | Homepage UX overhaul — parallax, scroll animations, glass cards, text reveals, performance-tiered | DONE |
| 3 | About page UX overhaul + competitive edge showcase (luxury visual cards) | DONE |
| 4 | Swan Coach full rebrand — all "AI" strings across 63 files → "Swan Coach" | DONE |
| 5 | Canada Immigration tab — 5-phase alignment, CRS defaults, cost update, privacy hardening | DONE |
| 6 | Workout logging speed optimization — 3-tap quick log, pre-fill, overload prompts, rest timer, stats bar, offline-first | DONE |
| 7 | Admin Overview KPI dashboard — Victory revenue/growth charts, session tracking, activity feed, gamification summary, enhanced metrics | DONE |
| 8 | Marketing Dashboard — SEO audit, keyword research, blog writer, social post generator, email digest, content calendar, competitor analysis | DONE |
| 9 | Security Intelligence Panel — vulnerability scanner, dependency health, alerts feed, CVE watchlist, security score card (all Victory charts) | DONE |
| 10 | Content Studio upgrades — Seedance 2.0 integration, multi-platform social distribution, blog writer tab | **START HERE** |
| 11 | E2EE encryption — Signal Protocol (optional per user), server-side AES-256 default, identity verification | Pending |

---

## PHASE 10 — Content Studio Upgrades

**Goal:** Enhance the existing Content Studio with Seedance 2.0 video AI integration, multi-platform social distribution, and a blog writer tab.

**Key features to build:**

1. **Seedance 2.0 Integration** — Replace Kling 3.0 references with Seedance 2.0 (Higgsfield or laozhang.ai API). Video generation panel for exercise demos, social content, and marketing clips. Cost: $0.05/video via laozhang.ai or $15-34/mo via Higgsfield.

2. **Multi-Platform Social Distribution** — Publish generated content to Instagram, Facebook, X (Twitter) from within Content Studio. Preview cards, scheduling, caption generation with hashtag suggestions.

3. **Blog Writer Tab** — Content Studio tab for long-form blog posts (ties into Marketing Dashboard's BlogWriterPanel but lives inside Content Studio for the content creation flow). SEO-optimized drafts, keyword integration.

**Current Content Studio location:** `frontend/src/components/DashBoard/Pages/content-studio/ContentStudioHub.tsx`

**Key references:**
- Content Studio plan: `docs/ai-workflow/references/` (check for content studio docs)
- Seedance replaces Kling: memory file `project_video_ai_seedance_replacement.md`
- Content cadence: blog 1x/week, email 2x/month MAX, Sean approves before publish
- Two-tier workflow: Bootstrap (free/trial) vs Full Arsenal (paid)

**Key design rules:**
- Default theme: dark navy — Enchanted Apex: Crystalline Swan
- 44px minimum touch targets
- styled-components only, NO Material-UI
- `var(--token, #fallback)` pattern for all colors
- Max 300 lines per file — extract to sub-components
- Victory only for charts (no Recharts)
- prefers-reduced-motion MUST be respected

**Architecture note:** Live admin routing uses `roleConfigurations` in `UniversalDashboardLayout.tsx` (flat routes), NOT `UnifiedAdminRoutes.tsx`. Content Studio already exists at `/content` route. Extend it with new tabs inside the existing ContentStudioHub pattern.

**DO NOT run the AI Village without asking me first.** Use Opus internal planning (free) for most decisions.

Start building Phase 10 — Content Studio Upgrades.

---
