# Phase 5C — Long-Horizon Planning Engine (Appendix)
**Parent:** `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT.md`
**Contains:** Full JSON examples, TypeScript interfaces, detailed test plan, UI state details, files list

---

## B1. Endpoint JSON Examples

### B1.1 POST /api/ai/long-horizon-plan/generate — Request

```json
{
  "userId": 56,
  "horizonMonths": 6,
  "goalProfile": {
    "primaryGoal": "hypertrophy",
    "secondaryGoals": ["strength"],
    "constraints": ["No overhead pressing with left shoulder"]
  },
  "preferences": {
    "sessionsPerWeek": 4,
    "sessionDurationMinutes": 60,
    "preferredSplit": "upper_lower"
  }
}
```

### B1.2 POST /api/ai/long-horizon-plan/generate — Draft Success (200)

```json
{
  "success": true,
  "draft": true,
  "plan": {
    "planName": "6-Month Hypertrophy Progression Program",
    "horizonMonths": 6,
    "summary": "Progressive overload program spanning 6 months...",
    "goalProfile": {
      "primaryGoal": "hypertrophy",
      "secondaryGoals": ["strength"],
      "constraints": ["No overhead pressing with left shoulder"]
    },
    "blocks": [
      {
        "sequence": 1,
        "nasmFramework": "OPT",
        "optPhase": 1,
        "phaseName": "Stabilization Endurance Foundation",
        "focus": "Movement quality, joint stability, muscular endurance",
        "durationWeeks": 4,
        "sessionsPerWeek": 4,
        "entryCriteria": "Baseline assessment complete, PAR-Q+ cleared",
        "exitCriteria": "Stable form on compound movements, adherence >80%",
        "rationale": "Starting with Phase 1 stabilization to establish movement foundations."
      },
      {
        "sequence": 2,
        "nasmFramework": "OPT",
        "optPhase": 2,
        "phaseName": "Strength Endurance Bridge",
        "focus": "Superset training, increased volume tolerance",
        "durationWeeks": 4,
        "sessionsPerWeek": 4,
        "entryCriteria": "Phase 1 exit criteria met",
        "exitCriteria": "Volume tolerance demonstrated, RPE manageable",
        "rationale": "Bridging to hypertrophy through progressive volume increase."
      }
    ]
  },
  "generationMode": "progress_aware",
  "explainability": {
    "dataSources": ["client_profile", "nasm_baseline", "workout_history", "progression_trends"],
    "phaseRationale": "Starting at OPT Phase 1 based on recent assessment...",
    "progressFlags": ["Bench press volume trend: increasing (+12% over 8 weeks)"],
    "safetyFlags": ["Left shoulder restriction: no overhead pressing"],
    "dataQuality": "Full data available from all sources.",
    "trendInfluences": [
      "Adherence rate 85% — supports 4x/week programming",
      "Load progression trends support hypertrophy phase readiness"
    ]
  },
  "safetyConstraints": {
    "medicalClearanceRequired": false,
    "maxIntensityPct": 85,
    "movementRestrictions": ["No overhead pressing with left shoulder"]
  },
  "warnings": [],
  "missingInputs": [],
  "provider": "openai",
  "auditLogId": 200
}
```

### B1.3 POST /api/ai/long-horizon-plan/approve — Request

```json
{
  "userId": 56,
  "plan": {
    "planName": "6-Month Hypertrophy Progression Program",
    "horizonMonths": 6,
    "summary": "Progressive overload program spanning 6 months...",
    "goalProfile": {
      "primaryGoal": "hypertrophy",
      "secondaryGoals": ["strength"],
      "constraints": ["No overhead pressing with left shoulder"]
    },
    "blocks": [
      {
        "sequence": 1,
        "nasmFramework": "OPT",
        "optPhase": 1,
        "phaseName": "Stabilization Endurance Foundation",
        "focus": "Movement quality, joint stability",
        "durationWeeks": 4,
        "sessionsPerWeek": 4,
        "entryCriteria": "Baseline assessment complete",
        "exitCriteria": "Stable form on compounds, adherence >80%",
        "notes": "Coach note: extend to 5 weeks if needed"
      }
    ]
  },
  "auditLogId": 200,
  "trainerNotes": "Adjusted Phase 1 duration based on client history"
}
```

### B1.4 Approve Success (200)

```json
{
  "success": true,
  "planId": 15,
  "sourceType": "ai_assisted_edited",
  "summary": "Long-horizon plan approved and saved",
  "blockCount": 6,
  "warnings": []
}
```

### B1.5 GET /api/program-plans/:clientId — Response (200)

```json
{
  "success": true,
  "plans": [
    {
      "id": 15,
      "planName": "6-Month Hypertrophy Progression Program",
      "horizonMonths": 6,
      "status": "active",
      "sourceType": "ai_assisted_edited",
      "createdAt": "2026-02-25T10:00:00Z",
      "approvedAt": "2026-02-25T10:05:00Z",
      "blockCount": 6
    }
  ],
  "count": 1
}
```

---

## B2. Long-Horizon Context Builder — TypeScript Interface

