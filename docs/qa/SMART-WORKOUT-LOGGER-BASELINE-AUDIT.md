# Smart Workout Logger — Phase 0 Baseline Audit

**Date:** 2026-02-24
**Auditor:** Claude Code (Opus 4.6)
**Scope:** Codebase-wide inventory of workout logging, AI coaching, NASM integration, and privacy infrastructure
**Purpose:** Required Phase 0 deliverable before any implementation work begins on the Smart Workout Logger + Privacy Middleware + NASM Workflow project

**Companion documents:**
- `docs/qa/SMART-WORKOUT-LOGGER-PLAYWRIGHT-EVIDENCE.md` — Playwright screenshots, console errors, network failures
- `docs/qa/SMART-WORKOUT-LOGGER-APPENDICES.md` — Database models, file reference, RBAC stack
- `docs/qa/playwright-phase0/` — 14 screenshots + `audit-results.json`

---

## 1. Current Workflow Audit — Entry Points & Data Flow

### Frontend Entry Points

```
User Dashboard
├── ClientDashboard/sections/MyWorkoutsSection.tsx          ← client workout tab
├── ClientDashboard/sections/EnhancedMyWorkoutsSection.tsx  ← enhanced client view
└── pages/workout/WorkoutDashboard.tsx                      ← standalone workout page
    ├── components/WorkoutForm.tsx                          ← log a session
    ├── components/ExerciseSelector.tsx                     ← pick exercises
    ├── components/WorkoutPlanner/WorkoutPlanner.tsx        ← build plans
    │   ├── DaySelector.tsx
    │   ├── ExerciseList.tsx
    │   ├── PlanForm.tsx / PlanHeader.tsx / PlanList.tsx
    │   └── SaveControls.tsx
    ├── components/RecentSessions.tsx                       ← session history
    ├── components/ClientProgress.tsx                       ← progress charts
    └── components/SessionNotes.tsx                         ← per-session notes

Trainer Dashboard
├── TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx
├── TrainerDashboard/WorkoutLogging/IntegrationTest.tsx
└── TrainerDashboard/WorkoutManagement/TrainerWorkoutManagement.tsx

Admin Dashboard
├── DashBoard/Pages/admin-clients/components/WorkoutLoggerModal.tsx  ← Phase 1C modal
├── DashBoard/Pages/admin-dashboard/WorkoutDataEntry.tsx
├── DashBoard/Pages/admin-dashboard/WorkoutProgressCharts.tsx
├── DashBoard/Pages/admin-exercises/AdminExerciseCommandCenter.tsx
│   ├── ExerciseCreationWizard.tsx
│   ├── ExerciseLibraryManager.tsx
│   ├── ExercisePreviewModal.tsx
│   ├── ExerciseStatsPanel.tsx
│   ├── VideoUploadProcessor.tsx
│   └── hooks/useNASMValidation.ts                                   ← NASM protocol hook
├── WorkoutManagement/AdminWorkoutManagement.tsx
├── WorkoutManagement/ExerciseLibrary.tsx
├── WorkoutManagement/WorkoutPlanBuilder.tsx
└── WorkoutManagement/ClientSelection.tsx

Shared Components
├── WorkoutLogger/WorkoutLogger.tsx           ← desktop logger
├── WorkoutLogger/MobileWorkoutLogger.tsx     ← mobile logger
├── WorkoutLogger/WorkoutLoggerTypes.ts
└── WorkoutLogger/WorkoutLoggerTheme.ts
```

### Frontend Services & State

- **API services:** `workout-session-service.ts`, `workout-planner-service.ts`, `exercise-service.ts`, `mcp/workoutMcpService.ts`, `adminClientService.ts`
- **Hooks:** `useWorkoutHistory`, `useWorkoutProgress`, `useCurrentWorkout`, `useWorkoutMcp`
- **Redux:** `workoutSlice.ts`, `exerciseSlice.ts`

### Backend Route → Controller → Model Flow

