# CLAUDE.md - SwanStudios Project Intelligence

## Project Overview
SwanStudios (SS-PT) is a production personal training SaaS platform deployed on Render (sswanstudios.com).
- **Stack:** React 18 + TypeScript + styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL (backend)
- **Theme:** Enchanted Apex: Crystalline Swan (frozen enchanted forest + deep-ocean luxury vault + competitive arena)
- **RETIRED:** Galaxy-Swan theme (cosmic gradients, `#0a0a1a`, `#00FFFF`, `#7851A9`) — do NOT use these tokens for new work
- **Active Palette:**
  - Midnight Sapphire `#002060` (Primary — logo deep navy, blue button background)
  - Royal Depth `#003080` (Surface — logo circle background, elevated cards)
  - Ice Wing `#60C0F0` (Cyan Glow — glow on purple buttons, XP bars, gaming accents)
  - Arctic Cyan `#50A0F0` (Data Only — charts, data viz, cold metrics. NOT for buttons/glow)
  - Gilded Fern `#C6A84B` (Luxury Accent — gold contrast)
  - Frost White `#E0ECF4` (Background — logo head highlight)
  - Swan Lavender `#4070C0` (Tertiary — logo mid-body purple-blue)
  - Wing Purple `#8B5CF6` (Glow Accent — purple button bg, glow on blue buttons, focus rings, hover states)
  - Abyssal Navy `#001840` (WCAG Dark — compliant dark backgrounds)
  - Obsidian Black `#0A0A0F` (Deep Dark — primary dark background, replaces heavy blue gradients)
  - Carbon `#141419` (Card Dark — card/panel backgrounds on dark surfaces)
  - Graphite `#1A1A24` (Surface Dark — elevated surfaces, modals, drawers)
- **Dual-Button Glow System:**
  - Blue buttons (`#002060` bg) → Wing Purple `#8B5CF6` glow
  - Purple buttons (`#8B5CF6` bg) → Ice Wing Cyan `#60C0F0` glow
  - Cosmic Nebula gradient (`#8B5CF6 → #60C0F0`) → for premium/hero CTAs
  - This breaks up solid-blue monotony and reflects both logo colors
- **Typography:** Headings: "Plus Jakarta Sans". Drama: "Cormorant Garamond" Italic. Data: "Fira Code". UI/Gaming: "Sora"
- **Rarity System:** Common=Swan Lavender, Rare=Gilded Fern, Epic=Wing Purple, Legendary=animated gradient (sapphire→purple→cyan→gold)

## Build & Run
- **Local dev (MANDATORY workflow):** `npm run dev` (from project root — runs backend + frontend concurrently, auto-opens browser)
- **Local dev + MCP:** `npm run dev:full` (backend + frontend + MCP servers)
- **Frontend build:** `cd frontend && npm run build` (Vite)
- **Backend only:** `cd backend && node server.mjs`
- **Tests (frontend):** `cd frontend && npx vitest run --reporter verbose`
- **Tests (backend):** `cd backend && npm test`
- **Type check:** `cd frontend && npx tsc --noEmit`

## Local-First Development Workflow (MANDATORY)
**All changes MUST be tested locally before committing.** This is the standard workflow:

1. **Develop locally** — Run `npm run dev` from project root. Backend (nodemon:10000) + Frontend (vite:5173) start together with hot-reload. Browser opens automatically.
2. **Test & verify** — Fix bugs, test features, confirm everything works at `http://localhost:5173`. Local dev connects to the production Render PostgreSQL database via `DATABASE_URL` for full data parity.
3. **Commit only when working** — Only commit and push once the fix/feature is verified locally. No pushing broken code to trigger 7-minute Render deploys for testing.

### Local Dev Architecture
- **Frontend:** Vite dev server on port 5173 with `/api` proxy to backend
- **Backend:** Nodemon on port 10000 with auto-restart on file changes
- **Database:** Connects to production Render PostgreSQL via `DATABASE_URL` (same data as production)
- **CORS:** `localhost:5173` is whitelisted in backend CORS config
- **Parity guarantee:** Local dev hits the same database as production — if it works locally, it works in production

### Database-Only vs Code Fixes
- **Database fixes** (ALTER TABLE, FK constraints, adding columns) apply directly to production DB and take effect immediately — no commit/deploy needed
- **Code fixes** (route logic, model changes, frontend components) require commit + push + Render deploy (~7 minutes)
- When fixing issues, identify whether the fix is database-level or code-level to choose the fastest path

## Co-Orchestrator: Gemini 3.1 Pro (Lead Design Authority)
Gemini 3.1 Pro is the Lead Design Authority for SwanStudios. Claude Opus 4.6 is the CEO with FINAL authority:
- **Gemini designs, Claude implements.** Gemini's design opinions are authoritative on aesthetics.
- **Opus 4.6 (CEO) overrides ALL decisions** — Gemini is CTO, Sonnet is VP Engineering. Opus reviews and ratifies.
- **Consult Gemini before major UI/UX plans:** `node scripts/consult-gemini.mjs --plan "plan text"`
- **Get design specs:** `node scripts/consult-gemini.mjs --design "component description"`
- **Design review:** `node scripts/consult-gemini.mjs --review --file path/to/component.tsx`
- **Ask questions:** `node scripts/consult-gemini.mjs --ask "design question"`
- **CEO debate:** `node scripts/consult-gemini.mjs --ask "Round N: [CEO position]"` (Opus ↔ Gemini, max 5 rounds)
- Output saves to `AI-Village-Documentation/gemini-consults/latest.md`
- **IMPORTANT:** Do NOT use Flash 2.5 or any other model's design vision. Gemini 3.1 Pro creates from scratch.
- **IMPORTANT:** Always verify Gemini's recommendations against CLAUDE.md. Gemini sometimes references the RETIRED Galaxy-Swan theme — reject and correct.

## Key Directories
- `frontend/src/components/` - React components (styled-components, NO MUI)
- `backend/routes/` - Express API routes
- `backend/models/` - Sequelize models (PostgreSQL)
- `backend/migrations/` - Database migrations (.cjs files)
- `docs/ai-workflow/` - AI coordination docs, blueprints, handoff protocols

## Code Conventions
- **No Material-UI** - All UI uses styled-components with Crystalline Swan theme tokens
- **44px minimum touch targets** on all interactive elements (mobile-first)
- **10-breakpoint responsive matrix:** 320px, 375px, 430px, 768px, 1024px, 1280px, 1440px, 1920px, 2560px, 3840px
- **Blueprint-first development** - Architecture docs before code (see `docs/ai-workflow/blueprints/`)
- **7-Star Documentation Standard** - See section below (MANDATORY for all files)
- **No-Monolith File Rule** - Max 300 lines of code per file (see section below)
- **RBAC enforcement** - Admin/Trainer/Client role isolation on all endpoints
- **NASM OPT Protocol** - All workouts follow 5-phase periodization model (see section below)

## Git Workflow
- Deploy target: Render auto-deploys from `main` branch
- Commit style: `type(scope): description` (e.g., `fix(schedule): enterprise audit P0 fixes`)
- Always push to trigger Render deploy after commits

---

## Blueprint-First Protocol (MANDATORY)

Every major component (>100 lines) MUST have a blueprint comment block at the top of the file. This is the guardrail that prevents "vibe coding" as the project grows across multiple AI agents.

### What Goes in the Blueprint
1. **Component name, purpose, owner, last validation date**
2. **ASCII wireframe** showing the visual layout
3. **Data flow** (props in, state, API calls, events, children)
4. **Architecture diagram** (Mermaid-style component tree)

### Blueprint Format (Main Components)
```
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: [Name]                                           ║
 * ║  PURPOSE: [One-line description]                              ║
 * ║  OWNER: [AI/person who last modified]                         ║
 * ║  LAST VALIDATED: [Date of last AI Village run]                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────┐
 * │ [Visual layout of the component]       │
 * └────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { ... }
 * State:     { ... }
 * API Calls: GET /api/..., POST /api/...
 * Events:    customEventName
 * Children:  SubComponent1, SubComponent2
 *
 * ARCHITECTURE:
 * graph TD
 *   A[Parent] --> B[Child1]
 *   A --> C[Child2]
 */
```

### Sub-Component Blueprint (shorter)
```
/**
 * ┌─── SUB-COMPONENT: [Name] ──────────────────────┐
 * │ PARENT: [ParentComponent]                        │
 * │ PURPOSE: [What it does]                          │
 * │ WIREFRAME: [ASCII layout]                        │
 * │ Props: { ... }                                   │
 * └──────────────────────────────────────────────────┘
 */
```

### Enforcement Rules
- **No component >100 lines may exist without a blueprint header**
- **When modifying a component, update its blueprint FIRST**
- **Sub-components reference their parent's blueprint**
- **AI Village validation checks for blueprint presence**
- **Master prompt V1:** `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT.md`
- **Master prompt V2 (CURRENT):** `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md`

### Embedded AI Terminal Architecture
The AI assistant is **embedded into every admin dashboard tab** at the top of the content area (not a floating drawer). Each tab auto-sets the AI context based on its data domain. The floating FAB remains for non-admin pages.

| Dashboard Tab | AI Context | Tab Route |
|--------------|------------|-----------|
| Overview | `general` | `/dashboard/default` |
| Schedule | `scheduling` | `/dashboard/schedule` |
| Training Sessions | `workout_generation` | `/dashboard/admin-sessions` |
| Client Progress | `progress_analysis` | `/dashboard/client-progress` |
| Client Management | `client_review` | `/dashboard/client-management` |
| NASM Exercises | `exercise_library` | `/dashboard/nasm-exercises` |
| Reports | `data_analysis` | `/dashboard/reports` |

