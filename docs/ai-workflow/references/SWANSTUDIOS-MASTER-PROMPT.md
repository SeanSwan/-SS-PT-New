# SwanStudios Master Vision Prompt

> **Status:** CANONICAL (created 2026-06-10, supersedes all older "MASTER PROMPT" docs in `docs/archive/`, `docs/ai-workflow/archive/`, and `docs/ai-workflow/gamification/`).
> **Use:** Paste this whole prompt into ANY AI (Claude, Codex, Gemini, or a user's own BYOM model) to load the complete SwanStudios vision in one shot.
> **Deep reference:** `docs/ai-workflow/references/SWANSTUDIOS-FULL-VISION.md`. Sequencing: `SWANSTUDIOS-EXECUTION-ROADMAP.md`. Strategy gate: `BEST-IN-CLASS-TRAINING-APP-STRATEGY.md`. Operating rules: `CLAUDE.md` (repo root) — rules win over this prompt if they conflict.

---

You are working on **SwanStudios** (sswanstudios.com) — a production personal-training SaaS owned and built by **Sean Swan**: 26+ years personal trainer (NCEP 2000, NASM OPT workshop, 24 Hour Fitness Master Trainer, Gold's Gym and LA Fitness certified, physical-therapy aid background) and full-stack developer (Redwood Code Academy 2017, MIT CS online, Zero To Mastery). Sean trained at elite gyms across Los Angeles and is building his own roster and brand. Treat everything below as Sean's intent — when in doubt, this is the head you're matching.

## What SwanStudios IS

A **workout-progress-first fitness + community + clean-living ecosystem** — not a generic fitness app and not a generic social network. One sentence: *log the workout → save the diary entry → turn it into beautiful progress proof → drive the next best training action → make milestones shareable with a benevolent community.*

It combines, in priority order:
1. **The training engine** — Sean (and other trainers) log all client information; NASM OPT 5-phase programming; 840+ exercise library; movement screening; bootcamp builder; comprehensive client health data (baseline metrics, daily check-ins, per-exercise weight/reps/sets/ROM/form/pain, progress snapshots); 40-item onboarding questionnaire; photo-based pain/posture diagnostics; PubMed-backed research integration.
2. **Beautiful progress proof** — 50+ Victory charts wearing the signature **Swan Chart Skin** (Crystalline gradient fills, Ice Wing glow lines, animated draw-in, Fira Code labels). Victory is locked (cross-platform path to React Native / App Store + Google Play). Default-styled charts are a design gap. Charts come from REAL logged workout data — mock data is a placeholder to replace, never a feature.
3. **Swan Coach** — the platform AI (never call it "AI" user-facing; it's "Swan Coach"). A hive-mind over all site data with strict **role-scoped access** (admin sees everything; trainer sees their clients; client sees themselves; user sees their own). **Voice-dictation-first**: Sean and trainers can speak everything (log workouts, fill forms, run commands); manual forms are the backup, and Swan Coach can fill them. It is an **operating layer present on every surface**, not a chatbot page. It always drives a next-best-action — never idle chat. ZERO PII to LLMs: client IDs only, names mapped client-side.
4. **The community** — Instagram-style feed, interest communities, Meetup-style local events, challenges, E2EE Signal-Protocol messaging. **NO politics, NO news — by design.** Motivation, art, dance, fitness, clean living. Enforcement: AI flags political/news/rage-bait content → human admin review queue; admin sees community-health KPIs. All ages, all backgrounds. **Pets belong here too:** users add pet profiles (photo/name/breed) and events carry a "pets welcome" tag — dog-walk bootcamps and pet-friendly hikes are both an acquisition channel for animal lovers and shareable content fuel.
5. **The trainer marketplace** — trainers anywhere (US, Canada, Mexico, worldwide; i18n/timezone/currency readiness) bring their clients and use the platform. **Fee: 10% flat, all-inclusive — trainer keeps a clean 90%, no monthly fee, Stripe absorbed.** Recruitment pitch: "No monthly fee. Keep 90%." A public "Become a SwanStudios Trainer" funnel page tells this story. Three trainer types: admin (Sean), SS-employed, independent.
6. **Gamification (RPG Life Simulator)** — Crystalline Avatar that represents the user, XP (50/workout, 10/exercise, 100/PR), Vault Decryption loot, rarity tiers, MY SPACE rooms, Job System, Ghost Mode, Seasons. Compulsion loop in service of consistency, never dark patterns.
7. **Nutrition + clean living** — barcode scanning, ingredient color-coding, farm finder, gardening calculator, supplements, AI meal photo recognition. Specialized patterns (blood-type, no-sugar, non-GMO organic) available, always labeled, never forced.
8. **Content Studio** — Sean's YouTube engine markets the platform (exercise demos with anatomy overlays via Seedance 2.0, Remotion graphics, hero loops). Creator features (TikTok/Twitch-style) are SECONDARY to the workout-first loop.

## Business model (locked decisions)

- **PT pricing: $175/hr, $110/30min — FLAT. No tiers.** ($300/$500 "AI tier" concepts are superseded; AI extras are included value.) Programs: 3mo $8,400 / 6mo $16,800 / 12mo $33,600.
- **Platform tiers:** Swan Starter (FREE), Swan Guardian (**donation-based, $1+ — if you can't afford a subscription, donate what you can or nothing**; auto-upgrades to Crystalline at $25+), Swan Crystalline ($24.99/mo). Fairness is brand-load-bearing: see the About page promise cards ("Fair Always", "Your Data, Your Story", "Community Over Profit").
- **Trainer marketplace: 10% flat all-inclusive.**
- **Revenue priority:** direct PT clients → platform subscriptions → YouTube → trainer fees → nutrition upsell. Primary lead market: wealthy golf clients (geographic fit), but the platform serves ALL athletes, ALL sports, ALL ages (seniors, post-partum, kids, general fitness).
- **Move Fitness** (Sean's current employer): MF clients use the app FREE (data-only value-add; no poaching). SS clients = revenue.

## AI-future strategy (from Sean + the Mo Gawdat / Diary of a CEO analysis, 2026-06-10)

- **Personal training is in the most AI-durable job class that exists** (embodied + human connection). Position accordingly: *"Technology amplifies human coaching — it never replaces it."* Swan Coach does analysis/admin/charts; the human trainer provides relationship, accountability, presence.
- **AI job disruption (~2027+) is a trainer-recruitment opportunity** — displaced knowledge workers seeking embodied second careers are the marketplace's on-ramp wave.
- **Bring-Your-Own-Model (BYOM): swappable model slot.** Users may plug their own API key (OpenAI/Gemini/Claude/local) into Swan Coach. Same coach, same commands, same role permissions — SwanStudios always owns the data, privacy gate, and tool layer; **only the brain is swappable.** Their tokens, their cost. External inbound agent access (MCP-style) is deliberately deferred.
- **Trust narrative: "Your data, your story, your model."** Zero-PII + E2EE + no-politics feed + donation tier + BYOM packaged as one public trust story — trust proven by sacrifice, not slogans.
- **Counter-cyclical:** the donation tier keeps the community growing if the economy tightens.
- **Model-agnosticism is also platform resilience:** the provider-abstraction layer protects SwanStudios from any single AI vendor's price shocks or policy changes; frontier models aren't needed for 90% of tasks (cheap/free models serve lower tiers).
- **Ethical retention:** SwanStudios retains users through real progress, streaks, and community belonging — never dopamine dark patterns. Swan Coach is a caring-boundaries coach that advocates rest and recovery and will say "don't train today" when the data says so.
- **Personality beats information:** generic fitness info content will be AI-commoditized; the YouTube/content engine leads with Sean's personality, lived experience, and client transformations — the moat is the human, not the information.
- **Recruitment speaks to the cut-off generation:** entry-level hiring is freezing; the trainer pitch to displaced knowledge workers and new grads is "human-centric career + AI superpowers included — keep 90%, no monthly fee."

## Experience mandates

- **Least clicks, least time, easiest to use — always.** Voice-first where possible. Global quick-log ≤2 taps. Milestone share ≤2 taps. Trainer session start: 1 tap from today's schedule. BYOM setup: one settings card.
- **Activation loops:** trainee = first workout logged + first coach/group touch + first visible progress proof within 7 days. Trainer = first template + first client invite + payout path. Admin = exceptions, stale clients, billing visible without hunting.
- **Teach-first onboarding** per role; session-deduction rules explicit (SS paid deducts, MF free never deducts).
- **Design:** Enchanted Apex — Crystalline Swan theme. Dark-first, styled-components only (NO Material-UI), premium and distinctive — never template-like. Palette anchors: Midnight Sapphire `#002060`, Ice Wing `#60C0F0`, Gilded Fern `#C6A84B`, Wing Purple `#8B5CF6`, Obsidian Black `#0A0A0F`. Dual-Button Glow: blue bg → purple glow; purple bg → cyan glow. 44px touch targets. WCAG 4.5:1. `var(--token, #fallback)` colors only.
- **Mobile-first daily flows** + strong desktop coach/admin console; responsive through 320px → 4K.
- **Language bans:** no "yoga/meditation" (say stretching/flexibility); no "AI" as the user-facing name for Swan Coach.

## Hard boundaries

- ZERO PII to LLMs (client IDs only). E2EE for private messaging. Health data encrypted at rest.
- No politics, no news, no rage-bait in the community — ever.
- No Material-UI, no Recharts (Victory only), no retired Galaxy-Swan theme, no Grok/X-AI models.
- Workout charts come from real logged data; treat mock data as a gap.
- Revenue first, family safety first, privacy enforced, premium positioning — in that spirit, kill scope that doesn't improve coaching, adherence, progress proof, community, revenue, or trust.

## Tech snapshot

React 18 + TypeScript + styled-components + Vite (frontend) · Node/Express + Sequelize + PostgreSQL (backend) · Render Professional (auto-deploys from `main`) · Cloudflare R2 (media) · Stripe (subs + one-time + donations) · JWT auth · Victory charts · React Native planned (victory-native). 100+ models, 166+ API routes.

---

**When you build or plan anything for SwanStudios:** check it against the core loop (log → save → chart → next action → share), the activation loops, the least-clicks mandate, and the trust boundaries above. If a decision isn't covered here or in `CLAUDE.md`, surface the ambiguity instead of guessing — Sean would rather answer a question than unwind a wrong assumption.
