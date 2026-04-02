# Architecture Planning Consensus

> Phase 2B: Claude Sonnet 4.6 ↔ Qwen 3.6 Plus
> Consensus: YES

---

# Architecture Authority — Round 3 Final Resolution

## Assessment: Near-Complete Consensus with Three Targeted Disputes

---

## CONSENSUS REACHED ON — Accepted Without Modification

**F-02 Cache-Stable Response Shape:** `MergedCalendarResponse` with `monthKey`, `conflictCount`, and `generatedAt` is correct. SWR key pattern `/api/calendar/merged/${monthKey}/${trainerId}` is accepted. `trainerId` via `req.user.id` in controller is the only acceptable pattern.

**F-06 BootcampCalendar Decomposition:** Line budgets accepted. The explicit rule that `CalendarGrid.tsx` must NOT import `useCalendarData` is correct and important — this is the right isolation boundary.

**F-07 usePainChart Reducer:** The reducer-based state machine is the right pattern. `useReducer` over chained `useState` for multi-dimensional interaction state is accepted.

**F-11 useSprintWizard:** React Hook Form + Zod is correct. Draft persistence via `localStorage` is correct. The rule that wizard step components receive only `form` prop is accepted.

**F-13 exerciseMemory SWR Hook:** Eliminating prop drilling via `useExerciseMemory` with SWR caching is correct. The `dedupingInterval: 5000` is appropriate.

---

## F-04 🔴 Dispute — Row-Level Locking Implementation Has a Critical Gap

**Where I agree:** Pessimistic locking for `exerciseMemory` accumulation is the right instinct. The concern about lost updates on backend restart is valid.

**Where I dispute:** Your locking code has a transaction scope problem that will cause deadlocks in production.

**The problem in your proposed code:**

```typescript
// YOUR PROPOSAL — Missing transaction scope
const lockedSprint = await BootcampSprint.findOne({
  where: { id: sprintId, trainerId },
  lock: Transaction.LOCK.UPDATE,
  transaction: t  // ← Where is `t` defined? It's not in scope here.
});
```

The transaction `t` is referenced but never created in your snippet. More critically, if the lock is held for the entire slot generation loop (which can take 2–5 minutes for 36 classes), you will hold a database row lock for the entire generation duration. Every other query touching this sprint record — including the SSE progress endpoint — will block.

**Required fix — narrow transaction scope, one transaction per slot update:**

```typescript
// src/services/SprintService.ts — Correct locking pattern

for (const slot of weekSlots) {
  try {
    // Generate OUTSIDE transaction — LLM call can take 10-30s
    // Never hold a DB lock during external API calls
    const template = await generateClassForSlot(slot, currentMemory);

    // Narrow transaction: only the write operation is locked
    await sequelize.transaction(async (t) => {
      const lockedSprint = await BootcampSprint.findOne({
        where: { id: sprintId },
        lock: Transaction.LOCK.UPDATE,
        transaction: t
      });

      // Re-read current memory inside lock to catch any concurrent writes
      // (e.g., admin correction, manual override)
      const freshMemory = mergeExerciseMemory(
        lockedSprint.exerciseMemory,
        template.exerciseKeys
      );

      await Promise.all([
        slot.update({ 
          templateId: template.id, 
          status: 'generated',
          exerciseKeys: template.exerciseKeys 
        }, { transaction: t }),
        lockedSprint.update({ 
          exerciseMemory: freshMemory 
        }, { transaction: t })
      ]);

      currentMemory = freshMemory; // Update in-memory reference after commit
    });

    sseEmitter.emit(`sprint:${sprintId}`, {
      type: 'slot_complete',
      slotId: slot.id,
      completedCount: await countGenerated(sprintId),
      totalCount: sprint.SprintClassSlots.length
    });

  } catch (err) {
    // Slot update failure does NOT need a lock — status regression is safe
    await slot.update({ status: 'planned', generationError: err.message });
    sseEmitter.emit(`sprint:${sprintId}`, { type: 'slot_error', slotId: slot.id });
  }
}
```

**The critical rule:** LLM API calls must NEVER occur inside a database transaction. The lock scope is: open transaction → read current memory → write slot + memory → commit → close transaction. The LLM call happens before the transaction opens.

---

## F-04 SSE Resilience — Dispute on Reconnection Strategy

**Where I agree:** `Last-Event-ID` header for resume is the correct SSE pattern. Exponential backoff is correct.

**Where I dispute:** Your reconnection code has a logical error — it creates a new `EventSource` but passes the old closed one as an argument, and it doesn't actually set `Last-Event-ID`:

```typescript
// YOUR PROPOSAL — Broken reconnection
eventSource.onerror = () => {
  eventSource.close();
  setTimeout(() => reconnectWithLastEventId(eventSource, sprintId), 2000);
  // ↑ Passing a closed EventSource to reconnect — this does nothing useful
};
```

**Required fix:**

