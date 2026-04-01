# Architecture Planning Consensus

> Phase 2B: Claude Sonnet 4.6 ↔ Qwen 3.6 Plus
> Consensus: YES

---

CONSENSUS REACHED

All structural disputes have been resolved. The architecture is now aligned on state ownership, file decomposition, memoization strategy, and error boundary topology. Below is the merged blueprint with three critical production-hardening constraints added to close remaining implementation gaps.

---

## Merged Architecture Blueprint (Final)

### 1. State & Hook Topology
| File | Responsibility | Line Budget |
|---|---|---|
| `hooks/useAIChat.ts` | State ownership, streaming orchestration, optimistic ID tracking | ~220 |
| `hooks/useConversationSidebar.ts` | UI state only (`isOpen`, `searchQuery`), derives `filteredList` | ~60 |
| `hooks/useCoachAssistant.ts` | Orchestration, explicit dep injection, inline keyboard shortcuts | ~130 |
| `hooks/useCoachEventHandlers.ts` | Pure handler factory, explicit `CoachHandlerDeps` interface | ~140 |
| `lib/coach-api.ts` | Raw async fetch/stream functions, zero React | ~130 |
| `lib/coach-optimistic.ts` | Pure state transformers (create/apply/rollback/confirm) | ~70 |

### 2. Component & Layout Topology
| File | Responsibility | Line Budget |
|---|---|---|
| `pages/SwanCoachAssistantPage.tsx` | Error boundary wrapper, hook composition, layout routing | ~160 |
| `components/CoachAssistantLayout.tsx` | CSS Grid responsive shell, single component tree | ~190 |
| `components/ConversationItem.tsx` | `React.memo` default, stable prop factory | ~45 |
| `components/MessageItem.tsx` | `React.memo` default, split `message` + `streamingContent` props | ~50 |
| `components/MarkdownRenderer.tsx` | `React.memo` with explicit content comparator | ~60 |
| `components/CoachAssistantErrorBoundary.tsx` | Nested boundary topology (Page → Sidebar → Message) | ~80 |

---

## Production Hardening Addenda (Round 2)

While consensus is reached on structure, three implementation details require explicit constraints to prevent runtime degradation in production.

### Constraint 1: Mobile Sidebar Scroll Lock
**Risk:** `position: fixed` sidebar on mobile allows background scroll bleed on iOS Safari and Android Chrome.
**Fix:** Extract a lightweight scroll-lock hook tied to `sidebar.isOpen`.

```typescript
// hooks/useScrollLock.ts — ~35 lines
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}

// CoachAssistantLayout.tsx — Line 42
useScrollLock(sidebar.isOpen && isMobile);
```

### Constraint 2: MessageErrorBoundary Infinite Loop Prevention
**Risk:** Clicking "Retry" in `MessageErrorBoundary` re-renders the same malformed markdown, triggering the exact same parse error → infinite render loop.
**Fix:** Fallback must degrade gracefully to raw text or sanitized HTML on retry.

```typescript
// components/MessageErrorBoundary.tsx — Lines 55-75
function MessageErrorFallback({ 
  error, 
  resetErrorBoundary, 
  rawContent 
}: { 
  error: Error; 
  resetErrorBoundary: () => void; 
  rawContent: string;
}) {
  const [showRaw, setShowRaw] = useState(false);

  const handleRetry = () => {
    // First attempt: try raw text render
    if (!showRaw) {
      setShowRaw(true);
    } else {
      // Second attempt: full reset (user explicitly requested)
      resetErrorBoundary();
    }
  };

  return (
    <MessageErrorContainer>
      <span>Message render failed.</span>
      {showRaw ? (
        <pre className="raw-fallback">{rawContent}</pre>
      ) : (
        <button onClick={handleRetry}>Show Raw Text</button>
      )}
    </MessageErrorContainer>
  );
}
```

### Constraint 3: Stream Throttle + React 18 `startTransition` Integration
**Risk:** `requestAnimationFrame` fires ~60fps. Even with buffering, calling `setState` at paint rate can starve input thread during heavy markdown parsing.
**Fix:** Wrap stream state updates in `startTransition` to deprioritize UI rendering over input handling.

```typescript
// hooks/useStreamThrottle.ts — Lines 28-45
import { startTransition } from 'react';

export function useStreamThrottle(intervalMs: number = 50) {
  const bufferRef = useRef<string>('');
  const rafRef = useRef<number>();
  const lastFlushRef = useRef<number>(0);

  const push = useCallback((chunk: string, onFlush: (text: string) => void) => {
    bufferRef.current += chunk;
    const now = performance.now();
    
    const flush = () => {
      if (bufferRef.current.length === 0) return;
      // Deprioritize streaming UI updates to keep input responsive
      startTransition(() => {
        onFlush(bufferRef.current);
      });
      bufferRef.current = '';
      lastFlushRef.current = performance.now();
      rafRef.current = undefined;
    };

    if (now - lastFlushRef.current >= intervalMs) {
      flush();
    } else if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(flush);
    }
  }, [intervalMs]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  return { push };
}
```

---

## Final Architecture Sign-Off
The merged plan now satisfies:
✅ Single source of truth for server state (`useAIChat`)
✅ Zero hydration mismatches (CSS Grid responsive layout)
✅ Testable pure transformation layer (`coach-optimistic.ts`)
✅ Production-safe error recovery (degrading fallbacks)
✅ Input-responsive streaming (`startTransition` + RAF)
✅ Strict file budgets (all files ≤ 220 lines)

Ready for final authority review and implementation handoff.
