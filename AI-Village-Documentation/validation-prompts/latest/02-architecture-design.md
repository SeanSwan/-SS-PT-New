# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 71.1s
> **Files:** docs/ai-workflow/blueprints/TEACH-MODE-EXPANSION-PLAN.md
> **Generated:** 3/31/2026, 12:58:53 AM

---

# Architectural Review: TEACH MODE EXPANSION PLAN

**Reviewer:** Senior React/TypeScript Architect
**Date:** Current Sprint
**Verdict:** Plan has strong product vision but contains several architectural risks that must be resolved before implementation begins.

---

## Summary Scorecard

| Dimension | Score | Status |
|---|---|---|
| Component Decomposition | 6/10 | ⚠️ Needs Work |
| State Management | 5/10 | 🔴 Critical Issues |
| Data Flow | 6/10 | ⚠️ Race Conditions Present |
| React Patterns | 5/10 | ⚠️ Gaps Identified |
| File Budget | 4/10 | 🔴 Multiple Violations Likely |
| Hook Design | 6/10 | ⚠️ Separation Unclear |
| Error Boundaries | 3/10 | 🔴 Not Addressed |

---

## Finding 1: Missing Shared Architecture Foundation

**Severity:** 🔴 CRITICAL
**File:** `TeachModeProvider` (proposed but not specified)
**Issue:** The plan proposes 5 independent Teach Mode implementations (Workout Planner, Coach Assistant, Gamification, Client Management, Scheduling) without defining a shared contract. This will produce 5 divergent codebases that cannot share state, cannot be tested uniformly, and will drift apart over time. The plan explicitly asks "should we use a shared component library vs independent implementations" — this question must be answered *before* any code is written, not during.

**Recommended Fix:**

```typescript
// src/features/teach-mode/types/TeachModeTypes.ts
export type TeachModeContext =
  | 'exercise'
  | 'coach-assistant'
  | 'gamification'
  | 'client-management'
  | 'scheduling';

export interface TeachModeConfig {
  context: TeachModeContext;
  entityId?: string;          // exerciseId, clientId, etc.
  entityData?: unknown;       // typed per context via discriminated union
  defaultTab?: string;
  persistenceKey?: string;    // localStorage key, undefined = session only
}

export interface TeachModeState {
  isOpen: boolean;
  activeTab: string;
  context: TeachModeContext;
  entityId: string | null;
}

// Discriminated union for type-safe entity data
export type TeachModeEntity =
  | { context: 'exercise'; data: ExerciseTeachData }
  | { context: 'coach-assistant'; data: CoachAssistantTeachData }
  | { context: 'gamification'; data: GamificationTeachData }
  | { context: 'client-management'; data: ClientTeachData }
  | { context: 'scheduling'; data: SchedulingTeachData };
```

```typescript
// src/features/teach-mode/hooks/useTeachMode.ts
// Single hook consumed by ALL teach mode implementations
// Handles: open/close, tab state, persistence, context switching
// ~80 lines — well within budget
```

**Architecture Decision Required:** Use Answer (a) from Question 2 — shared `TeachModeProvider` + `TeachModePanel`. The HOC approach (c) is an anti-pattern in 2024 React; independent implementations (b) guarantees divergence.

---

## Finding 2: Hook Composition Chain Is Inverted

**Severity:** 🔴 CRITICAL
**File:** `useCoachAssistant` → `useAIChat` → `useConversationSidebar` (implied by plan)
**Issue:** The plan describes Coach Assistant Teach Mode as a sidebar panel added to the existing Coach Assistant feature. The existing hook chain `useCoachAssistant → useAIChat → useConversationSidebar` suggests business logic is at the top and UI state at the bottom. Adding Teach Mode state into this chain creates a circular dependency risk: `useConversationSidebar` would need to know about Teach Mode open state to avoid layout conflicts (two sidebars open simultaneously), but Teach Mode would need conversation context to show relevant tips.

**Trace of the problem:**

```
useCoachAssistant
  ├── useAIChat (data fetching + message state)
  │     └── useConversationSidebar (UI state: open/closed, selected conversation)
  │           └── ??? TeachMode state goes here? Or parallel?
  └── useTeachMode (if added here, it's too far from where it's consumed)
```

**Recommended Fix:** Keep Teach Mode state entirely separate. Use a parallel hook, not a nested one. Coordinate via a shared layout context, not prop drilling.

