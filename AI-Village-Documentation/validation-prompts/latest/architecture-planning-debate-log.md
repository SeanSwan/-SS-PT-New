# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 5
> **Tokens:** 41,432 input / 19,820 output

---

## Senior Architecture Lead — Round 1

# Architecture Authority Review: TEACH MODE EXPANSION PLAN

**Reviewer:** Senior Code Quality Lead — Architecture Authority
**Platform:** SwanStudios (sswanstudios.com)
**Review Scope:** Component decomposition, state management, hook design
**Prior Validators:** 12 specialists (UX, Security, Performance, Competitive Intel, Persona, Risk, Frontend Patterns, Data Safety, API Design, Module Architecture, Mobile, React Best Practices)

---

## Executive Verdict

The plan has strong product vision and the 12-validator analysis has surfaced real issues. However, **three architectural decisions remain unresolved that will determine whether this feature succeeds or becomes unmaintainable technical debt within 6 months.** This review resolves those decisions with binding recommendations and provides the concrete implementation contracts the team needs before writing a single line of code.

---

## Scorecard (Architecture Authority Assessment)

| Dimension | Prior Score | My Assessment | Delta |
|---|---|---|---|
| Shared Architecture Foundation | 🔴 Not Defined | 🔴 BLOCKING | Must resolve before Phase 1 |
| Hook Composition | 6/10 | ⚠️ 5/10 | Nesting creates hidden coupling |
| File Decomposition (22 files) | Mixed | ✅ 7/10 | Mostly correct, 3 consolidations needed |
| State Management | 5/10 | 🔴 4/10 | Worse than reported — 3 duplication vectors |
| Error Boundary Strategy | 3/10 | 🔴 3/10 | Confirmed absent, confirmed blocking |
| Memoization Strategy | Not Assessed | ⚠️ 5/10 | Gaps will cause visible jank |
| File Budget Compliance | 4/10 | 🔴 4/10 | 6 files will exceed 300 lines without intervention |

---

## FINDING 1: The Unanswered Architecture Question Is Now Answered

**Severity:** 🔴 BLOCKING — No code until resolved
**Affects:** All 5 phases

The plan explicitly asks: *"Should Teach Mode be a shared component library vs independent implementations?"* The 12 validators flagged this but none gave a binding answer. Here it is:

**Decision: Shared Provider Architecture with Context-Specific Content Injection**

Independent implementations (Option B) will produce 5 divergent codebases. A higher-order component (Option C) creates invisible prop tunneling. The correct answer is Option A with a specific constraint: **the shared layer handles only state and lifecycle; content is injected, never hardcoded in the shared layer.**

```typescript
// src/features/teach-mode/types/TeachModeContracts.ts
// THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR ALL TEACH MODE IMPLEMENTATIONS
// Max 80 lines. No component logic. No styled-components. Pure types.

export type TeachModeContext =
  | 'exercise'
  | 'coach-assistant'
  | 'gamification'
  | 'client-management'
  | 'scheduling';

export type TeachModeTab = string; // Context-specific tab IDs, not a union

export interface TeachModeEntity {
  id: string;
  displayName: string;
  contextData: unknown; // Typed via discriminated union below
}

// Discriminated union — each context owns its data shape
export type TeachModeEntityData =
  | { context: 'exercise'; exerciseId: string; exerciseName: string; optPhase: number }
  | { context: 'coach-assistant'; conversationId: string | null }
  | { context: 'gamification'; achievementId: string | null }
  | { context: 'client-management'; clientId: string; clientName: string }
  | { context: 'scheduling'; sessionId: string | null };

export interface TeachModeConfig {
  context: TeachModeContext;
  entityData: TeachModeEntityData;
  defaultTab: TeachModeTab;
  persistenceKey: string | null; // null = session only, string = localStorage key
  tabs: TeachModeTabDefinition[];
}

export interface TeachModeTabDefinition {
  id: TeachModeTab;
  label: string;
  icon: string; // Lucide icon name — no React imports in this file
  lazyLoad: boolean; // true = content fetched on tab activation, not panel open
}

export interface TeachModeState {
  isOpen: boolean;
  activeTab: TeachModeTab;
  config: TeachModeConfig;
  isLoading: boolean;
  error: string | null;
}

export interface TeachModeActions {
  open: (config: TeachModeConfig) => void;
  close: () => void;
  setTab: (tab: TeachModeTab) => void;
  setError: (error: string | null) => void;
}
```

```typescript
// src/features/teach-mode/context/TeachModeContext.tsx
// Max 60 lines. State management only. No UI.

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { TeachModeState, TeachModeActions, TeachModeConfig } from '../types/TeachModeContracts';

type TeachModeAction =
  | { type: 'OPEN'; config: TeachModeConfig }
  | { type: 'CLOSE' }
  | { type: 'SET_TAB'; tab: string }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_LOADING'; loading: boolean };

const initialState: TeachModeState = {
  isOpen: false,
  activeTab: '',
  config: null as unknown as TeachModeConfig, // Guarded by isOpen check
  isLoading: false,
  error: null,
};

function teachModeReducer(state: TeachModeState, action: TeachModeAction): TeachModeState {
  switch (action.type) {
    case 'OPEN':
      return {
        ...state,
        isOpen: true,
        activeTab: action.config.defaultTab,
        config: action.config,
        error: null,
      };
    case 'CLOSE':
      return { ...state, isOpen: false };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    default:
      return state;
  }
}

const TeachModeStateContext = createContext<TeachModeState | null>(null);
const TeachModeActionsContext = createContext<TeachModeActions | null>(null);

// Split contexts prevent action consumers from re-rendering on state changes
export function TeachModeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(teachModeReducer, initialState);

  const actions: TeachModeActions = {
    open: useCallback((config) => dispatch({ type: 'OPEN', config }), []),
    close: useCallback(() => dispatch({ type: 'CLOSE' }), []),
    setTab: useCallback((tab) => dispatch({ type: 'SET_TAB', tab }), []),
    setError: useCallback((error) => dispatch({ type: 'SET_ERROR', error }), []),
  };

  return (
    <TeachModeStateContext.Provider value={state}>
      <TeachModeActionsContext.Provider value={actions}>
        {children}
      </TeachModeActionsContext.Provider>
    </TeachModeStateContext.Provider>
  );
}

export const useTeachModeState = () => {
  const ctx = useContext(TeachModeStateContext);
  if (!ctx) throw new Error('useTeachModeState must be used within TeachModeProvider');
  return ctx;
};

export const useTeachModeActions = () => {
  const ctx = useContext(TeachModeActionsContext);
  if (!ctx) throw new Error('useTeachModeActions must be used within TeachModeProvider');
  return ctx;
};
```

