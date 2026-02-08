# CURRENT TASK - SINGLE SOURCE OF TRUTH

**Last Updated:** 2026-02-08
**Updated By:** Claude Code (Opus 4.6)

---

## ACTIVE PRIORITY: UI/UX REDESIGN WORKFLOW

**Current Phase:** PHASE 0 - BASELINE CAPTURE (NOT YET STARTED)
**Status:** PLANNING COMPLETE - Ready to Execute
**Goal:** Full UI/UX redesign following the 5-Concept Technique with enterprise-grade QA

### MANDATORY READING (Before ANY UI Work)
1. **Master Redesign Prompt:** `docs/ai-workflow/SWANSTUDIOS-UI-REDESIGN-MASTER-PROMPT.md`
2. **AI Review Team Prompt:** `docs/ai-workflow/AI-REVIEW-TEAM-PROMPT.md`
3. **Project Intelligence:** `CLAUDE.md` (project root)

### Redesign Phases
| Phase | Name | Status |
|-------|------|--------|
| 0 | Baseline Capture (screenshots + Lighthouse) | NOT STARTED |
| 1 | 5 Concept Designs (owner picks 2) | NOT STARTED |
| 2 | Design System Extraction (tokens + primitives) | NOT STARTED |
| 3 | Page-by-Page Rollout (feature-flagged) | NOT STARTED |
| 4 | QA + Launch (KPIs green, 0 Critical/High) | NOT STARTED |

### Tools & Skills
- **Playwright MCP** - Browser automation for visual QA (configured in `.claude/mcp.json`)
- **frontend-design skill** - Anthropic's design guidance (avoid AI slop)
- **ui-ux-pro-max skill** - 67 styles, 96 palettes, 57 font pairings

### Key Constraints
- Galaxy-Swan identity preserved (dark cosmic, cyan accents)
- 10 breakpoints: 320px through 3840px (4K) - see master prompt for exact values
- Monetization flows sacred (0.1% investigate / 0.5% fail component-level diff)
- Runtime feature flag: `useNewTheme` via `/api/feature-flags` (build-time: `VITE_USE_NEW_THEME`)
- Concept routes: `VITE_DESIGN_PLAYGROUND=true` only

---

## CRITICAL PRIORITY: UNIVERSAL MASTER SCHEDULE SYSTEM

**Current Phase:** PHASE 0 COMPLETE (BACKEND)
**Status:** COMPLETE ✅
**Goal:** Replace disparate calendars with a single, MindBody-equivalent Universal Schedule.

### Decisions
1. Replace ALL existing schedule components once UniversalSchedule is ready.
2. Notification channels: Email, SMS, Push.
3. Implementation order: Backend and frontend in parallel.
4. Recurring limit: Max 52 occurrences or 12 months, whichever comes first.

### Phase 0 Completed (Backend)
1.  Migration applied (universal schedule fields).
2.  Recurring sessions with 52-cap + 12-month cap enforced.
3.  Blocked time slots implemented.
4.  Notification preferences + quiet hours implemented.
5.  Smoke tests passed (COUNT=53, COUNT=3, block, quiet hours).

### Next Steps (Phase 1: UI)
1.  Build `UniversalSchedule.tsx` + supporting components (Calendar, Modal, Recurrence UI).
2.  Replace `AdminScheduleTab`, `TrainerScheduleTab`, `ClientScheduleTab` with UniversalSchedule.
3.  Add Phase 1 wireframes + UI flow review before frontend implementation.

### Locked Files
- backend/services/adminSpecial.test.mjs - Locked by ChatGPT-5 - Phase 6 Step 14 tests
- frontend/src/pages/shop/components/SpecialBadge.test.tsx - Locked by ChatGPT-5 - Phase 6 Step 14 tests
- frontend/src/pages/shop/components/PackageCard.test.tsx - Locked by ChatGPT-5 - Phase 6 Step 14 tests
- docs/ai-workflow/blueprints/STORE-PACKAGE-PHASE-6-REDESIGN.md - Locked by ChatGPT-5 - Phase 6 blueprint creation
- backend/migrations/20260201000003-restructure-packages.cjs - Locked by ChatGPT-5 - Phase 6 Step 1 migration
- backend/migrations/20260201000004-create-admin-specials.cjs - Locked by ChatGPT-5 - Phase 6 Step 3 migration
- backend/models/AdminSpecial.mjs - Locked by ChatGPT-5 - Phase 6 Step 4 model
- backend/models/associations.mjs - Locked by ChatGPT-5 - Phase 6 Step 4 associations
- backend/models/index.mjs - Locked by ChatGPT-5 - Phase 6 Step 4 model export
- backend/controllers/adminSpecialController.mjs - Locked by ChatGPT-5 - Phase 6 Step 5 controller
- backend/routes/adminSpecialRoutes.mjs - Locked by ChatGPT-5 - Phase 6 Step 5 routes
- backend/core/routes.mjs - Locked by ChatGPT-5 - Phase 6 Step 5 route registration
- backend/routes/storeFrontRoutes.mjs - Locked by ChatGPT-5 - Phase 6 Step 6 storefront specials response
- frontend/src/pages/shop/components/PackagesGrid.tsx - Locked by ChatGPT-5 - Phase 6 Step 7 remove custom builder
- frontend/src/pages/shop/OptimizedGalaxyStoreFront.tsx - Locked by ChatGPT-5 - Phase 6 Step 7 remove custom package types
- frontend/src/components/ShoppingCart/ShoppingCart.tsx - Locked by ChatGPT-5 - Phase 6 Step 7 remove custom cart items
- frontend/src/pages/shop/components/SpecialBadge.tsx - Locked by ChatGPT-5 - Phase 6 Step 8 special badge component
- frontend/src/pages/shop/components/__tests__/CustomPackageFlow.e2e.test.tsx - Locked by ChatGPT-5 - Phase 6 Step 7 cleanup
- frontend/src/pages/shop/components/PackageCard.tsx - Locked by ChatGPT-5 - Phase 6 Step 9 specials display
- frontend/src/components/DashBoard/Pages/admin-specials/AdminSpecialsManager.tsx - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials UI
- frontend/src/components/DashBoard/Pages/admin-specials/AdminSpecialsTable.tsx - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials UI
- frontend/src/components/DashBoard/Pages/admin-specials/AdminSpecialsModal.tsx - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials UI
- frontend/src/components/DashBoard/Pages/admin-specials/adminSpecials.styles.ts - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials UI
- frontend/src/components/DashBoard/Pages/admin-specials/adminSpecials.types.ts - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials UI
- frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials route
- frontend/src/config/dashboard-tabs.ts - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials nav
- frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx - Locked by ChatGPT-5 - Phase 6 Step 11 admin specials nav

