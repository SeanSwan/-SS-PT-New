# CLIENT DATA PIPELINE MASTER BLUEPRINT
## Workout Logger → Charts → Client Dashboard → Social Sharing

**Author:** Claude Opus 4.6 (CEO) | **Date:** 2026-03-23
**Status:** PLANNING — Pre-AI Village Validation
**Priority:** P0 — Core Business Flow

---

## 1. EXECUTIVE SUMMARY

SwanStudios has all the pieces built but they're **disconnected islands**:
- WorkoutLogger saves data to DB but charts use mock data
- Client cards show workout counts but the modal only shows summaries
- Social feed supports "workout" posts but doesn't link to real workout data
- Admin can see client data in modals but can't view the actual client/trainer dashboard
- Move Fitness vs SwanStudios clients lack visual differentiation (icons)

**This blueprint connects everything into a single data pipeline.**

---

## 2. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WORKOUT DATA PIPELINE (E2E)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │ WorkoutLogger │───→│  PostgreSQL   │───→│  Analytics API           │  │
│  │ (Admin logs   │    │ workout_      │    │  /api/analytics/workouts │  │
│  │  for client)  │    │ sessions +    │    │  Aggregation service     │  │
│  └──────────────┘    │ workout_logs  │    └──────────┬───────────────┘  │
│                       └──────────────┘               │                  │
│                                                       ↓                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     DISPLAY LAYER                                │   │
│  ├──────────────┬──────────────┬──────────────┬────────────────────┤   │
│  │ Client Card  │ Workouts     │ Victory      │ Social Feed        │   │
│  │ (counts,     │ Modal        │ Charts       │ (share workout     │   │
│  │  engagement) │ (full logs   │ (real data   │  results, charts,  │   │
│  │              │  + charts)   │  not mock)   │  goals, progress)  │   │
│  └──────────────┴──────────────┴──────────────┴────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                   ADMIN IMPERSONATION                            │   │
│  │  Admin → Dropdown (select user) → View as Client/Trainer/User   │   │
│  │  See their dashboard exactly as they see it                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CURRENT STATE AUDIT

### What's Working
| Feature | Status | File |
|---------|--------|------|
| Create client (SwanStudios/Move Fitness) | ✅ | `CreateClientModal.tsx` |
| Client list with filtering | ✅ | `EnhancedAdminClientManagementView.tsx` |
| Workout logging (admin for client) | ✅ | `WorkoutLoggerModal.tsx` |
| Workout data storage | ✅ | `WorkoutSession.mjs`, `WorkoutLog.mjs` |
| Gamification XP on workout save | ✅ | `adminWorkoutLoggerController.mjs` |
| Social "workout" post type | ✅ | `SocialPost.mjs`, `CreatePostForm.tsx` |
| Chart visibility toggles on profile | ✅ | `ChartVisibilityToggle.tsx` |
| View client details panel | ✅ | `ClientDetailsPanel.tsx` |

### What's Broken/Dead
| Feature | Status | Issue |
|---------|--------|-------|
| "Edit Client" button | ❌ DEAD | Shows "Coming Soon" toast |
| "Assign Workout Plan" | ❌ DEAD | `/* TODO */` comment |
| "Schedule Session" | ❌ DEAD | `/* TODO */` comment |
| "Reset Password" | ❌ DEAD | Backend exists, not wired to frontend |
| "View Sessions" modal | ❌ DEAD | Component exists, not connected |
| "View Revenue" modal | ❌ DEAD | Component exists, not connected |
| "Body Map" modal | ❌ DEAD | Component exists, not connected |

### What's Missing
| Feature | Status | Impact |
|---------|--------|--------|
| Charts connected to real workout data | ❌ MISSING | Charts show mock data |
| Workouts modal with exercises + charts | ❌ MISSING | Only shows summaries |
| Admin impersonation (view as user) | ❌ MISSING | Admin can't see client dashboard |
| Move Fitness / SwanStudios logo on cards | ❌ MISSING | No visual differentiation |
| Social sharing of workout results + charts | ❌ INCOMPLETE | Post type exists, data not linked |
| Workout analytics aggregation API | ❌ MISSING | No endpoint for chart data |

