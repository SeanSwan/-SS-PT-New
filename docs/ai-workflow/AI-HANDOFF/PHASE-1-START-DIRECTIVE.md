# PHASE 1 START DIRECTIVE
## ChatGPT-5 Implementation Instructions

**Issued By:** User + Claude Code
**Issued To:** ChatGPT-5 (Codex)
**Date:** 2026-01-15
**Status:** 🟢 APPROVED TO START

---

## ✅ PHASE 0 COMPLETION CONFIRMED

All dependencies met:
- ✅ OpenAI SDK installed
- ✅ Database migrations executed (5 client_* tables exist)
- ✅ Model associations tested and working
- ✅ Seed data created (User ID 7)
- ✅ AI Workout Controller validated

**User Approval:** "next phase please approved"

---

## 🎯 PHASE 1 IMPLEMENTATION PLAN

### Overview
**Phase:** Client Onboarding Blueprint
**Timeline:** 3-5 days
**Priority:** 🔴 HIGH - Fairmont parent onboarding readiness

### Business Context
**Target Market:** Fairmont parents (time-stressed, high-income, results-focused)

**Pricing Structure (CORRECTED):**
- Express 30: $110/session (30 minutes)
- Signature 60 Standard: $175/session
- Signature 60 AI Data Package: $200/session (includes 85-question assessment)
- Transformation Pack: $1,600/10 sessions ($160/session)

**Key Differentiator:** 10-minute movement screen + AI-powered training plan

---

## 📋 PHASE 1.1: ONBOARDING CONTROLLER ENDPOINTS

### Implementation Order

#### 1. Create Onboarding Controller
**File:** `backend/controllers/onboardingController.mjs`

**Endpoints to Implement:**

##### Endpoint 1: Create Questionnaire Response
**Route:** `POST /api/onboarding/:userId/questionnaire`

**Request Body:**
```json
{
  "questionnaireVersion": "3.0",
  "responses": {
    "section1_personal_info": { /* ... */ },
    "section2_goals": {
      "primary_goal": "weight_loss",
      "preferred_package": "signature_60_ai"
    },
    "section3_health_history": { /* ... */ }
    // ... 13 sections total
  }
}
```

**Implementation Requirements:**
- Auto-extract indexed fields from `responses` object:
  - `primaryGoal` from `section2_goals.primary_goal`
  - `trainingTier` from `section2_goals.preferred_package`
  - `commitmentLevel` from `section2_goals.commitment_level`
  - `healthRisk` from `section3_health_history.chronic_conditions` (calculate based on conditions array length)
  - `nutritionPrefs` from `section5_nutrition.dietary_preferences`
- Set `status` = 'submitted'
- Set `questionnaireVersion` = from request body
- Save full responses object to `responsesJson` JSONB field
- Calculate completion percentage (85 questions total)
- RBAC: Admin = any client, Trainer = assigned clients only, Client = self only

**Response:**
```json
{
  "success": true,
  "questionnaire": {
    "id": 1,
    "userId": 7,
    "status": "submitted",
    "completionPercentage": 100,
    "primaryGoal": "weight_loss",
    "trainingTier": "signature_60_ai",
    "createdAt": "2026-01-15T00:00:00.000Z"
  }
}
```

##### Endpoint 2: Get Questionnaire
**Route:** `GET /api/onboarding/:userId/questionnaire`

**Implementation Requirements:**
- Retrieve most recent questionnaire for userId
- Include all indexed fields
- Include `responsesJson` for full data
- Calculate completion percentage
- RBAC: Admin = any client, Trainer = assigned only, Client = self only

**Response:**
```json
{
  "success": true,
  "questionnaire": {
    "id": 1,
    "userId": 7,
    "questionnaireVersion": "3.0",
    "status": "submitted",
    "completionPercentage": 100,
    "primaryGoal": "weight_loss",
    "trainingTier": "signature_60_ai",
    "commitmentLevel": "high",
    "healthRisk": "low",
    "nutritionPrefs": ["vegetarian"],
    "responsesJson": { /* full 85-question data */ },
    "createdAt": "2026-01-15T00:00:00.000Z"
  }
}
```

