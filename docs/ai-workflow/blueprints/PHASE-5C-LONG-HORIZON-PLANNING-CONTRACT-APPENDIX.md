# Phase 5C — Long-Horizon Planning Engine (Appendix)
**Parent:** `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT.md`
**Contains:** Full JSON examples, TypeScript interfaces, detailed test plan, UI state details, files list

---

## B1. Endpoint JSON Examples

### B1.1 POST /api/ai/long-horizon/generate — Request

```json
{
  "userId": 56,
  "horizonMonths": 6
}
```

**Admin override variant** (when AI consent not present):
```json
{
  "userId": 56,
  "horizonMonths": 6,
  "overrideReason": "Client verbally consented, waiver pending"
}
```

> **Note:** `goalProfile` and `preferences` are NOT sent by the client. GoalProfile is server-derived from `masterPromptJson` at approval time. Preferences (sessions/week, duration) are embedded in the AI prompt via server-side context builders.

### B1.2 POST /api/ai/long-horizon/generate — Draft Success (200)

```json
{
  "success": true,
  "draft": true,
  "plan": {
    "planName": "6-Month Hypertrophy Progression Program",
    "horizonMonths": 6,
    "summary": "Progressive overload program spanning 6 months...",
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
  "horizonMonths": 6,
  "warnings": [],
  "provider": "openai",
  "auditLogId": 200
}
```

> **Note:** The `plan` object does NOT include `goalProfile` — it is server-derived from `masterPromptJson` at approval time (5C-D). The response does NOT include `generationMode`, `explainability`, `safetyConstraints`, or `missingInputs` — those are internal to the AI pipeline.

### B1.3 POST /api/ai/long-horizon/approve — Request

```json
{
  "userId": 56,
  "horizonMonths": 6,
  "plan": {
    "planName": "6-Month Hypertrophy Progression Program",
    "horizonMonths": 6,
    "summary": "Progressive overload program spanning 6 months...",
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

> **Note:** `goalProfile` is NOT in the plan object — it is server-derived from `masterPromptJson`. `horizonMonths` appears both at top level (required) and inside `plan` (must match, else 400 `HORIZON_MISMATCH`). `overrideReason` is required only when admin override is triggered.

### B1.4 Approve Success (200)

```json
{
  "success": true,
  "planId": 15,
  "sourceType": "ai_assisted_edited",
  "summary": "Progressive overload program spanning 6 months...",
  "blockCount": 6,
  "validationWarnings": [],
  "eligibilityWarnings": []
}
```

> **Note:** `sourceType` is server-derived via `validatedPlanHash` comparison (never client-supplied). `ai_assisted` = plan unchanged from AI draft; `ai_assisted_edited` = plan was edited or hash comparison failed.

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
- Admin override without reason → 400 `MISSING_OVERRIDE_REASON`
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

| Field | Control | Source | Editable? |
|-------|---------|--------|-----------|
| Horizon | Radio: 3 / 6 / 12 months | User selection | Yes (required) |
| Primary Goal | Read-only text | Server: `masterPromptJson.client.goals.primary` | No — display with "From profile" badge |
| Secondary Goals | Read-only tags | Server: `masterPromptJson.client.goals.secondary` | No — display with "From profile" badge |
| Constraints | Read-only text | Server: `masterPromptJson.client.goals.constraints` | No — display with "From profile" badge |
| Sessions/Week | Read-only text | Server: from client profile context | No — informational |
| Additional Notes | Text area | Coach input | Yes (optional, maps to `trainerNotes` at approval) |

> **Server-authoritative design:** GoalProfile is derived from `masterPromptJson` at approval time (5C-D). The UI shows goal data as informational read-only fields with explicit "From profile" messaging. To change goals, the coach must update the client's profile first. This prevents integrity drift between the plan's goalProfile and the client's actual profile.

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

## B5. Files Touched (Actual through 5C-D, estimated for 5C-E)

### New Files (5C-A through 5C-D — actual)
- `backend/models/LongTermProgramPlan.mjs` (5C-A)
- `backend/models/ProgramMesocycleBlock.mjs` (5C-A)
- `backend/migrations/20260226000002-create-long-term-program-tables.cjs` (5C-A)
- `backend/services/ai/longHorizonContextBuilder.mjs` (5C-B)
- `backend/services/ai/longHorizonOutputValidator.mjs` (5C-C)
- `backend/services/ai/longHorizonPromptBuilder.mjs` (5C-C)
- `backend/services/ai/aiEligibilityHelper.mjs` (5C-D)
- `backend/services/ai/longHorizonApprovalValidator.mjs` (5C-D)
- `backend/services/ai/stableStringify.mjs` (5C-D)
- `backend/tests/unit/longHorizonContextBuilder.test.mjs` (5C-B)
- `backend/tests/unit/longHorizonGeneration.test.mjs` (5C-C)
- `backend/tests/unit/longHorizonApproval.test.mjs` (5C-D)

### Modified Files (5C-A through 5C-D — actual)
- `backend/controllers/longHorizonController.mjs` — generation + approval handlers (NOT aiWorkoutController)
- `backend/routes/aiRoutes.mjs` — new route registrations
- `backend/models/index.mjs` — register new models + associations

### Estimated Files (5C-E — frontend)
- `frontend/src/services/aiWorkoutService.ts` — new types + service methods for long-horizon
- `frontend/src/components/.../WorkoutCopilotPanel.tsx` — long-horizon tab/mode
- `frontend/src/components/.../WorkoutCopilotPanel.test.tsx` — new tests
- `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md` — status update

---

**END OF PHASE 5C APPENDIX**
