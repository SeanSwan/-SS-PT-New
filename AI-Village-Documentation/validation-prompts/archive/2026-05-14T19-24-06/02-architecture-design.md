# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 75.1s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

# Architectural Review: Coach Command Center + PLAUD Unified Workflow

**Reviewer:** Senior React/TypeScript Architect
**Date:** 2026-05-14
**Verdict:** **REVISE** — Sequencing is sound but several architectural gaps will cause rework if not addressed before Phase 1 begins.

---

## Executive Summary

The plan is well-scoped and the phasing logic is defensible. However, the hook composition described in Phase 1 has latent circular dependency risk, the data flow from sidebar → conversation has a race condition that will manifest on mobile (slow connections, background/foreground transitions), the file budget for `CoachCommandCenterPage.tsx` will be blown immediately, and there are three security/privacy gaps that are blockers before any AI integration touches real client data.

---

## Finding 1 — Component Decomposition

**Severity:** 🔴 HIGH
**File:** `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx`

### Issue

The current page already orchestrates: intake queue rendering, PLAUD merge workspace, mobile command dock, query-param routing (`workspace=plaud`, `mergeRequestId`, `review=next`), and static prototype threads. Phase 1 adds: real conversation list, conversation load/create/rename/archive, composer wired to AI backend, and selected client context. This single file will exceed 600–800 lines before Phase 2 begins.

### Recommended Fix

Split into a strict three-layer composition:

```
CoachCommandCenterPage.tsx          ← route shell, query-param parsing, layout grid ONLY (~80 lines)
├── CoachCommandShell.tsx           ← orchestrates panel visibility, mobile/desktop split (~120 lines)
│   ├── CoachConversationPanel.tsx  ← conversation list + active thread (~150 lines)
│   │   ├── ConversationSidebar     ← REUSE from SwanCoachAssistantPage (already exists)
│   │   └── CoachThreadView.tsx     ← message list + composer (~180 lines)
│   ├── CoachIntakePanel.tsx        ← Today's intake queue, status filters (~160 lines)
│   │   └── IntakeItemCard.tsx      ← single intake item (~80 lines)
│   └── PlaudMergeWorkspace         ← REUSE existing component (already exists)
└── CoachCommandDock.tsx            ← mobile fixed bottom dock, ISOLATED (~90 lines)
```

`CoachCommandShell` owns the panel-visibility state (which panel is active on mobile) and nothing else. This prevents the page from becoming a god component.

---

## Finding 2 — Component Decomposition (Secondary)

**Severity:** 🟡 MEDIUM
**File:** `frontend/src/components/DashBoard/Pages/coach-assistant/CoachThreadView.tsx` (proposed)

### Issue

A single component handling message list rendering AND the composer will re-render the entire message list on every keystroke in the composer input, because they share a parent that holds `inputValue` state.

### Recommended Fix

Isolate composer state completely:

```typescript
// CoachThreadView.tsx — owns scroll container + message list only
// CoachComposer.tsx   — owns input state, voice toggle, submit handler
// They communicate via callback props only, never shared parent state
```

Use `React.memo` on `CoachThreadView` with a stable `messages` reference. The composer's `onSubmit` callback must be wrapped in `useCallback` with a stable dependency array.

---

## Finding 3 — State Management: Hook Composition Risk

**Severity:** 🔴 HIGH
**Files:** `useCoachAssistant.ts` → `useAIChat.ts` → `useConversationSidebar.ts`

### Issue

The proposed composition `useCoachAssistant → useAIChat → useConversationSidebar` has an implicit circular dependency risk. If `useCoachAssistant` reads `selectedConversationId` from `useConversationSidebar` AND `useAIChat` also needs to know `selectedConversationId` to load messages, you have two hooks that both need to own or read the same piece of state. Whichever hook "owns" it will need to pass it down, but if both hooks are called at the same component level, the state will be duplicated and can drift.

Additionally, `useCoachAssistant` currently manages `selectedClient` context. If a conversation is client-scoped, changing `selectedClient` should potentially change the conversation list. This creates a three-way dependency: client → conversation list → message thread.

### Recommended Fix

Establish a strict ownership hierarchy with a single source of truth:

```typescript
// OWNERSHIP MAP — each piece of state has exactly one owner

// useCoachCommandState.ts  ← NEW: top-level coordinator, owns:
//   selectedClientId: string | null
//   selectedConversationId: string | null
//   activePanelMobile: 'intake' | 'conversation' | 'plaud'
//   dispatch actions only, no data fetching

// useAIChat.ts  ← EXISTING: owns:
//   conversations: AiConversation[]
//   messages: AiMessage[]
//   loading states
//   RECEIVES selectedConversationId as a PARAMETER, does not own it

// useCoachIntakeQueue.ts  ← EXISTING: owns:
//   intakeItems: CoachIntakeItem[]
//   RECEIVES selectedClientId as a filter parameter

// useConversationSidebar.ts  ← UI STATE ONLY:
//   searchQuery: string
//   isCollapsed: boolean
//   NO conversation data, reads from useAIChat via props
```

