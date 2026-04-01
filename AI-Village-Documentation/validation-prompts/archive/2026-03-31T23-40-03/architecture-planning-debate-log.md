# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 29,126 input / 14,949 output

---

## Senior Architecture Lead — Round 1

# Architecture Authority Review: Multi-Workstream QA & Enhancement Plan

**Reviewer:** Senior Code Quality Lead  
**Platform:** SwanStudios — Enchanted Apex: Crystalline Swan  
**Scope:** Hook composition, component decomposition, state management, React performance, error boundaries, file budget  
**Risk Rating:** 🔴 High — Multiple structural issues require resolution before implementation

---

## Executive Summary

The plan diagnoses real user-facing bugs correctly. The proposed fixes are directionally sound. However, the underlying architecture has four structural problems that will cause production incidents if not addressed: **state duplication across hooks**, **missing error boundary topology**, **an under-specified file decomposition that will blow the 300-line budget in at least 4 files**, and **a memoization strategy that is entirely absent from the plan**. The 12 prior validators identified individual symptoms; this review identifies the root causes.

---

## Finding 1: Hook Composition — State Ownership Is Undefined

**Severity:** 🔴 Critical  
**Files:** `useCoachAssistant.ts`, `useAIChat.ts`, `useConversationSidebar.ts`

### The Core Problem

The plan describes three hooks but never specifies which hook *owns* each piece of state. This is not a style preference — it is the single most common cause of React bugs in multi-hook architectures. When ownership is undefined, state gets duplicated, and the duplicates diverge.

Tracing the plan's described behavior:

```
activeConversation  →  lives in useAIChat (inferred from "sets activeConversation to null")
conversationList    →  lives in useAIChat (listConversations()) OR useConversationSidebar?
sidebarOpen         →  lives in useConversationSidebar
searchQuery         →  lives in useConversationSidebar
filteredList        →  derived in useConversationSidebar FROM conversationList
```

The problem: `conversationList` is fetched by `useAIChat` (which owns the API calls) but *displayed* by `useConversationSidebar` (which owns sidebar UI state). The plan does not specify how `conversationList` travels between them. The two likely implementations both have defects:

**Option A — useConversationSidebar calls listConversations() independently:**
```typescript
// DEFECT: Two fetch calls. List in sidebar diverges from list in useAIChat.
// After newChat(), useAIChat knows about the new conversation.
// useConversationSidebar does NOT until it re-fetches independently.
// This is exactly Issue 1: "conversation list doesn't refresh."
```

**Option B — useCoachAssistant passes conversationList as a prop to useConversationSidebar:**
```typescript
// DEFECT: Hooks cannot receive props. This forces useConversationSidebar
// to accept conversationList as a parameter, making it a pure transformation
// hook — which is fine, but the plan doesn't specify this, so implementers
// will reach for Option A by default.
```

### The Fix: Explicit State Ownership Map

Before writing a single line of implementation code, establish this contract:

```typescript
// STATE OWNERSHIP — SINGLE SOURCE OF TRUTH
//
// useAIChat.ts — DATA LAYER (owns all server state)
//   activeConversation: ConversationSummary | null
//   messages: Message[]
//   conversationList: ConversationSummary[]   ← SINGLE SOURCE
//   isStreaming: boolean
//   error: AIError | null
//
// useConversationSidebar.ts — UI STATE LAYER (owns zero server state)
//   isOpen: boolean
//   searchQuery: string
//   filteredList: ConversationSummary[]  ← DERIVED from conversationList param
//
// useCoachAssistant.ts — ORCHESTRATION LAYER (owns zero state)
//   Composes the above two hooks
//   Exposes unified API to SwanCoachAssistantPage
//   Handles cross-hook event coordination

// CORRECT SIGNATURE:
function useConversationSidebar(
  conversationList: ConversationSummary[],  // ← received, not fetched
  activeConversationId: string | null
) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredList = useMemo(
    () => conversationList.filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [conversationList, searchQuery]  // ← reacts to upstream changes automatically
  );
  
  return { isOpen, setIsOpen, searchQuery, setSearchQuery, filteredList };
}
```

This single architectural decision fixes Issue 1 (list refresh) automatically: when `useAIChat` updates `conversationList` after `newChat()`, `useConversationSidebar` recomputes `filteredList` via `useMemo` with no additional refresh call needed.

