# SwanStudios — The Full Vision Document
> **Owner:** Sean Swan | **Brand:** SwanStudios | **Product:** SwanStudios (SS-PT)
> **Site:** sswanstudios.com | **Stack:** Production SaaS on Render
> **Created:** 2026-04-17 | **Status:** Active canonical vision doc
> **This is the source of truth for "what is SwanStudios."** When any AI asks, feed them this.

---

## Executive Summary

**SwanStudios is not a personal training app.** It's a **fitness + community + clean-living ecosystem** that combines social media, RPG gamification, AI coaching, content creation, e-commerce, and real-world community events into a single platform.

Think: **Instagram meets MyFitnessPal meets an RPG video game meets Meetup meets Nextdoor meets a clean-living community, built for ALL athletes across ALL sports.**

Most fitness apps help you log workouts. SwanStudios helps you build a life around being healthy, connected to community, levelling up like a character in a game, eating cleanly from local organic sources, and training under world-class AI-assisted coaching.

**Primary objective: MAKE MONEY.** Every feature evaluated against revenue potential. Benevolence (charity, helping others, free trainer platform access) activates AFTER financial security is established.

---

## 1. The Brand

### Name
**SwanStudios** — evokes elegance, power, focus. The swan is calm on the surface, paddling furiously below. Mirror for the athlete mindset.

### Tagline Variations
- "Train like royalty. Live like legend."
- "Where athletes become gods."
- "Your transformation. Gamified."

### Brand Positioning
- **Premium** — Crystalline Swan aesthetic, not gym-bro. Not Planet Fitness.
- **Inclusive** — ALL ages, ALL backgrounds, ALL sports
- **Benevolent** — clean living, community-centered, family-centered
- **Elite** — programmed by 26+ years of experience, NASM-protocol trained, AI-augmented
- **Secure** — E2EE messaging, zero PII to LLMs, data sovereignty

### Theme: Enchanted Apex — Crystalline Swan (Preset F-Alt)
**RETIRED:** Galaxy-Swan (`#0a0a1a`, `#00FFFF`, `#7851A9`) — do NOT use for new work.

**ACTIVE PALETTE:**
| Name | Hex | Role |
|---|---|---|
| Midnight Sapphire | `#002060` | Primary button background |
| Royal Depth | `#003080` | Elevated card surface |
| Ice Wing | `#60C0F0` | Gaming accent, XP bars, cyan glow |
| Arctic Cyan | `#50A0F0` | Data only — charts (NOT buttons/glow) |
| Gilded Fern | `#C6A84B` | Luxury accent, gold |
| Frost White | `#E0ECF4` | Primary light text |
| Swan Lavender | `#4070C0` | Tertiary |
| Wing Purple | `#8B5CF6` | Glow accent, focus rings |
| Obsidian Black | `#0A0A0F` | Deep dark primary bg |
| Carbon | `#141419` | Card dark |
| Graphite | `#1A1A24` | Surface dark (modals, drawers) |

**Dual-Button Glow Rule:**
- Blue bg → Purple glow
- Purple bg → Cyan glow

**Typography:**
- **Plus Jakarta Sans** — headings
- **Cormorant Garamond Italic** — dramatic accents
- **Fira Code** — data, code, numbers
- **Sora** — UI, gaming elements

**Design Philosophy:**
- Dark-first (default theme: `crystalline-dark`)
- Atmospheric (ice crystal particles, aurora gradients, crystalline SVG dividers)
- Luxurious (gold borders on sapphire glass — `border-[#C6A84B]/20` on `bg-[#002060]/60 backdrop-blur-xl`)
- Gamified (XP bars, rarity tiers, animated gradients)
- NO Material-UI. styled-components only.

---

## 2. The Product Surface

### 2.1 Technical Architecture
- **Frontend:** React 18 + TypeScript + styled-components, Victory charts, Vite
- **Backend:** Node.js + Express + Sequelize + PostgreSQL, Render Professional plan (~$60/month, NOT free)
- **Storage:** Cloudflare R2 (videos, badges, assets)
- **Auth:** JWT with refresh tokens, E2EE Signal Protocol for messaging
- **Payments:** Stripe (subscriptions + one-time + donations)
- **Database scale:** 100+ models, 166+ API routes
- **Mobile roadmap:** React Native (Victory → victory-native) for App Store + Google Play

