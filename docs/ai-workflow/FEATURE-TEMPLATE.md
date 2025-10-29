# Feature Implementation Template

> **Copy this template for each new feature**
> **Location:** Create as `features/[feature-name].md` in your project
> **Purpose:** Track feature from design through deployment

---

## Feature: [Feature Name]

**Date Started:** YYYY-MM-DD
**Developer:** [Your Name]
**Branch:** `feature/[feature-name]`
**Status:** 🟡 IN PROGRESS / 🟢 COMPLETE / 🔴 BLOCKED

---

## 📋 Feature Overview

### User Story
```
As a [role],
I want to [action],
So that [benefit].
```

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Out of Scope
- What this feature does NOT include

---

## 🎨 PHASE 0: Design Consensus (REQUIRED)

**Status:** ⬜ NOT STARTED / 🟡 IN REVIEW / 🟢 APPROVED / 🔴 BLOCKED

### Design Artifacts

**Wireframe:**
- Link: [Figma/image link]
- Description: [Brief description]

**API Specification:**
```yaml
# OpenAPI 3.0 snippet or description
POST /api/endpoint
Request Body:
{
  "field1": "value",
  "field2": 123
}

Response 200:
{
  "id": "uuid",
  "created_at": "timestamp"
}
```

**Database Schema:**
```sql
-- New tables or ALTER statements
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_table_tenant ON table_name(tenant_id);
```

**Component Structure:**
```
src/components/FeatureName/
├── FeatureName.tsx              # Main component
├── FeatureName.styles.ts        # styled-components
├── FeatureNameHeader.tsx        # Subcomponent 1
├── FeatureNameBody.tsx          # Subcomponent 2
├── useFeatureName.ts            # Custom hook
└── README.md                    # Component docs
```

### AI Consensus Reviews

**Review File:** `docs/ai-workflow/BRAINSTORM-CONSENSUS.md`

- [ ] Claude Code Review ✅
- [ ] Claude Desktop Review ✅
- [ ] Gemini Code Assist Review ✅
- [ ] Roo Code (Grok) Review ✅
- [ ] ChatGPT-5 QA Review ✅

**Issues Raised:** [Count]
**Issues Resolved:** [Count]

**Consensus Date:** YYYY-MM-DD
**Approval Status:** 🟢 ALL AIs APPROVED / 🔴 BLOCKED

---

## 💻 PHASE 1-7: Code Implementation & Approval

### Implementation Summary

**Files Created:**
- `frontend/src/components/FeatureName/FeatureName.tsx`
- `backend/routes/featureRoutes.js`
- `backend/controllers/featureController.js`
- `backend/migrations/YYYYMMDD-create-feature-table.js`

**Files Modified:**
- `backend/routes/index.js` - Added feature routes
- `frontend/src/App.tsx` - Added new route

**Lines of Code:**
- Frontend: +XXX lines
- Backend: +XXX lines
- Tests: +XXX lines

---

### ✅ Checkpoint #1: Code Quality

**AI:** Roo Code (Grok)
**Date:** YYYY-MM-DD HH:MM
**Status:** ✅ PASS / ❌ FAIL

**Issues Found:**
- [Issue 1] → FIXED
- [Issue 2] → FIXED

**Result:** Code quality is good ✅

---

### ✅ Checkpoint #2: Logic Review

**AI:** Gemini Code Assist
**Date:** YYYY-MM-DD HH:MM
**Status:** ✅ PASS / ❌ FAIL

**Issues Found:**
- [Issue 1] → FIXED
- [Issue 2] → FIXED

**Result:** Logic is sound ✅

---

### ✅ Checkpoint #3: Security Review

**AI:** Claude Desktop (4.5 Sonnet)
**Date:** YYYY-MM-DD HH:MM
**Status:** ✅ PASS / ❌ FAIL

**Security Checks:**
- [ ] SQL injection protection ✅
- [ ] XSS prevention ✅
- [ ] Authentication enforced ✅
- [ ] Authorization checked ✅
- [ ] RLS enforced (tenant_id) ✅
- [ ] No secrets hardcoded ✅

**Issues Found:**
- [Issue 1] → FIXED
- [Issue 2] → FIXED

**Result:** No security vulnerabilities ✅

---

### ✅ Checkpoint #4: Testing Review

**AI:** ChatGPT-5
**Date:** YYYY-MM-DD HH:MM
**Status:** ✅ PASS / ❌ FAIL

**Test Coverage:**
- Unit Tests: XX%
- Integration Tests: XX%
- Overall Coverage: XX% (Target: ≥85%)

**Tests Created:**
- `frontend/src/components/FeatureName/__tests__/FeatureName.test.tsx`
- `backend/tests/feature.test.js`

**Test Results:**
```
Test Suites: X passed, X total
Tests:       XX passed, XX total
Coverage:    XX%
```

**Issues Found:**
- [Issue 1] → FIXED with tests

**Result:** Test coverage ≥85% ✅

---

### ✅ Checkpoint #5: Performance Review

