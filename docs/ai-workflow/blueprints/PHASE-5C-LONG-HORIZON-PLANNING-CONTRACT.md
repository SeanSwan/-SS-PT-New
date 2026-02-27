# Phase 5C — Long-Horizon Planning Engine (Integration Contract)

**Created:** 2026-02-25
**Source of Truth:** `AI-Village-Documentation/SMART-WORKOUT-LOGGER-UNIFIED-V5-PLAN.md` §5.2
**Appendix:** `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT-APPENDIX.md`
**Prerequisite:** Phase 5B.1 complete (commit `a9c52ec1`)

### Contract Status

| Field | Value |
|-------|-------|
| Review Quorum Status | Pending (0/5) |
| Contract Freeze Status | In progress |
| Active Subphase | 5C-D (next) + 5W-A planning dependency |
| Last Updated | 2026-02-26 |
| Updated By | Claude Code (Architect) |

---

## 0. Security & Testing Protocol (Phase 5C Specific)

> **Canonical source:** `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`
> **Protocol snapshot checked:** 2026-02-25
> This section contains Phase 5C-specific gates and deltas only. For full protocol, read the master onboarding prompt.

### 0.1 Build Gates (Conditional by Subphase Type)

**Backend-only subphases (5C-A, 5C-B, 5C-C, 5C-D):**
- `cd backend && npm test` — required before completion claim

**Frontend subphases (5C-E):**
- `cd frontend && npx vitest run --reporter verbose` — required
- `cd frontend && npm run build` — required
- `cd frontend && npx tsc --noEmit` — advisory

**Cross-phase milestones (Phase 5C completion):**
- All backend + frontend gates must pass

**Rule:** No "done" or "fixed" claim without evidence of passing gates. Anti-hallucination: paste test output, not just "tests pass."

### 0.2 Skills Reading Order (per Master Onboarding Prompt V5)

```
BACKEND (5C-A to 5C-D): test-driven-development → systematic-debugging (if bugs) → verification-before-completion → requesting-code-review
FRONTEND (5C-E):         frontend-design → web-design-guidelines → test-driven-development → webapp-testing → verification-before-completion → requesting-code-review
```

### 0.3 5-Brain Protocol (Phase 5C Classification)

| Code Area | Minimum Reviewers | Why Critical |
|-----------|-------------------|--------------|
| Models / migrations (5C-A) | ALL 5 (4 AI + human) | Schema changes are hard to reverse |
| Context builder / de-identification (5C-B) | ALL 5 | Privacy/PII boundary |
| Generation endpoint RBAC/AI eligibility (5C-C) | ALL 5 | Auth + AI eligibility ordering |
| Approval endpoint RBAC/AI eligibility (5C-D) | ALL 5 | Auth + AI eligibility + persistence |
| UI components (5C-E) | 3+ (standard) | Standard frontend code |

### 0.3A Execution Topology (4 AI Agents + Human = 5-Brain Protocol in Practice)

This project uses **4 AI agents in VS Code + 1 human coordinator/reviewer** to satisfy the master onboarding prompt's 5-Brain protocol requirements.

#### Active execution model (real workflow)
- **Claude Code (Architect)** — planning, contracts, data model design, sequencing, integration decisions
- **Roo Code (Builder)** — implementation execution (backend-first coding, migrations, endpoints, services)
- **ChatGPT/Codex (QA / Security Reviewer)** — code review, test design, regression/security findings, verification checks
- **Gemini (Visionary / UX Reviewer)** — UI/UX validation, flow clarity, design consistency (especially frontend subphases)
- **Human (Final Coordinator / Approver)** — merges outputs, resolves conflicts, approves critical changes, updates canonical docs

#### Protocol mapping (how this satisfies 5-Brain)
The "5th brain" in this workflow is the **human approval/control point**.

For **critical code** (auth, RBAC, consent, de-identification, audit logging, migrations):
- All 4 AI agents must review or contribute as applicable
- Human must perform final review/approval before merge/deploy
- No critical code is considered complete without human sign-off + evidence

For **standard code** (non-critical UI, local refactors, presentation-only changes):
- Minimum 3 reviewers/contributors (e.g., Architect + Builder + QA)
- Human still approves merge/deploy

### 0.3B Role Responsibilities by Phase 5C Subphase