### 2.2 Core Feature Domains

#### A) Personal Training Engine
- **840+ exercises** across 7 sources (NASM, Beachbody, P90X, custom, etc.)
- **NASM OPT 5-phase** periodization built into program generation
- **1RM estimation** (Epley, Brzycki, Lombardi, Lander formulas)
- **Bootcamp/group class builder** (30-90 min classes, stations, equipment, intensity targeting)
- **Movement screening** — 7-step wizard, prospect support, auto-match pattern from WaiverRecord
- **Program generation** — AI-assisted, golf-specific presets, senior-specific modifications
- **Pricing:** $175/session (1hr), $110/session (30min) — **FLAT, no tiers** (reaffirmed 2026-06-10; the $300/$500 "AI-powered/elite" tiers in `SEAN-AI-POWERED-TRAINING-MASTER-VISION.md` are SUPERSEDED — AI extras are included value; platform subscriptions are the upsell lane)
  - 3-month program: $8,400
  - 6-month: $16,800
  - 12-month: $33,600
  - Client on 4x/week = $2,800/mo recurring
- **Training depth stack (folded in 2026-06-10):**
  - 40-item client onboarding questionnaire (health history, goals, movement assessment)
  - Comprehensive health data model: baseline metrics, daily check-ins, per-exercise tracking (weight/reps/sets/ROM degrees/form/fatigue/pain), progress snapshots
  - Photo-based pain/posture diagnostics
  - Research integration (PubMed scraper, peer-reviewed journal summaries)
  - Specialized nutrition patterns available on request (blood-type, no-sugar, low-salt, non-GMO organic) — always labeled, never forced
- **Regression-first** — start with easier variants, build up to complex
- **Golf primary lead** — wealthy demographic in area, premium positioning, course partnerships
- **ALL sports** — not just golf — football, basketball, MMA, tennis, baseball, soccer, combat sports, etc.

#### B) Gamification — RPG Life Simulator (V2 AI Village Approved 2026-03-28)
Not badges-and-points. A full RPG compulsion loop.

**Core Mechanics:**
- **Aegis HUD** — persistent status UI across all pages
- **Crystalline Avatar** — personalized visual character that evolves with your training
- **Vault Decryption** — unlock loot from workout completion (rarity tiers: Common = Swan Lavender, Rare = Gilded Fern, Epic = Wing Purple, Legendary = animated gradient)
- **MY SPACE** — virtual rooms you decorate with earned items
- **Job System** — class-based progression (Warrior, Ranger, Monk, etc.)
- **Party HP** — team health pools for group workouts
- **Ghost Mode** — compete against your past self
- **Seasons** — rotating content drops
- **XP System** — 50/workout + 10/exercise + 100/PR + bonuses

**V2-V4 Deferred (pending 50+ active users):**
- Faction Warfare
- Battle Pass
- Virtual Rooms

**Full badge library:** 100+ badges, all with backstories, rarity, and unlock conditions.

#### C) Nutrition Ecosystem (6-phase, AI Village + CEO Approved 2026-03-31)

**Phase 1:** Barcode camera scanning (BarcodeDetector API, NOT Quagga)
**Phase 2:** Ingredient color-coding (IARC Group 1 red, EU-banned orange, natural green)
**Phase 3:** Farm finder (Leaflet.js mapping, local organic farms, CSA programs, farmers markets)
**Phase 4:** Gardening calculator (USDA Hardiness Zone + meal-to-garden tracking — clean living philosophy)
**Phase 5:** Supplement ecosystem (research-backed, FTC-compliant, FDA wellness disclaimers, AG1 affiliate integration)
**Phase 6:** AI meal photo recognition (Gemini Flash → macro estimation)

**Dr. Sebi-aligned principles** included alongside conventional medicine — alkaline, plant-based, mucus-free patterns available for clients who want them. Always labeled, never forced.

