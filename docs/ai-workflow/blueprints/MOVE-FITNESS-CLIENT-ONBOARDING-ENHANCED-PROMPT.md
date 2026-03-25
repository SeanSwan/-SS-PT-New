# Move Fitness Client Onboarding — Enhanced Master Prompt

> **Origin:** User requirements prompt, enhanced by 11-Brain AI Village (Phase 1-3) + Opus CEO Review (Phase 4)
> **Date:** 2026-03-22
> **Authority:** Claude Opus 4.6 (CEO) — FINAL
> **Status:** Ready for implementation

---

## 1. OVERVIEW

This prompt covers the end-to-end flow for onboarding Move Fitness clients (and all future external clients) into the SwanStudios platform via the admin dashboard. It encompasses:

1. **Admin creates client** via CreateClientModal (with `clientSource: 'move_fitness'`)
2. **Password creation flow** using `forcePasswordChange` mechanism
3. **Client dashboard** with Victory charts displaying NASM-protocol-relevant data
4. **Chart selection** from the 50-chart Victory gallery for client-relevant progress tracking
5. **Blueprint headers** on all touched files per CLAUDE.md protocol

---

## 2. ADMIN CLIENT CREATION FLOW

### 2.1 Current State
- **File:** `frontend/src/components/DashBoard/Pages/admin-clients/CreateClientModal.tsx`
- Admin fills out client details (name, email, phone, goals, health concerns)
- `clientSource` dropdown already exists: `swanstudios | move_fitness | external`
- `availableSessions` field sets initial session count
- Trainer assignment dropdown

### 2.2 Required Fixes (AI Village P0)

#### P0-1: Modal Close Bug (CRITICAL)
**File:** `CreateClientModal.tsx` ~Line 425
**Issue:** After successful client creation, the modal does NOT auto-close, allowing duplicate submissions.
**Fix:** Add `onClose()` call after successful POST response.
```tsx
// After successful API response:
onClose(); // Close modal immediately
onClientCreated?.(newClient); // Notify parent to refresh list
```

#### P0-2: Alert Box Colors (Design System)
**Issue:** Hardcoded `#ff6b6b` error colors — must use CS theme tokens.
**Fix:**
```tsx
// Error state:
background: 'rgba(153, 27, 27, 0.3)';    // CS.errorBg
border: '1px solid rgba(248, 113, 113, 0.35)'; // CS.errorBorder
color: '#fca5a5';                          // CS.errorText

// Success state:
background: 'rgba(80, 160, 240, 0.12)';
border: '1px solid rgba(80, 160, 240, 0.4)';
color: '#50A0F0'; // Arctic Cyan

// Warning state:
background: 'rgba(198, 168, 75, 0.1)';
border: '1px solid rgba(198, 168, 75, 0.4)';
color: '#C6A84B'; // Gilded Fern
```

### 2.3 Move Fitness-Specific Enhancements

#### Bulk Import (Future Sprint)
- Admin should eventually be able to import multiple Move Fitness clients from CSV
- Fields: firstName, lastName, email, phone, fitnessGoal, healthConcerns
- Auto-set `clientSource: 'move_fitness'` for all imported rows
- **NOT in scope for this prompt** — document as future feature

#### Source Badge on Client Card
- Already implemented: Move Fitness 3D logo + SwanStudios logo on client cards
- Source filter dropdown in EnhancedAdminClientManagementView
- **No additional work needed here**

---

## 3. PASSWORD CREATION FLOW (forcePasswordChange)

### 3.1 Current Backend Implementation (VERIFIED WORKING)

**File:** `backend/models/User.mjs` — Line 209
```javascript
forcePasswordChange: { type: DataTypes.BOOLEAN, defaultValue: false }
```

**File:** `backend/controllers/authController.mjs`
- **Login check (Line 767):** When `user.forcePasswordChange === true`:
  - Returns `{ forcePasswordChange: true, tempToken: <JWT>, userId, message: 'Password change required' }`
  - `tempToken` is a short-lived JWT (15 min) that ONLY allows the password change endpoint
- **Password change (Line 1377):** After successful password update:
  - Sets `user.forcePasswordChange = false`
  - Returns full auth token for normal session