| Subphase | Architect (Claude) | Builder (Roo) | QA (ChatGPT/Codex) | Visionary (Gemini) | Human |
|----------|--------------------|---------------|--------------------|--------------------|-------|
| **5C-A Models** | Contract + schema design | Implement models/migration | Security/review + tests | Optional | Final critical approval |
| **5C-B Context Builder** | Context contract design | Implement builders | Privacy/de-id review + tests | Optional | Final critical approval |
| **5C-C Generate Endpoint** | API contract + sequencing | Implement endpoint | RBAC/AI eligibility/order review + tests | Optional | Final critical approval |
| **5C-D Approve Endpoint** | Approval contract + persistence rules | Implement endpoint | Security/review + tests | Optional | Final critical approval |
| **5C-E UI Integration** | Integration contract | Implement UI wiring | QA + state/error tests | UX/design review | Final approval |

**Rule:** If a subphase touches AI eligibility/consent ordering, RBAC, de-identification, audit logging, or migrations, it is **critical** regardless of whether it is labeled backend or frontend.

### 0.3C Parallel Work Protocol

Parallelization is allowed when contracts are frozen.

**Allowed:** Roo scaffolds models from approved 5C-A schema while Claude finalizes 5C-C. ChatGPT/Codex drafts tests from approved contract while Roo builds. Gemini reviews UI flow after backend response shapes are frozen.

**Not allowed:** Multiple agents changing same contract without designated owner. Backend implementation before auth/RBAC/AI eligibility ordering is agreed. Frontend coding against unapproved API examples.

**Contract freeze rule:** Before parallel work on a subphase, Architect must publish: endpoint contract, security ordering, data model shape (if applicable), test acceptance criteria.

### 0.3D Canonical Documentation Update Protocol

All agents must keep documentation aligned. "Done" claims without doc updates are invalid.

**Required updates per subphase:**
- `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md` — status + what changed + next step
- This blueprint's Contract Status block (top of file)

**Minimum content:** Status, files changed, verification evidence, open risks, commit hash(es).

**Responsibility:** Builder updates implementation + test outputs. QA appends review notes. Architect reconciles final status. Human confirms before merge/deploy.

### 0.3E Evidence and Review Quorum (Completion Gate)

No subphase completion claim is valid without:
1. Required test/build gates passing (per §0.1)
2. Evidence attached (actual outputs, not summary-only claims)
3. Required review quorum met (per §0.3)
4. `CURRENT-TASK.md` updated
5. Contract Status block updated

### 0.4 Pre-Commit Checklist (Phase 5C Specific)

- [ ] Applicable build/test gates pass (backend for backend subphases, all for frontend/cross-phase)
- [ ] Required review quorum met (5 for critical, 3 for standard)
- [ ] No hallucinated claims (evidence attached)
- [ ] AI eligibility ordering preserved: auth → role → input → user → assignment → AI eligibility → de-id → AI → validate → persist → audit
- [ ] RBAC enforcement: admin/trainer only, assignment check present
- [ ] Parameterized DB access only (no raw SQL interpolation)
- [ ] No `dangerouslySetInnerHTML` on AI output
- [ ] RBAC + AI eligibility + de-id ordering verified by tests
- [ ] Dependency audit clean (if dependencies added)

### 0.5 Security-First Constraints (Absolute Rules)

These 10 rules apply to every sub-phase. No bypass allowed:

1. **AI eligibility before AI generation.** Order: auth → role → input → user existence → assignment → AI eligibility → de-id → AI call → validation → persist → audit.
   - Admin may proceed with audited override if no consent source exists.
   - Trainer/client remain blocked until a valid AI consent source exists.
2. **De-identification before external calls.** No raw PII crosses provider boundary.
3. **Audit logging on every AI interaction.** `AiInteractionLog` entry with provenance.
4. **RBAC on every endpoint.** Admin/trainer only. Trainer assignment enforcement.
5. **Input validation (Zod/rule engine).** Inputs validated before processing, AI outputs validated before persistence.
6. **No raw chart/UI payloads to providers.** Server-side normalized summaries only.
7. **Parameterized DB queries only.** No raw SQL interpolation.
8. **Safe rendering.** No `dangerouslySetInnerHTML` on AI output.
9. **Rate limiting.** Existing rate limiter covers new endpoints.
10. **Kill switch.** Return 503 if kill switch active.