**Macro tracking:**
- Harris-Benedict TDEE
- Jackson-Pollock body fat %
- Katch-McArdle lean mass
- Full meal logging
- Hydration tracking with electrolyte timing

#### D) Social Platform Vision (2026-03-31)

**This is not a PT app.** It's a community platform with PT as the revenue engine.

**Feature scope:**
- **Social feed** — Instagram-style reels, posts, stories
- **Communities** — interest groups (golf athletes, seniors, moms-who-lift, etc.)
- **Events** — Meetup-style local gatherings (bootcamps, health seminars, farm tours, outdoor workouts)
- **Messaging** — E2EE Signal Protocol, not compromisable
- **Challenges** — 30-day squats, 100-mile month, clean eating streaks, etc. with XP rewards
- **Clean Living Community** — unique positioning: farmers markets, organic food, outdoor activities, community gardens, sustainable living
- **Benevolent energy** — no rage-bait, no toxic comparison culture, no spam
- **NO politics, NO news — by design (locked 2026-06-10)** — motivation, art, dance, fitness, community content welcome; political and news content excluded. Enforcement: AI moderation flag (politics/news/rage-bait detection) → admin/moderator human review queue. The AI flags; a human makes the final call.
- **Community health widget (admin)** — moderation KPIs surfaced (flag rate, review latency) so "community over profit" is measured, not vibes
- **Pets & animals (locked 2026-06-10)** — pet profiles on user accounts (photo, name, breed) + "pets welcome" tag/filter on community events (dog-walk bootcamps, hike meetups). Acquisition angle for animal lovers; pet-friendly events double as highly shareable short-form content for the content engine. Explicitly NOT pet fitness tracking; RPG companion-pets remain a separate deferred idea.
- **Progress-proof share cards** — one-tap (≤2 taps) rendering of a PR/streak/transformation into a beautiful Swan-branded share image; every share is organic marketing
- **All ages, all backgrounds** — explicitly inclusive

**Revenue model: Free community → $9.99/mo AI tier → $24.95/mo premium.**

**Differentiators from competitors:**
- Not just tracking — community
- Not just community — clean living focus
- Not just clean living — RPG gamification layer
- Not just gamification — AI coaching integrated
- Not just AI — real human trainers in the network

#### E) Subscription Tier System (2026-04-04, AI Village + Gemini CTO Approved)

| Tier | Price | What You Get |
|---|---|---|
| **Swan Starter** | FREE | 10 free AI chats/mo, basic workout logging, public feed access, limited gamification |
| **Swan Guardian** | DONATION ($1+ min, no cap) | Unlimited AI chats up to 60, full gamification, community events, **auto-upgrades to Crystalline at $25+ donation** |
| **Swan Crystalline** | $24.99/mo ($249.99/yr) | All Guardian features + unlimited AI + premium content + early access + priority support |

**AI cost scaling:** Use Gemini Flash free quota + OpenRouter free models for Starter/Guardian users. $0 cost until scale. Sean's admin/trainer accounts bypass all gating.

**Revenue target:** 1,000 subscribers at ~$9.99/mo average = $10,000/month recurring.

**Anti-abuse:**
- Rate limiting, monthly caps
- IP defense
- Admin revoke capability
- CAPTCHA if needed

#### F) Content Studio (AI Village Validated 2026-03-27)

**Stack:**
- **Remotion** — motion graphics, titles, lower-thirds (working)
- **Seedance 2.0** — AI video generation (replaces Kling, via laozhang.ai API ~$0.05/video OR Higgsfield $15-34/mo)
- **ElevenLabs** — premium voice (stubbed, pending activation)
- **Blotato** — multi-platform distribution to 20+ social accounts ($29/mo)

**Capabilities:**
- Exercise video generation (Sean demos → auto-cut, captions, overlays)
- Anatomy overlay post-production (muscle activation highlights)
- Scroll-activated hero videos (frame extraction → scroll position mapping)
- YouTube video script drafting
- Cinematic brand films (hero loops, card loops, icon motion, ambient b-roll)
- Workout demo library (5-beat teaching rhythm: Setup → Action → Signature → Proof → Reset)

