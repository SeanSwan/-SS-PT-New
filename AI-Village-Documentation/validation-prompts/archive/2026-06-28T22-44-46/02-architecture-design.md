# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 77.2s
> **Files:** docs/ai-workflow/brainstorms/training-command-unification-village-brief-2026-06-28.md
> **Generated:** 6/28/2026, 3:44:46 PM

---

# Architectural Review: Training Command Unification Plan

**Reviewer:** Senior React/TypeScript Architect
**Plan:** `training-command-unification-village-brief-2026-06-28.md`
**Date:** 2026-06-28
**Verdict:** Proceed with staged build — architecture is directionally sound but has seven material risks requiring resolution before implementation begins.

---

## Executive Summary

The plan's staged order (backfill safety → preview-to-prefill → in-logger picker → unified shell) is architecturally correct. The primary risks are: a missing source-contract type definition that will cause drift across three surfaces, a sessionStorage prefill channel that creates race conditions and stale-state bugs, prop-drilling depth in the logger prefill path, absent error boundaries on lazy-loaded training surfaces, and two files that will blow the 300-line budget on first pass.

---

## Finding 1 — Missing Canonical Source-Contract Type

**Severity:** 🔴 Critical
**Files affected:**
- `backend/services/workout/aiWorkoutDailyFormService.mjs`
- `backend/controllers/adminWorkoutLoggerController.mjs`
- `frontend/src/components/WorkoutLogger/WorkoutLogger.loadTodaysPlan.ts`
- Any new prefill/picker files

**Issue:**

The plan identifies that `adminWorkoutLoggerController` already has a `historical_import` / `move_fitness_historical_import` source concept with `suppressEngagementSideEffects`, but `aiWorkoutDailyFormService` lacks a first-class `workoutSource` field. The plan correctly flags this gap (§ "Existing Historical HTTP Logging Safeguard" vs § "Coach Proposal And Approval Flow"). Without a shared TypeScript/JSDoc type, every surface that constructs a log payload will independently invent source strings, and the suppression logic will silently miss cases.

**Recommended Fix:**

Define a single source-contract type before writing any new code. Create:

```
frontend/src/types/workoutSource.types.ts        (≤ 60 lines)
backend/types/workoutSource.types.mjs            (≤ 60 lines, mirrors frontend)
```

```typescript
// frontend/src/types/workoutSource.types.ts

/**
 * Canonical workout source identifiers.
 * NEVER add a new source without updating suppressionPolicy below.
 * RETIRED: galaxy-swan theme strings must not appear here.
 */
export const WORKOUT_SOURCE = {
  LIVE_SESSION:                'live_session',
  AI_GENERATED_APPROVED:       'ai_generated_approved',
  HISTORICAL_IMPORT:           'historical_import',
  MOVE_FITNESS_HISTORICAL:     'move_fitness_historical_import',
  BACKFILL_MANUAL:             'backfill_manual',
  BACKFILL_AI_ESTIMATED:       'backfill_ai_estimated',
} as const;

export type WorkoutSource = typeof WORKOUT_SOURCE[keyof typeof WORKOUT_SOURCE];

/** Policy derived from source — computed once, enforced everywhere */
export interface WorkoutSourcePolicy {
  source: WorkoutSource;
  suppressEngagementSideEffects: boolean;
  suppressPaidSessionDeduction: boolean;
  suppressPlanAdvancement: boolean;
  requiresHumanReview: boolean;
}

export function deriveSourcePolicy(source: WorkoutSource): WorkoutSourcePolicy {
  const isHistorical =
    source === WORKOUT_SOURCE.HISTORICAL_IMPORT ||
    source === WORKOUT_SOURCE.MOVE_FITNESS_HISTORICAL ||
    source === WORKOUT_SOURCE.BACKFILL_MANUAL ||
    source === WORKOUT_SOURCE.BACKFILL_AI_ESTIMATED;

  return {
    source,
    suppressEngagementSideEffects: isHistorical,
    suppressPaidSessionDeduction:  isHistorical,
    suppressPlanAdvancement:       isHistorical,
    requiresHumanReview:
      source === WORKOUT_SOURCE.AI_GENERATED_APPROVED ||
      source === WORKOUT_SOURCE.BACKFILL_AI_ESTIMATED,
  };
}
```

This type must be imported by `aiWorkoutDailyFormService`, `adminWorkoutLoggerController`, and every new prefill/picker hook. The backend mirror uses the same string literals so contract tests can assert equality without a shared package.

---

## Finding 2 — sessionStorage Prefill Channel Is a Race Condition

