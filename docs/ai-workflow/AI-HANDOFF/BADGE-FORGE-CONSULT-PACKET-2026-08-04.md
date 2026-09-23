---
decision: consult packet — Badge Forge (badge creator + gamification icon overhaul)
status: open
supersedes: none
---

# BADGE FORGE — Consult Packet (2026-08-04)

Audited ground truth: origin/main @ `fa7b96fbc` (read-only worktree). All file:line refs verified this session.
Reviewers: Kimi K3 + HY3 (UI/UX + creator gaps), Sol GPT-5.6 (backend/logic). Fable 5 is Final Decider and synthesizes.

## 1. Product context (SwanStudios)

Production PT SaaS (React 18 + styled-components / Express + Sequelize + PostgreSQL on Render; Cloudflare R2 for media). Theme: "Enchanted Apex: Crystalline Swan" — dark-first luxury (Midnight Sapphire `#002060`, Ice Wing `#60C0F0`, Gilded Fern gold `#C6A84B`, Wing Purple `#8B5CF6`, Obsidian `#0A0A0F`). Rarity ladder: Common=Swan Lavender, Rare=Gilded Fern, Epic=Wing Purple, Legendary=animated gradient. Core loop: log workout → progress proof → next action → shareable milestones. Badges are the shareable-milestone currency, so their art quality is a retention/brand surface, not decoration.

Owner's ask: replace all "ugly basic normal icons" with Swan-brand badge art; upgrade the admin Badge Creator to an enterprise-grade AI studio (multi-model image gen via OpenRouter Unified Image API — Nano Banana 2 / GPT Image 1.5 / Seedream 4.5; Seedance 2.5 video slot when its API opens ~Aug 7); fix broken batch creation in Content Studio; let admin create badge + challenge + award together; verify badge display across user/client/trainer/admin dashboards.

## 2. Verified current state (the facts to design against)

### A. Two competing creator surfaces
- CANONICAL: `/dashboard/admin/badge-creator` → `frontend/src/components/BadgeCreator/` (5 tabs: generate / upload / gallery / batch / marketplace; 15 endpoints under `/api/admin/badge-creator/*`, `badgeCreatorRoutes.mjs` 896 lines, DB-backed `Badges` table, real 5-way batch fan-out via `Promise.allSettled`).
- LEGACY-BUT-LIVE: Content Studio tab "Badge Assets" → `NanoBananaBadgeCreator.tsx` (706 lines) → `/api/content-studio/generate-badge|save-badge`. Broken three ways: hardcoded retired model `gemini-2.0-flash-exp` (no image output → 502s); no batch loop (single call vs 3-preview UI); "save" writes a JSON manifest to a nonexistent ephemeral backend path and reports false success. This is the "batch creation not working" the owner sees.

### B. Root cause of "ugly icons": missing art, not missing code
- `.gitignore:70` excludes `frontend/public/badges/`; the manifest promises 726 achievement PNGs (242 templates × 3 styles) that do not exist in any deploy. Resolver returns null → every surface falls back to lucide `<Award/>`/`<Trophy/>`, raw emoji, or literal strings ("Badge", "Trophy") in a circle.
- `Achievements.iconUrl` column exists and admin create/update APIs accept it — nothing ever sets it. `Badges.imageUrl` exists and IS set by the generator.
- Generator storage: R2-first (`badges/generated/{user}/{YYYY-MM}/`) but requires undeclared env `R2_PUBLIC_URL`; else silently falls back to Render ephemeral disk (art lost on redeploy).

### C. Generation pipeline (exists; single-provider)
- `geminiBadgeImageService.mjs` (278 lines): Gemini `gemini-3.1-flash-image` default, structured error codes, health check, brand-aesthetic prompt builder, png/jpeg/webp. Suspect: uses API base `v1` while every other Gemini caller in repo uses `v1beta` — likely silent provider failure. Hard-gated 424 if no `GEMINI_API_KEY` on Render. Global quota 50 generations/month (durable count).
- Provider-adapter framework already exists (`services/ai/providerRouter.mjs`: ordered chain + circuit breaker + timeout) with adapters for OpenAI (supports `OPENAI_BASE_URL` override → OpenRouter hook), Gemini, Anthropic, Venice; `OPENROUTER_API_KEY` already in secret-redaction list. `recraftService.mjs` is a complete, dead (zero importers) second image provider.
- 20 named art styles with promptPrefix/promptSuffix pairs already ship in `frontend/public/badge-manifest.json` — ready style catalog.

