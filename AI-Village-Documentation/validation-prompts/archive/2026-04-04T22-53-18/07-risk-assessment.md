# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7-20260318 | **Duration:** 72.2s
> **Files:** docs/ai-workflow/blueprints/BOARD2-EXERCISE-MODIFICATIONS-PLAN.md
> **Generated:** 4/4/2026, 3:53:18 PM

---

# Risk Assessment: Board 2 Exercise Modifications Plan

## Executive Summary

This plan has **2 CRITICAL risks**, **3 HIGH risks**, and **4 MEDIUM risks** that require mitigation before production deployment. The "zero backend work" claim is incorrect and represents a significant planning gap.

---

## 1. Dependency Risks

| Phase | Blocks | Blocked By | Risk if Delayed |
|-------|--------|------------|-----------------|
| Migration | Population Script | — | 🟡 Low |
| Backend Routes Update | Frontend Hook | Migration | 🟡 Low |
| Population Script | UI Components | Routes + Migration | 🔴 **CRITICAL** |
| Board 2 UI | Data availability | Population Script | 🟠 High |
| Feature Flag | Safety rollback | — | 🟠 High |

### Mitigation:
```
Phase Order (Corrected):
┌─────────────────────────────────────────────────────────────────┐
│ Phase 0: Migration + Backend Routes (run first, no blockers)    │
│ Phase 1: Test migration in staging BEFORE population            │
│ Phase 2: Run population script → validate sample data          │
│ Phase 3: Frontend hooks + types                                 │
│ Phase 4: Board 2 UI components                                  │
│ Phase 5: Feature flag enable (off by default until validated)   │
└─────────────────────────────────────────────────────────────────┘
```

### What if Phase 4 (voice) takes longer?
The voice feature is not part of this specific plan. If you mean the population script takes longer:
- **Impact**: Board 2 UI cannot be tested with real data
- **Workaround**: Seed mock data for UI development; run real population later
- **Estimated time**: 45 API calls × ~8 seconds = ~6 minutes (plus overhead = plan for 15-20 min)

---

## 2. Technical Unknowns

| Unknown | Severity | Mitigation |
|---------|----------|------------|
| Gemini 2.5 Flash output consistency | 🟠 **HIGH** | Create JSON schema, validate before DB insert |
| Batch failure recovery | 🟠 **HIGH** | Implement idempotent script with checkpointing |
| Field mapping edge cases | 🟠 **HIGH** | Validate at least 50 sample exercises manually |
| Unicode in exercise names | 🟡 MEDIUM | Test with all 883 existing names |
| API rate limits | 🟡 MEDIUM | Add 1s delay between batches, exponential backoff |

### Recommended Validation Script:
```javascript
// Add to populate-exercise-variations.mjs
const VALID_EXERCISES = new Set(
  (await db.Exercises.findAll({ attributes: ['name'] }))
    .map(e => e.name)
);

function validateResponse(geminiResult, exerciseName) {
  if (!VALID_EXERCISES.has(exerciseName)) {
    throw new Error(`Unknown exercise: ${exerciseName}`);
  }
  const fields = ['easyVariation', 'hardVariation', 'kneeMod', ...];
  for (const field of fields) {
    if (typeof geminiResult[field] !== 'string') {
      throw new Error(`Invalid field ${field} for ${exerciseName}`);
    }
  }
}
```

---

## 3. Scope Creep Indicators

| Feature | Creep Risk | Indicator | Mitigation |
|---------|------------|-----------|------------|
| **Modification table UI** | 🟡 MEDIUM | "all edge cases" undefined | Specify exact columns, no dynamic expansion |
| **N/A entries handling** | 🟠 **HIGH** | "dimmed to 0.2 opacity" suggests UI complexity | Define N/A threshold explicitly (e.g., empty string vs "none") |
| **Emoji/icon usage** | 🟡 MEDIUM | May cause rendering issues on some devices | Use SVG icons instead, fallback for A11y |
| **Touch target sizing** | 🟢 LOW | 44px specified, clear | Good specification, unlikely to creep |