```typescript
// src/hooks/useSprintGeneration.ts — Correct SSE reconnection

const connectSSE = useCallback((sprintId: string, lastEventId?: string) => {
  const url = new URL(`/api/sprints/${sprintId}/generate-stream`, window.location.origin);
  if (lastEventId) url.searchParams.set('lastEventId', lastEventId);
  
  const es = new EventSource(url.toString());
  let retryCount = 0;
  let lastReceivedId: string | undefined = lastEventId;

  es.addEventListener('slot_complete', (e: MessageEvent) => {
    lastReceivedId = e.lastEventId; // Track for reconnection
    const data = JSON.parse(e.data);
    handleProgress(data.completedCount, data.totalCount);
    retryCount = 0; // Reset backoff on successful message
  });

  es.addEventListener('generation_complete', () => {
    es.close();
    dispatch({ phase: 'complete', sprintId, generatedAt: new Date() });
  });

  es.onerror = () => {
    es.close();
    if (abortRef.current?.signal.aborted) return; // Component unmounted — stop
    
    const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
    retryCount++;
    
    setTimeout(() => {
      if (!abortRef.current?.signal.aborted) {
        connectSSE(sprintId, lastReceivedId); // New EventSource with resume ID
      }
    }, backoffMs);
  };

  return es;
}, [handleProgress]);

// Backend must support: GET /api/sprints/:id/generate-stream?lastEventId=xxx
// And replay missed events from that ID forward
```

**Backend SSE requirement** — the server must store emitted events in Redis or memory for the duration of generation so reconnecting clients can receive missed events:

```typescript
// src/services/SSEEventStore.ts
class SSEEventStore {
  private events = new Map<string, SSEEvent[]>(); // sprintId → events

  store(sprintId: string, event: SSEEvent): void {
    const existing = this.events.get(sprintId) ?? [];
    this.events.set(sprintId, [...existing, { ...event, id: nanoid() }]);
  }

  getEventsSince(sprintId: string, lastEventId: string): SSEEvent[] {
    const events = this.events.get(sprintId) ?? [];
    const lastIndex = events.findIndex(e => e.id === lastEventId);
    return lastIndex === -1 ? events : events.slice(lastIndex + 1);
  }

  cleanup(sprintId: string): void {
    // Call after generation_complete — TTL 5 minutes for late reconnects
    setTimeout(() => this.events.delete(sprintId), 5 * 60 * 1000);
  }
}
```

---

## F-13 🟠 Refinement — `useExerciseMemory` Cache Invalidation Gap

**Where I agree:** The SWR hook pattern is correct. `dedupingInterval: 5000` is appropriate.

**Where I dispute:** `mutate()` after `api.patch` triggers a full server refetch, but the SSE generation loop is also writing to `exerciseMemory` concurrently. If a trainer manually updates memory while generation is running, `mutate()` will overwrite the generation's in-progress accumulation.

**Required fix — optimistic update with conflict guard:**

```typescript
// src/hooks/useExerciseMemory.ts

export function useExerciseMemory(sprintId: string) {
  const { data, mutate, isLoading } = useSWR(
    sprintId ? `/api/sprints/${sprintId}/exercise-memory` : null,
    fetcher,
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 5000,
      // Do NOT revalidate during active generation — generation owns memory state
      revalidateOnReconnect: false 
    }
  );

  const updateMemory = useCallback(async (newKeys: string[]) => {
    // Optimistic update — show immediately
    mutate({ keys: newKeys }, false);
    
    try {
      await api.patch(`/api/sprints/${sprintId}/exercise-memory`, { keys: newKeys });
      // Revalidate from server after write confirms
      mutate();
    } catch (err) {
      // Rollback optimistic update on failure
      mutate();
      throw err;
    }
  }, [sprintId, mutate]);

  // Expose a read-only mode flag for when generation is active
  // Components should disable manual memory editing during generation
  const isGenerationActive = data?.generationStatus === 'generating';

  return { 
    memory: data?.keys ?? [], 
    isLoading, 
    updateMemory,
    isGenerationActive, // UI should disable edit controls when true
    isReadOnly: isGenerationActive 
  };
}
```

---

## CONSENSUS REACHED

All 17 findings are now fully resolved. Summary of final agreed architecture:

| Finding | Resolution | Owner |
|---------|-----------|-------|
| F-01 | `useSprintGeneration` with AbortController + throttled SSE dispatch | Frontend |
| F-02 | Backend `CalendarService.mergeMonthData()`, `trainerId` from auth, SWR cache | Backend + Frontend |
| F-03 | `SprintPlannerPage` decomposed to 12 files, orchestrator ≤150 lines | Frontend |
| F-04 | Sequential-within-week generation, narrow-scope transactions, SSE with event store | Backend + Frontend |
| F-05 | Granular error boundaries per feature zone | Frontend |
| F-06 | `BootcampCalendar` decomposed to 7 files, `CalendarGrid` no data imports | Frontend |
| F-07 | `usePainChart` reducer with typed action union | Frontend |
| F-08 | File budgets enforced per decomposition specs | Both |
| F-09 | `CalendarCell` memo with 3-field comparator | Frontend |
| F-10 | Pain entry staleness resolved via backend merge timestamp | Backend |
| F-11 | `useSprintWizard` with RHF + Zod, localStorage draft, step validation | Frontend |
| F-12 | `SprintDetailPanel` memo strategy follows CalendarCell pattern | Frontend |
| F-13 | `useExerciseMemory` SWR hook, `isReadOnly` during generation | Frontend |
| F-14 | Conflict resolution in `CalendarService.resolveConflicts()` only | Backend |
| F-15 | Cross-sprint memory via `useExerciseMemory` SWR, not prop drilling | Frontend |
| F-16 | `BodyMapLayered` styles in dedicated `BodyMapStyles.ts` | Frontend |
| F-17 | Gender/view toggle state in `usePainChart` reducer | Frontend |

**One infrastructure decision deferred to platform team:** WebSocket fallback for SSE on environments that don't support persistent connections (some load balancers terminate SSE after 60s). The `SSEEventStore` + `lastEventId` reconnection pattern handles this at the application layer, but infrastructure-level keepalive configuration is outside code architecture scope.