---

## 1. Objective

Enable admin/trainers to create and manage **3/6/12 month NASM-aligned training programs** using client history, goals, injuries, trends, assessments, and adherence patterns, with role-aware AI eligibility (admin override allowed, trainer/client consent-gated).

**NASM Protocol-First:** AI assists with drafting, adapting, sequencing, and summarizing. AI does NOT replace NASM framework logic, coach judgment, medical clearance, or scope-of-practice boundaries.

---

## 2. Sub-Phase Breakdown

| Sub-Phase | Name | Scope | Depends On |
|-----------|------|-------|------------|
| **5C-A** | Planning Data Contracts + Models | Sequelize models, migrations, validation | — |
| **5C-B** | Long-Horizon Context Builder | Server-side trend/history summarization | 5C-A |
| **5C-C** | AI Long-Horizon Draft Generation | New endpoint: macro/mesocycle plan drafts | 5C-A, 5C-B |
| **5C-D** | Long-Horizon Approval + Persistence | Coach-approved plan persistence with provenance | 5C-A, 5C-C |
| **5C-E** | Minimal UI Integration | Admin copilot extended, trainer reuse | 5C-C, 5C-D |

### 2.1 Parallel Dependency Track (5W - Waiver + AI Consent QR Flow)

If SwanStudios replaces the current in-app AI consent blocker, Phase 5C endpoints must integrate with the waiver-based AI consent source defined in:

- `docs/ai-workflow/blueprints/WAIVER-CONSENT-QR-FLOW-CONTRACT.md`

**Rule:** 5C may continue using current consent sources during development, but production "blocker removal" requires 5W-E (AI eligibility service + admin override audit path).

---

## 3. Data Models (5C-A)

### 3.1 `LongTermProgramPlan`

```
LongTermProgramPlan
├── id                    INTEGER, PK, auto-increment
├── userId                INTEGER, FK → Users(id), NOT NULL
├── horizonMonths         INTEGER, NOT NULL (3|6|12)
├── status                ENUM('draft','approved','active','archived','superseded'), default 'draft'
├── planName              STRING(200), NOT NULL
├── summary               TEXT, nullable
├── goalProfile           JSONB, NOT NULL (normalized goal object)
├── sourceType            ENUM('manual','template_only','ai_assisted','ai_assisted_edited')
├── aiGenerationRequestId INTEGER, nullable (FK → AiInteractionLog(id))
├── createdByUserId       INTEGER, FK → Users(id), NOT NULL
├── approvedByUserId      INTEGER, nullable, FK → Users(id)
├── approvedAt            TIMESTAMP, nullable
├── startsOn              DATEONLY, nullable
├── endsOn                DATEONLY, nullable
├── metadata              JSONB, nullable (provenance, version info)
├── createdAt / updatedAt TIMESTAMP
```

### 3.2 `ProgramMesocycleBlock`

```
ProgramMesocycleBlock
├── id                    INTEGER, PK, auto-increment
├── planId                INTEGER, FK → LongTermProgramPlan(id), NOT NULL, ON DELETE CASCADE
├── sequence              INTEGER, NOT NULL (order within plan, unique per planId)
├── nasmFramework         ENUM('OPT','CES','GENERAL'), NOT NULL
├── optPhase              INTEGER, nullable (1-5, only if OPT)
├── phaseName             STRING(100), NOT NULL
├── focus                 STRING(200), nullable
├── durationWeeks         INTEGER, NOT NULL (1-16)
├── sessionsPerWeek       INTEGER, nullable (1-7)
├── entryCriteria         TEXT, nullable
├── exitCriteria          TEXT, nullable
├── constraintsSnapshot   JSONB, nullable
├── notes                 TEXT, nullable
├── createdAt / updatedAt TIMESTAMP
```

