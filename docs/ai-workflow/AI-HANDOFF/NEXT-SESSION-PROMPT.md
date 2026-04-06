# Next Session Prompt — Copy/Paste This to Start

---

## PROMPT:

Continue building SwanStudios. Phases 1-7 are COMPLETE and deployed. We are starting Phase 8 of 11. Everything is committed, pushed, and live on Render.

**IMPORTANT:** The full phase tracker with all 11 phases, file paths, and status is in this file:
`docs/ai-workflow/AI-HANDOFF/NEXT-SESSION-PROMPT.md`

Read that file first to get full context before starting work.

**What was already built and deployed (Phases 1-7):**

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
| 8 | Marketing Dashboard — SEO audit, keyword research, blog writer, social post generator, email digest, content calendar | **START HERE** |
| 9 | Security Intelligence Panel — 6 free CVE APIs, daily scanning, admin alerts, npm audit | Pending |
| 10 | Content Studio upgrades — Seedance 2.0 integration, multi-platform social distribution, blog writer tab | Pending |
| 11 | E2EE encryption — Signal Protocol (optional per user), server-side AES-256 default, identity verification | Pending |

---

## PHASE 8 — Marketing Dashboard

**Goal:** Give Sean a PhD-level AI marketing assistant inside the admin dashboard. This is a full marketing command center — SEO, content creation, social media management, email campaigns, competitor analysis, and a content calendar. All in one place.

**Key features to build:**

1. **SEO Audit Panel** — Site health score, meta tag analysis, keyword density, page speed insights, crawl issues. Pull data from existing site analysis or use Lighthouse-style checks.

2. **Keyword Research Widget** — Target keyword suggestions for personal training, golf fitness, local SEO terms. Show search volume estimates, competition level, and recommended content topics.

3. **Blog Writer Tab** — AI-assisted blog post generator using Swan Coach. Topic suggestions, outline builder, draft generator. Posts saved to admin draft queue for Sean's approval before publishing.

4. **Social Post Generator** — Create social media posts (Instagram, Facebook, X/Twitter) with Swan Coach branding. Template library, hashtag suggestions, optimal posting time recommendations. Preview cards for each platform.

5. **Email Digest Builder** — Compose client newsletters and email blasts. Template system, personalization tokens (client name, recent achievements). Respects content cadence rule: max 2x/month emails, 1x/week blog. Sean approves before sending.

6. **Content Calendar** — Visual calendar showing planned/published content across all channels (blog, social, email). Drag-and-drop scheduling. Status tracking (draft, scheduled, published, archived).

7. **Competitor Analysis Widget** — Track 3-5 local competitors. Compare social following, review ratings, keyword rankings, pricing tiers.

**Current admin dashboard location:** `frontend/src/components/DashBoard/Pages/admin-dashboard/`
**Existing marketing memory:** See `memory/project_marketing_dashboard_vision.md` and `memory/project_marketing_seo_research.md`

**Key design rules:**
- Default theme: dark navy — Enchanted Apex: Crystalline Swan
- 44px minimum touch targets
- styled-components only, NO Material-UI
- `var(--token, #fallback)` pattern for all colors
- Max 300 lines per file — extract to sub-components
- Victory only for charts (no Recharts)
- prefers-reduced-motion MUST be respected
- Content cadence: blog 1x/week, email 2x/month MAX. Sean approves before publish.

**DO NOT run the AI Village without asking me first.** Use Opus internal planning (free) for most decisions.

Start building Phase 8 — Marketing Dashboard.

---