**Why split contexts matter here:** The `TeachModeActionsContext` split is not premature optimization. The toggle button, the close button, and the tab switcher all consume actions. If they consumed a single context, every state change (loading spinner, error flash, tab switch) would re-render all three. With split contexts, action consumers are stable.

---

## FINDING 2: Hook Composition Has a Hidden Coupling Problem

**Severity:** ⚠️ HIGH
**Affects:** Phase 2 Coach Assistant, Phase 1 exercise data fetching
**Prior Assessment:** Flagged as "acceptable but risky" — this is underselling the problem

The proposed nesting `useCoachAssistant → useAIChat → useConversationSidebar` creates **lifecycle coupling that will produce bugs under network failure conditions.** Specifically: if `useAIChat` is managing a streaming response and `useConversationSidebar` triggers a re-render (user clicks a different conversation), the stream cleanup in `useAIChat` depends on `useCoachAssistant`'s effect cleanup running first. This ordering is not guaranteed.

**The correct pattern is horizontal composition, not vertical nesting:**

```typescript
// src/features/teach-mode/hooks/useExerciseTeachData.ts
// PHASE 1 HOOK — Max 80 lines
// Responsibility: Fetch and cache deep exercise data for Teach Mode
// Does NOT know about tabs, sidebar state, or UI

import { useState, useEffect, useRef } from 'react';
import type { ExerciseTeachData } from '../types/TeachModeContracts';

interface UseExerciseTeachDataResult {
  data: ExerciseTeachData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Module-level cache — survives component unmount, cleared on page unload
// This is intentional: exercise data is static, not user-specific
const exerciseTeachCache = new Map<string, ExerciseTeachData>();

export function useExerciseTeachData(
  exerciseId: string | null,
  enabled: boolean // Only fetch when Teach Mode is open AND tab is active
): UseExerciseTeachDataResult {
  const [data, setData] = useState<ExerciseTeachData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!exerciseId || !enabled) return;

    // Cache hit — no network request, no loading state
    if (exerciseTeachCache.has(exerciseId)) {
      setData(exerciseTeachCache.get(exerciseId)!);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/exercises/${exerciseId}/teach-mode`, {
      signal: abortRef.current.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Exercise data unavailable (${res.status})`);
        return res.json();
      })
      .then((teachData: ExerciseTeachData) => {
        exerciseTeachCache.set(exerciseId, teachData);
        setData(teachData);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // Intentional abort, not an error
        setError(err.message ?? 'Failed to load exercise details');
      })
      .finally(() => setIsLoading(false));

    return () => abortRef.current?.abort();
  }, [exerciseId, enabled]);

  const refetch = () => {
    if (exerciseId) exerciseTeachCache.delete(exerciseId);
    // Effect will re-run because we need to trigger it — use a counter
  };

  return { data, isLoading, error, refetch };
}
```

```typescript
// src/features/teach-mode/hooks/useTeachModePanel.ts
// SHARED HOOK — Max 60 lines
// Responsibility: Tab state, persistence, panel open/close coordination
// Does NOT fetch data. Does NOT know about exercise IDs or conversation IDs.

import { useCallback, useEffect } from 'react';
import { useTeachModeState, useTeachModeActions } from '../context/TeachModeContext';

interface UseTeachModePanelResult {
  isOpen: boolean;
  activeTab: string;
  isLoading: boolean;
  error: string | null;
  handleTabChange: (tab: string) => void;
  handleClose: () => void;
}

export function useTeachModePanel(): UseTeachModePanelResult {
  const { isOpen, activeTab, isLoading, error, config } = useTeachModeState();
  const { close, setTab } = useTeachModeActions();

  // Persistence: restore last tab for this context on open
  useEffect(() => {
    if (!isOpen || !config?.persistenceKey) return;
    const saved = localStorage.getItem(`teach-mode-tab:${config.persistenceKey}`);
    if (saved && config.tabs.some((t) => t.id === saved)) {
      setTab(saved);
    }
  }, [isOpen, config?.persistenceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persistence: save active tab on change
  useEffect(() => {
    if (!isOpen || !config?.persistenceKey || !activeTab) return;
    localStorage.setItem(`teach-mode-tab:${config.persistenceKey}`, activeTab);
  }, [activeTab, isOpen, config?.persistenceKey]);

  const handleTabChange = useCallback((tab: string) => setTab(tab), [setTab]);
  const handleClose = useCallback(() => close(), [close]);

  return { isOpen, activeTab, isLoading, error, handleTabChange, handleClose };
}
```

**The key architectural rule this enforces:** Each hook has exactly one responsibility. `useExerciseTeachData` owns network + cache. `useTeachModePanel` owns UI state + persistence. They are composed at the component level, not nested inside each other. This means either can be tested in isolation, either can be replaced without touching the other, and their lifecycles are independent.

---

## FINDING 3: State Duplication — Three Vectors Identified

**Severity:** 🔴 CRITICAL
**Affects:** Phase 1 immediately, all phases eventually

The prior architecture review scored state management 5/10. My assessment is 4/10 because the plan creates three specific duplication vectors that will produce inconsistent UI state:

### Vector 1: Exercise Selection State

The Workout Planner's Exercise Rolodex already tracks `selectedExercise` in its own state. The proposed Teach Mode will also track `exerciseId`. These will drift. When the user selects Exercise A in the Rolodex, then opens Teach Mode, then selects Exercise B in the Rolodex without closing Teach Mode — which exercise does Teach Mode show?

**Fix:** Teach Mode does not own exercise selection. It subscribes to it.

```typescript
// In WorkoutPlannerPage.tsx or equivalent container
// The Rolodex owns selectedExerciseId. Teach Mode receives it as a prop trigger.

function WorkoutPlannerContainer() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const { open } = useTeachModeActions();

  const handleExerciseSelect = useCallback((exercise: ExerciseSlim) => {
    setSelectedExerciseId(exercise.id);
    // Teach Mode opens/updates reactively — it does not store exerciseId internally
    open({
      context: 'exercise',
      entityData: {
        context: 'exercise',
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        optPhase: currentPhase,
      },
      defaultTab: 'how-to-perform',
      persistenceKey: 'workout-planner-exercise',
      tabs: EXERCISE_TEACH_MODE_

---

## Code Architecture Specialist (1M context) — Round 2

## Code Architecture Specialist (Qwen 3.6 Plus) — Round 1 Response

I align with the core directive: **Shared Provider + Horizontal Hooks + Reactive State Subscription** is the correct foundation. However, three implementation details in your proposal introduce runtime bugs, type unsafety, and race conditions that will surface in Phase 1. Below are targeted disputes, exact fixes, and completion of the cut-off analysis.

---

### 🔴 DISPUTE 1: `useExerciseTeachData.ts` Refetch Logic is Broken
**File:** `src/features/teach-mode/hooks/useExerciseTeachData.ts`
**Lines:** 48–51
**Issue:** `refetch()` deletes the cache entry but does not change any dependency in the `useEffect` array. The effect will **not** re-run, leaving the UI stuck on stale/error state.

**Fix:** Introduce a `refreshKey` counter to force effect re-evaluation without mutating external state.

```diff
// src/features/teach-mode/hooks/useExerciseTeachData.ts
// Line 14: Add state
+ const [refreshKey, setRefreshKey] = useState(0);

// Line 21: Add to dependency array
- }, [exerciseId, enabled]);
+ }, [exerciseId, enabled, refreshKey]);

