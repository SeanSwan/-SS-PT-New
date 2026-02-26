# Phase 5B -- Frontend Integration Contract

**Created:** 2026-02-25
**Patched:** 2026-02-25 (aligned examples with live backend shapes)
**Purpose:** Exact JSON request/response shapes + UI state machine for the Coach Copilot frontend.

**Source of truth:** Backend handlers + services. If this doc and the code disagree, the code wins.

---

## 1. Endpoints

### 1.1 GET /api/ai/templates

**Purpose:** Fetch available NASM templates for template selector.

**Request:**
```
GET /api/ai/templates?status=active&includeSchema=true
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "count": 7,
  "registryVersion": "4a-1.0.0",
  "templates": [
    {
      "id": "opt-phase-1-stabilization",
      "label": "OPT Phase 1: Stabilization Endurance",
      "category": "programming",
      "status": "active",
      "nasmFramework": "OPT",
      "optPhase": 1,
      "supportsAiContext": true,
      "templateVersion": "1.0.0",
      "schemaVersion": "1.0.0",
      "tags": ["opt", "stabilization", "phase1", "beginner"],
      "enabledFor": {
        "prepMode": true,
        "sessionMode": true,
        "aiDrafting": true
      },
      "source": {
        "provider": "NASM",
        "framework": "NASM OPT Model",
        "edition": "7th Edition"
      },
      "schema": { "/* Zod-compatible exercise schema -- trainer/admin only */" : true }
    }
  ]
}
```

**Active template IDs (current registry):**
- `opt-phase-1-stabilization`
- `opt-phase-2-strength-endurance`
- `opt-phase-3-hypertrophy`
- `opt-phase-4-maximal-strength`
- `opt-phase-5-power`
- `ces-corrective-strategy`
- `parq-plus-screening`

**Notes:**
- `includeSchema=true` is silently stripped for client role (returns metadata only, no `schema` field)
- Use `status=active` (default) to exclude deprecated templates
- Without `includeSchema=true`, the `schema` field is omitted from each entry

---

### 1.2 POST /api/ai/workout-generation (Draft Mode)

**Purpose:** Generate a draft workout plan for coach review.

**Request:**
```json
{
  "userId": 56,
  "mode": "draft"
}
```
```
POST /api/ai/workout-generation
Authorization: Bearer <token>
Content-Type: application/json
```

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| userId | number | Yes | Target client ID |
| mode | string | Yes (`"draft"`) | Must be `"draft"` for copilot flow |
| masterPromptJson | object | No | Override; defaults to user's stored profile |

---

#### Response: Draft Success (200)

```json
{
  "success": true,
  "draft": true,
  "plan": {
    "planName": "Hypertrophy Phase -- 4-Week Progressive",
    "durationWeeks": 4,
    "summary": "Progressive overload program targeting...",
    "days": [
      {
        "dayNumber": 1,
        "name": "Upper Body Push",
        "focus": "Chest, Shoulders, Triceps",
        "dayType": "training",
        "estimatedDuration": 60,
        "exercises": [
          {
            "name": "Bench Press",
            "setScheme": "4x8-10",
            "repGoal": "8-10",
            "restPeriod": 90,
            "tempo": "3-1-2-0",
            "intensityGuideline": "75-80% 1RM",
            "notes": "Focus on controlled eccentric",
            "isOptional": false
          }
        ]
      }
    ]
  },
  "generationMode": "progress_aware",
  "explainability": {
    "dataSources": ["client_profile", "nasm_baseline", "template_registry", "workout_history"],
    "phaseRationale": "OPT phase \"hypertrophy\" selected based on NASM assessment score 12 and primary goal \"hypertrophy\".",
    "progressFlags": ["Bench Press showing 5.7% increase over 2 weeks"],
    "safetyFlags": [],
    "dataQuality": "Full data available from all sources."
  },
  "safetyConstraints": {
    "medicalClearanceRequired": false,
    "maxIntensityPct": 100,
    "movementRestrictions": []
  },
  "exerciseRecommendations": [
    {
      "exerciseName": "Bench Press",
      "totalSets": 12,
      "bestWeight": 195,
      "bestReps": 8,
      "avgRpe": 7.5,
      "estimated1RM": 247,
      "loadRecommendation": {
        "minLoad": 185,
        "maxLoad": 210,
        "targetReps": "6-12",
        "explanation": "Hypertrophy phase: moderate-to-heavy load with moderate reps to maximize muscle growth through mechanical tension and metabolic stress."
      }
    }
  ],
  "warnings": [
    "Bench Press showing 5.7% increase over 2 weeks"
  ],
  "missingInputs": [],
  "provider": "openai",
  "auditLogId": 142
}
```

