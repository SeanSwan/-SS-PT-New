# SwanStudios Ultimate Audit Mega Prompt V1

## Executive Summary

This is a comprehensive, component-by-component, tab-by-tab, click-by-click audit blueprint for SwanStudios — a **social media personal training SaaS platform** where trainers bring their clients to log workouts, build plans, track progress, and engage socially. The platform must be production-ready for real client onboarding at Move Fitness and beyond.

**Owner:** Sean (Admin, 25+ years training experience, NASM/NCEP certified)
**Business Model:** Sean onboards Move Fitness clients AND independent clients. Trainers can join the platform to manage their own clients.
**Current State:** ~200+ components built, ~97% feature coverage, but significant integration gaps, mock data, monolith files, broken flows, and theme inconsistencies prevent production use.

---

## PART 1: CRITICAL BLOCKERS (Must Fix Before Client Use)

### 1.1 Mock Data Elimination

**Problem:** Multiple components fall back to hardcoded mock/demo data instead of real API data. This makes the app look fake to clients.

**Audit Checklist:**
- [ ] `WorkoutsTab.tsx` — FIXED: Now uses real WorkoutLog data via `GET /api/workout/sessions` with WorkoutLog include
- [ ] `ClientProgressDashboard.tsx` — Uses Recharts with potentially mock data, needs Victory migration + real data verification
- [ ] `ClientAnalyticsPanel.tsx` — Has `{/* TODO: Implement comparison charts */}`, uses Recharts
- [ ] `BusinessIntelligenceDashboard.tsx` — Demo data banners visible
- [ ] `SocialMediaCommandCenter.tsx` — Attempts real API but shows placeholder on failure
- [ ] `SocialClientDashboard.tsx` — Returns `null` (stub component)
- [ ] `HighRiskClientsWidget.tsx` — Partial stub
- [ ] ALL admin dashboard widgets — Verify each fetches real data, no "PREVIEW" badges showing

**Rule:** Every component must fetch from a real API endpoint. If no data exists yet, show an empty state with a clear CTA ("Log your first workout!" / "No clients assigned yet"), NOT fake numbers.

### 1.2 Workout Logger → Charts → Progress Pipeline (E2E Data Flow)

**Problem:** The core value proposition — log workouts, see progress charts — is broken because data doesn't flow end-to-end.

**Required Data Pipeline:**
```
Workout Logger (log exercises)
    ↓ POST /api/admin/clients/:id/workouts
WorkoutSession + WorkoutLog tables
    ↓ GET /api/workout/sessions (with logs)
    ↓ GET /api/analytics/:userId/*
Victory Charts (WorkoutChartsTab, NASMAnalyticsCharts)
    ↓ useWorkoutAnalytics hook
Client Progress Dashboard + User Dashboard WorkoutsTab
```

**Audit Checklist:**
- [ ] Workout Logger saves to `workout_sessions` + `workout_logs` tables correctly
- [ ] `GET /api/workout/sessions` returns WorkoutLog data (FIXED — logs now included)
- [ ] `GET /api/analytics/:userId/volume-progression` returns real aggregated data
- [ ] `GET /api/analytics/:userId/personal-records` returns real PRs
- [ ] `GET /api/analytics/:userId/frequency` returns real frequency data
- [ ] `useWorkoutAnalytics` hook successfully fetches and derives all chart data
- [ ] All 7 Victory charts in `WorkoutChartsTab` + `NASMAnalyticsCharts` render with real data
- [ ] User Dashboard `WorkoutsTab` shows real exercise usage by category (FIXED)
- [ ] Client Progress Dashboard shows real progress over time
- [ ] Admin can view any client's charts via EnhancedWorkoutsModal

**QA Test Plan — 2 Months of Workout Data:**
Create 32 workout sessions (4 days/week × 8 weeks) for a QA test client via the workout logger. Each session should include 4-6 exercises with realistic sets/reps/weight. After logging, verify:
1. Weekly Volume bar chart populates with 8 data points
2. Top Exercises horizontal bar chart shows the most-used exercises
3. Intensity Trend area chart shows workout intensity over time
4. 1RM Progression multi-line chart shows Brzycki estimates per exercise
5. Muscle Group Radar shows balanced/unbalanced training
6. RPE Trend shows rate of perceived exertion over time
7. Workout Calendar heatmap shows 32 colored cells across 8 weeks
8. User Dashboard WorkoutsTab shows exercises grouped by category, sorted most→least
9. Personal Records tab shows actual PRs with estimated 1RM

