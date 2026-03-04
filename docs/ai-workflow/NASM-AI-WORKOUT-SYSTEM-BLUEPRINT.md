# SwanStudios NASM AI Workout Generation System — Full Blueprint

> **Purpose:** Give any AI assistant (Claude, GPT, Gemini) a complete understanding of how the NASM AI workout system works end-to-end: UI → Backend → AI Provider → Database. Includes navigation paths, click counts, architecture diagrams, and gap analysis.

---

## 1. SYSTEM ARCHITECTURE (High-Level)

```mermaid
graph TB
    subgraph "Frontend (React + styled-components)"
        A[Admin Dashboard Sidebar] --> B[Client Management Page]
        B --> C[Client Row Actions Menu]
        C --> D["Log Workout" Modal]
        C --> E["Generate AI Workout" Copilot Panel]
        C --> F["Record Measurement" Panel]
        C --> G["Weigh-In" Panel]
        B --> H[Body Map SVG]
        H --> I[Pain Entry Panel]

        J[Trainer Dashboard Sidebar] --> K[My Clients]
        K --> L[Enhanced Workout Logger]
        J --> M[Client Progress + Analytics]
        M --> N[Injury Risk Assessment]

        O[Client Dashboard Sidebar] --> P[NASM Client Dashboard]
        P --> Q[Today's Workout Card]
        P --> R[Corrective Homework Tracker]
        P --> S[Workout Logger]
    end

    subgraph "API Layer (Express + JWT)"
        D --> W1[POST /api/workouts/sessions]
        E --> W2[POST /api/ai/workout-generation]
        E --> W3[POST /api/ai/workout-generation/approve]
        E --> W4[POST /api/ai/long-horizon/generate]
        I --> W5[POST /api/pain-entries/:userId]
        F --> W6[POST /api/measurements/:userId]
    end

    subgraph "Backend Pipeline (18 Steps)"
        W2 --> P1[1. Auth + Kill Switch]
        P1 --> P2[2. Rate Limiter]
        P2 --> P3[3. RBAC Check]
        P3 --> P4[4. AI Consent Check]
        P4 --> P5[5. Resolve Master Prompt]
        P5 --> P6["6. De-Identify PII (FAIL-CLOSED)"]
        P6 --> P7[7. Build NASM Constraints]
        P7 --> P8[8. Fetch Active Pain Entries]
        P8 --> P9[9. Create Audit Log]
        P9 --> P10[10. Build AI Prompt]
        P10 --> P11[11. Route to AI Provider]
    end

    subgraph "AI Provider Failover Chain"
        P11 --> AI1[OpenAI GPT-4]
        AI1 -.->|fail| AI2[Anthropic Claude]
        AI2 -.->|fail| AI3[Google Gemini]
        AI3 -.->|fail| AI4[Venice Fallback]
        AI4 -.->|all fail| DEGRADE[Degraded Response]
    end

    subgraph "Output Validation"
        AI1 --> V1[12. PII Detection Scan]
        AI2 --> V1
        AI3 --> V1
        V1 --> V2[13. Zod Schema Validation]
        V2 --> V3[14. Rule-Engine Validation]
        V3 --> V4[15. Exercise Matching]
    end

    subgraph "Database (PostgreSQL + Sequelize)"
        V4 --> DB1[(WorkoutPlan)]
        DB1 --> DB2[(WorkoutPlanDay)]
        DB2 --> DB3[(WorkoutPlanDayExercise)]
        DB3 --> DB4[(Exercise Library)]
        W5 --> DB5[(ClientPainEntry)]
        DB5 --> P8
        W4 --> DB6[(LongTermProgramPlan)]
        DB6 --> DB7[(ProgramMesocycleBlock)]
        P9 --> DB8[(AiInteractionLog)]
    end
```

---

## 2. UI NAVIGATION — CLICK PATH MAP