**Severity:** 🔴 Critical
**Files affected:**
- `frontend/src/components/DashBoard/workspaces/clients-team/tabs/HistoricalWorkoutImportPanel.tsx`
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` (and its load path)
- Proposed new prefill hook (unnamed in plan)

**Issue:**

Option C proposes storing a review-gated draft in `sessionStorage` then opening the Training tab logger mode with prefilled data. This creates three concrete failure modes:

1. **Stale prefill:** If the trainer opens two browser tabs (common on desktop coaching setups), the second tab's logger reads the first tab's sessionStorage draft and silently prefills the wrong client.
2. **Race on tab switch:** `TrainingTabSectionContent` lazy-loads `WorkoutLogger` via `React.lazy`. If the tab switch triggers a Suspense boundary re-mount before sessionStorage is written, the logger mounts with no prefill and the trainer sees a blank form with no error.
3. **No invalidation:** sessionStorage persists across page refreshes within the session. A prefill draft from a previous client visit will survive navigation and re-appear on the next client's logger if the trainer forgets to save or cancel.

**Recommended Fix:**

Replace sessionStorage with React Router `location.state` (already in the stack per the existing `CoachCommandCenter.routeContext.ts` routing pattern). Pass the prefill payload as typed route state:

```typescript
// frontend/src/types/loggerPrefill.types.ts  (≤ 80 lines)

import type { WorkoutSource } from './workoutSource.types';

export interface LoggerPrefillState {
  /** Discriminant — logger ignores location.state without this key */
  __prefillVersion: 1;
  clientId: string;
  targetDate: string;           // ISO 8601 date, not datetime
  source: WorkoutSource;
  exercises: PrefillExercise[];
  notes?: string;
  requiresReview: boolean;
  originPanel: 'history_import' | 'coach_command';
}

export interface PrefillExercise {
  exerciseId: string;
  exerciseName: string;
  sets: PrefillSet[];
  isEstimated: boolean;
}

export interface PrefillSet {
  reps?: number;
  weightLbs?: number;
  durationSeconds?: number;
  isEstimated: boolean;
}
```

Navigation from `HistoricalWorkoutImportPanel`:

```typescript
navigate('/dashboard/clients/:id/training', {
  state: prefillPayload satisfies LoggerPrefillState,
});
```

The logger reads `useLocation().state` once on mount, validates `__prefillVersion === 1` and `clientId === activeClientId`, then discards. No cross-tab contamination, no stale-state across client switches, and Suspense re-mounts are safe because route state is stable.

---

## Finding 3 — Prop Drilling Depth in Logger Prefill Path

**Severity:** 🟠 High
**Files affected:**
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx`
- `frontend/src/components/WorkoutLogger/WorkoutLogger.loadTodaysPlan.ts`
- Proposed in-logger plan-day picker component (unnamed)

**Issue:**

`WorkoutLogger.tsx` already renders `ActivePlanContextStrip` at line 1007, meaning it has at least one layer of plan-context prop threading. Adding a plan-day picker (Option A) and a prefill path (Option C) to the same component will create a three-source prop fan-in: today's assignment from `loadTodaysPlan`, a picker-selected plan/day, and a route-state prefill. If these are passed as props through `WorkoutLogger` → picker → form fields, any state change in one source triggers re-renders across all three.

**Recommended Fix:**

Introduce a single `useLoggerSession` hook that owns all three load paths and exposes a unified `activeSession` object. The hook is the single source of truth; `WorkoutLogger.tsx` reads only from it.

```
frontend/src/components/WorkoutLogger/hooks/useLoggerSession.ts   (≤ 180 lines)
```

```typescript
// Responsibility boundary for useLoggerSession:
// - Reads route state prefill (Option C)
// - Reads today's assignment via existing loadTodaysPlan logic (current)
// - Reads picker selection (Option A)
// - Resolves priority: prefill > picker > today's assignment
// - Exposes: activeSession, sessionSource, loadState, clearSession
// - Does NOT own form field state (that stays in WorkoutLogger)
// - Does NOT own submission logic (that stays in existing submit path)

interface LoggerSession {
  exercises: SessionExercise[];
  targetDate: string;
  source: WorkoutSource;
  planId?: string;
  dayIndex?: number;
  requiresReview: boolean;
  isHistorical: boolean;
}
```

This eliminates prop drilling, makes the priority resolution explicit and testable, and keeps `WorkoutLogger.tsx` under the 300-line budget (see Finding 5).

---

## Finding 4 — In-Logger Plan-Day Picker: Missing Non-Advancing Load Contract

**Severity:** 🟠 High
**Files affected:**
- Proposed picker component (unnamed in plan)
- `backend/routes/workoutPlanRoutes.mjs` (lines 598, 690 — activate/advance endpoints)
- `frontend/src/components/WorkoutLogger/WorkoutLogger.loadTodaysPlan.ts`

**Issue:**

The plan correctly identifies (Option A cons) that loading a non-current plan/day into the logger needs "a stable assignment key for non-current plan/day loads or a read-only prefill mode that does not advance plan cursor." This is not resolved in the plan — it is deferred as a question to the village. This is a blocking design gap. The existing `loadTodaysPlan` path calls `/api/workouts/:userId/current` which is tied to the plan cursor. If the picker reuses this path with a different plan/day, the backend may interpret the load as a cursor advance (depending on `workoutPlanRoutes.mjs:690` behavior).

**Recommended Fix:**

The picker must use a read-only fetch path, not the current-assignment path. Proposed contract:

```
GET /api/workout-plans/:planId/day/:dayIndex/preview
```