### 1.3 AI Assistant Integration (SwanStudios Assistant)

**Problem:** The AI assistant exists as a floating drawer but is NOT embedded in dashboard tabs with proper context awareness. The assistant doesn't know which tab it's on, can't auto-reference the current client, and the workout generation endpoint isn't connected to the chat flow.

**Current State:**
- `AIAssistantFAB.tsx` — Floating button works ✅
- `AIAssistantDrawer.tsx` — Chat interface works ✅
- `AITerminalPanel.tsx` — Embedded terminal exists but only in 3-4 tabs
- `useAIChat.ts` — Only defines 7 of 10+ needed context types
- `POST /api/ai/workout-generation` — Backend exists but frontend never calls it
- FRONTEND_DISPATCH events — WorkoutLogger listens, other pages don't

**Required Fixes:**
- [ ] Define ALL context types in `useAIChat.ts`: `scheduling`, `progress_analysis`, `exercise_library`, `data_analysis`, `gamification`, `social`
- [ ] Embed `AITerminalPanel` in EVERY relevant dashboard tab with auto-context:
  - Schedule tab → `scheduling`
  - Training Sessions → `workout_generation`
  - Client Progress → `progress_analysis`
  - NASM Exercises → `exercise_library`
  - Reports → `data_analysis`
  - Gamification → `gamification`
- [ ] Remove floating AI FAB on tabs that have embedded terminal (avoid duplicate AI panels)
- [ ] Connect AI chat to dedicated `/api/ai/workout-generation` endpoint when context is `workout_generation`
- [ ] Auto-populate client context when admin/trainer has a client selected
- [ ] AI should know pain entries, assessment data, OPT phase for the selected client
- [ ] AI should be able to fill out the workout logger via FRONTEND_DISPATCH events
- [ ] AI should generate single workouts AND long-horizon plans
- [ ] The AI assistant is called "SwanStudios Assistant" in all UI labels

**RBAC for AI Workout Generation:**
- Admin + Trainer: Can generate workouts for any assigned client
- Client: Can NOT generate workouts (view-only, can request from trainer)
- This is a deliberate design decision — trainers control the workout programming

### 1.4 Theme System — Dark-First Enforcement

**Problem:** Client and trainer dashboards show bright/colorful themes that look cheap. The theme changer works poorly on dashboards. Need cinematic dark-first design.

**Rules:**
- Default theme: `crystalline-dark` (Void Crystal) — near-black `#030712` background
- ALL components must use CSS custom properties with dark fallbacks: `var(--bg-base, #030712)`
- Only ONE light theme allowed: `crystalline-light` (Arctic Dawn)
- Theme toggle must work cleanly on ALL dashboards without layout breaks
- Admin, Trainer, Client dashboards must all look cinematic in default dark theme