---

## PHASE 0: DATABASE FOUNDATION (ARCHIVED)

**Priority:** BLOCKING - Must complete before ANY other work can proceed
**Status:** COMPLETE (2026-01-15)
**Duration:** ~6 hours (including blocker resolution)

### Completed Tasks
1.  Stage 1 migrations executed (5 client_* tables created in database)
2.  OpenAI SDK installed (`npm install openai` completed)
3.  Model associations tested (74 User associations working)
4.  Seed data created (User ID 7 with questionnaire, measurements, nutrition plan)
5.  AI Workout Controller validated (all 6 tests passed)

### Blockers Resolved
1.  Fixed UUID/INTEGER migration mismatches (renewal_alerts, body_measurements)
2.  Skipped 3 legacy fix migrations (no longer needed)
3.  Cleared database locks (terminated 8 stuck processes)
4.  Verified migrations 3-6 already using correct INTEGER types

### Validation Results
**Test Script:** `backend/test-ai-workout-controller.mjs`
-  Test 1: OpenAI SDK installed and importable
-  Test 2: AI Workout Controller file exists with generateWorkoutPlan export
-  Test 3: AI Routes file exists and registered
-  Test 4: All 7 required models loaded with associations
-  Test 5: Test user (ID 7) validated with onboarding data
-  Test 6: OpenAI API configuration checked

**Database Tables Created:**
- `client_onboarding_questionnaires` (1 row)
- `client_baseline_measurements` (1 row)
- `client_nutrition_plans` (1 row)
- `client_photos` (0 rows)
- `client_notes` (0 rows)

### Completion Summary
**Completion Date:** 2026-01-15
**Total Duration:** ~6 hours (including 4 blocker fixes)
**Files Created:** 5 test scripts, 2 migration fixes, 5 model updates
**Next Phase:** Phase 1 Client Onboarding Blueprint (APPROVED TO START)

---

## PHASE 0.5: NASM PROTOCOL REFACTOR COMPLETE

**Priority:** CRITICAL - Industry standard compliance required before Phase 1 implementation
**Status:** COMPLETE (2026-01-15 at 1:30 AM)
**Owner:** Claude Code (Sonnet 4.5)
**Duration:** ~2 hours
**Trigger:** User realized fitness app should follow NASM (National Academy of Sports Medicine) industry-standard protocols instead of generic movement screening

### Critical Issue Identified
- **Problem:** Original blueprints used generic ROM scoring (overhead reach 8/10, squat depth 6/10, etc.) instead of NASM-certified protocols
- **Business Risk:** Fairmont parents expect professional, certified fitness assessments
- **User Directive:** "I want you to confirm this is NASM protocal so we may need to refactor some code blueprints"
- **Decision:** Full NASM refactor approved by user (Option 1)

### NASM Refactor Tasks Completed

#### 1.  Created NASM-PROTOCOL-REQUIREMENTS.md
**File:** `docs/ai-workflow/blueprints/NASM-PROTOCOL-REQUIREMENTS.md` (600+ lines)

**Content:**
- NASM OPT Model overview (5 phases of training progression)
- PAR-Q+ Pre-Screening (7 mandatory questions + medical clearance tracking)
- Overhead Squat Assessment (OHSA) specifications
  - 8 kinetic chain checkpoints (feet, knees, LPHC, shoulders, head)
  - Compensation scoring (none/minor/significant)
  - Muscle imbalance tables (overactive vs underactive)
- NASM Assessment Score calculation (0-100 composite)
- OPT Phase selection logic (<60=Phase 1, 60-79=Phase 2, 80+=Phases 3-5)
- 4-Phase Corrective Exercise Strategy (Inhibit, Lengthen, Activate, Integrate)
- AI workout generation integration requirements
- Legal/professional standards compliance

#### 2.  Refactored Database ERD (NASM Fields)
**File:** `docs/ai-workflow/blueprints/ONBOARDING-FLOW-PART-2.mermaid.md`

**Changes:**
- Replaced `rangeOfMotion` JSONB  `overheadSquatAssessment` JSONB
- Replaced `movementScreenScore` (1-10)  `nasmAssessmentScore` (0-100)
- Added `parqScreening` JSONB (PAR-Q+ 7 questions)
- Added `posturalAssessment` JSONB (anterior/lateral/posterior views)
- Added `performanceAssessments` JSONB (cardio/strength/flexibility)
- Added `correctiveExerciseStrategy` JSONB (4-phase NASM protocol)
- Added `medicalClearanceRequired` BOOLEAN
- Added `medicalClearanceDate` DATE
- Added `medicalClearanceProvider` STRING

