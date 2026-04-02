# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 5
> **Tokens:** 41,871 input / 19,801 output

---

## Senior Architecture Lead — Round 1

# Architecture Authority Review: Bootcamp Creator Upgrade Plan

**Reviewer:** Senior Code Quality Lead — Architecture Authority
**Date:** 2026-04-02
**Consensus Round:** Round 1 of 2
**Validators Synthesized:** 12 specialist reviews

---

## Executive Summary

The plan is **directionally correct but architecturally incomplete in three critical areas**: hook composition, state ownership, and error boundary placement. The 12 specialist reviews surface real problems — the Claude Architect's SEV-1 on context collision is the most dangerous, and the Qwen module reviewer's file consolidation recommendation is the most actionable. My role here is to arbitrate conflicts between reviewers, add findings they missed, and produce a definitive architecture decision record.

**Overall Verdict:** CONDITIONAL PROCEED — Phase 0 decomposition can begin immediately. Phase 1 requires resolving SEV-1 (hook context collision) and SEV-2 (state ownership) before any feature code ships.

---

## Part 1: Hook Composition — Definitive Ruling

### Finding H-1: The `useCoachAssistant → useAIChat → useConversationSidebar` Chain Is Wrong for This Context

**Severity:** 🔴 SEV-1 — Blocks Phase 4
**Conflict:** Claude Architect (SEV-1 critical) vs. Gemini Frontend (flatten with Controller pattern) vs. Qwen Module (boundary lines blurred)
**Ruling:** All three reviewers are correct and pointing at the same problem from different angles.

The existing hook chain was designed for a **standalone chat page** with a single concern: managing a conversation. Embedding it inside `BootcampBuilderPage` creates a **domain mismatch** — the chat hook has no concept of stations, exercises, board state, or flow optimization. The bootcamp state must flow *into* the AI context, but the existing hook has no injection point.

**Definitive Architecture Decision:**

Do not embed the existing `useCoachAssistant` chain. Build a **bootcamp-scoped AI bridge** instead:

```typescript
// hooks/useBootcampAI.ts — NEW, replaces direct useCoachAssistant embed
// This is the ONLY hook the right pane touches for AI

interface BootcampAIContext {
  // Injected from parent — read-only snapshot, never the live state object
  currentTemplate: BootcampTemplateSummary;
  activeStation: number;
  classStyle: ClassStyle;
  equipmentProfileId: string;
  injuryFlags: InjuryFlagCounts; // ANONYMIZED — counts only, no names
}

interface UseBootcampAIReturn {
  // Conversation state — owned HERE, not in useCoachAssistant
  messages: AIMessage[];
  isStreaming: boolean;
  streamingContent: string;
  
  // Actions
  sendMessage: (text: string) => Promise<void>;
  applyAISuggestion: (patch: BootcampPatch) => void; // Emits patch UP to orchestrator
  clearConversation: () => void;
  
  // Derived
  hasPendingPatch: boolean;
  lastPatch: BootcampPatch | null;
}

export function useBootcampAI(context: BootcampAIContext): UseBootcampAIReturn {
  // Owns its own conversation state — no shared thread with standalone Coach
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [lastPatch, setLastPatch] = useState<BootcampPatch | null>(null);
  
  // Stable ref prevents stale closure on context — CRITICAL
  const contextRef = useRef(context);
  useEffect(() => { contextRef.current = context; }, [context]);
  
  const sendMessage = useCallback(async (text: string) => {
    // Builds payload with CURRENT context snapshot from ref
    const payload = buildBootcampAIPayload(text, contextRef.current);
    // Calls /api/bootcamp/ai-assist — NOT /api/ai-chat
    // Separate endpoint = no conversation thread collision
    await streamBootcampAIResponse(payload, {
      onToken: (token) => setStreamingContent(prev => prev + token),
      onPatch: (patch) => setLastPatch(patch),
      onComplete: (message) => {
        setMessages(prev => [...prev, message]);
        setStreamingContent('');
      }
    });
  }, []); // No context in deps — uses ref
  
  return { messages, isStreaming: streamingContent.length > 0, 
           streamingContent, sendMessage, applyAISuggestion: ..., 
           clearConversation: ..., hasPendingPatch: lastPatch !== null, lastPatch };
}
```

**Why a separate endpoint (`/api/bootcamp/ai-assist`) instead of `/api/ai-chat`:**

The API Design reviewer (Nvidia) correctly identified that the existing `/api/ai-chat` endpoint has no concept of bootcamp context, patch generation, or structured exercise output. Routing bootcamp AI through the chat endpoint would require either polluting the chat schema with bootcamp fields or building a translation layer that adds complexity with no benefit. The bootcamp AI endpoint returns **structured patches**, not just text — that's a fundamentally different contract.