```
Client/Trainer Requests
├── POST /api/workout/sessions     → workoutRoutes → workoutService → WorkoutSession
├── PUT  /api/workout/sessions/:id → workoutRoutes → workoutService → WorkoutSession
├── GET  /api/workout/sessions     → workoutRoutes → workoutService → WorkoutSession
├── GET  /api/workout/progress     → workoutRoutes → workoutService → WorkoutSession + Set
├── GET  /api/workout/statistics   → workoutRoutes → workoutService → WorkoutSession
├── GET  /api/workout/recommendations → workoutRoutes → workoutService → Exercise (NASM-based)
├── POST /api/workout/plans        → workoutRoutes → WorkoutPlan + WorkoutPlanDay
├── GET  /api/workout/plans/:id    → workoutRoutes → WorkoutPlan
└── POST /api/workout/plans/:id/generate → workoutRoutes → WorkoutSession (from plan)

Admin Workout Logging (Phase 1C)
├── POST /api/admin/clients/:cid/workouts → adminWorkoutLoggerRoutes → WorkoutLog + awardWorkoutXP
└── GET  /api/admin/clients/:cid/workouts → adminWorkoutLoggerRoutes → WorkoutLog

Exercise Library
├── GET  /api/exercises/search       → exerciseRoutes → Exercise
├── GET  /api/exercises/categories   → exerciseRoutes → Exercise
├── GET  /api/exercises/:id          → exerciseRoutes → Exercise
└── GET  /api/exercises/recommended  → exerciseRoutes → Exercise (NASM-filtered)

AI Workout Generation  ← CRITICAL: PII sent to OpenAI here
├── POST /api/ai/workout-generation  → aiRoutes → aiWorkoutController → OpenAI GPT-4
│   └── Sends: masterPromptJson (contains real name, email, phone, health data)
│       + NASM constraints from ClientBaselineMeasurements
│       → Returns: structured WorkoutPlan JSON

Onboarding / Assessment
├── POST /api/onboarding            → onboardingController → User.masterPromptJson + clients_pii
├── POST /api/onboarding/self       → onboardingController → User.masterPromptJson
├── GET  /api/onboarding/:userId    → onboardingController → User.masterPromptJson
├── POST /api/admin/baseline-measurements → adminOnboardingRoutes → ClientBaselineMeasurements
├── GET  /api/admin/baseline-measurements/:userId → adminOnboardingRoutes → ClientBaselineMeasurements
├── POST /api/admin/clients/:cid/onboarding → adminOnboardingRoutes → ClientOnboardingQuestionnaire
├── GET  /api/admin/clients/:cid/onboarding → adminOnboardingRoutes → ClientOnboardingQuestionnaire
└── DELETE /api/admin/clients/:cid/onboarding → adminOnboardingRoutes → reset

Daily Workout Forms (NASM protocol)
└── dailyWorkoutFormRoutes.mjs → DailyWorkoutForm

Other (secondary — not modified in Phase 1)
├── workoutPlanRoutes.mjs (legacy, Zod-validated, clone/archive/restore)
├── workoutSessionRoutes.mjs, clientWorkoutRoutes.mjs
├── aiMonitoringRoutes.mjs (in-memory metrics, 4 endpoints)
└── masterPrompt/ (status, health, compliance, sub-routes: ethical-ai, privacy, mcp, etc.)
```

---

## 2. Endpoint & Response Schema Inventory

### 2a. Workout Session Endpoints (`workoutRoutes.mjs`)

| Method | Path | Auth | Request Body | Response Shape |
|--------|------|------|-------------|----------------|
| `POST` | `/api/workout/sessions` | user | `{ title, date, duration, intensity, notes, exercises[], workoutPlanId? }` | `{ success, session: WorkoutSession }` |
| `GET` | `/api/workout/sessions` | user | — | `{ success, sessions: WorkoutSession[] }` |
| `GET` | `/api/workout/sessions/user/:userId` | trainer/admin | — | `{ success, sessions: WorkoutSession[] }` |
| `GET` | `/api/workout/sessions/:sessionId` | user | — | `{ success, session: WorkoutSession }` |
| `PUT` | `/api/workout/sessions/:sessionId` | user | partial session fields | `{ success, session: WorkoutSession }` |
| `DELETE` | `/api/workout/sessions/:sessionId` | user | — | `{ success, message }` |
| `GET` | `/api/workout/progress` | user | — | `{ success, progress: { totalSessions, totalWeight, ... } }` |
| `GET` | `/api/workout/progress/:userId` | trainer/admin | — | same |
| `GET` | `/api/workout/statistics` | user | — | `{ success, statistics }` |
| `GET` | `/api/workout/recommendations` | user | — | `{ success, exercises: Exercise[] }` |