##### Endpoint 3: Create Movement Screen
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
  "flexibilityNotes": "Limited hamstring flexibility",
  "injuryNotes": "Previous left knee meniscus tear (2020)",
  "painLevel": 2
}
```

**Implementation Requirements:**
- Save to `client_baseline_measurements` table
- Calculate `nasmAssessmentScore` (0-100) from OHSA compensations
- Generate `correctiveExerciseStrategy` from OHSA
- Link to user via `userId`
- Store OHSA + PAR-Q+ data in JSONB fields
- RBAC: Admin/Trainer only (clients cannot self-assess movement screen)

**Response:**
```json
{
  "success": true,
  "movementScreen": {
    "id": 1,
    "userId": 7,
    "nasmAssessmentScore": 73,
    "parqScreening": { /* ... */ },
    "overheadSquatAssessment": { /* ... */ },
    "posturalAssessment": { /* ... */ },
    "performanceAssessments": { /* ... */ },
    "correctiveExerciseStrategy": { /* ... */ },
    "flexibilityNotes": "Limited hamstring flexibility",
    "injuryNotes": "Previous left knee meniscus tear (2020)",
    "painLevel": 2,
    "createdAt": "2026-01-15T00:00:00.000Z"
  }
}
```

##### Endpoint 4: Client Data Overview
**Route:** `GET /api/client-data/overview/:userId`

**Implementation Requirements:**
- Aggregate data from multiple tables:
  - Onboarding questionnaire status
  - NASM assessment score
  - Latest baseline measurements
  - Current nutrition plan
  - Progress photos count
  - Trainer notes count
- Used by RevolutionaryClientDashboard.tsx
- RBAC: Admin = any client, Trainer = assigned only, Client = self only

**Response:**
```json
{
  "success": true,
  "overview": {
    "userId": 7,
    "onboardingStatus": {
      "completed": true,
      "completionPercentage": 100,
      "primaryGoal": "weight_loss",
      "trainingTier": "signature_60_ai"
    },
    "movementScreen": {
      "completed": true,
      "nasmAssessmentScore": 73,
      "date": "2026-01-15T00:00:00.000Z"
    },
    "baselineMeasurements": {
      "weight": 185,
      "bodyFatPercentage": 22,
      "date": "2026-01-15T00:00:00.000Z"
    },
    "nutritionPlan": {
      "active": true,
      "dailyCalories": 2200,
      "macros": { "protein": 165, "carbs": 220, "fat": 73 }
    },
    "progressPhotos": {
      "count": 0,
      "lastUpload": null
    },
    "trainerNotes": {
      "count": 0,
      "lastNote": null
    }
  }
}
```

#### 2. Create Onboarding Routes
**File:** `backend/routes/onboardingRoutes.mjs`

**Routes to Define:**
```javascript
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import {
  createQuestionnaire,
  getQuestionnaire,
  createMovementScreen,
  getClientDataOverview
} from '../controllers/onboardingController.mjs';

const router = express.Router();

// Client can create own questionnaire, Admin/Trainer can create for assigned clients
router.post(
  '/:userId/questionnaire',
  protect,
  authorize('admin', 'trainer', 'client'),
  createQuestionnaire
);

// Client can view own, Admin/Trainer can view assigned clients
router.get(
  '/:userId/questionnaire',
  protect,
  authorize('admin', 'trainer', 'client'),
  getQuestionnaire
);

// Only Admin/Trainer can create movement screens
router.post(
  '/:userId/movement-screen',
  protect,
  authorize('admin', 'trainer'),
  createMovementScreen
);

export default router;
```

#### 3. Register Routes
**File:** `backend/core/routes.mjs`

Add this line after existing route registrations:
```javascript
import onboardingRoutes from '../routes/onboardingRoutes.mjs';

// ... existing routes ...

app.use('/api/onboarding', onboardingRoutes);
```

#### 4. Create Client Data Routes
**File:** `backend/routes/clientDataRoutes.mjs`

```javascript
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { getClientDataOverview } from '../controllers/onboardingController.mjs';

const router = express.Router();

router.get(
  '/overview/:userId',
  protect,
  authorize('admin', 'trainer', 'client'),
  getClientDataOverview
);