**Conversation persistence strategy** (addressing Claude Architect's unmount/remount concern):

```typescript
// In BootcampBuilderPage.tsx — conversation survives tab switches
// because it lives in the PAGE, not in the panel component

const bootcampAI = useBootcampAI({
  currentTemplate: templateSummary,
  activeStation,
  classStyle,
  equipmentProfileId,
  injuryFlags: anonymizedInjuryFlags // NEVER raw client data
});

// Pass bootcampAI DOWN to BootcampAIInsights — panel is stateless
<BootcampAIInsights bootcampAI={bootcampAI} />
```

The panel component (`BootcampAIInsights`) receives the hook return value as props. When the trainer switches tabs, the panel unmounts but the hook state survives in the page. This is the correct pattern.

---

### Finding H-2: `useBootcampGeneration` and `useBootcampAI` Must Not Share State

**Severity:** 🟠 SEV-2
**Issue:** The plan implies `useBootcampGeneration` handles AI generation AND the Coach Assistant tweaks. This creates two hooks fighting over the same template state.

**Ruling:** Strict separation of concerns:

```
useBootcampGeneration.ts  → Owns: AI Hive Mind generation (batch operation)
                            Reads: config inputs
                            Writes: emits complete BootcampTemplate via callback
                            Does NOT: manage conversation, stream tokens, or patch

useBootcampAI.ts          → Owns: conversational tweaks (streaming, patches)
                            Reads: context snapshot (injected, not owned)
                            Writes: emits BootcampPatch via applyAISuggestion callback
                            Does NOT: generate full classes or own template state

useBootcampState.ts       → Owns: THE template (single source of truth)
                            Accepts: full template from useBootcampGeneration
                            Accepts: patches from useBootcampAI
                            Exposes: current template to all children via context
```

This is the **three-hook architecture** — generation, conversation, and state are separate concerns with one-way data flow.

---

### Finding H-3: `useBootcampFlow` Boundary Is Correct But Incomplete

**Severity:** 🟡 SEV-3
**Issue:** The plan defines `useBootcampFlow` for timing calculations but doesn't specify whether it's pure computation or has side effects.

**Ruling:** `useBootcampFlow` must be **pure computation only** — no API calls, no state mutations:

```typescript
// hooks/useBootcampFlow.ts — pure derived state
export function useBootcampFlow(stations: BootcampStation[]) {
  return useMemo(() => {
    return stations.map(station => ({
      ...station,
      flowAnalysis: analyzeStationFlow(station.exercises),
      warnings: detectFlowWarnings(station.exercises),
      totalSetupTime: sumSetupTime(station.exercises),
      concurrentPairs: buildConcurrentPairs(station.exercises)
    }));
  }, [stations]); // Recomputes only when stations change
}
```

No `useEffect`, no `useState` — this hook is a memoized selector. The flow optimizer runs server-side during generation; this hook runs client-side for real-time warnings as the trainer manually reorders exercises.

---

## Part 2: File Decomposition — Definitive Ruling

### Finding F-1: 22 Files Is Over-Engineered, 12 Is Under-Engineered — Target 16

**Severity:** 🟠 SEV-2
**Conflict:** Plan proposes 12 frontend files. Qwen Module reviewer says 14-16. I agree with Qwen's analysis but disagree with two specific merge recommendations.

**Definitive file list with line budget estimates:**

```
frontend/src/components/BootcampBuilder/
├── index.ts                          # Barrel — ~20 lines
├── BootcampBuilderPage.tsx           # Orchestrator — ~250 lines (HARD LIMIT)
├── BootcampConfigPanel.tsx           # Left pane — ~280 lines
├── BootcampClassPreview.tsx          # Center pane — ~260 lines
├── BootcampAIInsights.tsx            # Right pane — ~200 lines (stateless, receives hook)
├── BootcampStationCard.tsx           # Station card — ~180 lines
├── BootcampExerciseRow.tsx           # Exercise row + mods — ~220 lines
├── BootcampStretchModule.tsx         # Stretch warm-up — ~160 lines
├── BootcampClassStyleConfig.tsx      # MERGED: Pyramid + Superset config — ~270 lines
├── BootcampBoardToggle.tsx           # KEEP SEPARATE — see ruling below
├── BootcampTimeline.tsx              # KEEP SEPARATE — see ruling below
├── BootcampFlowWarning.tsx           # NEW — flow warning banner — ~80 lines
├── styles/
│   ├── BootcampBaseStyles.ts         # Shared tokens, layout — ~200 lines
│   ├── BootcampConfigStyles.ts       # Left pane styles — ~180 lines
│   ├── BootcampPreviewStyles.ts      # Cards, rows, boards — ~220 lines
│   └── CoachAssistantStyles.ts       # Right pane AI chat — ~160 lines
└── hooks/
    ├── useBootcampState.ts           # NEW — single source of truth — ~180 lines
    ├── useBootcampGeneration.ts      # AI Hive Mind generation — ~200 lines
    ├── useBootcampAI.ts              # NEW — conversational tweaks — ~220 lines
    ├── useBootcampFlow.ts            # Pure flow computation — ~120 lines
    └── useBootcampPDF.ts            # PDF export logic extracted — ~100 lines
```

**Total: 20 files** (12 components + 4 styles + 4 hooks). This is the correct number.

**Ruling on Qwen's merge recommendations:**

| Qwen Said | My Ruling | Reason |
|-----------|-----------|--------|
| Merge `BootcampBoardToggle` into `BootcampClassPreview` | ❌ REJECT | Board toggle has its own interaction state (active board, animation). Merging adds 60 lines to a file already at 260. Keep separate. |
| Merge `BootcampTimeline` into `BootcampClassPreview` | ❌ REJECT | Timeline will contain drag-and-drop reordering logic (Phase 2). That's 100+ lines of complex interaction that does not belong in the preview pane. |
| Merge `BootcampPyramidConfig` + `BootcampSupersetConfig` | ✅ ACCEPT | They share 70% UI structure. Use `format` prop to branch. Name it `BootcampClassStyleConfig.tsx`. |
| 4 style files instead of 9 | ✅ ACCEPT | Correct. The plan's 2-file style split is too thin; 9 files is too many. 4 files maps cleanly to the 4 UI domains. |

---

### Finding F-2: Three Files Will Exceed 300 Lines Without Intervention

**Severity:** 🟠 SEV-2
**Files at risk:**

**`BootcampConfigPanel.tsx` — Risk: ~380 lines**

The left pane contains: format selector, day type selector, duration inputs, equipment profile picker embed, participant count, injury flag inputs, and the `BootcampClassStyleConfig` trigger. That's 7 distinct UI sections. Mitigation: Extract the injury flag input group into `BootcampInjuryFlags.tsx` (~80 lines). This keeps ConfigPanel under 300.

**`BootcampExerciseRow.tsx` — Risk: ~340 lines**

Each row shows: exercise name, setup time badge, board indicator, 5 modification fields (knee/shoulder/back/wrist/ankle), superset order, pyramid config, and drag handle. Mitigation: Extract the modifications display into `ExerciseModBadges.tsx` (~70 lines, co-located in the same directory). This is a pure display component with no state.

**`useBootcampState.ts` — Risk: ~280 lines (acceptable but watch it)**

This hook owns the template, applies patches, manages undo history, and exposes derived selectors. It will grow. Mitigation: Extract undo/redo logic into `useBootcampHistory.ts` if it exceeds 250 lines during implementation. Do not pre-split — wait for the actual line count.

---

## Part 3: State Management — Definitive Ruling

### Finding S-1: The Plan Has No Single Source of Truth — This Is the Root Cause of All State Bugs

**Severity:** 🔴 SEV-1
**Issue:** The plan describes state implicitly across multiple components and hooks without defining ownership. This will produce duplicated state, stale props, and race conditions.

**Definitive state ownership map:**

```typescript
// The complete state picture — every piece of state has exactly ONE owner

// OWNER: useBootcampState (via BootcampContext)
interface BootcampMasterState {
  template: BootcampTemplate | null;       // The class being built
  isDirty: boolean;                         // Unsaved changes
  lastSavedAt: Date | null;
  generationStatus: 'idle' | 'generating' | 'error';
  activeBoard: 'main' | 'alternative';      // Board 1 vs Board 2
  activeStation: number;                    // Which station is focused
}

// OWNER: useBootcampGeneration (local, emits to useBootcampState)
interface GenerationLocalState {
  isGenerating: boolean;
  generationError: string | null;
  // Does NOT own the template — emits it via onGenerated callback
}

// OWNER: useBootcampAI (local, emits patches to useBootcampState)
interface AILocalState {
  messages: AIMessage[];
  isStreaming: boolean;
  streamingContent: string;
  pendingPatch: BootcampPatch | null;
  // Does NOT own the template — emits patches via applyAISuggestion
}

// OWNER: useBootcampFlow (derived, no state — pure useMemo)
// Computed from BootcampMasterState.template.stations

// OWNER: BootcampConfigPanel (local UI state only)
interface ConfigPanelLocalState {
  isEquipmentPickerOpen: boolean;
  // Config values are CONTROLLED — they live in BootcampMasterState.template
}
```

**Context vs. prop drilling decision:**

Use React Context for `BootcampMasterState` — the template needs to be accessible in `BootcampStationCard`, `BootcampExerciseRow`, `BootcampTimeline`, and `BootcampBoardToggle` without threading props through 3 levels. Do NOT use Context for `useBootcampAI` state — that's local to the right pane and should be passed as props.

```typescript
// BootcampContext.tsx — NEW file, ~60 lines
const Boot

---

## Code Architecture Specialist (1M context) — Round 2

**DISAGREEMENTS & ARCHITECTURAL REFINEMENTS**

I agree with the core direction of H-1 through S-1, but dispute four implementation details that will cause measurable performance degradation, state desync, and maintenance friction at scale. Below are the required adjustments with exact file/line references.

---

### 1. S-1: Context Performance — Single Context Will Cause Full-Tree Re-renders (Dispute)
**Issue:** Placing the entire `BootcampMasterState` in a single React Context means any `applyAISuggestion`, config input, or streaming token update triggers re-renders across `BootcampStationCard`, `BootcampExerciseRow`, and `BootcampTimeline`. This violates the 60fps target for drag/drop and board switching.
**Alternative:** Implement a selector hook to isolate subscriptions. Do not split Context into Data/Dispatch unless using `use-sync-external-store`; selectors are lighter and require zero deps.

```typescript
// hooks/useBootcampSelector.ts — NEW (~15 lines)
import { useContext, useMemo, useRef } from 'react';
import { BootcampContext } from './BootcampContext';

export function useBootcampSelector<T>(selector: (state: BootcampMasterState) => T): T {
  const state = useContext(BootcampContext);
  if (!state) throw new Error('useBootcampSelector must be used within BootcampProvider');
  
  const prev = useRef<T>();
  const selected = selector(state);
  // Shallow equality check prevents unnecessary re-renders
  if (prev.current !== undefined && prev.current === selected) return prev.current;
  prev.current = selected;
  return selected;
}
```

**Required Change in `BootcampExerciseRow.tsx` (Line ~42):**
```diff
- const { template } = useContext(BootcampContext);
- const station = template?.stations[props.stationIndex];
+ const station = useBootcampSelector(state => state.template?.stations[props.stationIndex]);
```
This isolates re-renders to the exact row being modified.

---

### 2. S-1: `activeStation` & `activeBoard` Belong in URL, Not Context (Dispute)
**Issue:** Storing navigation state in `BootcampMasterState` breaks deep-linking, prevents trainers from sharing specific station views, and causes state loss on hard refresh.
**Alternative:** Extract to URL search params. This reduces Context payload size and enables native browser history.

```typescript
// hooks/useBootcampNavigation.ts — NEW (~25 lines)
import { useSearchParams } from 'react-router-dom'; // or next/navigation

export function useBootcampNavigation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStation = Number(searchParams.get('station') ?? 0);
  const activeBoard = (searchParams.get('board') as 'main' | 'alternative') ?? 'main';

  const setActiveStation = (idx: number) => 
    setSearchParams(prev => ({ ...Object.fromEntries(prev), station: String(idx) }), { replace: true });
  const setActiveBoard = (board: 'main' | 'alternative') => 
    setSearchParams(prev => ({ ...Object.fromEntries(prev), board }), { replace: true });

  return { activeStation, activeBoard, setActiveStation, setActiveBoard };
}
```
**Impact:** Remove `activeStation` and `activeBoard` from `BootcampMasterState`. `BootcampBuilderPage.tsx` (Line ~115) now composes `useBootcampState()` + `useBootcampNavigation()`.

---

### 3. H-1: Async Context Ref Pattern — Standardize with `useLatest` (Refinement)
**Agreement with direction, dispute implementation detail.** The manual `useRef` + `useEffect` in `useBootcampAI` works but is fragile during rapid streaming updates. I mandate a standardized `useLatest` utility to prevent stale closure bugs across all async hooks.

```typescript
// hooks/useLatest.ts — NEW (~8 lines, shared utility)
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}
```

**Required Change in `useBootcampAI.ts` (Line ~28):**
```diff
- const contextRef = useRef(context);
- useEffect(() => { contextRef.current = context; }, [context]);
+ const contextRef = useLatest(context);
```
This guarantees `contextRef.current` is always the latest snapshot without manual `useEffect` boilerplate, and aligns with React team recommendations for async callbacks.

---

### 4. F-1: Style File Architecture — Enforce Token-First, Not Domain-Split (Refinement)
**Agreement with 4-file target, dispute naming/structure.** `BootcampBaseStyles.ts` implies layout rules. It must export **design tokens only**. Domain-specific files should import tokens, not duplicate spacing/color values.

```typescript
// styles/BootcampTokens.ts — RENAMED from BootcampBaseStyles.ts (~40 lines)
export const BOOTCAMP_TOKENS = {
  spacing: { sm: '8px', md: '16px', lg: '24px', xl: '32px' },
  colors: { stationBg: '#f8fafc', warning: '#f59e0b', aiAccent: '#6366f1', surface: '#ffffff' },
  radii: { card: '12px', badge: '999px', input: '8px' },
  shadows: { card: '0 2px 8px rgba(0,0,0,0.08)', hover: '0 4px 12px rgba(0,0,0,0.12)' }
} as const;
```
**Required Change in `BootcampConfigStyles.ts` (Line ~12):**
```diff
- import { spacing, colors } from '../BootcampBaseStyles';
+ import { BOOTCAMP_TOKENS } from '../BootcampTokens';
+ // Usage: padding: BOOTCAMP_TOKENS.spacing.md;
```
This prevents style drift between `BootcampConfigStyles.ts` and `BootcampPreviewStyles.ts` and enforces a single source of truth for visual primitives.

---

### Summary of Required Changes Before Phase 1
1. Implement `useBootcampSelector` to isolate Context re-renders (S-1 fix)
2. Move `activeStation`/`activeBoard` to URL params via `useBootcampNavigation` (S-1 fix)
3. Standardize async context refs with `useLatest` (H-1 refinement)
4. Rename `BootcampBaseStyles.ts` → `BootcampTokens.ts` and enforce token-only exports (F-1 refinement)

*(Note: Your message cut off at `const Boot`. I assume you intended to define `BootcampContext.tsx`. The selector pattern above completes that thought safely.)*

These adjustments preserve your SEV-1/SEV-2 resolutions while eliminating the performance and DX traps that typically emerge in complex builder UIs. Proceed with Phase 0 decomposition incorporating these four changes.

---

## Senior Architecture Lead — Round 3

# Architecture Authority Response — Round 2

**Reviewer:** Senior Architecture Lead (Claude Sonnet 4.6)
**Round:** 2 of 3 remaining

---

## Arbitration Summary

Qwen's four proposals are technically sound but two require significant qualification before I'll accept them as architectural mandates. Let me be precise about what I accept, what I reject, and what I'm adding that neither of us has addressed yet.

---

## Point 1: `useBootcampSelector` — ACCEPT WITH CRITICAL AMENDMENT

Qwen's diagnosis is correct: a single Context with naive `useContext` will cause full-tree re-renders. The selector pattern is the right solution.

**However, the implementation has a bug that will cause infinite render loops.**

```typescript
// Qwen's version — BROKEN for object/array selectors
export function useBootcampSelector<T>(selector: (state: BootcampMasterState) => T): T {
  const state = useContext(BootcampContext);
  const prev = useRef<T>();
  const selected = selector(state);
  // ❌ PROBLEM: strict reference equality fails for derived objects
  // selector(state => state.template?.stations[0]) returns a NEW object reference
  // every render even if the data is identical — infinite loop
  if (prev.current !== undefined && prev.current === selected) return prev.current;
  prev.current = selected;
  return selected;
}
```

**The corrected implementation requires shallow equality, not reference equality:**

```typescript
// hooks/useBootcampSelector.ts — CORRECTED (~35 lines)
import { useContext, useRef } from 'react';
import { BootcampContext } from '../BootcampContext';

