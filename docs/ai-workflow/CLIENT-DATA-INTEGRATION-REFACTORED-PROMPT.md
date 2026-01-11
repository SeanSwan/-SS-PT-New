# 🔍 CLIENT DATA INTEGRATION - Comprehensive Analysis & Refactoring Prompt

**CRITICAL: READ THIS FIRST BEFORE GENERATING ANY CODE**

This prompt requires you to perform a **DEEP ANALYSIS** of the existing SwanStudios codebase BEFORE creating any new code. The goal is to integrate the client-data management system WITHOUT creating duplicate components, models, or breaking existing functionality.

---

## 🎯 PROJECT BRIEF

I need you to integrate a comprehensive client data management system into my existing SwanStudios Personal Training web application. However, my codebase already has:
- 44+ backend controllers
- 556+ frontend components
- Multiple dashboard layouts
- Existing client/trainer/admin systems
- AI services built into the backend (NOT MCP servers)

**Your mission:**
1. **FIRST:** Analyze the existing codebase to identify what already exists
2. **SECOND:** Identify duplicates, broken tabs, and non-functional buttons
3. **THIRD:** Design the best layout and component structure
4. **FOURTH:** Generate ONLY the missing pieces (no duplicates)
5. **FIFTH:** Ensure all data saves to PostgreSQL database (NO mock data)

---

# 📊 PHASE 1: DEEP CODEBASE ANALYSIS (DO THIS FIRST!)

## Step 1: Analyze Existing Backend Controllers

**Location:** `backend/controllers/`

**Controllers to Review:**
- `adminClientController.mjs` - What client management already exists?
- `clientProfileController.mjs` - What profile functionality exists?
- `progressController.mjs` - What progress tracking exists?
- `bodyMeasurementController.mjs` - What measurement tracking exists?
- `onboardingController.mjs` - What onboarding exists?
- `profileController.mjs` - What profile management exists?
- Any others related to client data

**Analysis Questions:**
1. What API endpoints already exist for client data?
2. Which endpoints save to database vs use mock data?
3. Which endpoints are broken or incomplete?
4. What's missing from the existing controllers?

**Output Format:**
```markdown
## Existing Backend Analysis

### adminClientController.mjs
- Endpoints found: [list all]
- Database models used: [list all]
- Functionality: [describe what it does]
- Issues found: [list problems]
- Missing features: [what's needed]

[Repeat for each controller...]

### Recommended Actions:
1. KEEP: [controllers that work and should be reused]
2. REFACTOR: [controllers that need fixes]
3. CREATE NEW: [functionality that doesn't exist]
```

---

## Step 2: Analyze Existing Database Models

**Location:** `backend/models/`

**Models to Review:**
- `User.mjs` - Already has masterPromptJson, spiritName, client fields
- `ClientProgress.mjs` - Does this exist? What does it track?
- `BodyMeasurement.mjs` - Does this exist? What does it track?
- `ProgressReport.mjs` - Does this exist? What does it track?
- `Session.mjs` - Training sessions tracking
- `Goal.mjs` - Client goals
- Any other client-related models

**Analysis Questions:**
1. Which models already exist that map to the 85-question questionnaire?
2. Which models save to database vs are just interfaces?
3. Are there duplicate models (e.g., ClientProgress vs ProgressData)?
4. What associations exist between models?

**Output Format:**
```markdown
## Existing Database Models Analysis

### User.mjs
- Fields relevant to client data: [list all]
- Missing fields from questionnaire: [list gaps]
- Associations: [list relationships]

### ClientProgress.mjs (if exists)
- Current schema: [describe]
- Overlaps with needed functionality: [yes/no/partial]
- Recommended action: [keep/refactor/replace]

[Repeat for each model...]

### Data Model Gaps:
1. Questionnaire fields not covered: [list]
2. Progress tracking gaps: [list]
3. Nutrition tracking gaps: [list]
4. Photo metadata gaps: [list]

### Recommended Schema Design:
[Your recommended approach to fill gaps without duplicating]
```