// Lines 48-51: Replace broken refetch
  const refetch = () => {
-   if (exerciseId) exerciseTeachCache.delete(exerciseId);
-   // Effect will re-run because we need to trigger it — use a counter
+   if (exerciseId) exerciseTeachCache.delete(exerciseId);
+   setRefreshKey(k => k + 1); // Triggers effect re-run
  };
```

**Why this matters:** Without this, the "Retry" button in the UI will be a no-op. The counter pattern is standard for cache-busting in React hooks without introducing stale closures.

---

### 🔴 DISPUTE 2: Type Safety & Initial State Violations
**File 1:** `src/features/teach-mode/types/TeachModeContracts.ts`
**Lines:** 9–13
**Issue:** `TeachModeEntity` declares `contextData: unknown` but `TeachModeEntityData` already provides a strict discriminated union. This creates a redundant, unsafe escape hatch that defeats the purpose of the union.

**Fix:** Remove `TeachModeEntity` entirely. It is unused in the provider and contradicts the strict typing goal.

**File 2:** `src/features/teach-mode/context/TeachModeContext.tsx`
**Line:** 18
**Issue:** `config: null as unknown as TeachModeConfig` bypasses TypeScript's strict null checks. Consumers will assume `config` is always defined when `isOpen === true`, but TS won't enforce it.

**Fix:**
```diff
- config: null as unknown as TeachModeConfig,
+ config: null as TeachModeConfig | null,
```
**Line:** 3
**Issue:** `export type TeachModeTab = string;` is too permissive. It allows typos to compile and break tab routing silently.

**Fix:** Use a branded type or enforce validation at the `open()` boundary. I recommend keeping `string` for flexibility but adding a runtime guard in the provider:
```typescript
// In TeachModeContext.tsx, inside OPEN case:
const isValidTab = config.tabs.some(t => t.id === config.defaultTab);
if (!isValidTab) throw new Error(`Invalid defaultTab: ${config.defaultTab}`);
```

---

### 🔴 DISPUTE 3: Missing Error Boundary & Tab-Scoped Loading State
**File:** `src/features/teach-mode/components/TeachModeErrorBoundary.tsx` (Missing)
**Issue:** You marked Error Boundaries 🔴 3/10 but provided no implementation. A single tab crash (e.g., malformed API response in Coach Assistant) will unmount the entire Teach Mode panel, losing user context.

**Contract:** Implement a scoped boundary that catches tab content errors and falls back to a retry UI without closing the panel.

```tsx
// src/features/teach-mode/components/TeachModeErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback: ReactNode; }
interface State { hasError: boolean; }

export class TeachModeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[TeachMode] Tab crashed:', error, info);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

**File:** `src/features/teach-mode/types/TeachModeContracts.ts`
**Issue:** `isLoading` and `error` in `TeachModeState` are global. If Phase 2 introduces concurrent tab pre-fetching, switching tabs will overwrite loading/error states, causing UI flicker.

**Fix:** Scope status to tabs.
```typescript
// Replace in TeachModeState:
export interface TeachModeState {
  isOpen: boolean;
  activeTab: TeachModeTab;
  config: TeachModeConfig | null;
  tabStatuses: Record<TeachModeTab, 'idle' | 'loading' | 'error'>; // New
}
```

---

### ✅ COMPLETION: State Duplication Vectors 1–3
Your analysis cut off mid-vector. Here are the completed contracts:

**Vector 1: Exercise Selection State** (Completed)
```typescript
// In WorkoutPlannerContainer.tsx
const handleExerciseSelect = useCallback((exercise: ExerciseSlim) => {
  setSelectedExerciseId(exercise.id);
  open({
    context: 'exercise',
    entityData: { context: 'exercise', exerciseId: exercise.id, exerciseName: exercise.name, optPhase: currentPhase },
    defaultTab: 'how-to-perform',
    persistenceKey: 'workout-planner-exercise',
    tabs: EXERCISE_TEACH_MODE_TABS, // Defined in constants
  });
}, [open, currentPhase]);
```
**Rule:** Teach Mode never reads `selectedExerciseId` from its own state. It receives it via `open()` payload. If the user changes selection while open, `open()` is called again, triggering a reducer reset.

**Vector 2: Tab Persistence Race Condition**
`useTeachModePanel.ts` reads/writes `localStorage` synchronously in effects. This causes hydration mismatches and race conditions during rapid tab switching.
**Fix:** Defer persistence to a `useSyncExternalStore` or throttle writes:
```typescript
// In useTeachModePanel.ts, replace persistence effects with:
useEffect(() => {
  if (!isOpen || !config?.persistenceKey || !activeTab) return;
  const timer = setTimeout(() => {
    localStorage.setItem(`teach-mode-tab:${config.persistenceKey}`, activeTab);
  }, 150); // Debounce prevents thrashing during rapid clicks
  return () => clearTimeout(timer);
}, [activeTab, isOpen, config?.persistenceKey]);
```

**Vector 3: AI Stream vs UI State Coupling**
Coach Assistant will stream tokens. If `useTeachModePanel` triggers a re-render (e.g., tab switch), the stream state must survive.
**Fix:** Stream state must live in a `useRef` or external store (Zustand/Redux), **not** in React state. The hook should return a `streamRef.current` for UI consumption, preventing re-render loops during token ingestion.

---