---

## 4. IMPLEMENTATION PHASES

### Phase 1: Client Card Enhancement + Icon Differentiation
**Goal:** Client cards show Move Fitness or SwanStudios logos, all action menu items work.

#### 4.1.1 Client Source Icons
```
WIREFRAME:
┌──────────────────────────────────────────────────────────┐
│  [MF Logo] Jackie Client              [⋮]               │
│  jackie.c.movefitness@swanstudios.com                    │
│  [ACTIVE] [STARTER]                                      │
│                                                          │
│  $0          $900        Active Package  12 sessions left │
│  Total Spent  Monthly    ───────────────────────────────  │
│                                                          │
│  Engagement Score ██████████░░░░ 34%                     │
│                                                          │
│  0 SESSIONS  7 WORKOUTS  0 POSTS  starter TIER           │
│  Joined: 3/17/2026              Last active: 5d ago      │
└──────────────────────────────────────────────────────────┘

- clientSource === 'move_fitness' → Show Move Fitness 3D logo (24x24)
- clientSource === 'swanstudios' → Show SwanStudios swan logo (24x24)
- clientSource === 'external' → Show globe icon
```

#### 4.1.2 Action Menu — Wire All Options
| Action | Implementation |
|--------|---------------|
| View Details | ✅ Already works → ClientDetailsPanel |
| Edit Client | Wire to edit form modal (inline fields) |
| View Sessions | Open ClientSessionsModal with real session data |
| View Revenue | Open BillingSessionsCard with real billing data |
| Set Profile Photo | ✅ Already works → file picker + R2 upload |
| Start Onboarding | Navigate to `/dashboard/onboarding?clientId=X` |
| Log Workout | ✅ Already works → WorkoutLoggerModal |
| Measurements | Open ClientMeasurementPanel |
| Body Map | Open ClientBodyMapModal |

---

### Phase 2: Workouts Modal Redesign
**Goal:** When clicking "7 WORKOUTS" on client card, show full workout history with exercise details + Victory charts.

#### 4.2.1 Enhanced Workouts Modal
```
WIREFRAME:
┌────────────────────────────────────────────────────────────┐
│ 💪 Workouts — Jackie Client                          [X]  │
├──────────┬─────────────────────────────────────────────────┤
│          │                                                 │
│ [Tabs]   │  ┌─ WORKOUT HISTORY ─────────────────────────┐ │
│          │  │                                             │ │
│ History  │  │  Move Fitness Session - Lower Body Machine  │ │
│          │  │  3/5/2026 | 30min | 13 exercises | 7/10    │ │
│ Charts   │  │  ┌─────────────────────────────────────┐   │ │
│          │  │  │ Exercise       Sets  Reps  Weight    │   │ │
│ Progress │  │  │ Leg Press      3     12    180 lbs   │   │ │
│          │  │  │ Hip Adduction  3     15    90 lbs    │   │ │
│ PRs      │  │  │ Hamstring Curl 3     12    70 lbs    │   │ │
│          │  │  │ Back Extension 3     15    BW        │   │ │
│          │  │  └─────────────────────────────────────┘   │ │
│          │  │                                             │ │
│          │  │  [Share on Social] [Export PDF]             │ │
│          │  └─────────────────────────────────────────────┘ │
│          │                                                 │
│          │  ┌─ CHARTS TAB ──────────────────────────────┐ │
│          │  │  [Weekly Volume Bar]  [Intensity Trend]    │ │
│          │  │  [Exercise Frequency] [Volume Progression] │ │
│          │  │  [Workout Heatmap Calendar]                │ │
│          │  └───────────────────────────────────────────┘ │
│          │                                                 │
│          │  ┌─ PROGRESS TAB ────────────────────────────┐ │
│          │  │  [Strength Radar] [Body Composition Area] │ │
│          │  │  [1RM Progression Line]                    │ │
│          │  └───────────────────────────────────────────┘ │
│          │                                                 │
│          │  ┌─ PRs TAB ────────────────────────────────┐ │
│          │  │  🏆 Bench Press: 65 lbs x 10 (1/28/2026)│ │
│          │  │  🏆 Leg Press: 180 lbs x 12 (3/5/2026)  │ │
│          │  └───────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────┘
```