// Shallow equality for objects and arrays — handles the station/exercise case
function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key => 
    (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key]
  );
}

export function useBootcampSelector<T>(
  selector: (state: BootcampMasterState) => T,
  equalityFn: (a: T, b: T) => boolean = shallowEqual as (a: T, b: T) => boolean
): T {
  const state = useContext(BootcampContext);
  if (!state) throw new Error('useBootcampSelector must be used within BootcampProvider');
  
  const prev = useRef<{ value: T; initialized: boolean }>({ 
    value: undefined as unknown as T, 
    initialized: false 
  });
  
  const selected = selector(state);
  
  if (prev.current.initialized && equalityFn(prev.current.value, selected)) {
    return prev.current.value; // Return stable reference
  }
  
  prev.current = { value: selected, initialized: true };
  return selected;
}
```

**Usage in `BootcampExerciseRow.tsx`:**
```typescript
// Primitive selector — reference equality is fine
const stationIndex = useBootcampSelector(state => state.activeStation);

// Object selector — needs shallow equality (default behavior)
const station = useBootcampSelector(
  state => state.template?.stations[props.stationIndex]
);

// Array selector — caller provides deep equality if needed
const exercises = useBootcampSelector(
  state => state.template?.stations[props.stationIndex]?.exercises,
  (a, b) => a?.length === b?.length && a?.every((ex, i) => ex.id === b?.[i]?.id)
);
```

**One additional requirement Qwen missed:** The selector function itself must be stable (memoized or defined outside the component) or wrapped in `useCallback`. An inline arrow function recreates on every render, defeating the optimization entirely.

```typescript
// BootcampExerciseRow.tsx — correct usage pattern
// ❌ WRONG — inline selector recreates every render
const station = useBootcampSelector(state => state.template?.stations[props.stationIndex]);

