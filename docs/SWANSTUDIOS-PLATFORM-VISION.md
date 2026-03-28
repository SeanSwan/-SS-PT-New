# SwanStudios Platform Vision & Product Description

**Document Owner:** Sean Swan (Founder/CEO/Head Trainer)
**AI Village Reviewed:** Pending
**Last Updated:** 2026-03-28
**Status:** Definitive Platform Vision Document

---

## Executive Summary

**SwanStudios is a voice-first, AI-powered personal training platform that eliminates manual workout logging, automates client onboarding, and wraps a full social fitness community around the NASM Optimum Performance Training protocol.**

Sean Swan — a 25+ year veteran personal trainer (NASM, NCEP, 24 Hour Fitness Master Trainer, Gold's Gym, LA Fitness) — built SwanStudios to solve a problem every working trainer faces: the administrative overhead of running a training business eats the time that should go to coaching. SwanStudios is the platform Sean wished existed — one where the AI handles the paperwork so the trainer can focus on the client standing in front of them.

---

## The Core Problem

Personal trainers spend hours each week on administrative tasks that don't directly help clients:

1. **Manually logging every set, rep, and weight** for every client, every session
2. **Writing individualized workout programs** that follow proper periodization
3. **Onboarding new clients** with intake forms, assessments, goal-setting, and account setup
4. **Tracking progress** across dozens of clients with different goals and phases
5. **Managing scheduling, payments, and cancellations**
6. **Building their brand and client roster** while employed at a gym

Sean trains clients 3+ times per week at Move Fitness in Anaheim Hills. Between sessions, he needs a system that handles everything else — automatically, by voice, powered by AI.

---

## The Solution: What SwanStudios Does

### 1. Voice-First AI Workout Logging (The #1 Feature)

**The dream:** Sean finishes a training session with a client, picks up his phone, and says:

> "Jackie did 3 sets of 10 on bench press at 95 pounds, 4 sets of 12 goblet squats with a 30-pound dumbbell, 3 sets of 15 cable rows at 50 pounds. She mentioned slight left knee discomfort during lunges. Good session overall, she's ready to progress to Phase 2 next week."

**What happens next — automatically:**
- The AI transcribes the voice input (Gemini Flash multimodal)
- GPT-4o-mini parses exercises, sets, reps, weights, tempo, and RPE from natural language
- Pain flags ("left knee discomfort") are extracted and tagged for follow-up
- The workout is validated against NASM Phase protocols (correct rep ranges, tempos, rest periods)
- A structured workout log is saved to Jackie's profile
- Jackie's session count is decremented from her package
- Gamification engine awards XP (50 for session + 10 per exercise)
- Progress charts update automatically
- A confidence score tells Sean how accurately the AI understood him

**No typing. No spreadsheets. No forgetting details after the 5th client of the day.**

The system supports three input methods:
- **DictationOrb** — tap-to-toggle or hold-to-talk via Web Speech API (browser-native, zero latency)
- **Voice Memo Upload** — record on phone, upload audio file (mp3/m4a/wav/webm, up to 25MB)
- **Text Input** — traditional typing for quick corrections

### 2. AI-Powered Workout Generation (The Coach's Coach)

Sean follows the **NASM Optimum Performance Training (OPT) model** — a 5-phase periodization system used by certified trainers worldwide. SwanStudios bakes this protocol into every workout the AI generates:

| Phase | Name | Purpose | Reps | Sets | Tempo | Rest | Intensity |
|-------|------|---------|------|------|-------|------|-----------|
| 1 | Stabilization Endurance | Foundation, corrective exercise | 12-20 | 1-3 | 4/2/1 | 0-90s | 50-70% 1RM |
| 2 | Strength Endurance | Superset strength + stability | 8-12 | 2-4 | 2/0/2 | 0-60s | 70-80% 1RM |
| 3 | Hypertrophy | Muscle development | 6-12 | 3-5 | 2/0/2 | 0-60s | 75-85% 1RM |
| 4 | Maximal Strength | Heavy loading | 1-5 | 4-6 | X/0/X | 3-5min | 85-100% 1RM |
| 5 | Power | Explosive performance | 1-5 + 8-10 | 3-6 | X/0/X | 3-5min | 30-45% + 85-100% |

**The AI generates workouts that:**
- Match the client's current OPT phase
- Respect their injury history and pain entries (NASM Corrective Exercise Continuum)
- Use available equipment from the client's gym profile
- Follow proper tempo notation (eccentric/isometric/concentric)
- Calculate loads from estimated 1RM (Brzycki formula)
- Include warm-up, balance/core, and cool-down protocols

**Safety first:** The system runs a pain check before generation, cross-referencing active pain entries and PAR-Q clearance. If Jackie has a flagged left knee issue, the AI won't program deep lunges or heavy squats without corrective modifications.

**Coach-in-the-loop:** The AI generates a draft. Sean reviews, edits if needed, then approves. The AI never publishes a workout without trainer sign-off.

### 3. Automated Client Onboarding

When Sean picks up a new client, he shouldn't have to manually fill out forms, set up accounts, or configure training parameters. SwanStudios handles this with a two-path onboarding system:

#### Path A: SwanStudios Clients (Paid, Full-Service)
1. Sean opens the admin dashboard → "Add Client"
2. Enters basic info (name, email, phone)
3. Assigns a session package (purchased via Stripe)
4. The client receives an account with login credentials
5. Client completes the 8-step onboarding questionnaire (goals, health history, nutrition, lifestyle, training preferences, AI consent)
6. Sean performs a NASM movement screen (overhead squat assessment, postural analysis, PAR-Q+)
7. The AI auto-assigns an OPT phase based on assessment results
8. A personalized workout plan is generated automatically
9. The client is ready for their first session

#### Path B: Move Fitness Clients (Free, Progress-Tracking Only)
Sean's current employer is Move Fitness gym. Those clients use SwanStudios for progress tracking — they are NEVER charged through the platform. This is a critical business rule.

1. Sean creates a "stub" account (no password, marked as Move Fitness source)
2. Generates a **SWAN-XXXX invite code** (Crystalline Link Protocol)
3. Hands the client a QR code or texts them the claim link
4. Client scans QR → enters their SWAN code → sets a password
5. Account activates — they can now log in and view their progress
6. Sean logs their workouts via voice, and the client sees charts, XP, badges, and training history

**Key distinction:** Move Fitness clients have `clientSource: 'move_fitness'`. They are excluded from billing, session scheduling, and revenue reports. The admin dashboard shows a Move Fitness badge (Gilded Fern accent) for visual clarity.

#### The AI Onboarding Vision (In Progress)
The ultimate goal: Sean tells the AI:

> "I have a new client, Sarah, 35 years old, coming from Move Fitness. She wants to lose 20 pounds and has a history of lower back pain. She's a beginner."

And the AI:
- Creates the client profile
- Asks "SwanStudios or Move Fitness client?" and applies the correct business rules
- Sets up goals (weight loss, core stability)
- Flags the lower back pain entry
- Recommends starting at Phase 1 (Stabilization Endurance) with corrective emphasis
- Generates a starter workout plan
- Creates the SWAN claim code for the client to activate their account

### 4. The 840+ Exercise Database

SwanStudios has a production exercise library spanning 12 sources:

| Source | Count | Content |
|--------|-------|---------|
| Free Exercise DB | 501 | Full-body comprehensive library |
| NASM Advanced | 140 | Sliders, mini-bands, stability ball, BOSU, corrective |
| NASM Core | 55 | OPT protocol foundational exercises |
| Beachbody Insanity | 36 | Plyometric cardio, max interval |
| Beachbody Original | 26 | Insanity/T25 signature moves |
| Beachbody T25 | 19 | Focus T25 Alpha/Beta/Gamma |
| Beachbody Max:30 | 15 | Insanity Max:30 |
| P90X | 15 | P90X/P90X3 compound movements |
| Tae Bo | 10 | Martial arts cardio |
| Hip Hop Abs | 10 | Dance-based core work |
| Cize/Transform 20 | 10 | Dance fitness |
| Squat University | 3 | Mobility and squat mechanics |

Every exercise is tagged with:
- Muscle groups targeted
- Equipment required (15+ categories)
- Difficulty rating (50-900 scale)
- NASM phase compatibility
- XP earned on completion (default 10 XP)
- Source tracking for audit trail

### 5. Full Social Fitness Platform

SwanStudios is NOT just a trainer tool — it's a **fitness social media platform** where clients engage with each other, share achievements, and build community.

**Built and live:**
- **Social Feed** — Posts (text, workout, achievement, milestone, creative content)
- **Likes & Reactions** — Thumbs up, heart, swan (custom reaction)
- **Comments** — Threaded discussions on posts
- **Friends & Following** — Friend requests, discovery, mutual friends
- **Challenges** — Individual, team, and global fitness challenges with XP rewards
- **Vertical Reels** — Short-form video content
- **User Profiles** — Stats, badges, charts, social feed, achievement showcase
- **Communities** — Group spaces with events and discussions
- **Hashtags** — Trending topics and content discovery
- **Content Moderation** — Auto-flagging, user reports, admin review panel

**Planned:**
- Direct Messaging
- Live Streaming
- Creator Economy (monetization for content creators)

### 6. Gamification Engine (Octalysis Framework)

Every action in SwanStudios earns XP, drives leveling, and unlocks achievements:

**5-Tier Progression:**

| Tier | Name | Levels | Points | Theme |
|------|------|--------|--------|-------|
| 1 | Bronze Forge | 1-10 | 100-10K | Bronze metallic |
| 2 | Silver Edge | 11-25 | 10K-62.5K | Silver shimmer |
| 3 | Titanium Core | 26-50 | 62.5K-250K | Titanium gray |
| 4 | Obsidian Warrior | 51-99 | 250K-1M | Deep obsidian |
| 5 | Crystalline Swan | 100+ | 1M+ | Animated gradient |

**Point Awards:**
- Complete a workout session: 50 XP
- Complete an exercise: 10 XP
- Hit a personal record: 100 XP
- 7-day streak: 75 XP bonus
- 30-day streak: 300 XP bonus
- Social post: 15 XP
- Referral: 200 XP

**Badge System:** 4 rarity levels (Common, Rare, Epic, Legendary) across 6 skill trees (Awakening, Forge NASM, Iron & Gravity, The Tribe, Free Spirit, The Unbroken). Level-up triggers animated celebrations with particle bursts and tier-colored glow effects.

**Ethical safeguards:** An EthicalGamification service prevents exploitative patterns — no dark-pattern pressure, no loss-aversion manipulation.

### 7. E-Commerce & Session Packages

SwanStudios monetizes through session package sales:
- **Stripe integration** for secure payment processing
- **Shopping cart** with package selection
- **Session allocation** — purchasing a package credits sessions to the client's account
- **Automatic deduction** — logging a workout decrements available sessions
- **Cancellation policies** — late cancellation fees with configurable windows
- **Order history** and receipt generation

### 8. Analytics & Progress Tracking

**50-chart Victory analytics gallery** covering:
- Line charts (weight progression, strength 1RM, cardio, session frequency)
- Bar charts (weekly volume, exercise comparison, trainer workload)
- Radar charts (muscle group balance, fitness assessment)
- Heatmaps (workout calendar, hourly activity, muscle recovery)
- Scatter plots (volume vs intensity, attendance vs progress)
- Gauges (goal progress, session quota, nutrition targets)

Victory was chosen specifically for cross-platform compatibility — the identical API works in React web and React Native, enabling the future mobile app.

### 9. Scheduling & Calendar

- Session booking with trainer availability matching
- Recurring session scheduling (RRule support, up to 52 occurrences)
- Cancellation and rescheduling workflows
- Email/SMS notifications for session events
- Trainer capacity management and conflict detection

### 10. Content Studio

- **Remotion-powered video generation** with 8 built-in templates (workout intros, exercise demos, client highlights, brand reveals, schedule boards, NASM phase explainers)
- **AI video generation** via Kling 3.0 integration
- **Voice synthesis** via ElevenLabs
- **Exercise-to-video coverage tracker** for identifying content gaps

### 11. Swan Oracle (Research Feed)

- **SerpAPI integration** for real-time fitness research
- Google Scholar (exercise science papers)
- Google News (fitness industry updates)
- YouTube (training video discovery)
- Google Trends (fitness market intelligence)
- Admin/Trainer only — powers teaching widgets and social content

### 12. Canada Immigration Tracker (Admin-Only)

A personal immigration management tool for Sean and his wife's Canada immigration journey — task tracking, document management, CRS score calculation, study progress, and budget tracking.

---

## Target Market

### Primary: Personal Training Clients (Anaheim Hills / Orange County)
- **General population** seeking professional training
- **Golf performance clients** — wealthy demographic, rotational power, mobility, injury prevention (strategic target)
- **Move Fitness gym members** — Sean's current employer clients, onboarded for free progress tracking

### Secondary: Platform Growth
- **Self-sourced SwanStudios clients** — Sean's own business, independent of Move Fitness
- **Fitness enthusiasts** joining the social community
- **Other trainers** (future multi-trainer support)

---

## Technical Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript + Vite | SPA with styled-components |
| Backend | Node.js + Express | REST API server |
| Database | PostgreSQL + Sequelize | Data persistence |
| AI Providers | Gemini Flash, OpenAI GPT-4o-mini, Anthropic Claude, Venice | Multi-provider failover chain |
| Payments | Stripe | Session package purchases |
| Voice | Web Speech API + Gemini multimodal | Browser dictation + audio file transcription |
| Charts | Victory v37 | Cross-platform analytics (web + future React Native) |
| Video | Remotion + Kling + ElevenLabs | Content creation |
| Search | SerpAPI | Research feed |
| Hosting | Render (Professional plan) | Auto-deploy from main branch |
| Real-time | Socket.io | Notifications, gamification events, presence |
| Theme | Crystalline Swan (Enchanted Apex) | Dark-first luxury aesthetic |

### AI Privacy Architecture (Identity-Blind)
- Client names, emails, and phone numbers are **stripped before the AI sees them**
- The AI works with `[Client #ID]` references — it knows fitness data but never identity
- AI responses are scrubbed for any leaked identity data before the client sees them
- Consent is tracked per-user with version control
- All AI features require explicit opt-in

### Design System: Enchanted Apex — Crystalline Swan
A dark-first luxury aesthetic inspired by frozen enchanted forests and deep-ocean vaults:
- **Near-black backgrounds** with luminous cyan and purple accents
- **Midnight Sapphire `#002060`** — primary navy
- **Wing Purple `#8B5CF6`** — button backgrounds, focus rings
- **Ice Wing `#60C0F0`** — gaming accents, XP bars, data highlights
- **Gilded Fern `#C6A84B`** — luxury gold accent
- **Typography:** Plus Jakarta Sans, Cormorant Garamond (drama), Fira Code (data), Sora (UI)

---

## The End-State Vision

When SwanStudios reaches its full potential, Sean's daily workflow looks like this:

**Morning:** Open the admin dashboard. The AI has already flagged which clients are due for phase progression, whose packages are expiring, and who missed their streak. Overnight, the gamification engine sent push notifications encouraging clients to maintain their streaks.

**During sessions:** Sean focuses entirely on coaching. Between sets, he speaks into his phone: "Marcus just hit 225 on bench for 3 reps — new PR." The AI logs it, awards 100 XP for the PR, and updates Marcus's 1RM calculation. Marcus sees the level-up animation on his phone that evening.

**Between sessions:** A new client walks up. Sean says: "New client, David, 42, golfer, wants to improve his rotational power and fix his lower back. SwanStudios client, Platinum package." The AI creates the profile, runs through the initial assessment questions, and generates a Phase 1 corrective program focused on rotational stability and hip mobility.

**Evening:** Sean reviews the content studio, where Remotion has auto-generated an exercise demo reel from today's sessions. He posts it to the social feed. Three clients comment, earning social XP. The leaderboard updates.

**End of month:** The analytics dashboard shows client retention at 94%, average workout completion at 87%, and revenue up 12% from new golf clients. The Swan Oracle feed surfaces a new study on rotational power training that Sean shares with his golf clients.

**The result:** Sean runs a premium personal training business with the administrative overhead of a hobby. The AI handles the paperwork. The platform handles the community. Sean handles the coaching.

---

## What Makes SwanStudios Different

1. **Voice-first by design** — Built for trainers who have their hands full, not sitting at a desk
2. **NASM protocol embedded** — Not just a workout tracker, but a system that enforces proper periodization
3. **Two-tier client architecture** — Handles the reality that trainers work at gyms AND build their own roster
4. **Identity-blind AI** — Client privacy is architecturally guaranteed, not just policy
5. **Social platform built-in** — Clients don't just track workouts, they're part of a community
6. **Gamification that matters** — XP and badges tied to real training milestones, not vanity metrics
7. **Cross-platform ready** — Victory charts chosen specifically for React Native mobile app migration
8. **Luxury aesthetic** — The Crystalline Swan theme signals premium positioning to golf clients and high-end demographics

---

## Metrics That Matter

| KPI | Description | Target |
|-----|-------------|--------|
| Voice Log Success Rate | % of voice inputs correctly parsed into workout logs | >95% |
| Client Onboarding Time | Minutes from "new client" to "first workout plan generated" | <10 min |
| Workout Logging Time | Seconds to log a full session via voice | <60s |
| Client Retention | Monthly retention rate | >90% |
| Session Completion Rate | % of scheduled sessions actually completed | >85% |
| AI Draft Approval Rate | % of AI-generated workouts approved without edits | >80% |
| Daily Active Users | Clients logging in and engaging with the platform daily | Growing |
| Social Engagement | Posts, comments, likes per active user per week | >3 |
| Revenue Per Client | Average monthly revenue per SwanStudios client | Increasing |

---

---

## AI Village Review (2026-03-28)

### Gemini 3.1 Pro (CTO / Lead Design Authority) Assessment

**Verdict:** "An absolute juggernaut of a platform. The integration of Sean's 25-year NASM expertise with a voice-first AI pipeline and Octalysis gamification is a massive differentiator."

**Key Feedback:**

1. **Risk of Feature Bloat** — A platform trying to be a social network, content studio, e-commerce hub, AND AI trainer simultaneously risks degraded UX and diluted luxury appeal. Solution: phase the rollout.

2. **Missing: "Gym Floor" vs "Vault" UX Paradigms** — The trainer UX (noisy gym, one-handed, between sets) is drastically different from the client UX (evening review, luxury feel). Both need distinct design treatments.

3. **Missing: Offline/Degraded State Strategy** — Gyms have spotty WiFi. Voice logging MUST have local-first caching (Service Workers/IndexedDB) with a "Syncing to Crystalline Vault" UI state when reconnecting.

4. **Missing: Micro-Interactions for AI Latency** — The 18-step AI pipeline takes time. Need bespoke branded loading states (crystalline swan forming, terminal-style NASM checks) instead of generic spinners.

**Gemini's Top 3 Priorities:**
1. **Voice-First AI Logging Engine** — The core unique value proposition. Must be flawless.
2. **Client "Crystalline Vault" Dashboard & Gamification** — Premium OC clients need to see their value immediately.
3. **Frictionless Onboarding & E-Commerce** — QR codes + Stripe in under 60 seconds.

### Claude Opus 4.6 (CEO) Ruling

I concur with Gemini's assessment with the following refinements:

1. **Feature bloat concern is valid but context-dependent.** The social platform, gamification, and e-commerce are already BUILT. The priority is making the core voice-logging and onboarding flows FLAWLESS, not deleting existing features. Gemini is right that engineering cycles should focus on Priority 1 (voice logging) before adding NEW features.

2. **Offline strategy is a Phase 2 concern.** Sean is currently training at Move Fitness in Anaheim Hills — he has reliable WiFi. Offline-first is important for the mobile app roadmap but should not block current priorities.

3. **The two UX paradigms (Gym Floor vs Vault) are already partially implemented.** The admin dashboard (trainer UX) has the embedded AITerminalPanel with voice input. The client dashboard has the gamification/progress view. These need refinement, not a ground-up redesign.

**CEO Priority Stack (Immediate):**
1. Voice-to-log pipeline end-to-end polish (parsing accuracy, confidence scores, pain flag reliability)
2. Client onboarding automation via AI (voice command: "new client, [details]" → profile + plan)
3. Move Fitness client batch onboarding (get Sean's full roster into the system)
4. Workout logging UI refinement for gym-floor use (large touch targets, haptic feedback, voice confirmation)

---

*This document is the single source of truth for what SwanStudios is, what it does, and where it's going. Every feature, fix, and design decision should be evaluated against this vision.*

*Built by Sean Swan. Powered by AI. Designed for trainers who'd rather coach than type.*
