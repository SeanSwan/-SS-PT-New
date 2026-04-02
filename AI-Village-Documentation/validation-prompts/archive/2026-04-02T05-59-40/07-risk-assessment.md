# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7-20260318 | **Duration:** 77.5s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md
> **Generated:** 4/1/2026, 10:59:40 PM

---

# Implementation Plan Risk Assessment: Bootcamp Sprint Planner + Pain Chart Upgrade + Calendar

## Executive Summary

**Overall Risk Rating: HIGH**

This plan has solid architectural thinking but contains several critical gaps: a false "zero backend work" claim, unrealistic line-count estimates, no testing strategy, and ambiguous technical decisions that could derail delivery. The plan is implementable but requires significant refinement before sprint execution.

---

## 1. Dependency Risks

### 1.1 Phase Blocking Dependencies

| Phase | Blocked By | Blocks | Risk Level |
|-------|-----------|--------|------------|
| A: Database & Models | Nothing | B, C, D, E, F | CRITICAL |
| B: Sprint Generation Engine | A | F | HIGH |
| C: Bootcamp Calendar | A | Nothing (parallel) | MEDIUM |
| D: Pain Chart Anatomical | A | E | HIGH |
| E: Pain Chart Dashboard | A, D | F | HIGH |
| F: Pain-Aware Workout Gen | B, E | Nothing | CRITICAL |

**Critical Path:** A → B → F (or A → E → F)
**Parallelizable:** C can run immediately after A

### 1.2 Phase 4 (Voice) Reference Error

> ⚠️ **You referenced "Phase 4 (voice) takes longer than expected" but this plan has no voice/Phase 4.**

The plan contains phases A–F (Sprint System → Pain-Aware Workout Gen). No voice feature exists in this scope. Either:
- You're referencing a different plan document
- Scope was merged from another initiative
- This is a copy-paste artifact

**Action Required:** Clarify whether voice AI is in-scope or remove this dependency reference.

### 1.3 Cross-Feature Integration Risk

Phase F (Pain-Aware Workout Generation) is the highest-dependency feature, requiring:
- Sprint generation engine (B) completion
- Pain chart dashboard integration (E) completion
- Bootcamp generator modifications
- Coach Assistant enrichment pipeline changes

**If Phase F slips, it doesn't block other phases—it's additive value.**

**Rating: HIGH**

### Mitigations
- [ ] Run Phase C (Calendar) in parallel with B, D, E—no dependencies
- [ ] Consider deprecating Phase F to a Phase 2 if timeline is tight
- [ ] Define explicit API contracts between phases before coding begins

---

## 2. Technical Unknowns

### 2.1 Anatomical Image Generation ("nano banana 2")

| Unknown | Impact | Resolution |
|---------|--------|------------|
| What is "nano banana 2"? | Cannot estimate image quality/availability | Identify actual tool (Midjourney, DALL-E, Stable Diffusion, etc.) |
| Medical illustration accuracy | Liability risk if anatomy labels are wrong | Reference Netter's or Gray's Anatomy for label positions |
| Mobile zoom quality at 2048x4096 | May appear blurry on high-DPI screens | Test on iPhone 14 Pro (3x scaling) before committing |
| Transparent background extraction | AI tools struggle with this | Generate with dark background; match to theme color in CSS |

**Rating: HIGH**

### 2.2 SVG Hotspot Precision

Mapping 42 clickable regions onto AI-generated images is non-trivial:
- Image dimensions may vary
- Body proportions differ between generated images
- Hotspots must scale proportionally with image

**If images are regenerated (to fix anatomy issues), all hotspot coordinates become invalid.**

**Rating: HIGH**

### Mitigations
- [ ] Lock image generation early in Phase D; no regeneration after hotspot mapping
- [ ] Use percentage-based coordinates (0-100%) rather than absolute pixels
- [ ] Create SVG coordinate tool or use existing solution (e.g., `svgexport` + manual mapping)
- [ ] Validate hotspot accuracy with automated screenshot comparison

### 2.3 MediaRecorder Browser Compatibility

*Referenced in your questions but not in plan.* If voice features are added:
- Safari iOS: Limited MediaRecorder support (requires polyfill)
- Firefox Android: Partial support
- Safari macOS: Requires user gesture to start recording

**Rating: MEDIUM** (only if voice is added)

### 2.4 react-markdown Bundle Size

Not mentioned in plan, but likely relevant for pain chart notes or class descriptions.

- react-markdown + plugins: ~30KB gzipped
- If syntax highlighting is needed: +20KB
- If LaTeX rendering needed: +80KB

**Rating: LOW** (unless math notation required)

---

## 3. Scope Creep Indicators

### 3.1 Highest Expansion Risk Features

