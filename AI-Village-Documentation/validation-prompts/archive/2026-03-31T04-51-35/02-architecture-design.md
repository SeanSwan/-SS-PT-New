# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 78.7s
> **Files:** docs/ai-workflow/blueprints/COACH-ASSISTANT-UPGRADE-PLAN.md
> **Generated:** 3/30/2026, 9:51:35 PM

---

# Swan Coach Assistant — Architectural Review

**Reviewer:** Senior React/TypeScript Architect
**Date:** 2025-01-31
**Plan:** `docs/ai-workflow/blueprints/COACH-ASSISTANT-UPGRADE-PLAN.md`
**Verdict:** ✅ Structurally sound with 8 issues requiring attention before implementation begins.

---

## Executive Summary

The plan demonstrates solid architectural thinking. The phased approach is correct, the hook hierarchy is reasonable, and the file budget discipline is good. However, there are **3 HIGH severity issues** that will cause bugs or performance problems in production if not addressed, plus 5 MEDIUM/LOW issues worth fixing before writing code.

---

## Finding 1 — Component Decomposition

### 🟡 MEDIUM | `ConversationSidebar.tsx` | Missing Virtualization Boundary

**Issue:** The plan shows `ConversationList` rendering `ConversationItem[]` directly. A user with 200+ conversations (realistic for a daily-use coaching platform with wealthy clients who've been using it for months) will render all items into the DOM simultaneously. Each `ConversationItem` has hover states, badges, and action buttons — not cheap.

**Recommended Fix:** Introduce a `VirtualConversationList` wrapper using `@tanstack/react-virtual` (already likely in your dependency graph given the exercise database tables). This is a single component addition, not a redesign.

```typescript
// hooks/useConversationSidebar.ts — add to state shape
interface UseConversationSidebarReturn {
  isOpen: boolean;
  searchQuery: string;
  filteredConversations: ConversationSummary[];
  // ADD:
  parentRef: React.RefObject<HTMLDivElement>; // passed to virtualizer
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  toggle(): void;
  close(): void;
  setSearch(q: string): void;
}
```

If `@tanstack/react-virtual` is not already installed, the alternative is CSS `content-visibility: auto` on `ConversationItem` — zero JS overhead, browser handles paint skipping. Either is acceptable; the plan should specify which.

---

### 🟢 LOW | `CoachMessage.tsx` | Should Not Be Split Further

**Issue:** The plan correctly keeps `CoachMessage.tsx` as a single component and adds `MarkdownRenderer`, `ProviderBadge`, and `MessageActions` as children. This is correct. No change needed — flagging explicitly because some reviewers might suggest splitting message types into `AIMessage.tsx` / `UserMessage.tsx`. **Do not do this.** The conditional rendering (`isAI ? <MarkdownRenderer> : plain text`) is simple enough to stay in one component and splitting would create prop synchronization problems.

---

### 🟡 MEDIUM | `SuggestedPrompts.tsx` | Scope Ambiguity

**Issue:** The plan places `SuggestedPrompts` inside `MessagesArea` but describes two distinct behaviors:
1. Empty state — shown when `messages.length === 0`
2. Post-response — shown after AI responds (like ChatGPT's follow-up chips)

These are different UX patterns with different positioning, different trigger conditions, and potentially different prompt sets. Conflating them in one component will produce messy conditional logic.

**Recommended Fix:** Split into two clearly scoped components:

```
MessagesArea
├── EmptyStatePrompts.tsx     (~80 lines) — shown when messages === 0
│   └── Context-aware starter prompts, large centered layout
└── FollowUpPrompts.tsx       (~60 lines) — shown after last AI message
    └── Smaller chips, inline below last message
```

Both can share a `useContextPrompts(context: CoachContext)` hook that returns the prompt arrays. This keeps each component under 100 lines and makes the trigger logic unambiguous.

---

## Finding 2 — State Management

### 🔴 HIGH | `useConversationSidebar.ts` | Derived State Anti-Pattern

**Issue:** The plan shows:

```typescript
// useConversationSidebar (new)
├── isOpen: boolean
├── searchQuery: string
├── filteredConversations: ConversationSummary[]  // ← PROBLEM
└── toggle(), close(), setSearch()
```

`filteredConversations` is derived state — it's `conversations.filter(...)` applied to data owned by `useAIChat`. Storing it as state in `useConversationSidebar` means you need to either:

- **Option A:** Pass `conversations` as a parameter to `useConversationSidebar` and recompute inside — creates a dependency on the parent's data shape
- **Option B:** Have `useConversationSidebar` call `useAIChat` internally — creates a hidden coupling between hooks that the plan's hierarchy doesn't show

Either way, if `conversations` updates (new conversation created, one deleted) while `searchQuery` is active, you have a stale `filteredConversations` risk.

**Recommended Fix:** Make `filteredConversations` a `useMemo` computed value, not state. The hook accepts `conversations` as a parameter:

```typescript
// hooks/useConversationSidebar.ts
function useConversationSidebar(conversations: ConversationSummary[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearch] = useState('');

  // Derived — never stale, recomputes when either input changes
  const filteredConversations = useMemo(
    () =>
      searchQuery.trim() === ''
        ? conversations
        : conversations.filter(c =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
          ),
    [conversations, searchQuery]
  );

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, searchQuery, filteredConversations, toggle, close, setSearch };
}
```

This eliminates the stale state risk entirely and keeps the hook under 50 lines.

---

### 🔴 HIGH | `useCoachAssistant.ts` → `useAIChat.ts` | Circular Dependency Risk

**Issue:** The plan's hook hierarchy is:

```
useCoachAssistant
  └── calls useAIChat internally
      └── useConversationSidebar receives conversations from useAIChat
```

This is fine **as long as** `useConversationSidebar` is called in `useCoachAssistant` (or `SwanCoachAssistantPage`) with `chat.conversations` passed as a prop. However, if any future developer moves `useConversationSidebar` inside `ConversationSidebar.tsx` and has it call `useAIChat` directly (a natural-seeming refactor), you get two instances of `useAIChat` with separate state — a subtle, hard-to-debug bug.

**Recommended Fix:** Add an explicit architectural constraint comment in both hook files, and enforce the dependency direction in the plan:

```typescript
// hooks/useConversationSidebar.ts
/**
 * ARCHITECTURAL CONSTRAINT: This hook is UI-only state.
 * It does NOT call useAIChat. Conversation data flows DOWN
 * from useCoachAssistant via the `conversations` parameter.
 * Do not add data-fetching logic here.
 */
```

Also document the hook hierarchy explicitly in the plan:

```
Data fetching layer:    useAIChat (owns server state)
Orchestration layer:   useCoachAssistant (composes hooks, owns page state)
UI state layer:        useConversationSidebar, useVoiceRecorder,
                       useFileAttachment (pure UI state, no fetching)
```

---

### 🟡 MEDIUM | `useFileAttachment.ts` | Missing Cleanup

**Issue:** The plan shows:

```typescript
useFileAttachment
├── file: File | null
├── preview: string | null  // ← object URL
├── uploading: boolean
└── select(), remove(), upload()
```

`preview` is described as a "thumbnail URL." If this is an `object URL` created via `URL.createObjectURL(file)`, it **must** be revoked when the component unmounts or the file changes, or you leak memory. This is especially problematic on mobile where memory is constrained.

**Recommended Fix:**

```typescript
// hooks/useFileAttachment.ts
const [file, setFile] = useState<File | null>(null);
const [preview, setPreview] = useState<string | null>(null);

// Cleanup object URLs to prevent memory leaks
useEffect(() => {
  if (!file) return;
  const url = URL.createObjectURL(file);
  setPreview(url);
  return () => URL.revokeObjectURL(url); // cleanup on file change or unmount
}, [file]);
```

Add this explicitly to the plan's hook design section.

---

## Finding 3 — Data Flow

### 🔴 HIGH | Conversation Loading | Race Condition

**Issue:** The plan describes this flow:

```
User clicks conversation → loadConversation(id) → messages render
```

But `useAIChat` already has `loading` state for `listConversations`. When a user rapidly clicks between conversations in the sidebar (realistic behavior — they're scanning for a specific chat), you can have:

1. Click conversation A → `loadConversation(A)` fires
2. Click conversation B → `loadConversation(B)` fires
3. Response B arrives first → messages show B
4. Response A arrives second → **messages overwrite to A** even though B is selected

This is a classic async race condition. The plan does not address it.

**Recommended Fix:** Add an abort controller pattern to `loadConversation` in `useAIChat.ts`:

```typescript
// hooks/useAIChat.ts — loadConversation with abort
const abortControllerRef = useRef<AbortController | null>(null);

const loadConversation = useCallback(async (id: number) => {
  // Cancel any in-flight request
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();

  setLoading(true);
  try {
    const data = await api.get(`/api/ai-chat/conversations/${id}`, {
      signal: abortControllerRef.current.signal,
    });
    setActiveConversation(data);
    setMessages(data.messages);
  } catch (err) {
    if (err.name === 'AbortError') return; // Intentional cancel, not an error
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => abortControllerRef.current?.abort();
}, []);
```

Also add an optimistic active conversation ID to the sidebar so the selected item highlights immediately on click, before the load completes:

```typescript
// useConversationSidebar.ts — add optimistic selection
const [selectedId, setSelectedId] = useState<number | null>(null);

const selectConversation = useCallback((id: number, onLoad: (id: number) => void) => {
  setSelectedId(id); // Immediate UI feedback
  onLoad(id);        // Async data fetch
}, []);
```

---

### 🟡 MEDIUM | `listConversations` | Missing Initial Load Trigger

**Issue:** The plan states "User opens Coach Assistant → `listConversations()` → sidebar populated" but does not specify **where** this call is made. Options:

- In `useCoachAssistant` `useEffect` on mount
- In `ConversationSidebar` `useEffect` on mount
- In `SwanCoachAssistantPage` directly

If it's in `ConversationSidebar`, the list only loads when the sidebar renders. On mobile where the sidebar is hidden by default, the list never loads until the user opens it — which means the first open has a loading delay that feels broken.

**Recommended Fix:** Specify explicitly in the plan that `listConversations()` is called in `useCoachAssistant`'s mount effect, not in the sidebar component. The sidebar receives `conversations` as a prop (already populated or loading). Add a `conversationsLoading` state to show a skeleton in the sidebar on first open.

---

## Finding 4 — React Patterns

### 🟡 MEDIUM | `ConversationItem.tsx` | Missing Memoization Spec

**Issue:** The plan doesn't specify `React.memo` for `ConversationItem`. This component will re-render on every sidebar state change (search query typing, hover on other items, sidebar open/close) because its parent re-renders. With 50+ conversations, this is 50+ re-renders per keystroke in the search box.

**Recommended Fix:** Explicitly specify in the plan:

```typescript
// ConversationItem.tsx — must be memoized
const ConversationItem = React.memo(function ConversationItem({
  conversation,
  isActive,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onArchive,
}: ConversationItemProps) {
  // ...
}, (prev, next) => {
  // Custom comparison — only re-render if these specific props change
  return (
    prev.conversation.id === next.conversation.id &&
    prev.conversation.title === next.conversation.title &&
    prev.isActive === next.isActive &&
    prev.isSelected === next.isSelected
  );
});
```

Also ensure `onSelect`, `onRename`, `onDelete`, `onArchive` are all `useCallback`-wrapped in the parent, or the custom comparator is useless (new function references break shallow equality).

---

### 🟡 MEDIUM | `MarkdownRenderer.tsx` | Missing Memoization Spec

**Issue:** `MarkdownRenderer` receives `content: string` and renders via `react-markdown`. The `react-markdown` parse + render cycle is not cheap for long AI responses (workout plans, meal plans can be 800+ words with tables). If `CoachMessage` re-renders for any reason (parent state change, new message arriving), `MarkdownRenderer` re-parses the entire content string.

**Recommended Fix:**

```typescript
// MarkdownRenderer.tsx
const MarkdownRenderer = React.memo(function MarkdownRenderer({
  content,
}: {
  content: string;
}) {
  // Memoize the custom components object — new object reference on every render
  // would cause react-markdown to re-render all custom components
  const components = useMemo(() => ({
    table: StyledTable,
    code: StyledCode,
    // ... etc
  }), []); // Empty deps — these styled components never change

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
});
```

The `components` object **must** be memoized with `useMemo`. Passing a new object literal on every render is a known `react-markdown` performance footgun that causes full re-renders of all markdown elements.

---

## Finding 5 — File Budget

### 🟡 MEDIUM | `useAIChat.ts` | Will Exceed 300 Lines After Modifications

**Issue:** The plan states `useAIChat.ts` is currently 376 lines and already over budget. Adding `renameConversation` and `archiveConversation` plus the abort controller pattern from Finding 3 will push it to ~420+ lines.

**Recommended Fix:** Split `useAIChat.ts` before Phase 0 modifications:

```
hooks/
├── useAIChat.ts              (~150 lines) — orchestration, composes sub-hooks
├── useConversationList.ts    (~100 lines) — list, search, CRUD operations
├── useConversationMessages.ts (~120 lines) — load, send, stream messages
└── useAIChatConfig.ts        (~50 lines)  — provider selection, model config
```

`useAIChat.ts` becomes a thin composition layer that re-exports everything, preserving the existing API surface so no call sites break:

```typescript
// hooks/useAIChat.ts (after split — ~150 lines)
export function useAIChat() {
  const list = useConversationList();
  const messages = useConversationMessages(list.activeConversationId);
  const config = useAIChatConfig();

  return {
    // Re-export everything — existing call sites unchanged
    ...list,
    ...messages,
    ...config,
  };
}
```

---

### 🟢 LOW | `CoachMarkdownStyles.ts` | Estimated 200 

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