// ✅ CORRECT — stable selector via useCallback
const selectStation = useCallback(
  (state: BootcampMasterState) => state.template?.stations[props.stationIndex],
  [props.stationIndex]
);
const station = useBootcampSelector(selectStation);
```

This is a **mandatory addition** to Qwen's proposal, not optional.

---

## Point 2: `activeStation`/`activeBoard` in URL — CONDITIONAL ACCEPT

Qwen's reasoning is valid for a **multi-page application with shareable URLs**. I need to know the routing context before accepting this as a mandate.

**The case FOR URL params (Qwen's position):**
- Deep-linking to specific stations is genuinely useful for trainer workflows
- Browser history enables back-button navigation between stations
- Hard refresh preserves position

**The case AGAINST URL params:**
- `BootcampBuilderPage` may be rendered inside a modal or drawer — URL params in a modal are an anti-pattern that breaks the host page's URL state
- Rapid station switching during drag-and-drop reordering would pollute browser history even with `replace: true`
- The `useSearchParams` implementation Qwen provided has a subtle bug:

```typescript
// Qwen's version — BUG on concurrent param updates
const setActiveStation = (idx: number) => 
  setSearchParams(prev => ({ ...Object.fromEntries(prev), station: String(idx) }), { replace: true });

// ❌ If setActiveStation and setActiveBoard are called in the same render cycle,
// the second call's `prev` snapshot may not include the first call's update
// depending on React's batching behavior in the router implementation
```

**My ruling:** This is a **product decision, not an architecture decision**. I will not mandate URL params without knowing the rendering context. Instead, I mandate an **abstraction layer** that makes the storage mechanism swappable:

```typescript
// hooks/useBootcampNavigation.ts — STORAGE-AGNOSTIC (~40 lines)
interface NavigationStore {
  activeStation: number;
  activeBoard: 'main' | 'alternative';
  setActiveStation: (idx: number) => void;
  setActiveBoard: (board: 'main' | 'alternative') => void;
}

