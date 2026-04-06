# Next Session Prompt — Copy/Paste This to Start

---

## PROMPT:

Continue building SwanStudios. Phase 2 (Homepage UX overhaul) is COMPLETE and deployed. We are starting Phase 3 of 11. Everything is committed, pushed, and live on Render.

**What was already built and deployed (Phases 1-2):**
- Subscription tier system (Swan Starter FREE, Swan Guardian DONATION, Crystalline Swan $24.99/mo)
- /ascension page, Store memberships, PaywallContext + 402 interceptor, feature gating
- 18 themes (dark navy default confirmed), Kling→Seedance 2.0, AI→Swan Coach rebrand started
- R2 video migration, modelSelector for tier-based Gemini routing, anomaly detection (no AI caps)
- GenerationWizard 4-step confirmation flow, admin AI usage + health endpoints

**Phase 2 completed (Homepage UX overhaul) — what was built:**
- `useAnimationTier` hook at `frontend/src/hooks/useAnimationTier.ts` — 3-tier device detection (full 8+ cores / balanced 4-7 / essential <4 or prefers-reduced-motion)
- `useTierFlags()` helper returns booleans: showParallax, showBlur, showCharSplit, showStagger, etc.
- 5 reusable animation components in `frontend/src/components/ui/animations/`:
  - `ScrollProgress` — gradient progress bar fixed at viewport top
  - `AnimatedCounter` — numbers count up on scroll into view, skipAnimation prop for essential tier
  - `TextSplitter` — char/word stagger animation (use mode="words" for headings to prevent mid-word breaks)
  - `SectionTransition` — aurora gradient dividers between sections (animate + showGlow props)
  - Barrel export in `index.ts`
- Enhanced `ScrollReveal` at `frontend/src/components/ui-kit/cinematic/ScrollReveal.tsx` — added blur, scale, cinematic easing, disabled prop for essential tier
- Enhanced `GlassCard` at `frontend/src/components/ui-kit/glass/GlassCard.tsx` — added gold variant, cross-pollinated hover glow (blue→purple, purple→cyan), disableBlur prop for budget devices
- Homepage refactored from 2080-line monolith into 12 files (all <210 lines):
  - Orchestrator: `frontend/src/pages/HomePage/components/HomePage.V4.tsx` (109 lines)
  - 11 section components in `frontend/src/pages/HomePage/components/sections/`
  - Shared data/styles/animations in `frontend/src/pages/HomePage/components/shared/`
- All sections have parallax backgrounds, glass cards, stagger reveals, aurora dividers
- Visually QA'd — all 11 sections rendering correctly

**ALL PHASES:**

| Phase | What | Status |
|-------|------|--------|
| 1 | Dark navy default theme + 4 new themes + Cyberpunk Cyan fix | DONE |
| 2 | Homepage UX overhaul — parallax, scroll animations, glass cards, text reveals, performance-tiered (3 tiers by device) | DONE |
| 3 | About page UX overhaul + competitive edge showcase (NOT a table — luxury brand visual cards) | **START HERE** |
| 4 | Swan Coach full rebrand — remaining "AI" strings across all files → "Swan Coach" / "SwanStudios Coach Assistant" | Pending |
| 5 | Canada Immigration tab — fix broken logic, add IELTS tracker, document tracker, points calculator, Swan Coach study mode | Pending |
| 6 | Workout logging speed optimization — 3-tap logging, previous values pre-fill, progressive overload prompts, rest timer | Pending |
| 7 | Admin Overview KPI dashboard — revenue charts, user growth, server health widget, quick actions | Pending |
| 8 | Marketing Dashboard — SEO audit, keyword research, blog writer, social post generator, email digest, content calendar | Pending |
| 9 | Security Intelligence Panel — 6 free CVE APIs, daily scanning, admin alerts, npm audit | Pending |
| 10 | Content Studio upgrades — Seedance 2.0 integration, multi-platform social distribution (Late.dev/$19mo or direct APIs), blog writer tab | Pending |
| 11 | E2EE encryption — Signal Protocol (optional per user), server-side AES-256 default, identity verification for recovery | Pending |

---

## PHASE 3 — About Page UX Overhaul + Competitive Edge Showcase

**Current About page state (already analyzed):**
- Active file: `frontend/src/pages/about/About.V3.tsx` (1,260 lines — needs refactoring like homepage)
- Route: `/about` with lazy loading (falls back to About.V2 on error)
- Also imports: `frontend/src/components/WhySwanStudios/WhySwanStudios.tsx` (477 lines — current competitive edge comparison table)

