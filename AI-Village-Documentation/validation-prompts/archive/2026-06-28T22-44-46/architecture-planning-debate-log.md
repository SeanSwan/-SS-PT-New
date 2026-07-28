# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 14,716 input / 5,326 output

---

## Senior Architecture Lead — Round 1

# Architecture Review: Training Command Unification
**Reviewer:** Senior Code Quality / Architecture Lead
**Plan:** `training-command-unification-village-brief-2026-06-28.md`
**Date:** 2026-06-28
**Verdict:** Staged build order is correct. Seven critical findings and twelve material findings require resolution before any slice ships.

---

## Executive Summary

The plan's staged order (backfill safety → preview-to-prefill → in-logger picker → unified shell) is architecturally sound. The primary risks are: a missing canonical source-contract type that will cause silent billing failures across three write paths; a sessionStorage prefill channel that creates race conditions and stale-state bugs; prop-drilling depth in the logger prefill path that will cause re-render cascades; absent error boundaries on lazy-loaded training surfaces; two files that will exceed the 300-line budget on first pass; a duplicated write-path risk where the AI approval service and the admin controller both write workout logs through different code paths; and a state-management gap where `TrainingTabSectionContent` currently holds no shared context, forcing child components to independently re-fetch the same plan catalog data.

---

## CRITICAL FINDINGS (Severity 🔴)

---

### Finding C-1: Missing Canonical Source-Contract Type — Silent Billing Risk

**Severity:** 🔴 Critical
**Files affected:**
- `backend/services/workout/aiWorkoutDailyFormService.mjs`
- `backend/services/ai/coachActionProposalApprovalService.mjs`
- `backend/controllers/adminWorkoutLoggerController.mjs`
- `frontend/src/components/WorkoutLogger/WorkoutLogger.loadTodaysPlan.ts`
- All new prefill/picker files

**Issue:**

The plan correctly identifies that `adminWorkoutLoggerController.mjs:73` has `historical_import` and `move_fitness_historical_import` source strings that trigger `suppressEngagementSideEffects`, while `aiWorkoutDailyFormService.mjs` has no first-class `workoutSource` field. This is not a documentation gap — it is a live billing risk. When `coachActionProposalApprovalService.mjs:189` calls `submitAiWorkoutLogAsDailyForm`, it passes `plannedAssignment` but no source flag. A Coach-approved historical backfill today will silently deduct paid-session credits from a real client's balance and trigger XP/social side effects as if the client trained today.

The deeper architectural problem is that there are currently **two independent write paths** for workout logs:

```
Path A (Admin/Manual):
adminWorkoutLoggerController.mjs:73
  → workoutLogService.mjs:256 (suppressEngagementSideEffects)

Path B (AI/Coach):
coachActionProposalApprovalService.mjs:189
  → aiWorkoutDailyFormService.mjs:50
  → workoutLogService.mjs:256 (NO suppressEngagementSideEffects)
```

Path B does not pass the suppression flag. The plan's Question 3 asks whether historical backfill should use the AI daily-form service, the admin controller, or a new adapter. The answer must be: **one canonical path, not two parallel families**.

**Fix:**

Define the source contract before writing any new code. The type must be shared across both paths:

```typescript
// backend/types/workoutSource.types.mjs  (≤ 60 lines)
// frontend/src/types/workoutSource.types.ts  (≤ 60 lines, mirror)

/**
 * @readonly
 * Every write path that touches WorkoutLog, WorkoutSession,
 * DailyWorkoutForm, or paid-session credits MUST supply one of
 * these values. Adding a new source requires updating this enum
 * AND the suppression matrix below — never add a raw string.
 */
export const WorkoutSource = Object.freeze({
  // Current/live training — full side effects apply
  LIVE_SESSION:                    'live_session',
  PLANNED_ASSIGNMENT:              'planned_assignment',

  // Historical backfill — suppression required
  HISTORICAL_IMPORT:               'historical_import',
  MOVE_FITNESS_HISTORICAL_IMPORT:  'move_fitness_historical_import',
  AI_HISTORICAL_BACKFILL:          'ai_historical_backfill',

  // Coach-proposed, human-approved
  COACH_PROPOSAL_APPROVED:         'coach_proposal_approved',
  COACH_HISTORICAL_APPROVED:       'coach_historical_approved',
});

/** Suppression matrix — single source of truth for side-effect policy */
export const SUPPRESSION_MATRIX = Object.freeze({
  [WorkoutSource.HISTORICAL_IMPORT]:              { suppressEngagementSideEffects: true,  suppressPaidSessionDeduction: true,  suppressPlanAdvancement: true  },
  [WorkoutSource.MOVE_FITNESS_HISTORICAL_IMPORT]: { suppressEngagementSideEffects: true,  suppressPaidSessionDeduction: true,  suppressPlanAdvancement: true  },
  [WorkoutSource.AI_HISTORICAL_BACKFILL]:         { suppressEngagementSideEffects: true,  suppressPaidSessionDeduction: true,  suppressPlanAdvancement: true  },
  [WorkoutSource.COACH_HISTORICAL_APPROVED]:      { suppressEngagementSideEffects: true,  suppressPaidSessionDeduction: true,  suppressPlanAdvancement: true  },
  [WorkoutSource.COACH_PROPOSAL_APPROVED]:        { suppressEngagementSideEffects: false, suppressPaidSessionDeduction: false, suppressPlanAdvancement: false },
  [WorkoutSource.PLANNED_ASSIGNMENT]:             { suppressEngagementSideEffects: false, suppressPaidSessionDeduction: false, suppressPlanAdvancement: false },
  [WorkoutSource.LIVE_SESSION]:                   { suppressEngagementSideEffects: false, suppressPaidSessionDeduction: false, suppressPlanAdvancement: false },
});
```