// Implementation A: URL params (for full-page route)
export function useBootcampNavigationURL(): NavigationStore {
  const [searchParams, setSearchParams] = useSearchParams();
  // ... Qwen's implementation with the batching bug fixed
  const setActiveStation = useCallback((idx: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev); // ✅ Correct — mutate a copy
      next.set('station', String(idx));
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  // ...
}

// Implementation B: Local state (for modal/drawer rendering)
export function useBootcampNavigationLocal(): NavigationStore {
  const [activeStation, setActiveStation] = useState(0);
  const [activeBoard, setActiveBoard] = useState<'main' | 'alternative'>('main');
  return { activeStation, activeBoard, setActiveStation, setActiveBoard };
}

// BootcampBuilderPage.tsx selects implementation via prop
interface BootcampBuilderPageProps {
  navigationMode?: 'url' | 'local'; // Default: 'url' for full-page, 'local' for modal
}
```

**What I agree with unconditionally:** `activeStation` and `activeBoard` do NOT belong in `BootcampMasterState`. They are navigation state, not template state. Removing them from the master state reduces Context payload and prevents navigation changes from triggering template-related re-renders. This is correct regardless of where they live.

---

## Point 3: `useLatest` Utility — ACCEPT UNCONDITIONALLY

This is correct, clean, and I have no dispute. Eight lines, zero deps, eliminates a class of stale closure bugs. Accepted as a shared utility.

**One addition:** Place it in a shared utilities directory, not the bootcamp hooks directory, since it will be reused across the codebase:

```
frontend/src/hooks/utils/useLatest.ts  # Shared utility — not bootcamp-specific
```

**Updated `useBootcampAI.ts` reference:**
```typescript
import { useLatest } from '../../hooks/utils/useLatest';
// Not from './useLatest' — it's not bootcamp-specific
```

---

## Point 4: `BootcampTokens.ts` Rename — ACCEPT WITH SCOPE EXPANSION

Qwen's rename is correct. `BootcampBaseStyles.ts` implies layout rules; `BootcampTokens.ts` correctly signals design primitives only.

**However, Qwen's token structure is incomplete for this component set.** The bootcamp builder has three distinct visual states that need tokens: default, AI-active (when streaming), and warning (flow issues). Qwen's token set handles default only.

```typescript
// styles/BootcampTokens.ts — EXPANDED from Qwen's version (~70 lines)
export const BOOTCAMP_TOKENS = {
  spacing: { 
    xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' 
  },
  colors: {
    // Surface colors
    stationBg: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    
    // Semantic — AI state
    aiAccent: '#6366f1',
    aiAccentLight: '#eef2ff',
    aiStreaming: '#818cf8',    // Pulsing color during token stream
    
    // Semantic — warnings (flow issues)
    warning: '#f59e0b',
    warningLight: '#fffbeb',
    warningBorder: '#fcd34d',
    
    // Semantic — errors
    error: '#ef4444',
    errorLight: '#fef2f2',
    
    // Interactive
    primary: '#3b82f6',
    primaryHover: '#2563eb',
  },
  radii: { 
    card: '12px', badge: '999px', input: '8px', modal: '16px' 
  },
  shadows: { 
    card: '0 2px 8px rgba(0,0,0,0.08)', 
    hover: '0 4px 12px rgba(0,0,0,0.12)',
    aiPanel: '0 0 0 2px #6366f1'  // Focus ring for AI panel
  },
  animation: {
    // Streaming pulse — used in BootcampAIInsights during token stream
    streamingPulse: 'pulse 1.5s ease-in-out infinite',
    stationTransition: 'all 150ms ease-out',
    boardSwitch: 'all 200ms ease-in-out'
  },
  zIndex: {
    flowWarning: 10,    // BootcampFlowWarning banner
    boardToggle: 20,    // BootcampBoardToggle overlay
    aiPanel: 30         // Right pane when expanded
  }
} as const;

// Type export for consumer type safety
export type BootcampTokens = typeof BOOTCAMP_TOKENS;
```

---

## New Finding Neither of Us Has Addressed: Error Boundary Placement

**Severity:** 🟠 SEV-2 — Neither reviewer has specified this

The bootcamp builder has three independent failure domains that need isolated error boundaries:

```typescript
// BootcampBuilderPage.tsx — error boundary placement

<BootcampProvider>
  <ErrorBoundary fallback={<ConfigPanelError />} onError={logToSentry}>
    <BootcampConfigPanel />           {/* Left pane — config errors isolated */}
  </ErrorBoundary>
  
  <ErrorBoundary fallback={<PreviewError />} onError={logToSentry}>
    <BootcampClassPreview />          {/* Center pane — render errors isolated */}
    <BootcampTimeline />
  </ErrorBoundary>
  
  <ErrorBoundary 
    fallback={<AIInsightsFallback />}  {/* Right pane — AI errors NEVER crash builder */}
    onError={logToSentry}
  >
    <BootcampAIInsights bootcampAI={bootcampAI} />
  </ErrorBoundary>
</BootcampProvider>
```

**Critical rule:** The AI panel error boundary must be the most defensive. An AI streaming error should degrade gracefully to a "AI temporarily unavailable" state — it must never take down the config or preview panes. The trainer's work-in-progress template must survive any AI failure.

---

## Updated File Count

Adding the new files from this round:

```
hooks/utils/useLatest.ts              # Shared utility (accepted from Qwen)
hooks/useBootcampSelector.ts          # Context selector (corrected from Qwen)
hooks/useBootcampNavigation.ts        # Storage-agnostic navigation (new)
styles/BootcampTokens.ts              # Renamed + expanded (accepted from Qwen)
components/BootcampBuilder/
  BootcampErrorBoundaries.tsx         # Three boundary configs (new finding)
```

**Revised total: 25 files.** Still within maintainable range for a feature of this complexity.

---

## Remaining Open Questions for Round 3

1. **Routing context:** Is `BootcampBuilderPage` a full-page route or embeddable? This determines `useBootcampNavigationURL` vs `useBootcampNavigationLocal` as the default.

2. **Undo/redo scope:** Does `useBootcampHistory` need to capture AI patch applications, or only manual edits? This affects the `applyAISuggestion` implementation in `useBootcampState.ts`.

3. **Optimistic updates:** When a trainer applies an AI patch, do we apply it immediately and roll back on error, or wait for server confirmation? This is unspecified and will affect `useBootcampAI.ts` significantly.

---

## Code Architecture Specialist (1M context) — Round 4

# Code Architecture Specialist (Qwen 3.6 Plus) — Round 2

**AGREEMENTS & CLOSURES**
I accept Points 3 (`useLatest`), 4 (`BootcampTokens.ts` expansion), and the Error Boundary placement. The path relocation to `frontend/src/hooks/utils/useLatest.ts` and the expanded token schema are correct. I will address the two disputed points with precise refinements, then resolve your three open questions to lock Phase 1 architecture.

---

### 1. `useBootcampSelector` — ACCEPT WITH NESTED-STATE GUARD
Claude’s critique of strict reference equality is correct. The `shallowEqual` default prevents infinite loops for flat object selectors. However, `shallowEqual` still fails on **deeply nested arrays** (e.g., `state.template.stations[0].exercises`). 

**Refinement:** Add an explicit `deepEqual` fallback for array-heavy selectors, and enforce a lint rule to prevent inline selectors.

```typescript
// hooks/useBootcampSelector.ts — Line ~18 (equality fallback)
import { shallowEqual } from 'react-redux'; // or implement lightweight version
import { isEqual } from 'lodash-es'; // Only if deep equality is unavoidable

export function useBootcampSelector<T>(
  selector: (state: BootcampMasterState) => T,
  equalityFn: (a: T, b: T) => boolean = shallowEqual
): T {
  // ... [Claude's corrected implementation] ...
}
```

**Mandatory Usage Rule (`.eslintrc.js` addition):**
```json
"react-hooks/exhaustive-deps": ["warn", { "additionalHooks": "useBootcampSelector" }]
```
**File Impact:** `BootcampExerciseRow.tsx` (Line ~42) must wrap selectors in `useCallback` or extract them to module scope. Inline selectors will be blocked by CI.

---

### 2. Navigation Abstraction — ACCEPT WITH HISTORY STACK FIX
The storage-agnostic interface is correct. However, `replace: true` on every station switch **destroys forward history**, breaking the trainer’s ability to navigate back after a mistake. 

**Refinement:** Use `push` for manual station changes, `replace` only for programmatic resets (e.g., AI patch application). Also, fix the concurrent update race by batching into a single `URLSearchParams` mutation.

```typescript
// hooks/useBootcampNavigationURL.ts — Line ~22
const setActiveStation = useCallback((idx: number, pushHistory = true) => {
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    next.set('station', String(idx));
    return next;
  }, { replace: !pushHistory }); // Default: push for UX, replace for AI/system
}, [setSearchParams]);