This endpoint returns exercise data for any plan/day without mutating the plan cursor. It is a pure read. The frontend picker calls this endpoint; `WorkoutLogger` receives the result via `useLoggerSession` (Finding 3). Plan advancement (`/api/workout-plans/:planId/advance`) is only called on explicit "Mark Complete" of a current-day session, never on picker load or prefill load.

The hook must enforce this:

```typescript
// useLoggerSession.ts
// INVARIANT: loadMode === 'picker' || loadMode === 'prefill'
//   → policy.suppressPlanAdvancement = true
//   → advance endpoint is never called regardless of save action
```

This invariant should be tested with a unit test before the picker ships (see Finding 7 on mandatory tests).

---

## Finding 5 — File Budget Violations

**Severity:** 🟠 High
**Files affected (projected overages):**

| File | Current Evidence | Projected Lines | Risk |
|------|-----------------|-----------------|------|
| `WorkoutLogger.tsx` | Already at line 1007+ | 1007+ (confirmed over) | Already violated — adding picker + prefill worsens it |
| `HistoricalWorkoutImportPanel.tsx` | Lines 95–172 visible | ~250+ existing, adding "Backfill in Logger" action | Will exceed 300 |
| `aiWorkoutDailyFormService.mjs` | Lines 9–221 visible | ~250+ existing, adding source policy | Will exceed 300 |
| `TrainingTabSectionContent.tsx` | Lines 20–116 visible | Manageable if shell refactor is deferred | Safe if Option D is deferred |

**Recommended Fix:**

**`WorkoutLogger.tsx`** (already over budget — must be addressed regardless of this plan):

```
WorkoutLogger/
  WorkoutLogger.tsx                    (≤ 200 lines — orchestrator only)
  WorkoutLoggerForm.tsx                (≤ 280 lines — form fields, sets, reps)
  WorkoutLoggerHeader.tsx              (≤ 120 lines — ActivePlanContextStrip + session meta)
  hooks/
    useLoggerSession.ts                (≤ 180 lines — Finding 3)
    useLoggerSubmit.ts                 (≤ 150 lines — existing submit logic extracted)
    useLoggerExercises.ts              (≤ 120 lines — exercise list state)
```

**`HistoricalWorkoutImportPanel.tsx`:**

```
HistoricalWorkoutImportPanel/
  HistoricalWorkoutImportPanel.tsx     (≤ 200 lines — orchestrator)
  HistoryPreviewTable.tsx              (≤ 180 lines — draft preview rendering)
  BackfillActions.tsx                  (≤ 100 lines — "Backfill in Logger" + "Send to Coach" buttons)
```

**`aiWorkoutDailyFormService.mjs`:**

Extract policy resolution into a separate module:

```
backend/services/workout/
  aiWorkoutDailyFormService.mjs        (≤ 250 lines — write logic only)
  workoutSourcePolicyResolver.mjs      (≤ 80 lines — deriveSourcePolicy, mirrors frontend type)
```

---

## Finding 6 — Hook Separation: Data Fetching Mixed with Business Logic

**Severity:** 🟡 Medium
**Files affected:**
- `frontend/src/components/WorkoutLogger/WorkoutLogger.loadTodaysPlan.ts`
- `frontend/src/services/aiWorkoutService.ts`
- Proposed picker hook (unnamed)

**Issue:**

`WorkoutLogger.loadTodaysPlan.ts` currently mixes HTTP fetch logic (calling `/api/workouts/:userId/current`) with business logic (storing `plannedAssignment`, preloading exercises). This is a single-responsibility violation that will compound when the picker and prefill paths are added. `aiWorkoutService.ts` at line 228+ similarly mixes generation, approval, and long-horizon draft concerns in one file.

**Recommended Fix:**

Apply a strict three-layer hook separation for all new hooks in this feature:

```
Layer 1 — Data fetching (useQuery pattern, no business logic):
  useClientWorkoutQuery.ts        — fetches /api/workouts/:userId/current
  useWorkoutPlanDayQuery.ts       — fetches /api/workout-plans/:planId/day/:dayIndex/preview

Layer 2 — Business logic (transforms, policy, no fetch, no UI state):
  useLoggerSession.ts             — resolves active session from three sources (Finding 3)
  workoutSourcePolicyResolver.ts  — pure functions, no hooks

Layer 3 — UI state (no fetch, no business logic):
  useLoggerFormState.ts           — controlled form field state
  usePickerUIState.ts             — picker open/close, selected plan/day
```

`WorkoutLogger.loadTodaysPlan.ts` should be refactored into Layer 1 (`useClientWorkoutQuery`) and the business logic moved to `useLoggerSession`. The existing file name is misleading (it is not a hook, it is a module with side effects) — rename on extraction.

**React.memo / useMemo / useCallback audit for proposed components:**

| Component/Hook | Needed? | Reason |
|---------------|---------|--------|
| Plan-day picker list items | `React.memo` ✅ | List may render 20–50 plan days; parent re-renders on form field change |
| `useLoggerSession` return value | `useMemo` ✅ | `activeSession` object identity must be stable to prevent form re-renders |
| "Backfill in Logger" click handler in `BackfillActions` | `useCallback` ✅ | Passed to child button; parent re-renders on preview table scroll |
|

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