```typescript
// src/features/coach-assistant/CoachAssistantLayout.tsx
// This component owns layout coordination — it knows about BOTH sidebars
// and prevents them from conflicting.

const CoachAssistantLayout: React.FC = () => {
  const { isOpen: isConvOpen } = useConversationSidebar();
  const { isOpen: isTeachOpen, toggle: toggleTeach } = useTeachMode({
    context: 'coach-assistant',
    persistenceKey: 'teach-mode-coach-assistant',
  });

  // Layout rule: both sidebars cannot be fully open on < 1400px viewport
  const layoutMode = useLayoutMode(isConvOpen, isTeachOpen);

  return (
    <LayoutContainer mode={layoutMode}>
      <ConversationSidebar />
      <MainChatArea />
      <TeachModePanel context="coach-assistant" />
    </LayoutContainer>
  );
};
```

**No circular dependency.** Each hook is independent. The layout component is the single source of truth for spatial conflicts.

---

## Finding 3: Race Condition in Conversation Loading Flow

**Severity:** 🔴 CRITICAL
**File:** `useAIChat.ts` / `useConversationSidebar.ts`
**Issue:** The plan describes "Conversation Management" as a Teach Mode teaching topic, implying the sidebar click → loadConversation → messages render flow is already implemented. Tracing this flow reveals a classic stale closure / race condition pattern:

```typescript
// CURRENT PATTERN (inferred from plan description) — DANGEROUS
const loadConversation = async (conversationId: string) => {
  setLoading(true);
  const messages = await fetchMessages(conversationId); // async gap here
  setMessages(messages);  // stale: user may have clicked different conversation
  setLoading(false);
};
```

If a user clicks Conversation A, then quickly clicks Conversation B before A resolves, both `setMessages` calls fire. The last one to resolve wins — which may be A, leaving the UI showing A's messages with B selected in the sidebar.

**Recommended Fix:** Implement request cancellation with `AbortController` and a request ID guard:

```typescript
// src/features/coach-assistant/hooks/useConversationLoader.ts
// Separated from useAIChat — this is pure data fetching, not chat state

export const useConversationLoader = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadConversation = useCallback(async (conversationId: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoadingId(conversationId);
    setMessages([]); // Clear immediately — prevents stale display

    try {
      const messages = await fetchMessages(
        conversationId,
        abortRef.current.signal
      );
      // Guard: only update if this is still the requested conversation
      setMessages(messages);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // Expected — user navigated away
      }
      throw err; // Propagate real errors to error boundary
    } finally {
      setLoadingId(null);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { messages, loadingId, loadConversation };
};
```

**Additional risk:** The plan mentions "searching conversations" — search input debounce must also cancel previous search requests using the same pattern.

---

## Finding 4: File Budget Violations — Multiple Files Will Exceed 300 Lines

**Severity:** 🔴 CRITICAL
**Files:** Multiple (detailed below)

The plan's proposed components are significantly under-scoped for their described content. Here is a realistic line-count projection:

| Proposed File | Plan's Implied Content | Realistic Line Count | Status |
|---|---|---|---|
| `ExerciseTeachModeSidebar.tsx` | 3 tabs + all sections from wireframes | ~600-800 lines | 🔴 Split required |
| `HowToPerformTab.tsx` | Instructions + cues + muscles + biomechanics + safety + equipment | ~350-450 lines | 🔴 Split required |
| `PhaseProgressionTab.tsx` | Phase params + progression path + compatibility + prerequisites + variations | ~300-400 lines | ⚠️ Borderline |
| `CoachAssistantTeachMode.tsx` | 5 accordion sections + example prompts + copy buttons | ~400-500 lines | 🔴 Split required |
| `useTeachModeData.ts` | Fetch + cache + AI fallback generation + error handling | ~350-400 lines | 🔴 Split required |

**Recommended Split for `ExerciseTeachModeSidebar.tsx`:**

```
src/features/teach-mode/exercise/
├── ExerciseTeachModeContainer.tsx     (~80 lines)  — tab shell + state
├── tabs/
│   ├── HowToPerformTab.tsx            (~120 lines) — orchestrates sections
│   ├── PhaseProgressionTab.tsx        (~150 lines) — orchestrates sections
│   └── LearnWatchTab.tsx              (~100 lines) — video + refs + wisdom
├── sections/
│   ├── StepByStepInstructions.tsx     (~80 lines)
│   ├── CoachingCuesSection.tsx        (~60 lines)
│   ├── MusclesWorkedSection.tsx       (~70 lines)
│   ├── BiomechanicsSection.tsx        (~60 lines)
│   ├── SafetySection.tsx              (~60 lines)
│   ├── EquipmentSection.tsx           (~50 lines)
│   ├── ProgressionPathSection.tsx     (~90 lines)
│   ├── PhaseCompatibilitySection.tsx  (~70 lines)
│   └── PrerequisitesSection.tsx       (~60 lines)
└── hooks/
    ├── useExerciseTeachData.ts        (~80 lines)  — data fetching only
    ├── useExerciseTeachTabs.ts        (~40 lines)  — tab UI state only
    └── useProgressionPath.ts          (~60 lines)  — progression logic only
```