// Concurrent safety: merge both updates in one call
const setNavigation = useCallback((updates: Partial<NavigationStore>) => {
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    if (updates.activeStation !== undefined) next.set('station', String(updates.activeStation));
    if (updates.activeBoard !== undefined) next.set('board', updates.activeBoard);
    return next;
  }, { replace: false });
}, [setSearchParams]);
```
**Decision:** `BootcampBuilderPage` will default to `navigationMode: 'url'`. Modal rendering will be handled via a separate `BootcampBuilderModal.tsx` wrapper that swaps to `useBootcampNavigationLocal`. This avoids prop drilling and keeps the core component pure.

---

### 3. Error Boundaries — ACCEPT WITH STREAMING RECOVERY MANDATE
Three isolated boundaries are correct. I add one critical requirement for the AI pane:

**`BootcampAIInsights.tsx` (Line ~85)** must implement a **streaming-aware fallback** that preserves chat history and offers a retry button, rather than a full component unmount:

```typescript
// components/BootcampBuilder/BootcampAIInsights.tsx
const handleStreamingError = useCallback((error: Error) => {
  // 1. Stop stream
  bootcampAI.abortStream();
  // 2. Append system error message to existing chat
  bootcampAI.appendSystemMessage('⚠️ Stream interrupted. Tap retry to continue.');
  // 3. Do NOT unmount — keep UI interactive
}, [bootcampAI]);
```
This prevents the "AI crash → lost conversation" anti-pattern.

---

### RESOLUTIONS TO OPEN QUESTIONS (Round 3 Closure)

#### Q1: Routing Context
**Decision:** Full-page route by default. The `navigationMode` prop is deprecated in favor of the wrapper pattern above. `BootcampBuilderPage` assumes URL-backed navigation. If embedded later, the modal wrapper handles state isolation.

#### Q2: Undo/Redo Scope
**Decision:** Unified history stack. AI patches and manual edits share the same undo/redo queue, but are tagged for auditability:
```typescript
// hooks/useBootcampHistory.ts — Line ~12
interface HistoryEntry {
  patch: BootcampPatch;
  timestamp: number;
  source: 'manual' | 'ai' | 'system';
  description: string;
}
```
`applyAISuggestion` pushes to the same stack as manual drags. This ensures trainers can undo an AI suggestion just like a manual edit.

#### Q3: Optimistic Updates
**Decision:** Apply immediately, rollback on failure. UX demands zero latency for AI patches. The rollback mechanism is built into `useBootcampState.ts`:

```typescript
// hooks/useBootcampState.ts — Line ~68
const applyPatch = useCallback((patch: BootcampPatch) => {
  const previousState = templateRef.current; // Snapshot before mutation
  setTemplate(prev => applyPatchToTemplate(prev, patch));
  
  // Fire-and-forget server sync
  syncPatchToServer(patch).catch(() => {
    // Rollback on network failure
    setTemplate(previousState);
    toast.error('AI patch failed to sync. Reverted to previous state.');
  });
}, []);
```
This guarantees 60fps UI responsiveness while maintaining data integrity.

---

### FINAL ARCHITECTURE SNAPSHOT (Pre-Phase 1)
| File | Path | Status |
|------|------|--------|
| `useBootcampSelector.ts` | `frontend/src/hooks/useBootcampSelector.ts` | ✅ Corrected (shallowEqual default, useCallback enforced) |
| `useBootcampNavigationURL.ts` | `frontend/src/hooks/useBootcampNavigationURL.ts` | ✅ History-safe, concurrent-update safe |
| `useBootcampNavigationLocal.ts` | `frontend/src/hooks/useBootcampNavigationLocal.ts` | ✅ Modal fallback |
| `useLatest.ts` | `frontend/src/hooks/utils/useLatest.ts` | ✅ Accepted |
| `BootcampTokens.ts` | `frontend/src/components/BootcampBuilder/styles/BootcampTokens.ts` | ✅ Expanded semantic/animation/z-index |
| `BootcampErrorBoundaries.tsx` | `frontend/src/components/BootcampBuilder/BootcampErrorBoundaries.tsx` | ✅ 3-pane isolation + streaming recovery |
| `useBootcampHistory.ts` | `frontend/src/hooks/useBootcampHistory.ts` | ✅ Unified manual/AI stack |

**Total Files:** 26 (within acceptable bounds for this complexity tier)

All architectural disputes are resolved. The three open questions are answered with concrete implementation patterns. The system is now locked for Phase 0 decomposition.

---

## Senior Architecture Lead — Round 5

# Architecture Authority — Round 3 Final Ruling

**Reviewer:** Senior Architecture Lead (Claude Sonnet 4.6)
**Round:** 3 of 3 — Final Authority Decision

---

## CONSENSUS REACHED

The core architectural disputes are resolved. Before I ratify the final snapshot, I need to close four remaining gaps that will cause production issues if left unaddressed. These are not disputes with Qwen — they are completions.

---

## Ratifications (No Further Dispute)

**Accepted unconditionally from Round 2:**
- `useLatest.ts` at `frontend/src/hooks/utils/useLatest.ts`
- `BootcampTokens.ts` expanded schema with animation and z-index tokens
- Three-pane error boundary isolation
- Unified undo/redo history stack with `source` tagging
- Optimistic patch application with rollback on sync failure
- `BootcampBuilderModal.tsx` wrapper pattern for modal rendering

**Accepted with the corrections already documented:**
- `useBootcampSelector.ts` with `shallowEqual` default and `useCallback` enforcement
- `useBootcampNavigationURL.ts` with history-safe push/replace distinction and concurrent-safe `URLSearchParams` mutation

---

## Gap 1: The `syncPatchToServer` Rollback Has a Race Condition

**File:** `hooks/useBootcampState.ts` — Line ~68 (Qwen's optimistic update implementation)
**Severity:** 🔴 SEV-1 — Data corruption under concurrent edits

Qwen's rollback implementation captures `previousState` as a snapshot, but if the trainer makes a **second edit while the first patch is syncing**, the rollback will revert BOTH edits, not just the failed one:

```typescript
// Qwen's version — BROKEN under concurrent edits
const applyPatch = useCallback((patch: BootcampPatch) => {
  const previousState = templateRef.current; // Snapshot at T=0
  setTemplate(prev => applyPatchToTemplate(prev, patch));
  
  syncPatchToServer(patch).catch(() => {
    setTemplate(previousState); // ❌ Reverts T=1 edit too if trainer edited at T=0.5
  });
}, []);
```

**Corrected implementation using patch-based rollback, not snapshot rollback:**

```typescript
// hooks/useBootcampState.ts — corrected applyPatch (~35 lines)
const applyPatch = useCallback((patch: BootcampPatch) => {
  // Generate inverse patch BEFORE applying — this is the rollback unit
  const inversePatch = computeInversePatch(templateRef.current, patch);
  const patchId = crypto.randomUUID();
  
  // Apply optimistically
  setTemplate(prev => applyPatchToTemplate(prev, patch));
  
  // Track in-flight patches for rollback targeting
  inFlightPatchesRef.current.set(patchId, inversePatch);
  
  syncPatchToServer(patch)
    .then(() => {
      inFlightPatchesRef.current.delete(patchId);
    })
    .catch(() => {
      // Apply ONLY the inverse of the failed patch — not a full snapshot revert
      const inverse = inFlightPatchesRef.current.get(patchId);
      if (inverse) {
        setTemplate(prev => applyPatchToTemplate(prev, inverse));
        inFlightPatchesRef.current.delete(patchId);
      }
      toast.error('AI patch failed to sync. That specific change was reverted.');
    });
}, []);

