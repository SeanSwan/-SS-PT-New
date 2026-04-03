# Client Management Redesign — AI Village Planning Document

## 1. PROBLEM STATEMENT

The admin dashboard has TWO overlapping client management views:
- **"My Clients" tab** (`MyClientsView.tsx`) — Originally a trainer feature, shows assigned clients with mock progress data (Math.random()). Shows "0 active clients, 0 sessions completed, 0 improving" because it queries `client_trainer_assignments` instead of the admin clients API.
- **"Clients & Team" tab** (`MasterDetailLayout.tsx`) — Master-detail split with 4 pillars (Roster/Growth/Studio/Comms). Has real data but the sub-tabs (Onboarding, Assignments, Progress) feel like extra clicks with mock/placeholder content.

### User Complaints:
1. "My Clients tab shows 0 everything" — queries trainer assignments, not admin clients
2. "Clients & Team has extra info that's not necessary" — Onboarding status, Assignments, Progress Oversight sub-tabs feel redundant
3. "Extra clicks not needed" — ready/in-progress/alive labels feel like mock data
4. "I want client cards, not a table" — prefers visual cards over tabular roster
5. "I want a dropdown to select a client and see their full info populate" — single-client focus view
6. "These tabs are overlapping" — two views doing similar things
7. "Would rather have a Teach Me toggle" — replace unused sub-tabs with educational tooltips

## 2. CURRENT STATE ANALYSIS

### My Clients Tab (REMOVE)
- **Location:** `/dashboard/admin/my-clients` and `/dashboard/trainer/clients`
- **Component:** `TrainerDashboard/ClientManagement/MyClientsView.tsx` (1124 lines)
- **API:** `GET /api/client-trainer-assignments/trainer/{id}` — queries assignments, not all clients
- **Mock Data:** Progress %, trend, goals are ALL Math.random() / hardcoded
- **Real Data:** Session history/upcoming from API
- **Verdict:** REMOVE from admin sidebar. Keep for trainer role only.

### Clients & Team Tab (REDESIGN)
- **Location:** `/dashboard/admin/client-management`
- **Component:** `DashBoard/workspaces/clients-team/MasterDetailLayout.tsx`
- **API:** `GET /api/admin/clients` — real data, all clients
- **Sub-components:**
  - `ClientMiniCard.tsx` — compact roster cards (KEEP, enhance)
  - `ClientDetailView.tsx` — 4-tab detail (Training/Biometrics/Overview/Settings)
  - `TrainingTabContent.tsx` — WorkoutPlanBuilder, WorkoutLogger, AI Copilot (REAL)
  - `BiometricsTabContent.tsx` — BodyMap, Measurements, Movement Analysis, Form Analysis (REAL)
  - `OverviewTabContent.tsx` — Live stats from API (REAL)
  - `SettingsTabContent.tsx` — All hardcoded/disabled (MOCK)
- **Pillars:** Roster, Growth, Studio, Comms — Growth/Studio/Comms navigate away from client context
- **Verdict:** REDESIGN as the single client management hub

### Trainer Tab Equivalents
- Trainer has `MyClientsView` at `/dashboard/trainer/clients` — shows only assigned clients
- Trainer sidebar has separate items for Log Workout, Client Progress, etc.
- Trainer version should stay separate but be enhanced to match admin UX quality

## 3. PROPOSED REDESIGN

### 3A. Remove "My Clients" from Admin Sidebar
- Remove the `menuitem "My Clients"` from admin sidebar config
- Keep `MyClientsView` as trainer-only component at `/dashboard/trainer/clients`
- Admin uses "Clients & Team" exclusively

### 3B. Redesign "Clients & Team" as Unified Client Hub
Replace the current 4-pillar master-detail with a cleaner layout:

```
┌────────────────────────────────────────────────────────────────┐
│ [Client Selector Dropdown ▼]  [+ New Client]  [🔍 Search]     │
│ ┌──────────┐                                                    │
│ │ Photo    │  Ron W. — Move Fitness Client                     │
│ │ Avatar   │  Age 60 · Beginner · Focus: Mobility              │
│ └──────────┘  Sessions: 0 remaining · 2 completed              │
│               Onboarding: 50% complete [████░░░░]              │
├────────────────────────────────────────────────────────────────┤
│ [Overview] [Workouts] [Biometrics] [Schedule] [Notes] [Settings]│
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  (Selected tab content fills this area)                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions:

1. **Client Selector** — Dropdown at top with search, client photo/avatar, and name. Selecting a client populates the entire page with their data. No more clicking tiny cards in a side panel.

2. **Client Header Card** — Always visible at top. Shows: photo, name, client source badge (MF/SS), age, fitness level, focus area, session count, onboarding completion bar.

3. **Horizontal Tabs** — Clean tab row replacing the 4-pillar sidebar:
   - **Overview** — Bento grid of key metrics (existing OverviewTabContent, enhanced)
   - **Workouts** — Workout history timeline + log new workout + AI copilot (existing TrainingTabContent)
   - **Biometrics** — BodyMap, measurements, movement analysis (existing BiometricsTabContent)
   - **Schedule** — Client's upcoming sessions + booking
   - **Notes** — Trainer notes, NASM assessment, client notes
   - **Settings** — Client profile edit, privacy, training config (wire up the currently mock fields)

4. **Remove Growth/Studio/Comms pillars** — These navigate away from client context. Move them to their own sidebar items:
   - "Onboarding" → Keep as admin sidebar item (already exists at `/dashboard/admin/onboarding`)
   - "Waivers" → Keep as admin sidebar item
   - "Trainers" → Part of "System" sidebar area
   - "Messages" → Separate sidebar item

5. **Teach Me Toggle** — Optional info tooltip on each tab explaining what it does. Toggle on/off via settings. Shows 2-3 sentences max.

### 3C. Client Cards View (Alternative to Table)
Instead of the mini-card roster in a side panel, offer a full-page card grid as the default view when no client is selected:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 📷 Ron W.   │  │ 📷 Jackie C │  │ 📷 Vickie V │
│ MF · 60yo   │  │ SS · 35yo   │  │ MF · 42yo   │
│ Beginner    │  │ Intermediate│  │ Beginner    │
│ 2 workouts  │  │ 12 workouts │  │ 0 workouts  │
│ ████░░ 50%  │  │ ████████ 100%│  │ ██░░░░ 25%  │
│ [View →]    │  │ [View →]    │  │ [View →]    │
└─────────────┘  └─────────────┘  └─────────────┘
```

- Cards show: photo/avatar, name, client source badge, age, experience level, workout count, onboarding progress bar
- Clicking a card selects that client and switches to the tabbed detail view
- Grid is responsive: 3 columns desktop, 2 tablet, 1 mobile

### 3D. Workout History in Client Detail
When viewing a client's "Workouts" tab, show a chronological timeline of all their logged workouts:
- Date, title, exercise count, total volume, duration
- Expandable to show individual exercises and sets
- This is where Ron's imported Jan 24 and Jan 28 workouts will appear

### 3E. Food & Water Tracking Tab
Add a "Nutrition" tab (or sub-tab under Overview):
- Daily macro log summary
- Water intake tracking
- Meal history (if logged)
- This data comes from `daily_macro_logs` and `daily_hydrations` tables

## 4. FILES TO MODIFY

### Remove from Admin:
- `AdminStellarSidebar.tsx` — Remove "My Clients" menu item
- `UniversalDashboardLayout.tsx` — Remove admin route for `/my-clients`

### Redesign (Clients & Team):
- `ClientsWorkspace.tsx` — Simplify to single-client-focus layout
- `MasterDetailLayout.tsx` → Refactor to `ClientManagementHub.tsx` — dropdown selector + header + tabs
- `ClientDetailView.tsx` — Enhance tabs (add Schedule, Notes)
- `OverviewTabContent.tsx` — Add onboarding progress, food/water summary
- `SettingsTabContent.tsx` — Wire up to real API (PUT /api/admin/clients/:id)
- `ClientMiniCard.tsx` → Refactor to `ClientCard.tsx` — larger card for grid view