### 📋 BINDING RECOMMENDATIONS FOR ROUND 2
1. **Adopt `tabStatuses` over global `isLoading`** to prevent concurrent fetch collisions.
2. **Implement `TeachModeErrorBoundary`** around each lazy-loaded tab panel.
3. **Fix `refetch`** with the `refreshKey` pattern.
4. **Remove `TeachModeEntity`** and tighten `TeachModeConfig` nullability.
5. **Defer `localStorage` writes** with debounce to prevent hydration/race bugs.

I await your rebuttal on the `tabStatuses` scoping and the stream-state isolation pattern. If aligned, we lock the provider/hook contracts and proceed to Phase 1 component scaffolding.

---

## Senior Architecture Lead — Round 3

# Architecture Authority Response — Round 2

**Reviewer:** Senior Architecture Lead (Claude Sonnet 4.6)
**Status:** Partial Agreement + Targeted Disputes

---

## Alignment Assessment

The Code Architecture Specialist has identified four genuine bugs and proposed valid fixes. I accept three of them without modification. I dispute two proposals as over-engineering that introduces new problems while solving smaller ones.

---

## ✅ ACCEPTED WITHOUT MODIFICATION

### Accept: `refreshKey` Fix for `useExerciseTeachData.refetch()`

The broken refetch is confirmed. The `refreshKey` counter pattern is correct. Accepted as written.

```typescript
// src/features/teach-mode/hooks/useExerciseTeachData.ts
// FINAL — incorporates refreshKey fix

const [refreshKey, setRefreshKey] = useState(0);

useEffect(() => {
  // ... existing logic unchanged ...
}, [exerciseId, enabled, refreshKey]); // refreshKey added

const refetch = useCallback(() => {
  if (exerciseId) exerciseTeachCache.delete(exerciseId);
  setRefreshKey(k => k + 1);
}, [exerciseId]);
```

**One addition:** `refetch` should be wrapped in `useCallback` with `exerciseId` as dependency. The original proposal omits this, which will cause the returned `refetch` reference to change on every render, breaking any `useEffect` that depends on it downstream.

---

### Accept: `TeachModeErrorBoundary` Implementation

The class component implementation is correct. Error boundaries must be class components — this is not a design choice, it's a React constraint. Accepted with one structural addition:

```tsx
// src/features/teach-mode/components/TeachModeErrorBoundary.tsx
// FINAL — adds reset capability the original omits

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: (reset: () => void) => ReactNode; // Render prop, not static node
  tabId: string; // For targeted error reporting
}

interface State { hasError: boolean; errorMessage: string | null; }

export class TeachModeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Structured logging — tabId enables filtering in monitoring tools
    console.error('[TeachMode] Tab crashed:', {
      tabId: this.props.tabId,
      error: error.message,
      componentStack: info.componentStack,
    });
  }

  reset = () => this.setState({ hasError: false, errorMessage: null });

  render() {
    return this.state.hasError
      ? this.props.fallback(this.reset)
      : this.props.children;
  }
}
```

**Why render prop over static fallback:** The original `fallback: ReactNode` cannot call `reset()`. A static fallback means the user must close and reopen the panel to recover. The render prop pattern gives the fallback UI access to `reset`, enabling in-place retry without panel destruction.

---

### Accept: `localStorage` Debounce Fix

The race condition during rapid tab switching is real. The 150ms debounce is accepted. However, the implementation needs one correction:

```typescript
// src/features/teach-mode/hooks/useTeachModePanel.ts
// CORRECTED debounce — original has a closure bug

useEffect(() => {
  if (!isOpen || !config?.persistenceKey || !activeTab) return;
  
  const key = `teach-mode-tab:${config.persistenceKey}`; // Capture in closure
  const timer = setTimeout(() => {
    localStorage.setItem(key, activeTab); // Uses captured key, not stale ref
  }, 150);
  
  return () => clearTimeout(timer);
}, [activeTab, isOpen, config?.persistenceKey]);
```

**The closure bug in the original:** `config.persistenceKey` inside the `setTimeout` callback could reference a stale value if `config` changes before the 150ms fires. Capturing `key` before the timeout eliminates this.

---

## 🔴 DISPUTE 1: `tabStatuses` Proposal Is Premature and Introduces New Problems

**Proposal:** Replace `isLoading: boolean` and `error: string | null` with `tabStatuses: Record<TeachModeTab, 'idle' | 'loading' | 'error'>`

**My position:** Reject for Phase 1. Accept as Phase 3 upgrade path only.

**Reason 1 — It solves a Phase 3 problem in Phase 1 code:**
The Specialist's justification is "concurrent tab pre-fetching." Phase 1 has no concurrent fetching. Phase 1 has one active tab, one fetch, one loading state. Adding `tabStatuses` now means every Phase 1 component must handle a `Record<string, status>` lookup instead of a boolean. That is complexity without current benefit.

**Reason 2 — It creates a new initialization problem:**
```typescript
// What does tabStatuses look like before config is set?
tabStatuses: Record<TeachModeTab, 'idle' | 'loading' | 'error'>
// TeachModeTab = string
// Record<string, ...> with no keys = {}
// But tabs aren't known until config is injected via open()
// So every consumer must guard: tabStatuses[activeTab] ?? 'idle'
// That's worse than the boolean it replaces
```

**Reason 3 — The actual concurrent fetch problem has a better solution:**
When Phase 3 introduces concurrent pre-fetching, the correct pattern is to move fetch state into the individual data hooks (`useExerciseTeachData`, `useCoachAssistantData`), not into the shared context. Each hook owns its own loading/error state. The panel context owns only UI state.

**Binding Decision:**

```typescript
// src/features/teach-mode/types/TeachModeContracts.ts
// FINAL TeachModeState — keeps global loading/error for Phase 1
// Phase 3 migration path: move to hook-local state, remove from context

export interface TeachModeState {
  isOpen: boolean;
  activeTab: TeachModeTab;
  config: TeachModeConfig | null; // Accepts the null fix from Specialist
  isLoading: boolean;             // Phase 1: global. Phase 3: deprecated.
  error: string | null;           // Phase 1: global. Phase 3: deprecated.
}

// Phase 3 migration note (not implemented now):
// Each data hook returns its own { isLoading, error }
// TeachModeState.isLoading becomes: derived from active tab's hook state
// This is a non-breaking change — consumers already read from hooks
```

**The migration is non-breaking because:** Phase 1 components read `isLoading` from `useTeachModeState()`. Phase 3 components will read `isLoading` from `useExerciseTeachData()`. The context field is deprecated, not removed. No consumer breaks.

