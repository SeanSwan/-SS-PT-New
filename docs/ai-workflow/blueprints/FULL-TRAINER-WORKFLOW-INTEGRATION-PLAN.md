# Full Trainer Workflow Integration Plan

## Executive Summary
SwanStudios needs a seamless end-to-end trainer workflow: assign clients, sell sessions, schedule training, log workouts, track progress, and plan future sessions. Currently, critical data connections are broken or missing. This plan addresses all gaps found during comprehensive QA.

## Current State (Bugs Found & Fixed)

### Already Fixed (This Session)
1. **Coach Assistant Client Roster** (FIXED) — AI now queries `client_trainer_assignments` to show all assigned clients with session counts, workout history, and goals
2. **Session Credits Field Name** (FIXED) — `sessionsRemaining` corrected to `availableSessions` across 3 controllers (creditsController, adminController, sessionPackageController)
3. **Workout Planner API Path** (FIXED) — Frontend called `/api/workouts/sessions` but backend serves `/api/workout/sessions`
4. **Auth Bypass in Workout Builder** (FIXED) — `verifyClientAccess()` now fails closed on DB error instead of open
5. **Null Safety in Session Stats** (FIXED) — Exercise/set iteration guards added
6. **Duplicate Workout Prevention** (FIXED) — Admin logger now checks same client+same date

## Remaining Issues (Need Implementation)

### P0: CRITICAL — Blocks Core Business

#### Issue 1: Client Dashboard Uses Mock Data
- **File:** `frontend/src/components/DashBoard/Pages/client-dashboard/index.tsx`
- **Problem:** `useMockData()` generates random fake data (points, streak, achievements, activity)
- **Impact:** Clients see fabricated workout history and progress
- **Fix:** Replace with real API calls to:
  - `/api/v1/gamification/profile` for points/level/streak
  - `/api/workout/sessions` for workout history
  - `/api/achievements/user` for real achievements
  - `/api/workout-forms/client/:id/progress-detailed` for charts

#### Issue 2: No Session → Workout Log Link
- **Problem:** Completing a scheduled session doesn't create a workout log. Trainer must separately log workout.
- **Impact:** No audit trail connecting scheduled session to its workout data
- **Fix:** When session status → 'completed', auto-create a WorkoutSession with `sourceSessionId` linking back to the scheduled Session

#### Issue 3: Equipment Photos Not Saved
- **File:** `backend/routes/equipmentRoutes.mjs:471-547`
- **Problem:** AI scan processes photo but discards the buffer — `photoUrl` is NULL
- **Fix:** Call `uploadPhoto()` from photoStorageService before AI scan, save returned URL to `item.photoUrl`

#### Issue 4: Equipment Profile Not Passed to AI Workout Generation
- **Problem:** EquipmentProfilePicker is shown in workout builder but selected profile ID isn't sent to AI
- **Impact:** AI doesn't know what equipment is available at the training location
- **Fix:** Pass `selectedProfileId` through workout builder API, query profile's items, inject into AI context

### P1: HIGH — Degrades User Experience

#### Issue 5: NASM Categories Hardcoded in Progress API
- **File:** `backend/routes/dailyWorkoutFormRoutes.mjs:937-944, 1168-1184`
- **Problem:** Category names and base levels are hardcoded, not computed from actual exercises
- **Fix:** Map logged exercises to NASM categories via exercise database `primaryMuscle` field, compute levels from volume/frequency

#### Issue 6: Coach Assistant Can't Log Workouts by Client Name
- **Problem:** AI sees client roster but `targetUserId` is still null — data writes go to trainer's own profile
- **Fix:** When AI action block contains `daily_workout_form` or similar, extract client name/ID from context and route the write to that client's userId

#### Issue 7: Workout Planner Duration Options Inconsistent
- **File:** `frontend/src/pages/workout/components/WorkoutPlanner/components/PlanForm.tsx:63-78`
- **Problem:** Standard planner only has 1,2,4,6,8,12 weeks. Admin planner has full range (1w-52w)
- **Fix:** Sync PlanForm duration options with admin WorkoutPlannerTypes.ts (add single session, 3mo, 6mo, 9mo, 12mo)

#### Issue 8: WorkoutDashboard Tabs Show "Coming Soon"
- **File:** `frontend/src/pages/workout/WorkoutDashboard.tsx:250-256`
- **Problem:** "Planner" and "Sessions" tabs render placeholder text
- **Fix:** Wire up existing WorkoutPlanner and RecentSessions components

### P2: MEDIUM — Improvement

#### Issue 9: No Cover Photo Upload for Equipment Profiles
- **Problem:** EquipmentProfile has `coverPhotoUrl` field but no upload endpoint
- **Fix:** Add `POST /api/equipment-profiles/:id/cover-photo` using photoStorageService

