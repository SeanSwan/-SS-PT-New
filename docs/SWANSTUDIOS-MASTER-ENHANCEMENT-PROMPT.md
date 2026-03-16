# SwanStudios Master Enhancement Prompt
## "7-Star Michelin" Platform Upgrade — Deep Analysis + Build Plan

> **Date:** 2026-03-14
> **Owner:** Sean Swan — NASM Protocol Trainer, SwanStudios Founder
> **Goal:** Transform SwanStudios from a functional SaaS into an elite, production-grade personal training platform that rivals MindBody, Trainerize, and TrueCoach — but with AI-powered intelligence they don't have.
> **Standard:** 7-star Michelin equivalent — deeply sophisticated under the hood, effortlessly simple on mobile, minimum clicks to accomplish any task.
> **Code Philosophy:** Extremely smart, minimal code. Maximum output from minimum lines. If complexity grows for valid reasons, that's fine — but clean up after. No bloat.

---

## PART 1: BRANDING & NAMING

### AI Branding
- **All AI features** must be branded as **"SwanStudios Deep Research"** (not "AI Assistant", not "AI Copilot")
- The AI assistant drawer → "SwanStudios Deep Research"
- The workout copilot → "SwanStudios Deep Research — Workout Intelligence"
- The form analysis AI → "SwanStudios Deep Research — Movement Analysis"
- The food scanner AI → "SwanStudios Deep Research — Nutrition Intelligence"

### Component Naming
- "Workout Logger" → **"Workout Log"** (shorter, cleaner)
- AI Assistant FAB → **"Deep Research"** button
- Consistent naming across admin/trainer/client dashboards

---

## PART 2: MOVE FITNESS CLIENT SYSTEM (PRIORITY — NEEDED TODAY)

### Problem
Sean trains clients at Move Fitness gym who are NOT SwanStudios package holders. They need to be in the system for workout logging but should NOT have SwanStudios sessions.

### Requirements
1. **Admin "Add External Client" flow:**
   - Admin fills out client profile: name, email, phone, goals, health history, PAR-Q
   - Client gets a `client` role account with **0 sessions**
   - Client is tagged with `source: 'move_fitness'` (or configurable gym name)
   - Client gets full access to: Workout Log, Food Logger, Body Map, Social features
   - Client does NOT see: session purchase prompts, SwanStudios scheduling
   - It would be disrespectful to poach clients from Move Fitness — this is about giving them SwanStudios tools

2. **Client type badge system:**
   - SwanStudios clients → "SwanStudios" badge
   - Move Fitness clients → "Move Fitness" badge (or configurable)
   - Badge visible in admin client list, schedule, workout log

3. **Backend changes needed:**
   - `User` model: add `clientSource` field (enum: 'swanstudios', 'move_fitness', 'external')
   - Admin endpoint: `POST /api/admin/clients/create-external` — creates user with client role, no sessions
   - Onboarding questionnaire auto-linked to new external client

---

## PART 3: WORKOUT LOG (CRITICAL — NEEDED TODAY)

### Current State
- `WorkoutLoggerModal.tsx` (785 lines) exists but is not fluid
- No voice dictation
- No auto-complete for exercise names
- No NASM exercise database with categorized dropdowns
- Missing stability/core workout section (NASM requirement)

### Required Upgrades

#### Voice Dictation
- **Voice dictate button** on the workout log form
- Real-time speech-to-text OR upload voice file
- SwanStudios Deep Research analyzes the recording and fills out:
  - Exercise name, weight, reps, sets
  - Notes on: posture, client pain, form, tempo
  - Auto-categorizes by body part
- Must work on mobile (primary use case — trainer is at gym)

#### NASM Exercise Database
- Pre-populated database of ALL NASM exercises categorized by:
  - Body part (chest, back, shoulders, legs, arms, core, full body)
  - Movement pattern (push, pull, squat, hinge, carry, rotation)
  - Equipment needed
  - NASM protocol level (stabilization, strength, power)
- **Auto-complete** search field for exercise names
- **Dropdown** organized by body part → exercises for quick selection
- Admin can **add new exercises** to the database

#### Stability & Core Section
- **Every workout log MUST include** a stability/core section (per NASM standards)
- Pre-populated with common stability exercises
- Trainer can add/modify

#### Form Fields Per Exercise
- Exercise name (auto-complete + dropdown)
- Sets × Reps × Weight
- Tempo (e.g., 4/2/1 per NASM)
- Rest period
- Notes (posture, form, pain, modifications)
- Pain flag (links to Body Map entry)

#### Workout Log Display
- Clean, scannable layout
- Previous workout comparison (side-by-side or inline)
- Progress indicators (weight/rep increases)

---

## PART 4: FOOD / MACRO LOGGER (DAILY FORM)