**`explainability.dataSources` possible values:**
- `"client_profile"` -- de-identified client data present
- `"nasm_baseline"` -- NASM assessment / OPT phase present
- `"template_registry"` -- template context resolved
- `"workout_history"` -- recent session data present

**`explainability.dataQuality` possible values (string, not object):**
- `"Full data available from all sources."`
- `"Partial data: no workout history available. Recommendations based on NASM baseline only."`
- `"Partial data: no NASM baseline. OPT phase and safety constraints not applied."`
- `"Limited data: no workout history and no NASM baseline. Generation will use client profile only."`
- `"Critical: no client profile available. Generation not possible."`

**`generationMode` possible values:**
- `"full"` -- all 4 data sources present
- `"template_guided"` -- template + profile, no workout history
- `"progress_aware"` -- workout history present (with or without template)
- `"basic"` -- profile only, no NASM or history
- `"unavailable"` -- no client profile

---

#### Response: Degraded Mode (200)

When all AI providers fail, the endpoint returns HTTP 200 with `degraded: true`.

```json
{
  "success": true,
  "degraded": true,
  "code": "AI_DEGRADED_MODE",
  "message": "AI providers are temporarily unavailable. You can use manual templates or wait for AI to recover.",
  "fallback": {
    "type": "manual_template_only",
    "templateSuggestions": [
      { "id": "opt-1-stabilization", "label": "OPT Phase 1: Stabilization Endurance", "category": "OPT" },
      { "id": "opt-3-hypertrophy", "label": "OPT Phase 3: Hypertrophy Training", "category": "OPT" },
      { "id": "general-beginner", "label": "General Fitness: Beginner", "category": "GENERAL" }
    ],
    "reasons": ["OpenAI: request timed out", "Anthropic: rate limit exceeded", "Gemini: service unavailable"]
  },
  "failoverTrace": ["openai -> timeout", "anthropic -> rate_limit", "gemini -> unavailable"]
}
```

**Note:** `fallback.templateSuggestions` uses legacy alias IDs (from `degradedResponse.mjs`), not registry IDs. These are stable API-level identifiers.

---

#### Error Responses

| HTTP | Code | Trigger | UI Action |
|------|------|---------|-----------|
| 401 | -- | No/invalid token | Redirect to login |
| 403 | `AI_CONSENT_MISSING` | Client hasn't granted AI consent | Show consent CTA |
| 403 | `AI_CONSENT_DISABLED` | AI features disabled | Show consent CTA |
| 403 | `AI_CONSENT_WITHDRAWN` | Consent withdrawn | Show re-consent CTA |
| 403 | -- | Trainer not assigned to client | Show "not assigned" message |
| 403 | -- | Client trying to generate for another user | Show access denied |
| 400 | -- | Missing/invalid userId | Form validation error |
| 404 | -- | User not found / no master prompt | Show profile incomplete message |
| 429 | `AI_RATE_LIMITED` | All providers rate-limited | Show retry-later message |
| 502 | `AI_CONFIG_ERROR` | Provider auth misconfiguration | Show "contact support" |
| 422 | `AI_PII_LEAK` | PII detected in AI output | Show privacy error, retry |
| 422 | `AI_VALIDATION_ERROR` | AI output failed validation | Show retry message |
| 502 | `AI_PARSE_ERROR` | AI returned non-JSON | Show retry message |

---

### 1.3 POST /api/ai/workout-generation/approve

**Purpose:** Persist a coach-reviewed (optionally edited) draft.

