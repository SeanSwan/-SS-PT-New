# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 77.3s
> **Files:** docs/ai-workflow/AI-HANDOFF/MASTER-FIX-PLAN-2026-04-06.md
> **Generated:** 4/6/2026, 5:33:04 PM

---

# Architectural Review: SwanStudios Master Fix Plan 2026-04-06

**Reviewer:** Senior React/TypeScript Architect
**Scope:** Architectural soundness of proposed plan
**Note:** Review is based on the plan document; actual file contents inferred from descriptions and standard patterns.

---

## Executive Assessment

The plan demonstrates strong root-cause analysis (particularly the 3-part P0-3 diagnosis) and good consensus methodology. However, it has **significant architectural gaps** in the areas it *doesn't* address: the Coach Assistant UI (Phase 5 DESIGN-3) implies a hook composition that is never specified, state management for the new features is largely absent, and several proposed fixes will create new problems if implemented as described.

---

## Finding Index

| ID | Severity | Phase | File/Component | Category |
|----|----------|-------|----------------|----------|
| A-01 | 🔴 Critical | P0-3 | `workoutService.mjs` | Data Flow |
| A-02 | 🔴 Critical | P0-2 | `sessions.mjs` | Race Condition |
| A-03 | 🔴 Critical | Phase 5 | Coach Assistant hooks | Hook Design |
| A-04 | 🟠 High | CQ-4 | `AuthContext.tsx` | State Management |
| A-05 | 🟠 High | CQ-7 | `ClientDetailView.tsx` | React Patterns |
| A-06 | 🟠 High | Phase 5 | `ConversationSidebar` | Component Decomposition |
| A-07 | 🟠 High | CQ-6 | `MasterDetailLayout.tsx` | File Budget |
| A-08 | 🟡 Medium | P0-5 | `RemotionTemplateGallery.tsx` | Error Boundaries |
| A-09 | 🟡 Medium | ARCH-3 | `useExerciseMemory` | Hook Design |
| A-10 | 🟡 Medium | Phase 3 | `ContainedScrollList` | Component Decomposition |
| A-11 | 🟡 Medium | CQ-1 | `TabErrorBoundary.tsx` | Error Boundaries |
| A-12 | 🟡 Medium | Phase 5 | Design token file | File Budget |
| A-13 | 🟢 Low | CQ-2 | `dashboard-tabs.ts` | Type Safety |
| A-14 | 🟢 Low | ARCH-2 | SSE reconnection | Data Flow |
| A-15 | 🟢 Low | P0-1 | `movementAnalysisController.mjs` | Data Flow |

---

## Detailed Findings

---

### A-01 🔴 Critical — Data Flow / Race Condition

**File:** `backend/services/workoutService.mjs`, `backend/routes/workoutPlanRoutes.mjs`
**Phase:** P0-3