### 3.2 Admin Flow
When admin creates a new client:
1. Admin enters a **temporary password** in CreateClientModal
2. Backend sets `forcePasswordChange: true` on the new User record
3. Admin communicates temporary credentials to client (in-person, text, email)

### 3.3 Frontend Password Change Flow (NEEDS IMPLEMENTATION)

**Required Component:** `frontend/src/pages/auth/ForcePasswordChange.tsx` (NEW)

#### Wireframe:
```
┌─────────────────────────────────────────────────────┐
│                  SwanStudios Logo                      │
│                                                       │
│         Welcome! Please set your password.            │
│                                                       │
│  ┌─────────────────────────────────────────────┐     │
│  │ New Password                          [👁]  │     │
│  └─────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────┐     │
│  │ Confirm Password                      [👁]  │     │
│  └─────────────────────────────────────────────┘     │
│                                                       │
│  Password Strength: ████████░░ Strong                │
│                                                       │
│  ☑ At least 8 characters                             │
│  ☑ Contains uppercase letter                         │
│  ☑ Contains number                                   │
│  ☐ Contains special character                        │
│                                                       │
│  ┌─────────────────────────────────────────────┐     │
│  │          Set Password & Continue              │     │
│  └─────────────────────────────────────────────┘     │
│                                                       │
│  Your trainer has created your account.               │
│  Set a secure password to get started.                │
└─────────────────────────────────────────────────────┘
```

#### Click-Outcome Flowchart:
```
[Login Page] → User enters temp credentials → POST /api/auth/login
  → Backend returns { forcePasswordChange: true, tempToken }
  → Frontend redirects to /set-password
  → [ForcePasswordChange page]
    → User enters new password + confirm
    → [Set Password button] → POST /api/auth/change-password (with tempToken)
      → Backend sets forcePasswordChange=false, returns full JWT
      → Frontend stores token, redirects to /dashboard
```

#### Implementation Requirements:
- **Route:** `/set-password` — protected by tempToken presence in state/URL params
- **Password validation:** Min 8 chars, 1 uppercase, 1 number, 1 special char
- **Password strength meter:** Visual bar (weak=red, medium=yellow, strong=green)
- **Show/hide password toggle** on both fields
- **44px minimum touch targets** on all interactive elements
- **Crystalline Swan theme** — Midnight Sapphire background, Frost White text, Wing Purple CTA button with Ice Wing glow
- **Error handling:** Network errors, token expiration (redirect back to login with message)
- **No "forgot password" link** — this IS the password creation step

#### Login Page Update:
**File:** `frontend/src/pages/auth/Login.tsx` (or equivalent)
- After login API returns `forcePasswordChange: true`:
  - Store `tempToken` and `userId` in React state (NOT localStorage — temp tokens should be ephemeral)
  - Navigate to `/set-password` using React Router
  - Pass tempToken via route state: `navigate('/set-password', { state: { tempToken, userId } })`

---

## 4. CLIENT DASHBOARD — VICTORY CHARTS

### 4.1 Current State
**File:** `frontend/src/components/ClientDashboard/RevolutionaryClientDashboard.tsx`
- Uses "galaxy" section navigation (Overview, Workouts, Progress, Health, etc.)
- Currently has placeholder/basic data displays
- Particle background (needs isolation fix — see Section 6)

**File:** `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientProgressDashboard.tsx`
- Still uses **Recharts** — must migrate to **Victory** per project mandate

### 4.2 Chart Selection — Client-Relevant Victory Charts

From the 50-chart Victory gallery, these charts are selected for the **client dashboard** based on NASM protocol relevance and client data visibility:

#### Tier 1: Core Progress Charts (Always Visible — "The Big 6")
| # | Chart | Type | Data Source | Why It Matters |
|---|-------|------|-------------|----------------|
| 1 | **Weight Progression** | Line | Workout logs → body weight entries | Primary metric for most clients. Shows trend over time. |
| 2 | **Strength Progression (1RM)** | Line | Workout logs → Brzycki formula | NASM protocol core: tracks estimated 1RM per major lift. Shows phase progression. |
| 3 | **Workout Calendar Heatmap** | Heatmap | Workout logs → dates | GitHub-style consistency visualization. Drives streak behavior + gamification. |
| 4 | **Muscle Group Balance** | Radar | Workout logs → exercises by muscle group | NASM assessment: identifies imbalances. Prevents overtraining one group. |
| 5 | **Weekly Volume** | Bar | Workout logs → total sets × reps × weight | NASM periodization: volume should progress per OPT phase. Key overtraining indicator. |
| 6 | **Goal Progress** | Gauge/Bullet | User goals → current metrics | Shows % progress toward client's stated goals (weight, strength, body fat). |

#### Tier 2: NASM Protocol Charts (Shown When Data Exists)
| # | Chart | Type | Data Source | Why It Matters |
|---|-------|------|-------------|----------------|
| 7 | **Training Load** | Area | Workout logs → volume × intensity | NASM periodization tracking. Shows progressive overload compliance. |
| 8 | **Body Composition** | Area | Body measurements → fat %, lean mass | Separates weight loss from muscle gain. Critical for client motivation. |
| 9 | **Training Phases** | Stream | Workout logs → OPT phase tags | Shows time spent in each NASM OPT phase (1-5). Ensures proper periodization. |
| 10 | **Exercise Comparison** | Bar | Workout logs → top exercises by volume | Shows which exercises drive most progress. Informs programming decisions. |

#### Tier 3: Engagement & Wellness Charts (Optional/Toggle-able)
| # | Chart | Type | Data Source | Why It Matters |
|---|-------|------|-------------|----------------|
| 11 | **Session Frequency** | Line | Workout logs → sessions per week | Adherence tracking. Correlate frequency with results. |
| 12 | **Calorie Burn** | Area | Workout logs → estimated calories | General wellness metric. Ties to nutrition recommendations. |
| 13 | **Mood & Energy** | Stream | Daily check-ins → mood/energy scores | Recovery indicator. Low energy = possible overtraining. |
| 14 | **Macro Split** | Donut | Nutrition logs → macronutrient breakdown | Nutrition compliance if tracking is enabled. |
| 15 | **Completion Funnel** | Funnel | Workout plans → started → completed | Shows workout adherence: how many planned workouts actually get done. |

### 4.3 Client Dashboard Layout with Charts

#### Wireframe:
```
┌─────────────────────────────────────────────────────────────┐
│  [Swan Logo] Client Dashboard    [Level 12] [🔥 7-day]     │
│  Welcome back, Jackie!           Bronze Forge Tier           │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│ Overview │  ┌─── KPI Cards ──────────────────────────────┐  │
│ Workouts │  │ Total      Current    Streak   Next        │  │
│ Progress │  │ Workouts   OPT Phase  7 days   Session     │  │
│ Health   │  │ 42         Phase 2    🔥 7     Thu 10am    │  │
│ Goals    │  └────────────────────────────────────────────┘  │
│ Nutrition│                                                   │
│ Messages │  ┌─── The Big 6 Charts ───────────────────────┐  │
│ Account  │  │ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│          │  │ │ Weight   │ │ 1RM      │ │ Heatmap  │    │  │
│          │  │ │ Progress │ │ Strength │ │ Calendar │    │  │
│          │  │ └──────────┘ └──────────┘ └──────────┘    │  │
│          │  │ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│          │  │ │ Muscle   │ │ Weekly   │ │ Goal     │    │  │
│          │  │ │ Radar    │ │ Volume   │ │ Progress │    │  │
│          │  │ └──────────┘ └──────────┘ └──────────┘    │  │
│          │  └────────────────────────────────────────────┘  │
│          │                                                   │
│          │  ┌─── NASM Protocol Charts ───────────────────┐  │
│          │  │ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│          │  │ │Training  │ │ Body     │ │ OPT      │    │  │
│          │  │ │ Load     │ │ Comp     │ │ Phases   │    │  │
│          │  │ └──────────┘ └──────────┘ └──────────┘    │  │
│          │  └────────────────────────────────────────────┘  │
│          │                                                   │
│          │  ┌─── AI Insights ────────────────────────────┐  │
│          │  │ "Your bench press 1RM increased 12% this   │  │
│          │  │  month. Ready to move to Phase 3?"         │  │
│          │  │                        [View AI Analysis]   │  │
│          │  └────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────┘
```