**Request:**
```json
{
  "userId": 56,
  "plan": {
    "planName": "Hypertrophy Phase -- 4-Week Progressive",
    "durationWeeks": 4,
    "summary": "Progressive overload program...",
    "days": [
      {
        "dayNumber": 1,
        "name": "Upper Body Push",
        "exercises": [
          {
            "name": "Bench Press",
            "setScheme": "4x8-10",
            "repGoal": "8-10",
            "restPeriod": 90,
            "tempo": "3-1-2-0",
            "intensityGuideline": "75-80% 1RM",
            "notes": "Coach edit: start lighter week 1",
            "isOptional": false
          }
        ]
      }
    ]
  },
  "auditLogId": 142,
  "trainerNotes": "Reduced initial volume for first week ramp-up"
}
```
```
POST /api/ai/workout-generation/approve
Authorization: Bearer <token>
Content-Type: application/json
```

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| userId | number | Yes | Target client ID |
| plan | object | Yes | Full plan object (may be coach-edited) |
| plan.planName | string | Yes | Non-empty, trimmed |
| plan.days | array | Yes | At least 1 day, each with at least 1 exercise |
| auditLogId | number | No | Links approval to original draft audit entry |
| trainerNotes | string | No | Coach rationale for edits |

---

#### Response: Approve Success (200)

```json
{
  "success": true,
  "planId": 89,
  "sourceType": "coach_approved",
  "summary": "Workout plan approved and saved",
  "unmatchedExercises": [
    { "dayNumber": 2, "name": "Cable Flye Variation X" }
  ],
  "validationWarnings": [
    { "code": "EXCESSIVE_EXERCISES", "field": "days[2].exercises", "message": "Day \"Leg Day\" has 22 exercises (recommended max: 20)" }
  ]
}
```

---

#### Approve Error Responses

| HTTP | Code | Trigger | UI Action |
|------|------|---------|-----------|
| 401 | -- | No/invalid token | Redirect to login |
| 403 | -- | Client role attempted approval | Show "coaches only" |
| 403 | -- | Trainer not assigned | Show "not assigned" |
| 403 | `AI_CONSENT_*` | Consent missing/disabled/withdrawn | Show consent CTA |
| 400 | -- | Missing userId or plan | Form validation |
| 404 | -- | Target user doesn't exist | Show user not found |
| 422 | `APPROVED_DRAFT_INVALID` | Draft fails validation | Show field-level errors from `errors[]` |
| 422 | -- | No exercises matched library | Show unmatched list, suggest corrections |

**422 validation error body:**
```json
{
  "success": false,
  "message": "Approved draft validation failed",
  "code": "APPROVED_DRAFT_INVALID",
  "errors": [
    { "code": "MISSING_DRAFT_TITLE", "field": "planName", "message": "Draft title (planName) is required" },
    { "code": "INVALID_EXERCISE_LIST", "field": "days[0].exercises[2].name", "message": "Exercise at days[0].exercises[2] is missing a name" }
  ],
  "warnings": []
}
```

---

## 2. UI State Machine

```
+--------------------------------------------------------------+
|                     COACH COPILOT FLOW                        |
+--------------------------------------------------------------+
|                                                               |
|  +---------+    select     +------------+                     |
|  |  IDLE   |-------------->|  CLIENT    |                     |
|  |         |   client      |  SELECTED  |                     |
|  +---------+               +-----+------+                     |
|                                  |                            |
|                          generate draft                       |
|                                  |                            |
|                                  v                            |
|                          +---------------+                    |
|                          |  GENERATING   | (loading spinner)  |
|                          +-------+-------+                    |
|                                  |                            |
|               +------------------+------------------+         |
|               v                  v                  v         |
|     +-------------+   +----------------+   +------------+    |
|     |  DRAFT      |   |  DEGRADED      |   |  ERROR     |    |
|     |  REVIEW     |   |  (manual mode) |   |  (retry?)  |    |
|     +------+------+   +--------+-------+   +------------+    |
|            |                   |                              |
|     edit exercises     select template                        |
|            |            (future: fill from template)           |
|            v                                                  |
|     +-------------+                                           |
|     |  APPROVING  | (loading)                                 |
|     +------+------+                                           |
|            |                                                  |
|      +-----+------+                                           |
|      v            v                                           |
|  +--------+  +----------+                                     |
|  | SAVED  |  | APPROVE  |                                     |
|  | (done) |  | ERROR    |                                     |
|  +--------+  +----------+                                     |
|                                                               |
+--------------------------------------------------------------+
```

### State Definitions