### 3.3 Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| `horizonMonths` | 3, 6, or 12 | `INVALID_HORIZON` |
| `planName` | Required, 1-200 chars | `MISSING_PLAN_NAME` |
| `goalProfile` | Required, must have `primaryGoal` | `MISSING_GOAL_PROFILE` |
| `blocks[].sequence` | Unique per plan, sequential from 1 | `INVALID_BLOCK_SEQUENCE` |
| `blocks[].durationWeeks` | 1-16 | `INVALID_BLOCK_DURATION` |
| `blocks[].nasmFramework` | OPT, CES, or GENERAL | `INVALID_FRAMEWORK` |
| Sum of block weeks | ~= horizonMonths * 4.3 (±2 wk tolerance) | `DURATION_MISMATCH` (warning) |

---

## 4. Endpoints (5C-C + 5C-D)

### 4.1 POST /api/ai/long-horizon-plan/generate

Generate a draft long-horizon plan. **Handler order (CRITICAL):**
```
auth → role (admin/trainer) → input validation → user existence →
assignment check → AI eligibility check (consent source + role-aware override) → de-identification →
long-horizon context build → AI provider call → output validation →
response (draft, not persisted) → audit log
```

**Fields:** `userId` (required), `horizonMonths` (3|6|12, required), `goalProfile` (required, must have `primaryGoal`), `preferences` (optional).

**Responses:** Draft success (200), Degraded mode (200, same as Phase 5B), Error codes (same taxonomy as Phase 5B + `INVALID_HORIZON`, `MISSING_GOAL_PROFILE`, and AI eligibility/waiver codes in §10).

**Eligibility note (role-aware):**
- `admin`: may proceed with audited override if no consent source exists (warning path)
- `trainer` / `client`: blocked until a valid AI consent source exists
- de-identification remains mandatory in all cases

Full request/response JSON examples: see appendix.

### 4.2 POST /api/ai/long-horizon-plan/approve

Coach approves (optionally edits) a plan draft, persisting to database. **Handler order:**
```
auth → role (admin/trainer) → input validation → user existence →
assignment check → AI eligibility re-check (consent source + role-aware override) → plan validation (Zod) →
persist LongTermProgramPlan + ProgramMesocycleBlocks → audit log → response
```

### 4.3 GET /api/program-plans/:clientId
List plans. RBAC: admin=any, trainer=assigned only, client=own approved only.

### 4.4 GET /api/program-plans/:planId/detail
Full plan + blocks + provenance. Client sees plan/blocks but NOT explainability/safety data.

---

## 5. Context Builder (5C-B)

**File:** `backend/services/ai/longHorizonContextBuilder.mjs`

Extends existing `contextBuilder.mjs` + `progressContextBuilder.mjs` pattern. Builds de-identified, normalized client data summary.

| Source | Status | Notes |
|--------|--------|-------|
| Client profile, NASM assessment, workout history, 1RM data | Reuse existing | Already de-identified |
| Progression trends (load/volume/reps over time) | **NEW** | Server-computed aggregates |
| Adherence metrics (attendance, missed sessions) | **NEW** | |
| RPE/fatigue trends | **NEW** | Null-safe if no RPE data |
| Injury/restriction change history | **NEW** | |
| Goal progression indicators | **NEW** | |
| Body composition / ROM/flexibility trends | **NEW** | Null-safe |

**Security rules:** De-id pipeline applies, no raw chart/UI objects, no PII in summaries, AI eligibility checked by handler before builder is called, null-safe for missing data.

Full TypeScript interface: see appendix.

---

## 6. NASM Protocol Compliance Matrix

| Requirement | Implementation | Verified By |
|------------|---------------|-------------|
| OPT phase sequential (1→5) unless assessment skip | AI prompt constraint + output validation | Unit test |
| Phase transitions justified | `exitCriteria`/`entryCriteria` required per block | Schema validation |
| CES corrective integrated | Context builder includes CES findings | Context builder test |
| PAR-Q+ clearance respected | `medicalClearanceRequired` flag | Endpoint test |
| Movement restrictions across all blocks | `constraintsSnapshot` on each block | Integration test |
| Regressions explained | `rationale` field + `trendInfluences` | Response shape test |
| No scope-of-practice violations | AI prompt boundaries + output validator | Output validator test |

---

## 7. UI State Machine Extension (5C-E)

```
IDLE → CONFIGURE_PLAN → GENERATING → PLAN_REVIEW | DEGRADED | ERROR
PLAN_REVIEW → APPROVING → SAVED | APPROVE_ERROR
```