#### 3.  Refactored Movement Screen Wireframes
**File:** `docs/ai-workflow/blueprints/ONBOARDING-WIREFRAMES-PART-2.md`

**Changes:**
- Replaced generic ROM sliders (1-10 scale) with NASM OHSA checkpoints
- Added PAR-Q+ pre-screening UI (7 questions with Yes/No radio buttons)
- Added medical clearance fields (provider name, clearance date)
- Added OHSA assessment UI:
  - Anterior View: Feet turnout, feet flattening, knee valgus, knee varus
  - Lateral View: Excessive forward lean, low back arch, arms fall forward, forward head
  - Additional: Asymmetric weight shift
  - Each checkpoint: none/minor/significant dropdown + muscle imbalance tooltips
- Added auto-generated corrective exercise strategy display (4 phases)
- Updated scoring from "7.5/10"  "NASM Score: 73/100"
- Added OPT Phase display ("Phase 2: Strength Endurance")

#### 4.  Created NASM Database Migration
**File:** `backend/migrations/20260115000000-add-nasm-fields-to-baseline-measurements.cjs`

**Migration Adds 9 Columns:**
1. `parqScreening` JSONB - PAR-Q+ screening data
2. `overheadSquatAssessment` JSONB - NASM OHSA 8 checkpoints
3. `nasmAssessmentScore` INTEGER (0-100) - Replaces movementScreenScore
4. `posturalAssessment` JSONB - Static posture observations
5. `performanceAssessments` JSONB - Optional cardio/strength/flexibility tests
6. `correctiveExerciseStrategy` JSONB - Auto-generated 4-phase strategy
7. `medicalClearanceRequired` BOOLEAN - PAR-Q+ flag
8. `medicalClearanceDate` DATE - Physician clearance date
9. `medicalClearanceProvider` STRING - Physician name

**Note:** Generic `rangeOfMotion` and `movementScreenScore` fields kept for backward compatibility but deprecated for new assessments.

#### 5.  Updated ClientBaselineMeasurements Model
**File:** `backend/models/ClientBaselineMeasurements.mjs`

**Model Updates:**
- Added 9 NASM fields with proper validation
- Added custom validator for OHSA compensations (must be 'none', 'minor', or 'significant')
- Added 3 helper methods:

**Helper Methods:**
1. `calculateNASMScore(ohsa)` - Calculate 0-100 composite score from OHSA
   - Scoring: none=100, minor=70, significant=40
   - Returns average of all 9 checkpoints
   - Example: (5100 + 370 + 140) / 9 = 73/100

2. `selectOPTPhase(nasmScore, primaryGoal)` - Determine NASM OPT Model phase
   - <60: Phase 1 (Stabilization Endurance, 4-6 weeks, 12-20 reps)
   - 60-79: Phase 2 (Strength Endurance, 4 weeks, 8-12 reps)
   - 80+ with muscle_gain goal: Phase 3 (Hypertrophy)
   - 80+ with maximal_strength goal: Phase 4 (Maximal Strength)
   - 80+ with athletic_performance goal: Phase 5 (Power)

3. `generateCorrectiveStrategy(ohsa)` - Auto-generate 4-phase corrective plan
   - Analyzes 8 OHSA checkpoints
   - Identifies compensations (e.g., knee valgus, forward lean)
   - Returns corrective exercises for each phase:
     - Inhibit: Foam rolling (overactive muscles)
     - Lengthen: Static stretching (tight muscles)
     - Activate: Isolated strengthening (underactive muscles)
     - Integrate: Functional movement patterns
   - Removes duplicate exercises via Map deduplication

### Files Modified/Created
1.  `docs/ai-workflow/blueprints/NASM-PROTOCOL-REQUIREMENTS.md` (NEW - 600+ lines)
2.  `docs/ai-workflow/blueprints/ONBOARDING-FLOW-PART-2.mermaid.md` (UPDATED - NASM ERD)
3.  `docs/ai-workflow/blueprints/ONBOARDING-WIREFRAMES-PART-2.md` (UPDATED - NASM UI)
4.  `backend/migrations/20260115000000-add-nasm-fields-to-baseline-measurements.cjs` (NEW)
5.  `backend/models/ClientBaselineMeasurements.mjs` (UPDATED - 9 fields + 3 methods)

### Next Steps for ChatGPT-5
- [ ] Run migration: `npm run migrate` to add NASM fields to database
- [ ] Update `onboardingController.mjs` to use NASM fields in POST /movement-screen endpoint
- [ ] Use helper methods: `calculateNASMScore()`, `generateCorrectiveStrategy()`, `selectOPTPhase()`
- [ ] BACKLOG (Phase 1 UI): Update frontend `MovementScreenForm.tsx` with NASM OHSA UI (8 checkpoints + PAR-Q+) after wireframe review
- [ ] Integrate NASM data into AI Workout Controller for OPT phase selection

---

## PHASE 1: CLIENT ONBOARDING BLUEPRINT (3-5 DAYS)

**Priority:** HIGH - Fairmont parent onboarding readiness
**Status:** PAUSED - Shifted to Universal Schedule System
**Owner:** ChatGPT-5 (Codex)
**Started:** 2026-01-15
**Current Sub-Phase:** 1.1 - Onboarding Controller Endpoints

### Business Context
- **Target Market:** Fairmont parents (time-stressed, high-income, results-focused)
- **Key Differentiator:** 10-minute movement screen + AI-powered training plan
- **Revenue Goal:** Convert Express 30 trials  Signature 60  Transformation Pack