| State | Trigger | UI Shows | Data Held |
|-------|---------|----------|-----------|
| **IDLE** | Component mount | Client selector, "Generate" disabled | -- |
| **CLIENT_SELECTED** | Client picked from dropdown | "Generate Draft" enabled, template selector visible | `userId` |
| **GENERATING** | "Generate Draft" clicked | Loading spinner, disabled controls | `userId` |
| **DRAFT_REVIEW** | 200 `draft: true` response | Plan editor, explainability panel, warnings, "Approve" button | `plan`, `explainability`, `safetyConstraints`, `exerciseRecommendations`, `warnings`, `auditLogId` |
| **DEGRADED** | 200 `degraded: true` response | "AI unavailable" message, template suggestions list, "Build Manually" CTA | `fallback.templateSuggestions`, `fallback.reasons` |
| **ERROR** | 4xx/5xx response | Error message, retry button (if retryable), consent CTA (if 403) | `error.code`, `error.message` |
| **APPROVING** | "Approve" clicked | Loading spinner, disabled controls | edited `plan`, `auditLogId`, `trainerNotes` |
| **SAVED** | 200 from /approve | Success banner with planId, "View Plan" link, unmatched exercise warnings | `planId`, `unmatchedExercises`, `validationWarnings` |
| **APPROVE_ERROR** | 4xx from /approve | Error detail, field-level issues (422), retry | `errors[]`, `warnings[]` |

### Error -> Retry Mapping

| Error Code | Retryable? | UI Action |
|------------|------------|-----------|
| `AI_CONSENT_*` | No | Link to consent management |
| `AI_RATE_LIMITED` | Yes (after delay) | "Try again in a moment" + auto-retry timer |
| `AI_DEGRADED_MODE` | Yes | "Retry" button + manual fallback |
| `AI_PII_LEAK` | Yes | "Regenerate" button |
| `AI_PARSE_ERROR` | Yes | "Regenerate" button |
| `AI_VALIDATION_ERROR` | Yes | "Regenerate" button |
| `AI_CONFIG_ERROR` | No | "Contact support" |
| `APPROVED_DRAFT_INVALID` | No (fix first) | Show field errors in editor |
| 403 (not assigned) | No | "You are not assigned to this client" |

---

## 3. Draft Editor -- Field Editability

| Field | Editable? | Validation |
|-------|-----------|------------|
| `planName` | Yes | Required, non-empty, max 200 chars |
| `summary` | Yes | Optional, max 2000 chars |
| `durationWeeks` | Yes | 1-52 integer |
| `days[].name` | Yes | Required, max 100 chars |
| `days[].focus` | Yes | Optional, max 200 chars |
| `days[].estimatedDuration` | Yes | 5-300 minutes |
| `exercises[].name` | Yes | Required, non-empty, max 200 chars |
| `exercises[].setScheme` | Yes | Optional, max 100 chars |
| `exercises[].repGoal` | Yes | Optional, max 100 chars |
| `exercises[].restPeriod` | Yes | 0-600 seconds |
| `exercises[].tempo` | Yes | Optional, max 50 chars |
| `exercises[].intensityGuideline` | Yes | Optional, max 500 chars |
| `exercises[].notes` | Yes | Optional, max 1000 chars |
| `exercises[].isOptional` | Yes | Boolean toggle |

**Not editable by coach (display only):**
- `generationMode`
- `explainability` (read-only panel)
- `safetyConstraints` (read-only badges)
- `exerciseRecommendations` (read-only reference)
- `auditLogId` (hidden, passed through)
- `provider` (hidden)

---

## 4. Component Hierarchy (Recommended)

```
WorkoutCopilotPanel
+-- ClientSelector          (dropdown, search)
+-- TemplateSelector        (optional, from GET /templates)
+-- GenerateButton          (disabled until client selected)
+-- DraftReviewPanel        (shown in DRAFT_REVIEW state)
|   +-- PlanHeader          (planName, summary, durationWeeks -- editable)
|   +-- DayEditor[]         (per day -- name, focus, duration -- editable)
|   |   +-- ExerciseRow[]   (per exercise -- all fields editable)
|   +-- ExplainabilityPanel (read-only: dataSources, phaseRationale, flags)
|   +-- SafetyBadges        (read-only: intensity cap, restrictions)
|   +-- WarningsList        (read-only: progressFlags + safetyFlags)
|   +-- TrainerNotesInput   (free text)
+-- DegradedFallback        (shown in DEGRADED state)
|   +-- TemplateSuggestionList
|   +-- RetryButton
+-- ErrorDisplay            (shown in ERROR / APPROVE_ERROR state)
|   +-- ConsentCTA          (if 403 consent)
|   +-- RetryButton         (if retryable)
+-- ApproveButton           (disabled during APPROVING)
+-- SavedConfirmation       (shown in SAVED state)
    +-- PlanIdLink
    +-- UnmatchedExerciseWarnings
```