**Workflow:**
1. NanoBanana/key.ai reference image generation
2. Seedance 2.0 for video
3. Claude Code for website integration
4. Capcut Pro or DaVinci for anatomy overlays

**Split skills:**
- `seedance-swan-video` — unified skill with workout mode (exercise demos/anatomy overlays) and cinematic mode (hero/card loops and brand films)

#### G) Wearable Integrations (8 platforms)

- Fitbit
- Apple Health
- Garmin
- WHOOP
- Oura
- Polar
- COROS
- Samsung Health

**What we read:**
- Resting heart rate trends
- HRV (recovery)
- Sleep quality
- Daily activity (steps, active minutes)
- Workout detection + sync
- SpO2 / altitude training (where supported)

**What we do with it:**
- Auto-adjust program intensity based on recovery scores
- Detect overtraining patterns
- Correlate sleep quality with PR attempts
- Feed Swan Coach for pre-session client briefings

#### H) Coach Assistant (Swan Coach) Branding

**DO NOT call it "AI" user-facing.** Call it:
- "SwanStudios Coach Assistant"
- "Swan Coach"
- "Your Coach"

**Why:** AI is commodity language. "Swan Coach" is brand. Builds differentiation.

**Terms/privacy docs CAN reference AI** (legal requirement). Marketing doesn't.

**Live command lane (v1-v14 verified 2026-04-11):**
- 20 commands live via Telegram + dashboard
- v15 next: `view_available_slots` (clean read, non-destructive)
- Deferred: `set_availability` (destructive), `reschedule_session` (409 conflict), `schedule_session` (wrong semantics), frontend dispatch

#### I) Admin/Trainer Tiers

**Three trainer types:**
1. **Admin/Sean** — bypass all gating, full platform control, see everything
2. **SS-employed trainers** — hired by Sean, work for SwanStudios brand
3. **Independent platform users** — trainers who bring their own clients, use SwanStudios as platform, pay platform fee

**Trainer recruitment = force multiplier.** Each new trainer = potentially 20-50 new users.

**Move Fitness context:** Sean currently works at Move Fitness. MF clients get SwanStudios FREE (data-only, progress tracking, no charge). Sean won't poach. MF is employer; SwanStudios is his own brand. Crystalline Link Protocol for QR + invite-code onboarding.

**MF badge:** Gilded Fern color + MoveFitLogo-3d.png.

#### J) Marketing Dashboard (Admin)

**Vision:** PhD-level AI marketer in admin dashboard.

**Capabilities:**
- Local SEO monitoring (Google Business Profile, rank tracking)
- Competitor analysis (pricing, offerings, marketing tactics)
- Lead funnel analytics (content → views → signups → trials → paid)
- Email campaign drafting (2x/month MAX per cadence rule)
- Blog post drafting (1x/week)
- Social media scheduling + performance tracking
- Trainer recruitment pipeline
- Revenue analytics (MRR, ARR, ARPU, LTV, CAC, churn)

**Source of truth:** `docs/ai-workflow/references/PHD-level marketing agent`

**Content cadence rule:** Blog 1x/week, email 2x/month MAX, Sean approves before publish (no spam).

#### K) Analytics — Victory Charts (50-Chart Gallery)

**Why Victory:** Cross-platform (web + React Native via `victory-native`) — one codebase, two platforms. NOT Recharts for new work.

**Chart library:**
- Body composition trends (weight, body fat, lean mass over time)
- PR progression charts
- Volume/intensity trends
- Nutrition macro charts
- Sleep/HRV charts
- Heart rate zone distributions
- Movement quality scores
- 50+ specialized charts for trainer dashboard

**Lazy loading:** `React.lazy()` + `SafeChart` error boundary. Never eagerly load full gallery.