**Most Likely Scope Expansion:**
1. "Let's also add hip mobility mods for each exercise"
2. "Should we support custom trainer-defined modifications?"
3. "What about injury history per client?"

---

## 4. Effort Accuracy

| Estimate | Reality Check | Expected Actual |
|----------|---------------|------------------|
| 22 new files | Plan lists **7 files** — discrepancy! | 7-12 files |
| 300 lines max per file | Unlikely for components | 300-600 lines |

### Files Likely to Exceed 300 Lines:

| File | Estimated Lines | Reason |
|------|-----------------|--------|
| `ClassPreviewPanel.tsx` | **450-600** | Modification table UI + styling |
| `populate-exercise-variations.mjs` | **400-500** | Validation, batching, error handling |
| `bootcampGenerator.mjs` | **350-450** | Board 2 generation logic |
| `useExerciseSearch.ts` | **200-250** | Data transformation logic |

**Correction Needed:** Budget ~1,500-1,800 total lines, not 300×22.

---

## 5. Testing Gaps

| Gap | Severity | Recommended Action |
|-----|----------|---------------------|
| No unit tests mentioned | 🟠 **HIGH** | Add tests for `validateResponse()`, `transformExercise()` |
| No integration tests | 🟠 **HIGH** | Test API returns all 10 mod fields |
| No E2E tests | 🟠 **HIGH** | Test Board 2 renders modification table correctly |
| No visual regression | 🟡 MEDIUM | Add Chromatic or Percy screenshots |
| No migration tests | 🟠 **HIGH** | Test migration on copy of production data |
| No population script tests | 🟠 **HIGH** | Test on 10 exercises before all 883 |

### Suggested Test Coverage:
```
✅ backend/routes/exerciseRoutes.mjs.test.mjs
   - Returns all 10 mod fields
   - Returns empty strings for unset modifications
   - Handles null exercise gracefully

✅ populate-exercise-variations.mjs.test.mjs
   - Validates Gemini output against schema
   - Handles partial batch failures
   - Creates rollback checkpoint

✅ ClassPreviewPanel.test.tsx
   - Renders all 10 rows correctly
   - Alternating colors applied
   - N/A entries dimmed
   - Touch targets 44px+

✅ E2E: board-2-modifications.spec.ts
   - Navigate to Board 2
   - Verify modification table visible
   - Verify Easy/Hard sections distinct
```

---

## 6. Rollback Plan — 🔴 CRITICAL RISK

**Current State:** No feature flag mechanism exists.

### If Board 2 Breaks Production:
- **Cannot disable without deployment**
- **Cannot selectively disable per client**
- **Direct DB write = data inconsistency risk**

### Mitigation — Feature Flag Implementation:

```typescript
// frontend/src/config/features.ts
export const FEATURES = {
  BOARD2_MODIFICATIONS: process.env.REACT_APP_BOARD2_ENABLED === 'true',
};

// frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx
const Board2Modifications = FEATURES.BOARD2_ENABLED ? Board2ModTable : null;

// backend/routes/exerciseRoutes.mjs
if (!FEATURES.BOARD2_ENABLED) {
  return res.json({ 
    ...exercise,
    // Strip mod fields to maintain old behavior
  });
}
```

### Rollback Procedure:
1. Set `REACT_APP_BOARD2_ENABLED=false`
2. DB columns remain (no harm)
3. Data remains (can be re-enabled after fix)
4. Deploy takes < 5 minutes

---

## 7. Database Migration Risks — 🔴 CRITICAL: "Zero Backend Work" Claim is FALSE

| Claim | Reality |
|-------|---------|
| "zero backend work for Phase 1" | ❌ **INCORRECT** |

### Required Backend Work (Not Zero):