Reuse strategy: "Long-Horizon" tab in existing `WorkoutCopilotPanel`. Trainer gets it for free (same reuse pattern as Phase 5B.1).

Detailed form fields and UI state tables: see appendix.

---

## 8. Implementation Order

| Step | Sub-Phase | Scope | Security Gate |
|------|-----------|-------|---------------|
| 1 | 5C-A | Models + migration | ALL 5 (schema) |
| 2 | 5C-A | Model unit tests | Backend test gate |
| 3 | 5C-B | Context builder | ALL 5 (de-id) |
| 4 | 5C-B | Context builder tests (incl. PII assertion) | Backend test gate |
| 5 | 5C-C | Generation endpoint + handler | ALL 5 (auth/AI eligibility) |
| 6 | 5C-C | Generation tests | Backend test gate |
| 7 | 5C-D | Approval endpoint + handler | ALL 5 (auth/AI eligibility) |
| 8 | 5C-D | Approval tests | Backend test gate |
| 9 | 5C-E | Frontend: configure form + plan review | 3+ (standard UI) |
| 10 | 5C-E | Frontend: service wiring + state machine | Frontend test + build |
| 11 | 5C-E | Frontend tests | Frontend test gate |
| 12 | — | Integration smoke + CURRENT-TASK.md | Full verification |

---

## 9. Open Decisions (Resolve Before Implementation)

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Persistence depth: plan+blocks only vs +review+forecast | **(A) Plan+blocks only** — add review/forecast later |
| 2 | Coach sandbox mode | **(B) Defer** — 5C = client-specific only |
| 3 | Block-level weekly detail | **(B) Macro only** — per-week uses Phase 5B generation |
| 4 | UI: tab vs separate panel | **(A) Tab** in existing WorkoutCopilotPanel |

---

## 10. Error Code Additions

| Error Code | HTTP | Trigger | Retryable? |
|------------|------|---------|------------|
| `INVALID_HORIZON` | 400 | horizonMonths not 3/6/12 | No |
| `MISSING_GOAL_PROFILE` | 400 | No goalProfile or missing primaryGoal | No |
| `INVALID_BLOCK_SEQUENCE` | 422 | Block sequence gaps/duplicates on approve | No |
| `AI_WAIVER_MISSING` | 403 | No valid waiver-based AI consent source (trainer/client path) | No |
| `AI_WAIVER_VERSION_OUTDATED` | 403 | Waiver/AI consent exists but version requires re-consent | No |
| `DURATION_MISMATCH` | — | Sum of block weeks doesn't match horizon | Warning only |
| `AI_CONSENT_OVERRIDE_USED` | 200 | Admin override proceeded without consent source (warning metadata) | N/A |

All Phase 5B error codes apply unchanged. Waiver/AI eligibility integration details live in `docs/ai-workflow/blueprints/WAIVER-CONSENT-QR-FLOW-CONTRACT.md`.

---

## 11. Verification Checklist (Final Gate)

Implements `verification-before-completion` from master onboarding prompt.

- [ ] **Backend tests:** `cd backend && npm test` — ALL pass
- [ ] **Frontend tests:** `cd frontend && npx vitest run` — ALL pass
- [ ] **Frontend build:** `cd frontend && npm run build` — clean
- [ ] **Security audit:**
  - [ ] AI eligibility ordering verified by tests (including admin override vs trainer/client deny paths)
  - [ ] De-identification applied to long-horizon context (test assertion)
  - [ ] RBAC enforced on all new endpoints (test assertion)
  - [ ] No raw PII in AI payloads (test assertion)
  - [ ] Parameterized queries only (code review)
  - [ ] No `dangerouslySetInnerHTML` on AI output (code review)
  - [ ] Kill switch honored (test assertion)
  - [ ] Rate limiter covers new endpoints
  - [ ] Audit logging on generation + approval (test assertion)
- [ ] **NASM compliance:** OPT phase ordering validated
- [ ] **Review quorum:** All critical subphases 5/5, UI 3+/5
- [ ] **Evidence attached** (test outputs, not just claims)
- [ ] **CURRENT-TASK.md updated**
- [ ] **Contract Status block updated** (top of this file)

Full test plan (per-subphase test cases): see appendix.

---

**END OF PHASE 5C INTEGRATION CONTRACT (CORE)**
