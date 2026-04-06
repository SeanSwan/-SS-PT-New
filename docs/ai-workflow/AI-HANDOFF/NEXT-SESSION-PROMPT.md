# Next Session Prompt — Copy/Paste This to Start

---

## PROMPT:

Continue building SwanStudios. Phases 1-5 are COMPLETE and deployed. We are starting Phase 6 of 11. Everything is committed, pushed, and live on Render.

**What was already built and deployed (Phases 1-5):**

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
  - 9 section components in `frontend/src/pages/about/components/sections/`:
    - HeroSection, FounderQuoteSection, AboutSeanSection, PromiseSection
    - StatsSection, TimelineSection, PhilosophySection, CompetitiveEdgeSection, CTASection
  - 3 shared modules in `frontend/src/pages/about/components/shared/`
- CompetitiveEdge luxury visual cards replace old WhySwanStudios comparison table:
  - 6 glass morphism cards in 2-column grid with cross-pollinated glow orbs (cyan/purple/gold)
  - Gold subtitle labels, stagger reveal on scroll, tier-aware
- Route updated: V4 active, V3 as fallback

### Phase 4 — Swan Coach Full Rebrand (63 files)
- ALL user-facing "AI" strings replaced with "Swan Coach" / "Swan Coach Assistant"
- 214 string replacements across 63 files:
  - AI Assistant → Swan Coach Assistant (drawer, FAB, context selector)
  - AI Dashboard/Monitoring → Swan Coach Dashboard/Monitoring
  - AI Consent → Swan Coach Consent (client + admin screens)
  - AI Generate/Copilot → Swan Coach Generate/Copilot
  - AI Coach → Swan Coach (clients workspace, trainer sections)
  - AI Insights/Reasoning → Swan Coach Insights/Reasoning
  - Config/pricing tabs, Homepage meta, Social/Content Studio
- Variable names, imports, type definitions left unchanged
- Canada immigration cert names (IBM AI, Azure AI-102) left unchanged

### Phase 5 — Canada Immigration Tab Refactor + Privacy Hardening
- 6 files updated in `frontend/src/components/DashBoard/Pages/canada-immigration/`
- 5-phase structure aligned across Dashboard, Checklist, Timeline:
  - Phase 0: Immediate Actions (This Week)
  - Phase 1: Foundation (Months 1-3)
  - Phase 2: Applications (Months 4-6)
  - Phase 3: Transition (Months 7-12)
  - Phase 4: Permanent Residency (Months 13-24)
- CRS Calculator: Spouse B as principal applicant (DEFAULT)
- Cost dashboard: $4-5.5K pre-move budget
- Study Hub: French 12-month plan, study progression aligned
- Privacy hardened: ALL personal names removed from source code
  - "Sean" → "Spouse A", "Wife" → "Spouse B", "Kids" → "Children", "Grandma" → "Elder"
  - Zero PII in committed code (verified with grep sweep)

---

**ALL PHASES:**

| Phase | What | Status |
|-------|------|--------|
| 1 | Dark navy default theme + 4 new themes + Cyberpunk Cyan fix | DONE |
| 2 | Homepage UX overhaul — parallax, scroll animations, glass cards, text reveals, performance-tiered | DONE |
| 3 | About page UX overhaul + competitive edge showcase (luxury visual cards) | DONE |
| 4 | Swan Coach full rebrand — all "AI" strings across 63 files → "Swan Coach" | DONE |
| 5 | Canada Immigration tab — 5-phase alignment, CRS defaults, cost update, privacy hardening | DONE |
| 6 | Workout logging speed optimization — 3-tap logging, previous values pre-fill, progressive overload prompts, rest timer | **START HERE** |
| 7 | Admin Overview KPI dashboard — revenue charts, user growth, server health widget, quick actions | Pending |
| 8 | Marketing Dashboard — SEO audit, keyword research, blog writer, social post generator, email digest, content calendar | Pending |
| 9 | Security Intelligence Panel — 6 free CVE APIs, daily scanning, admin alerts, npm audit | Pending |
| 10 | Content Studio upgrades — Seedance 2.0 integration, multi-platform social distribution, blog writer tab | Pending |
| 11 | E2EE encryption — Signal Protocol (optional per user), server-side AES-256 default, identity verification | Pending |

---

## PHASE 6 — Workout Logging Speed Optimization

**Goal:** Make workout logging fast enough for real gym use. Current WorkoutLogger is functional but slow for live sessions. Target: log a set in under 3 taps.

**Key features to build:**
1. **3-tap set logging** — tap exercise → tap weight/reps (pre-filled from last session) → tap "Log"
2. **Previous values pre-fill** — auto-populate weight, reps, tempo from client's last logged session for that exercise
3. **Progressive overload prompts** — subtle "+2.5 lbs" or "+1 rep" suggestion based on last session
4. **Rest timer** — auto-start countdown after logging a set (configurable per exercise, default 60-90s)
5. **Quick-add exercises** — search/filter from the 900+ exercise library, add to current session
6. **Session summary** — total volume, estimated calories, PR badges earned
7. **Offline-first** — queue sets in localStorage if connection drops, sync when back online

**Current WorkoutLogger location:** `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx`

**Reusable components available:**
- `useAnimationTier` + `useTierFlags` from `frontend/src/hooks/useAnimationTier`
- `GlassCard` from `frontend/src/components/ui-kit/glass/GlassCard`
- `AnimatedCounter` from `frontend/src/components/ui/animations/AnimatedCounter`

**Key design rules:**
- Default theme: dark navy — Enchanted Apex: Crystalline Swan
- 44px minimum touch targets (gym use = sweaty fingers)
- styled-components only, NO Material-UI
- `var(--token, #fallback)` pattern for all colors
- Max 300 lines per file
- prefers-reduced-motion MUST be respected

**DO NOT run the AI Village without asking me first.** Use Opus internal planning (free) for most decisions.

Start building Phase 6 — Workout logging speed optimization.

---