### 2b. Admin Workout Logging (`adminWorkoutLoggerRoutes.mjs`)

| Method | Path | Auth | Request Body | Response Shape |
|--------|------|------|-------------|----------------|
| `POST` | `/api/admin/clients/:clientId/workouts` | admin/trainer | `{ title, date, duration, intensity, exercises[{ name, sets, reps, weight, tempo?, rest? }], notes? }` | `{ success, workoutLog, xpAwarded? }` |
| `GET` | `/api/admin/clients/:clientId/workouts` | admin/trainer | — | `{ success, workoutLogs: WorkoutLog[] }` |

### 2c. Exercise Library (`exerciseRoutes.mjs`)

| Method | Path | Auth | Request Body | Response Shape |
|--------|------|------|-------------|----------------|
| `GET` | `/api/exercises/search` | trainer/admin | `?q=<term>&type=<type>&muscle=<group>` | `{ success, exercises: Exercise[] }` |
| `GET` | `/api/exercises/categories` | trainer/admin | — | `{ success, exerciseTypes[], muscleGroups[] }` |
| `GET` | `/api/exercises/:id` | trainer/admin | — | `{ success, exercise: Exercise }` |
| `GET` | `/api/exercises/recommended` | user | — | `{ success, exercises: Exercise[] }` (NASM-filtered) |

### 2d. AI Workout Generation (`aiRoutes.mjs`)

| Method | Path | Auth | Request Body | Response Shape |
|--------|------|------|-------------|----------------|
| `POST` | `/api/ai/workout-generation` | trainer/admin | `{ userId, masterPromptJson?, constraints?, nasmPhase? }` | `{ success, workoutPlan: { title, days[], exercises[] } }` |

**CRITICAL:** `masterPromptJson` is sent raw to OpenAI GPT-4 without PII redaction.

### 2e. Onboarding / Assessment (`onboardingRoutes.mjs`, `adminOnboardingRoutes.mjs`)

| Method | Path | Auth | Request Body | Response Shape |
|--------|------|------|-------------|----------------|
| `POST` | `/api/onboarding` | trainer/admin | 85-field questionnaire form data | `{ success, masterPromptJson, spiritName }` |
| `POST` | `/api/onboarding/self` | user | same | `{ success, masterPromptJson }` |
| `GET` | `/api/onboarding/:userId` | trainer/admin | — | `{ success, masterPromptJson }` |
| `POST` | `/api/admin/baseline-measurements` | admin | PAR-Q+, OHSA, postural, strength tests | `{ success, measurement: ClientBaselineMeasurements }` |
| `GET` | `/api/admin/baseline-measurements/:userId` | admin | — | `{ success, measurements[] }` |
| `POST` | `/api/admin/clients/:cid/onboarding` | admin/trainer | `{ responses, status }` | `{ success, questionnaire }` |
| `GET` | `/api/admin/clients/:cid/onboarding` | admin/trainer | — | `{ success, status, questionnaire }` |
| `DELETE` | `/api/admin/clients/:cid/onboarding` | admin | — | `{ success, message }` |

### 2f. Workout Plan Routes (`workoutPlanRoutes.mjs`) — Legacy/Secondary

Standard CRUD (`GET/POST/PUT/DELETE /`) + `POST /clone`, `POST /:id/archive`, `POST /:id/restore`. All Zod-validated, trainer/admin auth. Response: `{ success, plan: WorkoutPlan }`.

---

## 3. NASM Template & Versioning Matrix

### 3a. NASM Resources In-App