---

## 🔴 DISPUTE 2: Stream State in `useRef` Is Correct Direction, Wrong Scope

**Proposal:** Stream state must live in `useRef` or external store (Zustand/Redux), not React state.

**My position:** Partially correct direction, but "Zustand/Redux" is the wrong prescription for this feature's scope.

**What I agree with:** Streaming token state must not live in React state. Agreed completely. Putting 500 token updates through `setState` will cause 500 re-renders and visible jank.

**What I dispute:** Recommending Zustand/Redux introduces a new dependency for a problem that `useRef` + `useSyncExternalStore` already solves within the existing architecture.

**The correct implementation:**

```typescript
// src/features/teach-mode/hooks/useStreamingContent.ts
// Max 70 lines. Owns streaming state without React re-renders during ingestion.

import { useRef, useCallback, useSyncExternalStore } from 'react';

interface StreamingState {
  content: string;
  isStreaming: boolean;
  error: string | null;
}

// useSyncExternalStore requires a subscribe/getSnapshot pattern
// This gives us React-compatible external state without Redux

function createStreamStore() {
  let state: StreamingState = { content: '', isStreaming: false, error: null };
  const listeners = new Set<() => void>();

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    // Only notifies React when streaming COMPLETES, not per-token
    append: (token: string) => {
      state = { ...state, content: state.content + token };
      // Intentionally NOT notifying listeners here — DOM update via ref
    },
    setStreaming: (isStreaming: boolean) => {
      state = { ...state, isStreaming };
      listeners.forEach(l => l()); // React re-renders only on start/stop
    },
    setError: (error: string | null) => {
      state = { ...state, error, isStreaming: false };
      listeners.forEach(l => l());
    },
    reset: () => {
      state = { content: '', isStreaming: false, error: null };
      listeners.forEach(l => l());
    },
  };
}

export function useStreamingContent() {
  const storeRef = useRef(createStreamStore());
  const store = storeRef.current;

  // React only re-renders on isStreaming/error changes, not per-token
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // DOM updates during streaming bypass React entirely
  const contentRef = useRef<HTMLDivElement | null>(null);

  const appendToken = useCallback((token: string) => {
    store.append(token); // Updates internal state without React notification
    if (contentRef.current) {
      contentRef.current.textContent += token; // Direct DOM write — zero re-renders
    }
  }, [store]);

  return {
    content: snapshot.content,
    isStreaming: snapshot.isStreaming,
    error: snapshot.error,
    contentRef, // Attach to the streaming display div
    appendToken,
    startStream: () => store.setStreaming(true),
    endStream: () => store.setStreaming(false),
    setStreamError: store.setError,
    resetStream: store.reset,
  };
}
```

**Why this is better than Zustand/Redux for this case:**
- Zero new dependencies
- `useSyncExternalStore` is React 18 built-in, concurrent-mode safe
- Re-renders only on streaming start/stop, not per token
- Direct DOM writes during streaming are intentional and safe here — the content is append-only during streaming, no diffing needed
- When streaming ends, React reconciles the final state once

**When Zustand/Redux becomes appropriate:** If streaming state needs to be shared across multiple unrelated component trees simultaneously. For Teach Mode's Coach Assistant tab, the stream is local to one panel. External store is overkill.

---

## REMAINING OPEN ITEM: `TeachModeEntity` Removal

The Specialist recommends removing `TeachModeEntity` from `TeachModeContracts.ts`. **Accepted.** It is redundant given `TeachModeEntityData`. Removing it tightens the type surface.

```typescript
// src/features/teach-mode/types/TeachModeContracts.ts
// REMOVE these lines (lines 9-13 in original):
// export interface TeachModeEntity {
//   id: string;
//   displayName: string;
//   contextData: unknown;
// }
```

---

## Consolidated Contract Status

| Contract | Status | Owner |
|---|---|---|
| `TeachModeContracts.ts` | ✅ Locked (with null fix + entity removal) | Both agreed |
| `TeachModeContext.tsx` | ✅ Locked (split contexts, global loading Phase 1) | Both agreed |
| `useExerciseTeachData.ts` | ✅ Locked (with refreshKey + useCallback fix) | Both agreed |
| `useTeachModePanel.ts` | ✅ Locked (with debounce closure fix) | Both agreed |
| `TeachModeErrorBoundary.tsx` | ✅ Locked (render prop pattern) | Both agreed |
| `useStreamingContent.ts` | ✅ Locked (useSyncExternalStore, no Zustand) | Disputed → Resolved |
| `tabStatuses` in context | 🔴 Rejected for Phase 1 | Disputed → Resolved |

**Round 3 agenda:** Phase 1 component scaffolding contracts — `TeachModePanel.tsx`, `TeachModeTabBar.tsx`, lazy loading boundaries, and the `EXERCISE_TEACH_MODE_TABS` constants definition that was cut off in Round 1.

---

## Code Architecture Specialist (1M context) — Round 4

# Code Architecture Specialist (Qwen 3.6 Plus) — Round 2 Response

**Status:** Partial Agreement + Targeted Refinements
**Focus:** Hook-local state formalization, SSR safety for streaming, Phase 1 component contracts

---

## ✅ CONCESSION: `tabStatuses` Rejection Accepted

Your reasoning is sound. Introducing `Record<TeachModeTab, status>` in Phase 1 creates initialization complexity (`tabStatuses[activeTab] ?? 'idle'`) without immediate payoff. I concede this point.

**Binding Alternative Contract:** Adopt **Hook-Local State Colocation**. Each data hook owns its own `isLoading`/`error`. The context only tracks UI state (`isOpen`, `activeTab`, `config`). This eliminates the global loading collision problem entirely and makes Phase 3 concurrent pre-fetching trivial.

```typescript
// src/features/teach-mode/types/TeachModeContracts.ts (FINAL)
export interface TeachModeState {
  isOpen: boolean;
  activeTab: TeachModeTab;
  config: TeachModeConfig | null;
  // isLoading & error REMOVED from context. Managed per-hook.
}
```

---

## 🔴 DISPUTE 1: `useStreamingContent.ts` Will Crash in SSR & Risk DOM Reconciliation

**File:** `src/features/teach-mode/hooks/useStreamingContent.ts`
**Lines:** 24–26, 48
**Issue 1:** `useSyncExternalStore` **requires** a `getServerSnapshot` argument in Next.js/SSR environments. Omitting it throws `useSyncExternalStore requires a getServerSnapshot` at build time.
**Issue 2:** Direct `textContent += token` mutation while React owns the parent DOM node can trigger React 18's concurrent reconciliation warnings if a parent re-renders during streaming.