| Task | Type | Effort |
|------|------|--------|
| `20260404000001-add-exercise-variations.cjs` | Migration | 2 hours |
| Update `exerciseRoutes.mjs` | Route changes | 1 hour |
| Create `populate-exercise-variations.mjs` | New service | 4 hours |
| **Total Backend Work** | | **~7 hours** |

### Migration Risks:

| Risk | Rating | Mitigation |
|------|--------|------------|
| Adding 10 columns to 883 rows | 🟡 MEDIUM | Lock time < 1s, safe on PostgreSQL |
| Rollback complexity | 🟠 HIGH | Create down migration, test it |
| Script failure mid-run | 🟠 HIGH | Use transactions per batch, checkpoint |
| Unique constraint conflicts | 🟠 HIGH | Validate exercise names exist before insert |

### Verification Steps Before Running on Production:
```bash
# 1. Dry run on staging
DRY_RUN=true node scripts/populate-exercise-variations.mjs

# 2. Verify migration on production copy
pg_dump production_db > /tmp/prod_copy.sql
# Run migration on copy, verify no errors

# 3. Run with checkpointing
node scripts/populate-exercise-variations.mjs --resume-from-batch=23
```

---

## 8. Phase Ordering Analysis

### Current Proposal: 0→1→2→3→4→5

| Current Order | Recommended | Reason |
|---------------|-------------|--------|
| Phase 0 | Phase 0 | Migration first (correct) |
| Phase 1 | Phase 1 | Population script (but add staging test first!) |
| Phase 2 | Phase 2 | Backend routes |
| Phase 3 | Phase 3 | Frontend hooks |
| Phase 4 | Phase 4 | UI components |
| Phase 5 | Phase 5 | Feature flag enable |

### Optimization for Faster Value Delivery:

```
Parallel Track A (Backend)        Parallel Track B (Frontend)
─────────────────────────         ──────────────────────────────
Migration                         Mock data setup
    ↓                                    ↓
Routes Update              ←→      Type definitions
    ↓                                    ↓
Validation Script                  Hook implementation
    ↓                                    
Script Test (staging)         ↓
    ↓                         UI Components (with mock data)
Population in staging         ↓
    ↓                         Integration with real API
Production population         ↓
    ↓                         E2E + Visual tests
Feature flag ON               
```

**Time Savings:** Frontend can begin development with mock data immediately, not waiting for population script.

---

## Risk Summary Matrix

| Risk | Rating | Owner | Due Date |
|------|--------|-------|----------|
| Direct production DB write | 🔴 **CRITICAL** | DevOps | Before Phase 1 |
| "Zero backend work" is false | 🔴 **CRITICAL** | PM | Immediate |
| No feature flag mechanism | 🟠 **HIGH** | Backend | Phase 0 |
| No testing strategy | 🟠 **HIGH** | QA | Phase 2 |
| Gemini output validation gap | 🟠 **HIGH** | Dev | Phase 1 |
| Effort estimates incorrect | 🟠 **HIGH** | PM | Immediate |
| Scope creep on UI | 🟡 MEDIUM | PM | Ongoing |
| Phase ordering not optimal | 🟡 MEDIUM | Tech Lead | Immediate |

---

## Immediate Action Items

1. **Today**: Correct "zero backend work" claim, update estimates to 7 hours backend
2. **Before Phase 0**: Create feature flag mechanism
3. **Before Phase 1**: Write migration rollback script, test on staging copy
4. **Before Phase 1**: Add Gemini response validation to population script
5. **Before Phase 2**: Define test coverage requirements with QA
6. **Before Phase 4**: Budget 600 lines for ClassPreviewPanel, not 300

---

## Feasibility Verdict

| Aspect | Status | Notes |
|--------|--------|-------|
| Technical Feasibility | ✅ PASS | React + PostgreSQL can handle this |
| Timeline Feasibility | ⚠️ CONDITIONAL | Only if corrections above implemented |
| Risk Level | 🔴 HIGH | 2 critical issues require immediate fix |
| Go/No-Go | 🟡 HOLD | Resolve CRITICAL risks before proceeding |

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