### 4.4 Chart Integration Architecture

#### Data Flow:
```
Workout Logs (DB) → /api/progress/:userId → Victory Chart Components
                  → /api/analytics/:userId → Computed metrics (1RM, volume, etc.)
                  → /api/gamification/:userId → XP, level, tier, badges
```

#### Component Architecture:
```
graph TD
  A[RevolutionaryClientDashboard] --> B[ProgressSection]
  B --> C[ChartGrid]
  C --> D[SafeChart wrapper]
  D --> E1[WeightProgressionChart]
  D --> E2[StrengthProgressionChart]
  D --> E3[WorkoutCalendarHeatmap]
  D --> E4[MuscleGroupRadar]
  D --> E5[WeeklyVolumeBar]
  D --> E6[GoalProgressGauge]
  C --> F[NASMProtocolCharts]
  F --> D
  D --> G1[TrainingLoadArea]
  D --> G2[BodyCompositionArea]
  D --> G3[TrainingPhasesStream]
```

#### Implementation Pattern:
```tsx
// Each chart wrapped in SafeChart for error isolation + React.lazy for code splitting
const WeightProgression = React.lazy(() => import('../../Charts/charts/line/WeightProgression'));

// In the dashboard section:
<SafeChart title="Weight Progression">
  <Suspense fallback={<ChartSkeleton />}>
    <WeightProgression data={progressData.weight} />
  </Suspense>
</SafeChart>
```

### 4.5 Chart Visibility & Privacy
- Clients can toggle which charts appear on their **public profile** (social layer)
- Default visible on profile: Weight Progression, Workout Heatmap, Muscle Radar, Goal Progress
- All 15 charts always visible on the **private client dashboard**
- Admin sees ALL charts for any client regardless of settings
- Settings stored in user preferences: `chartVisibility: { [chartId]: boolean }`

---

## 5. NASM PROTOCOL DATA DISPLAY

### 5.1 Key Metrics Every Client Should See

| Metric | Source | Formula/Logic | Display |
|--------|--------|---------------|---------|
| **Current OPT Phase** | Trainer-assigned or AI-recommended | Phase 1-5 per NASM model | Badge + description |
| **Estimated 1RM** | Workout logs (weight × reps) | Brzycki: `weight / (1.0278 - 0.0278 × reps)` | Per exercise, line chart trend |
| **Training Volume** | Workout logs | `Σ(sets × reps × weight)` per session | Weekly bar chart |
| **Progressive Overload %** | Compare current vs previous mesocycle | `(currentVolume - prevVolume) / prevVolume × 100` | Trend indicator (↑↓→) |
| **Muscle Group Distribution** | Workout logs → exercise muscle tags | % volume per muscle group | Radar chart |
| **Rest/Recovery Compliance** | Workout timestamps | Days between sessions per muscle group | Heatmap (muscle recovery) |
| **Tempo Adherence** | AI workout plan vs logged tempo | Match rate % | Progress bar |
| **Body Measurements** | Client self-report or trainer entry | Weight, body fat %, waist, etc. | Multi-line chart |

### 5.2 OPT Phase Display Card
```
┌─── Current NASM Phase ────────────────────────────────┐
│                                                        │
│  PHASE 2: Strength Endurance                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━ 65% complete             │
│                                                        │
│  Reps: 8-12 | Sets: 2-4 | Tempo: 2/0/2              │
│  Rest: 0-60s | Intensity: 70-80% 1RM                 │
│                                                        │
│  Week 4 of 6 in this phase                            │
│  Next Phase: Hypertrophy (Phase 3)                    │
│                                                        │
│  [View Phase History]  [Ask AI About My Phase]        │
└────────────────────────────────────────────────────────┘
```

---

## 6. CODE QUALITY FIXES (AI Village Consensus — Ratified by CEO)

