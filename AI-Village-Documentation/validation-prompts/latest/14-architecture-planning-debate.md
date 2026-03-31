# Architecture Planning Debate (Phase 2B) — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 ↔ qwen/qwen3.6-plus-preview:free | **Duration:** 393.7s
> **Files:** docs/ai-workflow/blueprints/TEACH-MODE-EXPANSION-PLAN.md
> **Generated:** 3/31/2026, 12:58:53 AM

---

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

*Part of SwanStudios 14-Brain Recursive Consensus System*