```mermaid
graph LR
    LOGIN[Login Page] -->|1 click| DASH[Dashboard Home]

    subgraph "ADMIN PATH (4-5 clicks to AI generation)"
        DASH -->|1| A_SIDE[Admin Sidebar]
        A_SIDE -->|1| A_CLIENTS[Client Management]
        A_CLIENTS -->|1| A_ROW["Client Row → ⋮ Menu"]
        A_ROW -->|1| A_LOG["Log Workout (Modal)"]
        A_ROW -->|1| A_AI["Generate AI Workout (Copilot)"]
        A_ROW -->|1| A_MEAS["Record Measurement"]
        A_ROW -->|1| A_WEIGH["Weigh-In"]
        A_ROW -->|1| A_ONBOARD["Onboarding"]
        A_CLIENTS -->|click body| A_BMAP[Body Map SVG]
        A_BMAP -->|1 click region| A_PAIN[Pain Entry Panel]
    end

    subgraph "TRAINER PATH (3-4 clicks)"
        DASH -->|1| T_SIDE[Trainer Sidebar]
        T_SIDE -->|1| T_CLIENTS[My Clients]
        T_CLIENTS -->|1| T_CLIENT[Select Client]
        T_CLIENT -->|1| T_LOG[Workout Logger]
        T_SIDE -->|1| T_PROGRESS[Client Progress]
        T_PROGRESS -->|1| T_ANALYTICS[Analytics Tab]
        T_ANALYTICS -->|visible| T_INJURY[Injury Risk Assessment]
    end

    subgraph "CLIENT PATH (2-3 clicks)"
        DASH -->|1| C_SIDE[Client Sidebar]
        C_SIDE -->|1| C_PROGRESS[Progress / NASM Dashboard]
        C_PROGRESS -->|1| C_START["Start Workout Button"]
        C_PROGRESS -->|1| C_HOMEWORK["Start Homework Button"]
        C_PROGRESS -->|scroll| C_LOGGER[Workout Logger]
    end
```

### Click Count Summary

| Action | Role | Clicks from Login | Route |
|--------|------|-------------------|-------|
| View Dashboard | Any | 1 | `/dashboard/{role}/overview` |
| Open Client List | Admin | 2 | `/dashboard/admin/client-management` |
| Log a Workout | Admin | 4 | Client Mgmt → Row → Log Workout |
| **Generate AI Workout** | **Admin** | **4** | Client Mgmt → Row → Generate AI |
| Record Measurement | Admin | 4 | Client Mgmt → Row → Measurement |
| Open Body Map | Admin | 3+ | Client Mgmt → Body Map tab |
| **Log Pain Entry** | **Admin** | **5+** | Body Map → Click Region → Fill Form |
| View Client Progress | Admin | 2 | `/dashboard/admin/client-progress-tracking` |
| Log a Workout | Trainer | 3 | Sidebar → Log Workout |
| View Injury Risk | Trainer | 3 | Progress → Analytics tab |
| Start Today's Workout | Client | 3 | Sidebar → Progress → Start |
| Start Homework | Client | 3 | Sidebar → Progress → Start Homework |

---

## 3. AI WORKOUT GENERATION PIPELINE (Detailed 18-Step Flow)

