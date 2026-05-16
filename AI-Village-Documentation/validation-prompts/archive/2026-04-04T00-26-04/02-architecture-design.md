# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 70.7s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-BUILDER-OVERHAUL-PLAN.md
> **Generated:** 4/3/2026, 5:26:04 PM

---

# Architectural Review: Bootcamp Builder Overhaul Plan

**Reviewer:** Senior React/TypeScript Architect
**Date:** Review of `BOOTCAMP-BUILDER-OVERHAUL-PLAN.md`
**Verdict:** Plan is directionally sound but has significant architectural gaps that will cause production issues if unaddressed.

---

## Executive Summary

The plan correctly identifies the problems and proposes reasonable solutions, but the file list in Section 5 is dangerously underspecified. Five files are doing the work of fifteen. The hook composition is implied but never stated, creating a high risk of monolithic components, prop drilling, and re-render storms. The AI integration path is vague in ways that will cause real bugs.

---

## Finding 1: Component Decomposition

### 1.1 `BootcampBuilderPage.tsx` — Will Become a God Component

**Severity:** 🔴 Critical

**Issue:** The plan assigns mode toggle (AI/Manual/Hybrid), layout orchestration, panel visibility, and state coordination all to one file. Based on the UX wireframe alone, this file will exceed 600+ lines before adding mode logic.

**Recommended Fix:** Decompose into:

```
BootcampBuilder/
├── BootcampBuilderPage.tsx          # Route entry, layout shell only (~80 lines)
├── BootcampBuilderLayout.tsx        # 3-pane/2-pane/1-pane responsive grid (~120 lines)
├── ModeSelector.tsx                 # AI/Manual/Hybrid toggle + Teach Me button (~60 lines)
├── panels/
│   ├── ConfigPanel.tsx              # Existing, refactored
│   ├── ClassPreviewPanel.tsx        # Existing, refactored
│   ├── ExerciseRolodexPanel.tsx     # New
│   └── ExerciseDetailPanel.tsx      # Existing, refactored
├── station/
│   ├── StationCard.tsx              # Single station display
│   ├── StationExerciseRow.tsx       # Single exercise within a station
│   └── StationAddButton.tsx        # "+ Add Exercise" affordance
├── timing/
│   └── TimingBar.tsx               # 48/55 min progress bar, red threshold
├── teachme/
│   ├── TeachMeToggle.tsx           # The ? button
│   └── TeachMeDrawer.tsx           # Content panel
└── hooks/
    ├── useBootcampBuilder.ts        # Orchestration hook
    ├── useClassGeneration.ts        # API calls, generation state
    ├── useExerciseRolodex.ts        # Search, filter, pagination
    ├── useStationEditor.ts          # Manual add/remove/reorder
    ├── useTimingCalculator.ts       # Real-time 55-min math
    └── useTeachMe.ts               # Teach Me open/close state
```

### 1.2 `ExerciseRolodexPanel.tsx` — Three Components in One

**Severity:** 🟠 High

**Issue:** The plan describes search input, filter chips, exercise list, and drag source all in one component. The filter chip state alone (body part × equipment × OPT phase) will create significant re-render surface.

**Recommended Fix:**

```
ExerciseRolodexPanel/
├── ExerciseRolodexPanel.tsx        # Container, composes below (~80 lines)
├── RolodexSearchBar.tsx            # Controlled input, debounced (~50 lines)
├── RolodexFilterChips.tsx          # Filter state, chip rendering (~90 lines)
├── ExerciseList.tsx                # Virtualized list (react-window) (~80 lines)
└── ExerciseCard.tsx                # Single card, drag source (~70 lines)
```

**Critical note:** With 840+ exercises, `ExerciseList` MUST use virtualization (`react-window` or `@tanstack/virtual`). The plan does not mention this. Rendering 840 DOM nodes will freeze the UI.

### 1.3 `ClassPreviewPanel.tsx` — Drag Target Complexity Underestimated

**Severity:** 🟠 High

**Issue:** The plan mentions drag-and-drop reordering within stations but assigns this to `ClassPreviewPanel.tsx`. DnD context providers, drop targets, and drag handles need their own scope to avoid polluting the preview panel with DnD library internals.

**Recommended Fix:** Wrap the station area in a dedicated `StationDndContext.tsx` provider component. Keep `ClassPreviewPanel.tsx` as a layout shell. Each `StationCard` becomes a drop target independently.

---

## Finding 2: State Management

### 2.1 Hook Composition Is Not Defined — High Collision Risk

**Severity:** 🔴 Critical

**Issue:** The plan references connecting to `useCoachAssistant → useAIChat → useConversationSidebar` but never specifies how bootcamp state interacts with this chain. The "Ask AI for help" button in the wireframe implies the bootcamp builder needs to inject context (current class, selected exercise, equipment profile) into the AI chat. This is a non-trivial state bridge.