**Issue:** The plan fixes route shadowing (correct) but the proposed fix order creates a new race condition. Step 1 (swap mount order) takes effect immediately in production. Steps 2 and 3 (remove duplicate handler, align schema) are described as separate work. During the window between Step 1 deployment and Steps 2–3 deployment, `POST /api/workout/plans` will now correctly route to `workoutPlanRoutes.mjs` — but if that handler also has schema drift (which the plan implies it does, since the canonical contract hasn't been chosen yet), you've traded a 500 for a different 500. The plan explicitly states *"Must choose canonical contract BEFORE UI work"* but doesn't enforce this sequencing in the execution order.

**Recommended Fix:**

```typescript
// Enforce atomic deployment — all three sub-fixes must ship in ONE commit
// Add to Codex handoff requirements:
// "P0-3 is a single atomic change. Do not deploy route reorder without
//  simultaneous schema alignment and duplicate handler removal."

// Canonical contract decision (needs Sean sign-off before any code):
interface WorkoutPlanCreateDTO {
  title: string;        // NOT name
  userId: string;       // NOT clientId
  nasmPhase: NASMPhase; // NOT goal
  planData: PlanData;   // NOT days (or days maps into planData)
  notes?: string;       // frontend sends this — add to model or strip server-side
}
```

Add a migration guard:

```javascript
// workoutPlanRoutes.mjs — add validation middleware before handler
import { z } from 'zod';

const WorkoutPlanCreateSchema = z.object({
  title: z.string().min(1).max(200),
  userId: z.string().uuid(),
  nasmPhase: z.enum(['STABILIZATION', 'STRENGTH_ENDURANCE', 'HYPERTROPHY', 'MAXIMAL_STRENGTH', 'POWER']),
  planData: z.object({}).passthrough(),
  notes: z.string().optional(),
});

router.post('/', protect, validateBody(WorkoutPlanCreateSchema), createWorkoutPlan);
```

**Severity Rationale:** A partial deployment of a 3-part fix to a production save endpoint will cause data loss for paying clients.

---

### A-02 🔴 Critical — Race Condition / Stale State

**File:** `backend/routes/sessions.mjs` (proposed new routes), frontend session consumers
**Phase:** P0-2

**Issue:** The proposed route handlers for `/upcoming/:userId` and `/history/:userId` use `:userId` as a URL parameter but the plan doesn't specify authorization validation. The `protect` middleware verifies the JWT but doesn't verify that `req.params.userId === req.user.id`. This is an IDOR vulnerability (the plan identifies IDOR in SEC-4 but doesn't connect it to the new routes being created in P0-2). A user could call `/api/sessions/upcoming/[other-user-id]` and see another client's sessions.

Additionally, the frontend data flow for these routes is unspecified. If the frontend calls both `/upcoming` and `/history` in parallel (likely in a `useEffect` or `Promise.all`), and the component unmounts before both resolve, you'll get a state update on an unmounted component.

**Recommended Fix:**

```javascript
// sessions.mjs — enforce ownership in the route itself
router.get('/upcoming/:userId', protect, async (req, res) => {
  // Authorization check — must come before any DB query
  if (req.params.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { userId } = req.params;
  const now = new Date();

  try {
    const sessions = await Session.findAll({
      where: {
        [Op.or]: [{ trainerId: userId }, { clientId: userId }],
        scheduledAt: { [Op.gt]: now },
        status: { [Op.notIn]: ['cancelled', 'no_show'] },
      },
      order: [['scheduledAt', 'ASC']],
      limit: 20, // prevent unbounded queries
    });
    res.json({ data: sessions });
  } catch (err) {
    next(err);
  }
});
```

```typescript
// Frontend — AbortController pattern for parallel fetches
const useSessions = (userId: string) => {
  const [upcoming, setUpcoming] = useState<Session[]>([]);
  const [history, setHistory] = useState<Session[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      api.get(`/sessions/upcoming/${userId}`, { signal: controller.signal }),
      api.get(`/sessions/history/${userId}`, { signal: controller.signal }),
    ]).then(([upcomingRes, historyRes]) => {
      setUpcoming(upcomingRes.data.data);
      setHistory(historyRes.data.data);
    }).catch(err => {
      if (err.name !== 'AbortError') handleError(err);
    });

    return () => controller.abort();
  }, [userId]);

  return { upcoming, history };
};
```

**Severity Rationale:** New routes that introduce IDOR on session data for a health/fitness platform with wealthy clients is a critical security and trust issue.

---

### A-03 🔴 Critical — Hook Design / Missing Specification

**File:** Unspecified — Phase 5 DESIGN-3 implies `useCoachAssistant`, `useAIChat`, `useConversationSidebar`
**Phase:** Phase 5 (Design System — Coach Assistant Chat UI)

**Issue:** The plan describes the Coach Assistant Chat UI visual spec (glassmorphism, bubble styles, sidebar dimensions) but **completely omits the hook composition architecture**. The prompt asks to review `useCoachAssistant → useAIChat → useConversationSidebar` but this chain doesn't appear in the plan document. This is the most significant gap: the UI will be built without a specified state contract, guaranteeing architectural debt.

The conversation loading flow (sidebar click → loadConversation → messages render) has three unaddressed risks:

1. **Optimistic vs. confirmed state:** When a user clicks a conversation in the sidebar, does the UI show the conversation immediately (optimistic) or wait for the API? The plan doesn't specify.
2. **Message pagination:** 840+ exercise database implies heavy usage. Conversations could have hundreds of messages. No pagination strategy is mentioned.
3. **Circular dependency risk:** If `useCoachAssistant` imports from `useAIChat` which imports from `useConversationSidebar`, and `useConversationSidebar` needs to trigger a refetch in `useAIChat`, you have a circular dependency that can't be resolved without a shared state atom or context.

**Recommended Fix — Specify the hook architecture before implementation:**

```typescript
// Proposed hook separation (add to plan before Phase 5 implementation):

// Layer 1: Data fetching (server state only)
// useConversations.ts — fetches conversation list, no UI state
interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// useMessages.ts — fetches messages for a specific conversationId
interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void; // pagination
  sendMessage: (content: string) => Promise<void>;
}

// Layer 2: UI state (no data fetching)
// useConversationSidebar.ts — sidebar open/close, selected conversation ID
interface UseConversationSidebarReturn {
  isOpen: boolean;
  selectedConversationId: string | null;
  selectConversation: (id: string) => void;
  closeSidebar: () => void;
}

// Layer 3: Business logic orchestration (composes layers 1 and 2)
// useCoachAssistant.ts — the ONLY hook consumers should import
// Internally uses useConversations + useMessages + useConversationSidebar
// Exposes a clean interface, hides composition details
interface UseCoachAssistantReturn {
  // Sidebar
  sidebar: UseConversationSidebarReturn;
  conversations: Conversation[];
  // Active conversation
  activeConversation: Conversation | null;
  messages: Message[];
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
  // Actions
  sendMessage: (content: string) => Promise<void>;
  loadMoreMessages: () => void;
  startNewConversation: () => void;
}
```

**Conversation loading flow — correct implementation:**

```typescript
// useCoachAssistant.ts
const useCoachAssistant = (): UseCoachAssistantReturn => {
  const sidebar = useConversationSidebar();
  const { conversations } = useConversations();

  // selectedConversationId drives message fetching — no circular dependency
  const { messages, isLoading, hasMore, loadMore, sendMessage } = useMessages(
    sidebar.selectedConversationId // null = no fetch
  );

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === sidebar.selectedConversationId) ?? null,
    [conversations, sidebar.selectedConversationId]
  );

  // Stale state risk: if selectedConversationId changes while messages are loading,
  // useMessages must cancel the in-flight request. Enforce this in useMessages:
  // useEffect(() => { controller.abort(); }, [conversationId]);

  return { sidebar, conversations, activeConversation, messages, ... };
};
```

**Severity Rationale:** Building a chat UI without a specified hook architecture will result in either a monolithic hook (>500 lines) or circular dependencies discovered mid-implementation.

---

### A-04 🟠 High — State Management

**File:** `AuthContext.tsx`, `MasterDetailLayout.tsx`
**Phase:** CQ-4

**Issue:** The plan correctly identifies `authAxios` recreation and proposes `useMemo([token])`. However, the fix is incomplete. `authAxios` is an Axios instance — memoizing it on `token` means every token refresh (which happens silently on expiry) creates a new instance, which will cause all components that received the old instance via context to have stale interceptors. The real fix requires an interceptor pattern, not instance recreation.

**Recommended Fix:**

```typescript
// AuthContext.tsx — stable instance with dynamic interceptor
const authAxios = useMemo(() => axios.create({
  baseURL: import.meta.env.VITE_API_URL,
}), []); // Create ONCE — never recreate

// Interceptor updates when token changes — no new instance needed
useEffect(() => {
  const interceptorId = authAxios.interceptors.request.use(config => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return () => authAxios.interceptors.request.eject(interceptorId);
}, [authAxios, token]); // authAxios is stable, token changes update interceptor

// Provide the stable instance — consumers never get a new reference
const contextValue = useMemo(() => ({
  authAxios,
  user,
  token,
  login,
  logout,
}), [authAxios, user, token, login, logout]);
```

**Severity Rationale:** The proposed fix (memoize on token) will cause subtle bugs where components hold stale axios instances after token refresh, leading to 401 errors on valid sessions.

---

### A-05 🟠 High — React Patterns

**File:** `ClientDetailView.tsx`
**Phase:** CQ-7

**Issue:** The plan proposes removing `key={client.id}` and using `useEffect([client.id])` to reset tab state. This is correct for tab state but incomplete. Removing the `key` prop means React will reuse the component instance across client changes. Any internal state that is NOT reset in the `useEffect` will persist from the previous client. This is a subtle bug surface — if `ClientDetailView` has child components with their own state (scroll position, form inputs, expanded accordions), those will not reset.

**Recommended Fix:**

```typescript
// ClientDetailView.tsx — explicit state reset inventory
const ClientDetailView = ({ client }: { client: Client }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset ALL local state when client changes
  // This must be an exhaustive list — add a comment requiring review on new state additions
  useEffect(() => {
    // RESET INVENTORY — update this list when adding new state
    setActiveTab('overview');
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    // Note: child component state cannot be reset from here
    // Any child with significant state should also use useEffect([client.id])
  }, [client.id]);

  // ...
};

// Alternative: If ClientDetailView has many stateful children,
// a targeted key on the TAB CONTENT AREA (not the whole component) is cleaner:
<TabContent key={`${client.id}-${activeTab}`}>
  {/* Only this subtree remounts, not the whole ClientDetailView */}
</TabContent>
```

**Severity Rationale:** Incomplete state reset will cause data

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