### Create:
- `ClientSelectorDropdown.tsx` — Searchable dropdown with avatars
- `ClientHeaderCard.tsx` — Always-visible client info banner
- `WorkoutHistoryTimeline.tsx` — Chronological workout list
- `NutritionSummaryCard.tsx` — Food/water tracking display

## 5. WHAT TO KEEP (Don't Break)
- `TrainingTabContent.tsx` — WorkoutPlanBuilder, WorkoutLogger, AI Copilot all work
- `BiometricsTabContent.tsx` — BodyMap, Measurements, Movement Analysis all work
- `OverviewTabContent.tsx` — Real API data, bento grid layout
- All backend APIs (`/api/admin/clients`, `/api/admin/clients/:id`)
- ClientTrainerAssignment system (still used for trainer role)
- Gamification hooks (XP on workout completion)

## 6. COACH ASSISTANT AI INTEGRATION (CRITICAL)

The redesigned Client Hub MUST be connected to the Coach Assistant (Hive Mind AI). When a trainer/admin selects a client, the AI should automatically have that client's full context.

### 6A. Embedded AI Panel in Client Hub
- Add an embedded AI chat panel (collapsible) at the bottom or side of the client detail view
- When a client is selected, the AI chat automatically sets `targetClientId` to that client's ID
- The AI can then:
  - Generate NASM-protocol workouts for that specific client
  - Import pasted workout logs for that client
  - Review their progress and make recommendations
  - Update their notes, goals, measurements via `update_client_data` actions
  - Answer questions about the client's history, assessments, compliance

### 6B. Context Auto-Sync
- Selecting a client in the Client Hub should sync with the Coach Assistant's client picker
- If the user navigates to the Coach Assistant tab, the same client should already be selected
- This prevents the "pick client twice" problem (once in Clients tab, once in Coach Assistant dropdown)
- Implementation: shared state via React context or URL query param (`?clientId=89`)

### 6C. Quick AI Actions per Tab
Each tab in the client detail view should have relevant AI quick actions:
- **Overview tab**: "Summarize this client's progress" button → sends to AI
- **Workouts tab**: "Generate next workout" + "Import workout log" buttons → sends to AI
- **Biometrics tab**: "Analyze movement patterns" → sends to AI
- **Schedule tab**: "Schedule next session" → sends to AI
- **Notes tab**: "Generate NASM assessment" → sends to AI

### 6D. Hive Mind Verification
The App AI Hive Mind (Gemini Flash → Qwen → Gemini Pro consensus) must be verified working for:
- Complex workout generation (should trigger 3-brain consensus)
- Client progress analysis (should trigger 3-brain consensus)
- Simple questions (single-model response for speed)
- Complexity detection must route appropriately based on context type

### 6E. Data Flow
```
Client Hub (select Ron W, client ID 89)
    ↓
Coach AI Panel (targetClientId = 89 auto-set)
    ↓
AI enrichWithUserData() fetches Ron's 17 data sources
    ↓
AI has full context: workouts, measurements, goals, pain, NASM levels
    ↓
Trainer asks: "Generate a mobility session for Ron based on his last 2 workouts"
    ↓
AI generates workout with NASM protocol, creates import_workout_log action block
    ↓
Backend creates WorkoutSession for Ron (client 89)
    ↓
Workout appears in Ron's Workouts tab immediately
```

## 7. WORKOUT PLANNING → LOGGING → EDITING WORKFLOW (CRITICAL)

The current system has a gap between workout PLANNING and workout LOGGING. The correct workflow is:

### 7A. The Complete Workout Lifecycle
```
STEP 1: PLAN (Workout Planner / AI Copilot)
  Trainer builds a workout using the Exercise Rolodex (840+ exercises)
  OR AI generates a NASM-protocol workout
  Trainer assigns it to a specific DATE for a specific CLIENT
  Status: "planned"

STEP 2: SCHEDULE (Shows on Calendar)
  The planned workout appears on the client's schedule for that date
  Client can see it on their dashboard: "Upcoming: Mobility Session — Jan 28"
  Trainer sees it on their schedule view
  Status: "planned" → "scheduled"

STEP 3: LOG (During/After Session)
  During or after the session, trainer opens the workout log
  The PLANNED workout is pre-loaded with target exercises, sets, reps, weight
  Trainer fills in ACTUAL performance:
    - Planned: Bench Press 135lb x 12 → Actual: 135lb x 8 (couldn't complete)
    - Planned: Lat Pulldown 40lb x 12 → Actual: 40lb x 12 ✓
    - Can add exercises that weren't planned (unplanned additions)
    - Can skip exercises that weren't done
  Status: "in_progress" → "completed"

STEP 4: EDIT (Post-Session Corrections)
  After marking complete, trainer can still go back and EDIT the log
  Fix typos, correct weights, add notes they forgot
  Each edit is timestamped for audit trail
  Status stays "completed" but updatedAt changes
```

### 7B. Editable Workout Log Requirements
- **Every field in a completed workout must be editable**: exercise name, sets, reps, weight, tempo, rest, RPE, notes
- **Add exercises on the fly** — mid-workout you decide to do something unplanned, add it right there in the logger with the Exercise Rolodex search. It gets logged under the same date/session.
- **Remove/skip exercises** — planned exercises you didn't do get marked "skipped" (not deleted, so the planned-vs-actual comparison still shows what was originally planned). OR hard-delete if you just want it gone.
- **Add/remove sets** from any exercise — did an extra set? Add it. Only did 2 of 3? Remove the third.
- **Inline editing** — click a cell (reps, weight) to edit it directly, no modal required
- **Save indicator** — auto-save with debounce OR explicit "Save Changes" button with visual feedback
- **Edit history** — track who edited and when (audit trail for client disputes)
- **Comparison view** — show planned vs actual side-by-side:
  ```
  Exercise          | Planned      | Actual       | Δ
  Bench Press       | 135lb x 12   | 135lb x 8    | -4 reps
  Lat Pulldown      | 40lb x 12    | 40lb x 12    | ✓ Hit target
  Cable Chest Press | 20lb x 12    | 20lb x 12    | ✓ Hit target
  Rope Tricep Push  | 20lb x 12    | (skipped)    | ✗ Skipped
  (unplanned)       | —            | Leg Press 45lb x 20 | + Added
  ```

### 7C. How This Connects to the Client Hub
In the client's **Workouts tab**:
- Show a timeline of all workouts (planned, completed, skipped)
- Each workout card is expandable to show exercises
- "Edit" button on each completed workout opens inline editing
- "Plan New Workout" button opens the Workout Planner with Exercise Rolodex
- Date picker when planning assigns it to the client's schedule

### 7D. How This Connects to the AI
- AI generates a workout → it goes into "planned" status for a date the trainer specifies
- After the session, trainer tells AI: "We did Ron's workout today but he only got 8 reps on bench instead of 12, and we skipped the tricep pushdowns"
- AI updates the workout log automatically via `update_workout_log` action
- OR trainer edits manually in the UI

### 7E. Backend Requirements
- `WorkoutSession` model already has `status` enum: 'planned', 'in_progress', 'completed', 'skipped', 'cancelled'
- Need: `PATCH /api/admin/clients/:clientId/workouts/:sessionId` endpoint for editing completed workouts
- Need: `WorkoutLog` records must be individually updatable (PATCH on individual log entries)
- Need: Track `originalReps`, `originalWeight` vs edited values for planned-vs-actual comparison
- Need: `editedAt`, `editedBy` fields on WorkoutLog for audit trail

## 8. UNIVERSAL MASTER SCHEDULE → WORKOUT LOG ENTRY POINT

The Universal Master Schedule is where trainers live during the workday. When a session is happening, the trainer is already looking at the schedule. They should be able to jump directly into the workout logger from there.

