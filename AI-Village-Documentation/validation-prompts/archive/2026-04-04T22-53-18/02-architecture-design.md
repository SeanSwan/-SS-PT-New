# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 72.9s
> **Files:** docs/ai-workflow/blueprints/BOARD2-EXERCISE-MODIFICATIONS-PLAN.md
> **Generated:** 4/4/2026, 3:53:18 PM

---

# Board 2 Exercise Modifications — Architectural Review

**Reviewer:** Senior React/TypeScript Architect
**Plan:** `docs/ai-workflow/blueprints/BOARD2-EXERCISE-MODIFICATIONS-PLAN.md`
**Date:** 2025
**Verdict:** ⚠️ **Conditionally Approved — 6 findings require resolution before implementation**

---

## Executive Summary

The plan is well-scoped for a focused feature addition. The database schema is sound, the population strategy is pragmatic, and the UI concept is clear. However, the plan has **significant gaps in component decomposition** (ClassPreviewPanel will become a God Component), **missing hook architecture** for the new data requirements, **no error boundary strategy**, and **silent failure risks** in the Gemini batch population script. These are fixable before coding begins.

---

## Finding 1 — Component Decomposition

**Severity:** 🔴 HIGH
**File:** `frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx`

### Issue

The plan assigns the entire Board 2 redesign to a single file. `ClassPreviewPanel.tsx` currently handles Board 1 rendering, Board 2 rendering, station layout, and preview state. Adding a modification table for every exercise in Board 2 — with alternating rows, icons, color logic, and N/A dimming — will push this file well past 600 lines and create a component that is impossible to test in isolation.

### Recommended Fix

Decompose into a dedicated subtree. The modification table is a pure presentational component that can be developed, tested, and styled completely independently:

```
frontend/src/components/BootcampBuilder/
├── ClassPreviewPanel.tsx              ← orchestrator only, ~120 lines
├── Board1StationCard.tsx              ← existing Board 1 card, extracted
├── Board2StationCard.tsx              ← NEW: wraps exercise + mod table
├── ExerciseModificationTable.tsx      ← NEW: pure presentational, ~150 lines
├── ModificationRow.tsx                ← NEW: single row, handles N/A dimming
└── hooks/
    └── useBoard2Modifications.ts      ← NEW: see Finding 6
```

**`ExerciseModificationTable.tsx` interface:**

```typescript
// Pure presentational — zero business logic, zero data fetching
interface ExerciseModificationTableProps {
  exercise: ExerciseWithMods;
  isLoading?: boolean;
  className?: string;
}

// ModificationRow handles its own N/A opacity logic
interface ModificationRowProps {
  icon: string;
  label: string;
  value: string | null | undefined;
  variant?: 'easy' | 'hard' | 'pain-mod';
  isAlternate?: boolean; // for alternating bg
}
```

**`Board2StationCard.tsx` is the composition boundary** — it fetches nothing, receives a fully-hydrated `ExerciseWithMods` and renders `ExerciseModificationTable`. This keeps `ClassPreviewPanel` as a pure orchestrator.

---

## Finding 2 — File Budget

**Severity:** 🔴 HIGH
**Files:** `ClassPreviewPanel.tsx`, `bootcampGenerator.mjs`

### Issue

**`ClassPreviewPanel.tsx`:** Even with good intentions, a single file handling Board 1 layout + Board 2 layout + modification tables + station headers + color theming will exceed 300 lines. Current estimate without the new feature is likely already 200+ lines.

**`bootcampGenerator.mjs`:** The plan adds Board 2 generation logic to an existing service file. If this file already handles Board 1 generation, exercise selection, NASM phase logic, and set/rep schemes, adding a second board's logic will push it past 400 lines.

### Recommended Fix

```
backend/services/bootcamp/
├── bootcampGenerator.mjs          ← orchestrator, delegates to board generators
├── board1Generator.mjs            ← NEW: Board 1 selection logic
├── board2Generator.mjs            ← NEW: Board 2 mirrors Board 1 + attaches mods
└── modificationResolver.mjs       ← NEW: resolves which mod fields to include
```

**`board2Generator.mjs` core contract:**

```javascript
// board2Generator.mjs
// Board 2 is NOT independent — it derives from Board 1's exercise selection
export async function generateBoard2(board1Exercises, exerciseIds) {
  // Fetch mod fields for exactly the exercises Board 1 selected
  // Never re-runs selection logic — Board 2 is a view transformation of Board 1
  const exercisesWithMods = await Exercise.findAll({
    where: { id: exerciseIds },
    attributes: [
      'id', 'name',
      'easyVariation', 'hardVariation',
      'kneeMod', 'shoulderMod', 'backMod',
      'ankleMod', 'wristMod', 'elbowMod',
      'footMod', 'hipMod'
    ]
  });
  return board1Exercises.map(ex => ({
    ...ex,
    modifications: exercisesWithMods.find(e => e.id === ex.id) ?? null
  }));
}
```