| NASM Resource | In-App Status | Model/Location | Notes |
|--------------|---------------|----------------|-------|
| PAR-Q+ (7-question screening) | COMPLETE | `ClientBaselineMeasurements.parqScreening` (JSONB) | 7 boolean fields |
| Overhead Squat Assessment (OHSA) | COMPLETE | `ClientBaselineMeasurements.overheadSquatAssessment` (JSONB) | 8 kinetic chain checkpoints |
| NASM Assessment Score | COMPLETE | `ClientBaselineMeasurements.nasmAssessmentScore` (0-100) | Computed via `calculateNASMScore()` static helper |
| Postural Assessment | COMPLETE | `ClientBaselineMeasurements.posturalAssessment` (JSONB) | Anterior/lateral/posterior views |
| CES 4-Phase Corrective Strategy | COMPLETE | `ClientBaselineMeasurements.correctiveExerciseStrategy` (JSONB) | Inhibit/Lengthen/Activate/Integrate |
| Performance Assessments | COMPLETE | `ClientBaselineMeasurements.performanceAssessments` (JSONB) | Push-up, sit-and-reach, single-leg squat, etc. |
| OPT Model (5-phase progression) | COMPLETE | `nasmProgressionService.mjs` (549 lines) | Stabilization/Strength Endurance/Hypertrophy/Max Strength/Power |
| OPT Phase Selection | COMPLETE | `selectOPTPhase()` static helper | Based on NASM score + primary goal |
| Medical Clearance Tracking | COMPLETE | `ClientBaselineMeasurements` fields | `medicalClearanceRequired/Date/Provider` |
| Exercise NASM Validation | COMPLETE | `hooks/useNASMValidation.ts` | Frontend hook for exercise protocol compliance |
| Daily Workout Form (NASM protocol) | COMPLETE | `DailyWorkoutForm` model + routes | JSONB formData: sets/reps/weight/RPE/form ratings/pain level |
| Single-Leg Squat Assessment | SCHEMA ONLY | Fields exist, no scoring logic | Needs scoring implementation |
| Push Assessment | SCHEMA ONLY | Fields exist, no scoring logic | Needs scoring implementation |
| Pull Assessment | MISSING | Not in current schema | Needs model + scoring |
| Davies Test | MISSING | Not in current schema | Needs model + scoring |
| Shark Skill Test | MISSING | Not in current schema | Needs model + scoring |
| YMCA 3-Min Step Test | MISSING | Not in current schema | Needs model + scoring |

### 3b. OPT Model Phase Parameters (from `nasmProgressionService.mjs`)

| Phase | Name | Reps | Sets | Tempo | Rest |
|-------|------|------|------|-------|------|
| 1 | Stabilization Endurance | 12-20 | 1-3 | 4/2/1 | 0-90s |
| 2 | Strength Endurance | 8-12 | 2-4 | 2/0/2 | 0-60s |
| 3 | Hypertrophy | 6-12 | 3-5 | 2/0/2 | 0-60s |
| 4 | Maximum Strength | 1-5 | 4-6 | X/0/X | 3-5m |
| 5 | Power | 1-10 | 3-5 | X/0/X | 3-5m |

### 3c. NASM Calculators

| Calculator | Status | Location |
|-----------|--------|----------|
| `calculateNASMScore(ohsa)` | Active | `ClientBaselineMeasurements.mjs` (static method) |
| `selectOPTPhase(score, goal)` | Active | `ClientBaselineMeasurements.mjs` (static method) |
| `generateCorrectiveStrategy(ohsa)` | Active | `ClientBaselineMeasurements.mjs` (static method) |
| Phase progression tracking | Active | `nasmProgressionService.mjs` |

### 3d. External Source Provenance

| NASM Resource | Source URL | Edition / Version | Checked |
|--------------|-----------|-------------------|---------|
| OPT Model (5-phase) | nasm.org/certified-personal-trainer/the-opt-model | CPT 7th Edition (updated at Optima 2020 — Phase 3 renamed "Muscular Development") | 2026-02-24 |
| OPT Model Updates | blog.nasm.org/new-opt-model-updates | 5 updates: fundamental movement, dynamic warmup, integrated CES, skill dev, client choice | 2026-02-24 |
| PAR-Q+ Screening | eparmedx.com (official), surrey.ca/ParQ-Plus-2024 | 2024 edition (maintained by PAR-Q+ Collaboration / CSEP) | 2026-02-24 |
| NASM CPT Textbook | ISBN 9781284200881 (7th ed.) | 7th Edition — "NASM Essentials of Personal Fitness Training" | 2026-02-24 |
| CES Protocol (4-phase) | Part of CPT 7th Edition curriculum | Inhibit → Lengthen → Activate → Integrate (NASM CES standard) | 2026-02-24 |
| NASM Fitness Calculators | nasm.org/resources (404 as of check date — page restructured) | N/A — calculators embedded in CPT materials | 2026-02-24 |