---

## Step 3: Analyze Existing Frontend Components

**Location:** `frontend/src/components/`

**Focus Areas:**

### Admin Dashboard Components
**Path:** `frontend/src/components/Admin/`

**Found Components:**
- `ClientTrainerAssignments.tsx` - What does this do?
- `SessionAllocationManager.tsx` - What does this do?
- `TrainerPermissionsManager.tsx` - What does this do?
- `NASM/NASMAdminDashboard.tsx` - What does this do?
- Any other admin client management components?

**Analysis Questions:**
1. Is there already a client list view?
2. Is there already a client profile view?
3. Is there already a client onboarding form?
4. Which components have broken buttons/tabs?
5. Which components don't save to database?

### Client Dashboard Components
**Path:** `frontend/src/components/ClientDashboard/`

**Found Components (Many!!):**
- Multiple layout components (ClientLayout, ClientDashboardLayout, newLayout/ClientDashboardLayout)
- Multiple sidebar components (Sidebar, StellarSidebar, ClientSidebar)
- Multiple section components (OverviewSection, EnhancedOverviewSection, ProgressSection, etc.)
- Various dashboard implementations (RevolutionaryClientDashboard, SafeMainContent, etc.)

**CRITICAL QUESTIONS:**
1. **Which dashboard layout is currently active/working?**
2. **Which components are obsolete duplicates?**
3. **Which tabs are broken or non-functional?**
4. **Which components use real data vs mock data?**
5. **What's the intended tab structure?**

**Analysis Required:**
```markdown
## Client Dashboard Analysis

### Active Components (Currently Used):
1. [Component name] - [What it does] - [Works? Y/N]

### Duplicate/Obsolete Components:
1. [Component name] - [Duplicate of what?] - [Delete? Y/N]

### Broken Tabs/Buttons:
1. Tab: [Name] - Issue: [What doesn't work] - Fix: [How to fix]

### Data Persistence Issues:
1. Component: [Name] - Issue: [Uses mock data] - Fix: [Connect to API endpoint]

### Recommended Tab Structure:
- Overview (show: [what data])
- My Profile (show: [what data])
- My Progress (show: [what data])
- My Workouts (show: [what data])
- My Nutrition (show: [what data])
- Messages (show: [what data])
- Settings (show: [what data])

Each tab should:
- Load data from: [API endpoint]
- Save data to: [API endpoint]
- Display: [specific fields]
```

### Trainer Dashboard Components
**Path:** `frontend/src/components/` (look for Trainer-specific)

**Analysis Questions:**
1. Does a Trainer Dashboard exist?
2. Can trainers view their assigned clients?
3. Can trainers add progress reports?
4. Which features are missing?

---

## Step 4: Analyze AI Service Integration

**IMPORTANT:** AI services are built into the backend (NOT external MCP servers)

**Routes to Check:**
- `backend/routes/adminMcpRoutes.mjs` - What AI routes exist?
- Any routes with "ai", "nasm", "nutrition", "workout" in the name

**Controllers to Check:**
- Are there controllers for AI workout generation?
- Are there controllers for AI nutrition planning?
- Are there controllers for AI analysis?

**Analysis Questions:**
1. Where are the AI services located in the backend?
2. What endpoints exist for AI features?
3. How do you call the AI services (API format)?
4. What AI features already work?
5. What AI features need to be connected to client data?

**Output Format:**
```markdown
## AI Services Analysis

### Backend AI Endpoints Found:
1. POST /api/ai/workout-generation
   - Input format: [describe]
   - Output format: [describe]
   - Works? [Y/N]
   - Integration needed: [yes/no]

2. POST /api/ai/nutrition-planning
   - Input format: [describe]
   - Output format: [describe]
   - Works? [Y/N]
   - Integration needed: [yes/no]

[List all AI endpoints...]

### Integration Points Needed:
1. [AI Feature] needs client data from [Model/API]
2. [AI Feature] output should save to [Model/Table]
```