### Corrected Pricing Structure
| Package | Duration | Price | Session Rate |
|---------|----------|-------|--------------|
| **Express 30** | 30 minutes | $110/session | $110 |
| **Signature 60 (Standard)** | 60 minutes | $175/session | $175 |
| **Signature 60 (AI Data Package)** | 60 minutes | $200/session | $200 |
| **Transformation Pack** | 10 sessions | $1,600 total | $160/session |

### Phase 1 Tasks

#### 1.1: Onboarding Controller Implementation PAUSED

**Reference Directive:** See `docs/ai-workflow/AI-HANDOFF/PHASE-1-START-DIRECTIVE.md` for detailed implementation instructions.

**CRITICAL: Documentation First**
- [ ] **Create ONBOARDING-FLOW.mermaid.md** (user journey, API sequences, ERD, RBAC matrix)
- [ ] **Create ONBOARDING-WIREFRAMES.md** (questionnaire UI, movement screen UI, admin interfaces)
- [ ] **Update ADMIN-DASHBOARD-ARCHITECTURE.mermaid.md** (add onboarding endpoints, admin flows)

**Endpoint Implementation**
- [ ] **Create POST /api/onboarding/:userId/questionnaire**
  - Save 85-question responses to `client_onboarding_questionnaires` table
  - Populate `responsesJson` JSONB field with full questionnaire data
  - Auto-extract indexed fields: `primaryGoal`, `trainingTier`, `commitmentLevel`, `healthRisk`, `nutritionPrefs`
  - Set `status` = 'submitted', `questionnaireVersion` = '3.0'
  - Return completion percentage

- [ ] **Create GET /api/onboarding/:userId/questionnaire**
  - Retrieve questionnaire with populated indexed fields
  - Include completion status and progress metrics
  - RBAC: Admin = any client, Trainer = assigned only, Client = self only

- [ ] **Create POST /api/onboarding/:userId/movement-screen**
  - 10-minute movement assessment (NASM OHSA)
  - Save to `client_baseline_measurements` table
  - Fields: `parqScreening`, `overheadSquatAssessment`, `posturalAssessment`, `performanceAssessments`, `flexibilityNotes`, `injuryNotes`, `painLevel`
  - Generate `nasmAssessmentScore` (0-100) + `correctiveExerciseStrategy`
  - Link to onboarding questionnaire via `userId`

- [ ] **Create GET /api/client-data/overview/:userId**
  - Dashboard summary aggregating:
    - Onboarding questionnaire status
    - NASM assessment score
    - Baseline measurements summary
    - Latest nutrition plan
    - Recent progress photos count
    - Trainer notes count
  - Used by RevolutionaryClientDashboard.tsx

#### 1.2: Admin Data Entry Interfaces (CRITICAL PROTOCOL)
**REQUIREMENT:** Every feature that currently uses mock data MUST have an admin UI to populate that data.

- [ ] **Admin Onboarding Management Page**
  - View all client questionnaires (table with filters)
  - Manually create/edit questionnaire for client (form builder)
  - Bulk import questionnaires (CSV upload)
  - Export questionnaire responses (CSV download)

- [ ] **Admin Movement Screen Interface**
  - Create movement screen assessment for client
  - View movement screen history (timeline)
  - Edit movement screen results
  - NASM OHSA templates + corrective exercise prompts

- [ ] **Admin Baseline Measurements Entry**
  - Form to enter vitals (heart rate, blood pressure)
  - Strength assessment inputs (bench press, pull-ups, etc.)
  - Flexibility/ROM assessment (JSONB editor)
  - Injury notes and pain level tracking

#### 1.3: UX/UI Protocol Implementation (P0 CRITICAL - Gemini Audit Recommendations)
**STATUS:**  READY TO IMPLEMENT
**REFERENCE:** `docs/ai-workflow/blueprints/UX-UI-DESIGN-PROTOCOL.md` (2026-01-16)

**P0 (Critical) - Must Fix Before Launch:**

- [ ] **MovementScreenManager.tsx - Replace Dropdowns with Segmented Controls**
  - Current: 9 OHSA checkpoints use dropdowns (18 clicks per assessment)
  - Required: Replace with 3-button segmented controls (None/Minor/Significant)
  - Impact: Saves ~18 clicks per movement screen (50% faster data entry)
  - Mobile-friendly: Larger touch targets for gym floor use

- [ ] **OnboardingManagement.tsx - Mobile Responsive Table**
  - Current: Table breaks on mobile devices (horizontal scroll required)
  - Required: Card-based layout for <768px breakpoint
  - Impact: Trainers can use mobile/tablet on gym floor

- [ ] **OnboardingStatusCard.tsx - Actionable Pending Items**
  - Current: "Pending" status is non-clickable
  - Required: Add "Complete Now " link to pending items
  - Impact: Direct client navigation to incomplete tasks

**P1 (High Priority) - Workflow Optimization:**

- [ ] **Create Unified Client Profile View** (`/admin/clients/:userId`)
  - Tabbed interface: [Overview] [Onboarding] [Movement] [Vitals] [Workouts] [Nutrition]
  - Reduces admin navigation from 3 separate pages to 1 unified view
  - Impact: 30% faster trainer workflow

- [ ] **BaselineMeasurementsEntry.tsx - Smart Defaults**
  - Pre-fill fields with previous session's data (ghosted placeholders)
  - "Last HR: 72 BPM" as placeholder text
  - Impact: Faster data entry for unchanged metrics

- [ ] **OnboardingManagement.tsx - Bulk Actions**
  - Add checkboxes to table rows
  - Bulk actions: Send Reminder Email, Mark as Reviewed, Export CSV
  - Impact: Multi-client management efficiency

**P2 (Medium Priority) - Visual Enhancements:**

- [ ] **BaselineMeasurementsEntry.tsx - Sparkline Charts**
  - Replace text history with mini trend charts
  - Example: `Body Weight: [185 lbs]  ( 2 lbs this week)`
  - Impact: Faster visual trend analysis