```mermaid
sequenceDiagram
    participant Coach as Coach/Admin UI
    participant FE as Frontend Service
    participant MW as Middleware Chain
    participant CTRL as AI Controller
    participant DEIDENT as De-Identification
    participant NASM as NASM Constraint Builder
    participant PAIN as Pain Entry DB
    participant PROMPT as Prompt Builder
    participant ROUTER as Provider Router
    participant AI as AI Provider
    participant VALID as Output Validator
    participant DB as Database

    Coach->>FE: Click "Generate Workout Plan"
    FE->>MW: POST /api/ai/workout-generation
    Note over MW: Step 1: JWT Auth (protect)
    Note over MW: Step 2: Kill Switch check
    Note over MW: Step 3: Rate Limiter
    MW->>CTRL: Passes to controller

    Note over CTRL: Step 4: RBAC — can user generate for target?
    Note over CTRL: Step 5: AI Consent — has client consented?
    CTRL->>CTRL: Step 6: Resolve masterPromptJson
    CTRL->>DEIDENT: Step 7: De-identify payload (FAIL-CLOSED)
    DEIDENT-->>CTRL: Sanitized data (no PII)

    CTRL->>NASM: Step 8: Build server-derived constraints
    Note over NASM: Read ClientBaselineMeasurements
    Note over NASM: Map NASM score → OPT Phase (1-5)
    Note over NASM: Extract OHSA compensations
    Note over NASM: Build safety constraints
    NASM-->>CTRL: nasmConstraints object

    CTRL->>PAIN: Step 9: Fetch active pain entries
    PAIN-->>CTRL: Active injuries + restrictions

    CTRL->>DB: Step 10: Create AiInteractionLog (pending)

    CTRL->>PROMPT: Step 11: Build AI prompt
    Note over PROMPT: Inject NASM constraints
    Note over PROMPT: Inject pain restrictions
    Note over PROMPT: Inject recent progress data
    Note over PROMPT: Inject exercise library context
    PROMPT-->>CTRL: System + User messages

    CTRL->>ROUTER: Step 12: Route to AI provider
    ROUTER->>AI: Try OpenAI first
    alt OpenAI fails
        ROUTER->>AI: Try Anthropic
        alt Anthropic fails
            ROUTER->>AI: Try Gemini
            alt Gemini fails
                ROUTER->>AI: Try Venice
            end
        end
    end
    AI-->>ROUTER: Raw JSON response
    ROUTER-->>CTRL: { provider, model, rawText, tokenUsage }

    CTRL->>VALID: Step 13: PII detection scan
    Note over VALID: Reject if PII detected in output
    CTRL->>VALID: Step 14: Zod schema validation
    CTRL->>VALID: Step 15: Rule-engine validation
    VALID-->>CTRL: { ok, data, warnings }

    alt mode === "draft"
        CTRL-->>Coach: Return draft for review (NOT persisted)
    else mode === "finalize"
        CTRL->>DB: Step 16: Create WorkoutPlan
        CTRL->>DB: Step 17: Create WorkoutPlanDays
        CTRL->>DB: Step 18: Create WorkoutPlanDayExercises
        CTRL->>DB: Update AiInteractionLog (success)
        CTRL-->>Coach: Return plan + planId + warnings
    end
```

---

## 4. NASM OPT MODEL INTEGRATION

```mermaid
graph TD
    ASSESS[Client NASM Assessment Score] --> PHASE{OPT Phase Mapping}

    PHASE -->|Score 1-2| P1["Phase 1: Stabilization Endurance
    • 12-20 reps, 1-3 sets
    • Slow tempo (4-2-1-1)
    • Balance + core focus
    • Corrective exercises priority"]

    PHASE -->|Score 3-4| P2["Phase 2: Strength Endurance
    • 8-12 reps, 2-4 sets
    • Moderate tempo (2-0-2-1)
    • Supersets (stability + strength)
    • Progressive overload begins"]

    PHASE -->|Score 5-6| P3["Phase 3: Hypertrophy
    • 6-12 reps, 3-5 sets
    • Moderate tempo (2-0-2-0)
    • Muscle isolation splits
    • Volume-focused"]

    PHASE -->|Score 7-8| P4["Phase 4: Maximal Strength
    • 1-5 reps, 4-6 sets
    • Fast/explosive tempo (X-0-X-0)
    • Compound lifts priority
    • Heavy loading (85-100% 1RM)"]

    PHASE -->|Score 9-10| P5["Phase 5: Power
    • 1-5 reps, 3-5 sets
    • Explosive tempo
    • Plyometrics + heavy lifts
    • Superset: strength + power"]

    P1 --> CONSTRAINTS[Safety Constraints Built]
    P2 --> CONSTRAINTS
    P3 --> CONSTRAINTS
    P4 --> CONSTRAINTS
    P5 --> CONSTRAINTS

    CONSTRAINTS --> PROMPT[Injected into AI Prompt]
```

### NASM Constraint Object (Server-Derived)
```json
{
  "optPhase": 3,
  "phaseName": "hypertrophy",
  "repRange": "6-12",
  "setRange": "3-5",
  "tempoGuideline": "2-0-2-0",
  "restPeriod": "60-90s",
  "overheadSquatCompensations": {
    "anteriorView": ["knee_valgus", "foot_pronation"],
    "lateralView": ["excessive_forward_lean"]
  },
  "posturalDeviations": ["upper_crossed_syndrome"],
  "correctiveExerciseFocus": ["hip_flexor_release", "thoracic_extension"],
  "medicalClearanceRequired": false,
  "maxIntensityPct": 85,
  "movementRestrictions": ["avoid_overhead_press_until_thoracic_mobility_improves"]
}
```