**Fix:** Add SSR fallback and isolate the streaming DOM node with a `data-streaming` attribute to prevent React interference.

```diff
// src/features/teach-mode/hooks/useStreamingContent.ts
// Lines 24-26: Add getServerSnapshot
- const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
+ const snapshot = useSyncExternalStore(
+   store.subscribe,
+   store.getSnapshot,
+   () => ({ content: '', isStreaming: false, error: null }) // SSR fallback
+ );

// Lines 45-50: Safer DOM mutation
  const appendToken = useCallback((token: string) => {
    store.append(token);
    if (contentRef.current) {
+     contentRef.current.setAttribute('data-streaming', 'true');
      contentRef.current.textContent += token;
    }
  }, [store]);

+ // Clear streaming flag on completion to allow React reconciliation
+ const endStream = useCallback(() => {
+   store.setStreaming(false);
+   if (contentRef.current) contentRef.current.removeAttribute('data-streaming');
+ }, [store]);
```

**Why this matters:** Without `getServerSnapshot`, the app fails to build in Next.js. Without the `data-streaming` flag, React's hydration mismatch detector may attempt to reconcile the streaming div, causing flicker or console errors.

---

## 🔴 DISPUTE 2: Error Boundary + Lazy Loading Integration Pattern

**File:** `src/features/teach-mode/components/TeachModePanel.tsx` (Proposed)
**Issue:** Wrapping lazy components directly in `TeachModeErrorBoundary` without a `Suspense` boundary will cause the error boundary to catch `Promise` throws from `React.lazy()`, masking actual loading states.

**Binding Integration Contract:**

```tsx
// src/features/teach-mode/components/TeachModePanel.tsx
// Lines 1-40 (Scaffold)
import { Suspense, lazy } from 'react';
import { useTeachModeState } from '../context/TeachModeContext';
import { TeachModeErrorBoundary } from './TeachModeErrorBoundary';
import { TeachModeTabBar } from './TeachModeTabBar';

// Lazy imports — code-split per tab
const ExerciseTab = lazy(() => import('./tabs/ExerciseTab'));
const CoachTab = lazy(() => import('./tabs/CoachTab'));

const TAB_COMPONENTS: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  'how-to-perform': ExerciseTab,
  'ai-coach': CoachTab,
  // Add Phase 2/3 tabs here
};

export function TeachModePanel() {
  const { isOpen, activeTab, config } = useTeachModeState();
  if (!isOpen || !config) return null;

  const ActiveTabComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="teach-mode-panel" role="dialog" aria-label="Teach Mode">
      <TeachModeTabBar tabs={config.tabs} activeTab={activeTab} />
      
      <div className="teach-mode-content">
        <Suspense fallback={<div className="tab-loader" />}>
          <TeachModeErrorBoundary
            tabId={activeTab}
            fallback={(reset) => (
              <div className="tab-error">
                <p>Tab failed to load. <button onClick={reset}>Retry</button></p>
              </div>
            )}
          >
            {ActiveTabComponent ? <ActiveTabComponent /> : <div>Tab not implemented</div>}
          </TeachModeErrorBoundary>
        </Suspense>
      </div>
    </div>
  );
}
```

**Why this ordering matters:** `Suspense` must wrap `lazy()` to catch the Promise. `ErrorBoundary` must wrap the *rendered* component to catch runtime errors. Swapping them or omitting `Suspense` breaks React's concurrent rendering guarantees.

---

## 📋 PHASE 1 COMPONENT CONTRACTS (Ready for Implementation)

### 1. `TeachModeTabBar.tsx`
```tsx
// src/features/teach-mode/components/TeachModeTabBar.tsx
// Max 45 lines. Pure UI. No data fetching.
import { useTeachModeActions } from '../context/TeachModeContext';
import type { TeachModeTabDefinition } from '../types/TeachModeContracts';

interface Props {
  tabs: TeachModeTabDefinition[];
  activeTab: string;
}

export function TeachModeTabBar({ tabs, activeTab }: Props) {
  const { setTab } = useTeachModeActions();
  
  return (
    <nav className="teach-mode-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => setTab(tab.id)}
        >
          {/* Icon rendering deferred to Lucide dynamic import or SVG map */}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
```

### 2. `constants/TeachModeTabs.ts`
```typescript
// src/features/teach-mode/constants/TeachModeTabs.ts
// Max 30 lines. Single source of truth for tab definitions.
import type { TeachModeTabDefinition } from '../types/TeachModeContracts';

export const EXERCISE_TEACH_MODE_TABS: TeachModeTabDefinition[] = [
  { id: 'how-to-perform', label: 'How to Perform', icon: 'Dumbbell', lazyLoad: true },
  { id: 'variations', label: 'Variations', icon: 'GitBranch', lazyLoad: true },
  { id: 'common-mistakes', label: 'Common Mistakes', icon: 'AlertTriangle', lazyLoad: true },
];

export const COACH_ASSISTANT_TABS: TeachModeTabDefinition[] = [
  { id: 'ai-coach', label: 'AI Coach', icon: 'MessageSquare', lazyLoad: true },
  { id: 'history', label: 'History', icon: 'Clock', lazyLoad: true },
];
```

---

## 📌 BINDING RECOMMENDATIONS FOR ROUND 3

1. **Lock Hook-Local State Pattern:** Remove `isLoading`/`error` from `TeachModeState`. Each tab hook returns its own status. Context only manages UI routing.
2. **Fix `useStreamingContent` SSR:** Add `getServerSnapshot` and `data-streaming` DOM isolation.
3. **Enforce `Suspense` → `ErrorBoundary` → `LazyComponent` nesting** in `TeachModePanel.tsx`.
4. **Defer `EXERCISE_TEACH_MODE_TABS` to constants file** to prevent circular dependencies and keep `TeachModeContracts.ts` pure.

**Round 3 Focus:** Finalize Phase 1 data hook integration (`useExerciseTeachData` + `useTeachModePanel` composition in `ExerciseTab.tsx`), establish the `lazyLoad` fetch trigger mechanism, and lock the CSS module/class naming convention to prevent style collisions.

I await your confirmation on the SSR streaming fix and the `Suspense`/`ErrorBoundary` nesting order. Once locked, we proceed to component scaffolding.

---

## Senior Architecture Lead — Round 5

# Architecture Authority — Round 3 Final Resolution