`aiWorkoutDailyFormService.mjs` must then consume `SUPPRESSION_MATRIX[payload.workoutSource]` rather than accepting a raw boolean. `coachActionProposalApprovalService.mjs:189` must pass `workoutSource` derived from the proposal classifier's intent. The admin controller's existing string literals must be replaced with `WorkoutSource` enum values. This is the single change that closes the billing risk before any UI work begins.

---

### Finding C-2: Duplicated Write-Path Family — Divergence Guaranteed

**Severity:** 🔴 Critical
**Files affected:**
- `backend/controllers/adminWorkoutLoggerController.mjs`
- `backend/services/workout/aiWorkoutDailyFormService.mjs`
- `backend/services/workout/workoutLogService.mjs`

**Issue:**

The plan's Question 3 is the most important architectural question in the brief: "Should historical backfill use the AI daily-form service, adminWorkoutLoggerController/logWorkoutForClient, or a new adapter?" The current state has two families that both ultimately call `workoutLogService.mjs` but through different middleware layers with different suppression logic. This is not a theoretical risk — the plan's own evidence shows the admin path has suppression and the AI path does not. Every new feature that touches workout logging will have to decide which path to use, and the answer will be inconsistent across developers.

**Fix:**

The answer to Question 3 is: **`aiWorkoutDailyFormService.mjs` becomes the single canonical write adapter for all programmatic workout log writes.** The admin controller path must be refactored to call through it (or through `workoutLogService.mjs` directly with the same contract), not alongside it. The suppression matrix from Finding C-1 must live in `workoutLogService.mjs` as the enforcement layer, not in the controller. This means:

```
ALL write paths:
  → workoutLogService.mjs (enforces SUPPRESSION_MATRIX by workoutSource)
      ↑
      aiWorkoutDailyFormService.mjs (AI/Coach path)
      adminWorkoutLoggerController.mjs (manual/admin path)
      WorkoutLogger prefill save (new UI path)
```

No path bypasses `workoutLogService.mjs`. No path passes raw booleans for suppression. The matrix is the law.

---

### Finding C-3: sessionStorage Prefill Channel — Race Conditions and Stale State

**Severity:** 🔴 Critical
**Files affected:**
- `frontend/src/components/DashBoard/workspaces/clients-team/tabs/HistoricalWorkoutImportPanel.tsx`
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx`
- Any new prefill hook

**Issue:**

Option C proposes storing a review-gated draft in `sessionStorage` or route state, then opening the Training tab logger mode with the draft prefilled. The plan correctly lists this as a con: "Requires logger support for date/source/prefill metadata." But the deeper problem is the communication channel itself.

`sessionStorage` creates three failure modes in this context:

1. **Stale prefill:** If the trainer opens the history panel, generates a preview, navigates away, returns later, and opens the logger, the stale sessionStorage draft will silently prefill with old data for a potentially different date or client.
2. **Client mismatch:** The plan explicitly flags "client mismatch guards" as needed. sessionStorage has no client-scoped key by default. If the trainer switches clients without the logger clearing its prefill state, the wrong client's historical data will be prefilled.
3. **Race condition:** If the logger's `loadTodaysPlan` effect runs concurrently with the prefill read, the last-write wins non-deterministically.

**Fix:**

Use React context with an explicit prefill action, not sessionStorage. The `TrainingCommandContext` (see Finding M-1) should hold a `pendingPrefill` slot:

```typescript
// frontend/src/context/TrainingCommandContext.ts

interface PrefillDraft {
  clientId: string;           // explicit client scope — mismatch guard
  date: string;               // ISO date string
  source: WorkoutSource;      // from the canonical type
  exercises: PrefillExercise[];
  notes?: string;
  requiresReview: true;       // always true for historical prefill
  draftId: string;            // from history-preview response
}