---

## Step 5: Analyze Routes & API Structure

**Location:** `backend/routes/`

**Routes to Review:**
- `adminClientRoutes.mjs` - What exists?
- `authRoutes.mjs` - Authentication patterns
- `api.mjs` - Main API router
- All routes related to clients, progress, profiles

**Analysis Questions:**
1. What's the route naming convention?
2. What's the authentication middleware pattern?
3. Which routes need to be added?
4. Which routes are broken?

---

# 🏗️ PHASE 2: GAP ANALYSIS & RECOMMENDATIONS

After completing Phase 1 analysis, create a comprehensive report:

## Database Schema Recommendations

```markdown
### Models to CREATE (don't exist):
1. ClientOnboardingQuestionnaire
   - Reason: [why needed]
   - Fields: [list key fields]
   - Associations: [list relationships]

### Models to REFACTOR (exist but need changes):
1. [Model name]
   - Current issues: [describe]
   - Fields to add: [list]
   - Fields to remove: [list]
   - Associations to add: [list]

### Models to KEEP (working as-is):
1. [Model name] - [why it's good]
```

## API Endpoints Recommendations

```markdown
### Endpoints to CREATE:
1. POST /api/client-data/onboarding
   - Purpose: [describe]
   - Request body: [schema]
   - Response: [schema]
   - Controller: [new or existing?]

### Endpoints to REFACTOR:
1. [Existing endpoint]
   - Current issues: [describe]
   - Changes needed: [describe]

### Endpoints to DEPRECATE:
1. [Endpoint] - Reason: [duplicate/broken/unused]
```

## Frontend Component Recommendations

```markdown
### Admin Dashboard Structure:
```
Admin Dashboard
├── Client Management
│   ├── Client List (REFACTOR: [existing component])
│   ├── Client Profile (CREATE NEW)
│   │   ├── Tab: Overview (REFACTOR: [existing])
│   │   ├── Tab: Questionnaire (CREATE NEW)
│   │   ├── Tab: Progress (REFACTOR: [existing])
│   │   ├── Tab: Nutrition (CREATE NEW)
│   │   ├── Tab: Workouts (INTEGRATE: [AI service])
│   │   └── Tab: Photos (CREATE NEW)
│   └── Client Onboarding Wizard (CREATE NEW)
```

### Client Dashboard Structure:
```
Client Dashboard (CONSOLIDATE multiple layouts into ONE)

DELETE THESE OBSOLETE COMPONENTS:
- [Component 1] - Reason: [duplicate of X]
- [Component 2] - Reason: [never used]

KEEP AND REFACTOR:
- [Component X] - Make this the main layout
- [Component Y] - Fix tabs to save to database

RECOMMENDED TAB STRUCTURE:
├── Overview
│   ├── Show: [goals, current stats, upcoming sessions]
│   ├── Data from: GET /api/client-data/summary/:userId
│   └── Save to: [N/A - read only]
├── My Profile
│   ├── Show: [questionnaire data, measurements]
│   ├── Data from: GET /api/client-data/profile/:userId
│   └── Save to: [N/A - read only for client]
├── My Progress
│   ├── Show: [weight chart, strength chart, compliance]
│   ├── Data from: GET /api/client-data/progress/:userId
│   └── Chart library: [Recharts/Chart.js/D3]
├── My Workouts
│   ├── Show: [current week workout, past workouts]
│   ├── Data from: GET /api/workouts/:userId
│   └── Mark complete: POST /api/workouts/:workoutId/complete
├── My Nutrition
│   ├── Show: [current meal plan, macro targets]
│   ├── Data from: GET /api/client-data/nutrition/:userId/active
│   └── Log food: POST /api/nutrition/log
└── Settings
    ├── Show: [preferences, notifications]
    ├── Data from: GET /api/users/:userId/settings
    └── Save to: PUT /api/users/:userId/settings