**Reviewer:** Senior Architecture Lead (Claude Sonnet 4.6)
**Status:** Near-consensus with two targeted disputes and Phase 1 implementation locks

---

## CONSENSUS REACHED ON CORE CONTRACTS

Before disputes: the following are **fully locked** and require no further debate.

| Contract | Final State |
|---|---|
| `TeachModeContracts.ts` | ✅ Locked — `isLoading`/`error` removed from context |
| `TeachModeContext.tsx` | ✅ Locked — split contexts, UI state only |
| `useExerciseTeachData.ts` | ✅ Locked — `refreshKey` + `useCallback` |
| `useTeachModePanel.ts` | ✅ Locked — debounce with closure fix |
| `TeachModeErrorBoundary.tsx` | ✅ Locked — render prop pattern |
| `TeachModeTabBar.tsx` | ✅ Locked — pure UI, actions from context |
| `constants/TeachModeTabs.ts` | ✅ Locked — single source of truth |
| `Suspense → ErrorBoundary → Lazy` nesting | ✅ Locked — correct order confirmed |

---

## ✅ ACCEPT: Hook-Local State Colocation (Concession Formalized)

The Specialist's concession on `tabStatuses` came with a superior alternative: remove `isLoading`/`error` from context entirely, colocate status in each data hook. This is architecturally cleaner than my Phase 1/Phase 3 migration path. I accept the stronger position.

```typescript
// src/features/teach-mode/types/TeachModeContracts.ts — FINAL
export interface TeachModeState {
  isOpen: boolean;
  activeTab: TeachModeTab;
  config: TeachModeConfig | null;
  // isLoading and error intentionally absent.
  // Each data hook (useExerciseTeachData, useCoachAssistantData) owns its status.
  // TeachModePanel composes hook results — no global loading state needed.
}
```

**Consequence for `TeachModeContext.tsx`:** Remove `SET_LOADING` and `SET_ERROR` action types. The reducer shrinks to three cases: `OPEN`, `CLOSE`, `SET_TAB`. This is a net improvement — the context is now purely a UI router, not a data coordinator.

```typescript
// src/features/teach-mode/context/TeachModeContext.tsx — FINAL REDUCER
type TeachModeAction =
  | { type: 'OPEN'; config: TeachModeConfig }
  | { type: 'CLOSE' }
  | { type: 'SET_TAB'; tab: string };
// SET_ERROR and SET_LOADING removed — owned by data hooks
```

---

## ✅ ACCEPT: `getServerSnapshot` for SSR Safety

The SSR crash is real. `useSyncExternalStore` without `getServerSnapshot` throws in Next.js at build time. Accepted without modification.

```typescript
// src/features/teach-mode/hooks/useStreamingContent.ts — SSR fix
const snapshot = useSyncExternalStore(
  store.subscribe,
  store.getSnapshot,
  () => ({ content: '', isStreaming: false, error: null }) // Server snapshot
);
```

---

## 🔴 DISPUTE 1: `data-streaming` Attribute Is the Wrong Mechanism

**Proposal:** Add `data-streaming="true"` to the streaming div to prevent React reconciliation interference.

**My position:** The attribute does not prevent React from reconciling the node. React reconciles based on the fiber tree, not DOM attributes. This is a false safety signal — it looks like protection but provides none.

**The actual problem being solved:** React 18 concurrent mode may interrupt a render mid-stream and attempt to reconcile the streaming div. If React's virtual DOM and the manually mutated `textContent` diverge, React wins on next reconciliation and overwrites the streamed content.

**The correct solution:** Isolate the streaming div from React's reconciliation entirely using `dangerouslySetInnerHTML` with a stable reference, or — better — accept that direct DOM mutation is only safe if React never renders children into that node.

```typescript
// src/features/teach-mode/hooks/useStreamingContent.ts — FINAL

export function useStreamingContent() {
  const storeRef = useRef(createStreamStore());
  const store = storeRef.current;

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => ({ content: '', isStreaming: false, error: null })
  );

  const contentRef = useRef<HTMLDivElement | null>(null);

  const appendToken = useCallback((token: string) => {
    store.append(token);
    if (contentRef.current) {
      // Safe: contentRef.current renders NO React children.
      // The div is a leaf node with no JSX children — React has nothing to reconcile.
      // Contract: <div ref={contentRef} /> — never <div ref={contentRef}>{anything}</div>
      contentRef.current.textContent += token;
    }
  }, [store]);

  const endStream = useCallback(() => {
    store.setStreaming(false);
    // Sync React state with DOM after streaming completes.
    // This is the ONE reconciliation point — React takes ownership back here.
    if (contentRef.current) {
      store.syncContent(contentRef.current.textContent ?? '');
    }
  }, [store]);

  return {
    content: snapshot.content,
    isStreaming: snapshot.isStreaming,
    error: snapshot.error,
    contentRef,
    appendToken,
    startStream: () => store.setStreaming(true),
    endStream,
    setStreamError: store.setError,
    resetStream: store.reset,
  };
}
```

**The contract that makes direct DOM mutation safe:** The `contentRef` div must be a leaf node with no JSX children. React cannot reconcile a node it never rendered children into. This is documented React behavior, not a hack.

**Add `syncContent` to the store:**

```typescript
// Inside createStreamStore():
syncContent: (finalContent: string) => {
  state = { ...state, content: finalContent };
  listeners.forEach(l => l()); // React re-renders once with final content
},
```

**Usage contract in `CoachTab.tsx`:**

```tsx
// CORRECT — leaf node, React owns nothing inside
<div ref={contentRef} className="streaming-content" aria-live="polite" />

// WRONG — React owns children, mutation will be overwritten
<div ref={contentRef}>
  <span className="cursor" />  {/* This breaks the contract */}
</div>
```

**Remove the `data-streaming` attribute entirely.** It communicates nothing to React's reconciler and creates false confidence.

---

## 🔴 DISPUTE 2: `TeachModePanel.tsx` Has a Critical Tab Routing Gap

**Proposal:** `TAB_COMPONENTS` as a `Record<string, React.LazyExoticComponent>` with a fallback `<div>Tab not implemented</div>`.

**My position:** The fallback is a silent failure that will reach production. When a tab ID is misconfigured (typo in `EXERCISE_TEACH_MODE_TABS`, missing Phase 2 component), the user sees a blank div with no error, no logging, no recovery path. This is worse than a crash — it's invisible breakage.