**Audit Checklist:**
- [ ] Every styled-component uses `var()` with dark-theme fallbacks
- [ ] No hardcoded bright backgrounds (#ffffff, #f0f0f0, etc.) in dashboard components
- [ ] Theme toggle in header cycles through themes without breaking layout
- [ ] Client dashboard renders correctly in `crystalline-dark` (no white panels, no invisible text)
- [ ] Trainer dashboard renders correctly in `crystalline-dark`
- [ ] Admin dashboard renders correctly in `crystalline-dark`
- [ ] Charts have transparent/dark backgrounds that adapt to theme
- [ ] Modals, drawers, tooltips all respect theme variables

### 1.5 Client Card Branding (Move Fitness vs SwanStudios)

**Problem:** Client cards don't show the correct logo. Move Fitness clients (onboarded from Move Fitness gym) should show the Move Fitness logo. Independent SwanStudios clients show the SwanStudios logo.

**Implementation:**
- [ ] Client model needs a `source` or `organization` field (e.g., `'move_fitness'` | `'swanstudios'` | custom)
- [ ] Client cards check this field and render the appropriate logo
- [ ] Move Fitness logo: `frontend/src/assets/MoveFitLogo.png` (or `-clean.png` / `-3d.png`)
- [ ] SwanStudios logo: existing swan logo asset
- [ ] Admin can set the client's organization during onboarding or via client edit
- [ ] Logo appears on: client list cards, client detail header, printed workout plans

---

## PART 2: DASHBOARD AUDIT (Tab-by-Tab)

### 2.1 Admin Dashboard

**Route:** `/dashboard/*`

**Tabs to Audit (click every tab, verify every widget):**

| Tab | Route | Key Components | Audit Items |
|-----|-------|----------------|-------------|
| Overview | `/dashboard/default` | `AdminOverviewPanel.tsx` | KPI cards fetch real data, no mock. AI terminal embedded with `general` context |
| Clients | `/dashboard/client-management` | `ClientManagementDashboard.tsx`, `EnhancedAdminClientManagementView.tsx` | Client list loads, CRUD works, Move Fitness logo on correct clients, body map accessible, AI terminal with `client_review` context |
| Schedule | `/dashboard/schedule` | `UniversalMasterSchedule` | Calendar renders, sessions bookable, AI terminal with `scheduling` context |
| Training Sessions | `/dashboard/admin-sessions` | `enhanced-admin-sessions-view.tsx` | Workout logger opens, exercises searchable from rolodex, sessions save to DB, AI terminal with `workout_generation` context |
| Exercises | `/dashboard/nasm-exercises` | `AdminExerciseCommandCenter.tsx` | 840+ exercises visible, filter chips work, search works, custom exercise create works |
| Gamification | `/dashboard/admin-gamification` | `admin-gamification-view.tsx` | Shows CURRENT badge art (not old badges), point settings editable, achievement list correct |
| Packages | `/dashboard/admin-packages` | `admin-packages-view.tsx` | Package CRUD works, pricing correct |
| Reports | `/dashboard/reports` | `ReportAnalyticsDashboard.tsx` | Charts render with real data, PDF export works |
| Client Progress | `/dashboard/client-progress` | `admin-client-progress-view.tsx` | Victory charts show real workout data for selected client |

**Monolith Files Requiring Decomposition (Priority Order):**
1. `enhanced-admin-sessions-view.tsx` — **2,848 lines** (9.5x over limit)
2. `EnhancedAdminClientManagementView.tsx` — **2,403 lines** (8x over limit)
3. `AdminGalleryManager.tsx` — **1,911 lines**
4. `admin-packages-view.tsx` — **1,800 lines**
5. `AIMonitoringPanel.tsx` — **1,768 lines**
6. `GamificationOverview.tsx` — **1,659 lines**
7. `CommunicationCenter.tsx` — **1,456 lines**
8. `ClientDetailsPanel.tsx` — **1,421 lines**
9. `ClientProgressDashboard.tsx` — **1,270 lines**

### 2.2 Client Dashboard

**Route:** `/client-dashboard/*`

**Required Tabs/Sections:**
- [ ] Overview — Personal stats, upcoming sessions, achievement showcase
- [ ] Workouts — Exercise usage chart (FIXED: real data from logs)
- [ ] Progress — Victory charts showing personal progress over time
- [ ] Body Map — Pain entries, injury tracking (currently ADMIN ONLY — needs to be in client dashboard too)
- [ ] Schedule — Upcoming booked sessions
- [ ] Achievements/Gamification — Current tier, badges, XP progress
- [ ] Goals — Personal fitness goals
- [ ] Social — Feed, friends, challenges
- [ ] Settings — Profile, privacy, theme toggle

**Critical Fixes:**
- [ ] Body Map component must be accessible from client dashboard (not just admin)
- [ ] Client dashboard must be dark-themed by default (cinematic, not bright)
- [ ] AI workout tab — client should NOT be able to generate workouts (view-only, request from trainer)
- [ ] Charts must show real data from workout logs
- [ ] No mock data anywhere
- [ ] Photo upload for body map pain areas — client can upload a photo showing where it hurts, AI analyzes

### 2.3 Trainer Dashboard

**Route:** `/trainer-dashboard/*`

**Required Tabs/Sections:**
- [ ] My Clients — List of assigned clients with quick-access cards
- [ ] Schedule — Trainer's session calendar
- [ ] Workout Logging — Log workouts for any assigned client
- [ ] Workout Planning — Create workout plans using AI or manually
- [ ] Client Progress — View any client's Victory charts
- [ ] Exercises — Access to 840+ exercise rolodex
- [ ] Gamification — View client achievements, leaderboards

**Critical Fixes:**
- [ ] Dark theme by default (cinematic styling)
- [ ] Trainer can generate AI workouts for their clients
- [ ] Trainer can view client body map and pain entries
- [ ] Trainer can print/export workout plans to PDF

### 2.4 User Dashboard (Public Profile)

**Route:** `/user-dashboard/*`

**Sections:**
- [ ] Profile header — Photo, name, tier badge, level
- [ ] Achievement showcase — Top badges with rarity glow
- [ ] Chart section — Toggle-able Victory charts (user controls visibility)
- [ ] Workouts tab — Exercise usage from logs (FIXED)
- [ ] Social feed — Recent posts
- [ ] Stats summary — Total workouts, streak, current OPT phase

---

## PART 3: FEATURE DEEP DIVES

### 3.1 Workout Logger

**Component:** `frontend/src/components/WorkoutLogger/`

**E2E Flow to Verify:**
1. Admin/Trainer selects a client
2. Opens workout logger
3. Searches exercise from 840+ rolodex (autocomplete)
4. Adds exercise with sets/reps/weight/tempo/rest/RPE
5. Can add multiple exercises
6. Submits → saves to `workout_sessions` + `workout_logs`
7. Victory charts update with new data
8. Gamification points awarded (50 for workout, 10 per exercise)

**AI Assistant Integration:**
- Trainer can dictate to SwanStudios Assistant: "Log a chest workout for Jackie — bench press 4x8 at 135, incline dumbbell press 3x10 at 50"
- AI parses this, dispatches `AI_ADD_EXERCISE` events to populate the logger
- Trainer reviews and submits

### 3.2 Workout Planner

**Single Workout:**
- Admin/Trainer selects client → AI generates workout based on:
  - Client's OPT phase
  - Pain entries from body map
  - Assessment/orientation data
  - Previous workout history
  - Equipment available
  - Focus areas (muscle groups)
- Plan appears in logger for review → approve → save

**Long-Horizon Plan:**
- Multi-week periodized plan following NASM OPT protocol
- API: `POST /api/ai/long-horizon/generate`
- Should produce 4-12 week plan with phase progression
- Each day's workout follows OPT parameters (sets, reps, tempo, rest, %1RM)

### 3.3 Body Map + Photo Upload + AI Analysis

**Current:** Body map exists in admin dashboard only. Interactive SVG, pain entry panel.

**Required Enhancements:**
- [ ] Body map accessible from client dashboard (read-only for client's own data, or client can submit pain entries for trainer review)
- [ ] Photo upload option — client or trainer uploads a photo of the pain area
- [ ] Photo stored securely (R2/S3, not base64 in DB)
- [ ] AI analysis — when photo is uploaded to a body map entry, SwanStudios Assistant can analyze the image and suggest:
  - Possible muscle tightness or weakness
  - Common injury patterns for that area
  - Recommended corrective exercises from the rolodex
  - Referral recommendation if severe
- [ ] This data feeds into workout planning (AI avoids exercises that aggravate pain areas)

### 3.4 Print/PDF Export

**Required:**
- [ ] Individual workout plan → PDF (formatted for binder)
- [ ] Previous workout logs → PDF (session history)
- [ ] Client assessment/orientation → PDF
- [ ] Print button on all exportable views
- [ ] PDF includes: SwanStudios branding, client name, date, exercises with sets/reps/weight/tempo/rest, trainer notes
- [ ] Existing: `EnhancedPDFGenerator.tsx`, `ReportExport.tsx` — verify these work and connect to workout data

### 3.5 Gamification System

**Issues:**
- [ ] Admin gamification tab shows OLD badge art — update to current 16+ badge styles
- [ ] Badge manifest files exist: `frontend/public/badge-manifest.json`, `frontend/public/badges/achievements/achievement-badge-manifest.json` — verify these are loaded
- [ ] Gamification engine must trigger on:
  - Workout completion (50 pts)
  - Exercise completion (10 pts per exercise)
  - Personal record (100 pts)
  - Streak milestones (25/75/300/1000/5000 pts)
- [ ] Level-up animation protocol must fire (glow pulse, particle burst, badge entrance, XP counter)
- [ ] Client and trainer gamification views must show current data, not old/cached

### 3.6 Admin Impersonation (View-As)

**Current:** `AdminViewAsBar.tsx` and `AdminViewAsWrapper.tsx` exist but are NOT integrated into routing.

**Required:**
- [ ] Admin selects a client or trainer from a dropdown
- [ ] App renders that user's dashboard as if admin were that user
- [ ] Yellow/gold bar at top shows "Viewing as: [User Name] — [Exit]"
- [ ] Admin can test the full client/trainer experience
- [ ] No data mutations allowed in view-as mode (read-only impersonation)

### 3.7 Dictation / Voice Input

**Current:** `DictationOrb.tsx` exists with voice transcription via Gemini Flash.

**Required:**
- [ ] Every input that accepts text should support dictation
- [ ] AI Assistant accepts voice commands
- [ ] Workout logging can be done entirely by voice: "Add barbell squat, 4 sets of 8 at 225"
- [ ] Mobile-first — dictation button prominent on mobile, keyboard optional

---

## PART 4: QUALITY STANDARDS

### 4.1 Monolith Decomposition

13 files exceed the 300-line rule (combined 21,165 lines). Each must be decomposed:
- Extract sub-components (JSX in `.map()` → own file)
- Extract hooks (data fetching → `use[Feature].ts`)
- Extract utils (pure functions → `utils/`)
- Extract types (shared interfaces → `Types.ts`)
- Extract styled components (>5 → `Styles.ts`)

### 4.2 Recharts → Victory Migration

16 files still use Recharts. ALL charts must use Victory for cross-platform (web → React Native).

Priority migration files:
1. `ClientAnalyticsPanel.tsx`
2. `ClientProgressDashboard.tsx`
3. `BusinessIntelligenceDashboard.tsx`
4. `SocialMediaCommandCenter.tsx`
5. `AIMonitoringPanel.tsx`

### 4.3 Console Statement Cleanup

336 instances of `console.log/warn/error` in Pages directory. Replace with:
- Production: proper error boundaries + error state UI
- Development: conditional logging (`if (import.meta.env.DEV)`)

### 4.4 TODO/FIXME Resolution

18+ TODO comments marking unfinished features. Each must be:
- Implemented, or
- Removed with explanation, or
- Converted to a tracked issue

### 4.5 7-Star Documentation

Every file must have:
1. File header (purpose, author, date)
2. Section comments
3. Inline comments on non-obvious logic
4. Function docs on exports
5. Blueprint header on components >100 lines

### 4.6 Security Best Practices

- [ ] All API endpoints enforce RBAC (admin/trainer/client)
- [ ] No client can access another client's data
- [ ] Trainers can only access assigned clients
- [ ] Admins can access everything
- [ ] Photo uploads validated (file type, size limit, virus scan)
- [ ] AI consent required before AI features used for a client
- [ ] No PII in AI prompts (de-identification layer)
- [ ] JWT tokens refreshed properly
- [ ] CSRF protection on mutations
- [ ] Rate limiting on AI endpoints

### 4.7 Mobile-First Design

- [ ] 44px minimum touch targets on ALL interactive elements
- [ ] 10-breakpoint responsive matrix: 320, 375, 430, 768, 1024, 1280, 1440, 1920, 2560, 3840
- [ ] Dashboard sidebars collapse on mobile
- [ ] Charts resize gracefully
- [ ] Modals become full-screen bottom sheets on mobile
- [ ] Dictation orb prominent on mobile (voice-first workflow)

---

## PART 5: AI VILLAGE RECURSIVE AUDIT PROTOCOL

### Phase 1: Component-Level Scan

For EACH dashboard tab, AI Village validators must:
1. Navigate to the tab
2. Screenshot the rendered state
3. Verify no mock data badges ("PREVIEW", "DEMO")
4. Verify theme compliance (dark-first, CSS variables)
5. Verify all widgets load without errors
6. Verify WCAG contrast (4.5:1 minimum)
7. Verify 44px touch targets
8. Check for console errors

### Phase 2: Data Flow Verification

For EACH data pipeline:
1. Create test data via API
2. Verify it appears in all consuming components
3. Verify chart updates
4. Verify gamification triggers
5. Verify no stale/cached data

### Phase 3: AI Integration Verification

1. Open each tab with embedded AI terminal
2. Verify AI knows which tab it's on (context-aware)
3. Ask AI to perform tab-specific actions
4. Verify FRONTEND_DISPATCH events fire correctly
5. Verify workout generation saves to correct tables
6. Verify RBAC — client cannot generate workouts

### Phase 4: Theme Verification

1. Cycle through ALL 14 themes
2. Screenshot each dashboard in each theme
3. Verify no broken layouts, invisible text, or bright backgrounds in dark themes
4. Verify the ONE light theme (Arctic Dawn) works correctly

### Phase 5: Cross-Dashboard Consistency

1. Same client data should appear identically across admin, trainer, and client views
2. Permissions enforced — client sees only their data
3. Trainer sees only assigned clients
4. Admin sees everything

### Recursive Loop

After each fix round, re-run the full audit. Continue until:
- ZERO mock data in production views
- ZERO console errors
- ALL charts render with real data
- ALL AI terminals are context-aware
- ALL themes render correctly
- ALL touch targets ≥ 44px
- ALL files under 300 lines (or documented exception)
- ALL WCAG contrast ratios pass

---

## PART 6: PRIORITIZED EXECUTION ORDER

### Sprint 1: Data Pipeline (Critical Path)
1. Verify/fix workout logger → WorkoutLog → database save flow
2. Verify all analytics API endpoints return real data
3. Connect Victory charts to real data in all dashboards
4. Create QA test data (2 months, 4 days/week)
5. Fix User Dashboard WorkoutsTab (DONE)
6. Fix Client Progress charts

### Sprint 2: AI Assistant Integration
1. Define all missing AI context types
2. Embed AITerminalPanel in all dashboard tabs
3. Connect workout generation endpoint to AI chat
4. Implement FRONTEND_DISPATCH in workout logger from AI
5. Auto-populate client context (pain entries, OPT phase, history)
6. RBAC: block client workout generation

### Sprint 3: Theme & UI Polish
1. Audit all components for CSS variable usage
2. Fix dark theme rendering on client/trainer dashboards
3. Decompose top 5 monolith files
4. Migrate top 5 Recharts files to Victory
5. Fix gamification badge rendering
6. Implement Move Fitness vs SwanStudios logo on client cards

### Sprint 4: Missing Features
1. Body map in client dashboard
2. Photo upload for pain areas + AI analysis
3. PDF/print export for workout plans
4. Admin impersonation (view-as) integration
5. Long-horizon workout plan UI + AI

### Sprint 5: Polish & QA
1. Remove all mock data fallbacks
2. Clean up 336 console statements
3. Resolve 18+ TODO comments
4. 7-star documentation on all modified files
5. Full AI Village recursive audit until clean
6. Mobile responsiveness verification across 10 breakpoints
7. WCAG accessibility pass
8. Security audit (RBAC, PII, consent)

---

## APPENDIX A: File Inventory

### Monolith Files (>300 lines, require decomposition)
| File | Lines | Priority |
|------|-------|----------|
| enhanced-admin-sessions-view.tsx | 2,848 | P0 |
| EnhancedAdminClientManagementView.tsx | 2,403 | P0 |
| AdminGalleryManager.tsx | 1,911 | P1 |
| admin-packages-view.tsx | 1,800 | P1 |
| AIMonitoringPanel.tsx | 1,768 | P1 |
| EnhancedSystemAnalytics.tsx | 1,841 | P1 |
| GamificationOverview.tsx | 1,659 | P2 |
| MCPServersSection.tsx | 1,585 | P2 |
| ClientsManagementSection.tsx | 1,634 | P2 |
| CommunicationCenter.tsx | 1,456 | P2 |
| ClientDetailsPanel.tsx | 1,421 | P2 |
| ClientProgressDashboard.tsx | 1,270 | P2 |
| ClientAnalyticsPanel.tsx | 899 | P3 |

### Recharts Files (require Victory migration)
16 files across admin dashboard components — see dead data audit results.

### Stub Components (require implementation or removal)
- `SocialClientDashboard.tsx` — returns null
- `HighRiskClientsWidget.tsx` — partial stub

### Key API Endpoints to Verify
| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/workout/sessions` | GET | User's workout sessions with logs | FIXED |
| `/api/admin/clients/:id/workouts` | GET | Admin view of client workouts | Working |
| `/api/analytics/:userId/volume-progression` | GET | Weekly volume data | Needs verification |
| `/api/analytics/:userId/personal-records` | GET | PR data | Needs verification |
| `/api/analytics/:userId/frequency` | GET | Exercise frequency | Needs verification |
| `/api/ai/workout-generation` | POST | AI workout plan generation | Backend works, frontend not connected |
| `/api/ai/long-horizon/generate` | POST | Multi-week plan generation | Needs verification |
| `/api/ai-chat/conversations/:id/messages` | POST | AI chat message | Working |
| `/api/pain-entries/:clientId` | GET | Pain entries for body map | Working |
| `/api/exercises/all` | GET | Full exercise database | Working (trainer/admin only) |
| `/api/exercises/search` | GET | Exercise search | Working |

---

*This document should be validated by the AI Village 11-brain system, refined, and used as the master execution blueprint for bringing SwanStudios to production quality.*