| Feature | Creep Potential | Warning Sign |
|---------|-----------------|--------------|
| **Anatomical Image Generation** | "Ultra-realistic medical illustration quality" is subjective and infinite | Accept first image that's "good enough" |
| **Pain → Bootcamp Integration (Phase F)** | Touches 4 different systems; each can expand | Nail down exclusion vs. flagging decision early |
| **Label System** | "Clean labels with leader lines" — 20+ labels per view | Limit to 8-10 visible labels; "show more" for detail |
| **Calendar Customization** | View preferences, color themes, drag-drop rescheduling | Ship month/week/list; defer drag-drop |
| **Muscle/Bone Toggle** | Separate hotspot sets for each view | Merge into single hotspot layer with visibility toggle |

### 3.2 "Ultra-Realistic" Ambiguity

The requirement states:
> "Ultra-realistic medical illustration quality (NOT cartoon/stylized)"

This is a quality ceiling with no floor. AI image generation is iterative—expect 5-15 revision rounds per image.

**Rating: HIGH**

### Mitigations
- [ ] Define acceptance criteria as "identifiable major muscle groups" not "medical textbook quality"
- [ ] Set max 3 revision rounds per image
- [ ] Budget 2-3 days for image generation, not 1

---

## 4. Effort Accuracy

### 4.1 Line Count Analysis

**Claim:** 22 new files, 300 lines max each = 6,600 lines total

| Component Type | Expected Lines | Files | Total |
|----------------|----------------|-------|-------|
| Simple API routes | 80-120 | 8 | 800 |
| Database models (Sequelize) | 150-250 | 3 | 600 |
| React pages (SprintPlannerPage, BootcampCalendar) | 400-600 | 2 | 1,000 |
| Complex React components (BodyMap layers) | 500-800 | 4 | 2,400 |
| Services (SprintGenerationService) | 300-450 | 2 | 700 |
| Migrations | 100-150 | 3 | 400 |
| **Conservative Estimate** | | | **~5,900** |

**Realistic range: 5,500–7,500 lines**

### 4.2 Files Likely to Exceed 300 Lines

| File | Estimated Lines | Reason |
|------|-----------------|--------|
| SprintPlannerPage.tsx | 450-550 | Wizard + timeline + week expansion |
| BootcampCalendar.tsx | 500-600 | Month/week/list views + slide-out |
| BodyMap/AnatomicalOverlay.tsx | 600-800 | Layer system + 42 hotspots + toggles |
| SprintGenerationService.ts | 400-500 | 4 progression strategies + deload logic |
| CalendarGrid.tsx | 350-450 | Complex date rendering + event positioning |

**Rating: MEDIUM** (underestimate by 20-30%)

### Mitigations
- [ ] Adjust estimate to 18 files with 400-line average = 7,200 lines
- [ ] Identify files that can be split (e.g., separate calendar grid from calendar container)
- [ ] Pre-define component boundaries to prevent god-class accumulation

---

## 5. Testing Gaps

### 5.1 Current Testing Coverage

**Explicitly stated in plan:** NONE

### 5.2 Recommended Testing Strategy

| Test Type | Coverage Target | Files to Test |
|-----------|-----------------|---------------|
| **Unit Tests (Jest + React Testing Library)** | 80% coverage on services | SprintGenerationService, exerciseMemory logic, progression strategies |
| **Component Tests** | Key user flows | BodyMap hotspots, SprintWizard steps, Calendar navigation |
| **Integration Tests** | API contracts | All `/api/bootcamp/sprints/*` endpoints |
| **E2E Tests (Playwright)** | Critical paths | Sprint creation → generation → calendar confirmation |
| **Visual Regression** | UI consistency | BodyMap layers, Calendar month view, Pain chart dashboard |

### 5.3 Specific Test Cases Missing

```typescript
// SprintGenerationService tests
- "generates correct class count for MWF 12-week sprint"
- "accumulates exercise keys in exerciseMemory"
- "applies deload modifier every 4th week"
- "excludes exercises from previous sprint"

 // BodyMap tests
- "hotspot click fires correct region ID"
- "gender toggle swaps image layer"
- "muscle labels toggle visibility"
- "pain indicator appears for existing entry"

// Calendar tests
- "merges sprint slots with ad-hoc logs"
- "planned classes show dotted border"
- "confirming class updates wasUsed and usedDate"
```

**Rating: CRITICAL**

### Mitigations
- [ ] Allocate 15-20% of Phase B and Phase C time to testing
- [ ] Use TDD for SprintGenerationService (highest business logic density)
- [ ] Set up Playwright CI pipeline for E2E tests
- [ ] Add Chromatic or Percy for visual regression on BodyMap

---

## 6. Rollback Plan

### 6.1 Feature Flag Strategy

| Feature | Flag Name | Granularity |
|---------|-----------|-------------|
| Sprint Planner | `FEATURE_SPRINT_PLANNER` | Trainer-level |
| Pain Chart Upgrade | `FEATURE_ANATOMICAL_BODYMAP` | Global |
| Pain Dashboard Integration | `FEATURE_PAIN_DASHBOARD` | Role-based (client/trainer/admin) |
| Pain-Aware Generation | `FEATURE_PAIN_BOOTCAMP_INTEGRATION` | Trainer-level |