- [ ] **Replace Progress Text with Visual Bars**
  - Current: "75% Complete"
  - Required: ` 75%`
  - Impact: Faster visual scanning

- [ ] **OnboardingStatusCard.tsx - Collapsible When Complete**
  - Once 100% complete, collapse to single line: ` Onboarding Complete (Jan 15) [View ]`
  - Impact: Frees dashboard real estate for active tasks

**Blueprint Updates (REQUIRED BEFORE CODING):**

- [ ] **Create ONBOARDING-FLOW.mermaid.md**
  - User journey: Landing page  Questionnaire  Movement screen  Dashboard
  - API sequence diagrams for each endpoint
  - Database ERD showing relationships
  - RBAC matrix (who can create/read/update/delete questionnaires)

- [ ] **Create ONBOARDING-WIREFRAMES.md**
  - 85-question questionnaire UI (multi-step wizard)
  - Movement screen assessment UI (video + scoring)
  - Onboarding progress component (completion %)
  - Admin onboarding management interface

- [ ] **Update ADMIN-DASHBOARD-ARCHITECTURE.mermaid.md**
  - Add onboarding management endpoints
  - Add data entry flow diagrams
  - Add admin permission requirements

#### 1.4: Dashboard Integration
- [ ] **Wire RevolutionaryClientDashboard.tsx to real APIs**
  - Replace mock data with `useClientData(userId)` hook
  - Fetch onboarding status from GET /api/client-data/overview/:userId
  - Display movement screen score
  - Show questionnaire completion percentage

- [ ] **Create Onboarding Progress Component**
  - Visual progress bar (0-100%)
  - Section completion badges (13 sections)
  - "Complete Your Profile" CTA if not 100%

### Acceptance Criteria
 All onboarding endpoints implemented and tested
 Admin can create/edit questionnaires via dashboard (zero hardcoding)
 RevolutionaryClientDashboard shows real questionnaire data
 Movement screen integrated with scoring algorithm
 All blueprints/wireframes updated BEFORE implementation
 RBAC enforced (admin/trainer/client permissions)
 UI flow validated (click-through test passes)

---

## PHASE 2: DASHBOARD STREAMLINING (5-7 DAYS)

**Priority:**  HIGH - Fix duplicate dashboards and broken tabs
**Status:**  PAUSED - Waiting for Phase 0-1 completion
**Owner:** ChatGPT-5 (Codex)

### Problem Statement
- **7 duplicate client dashboard layouts** causing confusion and routing issues
- **Broken tabs** (Workouts, Nutrition, Progress, Photos, Notes) not wired to APIs
- **No single source of truth** for client dashboard UI

### Phase 2 Tasks

#### 2.1: Dashboard Consolidation
- [ ] **Keep:** `frontend/src/components/ClientDashboard/RevolutionaryClientDashboard.tsx`
  - This is the canonical client dashboard (most complete implementation)

- [ ] **Archive (move to /archived/):**
  - `ClientDashboardLayout.tsx`
  - `ClientDashboard.V2.tsx`
  - `ClientDashboard.V3.tsx`
  - `ClientDashboardSimplified.tsx`
  - `ClientDashboardEnhanced.tsx`
  - `ClientDashboardLegacy.tsx`
  - `ClientDashboardPrototype.tsx`

- [ ] **Update all routes to use RevolutionaryClientDashboard**
  - Check `frontend/src/App.tsx` routing
  - Check `frontend/src/config/dashboard-tabs.ts` references
  - Search codebase for imports of archived files
  - Replace all imports with RevolutionaryClientDashboard

#### 2.2: Fix Broken Tabs
Each tab must be wired to a real API endpoint with proper error handling.

- [ ] **Workouts Tab**
  - Endpoint: GET /api/workouts/:userId/current
  - Display: Current workout plan, exercises, sets/reps
  - Admin Entry: Admin Workout Plan Builder (drag-drop exercises)

- [ ] **Nutrition Tab**
  - Endpoint: GET /api/nutrition/:userId/current
  - Display: Current meal plan, macros, grocery list
  - Admin Entry: Admin Nutrition Plan Builder (meal library + macro calculator)

- [ ] **Progress Tab**
  - Endpoint: GET /api/measurements/:userId/timeline
  - Display: Weight graph, body measurements chart, baseline comparisons
  - Admin Entry: Admin Progress Entry Form (manual measurement input)

- [ ] **Photos Tab**
  - Endpoint: GET /api/photos/:userId
  - Display: Progress photo gallery (before/after, timeline)
  - Admin Entry: Admin Photo Upload Interface (with tagging)

- [ ] **Notes Tab**
  - Endpoint: GET /api/notes/:userId
  - Display: Trainer observations, red flags, achievements
  - Admin Entry: Admin Notes Manager (create/edit notes for any client)

#### 2.3: Blueprint/Wireframe Updates
- [ ] **Create DASHBOARD-TABS-FLOW.mermaid.md**
  - Click flow for each tab (what happens when clicked)
  - API calls triggered per tab
  - Loading states and error handling
  - Empty state designs (no data yet)

- [ ] **Update DASHBOARD-MASTER-ARCHITECTURE.md**
  - Remove references to archived dashboards
  - Document RevolutionaryClientDashboard as canonical
  - Add tab-to-API mapping table

### Acceptance Criteria
 Only 1 client dashboard component in use (RevolutionaryClientDashboard)
 All 7 duplicate dashboards archived (moved to /archived/)
 All tabs functional (Workouts, Nutrition, Progress, Photos, Notes)
 Each tab wired to real API endpoint (no mock data)
 Admin can populate data for each tab via dashboard
 Click-through test passes for all tabs
 Blueprints updated with tab flow diagrams