**AI:** Codex (GPT-4)
**Date:** YYYY-MM-DD HH:MM
**Status:** ✅ PASS / ❌ FAIL

**Performance Checks:**
- [ ] No N+1 queries ✅
- [ ] Efficient algorithms ✅
- [ ] No memory leaks ✅
- [ ] React optimizations ✅
- [ ] Caching used appropriately ✅

**Issues Found:**
- [Issue 1] → OPTIMIZED
- [Issue 2] → OPTIMIZED

**Result:** Performance is good ✅

---

### ✅ Checkpoint #6: Integration Review

**AI:** Claude Code (4.5 Sonnet)
**Date:** YYYY-MM-DD HH:MM
**Status:** ✅ PASS / ❌ FAIL

**Integration Checks:**
- [ ] Fits existing architecture ✅
- [ ] No breaking changes ✅
- [ ] Dependencies compatible ✅
- [ ] Follows project patterns ✅
- [ ] Migration safe ✅

**Issues Found:**
- [Issue 1] → REFACTORED
- [Issue 2] → REFACTORED

**Result:** Integrates cleanly ✅

---

### ✅ Checkpoint #7: Human Review

**Reviewer:** [Your Name]
**Date:** YYYY-MM-DD HH:MM
**Status:** ✅ PASS / ❌ FAIL

**Manual Testing Checklist:**

**Functional Testing:**
- [ ] Feature works in dev environment
- [ ] Happy path tested
- [ ] Edge cases tested
- [ ] Error handling tested
- [ ] Multi-tenant isolation verified

**UI/UX Testing:**
- [ ] Mobile responsive
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Intuitive to use

**Security Testing:**
- [ ] Cannot access other tenant's data
- [ ] Role-based access works
- [ ] Input validation works
- [ ] XSS attempts blocked

**Performance Testing:**
- [ ] Page load <2s
- [ ] API response <500ms
- [ ] No console errors
- [ ] No memory leaks (check DevTools)

**Business Logic:**
- [ ] Solves the actual problem
- [ ] Meets all acceptance criteria
- [ ] Edge cases handled

**Code Quality:**
- [ ] I understand what this does
- [ ] Future me can maintain this
- [ ] Documentation is clear

**Result:** All checks passed ✅

---

## 📊 Summary

### Time Tracking

| Phase | Time Spent |
|-------|------------|
| Phase 0 (Design Consensus) | XX minutes |
| Implementation | XX minutes |
| Checkpoint #1 (Code Quality) | XX minutes |
| Checkpoint #2 (Logic) | XX minutes |
| Checkpoint #3 (Security) | XX minutes |
| Checkpoint #4 (Testing) | XX minutes |
| Checkpoint #5 (Performance) | XX minutes |
| Checkpoint #6 (Integration) | XX minutes |
| Checkpoint #7 (Human Review) | XX minutes |
| **Total** | **XX minutes** |

### Issue Tracking

| Checkpoint | Issues Found | Issues Fixed | Status |
|------------|--------------|--------------|--------|
| Design Consensus | X | X | ✅ |
| Code Quality | X | X | ✅ |
| Logic | X | X | ✅ |
| Security | X | X | ✅ |
| Testing | X | X | ✅ |
| Performance | X | X | ✅ |
| Integration | X | X | ✅ |
| Human Review | X | X | ✅ |
| **Total** | **XX** | **XX** | **✅** |

---

## 🚀 Deployment

### Pre-Deployment Checklist
- [ ] All 7 checkpoints passed
- [ ] Tests passing (≥85% coverage)
- [ ] No console errors
- [ ] Database migrations tested
- [ ] Environment variables set (if new ones added)
- [ ] Documentation updated

### Git Workflow
```bash
# Commit with conventional commits format
git add .
git commit -m "feat: [feature description]

- [Detail 1]
- [Detail 2]
- Passed 7 AI review checkpoints
- Test coverage: XX%"

# Push feature branch
git push origin feature/[feature-name]

# Create pull request
# Merge to main after approval
```

### Deployment Status
- [ ] Merged to `main`
- [ ] Deployed to staging
- [ ] Tested in staging
- [ ] Deployed to production
- [ ] Smoke tests passed
- [ ] Monitoring alerts set

---

## 📝 Lessons Learned

### What Went Well
- [Point 1]
- [Point 2]

### What Could Be Improved
- [Point 1]
- [Point 2]

### Process Improvements
- [Suggestion 1]
- [Suggestion 2]

---

## 🔗 Related Resources

- Design Review: `docs/ai-workflow/BRAINSTORM-CONSENSUS.md#[feature-name]`
- API Docs: [Link if generated]
- Component Docs: `src/components/FeatureName/README.md`
- Tests: `src/components/FeatureName/__tests__/`

---

**Feature Status:** 🟢 COMPLETE AND DEPLOYED

**Quality Score:** [X/7 checkpoints passed]

**Deployment Date:** YYYY-MM-DD

---

*Template Version: 1.0*
*Last Updated: 2025-10-27*