---

## Finding 2: The Orchestration Hook Will Exceed 300 Lines

**Severity:** 🔴 Critical  
**File:** `useCoachAssistant.ts`

### Line Count Projection

The plan describes `useCoachAssistant` as handling:

```
- handleNewChat() with sidebar coordination logic
- handleContextChange() with conversation branching decision
- handleSendMessage() with optimistic update + streaming
- handleConversationSelect() with load + sidebar close
- handleVoiceInput() with transcription pipeline
- handleFileAttachment() with R2 upload coordination
- Desktop sidebar collapse state
- Toast/feedback state
- Error aggregation from sub-hooks
- Keyboard shortcut registration
```

Realistic line count at production quality (TypeScript types, JSDoc, error handling):

| Section | Lines |
|---|---|
| Imports + type definitions | 35 |
| Hook signature + sub-hook initialization | 25 |
| `handleNewChat` with feedback + sidebar logic | 40 |
| `handleContextChange` with branching | 35 |
| `handleSendMessage` with optimistic update | 50 |
| `handleConversationSelect` | 30 |
| `handleVoiceInput` + transcription | 45 |
| `handleFileAttachment` | 40 |
| Keyboard shortcuts (useEffect) | 30 |
| Toast state management | 20 |
| Return object construction | 25 |
| **Total** | **375** |

This exceeds the 300-line budget by 25% before edge case handling is added.

### The Fix: Extract an Event Handler Layer

```
useCoachAssistant.ts          ← Keep as orchestrator, ~180 lines
  ↓ imports
useCoachEventHandlers.ts      ← All handleX() functions, ~160 lines
  ↓ imports  
useCoachKeyboardShortcuts.ts  ← useEffect keyboard logic, ~60 lines
```

```typescript
// useCoachEventHandlers.ts — receives hooks as parameters, returns handlers
export function useCoachEventHandlers(
  chat: ReturnType<typeof useAIChat>,
  sidebar: ReturnType<typeof useConversationSidebar>,
  toast: ReturnType<typeof useToast>
) {
  const handleNewChat = useCallback(async () => {
    await chat.newChat();
    // conversationList updates automatically via useAIChat
    // sidebar.filteredList recomputes automatically via useMemo
    // No manual refresh needed — this is the architectural fix for Issue 1
    toast.show('New conversation started', 'info');
    // Do NOT close sidebar on desktop — fix for Issue 1 UX confusion
  }, [chat, toast]);

  const handleContextChange = useCallback((contextKey: ContextType) => {
    // Decision: continue conversation with context note (not new conversation)
    // This answers Architecture Question 2 from the plan
    chat.appendContextNote(contextKey);
  }, [chat]);

  return { handleNewChat, handleContextChange /* ... */ };
}
```

---

## Finding 3: Files That Will Exceed 300 Lines

**Severity:** 🟡 Medium  
**Scope:** 4 files identified

The plan proposes 22 files. Based on the feature scope described, the following will exceed budget:

| File | Projected Lines | Reason |
|---|---|---|
| `useCoachAssistant.ts` | ~375 | See Finding 2 |
| `useAIChat.ts` | ~420 | 9 API methods + streaming + optimistic updates + error handling + TypeScript interfaces |
| `SwanCoachAssistantPage.tsx` | ~340 | Layout composition + responsive breakpoint logic + conditional rendering for 5 states |
| `CoachMessageStyles.ts` | ~310 | Markdown component overrides + code block styling + streaming animation + 6 message variants |

### Fix for `useAIChat.ts`

Split along the data access boundary:

```
useAIChat.ts              ← State + streaming + optimistic updates, ~220 lines
useAIChatAPI.ts           ← Raw API call functions (no state), ~150 lines
useAIChatOptimistic.ts    ← Optimistic update helpers, ~80 lines
```

```typescript
// useAIChatAPI.ts — pure async functions, no hooks, fully testable
export async function fetchConversationList(
  userId: string, 
  signal: AbortSignal
): Promise<ConversationSummary[]> { ... }

export async function sendMessage(
  conversationId: string,
  message: string,
  context: ContextType,
  signal: AbortSignal
): Promise<ReadableStream> { ... }
```