```typescript
// CoachCommandShell.tsx — the single place where hooks compose
const CoachCommandShell = () => {
  const commandState = useCoachCommandState(); // owns IDs
  const aiChat = useAIChat({
    conversationId: commandState.selectedConversationId,
    clientId: commandState.selectedClientId,
  });
  const intakeQueue = useCoachIntakeQueue({
    clientId: commandState.selectedClientId,
    scope: 'actionable',
    limit: 12,
  });

  // Pass down via props, NOT via context unless subtree is deep
};
```

This eliminates circular dependency by making all hooks parameter-driven rather than state-sharing.

---

## Finding 4 — Data Flow: Race Condition in Conversation Loading

**Severity:** 🔴 HIGH
**Files:** `useAIChat.ts`, `CoachConversationPanel.tsx`

### Issue

The flow `sidebar click → loadConversation(id) → messages render` has a classic stale closure / race condition pattern. If the user clicks conversation A, then quickly clicks conversation B before A's fetch resolves, the messages from A's response may arrive after B's response and overwrite B's messages in state. On mobile with a slow connection (gym WiFi, LTE handoff), this is a real-world failure mode.

Additionally, if `loadConversation` is called inside a `useEffect` that depends on `selectedConversationId`, and the component unmounts during the fetch (mobile background/foreground), the state update will fire on an unmounted component.

### Recommended Fix

Implement request cancellation and a conversation ID guard:

```typescript
// useAIChat.ts — add to loadConversation
const loadConversation = useCallback(async (conversationId: string) => {
  // Cancel any in-flight request for a different conversation
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  abortControllerRef.current = new AbortController();

  // Optimistic clear — show loading state immediately
  setMessages([]);
  setMessagesLoading(true);
  setCurrentConversationId(conversationId); // set BEFORE fetch

  try {
    const response = await fetchMessages(conversationId, {
      signal: abortControllerRef.current.signal,
    });

    // Guard: only apply if this is still the active conversation
    if (conversationId === currentConversationIdRef.current) {
      setMessages(response.messages);
    }
  } catch (err) {
    if (err.name === 'AbortError') return; // intentional cancel, not an error
    setMessagesError(err);
  } finally {
    if (conversationId === currentConversationIdRef.current) {
      setMessagesLoading(false);
    }
  }
}, []);

// Use a ref to track current ID for the guard check
const currentConversationIdRef = useRef<string | null>(null);
useEffect(() => {
  currentConversationIdRef.current = currentConversationId;
}, [currentConversationId]);
```

Also add cleanup in the effect that triggers loading:

```typescript
useEffect(() => {
  if (!selectedConversationId) return;
  loadConversation(selectedConversationId);

  return () => {
    // Cleanup on unmount or ID change
    abortControllerRef.current?.abort();
  };
}, [selectedConversationId]); // loadConversation must be stable via useCallback
```

---

## Finding 5 — React Patterns: Missing Memoization

**Severity:** 🟡 MEDIUM
**Files:** `CoachIntakePanel.tsx` (proposed), `IntakeItemCard.tsx` (proposed)

### Issue

The intake queue renders up to 12 items. Each `IntakeItemCard` will re-render whenever the parent re-renders (e.g., on composer keystrokes, conversation load, mobile panel switch). Without memoization, a 12-item list re-renders on every state change in the shell.

More critically, the `onApprove`, `onDiscard`, `onResolveClient` callbacks passed to each card will be new function references on every render unless stabilized, defeating any `React.memo` applied to the card.

### Recommended Fix

```typescript
// IntakeItemCard.tsx
export const IntakeItemCard = React.memo(
  ({ item, onApprove, onDiscard, onResolveClient }: IntakeItemCardProps) => {
    // ...
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.status === next.item.status &&
    prev.item.updatedAt === next.item.updatedAt
  // Custom comparator: only re-render if the item itself changed
);

// CoachIntakePanel.tsx — stabilize callbacks
const handleApprove = useCallback(
  (itemId: string) => dispatch({ type: 'APPROVE_INTAKE', itemId }),
  [dispatch]
);
const handleDiscard = useCallback(
  (itemId: string) => dispatch({ type: 'DISCARD_INTAKE', itemId }),
  [dispatch]
);
```

Also memoize the filtered/sorted intake list:

```typescript
const actionableItems = useMemo(
  () =>
    intakeItems
      .filter((item) => item.status !== 'archived')
      .sort((a, b) => b.createdAt - a.createdAt),
  [intakeItems]
);
```

---

## Finding 6 — React Patterns: ConversationSidebar Re-render

**Severity:** 🟡 MEDIUM
**File:** `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx` (existing, being reused)

### Issue

`ConversationSidebar` is proposed for reuse in the Command Center. If it currently receives the full `conversations` array and re-renders when any conversation's `updatedAt` changes (e.g., after sending a message), the entire sidebar list re-renders. With named conversations accumulating over weeks of use, this becomes a performance issue.

### Recommended Fix

```typescript
// Virtualize the conversation list if > 20 items
// Use react-window or @tanstack/virtual — already likely in the bundle
// Memoize individual ConversationListItem components

const ConversationListItem = React.memo(
  ({ conversation, isSelected, onSelect, onRename, onArchive }) => {
    const handleSelect = useCallback(
      () => onSelect(conversation.id),
      [conversation.id, onSelect]
    );
    // ...
  }
);
```

---

## Finding 7 — File Budget

**Severity:** 🟡 MEDIUM

| File | Estimated Lines | Status |
|------|----------------|--------|
| `CoachCommandCenterPage.tsx` (current) | ~280 | ⚠️ At limit |
| `CoachCommandCenterPage.tsx` (post Phase 1) | ~650+ | 🔴 EXCEEDS |
| `SwanCoachAssistantPage.tsx` (existing) | ~320 | 🔴 Already exceeds |
| `PlaudMergeWorkspace.tsx` (existing) | ~unknown, likely 300+) | ⚠️ Verify |
| `useAIChat.ts` (post Phase 1 additions) | ~280 | ⚠️ At limit |
| `CoachThreadView.tsx` (proposed, if not split) | ~350+ | 🔴 EXCEEDS |
| `CoachIntakePanel.tsx` (proposed) | ~180 | ✅ OK |
| `IntakeItemCard.tsx` (proposed) | ~90 | ✅ OK |
| `CoachCommandDock.tsx` (proposed) | ~90 | ✅ OK |

### Recommended Fix

- `SwanCoachAssistantPage.tsx` must be refactored before Phase 1 reuse — extract `ConversationSidebar` usage into a `ConversationPanelContainer.tsx` wrapper.
- `useAIChat.ts` should be split: `useAIConversations.ts` (list/create/rename/archive) and `useAIMessages.ts` (load/send/stream). They compose at the call site.
- `CoachThreadView.tsx` must be split as described in Finding 2.

---

## Finding 8 — Hook Design: Separation of Concerns

**Severity:** 🟡 MEDIUM
**File:** `frontend/src/hooks/useAIChat.ts`

### Issue

`useAIChat.ts` currently handles data fetching (API calls), UI state (loading booleans, error state), and business logic (conversation lifecycle: create → rename → archive). This violates the single-responsibility principle for hooks and will make Phase 1 additions (voice transcription toggle, client context binding, quick-workout mode) increasingly tangled.

### Recommended Fix

Decompose into three layers:

```typescript
// Layer 1: Data fetching (pure async, no React state)
// services/aiChatService.ts
export const aiChatService = {
  listConversations: (params) => api.get('/ai-chat/conversations', params),
  loadMessages: (id, signal) => api.get(`/ai-chat/conversations/${id}/messages`, { signal }),
  sendMessage: (id, content) => api.post(`/ai-chat/conversations/${id}/messages`, { content }),
  createConversation: (params) => api.post('/ai-chat/conversations', params),
  renameConversation: (id, title) => api.patch(`/ai-chat/conversations/${id}`, { title }),
  archiveConversation: (id) => api.delete(`/ai-chat/conversations/${id}`),
};

// Layer 2: Data state hooks (React Query or manual fetch state)
// hooks/useAIConversations.ts — list, create, rename, archive
// hooks/useAIMessages.ts     — load messages for one conversation, send, stream

// Layer 3: Business logic / composition
// hooks/useCoachCommandState.ts — ties client context + conversation selection + intake queue
```

---

## Finding 9 — Hook Design: Missing Optimistic Updates

**Severity:** 🟡 MEDIUM
**File:** `useAIChat.ts` / `useAIMessages.ts` (proposed)

### Issue

When the operator sends a message via the composer, the current pattern likely waits for the server response before showing the message. On mobile with gym WiFi, this creates a 500ms–2s perceived lag that feels broken. The plan does not mention optimistic updates.

### Recommended Fix

```typescript
const sendMessage = useCallback(
  async (content: string) => {
    // Optimistic: add message immediately with a temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: AiMessage = {
      id: tempId,
      content,
      role: 'user',
      createdAt: new Date().toISO

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