**About.V3 has 8 sections (in render order):**
1. **Hero** (lines 929-959) — ParallaxHero with video bg, logo, "Achieve Your Best Self" headline, two CTAs
2. **Founder Quote** (lines 964-998) — Gold-bordered glass card with Sean quote + gold signature
3. **About Sean** (lines 1003-1080) — Two-column bio (4 paragraphs + feature list) + floating logo + certification badges grid (8 certs)
4. **The SwanStudios Promise** (lines 1084-1121) — 3 gold-bordered cards (Fair Always, Your Data, Community Over Profit)
5. **Stats** (lines 1125-1152) — 4 animated counters (26+ years, 1000+ clients, 97% satisfaction, 312 swimmers)
6. **Timeline** (lines 1156-1187) — 8 milestones (2000-2024) alternating left/right
7. **Philosophy** (lines 1191-1214) — 4 pillar cards (Science-Backed, Personalized, Sustainable, Collective Power)
8. **WhySwanStudios** (line 1219) — External component, comparison grid (THIS NEEDS REPLACING with luxury visual cards)
9. **CTA** (lines 1223-1254) — "Ready to Transform?" with two buttons

**About page data arrays (already extracted from reading):**
- `certifications` — 8 items (NCEP, NASM, Gold's, 24Hr, LA Fitness, Redwood, MIT, ZTM)
- `statsData` — 4 items (years, clients, satisfaction, swimmers)
- `featureList` — 4 items (biomechanical, NASM OPT, AI-enhanced, nutrition)
- `milestones` — 8 items (2000-2024 career timeline)
- `philosophies` — 4 items with icons (Brain, Target, Shield, Heart)

**About page styled components (lines 177-888):**
- PageWrapper, MainContent, NoiseOverlay
- Hero: HeroLogo, HeroHeadline, HeroSubtitle, HeroButtons
- Section shells: Section ($alt variant), SectionInner, SectionTitle, AccentLine, SectionSubtitle
- About: AboutGrid, AboutText, AboutImageWrapper, AboutImage, FeatureList, FeatureItem
- Badges: BadgesGrid, BadgeCard, BadgeName, BadgeFull
- Stats: StatsGrid, StatCard, StatNumber, StatLabel, AnimatedStatCard
- Timeline: TimelineWrapper, TimelineItem, TimelineCard, TimelineYear, TimelineDescription
- Philosophy: PhilosophyGrid, PhilosophyCard, PhilosophyIconWrapper, PhilosophyTitle, PhilosophyBody
- CTA: CTABlock, CTAHeading, CTADescription, CTAButtons

**What Phase 3 requires:**
1. Refactor About.V3.tsx into section components (same pattern as homepage — max 300 lines each)
2. Apply `useAnimationTier` to all sections (reuse the existing hook + components from Phase 2)
3. Replace the WhySwanStudios comparison table with a luxury competitive edge showcase:
   - Visual cards with icons, NOT a side-by-side comparison table
   - Each card highlights ONE differentiator (e.g., "NASM-Trained AI", "Your Data Forever", "Real Trainers")
   - Glass morphism cards with the Crystalline Swan theme
   - Animated entrance with stagger on scroll
   - Should feel like Apple/Rolex — premium, not a feature checklist
4. Apply `SectionTransition` aurora dividers between all sections
5. Apply `ScrollProgress` (already global from homepage, may already work)
6. Test locally and visually QA

**Reusable components already built (from Phase 2 — just import them):**
- `useAnimationTier` + `useTierFlags` from `../../hooks/useAnimationTier`
- `ScrollReveal` from `../../components/ui-kit/cinematic/ScrollReveal` (blur, scale, disabled props)
- `GlassCard` from `../../components/ui-kit/glass/GlassCard` (variants: cyan, purple, gold, neutral, alert; disableBlur prop)
- `AnimatedCounter` from `../../components/ui/animations/AnimatedCounter` (skipAnimation prop)
- `TextSplitter` from `../../components/ui/animations/TextSplitter` (mode="words" for headings)
- `SectionTransition` from `../../components/ui/animations/SectionTransition` (animate, showGlow props)

**Key design rules (same as all phases):**
- Default theme: dark navy — Enchanted Apex: Crystalline Swan
- 3 animation tiers: Full (8+ cores), Balanced (4-7), Essential (<4 or prefers-reduced-motion)
- Budget phones see NO animations — clean, fast, professional. Never janky 15fps
- All "AI" user-facing text should say "Swan Coach" or "SwanStudios Coach Assistant"
- prefers-reduced-motion MUST be respected
- 44px minimum touch targets on all interactive elements
- styled-components only, NO Material-UI
- `var(--token, #fallback)` pattern for all colors
- Max 300 lines per file

**Blueprints:**
- `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-UX-OVERHAUL-PLAN.md` — has About page section-by-section upgrade plan (sections 1-6 of About page)
- `docs/ai-workflow/blueprints/ULTIMATE-7-STAR-VALIDATION.md` — competitive edge table data (section 12)

**DO NOT run the AI Village without asking me first.** Use Opus internal planning (free) or Gemini CTO consultation (cheap) for most decisions. Village is for CRITICAL decisions only (~$0.33/run).

Start building Phase 3 — About page UX overhaul + competitive edge showcase.

---