This separation has a secondary benefit: `useAIChatAPI.ts` functions are independently unit-testable without React Testing Library.

### Fix for `SwanCoachAssistantPage.tsx`

The page component should contain zero business logic. Extract the responsive layout decision:

```typescript
// SwanCoachAssistantPage.tsx — ~180 lines, layout only
// CoachAssistantDesktopLayout.tsx — ~120 lines
// CoachAssistantMobileLayout.tsx — ~100 lines

// Page component becomes:
function SwanCoachAssistantPage() {
  const coach = useCoachAssistant();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  
  if (coach.error?.isFatal) {
    return <CoachAssistantErrorFallback error={coach.error} onRetry={coach.retry} />;
  }
  
  return isMobile 
    ? <CoachAssistantMobileLayout {...coach} />
    : <CoachAssistantDesktopLayout {...coach} />;
}
```

---

## Finding 4: Error Boundaries Are Completely Absent

**Severity:** 🔴 Critical  
**Scope:** All of Workstream 1

The plan has zero mentions of error boundaries. The prior Architecture validator flagged this. This is not optional for a production SaaS with real paying customers.

### Error Boundary Topology

The Coach Assistant feature has three distinct failure modes that require independent recovery:

```
SwanCoachAssistantPage
├── [ErrorBoundary: CoachAssistantErrorBoundary]  ← catches fatal render errors
│   ├── ConversationSidebar
│   │   └── [ErrorBoundary: SidebarErrorBoundary]  ← sidebar crash ≠ lose chat
│   │       └── ConversationList
│   │           └── ConversationItem (×N)
│   └── ChatArea
│       ├── MessageList
│       │   └── [ErrorBoundary: MessageErrorBoundary]  ← one bad message ≠ lose all
│       │       └── MessageItem (×N)
│       │           └── MarkdownRenderer  ← most likely to throw (malformed AI output)
│       └── ChatInputBar
```

### Implementation

```typescript
// CoachAssistantErrorBoundary.tsx — ~80 lines
interface CoachAssistantErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function CoachAssistantErrorFallback({ 
  error, 
  resetErrorBoundary 
}: CoachAssistantErrorFallbackProps) {
  return (
    <ErrorContainer>
      <SwanIcon variant="error" />
      <ErrorTitle>Coach Assistant Unavailable</ErrorTitle>
      <ErrorMessage>
        Your conversations are saved. Refresh to reconnect.
      </ErrorMessage>
      <RetryButton onClick={resetErrorBoundary}>
        Try Again
      </RetryButton>
    </ErrorContainer>
  );
}

// MessageErrorBoundary — critical: one malformed AI response must not crash the list
function MessageErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <MessageErrorContainer>
      <span>Unable to render this message.</span>
      <button onClick={resetErrorBoundary}>Retry</button>
    </MessageErrorContainer>
  );
}
```

**Why `MessageErrorBoundary` is the most important one:** The `MarkdownRenderer` component processes AI-generated text. Malformed markdown, unexpected Unicode, or a remark-gfm parsing edge case will throw synchronously during render. Without a boundary at the message level, a single bad AI response crashes the entire chat interface and loses the user's session context.

---

## Finding 5: Memoization Strategy Is Absent

**Severity:** 🟡 Medium  
**Files:** All component files

The plan mentions no memoization. For a streaming AI chat with a conversation sidebar, this will cause visible performance degradation.

### Re-render Analysis

Without memoization, the current architecture has this re-render cascade:

```
useAIChat updates messages (every streaming chunk)
  → useCoachAssistant re-renders (receives new messages reference)
    → SwanCoachAssistantPage re-renders
      → ConversationSidebar re-renders (receives new coach object reference)
        → ALL ConversationItems re-render
          → Each item re-runs its styled-components interpolations
```

During streaming, this cascade fires 10-30 times per second. With 50 conversations in the sidebar, that is 500-1500 styled-component re-evaluations per second.

### Required Memoization Points