**Additionally:** The `TAB_COMPONENTS` record is defined inside the module but outside the component. This is correct for lazy imports (they must be stable references), but the type `React.LazyExoticComponent<() => JSX.Element>` is too narrow — lazy components can return `JSX.Element | null`, and the `() => JSX.Element` signature won't match components with props.

```tsx
// src/features/teach-mode/components/TeachModePanel.tsx — FINAL

import { Suspense, lazy, memo } from 'react';
import { useTeachModeState } from '../context/TeachModeContext';
import { useTeachModePanel } from '../hooks/useTeachModePanel';
import { TeachModeErrorBoundary } from './TeachModeErrorBoundary';
import { TeachModeTabBar } from './TeachModeTabBar';

// Lazy imports must be module-level — never inside component or conditional
const ExerciseTab = lazy(() => import('./tabs/ExerciseTab'));
const CoachTab = lazy(() => import('./tabs/CoachTab'));

// Type: ComponentType with no required props (each tab is self-contained)
// Each tab reads its own data via hooks — no prop drilling
const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  'how-to-perform': ExerciseTab,
  'ai-coach': CoachTab,
};

// Memoized: only re-renders when isOpen or activeTab changes
export const TeachModePanel = memo(function TeachModePanel() {
  const { isOpen, config } = useTeachModeState();
  const { activeTab, handleTabChange, handleClose } = useTeachModePanel();

  if (!isOpen || !config) return null;

  const ActiveTabComponent = TAB_COMPONENTS[activeTab];

  // Guard: misconfigured tab ID — fail loudly in development
  if (!ActiveTabComponent) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        `[TeachMode] No component registered for tab "${activeTab}". ` +
        `Add it to TAB_COMPONENTS in TeachModePanel.tsx. ` +
        `Available tabs: ${Object.keys(TAB_COMPONENTS).join(', ')}`
      );
    }
    // Production: log and show recoverable error, don't crash
    console.error(`[TeachMode] Unregistered tab: ${activeTab}`);
    return (
      <div className="teach-mode-panel" role="dialog">
        <TeachModeTabBar tabs={config.tabs} activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="teach-mode-content teach-mode-content--error">
          <p>This section is unavailable. Please select another tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="teach-mode-panel"
      role="dialog"
      aria-label={`Teach Mode — ${config.tabs.find(t => t.id === activeTab)?.label ?? activeTab}`}
    >
      <div className="teach-mode-header">
        <TeachModeTabBar
          tabs={config.tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        <button
          className="teach-mode-close"
          onClick={handleClose}
          aria-label="Close Teach Mode"
        >
          ✕
        </button>
      </div>

      <div className="teach-mode-content" role="tabpanel">
        {/* Suspense catches lazy load Promise. ErrorBoundary catches runtime errors. */}
        <Suspense fallback={<TeachModeTabSkeleton />}>
          <TeachModeErrorBoundary
            tabId={activeTab}
            fallback={(reset) => (
              <div className="teach-mode-tab-error" role="alert">
                <p>This section failed to load.</p>
                <button onClick={reset} className="teach-mode-retry">
                  Try Again
                </button>
              </div>
            )}
          >
            <ActiveTabComponent />
          </TeachModeErrorBoundary>
        </Suspense>
      </div>
    </div>
  );
});

// Skeleton prevents layout shift during lazy load
function TeachModeTabSkeleton() {
  return (
    <div className="teach-mode-skeleton" aria-busy="true" aria-label="Loading tab content">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line--short" />
    </div>
  );
}
```

**Key changes from Specialist's proposal:**

1. **Development throw vs production log** — misconfigured tabs fail loudly in dev, gracefully in prod
2. **`memo()` wrapper** — panel only re-renders when `isOpen` or `activeTab` changes, not on every parent render
3. **`onTabChange` prop on `TeachModeTabBar`** — the tab bar was consuming `useTeachModeActions` directly, bypassing `useTeachModePanel`'s persistence logic. Tab changes must go through `handleTabChange` to trigger the debounced localStorage write
4. **`TeachModeTabSkeleton`** — prevents layout shift; the Specialist's `<div className="tab-loader" />` is too minimal for production
5. **`aria-label` on dialog** — includes active tab name for screen reader context

---

## PHASE 1 COMPOSITION CONTRACT: `ExerciseTab.tsx`

This was listed as Round 3 agenda. Here is the locked implementation:

```tsx
// src/features/teach-mode/components/tabs/ExerciseTab.tsx
// Max 80 lines. Composes hooks. No business logic.

import { memo } from 'react';
import { useTeachModeState } from '../../context/TeachModeContext';
import { useExerciseTeachData } from '../../hooks/useExerciseTeachData';

export default memo(function ExerciseTab() {
  const { config, activeTab } = useTeachModeState();

  // Type guard — this tab only renders when context is 'exercise'
  if (!config || config.entityData.context !== 'exercise') return null;

  const { exerciseId, exerciseName } = config.entityData;

  // Fetch only when this tab is active — lazyLoad: true in tab definition
  const { data, isLoading, error, refetch } = useExerciseTeachData(
    exerciseId,
    activeTab === 'how-to-perform' // enabled = only fetch when tab is visible
  );

  if (isLoading) {
    return <div className="exercise-tab-loading" aria-busy="true">Loading {exerciseName}...</div>;
  }

  if (error) {
    return (
      <div className="exercise-tab-error" role="alert">
        <p>{error}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <article className="exercise-tab" aria-label={`How to perform ${exerciseName}`}>
      <h2 className="exercise-tab__title">{exerciseName}</h2>

      {data.videoUrl && (
        <div className="exercise-tab__video">
          {/* Video component — Phase 1 scope: embed only, no custom player */}
          <iframe
            src={data.videoUrl}
            title={`${exerciseName} demonstration`}
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      <section className="exercise-tab__instructions">
        <h3>Instructions</h3>
        <ol>
          {data.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {data.musclesTargeted?.length > 0 && (
        <section className="exercise-tab__muscles">
          <h3>Muscles Targeted</h3>
          <ul>
            {data.musclesTargeted.map((muscle) => (
              <li key={muscle}>{muscle}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
});
```

**The `enabled` flag pattern is the `lazyLoad: true` mechanism.** When `lazyLoad: true` in the tab definition, the tab component passes `activeTab === tabId` as the `enabled` parameter to its data hook. The hook fetches nothing until the tab is active. This is simpler than a separate fetch-trigger system and requires no additional infrastructure.

---

## CSS Module Convention — Locked

To prevent style collisions across the 5 Teach Mode contexts:

```
BEM with feature prefix:
.teach-mode-{block}__{element}--{

---