### NASM Exercise Database (V3 — 840+ Exercises)
- **840 production exercises** across 12 sources:
  | Source | Count | Content |
  |--------|-------|---------|
  | `free-exercise-db` | 501 | Chest, back, shoulders, arms, legs, core, olympic, cardio, full body, stretching |
  | `nasm-advanced` | 140 | Sliders/gliding discs, mini-bands, long bands, stability ball, BOSU, medicine ball, corrective exercises |
  | `nasm` | 55 | Core NASM OPT protocol exercises |
  | `beachbody` | 26 | Original Insanity/T25 signature moves |
  | `beachbody-insanity` | 36 | Insanity Pure Cardio, Plyometric Cardio, Max Interval |
  | `beachbody-t25` | 19 | Focus T25 Alpha/Beta/Gamma |
  | `beachbody-max30` | 15 | Insanity Max:30 |
  | `beachbody-hiphopabs` | 10 | Hip Hop Abs |
  | `beachbody-transform20` | 10 | Cize + Transform 20 |
  | `p90x` | 15 | P90X / P90X3 |
  | `taebo` | 10 | Tae Bo martial arts cardio |
  | `squat-university` | 3 | Mobility/squat mechanics |
- **10 filter chips:** All, Chest, Back, Shoulders, Arms, Legs, Core, Full Body, Cardio, Recovery
- **15+ equipment categories:** Barbell, Dumbbell, Cable, Machine, Bodyweight, Kettlebell, Resistance Band, Mini Band, Stability Ball, Medicine Ball, BOSU Ball, Sliders, Landmine, TRX/Suspension Trainer, Cardio Equipment, None
- **Difficulty scale:** 50-900 (50=beginner stretching, 500=intermediate, 900=elite/advanced)
- **Source tracking:** Every exercise tagged with origin source for audit trail
- **Autocomplete Rolodex UI:** `frontend/src/components/DashBoard/Pages/admin-exercises/` — react-window virtualized, ExerciseSearchBar with dropdown z-index fix
- **Draft Mode RBAC:** Admin creates = active+global. Trainer creates = draft+trainer. Drafts blocked from production logs until approved.
- **Admin custom exercise management:** Only admins can create/edit/soft-delete custom exercises. Seeded exercises are read-only.
- **Seeder files (run in order):**
  1. `backend/seeders/20250503-seed-nasm-exercises.mjs` (13 original)
  2. `backend/seeders/20260228-seed-nasm-comprehensive-exercises.mjs` (55 NASM)
  3. `backend/seeders/20260321-seed-expanded-exercises.mjs` (85 Beachbody/Tae Bo/bands/KB)
  4. `backend/seeders/20260321-seed-free-exercise-db.mjs` (501 comprehensive)
  5. `backend/seeders/20260322-seed-nasm-advanced-equipment.mjs` (151 sliders/bands/BOSU/corrective)
  6. `backend/seeders/20260322-seed-beachbody-expanded.mjs` (106 Insanity/T25/Max30/P90X/HipHopAbs/Transform20)
- **Exercise → Gamification link:** Every exercise has `experiencePointsEarned` (default 10 XP). Completing exercises in workouts triggers the gamification engine for point awards.
- Full database spec: `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md` (Appendix C)

---

## 7-Star Documentation Standard (MANDATORY)

Every file in the codebase MUST follow this documentation pattern. Junior developers must understand every component without asking anyone.

### Level 1: File Header (ALL files)
```typescript
/**
 * ============================================================================
 * FILE: ComponentName.tsx
 * PURPOSE: [One clear sentence]
 * AUTHOR: [Creator] | LAST MODIFIED: [Date]
 * AI VILLAGE VALIDATED: [Date]
 * ============================================================================
 *
 * WHAT THIS FILE DOES: [2-3 sentences in plain English]
 * HOW IT FITS IN THE APP: Parent → Children → Data flow
 * KEY DECISIONS: [Why approach X over Y]
 * NASM PROTOCOL CONTEXT: [OPT phase relevance, if any]
 */
```

### Level 2: Section Comments (every logical section)
```typescript
// ─────────────────────────────────────────────────────────────
// SECTION: [Name]
// PURPOSE: [What this section does]
// WHY: [Non-obvious architectural reasoning]
// ─────────────────────────────────────────────────────────────
```

### Level 3: Inline Comments (non-obvious logic only)
```typescript
// Brzycki formula: estimated1RM = weight / (1.0278 - 0.0278 × reps)
// More accurate than Epley for 1-10 rep range (NASM standard)
```

### Level 4: Function Docs (all exported functions)
```typescript
/**
 * [Description]. [WHY this approach]. @param / @returns / @example
 */
```

### Level 5: Blueprint Header (components >100 lines)
See Blueprint-First Protocol above.

---

## No-Monolith File Rule (MANDATORY)

**No single file may exceed 300 lines of code (excluding comments and blank lines).**

### Why
- Monolith files cause merge conflicts in multi-AI development
- Files >300 lines exceed reasonable context window reasoning
- Smaller files = faster AI Village validation

### Decomposition Strategy
When a component approaches 300 lines:
1. **Extract sub-components** — JSX inside `.map()` → own file
2. **Extract hooks** — Data fetching, state machines → `use[Feature].ts`
3. **Extract utils** — Pure functions → `utils/[feature].ts`
4. **Extract types** — Shared interfaces → `[Feature]Types.ts`
5. **Extract constants** — Config, defaults → `[Feature]Constants.ts`
6. **Extract styled components** — When >5 styled components → `[Feature]Styles.ts`

### Exceptions
- Migration/seed data files (sequential SQL / large datasets)
- Type definition files (many interfaces)
- Test files (test suites can be long)

---

## NASM OPT Protocol (MANDATORY for Workout Features)

All workout generation, logging, and planning MUST follow the NASM Optimum Performance Training (OPT) model.

### 5-Phase Periodization
| Phase | Name | Reps | Sets | Tempo | Rest | %1RM |
|-------|------|------|------|-------|------|------|
| 1 | Stabilization Endurance | 12-20 | 1-3 | 4/2/1 | 0-90s | 50-70% |
| 2 | Strength Endurance | 8-12 | 2-4 | 2/0/2 | 0-60s | 70-80% |
| 3 | Hypertrophy | 6-12 | 3-5 | 2/0/2 | 0-60s | 75-85% |
| 4 | Maximal Strength | 1-5 | 4-6 | X/0/X | 3-5min | 85-100% |
| 5 | Power | 1-5/8-10 | 3-6 | X/0/X | 3-5min | 30-45%/85-100% |

### Tempo Notation
`Eccentric/Isometric/Concentric` — e.g., "4/2/1" = 4s lowering, 2s hold, 1s lifting

### 1RM Formula (Brzycki)
`estimated1RM = weight / (1.0278 - 0.0278 × reps)` — valid for 2-10 reps

### AI Workout Generation Rules
- AI MUST know client's current OPT phase before generating workouts
- All generated exercises include: sets, reps, weight (from 1RM × phase %), tempo, rest
- Phase 5 uses superset format: strength exercise (85-100%) + power exercise (30-45%)

### NASM Calculators
4 built-in calculators (no leaving the app): 1RM, Calorie/TDEE, Body Fat %, BMI
- Full specs: `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md` (Sections 6-7)

---

## Gamification & Badge System (MANDATORY)

SwanStudios has a production-grade gamification engine built on the **Octalysis Framework**. Every workout, social action, and milestone triggers point awards that drive leveling, badges, and tier progression.

### Leveling Algorithm
- **Formula:** `level = floor(0.1 × sqrt(totalPoints))`
- **Inverse:** `pointsForLevel = ceil((level / 0.1)²)`
- **Implementation:** `backend/utils/levelingAlgorithm.mjs`

### 5-Tier Progression System
| Tier | Name | Levels | Points Required | Theme Color |
|------|------|--------|-----------------|-------------|
| 1 | Bronze Forge | 1-10 | 100 – 10,000 | `#CD7F32` |
| 2 | Silver Edge | 11-25 | 10,000 – 62,500 | `#C0C0C0` |
| 3 | Titanium Core | 26-50 | 62,500 – 250,000 | `#878681` |
| 4 | Obsidian Warrior | 51-99 | 250,000 – 1,000,000 | Obsidian Black `#0A0A0F` |
| 5 | Crystalline Swan | 100+ | 1,000,000+ | Animated gradient (sapphire→purple→cyan→gold) |

### Point Awards (Configurable via GamificationSettings)
| Action | Base Points | Context |
|--------|-------------|---------|
| Complete Workout | 50 | Per logged workout session |
| Complete Exercise | 10 | Per exercise in workout log |
| Personal Record | 100 | New 1RM or volume PR |
| Daily Login | 10 | Once per day |
| 3-Day Streak | 25 | Bonus on streak milestone |
| 7-Day Streak | 75 | Bonus on streak milestone |
| 30-Day Streak | 300 | Bonus on streak milestone |
| 90-Day Streak | 1,000 | Bonus on streak milestone |
| 365-Day Streak | 5,000 | Bonus on streak milestone |
| Social Post | 15 | Creating content on social feed |
| Review/Comment | 15 | Engaging with community |
| Referral | 200 | Bringing new users |
| Education Module | 50 | Completing NASM learning content |