---

## PHASE 3: MOCK DATA ELIMINATION (3-4 DAYS)

**Priority:**  MEDIUM - Replace all hardcoded data with database persistence
**Status:**  PAUSED - Waiting for Phase 0-2 completion
**Owner:** ChatGPT-5 (Codex)

### Problem Statement
**30+ components identified using mock data** instead of database-backed APIs.

### Phase 3 Tasks

#### 3.1: Create React Query Hooks
- [ ] **useClientData(userId)**  GET /api/client-data/overview/:userId
- [ ] **useOnboardingQuestionnaire(userId)**  GET /api/onboarding/:userId/questionnaire
- [ ] **useBaselineMeasurements(userId)**  GET /api/measurements/:userId/baseline
- [ ] **useNutritionPlan(userId)**  GET /api/nutrition/:userId/current
- [ ] **useClientPhotos(userId)**  GET /api/photos/:userId
- [ ] **useClientNotes(userId)**  GET /api/notes/:userId
- [ ] **useWorkoutPlan(userId)**  GET /api/workouts/:userId/current

#### 3.2: Replace Mock Data in Components (30+ files)
**Identified components using mock data:**

1. `TrainerStellarSections.tsx` - Replace mock trainer stats
2. `AdminStellarSidebar.tsx` - Replace mock admin metrics
3. `NotificationsSection.tsx` - Replace mock notifications
4. `ClientTrainerAssignments.tsx` - Replace mock assignments
5. `TrainerPermissionsManager.tsx` - Replace mock permissions
6. `AdminBadgesManagement.tsx` - Replace mock badges
7. `WorkoutDataEntry.tsx` - Replace mock workout data
8. `SecurityMonitoringPanel.tsx` - Replace mock security logs
9. `FeaturesSection.V2.tsx` - Replace mock feature flags
10. `SocialProfileSection.tsx` - Replace mock social data
11. `EnhancedMessagingSection.tsx` - Replace mock messages
12. *(20+ more components identified in grep search)*

**Action for EACH component:**
- [ ] Create backend API endpoint if doesn't exist
- [ ] Create React Query hook for data fetching
- [ ] Replace mock data with `const { data } = useHookName()`
- [ ] Add loading state (`isLoading`)
- [ ] Add error state (`isError`)
- [ ] Add empty state (no data yet)
- [ ] **Create admin UI to populate that data**

#### 3.3: Admin Data Entry Interfaces (CRITICAL)
**For EACH component with mock data, create admin UI:**

- [ ] **Admin Trainer Stats Manager**
  - Total clients count (auto-calculated)
  - Active sessions count (auto-calculated)
  - Revenue metrics (from orders table)
  - Manual override fields (bonus revenue, external sessions)

- [ ] **Admin Notifications Manager**
  - Create notification (user/broadcast)
  - Edit notification
  - Delete notification
  - Notification templates library

- [ ] **Admin Badges Manager**
  - Create badge (name, icon, criteria)
  - Assign badge to user
  - Badge achievement tracking
  - Badge library (pre-built badges)

- [ ] **Admin Feature Flags Manager**
  - Toggle features on/off per environment
  - Per-user feature flags (beta testing)
  - Feature flag audit log

- [ ] **Admin Messaging Interface**
  - Send message to user
  - View message history
  - Message templates
  - Bulk messaging tool

#### 3.4: Blueprint/Wireframe Updates
- [ ] **Create MOCK-DATA-ELIMINATION-PLAN.md**
  - Full list of 30+ components with mock data
  - Replacement API endpoint for each
  - Admin UI design for each data type
  - Testing checklist (verify no mock data remains)

- [ ] **Create ADMIN-DATA-ENTRY-MASTER.mermaid.md**
  - Flow diagram showing how admin populates each data type
  - Permission matrix (what admin roles can edit what)
  - Data validation rules
  - Audit logging requirements

### Acceptance Criteria
 Zero components using mock/hardcoded data
 All data fetched from database via React Query hooks
 Admin can populate 100% of application data via dashboard
 Loading, error, and empty states implemented for all data fetches
 Blueprints document admin data entry flow for each feature
 Grep search for "mock" returns zero results in component files

---

## PHASE 4: AUTOMATION & FOLLOW-UP SYSTEM (2-3 DAYS)

**Priority:**  MEDIUM - Automated client engagement sequences
**Status:**  PAUSED - Waiting for Phase 0-3 completion
**Owner:** ChatGPT-5 (Codex)

### Phase 4 Tasks

#### 4.1: Twilio SMS Integration
- [ ] **Install Twilio SDK**
  ```bash
  npm install twilio
  ```

- [ ] **Create SMS Service**
  - `backend/services/smsService.mjs`
  - `sendSMS(phoneNumber, message)` function
  - Template system (variables: {clientName}, {trainerName}, {nextSession})
  - Error handling and retry logic

#### 4.2: Follow-Up Automation Sequences
- [ ] **Day 0: Welcome Message**
  - Trigger: New client created
  - Content: "Welcome to SwanStudios! Your transformation begins now. Here's your pricing sheet: [link]"

- [ ] **Day 1: First Workout Check-In**
  - Trigger: 24 hours after first session
  - Content: "How did your first workout feel? Reply with a number 1-10 or any feedback!"

- [ ] **Day 3: Nutrition Tips**
  - Trigger: 3 days after onboarding
  - Content: "Pro tip: Hydration is key! Aim for 0.5-1oz per lb of bodyweight daily. Need help with nutrition? Reply YES."