```typescript
// 1. ConversationItem — most critical, renders N times
const ConversationItem = React.memo(
  function ConversationItem({ conversation, isActive, onSelect, onRename, onDelete }) {
    // ...
  },
  (prev, next) => 
    prev.conversation.id === next.conversation.id &&
    prev.conversation.title === next.conversation.title &&
    prev.conversation.updatedAt === next.conversation.updatedAt &&
    prev.isActive === next.isActive
);

// 2. MessageItem — renders during streaming, must be stable for non-streaming messages
const MessageItem = React.memo(
  function MessageItem({ message, isStreaming }) {
    // ...
  },
  (prev, next) => {
    // Only re-render if this specific message changed
    if (prev.message.id !== next.message.id) return false;
    if (prev.isStreaming !== next.isStreaming) return false;
    if (prev.isStreaming && next.isStreaming) return false; // always re-render streaming
    return prev.message.content === next.message.content;
  }
);

// 3. MarkdownRenderer — expensive parse operation
const MarkdownRenderer = React.memo(
  function MarkdownRenderer({ content }) {
    const components = useMemo(() => ({
      code: CodeBlock,
      p: Paragraph,
      // ... other overrides
    }), []); // stable reference — never recreated
    
    return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
  },
  (prev, next) => prev.content === next.content // only re-render when content changes
);

// 4. Context chips — stable unless active context changes
const ContextChipBar = React.memo(
  function ContextChipBar({ chips, activeContext, onContextChange }) { ... },
  (prev, next) => prev.activeContext === next.activeContext
);

// 5. Streaming optimization — batch updates, not character-by-character
// In useAIChat.ts streaming handler:
const STREAM_BATCH_MS = 50; // ~20fps for streaming text
let streamBuffer = '';
let streamTimer: ReturnType<typeof setTimeout> | null = null;

function flushStreamBuffer(messageId: string) {
  if (

---

## Code Architecture Specialist (1M context) — Round 2

## Code Architecture Specialist (Qwen 3.6 Plus) — Round 1

**Accepted without modification:** Finding 1 (State Ownership Map), Finding 4 (Error Boundary Topology). The single-source-of-truth contract and nested boundary placement are production-ready.

**Disputed/Refined:** Findings 2, 3, 5. Below are architectural corrections with exact file boundaries, line allocations, and implementation patterns.

---

## Dispute 1: Over-Decomposition of Event Handlers & Keyboard Logic (Finding 2)

**Issue:** Extracting `useCoachKeyboardShortcuts.ts` as a standalone 60-line file violates cohesion. Keyboard shortcuts are tightly coupled to the orchestrator's action dispatch and should not be isolated. Additionally, passing `ReturnType<typeof useAIChat>` into `useCoachEventHandlers` creates implicit coupling to the entire hook shape, making refactoring brittle.

**Alternative Architecture:**
Keep keyboard logic inline. Extract only the heavy async handlers into a pure factory that accepts explicit dependencies, not full hook return types.

```typescript
// useCoachAssistant.ts — Lines 1-190 (Orchestrator)
import { useAIChat } from './useAIChat';
import { useConversationSidebar } from './useConversationSidebar';
import { useCoachEventHandlers } from './useCoachEventHandlers';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'; // ← inline utility, not separate file

export function useCoachAssistant() {
  const chat = useAIChat();
  const sidebar = useConversationSidebar(chat.conversationList, chat.activeConversation?.id);
  
  // Pass only what handlers need, not the entire hook shape
  const handlers = useCoachEventHandlers({
    newChat: chat.newChat,
    appendContextNote: chat.appendContextNote,
    sendMessage: chat.sendMessage,
    loadConversation: chat.loadConversation,
    toast: useToast(),
  });

  useKeyboardShortcuts({
    onNewChat: handlers.handleNewChat,
    onToggleSidebar: sidebar.setIsOpen,
  });

  return { ...chat, ...sidebar, ...handlers };
}
```

```typescript
// useCoachEventHandlers.ts — Lines 1-140
interface CoachHandlerDeps {
  newChat: () => Promise<void>;
  appendContextNote: (ctx: ContextType) => void;
  sendMessage: (msg: string, ctx: ContextType) => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  toast: { show: (msg: string, type: 'info' | 'error') => void };
}