**Note:** NASM CPT 7th Edition is the current certification standard (2025-2026 exam cycle). Third-party study guides reference 2026-2027 materials. Our in-app OPT Model uses the original 5-phase naming (Phase 3 = "Hypertrophy" rather than the updated "Muscular Development") — this is a cosmetic gap, not a protocol error.

### 3e. Internal Versioning Strategy

- Onboarding questionnaire version tracked in `ClientOnboardingQuestionnaire.questionnaireVersion` (default: `'3.0'`)
- `masterPromptJson` follows v3.0 schema (declared in `onboardingController.mjs`)
- No formal versioning on NASM assessment protocols — relying on JSONB flexibility
- **Recommendation:** Add explicit protocol version fields when adding de-identification middleware

### 3g. NASM Template Gaps

1. **Workout Templates:** Phase-specific with exercise selection rules
2. **Progression Algorithms:** Auto-advance criteria from performance metrics
3. **Assessment Scoring:** Single-Leg Squat, Push, Pull scoring logic
4. **Periodization:** Mesocycle/microcycle planning with deload weeks
5. **Movement Prep:** Dynamic warmup per OPT phase
6. **Cooldown Templates:** Phase-appropriate flexibility protocols

### 3h. Exercise Library

- 13 seeded exercises via `seedExercises.mjs`
- 10 NASM exercise types: `core`, `balance`, `stability`, `flexibility`, `calisthenics`, `isolation`, `stabilizers`, `injury_prevention`, `injury_recovery`, `compound`
- Exercise model includes: `primaryMuscles`, `secondaryMuscles`, `equipmentNeeded`, `difficulty` (0-1000), `progressionPath`, `prerequisites`, `coachingCues`, `contraindicationNotes`, `safetyTips`, `unlockLevel`, `experiencePointsEarned`

---

## 4. Data Sensitivity Matrix

### 4a. Direct Identifiers (PII — Must NEVER reach LLM)

| Field | Model/Table | Classification |
|-------|------------|----------------|
| `fullName` / `firstName` / `lastName` | `Users` | Direct identifier |
| `email` | `Users` | Direct identifier |
| `phone` | `Users` (via masterPromptJson) | Direct identifier |
| `real_name` | `clients_pii` (raw SQL) | Direct identifier |
| `emergencyContact` | `Users` | Direct identifier |
| `masterPromptJson.client.name` | `Users.masterPromptJson` | Direct identifier (real name) |
| `masterPromptJson.client.contact.email` | `Users.masterPromptJson` | Direct identifier |
| `masterPromptJson.client.contact.phone` | `Users.masterPromptJson` | Direct identifier |

### 4b. Quasi-Identifiers (Caution — may re-identify in combination)

| Field | Model | Risk Level |
|-------|-------|-----------|
| `age` / `dateOfBirth` | `Users` / `masterPromptJson` | Medium (with gender + ZIP) |
| `gender` | `Users` / `masterPromptJson` | Medium |
| `bloodType` | `masterPromptJson` | Low-medium |
| `zipCode` / location | `masterPromptJson` | Medium-high |

### 4c. Health/Performance Data (PHI — Protected, needs consent)

| Field | Model | Notes |
|-------|-------|-------|
| `currentWeight` / `targetWeight` | `masterPromptJson`, `BodyMeasurement` | Longitudinal tracking |
| `bodyFatPercentage` | `ClientBaselineMeasurements`, `masterPromptJson` | |
| `healthConcerns` / `medications` | `Users`, `masterPromptJson` | Sensitive medical |
| `injuryNotes` / `painLevel` | `ClientBaselineMeasurements`, `DailyWorkoutForm` | |
| `parqScreening` results | `ClientBaselineMeasurements` | Medical screening |
| `nutritionPrefs` / diet data | `ClientOnboardingQuestionnaire`, `ClientNutritionPlan` | |
| `restingHeartRate` / `bloodPressure` | `ClientBaselineMeasurements` | Vital signs |
| Strength test results | `ClientBaselineMeasurements` | Bench/squat/deadlift/OHP/pull-ups |
| `rangeOfMotion` | `ClientBaselineMeasurements` | Joint measurements |
| `correctiveExerciseStrategy` | `ClientBaselineMeasurements` | Injury/rehab protocol |
| `physician` | `masterPromptJson` | Medical provider info |