### Badge & Achievement System
- **4 rarity levels** with visual glow mapping:
  | Rarity | Color | Glow | XP Multiplier |
  |--------|-------|------|----------------|
  | Common | Swan Lavender `#4070C0` | Subtle pulse | 1.0x |
  | Rare | Gilded Fern `#C6A84B` | Gold shimmer | 1.5x |
  | Epic | Wing Purple `#8B5CF6` | Purple aurora | 2.0x |
  | Legendary | Animated gradient | Full particle burst | 3.0x |
- **6 skill trees:** Awakening, Forge NASM, Iron & Gravity, The Tribe (social), Free Spirit, The Unbroken (streaks)
- **6 achievement categories:** fitness, social, streak, milestone, special, community
- **Badge art:** 20+ styles in `frontend/public/badges/` (claymation, glass, metallic, crystal, holographic, neon, steampunk, etc.)
- **Badge manifest:** `frontend/public/badge-manifest.json` + `frontend/public/badges/achievements/achievement-badge-manifest.json`

### Level-Up Animation Protocol (MANDATORY)
When a user levels up or earns a badge, the UI MUST trigger:
1. **Background glow pulse** — Tier-colored radial gradient expands from center over 2s (`@keyframes tierGlowPulse`)
2. **Particle burst** — 12-20 particles in rarity color emit from badge icon, fade over 1.5s
3. **Badge entrance** — Scale from 0→1.1→1.0 with 0.6s spring easing + rarity-colored box-shadow glow
4. **XP counter animation** — Count-up from previous XP to new XP with `requestAnimationFrame`
5. **Streak fire** — On streak milestones (7, 30, 90, 365), animated fire/ice particles around streak counter
- Animation components: `frontend/src/components/DashBoard/Pages/admin-exercises/styles/gamificationAnimations.ts`
- Celebration component: `frontend/src/components/DashBoard/Pages/admin-exercises/components/AdminAchievementCelebration.tsx`
- **Performance:** All animations MUST use `transform` and `opacity` only (GPU-composited). No `width`/`height`/`top`/`left` animations.

### Backend Architecture
| Layer | File | Purpose |
|-------|------|---------|
| Model | `backend/models/Achievement.mjs` | Achievement definitions (484 lines) |
| Model | `backend/models/UserAchievement.mjs` | User progress tracking (541 lines) |
| Model | `backend/models/Gamification.mjs` | Per-user XP/level/tier state |
| Model | `backend/models/GamificationSettings.mjs` | Singleton config (point values, multipliers) |
| Engine | `backend/services/gamification/GamificationEngine.mjs` | Core points/achievement/tier logic |
| Persistence | `backend/services/gamification/GamificationPersistence.mjs` | DB persistence layer |
| Ethics | `backend/services/gamification/EthicalGamification.mjs` | Prevents exploitative patterns |
| Controller | `backend/controllers/gamificationController.mjs` | 25+ API endpoints |
| Routes | `backend/routes/gamificationRoutes.mjs` | REST API routes |

### Frontend Architecture
| Layer | File | Purpose |
|-------|------|---------|
| Redux | `frontend/src/redux/slices/gamificationSlice.ts` | State management |
| Types | `frontend/src/types/gamification.ts` | TierName, SkillTree, Rarity enums |
| Hub | `frontend/src/components/AdvancedGamification/AdvancedGamificationHub.tsx` | Main gamification UI |
| Badge Gallery | `frontend/src/components/BadgeGallery/BadgeArtGallery.tsx` | Admin badge browser |
| Admin | `frontend/src/components/DashBoard/Pages/admin-gamification/` | Admin gamification management |
| Client | `frontend/src/components/DashBoard/Pages/client-gamification/` | Client gamification view |
| Trainer | `frontend/src/components/DashBoard/Pages/trainer-gamification/` | Trainer gamification view |

### Gamification Integration Rules (MANDATORY)
- **Workout logging MUST trigger gamification:** When a workout is saved, call `GamificationEngine.awardPoints()` with action type and exercise count
- **Social posts MUST trigger gamification:** Creating a post, comment, or like awards social points
- **Badge checks run after every point award:** The engine checks if any achievement criteria are newly met
- **Leaderboards refresh on point changes:** Global, friends, category leaderboards update in real-time
- **Admin can adjust all point values** via GamificationSettings without code changes
- **Never award points for the same action twice** — use idempotency keys (userId + actionType + timestamp)

---

## Chart & Analytics System (MANDATORY)

SwanStudios uses **Victory** (v37.3.6) as the sole charting library for cross-platform compatibility (React web → React Native for App Store/Google Play).

### Library: Victory Only
| Library | Version | Purpose |
|---------|---------|---------|
| **Victory** | 37.3.6 | ALL charts — gallery, dashboards, analytics, profiles |
- **Why Victory:** Identical API between `victory` (web) and `victory-native` (React Native) — critical for mobile app roadmap
- **No Recharts for new work** — Legacy Recharts charts should be migrated to Victory over time

### 50-Chart Victory Gallery
Located in `frontend/src/components/Charts/` with bento-box layout:

| Category | Charts | Types |
|----------|--------|-------|
| Line | 5 | Weight progression, strength 1RM, cardio, session frequency, body fat trend |
| Bar | 5 | Weekly volume, exercise comparison, monthly revenue, client retention, trainer workload |
| Radar | 6 | Muscle group balance, fitness assessment, client engagement, nutrition, trainer skills |
| Pie/Donut | 5 | Macros, session types, revenue source, demographics, exercise types |
| Heatmap | 5 | Workout calendar (GitHub-style), hourly activity, muscle recovery, check-ins, intensity |
| Area | 5 | Training load, body composition, revenue stream, workout duration, calorie burn |
| Stream | 5 | Exercise frequency, client flow, mood/energy, OPT phase progression, nutrient intake |
| Funnel | 5 | Sales conversion, client onboarding, session booking, goal achievement, completion rates |
| Scatter | 5 | Volume vs intensity, attendance vs progress, price vs retention, age vs performance, rest vs recovery |
| Bullet/Gauge | 5 | Goal progress, session quota, revenue target, client capacity, nutrition goal |

- **Theme file:** `frontend/src/components/Charts/chartTheme.ts` (Crystalline Swan palette)
- **Error boundary:** `frontend/src/components/Charts/SafeChart.tsx` (per-chart isolation)
- **Animation config:** 800ms, cubicInOut easing
- **Color palettes:** `FULL_PALETTE`, `MACRO_PALETTE`, `STREAM_PALETTE`

### Chart → Profile Integration (NOT YET CONNECTED)
**TODO: Charts must be connected to client and user profile dashboards.**
- User profiles MUST display selected workout charts (since this is a social media platform)
- Each user/client can **toggle which charts are visible** on their public profile via privacy settings
- Chart visibility settings stored in user preferences: `chartVisibility: { [chartId]: boolean }`
- Default visible charts for new users: Weight Progression, Workout Heatmap, Muscle Group Radar, Goal Progress Gauge
- Admin can see ALL charts for any client regardless of client privacy settings
- Chart data comes from workout logs → analytics service → Victory/Recharts components

### Chart Visibility Toggle UI
```
┌─ Profile Settings → Chart Visibility ──────────────┐
│ ☑ Weight Progression    ☑ Workout Heatmap           │
│ ☑ Muscle Group Radar    ☐ Body Fat Trend            │
│ ☑ Goal Progress         ☐ Strength 1RM              │
│ ☐ Calorie Burn          ☑ Session Frequency          │
│                                                      │
│ [Save] [Preview Profile]                             │
└──────────────────────────────────────────────────────┘
```

### Recharts Dashboard Analytics
Located across dashboard pages — admin-specific panels that do NOT appear on public profiles:
- `frontend/src/components/ClientProgressCharts/` — Strength, body comp, 1RM, volume, form quality, consistency heatmap
- `frontend/src/components/FitnessStats/` — Bar progress, radar, area charts
- `frontend/src/components/Reports/` — Report analytics, data visualization, metrics panels
- `frontend/src/components/UniversalMasterSchedule/Charts/` — Trainer performance, session distribution, revenue
- `frontend/src/pages/workout/components/progress/` — Weekday bar, skill radar, intensity trend, muscle group, exercise type

---

## Social Media Platform (MANDATORY)

SwanStudios is NOT just a PT app — it is a **fitness social media platform**. Every feature must consider the social layer.

### Core Social Features
| Feature | Frontend | Backend Model | Status |
|---------|----------|---------------|--------|
| Social Feed | `frontend/src/components/Social/Feed/` | `backend/models/social/SocialPost.mjs` | Built |
| Posts (text, workout, achievement, milestone) | `CreatePostCard.tsx`, `PostCard.tsx` | `SocialPost.mjs` | Built |
| Likes/Reactions (thumbs_up, heart, swan) | In PostCard | `backend/models/social/SocialLike.mjs` | Built |
| Comments | In PostCard | `backend/models/social/SocialComment.mjs` | Built |
| Friends/Requests | `frontend/src/components/Social/Friends/` | `backend/models/social/Friendship.mjs` | Built |
| Following (6 types) | Social hooks | `backend/models/UserFollow.mjs` | Built |
| Challenges | `frontend/src/components/Social/Challenges/` | `backend/models/social/Challenge.mjs` | Built |
| Vertical Reels | `frontend/src/components/Social/Reels/VerticalReels.tsx` | — | Built |
| User Profiles | `frontend/src/pages/Social/UserProfilePage.tsx` | `backend/controllers/profileController.mjs` | Built |
| Community | `frontend/src/components/DashBoard/Pages/community/` | `backend/models/social/enhanced/Community.mjs` | Built |
| Direct Messaging | — | `backend/models/social/enhanced/Messaging.mjs` | Model only |
| Live Streaming | — | `backend/models/social/enhanced/LiveStreaming.mjs` | Model only |
| Creator Economy | — | `backend/models/social/enhanced/CreatorEconomy.mjs` | Model only |