export function useCoachEventHandlers(deps: CoachHandlerDeps) {
  const handleNewChat = useCallback(async () => {
    await deps.newChat();
    deps.toast.show('New conversation started', 'info');
  }, [deps.newChat, deps.toast]);

  // ... other handlers
  return { handleNewChat, handleContextChange: deps.appendContextNote /* ... */ };
}
```
**Why this wins:** Explicit dependency injection prevents accidental coupling to internal hook state. Keyboard logic stays colocated with its trigger context, reducing file count and import overhead.

---

## Dispute 2: Premature Optimistic Split & Hydration-Risky Layout Split (Finding 3)

**Issue A:** `useAIChatOptimistic.ts` as a separate file fractures state logic. Optimistic updates require direct access to `setState` and `useRef` for rollback, making them inseparable from the main hook.

**Issue B:** Splitting `SwanCoachAssistantPage.tsx` into `DesktopLayout.tsx` / `MobileLayout.tsx` based on `useMediaQuery` causes React hydration mismatches on SSR/SSG and forces full component unmount/remount on breakpoint crossing, losing scroll position and input focus.

**Alternative Architecture:**

```typescript
// useAIChat.ts — Lines 1-240 (Keep optimistic logic here)
// Extract ONLY raw API calls to a non-hook module
// api/coach.ts — Lines 1-130 (Pure async functions, no React)
export async function fetchConversations(userId: string, signal?: AbortSignal) { ... }
export async function streamResponse(convoId: string, payload: ChatPayload, signal?: AbortSignal) { ... }

// useAIChat.ts imports from api/coach.ts
// Optimistic update stays inline:
const optimisticUpdate = useCallback((tempId: string, content: string) => {
  setMessages(prev => [...prev, { id: tempId, content, status: 'optimistic' }]);
  return () => setMessages(prev => prev.filter(m => m.id !== tempId));
}, []);
```

```typescript
// SwanCoachAssistantPage.tsx — Lines 1-160 (Single file, CSS-driven responsive)
import { CoachAssistantLayout } from './components/CoachAssistantLayout';

function SwanCoachAssistantPage() {
  const coach = useCoachAssistant();
  if (coach.error?.isFatal) return <CoachAssistantErrorFallback {...} />;
  return <CoachAssistantLayout {...coach} />;
}

// components/CoachAssistantLayout.tsx — Lines 1-190
// Uses CSS Grid + container queries instead of conditional component trees
const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
    & > aside { position: fixed; inset: 0; z-index: 50; transform: translateX(-100%); }
    &.sidebar-open > aside { transform: translateX(0); }
  }
`;
```
**Why this wins:** Keeps state logic atomic. Eliminates hydration/remount bugs. CSS-driven responsiveness preserves component identity across breakpoints, maintaining focus, scroll, and streaming state.

---

## Dispute 3: Over-Engineered Memo Comparators & Manual Stream Buffering (Finding 5)

**Issue:** Custom `React.memo` comparators are maintenance-heavy and fragile against minor prop shape changes. React 18's automatic batching + stable hook references already solve 90% of cascade re-renders. Manual `setTimeout` stream buffering introduces race conditions and memory leaks if not cleaned up perfectly.

**Alternative Architecture:**

```typescript
// 1. Stabilize props at hook level, use default shallow memo
// components/ConversationItem.tsx — Lines 1-45
export const ConversationItem = React.memo(function ConversationItem({
  conversation, isActive, onSelect
}: Props) {
  // No custom comparator needed if parent passes stable refs
});

// useCoachAssistant.ts — Lines 185-195 (Stabilize list items)
const stableConversations = useMemo(() => 
  sidebar.filteredList.map(c => ({
    ...c,
    onSelect: () => handlers.handleConversationSelect(c.id),
  })),
  [sidebar.filteredList, handlers.handleConversationSelect]
);
```

```typescript
// 2. Replace manual setTimeout with requestAnimationFrame + useRef
// hooks/useStreamThrottle.ts — Lines 1-35
export function useStreamThrottle(intervalMs: number = 50) {
  const bufferRef = useRef<string>('');
  const lastFlushRef = useRef<number>(0);
  const rafRef = useRef<number>();

  const push = useCallback((chunk: string, onFlush: (text: string) => void) => {
    bufferRef.current += chunk;
    const now = performance.now();
    if (now - lastFlushRef.current >= intervalMs) {
      onFlush(bufferRef.current);
      bufferRef.current = '';
      lastFlushRef.current = now;
    } else if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        onFlush(bufferRef.current);
        bufferRef.current = '';
        lastFlushRef.current = performance.now();
        rafRef.current = undefined;
      });
    }
  }, [intervalMs]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  return { push };
}
```
**Why this wins:** Default `React.memo` + stable prop factories is the React team's recommended pattern. `requestAnimationFrame` aligns with browser paint cycles, eliminating drift and cleanup bugs inherent in `setTimeout`.