---

## 5. PAIN / INJURY LOGGING SYSTEM

```mermaid
graph TD
    subgraph "Pain Entry Flow"
        BM[Body Map SVG] -->|Click anatomical region| PE[Pain Entry Panel Opens]
        PE --> F1[Pain Level: 1-10 slider]
        PE --> F2["Pain Type: sharp/dull/aching/burning/tingling/numbness/stiffness/throbbing"]
        PE --> F3["Side: left/right/center/bilateral"]
        PE --> F4[Client Description: free text]
        PE --> F5[Onset Date]
        PE --> F6["Aggravating Movements: multi-select chips"]
        PE --> F7["Relieving Factors: multi-select chips"]
        PE --> F8["Postural Syndrome: none/upper_crossed/lower_crossed"]
        PE --> F9["AI Guidance Notes: text → INJECTED INTO AI PROMPT"]
        PE --> F10["Trainer Notes (Private): text → NOT sent to AI"]

        F1 & F2 & F3 & F4 & F5 & F6 & F7 & F8 & F9 & F10 --> SAVE[Save Pain Entry]
        SAVE --> API["POST /api/pain-entries/:userId"]
        API --> DB[(ClientPainEntry table)]
    end

    subgraph "Pain → AI Integration"
        DB -->|Active entries fetched| BUILD[buildUnifiedContext]
        BUILD --> INJECT["Pain constraints injected into AI prompt:
        - Avoid aggravating movements
        - Suggest modifications
        - Note severity level
        - Apply corrective protocols"]
        INJECT --> AI_GEN[AI Workout Generation]
    end

    subgraph "40+ Body Regions"
        REGIONS["head, neck, left_shoulder, right_shoulder,
        left_upper_arm, right_upper_arm, left_forearm,
        right_forearm, chest, upper_back, mid_back,
        lower_back, left_hip, right_hip, left_quad,
        right_quad, left_hamstring, right_hamstring,
        left_knee, right_knee, left_calf, right_calf,
        left_ankle, right_ankle, left_foot, right_foot,
        left_wrist, right_wrist, left_elbow, right_elbow,
        left_rotator_cuff, right_rotator_cuff,
        left_IT_band, right_IT_band, left_glute,
        right_glute, abdomen, left_shin, right_shin..."]
    end
```

### NASM Corrective Exercise Protocol (4-Phase, from Pain Data)
```
INHIBIT   → SMR / Foam Rolling on overactive muscles
LENGTHEN  → Static/dynamic stretching on tight tissues
ACTIVATE  → Isolation exercises for underactive muscles
INTEGRATE → Functional compound movements
```

---

## 6. LONG-HORIZON PROGRAM GENERATION (3/6/12-Month Plans)

```mermaid
graph TD
    TRAINER[Trainer/Admin] -->|Select client + horizon| REQ["POST /api/ai/long-horizon/generate
    { userId, horizonMonths: 3|6|12, goalProfile }"]

    REQ --> BUILD[Long Horizon Context Builder]
    BUILD --> FETCH1[Fetch baseline measurements]
    BUILD --> FETCH2[Fetch active pain entries]
    BUILD --> FETCH3[Fetch recent workout history]
    BUILD --> FETCH4[Fetch body composition trends]

    FETCH1 & FETCH2 & FETCH3 & FETCH4 --> PROMPT[Build periodization prompt]

    PROMPT --> AI[AI Provider generates mesocycle blocks]

    AI --> PLAN["LongTermProgramPlan
    { planName, horizonMonths, summary, status: 'draft' }"]

    PLAN --> BLOCKS["ProgramMesocycleBlock[] (sequential)"]

    BLOCKS --> B1["Block 1: Stabilization (Weeks 1-4)
    OPT Phase 1, 3x/week
    Entry: Assessment complete
    Exit: Stability tests passed"]

    BLOCKS --> B2["Block 2: Strength Endurance (Weeks 5-8)
    OPT Phase 2, 3x/week
    Entry: Phase 1 exit criteria met
    Exit: Strength benchmarks met"]

    BLOCKS --> B3["Block 3: Hypertrophy (Weeks 9-12)
    OPT Phase 3, 4x/week
    Entry: Phase 2 exit criteria met
    Exit: Volume targets achieved"]

    BLOCKS --> BN["...additional blocks for 6/12-month"]

    PLAN -->|Coach reviews| APPROVE["POST /api/ai/long-horizon/approve"]
    APPROVE --> ACTIVE["Status: 'active'
    Individual workout generation
    follows mesocycle constraints"]
```