#### Issue 10: No Exercise Analytics on Client Dashboard
- **Problem:** No "top 5 exercises", "most worked muscle groups", "least worked" analytics visible to clients
- **Fix:** Create analytics section using exercise frequency data from `/api/workout-forms/client/:id/progress-detailed`

#### Issue 11: Gamification Not Triggered on Session Completion
- **Problem:** XP only awarded during manual workout logging, not on session completion
- **Fix:** Call `awardWorkoutXP()` from `completeSession()` when workout data exists

## Architecture: Full Lifecycle Flow (Target State)

```
CLIENT ONBOARDING
  Admin creates client → Client gets account → Onboarding questionnaire
  → Movement analysis → NASM phase assignment → Equipment profile selection
  → Client dashboard shows real data from day 1

SESSION PURCHASE
  Client/Admin buys package → Stripe/manual → User.availableSessions += N
  → Client sees session count on dashboard

WORKOUT PLANNING
  Trainer selects client → Picks equipment profile (Move Fitness/Home/Park)
  → AI generates plan (1d to 12mo) using profile's equipment
  → Plan saved with NASM phase, periodization, exercise details
  → Client sees upcoming plan on their dashboard

SCHEDULING
  Trainer books session on Universal Master Schedule
  → Within 24hr: User.availableSessions -= 1 (atomic)
  → >24hr: deduction on completion
  → Client notified via email/push

TRAINING SESSION
  Session day arrives → Trainer opens Workout Logger
  → Equipment profile auto-selected based on plan
  → Trainer logs exercises: sets, reps, weight, tempo, rest, RPE
  → Workout saved to WorkoutSession + WorkoutLog tables
  → XP awarded → Social feed auto-post → Charts updated

OR VIA COACH ASSISTANT
  Trainer tells AI: "Log bench press 4x8 at 185 for Vickie"
  → AI matches "Vickie" to Client #3 from roster
  → Creates DailyWorkoutForm with exercise data
  → Same XP/social/chart flow triggers

CLIENT VIEWS RESULTS
  Client opens dashboard → Sees REAL data:
    - Current NASM phase indicator
    - Session count remaining
    - Last workout details
    - Progress charts (volume, 1RM, frequency, muscle groups)
    - Top 5/10 exercises
    - Achievement badges earned
    - Streak counter
    - Next scheduled session

TRAINER REVIEWS
  Trainer opens Client tab → Sees same data plus:
    - All workout history with full detail
    - Progress comparison over time
    - NASM phase progression recommendations
    - Notes and flags
```

## Implementation Priority Order

### Sprint 1: Data Integrity (P0 fixes)
1. Replace client dashboard mock data with real API calls
2. Save equipment photos during AI scan
3. Pass equipment profile to workout generation AI
4. Link scheduled sessions to workout logs

### Sprint 2: AI Integration (P1 fixes)
5. Coach Assistant routes workout data writes to correct client
6. Sync workout planner duration options
7. Wire up WorkoutDashboard tabs
8. Compute NASM categories from real exercise data

### Sprint 3: Analytics & Polish (P2 fixes)
9. Client exercise analytics (top exercises, muscle groups)
10. Equipment cover photo upload
11. Gamification on session completion
12. End-to-end Playwright QA verification

## Files Affected (Complete List)

### Backend
- `backend/services/aiChatService.mjs` — Client roster in enrichment (DONE)
- `backend/controllers/creditsController.mjs` — Field name fix (DONE)
- `backend/controllers/adminController.mjs` — Field name fix (DONE)
- `backend/controllers/sessionPackageController.mjs` — Field name fix (DONE)
- `backend/routes/equipmentRoutes.mjs:471-547` — Photo save during scan
- `backend/routes/dailyWorkoutFormRoutes.mjs:937-944` — NASM categories
- `backend/controllers/sessionController.mjs:878-969` — Session → WorkoutLog link
- `backend/routes/workoutBuilderRoutes.mjs` — Equipment profile passthrough
- `backend/services/workoutBuilderService.mjs` — Equipment-aware generation

### Frontend
- `frontend/src/components/DashBoard/Pages/client-dashboard/index.tsx` — Replace mock data
- `frontend/src/pages/workout/WorkoutDashboard.tsx:250-256` — Wire up tabs
- `frontend/src/pages/workout/components/WorkoutPlanner/components/PlanForm.tsx:63-78` — Duration options
- `frontend/src/components/Shared/EquipmentProfilePicker.tsx` — Pass profile to AI
- NEW: Client exercise analytics component

## Cost Estimate
- AI Village planning run: ~$0.15-0.35
- Implementation: 3 sprints, ~500-800 lines of code changes
- All equipment photo storage uses existing R2 infrastructure ($0)