**Swan Chart Skin (locked 2026-06-10):** Sean's verdict — default Victory styling is not beautiful enough for the brand. The fix is NOT a library switch (Victory stays; rule 10 + React Native path protected). Build a signature reusable chart theme: Crystalline gradient fills, Ice Wing glow lines, animated draw-in, custom tooltips, Fira Code data labels. One theme upgrades all 50 charts. Victory-default styling anywhere is a design gap.

#### L) Security — E2EE Encryption (2026-04-05)

- **Signal Protocol** for all private messaging (WhatsApp-style)
- **Health data encrypted at rest**
- **E2EE status panel** for user transparency
- **$0 cost** — runs on existing Render infrastructure

**Security Intelligence Panel:**
- Daily CVE/npm audit scanning (6 free APIs)
- Admin dashboard alerts
- Dependency vulnerability monitoring
- Render + R2 + DB health checks

#### M) AI-Future Adaptation & Bring-Your-Own-Model (added 2026-06-10)

Sourced from Sean's vision session + the Mo Gawdat "where AI is going" transcript (Diary of a CEO). Full mining: `docs/ai-workflow/brainstorms/swanstudios-whole-app-vision-regrill-2026-06-10.md`.

**Strategic thesis — SwanStudios is positioned in the most AI-durable job class that exists:**
- Embodied, human-connection work (personal training) survives the AI wave longest; entry-level knowledge work erodes first (Gawdat: serious impact ~2027).
- "Lived experience and resonance will still create a job class" — Swan Coach does analysis/admin/charts; the human trainer provides relationship, accountability, presence. **Never market Swan Coach as replacing trainers — it lets trainers be MORE human.** (About page already says it: "Technology amplifies human coaching — it never replaces it.")
- AI job disruption = trainer recruitment opportunity: displaced knowledge workers seeking embodied second careers are the marketplace's on-ramp wave.
- Every trainer gets a superintelligent back office ("borrowing 100 IQ points") — one trainer serves more clients at higher quality without burnout.
- Community/human connection becomes the scarce good as AI isolates people. The social layer is the long-game moat, not garnish.
- Purposeful compute: Swan Coach always drives a next-best-action (log, adjust, celebrate, reach out) — never idle chat.
- Counter-cyclical positioning: if unemployment rises, the donation-based Guardian tier keeps the community growing when wallets tighten.

