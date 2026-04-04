# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7-20260318 | **Duration:** 125.3s
> **Files:** docs/ai-workflow/blueprints/ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md
> **Generated:** 4/2/2026, 8:47:53 PM

---

# Risk Assessment: SwanStudios Client Onboarding Workflow Overhaul

## Executive Summary

This plan has **2 CRITICAL risks**, **3 HIGH risks**, **2 MEDIUM risks**, and **1 LOW risk** that must be addressed before execution. The most pressing concerns are unverified backend claims, missing testing strategy, and undefined phase structure.

---

## 1. Dependency Risks

### Risk Rating: CRITICAL

**Analysis:**
The plan references "Phase 4 (voice)" and "0→1→2→3→4→5" ordering, but **no phase breakdown exists in the document**. This creates significant dependency ambiguity.

**Identified Dependencies:**
| Item | Blocks | Blocked By |
|------|--------|------------|
| `aiChatRoutes.mjs` (3A) | All frontend onboarding pre-fill features | — |
| `OnboardingStatusCard.tsx` (3B) | Client-side glowing tab | `aiChatRoutes.mjs` (needs data) |
| `MasterDetailLayout.tsx` (3B) | Admin onboarding column | `adminClientController.mjs` |
| `ContextChipBar.tsx` (3D) | Teach Me system | `SwanCoachConstants.ts` |
| `HiveMind verification` (3E) | Deployment confidence | All other phases |

**Phase 4 Voice Delay Impact:**
If "Phase 4" refers to voice-first features (mentioned in differentiators but absent here), a delay would cascade into:
- Frontend components expecting voice input cannot be built
- AI prompt iterations cannot be tested with real voice data
- No fallback to text-only MVP defined

**Mitigation:**
```
1. Define explicit phases with hard blockers:
   Phase 0: Hive Mind verification (unblocks all AI features)
   Phase 1: Backend create_client + questionnaire creation
   Phase 2: Client dashboard glowing tab (frontend-only, can parallel)
   Phase 3: Trainer/Admin dashboards
   Phase 4: Teach Me system
   Phase 5: Polish + visual regression

2. Implement Phase 4 voice as feature-flagged with text fallback
3. Add dependency diagram to plan document
```

---

## 2. Technical Unknowns

### Risk Rating: HIGH

**Issue 1: Gemini SDK Version**
- Plan references AI features but doesn't specify:
  - Gemini API version (1.0 vs 1.5 vs 2.0)
  - Token limits at current scale
  - Cost implications of pre-fill prompts
  - Multi-model "Hive Mind" implementation status

**Issue 2: MediaRecorder Browser Compatibility**
- `MediaRecorder` API has 85% global support
- Safari iOS requires specific MIME types (`audio/mp4`)
- Firefox requires explicit permission handling
- Plan doesn't address fallback to Web Speech API

**Issue 3: react-markdown Bundle Size**
- `react-markdown` + plugins adds ~40KB gzipped
- `rehype-highlight` adds additional overhead
- Markdown rendering for exercise database could be heavy

**Mitigation:**
```
1. Before Phase 0:
   - Audit current aiChatService.mjs for Hive Mind implementation
   - Run: npx depcruise frontend/src --exclude 'react-markdown'
   - Test MediaRecorder on Safari iOS 16+ simulator

2. For bundle size:
   - Use dynamic import: const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'))
   - Set webpack chunk name for code splitting
   - Add bundle size CI check: max 150KB for markdown rendering

3. For voice compatibility:
   - Implement capability detection on mount
   - Fallback chain: MediaRecorder → Web Speech API → text-only
   - Document supported browsers (Chrome 90+, Safari 15+, Firefox 100+)
```

---

## 3. Scope Creep Indicators

### Risk Rating: HIGH

**HIGH PROBABILITY of scope expansion:**