### 6.1 P0 Fixes (This Sprint)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Suspense boundary missing | `ClientOnboardingWizard.tsx` ~L330 | Wrap `<CurrentSection />` in `<Suspense>` with themed skeleton fallback |
| 2 | Modal doesn't close on success | `CreateClientModal.tsx` ~L425 | Call `onClose()` after successful POST |

### 6.2 P1 Fixes (Next Sprint)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 3 | Particle render thrashing | `RevolutionaryClientDashboard.tsx` ~L240 | Extract `ParticleBackground` as `React.memo` component with isolated state |
| 4 | Event bus memory leak | `RevolutionaryClientDashboard.tsx` L245-252 | Wrap `handleSectionChange` in `useCallback`, fix cleanup |
| 5 | Hardcoded alert colors | `CreateClientModal.tsx` + `ClientOnboardingWizard.tsx` | Use CS theme tokens (see Section 2.2) |

### 6.3 Design Fixes (Ratified)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 6 | Typography: UI text using wrong font | `RevolutionaryClientDashboard.tsx` L102 | `font-family: 'Sora', sans-serif` for UI, Plus Jakarta Sans for headings |
| 7 | Scrollbar hover too abrupt | `RevolutionaryClientDashboard.tsx` L159 | Add `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` to scrollbar thumb |
| 8 | Step indicators not keyboard accessible | `ClientOnboardingWizard.tsx` | Change `div` with `cursor: pointer` to `button` with `aria-label="Go to step X"` |
| 9 | `steps` array recreated every render | `ClientOnboardingWizard.tsx` | Move `steps` definition outside component or wrap in `useMemo` |
| 10 | Dropdown options invisible on dark bg | `CreateClientModal.tsx` L216 | `option { background: #002060; color: #E0ECF4; }` |

---

## 7. BLUEPRINT REQUIREMENTS

All files touched by this implementation must have proper blueprint headers per CLAUDE.md Enhanced Blueprint-First Protocol:

### Files Requiring Blueprints:
1. `ForcePasswordChange.tsx` (NEW) — Full parent blueprint
2. `RevolutionaryClientDashboard.tsx` — Update existing blueprint with chart architecture
3. `CreateClientModal.tsx` — Add blueprint if missing
4. `ClientOnboardingWizard.tsx` — Add blueprint if missing
5. `ClientProgressDashboard.tsx` — Update blueprint, note Victory migration
6. Any new chart wrapper/integration components

### Blueprint Must Include:
- Wireframe (ASCII)
- Click-outcome flowchart
- Data flow (props, state, API calls, events, children)
- Mermaid architecture diagram
- Gamification hooks (what triggers XP/badges)

---

## 8. GAMIFICATION INTEGRATION

### Onboarding Gamification:
- **Account created** → 0 XP (no free points for existing)
- **First password set** → 10 XP ("Welcome" badge unlock — Common rarity)
- **Profile completed (all fields)** → 50 XP ("Identity Forged" badge — Common)
- **First workout logged** → 50 XP + 10 XP per exercise ("First Steps" badge — Rare)
- **First 7-day streak** → 75 XP ("Ignition" badge — Rare)

### Chart-Related Gamification:
- **View progress charts for first time** → 10 XP ("Data Explorer" badge — Common)
- **Hit a new 1RM** → 100 XP ("Personal Record" badge — Epic on 5th PR)
- **Complete OPT phase** → 200 XP ("Phase Master" badge — Rare, Epic at Phase 4+)

---

## 9. GOLF CLIENT PERSONA (Target Demographic)

SwanStudios is actively targeting **wealthy golf clients** as a premium demographic. This affects chart selection, onboarding language, and dashboard features.

### 9.1 Golf-Relevant Charts (Add to Client Dashboard)
| Chart | Why Golf Clients Need It |
|-------|--------------------------|
| **Muscle Group Radar** | Shows rotational power balance (core, obliques, shoulders, hips) — critical for golf swing |
| **Body Composition Area** | Golfers care about lean mass for club speed without bulk that restricts rotation |
| **Mood & Energy Stream** | Recovery tracking matters for tournament prep and practice intensity |
| **Training Phases Stream** | Golf off-season = Phase 3-4 (strength), pre-season = Phase 1-2 (stability/endurance), in-season = Phase 5 (power) |