### 8A. Schedule → Workout Logger Flow
```
Universal Master Schedule (calendar view)
    ↓
Click on "Ron W — 11:00 AM" session block
    ↓
Popover/Modal shows:
  ┌─────────────────────────────────────────┐
  │ Ron W. — 11:00 AM (1 hour)              │
  │ Move Fitness · Beginner                  │
  │                                          │
  │ Planned Workout: Mobility Session #3     │
  │ 8 exercises · Est. 55 min                │
  │                                          │
  │ [▶ Start Logging]  [📋 View Plan]       │
  │ [✏️ Edit Session]  [❌ Cancel Session]   │
  └─────────────────────────────────────────┘
    ↓
Click "Start Logging"
    ↓
Navigate to: /dashboard/admin/client-management?clientId=89&tab=workouts&mode=log&sessionDate=2026-01-28
    ↓
Client Hub opens with Ron selected, Workouts tab active, 
workout logger pre-loaded with today's planned workout
```

### 8B. Role-Based Schedule Actions (ALL THREE ROLES)
Every role can access workout data from the schedule, but with different permissions:

**ADMIN (full access):**
- Click any client's session → Start Logging / Edit Log / View Plan / Cancel
- Can log workouts for any client
- Can edit any completed workout
- Can generate workouts via AI for any client

**TRAINER (assigned clients):**
- Click their assigned client's session → Start Logging / Edit Log / View Plan
- Can only see/edit sessions for clients assigned to them
- Can log and edit workouts for their clients
- Can generate workouts via AI for their clients

**CLIENT (read-only + self-log):**
- Click their own session → View Workout (read-only view of what was planned or completed)
- Can see: exercises, sets, reps, weight, trainer notes
- Can see planned vs actual comparison ("your trainer planned 12 reps, you did 8 — great effort!")
- CANNOT edit trainer-logged workouts
- CAN log their own solo workouts (if they train on their own between sessions)
- Motivational: seeing their workout history builds accountability and engagement

### 8C. Multiple Entry Points to the Same Workout Logger
The workout logger should be reachable from ANY of these paths:
1. **Schedule (any role)** — Click session → role-appropriate action (log/view/edit)
2. **Client Hub (admin/trainer)** — Select client → Workouts tab → "Log Workout" or click a planned workout
3. **Client Dashboard (client)** — "My Workouts" section → view completed workouts + log solo workouts
4. **Coach Assistant (admin/trainer)** — Tell AI "log Ron's workout" → AI generates log, shows in Workouts tab
5. **Trainer sidebar** — "Log Workout" menu item → client picker → logger

All paths lead to the SAME component with the SAME data, permission-gated by role. No duplicate implementations.

### 8C. Schedule Integration Details
- Scheduled sessions should show workout status: planned (blue), in-progress (amber), completed (green), skipped (gray)
- After logging is complete, the session block on the schedule updates to show ✓ completed
- If a session is completed from the workout logger, the schedule auto-refreshes
- Session deduction (for SwanStudios clients) triggers after marking complete

### 8D. Quick Actions from Schedule
Beyond "Start Logging", the schedule session popover should also offer:
- **View Plan** — Read-only view of the planned workout
- **Edit Session** — Change time, duration, notes (reschedule)
- **Cancel Session** — Mark as cancelled with reason
- **View Client** — Jump to client's full profile in Client Hub
- **AI Quick Action** — "Generate workout for this session" if no plan exists

## 9. RANGE OF MOTION (GONIOMETER) + ASSESSMENT TOOLS

### 9A. Goniometer / Range of Motion Tracking
A goniometer is the standard NASM tool for measuring joint range of motion in degrees. This data is critical for mobility-focused clients like Ron and feeds directly into progress tracking and workout programming.

**Joints to Measure (NASM Standard Protocol):**