| Feature | Creep Potential | Why |
|---------|-----------------|-----|
| **Markdown rendering** | CRITICAL | "All edge cases" in original plan — code blocks, tables, custom components, KaTeX math, GFM vs CommonMark |
| **Voice-first AI** | HIGH | "All browsers" — Safari, Firefox, mobile, accessibility (a11y), offline, background noise |
| **Teach Me system** | MEDIUM | "3-4 sentence tooltip" → full modal → video tutorials → interactive walkthrough |
| **Glowing animation** | MEDIUM | Simple pulse → GPU particle effects → confetti on completion → seasonal themes |
| **Progress tracking** | HIGH | "8-dot tracker" → animated progress → comparison with peers → historical trends |

**Red Flags in Current Plan:**
- Section 3A mentions "Calculate completionPercentage based on filled sections" — doesn't define algorithm
- Section 3E is "verification" but has no defined scope
- Section 8 questions (7-8) about NASM OPT Phase recommendations are deferred but could become requirements

**Mitigation:**
```
1. Freeze markdown scope: GFM (tables, strikethrough, task lists) only, no custom components
2. Voice MVP: Chrome desktop only, feature-flag others, document known limitations
3. Teach Me: Single tooltip, max 50 words, dismissible, no persistence tracking
4. Glowing: Pure CSS @keyframes only, no canvas/WebGL, 60fps cap
5. Progress: Binary (complete/incomplete) for Phase 1, percentage in Phase 2

6. Add scope boundary document with explicit OUT-OF-SCOPE items
7. Any scope expansion requires written change request + 1 sprint delay
```

---

## 4. Effort Accuracy

### Risk Rating: MEDIUM

**File Count Analysis:**
| File | Estimated Lines | Reality Check | Risk |
|------|-----------------|---------------|------|
| `aiChatRoutes.mjs` | ~300 max | **Will exceed** — prompt engineering alone | HIGH |
| `aiChatService.mjs` | ~300 max | **Will exceed** — Hive Mind logic + fallback chain | CRITICAL |
| `SwanCoachConstants.ts` | ~300 max | Safe — static config only | LOW |
| `ContextChipBar.tsx` | ~300 max | Safe — tooltip logic is simple | LOW |
| `OnboardingStatusCard.tsx` | ~300 max | **Will exceed** — glow animation + progress + edge cases | HIGH |
| `MyClientsView.tsx` | ~300 max | **Will exceed** — list virtualization + filtering | MEDIUM |
| `MasterDetailLayout.tsx` | ~300 max | **Will exceed** — column management + sorting | HIGH |

**Line Count Assumptions That Will Fail:**
1. `aiChatService.mjs` — current file likely 400-600 lines; adding Hive Mind + multi-provider fallback will add 200+ lines
2. `OnboardingStatusCard.tsx` — adding `onboardingGlow` keyframes, progress calculation, responsive design, and accessibility attributes easily exceeds 300 lines
3. `MyClientsView.tsx` — pagination, empty states, loading skeletons, and incomplete onboarding filtering adds significant complexity

**Estimated True Effort:**
| Category | Plan Estimate | Realistic Estimate |
|----------|---------------|-------------------|
| Backend | 3 files | 4 files, 1,200 lines |
| Frontend Modifies | 5 files | 6 files, 1,800 lines |
| Frontend Creates | 2 files | 3 files, 900 lines |
| **Total** | 22 new/modified files | 28 files, ~4,500 lines |

**Mitigation:**
```
1. Break aiChatService.mjs into modules:
   - aiChatService.mjs (orchestration, ~200 lines)
   - aiProviders.mjs (provider configs, ~150 lines)
   - aiHiveMind.mjs (consensus logic, ~300 lines)

2. Break aiChatRoutes.mjs:
   - Keep route handlers in routes file
   - Move action handlers to controllers

3. Create shared OnboardingProgress component:
   - Used by both OnboardingStatusCard and MyClientsView
   - Reduces duplication, easier to test

4. Set line count budgets per component, not per file
5. Add ESLint rule: max-lines-per-file: 400 with exceptions for services
```