### Social → Gamification Integration (MANDATORY)
- **Social post creation** → awards 15 points (social category)
- **Comments/reviews** → awards 15 points
- **Referrals** → awards 200 points
- **Challenge participation** → awards variable points based on difficulty
- **Achievement sharing** → increases `shareCount` on UserAchievement, tracked for social engagement metrics
- All social gamification points feed into the same leveling/tier system as workout points

### User Profile = Social Profile + Fitness Dashboard
Every user profile page MUST contain:
1. **Profile header** — Photo, name, tier badge, level, streak count
2. **Achievement showcase** — Top 3-6 badges with rarity glow
3. **Chart section** — User-selected Victory charts (toggle-able visibility)
4. **Social feed** — User's recent posts and workout logs
5. **Stats summary** — Total workouts, longest streak, current OPT phase, XP to next level
6. **Friends/followers count** — Social proof metrics

### Privacy Controls
- Post visibility: public / friends-only / private
- Chart visibility: per-chart toggle (see Chart Visibility Toggle above)
- Profile visibility: public / friends-only / private
- Granular per-relationship settings: share workouts, achievements, progress, allow DMs, allow challenges

### Content Moderation
- `backend/models/social/PostReport.mjs` — User flagging
- `backend/models/social/ModerationAction.mjs` — Admin actions
- Auto-moderation confidence scoring on posts/comments
- Admin panel: `frontend/src/components/DashBoard/Pages/admin-dashboard/components/SocialMediaCommand/`

---

## Enhanced Blueprint-First Protocol (MANDATORY — UPGRADED)

The original blueprint protocol is extended with **parent-child mapping, click-outcome flowcharts, and Mermaid diagrams** to eliminate vibe coding.

### Parent Component Blueprint (REQUIRED for all top-level dashboard pages)
Every parent/page component MUST include ALL of the following before any code is written:
```
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: [Name]                                           ║
 * ║  PURPOSE: [One-line description]                              ║
 * ║  OWNER: [AI/person who last modified]                         ║
 * ║  LAST VALIDATED: [Date of last AI Village run]                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ [Header: Title + Actions]                                   │
 * ├──────────┬─────────────────────────────────────────────────┤
 * │ Sidebar  │  [Main Content Area]                             │
 * │          │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
 * │          │  │ Widget 1 │ │ Widget 2 │ │ Widget 3 │           │
 * │          │  └─────────┘ └─────────┘ └─────────┘           │
 * │          │  [Detail Panel / Modal Area]                      │
 * └──────────┴─────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[ParentPage] --> B[HeaderBar]
 *   A --> C[SidebarNav]
 *   A --> D[ContentArea]
 *   D --> E[WidgetGrid]
 *   D --> F[DetailPanel]
 *   E --> G[Widget1]
 *   E --> H[Widget2]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Button: "Add Client"] → Opens AddClientModal → POST /api/users → Refreshes client list
 * [Tab: "Schedule"] → Sets AI context to 'scheduling' → Loads ScheduleTab → GET /api/sessions
 * [Card: Client Name] → Opens ClientDetailPanel → GET /api/users/:id → Shows profile + charts
 * [Badge Icon] → Opens AchievementModal → Shows badge art + XP reward + share button
 *
 * DATA FLOW:
 * Props In:  { user: User, role: 'admin' | 'trainer' | 'client' }
 * State:     { activeTab, selectedClient, isModalOpen }
 * API Calls: GET /api/users, GET /api/sessions, POST /api/workouts
 * Events:    onClientSelect, onTabChange, onWorkoutLog
 * Children:  HeaderBar, SidebarNav, ContentArea, DetailPanel
 *
 * GAMIFICATION HOOKS:
 * - Workout save → GamificationEngine.awardPoints('completeWorkout', userId)
 * - Achievement unlock → trigger tierGlowPulse animation
 * - Level up → particle burst + XP counter animation
 */
```

### Child Component Blueprint (REQUIRED for all sub-components)
```
/**
 * ┌─── SUB-COMPONENT: [Name] ──────────────────────────────────┐
 * │ PARENT: [ParentComponent]                                    │
 * │ PURPOSE: [What it does for the parent]                       │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────┐                                 │
 * │ │ [Visual layout]          │                                 │
 * │ └──────────────────────────┘                                 │
 * │ Props: { ... }                                               │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Action] → [Result] → [API Call] → [UI Update]              │
 * │ GAMIFICATION: [What XP/badge events this triggers]           │
 * └──────────────────────────────────────────────────────────────┘
 */
```

### Enforcement Rules (UPGRADED)
- **No component >100 lines may exist without a blueprint header** — includes wireframe + Mermaid + click-outcomes
- **Parent components MUST list ALL children** with their purpose
- **Every clickable element MUST have a documented outcome** in the click-outcome flowchart
- **Gamification hooks MUST be documented** if the component triggers point awards or animations
- **Chart components MUST document** which data source feeds them and which profile visibility toggle controls them
- **When modifying a component, update its blueprint FIRST**
- **Before creating a new parent component:** Research 3+ competitor sites for the same feature type, document findings in blueprint
- **AI Village validation checks for blueprint completeness** (wireframe + Mermaid + click-outcomes + data flow)

### Competitor Research Protocol (BEFORE building new features)
Before building any new page or major feature:
1. **Identify 3+ competitor/reference sites** that implement the same feature
2. **Screenshot key interactions** from each reference
3. **Document in blueprint:** What they do well, what we can improve, how our Crystalline Swan theme differentiates
4. **Examples:** For social feed → study Instagram, Strava, Fitocracy. For workout logger → study Strong, JEFIT, Hevy. For gamification → study Duolingo, Habitica, Nike Run Club.

---

## Dashboard Architecture (MANDATORY Reference)

### Admin Dashboard (19 specialty pages)
All under `frontend/src/components/DashBoard/Pages/`:

| Page | Key Component | AI Context | Gamification |
|------|---------------|------------|--------------|
| Overview | `admin-dashboard-view.tsx` | `general` | Dashboard KPIs |
| Clients | `ClientManagementDashboard.tsx` | `client_review` | Client XP/tier display |
| Sessions | `admin-sessions-view.tsx` | `scheduling` | Session completion points |
| Exercises | `AdminExerciseCommandCenter.tsx` | `exercise_library` | Exercise XP values |
| Gamification | `admin-gamification-view.tsx` | `gamification` | Full admin controls |
| Packages | `admin-packages-view.tsx` | `store` | Purchase rewards |
| Video Studio | `VideoStudioManager.tsx` | `content` | View completion XP |
| Onboarding | `UnifiedOnboardingWizard.tsx` | `onboarding` | Onboarding milestone badges |
| Movement Analysis | `MovementAnalysisWizard.tsx` | `assessment` | Assessment completion |
| Reports | `ReportAnalyticsDashboard.tsx` | `data_analysis` | — |

### 9 Workspace Containers
Located in `frontend/src/components/DashBoard/workspaces/`:
Dashboard, Clients, Scheduling, Workouts, Store, Content, Gamification, Analytics, System

### Client Dashboard
`frontend/src/components/ClientDashboard/` — Sections: GamificationSection, SocialProfileSection, CommunitySection, ProfileSection
`frontend/src/components/DashBoard/Pages/client-dashboard/` — AchievementsCard, ScheduledSessionsCard, NasmCategoryProgress, ChallengesCard, RewardsCard

---

## UI/UX REDESIGN WORKFLOW (ACTIVE)

### MANDATORY: Read Before Any UI Work
Any AI session that involves frontend UI/UX work MUST read these documents first:

1. **Master Redesign Prompt:** `docs/ai-workflow/SWANSTUDIOS-UI-REDESIGN-MASTER-PROMPT.md`
   - Design philosophy, 5 theme directions, 10-breakpoint matrix
   - Business KPIs with hard fail gates
   - Seed data contract (upsert-by-email pattern)
   - Visual QA protocol with component-level diff thresholds
   - Phased execution plan with DoD/fail gates per phase
   - Release controls (runtime feature flag with localStorage cache)
   - Playwright MCP setup for visual feedback loops

2. **Multi-AI Review Format:** `docs/ai-workflow/AI-REVIEW-TEAM-PROMPT.md`
   - Structured review template for cross-AI feedback
   - Severity table, missing controls checklist, contradiction finder
   - Use when reviewing any design or implementation deliverable

### Redesign Phases
| Phase | Name | Gate |
|-------|------|------|
| 0 | Baseline Capture | Screenshots + Lighthouse for every route |
| 1 | 5 Concept Designs | Owner picks 2 favorites from 5 distinct directions |
| 2 | Design System Extraction | Token file + 6 primitives implemented |
| 3 | Page-by-Page Rollout | Each page behind feature flag, A/B tested |
| 4 | QA + Launch | All KPIs green, no Critical/High regressions |