**Bring-Your-Own-Model (BYOM) — locked scope: swappable model slot**
- Swan Coach stays THE coach — same chat bar, same commands, same role-based permissions — but users can plug in their own API key (OpenAI, Gemini, Claude, local model) to power it.
- SwanStudios always owns the data, privacy gate, and tool layer. **Only the brain is swappable; the coach is not.**
- Architecture direction: Swan Coach backend routes LLM calls through a provider-abstraction layer with per-user model config.
- Economics: their tokens = their cost ($0 AI cost to platform for BYOM users).
- Explicitly NOT in scope now: external agent access (MCP-style inbound connections from users' own agents) — revisit when the platform has traction.
- Gawdat's "agents are the synapses; models become regions of one brain" supports model-agnosticism over single-vendor lock-in.

**Trust narrative — "Your data, your story, your model" (adopted 2026-06-10):**
- Package zero-PII-to-LLMs + E2EE messaging + no-politics feed + donation tier + BYOM into ONE explicit public trust story.
- Trust is proven by sacrifice, not slogans (the Anthropic-turning-down-$500M lesson). These are demonstrable sacrifices that become a marketing-grade moat as public AI distrust grows.
- **Vote-with-your-usage era:** users increasingly pick platforms on demonstrated values; SwanStudios' trust stack targets exactly that audience.

**Ethical retention principle (locked 2026-06-10, from full transcript):**
- The "moral AI vs evil AI" test: dopamine-slot-machine retention wins short-term and corrodes trust; SwanStudios retains through REAL progress, consistency streaks, and community belonging — never dark patterns.
- Swan Coach is the caring-boundaries coach: it advocates rest, recovery, and deload weeks, and will say "don't train today" when the data says so. A coach that sometimes says no is trusted more than one that always says yes.

**Second-half transcript additions (2026-06-10):**
- **Personality beats information:** generic fitness info content will be AI-commoditized (prompt-your-own-podcast era). The YouTube engine leads with Sean's personality, story, lived experience, and client transformations — the moat is Sean, not the information.
- **Model-agnosticism = platform resilience:** the BYOM provider-abstraction layer also protects SwanStudios itself from vendor price shocks and policy changes (Gawdat runs his own startup model-agnostic for this reason).
- **Frontier models aren't needed for 90% of tasks:** validates the tiered AI cost strategy (free/cheap models for Starter/Guardian; frontier compute only where it earns its cost).
- **Trainer recruitment speaks to the cut-off generation:** entry-level hiring is freezing (up to 30% of some sectors' jobs gone by 2027-28); the pitch to displaced knowledge workers and new grads is "human-centric career + AI superpowers included, keep 90%, no monthly fee."

#### N) Operations, Teaching & Platform Experience (folded in 2026-06-10)

**Operations & teaching pack:**
- Teach-first guided product system — role-based first-run teaching for client/trainer/admin/user surfaces
- Session deduction clarity — SwanStudios paid sessions deduct; Move Fitness free clients never deduct; cancellation/no-show policy explicit
- Store/Stripe purchase workflow — cart, checkout, idempotent fulfillment, session grant
- PLAUD audio playback — uploaded session audio playable in-app
- iPad/tablet session logger — simple form + voice notes + photo capture + auto-sync
- Twilio SMS automation — daily check-in reminders, voice-to-text capture into client record
- Mission QA persona framework — contract / prod-read-only / prod-live / staging-write modes across admin, trainer, paid client, MF free client, stub personas

**Platform & experience pack:**
- Multinational readiness — i18n, time zones, currency handling (US/Canada/Mexico first, worldwide ambition), mobile-first + 1440p/4K desktop QA
- Theme synchronization — Crystalline Swan tokens consistent across every dashboard surface, dark-first
- Swan Coach as operating layer — contextually present on every surface (Home/Train/Clients), not a detached page
- Activation loops (explicit, rule 62): trainee = first workout logged + first coach/group interaction + first visible progress proof within 7 days; trainer = first template + first client invite + payout path; admin = exceptions/stale clients/billing visible without hunting

---

## 3. Target Market

### Primary Lead: Golf Clients (Geographic Fit)
- **Why:** Area has many golf courses, high-net-worth demographic
- **Positioning:** Premium ($175/session, 12-month program = $33,600 recurring per client)
- **Outreach:** Course partnerships, clubhouse newsletters, golf pro referrals
- **Specific program:** Golf-specific hypertrophy + stability framework
- **Messaging:** "Golf performance through proven strength science"

### Broader Market: All Athletes, All Sports, All Ages
- **Football, basketball, MMA, tennis, baseball, soccer, combat sports, track, swimming, etc.**
- **Seniors** — explicit market segment, regression-first programming
- **Moms** — post-partum specific offerings
- **Kids** — age-appropriate training and nutrition
- **General fitness** — weight loss, muscle gain, general health

### Community Members (Social Platform Users)
- Clean-living enthusiasts (organic food, outdoor activities, conscious lifestyle)
- Local community builders (events, meetups, gardening groups)
- Mental health + wellness focused
- Anti-spam, anti-rage-bait demographic
- All ages, all backgrounds, all cultures

---

## 4. Revenue Model

### Revenue Streams (Ranked by Priority)

1. **Client Acquisition — Personal Training (Direct)**
   - $175/session, 4x/week average = $2,800/mo per client
   - Program contracts: 3mo $8,400 / 6mo $16,800 / 12mo $33,600
   - Target: 10-20 active paying clients at scale
   - **Monthly revenue potential:** $28,000-$56,000

2. **SwanStudios Platform Subscriptions**
   - Target: 1,000 subscribers at avg $9.99/mo = $10,000/month
   - Growth via: content marketing, trainer recruitment, community events
   - **Monthly revenue potential:** $10,000+ recurring

3. **YouTube Content Revenue**
   - Consistent posting, fitness + AI + lifestyle niche
   - Ad revenue + client funnel
   - **Monthly revenue potential:** $500-$5,000 (scales with subs)

4. **Web Development Side Business**
   - Client websites + software apps (SwanStudios is the portfolio piece)
   - Project-based: $2,000-$10,000/project
   - **Monthly revenue potential:** $2,000-$10,000 when active

5. **Trainer Platform Fees — 10% flat, all-inclusive (locked 2026-06-10)**
   - SwanStudios takes 10% of trainer-client transactions and absorbs Stripe (~3%) inside it — trainer keeps a clean 90%, no monthly SaaS fee (platform nets ~7%)
   - Recruitment pitch: "No monthly fee. Keep 90%." — fairer than Trainerize-class $50-300/mo subscriptions
   - **Trainer recruitment funnel page (adopted 2026-06-10):** public "Become a SwanStudios Trainer" surface telling the 90/10 story, timed to the AI job-disruption window
   - Each trainer = dozens of new users
   - **Revenue scales with trainer count + their client count**

6. **Nutrition Upselling**
   - Training + nutrition package = premium pricing
   - Supplement affiliates (AG1)
   - **Monthly revenue potential:** +$50-100/client + affiliate passive income

7. **Content Studio Monetization**
   - YouTube faceless channels
   - Member-only video library (R2-hosted)
   - $9.99/mo unlock
   - **Monthly revenue potential:** $500-$2,000

8. **Photography Business**
   - Client booking management, follow-up, portfolio
   - **Revenue potential:** $500-$2,000 per booking

### Year 1 Combined Revenue Target
**$150k-$400k gross** depending on subscriber scale + client acquisition rate.

---

## 5. What SwanStudios Is NOT

- ❌ Just another personal training app
- ❌ A quiet workout logger
- ❌ Material-UI generic SaaS aesthetic
- ❌ Bro culture, ego lifting, toxic comparison
- ❌ Yoga/meditation branded (use "stretching" / "flexibility" instead — rule #9 in CLAUDE.md)
- ❌ Free forever (donation Guardian tier is minimum, sustainability required)
- ❌ Built on retired tech (Galaxy-Swan theme, Recharts, MUI — all retired)

---

## 6. What Makes SwanStudios Win

### Defensive Moats (Hard to Copy)
1. **26+ years of Sean's training expertise** — encoded into agent behavior, program generation, client-specific patterns
2. **Karpathy Wiki accumulated knowledge** — 6+ months of real data will be unmatched by any competitor
3. **Crystalline Swan design identity** — distinctive, premium, recognizable
4. **RPG gamification depth** — V2-V4 roadmap creates sustained engagement
5. **Clean living community positioning** — no competitor owns this space
6. **E2EE + zero-PII posture** — privacy-conscious users can't get this elsewhere
7. **8 wearable integrations** — competitors typically support 2-3
8. **Full-stack ownership** — Sean controls the stack, can pivot instantly
9. **Local AI capability (Phase B/C)** — privacy + cost + independence from cloud vendors

### Offensive Plays (Attack Vectors)
1. **YouTube content engine** — daily briefs via Swan Content, 5x content output via repurposing
2. **Local SEO domination** — Swan Marketer replaces $5k/mo marketing agency
3. **Trainer recruitment** — each trainer = 20-50 new platform users
4. **Karpathy Wiki + AI Village validation** — Sean ships features other solopreneurs can't
5. **Golf course partnerships** — premium demographic with high LTV
6. **Community events** — farmers markets, outdoor bootcamps, seminars drive local growth

---

## 7. Priority Roadmap — Pointer

This document describes **vision and "where this is going"** framing. For active sequencing, current Now/Then ordering, deferred infrastructure, and Phase B integration roadmap, see `docs/ai-workflow/references/SWANSTUDIOS-EXECUTION-ROADMAP.md` (the canonical source). Don't duplicate the order here — it drifts.

---

## 8. Technical Gotchas (Hard-Won Lessons)

- `translateZ(0)` creates stacking contexts — add `position: relative; z-index` to parent
- Vite env vars (`VITE_*`) are build-time only — not changeable at runtime
- Render deploys take 2-5 min; users may see cached old bundles
- Windows dev — forward slashes in imports, `.cjs` for CommonJS migrations
- Gamification: always use idempotency keys to prevent double-award
- Chart lazy loading: `React.lazy()` + SafeChart error boundary — never eagerly load full gallery
- Social feed: cursor-based pagination (not offset)
- Dual `users`/`"Users"` table in production — FK constraints must reference `"Users"`
- styled-components `css` helper required for shared style chunks with interpolation (Incident 2026-04-12: AdminOverviewPanel.tsx crashed on mount)
- Pre-Push Backend Audit MANDATORY (untracked files + modified-uncommitted crashes Render identically)

---

## 9. Sean Swan — Who's Behind This

### Developer Background
- **Redwood Code Academy** (2017)
- **MIT CS online** (ongoing)
- Full-stack React developer → AI developer pivot
- NOT self-taught — formal education
- Building SwanStudios as the portfolio proof point + revenue engine

### Trainer Credentials
- **NASM Workshop — OPT Protocol Trained** (in-person workshop; never say "NASM-certified")
- **NCEP** (National Council on Exercise Professionals)
- **24 Hour Fitness Master Trainer**
- **Gold's Gym Certified**
- **LA Fitness Certified**
- **26+ years** of hands-on training experience across all demographics

### Personal Context
- **Family:** Spouse (principal Canada immigration applicant), multiple children
- **Heritage:** Chickasaw Nation lineage (relevant to 2027 US-Canada Native American border law)
- **Location:** Southern California
- **Mixed-race household** — safety awareness built into platform philosophy

### Current Focus Trajectory
1. **Now:** Build SwanStudios to subscriber + PT client critical mass
2. **Year 1:** Scale to $150-400k gross, fund dedicated Phase C server
3. **Year 2-3:** React Native mobile launch, expand trainer recruitment, community platform reaches self-sustaining engagement
4. **Long-term:** Canada immigration complete (with or without 2027 law), platform generating passive recurring revenue, SwanStudios methodology distributed as open IP via Karpathy wiki gists

---

## 10. Decision Principles

When in doubt, default to:

1. **Revenue first.** Every feature evaluated against "does this make money?"
2. **Family first.** Never compromise family safety for speed or feature velocity.
3. **Privacy enforced.** ZERO PII to LLMs. Client IDs only. E2EE for messaging.
4. **Premium positioning.** We're not racing to the bottom.
5. **Community over commodity.** Clean-living + benevolent energy differentiates.
6. **Native + minimal deps.** styled-components > MUI. Victory > Recharts. PostgreSQL > MongoDB.
7. **Mobile-ready from day one.** Cross-platform choices (Victory, React Native path).
8. **Local-first when sensitive.** Phase B/C migration for family/health/legal data.
9. **AI Village validates anything load-bearing.** 15-brain debate for architectural decisions.
10. **Ship fast, validate with real users.** Don't over-engineer before traction.

---

## 11. The Brand Promise

To every athlete, every family, every community member who uses SwanStudios:

> *We will level you up. We will protect your data. We will build community around you. We will feed you cleanly. We will train you scientifically. We will gamify your progress. We will connect you to trainers who give a damn. And we will never sell you out.*

That's the deal. Every feature must reinforce it.

---

## Change Log
- 2026-04-17: Vision doc created as canonical source of truth. Ingest into wiki/raw/business/swanstudios-full-vision.md for agent context.
- 2026-06-10: Whole-app vision re-grill (Fable session). Added: §2.2.M AI-Future Adaptation & BYOM (Gawdat transcript mining, swappable model slot, trust narrative), §2.2.N Operations/Teaching/Platform packs + activation loops, pets & no-politics moderation + share cards in §2.2.D, Swan Chart Skin in §2.2.K, 10% flat trainer fee + recruitment funnel in §4.5, training depth stack + $175-flat pricing reaffirmation in §2.2.A. Companion: `docs/ai-workflow/brainstorms/swanstudios-whole-app-vision-regrill-2026-06-10.md` + new `SWANSTUDIOS-MASTER-PROMPT.md`.