```

### Tab Functionality Fixes:
```markdown
### Broken Tab: [Tab Name]
- **Current Issue:** Button click doesn't do anything
- **Root Cause:** [Missing onClick handler / Wrong API endpoint / Component not rendering]
- **Fix Required:**
  1. Add onClick handler: [code example]
  2. Connect to API: [endpoint]
  3. Update state management: [how]
  4. Ensure data persists: [verify database save]

### Non-Functional Save Button: [Component Name]
- **Current Issue:** Data doesn't persist after page refresh
- **Root Cause:** [Using local state only / No API call / API returns but doesn't save to DB]
- **Fix Required:**
  1. Add API call to: [endpoint]
  2. Verify backend saves to: [database table]
  3. Show success message: [toast/alert]
  4. Reload data to confirm: [API call]
```

---

# 🛠️ PHASE 3: IMPLEMENTATION PLAN

Based on your Phase 1 & 2 analysis, create a detailed implementation plan:

## Priority 1: Fix Existing Broken Features

```markdown
1. Fix Client Dashboard Layout
   - Action: Consolidate [Component A, B, C] into single working layout
   - Delete: [List obsolete components to remove]
   - Refactor: [List components that need fixing]

2. Fix Broken Tabs
   - Tab: [Name] - Fix: [Specific changes]
   - Tab: [Name] - Fix: [Specific changes]

3. Fix Data Persistence
   - Component: [Name] - Connect to: [API endpoint] - Save to: [DB table]
```

## Priority 2: Add Missing Database Models

```markdown
ONLY create models that DON'T exist:

1. ClientOnboardingQuestionnaire (if doesn't exist)
   - Maps to: 85-question intake form
   - Fields: [comprehensive list based on questionnaire]
   - Associations: belongsTo User

[Only list models that are actually missing...]
```

## Priority 3: Add Missing API Endpoints

```markdown
ONLY create endpoints that DON'T exist:

1. POST /api/client-data/onboarding (if doesn't exist)
   - Purpose: Save questionnaire
   - Handler: [new controller or add to existing]
```

## Priority 4: Add Missing UI Components

```markdown
ONLY create components that DON'T exist:

Admin Dashboard:
1. Client Onboarding Wizard (if doesn't exist)
   - 85-question multi-step form
   - Saves to: POST /api/client-data/onboarding

Client Dashboard:
1. [Only list truly missing components after consolidation]
```

## Priority 5: Integrate AI Services

```markdown
Connect existing AI backend services to client data:

1. Workout Generation
   - Backend endpoint: [found in analysis]
   - Input: Client data from [User.masterPromptJson + latest progress]
   - Output: Save to [WorkoutPlan table or Session table]
   - UI Integration: Button in [Component name]

2. Nutrition Planning
   - Backend endpoint: [found in analysis]
   - Input: Client data from [questionnaire + goals]
   - Output: Save to [NutritionPlan table]
   - UI Integration: Button in [Component name]
```

---

# 📝 PHASE 4: GENERATE CODE

**ONLY AFTER completing Phase 1-3 analysis**, generate code for:

1. **NEW Models** (only what's missing)
2. **NEW Controllers** (only what's missing)
3. **NEW Routes** (only what's missing)
4. **REFACTORED Components** (fix existing broken ones)
5. **NEW Components** (only truly missing pieces)

**Code Generation Rules:**
- ✅ Reuse existing models/controllers/components when possible
- ✅ Follow existing code patterns and conventions
- ✅ Use existing authentication middleware patterns
- ✅ Match existing file naming conventions
- ✅ Ensure all data saves to PostgreSQL (no mock data)
- ❌ Don't create duplicates
- ❌ Don't replace working code
- ❌ Don't change working components unnecessarily

---

# 📋 MASTER PROMPT SCHEMA MAPPING

## 85-Question Onboarding Questionnaire

The client-data system is based on an 85-question comprehensive intake form. Here are the sections:

### Section 1: Client Profile (Q1-10)
- Full name, preferred name, age, DOB, gender, blood type
- Contact info (phone, email, preferred time)
- How they heard about you

### Section 2: Measurements (Q11-15)
- Height (feet/inches), current weight, target weight
- Body fat %, DEXA scan history

### Section 3: Fitness Goals (Q16-22)
- Primary goal (weight loss, muscle gain, strength, pain relief, athletic performance, general health)
- Why it's important (motivation)
- What success looks like in 6 months
- Timeline (3mo/6mo/1yr/ongoing)
- Commitment level (1-10)
- Past obstacles
- Support needed from trainer

### Section 4: Health History (Q23-31)
- Medical conditions (list all)
- Under doctor care? (yes/no, condition, doctor info)
- Doctor clearance for exercise? (yes/no/not asked)
- Medications (name, dosage, frequency) - array
- Supplements (list all currently taking)
- Supplement compliance (yes/sometimes/no + barrier)
- Past injuries (year, body part, type, current status) - array
- Past surgeries (year, surgery, recovery status) - array
- Current pain assessment:
  - For each pain area: body part, intensity (1-10), duration, triggers, relief methods, affects daily life?

### Section 5: Nutrition & Lifestyle (Q32-48)
- Current diet quality (very healthy, somewhat healthy, average, poor)
- Track food intake? (yes/sometimes/no + app name)
- Daily protein grams
- Daily water intake (glasses)
- Eating schedule (breakfast/lunch/dinner times, # of snacks)
- Blood type diet interest? (yes/no/tell me more)
- Dietary philosophy (no sugar, low sodium, non-GMO, organic, gluten-free, dairy-free, veg, vegan, paleo, keto, flexible)
- Food allergies/intolerances
- Foods you LOVE (5-10 items for meal planning)
- Foods you HATE (to avoid in meal plans)
- Cook at home? (yes often, sometimes, rarely, never)
- Interested in meal prep coaching? (yes/no/maybe)
- Sleep hours average
- Sleep quality (excellent/good/fair/poor)
- Stress level (1-10) + main sources
- Occupation + work activity level (sedentary/moderate/active)
- Smoking status (yes/no/quit + date)
- Alcohol consumption (none, 1-2/week, 3-7/week, 8+/week)

### Section 6: Training History (Q49-63)
- Current fitness level (beginner, beginner-intermediate, intermediate, advanced)
- Currently working out? (yes/no/on and off)
- Weekly workout frequency
- Current workout types
- Past training experience (weight training, cardio, sports, yoga, CrossFit, martial arts, group fitness, personal training)
- Previous personal trainer? (yes/no + experience + what to do different)
- Primary gym location
- Other gym access
- Favorite exercises (5-10 list)
- Disliked exercises (to avoid)
- Preferred training styles (heavy/low reps, moderate, HIIT, bodyweight, functional, steady cardio)
- Fitness influencers followed
- Preferred session frequency (times/week)
- Preferred session duration (60min/90min/flexible)

### Section 7: Baseline Measurements (Q60-63 - completed DURING first session)
**Cardiovascular:**
- Resting heart rate (bpm)
- Blood pressure (systolic/diastolic)

**Strength Baselines (1RM or max reps):**
- Bench press (lbs/reps)
- Squat (lbs/reps)
- Deadlift (lbs/reps)
- Overhead press (lbs/reps)
- Pull-ups (reps, assisted Y/N)

**Range of Motion (degrees, goniometer):**
- Shoulder flexion (L/R) - normal 180°
- Shoulder abduction (L/R) - normal 180°
- Hip flexion (L/R) - normal 120°
- Hip extension (L/R) - normal 20°
- Ankle dorsiflexion (L/R) - normal 20°

**Flexibility:**
- Sit-and-reach (cm) - normal 0-10cm
- Shoulder mobility (clasp hands behind back) Y/N
- Hip mobility (90/90 position) Y/N

### Section 8: AI Coaching Setup (Q64-70)
- Daily AI check-ins? (yes/no/tell me more)
- Preferred check-in time (e.g., 8:00 PM)
- Check-in method (text message, voice message, both)
- AI help with (array): accountability, nutrition tracking, workout reminders, pain monitoring, supplement compliance, motivation, progress tracking, answering questions
- Communication style (direct, warm, educational, balanced)
- Motivation style when struggling (tough love, compassion, remind me why, show data, other)
- Progress report frequency (weekly, bi-weekly, monthly, only when I ask)

### Section 9: Visual Diagnostics (Q71-74)
- Comfortable with progress photos? Y/N (for posture/pain analysis)
- Want to send pain photos? Y/N
- Wearable device (Apple Watch, Fitbit, Garmin, Oura Ring, Whoop, Other, None)
- Interested in wearable integration? Y/N (HRV, sleep quality, recovery readiness)

### Section 10: Investment & Commitment (Q75-79)
- Selected tier:
  - **Silver** ($50/month): 2 sessions/week, SMS check-ins, basic nutrition
  - **Golden** ($125/month): 4 sessions/week, meal plans, wearable integration
  - **Rhodium** ($200/month): 6 sessions/week, 24/7 support, full AI suite
- Package sessions per week
- Commitment period (4-week trial, 12-week program, 6-month, 1-year)
- Payment method (pay per session, monthly billing, upfront package)
- Budget notes

### Section 11: Informed Consent (Q80-81)
- Liability waiver signed Y/N + date
- AI data consent signed Y/N + date
- Consents to:
  - Physical training carries injury risk
  - Will report pain/discomfort immediately
  - Responsible for following medical advice
  - Won't hold trainer liable for injuries outside sessions
  - Will communicate honestly
  - AI tools will analyze training data
  - Voice transcription by AI
  - Photo analysis by AI
  - Anonymized data used to improve systems
  - Data is private, never shared with third parties
  - Can opt out of AI analysis anytime

### Section 12: Final Thoughts (Q82-85)
- Anything else I should know?
- Most excited about?
- Most nervous about?
- Questions for trainer?

### Section 13: Trainer Assessment (Completed by trainer post-intake)
- Overall health risk (Low/Moderate/High)
- Doctor clearance needed? Y/N
- Priority areas to address
- Recommended training frequency (times/week)
- Recommended tier (Silver/Golden/Rhodium)

---

## Master Prompt JSON Schema v3.0

The questionnaire data is transformed into a structured JSON that powers AI-generated workouts and nutrition plans. Store in `User.masterPromptJson` field.

**Schema Structure:**
```json
{
  "version": "3.0",
  "client": {
    "name": "Full legal name",
    "preferredName": "Nickname",
    "alias": "Spirit Name for privacy (e.g., Orion Ascending, Golden Hawk)",
    "age": 35,
    "gender": "Male|Female|Non-binary|Prefer not to say",
    "bloodType": "A|B|AB|O|Unknown",
    "contact": {
      "phone": "555-123-4567",
      "email": "client@example.com",
      "preferredTime": "Morning|Afternoon|Evening"
    }
  },
  "measurements": {
    "height": {"feet": 6, "inches": 1},
    "currentWeight": 210,
    "targetWeight": 190,
    "bodyFatPercentage": 22,
    "lastDexaScan": "2025-01-01 or null"
  },
  "goals": {
    "primary": "Weight loss|Muscle gain|Strength improvement|Pain relief|Athletic performance|General health|Other",
    "why": "2-3 sentences about motivation",
    "successLooksLike": "Description of 6-month success",
    "timeline": "3 months|6 months|1 year|Ongoing",
    "commitmentLevel": 9,  // 1-10
    "pastObstacles": "What prevented past success",
    "supportNeeded": "What they need from trainer"
  },
  "health": {
    "medicalConditions": ["Diabetes", "Hypertension"],
    "underDoctorCare": true,
    "doctorInfo": "Dr. Smith, 555-1234",
    "doctorClearance": "Yes|No|Not asked",
    "medications": [
      {"name": "Metformin", "dosage": "500mg", "frequency": "2x/day"}
    ],
    "supplements": ["Protein powder", "Creatine", "Multivitamin"],
    "injuries": [
      {"year": 2020, "bodyPart": "Right knee", "type": "ACL tear", "status": "Fully healed"}
    ],
    "surgeries": [
      {"year": 2020, "surgery": "ACL reconstruction", "recovery": "100%"}
    ],
    "currentPain": [
      {
        "bodyPart": "Lower back",
        "intensity": 4,  // 1-10
        "duration": "2 weeks",
        "triggers": "Sitting too long",
        "relief": "Stretching, heat",
        "affectsDailyLife": true
      }
    ]
  },
  "nutrition": {
    "currentDiet": "Somewhat healthy|Very healthy|Average|Poor",
    "tracksFoodIntake": "Yes|Sometimes|No",
    "trackingApp": "MyFitnessPal or null",
    "dailyProteinGrams": 150,
    "dailyWaterGlasses": 8,
    "eatingSchedule": {
      "breakfast": "07:00",
      "lunch": "12:00",
      "dinner": "18:00",
      "snacks": 2
    },
    "bloodTypeDiet": "Yes|No|Tell me more",
    "dietaryPhilosophy": ["No sugar", "Organic", "Non-GMO"],
    "allergies": ["Peanuts", "Shellfish"],
    "foodsLove": ["Chicken", "Rice", "Broccoli", "Eggs", "Oatmeal"],
    "foodsHate": ["Brussels sprouts", "Liver"],
    "cooksAtHome": "Yes, often|Sometimes|Rarely|Never",
    "mealPrepInterest": "Yes|No|Maybe"
  },
  "lifestyle": {
    "sleepHours": 7.5,
    "sleepQuality": "Excellent|Good|Fair|Poor",
    "stressLevel": 6,  // 1-10
    "stressSources": "Work deadlines, family",
    "occupation": "Software Engineer",
    "workActivityLevel": "Sedentary|Moderate|Active",
    "smokes": "Yes|No|Quit",
    "smokingQuitDate": "2020-01-01 or null",
    "alcoholConsumption": "None|1-2/week|3-7/week|8+/week"
  },
  "training": {
    "fitnessLevel": "Beginner|Beginner-Intermediate|Intermediate|Advanced",
    "currentlyWorkingOut": "Yes|No|On and off",
    "weeklyFrequency": 3,
    "currentWorkoutTypes": "Weight training, cardio",
    "pastExperience": ["Weight training", "Running", "Basketball"],
    "previousTrainer": false,
    "gymLocation": "24 Hour Fitness Downtown",
    "favoriteExercises": ["Bench press", "Squats", "Pull-ups"],
    "dislikedExercises": ["Burpees", "Running"],
    "preferredStyles": ["Heavy weights/low reps", "Functional training"],
    "influencersFollowed": "AthleanX, Jeff Nippard",
    "sessionFrequency": 3,  // per week
    "sessionDuration": "60 min|90 min|Flexible"
  },
  "baseline": {
    "cardiovascular": {
      "restingHeartRate": 72,
      "bloodPressure": "120/80"
    },
    "strength": {
      "benchPress": {"weight": 135, "reps": 5},
      "squat": {"weight": 155, "reps": 8},
      "deadlift": {"weight": 185, "reps": 5},
      "overheadPress": {"weight": 85, "reps": 6},
      "pullUps": {"reps": 3, "assisted": false}
    },
    "rangeOfMotion": {
      "shoulderFlexion": {"left": 180, "right": 175},
      "shoulderAbduction": {"left": 180, "right": 180},
      "hipFlexion": {"left": 115, "right": 120},
      "hipExtension": {"left": 20, "right": 20},
      "ankleDorsiflexion": {"left": 20, "right": 18}
    },
    "flexibility": {
      "sitAndReach": 5,  // cm
      "shoulderMobility": true,
      "hipMobility": true
    }
  },
  "aiCoaching": {
    "dailyCheckIns": true,
    "checkInTime": "20:00",
    "checkInMethod": "Text message|Voice message|Both",
    "helpWith": ["Accountability", "Nutrition tracking", "Motivation"],
    "communicationStyle": "Direct|Warm|Educational|Balanced",
    "motivationStyle": "Tough love|Compassion|Remind me why|Show data|Other",
    "progressReportFrequency": "Weekly|Bi-weekly|Monthly|Only when I ask"
  },
  "visualDiagnostics": {
    "comfortableWithPhotos": true,
    "wantsPainPhotos": true,
    "wearableDevice": "Apple Watch|Fitbit|Garmin|Oura Ring|Whoop|Other|None",
    "wearableIntegration": true
  },
  "package": {
    "tier": "Silver|Golden|Rhodium",
    "price": 125.00,
    "sessionsPerWeek": 4,
    "commitmentPeriod": "4-week trial|12-week program|6-month|1-year",
    "paymentMethod": "Pay per session|Monthly billing|Upfront package"
  },
  "consent": {
    "liabilityWaiver": {"signed": true, "date": "2025-01-11"},
    "aiDataConsent": {"signed": true, "date": "2025-01-11"}
  },
  "trainerAssessment": {
    "healthRisk": "Low|Moderate|High",
    "doctorNeeded": false,
    "priorityAreas": "Core strength, lower back health",
    "recommendedFrequency": 3,
    "recommendedTier": "Golden"
  },
  "metadata": {
    "intakeDate": "2025-01-11",
    "firstSessionDate": "2025-01-15",
    "completedBy": 1,  // Trainer user ID
    "lastUpdated": "2025-01-11T10:00:00Z"
  }
}
```

---

# 🎯 DELIVERABLES

After completing your analysis and implementation, provide:

## 1. Analysis Report
- Existing components/models/controllers audit
- Duplicate identification
- Broken functionality list
- Gap analysis

## 2. Recommended Architecture
- Consolidated dashboard layout
- Optimal tab structure
- Data flow diagrams
- Component hierarchy

## 3. Code Files
**ONLY for missing/broken pieces:**
- New/refactored models (`.mjs`)
- New/refactored controllers (`.mjs`)
- New/refactored routes (`.mjs`)
- New/refactored components (`.tsx`)
- Migration files (`.js`)

## 4. Integration Guide
- How to connect AI services
- How to ensure data persists
- How to test functionality
- Deployment checklist

## 5. Cleanup Tasks
- Components to delete (obsolete duplicates)
- Code to deprecate
- Database migrations needed

---

# ❓ QUESTIONS TO ANSWER BEFORE STARTING

1. **Which Client Dashboard layout is currently active?**
   - RevolutionaryClientDashboard?
   - ClientDashboardLayout (original or newLayout)?
   - SafeMainContent?

2. **Where are the AI services in the backend?**
   - Workout generation endpoint?
   - Nutrition planning endpoint?
   - What's the request/response format?

3. **Which database tables already exist for client data?**
   - Run: `SELECT table_name FROM information_schema.tables WHERE table_schema='public';`
   - List all tables related to clients, progress, sessions

4. **Photo storage location?**
   - Local server directory?
   - Cloud storage (AWS S3, Azure Blob)?
   - Encryption method?

---

# 🚀 START HERE

1. **Run codebase analysis** (Phase 1)
2. **Generate analysis report**
3. **Get my approval on recommendations**
4. **Then generate ONLY the necessary code**

Ready when you are! 🎯
