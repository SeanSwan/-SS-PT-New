# Client Onboarding Flow - Architecture & API Design (Part 1)
**Version:** 1.0
**Created:** 2026-01-15
**Phase:** Phase 1.1 - Client Onboarding Blueprint
**Purpose:** Define user journey, API sequences, database relationships, and RBAC for client onboarding system
**Part:** 1 of 2
**Scope:** User journey flow, API sequence diagrams, state machines

---

## Table of Contents
1. [User Journey Flow](#user-journey-flow)
2. [API Sequence Diagrams](#api-sequence-diagrams)
3. [State Machine](#state-machine)

---

## User Journey Flow

### High-Level Client Onboarding Journey

```mermaid
graph TB
    Start([New Client Signs Up]) --> Purchase[Purchase Package]
    Purchase --> Pricing{Package Type?}

    Pricing -->|Express 30<br/>$110/session| ExpressPlan[Express 30 Plan]
    Pricing -->|Signature 60 Standard<br/>$175/session| StandardPlan[Signature 60 Standard]
    Pricing -->|Signature 60 AI<br/>$200/session| AIPlan[Signature 60 AI Data Package]
    Pricing -->|Transformation Pack<br/>$1,600/10 sessions| TransformPlan[Transformation Pack]

    ExpressPlan --> OnboardingStart[Start Onboarding Process]
    StandardPlan --> OnboardingStart
    AIPlan --> OnboardingStart
    TransformPlan --> OnboardingStart

    OnboardingStart --> Questionnaire[Complete 85-Question<br/>Onboarding Questionnaire]
    Questionnaire --> QuestionnaireSubmit[Submit Questionnaire<br/>POST /api/onboarding/:userId/questionnaire]

    QuestionnaireSubmit --> QuestionnaireComplete{Questionnaire<br/>100% Complete?}
    QuestionnaireComplete -->|No| Questionnaire
    QuestionnaireComplete -->|Yes| ParqScreening[Complete PAR-Q+ Screening]
    ParqScreening --> ClearanceRequired{Medical Clearance Required?}
    ClearanceRequired -->|Yes| MedicalClearance[Collect Medical Clearance]
    ClearanceRequired -->|No| ScheduleMovement[Schedule Movement Screen]
    MedicalClearance --> ScheduleMovement

    ScheduleMovement --> MovementScreen[10-Minute NASM OHSA<br/>Movement Screen]
    MovementScreen --> MovementSubmit[Submit NASM Assessment<br/>POST /api/onboarding/:userId/movement-screen]

    MovementSubmit --> DashboardRedirect[Redirect to Client Dashboard]
    DashboardRedirect --> Dashboard[Revolutionary Client Dashboard]

    Dashboard --> LoadOverview[Load Client Data Overview<br/>GET /api/client-data/overview/:userId]
    LoadOverview --> DisplayData[Display: Questionnaire Status,<br/>NASM Score, Measurements,<br/>Nutrition Plan, Photos, Notes]

    DisplayData --> OnboardingComplete([Onboarding Complete])

    style Start fill:#e1f5e1
    style OnboardingComplete fill:#e1f5e1
    style Questionnaire fill:#fff3cd
    style MovementScreen fill:#fff3cd
    style Dashboard fill:#d1ecf1
```

### Detailed Questionnaire Flow (85 Questions, 13 Sections)

```mermaid
graph LR
    Start([Begin Questionnaire]) --> Section1[Section 1:<br/>Personal Info]
    Section1 --> Section2[Section 2:<br/>Goals & Package]
    Section2 --> Section3[Section 3:<br/>Health History]
    Section3 --> Section4[Section 4:<br/>Medications]
    Section4 --> Section5[Section 5:<br/>Nutrition Preferences]
    Section5 --> Section6[Section 6:<br/>Lifestyle & Schedule]
    Section6 --> Section7[Section 7:<br/>Fitness Experience]
    Section7 --> Section8[Section 8:<br/>Injury History]
    Section8 --> Section9[Section 9:<br/>Movement Limitations]
    Section9 --> Section10[Section 10:<br/>Training Preferences]
    Section10 --> Section11[Section 11:<br/>Accountability]
    Section11 --> Section12[Section 12:<br/>Success Metrics]
    Section12 --> Section13[Section 13:<br/>Additional Notes]
    Section13 --> Submit[Submit All Responses]

    Submit --> APICall[POST /api/onboarding/:userId/questionnaire]
    APICall --> Extract[Auto-Extract Indexed Fields]
    Extract --> Save[Save to Database]
    Save --> Complete([Questionnaire Complete])

    style Start fill:#e1f5e1
    style Complete fill:#e1f5e1
    style Submit fill:#d1ecf1
    style APICall fill:#d1ecf1
```

---

## API Sequence Diagrams

### 1. Create Questionnaire Response

```mermaid
sequenceDiagram
    participant Client as Client (Browser)
    participant Frontend as React App
    participant API as Express API
    participant Auth as Auth Middleware
    participant RBAC as RBAC Middleware
    participant Controller as Onboarding Controller
    participant DB as PostgreSQL

    Client->>Frontend: Submit questionnaire form
    Frontend->>Frontend: Validate 85 questions complete
    Frontend->>API: POST /api/onboarding/:userId/questionnaire<br/>{questionnaireVersion, responses}

    API->>Auth: protect() - Verify JWT
    Auth->>Auth: Check token validity
    Auth-->>API: User authenticated (req.user set)

    API->>RBAC: authorize('admin', 'trainer', 'client')
    RBAC->>RBAC: Check user role
    RBAC-->>API: Role authorized

    API->>Controller: createQuestionnaire(req, res)
    Controller->>Controller: Extract userId from params
    Controller->>Controller: Check RBAC:<br/>Admin = any client<br/>Trainer = assigned only<br/>Client = self only

    alt Client accessing another user
        Controller-->>API: 403 Forbidden
        API-->>Frontend: Error: Cannot access another user
        Frontend-->>Client: Show error message
    else Authorized
        Controller->>Controller: Auto-extract indexed fields:<br/>- primaryGoal<br/>- trainingTier<br/>- commitmentLevel<br/>- healthRisk<br/>- nutritionPrefs
        Controller->>DB: INSERT INTO client_onboarding_questionnaires<br/>(userId, responsesJson, primaryGoal, etc.)
        DB-->>Controller: Questionnaire created (id: 1)
        Controller->>Controller: Calculate completion % (100%)
        Controller-->>API: {success: true, questionnaire: {...}}
        API-->>Frontend: 201 Created
        Frontend-->>Client: Show success + redirect to dashboard
    end
```

### 2. Get Questionnaire

```mermaid
sequenceDiagram
    participant Client as Client Dashboard
    participant Frontend as React App
    participant API as Express API
    participant Auth as Auth Middleware
    participant RBAC as RBAC Middleware
    participant Controller as Onboarding Controller
    participant DB as PostgreSQL

    Client->>Frontend: Load onboarding status
    Frontend->>API: GET /api/onboarding/:userId/questionnaire

    API->>Auth: protect() - Verify JWT
    Auth-->>API: User authenticated

    API->>RBAC: authorize('admin', 'trainer', 'client')
    RBAC-->>API: Role authorized

    API->>Controller: getQuestionnaire(req, res)
    Controller->>Controller: Check RBAC (admin/trainer/client access)

    alt Authorized
        Controller->>DB: SELECT * FROM client_onboarding_questionnaires<br/>WHERE userId = :userId<br/>ORDER BY createdAt DESC<br/>LIMIT 1
        DB-->>Controller: Questionnaire data
        Controller->>Controller: Include responsesJson + indexed fields
        Controller-->>API: {success: true, questionnaire: {...}}
        API-->>Frontend: 200 OK
        Frontend->>Frontend: Display completion percentage
        Frontend->>Frontend: Display primary goal, training tier
        Frontend-->>Client: Show onboarding status
    else Unauthorized
        Controller-->>API: 403 Forbidden
        API-->>Frontend: Error response
        Frontend-->>Client: Access denied
    end
```

### 3. Create Movement Screen Assessment

```mermaid
sequenceDiagram
    participant Trainer as Trainer/Admin
    participant Frontend as Admin Dashboard
    participant API as Express API
    participant Auth as Auth Middleware
    participant RBAC as RBAC Middleware
    participant Controller as Onboarding Controller
    participant DB as PostgreSQL

    Trainer->>Frontend: Complete NASM OHSA assessment for client
    Frontend->>Frontend: Record OHSA compensations (none/minor/significant)<br/>- Feet turnout/flattening<br/>- Knee valgus/varus<br/>- Excessive forward lean/low back arch<br/>- Arms fall forward/forward head
    Frontend->>Frontend: Capture PAR-Q+ results, postural assessment,<br/>performance tests, flexibility notes, injury notes
    Frontend->>API: POST /api/onboarding/:userId/movement-screen<br/>{parqScreening, overheadSquatAssessment,<br/>posturalAssessment, performanceAssessments,<br/>flexibilityNotes, injuryNotes, painLevel}

    API->>Auth: protect() - Verify JWT
    Auth-->>API: User authenticated

    API->>RBAC: authorize('admin', 'trainer')
    RBAC->>RBAC: Check user role

    alt Client role
        RBAC-->>API: 403 Forbidden (clients cannot self-assess)
        API-->>Frontend: Error: Only trainers can create movement screens
        Frontend-->>Trainer: Show error
    else Admin or Trainer
        RBAC-->>API: Authorized
        API->>Controller: createMovementScreen(req, res)
        Controller->>Controller: Calculate NASM score + OPT phase<br/>Generate corrective exercise strategy
        Controller->>DB: INSERT INTO client_baseline_measurements<br/>(userId, parqScreening, overheadSquatAssessment,<br/>nasmAssessmentScore, posturalAssessment,<br/>performanceAssessments, correctiveExerciseStrategy, etc.)
        DB-->>Controller: Movement screen created
        Controller-->>API: {success: true, movementScreen: {...}}
        API-->>Frontend: 201 Created
        Frontend-->>Trainer: Show success + NASM score + OPT phase
    end
```

### 4. Get Client Data Overview (Dashboard Aggregation)

```mermaid
sequenceDiagram
    participant Client as Client Dashboard
    participant Frontend as React Component
    participant API as Express API
    participant Auth as Auth Middleware
    participant RBAC as RBAC Middleware
    participant Controller as Onboarding Controller
    participant DB as PostgreSQL

    Client->>Frontend: Load RevolutionaryClientDashboard
    Frontend->>API: GET /api/client-data/overview/:userId

    API->>Auth: protect() - Verify JWT
    Auth-->>API: User authenticated

    API->>RBAC: authorize('admin', 'trainer', 'client')
    RBAC-->>API: Role authorized

    API->>Controller: getClientDataOverview(req, res)
    Controller->>Controller: Check RBAC access

    par Aggregate Data from 6 Tables
        Controller->>DB: SELECT * FROM client_onboarding_questionnaires<br/>WHERE userId = :userId
        DB-->>Controller: Questionnaire data

        Controller->>DB: SELECT * FROM client_baseline_measurements<br/>WHERE userId = :userId<br/>ORDER BY createdAt DESC LIMIT 1
        DB-->>Controller: Latest measurements

        Controller->>DB: SELECT * FROM client_nutrition_plans<br/>WHERE userId = :userId AND status = 'active'
        DB-->>Controller: Active nutrition plan

        Controller->>DB: SELECT COUNT(*) FROM client_photos<br/>WHERE userId = :userId
        DB-->>Controller: Photos count

        Controller->>DB: SELECT COUNT(*) FROM client_notes<br/>WHERE userId = :userId
        DB-->>Controller: Notes count
    end

    Controller->>Controller: Build overview object:<br/>- onboardingStatus<br/>- movementScreen<br/>- baselineMeasurements<br/>- nutritionPlan<br/>- progressPhotos<br/>- trainerNotes

    Controller-->>API: {success: true, overview: {...}}
    API-->>Frontend: 200 OK
    Frontend->>Frontend: Update dashboard UI with real data
    Frontend-->>Client: Display complete onboarding overview
```

---


## State Machine

### Questionnaire Status Flow

```mermaid
stateDiagram-v2
    [*] --> draft: Client starts questionnaire
    draft --> draft: Save partial progress
    draft --> submitted: Complete all 85 questions
    submitted --> reviewed: Trainer/Admin reviews
    reviewed --> [*]: Onboarding complete

    submitted --> draft: Request changes

    note right of draft
        Status: draft
        completionPercentage: 0-99%
        Indexed fields: NULL
    end note

    note right of submitted
        Status: submitted
        completionPercentage: 100%
        Indexed fields: AUTO-EXTRACTED
        submittedAt: timestamp
    end note

    note right of reviewed
        Status: reviewed
        Trainer has acknowledged
        Movement screen scheduled
    end note
```

### Movement Screen Status Flow

```mermaid
stateDiagram-v2
    [*] --> pending: Questionnaire submitted
    pending --> scheduled: Book movement screen session
    scheduled --> in_progress: Trainer begins assessment
    in_progress --> completed: Submit OHSA compensations
    completed --> [*]: NASM score saved to baseline_measurements

    scheduled --> cancelled: Client reschedules
    cancelled --> scheduled: Rebook session

    note right of pending
        No movement screen record
        Client sees "Schedule Movement Screen" CTA
    end note

    note right of completed
        NASM assessment score: 0-100
        OHSA data saved (JSONB)
        parqScreening, correctiveStrategy populated
    end note
```

### Onboarding Completion Flow

```mermaid
stateDiagram-v2
    [*] --> incomplete: New client signup

    incomplete --> questionnaire_only: Questionnaire submitted
    questionnaire_only --> complete: Movement screen completed

    complete --> dashboard_active: Redirect to dashboard
    dashboard_active --> [*]: Client onboarding complete

    note right of incomplete
        Onboarding status: 0%
        Show "Complete Your Profile" banner
    end note

    note right of questionnaire_only
        Onboarding status: 50%
        Show "Schedule Movement Screen" CTA
    end note

    note right of complete
        Onboarding status: 100%
        All data available for AI workout generation
    end note
```

---