### 4d. Operational / Training Data (Safe for LLM with consent)

| Field | Model | Notes |
|-------|-------|-------|
| `spiritName` | `Users`, `clients_pii` | Privacy alias — OK for LLM |
| `primaryGoal` | `ClientOnboardingQuestionnaire` | Training objective |
| `trainingTier` | `ClientOnboardingQuestionnaire` | Session frequency |
| `commitmentLevel` | `ClientOnboardingQuestionnaire` | 1-10 scale |
| `nasmAssessmentScore` | `ClientBaselineMeasurements` | Numeric only (0-100) |
| OPT Phase | Derived from progression service | Phase 1-5 label |
| Exercise performance (sets/reps/weight/RPE) | `WorkoutLog`, `Set`, `DailyWorkoutForm` | With de-identified user ref |
| Workout plan structure | `WorkoutPlan`, `WorkoutPlanDay` | Template data |
| `exerciseType`, `muscleGroups`, `difficulty` | `Exercise` | Reference data |

### 4e. Safe Derived Features (Can always send to LLM)

`spiritName`, `primaryGoal`, `nasmAssessmentScore` (0-100), `currentOPTPhase` (1-5), `trainingFrequency`, `daysActive`, `avgRPE` (1-10), `totalSessions`, `exercisePreferences` (categories), `fitnessLevel`, `sessionHistory` (dates/durations only), `progressTrends` (deltas), `equipmentAccess`

---

## 5. Compliance Pre-Assessment

### 5a. AI Provider BAA Status

| Provider | BAA Available? | Current Integration | PII Exposure Risk |
|----------|---------------|--------------------|--------------------|
| OpenAI GPT-4 | Enterprise BAA available | **ACTIVE** — `aiWorkoutController.mjs` sends raw masterPromptJson | **CRITICAL** — real name, email, phone, health data sent |
| Anthropic Claude | API BAA available | Configured in `MasterPromptModelManager.mjs`, not wired to masterPromptJson flow | LOW — not receiving PII currently |

### 5b. Current PII Transmission Path (CRITICAL FINDING)

```
Onboarding Form → onboardingController.transformQuestionnaireToMasterPrompt()
    → User.masterPromptJson (stored with real name, email, phone)
        → aiWorkoutController.generateWorkoutPlan()
            → buildPrompt(masterPromptJson, constraints)
                → JSON.stringify(masterPromptJson) ← FULL PII HERE
                    → openai.chat.completions.create({ messages: [{ content: prompt }] })
                        → OpenAI GPT-4 receives: real name, email, phone, health history
```

**The comment in `onboardingController.mjs` says "Will be REDACTED before AI processing" but NO redaction code exists.** This is the #1 priority fix.

### 5c. Data Retention & Deletion (Draft)

| Data | Retention | Method |
|------|-----------|--------|
| PII | Active + 30d post-deletion | Hard delete (Users + clients_pii) |
| PHI | Active + 90d post-deletion | Hard delete (ClientBaselineMeasurements, masterPromptJson) |
| Workout logs | Active + 1y | Anonymize (hash userId) |
| AI plans | Active + 90d | Hard delete |
| Analytics | 2y | Aggregate + anonymize |
| Consent records | 7y | Retain for audit |

**`PrivacyCompliance.deleteUserData()` is a mock.** Real deletion needs: Users cascade, clients_pii raw SQL delete, masterPromptJson purge, workout log anonymization, AI session revocation, 30-day GDPR/CCPA confirmation.

### 5e. Privacy Infrastructure Readiness

| Component | Ready | Gap |
|-----------|-------|-----|
| PIIManager | 60% | Not in AI pipeline |
| EthicalAIReview | 70% | Output-only, no pre-send |
| PrivacyCompliance | 50% | No AI consent, mock deletion |
| DataMinimization | 40% | No AI rules, no-op deletion |
| spiritName | 80% | Not substituted in AI prompts |
| MasterPromptModelManager | 70% | No fallback chain |
| PII-Safe Logger / RBAC | 90% | Active — no gap |

### 5f. Regulatory Status