### D. Award/data layer gaps
- AI-created badges are UNEARNABLE: save path hardcodes `criteriaType: 'custom_criteria'`; no evaluator branch satisfies it; `badgeService.mjs:838` refuses empty criteria. Generated badges are decoration unless admin-assigned manually.
- `Badge` model not registered in models index (dynamic imports everywhere); `UserBadges` has NO Sequelize model (raw SQL only).
- Canonical `challenges` table (uuid, lowercase) has NO image column; the PascalCase `Challenges` twin that has one is legacy/dead — do not build on it.
- Idempotency: `PointTransactions.idempotencyKey` partial unique index; established key formats (`badge:${userId}:${badgeId}`, `achievement:${userId}:${achievementId}` etc.). Award pipeline is post-commit, best-effort, never blocks core writes. Badge reward points capped 500.
- Achievement award path separate from badge path; `iconEmoji` (default 🏆) + `iconUrl` both on `Achievements`.
- New migrations MUST be `.cjs` (test-enforced; `.mjs` migrations were silently ignored for months).

### E. Display layer (the redesign problem)
- NO shared BadgeCard/RarityBadge component. SIX independent rarity color tables (legendary is gold in one, cyan in another, missing entirely in a third → falls to common color). Two additional tier systems (bronze/silver/gold/platinum Swan tiers; RPG bronze_forge…crystalline_swan) visually conflated with rarity.
- Of ~12 mounted badge surfaces, only 3 can render an `<img>`: admin AchievementManagerCard (manifest), admin BadgeGallery/Marketplace (DB imageUrl, legendary gets AnimatedBadge shimmer in gallery but NOT marketplace), user HomeTab right-rail chips (positional colors, not rarity). Everything else: lucide icons (every badge same `Shield`), emoji, or text.
- Best badge renderer in repo (`trainer-gamification/AchievementGrid.tsx`, manifest-image + tier cards) is in a DORMANT unmounted folder.
- `achievement_unlocked` socket event only fires a toast — no badge-reveal celebration overlay anywhere.
- Canonical hook `useGamificationData` → `/api/v1/gamification/*` with fallbacks; admin overview widget still hits legacy `/api/gamification/leaderboard`; social profile has its own `/api/profile/:userId/badges`.

### F. External landscape (Aug 2026, verified)
- OpenRouter Unified Image API (June 2026): 30+ image models, 8 providers, one endpoint, per-model capability discovery. Nano Banana 2 = Gemini 3.1 Flash Image (1K/2K/4K, up to 10 reference images — ideal for style-consistent series + iterative edits, cheap). GPT Image 1.5 = quality leader (~$0.04/img). Seedream 4.5 = third option. Seedance 2.5 (video) released 2026-07-31; provider APIs opening ~Aug 7 — 30s single-shot, 50 multimodal refs.
- Mobbin references: Opal gemstone collectibles ("Owned by 23%" scarcity), Ladder/Life Reset dark metallic shield sets with locked states, Strava trophy case, Duolingo progress-to-unlock; creator studios: Artlist AI Toolkit (dark, Nano Banana 2 model picker, image-reference chips, session history), FLORA node canvas, Gamma (auto-select model + style presets + N-card batch), Adobe Express (style presets + reference images).

## 3. Proposed direction (pressure-test this)