---

## 7. DATABASE SCHEMA (Workout + AI Section)

```mermaid
erDiagram
    Users ||--o{ ClientBaselineMeasurements : has
    Users ||--o{ ClientPainEntry : has
    Users ||--o{ BodyMeasurement : has
    Users ||--o{ WorkoutPlan : has
    Users ||--o{ WorkoutSession : has
    Users ||--o{ LongTermProgramPlan : has
    Users ||--o{ AiInteractionLog : generates
    Users ||--o{ AiConsentLog : consents
    Users ||--o{ ClientTrainerAssignment : assigned_to

    WorkoutPlan ||--o{ WorkoutPlanDay : contains
    WorkoutPlanDay ||--o{ WorkoutPlanDayExercise : contains
    WorkoutPlanDayExercise }o--|| Exercise : references

    WorkoutSession ||--o{ WorkoutLog : contains

    LongTermProgramPlan ||--o{ ProgramMesocycleBlock : contains

    ClientPainEntry {
        int userId FK
        string bodyRegion
        string side
        int painLevel
        string painType
        string description
        date onsetDate
        boolean isActive
        string aggravatingMovements
        string relievingFactors
        string trainerNotes
        string aiNotes
        string posturalSyndrome
        jsonb assessmentFindings
    }

    WorkoutPlan {
        int userId FK
        string planName
        string status
        int durationWeeks
        string sourceType
        int aiGenerationRequestId
    }

    WorkoutPlanDay {
        int planId FK
        int dayNumber
        string name
        string focus
        string dayType
        int estimatedDuration
    }

    WorkoutPlanDayExercise {
        int dayId FK
        int exerciseId FK
        string setScheme
        string repGoal
        int restPeriod
        string tempo
        string intensityGuideline
        string notes
        boolean isOptional
    }

    LongTermProgramPlan {
        int userId FK
        int horizonMonths
        string status
        string planName
        jsonb goalProfile
        string sourceType
        date startsOn
        date endsOn
    }

    ProgramMesocycleBlock {
        int planId FK
        int sequence
        string nasmFramework
        int optPhase
        string phaseName
        string focus
        int durationWeeks
        int sessionsPerWeek
        string entryCriteria
        string exitCriteria
    }

    AiInteractionLog {
        int userId FK
        string provider
        string model
        string requestType
        string status
        jsonb tokenUsage
        string payloadHash
        string promptVersion
    }
```

---

## 8. RBAC AUTHORIZATION MATRIX

| Operation | Client | Trainer | Admin |
|-----------|:------:|:-------:|:-----:|
| View own workout progress | ✅ | — | — |
| Start assigned workout | ✅ | — | — |
| Complete homework | ✅ | — | — |
| View assigned client data | — | ✅ | ✅ |
| Log workout for client | — | ✅ | ✅ |
| Generate AI workout plan | — | ✅ (assigned) | ✅ (all) |
| Approve AI draft | — | ✅ (assigned) | ✅ (all) |
| Generate long-horizon plan | — | ✅ (assigned) | ✅ (all) |
| Create pain entry | ✅ (own) | ✅ (assigned) | ✅ (all) |
| View pain entries | ✅ (own) | ✅ (assigned) | ✅ (all) |
| Resolve pain entry | — | ✅ (assigned) | ✅ (all) |
| Delete pain entry | — | — | ✅ |
| Record measurements | — | ✅ (assigned) | ✅ (all) |
| View injury risk assessment | — | ✅ | ✅ |

---

## 9. KEY FILES REFERENCE