---

## Summary of Round 1 Position
- **Accepted:** State ownership contract (Finding 1), Error boundary topology (Finding 4)
- **Refined:** Handler extraction (Finding 2), File splits (Finding 3), Memo/Streaming strategy (Finding 5)
- **Next Step:** I expect the Senior Architecture Lead to address the hydration risk in layout splitting, the coupling implications of full-hook dependency injection, and the maintenance overhead of custom memo comparators. Ready for Round 2.

---

## Senior Architecture Lead — Round 3

# Senior Architecture Lead — Round 2 Response

**Reviewing:** Qwen 3.6 Plus Round 1 Disputes on Findings 2, 3, 5

---

## Accepted Without Modification

**Dispute 1 (Explicit Dependency Injection):** Correct. Passing `ReturnType<typeof useAIChat>` creates structural coupling. The explicit `CoachHandlerDeps` interface is superior. Accepted.

**Dispute 3 (requestAnimationFrame over setTimeout):** Correct. RAF aligns with paint cycles and the cleanup pattern is sound. Accepted.

---

## Partial Agreement — Dispute 1 Keyboard Shortcuts

I accept the dependency injection pattern but dispute the keyboard shortcut placement.

**The claim:** "Keyboard shortcuts are tightly coupled to the orchestrator's action dispatch and should not be isolated."

**The counter:** Tight coupling to *actions* is not the same as tight coupling to *orchestrator internals*. The proposed `useKeyboardShortcuts` already receives only callbacks:

```typescript
useKeyboardShortcuts({
  onNewChat: handlers.handleNewChat,
  onToggleSidebar: sidebar.setIsOpen,
});
```

This is already decoupled from hook internals. The question is whether this `useEffect` block belongs in `useCoachAssistant.ts` or a separate file.

**The real issue is line budget.** With the accepted dependency injection pattern, `useCoachAssistant.ts` projects to:

```
Imports + types:                    30 lines
useAIChat() + useConversationSidebar() init:  20 lines
useCoachEventHandlers() call:       15 lines
useKeyboardShortcuts() inline:      35 lines  ← this is the dispute
Return object:                      20 lines
Total:                             120 lines  ← under budget
```

At 120 lines, `useCoachAssistant.ts` stays under budget *with* inline keyboard logic. I withdraw the `useCoachKeyboardShortcuts.ts` extraction. The inline placement is correct at this projected size.

**Revised position:** Keep keyboard shortcuts inline in `useCoachAssistant.ts`. The `useKeyboardShortcuts` utility hook from the shared hooks library is still valid as a generic utility — just not a Coach-specific file.

---

## Sustained Dispute — Dispute 2A: Optimistic Update Separation

**Qwen's claim:** "Optimistic updates require direct access to `setState` and `useRef` for rollback, making them inseparable from the main hook."

**This is architecturally incorrect.** The claim conflates *state access* with *state ownership*. A helper module does not need to own state to participate in optimistic update logic.

The pattern I proposed was:

```typescript
// useAIChatOptimistic.ts — pure helper functions, no hooks
export function createOptimisticMessage(content: string, contextType: ContextType): Message {
  return {
    id: `optimistic-${Date.now()}-${Math.random()}`,
    content,
    role: 'user',
    status: 'optimistic',
    contextType,
    timestamp: new Date().toISOString(),
  };
}

export function applyOptimisticUpdate(
  messages: Message[],
  optimisticMessage: Message
): Message[] {
  return [...messages, optimisticMessage];
}

export function rollbackOptimisticUpdate(
  messages: Message[],
  optimisticId: string
): Message[] {
  return messages.filter(m => m.id !== optimisticId);
}

export function confirmOptimisticUpdate(
  messages: Message[],
  optimisticId: string,
  confirmedMessage: Message
): Message[] {
  return messages.map(m => m.id === optimisticId ? confirmedMessage : m);
}
```