### Current State
- Backend exists: `DailyMacroLog.mjs` (198 lines), `foodScannerRoutes.mjs` (583 lines), `foodScannerService.mjs` (508 lines)
- **No dedicated frontend form exists**

### Requirements
1. **Dedicated daily food logging form** available on:
   - Admin dashboard (log for clients)
   - Trainer dashboard (log for clients)
   - Client dashboard (self-log)
   - User social page (self-log)

2. **AI Village decides the form fields** — but suggestions include:
   - Meal type (breakfast, lunch, dinner, snack, pre-workout, post-workout)
   - Food items (auto-complete from food database)
   - Portions/quantities
   - Macro breakdown (protein, carbs, fats, calories) — auto-calculated
   - Water intake
   - Photo upload (SwanStudios Deep Research analyzes food photo)
   - Daily totals vs goals comparison
   - Notes (how they felt, energy level, digestion)

3. **Subscription integration** (see Part 10 — Social subscription tier)

---

## PART 5: AI WORKOUT COPILOT → "SWANSTUDIOS DEEP RESEARCH — WORKOUT INTELLIGENCE"

### Current State
- `WorkoutCopilotPanel.tsx` (1092 lines) — exists but not pulling client data correctly
- `ClientAIWorkoutCreator.tsx` (595 lines) — client-facing version
- `longHorizonContextBuilder.mjs` (525 lines) — AI context builder exists

### Problems
- Not pulling all previous client workout data
- Not using client profile/goals from onboarding
- Not following NASM protocol hierarchy

### Required Fixes

#### Data Access
- Deep Research MUST have access to:
  - All previous workout logs (every session ever logged)
  - Client onboarding questionnaire (goals, health, PAR-Q)
  - Body map pain entries
  - Movement analysis results
  - Equipment profile (what equipment is available)
  - Measurement history
  - Macro/food logs
  - Client source (SwanStudios vs Move Fitness)

#### NASM Protocol Integration
- Generate workouts following NASM OPT Model:
  - Phase 1: Stabilization Endurance
  - Phase 2: Strength Endurance
  - Phase 3: Hypertrophy
  - Phase 4: Maximal Strength
  - Phase 5: Power
- Include advanced NASM cert protocols (CES, PES, FNS, WLS, BCS, SFS, YES, GFS)
- **Trainer/Admin-only side notes**: AI teaches the trainer HOW to perform assessments, what tools are needed for measurements, technique cues — visible only to admin/trainer, NOT to client

#### Workout Plan Durations
- Single workout (for variety / switching things up)
- 2-week plan
- 1-month plan
- 3-month plan (mesocycle)
- 6-month plan
- 9-month plan
- 12-month plan (full macrocycle)
- **Long Horizon tab** holds the multi-month plans
- All plans reference real client data, not generic templates

#### Plan Structure
- Each plan includes:
  - Warm-up (dynamic stretching per NASM)
  - Core/stability work (mandatory)
  - Main workout blocks
  - Cool-down (static stretching per NASM)
  - Cardio prescription
  - Weekly volume tracking
  - Progression rules

---

## PART 6: FORM ANALYSIS / MOVEMENT ANALYSIS

### Current State
- `MovementScreenManager.tsx` (1168 lines)
- `movementAnalysisController.mjs` (393 lines)
- 7-step wizard exists

### Required Enhancements
- AI Village analyzes ALL components and recommends upgrades
- Must be **next-level easy to use** and actually work
- Video upload analysis (if not already)
- Side-by-side comparison (before/after)
- NASM movement assessment integration (overhead squat, single-leg squat, push-up, pulling)
- Results feed into workout plan generation
- Mobile-optimized capture flow

---

## PART 7: BODY MAP — 3D UPGRADE

### Current State
- SVG-based body map (`BodyMapSVG.tsx`, 418 lines)
- Pain entry panel (`PainEntryPanel.tsx`, 693 lines)
- Works on mobile — keep this version

### Required Upgrades

#### Desktop Version (Three.js)
- 3D human body model (muscle anatomy, no skin)
- Male/female body toggle
- Zoom, rotate, pan
- Click/hover individual muscles to add pain points
- Pinpoint pain location on specific muscle fibers
- Pain severity scale (1-10) with color gradient
- Pain type (sharp, dull, burning, aching, tingling)
- History timeline (see pain progression over time)

#### Mobile Version
- Keep current SVG implementation
- Enhance with better touch targets (44px minimum)
- Pinch-to-zoom on body regions

#### Integration
- Pain data feeds into workout plan generation (avoid aggravating movements)
- Pain data feeds into form analysis recommendations
- Trainer/admin can view and annotate

---

## PART 8: BOOTCAMP TAB

### Current State
- `BootcampBuilderPage.tsx` (710 lines)
- `bootcampService.mjs` (569 lines)

