# CHATGPT-5 IMPLEMENTATION DIRECTIVE
## Business Readiness & Streamlining Master Plan

**Issued By:** Claude Code (Sonnet 4.5)
**Issued To:** ChatGPT-5 (Codex)
**Date:** 2026-01-15
**Priority:** 🔴 CRITICAL - Business launch blocking

---

## 📋 EXECUTIVE SUMMARY

You (ChatGPT-5) have successfully completed:
- ✅ Stage 1: Created 5 database models + migrations (ClientOnboardingQuestionnaire, ClientBaselineMeasurements, ClientNutritionPlan, ClientPhoto, ClientNote)
- ✅ Stage 2 File 6: Implemented AI Workout Generation controller with OpenAI GPT-4 integration

**CRITICAL ISSUE:** Migrations created but NOT RUN. Database tables don't exist yet.

**NEW DIRECTIVE:** Pause Stage 2 work. Shift to **Phase 0-5 Business Readiness & Streamlining Master Plan**.

---

## 🎯 MISSION OBJECTIVES

### Primary Goal
Transform SwanStudios from a feature-rich prototype with mock data into a **production-ready personal training platform** where:
1. **100% of data** is database-backed (zero hardcoding/mock data)
2. **Admin can populate ALL data** via dashboard (zero developer dependency)
3. **Every UI feature works end-to-end** (click-through validation)
4. **Ready to onboard Fairmont parents** (target market launch)

### Business Context
**Target Market:** Fairmont parents (time-stressed, high-income, results-focused)

**Corrected Pricing:**
- Express 30 (30 min): **$110/session**
- Signature 60 Standard (60 min): **$175/session**
- Signature 60 AI Data Package (60 min): **$200/session** (includes 85-question assessment, movement screen, progress tracking)
- Transformation Pack: **$1,600/10 sessions** ($160/session rate)

**Key Differentiator:** 10-minute movement screen + AI-powered personalized training plan

---

## 🚨 PHASE 0: DATABASE FOUNDATION (CRITICAL - 2 HOURS)

**Priority:** 🔴 BLOCKING ALL OTHER WORK
**Status:** NOT STARTED
**Timeline:** 2 hours

### Why This is Critical
Your Stage 1 database models are excellent, but **migrations haven't been run**. The tables don't exist in the database yet. Every API endpoint you build in Phase 1-5 will error on first call if Phase 0 is not completed.

### Tasks

#### 0.1: Install OpenAI SDK
```bash
cd backend
npm install openai
```

**Why:** Your AI Workout Controller ([backend/controllers/aiWorkoutController.mjs:27-45](../../../backend/controllers/aiWorkoutController.mjs#L27-L45)) imports `openai` but it's not in package.json. This will error on first call.

#### 0.2: Run All Pending Migrations
```bash
cd backend
npm run migrate
```

**Expected Output:**
```
Sequelize [Migration] Executing: CREATE TABLE client_onboarding_questionnaires...
Sequelize [Migration] Executing: CREATE TABLE client_baseline_measurements...
Sequelize [Migration] Executing: CREATE TABLE client_nutrition_plans...
Sequelize [Migration] Executing: CREATE TABLE client_photos...
Sequelize [Migration] Executing: CREATE TABLE client_notes...
5 migrations executed successfully
```

#### 0.3: Verify Database Tables Created
**Option A: Using psql**
```bash
psql -U postgres -d swanstudios
\dt client_*
```

**Option B: Using pgAdmin**
Open pgAdmin → SwanStudios database → Tables → verify 5 new tables exist

**Expected Tables:**
- `client_onboarding_questionnaires`
- `client_baseline_measurements`
- `client_nutrition_plans`
- `client_photos`
- `client_notes`

#### 0.4: Test Model Associations
Create test script: `backend/test-model-associations.mjs`

```javascript
import db from './models/associations.mjs';
const { User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements, ClientNutritionPlan, ClientPhoto, ClientNote } = db;

async function testAssociations() {
  try {
    console.log('Testing User associations...');

    const testUser = await User.findByPk(1, {
      include: [
        'onboardingQuestionnaires',
        'baselineMeasurements',
        'nutritionPlans',
        'clientPhotos',
        'clientNotes'
      ]
    });

    if (!testUser) {
      console.error('❌ No user with ID 1 found. Create a test user first.');
      return;
    }

    console.log('✅ User associations loaded successfully');
    console.log(`  - Questionnaires: ${testUser.onboardingQuestionnaires?.length ?? 0}`);
    console.log(`  - Baseline Measurements: ${testUser.baselineMeasurements?.length ?? 0}`);
    console.log(`  - Nutrition Plans: ${testUser.nutritionPlans?.length ?? 0}`);
    console.log(`  - Photos: ${testUser.clientPhotos?.length ?? 0}`);
    console.log(`  - Notes: ${testUser.clientNotes?.length ?? 0}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Association test failed:', error.message);
    process.exit(1);
  }
}

testAssociations();
```

**Run test:**
```bash
node backend/test-model-associations.mjs
```

#### 0.5: Create Seed Data for Testing
Create seed script: `backend/seed-client-data.mjs`

```javascript
import db from './models/associations.mjs';
const { User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements, ClientNutritionPlan } = db;