| Joint | Movement | Normal ROM | How to Measure |
|-------|----------|-----------|----------------|
| **Shoulder** | Flexion | 180° | Arm overhead, measure angle from torso |
| **Shoulder** | Extension | 60° | Arm behind body |
| **Shoulder** | Abduction | 180° | Arm out to side |
| **Shoulder** | Internal Rotation | 70° | Elbow 90°, rotate forearm inward |
| **Shoulder** | External Rotation | 90° | Elbow 90°, rotate forearm outward |
| **Hip** | Flexion | 120° | Knee to chest (supine) |
| **Hip** | Extension | 20° | Leg behind body (prone) |
| **Hip** | Abduction | 45° | Leg out to side |
| **Hip** | Internal Rotation | 40° | Seated, rotate foot outward |
| **Hip** | External Rotation | 45° | Seated, rotate foot inward |
| **Knee** | Flexion | 135° | Heel to glute |
| **Knee** | Extension | 0° | Full straight leg |
| **Ankle** | Dorsiflexion | 20° | Foot pulled toward shin |
| **Ankle** | Plantarflexion | 50° | Foot pointed down |
| **Cervical Spine** | Flexion | 45° | Chin to chest |
| **Cervical Spine** | Extension | 45° | Head back |
| **Cervical Spine** | Lateral Flexion | 45° | Ear to shoulder |
| **Cervical Spine** | Rotation | 80° | Turn head left/right |
| **Lumbar Spine** | Flexion | 60° | Bend forward |
| **Lumbar Spine** | Extension | 25° | Bend backward |
| **Wrist** | Flexion | 80° | Palm toward forearm |
| **Wrist** | Extension | 70° | Back of hand toward forearm |

**Data Model Addition (ClientBaselineMeasurements or new RangeOfMotionEntry table):**
```
{
  clientId: number,
  date: Date,
  assessorId: number (trainer who measured),
  measurements: {
    shoulder_left_flexion: number (degrees),
    shoulder_right_flexion: number,
    hip_left_flexion: number,
    hip_right_flexion: number,
    knee_left_flexion: number,
    knee_right_flexion: number,
    ankle_left_dorsiflexion: number,
    ankle_right_dorsiflexion: number,
    cervical_flexion: number,
    cervical_extension: number,
    // ... all joints both sides
  },
  notes: string (trainer observations),
  painDuringTest: { joint: string, painLevel: number }[]
}
```

**Where It Lives in the UI:**
- **Biometrics tab** → new "Range of Motion" card alongside Body Map, Measurements, Movement Analysis
- Shows a visual joint diagram with color-coded ROM (green = normal, yellow = limited, red = severely limited)
- Historical chart: ROM over time per joint (shows improvement from stretching/mobility work)
- Comparison: left vs right side (asymmetry detection)

**AI Integration:**
- Trainer can tell the AI: "Ron's hip flexion is 85 degrees on the left and 90 on the right"
- AI stores the data and uses it for workout programming ("Ron has limited hip flexion, avoid deep squats, focus on hip flexor stretching")
- AI can suggest which joints to measure based on the client's complaints and exercise history

### 9B. Other Assessment Tools (NASM Standard Kit)

**Tools the trainer should be using (AI can teach how to use each):**

| Tool | What It Measures | Already in App? | Priority |
|------|-----------------|-----------------|----------|
| **Goniometer** | Joint range of motion (degrees) | ❌ NOT YET — adding now | HIGH |
| **Skin Calipers** | Body fat % (3-site or 7-site method) | ✅ YES — body fat % in measurements | DONE |
| **Blood Pressure Cuff** | Systolic/diastolic BP | ✅ YES — in baseline measurements | DONE |
| **Heart Rate Monitor** | Resting HR, exercise HR | ✅ YES — resting HR in baseline | DONE |
| **Scale** | Body weight | ✅ YES — weight in measurements | DONE |
| **Tape Measure** | Circumferences (waist, hips, chest, arms, thighs) | ✅ YES — in body measurements | DONE |
| **Sit-and-Reach Box** | Hamstring/low back flexibility | ⚠️ PARTIAL — flexibility notes field exists | MEDIUM |
| **Push-Up Test** | Upper body muscular endurance | ⚠️ PARTIAL — in performance assessments | MEDIUM |
| **YMCA Step Test / Rockport Walk** | Cardiovascular fitness (VO2max estimate) | ⚠️ PARTIAL — cardio field exists | MEDIUM |
| **Overhead Squat Assessment** | Movement compensations (NASM kinetic chain) | ✅ YES — full OHSA in baseline | DONE |
| **Single-Leg Squat Test** | Unilateral stability + knee tracking | ❌ NOT YET | LOW |
| **Balance Test (BESS)** | Static balance (eyes open/closed, foam pad) | ❌ NOT YET | LOW |