### Design Constraints
- **Crystalline Swan identity** must be preserved (frozen enchanted forest + luxury vault aesthetic, Ice Wing `#60C0F0` accents, Arctic Cyan `#50A0F0` glows, Midnight Sapphire `#002060` surfaces)
- **Monetization flows are sacred** - checkout, booking, store get component-level diff thresholds (0.5%)
- **No "AI slop"** - Avoid generic gradients, stock patterns, cookie-cutter layouts
- **Runtime feature flag** (`useNewTheme` via `/api/feature-flags`) with localStorage cache + 1.5s timeout
- **Build-time flag** (`VITE_USE_NEW_THEME`) for simpler deploys (requires redeploy to rollback)
- **Concept routes** guarded by `VITE_DESIGN_PLAYGROUND=true` (never shipped to prod)

### Visual QA Tools
- **Playwright MCP** for browser automation and screenshot capture
- **Pixelmatch** or Playwright built-in for screenshot diffing
- **Global threshold:** 0.5% investigate, 2% fail
- **Monetization component threshold:** 0.1% investigate, 0.5% fail
- **Naming convention:** `{page}-{breakpoint}w-{variant}.png` (e.g., `homepage-375w-dark.png`)

---

## 14-Brain Recursive Consensus System (MANDATORY)
SwanStudios uses a 14-Brain AI validation pipeline for Sean's development work. **Run before every production deploy.**

```bash
# Run validation on recent changes
node scripts/validation-orchestrator.mjs

# Run on specific files
node scripts/validation-orchestrator.mjs --files path/to/file.tsx

# Run on staged changes
node scripts/validation-orchestrator.mjs --staged
```

### Architecture (Sean's Dev AI Village — accepts cost, use sparingly)
- **Phase 1:** 12 parallel validators:
  | # | Model | Track | Cost |
  |---|-------|-------|------|
  | 1 | Gemini 2.5 Flash | UX & Accessibility | FREE |
  | 2 | Step 3.5 Flash:free | Security Scan #1 | FREE |
  | 3 | Gemini 3 Flash | Performance Review | FREE |
  | 4 | MiniMax M2.5:free | Architecture & Bugs | FREE |
  | 5 | MiniMax M2.1 | Competitive Intelligence | ~$0.01 |
  | 6 | Nvidia Nemotron 3 Super:free | Security Deep-Dive | FREE |
  | 7 | Qwen 3.6 Plus:free | Code Architecture | FREE |
  | 8 | Nvidia Nemotron 3 Super:free | Data Safety Audit | FREE |
  | 9 | Step 3.5 Flash:free | Bug Hunter II | FREE |
  | 10 | Claude Sonnet 4.6 | Code Quality (premium) | ~$0.05-$0.10 |
  | 11 | Claude Sonnet 4.6 | Data Integrity (premium) | ~$0.05-$0.10 |
  | 12 | Gemini 3.1 Flash Lite | Frontend UX & Patterns | ~$0.01 |
  | — | DeepSeek V3.2 | User Research | ~$0.01 |
- **Phase 2:** Specialty recursive debates (max 5 rounds each):
  - **Security Debate:** Step 3.5 Flash:free ↔ Nvidia Nemotron 3 Super:free (FREE)
  - **Code Quality Debate:** Claude Sonnet 4.6 ↔ Qwen 3.6 Plus:free (~$0.05)
  - **UX/UI Design Debate:** Gemini 3.1 Pro (CTO) ↔ MiniMax M2.5:free (~$0.03)
- **Phase 3: CEO Review + Smart Escalation:**
  - Gemini 3.1 Pro reviews ALL Phase 2 debate conclusions
  - **Smart Gate:** IF any debate has CRITICAL findings OR no consensus → Mercury 2 ($0.25/$0.75/M) and MiniMax M2.7 ($0.30/$1.20/M) enter as cross-validators
  - **Smart Gate:** IF all debates reached consensus with no CRITICAL → Mercury 2 and M2.7 SKIP entirely (save tokens)
  - Gemini 3.1 Pro makes the call; Opus 4.6 CEO override via CLAUDE.md still applies