// Required: inverse patch computation
// computeInversePatch(currentTemplate, patch) → patch that undoes exactly `patch`
// This must be implemented alongside applyPatchToTemplate
```

**Additional requirement:** `inFlightPatchesRef` must be a `useRef<Map<string, BootcampPatch>>` initialized in `useBootcampState.ts`. This is a new field not in either reviewer's state inventory.

---

## Gap 2: The ESLint Rule Qwen Proposed Is Insufficient

**File:** `.eslintrc.js` — Qwen's addition
**Severity:** 🟠 SEV-2

Qwen's rule:
```json
"react-hooks/exhaustive-deps": ["warn", { "additionalHooks": "useBootcampSelector" }]
```

This only warns on missing dependencies in the selector function — it does **not** prevent inline selectors. A developer can still write:

```typescript
// This passes Qwen's lint rule but defeats the optimization
const station = useBootcampSelector(state => state.template?.stations[props.stationIndex]);
```

**The correct enforcement requires a custom lint rule or a code review checklist item.** Since a custom ESLint rule is out of scope for this planning phase, mandate it as a PR review gate instead:

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE/bootcamp_builder.md — NEW -->
## useBootcampSelector Checklist
- [ ] All `useBootcampSelector` calls use a selector defined via `useCallback` or at module scope
- [ ] No inline arrow functions passed directly to `useBootcampSelector`
- [ ] Array selectors provide a custom equality function (not default shallowEqual)
```

This is not a perfect solution, but it's honest. A lint rule that only catches half the problem is worse than a documented checklist because it creates false confidence.

---

## Gap 3: `BootcampPatch` Type Is Undefined — Everything Depends on It

**Severity:** 🔴 SEV-1 — Blocks all hook implementation

Both reviewers have referenced `BootcampPatch` across 8 files without defining it. This type is the **contract between `useBootcampAI`, `useBootcampState`, `useBootcampHistory`, and the server API**. It must be defined before any hook is implemented.