interface TrainingCommandState {
  pendingPrefill: PrefillDraft | null;
  activeMode: 'log-today' | 'choose-generated' | 'backfill' | 'generate' | 'history';
  clearPrefill: () => void;
  setPrefill: (draft: PrefillDraft) => void;
}
```

The `HistoricalWorkoutImportPanel` calls `setPrefill` and sets `activeMode` to `'backfill'`. The `WorkoutLogger` reads `pendingPrefill` from context on mount, validates `clientId` matches the active client, and clears it after consuming. No sessionStorage. No race condition. The client mismatch guard is structural, not a runtime check that can be forgotten.

---

### Finding C-4: No Error Boundaries on Lazy-Loaded Training Surfaces

**Severity:** 🔴 Critical
**Files affected:**
- `frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabSectionContent.tsx:20-33`

**Issue:**

The plan confirms that `TrainingTabSectionContent.tsx` lazy-loads `WorkoutPlanBuilder`, `WorkoutLogger`, and `HistoricalWorkoutImportPanel`. There are no error boundaries wrapping these lazy imports in the plan or the existing tree evidence. A runtime error in `WorkoutLogger` (the most complex surface) will unmount the entire Training tab, including the plan builder and history panel. On a production SaaS with real clients, this means a trainer mid-session loses the entire training workspace.

The risk increases with this plan because the unified shell (Option D) will add more lazy-loaded surfaces and more complex state interactions, increasing the probability of a runtime error in one surface.

**Fix:**

Each lazy-loaded surface must have its own error boundary with a recovery action:

```typescript
// frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabSectionContent.tsx

// Each surface gets its own boundary — not one boundary for all three
<TrainingSurfaceErrorBoundary surfaceName="Workout Logger" onReset={resetLoggerState}>
  <Suspense fallback={<TrainingSurfaceSkeleton />}>
    <WorkoutLogger clientId={clientId} />
  </Suspense>
</TrainingSurfaceErrorBoundary>

<TrainingSurfaceErrorBoundary surfaceName="Plan Builder" onReset={resetPlanBuilderState}>
  <Suspense fallback={<TrainingSurfaceSkeleton />}>
    <WorkoutPlanBuilder clientId={clientId} />
  </Suspense>
</TrainingSurfaceErrorBoundary>
```

`TrainingSurfaceErrorBoundary` must be a class component (React error boundaries cannot be function components) with a "Retry" button that calls `onReset` and resets its own `hasError` state. The `onReset` callback clears only the affected surface's state from `TrainingCommandContext`, not the entire context.

---

## MATERIAL FINDINGS (Severity 🟠)

---

### Finding M-1: No Shared Context — Plan Catalog Fetched Three Times

**Severity:** 🟠 High
**Files affected:**
- `frontend/src/components/WorkoutLogger/WorkoutLogger.loadTodaysPlan.ts`
- `frontend/src/components/WorkoutManagement/useWorkoutPlanBuilderController.ts`
- New `PlanDayPicker` component (proposed)

**Issue:**

`WorkoutLogger.loadTodaysPlan.ts:66` calls `/api/workouts/${effectiveClientId}/current`, which returns `todayAssignment` and `trainingPlanCatalog`. The plan builder controller fetches from `/api/workout-plans/client/:userId`. The proposed in-logger plan picker will need the same catalog. Without a shared context or cache layer, the same plan catalog data will be fetched independently by three components on the same screen, causing three network round-trips and three independent loading states that can desync.

**Fix:**

Introduce `TrainingCommandContext` as the shared state layer for the Training tab. The context owns one fetch of the plan catalog per client session:

```typescript
// frontend/src/context/TrainingCommandContext.ts  (≤ 120 lines)
// frontend/src/hooks/useTrainingCommand.ts         (≤ 80 lines)

// The context provides:
// - planCatalog: WorkoutPlan[]          (fetched once, shared)
// - todayAssignment: Assignment | null  (fetched once, shared)
// - pendingPrefill: PrefillDraft | null (from Finding C-3)
// - activeMode: TrainingMode
// - actions: { setPrefill, clearPrefill, setMode, refreshCatalog }
```

Child components consume `useTrainingCommand()` instead of fetching independently. The context's data-fetch hook uses React Query (or the existing fetch pattern) with a `clientId`-scoped cache key so switching clients invalidates correctly.

---

### Finding M-2: Prop-Drilling Depth in Logger Prefill Path

**Severity:** 🟠 High
**Files affected:**
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx`
- `frontend/src/components/WorkoutLogger/WorkoutLogger.loadTodaysPlan.ts`
- New `PlanDayPicker` component

**Issue:**

The plan proposes adding prefill metadata (date, source, exercises, notes) to `WorkoutLogger`. The logger is already a complex component — `WorkoutLogger.tsx:1007` renders `ActivePlanContextStrip`, indicating the file is already near or over the 300-line budget. Adding prefill props to the logger's public interface and threading them through to `loadTodaysPlan.ts` and then to individual exercise rows creates a prop-drilling chain of at least four levels. Each level is a re-render surface.

**Fix:**

The prefill data must come from `TrainingCommandContext` (Finding M-1), not from props. `WorkoutLogger` reads `pendingPrefill` from context on mount via `useTrainingCommand()`. It does not accept prefill as props. This keeps the logger's public interface stable and prevents the prop-drilling chain. The `loadTodaysPlan.ts` module becomes a pure data-fetch utility that the logger calls; the prefill merge happens in the logger's own initialization effect, not in the load utility.

---

###

---

## Code Architecture Specialist (1M context) — Round 2

CONSENSUS REACHED

All points from the Senior Architecture Lead's review are accepted as valid and require resolution. No disputes or alternative proposals are needed at this stage. The merged findings align exactly with the critical and material findings detailed in the review, and all recommended fixes should be implemented prior to shipping any slice.

---