### 9C. Teach Me: How to Use the Goniometer
The AI Coach should be able to TEACH the trainer how to use the goniometer properly:
- Which landmarks to align (fulcrum, stationary arm, moving arm)
- Positioning for each joint measurement
- Common mistakes (not stabilizing the proximal segment, misaligning the fulcrum)
- When to refer out (if ROM is severely limited or painful, refer to PT/MD)

This is a perfect use case for the "Teach Me" system — the trainer clicks the ROM card in Biometrics, and a teach tooltip or the AI explains the measurement protocol step by step.

### 9D. ROM in the Workout Log
When ROM is measured during a session, it should be loggable alongside the workout:
- Separate section in the workout log: "Assessments Taken Today"
- Quick-entry form: select joint → enter degrees → note pain level
- This data feeds into the Biometrics tab ROM history charts
- Over time, shows improvement: "Ron's hip flexion went from 85° to 105° over 8 weeks"

## 10. TEACH ME SYSTEM — COMPREHENSIVE TRAINER EDUCATION (ALL ROLES)

### 10A. Why This Matters
Trainers (including Sean) need to know HOW to use every assessment tool, WHEN to use it, and WHERE the data goes in the app. This isn't just tooltips — it's an embedded education system that turns the app into a training certification companion.

### 10B. Where Teach Me Lives
The Teach Me system is available on EVERY tab/section across admin AND trainer dashboards:

| Dashboard Section | Teach Me Content |
|-------------------|------------------|
| **Biometrics → ROM** | How to use goniometer: per-joint protocol with landmarks, positioning, common mistakes, when to refer out |
| **Biometrics → Body Map** | How to document pain/tightness, how to use the anatomical overlay, how pain data feeds into workout planning |
| **Biometrics → Measurements** | How to take circumference measurements (tape measure), how to use skin calipers (3-site vs 7-site), how to weigh-in properly, when to measure (morning, fasted) |
| **Biometrics → Movement Analysis** | How to perform NASM Overhead Squat Assessment: 5 checkpoints, what compensations to look for, how to score it, how it determines OPT Phase |
| **Biometrics → Form Analysis** | How to record exercise form video, what angles to film from, what the AI looks for in form analysis |
| **Workouts → Planner** | How to build a NASM-protocol workout: Phase 1-5 variables (sets, reps, tempo, rest, %1RM), how to use the Exercise Rolodex, how to assign to a date |
| **Workouts → Logger** | How to log a session: planned vs actual, adding/removing exercises mid-workout, editing after session, when to note RPE and pain |
| **Workouts → AI Copilot** | What to say to the AI to generate workouts, how to import logs, how to get client-specific recommendations |
| **Schedule** | How sessions work: booking, confirming, deducting (SS clients), cancellation policy, recurring sessions |
| **Client Overview** | What each metric means: OPT Phase, XP/Level, Streak, engagement score, how gamification drives retention |
| **Client Onboarding** | How to onboard a new client via AI: what info to gather, MF vs SS client source, how claim codes work |
| **Notes** | How to write NASM assessment notes: what to include (compensations, corrective strategy, phase recommendation), how notes feed into AI workout generation |
| **Settings** | How privacy settings work, how to configure training variables per client, how to set goals |
| **Blood Pressure** | How to take BP properly: seated 5 min rest, left arm at heart level, correct cuff size, what numbers mean (normal <120/80, elevated, stage 1/2 hypertension), when to refer to physician |
| **Heart Rate** | How to take resting HR: radial pulse 60 sec, or carotid 15 sec x4, what zones mean (Karvonen formula), target HR for each OPT phase |
| **Body Fat %** | 3-site caliper protocol (chest/abdomen/thigh for men, tricep/suprailiac/thigh for women), Jackson-Pollock formula, how to pinch correctly, what % ranges mean per age/gender |
| **Cardio Assessment** | YMCA 3-min step test OR Rockport 1-mile walk test: full protocol, how to calculate VO2max estimate, what the numbers mean |
| **Push-Up Test** | NASM protocol: men from toes, women from knees (or modified), max reps in 60 sec, how to score, what it indicates for upper body endurance |
| **Sit-and-Reach** | How to perform: shoes off, feet flat against box, reach forward slowly, measure in cm/inches, what it indicates for hamstring/low back flexibility |