### Required Analysis
- AI Village analyzes all bootcamp components
- Ensure AI has access to all bootcamp data
- Station-based workout builder
- Timer integration
- Music integration (if applicable)
- Participant tracking
- How to make it better and more useful

---

## PART 9: EQUIPMENT PAGE

### Current State
- `EquipmentManagerPage.tsx` (1129 lines)
- `EquipmentProfilePicker.tsx` (430 lines)
- `equipmentScanService.mjs` (166 lines)

### Required Upgrades
1. **Location-based equipment profiles:**
   - Dropdown to choose: Park, Move Fitness, Home, Custom
   - Each location has its own equipment inventory

2. **Photo-based equipment scanning:**
   - Upload photos of the gym (e.g., Move Fitness)
   - SwanStudios Deep Research analyzes photos → identifies all equipment
   - Saves equipment inventory automatically
   - Equipment inventory feeds into workout plan generation

3. **Universal access:**
   - Admin, trainer, client, user can all use equipment profiles
   - Equipment profiles available in social media area
   - When generating workouts, system checks available equipment

---

## PART 10: SOCIAL MEDIA, "BEYOND THE GYM" ECOSYSTEM & SUBSCRIPTION TIERS

### Vision: Beyond the Gym
SwanStudios isn't just a fitness platform — it's a **creative social ecosystem**. Imagine TikTok, Instagram, Twitch, YouTube, Meetup, and Nextdoor combined into one community where fitness meets art, music, singing, gaming, comedy, neighborhood connection, and real human connection.

#### Content Categories
| Category | Description |
|----------|-------------|
| **Dance & Movement** | Dance videos, choreography, freestyle sessions — hip-hop to contemporary |
| **Music Production** | Making songs, playing instruments, producing beats, sharing creative process |
| **Singing** | Vocal performances, covers, instrumentals, original music |
| **Art & Expression** | Artwork, digital art, photography, creative projects |
| **Gaming** | Gaming builds, favorite consoles, portable setups, streams — gamers get fit too |
| **Comedy** | Standup, skits, memes, funny content — make the community laugh while you flex |
| **Fitness Challenges** | Community workout challenges, transformation posts, accountability groups |
| **Community Meetups** | Local events, group activities, real-world connections — digital community, IRL |
| **Neighborhood / Local** | Nextdoor-style local community — neighborhood fitness groups, nearby gym recommendations, local trainer discovery, area-based challenges, community boards for local wellness events |

#### Social Feature Requirements
- Content category tagging system (multi-select)
- Category-based feed filtering
- Dedicated discovery/explore page per category
- Video upload + streaming support
- Creator profiles with category badges
- Challenge system tied to categories (not just fitness)
- Event/meetup creation and RSVP system
- Cross-category engagement (a dancer who also games)

### Current State
- `SocialPage.tsx` (513 lines), `SocialPage.V3.tsx` (784 lines)
- `CommunitySection.tsx` (1241 lines)
- Full social model layer (posts, comments, likes, connections, challenges, goals)

### Subscription Model
1. **Free tier ($0.00):**
   - Social feed (posts, comments, likes)
   - Basic profile
   - **Ads shown** (non-intrusive, tasteful placement — AI Village decides where)

2. **Premium tier (suggested $5/month, donation-based — user can enter $0.00):**
   - No ads
   - Equipment profile manager
   - Macro/food logger
   - Advanced analytics/graphs
   - Priority support

3. **Ad placement:**
   - AI Village analyzes social page layout
   - Suggest optimal ad locations that don't hurt UX
   - Simple, not overbearing — must maintain premium feel

4. **User dashboard features:**
   - Food logger widget
   - Equipment manager widget
   - Workout history viewer
   - Progress charts
   - Goal tracker

---

## PART 11: UNIVERSAL MASTER SCHEDULE — FULL OVERHAUL

### Current State
- `schedule.tsx` (2647 lines) — massive monolith
- `schedule-service.ts` (970 lines)
- SendGrid + Twilio services exist but not fully integrated

### Required Upgrades

#### MindBody-Level Features
1. **Click on client → see full profile:**
   - Last 10 workouts (or AI Village suggestion for count)
   - Measurement history
   - Weight/measurement TODO reminders ("next measurement due: March 20")
   - Pain map summary
   - Session balance
   - Referral source (who referred them)

2. **Payment integration in schedule:**
   - Apply payment from within schedule view
   - Mark session as paid/unpaid
   - Payment method indicator

3. **Recurring sessions:**
   - Create recurring weekly/biweekly appointments
   - Drag to reschedule
   - Bulk operations

4. **Cancellation workflow:**
   - Cancel with email notification (via SendGrid)
   - Cancel without notification (trainer discretion)
   - Early cancellation vs late cancellation flag
   - **No auto-deduct without admin/trainer permission**
   - Admin notified of all cancellations in dashboard

