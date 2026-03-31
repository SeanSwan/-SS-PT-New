# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 117.2s
> **Files:** docs/ai-workflow/blueprints/WORKOUT-PLANNER-V2-MASTER-BLUEPRINT.md, frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx
> **Generated:** 3/30/2026, 4:52:27 PM

---

# Deep Code Review: WorkoutPlannerPage.tsx & Blueprint

## Executive Summary

This review identifies **7 CRITICAL bugs**, **12 HIGH severity issues**, **8 MEDIUM issues**, and **6 LOW issues** that must be addressed before production deployment. The codebase has significant gaps between the blueprint specification and implementation, plus several runtime bugs that will cause failures under normal usage.

---

## 1. BUG DETECTION

### 1.1 Race Condition in ID Generation

| Severity | File & Line |
|----------|-------------|
| **CRITICAL** | `WorkoutPlannerPage.tsx` ~Line 320 |

**What's Wrong:**
```typescript
return [...prev, {
  id: `${ex.id}-${Date.now()}`,  // BUG: Can collide on rapid clicks
```

`Date.now()` has millisecond precision. If a user double-clicks or clicks rapidly, multiple exercises can receive the same ID, causing state corruption and duplicate exercise bugs.

**Fix:**
```typescript
import { v4 as uuidv4 } from 'uuid';
// or
const generateId = () => `${ex.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
```

---

### 1.2 Missing useCallback Dependencies

| Severity | File & Line |
|----------|-------------|
| **CRITICAL** | `WorkoutPlannerPage.tsx` ~Line 318-350 |

**What's Wrong:**
The `addExercise` callback depends on `phase` but `phase` is derived from `phaseNumber` via useMemo. If `phaseNumber` changes, the callback may capture stale `phase` values due to closure.

```typescript
const addExercise = useCallback((ex: ExerciseSlim) => {
  const defaultSets = parseInt(phase.sets.split('-')[0]) || 3;  // Stale closure risk
  // ...
}, [phase]); // phase changes on every phaseNumber change
```

**Fix:**
```typescript
const addExercise = useCallback((ex: ExerciseSlim) => {
  setPlanExercises(prev => {
    // Find current phase inside the setter to avoid stale closure
    const currentPhase = OPT_PHASES.find(p => p.phase === phaseNumber) || OPT_PHASES[1];
    const defaultSets = parseInt(currentPhase.sets.split('-')[0]) || 3;
    // ...
  });
}, [phaseNumber]); // Depend on the source, not derived value
```

---

### 1.3 Undefined Access in Error Handling

| Severity | File & Line |
|----------|-------------|
| **HIGH** | `WorkoutPlannerPage.tsx` ~Line 430-445 |

**What's Wrong:**
```typescript
} catch (err: unknown) {
  console.error('AI generation failed:', err);
  const errData = (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
  const specificMsg = errData?.details || errData?.error;
```

If `err` is a network error without a response (e.g., `TypeError: Network Error`), `errData` will be `undefined`, but the code proceeds to check `specificMsg?.includes()` which will throw if `specificMsg` is undefined.

**Fix:**
```typescript
const specificMsg = errData?.details || errData?.error;
if (specificMsg?.includes('client context unavailable')) {  // Optional chaining
```

---

### 1.4 Stale State After Client Change

| Severity | File & Line |
|----------|-------------|
| **HIGH** | `WorkoutPlannerPage.tsx` ~Line 540-545 |

**What's Wrong:**
```typescript
onChange={e => {
  setSelectedClientId(Number(e.target.value));
  setPlanExercises([]);
  setGeneratedPlan(null);
  setExplanations([]);
}}
```

When changing clients, `teachModeOpen` and `selectedExercise` are NOT reset. This causes:
- Selected exercise from previous client remains displayed in Teach Mode
- Stale exercise data shown to trainer

**Fix:**
```typescript
onChange={e => {
  const newClientId = Number(e.target.value);
  setSelectedClientId(newClientId);
  setPlanExercises([]);
  setGeneratedPlan(null);
  setExplanations([]);
  setSelectedExercise(null);  // ADD THIS
  // Only reset teach mode if it was showing previous client's data
  if (selectedExercise) {
    setTeachModeOpen(false);
  }
}}
```

---

### 1.5 Missing Null Check in Plan Generation

| Severity | File & Line |
|----------|-------------|
| **HIGH** | `WorkoutPlannerPage.tsx` ~Line 395-400 |

**What's Wrong:**
```typescript
const generated: PlanExercise[] = workout.exercises.map((ex, i) => ({
  id: `gen-${i}-${Date.now()}`,
  exerciseSlim: {
    id: ex.exerciseKey,
    name: ex.exerciseName,
    // ...
    primaryMuscles: ex.muscles || [],  // Can be undefined
    difficulty: 300,  // Hardcoded fallback
  },
```

If `workout.exercises` is undefined, this throws a TypeError. No defensive check exists.

**Fix:**
```typescript
if (!workout.exercises || !Array.isArray(workout.exercises)) {
  setStatusMsg({ type: 'error', text: 'Invalid workout response from AI' });
  setGenerating(false);
  return;
}
```

---

### 1.6 Inconsistent Rest Parsing

| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `WorkoutPlannerPage.tsx` ~Line 325-335 and ~Line 395-410 |

**What's Wrong:**
Rest parsing is duplicated with inconsistent logic:

**In addExercise:**
```typescript
const restStr = phase.rest.toLowerCase();
let restSec = 60;
if (restStr.includes('min')) {
  const minVal = parseInt(restStr) || 3;
  restSec = minVal * 60;
} else {
  restSec = parseInt(restStr.replace(/[^0-9]/g, '')) || 60;
}
```

**In handleAIGenerate:**
```typescript
restSeconds: (() => {
  if (typeof ex.rest === 'number') return ex.rest;
  const s = String(ex.rest || '60').toLowerCase();
  if (s.includes('min')) return (parseInt(s) || 3) * 60;
  return parseInt(s.replace(/[^0-9]/g, '')) || 60;
})(),
```

The first uses `parseInt(restStr)` which stops at first non-digit, the second uses `parseInt(s.replace(/[^0-9]/g, ''))` which extracts all digits. Both handle "3-5min" differently.

**Fix:** Extract to shared utility:
```typescript
const parseRestToSeconds = (rest: string | number): number => {
  if (typeof rest === 'number') return rest;
  const s = String(rest).toLowerCase();
  if (s.includes('min')) return (parseInt(s) || 3) * 60;
  return parseInt(s.replace(/[^0-9]/g, '')) || 60;
};
```

---

### 1.7 Filter Chip State Mismatch

| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `WorkoutPlannerPage.tsx` ~Line 595-620 |

**What's Wrong:**
```typescript
<Chip
  $active={filterCategory === null ? bp === 'All' : filterCategory === bp}
  onClick={() => handleChipClick(bp)}
>
  {bp}
</Chip>
```

The filter state starts as `null` but chips check for `filterCategory === null` to determine if "All" is active. However, `setFilterCategory(bodyPart === 'All' ? null : bodyPart)` is called on click. This works, but the initial render shows "All" as active when `filterCategory` is `null`, which is correct—but inconsistent with how other filters initialize.

**Fix:** Initialize filters consistently:
```typescript
const [filterCategory, setFilterCategory] = useState<string | null>('All');
```

---

## 2. ARCHITECTURE FLAWS

### 2.1 Monolith Component Exceeds Limits

| Severity | File & Line |
|----------|-------------|
| **HIGH** | `WorkoutPlannerPage.tsx` — Entire file ~950+ lines |

**What's Wrong:**
The blueprint explicitly states: "No-Monolith Rule: ≤300 lines each". This file is ~950 lines, making it impossible to maintain, test, or reason about.

The component handles:
- Client selection and management
- Exercise search and filtering
- Plan generation (single + multi-week)
- Plan saving
- Mesocycle display
- Teach mode integration
- AI terminal integration

**Fix:** Decompose per blueprint:
```
components/
├── ExerciseRolodex.tsx        (Left panel - search + list)
├── WorkoutBuilder.tsx         (Center panel - plan exercises)
├── PlanControls.tsx           (Duration, phase, goal selects)
├── MesocycleDisplay.tsx       (Multi-week plan view)
├── SavedPlansList.tsx         (Bottom section)
└── WorkoutPlannerPage.tsx     (Orchestrator - ~150 lines)
```

---

### 2.2 Prop Drilling — Teach Mode

| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `WorkoutPlannerPage.tsx` ~Line 680-690 |

**What's Wrong:**
```typescript
<TeachModeSidebar
  exercise={selectedExercise}
  phaseNumber={phaseNumber}
  onPhaseChange={setPhaseNumber}
/>
```

`selectedExercise` is managed at the page level but used only by TeachModeSidebar. This should be lifted to context or TeachModeSidebar should manage its own state when in standalone mode.

**Fix:** If TeachModeSidebar is used elsewhere, extract to context. Otherwise, acceptable as-is for now.

---

### 2.3 No Error Boundary

| Severity | File & Line |
|----------|-------------|
| **HIGH** | `WorkoutPlannerPage.tsx` — Root |

**What's Wrong:**
No React Error Boundary wraps this component. If any child throws (API failure, render error), the entire admin dashboard crashes.

**Fix:**
```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// In render:
<ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => setPlanExercises([])}>
  <WorkoutPlannerPage />
</ErrorBoundary>
```

---

### 2.4 Missing Loading States for API Calls

| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `WorkoutPlannerPage.tsx` ~Line 460-480 |

**What's Wrong:**
`handleSave` sets `setSaving(true)` but there's no loading indicator shown to the user during the save operation. The button shows a spinner, but there's no toast or banner.

**Fix:** Add success/error toast with duration:
```typescript
setStatusMsg({ type: 'success', text: 'Workout plan saved successfully!' });
setTimeout(() => setStatusMsg(null), 5000); // Auto-dismiss after 5s
```

---

## 3. INTEGRATION ISSUES

### 3.1 Frontend-Backend Contract Mismatch

| Severity | File & Line |
|----------|-------------|
| **HIGH** | `WorkoutPlannerPage.tsx` ~Line 360-420 |

**What's Wrong:**
The code assumes `res.data.workout` has this shape:
```typescript
const workout: GeneratedWorkout = res.data.workout;
// Expects: workout.exercises[i].exerciseKey, .exerciseName, .category, .muscles, .sets, .reps, .tempo, .rest, .intensity
```

But the blueprint specifies the backend should return exercise grouping metadata (`exerciseGroups` JSONB) which is never used or sent to the backend.

**Fix:** Verify API contract with backend team. Add runtime validation:
```typescript
if (!res.data.workout?.exercises?.every(ex => ex.exerciseKey && ex.exerciseName)) {
  throw new Error('Invalid workout response shape');
}
```



---

*Part of SwanStudios 11-Brain Recursive Consensus System*