1. ONE creator: harden the canonical Badge Forge; retire the Content Studio nano-banana tab to a redirect into it.
2. Multi-model rail: new `imageGenerationService` behind the existing providerRouter pattern — OpenRouter Unified Image API as primary transport (model picker: Nano Banana 2 default / GPT Image 1.5 hero-quality / Seedream 4.5), direct-Gemini as fallback transport, Recraft optional. Reference-image support (upload Swan brand refs → style-locked series). Seedance 2.5 = flagged video-badge/celebration-asset slot.
3. Asset truth: R2-only persistence (declare `R2_PUBLIC_URL`, kill local fallback or make it loud), backfill 242 achievements' `iconUrl` via batch generation, delete the dead-path manifest.
4. Earnability: criteria-binding step in the save flow (pick criteriaType + params in UI; evaluator branch for the chosen types), plus "create Challenge + Badge + Achievement together" wizard writing to canonical tables (`challenges` gains `imageUrl` via .cjs migration).
5. Display system: ONE shared `SwanBadge` component (sizes S/M/L, rarity ring, legendary animated gradient, locked/greyscale state, reduced-motion) + ONE canonical rarity map exported from `types/gamification.ts`; migrate all 12 surfaces; mount a badge-reveal celebration on `achievement_unlocked`.
6. Ops: per-model cost tracking, monthly quota per admin, generation audit log, prompt library seeded from the 20-style catalog.

## 4. Questions

### For Kimi K3 + HY3 (UI/UX, creator experience, Sean-taste ceiling)
K1. Studio IA: keep 5 tabs or restructure (e.g., Forge / Library / Publish)? What does "enterprise-grade" demand that the current tab shell lacks (history/versions, compare grid, favorites, re-roll with same seed, prompt presets)?
K2. Best-practice generation UX for badge series consistency (style lock via reference images, seed reuse, N-variant compare-and-pick)? Concrete flow, minimal clicks.
K3. Rarity/tier visual language: how to unify 3 competing systems into one legible hierarchy without flattening them? Where does the legendary animated-gradient live and when does motion play (respecting prefers-reduced-motion)?
K4. Badge reveal moment: what should `achievement_unlocked` do beyond a toast, on mobile-first, GPU-safe budget?
K5. What's MISSING from the plan that a top-tier gamification product would have (absence-first: e.g., badge detail modal w/ provenance, showcase/loadout on profile, scarcity stats "owned by X%", seasonal/limited sets)? Rank by value.
K6. Wireframe critique: single-screen Forge (left: prompt/style/model/refs; right: live 4-up variant grid; bottom: bind-criteria + publish rail) vs. wizard steps — which and why?

### For Sol GPT-5.6 (backend, logic, cost/safety)
S1. Provider abstraction: one `imageGenerationService` with transport adapters (OpenRouter unified vs direct Gemini) — right seams? How to handle per-model capability discovery + graceful degradation?
S2. Generation job model: synchronous request (current) vs. job queue with polling/SSE for batch-of-N and 242-achievement backfill? Render constraints (no worker dyno currently) considered.
S3. Data contract: `GenerationJob`/`GeneratedAsset` tables vs. extending `Badges` — what supports versions, re-rolls, audit, cost per image? Migration order (.cjs) including `challenges.imageUrl`, `UserBadges` model, `Badge` registration — sequence with zero-downtime.
S4. Earnability: cleanest criteria-binding design so AI badges become awardable through the existing post-commit badge sweep without new failure modes? Idempotency keys for backfill.
S5. Cost/abuse rails: per-admin quotas, per-model price table, monthly cap, circuit breaker on provider spend — minimal viable design.
S6. What breaks: attack the proposed direction — name the top 5 failure modes (e.g., R2 public URL exposure, prompt injection into image prompts, quota bypass, orphaned R2 objects, backfill thundering herd) with mitigations.

## 5. Constraints (non-negotiable)
- styled-components only (no MUI); Crystalline Swan tokens `var(--token, #fallback)`; 44px touch targets; WCAG 4.5:1; dark-first; prefers-reduced-motion honored.
- Zero PII to LLMs. No Grok models ever. Victory-only charts. Migrations `.cjs` only. FKs reference `"Users"`.
- Max 300 lines/file. Existing-pattern-first: providerRouter, R2 service, idempotency-key formats are the patterns to extend.
- Render paid plan; frontend and backend deploy separately; backend filesystem is ephemeral.