5. **Client profile quick-access:**
   - From schedule → click client name → profile panel slides in
   - Shows all relevant data at a glance

6. **SendGrid/Twilio full integration:**
   - Appointment reminders (24hr, 1hr before)
   - Cancellation notifications
   - Session summary after workout
   - Measurement reminders
   - Custom admin messages

---

## PART 12: THREE.JS CHARTS & PROGRESS VISUALIZATION

### Current State
- No Three.js in codebase
- Using basic React charts (if any)

### Requirements
1. **Desktop + powerful mobile:** Three.js animated progress charts
   - Weight progression (3D line chart with depth)
   - Volume tracking (animated bar charts)
   - Body composition changes
   - Strength curves
   - Attendance heatmap

2. **Weak devices fallback:** React-based charts (Recharts, Victory, or AI Village recommendation)
   - Auto-detect device capability
   - Graceful degradation
   - Same data, simpler rendering

---

## PART 13: TAB MERGING & WORKSPACE ANALYSIS

### Problem
Too many tabs/sections may exist. Need AI Village to analyze:
- Which tabs should be merged?
- Which features belong together?
- What's the optimal navigation structure?
- How to reduce clicks to minimum?
- Mobile-first information hierarchy

### Constraints
- Admin dashboard: max 2 clicks to any feature
- Client dashboard: max 1-2 clicks to any feature
- Social page: instant access to key tools
- Mobile: bottom nav with 4-5 core items max

---

## PART 14: ADMIN NOTIFICATION SYSTEM

### Requirements
- Admin dashboard must show notifications for:
  - Session cancellations (with reason)
  - New client signups
  - Payment confirmations
  - Measurement due dates
  - Client pain reports (flagged)
  - Workout plan completions
  - Social content reports
  - External client additions
- Real-time via WebSocket (Socket.IO already in place)
- Bell icon with count badge
- Notification center with filterable history

---

## EXECUTION PLAN

### Phase 1: Analysis (AI Village)
1. Run this master prompt through 9-Brain AI Village
2. AI Village analyzes every component mentioned
3. Generates enhancement recommendations per section
4. Identifies gaps, dead code, broken features
5. Produces detailed build plan with priority ordering

### Phase 2: Playwright Audit
1. Navigate every route and component covered by this plan
2. Screenshot current state
3. Identify broken features, console errors, missing data
4. Document what works vs what doesn't

### Phase 3: AI Village Review of Playwright Findings
1. AI Village reviews Playwright screenshots + console data
2. Upgrades the build plan with specific fixes
3. Gemini Creative Director provides UI/UX redesign specs
4. Priority-ranked implementation order

### Phase 4: Implementation
1. Move Fitness client system + Workout Log (PRIORITY — Day 1)
2. Food/Macro Logger form
3. Deep Research data access fixes
4. Schedule overhaul
5. Body Map 3D upgrade
6. Three.js charts
7. Social subscription + ads
8. Tab merging + cleanup

### Phase 5: Code Cleanup
1. Remove dead code
2. Consolidate duplicates
3. Optimize bundle size
4. Playwright regression test
5. AI Village final validation

---

## DESIGN STANDARDS

- **Theme:** Enchanted Apex: Crystalline Swan (unchanged)
- **Palette:** Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0`, Arctic Cyan `#50A0F0` (data viz only), Gilded Fern `#C6A84B`, Frost White `#E0ECF4`, Swan Lavender `#4070C0`, Wing Purple `#8B5CF6`, Abyssal Navy `#001840`
- **Dual-Button Glow System:** Blue buttons (`#002060`) → Wing Purple glow. Purple buttons (`#8B5CF6`) → Ice Wing Cyan glow. Cosmic Nebula gradient for hero CTAs.
- **Typography:** Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI)
- **Touch targets:** 44px minimum on ALL interactive elements
- **Mobile-first:** Design for phone, enhance for desktop
- **Minimum clicks:** Every feature reachable in ≤2 taps from any dashboard
- **Gemini 3.1 Pro** is Lead Design Authority for all UI/UX decisions
- **10-breakpoint responsive matrix:** 320–3840px

---

## SUCCESS CRITERIA

1. Workout Log works TODAY for Move Fitness clients
2. Voice dictation fills out workout forms from spoken/uploaded audio
3. All AI features branded "SwanStudios Deep Research"
4. Food logger available on all dashboards
5. Schedule rivals MindBody feature set
6. Body Map has 3D desktop version
7. Zero console errors on any page
8. Mobile checkout ≤3 taps
9. AI Village 9/9 pass on final validation
10. Every feature works on 375px mobile viewport

---

*SwanStudios — Where AI Meets Athletic Excellence*
*"Train smarter. Live stronger. Swan deeper."*