**Recommended Split for `useTeachModeData.ts`:**

```typescript
// useExerciseTeachData.ts — fetching + caching (~80 lines)
// useExerciseAIFallback.ts — AI generation for missing data (~70 lines)
// useTeachModeCache.ts — localStorage/memory cache layer (~60 lines)
```

---

## Finding 5: React.memo / useMemo / useCallback Gaps

**Severity:** ⚠️ HIGH
**Files:** All section components, `ProgressionPathSection.tsx`, `CoachingCuesSection.tsx`

**Issue A — Progression Path re-renders on every parent tab switch:**
The `ProgressionPathSection` renders a visual chain of exercises. If the parent tab component re-renders (e.g., phase toggle button clicked), the entire progression chain re-renders even though the data hasn't changed.

```typescript
// PROBLEM: Inline object creation causes new reference every render
<ProgressionPathSection
  path={exercise.progressionPath}  // new array ref if parent re-renders
  currentExerciseId={exercise.id}
  onExerciseSelect={(id) => handleSelect(id)}  // new function ref every render
/>

// FIX: Memoize at the section level
const ProgressionPathSection = React.memo(({
  path,
  currentExerciseId,
  onExerciseSelect
}: ProgressionPathProps) => {
  // Component is stable — only re-renders when props actually change
}, (prev, next) =>
  prev.currentExerciseId === next.currentExerciseId &&
  prev.path === next.path  // referential equality — parent must memoize path too
);

// In parent:
const stablePath = useMemo(
  () => exercise.progressionPath,
  [exercise.id]  // Only recompute when exercise changes, not on phase toggle
);

const handleExerciseSelect = useCallback(
  (id: string) => dispatch(selectExercise(id)),
  [dispatch]
);
```

**Issue B — Coaching cues array mapped on every render:**

```typescript
// PROBLEM: map() creates new array every render
const cueElements = coachingCues.map(cue => <CueItem key={cue}>{cue}</CueItem>);

// FIX: useMemo with stable dependency
const cueElements = useMemo(
  () => coachingCues.map(cue => <CueItem key={cue}>{cue}</CueItem>),
  [coachingCues]  // Only recompute when cues actually change
);
```

**Issue C — Tab switching triggers full sidebar re-render:**
The 3-tab container must use `React.memo` on each tab panel and render all three with CSS `display: none` rather than conditional rendering, to avoid remounting (and re-fetching) when switching tabs.

```typescript
// PROBLEM: Unmounts/remounts on tab switch — loses scroll position, re-fetches
{activeTab === 'how-to' && <HowToPerformTab exercise={exercise} />}

// FIX: Keep mounted, hide with CSS — preserves state and scroll
<TabPanel visible={activeTab === 'how-to'}>
  <HowToPerformTab exercise={exercise} />
</TabPanel>
<TabPanel visible={activeTab === 'phase'}>
  <PhaseProgressionTab exercise={exercise} />
</TabPanel>
```

---

## Finding 6: Hook Separation Violations

**Severity:** ⚠️ HIGH
**File:** `useTeachModeData.ts` (implied monolithic hook)

**Issue:** The plan implies a single hook that handles: API fetching, AI fallback generation, caching, and loading/error state. This violates the single-responsibility principle and makes testing impossible without mocking the entire chain.

**Recommended Separation:**

```typescript
// Layer 1: Pure data fetching — no UI state, no business logic
// src/features/teach-mode/hooks/useExerciseTeachFetch.ts
export const useExerciseTeachFetch = (exerciseId: string | null) => {
  // ONLY: fetch from API, return raw data + loading + error
  // Uses React Query or SWR pattern
  // ~60 lines
};

// Layer 2: AI fallback — only invoked when fetch returns incomplete data
// src/features/teach-mode/hooks/useExerciseAIFallback.ts
export const useExerciseAIFallback = (
  exerciseId: string,
  missingFields: string[]
) => {
  // ONLY: generate missing fields via AI endpoint
  // Returns generated data, never touches cache directly
  // ~70 lines
};

// Layer 3: Cache management — localStorage + memory cache
// src/features/teach-mode/hooks/useTeachModeCache.ts
export const useTeachModeCache = () => {
  // ONLY: read/write cache, cache invalidation strategy
  // ~60 lines
};

// Layer 4: Composition hook — assembles the above for consumers
// src/features/teach-mode/hooks/useExerciseTeachData.ts
export const useExerciseTeachData = (exerciseId: string | null) => {
  const { data: fetchedData, loading, error } = useExerciseTeachFetch(exerciseId);
  

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