- [ ] **Day 7: Transformation Pack Offer**
  - Trigger: 7 days after first session (if not already purchased)
  - Content: "You've crushed your first week! Ready to commit to your full transformation? Book your Transformation Pack now: [link]"

#### 4.3: Admin Automation Manager
- [ ] **Admin UI to manage SMS sequences**
  - View all active sequences
  - Create new sequence (triggers + messages)
  - Edit sequence templates
  - Pause/resume sequences per client
  - SMS delivery logs and analytics

#### 4.4: Blueprint/Wireframe Updates
- [ ] **Create AUTOMATION-FLOW.mermaid.md**
  - Trigger  Action  Notification flow diagrams
  - SMS sequence timeline visualization
  - Database schema for automation rules
  - Twilio API integration architecture

### Acceptance Criteria
 Twilio integrated and sending test SMS successfully
 Day 0-7 sequences automated (trigger on events)
 Admin can create/edit SMS sequences via dashboard
 SMS delivery logs tracked in database
 Opt-out mechanism implemented (TCPA compliance)
 Blueprints document automation architecture

---

## PHASE 5: CLIENT MATERIALS & LAUNCH READINESS (1 DAY)

**Priority:**  LOW - Final polish for client-facing materials
**Status:**  PAUSED - Waiting for Phase 0-4 completion
**Owner:** ChatGPT-5 (Codex)

### Phase 5 Tasks

#### 5.1: Pricing Sheet
- [ ] **Create digital pricing sheet (PDF + web page)**
  - Express 30: $110/session (30 minutes)
  - Signature 60 (Standard): $175/session (60 minutes)
  - Signature 60 (AI Data Package): $200/session (60 minutes + comprehensive data tracking)
  - Transformation Pack: $1,600/10 sessions ($160/session rate)

- [ ] **Pricing comparison table**
  - What's included in each package
  - AI Data Package benefits (85-question assessment, movement screen, progress tracking)
  - Transformation Pack savings ($200 discount vs individual sessions)

#### 5.2: Fairmont Parent Onboarding Script
- [ ] **Initial contact template**
  - Introduction to SwanStudios
  - 10-minute movement screen pitch
  - Scheduling link for free assessment

- [ ] **Movement screen questions**
  - NASM OHSA checkpoints (feet turnout/flattening, knee valgus/varus, forward lean, low back arch, arms fall forward, forward head)
  - Pain assessment (0-10 scale)
  - Injury history (yes/no + details)
  - Fitness goals (dropdown + open text)

- [ ] **Objection handling decision tree**
  - "Too expensive"  Transformation Pack discount ($160/session vs $175-200)
  - "No time"  Express 30 option (30 minutes)
  - "Not sure it will work"  Free movement screen + money-back guarantee

#### 5.3: Storefront CSS Update
- [ ] **Update PackageSection.V2.tsx with corrected pricing**
  - Line 290: Express 30  $110/session
  - Add "30-Min High Intensity" descriptor
  - Line 298: Signature 60  $175/session (Standard) or $200/session (AI Data Package)
  - Line 306: Transformation Pack  $1,600/10 sessions

- [ ] **CSS polish for pricing cards**
  - Ensure responsive design (mobile/tablet/desktop)
  - Highlight AI Data Package (recommended badge)
  - Add "Best Value" badge to Transformation Pack

#### 5.4: UI/UX Flow Validation
**CRITICAL: Click-through testing for ALL features**

- [ ] **Test user journey: Landing  Signup  Onboarding  Dashboard**
  - Click "View Options" on pricing card  navigates to /shop 
  - Purchase package  creates order  redirects to onboarding 
  - Complete questionnaire  saves to database  shows completion % 
  - View dashboard  all tabs functional  data loads correctly 

- [ ] **Test admin journey: Login  Data Entry  Client Dashboard**
  - Admin login  navigates to admin dashboard 
  - Create client questionnaire  saves to database 
  - Enter movement screen  displays score 
  - View client dashboard  shows populated data 

### Acceptance Criteria
 Pricing sheet created (PDF + web page)
 Fairmont parent script documented
 PackageSection.V2.tsx updated with correct pricing
 UI flow click-through test passes end-to-end
 Zero broken links or non-functional buttons
 Mobile responsive design verified

---

## OVERALL PROGRESS TRACKING

| Phase | Status | Owner | Timeline | Completion Date | Dependencies |
|-------|--------|-------|----------|-----------------|--------------|
| **Phase 0: Database Foundation** |  COMPLETE | ChatGPT-5 + Claude Code | 2 hours | 2026-01-15 | None |
| **Phase 1: Client Onboarding** | PAUSED | ChatGPT-5 | 3-5 days | ___________ | Phase 0 |
| **Phase 2: Dashboard Streamlining** |  PAUSED | ChatGPT-5 | 5-7 days | ___________ | Phase 0-1 |
| **Phase 3: Mock Data Elimination** |  PAUSED | ChatGPT-5 | 3-4 days | ___________ | Phase 0-2 |
| **Phase 4: Automation System** |  PAUSED | ChatGPT-5 | 2-3 days | ___________ | Phase 0-3 |
| **Phase 5: Client Materials** |  PAUSED | ChatGPT-5 | 1 day | ___________ | Phase 0-4 |

**Total Timeline:** 14-22 business days (assumes sequential completion)

---

## FILES LOCKED BY CHATGPT-5