| Regulation | Engineering Assessment | Gap | Notes |
|-----------|----------------------|-----|-------|
| HIPAA | Likely non-compliant without BAA | PHI sent to OpenAI without data processing agreement | Legal validation required — this is an engineering assessment, not a legal conclusion |
| GDPR Art.22 | Partial | No AI-specific consent or opt-out mechanism | Consent model needed before expanding AI features |
| CCPA | Partial | No AI data sharing disclosure to users | Disclosure language needed in privacy policy |
| NASM Scope of Practice | Aligned | Physician referral disclaimers present | No scope-of-practice violations identified |

### 5g. Questions for Legal Counsel

1. Does `masterPromptJson` PII → OpenAI require a formal DPA under GDPR Art. 28?
2. Is health/fitness data PHI (HIPAA) or PII-only (state law) given SwanStudios is not a covered entity?
3. Should consent be granular (AI coaching vs. analytics vs. social)?
4. Liability exposure for existing PII-to-OpenAI pipeline on data audit request?
5. Does `spiritName` aliasing meet HIPAA Safe Harbor if remaining direct identifiers are stripped?

---

## 6. Integration Recommendations

### 6a. NASM Resource Integration Approach

| Resource | Approach | Licensing Risk |
|----------|----------|---------------|
| OPT Model phase names | Use freely — publicly documented educational framework | None |
| PAR-Q+ screening questions | Use freely — public health screening tool (CSEP) | None |
| OHSA checkpoint names | Use generic anatomical terms, not NASM-specific naming | Low |
| CES protocol names (Inhibit/Lengthen/Activate/Integrate) | Use generic phases, cite NASM in docs only | Low |
| NASM exercise library content | Do NOT embed copyrighted exercise descriptions | High |
| NASM certification exam content | Do NOT include | High |
| NASM CPT textbook excerpts | Do NOT include | High |

### 6b. Licensing Guardrails

- Reference NASM concepts by generic biomechanical terms in code
- Use `exerciseType` ENUM values that map to NASM categories but use standard terminology
- Store NASM-specific protocol names in admin-facing labels only, not in client-facing UI or AI prompts
- Exercise descriptions must be original content, not copied from NASM materials
- Credit NASM methodology in documentation, not in marketing or client-facing features

---

## 7. AI Maturity Assessment

### 7a. Existing AI Infrastructure (13 components)

**Active (9):** `aiWorkoutController` (GPT-4), `MasterPromptModelManager` (multi-provider), `EthicalAIReview`, `EthicalAIPipeline`, `nasmProgressionService`, `workoutService`, `awardWorkoutXP`, `aiMonitoringRoutes` (in-memory), `masterPrompt/` routes, `piiSafeLogging`

**Partial / Stub (3):** `PIIManager` (detection only, not in AI pipeline), `PrivacyCompliance` (mostly mock), `DataMinimization` (mostly mock)

### 7b. Missing Components for Smart Workout Logger

| Component | Priority | Description |
|-----------|----------|-------------|
| De-identification Middleware | P0-CRITICAL | Strip PII from masterPromptJson before any LLM call |
| Consent Data Model | P0-CRITICAL | `AiPrivacyProfile` — per-user AI consent with granular toggles |
| Consent Withdrawal Handler | P0-CRITICAL | Revoke consent → stop AI processing, queue data purge |
| Provider Abstraction Layer | P1-HIGH | Unified interface for OpenAI/Anthropic/future providers with fallback |
| AI Context Builder (Prep Mode) | P1-HIGH | Build safe LLM context from de-identified data + NASM constraints |
| Session Mode Engine | P1-HIGH | Real-time workout tracking with in-session AI coaching |
| Feature Kill Switch | P1-HIGH | Runtime toggle to disable all AI features instantly |
| Audit Trail Service | P2-MEDIUM | Log all AI interactions (what was sent, what was received, consent state) |
| Rate Limiter (per-user AI) | P2-MEDIUM | Prevent abuse of AI generation endpoints |
| `ClientsPii` Sequelize Model | P2-MEDIUM | Replace raw SQL access with proper ORM model + access controls |

### 7c. Key Gap — PII in AI Pipeline

The single most critical finding: `masterPromptJson` is constructed with `client.name` (real name), `client.contact.email`, `client.contact.phone`, and full health history, then sent verbatim to OpenAI GPT-4 via `aiWorkoutController.mjs`. The code contains a comment "Will be REDACTED before AI processing" but **no redaction code exists**.