### Frontend
| Component | Path | Purpose |
|-----------|------|---------|
| WorkoutCopilotPanel | `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx` | AI generation UI with draft→approve flow |
| WorkoutLoggerModal | `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutLoggerModal.tsx` | Manual workout logging modal |
| WorkoutLogger | `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` | Standalone workout logger component |
| MobileWorkoutLogger | `frontend/src/components/WorkoutLogger/MobileWorkoutLogger.tsx` | Mobile-optimized variant |
| BodyMapSVG | `frontend/src/components/BodyMap/BodyMapSVG.tsx` | Interactive SVG body with front/back views |
| PainEntryPanel | `frontend/src/components/BodyMap/PainEntryPanel.tsx` | Slide-out pain entry form |
| bodyRegions | `frontend/src/components/BodyMap/bodyRegions.ts` | 40+ body region definitions |
| NASMClientDashboard | `frontend/src/components/Client/NASM/NASMClientDashboard.tsx` | Client-facing NASM workout dashboard |
| InjuryRiskAssessment | `frontend/src/components/TrainerDashboard/ClientProgress/Analytics/InjuryRiskAssessment.tsx` | Trainer analytics view |
| AdminClientManagementView | `frontend/src/components/DashBoard/Pages/admin-clients/AdminClientManagementView.tsx` | Admin client management (triggers modals) |
| aiWorkoutService | `frontend/src/services/aiWorkoutService.ts` | Typed API service for AI generation |
| painEntryService | `frontend/src/services/painEntryService.ts` | Typed API service for pain CRUD |

### Backend
| Component | Path | Purpose |
|-----------|------|---------|
| aiWorkoutController | `backend/controllers/aiWorkoutController.mjs` | 18-step workout generation pipeline |
| longHorizonController | `backend/controllers/longHorizonController.mjs` | 3/6/12-month plan generation |
| painEntryController | `backend/controllers/painEntryController.mjs` | Pain CRUD with RBAC |
| aiRoutes | `backend/routes/aiRoutes.mjs` | AI endpoint routing + middleware |
| painEntryRoutes | `backend/routes/painEntryRoutes.mjs` | Pain endpoint routing |
| workoutRoutes | `backend/routes/workoutRoutes.mjs` | 19 workout endpoints |
| providerRouter | `backend/services/ai/providerRouter.mjs` | Multi-provider failover (OpenAI → Claude → Gemini → Venice) |
| promptBuilder | `backend/services/ai/promptBuilder.mjs` | AI prompt construction |
| contextBuilder | `backend/services/ai/contextBuilder.mjs` | Unified context (NASM + pain + progress) |
| deIdentificationService | `backend/services/ai/deIdentificationService.mjs` | PII removal (FAIL-CLOSED) |
| outputValidator | `backend/services/ai/outputValidator.mjs` | Response validation pipeline |
| ClientPainEntry | `backend/models/ClientPainEntry.mjs` | Pain entry schema (40+ body regions) |
| WorkoutPlan | `backend/models/WorkoutPlan.mjs` | Generated plan record |
| LongTermProgramPlan | `backend/models/LongTermProgramPlan.mjs` | Periodization master plan |
| ProgramMesocycleBlock | `backend/models/ProgramMesocycleBlock.mjs` | Individual mesocycle blocks |
| AiInteractionLog | `backend/models/AiInteractionLog.mjs` | Full audit trail |

---

## 10. GAP ANALYSIS — WEAKEST LINKS

### 🔴 CRITICAL GAPS

| Gap | Impact | Current State | What's Missing |
|-----|--------|---------------|----------------|
| **Pain Entry UI not wired into Client Management flow** | Trainers may not log injuries before generating workouts | BodyMap + PainEntryPanel exist as components but aren't prominently surfaced in AdminClientManagementView action menu | Need a "Log Injury/Pain" button in client row actions (same level as "Log Workout") |
| **No pain entry reminder before AI generation** | AI may generate plans without knowing about new injuries | WorkoutCopilotPanel doesn't check for recent pain entries or prompt trainer | Add pre-generation check: "This client has X active pain entries. Review before generating?" |
| **Client cannot self-report pain** | Clients must wait for trainer to log pain | PainEntry routes require admin/trainer role for creation | Add client-facing pain self-report with trainer approval workflow |
| **No real-time notification when AI plan completes** | Trainers may sit waiting on generation screen | No WebSocket/SSE for async notification | Add push notification when generation completes |

