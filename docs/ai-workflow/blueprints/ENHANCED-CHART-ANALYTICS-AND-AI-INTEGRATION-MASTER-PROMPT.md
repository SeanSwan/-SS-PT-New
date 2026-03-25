# Enhanced Chart Analytics, AI Integration & Sports Goal System — Master Prompt V2

> **Status:** AI VILLAGE VALIDATED — 11/11 passed (2026-03-22)
> **CEO Ruling:** APPROVED WITH MANDATORY SECURITY FIXES
> **Author:** Claude Opus 4.6 (CEO) | **Date:** 2026-03-22
> **Scope:** Charts → Real Data, Exercise Rolodex Chart, Sports Goals, AI Assistant Upgrades, Trainer/Admin Client Panels
> **Protocol:** Blueprint-First, 7-Star Documentation, 300-line max, CLAUDE.md compliant
> **Security:** IDOR middleware, AI draft-and-approve, privacy-first defaults (see Phase 0)

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Chart Data Pipeline — Connect Victory Charts to Real API](#2-chart-data-pipeline)
3. [Exercise Rolodex Chart — All-Time Exercise History](#3-exercise-rolodex-chart)
4. [Sports Goal System — Expanded Goal Categories](#4-sports-goal-system)
5. [AI Assistant Upgrades — SwanStudios Assistant](#5-ai-assistant-upgrades)
6. [Trainer & Admin Client Panel — Chart Visibility](#6-trainer-admin-client-panel)
7. [User Dashboard / Social Profile — Chart Integration](#7-user-dashboard-social-profile)
8. [Gamification Integration — Exercise Challenges](#8-gamification-integration)
9. [New Backend Endpoints Required](#9-new-backend-endpoints)
10. [New Frontend Components Required](#10-new-frontend-components)
11. [CLAUDE.md Updates Required](#11-claudemd-updates)
12. [Implementation Order](#12-implementation-order)
13. [CEO Overrides & Design Decisions](#13-ceo-overrides)

---

## 1. EXECUTIVE SUMMARY

### The Problem
- **Victory charts (50)** render hardcoded demo data — users see fake progress
- **No exercise frequency chart** — clients can't see which exercises they've done and how often
- **Goals section** only has 11 options — missing major sports (soccer, baseball, basketball, tennis, etc.)
- **AI Assistant** can fill workout logger forms but can't send emails/SMS or pull chart data
- **Trainers/admins** can't see client charts from their dashboard panels
- **Social profiles** have no chart integration — users can't showcase their progress
- **Gamification** doesn't tie to exercise variety or monthly challenges

### The Solution
A unified system that connects workout logging → analytics API → Victory charts → AI Assistant → social profiles → gamification, all following blueprint protocol.

### Data Flow (Target State)
```
Workout Logger → WorkoutSession + WorkoutExercise + Set (DB)
    ↓
Analytics Service (aggregation queries)
    ↓
GET /api/analytics/:userId/* (6 existing + 4 new endpoints)
    ↓
Victory Charts (props-driven, no hardcoded data)
    ↓
Client Dashboard (Progress section)
    ↓
Trainer Dashboard (Client panel — chart view)
    ↓
Admin Dashboard (Client panel — chart view)
    ↓
User Social Profile (public/friends-only charts)
    ↓
AI Assistant (reads chart data for analysis)
    ↓
Gamification (exercise variety rewards, monthly challenges)
```

---

## 2. CHART DATA PIPELINE — Connect Victory Charts to Real API

### Current State
- **Backend:** Analytics service + 6 API endpoints EXIST and WORK
- **Frontend:** 50 Victory charts render HARDCODED demo data
- **Gap:** No `useEffect` → fetch → `setState` → pass props to charts

### Required Changes

#### 2.1 Create `useAnalytics` Hook
**File:** `frontend/src/hooks/useAnalytics.ts` (~120 lines)
```typescript
// Fetches real data from analytics endpoints
// Caches results with SWR-like stale-while-revalidate
// Returns loading/error/data states
// Supports: strengthProfile, volumeProgression, sessionUsage,
//           personalRecords, frequency, nasmProgress, exerciseHistory
```

#### 2.2 Update Victory Chart Components to Accept Props
Each of the 50 charts currently has:
```typescript
const DATA = [{ x: 1, y: 185 }, ...]; // HARDCODED
```
Must change to:
```typescript
interface Props { data?: DataPoint[]; loading?: boolean; userId?: number; }
```
With `useMemo` for data transformation and skeleton loaders when `loading=true`.

**Priority Charts (Big 6 — connect first):**
1. `WeightProgressionLine` → `GET /api/analytics/:userId/dashboard` → weight entries
2. `StrengthProgressionLine` → `GET /api/analytics/:userId/personal-records` → 1RM trend
3. `WorkoutHeatmapCalendar` → `GET /api/analytics/:userId/frequency` → date/count grid
4. `MuscleGroupRadar` → `GET /api/analytics/:userId/strength-profile` → radar data
5. `WeeklyVolumeBar` → `GET /api/analytics/:userId/volume-progression` → weekly totals
6. `GoalProgressGauge` → `GET /api/goals` → goal progress %

**NASM Protocol Charts (connect second):**
7. `BodyCompositionArea` → measurements API → weight/fat/lean mass over time
8. `OPTPhaseStream` → ClientProgress model → phase progression
9. `TrainingLoadArea` → volume × intensity calculation
10. `IntensityTrendLine` → RPE averages over time

**Engagement Charts (connect third):**
11. `SessionFrequencyLine` → sessions per week
12. `MoodEnergyScatter` → ProgressData mood/energy/motivation

#### 2.3 Frost Shimmer Skeleton Loaders (MANDATORY per CLAUDE.md)
Every chart card MUST show a skeleton loader while data loads:
```css
/* Arctic Cyan shimmer at 10% opacity */
background: linear-gradient(90deg, transparent, rgba(80,160,240,0.1), transparent);
animation: shimmer 1.5s infinite;
```
With `role="status" aria-live="polite" aria-label="Loading chart data"`

---

## 3. EXERCISE ROLODEX CHART — All-Time Exercise History

### Concept
A **full-page scrollable chart** showing EVERY exercise the user has ever performed, with:
- Exercise name
- Total times performed (all-time count)
- Total volume (sets × reps × weight)
- Last performed date
- Personal best (max weight or max reps)
- Muscle group tag
- Visual bar showing relative frequency

### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│ 🏋️ Exercise Rolodex — All-Time History                       │
│ [Filter: All | Chest | Back | Legs | ...] [Sort: Freq ▼]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Barbell Bench Press          ████████████████████  47 times  │
│   PR: 225 lbs × 5 | Last: 3/18/2026 | Vol: 84,200 lbs     │
│                                                              │
│ Barbell Squat                ███████████████████   42 times  │
│   PR: 315 lbs × 3 | Last: 3/20/2026 | Vol: 126,000 lbs    │
│                                                              │
│ Dumbbell Shoulder Press      ██████████████        31 times  │
│   PR: 75 lbs × 8 | Last: 3/19/2026 | Vol: 37,200 lbs      │
│                                                              │
│ Cable Lat Pulldown           █████████████         28 times  │
│   PR: 180 lbs × 10 | Last: 3/21/2026 | Vol: 50,400 lbs    │
│                                                              │
│ ... (scrollable, shows ALL exercises ever performed)         │
│                                                              │
│ ┌────────────────────────────────────────────────────┐       │
│ │ Variety Score: 72/100 ⭐                            │       │
│ │ You've tried 72 of 840 exercises!                   │       │
│ │ Try 3 new exercises this month → +100 XP bonus     │       │
│ └────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### Implementation

#### 3.1 New Backend Endpoint
**`GET /api/analytics/:userId/exercise-history`**

```sql
SELECT
  e.id, e.name, e.primaryMuscles, e.category,
  COUNT(DISTINCT we."workoutSessionId") as times_performed,
  MAX(s."weightUsed") as max_weight,
  MAX(s."repsCompleted") as max_reps,
  SUM(s."weightUsed" * s."repsCompleted") as total_volume,
  MAX(ws.date) as last_performed,
  MIN(ws.date) as first_performed
FROM "WorkoutExercises" we
JOIN "Exercises" e ON we."exerciseId" = e.id
JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
LEFT JOIN "Sets" s ON s."workoutExerciseId" = we.id
WHERE ws."userId" = :userId AND ws.status = 'completed'
GROUP BY e.id, e.name, e.primaryMuscles, e.category
ORDER BY times_performed DESC;
```

Returns:
```json
{
  "exercises": [...],
  "totalUniqueExercises": 72,
  "totalAvailableExercises": 840,
  "varietyScore": 8.57,  // percentage
  "topMuscleGroup": "Chest",
  "leastWorkedGroup": "Calves",
  "exercisesThisMonth": 15,
  "newExercisesThisMonth": 3
}
```

#### 3.2 Frontend Component
**`frontend/src/components/Charts/ExerciseRolodex/ExerciseRolodexPage.tsx`** (~250 lines)

- Full-page layout (scrollable)
- Filter chips: All, Chest, Back, Shoulders, Arms, Legs, Core, Full Body, Cardio
- Sort options: Frequency, Volume, Last Performed, Alphabetical
- Search bar for exercise name
- react-window virtualized list (handles 840+ exercises efficiently)
- **CSS-only frequency bars** (CEO ruling — NOT Victory SVG, too heavy for virtualized lists)
  ```tsx
  // CSS gradient bars — GPU-composited, 60fps native
  const FrequencyBar = styled.div<{ $width: number }>`
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(90deg, #8B5CF6, #60C0F0);
    width: ${({ $width }) => $width}%;
    transition: width 0.3s ease;
  `;
  ```
- Variety Score card with gamification tie-in
- "Try something new" suggestion engine

#### 3.3 Route Integration
- **Client Dashboard:** Sidebar → "Exercise History" (new nav item)
- **User Profile / Social:** "Exercise Rolodex" tab (privacy-toggleable)
- **Admin/Trainer Panel:** Accessible when viewing client

---

## 4. SPORTS GOAL SYSTEM — Expanded Goal Categories

### Current: 11 Goals → Enhanced: 25+ Goals

#### Updated GOAL_OPTIONS Array
```typescript
const GOAL_OPTIONS = [
  // ── Core Fitness Goals ──
  "Fat Loss",
  "Muscle Gain",
  "Strength & Power",
  "Body Recomposition",
  "Endurance & Conditioning",
  "Improve Mobility & Flexibility",
  "Injury Recovery & Prevention",
  "General Health & Wellness",

  // ── Sport-Specific Performance ──
  "Golf Performance",
  "Tennis & Racquet Sports",
  "Basketball Performance",
  "Soccer & Football",
  "Baseball & Softball",
  "Volleyball Performance",
  "Swimming & Water Sports",
  "Running & Track",
  "Cycling & Triathlon",
  "Martial Arts & Combat Sports",
  "Pickleball Performance",
  "Hockey & Ice Sports",
  "Rowing & Crew",
  "CrossFit & Functional Fitness",
  "Dance & Gymnastics",
  "Hiking & Outdoor Adventure",

  // ── Catch-all ──
  "Other (specify below)",
] as const;
```

#### Sport → OPT Phase Mapping
| Sport Goal | Primary OPT Phase | Exercise Focus |
|---|---|---|
| Golf Performance | Phase 5 (Power) | Rotational power, hip drive, core stability |
| Tennis & Racquet Sports | Phase 5 (Power) | Lateral agility, explosive starts, shoulder stability |
| Basketball Performance | Phase 5 (Power) | Vertical jump, lateral movement, explosive speed |
| Soccer & Football | Phase 4-5 | Sprint speed, agility, endurance, deceleration |
| Baseball & Softball | Phase 5 (Power) | Rotational power, explosive hip drive, arm speed |
| Volleyball Performance | Phase 5 (Power) | Vertical jump, landing mechanics, shoulder stability |
| Swimming & Water Sports | Phase 2-3 | Shoulder endurance, core stability, flexibility |
| Running & Track | Phase 1-2 | Endurance, hip stability, ankle strength |
| Cycling & Triathlon | Phase 2 | Quad endurance, hip flexor flexibility, core |
| Martial Arts & Combat | Phase 4-5 | Explosive power, flexibility, core, balance |
| Pickleball Performance | Phase 3-5 | Lateral agility, quick reactions, shoulder stability |
| Hockey & Ice Sports | Phase 4-5 | Lateral explosiveness, glute power, balance |
| Rowing & Crew | Phase 3-4 | Pulling power, hip drive, core endurance |
| CrossFit & Functional | Phase 2-5 | Full-body functional, mixed modalities |
| Dance & Gymnastics | Phase 1-3 | Flexibility, balance, body control, stability |
| Hiking & Outdoor | Phase 1-2 | Endurance, ankle stability, hip/knee strength |

#### AI Assistant Integration
When a client selects a sport goal, the AI Assistant MUST:
1. Acknowledge the sport and set context
2. Recommend appropriate OPT phase
3. Filter exercise suggestions to sport-relevant movements
4. Track sport-specific metrics (e.g., "How far can you drive the ball?")
5. Generate sport-specific workout templates

---

## 5. AI ASSISTANT UPGRADES — SwanStudios Assistant

### 5.1 Name Standardization
The AI assistant is called **"SwanStudios Assistant"** everywhere:
- FAB label, drawer header, context selector, system prompts
- **NOT** "Dashboard Assistant" or "Client Assistant" — unified name

### 5.2 Chart Data Access
**New capability:** AI can READ chart/analytics data for analysis

Add to `aiChatService.mjs` data enrichment:
```javascript
// In enrichWithUserData():
if (context === 'client_review' || context === 'progress_analysis') {
  const analytics = await analyticsService.getDashboardAnalytics(targetUserId);
  const exerciseHistory = await analyticsService.getExerciseHistory(targetUserId);
  enrichedData.analytics = analytics;
  enrichedData.exerciseHistory = exerciseHistory;
}
```

This allows prompts like:
- "What exercises has Jackie done the most?"
- "Show me Jackie's strength progression"
- "Which muscle groups is this client neglecting?"

### 5.3 Email Automation (DRAFT-AND-APPROVE — AI Village Security Mandate)
**New capability:** AI drafts emails for trainer/admin approval before sending

**CRITICAL SECURITY:** AI NEVER directly sends email/SMS. All communications go through a draft-and-approve queue.

**New Model:** `CommunicationDrafts`
```sql
CREATE TABLE "CommunicationDrafts" (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
  "clientId" INTEGER REFERENCES "Users"(id),
  "trainerId" INTEGER REFERENCES "Users"(id),
  subject VARCHAR(200),
  body TEXT NOT NULL,
  "recipientAddress" VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'sent', 'rejected')),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "approvedAt" TIMESTAMP,
  "sentAt" TIMESTAMP
);
```

Add `draft_email` action type to `aiDataWriteService.mjs`:
```javascript
case 'draft_email':
  const client = await User.findByPk(update.data.clientId);
  if (!client?.email) throw new Error('Client email not found');
  await CommunicationDraft.create({
    type: 'email',
    clientId: update.data.clientId,
    trainerId: req.user.id,
    subject: DOMPurify.sanitize(update.data.subject).slice(0, 200),
    body: DOMPurify.sanitize(update.data.html),
    recipientAddress: client.email,
    status: 'pending_approval'
  });
  break;
```

**New Endpoint:** `POST /api/trainer/drafts/:draftId/approve` (trainer/admin only)
**Rate Limit:** Max 10 drafts per client per day (prevents AI spam loops)

**Security:**
- Only trainer/admin roles can trigger draft creation
- Recipient address auto-populated from client profile (AI cannot override)
- HTML sanitized with DOMPurify before storage
- Trainer must click "Approve & Send" in UI before any email leaves the system

Use cases:
- "Send Jackie her workout summary for this week" → Creates draft → Trainer reviews → Approves → Email sent
- "Email the client their progress report" → Creates draft → Trainer reviews → Approves → Email sent

### 5.4 SMS Automation (DRAFT-AND-APPROVE — AI Village Security Mandate)
**New capability:** AI drafts SMS for trainer/admin approval before sending

Same draft-and-approve pattern as email:
```javascript
case 'draft_sms':
  const client = await User.findByPk(update.data.clientId);
  if (!client?.phone) throw new Error('Client phone not found');
  await CommunicationDraft.create({
    type: 'sms',
    clientId: update.data.clientId,
    trainerId: req.user.id,
    body: update.data.message.slice(0, 160),
    recipientAddress: client.phone,
    status: 'pending_approval'
  });
  break;
```

**Security:** Same RBAC + rate limiting as email. Phone number from user profile only.

### 5.5 Voice Chat Enhancements
- **Text-to-Speech (TTS):** Add browser SpeechSynthesis API for reading AI responses aloud
- **Continuous conversation mode:** Dictation → AI response → TTS → listen for next input
- **Voice commands:** "Log my workout", "Send Jackie an email", "Show my progress"

### 5.6 Form-Filling Expansion
Current: AI can fill workout logger forms
**Add:** AI can fill:
- Goal creation form (sport goal + timeline)
- Body measurement form (weight, body fat)
- Session booking form (date, time, type)
- Client note form (observation, severity, follow-up date)

---

## 6. TRAINER & ADMIN CLIENT PANEL — Chart Visibility

### Requirement
When a trainer or admin views a client from the Clients tab, they MUST be able to:
1. See the client's Victory charts as a collapsible panel
2. See the Exercise Rolodex for that client
3. Toggle between chart views (Big 6, NASM, Engagement, Rolodex)

### Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│ Clients & Team → Jackie Client                               │
├──────────────────────────────────────────────────────────────┤
│ [Profile] [Charts ▼] [Workouts] [Sessions] [Notes]          │
├──────────────────────────────────────────────────────────────┤
│ ┌─ Charts Panel ───────────────────────────────────────────┐ │
│ │ [Big 6] [NASM Protocol] [Engagement] [Exercise Rolodex] │ │
│ │                                                          │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │ │
│ │ │ Weight   │ │ Strength │ │ Workout  │                 │ │
│ │ │ Progress │ │ 1RM      │ │ Heatmap  │                 │ │
│ │ └──────────┘ └──────────┘ └──────────┘                 │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │ │
│ │ │ Muscle   │ │ Weekly   │ │ Goal     │                 │ │
│ │ │ Radar    │ │ Volume   │ │ Progress │                 │ │
│ │ └──────────┘ └──────────┘ └──────────┘                 │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Implementation
**File:** `frontend/src/components/DashBoard/Pages/admin-clients/ClientChartsPanel.tsx` (~200 lines)

- Accepts `clientId` prop
- Uses `useAnalytics(clientId)` hook to fetch data
- Tab bar: Big 6 | NASM Protocol | Engagement | Exercise Rolodex
- Responsive grid: 3-col desktop → 2-col tablet → 1-col mobile
- Each chart wrapped in `SafeChart` error boundary
- Lazy-loaded charts with skeleton loaders

---

## 7. USER DASHBOARD / SOCIAL PROFILE — Chart Integration

### Client Dashboard
The client sees their own charts in the Progress section (already partially built in ProgressChartsSection).

**Add:**
- Exercise Rolodex link/tab in sidebar
- Chart visibility toggle in My Account → Settings

### Social Profile (User Dashboard)
Every user's social profile page MUST include:
1. **Chart Showcase** — User-selected charts (toggle-able)
2. **Exercise Rolodex Summary** — Top 10 exercises + variety score
3. **Gamification Progress** — Tier badge, XP bar, streak

### Privacy Controls (AI Village Security Mandate: Privacy-First Defaults)
**New User model field:** `chartVisibility: JSONB`
```json
{
  "weightProgression": false,
  "workoutHeatmap": false,
  "muscleRadar": false,
  "goalProgress": false,
  "exerciseRolodex": false,
  "strengthProgression": false,
  "bodyComposition": false
}
```

**Default: ALL FALSE (privacy-first).** Weight data is sensitive health information.
Users opt-in during onboarding Step 4 ("Social Profile Setup") or via Settings.
Onboarding prompt: "Show off your hard work! Choose which charts to share with your friends."

**Server-Side Enforcement (MANDATORY):**
```typescript
// Public profile endpoint MUST filter by chartVisibility
const getPublicCharts = async (userId: number) => {
  const user = await User.findByPk(userId, { attributes: ['chartVisibility'] });
  const allCharts = await analyticsService.getAllCharts(userId);
  return Object.entries(user.chartVisibility || {})
    .filter(([_, visible]) => visible)
    .reduce((acc, [key]) => ({ ...acc, [key]: allCharts[key] }), {});
};
```

---

## 8. GAMIFICATION INTEGRATION — Exercise Challenges

### Exercise Variety Rewards
| Achievement | Criteria | XP | Rarity |
|---|---|---|---|
| Explorer | Try 10 unique exercises | 50 | Common |
| Adventurer | Try 25 unique exercises | 100 | Common |
| Pathfinder | Try 50 unique exercises | 200 | Rare |
| Trailblazer | Try 100 unique exercises | 500 | Rare |
| Exercise Encyclopedia | Try 200 unique exercises | 1,000 | Epic |
| Master of All | Try 500 unique exercises | 5,000 | Legendary |

### Monthly Exercise Challenges
- **"Try 3 New Exercises"** — Monthly challenge, 100 XP bonus
- **"Muscle Group Explorer"** — Hit all 10 muscle groups in a month, 200 XP
- **"Sport Specialist"** — Complete 10 sport-specific exercises in a month, 150 XP
- **"The Completionist"** — Do every exercise in a muscle group category, 500 XP

### Social Integration
- Post exercise rolodex milestones to social feed automatically
- "I just tried my 100th unique exercise! 🏋️" auto-post
- Challenge friends to exercise variety competitions
- Leaderboard: Most unique exercises this month

---

## 9. NEW BACKEND ENDPOINTS REQUIRED

### Security Endpoints (Phase 0 — LAUNCH BLOCKERS)
| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `POST /api/trainer/drafts/:draftId/approve` | POST | Approve AI-drafted email/SMS for sending | trainer/admin |
| `GET /api/trainer/drafts` | GET | List pending communication drafts | trainer/admin |
| `DELETE /api/trainer/drafts/:draftId` | DELETE | Reject/delete a draft | trainer/admin |

### Analytics Endpoints (Protected by `requireOwnershipOrTrainer` middleware)
| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `GET /api/analytics/:userId/exercise-history` | GET | All-time exercise frequency, volume, PRs | owner/trainer/admin |
| `GET /api/analytics/:userId/exercise-variety` | GET | Variety score, new exercises this month | owner/trainer/admin |
| `GET /api/analytics/:userId/rpm-trends` | GET | RPE, ROM, pain, stability trends over time | owner/trainer/admin |
| `GET /api/analytics/:userId/sport-metrics` | GET | Sport-specific performance metrics | owner/trainer/admin |
| `POST /api/analytics/:userId/batch` | POST | Batch multiple analytics queries | owner/trainer/admin |

### Social/Privacy Endpoints (Separate route — public with server-side filtering)
| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `GET /api/social/profile/:userId/charts` | GET | Public chart data (respects chartVisibility) | any authenticated |
| `PATCH /api/users/:userId/chart-visibility` | PATCH | Update chart privacy settings | owner only |

### Gamification Endpoints
| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `POST /api/challenges/exercise-variety` | POST | Create monthly exercise variety challenge | admin |

---

## 10. NEW FRONTEND COMPONENTS REQUIRED

| Component | Location | Lines | Purpose |
|---|---|---|---|
| `useAnalytics.ts` | `hooks/` | ~120 | Analytics data fetching hook |
| `ExerciseRolodexPage.tsx` | `Charts/ExerciseRolodex/` | ~250 | Full-page exercise history |
| `ExerciseRolodexSummary.tsx` | `Charts/ExerciseRolodex/` | ~100 | Compact summary for profiles |
| `ClientChartsPanel.tsx` | `admin-clients/` | ~200 | Trainer/admin client chart view |
| `ChartVisibilitySettings.tsx` | `Settings/` | ~150 | Toggle chart privacy |
| `ProfileChartSection.tsx` | `Social/` | ~180 | Charts on user social profile |
| `ExerciseVarietyCard.tsx` | `Gamification/` | ~80 | Variety score + challenges |
| `SportGoalChips.tsx` | `onboarding/` | ~60 | Enhanced goal selector |

---

## 11. CLAUDE.MD UPDATES REQUIRED

### Add Skills Validation Checklist
```markdown
## Pre-Commit Skill Validation (MANDATORY)
Before committing changes, run applicable skills:
- `verification-before-completion` — For any "fixed" or "done" claims
- `systematic-debugging` — For bug investigations
- `test-driven-development` — For new features
- `web-design-guidelines` — For UI changes
- `requesting-code-review` — Before merge to main
- `webapp-testing` — For Playwright E2E verification
- `audit-website` — For SEO/performance/security audits
- `frontend-design` — For new UI components
- `ui-ux-pro-max` — For design system compliance
- `agent-browser` — For browser automation tasks
```

### Add Exercise Rolodex Section
Document the Exercise Rolodex chart system in CLAUDE.md under Charts.

### Add AI Assistant Capabilities Section
Document the full AI Assistant capabilities (voice, form-filling, email, SMS, chart data access).

### Add Sport Goal Mapping
Document the Sport → OPT Phase mapping table.

---

## 12. IMPLEMENTATION ORDER (AI Village Validated + CEO Approved)

### Phase 0: SECURITY & PRIVACY (LAUNCH BLOCKERS — Must Be First)
0a. Create `requireOwnershipOrTrainer` middleware (`backend/middleware/authorization.mjs`)
0b. Apply IDOR middleware to ALL `/api/analytics/:userId/*` endpoints
0c. Create `CommunicationDrafts` model and migration
0d. Replace AI `send_email`/`send_sms` with `draft_email`/`draft_sms` in aiDataWriteService
0e. Create `POST /api/trainer/drafts/:draftId/approve` endpoint
0f. Add `chartVisibility: JSONB` migration with ALL-FALSE defaults
0g. Add server-side chart visibility filtering to public profile endpoint
0h. Create AI Action Authorization Matrix (role-based action whitelist)

### Phase 1: Data Pipeline
1. Create `useAnalytics` hook
2. Connect Big 6 charts to real API data
3. Add skeleton loaders to all charts (Frost Shimmer, `aria-live="polite"`)
4. Create exercise-history backend endpoint
5. Create `UserExerciseStats_MV` Materialized View (15-min refresh + post-workout refresh)

### Phase 2: Exercise Rolodex
6. Build ExerciseRolodexPage component (CSS-only frequency bars, NOT Victory SVG — CEO ruling)
7. Build ExerciseRolodexSummary for profiles
8. Add to client dashboard sidebar
9. Add variety score calculation

### Phase 3: Sports Goals
10. Expand GoalsSection to 25+ options
11. Update AI workout generator for sport filtering
12. Add sport → OPT phase mapping
13. Seed sport-specific exercises (~30-50 new)

### Phase 4: Trainer/Admin Panel
14. Build ClientChartsPanel
15. Wire into Clients & Team → client detail view
16. Add chart tab to client management

### Phase 5: AI Assistant Upgrades
17. Add chart data to AI context enrichment
18. Add draft_email/draft_sms to AI data write service
19. Build CommunicationDrafts approval UI for trainers
20. Add TTS (browser SpeechSynthesis)
21. Update system prompts for sport-aware responses

### Phase 6: Social Profile & Gamification
22. Build ProfileChartSection (respects chartVisibility)
23. Build ChartVisibilitySettings with onboarding integration
24. Add exercise variety achievements (6 tiers)
25. Add monthly exercise challenges
26. Build "Social Profile Setup" onboarding step (opt-in chart sharing)

---

## 13. CEO OVERRIDES & DESIGN DECISIONS

### Override 1: No "External" Client Source
Per user feedback, the CreateClientModal only shows SwanStudios and Move Fitness. External removed.

### Override 2: Exercise Rolodex is a FULL PAGE
Not a small widget — this is a full scrollable page with search, filter, sort. It deserves dedicated real estate because it's the core "wow factor" for data-driven clients.

### Override 3: Variety Score is Gamified
The variety score MUST tie into gamification with XP rewards and monthly challenges. This creates a "try new things" incentive loop that keeps workouts fresh.

### Override 4: AI Assistant = "SwanStudios Assistant"
Unified name across all UI surfaces. Not "Dashboard Assistant" or "Client Assistant".

### Override 5: Charts Pull REAL Data Only
No demo/mock data in production charts. If a user has no data, show an empty state with CTA: "Log your first workout to see your progress!"

### Override 6: All Sports Welcome
The goals system is inclusive of ALL popular sports. No sport-specific content is gated behind premium tiers. Every client gets access to sport-specific training recommendations.

### Override 7: Blueprint Protocol MANDATORY
Every new component >100 lines MUST have a blueprint header with wireframe, click-outcomes, data flow, and gamification hooks before any code is written.

---

## APPENDIX A: Existing Analytics Endpoints (Already Built)

| Endpoint | Returns |
|---|---|
| `GET /api/analytics/:userId/dashboard` | Comprehensive analytics summary |
| `GET /api/analytics/:userId/strength-profile` | Muscle group radar data |
| `GET /api/analytics/:userId/volume-progression` | Weekly volume trend |
| `GET /api/analytics/:userId/session-usage` | Solo vs trainer-led breakdown |
| `GET /api/analytics/:userId/personal-records` | PRs by exercise |
| `GET /api/analytics/:userId/frequency` | Workout frequency stats |
| `GET /api/analytics/:userId/nasm-progress` | NASM phase progression |

## APPENDIX B: Workout Data Models (Already Built)

- `WorkoutSession` — Container for a workout (userId, date, duration, intensity, status, XP)
- `WorkoutExercise` — Exercise within session (exerciseId, formRating, painLevel, ROM, stability)
- `Set` — Individual set (reps, weight, RPE, tempo, rest, isPR)
- `WorkoutLog` — Legacy simple log (exerciseName, sets, reps, weight)
- `ClientProgress` — NASM category levels (24 dimensions, 0-1000 scale)
- `ProgressData` — Daily snapshots (XP, workouts, streaks, mood, social, goals)

## APPENDIX C: AI Assistant Current Capabilities

### Can Do Now
- Voice input (Web Speech API + Gemini audio transcription)
- Fill workout logger forms (5 CustomEvent types)
- Mutate client data (measurements, goals, notes, macro logs, progress)
- Read 17 data sources for context enrichment
- Provider failover (Gemini → OpenAI → Anthropic → Venice)
- Rate limiting (3 concurrent per user, 10 transcriptions/hour)

### Cannot Do Yet (This Prompt Adds)
- Read chart/analytics data for analysis
- Draft emails for trainer approval (Nodemailer exists, draft-and-approve pattern required)
- Draft SMS for trainer approval (Twilio configured, draft-and-approve pattern required)
- Text-to-speech responses
- Fill goal creation forms
- Fill session booking forms

### AI Action Authorization Matrix (AI Village Security Mandate)
```typescript
const AI_ACTION_PERMISSIONS = {
  client: ['fill_own_forms', 'read_own_data', 'read_own_charts'],
  trainer: ['fill_own_forms', 'fill_client_forms', 'read_client_data', 'read_client_charts', 'draft_email', 'draft_sms'],
  admin: ['fill_own_forms', 'fill_any_forms', 'read_all_data', 'read_all_charts', 'draft_email', 'draft_sms']
};
```
**AI NEVER directly sends email/SMS.** All communications go through `CommunicationDrafts` → trainer approval → send.

## APPENDIX D: Skills Infrastructure (10 Installed)

| # | Skill | When to Use | MANDATORY? |
|---|---|---|---|
| 1 | `verification-before-completion` | Before claiming "done" or "fixed" | YES |
| 2 | `systematic-debugging` | For any bug investigation | YES |
| 3 | `requesting-code-review` | Before merge to main | YES |
| 4 | `test-driven-development` | For new features | YES |
| 5 | `webapp-testing` | Playwright E2E tests | YES (for UI) |
| 6 | `web-design-guidelines` | UI accessibility/contrast audit | Recommended |
| 7 | `audit-website` | Comprehensive site audit | Recommended |
| 8 | `agent-browser` | Browser automation | As needed |
| 9 | `frontend-design` | New UI components | As needed |
| 10 | `ui-ux-pro-max` | Design system compliance | As needed |

**Maintenance:** `npx skills check` | `npx skills update` | `npx skills find <keyword>`