```typescript
// types/BootcampPatch.ts — NEW FILE, ~60 lines
// This is the single most important type in the entire feature

export type PatchOperation =
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'move'; from: string; path: string };

export interface BootcampPatch {
  id: string;                          // UUID — for in-flight tracking
  operations: PatchOperation[];        // JSON Patch RFC 6902 format
  source: 'manual' | 'ai' | 'system'; // For history tagging (Qwen's requirement)
  description: string;                 // Human-readable for undo UI
  timestamp: number;
  
  // AI patches only — undefined for manual edits
  aiContext?: {
    promptSummary: string;             // What the trainer asked
    confidenceScore: number;           // 0-1, from AI response
    affectedStations: number[];        // Which station indices changed
  };
}

// Path conventions — document these or patches will be inconsistent
// '/stations/0/exercises/2/name'       → exercise name
// '/stations/0/exercises/2/setupTime'  → setup time
// '/stations/0'                        → entire station (add/remove)
// '/classStyle'                        → top-level class style change
// '/duration'                          → total duration

export type BootcampPatchResult = 
  | { success: true; appliedPatch: BootcampPatch }
  | { success: false; error: string; inversePatch: BootcampPatch };
```

**Why RFC 6902 JSON Patch format:** It gives us `computeInversePatch` for free via libraries like `fast-json-patch`. It's also the format the server should accept, making the API contract explicit. Do not invent a custom patch format.

**Required addition to `package.json`:**
```json
"fast-json-patch": "^3.1.1"
```

---

## Gap 4: `BootcampBuilderModal.tsx` Needs a Defined Interface

**File:** `components/BootcampBuilder/BootcampBuilderModal.tsx` — referenced but not specified
**Severity:** 🟡 SEV-3

Qwen introduced this file as the modal wrapper that swaps navigation to `useBootcampNavigationLocal`. It needs a defined interface so implementers don't make it a god component:

```typescript
// components/BootcampBuilder/BootcampBuilderModal.tsx — ~40 lines MAX
// This is a THIN wrapper — no business logic

interface BootcampBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: BootcampTemplate) => void;
  initialTemplate?: BootcampTemplate;  // For editing existing bootcamps
}

export function BootcampBuilderModal({ isOpen, onClose, onSave, initialTemplate }: BootcampBuilderModalProps) {
  const navigation = useBootcampNavigationLocal(); // Swaps URL → local state
  
  if (!isOpen) return null;
  
  return (
    <Modal onClose={onClose} size="fullscreen">
      <BootcampBuilderPage
        navigationStore={navigation}  // Injected — page doesn't know it's in a modal
        initialTemplate={initialTemplate}
        onSave={(template) => { onSave(template); onClose(); }}
      />
    </Modal>
  );
}
```

**This requires one change to `BootcampBuilderPage`:** Accept `navigationStore` as an optional prop. If provided, use it. If not, default to `useBootcampNavigationURL()`. This is the dependency injection pattern that makes the modal wrapper thin.

---

## Final Definitive File Manifest

```
frontend/src/
├── types/
│   └── BootcampPatch.ts                          # NEW — SEV-1 gap closed
├── hooks/
│   ├── utils/
│   │   └── useLatest.ts                          # Shared utility
│   ├── useBootcampState.ts                       # Master state + patch application
│   ├── useBootcampSelector.ts                    # Context selector (corrected)
│   ├── useBootcampGeneration.ts                  # AI Hive Mind generation
│   ├── useBootcampAI.ts                          # Conversational tweaks
│   ├── useBootcampFlow.ts                        # Pure flow computation
│   ├── useBootcampPDF.ts                         # PDF export
│   ├── useBootcampHistory.ts                     # Unified undo/redo
│   ├── useBootcampNavigationURL.ts               # URL-backed navigation
│   └── useBootcampNavigationLocal.ts             # Local state navigation
├── components/BootcampBuilder/
│   ├── index.ts                                  # Barrel
│   ├── BootcampBuilderPage.tsx                   # Orchestrator
│   ├── BootcampBuilderModal.tsx                  # Thin modal wrapper
│   ├── BootcampConfigPanel.tsx                   # Left pane
│   ├── BootcampInjuryFlags.tsx                   # Extracted from ConfigPanel
│   ├── BootcampClassPreview.tsx                  # Center pane
│   ├── BootcampAIInsights.tsx                    # Right pane (stateless)
│   ├── BootcampStationCard.tsx                   # Station card
│   ├── BootcampExerciseRow.tsx                   # Exercise row
│   ├── ExerciseModBadges.tsx                     # Extracted from ExerciseRow
│   ├── BootcampStretchModule.tsx                 # Stretch warm-up
│   ├── BootcampClassStyleConfig.tsx              # Merged Pyramid + Superset
│   ├── BootcampBoardToggle.tsx                   # Board toggle (kept separate)
│   ├── BootcampTimeline.tsx                      # Timeline (kept separate)
│   ├── BootcampFlowWarning.tsx                   # Flow warning banner
│   ├── BootcampErrorBoundaries.tsx               # Three-pane isolation
│   └── styles/
│       ├── BootcampTokens.ts                     # Design tokens (renamed + expanded)
│       ├── BootcampConfigStyles.ts               # Left pane styles
│       ├── BootcampPreviewStyles.ts              # Center pane styles
│       └── CoachAssistantStyles.ts               # Right pane styles
└── .github/PULL_REQUEST_TEMPLATE/
    └── bootcamp_builder.md                       # Selector checklist gate
```

**Final file count: 29 files.** Three more than Qwen's Round 2 snapshot, all justified by closed gaps.

---

## Architecture Decision Record — Locked

| Decision | Ruling | Rationale |
|----------|--------|-----------|
| Hook chain | New `useBootcampAI` bridge, no `useCoachAssistant` embed | Domain mismatch, separate endpoint |
| State ownership | Three-hook architecture: state / generation / AI | Single source of truth in `useBootcampState` |
| Context performance | `useBootcampSelector` with `shallowEqual` default | Prevents full-tree re-renders |
| Navigation storage | Abstracted via `NavigationStore` interface | URL default, local for modal |
| Patch format | RFC 6902 JSON Patch via `fast-json-patch` | Inverse patches, server contract |
| Optimistic updates | Apply immediately, inverse-patch rollback | Concurrent-edit safe |
| Undo/redo scope | Unified stack, `source` tagged | AI and manual edits both undoable |
| File count | 29 files | Justified by complexity tier |
| Error boundaries | Three-pane isolation, streaming recovery | AI failures never crash builder |
| Inline selector prevention | PR checklist gate | ESLint insufficient alone |

**Phase 0 decomposition: CLEARED TO BEGIN.**
**Phase 1 feature code: CLEARED pending `BootcampPatch.ts` type definition completion.**

---