These are **pure functions**. They take state as input and return new state. `useAIChat.ts` calls `setMessages(applyOptimisticUpdate(messages, optimistic))`. The `setState` call stays in `useAIChat.ts`. The transformation logic moves to a testable module.

**The concrete benefit:** These functions are independently unit-testable:

```typescript
// useAIChatOptimistic.test.ts
it('rollback removes only the optimistic message', () => {
  const messages = [confirmedMsg, optimisticMsg, anotherConfirmedMsg];
  const result = rollbackOptimisticUpdate(messages, optimisticMsg.id);
  expect(result).toHaveLength(2);
  expect(result.find(m => m.id === optimisticMsg.id)).toBeUndefined();
});
```

Testing this logic inside `useAIChat.ts` requires `renderHook`, mock streaming, and async setup. Testing pure functions requires none of that.

**Revised file structure:**

```
useAIChat.ts              ← State, hooks, streaming orchestration (~220 lines)
api/coach.ts              ← Raw API calls, no React (~130 lines) [Qwen's proposal, accepted]
useAIChatOptimistic.ts    ← Pure transformation functions, no hooks (~70 lines)
```

The `useAIChatOptimistic.ts` file is not a hook. It exports pure functions. Qwen's objection about needing `setState` access does not apply.

---

## Sustained Dispute — Dispute 2B: Layout Splitting and Hydration Risk

**Qwen's claim:** Splitting into `DesktopLayout.tsx` / `MobileLayout.tsx` causes SSR hydration mismatches and loses scroll/focus state on breakpoint crossing.

**The hydration concern is valid but the conclusion is wrong.** The concern applies to this pattern:

```typescript
// PROBLEMATIC — server renders one, client renders other
const isMobile = useMediaQuery('(max-width: 1023px)');
return isMobile ? <MobileLayout /> : <DesktopLayout />;
```

Server has no window, so `useMediaQuery` returns `false` (or undefined) on server, renders `DesktopLayout`. Client may render `MobileLayout`. Hydration mismatch. **Qwen is correct about this specific implementation.**

However, the fix is not to abandon layout separation — it is to fix the hydration strategy:

```typescript
// SwanCoachAssistantPage.tsx — hydration-safe layout selection
function SwanCoachAssistantPage() {
  const coach = useCoachAssistant();
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => { setHasMounted(true); }, []);
  
  if (coach.error?.isFatal) {
    return <CoachAssistantErrorFallback error={coach.error} onRetry={coach.retry} />;
  }
  
  // Before mount: render desktop (matches SSR default), no flash
  // After mount: render correct layout for actual viewport
  if (!hasMounted) return <CoachAssistantDesktopLayout {...coach} />;
  
  const isMobile = window.innerWidth < 1024;
  return isMobile 
    ? <CoachAssistantMobileLayout {...coach} />
    : <CoachAssistantDesktopLayout {...coach} />;
}
```

**The scroll/focus concern is also valid but overstated.** Breakpoint crossing is a deliberate user action (resizing browser window). Losing scroll position on resize is acceptable UX — it happens in virtually every responsive application. The streaming state concern is real: if a user is mid-stream and resizes, the component unmounts. The fix:

```typescript
// CoachAssistantDesktopLayout.tsx and CoachAssistantMobileLayout.tsx
// Both receive the same coach prop — streaming state lives in useAIChat (the hook)
// not in the layout component. Unmounting the layout does not lose streaming state.
// useAIChat continues running. When the new layout mounts, it reads current state.
```

Streaming state is in `useAIChat`, which is owned by `useCoachAssistant`, which is owned by `SwanCoachAssistantPage`. The layout components are pure renderers. Unmounting a layout component does not affect hook state.

**However**, I partially accept Qwen's CSS Grid approach for a different reason: it is simpler and achieves the same result with fewer files. The line budget for `SwanCoachAssistantPage.tsx` was the original concern. Qwen's `CoachAssistantLayout.tsx` with CSS Grid solves the budget problem without the hydration complexity.

**Revised position — accept Qwen's CSS approach with one modification:**