export default router;
```

Register in `backend/core/routes.mjs`:
```javascript
import clientDataRoutes from '../routes/clientDataRoutes.mjs';
app.use('/api/client-data', clientDataRoutes);
```

---

## 🔒 RBAC IMPLEMENTATION

### Permission Matrix

| Endpoint | Admin | Trainer | Client | Notes |
|----------|-------|---------|--------|-------|
| POST /onboarding/:userId/questionnaire | ✅ Any client | ✅ Assigned only | ✅ Self only | Client can self-onboard |
| GET /onboarding/:userId/questionnaire | ✅ Any client | ✅ Assigned only | ✅ Self only | View questionnaire data |
| POST /onboarding/:userId/movement-screen | ✅ Any client | ✅ Any client | ❌ No access | Only trained staff assess |
| GET /client-data/overview/:userId | ✅ Any client | ✅ Assigned only | ✅ Self only | Dashboard summary |

### RBAC Logic Pattern

```javascript
// Inside each controller function
export const createQuestionnaire = async (req, res) => {
  const { userId } = req.params;
  const requesterId = req.user.id;
  const requesterRole = req.user.role;

  // Admin can access any client
  if (requesterRole === 'admin') {
    // Allow
  }
  // Trainer can only access assigned clients
  else if (requesterRole === 'trainer') {
    const assignment = await ClientTrainerAssignment.findOne({
      where: { clientId: userId, trainerId: requesterId, status: 'active' }
    });
    if (!assignment) {
      return res.status(403).json({ message: 'Not assigned to this client' });
    }
  }
  // Client can only access own data
  else if (requesterRole === 'client') {
    if (parseInt(userId) !== requesterId) {
      return res.status(403).json({ message: 'Cannot access another user\'s data' });
    }
  }

  // Proceed with operation...
};
```

---

## 📝 DOCUMENTATION REQUIREMENTS

### Before Writing Code

**CRITICAL:** You MUST create/update these documentation files BEFORE implementing:

#### 1. Create ONBOARDING-FLOW.mermaid.md
**Location:** `docs/ai-workflow/blueprints/ONBOARDING-FLOW.mermaid.md`

**Required Content:**
- User journey diagram: Landing → Questionnaire → Movement Screen → Dashboard
- API sequence diagrams for each endpoint (client, request, server, database)
- Database ERD showing relationships between User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements
- RBAC permission matrix (visual diagram)

#### 2. Create ONBOARDING-WIREFRAMES.md
**Location:** `docs/ai-workflow/blueprints/ONBOARDING-WIREFRAMES.md`

**Required Content:**
- 85-question questionnaire UI mockup (multi-step wizard, 13 sections)
- Movement screen assessment UI (video instructions + scoring form)
- Onboarding progress component (completion percentage bar)
- Admin onboarding management interface (table view + create/edit forms)

#### 3. Update ADMIN-DASHBOARD-ARCHITECTURE.mermaid.md
**Location:** `docs/ai-workflow/ADMIN-DASHBOARD-ARCHITECTURE.mermaid.md`

**Add:**
- Onboarding management endpoints to architecture diagram
- Admin data entry flow for questionnaires and movement screens
- Permission requirements for admin onboarding features

---

## 🧪 TESTING REQUIREMENTS

### After Implementation

Create test script: `backend/test-onboarding-endpoints.mjs`

**Test Cases:**
1. ✅ POST /api/onboarding/:userId/questionnaire (valid data, returns 201)
2. ✅ GET /api/onboarding/:userId/questionnaire (returns questionnaire with indexed fields)
3. ✅ POST /api/onboarding/:userId/movement-screen (admin/trainer only, returns 201)
4. ✅ GET /api/client-data/overview/:userId (aggregates data from 5 tables)
5. ✅ RBAC: Client cannot create questionnaire for another user (403)
6. ✅ RBAC: Client cannot create movement screen (403)
7. ✅ RBAC: Trainer can only access assigned clients (403 for unassigned)
8. ✅ RBAC: Admin can access any client (200)

**Test Script Pattern:**
```javascript
import getModels from './models/associations.mjs';

async function testOnboardingEndpoints() {
  const { User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements } = await getModels();

  console.log('🧪 Testing Onboarding Endpoints...\n');

  // Test 1: Create questionnaire
  const questionnaire = await ClientOnboardingQuestionnaire.create({
    userId: 7,
    questionnaireVersion: '3.0',
    status: 'submitted',
    responsesJson: { /* test data */ },
    primaryGoal: 'weight_loss',
    trainingTier: 'signature_60_ai'
  });

  console.log('✅ Test 1: Questionnaire created:', questionnaire.id);

  // ... more tests
}

testOnboardingEndpoints();
```

---

## ✅ ACCEPTANCE CRITERIA

Before marking Phase 1.1 as complete, verify:

- [ ] All 4 endpoints implemented and functional
- [ ] RBAC enforced on all endpoints (admin/trainer/client permissions)
- [ ] Questionnaire auto-extracts indexed fields from responsesJson
- [ ] Movement screen calculates score from ROM data
- [ ] Client data overview aggregates from multiple tables
- [ ] All endpoints return proper error messages (400, 403, 404, 500)
- [ ] Documentation created BEFORE code (ONBOARDING-FLOW.mermaid.md, ONBOARDING-WIREFRAMES.md)
- [ ] Test script created and all tests pass
- [ ] Routes registered in backend/core/routes.mjs
- [ ] No hardcoded data (all from database)

---

## 📚 REFERENCE FILES

**Model Files (Already Created by You):**
- `backend/models/ClientOnboardingQuestionnaire.mjs` ✅
- `backend/models/ClientBaselineMeasurements.mjs` ✅
- `backend/models/ClientNutritionPlan.mjs` ✅
- `backend/models/associations.mjs` ✅ (updated with 5 new associations)

**Database Tables (Already Migrated):**
- `client_onboarding_questionnaires` ✅
- `client_baseline_measurements` ✅
- `client_nutrition_plans` ✅
- `client_photos` ✅
- `client_notes` ✅

**Master Plan Reference:**
- `docs/ai-workflow/AI-HANDOFF/CHATGPT-IMPLEMENTATION-DIRECTIVE.md` (lines 99-128)
- `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md` (lines 99-128)
- `AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md` (Section 9.8)

---

## 🚀 START IMPLEMENTATION

**Next Action:** Begin by creating the documentation files (ONBOARDING-FLOW.mermaid.md, ONBOARDING-WIREFRAMES.md) BEFORE writing any controller/route code.

**Estimated Timeline:**
- Documentation: 2-3 hours
- Implementation: 4-6 hours
- Testing: 1-2 hours
- **Total:** 7-11 hours (Day 1 of Phase 1)

**Status:** 🟢 APPROVED TO PROCEED

---

**END OF PHASE 1 START DIRECTIVE**