### 9.2 Golf-Specific NASM Protocol Considerations
- **OPT Phase mapping to golf season:**
  - Off-season (Nov-Feb): Phase 2-3 (Strength Endurance → Hypertrophy) — build foundational strength
  - Pre-season (Mar-Apr): Phase 1 (Stabilization) — corrective exercises, mobility, rotational stability
  - In-season (May-Oct): Phase 5 (Power) — explosive rotational power, maintain without overtraining
  - Tournament prep: Phase 1 + Phase 5 superset (stability + power)
- **Key exercises for golf clients:** Cable wood chops, medicine ball rotational throws, single-leg RDLs, hip flexor stretches, thoracic spine mobility, anti-rotation press
- **Metrics golfers track:** Rotational power, hip-to-shoulder separation, thoracic mobility, single-leg balance time

### 9.3 Trust Signals for Golf Demographic
Wealthy golf clients expect premium credentials display:
```
┌─── Your Trainer ──────────────────────────────────────┐
│  [Sean Swan Photo]                                     │
│  Sean Swan, CPT                                        │
│  25+ Years Training Experience                         │
│                                                        │
│  [NASM] [NCEP] [24HR Master] [Gold's] [LA Fitness]   │
│                                                        │
│  Specializing in golf performance, mobility,           │
│  and NASM OPT periodization for athletes.              │
└────────────────────────────────────────────────────────┘
```

### 9.4 Onboarding Language Adjustments
- Replace "fitness goals" with "performance goals" in client-facing copy
- Add "Golf Performance" as a goal option in onboarding wizard
- Add "Improve Swing Power" and "Increase Mobility" as selectable goals
- Premium language: "performance optimization" not "working out"

---

## 10. IMPLEMENTATION ORDER

1. **P0 Fixes** — Modal close bug + Suspense boundary (30 min)
2. **ForcePasswordChange page** — New component + login redirect (2 hrs)
3. **Victory chart integration** — Wire Big 6 charts into client dashboard (3 hrs)
4. **NASM data endpoints** — Ensure /api/progress and /api/analytics return chart-ready data (2 hrs)
5. **Golf-specific onboarding** — Add goal options, performance language (1 hr)
6. **Blueprint headers** — All touched files (1 hr)
7. **P1 fixes** — Particle isolation, event bus, theme colors (1 hr)
8. **Chart visibility settings** — Client profile toggle UI (2 hrs)
9. **Recharts → Victory migration** in ClientProgressDashboard (1 hr)
10. **Trainer credentials display** — Trust signal card with cert badges (1 hr)

---

## 11. CEO OVERRIDES & CORRECTIONS

The following AI Village recommendations were **rejected or corrected** by Opus CEO:

| Recommendation | Source | Ruling | Reason |
|----------------|--------|--------|--------|
| Rose Quartz `#D9385E` for errors | Phase 3 Design | **REJECTED** | Use existing `CS.errorText: '#fca5a5'`, `CS.errorBg: 'rgba(153,27,27,0.3)'` |
| First Responder persona | Phase 1 User Research | **DEFERRED** | Not a current target demographic. Revisit if demand arises. |
| Credentials display | Phase 1 User Research | **RATIFIED** | Sean's certs (NASM workshop, NCEP, 24HR Master Trainer, Gold's Gym, LA Fitness) should be displayed as trust signals. Frame as "25+ years training experience" + specific cert badges. |
| "Reduce onboarding to 5 steps" | Phase 1 User Research | **DEFERRED** | Current wizard works. Simplification is future UX sprint. |
| "Social tab missing" | Phase 1 Competitive Intel | **FALSE** | Social features ARE built. Validators had incomplete context. |
| React Query for client fetching | Phase 2 Code Quality | **DEFERRED** | Valid improvement but out of scope. Current fetch pattern works. |
| High-contrast theme option | Phase 1 User Research | **DEFERRED** | Good accessibility idea, but separate sprint. Not blocking onboarding. |

---

*Enhanced by SwanStudios 11-Brain AI Village + Opus CEO Phase 4 Review*
*Ready for implementation upon user approval.*