### 🟡 MODERATE GAPS

| Gap | Impact | Current State | What's Missing |
|-----|--------|---------------|----------------|
| **5+ clicks to log pain** | Friction reduces injury tracking compliance | Body Map → Click Region → Fill Form → Save | Surface pain logger as 1st-class action in client row menu (3 clicks) |
| **No pain history visualization** | Can't track pain trends over time | Pain entries stored but no timeline/chart view | Add pain trend chart (severity over time, per body region) |
| **Injury Risk Assessment disconnected from Pain Entries** | InjuryRiskAssessment uses its own data, not live ClientPainEntry records | Two separate systems with overlapping concerns | Feed live ClientPainEntry data into InjuryRiskAssessment component |
| **No AI generation from Trainer dashboard** | Trainers must use Admin path | WorkoutCopilotPanel only accessible from AdminClientManagementView | Wire Copilot into TrainerDashboard → My Clients view |
| **Long-horizon plan UI incomplete** | No dedicated frontend for 3/6/12-month plan generation | Backend endpoints exist, frontend service types defined, but no UI page | Build LongHorizonPlanBuilder page with mesocycle visualization |
| **No exercise library browser for clients** | Clients see exercise names but can't look up proper form | Exercise model exists but no client-facing exercise detail pages | Add exercise detail modal with video/image demos |

### 🟢 NICE-TO-HAVE

| Gap | Impact | What's Missing |
|-----|--------|----------------|
| AI token cost tracking dashboard | Can't monitor AI spend | Admin widget showing token usage per provider per day |
| Bulk workout generation | Can't generate for class groups | Batch endpoint for multiple clients |
| A/B testing AI providers | Can't compare quality | Feature flag for splitting traffic between providers |
| Workout plan sharing | Clients can't share results socially | Integration with social feed (post workout plan to community) |
| Voice-to-pain entry | Mobile friction for injury reporting | Speech-to-text for pain description field |

### 🗺️ Click Path Optimization Targets

```
CURRENT (worst case):
Login → Dashboard → Sidebar → Client Mgmt → Find Client → ⋮ Menu → Action = 6 clicks

OPTIMIZED (proposed):
Login → Dashboard → Quick Actions Bar → [Log Workout | AI Workout | Log Pain | Measurement] = 3 clicks

Key insight: The dashboard overview page should have a "Quick Actions"
widget showing recent/assigned clients with 1-click action buttons.
```

---

## 11. ENVIRONMENT VARIABLES

```bash
# AI Provider Keys (multi-provider failover)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
VENICE_API_KEY=...

# Kill Switch
AI_WORKOUT_GENERATION_ENABLED=true  # Set to 'false' to disable all AI generation

# Database
DATABASE_URL=postgres://...

# JWT
JWT_SECRET=...
```

---

## 12. EXAMPLE API CALLS

### Generate AI Workout (Draft Mode)
```bash
POST /api/ai/workout-generation
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "userId": 42,
  "masterPromptJson": {
    "client": { "name": "John Smith" },
    "goals": { "primary": "strength_building" },
    "package": { "tier": "premium" }
  },
  "mode": "draft"
}
```

### Create Pain Entry
```bash
POST /api/pain-entries/42
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "bodyRegion": "right_shoulder",
  "side": "right",
  "painLevel": 6,
  "painType": "sharp",
  "description": "Sharp pain during overhead press at 90° abduction",
  "onsetDate": "2026-02-28",
  "aggravatingMovements": "overhead_press,lateral_raise",
  "relievingFactors": "ice,rest",
  "posturalSyndrome": "upper_crossed",
  "aiNotes": "Avoid overhead movements. Substitute with landmine press.",
  "trainerNotes": "Possible rotator cuff impingement. Refer to PT if not improving in 2 weeks."
}
```

### Generate Long-Horizon Plan
```bash
POST /api/ai/long-horizon/generate
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "userId": 42,
  "horizonMonths": 3,
  "goalProfile": {
    "primaryGoal": "weight_loss",
    "secondaryGoals": ["core_stability", "improved_posture"],
    "constraints": ["right_shoulder_injury"]
  }
}
```

---

*Generated: 2026-03-04 | Based on full codebase analysis of SwanStudios SS-PT*