#### 4.2.2 Backend: Workout Analytics API
```
NEW ENDPOINT: GET /api/analytics/workouts/:userId

Response: {
  summary: {
    totalWorkouts: 7,
    totalExercises: 67,
    totalVolume: 45000,  // sum(weight * reps)
    avgIntensity: 6.9,
    longestStreak: 3,
    personalRecords: [
      { exercise: "Bench Press", weight: 65, reps: 10, date: "2026-01-28" }
    ]
  },
  weeklyVolume: [
    { week: "2026-W04", volume: 8500 },
    { week: "2026-W05", volume: 9200 },
    ...
  ],
  exerciseFrequency: [
    { name: "Bench Press", count: 5 },
    { name: "Cable Rows", count: 4 },
    ...
  ],
  intensityTrend: [
    { date: "2026-01-19", intensity: 6 },
    { date: "2026-01-22", intensity: 7 },
    ...
  ],
  workoutCalendar: [
    { date: "2026-01-19", count: 1 },
    { date: "2026-01-22", count: 1 },
    ...
  ],
  sessions: [
    {
      id: "uuid",
      title: "Move Fitness Session - Lower Body Machine Day",
      date: "2026-03-05",
      duration: 30,
      intensity: 7,
      notes: "Machine-focused lower body...",
      exercises: [
        {
          name: "Leg Press",
          sets: [
            { setNumber: 1, reps: 12, weight: 180 },
            { setNumber: 2, reps: 12, weight: 180 },
            { setNumber: 3, reps: 12, weight: 180 }
          ]
        }
      ]
    }
  ]
}
```

---

### Phase 3: Charts Connected to Real Data
**Goal:** Victory charts pull from the analytics API, not mock data.

#### 4.3.1 New Hook: `useWorkoutAnalytics(userId)`
```typescript
// frontend/src/hooks/analytics/useWorkoutAnalytics.ts
export function useWorkoutAnalytics(userId: number | string) {
  // Fetches GET /api/analytics/workouts/:userId
  // Returns: { data, isLoading, error, refetch }
  // Memoized by userId
  // SWR or React Query for caching + auto-refresh
}
```

#### 4.3.2 Chart Components to Connect
| Chart | Data Source | Victory Component |
|-------|-----------|-------------------|
| Weekly Volume Bar | `weeklyVolume[]` | `VictoryBar` |
| Workout Heatmap | `workoutCalendar[]` | Custom grid |
| Intensity Trend | `intensityTrend[]` | `VictoryLine` |
| Exercise Frequency | `exerciseFrequency[]` | `VictoryBar` (horizontal) |
| Strength Radar | `personalRecords[]` | `VictoryPolarAxis` |
| Volume Progression | `weeklyVolume[]` (area) | `VictoryArea` |
| 1RM Progression | `personalRecords[]` over time | `VictoryLine` |

---

### Phase 4: Admin Dashboard Impersonation
**Goal:** Admin dropdown to view any user's dashboard (client, trainer, or user).