**Client Data Integration - Stage 1 (Database Models):**
- `backend/models/ClientOnboardingQuestionnaire.mjs`  COMPLETE
- `backend/models/ClientBaselineMeasurements.mjs`  COMPLETE
- `backend/models/ClientNutritionPlan.mjs`  COMPLETE
- `backend/models/ClientPhoto.mjs`  COMPLETE
- `backend/models/ClientNote.mjs`  COMPLETE
- `backend/models/associations.mjs`  COMPLETE (5 new associations added)
- `backend/migrations/20260112000000-create-client-onboarding-questionnaires.cjs`  COMPLETE
- `backend/migrations/20260112000001-create-client-baseline-measurements.cjs`  COMPLETE
- `backend/migrations/20260112000002-create-client-nutrition-plans.cjs`  COMPLETE
- `backend/migrations/20260112000003-create-client-photos.cjs`  COMPLETE
- `backend/migrations/20260112000004-create-client-notes.cjs`  COMPLETE

**Client Data Integration - Stage 2 File 6 (AI Workout Generation):**
- `backend/controllers/aiWorkoutController.mjs`  COMPLETE
- `backend/routes/aiRoutes.mjs`  COMPLETE
- `backend/core/routes.mjs`  COMPLETE (AI routes mounted)

**Phase 1.1 Onboarding Endpoints (Paused):**
- `backend/controllers/clientOnboardingController.mjs` - Locked by ChatGPT-5 - Phase 1.1 onboarding endpoints
- `backend/routes/clientOnboardingRoutes.mjs` - Locked by ChatGPT-5 - Phase 1.1 onboarding routes
- `backend/routes/clientDataRoutes.mjs` - Locked by ChatGPT-5 - Phase 1.1 client data overview route
- `backend/core/routes.mjs` - Locked by ChatGPT-5 - register Phase 1.1 routes

**Pending Migration Execution:** NOT RUN (verify before resuming Phase 1)

---

## CRITICAL PROTOCOL REQUIREMENTS

### Documentation-First Enforcement
**BEFORE implementing ANY feature:**
1.  Update or create Blueprint/Wireframe/Mermaid diagram
2.  Document API endpoints (request/response schemas)
3.  Document database schema changes
4.  Document RBAC permissions
5.  Get user approval on design
6.  THEN write code

### Admin Data Entry Protocol
**FOR every feature that uses data:**
1.  Create backend API endpoint
2.  Create React Query hook for frontend
3.  **Create admin UI to populate that data** (CRITICAL)
4.  Document admin flow in blueprints
5.  Test admin can create/edit data via dashboard
6.  Verify zero hardcoded/mock data remains

### UI/UX Flow Validation Protocol
**AFTER implementing each feature:**
1.  Click-through test (does button/link work?)
2.  Data persistence test (does data save to database?)
3.  Loading state test (spinner shows while fetching?)
4.  Error state test (error message displays on failure?)
5.  Empty state test (helpful message when no data?)
6.  Mobile responsive test (works on phone/tablet?)

---

## BLOCKERS & RISKS

| Blocker | Impact | Mitigation |
|---------|--------|------------|
| Phase 0 migrations not run |  ALL endpoints will error | Run migrations immediately (2-hour task) |
| OpenAI SDK not installed |  AI Workout Controller will error | `npm install openai` (5-minute task) |
| 30+ components using mock data |  App looks functional but data doesn't persist | Phase 3 addresses this (create admin UIs) |
| 7 duplicate dashboards |  Routing confusion, maintenance burden | Phase 2 archives duplicates (1-day task) |
| No admin data entry UIs |  Can't populate production data | CRITICAL - built into every phase |

---

## REFERENCE DOCUMENTS

**Business Strategy:**
- `docs/ai-workflow/AI-HANDOFF/SWANSTUDIOS-BUSINESS-READINESS-MASTER-PLAN.md`

**Technical Architecture:**
- `docs/ai-workflow/ADMIN-DASHBOARD-ARCHITECTURE.mermaid.md`
- `docs/ai-workflow/ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md`
- `docs/ai-workflow/DASHBOARD-MASTER-ARCHITECTURE.md`
- `docs/ai-workflow/CLIENT-DATA-INTEGRATION-REFACTORED-PROMPT.md`

**AI Documentation:**
- `AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md` (Section 9.8)
- `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md`

---

## COMPLETED TODAY (2026-01-27)
- ✅ **Universal Master Schedule Refactor**: Modularized monolithic component into `ScheduleHeader`, `ScheduleStats`, `ScheduleCalendar`, and `ScheduleModals`.
- ✅ **Production Integration**: Integrated `useCalendarData` hook and `universalMasterScheduleService` for robust data management.
- ✅ **Galaxy-Swan Theme**: Ensured full compliance with design tokens and glass-morphism effects.
- ✅ **UI Fixes**: Resolved dropdown transparency issues and implemented "grey out" logic for past time slots.
- ✅ **Testing Infrastructure**: Created automated test script `scripts/test-universal-schedule.mjs` and verified core API flows.

## COMPLETED TODAY (2026-01-31)
- âœ… **Vitest + RTL Setup**: Added `vitest.config.ts`, `src/test/setup.ts`, and test scripts; restricted test include/exclude.
- âœ… **Unit Tests**: Added `SessionCard` tests and stabilized existing tests (sessionService + useClientDashboardMcp).
- âœ… **Test Run**: `npx vitest run --reporter verbose` passing (3 files, 10 tests).
- âœ… **Phase 4.1 Toasts**: Reused existing toast system, added success/error/warning/info helpers, replaced alert() in UniversalMasterSchedule.
- âœ… **Phase 4.2 Header Dropdowns**: Consolidated schedule header actions into Create/Manage dropdowns.
- âœ… **Phase 4.3 Shortcuts**: Added keyboard shortcuts (N/T/Arrows/Esc) with modal + input safety checks.
- âœ… **Phase 4.4 Templates**: Added session template hook, template selector, and save-as-template flow.
- ? **Phase 4 Polish**: Added inline template name validation, template delete UI, and shortcut tooltips.

**END OF CURRENT-TASK.md**