- **Phase 4 (MANDATORY): Opus CEO Review** — Claude Opus 4.6 reviews Phase 2+3 consensus, then debates Gemini 3.1 Pro directly for max 5 rounds. **Opus 4.6 = FINAL authority on ALL decisions.**
  - Opus reads the Phase 2 debate logs + fix-instructions.md + design-recommendations.md
  - Opus reviews what the specialty debates agreed to, identifies gaps, corrects errors
  - Opus engages Gemini CTO directly via `node scripts/consult-gemini.mjs --ask`
  - Max 5 rounds. Opus has FINAL SAY on severity ratings, launch blockers, deferrals, and implementation
  - Opus must verify Gemini's recommendations against CLAUDE.md (theme tokens, conventions, etc.)
  - If Gemini references RETIRED theme tokens (Galaxy-Swan: #0a0a1a, #00FFFF, #7851A9), Opus REJECTS and corrects
  - Output: Final CEO ruling saved to `AI-Village-Documentation/validation-prompts/latest/opus-ceo-ruling.md`
- **Output:** `AI-Village-Documentation/validation-prompts/latest/` (summary, per-track reports, debate logs, fix instructions, opus-ceo-ruling)
- **Setup:** `OPENROUTER_API_KEY` in .env (required). `GEMINI_API_KEY` in .env (enables Phase 2+3+4 debates).
- **Cost:** ~$0.10-$0.25/run typical, ~$0.15-$0.35 with escalation. Use sparingly.
- **Full docs:** `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`
- **BANNED MODELS:** No Grok (any version). No X-AI models. Hard no, never suggest.

### Chain of Command (MANDATORY)
The AI Village has a strict hierarchy for decision-making:
1. **Claude Opus 4.6 (CEO)** — FINAL authority on ALL decisions. Overrides everyone.
2. **Gemini 3.1 Pro (CTO / Creative Director)** — Lead Design Authority. Authoritative on design, but Opus can override on engineering/business grounds.
3. **Claude Sonnet 4.6 (VP Engineering)** — Premium code quality analysis. Used in Phase 1 + Code Quality debate.
4. **Mercury 2 + MiniMax M2.7 (Specialist Consultants)** — Only called in for CRITICAL findings or stalled debates. Smart-gated to avoid token waste.
5. **Phase 1 free validators (Staff Engineers)** — Surface findings from diverse training perspectives. No decision authority.

This hierarchy applies to:
- Severity ratings (CRITICAL/HIGH/MEDIUM/LOW)
- Launch blocker decisions
- Deferral decisions (what ships now vs post-launch)
- Theme token enforcement (Opus enforces CLAUDE.md as source of truth)
- Any disagreement between debate participants

### When to Run
- **MANDATORY:** Before pushing to main (production deploys)
- **MANDATORY:** Before merging PRs with >100 lines changed
- **RECOMMENDED:** After major refactors or new features

### Planning Mode with Web Research (--mode plan)
The AI Village supports a planning mode that analyzes feature plans before implementation:
```bash
node scripts/validation-orchestrator.mjs --mode plan --document docs/ai-workflow/blueprints/PLAN.md
```
- **13 planning brains** analyze the plan from 13 different angles (UX, architecture, security, performance, competitive intel, user personas, risk, frontend patterns, data safety, API design, module architecture, mobile/edge cases, strategic research)
- **3 grounded research brains** (Brain #1, #5, #13) use **Google Search Grounding** (FREE) for real-time web research:
  - Brain #1 (UX Research): Searches for competitor features, UI/UX trends, onboarding patterns
  - Brain #5 (Competitive Intel): Searches for competitor pricing, market sizing, fitness tech trends
  - Brain #13 (Strategic Research & Gap Analysis): Deep research on technology gaps, regulatory compliance, industry trends, monetization strategies, future-proofing opportunities
- Grounding is FREE — uses Google's built-in search via Gemini direct API, no SerpAPI credits consumed
- Report output includes **Web Research Sources** section with all cited URLs
- **Gap Finding (MANDATORY):** Every planning run MUST include Brain #13 which identifies what the plan is MISSING, not just what it already covers. This ensures no blind spots.

### Gemini CTO Consult with Research
```bash
node scripts/consult-gemini.mjs --plan --file plan.md --research   # Plan review with web search
node scripts/consult-gemini.mjs --ask "question" --research         # Question with web search
```
- `--research` flag enables Google Search Grounding on Gemini 3.1 Pro consultations
- Use for competitive analysis, market research, technology trend evaluation

### Gap Finding & Strategic Enhancement (MANDATORY for Planning)
When running `--mode plan`, the AI Village MUST:
1. **Identify missing features** — What competitors have that the plan doesn't address
2. **Surface regulatory risks** — Health data laws, AI guidance, accessibility requirements
3. **Find technology gaps** — New APIs, SDKs, or patterns the plan should leverage
4. **Recommend future-proofing** — Platform trends, emerging standards, cross-platform considerations
5. **Cite sources** — Every claim must be backed by a real URL from web research
This requirement ensures the AI Village adds strategic value beyond code review.

### Model Audit Protocol (Weekly)
OpenRouter model rankings shift weekly. Run `node scripts/openrouter-model-audit.mjs` (or check manually at https://openrouter.ai/rankings) every Monday to:
- Check if any current free models lost free status
- Identify new free models that outperform current ones
- Compare benchmark scores against current Phase 1 lineup
- Output: `AI-Village-Documentation/model-audits/latest.md`

---

## App AI Hive Mind — 100% Free (MANDATORY for App AI)
The Coach Assistant and all in-app AI features use a **separate, 100% free** consensus system. This ensures trainers and clients using the app never incur AI costs.

### Architecture
- **Simple questions:** Gemini 2.5 Flash answers directly (~1-2 seconds, no consensus)
- **Complex tasks** (workout plans, progress reviews, nutrition plans):
  1. **Brain 1:** Gemini 2.5 Flash (direct API key) — generates initial plan
  2. **Brain 2:** Qwen 3.6 Plus:free (OpenRouter) — reviews and critiques
  3. **Brain 3:** Gemini 3.1 Pro (direct API key, free tier 15 RPM) — final authority
- **Cost:** $0.00 per request. All models free.
- **Latency:** ~5-8 seconds for complex tasks, ~1-2 seconds for simple queries

### Complexity Detection
The backend determines complexity based on:
- Context type: `workout_generation`, `client_review`, `progress_analysis` → complex (use hive mind)
- Context type: `general`, `macro_logging`, `form_tips` → simple (single model)
- Message length > 200 chars with action keywords (plan, analyze, review, generate) → complex

---

## Privacy Proxy Architecture (MANDATORY — Zero PII to LLMs)
**No client personally identifiable information (PII) may ever be sent to any external LLM.** This applies to ALL AI systems: Coach Assistant, App Hive Mind, AI Village code review, and OpenClaw.

### PII Filter Rules
Before ANY text is sent to an LLM (via `aiChatService.mjs` or OpenClaw proxy):
- Client names → replaced with `User #[userId]` or `Client #[userId]`
- Trainer names → replaced with `Trainer #[trainerId]`
- Email addresses → `[EMAIL_REDACTED]`
- Phone numbers → `[PHONE_REDACTED]`
- Street addresses → `[ADDRESS_REDACTED]`
- SSN patterns → `[SSN_REDACTED]`
- Credit card patterns → `[CC_REDACTED]`

### Display Mapping
- **Frontend** shows real names (fetched from user profile API, joined client-side)
- **Backend** sends only IDs to LLMs; maps IDs back to names in responses for display
- Example: LLM receives "Generate leg day for User #47" → responds with "User #47 should..." → frontend displays "Marcus should..."

### OpenClaw Privacy Proxy Endpoints
New API namespace: `/api/openclaw/*` — authenticated via dedicated API key
- `POST /api/openclaw/log-workout` — accepts userId + exercises, never client name
- `POST /api/openclaw/onboard-client` — accepts anonymous intake data, returns claim code
- `GET /api/openclaw/health` — site status check (no PII involved)
- `GET /api/openclaw/stats` — aggregate metrics only (no individual client data)

### Audit Trail
Every AI request logged: `{ timestamp, userId, action, piiStripped: true, provider, model }`

---

## OpenClaw Remote Command Center (PLANNED)
OpenClaw provides remote AI access via Telegram for gym-side workflow, site monitoring, and code operations.

### Hardware Options
| Option | Spec | Best For |
|--------|------|----------|
| **Raspberry Pi 4 (4GB)** | ARM, 4GB RAM, 5W power | Permanent always-on, ~$3/year electricity |
| **Potato Windows Laptop** | Any Windows 10/11, 4GB+ RAM | Quick start, use WSL2 or native Node.js |
| **VPS (Hostinger/etc)** | Cloud, $5-10/month | No hardware needed, always online |

- OpenClaw gateway uses ~300MB RAM — any of these options works
- Brain: Gemini 3.1 Pro (complex tasks) / Gemini 2.5 Flash (simple tasks) via API
- **NO local AI models needed** — all processing is cloud API calls
- Pi/laptop sits on home network, SSH tunnel from main dev PC for admin

### Network Architecture
```
Main Dev PC (source code, API keys, Claude Code)
    ↕ SSH Tunnel (admin only)
OpenClaw Host (Pi 4 / Laptop / VPS — NO source code, NO .env)
    ↕ HTTPS API calls
SwanStudios Backend (sswanstudios.com — privacy proxy layer)
    ↕ Telegram Bot API
Sean's Phone (Telegram — gym, travel, anywhere)
```

### Agents
| Agent | Brain | Channel | Use Case |
|-------|-------|---------|----------|
| Swan Coach | Gemini 3.1 Pro | Telegram | "Log my bench 225x8" from gym |
| Swan Ops | Gemini 2.5 Flash | Telegram | Site health monitoring, daily reports |
| Swan Village | Gemini 3.1 Pro | Telegram | "Run AI Village on staged changes" |
| Swan Onboard | Gemini 3.1 Pro | Telegram | Voice-dictate new client intake |

### Security Configuration
- **Tools Profile:** `coding` (not `full`)
- **Exec Security:** `ask` (requires approval for new tools)
- **Web UI:** localhost only (SSH tunnel for access)
- **Telegram:** user allowlist (Sean's account ONLY)
- **Firewall:** UFW enabled, only port 22 open
- **No ClawHub skills** — malware risk (12% of skills found malicious)
- **Red Lines:** Never access .env files, never rm -rf, never modify SSH/firewall, never store/log PII
- **Yellow Lines:** API calls to sswanstudios.com, creating cron jobs, reading git status

## AI Coordination
- This project uses a Multi-AI Swarm (see `.clinerules` for full protocol)
- **Current task tracker:** `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md`
- **Handoff protocol:** `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`
- **Vision sync:** `docs/ai-workflow/AI-HANDOFF/VISION-SYNC-2026-02-15.md`
- **Skills infrastructure:** `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`
- **AI status files:** `docs/ai-workflow/AI-HANDOFF/[AI-NAME]-STATUS.md`
- **Master handbook:** `docs/MASTER-HANDBOOK.md`

## AI Agent Skills (17 installed)
Skills are in `.agents/skills/` (symlinked to `.claude/skills/` and `.continue/skills/`).

### Core Process Skills (10)
- `verification-before-completion` — MANDATORY before any "done" or "fixed" claim
- `systematic-debugging` — MANDATORY for any bug investigation (root-cause-first)
- `requesting-code-review` — MANDATORY before merge to main
- `test-driven-development` — write tests before production code
- `webapp-testing` — Playwright-based frontend testing
- `web-design-guidelines` — UI accessibility/contrast audit (Vercel)
- `audit-website` — comprehensive site audit (SEO, perf, security, a11y via squirrelscan)
- `agent-browser` — browser automation for visual verification
- `frontend-design` — distinctive, production-grade frontend interfaces
- `ui-ux-pro-max` — 50 styles, 21 palettes, 50 font pairings, 9 stacks

### Design Enhancement Skills (7, from taste-skill)
- `design-taste-frontend` — anti-AI-slop design rules, 3 tunable dials (NOTE: its ban on "AI purple/blue" is OVERRIDDEN — Wing Purple + Ice Wing are our brand)
- `high-end-visual-design` — $150k agency look, spring physics
- `redesign-existing-projects` — design audit + fix priority
- `full-output-enforcement` — anti-truncation, no `// TODO` placeholders
- `minimalist-ui` — editorial clean (NOT for SwanStudios — our brand is maximalist dark-luxury)
- `industrial-brutalist-ui` — Swiss typographic + terminal (NOT for SwanStudios)
- `stitch-design-taste` — Google Stitch compatibility (only if using Stitch)

### Maintenance
`npx skills check` | `npx skills update` | `npx skills find <keyword>`

---

## Auto Research Protocol (Karpathy-Style Skill Optimization)

Autonomous skill optimization loop based on Andrej Karpathy's auto-research methodology.

### Three Ingredients
1. **Objective metric** — Binary yes/no eval criteria per skill (`scripts/auto-research/evals/*.eval.json`)
2. **Measurement tool** — LLM judge (Gemini Flash) scores skill prompts against criteria
3. **Something to change** — The skill SKILL.md prompt itself (iterated until optimal)

### Usage
```bash
node scripts/auto-research/runner.mjs --skill verification-before-completion --generations 3 --runs 5
node scripts/auto-research/runner.mjs --list        # list available evals
node scripts/auto-research/runner.mjs --skill systematic-debugging --dry-run  # score without mutating
```

### Architecture
```
scripts/auto-research/
├── runner.mjs              — Main loop: run skill → eval → mutate → repeat
├── eval-suite.mjs          — Eval framework (LLM judge, binary criteria)
├── prompt-mutator.mjs      — AI-powered prompt mutation (anti-collapse safeguards)
├── results/                — Historical run results for analysis
│   └── {skill}-gen{N}-{timestamp}.json
└── evals/                  — Per-skill eval definitions
    ├── verification.eval.json   (6 criteria, weight 10)
    ├── debugging.eval.json      (6 criteria, weight 11)
    ├── code-review.eval.json    (6 criteria, weight 10)
    └── design-taste.eval.json   (7 criteria, weight 13)
```

### Safeguards
- **Anti-collapse:** Mutations rejected if prompt shrinks >50%, grows >100%, or loses section headings
- **Backup:** Original prompt backed up to `results/{skill}-original-backup.md` before first mutation
- **Best-wins:** Only the highest-scoring prompt variant is written back; no improvement = no change
- **Cost:** ~$0.00-0.02/run (all free models via OpenRouter)

## Build Hardening Checklist (MANDATORY)
Every component and endpoint must pass these checks BEFORE commit. These rules exist because AI Village repeatedly caught these same patterns post-build.

### React Component Rules
- **No portals inside `.map()` loops** — Creates N portals per render, leaks memory. Use ONE portal outside the loop, driven by state (`activeId`).
- **Every button must have an `onClick`** — Dead buttons with no handler are a recurring bug. If the handler isn't built yet, add `onClick={() => console.warn('TODO: implement')}` with a `// TODO` comment.
- **Wrap expensive parsing in `useMemo`** — Any `parse*()`, `JSON.parse()`, or regex in render must be memoized. Re-parsing on every keystroke kills performance.
- **`React.memo` on list item components** — Any component rendered inside `.map()` over a data array must be wrapped in `React.memo`.
- **Lazy-load heavy components** — `React.lazy()` for 3D, AI, charts, and any component >30KB. Keep CRUD modals eager.
- **No hardcoded hex colors** — Use `${({ theme }) => theme.x || '#fallback'}` pattern. Fallback MUST be from the active Crystalline Swan palette, never retired Galaxy-Swan tokens.
- **All interactive elements: 44px min touch target** — Buttons, pills, tabs, close icons. No exceptions.
- **WCAG contrast: 4.5:1 minimum** — Test text color against its background. Common failures: `#64748b` on dark bg (use `#94a3b8`+), `rgba(255,255,255,0.3)` placeholder (use `0.5`+).
- **Focus trap on modals/drawers** — `role="dialog" aria-modal="true"`, Escape to close, focus returns to trigger on close.
- **Error boundaries on async UI** — Any component that fetches data needs error state + retry button, not silent failure.

### Backend Rules
- **Non-fatal dependency creation** — If creating a child record (e.g., `ClientProgress`) during a parent create (e.g., `User`), check table existence first. Never let optional records kill the transaction.
  ```javascript
  // Pattern: Check table exists before insert in transaction
  const [check] = await sequelize.query(`SELECT to_regclass('table_name') AS exists`, { transaction });
  if (check?.[0]?.exists) { await Model.create({...}, { transaction }); }
  ```
- **Soft-delete with audit trail** — Never hard-delete user data. Use `isActive: false, deletedAt, deletedBy`.
- **Destructive endpoints require confirmation** — Delete routes must require `confirmEmail` matching the record, not a boolean.
- **Every `async` callback needs try/catch** — Especially `refreshAllData`, `fetchClients`, and similar reload functions. Set error state on failure.
- **Don't reference non-existent columns in models** — Before adding a foreign key field to a Sequelize model, verify the referenced table AND column exist in production. Check migrations actually ran.
- **Route aliases for external services** — When external services (Stripe, SendGrid) are configured with a webhook URL, mount the handler at THAT EXACT path. Don't assume they'll follow your internal routing.

### Sequelize Model Rules
- **No `challengeId`-style phantom columns** — If a model references another table via FK, that table MUST exist and the migration MUST have run. Check `SequelizeMeta` in prod before assuming.
- **Association `constraints: false`** — Cross-model associations that reference tables which may not exist yet must use `constraints: false` to prevent sync failures.
- **ENUM values must match exactly** — When inserting data, values must match the ENUM definition in the model. Case-sensitive. Test with actual enum values before deploying.

### Pre-Commit Mental Checklist
Before every commit, mentally verify:
1. Every new button has an `onClick` handler
2. No portals/heavy components inside `.map()`
3. All colors use theme tokens with Crystalline Swan fallbacks
4. Backend creates handle missing tables gracefully
5. All model FKs reference tables that exist in production
6. Error states exist for every data fetch

## Deployment — Render (Paid Professional Plan)
- **Plan:** Render Professional ($19/month + usage) — NOT free tier
- **Services:** SS-PT-New (web service ~$14/mo), SwanStudios PostgreSQL ($6/mo), 500GB bandwidth included
- **Billing:** ~$55-60/month total, billed to ogpswan@yahoo.com
- **No cold starts** — Professional plan keeps services running (do NOT assume free-tier cold start behavior)
- **Pipeline minutes:** 500 included, overage at $5/1000 min — be mindful of excessive rebuilds

## Design System Handoff (AI Village Consensus — Approved 2026-03-22)

### Error State: Crimson Frost
- **Error toast:** Graphite bg `rgba(26,26,36,0.95)` + 4px Crimson Frost `#C92A54` left border + Frost White `#E0ECF4` text
- **Success toast:** Gilded Fern `#C6A84B` accent
- **Warning toast:** Metallic Gold `#D4AF37` accent
- **Info toast:** Ice Wing `#60C0F0` accent
- **MANDATORY:** Error text is ALWAYS Frost White, never Crimson. Crimson is border-only.

### Global Focus Ring
```css
*:focus-visible {
  outline: 2px solid #60C0F0; /* Ice Wing */
  outline-offset: 4px;
  box-shadow: 0 0 16px rgba(96,192,240,0.4), inset 0 0 0 1px rgba(139,92,246,0.2);
}
```

### Frost Shimmer Skeleton Loaders
- MANDATORY on all data-fetching components
- Arctic Cyan shimmer at 10% opacity on surface color
- Hardware mirrors/treadmills: 18% opacity, 1.5s duration
- `role="status" aria-live="polite" aria-label="Loading content"`

### Hardware-Adaptive Touch Targets
| Context | Min Touch Target | Font Scale |
|---------|-----------------|------------|
| Desktop | 48px | 1.0x |
| Mobile (<768px) | 56px | 1.0x |
| Treadmill Console (2560×1600) | 64px | 1.125x |
| Hardware Mirror (1080×1920 portrait) | 64px | 1.125x |

### Glassmorphism Fallback
- Always provide `@supports not (backdrop-filter)` fallback with opaque bg + box-shadow
- TV casting: 5vh/5vw padding for overscan safe areas

### Event-Driven Architecture (Phase 2 Consensus — Future Sprint)
The AI Village reached consensus on migrating optional services (gamification, analytics) to event-driven:
- Core services emit domain events after transaction commit
- Optional modules subscribe via Event Bus with retry + DLQ
- **Transactional Outbox pattern** approved for guaranteed delivery
- Cross-module associations use **soft references** (UUID columns, no Sequelize FK constraints)
- **Current state:** Direct calls (will migrate incrementally)
- **Pattern to adopt:** `EventOutbox.create()` in same transaction → poller publishes to bus

---

## Theme Changer Compatibility (MANDATORY)

**ALL UI/UX components MUST work with the UniversalThemeContext theme changer.**

### Dark-First Design Philosophy (MANDATORY)
- **Default theme: `crystalline-dark` (Void Crystal)** — dark backgrounds (#030712) with cyan/purple accents
- **ALL new components MUST be designed dark-first** — dark bg with glowing cyan/purple accents is the signature look
- **The screenshot aesthetic:** Deep dark backgrounds, cyan `#60C0F0` text/accents, purple `#8B5CF6` borders/glows, subtle surface cards in `#141419` Carbon or `#1A1A24` Graphite
- **Fallback colors in CSS vars MUST be dark-theme values** — `var(--bg-base, #030712)` not `var(--bg-base, #002060)`
- **NO bright/light themes except ONE white theme** (`crystalline-light`) for accessibility. All other themes MUST be dark variations with different accent colors
- **When building ANY component**, envision it on a near-black background with glowing accents — this is the SwanStudios identity
- **Bright backgrounds are NOT the brand** — deep dark with luminous cyan/purple is the brand

### Requirements
- Every styled-component must use **CSS custom properties** (`var(--bg-base)`, `var(--text-primary)`, `var(--accent-primary)`, etc.) with dark-theme Crystalline Swan fallback values
- The theme toggle button in the header cycles through themes — components MUST adapt
- **No hardcoded colors** without a `var()` wrapper. Pattern: `var(--accent-primary, #60C0F0)`
- Theme variables are injected via `injectThemeVariables()` in `frontend/src/utils/theme/themeUtils.ts`
- **Available CSS variables:** `--bg-base`, `--bg-elevated`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--text-heading`, `--text-muted`, `--accent-primary`, `--accent-secondary`, `--accent-gold`, `--border-soft`, `--accent-primary-10` (10% opacity blend)
- For dynamic opacity: use `color-mix(in srgb, var(--accent-primary) 15%, transparent)` instead of hardcoded rgba
- **Test new components** with Void Crystal (dark, default), Crystalline Light (the ONE light theme), and Cyberpunk Edgerunners to verify contrast

### Theme Collection (All Dark Variations + 1 White)
**ALL themes MUST have dark backgrounds** with their unique accent colors glowing on dark surfaces — like the workout logger aesthetic. Only `crystalline-light` provides a white/light option for accessibility.

| Theme | ID | Dark BG | Accent Colors |
|-------|-----|---------|--------------|
| **Void Crystal (DEFAULT)** | `crystalline-dark` | #030712 | Cyan `#22D3EE` + Purple `#8B5CF6` |
| Crystalline Swan | `crystalline-default` | #001545 | Ice Wing `#60C0F0` + Sapphire |
| Arctic Dawn (white option) | `crystalline-light` | #F4F7FB | Cyan `#00B4D8` (only light theme) |
| Monochrome | `crystalline-monochrome` | Dark gray | White/gray accents |
| Obsidian Ember | `cinematic-ember` | Dark ember | Warm amber + fire glow |
| Frozen Aurora | `frozen-aurora` | Dark ice | Icy pastels + aurora glow |
| Obsidian Black | `obsidian-black` | Near-black | Minimal white accents |
| Cyberpunk Edgerunners | `cyberpunk-edgerunners` | Dark neon | Neon yellow `#FAFF00` + hot pink |
| Obsidian Bloom | `obsidian-bloom` | Dark violet | Violet + hot pink glow |
| Frozen Canopy | `frozen-canopy` | Dark forest | Arctic emerald + ice |
| Ember Realm | `ember-realm` | Dark crimson | Crimson + fire orange glow |
| Twilight Lagoon | `twilight-lagoon` | Deep navy | Bioluminescent teal glow |
| Nebula Crown | `nebula-crown` | Dark cosmic | Cosmic purple + pink glow |
| Enchanted Forest | `enchanted-forest` | Dark forest | Deep emerald + gold glow |

**Rule:** If any theme currently uses a light/bright background (except `crystalline-light`), it must be converted to a dark background with its accent colors as luminous accents/glows on the dark surface.

---

## File Cleanup Protocol (MANDATORY)
**Trigger:** User says "do file cleanup protocol" OR AI detects workspace bloat (test artifacts >100MB, >50 untracked dirs).

### Target Categories
| Category | Action | Examples |
|----------|--------|---------|
| Test Artifacts | **PURGE** (delete, no archive) | `frontend/test-results/`, `playwright-report/`, `*.last-run.json`, trace.zip, test-failed-*.png |
| Build Artifacts | **PURGE** | `frontend/dist/`, `node_modules/.cache/` |
| Old AI Village Archives | **PURGE** (kept in git history) | `AI-Village-Documentation/validation-prompts/archive/` dirs older than 7 days |
| Dead/Duplicate Code | **ARCHIVE** (move + map) | Unused components, deprecated files, redundant utils |
| Deprecated Docs | **ARCHIVE** | Superseded blueprints, old planning docs |

### Safety Rules (NEVER Delete)
- **Source code** in `frontend/src/`, `backend/` (unless explicitly archiving dead code with user confirmation)
- **Config files:** `*.config.*`, `.env*`, `package.json`, `CLAUDE.md`, `.gitignore`
- **Database:** `backend/migrations/`, `backend/seeders/`, `backend/models/`
- **Git rule:** Only clean untracked files OR `git rm` after adding to Archive Map

### Archive Map (`.swan/archive-map.json`)
Dead code that might be useful later goes to `.swan/archive/` with a JSON manifest entry:
```json
{ "timestamp": "2026-03-23T12:00:00Z", "originalPath": "src/components/OldComponent.tsx", "archivePath": ".swan/archive/OldComponent_20260323.tsx", "reason": "Replaced by NewComponent", "archivedBy": "Claude Opus 4.6" }
```

### Execution Workflow
1. **Scan** — List all untracked dirs/files, calculate sizes, identify bloat
2. **Classify** — Sort into PURGE vs ARCHIVE categories
3. **Map** — Append ARCHIVE entries to `.swan/archive-map.json` (skip mapping for PURGE targets)
4. **Execute** — Move archived files to `.swan/archive/`. Delete purge targets with `rm -rf`
5. **Gitignore Sync** — Ensure `frontend/test-results/`, `playwright-report/`, `.swan/archive/` are in `.gitignore`
6. **Report** — Output: `[File Cleanup] Purged X MB of test artifacts. Archived Y files. See .swan/archive-map.json`

### Proactive Detection
When git status shows >20 untracked test result directories, suggest cleanup to the user before proceeding with other work.

---

## Common Gotchas
- `transform: translateZ(0)` creates CSS stacking contexts - add `position: relative; z-index` to parent if dropdowns are trapped
- Vite env vars (`VITE_*`) are build-time only - not changeable at runtime without redeploy
- Render deploys take 2-5 minutes after push; users may see cached old bundles
- Windows dev environment - use forward slashes in imports, `.cjs` extension for CommonJS migrations
- **Gamification double-award:** Always use idempotency keys (userId + actionType + ISO timestamp) to prevent duplicate point awards
- **Chart lazy loading:** All 50 Victory charts MUST use `React.lazy()` + `SafeChart` error boundary — never eagerly load the full gallery
- **Social feed pagination:** Use cursor-based pagination (not offset) for social feed queries to prevent missing/duplicate posts during scroll

---

## Anti-AI-Tells Checklist (MANDATORY — adapted from taste-skill)

AI-generated interfaces have recognizable "tells" that make them look generic. All SwanStudios code MUST avoid these patterns:

### Banned Patterns
- **No pure `#000000` black** — Use Obsidian Black `#0A0A0F` or Carbon `#141419`
- **No `99.99%` or `100%` fake round numbers** in dashboards — Use organic data like `97.3%`, `47.2%`
- **No "John Doe" / "Jane Smith"** placeholder names — Use realistic names or user's actual data
- **No filler words in copy:** "Elevate", "Seamless", "Unleash", "Next-Gen", "Cutting-Edge", "Revolutionary" (in user-facing text)
- **No Unsplash links** for placeholder images — Use `/api/placeholder/` or picsum.photos
- **No oversaturated neon outer glows** (except controlled Ice Wing/Wing Purple glow system)
- **No gradient text on large headers** — Use solid Frost White `#E0ECF4`
- **No custom mouse cursors** — Standard pointer is correct
- **No generic 3-column equal-width card layouts** — Use asymmetric bento grids or varied widths
- **No cards that don't communicate hierarchy** — Only use elevation when it serves information architecture
- **No linear easing on animations** — Use `cubic-bezier(0.16, 1, 0.3, 1)` (spring snap-and-settle) or `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **No `Inter`, `Roboto`, `Arial`, `Helvetica`** — These are banned AI-slop fonts. Use Plus Jakarta Sans, Sora, Cormorant Garamond, Fira Code

### Required States (every interactive component)
1. **Default** — Resting state
2. **Hover** — Visual feedback with glow/transform
3. **Active/Pressed** — Scale-down feedback
4. **Focus-visible** — Ice Wing focus ring (accessibility)
5. **Loading** — Frost Shimmer skeleton or spinner
6. **Empty** — Meaningful empty state with CTA
7. **Error** — Crimson Frost border + Frost White text + retry action

---

## Visual Diff Loop (MANDATORY for UI work — adapted from Nick Saraev workflow)

After building or modifying any frontend component, run the screenshot-compare loop:

### The Loop
1. **Build** — Implement the component
2. **Screenshot** — Take Playwright screenshots at 3 breakpoints: 375px (mobile), 768px (tablet), 1440px (desktop)
3. **Compare** — Compare to admin dashboard reference for consistency (fonts, colors, spacing, theme token usage)
4. **Fix** — Fix any mismatches identified
5. **Re-screenshot** — Verify fixes
6. **Ship** — When visual parity achieved

### When to Run
- **Always** after creating or rebuilding a page/component
- **Always** after theme changes
- **Recommended** after responsive adjustments

### Reference Screenshots
- Admin dashboard is the gold standard — all other dashboards must match its visual language
- Store reference screenshots in `tests/screenshots/references/` (gitignored)
- Naming: `{page}-{breakpoint}w-{variant}.png` (e.g., `trainer-dashboard-375w-dark.png`)

---

## 3-Tier Development Workflow (MANDATORY)

Choose the appropriate workflow tier based on change scope:

### Tier 1: Fast Path (single-component changes)
`Code → Playwright Screenshot QA → Ship`
- For: Bug fixes, style tweaks, single file changes
- Skip: AI Village, Gemini review, full blueprint

### Tier 2: Standard Path (feature work)
`Code → Gemini CTO Review → Fix Findings → Playwright QA → Ship`
- For: New features, multi-file changes, new pages
- Run: `node scripts/consult-gemini.mjs --review --file path/to/component.tsx`

### Tier 3: Deploy Path (production pushes)
`Full 11-Brain AI Village → Fix All Findings → Playwright QA → Deploy`
- For: Pushing to main, major refactors, >100 lines changed
- Run: `node scripts/validation-orchestrator.mjs --staged`
- **MANDATORY** before merging PRs

### Tier Selection Guide
| Change Type | Tier | Time |
|---|---|---|
| Fix a color / font / spacing | 1 (Fast) | 5 min |
| Add a new card component | 1 (Fast) | 15 min |
| Build a new dashboard page | 2 (Standard) | 1-2 hours |
| Rebuild trainer/client dashboards | 2 (Standard) | 2-4 hours |
| Push to production | 3 (Deploy) | 30 min validation |
| Major architecture change | 3 (Deploy) | Full review |

---

## Installed Skills Reference

### Core Process Skills (10)
| Skill | Purpose |
|-------|---------|
| `verification-before-completion` | MANDATORY before "done" claims |
| `systematic-debugging` | Root-cause-first bug investigation |
| `requesting-code-review` | Pre-merge review checklist |
| `test-driven-development` | Tests before production code |
| `webapp-testing` | Playwright frontend testing |
| `web-design-guidelines` | UI accessibility/contrast audit |
| `audit-website` | Comprehensive site audit |
| `agent-browser` | Browser automation |
| `frontend-design` | Distinctive production-grade UI |
| `ui-ux-pro-max` | 50 styles, 21 palettes, design DB |

### Design Enhancement Skills (from taste-skill, 7)
| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `design-taste-frontend` | Anti-AI-slop design rules, 3 tunable dials | Building any new UI component |
| `high-end-visual-design` | $150k agency look, spring physics | Premium/hero sections |
| `redesign-existing-projects` | Design audit + fix priority | Reviewing existing pages |
| `full-output-enforcement` | Anti-truncation, no `// TODO` | Always active |
| `minimalist-ui` | Editorial clean interfaces | NOT for SwanStudios (our brand is maximalist dark-luxury) |
| `industrial-brutalist-ui` | Swiss typographic + terminal | NOT for SwanStudios |
| `stitch-design-taste` | Google Stitch compatibility | Only if using Stitch |

**Note:** `design-taste-frontend` bans "AI purple/blue" — this conflicts with our Crystalline Swan brand. Override: Wing Purple `#8B5CF6` and Ice Wing `#60C0F0` glows ARE our brand identity and are NOT generic AI purple/blue. Use them confidently.