#### 4.4.1 Architecture
```
WIREFRAME:
┌────────────────────────────────────────────────────────────┐
│ Admin Dashboard                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 👁 View As: [Jackie Client ▼]  [Exit Impersonation] │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                            │
│ ┌─ Client Dashboard (as Jackie) ───────────────────────┐  │
│ │ Overview | Workouts | Progress | Social | Settings    │  │
│ │                                                       │  │
│ │ [Charts, workout history, achievements, etc.]         │  │
│ │ [Exactly as Jackie would see it]                      │  │
│ └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

#### 4.4.2 Implementation
1. **Backend:** `GET /api/admin/impersonate/:userId` — Returns user data (NO auth token swap, just data)
2. **Frontend:** New route: `/dashboard/view-as/:userId`
3. **Component:** `AdminViewAsWrapper.tsx` — Renders client/trainer dashboard with data from target user
4. **Security:** Admin-only middleware, audit log on every impersonation, banner shows "Viewing as [Name]"

---

### Phase 5: Social Sharing Integration
**Goal:** Users can share workout results, charts, goals, and progress on the social feed.

#### 4.5.1 Share Workout on Social
```
FLOW:
1. User completes workout OR admin logs workout for client
2. Confirmation screen shows: "Share this workout?"
3. Auto-generates post with:
   - Title: "Move Fitness Session - Lower Body Machine Day"
   - Stats: 13 exercises, 30min, intensity 7/10
   - Top exercises: Leg Press 180x12, Hip Adduction 90x15
   - XP earned: +180 points