---

## 5. Testing Gaps

### Risk Rating: CRITICAL

**Current State: NO TESTING STRATEGY EXISTS IN PLAN**

**What's Missing:**

| Test Type | Missing? | Impact |
|-----------|----------|--------|
| Unit tests for hooks | Not defined | HIGH — `useOnboardingProgress` has complex state |
| Integration tests for create_client flow | Not defined | CRITICAL — database transactions |
| E2E for sidebar navigation | Not defined | HIGH — user-facing critical path |
| Visual regression for markdown | Not defined | MEDIUM — style drift |
| Accessibility tests | Not defined | HIGH — glowing animation may violate WCAG |
| API contract tests | Not defined | MEDIUM — aiChatRoutes.mjs changes |
| Load testing for Hive Mind | Not defined | MEDIUM — multi-model latency |

**Specific Test Scenarios Not Covered:**
```typescript
// MUST HAVE tests that are missing:

1. "AI creates Move Fitness client with pre-filled questionnaire"
   - Verify: User created, questionnaire created, sessions=0

2. "AI creates SwanStudios client with pre-filled questionnaire"
   - Verify: User created, questionnaire created, sessions=N

3. "Client with 3/8 sections completed sees glowing tab"
   - Verify: CSS animation, click navigation, correct stage

4. "Glowing animation passes WCAG 2.1 Motion reduction"
   - Verify: prefers-reduced-motion disables animation

5. "Hive Mind falls back when Gemini fails"
   - Verify: graceful degradation, error logging

6. "Teach Me tooltip shows on first click only"
   - Verify: localStorage flag, dismissibility
```

**Mitigation:**
```
BEFORE ANY CODE: Define testing pyramid

Phase 0.5 (Parallel to development):
├── Unit Tests (Jest + React Testing Library)
│   ├── useOnboardingProgress hook
│   ├── calculateCompletionPercentage utility
│   ├── ContextChipBar interactions
│   └── TeachMeTooltip logic
│
├── Integration Tests (Supertest)
│   ├── POST /api/admin/clients (create_client action)
│   ├── GET /api/admin/clients (with onboarding status)
│   └── AI action handler processing
│
├── E2E Tests (Playwright)
│   ├── Coach Assistant → create client flow
│   ├── Client sees glowing tab → completes onboarding
│   ├── Trainer sees incomplete onboarding list
│   └── Admin filters by onboarding status
│
├── Visual Regression (Chromatic/Percy)
│   ├── OnboardingStatusCard (glowing states)
│   ├── Progress indicator (all 8 stages)
│   └── TeachMe tooltip appearance
│
└── Accessibility (axe-core)
    ├── Glowing animation respects prefers-reduced-motion
    ├── Keyboard navigation of onboarding wizard
    └── Screen reader announcements for status changes

Set CI gate: 80% code coverage for new files, all tests must pass
```

---

## 6. Rollback Plan

### Risk Rating: HIGH

**Current State: NO ROLLBACK STRATEGY DEFINED**

**Problem:**
If `aiChatRoutes.mjs` or `aiChatService.mjs` changes break production:
- User account creation fails
- All AI chat features potentially broken
- No feature flag to disable

**Attack Surface:**
```javascript
// What breaks if aiChatService.mjs has a bug:

1. AI chat returns 500 errors for ALL contexts
2. create_client action creates User but not Questionnaire
   → Orphaned user records
   → No onboarding pre-fill
   → Admin confusion

3. Hive Mind fallback fails
   → Requests hang, timeout
   → Poor UX during rollout
```