async function seedData() {
  try {
    // Find or create test user
    let testUser = await User.findOne({ where: { email: 'test-client@swanstudios.com' }});

    if (!testUser) {
      testUser = await User.create({
        email: 'test-client@swanstudios.com',
        password: 'hashed_password_here', // Use actual bcrypt hash
        firstName: 'Test',
        lastName: 'Client',
        role: 'client'
      });
      console.log('✅ Created test user');
    }

    // Create sample questionnaire
    const questionnaire = await ClientOnboardingQuestionnaire.create({
      userId: testUser.id,
      questionnaireVersion: '3.0',
      status: 'completed',
      responsesJson: {
        section1: { goal: 'weight_loss', commitment: 9 },
        section2: { injuries: 'none', pain_level: 0 }
        // ... truncated for brevity
      },
      primaryGoal: 'weight_loss',
      trainingTier: 'signature_60',
      commitmentLevel: 9,
      healthRisk: 'low',
      nutritionPrefs: { dietary_restrictions: [], meal_frequency: 3 },
      completedAt: new Date()
    });
    console.log('✅ Created sample questionnaire');

    // Create sample baseline measurements
    const baseline = await ClientBaselineMeasurements.create({
      userId: testUser.id,
      takenAt: new Date(),
      restingHeartRate: 72,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      benchPressWeight: 135,
      benchPressReps: 10,
      pullUpsReps: 5,
      parqScreening: {
        q1_heart_condition: false,
        q2_chest_pain: false,
        q3_balance_dizziness: false,
        q4_bone_joint_problem: false,
        q5_blood_pressure_meds: false,
        q6_medical_reason: false,
        q7_aware_of_other: false,
        medicalClearanceRequired: false
      },
      overheadSquatAssessment: {
        anteriorView: { feetTurnout: 'minor', feetFlattening: 'none', kneeValgus: 'significant', kneeVarus: 'none' },
        lateralView: { excessiveForwardLean: 'minor', lowBackArch: 'none', armsFallForward: 'minor', forwardHead: 'none' },
        asymmetricWeightShift: 'none',
        notes: 'Knee valgus and forward lean observed',
        videoUrl: null
      },
      nasmAssessmentScore: 73,
      posturalAssessment: { anteriorView: 'Shoulders level', lateralView: 'Slight anterior pelvic tilt', posteriorView: 'Right shoulder elevated' },
      performanceAssessments: { cardio: { test: 'YMCA 3-Minute Step Test', heartRate: 128, rating: 'good' } },
      correctiveExerciseStrategy: null,
      flexibilityNotes: 'Good hamstring flexibility, tight hip flexors',
      injuryNotes: 'No current injuries',
      painLevel: 0
    });
    console.log('✅ Created sample baseline measurements');

    // Create sample nutrition plan
    const nutritionPlan = await ClientNutritionPlan.create({
      userId: testUser.id,
      planName: 'Weight Loss Macros - Week 1',
      dailyCalories: 2000,
      proteinGrams: 150,
      carbsGrams: 200,
      fatGrams: 67,
      mealsJson: {
        breakfast: { name: 'Oatmeal + Protein', calories: 400, protein: 30 },
        lunch: { name: 'Chicken Salad', calories: 600, protein: 50 },
        dinner: { name: 'Salmon + Veggies', calories: 700, protein: 50 },
        snacks: { name: 'Protein Shake', calories: 300, protein: 20 }
      },
      groceryListJson: ['oats', 'protein powder', 'chicken breast', 'salmon', 'mixed greens', 'olive oil'],
      dietaryRestrictions: [],
      allergies: [],
      source: 'ai_generated',
      status: 'active'
    });
    console.log('✅ Created sample nutrition plan');

    console.log('\n🎉 Phase 0 seed data created successfully!');
    console.log(`Test User ID: ${testUser.id}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed data creation failed:', error.message);
    process.exit(1);
  }
}

seedData();
```

**Run seed:**
```bash
node backend/seed-client-data.mjs
```

### Deliverables
1. ✅ Screenshot of migration logs (or terminal output)
2. ✅ Screenshot of database tables in pgAdmin/psql
3. ✅ Test script output showing associations work
4. ✅ Update [CURRENT-TASK.md:516](CURRENT-TASK.md#L516) marking Phase 0 as ✅ COMPLETE

---

## 📋 PHASE 1: CLIENT ONBOARDING BLUEPRINT (3-5 DAYS)

**Priority:** 🟡 HIGH
**Status:** ⏸️ PAUSED (waiting for Phase 0)
**Dependencies:** Phase 0 must be complete

### Overview
Build the complete client onboarding system that enables Fairmont parent onboarding:
1. 85-question comprehensive assessment
2. 10-minute movement screen (NASM OHSA)
3. Client data overview dashboard
4. **Admin UIs to populate ALL data** (CRITICAL PROTOCOL)

### Phase 1.1: Backend API Endpoints

#### Endpoint 1: Create Questionnaire Response
**Route:** `POST /api/onboarding/:userId/questionnaire`

**Controller:** `backend/controllers/onboardingController.mjs`

**Request Body:**
```json
{
  "questionnaireVersion": "3.0",
  "responses": {
    "section1_demographics": {
      "age": 42,
      "gender": "male",
      "occupation": "Software Engineer"
    },
    "section2_goals": {
      "primary_goal": "weight_loss",
      "secondary_goals": ["muscle_gain", "energy"],
      "target_weight": 180,
      "timeline": "6_months"
    },
    // ... 11 more sections (85 total questions)
  }
}
```

**Implementation Requirements:**
```javascript
export const createQuestionnaire = async (req, res) => {
  const { userId } = req.params;
  const { questionnaireVersion, responses } = req.body;
  const requesterId = req.user.id;
  const requesterRole = req.user.role;

  // RBAC: Admin = any client, Trainer = assigned only, Client = self only
  if (requesterRole === 'client' && parseInt(userId) !== requesterId) {
    return res.status(403).json({ message: 'Cannot create questionnaire for another user' });
  }

  if (requesterRole === 'trainer') {
    const assignment = await ClientTrainerAssignment.findOne({
      where: { clientId: userId, trainerId: requesterId, status: 'active' }
    });
    if (!assignment) {
      return res.status(403).json({ message: 'Not assigned to this client' });
    }
  }

  // Auto-extract indexed fields from responses
  const primaryGoal = responses.section2_goals?.primary_goal;
  const trainingTier = responses.section2_goals?.preferred_package; // 'express_30', 'signature_60', 'transformation_pack'
  const commitmentLevel = responses.section3_lifestyle?.commitment_level; // 1-10
  const healthRisk = calculateHealthRisk(responses); // 'low', 'medium', 'high', 'critical'
  const nutritionPrefs = {
    dietary_restrictions: responses.section5_nutrition?.dietary_restrictions ?? [],
    meal_frequency: responses.section5_nutrition?.meals_per_day ?? 3,
    allergies: responses.section5_nutrition?.allergies ?? []
  };

  // Calculate completion percentage
  const totalQuestions = 85;
  const answeredQuestions = countAnsweredQuestions(responses);
  const completionPercentage = Math.round((answeredQuestions / totalQuestions) * 100);

  // Create questionnaire
  const questionnaire = await ClientOnboardingQuestionnaire.create({
    userId,
    createdBy: requesterId,
    questionnaireVersion,
    status: completionPercentage === 100 ? 'completed' : 'in_progress',
    responsesJson: responses,
    primaryGoal,
    trainingTier,
    commitmentLevel,
    healthRisk,
    nutritionPrefs,
    completedAt: completionPercentage === 100 ? new Date() : null
  });

  res.status(201).json({
    success: true,
    questionnaire: {
      id: questionnaire.id,
      userId: questionnaire.userId,
      status: questionnaire.status,
      completionPercentage,
      primaryGoal,
      trainingTier,
      healthRisk,
      createdAt: questionnaire.createdAt
    }
  });
};

// Helper: Calculate health risk from responses
function calculateHealthRisk(responses) {
  const injuries = responses.section4_health?.current_injuries?.length ?? 0;
  const painLevel = responses.section4_health?.pain_level ?? 0;
  const medicalConditions = responses.section4_health?.medical_conditions?.length ?? 0;

  if (medicalConditions >= 3 || painLevel >= 8) return 'critical';
  if (injuries >= 2 || painLevel >= 5 || medicalConditions >= 1) return 'high';
  if (injuries === 1 || painLevel >= 3) return 'medium';
  return 'low';
}

// Helper: Count answered questions
function countAnsweredQuestions(responses) {
  let count = 0;
  Object.values(responses).forEach(section => {
    if (typeof section === 'object') {
      count += Object.keys(section).filter(key => section[key] !== null && section[key] !== '').length;
    }
  });
  return count;
}
```

#### Endpoint 2: Get Questionnaire
**Route:** `GET /api/onboarding/:userId/questionnaire`

**Response:**
```json
{
  "success": true,
  "questionnaire": {
    "id": 1,
    "userId": 42,
    "status": "completed",
    "completionPercentage": 100,
    "questionnaireVersion": "3.0",
    "primaryGoal": "weight_loss",
    "trainingTier": "signature_60",
    "commitmentLevel": 9,
    "healthRisk": "low",
    "nutritionPrefs": {
      "dietary_restrictions": [],
      "meal_frequency": 3,
      "allergies": []
    },
    "responses": { /* full 85-question response object */ },
    "completedAt": "2026-01-15T10:30:00Z",
    "createdAt": "2026-01-15T09:00:00Z"
  }
}
```

#### Endpoint 3: Create Movement Screen
**Route:** `POST /api/onboarding/:userId/movement-screen`

**Request Body:**
```json
{
  "parqScreening": {
    "q1_heart_condition": false,
    "q2_chest_pain": false,
    "q3_balance_dizziness": false,
    "q4_bone_joint_problem": false,
    "q5_blood_pressure_meds": false,
    "q6_medical_reason": false,
    "q7_aware_of_other": false,
    "medicalClearanceRequired": false
  },
  "overheadSquatAssessment": {
    "anteriorView": {
      "feetTurnout": "minor",
      "feetFlattening": "none",
      "kneeValgus": "significant",
      "kneeVarus": "none"
    },
    "lateralView": {
      "excessiveForwardLean": "minor",
      "lowBackArch": "none",
      "armsFallForward": "minor",
      "forwardHead": "none"
    },
    "asymmetricWeightShift": "none",
    "notes": "Knee valgus and forward lean observed",
    "videoUrl": null
  },
  "posturalAssessment": {
    "anteriorView": "Shoulders level",
    "lateralView": "Slight anterior pelvic tilt",
    "posteriorView": "Right shoulder elevated"
  },
  "performanceAssessments": {
    "cardio": { "test": "YMCA 3-Minute Step Test", "heartRate": 128, "rating": "good" }
  },
  "flexibilityNotes": "Tight hip flexors",
  "injuryNotes": "Past ankle sprain",
  "painLevel": 2
}
```

**Implementation:**
```javascript
export const createMovementScreen = async (req, res) => {
  const { userId } = req.params;
  const {
    parqScreening,
    overheadSquatAssessment,
    posturalAssessment,
    performanceAssessments,
    flexibilityNotes,
    injuryNotes,
    painLevel
  } = req.body;

  // RBAC check (same as questionnaire)
  // ... (admin/trainer/client validation)

  // Calculate NASM assessment score + corrective strategy
  const nasmAssessmentScore = ClientBaselineMeasurements.calculateNASMScore(overheadSquatAssessment);
  const correctiveExerciseStrategy = ClientBaselineMeasurements.generateCorrectiveStrategy(overheadSquatAssessment);

  // Create baseline measurement record
  const baseline = await ClientBaselineMeasurements.create({
    userId,
    recordedBy: req.user.id,
    takenAt: new Date(),
    parqScreening,
    overheadSquatAssessment,
    nasmAssessmentScore,
    posturalAssessment,
    performanceAssessments,
    correctiveExerciseStrategy,
    flexibilityNotes,
    injuryNotes,
    painLevel
  });

  res.status(201).json({
    success: true,
    movementScreen: {
      id: baseline.id,
      userId: baseline.userId,
      nasmAssessmentScore,
      painLevel,
      takenAt: baseline.takenAt
    }
  });
};
```

#### Endpoint 4: Client Data Overview
**Route:** `GET /api/client-data/overview/:userId`

**Response:**
```json
{
  "success": true,
  "overview": {
    "userId": 42,
    "onboarding": {
      "questionnaireCompleted": true,
      "completionPercentage": 100,
      "primaryGoal": "weight_loss",
      "trainingTier": "signature_60",
      "healthRisk": "low"
    },
    "movementScreen": {
      "completed": true,
      "score": 7,
      "lastAssessment": "2026-01-15T10:30:00Z"
    },
    "baseline": {
      "weight": 195,
      "bodyFat": 22,
      "restingHeartRate": 72,
      "lastMeasurement": "2026-01-15T10:30:00Z"
    },
    "nutrition": {
      "activePlan": "Weight Loss Macros - Week 1",
      "dailyCalories": 2000,
      "compliance": 85
    },
    "progress": {
      "totalPhotos": 4,
      "lastPhoto": "2026-01-10T08:00:00Z",
      "weightChange": -5,
      "startDate": "2026-01-01"
    },
    "notes": {
      "totalNotes": 3,
      "redFlags": 0,
      "achievements": 2,
      "lastNote": "2026-01-14T16:00:00Z"
    }
  }
}
```

### Phase 1.2: Admin Data Entry Interfaces (CRITICAL PROTOCOL)

**REQUIREMENT:** For EVERY feature that displays data, create an admin UI to populate that data.

#### Admin Page 1: Onboarding Management
**File:** `frontend/src/pages/admin/OnboardingManagement.tsx`

**Features:**
- **Table view** of all client questionnaires (filterable by status, completion %, health risk)
- **Create button** → Opens 85-question form wizard (13 sections)
- **Edit button** → Modify existing questionnaire responses
- **Export button** → Download CSV of all questionnaire responses
- **Bulk import button** → Upload CSV to create multiple questionnaires

**Form Wizard Structure:**
```typescript
const questionnaireWizard = [
  {
    section: 'demographics',
    title: 'Section 1: Demographics',
    questions: [
      { id: 'age', type: 'number', label: 'Age', required: true },
      { id: 'gender', type: 'select', label: 'Gender', options: ['male', 'female', 'other', 'prefer_not_to_say'] },
      { id: 'occupation', type: 'text', label: 'Occupation' },
      // ... 5 more questions
    ]
  },
  {
    section: 'goals',
    title: 'Section 2: Goals & Motivation',
    questions: [
      { id: 'primary_goal', type: 'select', label: 'Primary Goal', options: ['weight_loss', 'muscle_gain', 'performance', 'health'] },
      { id: 'target_weight', type: 'number', label: 'Target Weight (lbs)' },
      { id: 'timeline', type: 'select', label: 'Timeline', options: ['3_months', '6_months', '12_months'] },
      // ... 8 more questions
    ]
  },
  // ... 11 more sections (85 total questions)
];
```

#### Admin Page 2: Movement Screen Interface
**File:** `frontend/src/pages/admin/MovementScreenManager.tsx`

**Features:**
- **Client selector** (dropdown to choose which client to assess)
- **NASM OHSA Assessment Form** (8 kinetic chain checkpoints with none/minor/significant)
- **PAR-Q+ Screening** (7 health questions + medical clearance flag)
- **Postural Assessment** (anterior/lateral/posterior observations)
- **Performance Assessments** (optional cardio/strength/flexibility tests)
- **Auto-calculate NASM score** (0-100 composite + corrective strategy)
- **Movement screen history timeline** (view past assessments)

**OHSA Checkpoints:**
```typescript
const ohsaCheckpoints = {
  anteriorView: [
    { id: 'feetTurnout', label: 'Feet Turn Out' },
    { id: 'feetFlattening', label: 'Feet Flattening' },
    { id: 'kneeValgus', label: 'Knee Valgus' },
    { id: 'kneeVarus', label: 'Knee Varus' }
  ],
  lateralView: [
    { id: 'excessiveForwardLean', label: 'Excessive Forward Lean' },
    { id: 'lowBackArch', label: 'Low Back Arch' },
    { id: 'armsFallForward', label: 'Arms Fall Forward' },
    { id: 'forwardHead', label: 'Forward Head' }
  ],
  additional: [
    { id: 'asymmetricWeightShift', label: 'Asymmetric Weight Shift' }
  ]
};
```

#### Admin Page 3: Baseline Measurements Entry
**File:** `frontend/src/pages/admin/BaselineMeasurementsEntry.tsx`

**Features:**
- **Vitals section** (resting heart rate, blood pressure)
- **Strength assessment** (bench press weight/reps, pull-ups reps, etc.)
- **NASM assessment data** (view OHSA + PAR-Q+ results)
- **Injury notes** (text area)
- **Pain level** (0-10 slider)

### Phase 1.3: Blueprint/Wireframe Updates (REQUIRED BEFORE CODING)

#### Document 1: ONBOARDING-FLOW.mermaid.md
**File:** `docs/ai-workflow/ONBOARDING-FLOW.mermaid.md`

**Contents:**
1. **User Journey Diagram** (Landing → Questionnaire → Movement Screen → Dashboard)
2. **API Sequence Diagram** for each endpoint
3. **Database ERD** showing relationships (User → ClientOnboardingQuestionnaire → ClientBaselineMeasurements)
4. **RBAC Matrix** (who can create/read/update/delete questionnaires)

#### Document 2: ONBOARDING-WIREFRAMES.md
**File:** `docs/ai-workflow/ONBOARDING-WIREFRAMES.md`

**Contents:**
1. **85-Question Questionnaire UI** (multi-step wizard, progress bar, section completion badges)
2. **Movement Screen Assessment UI** (video demonstrations, scoring interface)
3. **Onboarding Progress Component** (completion %, "Complete Your Profile" CTA)
4. **Admin Onboarding Management Interface** (table, filters, create/edit modals)

#### Document 3: Update ADMIN-DASHBOARD-ARCHITECTURE.mermaid.md
**File:** `docs/ai-workflow/ADMIN-DASHBOARD-ARCHITECTURE.mermaid.md`

**Add:**
- Onboarding management endpoints
- Data entry flow diagrams
- Admin permission requirements

### Phase 1.4: Dashboard Integration

#### Task: Wire RevolutionaryClientDashboard.tsx to Real APIs
**File:** `frontend/src/components/ClientDashboard/RevolutionaryClientDashboard.tsx`

**Current State:** Using mock data
**Target State:** Fetch from GET /api/client-data/overview/:userId

**Implementation:**
```typescript
// Create React Query hook
// File: frontend/src/hooks/useClientData.ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useClientData = (userId: number) => {
  return useQuery({
    queryKey: ['clientData', userId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/client-data/overview/${userId}`);
      return data.overview;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Update dashboard component
// File: frontend/src/components/ClientDashboard/RevolutionaryClientDashboard.tsx
import { useClientData } from '../../hooks/useClientData';

export const RevolutionaryClientDashboard: React.FC = () => {
  const userId = useAuthStore(state => state.user?.id);
  const { data: clientData, isLoading, isError } = useClientData(userId);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage message="Failed to load client data" />;
  if (!clientData) return <EmptyState message="No data available yet. Complete your onboarding to get started!" />;

  return (
    <DashboardContainer>
      <OnboardingProgress
        completionPercentage={clientData.onboarding.completionPercentage}
        primaryGoal={clientData.onboarding.primaryGoal}
      />
      <MovementScreenScore score={clientData.movementScreen.score} />
      <BaselineMetrics baseline={clientData.baseline} />
      <NutritionOverview nutrition={clientData.nutrition} />
      <ProgressPhotos progress={clientData.progress} />
      <TrainerNotes notes={clientData.notes} />
    </DashboardContainer>
  );
};
```

### Phase 1 Acceptance Criteria
- [ ] All 4 onboarding endpoints implemented and tested (POST/GET questionnaire, POST movement screen, GET overview)
- [ ] Admin can create/edit questionnaires via Onboarding Management page (zero hardcoding)
- [ ] Admin can create movement screens via Movement Screen Manager
- [ ] Admin can enter baseline measurements via Baseline Entry form
- [ ] RevolutionaryClientDashboard.tsx fetches real data (no mock data)
- [ ] Onboarding progress component displays completion percentage
- [ ] All blueprints/wireframes created BEFORE implementation
- [ ] RBAC enforced (admin/trainer/client permissions)
- [ ] Click-through test passes (questionnaire → movement screen → dashboard)

---

## 📋 PHASE 2: DASHBOARD STREAMLINING (5-7 DAYS)

**Priority:** 🟡 HIGH
**Status:** ⏸️ PAUSED (waiting for Phase 0-1)
**Dependencies:** Phase 0-1 complete

### Overview
Consolidate 7 duplicate client dashboard layouts into 1 canonical dashboard ([RevolutionaryClientDashboard.tsx](../../../frontend/src/components/ClientDashboard/RevolutionaryClientDashboard.tsx)). Fix all broken tabs (Workouts, Nutrition, Progress, Photos, Notes) by wiring to real API endpoints.

### Phase 2.1: Dashboard Consolidation

#### Task: Archive Duplicate Dashboards
**Action:** Move these files to `frontend/src/components/ClientDashboard/archived/`

1. `ClientDashboardLayout.tsx`
2. `ClientDashboard.V2.tsx`
3. `ClientDashboard.V3.tsx`
4. `ClientDashboardSimplified.tsx`
5. `ClientDashboardEnhanced.tsx`
6. `ClientDashboardLegacy.tsx`
7. `ClientDashboardPrototype.tsx`

**Command:**
```bash
cd frontend/src/components/ClientDashboard
mkdir -p archived
mv ClientDashboardLayout.tsx ClientDashboard.V2.tsx ClientDashboard.V3.tsx ClientDashboardSimplified.tsx ClientDashboardEnhanced.tsx ClientDashboardLegacy.tsx ClientDashboardPrototype.tsx archived/
```

#### Task: Update All Routes
**Files to check:**
- `frontend/src/App.tsx` (main routing)
- `frontend/src/config/dashboard-tabs.ts` (tab configuration)

**Search for imports:**
```bash
cd frontend/src
grep -r "ClientDashboardLayout\|ClientDashboard\.V2\|ClientDashboard\.V3" --include="*.tsx" --include="*.ts"
```

**Replace all imports with:**
```typescript
import { RevolutionaryClientDashboard } from '../components/ClientDashboard/RevolutionaryClientDashboard';
```

### Phase 2.2: Fix Broken Tabs

Each tab must be wired to a real API endpoint with proper error handling.

#### Tab 1: Workouts
**Endpoint:** `GET /api/workouts/:userId/current`

**Controller:** `backend/controllers/workoutController.mjs`

**Response:**
```json
{
  "success": true,
  "currentWorkout": {
    "id": 5,
    "userId": 42,
    "title": "Hypertrophy Phase - Week 3",
    "weekNumber": 3,
    "days": [
      {
        "dayNumber": 1,
        "dayName": "Push Day",
        "exercises": [
          {
            "exerciseName": "Barbell Bench Press",
            "sets": 4,
            "reps": 8,
            "weight": 185,
            "restSeconds": 120,
            "notes": "Focus on controlled eccentric"
          },
          // ... more exercises
        ]
      },
      // ... more days
    ]
  }
}
```

**Admin UI:** Admin Workout Plan Builder
- **File:** `frontend/src/pages/admin/WorkoutPlanBuilder.tsx`
- **Features:**
  - Client selector (dropdown)
  - Workout plan template library (pre-built plans: Hypertrophy, Strength, Fat Loss, Endurance)
  - Drag-drop exercise selector (from video library)
  - Sets/reps/weight/rest configuration
  - Week progression builder (increase weight/reps over weeks)
  - Assign workout plan to client (saves to database)

#### Tab 2: Nutrition
**Endpoint:** `GET /api/nutrition/:userId/current`

**Controller:** Already exists ([backend/models/ClientNutritionPlan.mjs](../../../backend/models/ClientNutritionPlan.mjs)), create controller

**Admin UI:** Admin Nutrition Plan Builder
- **File:** `frontend/src/pages/admin/NutritionPlanBuilder.tsx`
- **Features:**
  - Macro calculator (TDEE → calorie target → protein/carbs/fat split)
  - Meal library (pre-built meals with macros)
  - Drag-drop meal planner (breakfast/lunch/dinner/snacks)
  - Grocery list auto-generator
  - Assign nutrition plan to client

#### Tab 3: Progress
**Endpoint:** `GET /api/measurements/:userId/timeline`

**Admin UI:** Admin Progress Entry Form
- **File:** `frontend/src/pages/admin/ProgressEntryForm.tsx`
- **Features:**
  - Client selector
  - Weight entry (with graph showing trend)
  - Body measurements (chest, waist, hips, arms, legs)
  - Body fat % (manual entry or calculated from measurements)
  - Progress notes

#### Tab 4: Photos
**Endpoint:** `GET /api/photos/:userId`

**Admin UI:** Admin Photo Upload Interface
- **File:** `frontend/src/pages/admin/PhotoUploadManager.tsx`
- **Features:**
  - Client selector
  - Multi-photo upload (front, side, back)
  - Photo tagging (before/after, week number)
  - Photo gallery (timeline view)
  - Privacy settings (public, private, trainer_only)

#### Tab 5: Notes
**Endpoint:** `GET /api/notes/:userId`

**Admin UI:** Admin Notes Manager
- **File:** `frontend/src/pages/admin/NotesManager.tsx`
- **Features:**
  - Client selector
  - Note type selector (observation, red_flag, achievement, concern, general)
  - Severity selector (low, medium, high, critical)
  - Text editor (rich text with formatting)
  - Session linkage (link note to specific session)
  - Follow-up date picker
  - Notes timeline view

### Phase 2.3: Blueprint/Wireframe Updates

#### Document: DASHBOARD-TABS-FLOW.mermaid.md
**File:** `docs/ai-workflow/DASHBOARD-TABS-FLOW.mermaid.md`

**Contents:**
1. **Click flow diagram** for each tab (what happens when clicked)
2. **API call sequence** triggered per tab
3. **Loading states** (skeleton loaders, spinners)
4. **Error handling** (retry buttons, error messages)
5. **Empty states** (no data yet messages with CTAs)

### Phase 2 Acceptance Criteria
- [ ] Only 1 client dashboard in use (RevolutionaryClientDashboard.tsx)
- [ ] All 7 duplicate dashboards archived
- [ ] All 5 tabs functional (Workouts, Nutrition, Progress, Photos, Notes)
- [ ] Each tab wired to real API endpoint
- [ ] Admin can populate data for each tab via admin pages
- [ ] Click-through test passes for all tabs
- [ ] Blueprints updated with tab flow diagrams

---

## 📋 PHASE 3: MOCK DATA ELIMINATION (3-4 DAYS)

**Priority:** 🟡 MEDIUM
**Status:** ⏸️ PAUSED (waiting for Phase 0-2)
**Dependencies:** Phase 0-2 complete

### Overview
Replace ALL hardcoded/mock data with database-backed APIs. Create admin UIs for populating every data type.

### Phase 3.1: Create React Query Hooks

**File:** `frontend/src/hooks/client-data/index.ts`

```typescript
export { useClientData } from './useClientData';
export { useOnboardingQuestionnaire } from './useOnboardingQuestionnaire';
export { useBaselineMeasurements } from './useBaselineMeasurements';
export { useNutritionPlan } from './useNutritionPlan';
export { useClientPhotos } from './useClientPhotos';
export { useClientNotes } from './useClientNotes';
export { useWorkoutPlan } from './useWorkoutPlan';
export { useTrainerStats } from './useTrainerStats';
export { useAdminMetrics } from './useAdminMetrics';
export { useNotifications } from './useNotifications';
export { useBadges } from './useBadges';
```

### Phase 3.2: Replace Mock Data in 30+ Components

**Identified components using mock data:**

1. **TrainerStellarSections.tsx** → Replace with `useTrainerStats(trainerId)`
2. **AdminStellarSidebar.tsx** → Replace with `useAdminMetrics()`
3. **NotificationsSection.tsx** → Replace with `useNotifications(userId)`
4. **ClientTrainerAssignments.tsx** → Replace with `useAssignments()`
5. **TrainerPermissionsManager.tsx** → Replace with `usePermissions()`
6. **AdminBadgesManagement.tsx** → Replace with `useBadges()`
7. **WorkoutDataEntry.tsx** → Replace with `useWorkoutPlan(userId)`
8. **SecurityMonitoringPanel.tsx** → Replace with `useSecurityLogs()`
9. **FeaturesSection.V2.tsx** → Replace with `useFeatureFlags()`
10. **SocialProfileSection.tsx** → Replace with `useSocialProfile(userId)`
11. **EnhancedMessagingSection.tsx** → Replace with `useMessages(userId)`
12. *(20+ more components)*

**Action for EACH component:**
1. Create backend API endpoint if doesn't exist
2. Create React Query hook for data fetching
3. Replace mock data with `const { data, isLoading, isError } = useHookName()`
4. Add loading state component
5. Add error state component
6. Add empty state component
7. **Create admin UI to populate that data** (CRITICAL)

### Phase 3.3: Admin Data Entry Interfaces

**For EACH component with mock data, create corresponding admin UI.**

#### Admin UI 1: Trainer Stats Manager
**File:** `frontend/src/pages/admin/TrainerStatsManager.tsx`

**Features:**
- Auto-calculated metrics (total clients, active sessions, revenue from orders table)
- Manual override fields (bonus revenue, external sessions)
- Stats history (graph showing metrics over time)

#### Admin UI 2: Notifications Manager
**File:** `frontend/src/pages/admin/NotificationsManager.tsx`

**Features:**
- Create notification (individual or broadcast)
- Edit notification
- Delete notification
- Notification templates library (pre-written messages)
- Scheduling (send now or schedule for later)

#### Admin UI 3: Badges Manager
**File:** `frontend/src/pages/admin/BadgesManager.tsx`

**Features:**
- Create badge (name, icon, criteria)
- Assign badge to user
- Badge achievement tracking
- Badge library (pre-built badges: "First Workout", "10 Sessions", "Weight Loss Champion")

#### Admin UI 4: Feature Flags Manager
**File:** `frontend/src/pages/admin/FeatureFlagsManager.tsx`

**Features:**
- Toggle features on/off per environment (dev, staging, prod)
- Per-user feature flags (beta testing)
- Feature flag audit log (who enabled/disabled what and when)

#### Admin UI 5: Messaging Interface
**File:** `frontend/src/pages/admin/MessagingInterface.tsx`

**Features:**
- Send message to user
- View message history (chat-style interface)
- Message templates (pre-written common messages)
- Bulk messaging tool (send to multiple users)

### Phase 3.4: Blueprint/Wireframe Updates

#### Document 1: MOCK-DATA-ELIMINATION-PLAN.md
**File:** `docs/ai-workflow/MOCK-DATA-ELIMINATION-PLAN.md`

**Contents:**
1. **Full list of 30+ components** with mock data
2. **Replacement API endpoint** for each
3. **Admin UI design** for each data type
4. **Testing checklist** (verify no mock data remains)

#### Document 2: ADMIN-DATA-ENTRY-MASTER.mermaid.md
**File:** `docs/ai-workflow/ADMIN-DATA-ENTRY-MASTER.mermaid.md`

**Contents:**
1. **Flow diagram** showing how admin populates each data type
2. **Permission matrix** (what admin roles can edit what)
3. **Data validation rules**
4. **Audit logging requirements**

### Phase 3 Acceptance Criteria
- [ ] Zero components using mock/hardcoded data
- [ ] All data fetched from database via React Query hooks
- [ ] Admin can populate 100% of application data via dashboard
- [ ] Loading, error, and empty states implemented for all data fetches
- [ ] Blueprints document admin data entry flow for each feature
- [ ] Grep search for "mock" returns zero results in component files

---

## 📋 PHASE 4: AUTOMATION & FOLLOW-UP SYSTEM (2-3 DAYS)

**Priority:** 🟢 MEDIUM
**Status:** ⏸️ PAUSED (waiting for Phase 0-3)
**Dependencies:** Phase 0-3 complete

### Overview
Implement Twilio SMS integration for automated client follow-up sequences (Day 0-7).

### Phase 4.1: Twilio SMS Integration

#### Task: Install Twilio SDK
```bash
cd backend
npm install twilio
```

#### Task: Create SMS Service
**File:** `backend/services/smsService.mjs`

```javascript
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function sendSMS(toNumber, message) {
  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber
    });

    console.log(`✅ SMS sent to ${toNumber}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error(`❌ SMS failed to ${toNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Template system
export function renderTemplate(template, variables) {
  let message = template;
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return message;
}

export const templates = {
  welcome: "Welcome to SwanStudios, {clientName}! Your transformation begins now. Here's your pricing sheet: {pricingSheetUrl}",
  firstWorkoutCheckIn: "How did your first workout feel, {clientName}? Reply with a number 1-10 or any feedback!",
  nutritionTip: "Pro tip: Hydration is key! Aim for 0.5-1oz per lb of bodyweight daily. Need help with nutrition? Reply YES.",
  transformationPackOffer: "You've crushed your first week, {clientName}! Ready to commit to your full transformation? Book your Transformation Pack now: {bookingUrl}"
};
```

### Phase 4.2: Follow-Up Automation Sequences

#### Sequence 1: Day 0 Welcome Message
**Trigger:** New client created (User.role = 'client' AND createdAt = today)

**Implementation:**
```javascript
// backend/services/automationService.mjs
import { sendSMS, renderTemplate, templates } from './smsService.mjs';
import { User } from '../models/associations.mjs';

export async function sendWelcomeMessage(userId) {
  const user = await User.findByPk(userId);
  if (!user || !user.phone) return;

  const message = renderTemplate(templates.welcome, {
    clientName: user.firstName,
    pricingSheetUrl: 'https://swanstudios.com/pricing'
  });

  await sendSMS(user.phone, message);
}
```

#### Sequence 2-4: Day 1, 3, 7 Follow-Ups
Similar implementation for each sequence (see [CURRENT-TASK.md:396-411](CURRENT-TASK.md#L396-L411) for full details).

### Phase 4.3: Admin Automation Manager

**File:** `frontend/src/pages/admin/AutomationManager.tsx`

**Features:**
- View all active sequences
- Create new sequence (triggers + messages)
- Edit sequence templates
- Pause/resume sequences per client
- SMS delivery logs and analytics

### Phase 4.4: Blueprint/Wireframe Updates

**File:** `docs/ai-workflow/AUTOMATION-FLOW.mermaid.md`

**Contents:**
1. Trigger → Action → Notification flow diagrams
2. SMS sequence timeline visualization
3. Database schema for automation rules
4. Twilio API integration architecture

### Phase 4 Acceptance Criteria
- [ ] Twilio integrated and sending test SMS successfully
- [ ] Day 0-7 sequences automated (trigger on events)
- [ ] Admin can create/edit SMS sequences via dashboard
- [ ] SMS delivery logs tracked in database
- [ ] Opt-out mechanism implemented (TCPA compliance)
- [ ] Blueprints document automation architecture

---

## 📋 PHASE 5: CLIENT MATERIALS & LAUNCH READINESS (1 DAY)

**Priority:** 🟢 LOW
**Status:** ⏸️ PAUSED (waiting for Phase 0-4)
**Dependencies:** Phase 0-4 complete

### Phase 5.1: Pricing Sheet

**File:** `docs/client-materials/SWANSTUDIOS-PRICING-SHEET.md`

**Contents:**
1. **Pricing table** (Express 30, Signature 60 Standard/AI, Transformation Pack)
2. **What's included** in each package
3. **AI Data Package benefits** (85-question assessment, movement screen, progress tracking)
4. **Transformation Pack savings** ($200 discount vs individual sessions)

### Phase 5.2: Fairmont Parent Onboarding Script

**File:** `docs/client-materials/FAIRMONT-PARENT-ONBOARDING-SCRIPT.md`

**Contents:**
1. **Initial contact template**
2. **10-minute movement screen pitch**
3. **Scheduling link** for free assessment
4. **Objection handling decision tree**

### Phase 5.3: Storefront CSS Update

**Task:** Update PackageSection.V2.tsx with corrected pricing

**File:** `frontend/src/pages/HomePage/components/PackageSection.V2.tsx`

**Changes:**
- Line 290: Express 30 → $110/session (add "30-Min High Intensity" descriptor)
- Line 298: Signature 60 → $175/session (Standard) or $200/session (AI Data Package)
- Line 306: Transformation Pack → $1,600/10 sessions

### Phase 5.4: UI/UX Flow Validation

**CRITICAL: Click-through testing for ALL features**

#### Test Journey 1: User Flow
1. Click "View Options" on pricing card → navigates to /shop ✅
2. Purchase package → creates order → redirects to onboarding ✅
3. Complete questionnaire → saves to database → shows completion % ✅
4. View dashboard → all tabs functional → data loads correctly ✅

#### Test Journey 2: Admin Flow
1. Admin login → navigates to admin dashboard ✅
2. Create client questionnaire → saves to database ✅
3. Enter movement screen → displays score ✅
4. View client dashboard → shows populated data ✅

### Phase 5 Acceptance Criteria
- [ ] Pricing sheet created (PDF + web page)
- [ ] Fairmont parent script documented
- [ ] PackageSection.V2.tsx updated with correct pricing
- [ ] UI flow click-through test passes end-to-end
- [ ] Zero broken links or non-functional buttons
- [ ] Mobile responsive design verified

---

## 📊 PROGRESS TRACKING

Update [CURRENT-TASK.md:512-523](CURRENT-TASK.md#L512-L523) after completing each phase.

| Phase | Status | Timeline | Completion Date |
|-------|--------|----------|-----------------|
| **Phase 0** | 🔴 NOT STARTED | 2 hours | ___________ |
| **Phase 1** | ⏸️ PAUSED | 3-5 days | ___________ |
| **Phase 2** | ⏸️ PAUSED | 5-7 days | ___________ |
| **Phase 3** | ⏸️ PAUSED | 3-4 days | ___________ |
| **Phase 4** | ⏸️ PAUSED | 2-3 days | ___________ |
| **Phase 5** | ⏸️ PAUSED | 1 day | ___________ |

**Total Timeline:** 14-22 business days

---

## 📝 CRITICAL PROTOCOLS

### Documentation-First Enforcement
**BEFORE implementing ANY feature:**
1. ✅ Update or create Blueprint/Wireframe/Mermaid diagram
2. ✅ Document API endpoints (request/response schemas)
3. ✅ Document database schema changes
4. ✅ Document RBAC permissions
5. ✅ Get user approval on design
6. ✅ THEN write code

### Admin Data Entry Protocol
**FOR every feature that uses data:**
1. ✅ Create backend API endpoint
2. ✅ Create React Query hook for frontend
3. ✅ **Create admin UI to populate that data** (CRITICAL)
4. ✅ Document admin flow in blueprints
5. ✅ Test admin can create/edit data via dashboard
6. ✅ Verify zero hardcoded/mock data remains

### UI/UX Flow Validation Protocol
**AFTER implementing each feature:**
1. ✅ Click-through test (does button/link work?)
2. ✅ Data persistence test (does data save to database?)
3. ✅ Loading state test (spinner shows while fetching?)
4. ✅ Error state test (error message displays on failure?)
5. ✅ Empty state test (helpful message when no data?)
6. ✅ Mobile responsive test (works on phone/tablet?)

---

## 🚀 NEXT IMMEDIATE ACTIONS

1. **START PHASE 0.1:** Install OpenAI SDK (`npm install openai`)
2. **PHASE 0.2:** Run migrations (`npm run migrate`)
3. **PHASE 0.3:** Verify all 5 tables exist in database
4. **PHASE 0.4:** Test model associations
5. **PHASE 0.5:** Create seed data
6. **Mark Phase 0 COMPLETE** in [CURRENT-TASK.md](CURRENT-TASK.md)
7. **Begin Phase 1.1:** Create POST /api/onboarding/:userId/questionnaire

---

## 📚 REFERENCE DOCUMENTS

- **Master Plan:** [CURRENT-TASK.md](CURRENT-TASK.md)
- **AI Handbook:** [SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md](../../../AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md) (Section 9.8)
- **Client Data Integration:** [CLIENT-DATA-INTEGRATION-REFACTORED-PROMPT.md](../CLIENT-DATA-INTEGRATION-REFACTORED-PROMPT.md)

---

**END OF DIRECTIVE**
