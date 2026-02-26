# Phase 5C — Long-Horizon Planning Engine — 5-Brain Review Request

**Date:** 2026-02-25
**Requested By:** Claude Code (Architect)
**Review Type:** Critical (schema change + auth/consent/de-id pipeline)
**Required Quorum:** ALL 5 (4 AI agents + human)

---

## What To Review

### Documents (read in order)
1. **Phase 5C Contract (core):** `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT.md`
2. **Phase 5C Contract (appendix):** `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT-APPENDIX.md`
3. **V5 Master Plan (core):** `AI-Village-Documentation/SMART-WORKOUT-LOGGER-UNIFIED-V5-PLAN.md`

### Code Already Implemented (5C-A Models — review these)
4. `backend/models/LongTermProgramPlan.mjs` — Plan model
5. `backend/models/ProgramMesocycleBlock.mjs` — Block model
6. `backend/migrations/20260226000001-create-long-term-program-tables.cjs` — Migration
7. `backend/models/associations.mjs` — Lines with "Phase 5C" (imports, extractions, associations, return)
8. `backend/models/index.mjs` — Lines with "Phase 5C" (exports)
9. `backend/tests/unit/longHorizonModels.test.mjs` — 33 model tests

### Test Evidence
- Backend tests: **857/857 passed** (including 33 new 5C-A model tests)
- No test failures, no regressions

---

## Review Questions Per Role

### For Roo Code (Builder)
1. Are the model definitions consistent with existing patterns (AiPrivacyProfile, AiInteractionLog)?
2. Is the migration idempotent-safe (up/down)?
3. Are the FK references correct (`Users` uppercase, `ai_interaction_logs` lowercase)?
4. Any missing indexes for planned query patterns?

### For ChatGPT/Codex (QA / Security)
1. **RBAC:** Do the model FKs correctly reference Users for all three roles (client, creator, approver)?
2. **Injection safety:** Do model files contain zero raw SQL? (Tests #32-33 verify this)
3. **CASCADE behavior:** Is `ON DELETE CASCADE` correct for plans→blocks? Should user deletion cascade to plans?
4. **ENUM values:** Are the status/sourceType/nasmFramework ENUMs complete for planned use cases?
5. **Validation:** Are the validation rules (horizonMonths in [3,6,12], durationWeeks 1-16, optPhase 1-5) correct per NASM protocol?

### For Gemini (Visionary / UX)
1. Does the data model support the planned UI flow? (CONFIGURE_PLAN → GENERATING → PLAN_REVIEW → SAVED)
2. Can the block structure render as a timeline visualization? (sequence ordering, durationWeeks for bar widths)
3. Is the goalProfile JSONB flexible enough for future UI fields?

### For Human (Final Approver)
1. Does this schema make sense for the SwanStudios training business?
2. Are there business rules missing from the model constraints?
3. Any concerns about the 3/6/12 month horizon restriction?

---

## Phase 5C Contract Summary (Quick Reference)

### Scope
Enable 3/6/12 month NASM-aligned training programs with block/mesocycle structure.

### Sub-Phases
| Sub-Phase | Status | Scope |
|-----------|--------|-------|
| **5C-A** | **IMPLEMENTED** | Models, migration, tests |
| 5C-B | Not started | Long-horizon context builder |
| 5C-C | Not started | Generation endpoint |
| 5C-D | Not started | Approval endpoint |
| 5C-E | Not started | UI integration |

### Security Ordering (applies to 5C-C and 5C-D)
```
auth → role (admin/trainer) → input validation → user existence →
assignment check → consent check → de-identification →
AI call → output validation → persist → audit log
```

### Data Models
- `LongTermProgramPlan` — 3/6/12 month plan (FK to Users x3, FK to AiInteractionLog)
- `ProgramMesocycleBlock` — Block within plan (FK to plan, unique planId+sequence)

### Open Decisions
1. Persistence depth: plan+blocks only (recommended) vs +review+forecast
2. Coach sandbox: defer (recommended)
3. Block detail: macro only (recommended) — per-week uses Phase 5B
4. UI: tab in existing panel (recommended)

---

## How To Respond

Please provide your review in this format:

```
ROLE: [Your AI name / role]
REVIEWED: [list of files reviewed]
FINDINGS:
- [SEVERITY] [Finding description]
APPROVAL: [Approved / Approved with conditions / Blocked]
NOTES: [any additional context]
```

Severity levels: CRITICAL (blocks merge), HIGH (should fix before next subphase), MEDIUM (fix soon), LOW (nice to have).

---

**END OF REVIEW REQUEST**