**This enforces the architectural invariant:** Board 2 cannot diverge from Board 1's exercise list. The current bug (random cardio finishers) is impossible in this design because Board 2 never runs its own selection.

---

## Finding 3 — State Management & Hook Composition

**Severity:** 🟡 MEDIUM
**File:** `frontend/src/components/BootcampBuilder/hooks/useBoard2Modifications.ts` (proposed)

### Issue

The plan mentions no hook for the new data requirements. `ClassPreviewPanel` will need to either:
1. Receive modification data as props (requires parent to fetch it — prop drilling risk), or
2. Fetch it internally (data fetching in a presentational orchestrator — separation violation), or
3. Use a dedicated hook (correct — but not specified in the plan)

Additionally, if Board 1 and Board 2 are rendered simultaneously in the preview, there is a **stale state risk**: if the user regenerates Board 1, Board 2's modification data must be invalidated and re-fetched. The plan does not address this synchronization.

### Recommended Fix

```typescript
// frontend/src/components/BootcampBuilder/hooks/useBoard2Modifications.ts

interface UseBoard2ModificationsReturn {
  modificationsMap: Map<number, ExerciseMods>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useBoard2Modifications(
  exerciseIds: number[], // derived from Board 1's selection
  enabled: boolean       // only fetch when Board 1 is finalized
): UseBoard2ModificationsReturn {
  // exerciseIds as dependency — automatically re-fetches when Board 1 changes
  // Returns a Map for O(1) lookup in ExerciseModificationTable
}
```

**Key design decisions:**
- `exerciseIds` as the dependency array means Board 2 data automatically invalidates when Board 1 changes — no manual synchronization needed
- `enabled` flag prevents fetching before Board 1 is ready
- Returns a `Map<number, ExerciseMods>` not an array — `ClassPreviewPanel` passes `modificationsMap.get(exercise.id)` to each `Board2StationCard`, which is O(1) vs O(n) array find

**Hook separation is correct for this feature:**

| Hook | Responsibility |
|------|---------------|
| `useBoard2Modifications` | Data fetching only — exercise mod fields from API |
| `ClassPreviewPanel` local state | UI state — which board is active, expanded stations |
| `board2Generator.mjs` | Business logic — lives on backend, not in a hook |

---

## Finding 4 — Data Flow & Race Conditions

**Severity:** 🟡 MEDIUM
**Files:** `ClassPreviewPanel.tsx`, `useBoard2Modifications.ts`

### Issue

**Race condition scenario:**
1. User generates a bootcamp → Board 1 populates with exercises [1, 5, 23, 47]
2. `useBoard2Modifications` fires with `exerciseIds: [1, 5, 23, 47]`
3. Before fetch resolves, user clicks "Regenerate" → Board 1 changes to [2, 8, 31, 52]
4. `useBoard2Modifications` fires again with new IDs
5. If the first fetch resolves after the second, Board 2 shows modifications for the OLD exercise set

**Stale closure risk in the population script:**
The plan states "Script writes directly to production DB." If the script crashes mid-batch (network timeout, Gemini rate limit), there is no resume capability. Exercises 1-440 have modifications, 441-883 do not, and the UI has no way to distinguish "not yet populated" from "this exercise has no modifications."

### Recommended Fix

**Race condition — use AbortController:**

```typescript
export function useBoard2Modifications(exerciseIds: number[], enabled: boolean) {
  const [state, dispatch] = useReducer(modsReducer, initialState);

  useEffect(() => {
    if (!enabled || exerciseIds.length === 0) return;

    const controller = new AbortController();

    fetchModifications(exerciseIds, controller.signal)
      .then(data => dispatch({ type: 'SUCCESS', payload: data }))
      .catch(err => {
        if (err.name !== 'AbortError') {
          dispatch({ type: 'ERROR', payload: err });
        }
      });

    return () => controller.abort(); // cancels in-flight request on re-render
  }, [exerciseIds.join(','), enabled]); // stable dependency

  return state;
}
```

**Population script — add resume capability:**

```javascript
// scripts/populate-exercise-variations.mjs
// Add a `modsPopulated` boolean field to the migration
// Script skips exercises where modsPopulated = true
// UI can check: if all 10 mod fields are null AND modsPopulated = false → show "Mods pending"
//               if modsPopulated = true but fields are null → show "No modification needed"

const unpopulated = await Exercise.findAll({
  where: { modsPopulated: false },
  limit: BATCH_SIZE
});
```

**UI handling for unpopulated state:**

```typescript
// ExerciseModificationTable.tsx
// Three states must be handled:
// 1. isLoading → skeleton rows
// 2. allModsNull && !modsPopulated → "Modifications being generated..." badge
// 3. allModsNull && modsPopulated → "No modifications needed" (valid state)
// 4. populated → render table
```

---

## Finding 5 — React Patterns & Re-render Risk

**Severity:** 🟡 MEDIUM
**Files:** `ExerciseModificationTable.tsx`, `Board2StationCard.tsx`, `ClassPreviewPanel.tsx`

