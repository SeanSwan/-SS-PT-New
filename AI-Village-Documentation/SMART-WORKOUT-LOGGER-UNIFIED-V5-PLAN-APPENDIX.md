# Smart Workout Logger V5 Plan — Appendix
**Parent:** `AI-Village-Documentation/SMART-WORKOUT-LOGGER-UNIFIED-V5-PLAN.md`
**Contains:** Phase 5C/5D/5E detailed scope, proposed data models, API contracts, Claude continuation prompt

---

## A1. Phase 5C — Long-Horizon Planning Engine (Detailed Scope)

**Full contract:** `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT.md`

### Objective
Enable admin/trainers to create and manage 3/6/12 month NASM-aligned plans using client history, goals, injuries, trends, assessments, and adherence patterns.

### Core Capabilities (MVP)
1. Program Horizon Selection (3 / 6 / 12 months)
2. Block / Mesocycle Plan Structure (phase blocks with duration, focus, progression intent)
3. Goal-Specific Progression Logic (strength, weight loss, muscle gain, endurance, flexibility/ROM)
4. Assessment-Aware Modifications (corrective overlays from CES / baseline findings)
5. Coach Review + Approve (AI drafts macro/meso structure, coach edits and approves)
6. Revision Workflow (regenerate next block after re-assessment / progress review)

### Backend-First Build Plan
- 5C-A: Planning data contracts + models
- 5C-B: Long-horizon context builder (derived summaries for trend-informed planning)
- 5C-C: AI long-horizon draft generation endpoint
- 5C-D: Long-horizon approval + persistence
- 5C-E: Minimal UI integration (admin first, trainer second)

### Proposed Data Models

#### `LongTermProgramPlan`
- `id`, `userId` (client), `horizonMonths` (3|6|12), `status` (draft|approved|active|archived|superseded)
- `planName`, `summary`, `goalProfile` (normalized JSONB), `sourceType` (manual|template_only|ai_assisted|ai_assisted_edited)
- `aiGenerationRequestId` (nullable FK → AiInteractionLog), `createdByUserId`, `approvedByUserId`, `approvedAt`
- `startsOn`, `endsOn`, `metadata`/`provenance`

#### `ProgramMesocycleBlock`
- `planId`, `sequence`, `nasmFramework` (OPT|CES|GENERAL), `optPhase` (nullable)
- `focus`, `durationWeeks`, `entryCriteria`, `exitCriteria`, `constraintsSnapshot`, `notes`

#### `ProgramProgressReview` (optional, can defer)
- `planId`, `reviewDate`, `adherenceSummary`, `trendSummary`, `reassessmentSummary`
- `recommendation` (continue|progress|regress|rebuild_next_block)

#### `ForecastSnapshot` (optional, can defer)
Stores derived trend forecasts for chart-driven planning decisions.

### API Additions (Phase 5C Proposed)
- `POST /api/ai/long-horizon-plan/generate` — Draft 3/6/12 month plan
- `POST /api/ai/long-horizon-plan/approve` — Coach approves and persists
- `GET /api/program-plans/:clientId` — List plans for client
- `GET /api/program-plans/:planId` — Plan details + blocks + provenance
- `POST /api/program-plans/:planId/review` — Progress review (optional in 5C)

RBAC: admin/trainer only for generation/approval/review. Trainer assignment enforcement applies.

### Long-Horizon Context (Chart/Graph/Trend Data Integration)

**Input sources (server-side derived, PII-safe summaries):**
- Recent workout history, progression metrics (load/reps/volume), adherence consistency
- RPE/fatigue trends, baseline/body composition trends, ROM/flexibility summaries
- Injury flags / restrictions / change events, milestones / goal progression indicators
- Schedule consistency, chart/graph metrics (as summarized values, not raw UI state)

**Rules:**
- Do not pass raw chart objects or raw client UI payloads to providers
- Build normalized, de-identified trend summaries server-side
- Include explainability references to which trend groups influenced the plan

---

## A2. Phase 5D — Voice Dictation + Manual Entry (Coach Workflow)

### Objective
Allow admin/trainers to dictate notes/constraints/program edits via microphone. Manual entry remains first-class.