```typescript
interface LongHorizonContext {
  // Reused from existing builders
  clientProfile: DeIdentifiedProfile;
  nasmAssessment: NasmAssessmentSummary;
  recentWorkouts: WorkoutHistorySummary;
  intensityData: IntensitySnapshot;

  // New long-horizon fields
  progressionTrends: {
    period: '4w' | '8w' | '12w';
    metrics: Array<{
      exercise: string;
      volumeTrend: 'increasing' | 'stable' | 'decreasing';
      loadTrend: 'increasing' | 'stable' | 'decreasing';
      repTrend: 'increasing' | 'stable' | 'decreasing';
      dataPoints: number;
    }>;
  };

  adherence: {
    scheduledSessions: number;
    completedSessions: number;
    adherenceRate: number;       // 0-1
    consistencyFlags: string[];  // e.g., "missed 3+ consecutive sessions"
  };

  fatigueTrends: {
    avgRpe4w: number | null;
    avgRpe8w: number | null;
    trend: 'increasing' | 'stable' | 'decreasing' | 'insufficient_data';
  };

  injuryRestrictions: {
    active: Array<{
      area: string;
      type: string;
      since: string;             // ISO date
    }>;
    resolved: Array<{
      area: string;
      resolvedOn: string;
    }>;
  };

  goalProgress: {
    primaryGoal: string;
    milestones: Array<{
      label: string;
      achieved: boolean;
      achievedOn: string | null;
    }>;
  };

  bodyComposition: {
    available: boolean;
    trend: 'improving' | 'stable' | 'regressing' | 'insufficient_data';
    dataPoints: number;
  } | null;
}
```

---

## B3. Detailed Test Plan

### B3.1 Backend Unit Tests — 5C-A (Models)
- Create `LongTermProgramPlan` with valid data → success
- Create with invalid `horizonMonths` → validation error
- Create `ProgramMesocycleBlock` with FK to plan → success
- Delete plan → cascade deletes blocks
- Unique constraint on `planId` + `sequence`

### B3.2 Backend Unit Tests — 5C-B (Context Builder)
- Client with full data → returns complete `LongHorizonContext`
- Client with no workout history → trends return `insufficient_data`
- Client with no assessment → `nasmAssessment` is null/empty
- **Security test:** Output contains no PII fields (email, phone, name)
- De-identification pipeline called (mock verification)

### B3.3 Backend Unit Tests — 5C-C (Generation Endpoint)
- Happy path: admin generates draft → 200 with plan + blocks
- Happy path: trainer generates draft for assigned client → 200
- Consent not granted → 403 `AI_CONSENT_MISSING`
- Trainer not assigned → 403 `AI_ASSIGNMENT_DENIED`
- Invalid horizon → 400 `INVALID_HORIZON`
- Missing goal profile → 400 `MISSING_GOAL_PROFILE`
- AI degraded → 200 with `degraded: true`
- Rate limited → 429 `AI_RATE_LIMITED`
- PII leak detected in output → 422 `AI_PII_LEAK`
- Kill switch active → 503
- **RBAC test:** Client role → 403
- **Ordering test:** Consent checked AFTER assignment, BEFORE AI call

### B3.4 Backend Unit Tests — 5C-D (Approval Endpoint)
- Happy path: approve draft → creates plan + blocks in DB
- Invalid plan (no blocks) → 422
- Invalid block sequence → 422
- Consent re-check fails → 403
- Assignment re-check fails → 403
- **RBAC test:** Client role → 403
- Plan ID returned matches DB record

### B3.5 Frontend Unit Tests — 5C-E
- Configure plan form: horizon selection, goal dropdown, validation
- Generate → plan review: blocks render with framework badges
- Plan review → approve → saved: happy path
- Degraded mode: shows degraded UI (reuses existing pattern)
- Error states: consent, assignment, retryable errors
- Double-submit prevention on generate and approve
- Block editing: expand/collapse, edit fields

### B3.6 Integration / Smoke Tests
- Full flow: configure → generate → review → approve → verify DB records
- Degraded flow: all providers fail → degraded → UI handles gracefully
- Assignment denial: unassigned trainer → 403 → correct UI message
- **Privacy regression:** De-identification pipeline called on context builder
- **Audit regression:** AiInteractionLog created for long-horizon generation

---

## B4. UI State Machine Details (5C-E)

### CONFIGURE_PLAN State — Form Fields

| Field | Control | Validation |
|-------|---------|------------|
| Horizon | Radio: 3 / 6 / 12 months | Required |
| Primary Goal | Dropdown: strength, hypertrophy, weight_loss, endurance, flexibility | Required |
| Secondary Goals | Multi-select checkboxes | Optional |
| Sessions/Week | Number input (1-7) | Optional, default from client profile |
| Session Duration | Number input (15-180 min) | Optional |
| Additional Constraints | Text area | Optional |

### Plan Review Additions
- Block timeline visualization (sequence of blocks with duration bars)
- Per-block expand/collapse with edit capability
- NASM framework badge on each block (OPT Phase 1, CES, etc.)
- Entry/exit criteria displayed
- Coach notes per block

### Reuse Strategy
Same pattern as Phase 5B.1:
- Admin surface first (extend `WorkoutCopilotPanel` with a "Long-Horizon" tab/mode)
- Trainer surface gets it for free (same component, same reuse pattern from `MyClientsView`)

---

## B5. Files Touched (Estimated)

### New Files
- `backend/models/LongTermProgramPlan.mjs`
- `backend/models/ProgramMesocycleBlock.mjs`
- `backend/migrations/YYYYMMDDHHMMSS-create-long-term-program-tables.cjs`
- `backend/services/ai/longHorizonContextBuilder.mjs`
- `backend/tests/unit/longHorizonContextBuilder.test.mjs`
- `backend/tests/unit/longHorizonGeneration.test.mjs`
- `backend/tests/unit/longHorizonApproval.test.mjs`

### Modified Files
- `backend/controllers/aiWorkoutController.mjs` — new handlers
- `backend/routes/aiRoutes.mjs` — new route registrations
- `backend/models/index.mjs` — register new models + associations
- `frontend/src/services/aiWorkoutService.ts` — new types + service methods
- `frontend/src/components/.../WorkoutCopilotPanel.tsx` — long-horizon tab/mode
- `frontend/src/components/.../WorkoutCopilotPanel.test.tsx` — new tests
- `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md` — status update

---

**END OF PHASE 5C APPENDIX**