The `spiritName` system is already in place (`masterPromptJson.client.alias`) but the real name is never removed from `masterPromptJson.client.name` before transmission.

**Fix path:** Insert de-identification middleware between `masterPromptJson` retrieval and `buildPrompt()` call in `aiWorkoutController.mjs`. Replace `client.name` with `client.alias` (spiritName), strip `client.contact.*`, retain only safe derived features from Section 4e.

---

## 8. Risk Summary

| # | Severity | Risk | Impact | Mitigation |
|---|----------|------|--------|------------|
| 1 | **CRITICAL** | PII sent to OpenAI in production | Real names, emails, phones, health data transmitted to third-party AI | De-identification middleware (Phase 1 P0) |
| 2 | **HIGH** | No user consent model for AI processing | GDPR/CCPA violation risk — no record of user consent for AI data use | `AiPrivacyProfile` model (Phase 1) |
| 3 | **HIGH** | Privacy services are mock/stub | `PrivacyCompliance.deleteUserData()` and `DataMinimization` are no-ops | Wire to real implementations (Phase 2) |
| 4 | **HIGH** | `clients_pii` has no ORM model | Raw SQL access bypasses Sequelize hooks, RBAC, and audit logging | Create Sequelize model with access controls |
| 5 | **MEDIUM** | No AI feature kill switch | Cannot quickly disable AI features if PII breach detected | Runtime feature flag (Phase 1) |
| 6 | **MEDIUM** | Dual workout route systems | `workoutRoutes.mjs` and `workoutPlanRoutes.mjs` have overlapping functionality | Consolidate in Phase 2+ |
| 7 | **LOW** | AI monitoring uses in-memory storage | Metrics lost on server restart | Move to persistent storage in Phase 3 |
| 8 | **LOW** | No BAA signed with OpenAI | Health data sent without formal data processing agreement (legal review required) | Negotiate BAA or switch to BAA-covered provider |

---

## 9. Database Models & File Reference

> **Moved to companion doc:** `docs/qa/SMART-WORKOUT-LOGGER-APPENDICES.md`
> - Appendix A: 21 existing models + 7 new models needed (with phase assignments)
> - Appendix B: Phase 1 file modification and creation manifest
> - Appendix C: RBAC / Auth stack inventory

---

## 10. Recommended Phase A Execution Order

Based on this audit, the recommended implementation sequence is:

### Phase 1 — Privacy Foundation (MUST complete before any new AI features)
1. **De-identification middleware** — intercept `masterPromptJson` before LLM calls, strip PII, substitute `spiritName`
2. **`AiPrivacyProfile` model** — consent state per user with granular toggles
3. **Consent UI** — client-facing consent screen during onboarding
4. **`ClientsPii` Sequelize model** — replace raw SQL access
5. **AI kill switch** — runtime feature flag to disable all AI endpoints
6. **`AiInteractionLog` model** — audit trail for all AI API calls

### Phase 2 — Smart Workout Logger Core
7. **Prep Mode** — AI context builder using de-identified data + NASM constraints
8. **Session Mode** — real-time workout tracking with in-session AI suggestions
9. **Provider abstraction** — unified interface for OpenAI/Anthropic with fallback chain
10. **Wire de-identified context** to existing `aiWorkoutController.mjs`

### Phase 3 — Polish & Compliance
11. Wire `PrivacyCompliance.deleteUserData()` + `DataMinimization` to real implementations
12. Persistent AI monitoring (in-memory → database) + per-user rate limiting
13. Compliance reporting for GDPR/CCPA audit requests

---

> **Phase 0 COMPLETE** (repo audit + unauthenticated Playwright + authenticated Playwright infrastructure verified). Authenticated visual capture pending valid test credentials — see `SMART-WORKOUT-LOGGER-PLAYWRIGHT-EVIDENCE.md` for run command.
>
> All 6 deliverables: workflow audit (§1), endpoint inventory (§2), NASM matrix (§3), data sensitivity (§4), compliance (§5), integration recs (§6). Plus: AI maturity (§7), risks (§8), execution order (§10). Models/files in appendices doc.
>
> **Test baseline:** 407 tests passing, 23 files (2026-02-24)