**Recommended Fix:** Define the composition explicitly before implementation:

```typescript
// useBootcampBuilder.ts — orchestration layer
// Owns: mode, currentClass, selectedExercise, isDirty
// Consumes: useClassGeneration, useStationEditor, useTimingCalculator
// Exposes to AI: bootcampContext object (not the whole state)

// The AI bridge should be a separate hook:
// useBootcampAIBridge.ts
// Takes: bootcampContext (serialized, stable reference)
// Calls: useCoachAssistant with injected system prompt
// Returns: sendToAI(prompt), aiResponse, isAILoading
// Does NOT own bootcamp state — reads only
```

This prevents the bootcamp state from being coupled to the AI chat state, which lives in a completely different part of the component tree.

### 2.2 `currentClass` State Shape Is Undefined

**Severity:** 🔴 Critical

**Issue:** The plan never defines the TypeScript shape of the class being built. Without this, every component will invent its own shape, causing type mismatches at integration time.

**Recommended Fix:** Define this in `BootcampBuilderConstants.ts` before writing any component:

```typescript
// types/bootcampBuilder.types.ts (new file, not in plan)

export type BuilderMode = 'ai' | 'manual' | 'hybrid';

export interface BuiltExercise {
  exerciseId: string;
  name: string;
  durationSeconds: number;
  sets?: number;
  reps?: number;
  source: 'ai' | 'manual';  // tracks provenance for hybrid mode
  painMods: PainModification[];
}

export interface BuiltStation {
  stationNumber: number;
  exercises: BuiltExercise[];
  setupTimeSeconds: number;
  board: 1 | 2;
}

export interface BuiltClass {
  id?: string;  // undefined until saved
  mode: BuilderMode;
  format: ClassFormat;
  style: ClassStyle;
  stations: BuiltStation[];
  timingMs: ClassTiming;
  flowScore: number;
  isDirty: boolean;
}
```

### 2.3 Filter State in `ExerciseRolodexPanel` — Re-render Storm Risk

**Severity:** 🟠 High

**Issue:** If filter chips (body part, equipment, OPT phase) are stored in the same state object as the search query, every keystroke in the search bar will re-render the entire filter chip row and vice versa.

**Recommended Fix:**

```typescript
// useExerciseRolodex.ts
// Separate state slices:
const [searchQuery, setSearchQuery] = useState('');
const [filters, setFilters] = useState<RolodexFilters>({
  bodyPart: [],
  equipment: [],
  optPhase: [],
});

// Memoize the filtered result separately from the query:
const debouncedQuery = useDebounce(searchQuery, 300);
const filteredExercises = useMemo(
  () => applyFilters(exercises, debouncedQuery, filters),
  [exercises, debouncedQuery, filters]
  // Note: exercises should be stable (from React Query cache)
);
```

### 2.4 Timing Calculator — Derived State Should Not Live in `useState`

**Severity:** 🟡 Medium

**Issue:** The plan implies a "real-time timing bar" that updates as exercises are added. If timing is stored in `useState` and updated via `useEffect` watching `currentClass`, there will be a one-render lag and potential stale closure bugs.

**Recommended Fix:** Timing is pure derived state. Compute it inline:

```typescript
// useTimingCalculator.ts
export function useTimingCalculator(stations: BuiltStation[], config: ClassConfig) {
  return useMemo(() => {
    const workMin = calculateWorkTime(stations, config);
    const totalMin = workMin + DEMO_MIN + CLEAR_MIN + STRETCH_MIN;
    return {
      workMin,
      totalMin,
      isOverLimit: totalMin > 55,
      percentUsed: (totalMin / 55) * 100,
    };
  }, [stations, config]);
  // No useState, no useEffect — pure derivation
}
```

---

## Finding 3: Data Flow

### 3.1 Exercise Rolodex Loading — No Caching Strategy Defined

**Severity:** 🟠 High

**Issue:** The plan says `GET /api/bootcamp/exercises` exists but doesn't specify caching. With 840+ exercises, fetching on every panel open will be slow and expensive. The plan also doesn't address pagination vs. full load.

**Recommended Fix:**

```typescript
// useExerciseRolodex.ts — use React Query with aggressive caching
const { data: exercises } = useQuery({
  queryKey: ['bootcamp-exercises'],
  queryFn: fetchBootcampExercises,
  staleTime: 1000 * 60 * 30,  // 30 min — exercise DB doesn't change often
  gcTime: 1000 * 60 * 60,     // 1 hour in cache
  // Load ALL exercises once, filter client-side
  // 840 exercises × ~500 bytes/exercise = ~420KB — acceptable for one-time load
  // Do NOT paginate — breaks client-side filter UX
});
```

**Decision to document:** Load all 840 exercises once and filter client-side. This is the correct call for this data size and UX requirement. Document it explicitly so future devs don't "fix" it by adding server-side pagination and breaking the instant-filter UX.