```typescript
// CoachAssistantLayout.tsx — ~190 lines
// Use CSS Grid + data attributes instead of className string manipulation
const LayoutGrid = styled.div<{ $sidebarOpen: boolean }>`
  display: grid;
  grid-template-columns: 320px 1fr;
  
  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
    
    & > aside {
      position: fixed;
      inset: 0;
      z-index: 50;
      transform: ${({ $sidebarOpen }) => 
        $sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'};
      transition: transform 200ms ease-out;
    }
  }
`;

// Receives $sidebarOpen as a styled-component prop — no className string manipulation
// This eliminates the string concatenation bug surface in Qwen's proposal
```

**Accepted:** CSS Grid approach, single layout file  
**Modified:** Use styled-component props instead of `className` string manipulation  
**Withdrawn:** Separate Desktop/Mobile layout files

---

## Dispute 3 Partial — Default Memo vs Custom Comparators

**Qwen's claim:** "Default `React.memo` + stable prop factories is the React team's recommended pattern."

**Partially correct, but incomplete for this specific use case.**

Default `React.memo` uses shallow equality. For `ConversationItem`, the props are:

```typescript
interface ConversationItemProps {
  conversation: ConversationSummary;  // object reference
  isActive: boolean;                   // primitive
  onSelect: () => void;               // function reference
}
```

If `stableConversations` is computed with `useMemo` as Qwen proposes, the `conversation` object reference is stable between renders unless the conversation data changes. Default shallow memo works correctly here. **Qwen is right for `ConversationItem`.**

For `MessageItem`, the situation is different:

```typescript
interface MessageItemProps {
  message: Message;      // object — may be same reference during streaming
  isStreaming: boolean;  // primitive
}
```

During streaming, the streaming message object is *mutated in place* in some implementations, or a new object is created each chunk. If new objects are created each chunk (correct immutable approach), default `React.memo` will re-render every `MessageItem` on every chunk because the `messages` array is a new reference.

**The fix is not a custom comparator — it is correct state structure:**

```typescript
// useAIChat.ts — separate streaming content from stable message metadata
interface StreamingState {
  messageId: string;
  content: string;  // only this changes during streaming
}

// MessageItem receives stable message object + separate streaming content
interface MessageItemProps {
  message: Message;           // stable reference — never mutated during streaming
  streamingContent?: string;  // only passed to the actively-streaming message
}

// Now default React.memo works correctly:
// - Non-streaming messages: message reference stable → no re-render ✓
// - Streaming message: streamingContent changes → re-renders ✓
// - Other messages: message stable, streamingContent undefined → no re-render ✓
```

**This eliminates the need for custom comparators entirely** by fixing the state shape rather than working around it with comparator logic.

**Revised position:**
- Default `React.memo` for `ConversationItem` with Qwen's stable prop factory: **accepted**
- Custom comparator for `MessageItem`: **withdrawn** — fix state shape instead
- `MarkdownRenderer` memo with content comparison: **maintained** — `ReactMarkdown` is expensive enough to warrant explicit memoization even with correct state shape

---

## Consolidated Round 2 Positions

| Finding | Original | Qwen Dispute | Round 2 Resolution |
|---|---|---|---|
| F1: State Ownership | Proposed | Accepted | ✅ Consensus |
| F2: Handler extraction | `useCoachEventHandlers.ts` + `useCoachKeyboardShortcuts.ts` | Inline keyboard, explicit deps | ✅ Accept Qwen — keyboard inline, explicit deps |
| F3: `useAIChat` split | 3 files | Keep optimistic inline, `api/coach.ts` only | 🔴 Sustained — `useAIChatOptimistic.ts` as pure functions is valid |
| F3: Page layout | Desktop/Mobile components | CSS Grid single layout | ✅ Accept Qwen's CSS approach with styled-component props |
| F4: Error boundaries | Proposed topology | Accepted | ✅ Consensus |
| F5: Memo strategy | Custom comparators | Default memo + stable factories | ✅ Partial accept — fix state shape, not comparators |
| F5: Stream buffering | `setTimeout` | `requestAnimationFrame` | ✅ Accept Qwen |

**Remaining open dispute:** `useAIChatOptimistic.ts` as pure function module. Qwen's objection was based on the assumption it needed hook access. The revised proposal contains zero hooks — only pure transformation functions. This objection should be resolved in Round 3.

---

## Code Architecture Specialist (1M context) — Round 4

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

---