### Issue

The plan does not specify memoization strategy. Board 2 will render N stations × M exercises × 10 rows = potentially 200+ DOM nodes. Without memoization:

- Every `ClassPreviewPanel` state change (tab switch, hover, scroll) re-renders all modification tables
- The `modificationsMap` returned from `useBoard2Modifications` will be a new `Map` reference on every render if not memoized, causing all `Board2StationCard` children to re-render even when data hasn't changed

### Recommended Fix

```typescript
// ExerciseModificationTable.tsx — memo is justified here
// Props are stable objects, re-render only when exercise data changes
export const ExerciseModificationTable = React.memo<ExerciseModificationTableProps>(
  ({ exercise, isLoading }) => {
    // ...
  },
  (prev, next) => prev.exercise.id === next.exercise.id
  // Custom comparator: only re-render if the exercise itself changed
  // Not just reference equality — prevents re-render on parent state changes
);

// ModificationRow.tsx — memo justified, purely presentational
export const ModificationRow = React.memo<ModificationRowProps>(ModificationRowComponent);

// useBoard2Modifications.ts — memoize the Map
const modificationsMap = useMemo(
  () => new Map(data?.map(ex => [ex.id, ex]) ?? []),
  [data] // only rebuilds when fetch data changes
);

// ClassPreviewPanel.tsx — stable callback for Board 2 tab activation
const handleBoard2Select = useCallback(() => {
  setActiveBoard('board2');
}, []); // no dependencies — this never changes
```

**Where NOT to use memo:**
- `ClassPreviewPanel` itself — it's the root of this subtree, memo at root level rarely helps
- `Board2StationCard` — it receives the `modificationsMap.get(id)` result which is already a stable reference

---

## Finding 6 — Hook Design

**Severity:** 🟡 MEDIUM
**Files:** `useExerciseSearch.ts` (existing, modified), proposed hooks

### Issue

The plan modifies `useExerciseSearch.ts` to include mod fields in the fetch. This is a **separation of concerns violation**. `useExerciseSearch` is a search/autocomplete hook used in the WorkoutLogger. It should return the minimal `ExerciseSlim` type needed for search results. Bundling 10 modification fields into every search result:

1. Increases search response payload by ~10× for 883 exercises
2. Couples the WorkoutLogger search to the BootcampBuilder's data requirements
3. Means the exercise search worker carries modification data it never uses

### Recommended Fix

```typescript
// Keep useExerciseSearch returning ExerciseSlim (no mod fields)
// ExerciseSlim is correct for search — name, id, muscles, equipment

// Add a SEPARATE hook for modification data:
// useExerciseModifications(id: number) — fetches single exercise mods on demand
// useBoard2Modifications(ids: number[]) — fetches batch mods for Board 2

// API route strategy:
// GET /api/exercises/search?q=squat → returns ExerciseSlim[] (no mods)
// GET /api/exercises/:id/modifications → returns ExerciseMods (mod fields only)
// GET /api/exercises/modifications?ids=1,5,23,47 → batch endpoint for Board 2
```

**`exerciseSearchWorker.ts` should NOT be modified** for this feature. The worker is a performance optimization for search — adding mod fields to its type would increase the data transferred to/from the worker thread for zero benefit in the search use case.

**Correct `ExerciseSlim` stays lean:**

```typescript
// exerciseSearchWorker.ts — DO NOT ADD MOD FIELDS HERE
interface ExerciseSlim {
  id: number;
  name: string;
  primaryMuscles: string[];
  equipment: string;
  category: string;
  // ← mod fields do NOT belong here
}

// Separate type for Board 2:
interface ExerciseMods {
  id: number;
  easyVariation: string | null;
  hardVariation: string | null;
  kneeMod: string | null;
  shoulderMod: string | null;
  backMod: string | null;
  ankleMod: string | null;
  wristMod: string | null;
  elbowMod: string | null;
  footMod: string | null;
  hipMod: string | null;
  modsPopulated: boolean; // from Finding 4
}
```

---

## Finding 7 — Error Boundaries

**Severity:** 🟡 MEDIUM
**Files:** Missing from plan entirely

### Issue

The plan has no error boundary strategy. The modification table feature has three distinct failure modes that should be isolated:

1. **Gemini population incomplete** — some exercises have null mods, UI must not crash
2. **Board 2 API fetch failure** — should not crash Board 1 (which is working correctly)
3. **Malformed mod data** — Gemini occasionally returns truncated JSON; a bad string in one row should not crash the entire table

### Recommended Fix

```
Error Boundary Placement:
                                                        
  <ClassPreviewPanel>                                   
    <Board1StationCard />   ← no boundary needed, stable feature
    <ErrorBoundary          ← BOUNDARY 1: isolates Board 2 entirely
      fallback={<Board2UnavailableFallback />}          
    >                                                   
      <Board2StationCard>                               
        <ErrorBoundary

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