### Requirements
- Manual entry always available
- Dictation must not bypass consent/privacy rules for client-specific planning
- Transcript text through sanitization/de-identification before LLM use
- Distinguish: coach notes for local persistence vs AI prompt constraints derived from notes

### Architecture Options

**Option A — Browser/device speech recognition (recommended MVP):**
- Pros: no raw audio leaves app, low backend complexity, fast UX
- Cons: inconsistent browser support, platform differences

**Option B — Server-side transcription provider (future/optional):**
- Pros: consistent quality, domain-specific tuning potential
- Cons: raw audio is highly identifying, stricter consent/privacy requirements, storage complexity

**Recommended:** Option A (browser/device STT) + manual fallback. Add server STT later if needed.

### Voice Dictation Privacy Rules
- Transcript used for client-specific AI: consent required, sanitization + de-id before provider
- Raw audio: not retained by default
- Server-side transcription (if added later): provider policy review, explicit privacy docs, retention settings

---

## A3. Phase 5E — Provider Expansion: Venice AI

### Objective
Add Venice AI as optional provider alongside OpenAI, Anthropic, Gemini.

### Policy
Even if Venice claims not to store data:
- Do NOT disable de-identification
- Do NOT bypass consent, audit logging, or validation/rule engine
- Venice is a provider option, not a privacy exemption

### Deliverables
1. Venice adapter implementing same provider interface
2. Error normalization + token/cost mapping
3. Router registration and failover order config
4. Config/env support (`VENICE_API_KEY`, model config)
5. Adapter tests + router integration tests
6. Documentation updates (provider policy + tradeoffs)

### Provider Selection Policy
Server-configured and policy-driven: global default order, optional org/admin config, future per-client controls, fallback chain degrades safely.

---

## A4. Claude Continuation Prompt (Paste-Ready)

```text
Continue from the current Smart Workout Logger state using the Unified V5 plan as source of truth.

READ FIRST
1. `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md`
2. `AI-Village-Documentation/SMART-WORKOUT-LOGGER-UNIFIED-V5-PLAN.md`
3. `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`
4. Relevant current code (confirm live capabilities before planning/coding):
   - `backend/controllers/aiWorkoutController.mjs`
   - `backend/routes/aiRoutes.mjs`
   - `backend/services/ai/providerRouter.mjs`
   - `backend/services/ai/contextBuilder.mjs`
   - `backend/services/ai/progressContextBuilder.mjs`
   - `backend/services/ai/oneRepMax.mjs`
   - `backend/services/ai/nasmTemplateRegistry.mjs`
   - `frontend/src/services/aiWorkoutService.ts`
   - `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx`
   - `frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx`

IMPORTANT GOVERNING RULES
- NASM protocol is the governing programming framework.
- AI/privacy/router/provider systems are implementation layers, not replacements for NASM methodology.
- Client-specific AI generation requires client consent.
- De-identification remains mandatory before external provider calls.
- Venice (if added) is a provider option, not a privacy exemption.

CURRENT PROJECT STATUS (assume true unless code/docs contradict)
- Phase 1/2 complete (privacy foundation + consent + de-id)
- Phase 3A/3B complete (multi-provider router + failover + degraded mode + cost tracking)
- Phase 4A complete (NASM template registry + structured schemas + endpoints)
- Phase 5A complete (draft generation + approval endpoint, hardened)
- Phase 5B complete (admin copilot surface)
- Phase 5B.1 complete (trainer surface reuse + assignment error taxonomy)

TASK FOR THIS RUN
Plan and document the next implementation phase (do not start coding yet unless explicitly asked), with emphasis on:
1) Long-horizon planning engine (3/6/12 month NASM-aligned plans)
2) Using client progress/chart/trend/injury/ROM/flexibility/goals data in server-derived AI context
3) Voice dictation + manual entry workflow architecture
4) Venice AI provider option roadmap integration

CONSTRAINTS
- Do not rewrite completed phases
- Keep plan grounded in existing codebase
- Avoid unnecessary scope creep
- Preserve consent + de-id + validation ordering
- Server-side AI calls only
- Evidence before claims
```

---

**END OF V5 PLAN APPENDIX**