### 6.2 Rollback Scenarios

| Failure Mode | Detection | Rollback Action |
|--------------|-----------|-----------------|
| Sprint generation produces invalid data | Unit test failure, smoke test | Disable `FEATURE_SPRINT_PLANNER`; existing classes unaffected |
| BodyMap hotspots misaligned | QA report, user complaint | Disable `FEATURE_ANATOMICAL_BODYMAP`; revert to SVG-only |
| Pain injection breaks bootcamp generator | Generation error logs | Disable `FEATURE_PAIN_BOOTCAMP_INTEGRATION` |
| Calendar causes performance issues | APM alert | Disable calendar component; sprint slots still accessible via list view |

**Rating: MEDIUM** (good practice, but no explicit flag infrastructure in plan)

### Mitigations
- [ ] Use LaunchDarkly or Unleash for feature flags
- [ ] Add flags before Phase C begins (calendar is most visible)
- [ ] Document flag cleanup procedure (remove after 2-week stable period)

---

## 7. Database Migration Risks

### 7.1 Schema Changes Required

| Table | Change Type | Risk |
|-------|-------------|------|
| **NEW: bootcamp_sprints** | Create | LOW (additive) |
| **NEW: sprint_weeks** | Create | LOW (additive) |
| **NEW: sprint_class_slots** | Create | MEDIUM (FK to existing tables) |
| **bootcamp_class_logs** | Add columns: sprintId, wasUsed, usedDate, trainerConfirmedAt | MEDIUM (existing data migration) |
| **bootcamp_sprints** | Add exerciseMemory JSONB | LOW |

### 7.2 The "Zero Backend Work" Claim is FALSE

> ❌ **Phase 1 (Plan) = Phase A (Implementation) requires significant backend work.**

The plan states:
> "Phase 1: Zero backend work — pure frontend components"

But Phase A explicitly requires:
- 3 new Sequelize models
- Database migrations
- 8+ new API endpoints
- Updates to existing bootcamp_class_logs table

**This is a planning error that must be corrected.**

### 7.3 Migration Risks

| Risk | Impact | Likelihood |
|------|--------|------------|
| FK constraint on sprint_class_slots → bootcamp_classes | Migration failure if parent records missing | MEDIUM |
| JSONB exerciseMemory grows unbounded | Performance degradation on sprint queries | HIGH |
| wasUsed/usedDate null handling | Existing logs show as "not confirmed" | LOW (acceptable) |

### 7.4 exerciseMemory Growth Concern

A 12-week sprint with 36 classes × 30 exercises each = 1,080 exercise keys in JSONB.

- Query performance: Acceptable (PostgreSQL handles JSONB well up to ~10MB)
- Serialization: Ensure lazy loading (don't fetch exerciseMemory in list views)

**Rating: HIGH** (the false "zero backend" claim is critical)

### Mitigations
- [ ] Correct plan documentation: Phase A requires backend
- [ ] Create migration strategy: Add nullable columns first, backfill, then add constraints
- [ ] Index sprintId and scheduledDate on sprint_class_slots
- [ ] Implement pagination for sprint queries (don't load all 12 weeks at once)
- [ ] Set up migration rollback scripts

---

## 8. Phase Ordering

### 8.1 Current Order: A → B → C → D → E → F

```
A: Database & Models (Sequential #1)
B: Sprint Generation Engine (Sequential #2)
C: Bootcamp Calendar (after A)
D: Pain Chart Anatomical (after A)
E: Pain Chart Dashboard (after D)
F: Pain-Aware Workout Gen (after B+E)
```

### 8.2 Optimization Opportunities

| Change | Current | Proposed | Benefit |
|--------|---------|----------|---------|
| **Parallelize D and C** | Sequential after A | Parallel after A | -1 week timeline |
| **Defer F to Phase 2** | Phase 6 | Removed from Phase 1 | -1 week, reduces risk |
| **Reorder D before B** | D→E→B | D→E→B | Pain data ready for sprint engine |

### 8.3 Recommended Phase Order

```
Week 1:    A (Database & Models)
Weeks 2-3: B (Sprint Engine) + D (Pain Chart Anatomy) [PARALLEL]
Weeks 4-5: C (Calendar) + E (Pain Dashboard) [PARALLEL]
Week 6:    Integration testing, bug fixes
Week 7:    F (Pain-Aware Generation) [OR DEFER]
```

**Faster value delivery by shipping Calendar and Pain Dashboard before full sprint generation is complete.**

### 8.4 Could Any Phases Be Reordered for Faster Value?

**Yes. Two options:**

| Option | Order | Value Delivered | Risk |
|--------

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