### 10C. Teach Me UI Design
```
┌──────────────────────────────────────────────────────┐
│ Biometrics → Range of Motion              [? Teach Me] │
├──────────────────────────────────────────────────────┤
│                                                       │
│  (When Teach Me is toggled ON, a panel slides in)    │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 📖 HOW TO MEASURE ROM WITH A GONIOMETER        │ │
│  │                                                  │ │
│  │ 1. SETUP                                        │ │
│  │    Place the fulcrum (center pivot) on the      │ │
│  │    joint center. Align the stationary arm with  │ │
│  │    the proximal bone. The moving arm follows    │ │
│  │    the distal bone.                             │ │
│  │                                                  │ │
│  │ 2. HIP FLEXION (Example)                       │ │
│  │    Client: supine (face up)                     │ │
│  │    Fulcrum: greater trochanter (hip bone side)  │ │
│  │    Stationary arm: along torso (parallel)       │ │
│  │    Moving arm: along femur (thigh)              │ │
│  │    Normal: 120° | Ron's last: 85° (limited)    │ │
│  │                                                  │ │
│  │ 3. COMMON MISTAKES                             │ │
│  │    ✗ Not stabilizing the pelvis                 │ │
│  │    ✗ Misaligning the fulcrum (too high/low)     │ │
│  │    ✗ Forcing past pain — STOP at first pain     │ │
│  │                                                  │ │
│  │ [▶ Watch Video]  [Ask AI for help]              │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  (Regular ROM measurement UI below)                  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 10D. Teach Me Toggle Behavior
- **Toggle button** `[? Teach Me]` in the header of every section
- Click ON → educational panel slides in above the content (not replacing it)
- Click OFF → panel slides out, just the tool remains
- **Persist preference** per section in localStorage — if trainer always wants Teach Me on for ROM, it stays on
- **First-time auto-show** — when a trainer accesses a section for the FIRST TIME, Teach Me auto-opens with a subtle "New! Learn how to use this tool" badge
- **AI integration** — "Ask AI for help" button at bottom of every Teach Me panel sends the section context to the Coach AI for deeper Q&A

### 10E. Teach Me Content Source
- Content is stored as markdown in `frontend/src/content/teach-me/` directory
- One file per section: `rom.md`, `body-fat.md`, `blood-pressure.md`, `workout-planner.md`, etc.
- AI can also generate teach content dynamically if the markdown file doesn't exist
- Content follows NASM protocols with citations where applicable
- Includes "When to refer out" guidance for medical situations

### 10F. Admin vs Trainer Teach Me
- **Same content** for both roles — NASM protocols don't change by role
- **Admin gets extra sections**: Revenue analytics teach me, Gamification settings teach me, System configuration teach me
- **Trainer-specific emphasis**: More focus on client-facing assessment protocols, less on business metrics
- **Client role**: Simplified teach me — "What this means for your fitness" explainers on their own data (e.g., "Your body fat % is 22% — here's what that means and how we'll improve it")

## 11. QUESTIONS FOR AI VILLAGE
1. Should the client selector be a dropdown or a sidebar panel? Dropdown saves space but limits quick scanning.
2. Is the 4-pillar (Roster/Growth/Studio/Comms) architecture worth preserving for admin workflow?
3. Should "Notes" be its own tab or a section within Overview?
4. Should nutrition/food tracking be a separate tab or embedded in Overview?
5. What's the best UX pattern for showing workout history timeline (infinite scroll vs pagination)?
6. Should the trainer version mirror the admin layout or stay as card grid?
7. How should we handle the transition — feature flag or hard swap?
8. Are there competitive fitness platforms we should reference for client management UX?