---

## 5. Double-Submit Prevention

```typescript
// In the component:
const [isSubmitting, setIsSubmitting] = useState(false);

const handleApprove = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);
  try {
    const result = await approveDraft({ userId, plan: editedPlan, auditLogId, trainerNotes });
    setState('SAVED');
  } catch (err) {
    setState('APPROVE_ERROR');
  } finally {
    setIsSubmitting(false);
  }
};
```

Both "Generate Draft" and "Approve" buttons must disable during their respective loading states.

---

## 6. Coach-Only Visibility Rules

| Data | Visible To | Reason |
|------|-----------|--------|
| `explainability` | trainer, admin | Coach decision context |
| `safetyConstraints` | trainer, admin | Safety awareness |
| `exerciseRecommendations` | trainer, admin | 1RM/load data |
| `warnings` | trainer, admin | Progress/safety flags |
| `auditLogId` | admin only | Audit trail reference |
| `provider` | admin only | Debugging info |
| `failoverTrace` | admin only | Provider debugging |
| `plan` (the draft itself) | trainer, admin | Coach review surface |

Clients should NEVER see explainability, safety constraints, or 1RM data directly.

---

## 7. API Service Functions (Frontend)

```typescript
// frontend/src/services/aiWorkoutService.ts

export interface DraftGenerateRequest {
  userId: number;
  mode: 'draft';
}

export interface Explainability {
  dataSources: string[];
  phaseRationale: string;
  progressFlags: string[];
  safetyFlags: string[];
  dataQuality: string;
}

export interface SafetyConstraints {
  medicalClearanceRequired: boolean;
  maxIntensityPct: number;
  movementRestrictions: string[];
}

export interface LoadRecommendation {
  minLoad: number;
  maxLoad: number;
  targetReps: string;
  explanation: string;
}

export interface ExerciseRecommendation {
  exerciseName: string;
  totalSets: number;
  bestWeight: number;
  bestReps: number;
  avgRpe: number;
  estimated1RM: number;
  loadRecommendation: LoadRecommendation | null;
}

export interface Exercise {
  name: string;
  setScheme?: string | null;
  repGoal?: string | null;
  restPeriod?: number | null;
  tempo?: string | null;
  intensityGuideline?: string | null;
  notes?: string | null;
  isOptional?: boolean | null;
}

export interface WorkoutDay {
  dayNumber: number;
  name: string;
  focus?: string | null;
  dayType?: string;
  estimatedDuration?: number | null;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  planName: string;
  durationWeeks: number;
  summary?: string;
  days: WorkoutDay[];
}

export interface DraftGenerateResponse {
  success: true;
  draft: true;
  plan: WorkoutPlan;
  generationMode: 'full' | 'template_guided' | 'progress_aware' | 'basic' | 'unavailable';
  explainability: Explainability;
  safetyConstraints: SafetyConstraints;
  exerciseRecommendations: ExerciseRecommendation[];
  warnings: string[];
  missingInputs: string[];
  provider: string;
  auditLogId: number | null;
}

export interface TemplateSuggestion {
  id: string;
  label: string;
  category: string;
}

export interface DegradedResponse {
  success: true;
  degraded: true;
  code: 'AI_DEGRADED_MODE';
  message: string;
  fallback: {
    type: 'manual_template_only';
    templateSuggestions: TemplateSuggestion[];
    reasons: string[];
  };
  failoverTrace: string[];
}

export interface ValidationError {
  code: string;
  field?: string;
  message: string;
}

export interface ApproveRequest {
  userId: number;
  plan: WorkoutPlan;
  auditLogId?: number;
  trainerNotes?: string;
}

export interface ApproveResponse {
  success: true;
  planId: number;
  sourceType: 'coach_approved';
  summary: string;
  unmatchedExercises: Array<{ dayNumber: number; name: string }>;
  validationWarnings: ValidationError[];
}

// Type discrimination for generate response:
export type GenerateResponse = DraftGenerateResponse | DegradedResponse;

export function isDegraded(resp: GenerateResponse): resp is DegradedResponse {
  return 'degraded' in resp && resp.degraded === true;
}
```