### 3.2 Conversation Loading Flow — Race Condition in AI Bridge

**Severity:** 🔴 Critical

**Issue:** The plan says "Ask AI for help" from the Exercise Detail panel. If the user clicks this while a previous AI request is in-flight (e.g., they clicked "Generate Class" 2 seconds ago), there are two concurrent requests that could resolve out of order. The plan has no cancellation strategy.

**Recommended Fix:**

```typescript
// useBootcampAIBridge.ts
const abortControllerRef = useRef<AbortController | null>(null);

const sendToAI = useCallback(async (prompt: string, context: BootcampContext) => {
  // Cancel any in-flight request
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();

  try {
    const response = await callAIService(prompt, context, {
      signal: abortControllerRef.current.signal,
    });
    // Only update state if not aborted
    setAIResponse(response);
  } catch (err) {
    if (err.name === 'AbortError') return; // Intentional, ignore
    setAIError(err);
  }
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => abortControllerRef.current?.abort();
}, []);
```

### 3.3 Hybrid Mode State Sync — Stale AI Output Risk

**Severity:** 🟠 High

**Issue:** In Hybrid mode, the AI generates a class, then the trainer edits it. If the trainer edits a station and then clicks "Regenerate" (or if auto-regeneration is triggered), the AI output will overwrite the trainer's manual changes. The plan does not address this conflict.

**Recommended Fix:** Track exercise provenance and implement a merge strategy:

```typescript
// In useClassGeneration.ts
const mergeAIWithManual = useCallback(
  (aiClass: BuiltClass, currentClass: BuiltClass): BuiltClass => {
    // Preserve manual exercises, replace AI exercises
    const mergedStations = currentClass.stations.map((station, i) => ({
      ...aiClass.stations[i],
      exercises: station.exercises.map(ex =>
        ex.source === 'manual' ? ex : aiClass.stations[i]?.exercises[i] ?? ex
      ),
    }));
    return { ...aiClass, stations: mergedStations, mode: 'hybrid' };
  },
  []
);
```

### 3.4 Sidebar Click → Load Conversation Flow

**Severity:** 🟡 Medium

**Issue:** The plan references the existing `useCoachAssistant → useAIChat → useConversationSidebar` chain but doesn't trace what happens when the bootcamp builder's "Ask AI" injects a message into an existing conversation vs. starting a new one. If `loadConversation` is async and the user clicks "Ask AI" before it resolves, the message will be sent to the wrong conversation context.

**Recommended Fix:**

```typescript
// In useBootcampAIBridge.ts
const askAI = useCallback(async (prompt: string) => {
  // Ensure bootcamp conversation is loaded before sending
  if (!bootcampConversationId) {
    const convId = await createBootcampConversation(classContext);
    await loadConversation(convId); // await resolution
  }
  // Now safe to send
  sendMessage(prompt);
}, [bootcampConversationId, classContext, loadConversation, sendMessage]);
```

---

## Finding 4: React Patterns

### 4.1 `StationCard` — Will Re-render on Every Class Change

**Severity:** 🟠 High

**Issue:** If `currentClass.stations` is an array in state and any station changes (e.g., timing recalculation), ALL `StationCard` components will re-render because array reference changes. With 4-8 stations each containing multiple exercises, this is a meaningful performance hit.

**Recommended Fix:**

```typescript
// StationCard.tsx
const StationCard = React.memo(({ station, onExerciseAdd, onExerciseRemove }: StationCardProps) => {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison — only re-render if this station's data changed
  return (
    prevProps.station === nextProps.station &&
    prevProps.onExerciseAdd === nextProps.onExerciseAdd &&
    prevProps.onExerciseRemove === nextProps.onExerciseRemove
  );
});

// In useStationEditor.ts — normalize station state to prevent unnecessary reference changes
// Use immer or careful immutable updates that preserve unchanged station references
```

### 4.2 `ExerciseCard` — Drag Source Callback Instability

**Severity:** 🟡 Medium

**Issue:** If `ExerciseCard` receives an `onDragStart` callback that's recreated on every render of `ExerciseRolodexPanel`, `React.memo` on `ExerciseCard` will be useless.

**Recommended Fix:**

```typescript
// In ExerciseRolodexPanel.tsx or useExerciseRolodex.ts
const handleDragStart = useCallback((exerciseId: string) => {
  setDraggingExerciseId(exerciseId);
}, []); // Stable reference — no deps that change

// ExerciseCard.tsx
const ExerciseCard = React.memo(({ exercise, onDragStart }: ExerciseCardProps) => {
  // ...
});
```

### 4.3 `TimingBar` — Should Be Pure Component

**Severity:** 🟢 Low

**Issue:** The timing bar only needs `percentUsed` and

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