**Mitigation:**
```
1. Feature Flags (LaunchDarkly or Unleash):

Feature Flag: onboarding_prefill_enabled
├── Default: false (rollout to 0%)
├── Phase 1: 10% of admin users
├── Phase 2: 50% of admin users
├── Phase 3: 100% of admin users
└── Kill switch: Instantly disable, revert to old behavior

Feature Flag: glowing_tab_enabled
├── Default: false
├── Per-client: enable for test accounts first
└── Kill switch: Removes tab from DOM entirely

2. Database Rollback Script:
   - If questionnaire creation fails mid-transaction, entire transaction rolls back
   - Script to clean up orphaned User records if migration needed

3. Canary Deployment:
   - Deploy backend changes
   - Monitor error rate for 24 hours before enabling frontend
   - Auto-rollback if error rate > 2%

4. Feature Flag Code Pattern:
   ```typescript
   const shouldShowPrefill = await featureFlag.isEnabled(
     'onboarding_prefill_enabled',
     { userId: currentUser.id }
   );
   
   if (!shouldShowPrefill) {
     // Fall back to existing behavior
     return legacyCreateClient(data);
   }
   ```
```

---

## 7. Database Migration Risks

### Risk Rating: HIGH (Misleading Claim)

**CRITICAL FINDING: Plan claims "zero backend work" for Phase 1 — THIS IS FALSE**

**What Phase 1 Actually Requires:**

| Action | Database Impact | Work Required |
|--------|------------------|----------------|
| Create `ClientOnboardingQuestionnaire` | INSERT to existing table | None — table exists |
| Store pre-filled fields in `responsesJson` | UPDATE JSONB column | None |
| Store `clientSource` | UPDATE existing `clientSource` field | None |
| Add `incompleteOnboardingCount` to response | None — computed at query time | **Backend code change** |
| Track `teachMeShown` flags | None — localStorage only | None |

**Zero Backend Work Claim Assessment: PARTIALLY TRUE**
- Database schema: No changes needed ✓
- New tables: None required ✓
- Migrations: None required ✓

**BUT:**
- `aiChatRoutes.mjs` changes ARE backend work
- `aiChatService.mjs` prompt changes ARE backend work
- `adminClientController.mjs` changes ARE backend work

**Hidden Database Risks:**
1. **JSONB query performance**: `responsesJson` queries without indexes may slow `getClients`
2. **Completion percentage calculation**: If done in SQL, may require new query optimization
3. **Existing questionnaire data**: 85-question schema must be mapped correctly
4. **Transaction atomicity**: User + Questionnaire + Assignment + Progress must all succeed or all fail

**Mitigation:**
```
1. Acknowledge backend work exists — rewrite "zero backend work" to:
   "No database schema changes required, but 3 backend files need modification"

2. Add database indexes for common queries:
   ```sql
   CREATE INDEX idx_onboarding_status 
   ON client_onboarding_questionnaire(status) 
   WHERE completed_at IS NULL;
   
   CREATE INDEX idx_onboarding_client_status 
   ON client_onboarding_questionnaire(client_id, status);
   ```

3. Verify atomic transaction:
   - Test: Simulate failure at each step
   - Ensure: Rollback on any failure

4. Add logging for pre-fill debugging:
   ```javascript
   logger.info('Client pre-fill completed', {
     clientId,
     preFilledSections: ['BasicInfo', 'Goals', 'Health'],
     completionPercentage: 37.5
   });
   ```

5. Audit existing 85-question schema mapping:
   - Document field-by-field mapping from AI extract to responsesJson
   - Identify questions with no AI mapping (manual entry required)
```

---

## 8. Phase Ordering

### Risk Rating: MEDIUM

**Current Issue: Phases Not Defined**

The plan mentions "0→1→2→3→4→5" but provides no phase breakdown. Based on file groupings, here's optimal ordering:

**PROPOSED REORDERING:**

| Current Order | Proposed Order | Rationale |
|---------------|----------------|-----------|
| (implied 1) 3A Backend | **Phase 0: Verify Hive Mind** | Unblock

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
