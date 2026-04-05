# Next Session Prompt — Copy/Paste This to Start

---

## PROMPT:

Continue building SwanStudios. We completed a massive planning + building session. Everything is committed, pushed, and deployed. Memory files and blueprints are indexed in MEMORY.md and CLAUDE.md.

**What was already built and deployed:**
- Subscription tier system (Swan Starter FREE, Swan Guardian DONATION, Crystalline Swan $24.99/mo)
- /ascension page, Store memberships, PaywallContext + 402 interceptor, feature gating
- 18 themes (dark navy default confirmed), Kling→Seedance 2.0, AI→Swan Coach rebrand started
- R2 video migration, modelSelector for tier-based Gemini routing, anomaly detection (no AI caps)
- GenerationWizard 4-step confirmation flow, admin AI usage + health endpoints

**We are now on Phase 2 of 11. Here are ALL phases:**

| Phase | What | Status |
|-------|------|--------|
| 1 | Dark navy default theme + 4 new themes + Cyberpunk Cyan fix | DONE |
| 2 | Homepage UX overhaul — parallax, scroll animations, glass cards, text reveals, performance-tiered (3 tiers by device) | **START HERE** |
| 3 | About page UX overhaul + competitive edge showcase (NOT a table — luxury brand visual cards) | Pending |
| 4 | Swan Coach full rebrand — remaining "AI" strings across all files → "Swan Coach" / "SwanStudios Coach Assistant" | Pending |
| 5 | Canada Immigration tab — fix broken logic, add IELTS tracker, document tracker, points calculator, Swan Coach study mode | Pending |
| 6 | Workout logging speed optimization — 3-tap logging, previous values pre-fill, progressive overload prompts, rest timer | Pending |
| 7 | Admin Overview KPI dashboard — revenue charts, user growth, server health widget, quick actions | Pending |
| 8 | Marketing Dashboard — SEO audit, keyword research, blog writer, social post generator, email digest, content calendar | Pending |
| 9 | Security Intelligence Panel — 6 free CVE APIs, daily scanning, admin alerts, npm audit | Pending |
| 10 | Content Studio upgrades — Seedance 2.0 integration, multi-platform social distribution (Late.dev/$19mo or direct APIs), blog writer tab | Pending |
| 11 | E2EE encryption — Signal Protocol (optional per user), server-side AES-256 default, identity verification for recovery | Pending |

**For Phase 2, the blueprints are:**
- `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-UX-OVERHAUL-PLAN.md` — full design spec with animation tokens, performance tiers, section-by-section upgrade plan
- `docs/ai-workflow/blueprints/ULTIMATE-7-STAR-VALIDATION.md` — Village-validated comprehensive plan

**Phase 2 requires building these reusable components first:**
1. `useAnimationTier` hook — detects device capability (full/balanced/essential)
2. `ScrollReveal` component — scroll-triggered fade/slide/scale reveals
3. `GlassCard` component — glass morphism cards with hover effects
4. `ParallaxLayer` component — background layers with scroll-linked movement
5. `AnimatedCounter` component — numbers that count up when scrolled into view
6. `TextSplitter` component — split text into chars/words with stagger animation
7. `SectionTransition` component — crystalline dividers with aurora gradients
8. `ScrollProgress` component — thin progress bar at top of page

Then upgrade all 12 homepage sections with these components. The homepage has: Hero, Mission, Trainers Platform, The Arsenal, Training Programs, Golf Performance, About Sean, Client Success Stories, By the Numbers, Beyond the Gym, Final CTA, Footer.

**Key design rules:**
- Default theme: dark navy #0D1117 (Sean confirmed from Global Visitor Intelligence widget)
- 3 animation tiers: Full (8+ cores), Balanced (4-7), Essential (<4 or prefers-reduced-motion)
- Budget phones see NO animations — clean, fast, professional. Never janky 15fps
- Desktop gets FULL effects — parallax, particles, glass blur, character animations
- All "AI" user-facing text should say "Swan Coach" or "SwanStudios Coach Assistant"
- Competitive edge section needs beautiful showcase (NOT a table)
- prefers-reduced-motion MUST be respected
- 44px minimum touch targets on all interactive elements
- framer-motion for animations (already in project), CSS scroll-driven for parallax
- Follow Recursive Planning Protocol: plan before building, verify after

**DO NOT run the AI Village without asking me first.** Use Opus internal planning (free) or Gemini CTO consultation (cheap) for most decisions. Village is for CRITICAL decisions only (~$0.33/run).

Start building Phase 2.

---
