# Next Session Prompt — Copy/Paste This to Start

---

## PROMPT:

Continue building SwanStudios. Phases 1-6 are COMPLETE and deployed. We are starting Phase 7 of 11. Everything is committed, pushed, and live on Render.

**What was already built and deployed (Phases 1-6):**

### Phase 1 — Dark Navy Default Theme + 4 New Themes
- 18 themes (dark navy = crystalline-dark default confirmed)
- Cyberpunk Cyan accent fix
- Kling→Seedance 2.0, AI→Swan Coach rebrand started

### Phase 2 — Homepage UX Overhaul
- `useAnimationTier` hook at `frontend/src/hooks/useAnimationTier.ts` — 3-tier device detection (full 8+ cores / balanced 4-7 / essential <4 or prefers-reduced-motion)
- `useTierFlags()` helper returns booleans: showParallax, showBlur, showCharSplit, showStagger, etc.
- 5 reusable animation components in `frontend/src/components/ui/animations/`:
  - `ScrollProgress` — gradient progress bar fixed at viewport top
  - `AnimatedCounter` — numbers count up on scroll into view
  - `TextSplitter` — char/word stagger animation (use mode="words" for headings)
  - `SectionTransition` — aurora gradient dividers between sections
  - Barrel export in `index.ts`
- Enhanced `ScrollReveal` at `frontend/src/components/ui-kit/cinematic/ScrollReveal.tsx`
- Enhanced `GlassCard` at `frontend/src/components/ui-kit/glass/GlassCard.tsx` — gold variant, cross-pollinated hover glow
- Homepage refactored from 2080-line monolith into 12 files (all <210 lines):
  - Orchestrator: `frontend/src/pages/HomePage/components/HomePage.V4.tsx`
  - 11 sections in `frontend/src/pages/HomePage/components/sections/`
  - Shared data/styles/animations in `frontend/src/pages/HomePage/components/shared/`

### Phase 3 — About Page UX Overhaul + Competitive Edge Showcase
- Refactored 1,260-line About.V3 into 13 files:
  - Orchestrator: `frontend/src/pages/about/About.V4.tsx` (87 lines)
  - 9 section components in `frontend/src/pages/about/components/sections/`
  - 3 shared modules in `frontend/src/pages/about/components/shared/`
- CompetitiveEdge luxury visual cards replace old WhySwanStudios comparison table
- Route updated: V4 active, V3 as fallback

### Phase 4 — Swan Coach Full Rebrand (63 files)
- ALL user-facing "AI" strings replaced with "Swan Coach" / "Swan Coach Assistant"
- 214 string replacements across 63 files
- Variable names, imports, type definitions left unchanged
- Canada immigration cert names (IBM AI, Azure AI-102) left unchanged

### Phase 5 — Canada Immigration Tab Refactor + Privacy Hardening
- 6 files updated in `frontend/src/components/DashBoard/Pages/canada-immigration/`
- 5-phase structure aligned across Dashboard, Checklist, Timeline
- CRS Calculator: Spouse B as principal applicant (DEFAULT)
- Cost dashboard: $4-5.5K pre-move budget
- Study Hub: French 12-month plan, study progression aligned
- Privacy hardened: ALL personal names removed from source code

### Phase 6 — Workout Logging Speed Optimization
- **6 new files** in `frontend/src/components/WorkoutLogger/`:
  - `useGhostPreFill.ts` — Fetches & caches previous workout data; `createPreFilledSet()` auto-populates weight/reps/tempo/rest from client's last session
  - `OverloadSuggestion.tsx` — Tappable cyan pill: "+2.5 lbs" (isolation) or "+5 lbs" (compound movements); tap to apply
  - `useSessionStats.ts` — Memoized live stats: total volume, completed sets, estimated calories
  - `SessionStatsBar.tsx` — Sticky bar: `Volume: 12,450 lbs | Sets: 18/24 | ~185 cal`
  - `useOfflineQueue.ts` — localStorage queue, online/offline detection, auto-flush on reconnect
  - `QuickLogMode.tsx` — 3-tap streamlined view: exercise nav arrows, big weight/reps inputs, "Log Set" button, set dot progress
- **2 modified files:**
  - `ExerciseCardComponent.tsx` — Added `getOverload` + `onSetLogged` props, overload pill next to weight input
  - `WorkoutLogger.tsx` — Quick Log/Full Mode toggle, SessionStatsBar, offline queue in submit flow, pre-fill on addExercise/addSet, auto-start rest timer on set log, offline badge, rest timer badge

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
| 7 | Admin Overview KPI dashboard — revenue charts, user growth, server health widget, quick actions | **START HERE** |
| 8 | Marketing Dashboard — SEO audit, keyword research, blog writer, social post generator, email digest, content calendar | Pending |
| 9 | Security Intelligence Panel — 6 free CVE APIs, daily scanning, admin alerts, npm audit | Pending |
| 10 | Content Studio upgrades — Seedance 2.0 integration, multi-platform social distribution, blog writer tab | Pending |
| 11 | E2EE encryption — Signal Protocol (optional per user), server-side AES-256 default, identity verification | Pending |

---

## PHASE 7 — Admin Overview KPI Dashboard

**Goal:** Give Sean a single-glance admin overview showing key business metrics, platform health, and quick actions. This is the admin's "home base" — the first thing they see when opening the dashboard.

**Key features to build:**
1. **Revenue overview** — Total revenue, MRR, session packages sold, active subscriptions (Victory charts)
2. **User growth** — New signups this week/month, active users, retention rate (Victory line/area chart)
3. **Server health widget** — Render service status, response times, error rates, uptime badge
4. **Session tracking** — Sessions logged today/this week, top clients by activity, trainer utilization
5. **Quick actions panel** — Add client, log workout, send email blast, view reports (4-6 action cards)
6. **Recent activity feed** — Last 10 actions across the platform (new signups, workouts logged, payments)
7. **Gamification summary** — Total XP awarded, achievements unlocked this week, leaderboard snapshot

**Current admin dashboard location:** Check `frontend/src/components/DashBoard/` for existing admin pages and layout.

**Reusable components available:**
- `useAnimationTier` + `useTierFlags` from `frontend/src/hooks/useAnimationTier`
- `GlassCard` from `frontend/src/components/ui-kit/glass/GlassCard`
- `AnimatedCounter` from `frontend/src/components/ui/animations/AnimatedCounter`
- `SessionStatsBar` pattern from Phase 6 (sticky stats bar)

**Key design rules:**
- Default theme: dark navy — Enchanted Apex: Crystalline Swan
- 44px minimum touch targets
- styled-components only, NO Material-UI
- `var(--token, #fallback)` pattern for all colors
- Max 300 lines per file
- Victory only for charts (no Recharts)
- prefers-reduced-motion MUST be respected

**DO NOT run the AI Village without asking me first.** Use Opus internal planning (free) for most decisions.

Start building Phase 7 — Admin Overview KPI Dashboard.

---