4. Posts to social feed as type="workout" with workoutSessionId linked
5. Friends see enriched workout card in their feed
```

#### 4.5.2 Share Charts on Social
```
FLOW:
1. User views their progress charts
2. "Share" button on each chart
3. Chart renders to image (html2canvas or Victory's toBlob)
4. Creates post with chart image + caption
5. Posts as type="achievement" or "milestone"
```

#### 4.5.3 Share Goals on Social
```
FLOW:
1. User sets a fitness goal (e.g., "Bench 100 lbs", "30-day streak")
2. Progress updates auto-post at milestones (25%, 50%, 75%, 100%)
3. Goal completion creates milestone post with celebration animation
```

---

## 5. FILE CHANGES REQUIRED

### Backend (New Files)
| File | Purpose |
|------|---------|
| `backend/controllers/workoutAnalyticsController.mjs` | Aggregation logic for charts |
| `backend/routes/analyticsRoutes.mjs` | Analytics API endpoints |

### Backend (Modifications)
| File | Change |
|------|--------|
| `backend/routes/social/posts.mjs` | Auto-link workoutSessionId, enrich on retrieval |
| `backend/controllers/adminClientController.mjs` | Wire reset-password, impersonation |
| `backend/routes/adminClientRoutes.mjs` | Add impersonation endpoint |

### Frontend (New Files)
| File | Purpose |
|------|---------|
| `frontend/src/hooks/analytics/useWorkoutAnalytics.ts` | Data hook for chart pipeline |
| `frontend/src/components/DashBoard/Pages/admin-clients/components/EnhancedWorkoutsModal.tsx` | Redesigned workouts modal with tabs |
| `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutExerciseTable.tsx` | Exercise detail table sub-component |
| `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutChartsTab.tsx` | Charts tab for workouts modal |
| `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutPRsTab.tsx` | Personal records tab |
| `frontend/src/components/DashBoard/AdminViewAsWrapper.tsx` | Admin impersonation wrapper |

### Frontend (Modifications)
| File | Change |
|------|--------|
| `EnhancedAdminClientManagementView.tsx` | Wire all action menu items, add source icons |
| `ClientWorkoutsModal.tsx` | Replace with EnhancedWorkoutsModal |
| `Charts/charts/*/` | Connect to useWorkoutAnalytics hook |
| `CreatePostForm.tsx` | Send workoutSessionId when sharing |
| `SocialFeed.tsx` | Render enriched workout cards |

---

## 6. DATA FLOW DIAGRAM (COMPLETE)

```
┌─────────────────────┐
│ Admin WorkoutLogger  │
│ (log for client)     │
└─────────┬───────────┘
          ↓
┌─────────────────────┐     ┌──────────────────────┐
│ POST /api/admin/    │────→│ PostgreSQL            │
│ clients/:id/workouts│     │ workout_sessions      │
│                     │     │ workout_logs          │
└─────────────────────┘     └──────────┬───────────┘
                                        ↓
                            ┌──────────────────────┐
                            │ GET /api/analytics/  │
                            │ workouts/:userId     │
                            │ (aggregation service)│
                            └──────────┬───────────┘
                                        ↓
          ┌─────────────────────────────┼─────────────────────────────┐
          ↓                             ↓                             ↓
┌──────────────────┐  ┌─────────────────────────┐  ┌──────────────────────┐
│ Client Card      │  │ Enhanced Workouts Modal  │  │ Social Feed          │
│ - Workout count  │  │ - History tab (full logs)│  │ - Workout post type  │
│ - Engagement %   │  │ - Charts tab (Victory)   │  │ - Linked session data│
│ - Source icon    │  │ - Progress tab (trends)  │  │ - Chart screenshots  │
│ - All actions    │  │ - PRs tab (records)      │  │ - Goal milestones    │
└──────────────────┘  │ - Share on social button │  └──────────────────────┘
                       └─────────────────────────┘
                                        ↓
                       ┌─────────────────────────┐
                       │ Admin Impersonation      │
                       │ /dashboard/view-as/:id   │
                       │ See client dashboard     │
                       │ exactly as they see it   │
                       └─────────────────────────┘
```

---

## 7. SECURITY & PRIVACY

| Requirement | Implementation |
|-------------|---------------|
| Admin-only impersonation | `authorize(['admin'])` middleware |
| Impersonation audit log | Log userId, targetId, timestamp to AuditLog table |
| No auth token swap | Impersonation returns data, not a new JWT |
| Chart visibility respected | Profile charts honor `chartVisibility` toggles |
| Workout sharing opt-in | Default: friends-only for workout posts |
| RBAC on analytics API | Admin sees all, trainer sees assigned clients, client sees self |
| Client data isolation | Clients can ONLY see their own data |
| Soft-delete preservation | Deleted client data retained for audit trail |

---

## 8. EXECUTION PRIORITY

| Priority | Phase | Estimated Scope |
|----------|-------|-----------------|
| P0 | Phase 1: Client card icons + wire all action menu items | Small — wiring existing components |
| P0 | Phase 2: Workouts modal redesign with exercise details | Medium — new modal + API |
| P1 | Phase 3: Charts connected to real data | Medium — new hook + modify charts |
| P1 | Phase 4: Admin impersonation | Medium — new route + wrapper |
| P2 | Phase 5: Social sharing of workouts/charts | Large — multiple integration points |

---

## 9. COMPETITOR RESEARCH (MANDATORY per CLAUDE.md)

### Client Management (3+ competitors):
1. **Trainerize** — Client cards show photo + last workout + compliance %. Workout modal shows full exercise breakdown with progress graphs inline.
2. **TrueCoach** — Client list with activity indicators. Click client → full workout history with video form checks. Charts embedded per client.
3. **My PT Hub** — Client profiles with body stats, progress photos, meal plans. Workout history shows sets/reps/weight detail per exercise.

### Social Fitness Sharing:
1. **Strava** — Auto-shares activities with map + stats. Friends see detailed breakdown. "Kudos" reactions.
2. **Fitocracy** — Workout posts show exercise detail + XP earned. Points leaderboard. Achievement badges on posts.
3. **Hevy** — Share workout routine as template. Friends can copy routines. Progress photos with before/after slider.

### Our Differentiator:
- **Gamification depth** (5 tiers, skill trees, animated celebrations) exceeds all competitors
- **NASM OPT protocol** built-in (no competitor does this)
- **AI workout generation** context-aware to client's phase
- **Crystalline Swan aesthetic** (luxury fitness brand, not generic)
- **Dual client source** (Move Fitness + SwanStudios) with separate branding

---

## 10. SUCCESS CRITERIA

- [ ] All 9 client action menu items functional (0 dead buttons)
- [ ] Move Fitness logo on MF clients, SwanStudios logo on SS clients
- [ ] Workouts modal shows full exercise details (sets, reps, weight)
- [ ] Victory charts display real workout data (not mock)
- [ ] Admin can view any client/trainer dashboard via dropdown
- [ ] Users can share workout results on social feed with linked data
- [ ] Playwright QA passes 100% on clients tab
- [ ] No console errors on any client management flow
- [ ] WCAG 4.5:1 contrast on all client card text
- [ ] 44px minimum touch targets on all interactive elements
