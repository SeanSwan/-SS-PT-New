# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 5
> **Tokens:** 41,208 input / 16,248 output

---

## Senior Architecture Lead — Round 1

# Swan Coach Assistant — Architecture Authority Review

**Reviewer:** Senior Code Quality Lead
**Plan:** `docs/ai-workflow/blueprints/COACH-ASSISTANT-UPGRADE-PLAN.md`
**Verdict:** ✅ Implementable with 4 issues requiring resolution before Phase 1 begins.

---

## Executive Summary

The plan is architecturally sound at the macro level. The phased approach is correct, the hook hierarchy is reasonable, and the file budget discipline is good. The 12 specialist reviews surfaced real issues — I'll adjudicate the conflicts, add findings they missed, and produce a definitive pre-implementation checklist.

**Conflict resolution needed:** The Module Architecture reviewer recommends collapsing 22 files to 18. The Architecture reviewer recommends adding virtualization. Both are correct and compatible. I'll specify exactly which merges to make and which additions to add.

---

## Finding 1 — Hook Composition: The `useCoachAssistant` Orchestration Layer

**Severity: 🔴 HIGH**
**Component:** `hooks/useCoachAssistant.ts`

### Issue

The proposed hook hierarchy is:

```
useCoachAssistant
  ├── useAIChat          (messages, conversations, API calls)
  ├── useConversationSidebar  (sidebar open/close, search)
  ├── useVoiceRecorder   (MediaRecorder)
  └── useGeminiTranscription  (upload + transcribe)
```

This is correct in principle but has a **state ownership ambiguity** that will cause bugs. The plan shows `useConversationSidebar` owning `filteredConversations`, but `useAIChat` owns the source `conversations` array. These two hooks are siblings under `useCoachAssistant` — meaning `useConversationSidebar` must receive `conversations` as a parameter, not fetch it independently.

The plan does not specify this parameter contract. If a developer implements `useConversationSidebar` as self-contained (calling `listConversations()` internally), you get two independent API calls, two loading states, and a cache coherence problem where deleting a conversation in `useAIChat` doesn't update the sidebar's local copy.

### Fix

Define the parameter contract explicitly before implementation begins:

```typescript
// hooks/useConversationSidebar.ts
// CORRECT: receives conversations as parameter, owns only UI state
interface UseConversationSidebarParams {
  conversations: ConversationSummary[];  // owned by useAIChat, passed down
}

interface UseConversationSidebarReturn {
  isOpen: boolean;
  searchQuery: string;
  filteredConversations: ConversationSummary[];  // derived, not fetched
  parentRef: React.RefObject<HTMLDivElement>;    // for virtualizer (see Finding 2)
  toggle(): void;
  close(): void;
  setSearch(q: string): void;
}

export function useConversationSidebar(
  { conversations }: UseConversationSidebarParams
): UseConversationSidebarReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  // Derived state — no API call here
  const filteredConversations = useMemo(
    () =>
      searchQuery.trim() === ''
        ? conversations
        : conversations.filter(c =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
          ),
    [conversations, searchQuery]
  );

  // Stable callbacks — no new references on re-render
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const close  = useCallback(() => setIsOpen(false), []);
  const setSearch = useCallback((q: string) => setSearchQuery(q), []);

  return { isOpen, searchQuery, filteredConversations, parentRef, toggle, close, setSearch };
}
```

```typescript
// hooks/useCoachAssistant.ts — orchestration layer
export function useCoachAssistant() {
  const chat    = useAIChat();
  const sidebar = useConversationSidebar({ conversations: chat.conversations }); // ← explicit contract
  const voice   = useVoiceRecorder();
  const transcription = useGeminiTranscription();
  const attachment    = useFileAttachment();

  // Cross-hook coordination lives HERE, not in children
  const handleTranscriptionComplete = useCallback((text: string) => {
    // useCoachAssistant owns the coordination logic
    // neither child hook knows about the other
  }, []);

  return { chat, sidebar, voice, transcription, attachment };
}
```

**Rule:** Each hook owns exactly one concern. Cross-hook coordination is the exclusive responsibility of `useCoachAssistant`. No child hook imports another child hook.

---

## Finding 2 — Missing Virtualization Boundary

**Severity: 🟡 MEDIUM**
**Component:** `ConversationSidebar.tsx` → `ConversationList`
**Adjudicating:** Architecture reviewer's finding (correct, adopt it)

### Issue

The plan renders `ConversationItem[]` directly. A daily-use coaching platform with wealthy clients who've been active for 6+ months will accumulate 200-500 conversations. Each `ConversationItem` has hover states, badges, timestamps, and three action buttons. Rendering all of them simultaneously is a measurable performance problem.

### Fix

Add `@tanstack/react-virtual` if not already in the dependency graph. If it is (likely, given exercise database tables), zero new dependencies. The `parentRef` is already threaded through `useConversationSidebar` in Finding 1's fix above.

```typescript
// ConversationSidebar.tsx — virtualized list
import { useVirtualizer } from '@tanstack/react-virtual';

function ConversationList({ sidebar }: { sidebar: UseConversationSidebarReturn }) {
  const { filteredConversations, parentRef } = sidebar;

  const rowVirtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,  // ConversationItem height in px
    overscan: 5,             // render 5 items above/below viewport
  });

  return (
    <ConversationListContainer ref={parentRef}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ConversationItem
              conversation={filteredConversations[virtualRow.index]}
            />
          </div>
        ))}
      </div>
    </ConversationListContainer>
  );
}
```

**If `@tanstack/react-virtual` is not installed:** Use `content-visibility: auto` on `ConversationItem` as the CSS-only fallback. Zero JS overhead, browser handles paint skipping. Add to `CoachSidebarStyles.ts`:

```typescript
const ConversationItemWrapper = styled.div`
  content-visibility: auto;
  contain-intrinsic-size: 0 64px;  // prevents layout shift
`;
```

**Decision required before Phase 1:** Check `package.json` for `@tanstack/react-virtual`. If present, use the JS virtualizer. If absent, use the CSS fallback. Document the decision in the plan.

---

## Finding 3 — Memoization Strategy: Missing `useMemo` on Hook Return Objects

**Severity: 🔴 HIGH**
**Component:** All four new hooks + `useAIChat` extensions
**Adjudicating:** Frontend Patterns reviewer's finding (correct, needs specificity)

### Issue

The Frontend Patterns reviewer correctly flagged that hooks returning new object references on every render cause downstream re-renders. The plan does not specify a memoization strategy for any hook. This is not theoretical — it will cause visible performance problems in the messages area, which re-renders on every keystroke in the input bar.

The specific failure mode: `useCoachAssistant` returns an object literal `{ chat, sidebar, voice, transcription, attachment }`. Every render of `SwanCoachAssistantPage` creates a new object reference, which means every consumer of this hook re-renders even when nothing changed.

### Fix

Apply three rules consistently across all hooks:

**Rule 1: Functions always use `useCallback`**

```typescript
// useAIChat.ts — every exported function needs useCallback
const renameConversation = useCallback(
  async (id: number, title: string) => {
    await api.patch(`/api/ai-chat/conversations/${id}`, { title });
    // update local state immutably
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, title } : c))
    );
  },
  [] // stable — no dependencies that change
);
```

**Rule 2: Derived arrays always use `useMemo`**

```typescript
// useConversationSidebar.ts — already shown in Finding 1
const filteredConversations = useMemo(
  () => conversations.filter(/* ... */),
  [conversations, searchQuery]
);
```

**Rule 3: The orchestration hook return value uses `useMemo`**

```typescript
// hooks/useCoachAssistant.ts
export function useCoachAssistant() {
  const chat         = useAIChat();
  const sidebar      = useConversationSidebar({ conversations: chat.conversations });
  const voice        = useVoiceRecorder();
  const transcription = useGeminiTranscription();
  const attachment   = useFileAttachment();

  return useMemo(
    () => ({ chat, sidebar, voice, transcription, attachment }),
    [chat, sidebar, voice, transcription, attachment]
  );
}
```

**Note on `useMemo` at the orchestration level:** This only helps if the child hooks themselves return stable references. If `useAIChat` returns a new object every render, `chat` changes every render, and the `useMemo` above recomputes every render. The fix must be applied at every level of the hierarchy, not just the top.

**Audit checklist before Phase 1:**
- [ ] Every function exported from a hook is wrapped in `useCallback`
- [ ] Every derived array/object is wrapped in `useMemo`
- [ ] `useCoachAssistant` return value is wrapped in `useMemo`
- [ ] `MarkdownRenderer`'s `components` prop map is defined outside the component body or wrapped in `useMemo` (Frontend Patterns reviewer's specific callout — correct)

---

## Finding 4 — File Decomposition: Adjudicating the 22 vs 18 Conflict

**Severity: 🟡 MEDIUM**
**Adjudicating:** Module Architecture reviewer (18 files) vs original plan (22 files)

### Verdict: 19 files. Accept 3 of 4 proposed merges, reject 1.

The Module Architecture reviewer's merges are mostly correct. Here is the adjudication for each:

**✅ ACCEPT: Merge `FileAttachmentButton.tsx` + `AttachmentPreview.tsx` → `AttachmentTray.tsx`**

Rationale: Both components share the same lifecycle (select → validate → preview → remove) and are never used independently. A single `AttachmentTray.tsx` at ~160 lines is more cohesive. The `useFileAttachment` hook remains separate (hooks and components are different concerns).

```
Before: FileAttachmentButton.tsx (~80) + AttachmentPreview.tsx (~100) = 2 files, 180 lines
After:  AttachmentTray.tsx (~160) = 1 file
Savings: 1 file, ~20 lines of import/export boilerplate
```

**✅ ACCEPT: Inline `ProviderBadge.tsx` into `CoachMessage.tsx`**

Rationale: `ProviderBadge` is 60 lines, admin-only, and has no reuse outside `CoachMessage`. Inlining keeps it under 40 lines as a local component. `CoachMessage.tsx` grows from 81 to ~120 lines — still well under the 300-line limit.

```typescript
// CoachMessage.tsx — inline the badge
const ProviderBadge = styled.span<{ provider: string }>`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-elevated, #1A1A24);
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

// Used inline, not exported, not a separate file
```

**✅ ACCEPT: Consolidate styles from 9 files to 4 files**

The Module Architecture reviewer's 4-file consolidation is correct:

| New File | Contents | Est. Lines |
|---|---|---|
| `CoachLayoutStyles.ts` | Sidebar, main panel, flex containers, mobile overlays | ~180 |
| `CoachChatStyles.ts` | Message bubbles, timestamps, actions, thinking indicator, badges | ~160 |
| `CoachInputStyles.ts` | Input bar, textarea, voice orb, attachment tray, send button | ~190 |
| `CoachMarkdownStyles.ts` | Tables, code blocks, lists, headers, links | ~200 |

All under 300 lines. The original 9-file split (one per phase) creates import sprawl and makes theme audits harder. The 4-file split by UI region is more maintainable.

**❌ REJECT: Keep `SidebarHeader` and `SidebarFooter` as inline components in `ConversationSidebar.tsx`**

The Module Architecture reviewer says to keep the sidebar self-contained, which I agree with. But the original plan never proposed separate files for `SidebarHeader`/`SidebarFooter` — these were always intended as inline sub-components within `ConversationSidebar.tsx`. This is a non-issue; no merge needed.

### Final File Count

```
Phase 0:  5 style files (4 consolidated + 1 barrel) + 2 modified = 7 touches
Phase 1:  ConversationSidebar.tsx, ConversationItem.tsx, useConversationSidebar.ts = 3 new
Phase 2:  MarkdownRenderer.tsx (CoachMarkdownStyles.ts already counted in Phase 0) = 1 new
Phase 3:  ThinkingIndicator.tsx, SuggestedPrompts.tsx = 2 new
          (ProviderBadge inlined into CoachMessage.tsx — 0 new files)
          (CoachUIPolishStyles merged into CoachChatStyles.ts — 0 new files)
Phase 4:  useVoiceRecorder.ts, useGeminiTranscription.ts, VoiceRecordingOverlay.tsx = 3 new
          (CoachVoiceStyles merged into CoachInputStyles.ts — 0 new files)
Phase 5:  AttachmentTray.tsx, useFileAttachment.ts = 2 new
          (CoachAttachmentStyles merged into CoachInputStyles.ts — 0 new files)

TOTAL: 11 new files + 4 modified files = 15 touches
```

This is leaner than both proposals. Every file has a clear, single responsibility. No file will approach 300 lines.

---

## Finding 5 — Error Boundary Placement

**Severity: 🟡 MEDIUM**
**Component:** `SwanCoachAssistantPage.tsx`, `MessagesArea`, `MarkdownRenderer.tsx`
**Gap:** The plan has zero mention of error boundaries. The 12 specialist reviews also missed this entirely.

### Issue

Three specific failure modes require error boundaries, not just try/catch:

1. **`MarkdownRenderer` crashes on malformed AI output.** `react-markdown` is robust, but `rehype-highlight` can throw on certain code block edge cases. A crash here takes down the entire messages area.

2. **`VoiceRecordingOverlay` crashes on MediaRecorder permission denial.** Permission errors are synchronous throws in some browsers, not Promise rejections.

3. **`ConversationSidebar` crashes on malformed conversation data.** A corrupted `ConversationSummary` object (null

---

## Code Architecture Specialist (1M context) — Round 2

# Code Architecture Specialist (Qwen 3.6 Plus) — Round 1 Response

## Agreement Baseline
I fully endorse **Finding 1** (explicit hook parameter contracts), **Finding 3** (mandatory `useCallback`/`useMemo` hygiene), and the core premise of **Finding 5** (error boundaries are non-negotiable). The hook ownership model you've outlined is production-ready.

Below are the **three specific disputes** requiring correction before Phase 1 kickoff, with exact file references and code patches.

---

## Dispute 1 — Virtualization Key Anti-Pattern (Finding 2)
**Severity:** 🔴 HIGH (Will cause DOM thrashing & state loss during filtering)
**File:** `ConversationSidebar.tsx` (Lines ~45-60 in your snippet)

### Issue
Your virtualization example uses `key={virtualRow.index}`. This is a known React anti-pattern when the underlying list is filtered or sorted. When `searchQuery` changes, `filteredConversations` reorders, but the `key` remains tied to the viewport index. React will incorrectly reuse DOM nodes, causing:
1. Hover/active states to stick to the wrong conversation
2. Optimistic UI updates (e.g., "deleting conversation X") to apply to the wrong DOM element
3. `react-virtual` scroll position jumps during filter transitions

### Correction
Keys must be stable, data-driven identifiers. Update the virtualizer map:

```typescript
// ConversationSidebar.tsx — Line 52 replacement
{rowVirtualizer.getVirtualItems().map(virtualRow => {
  const conversation = filteredConversations[virtualRow.index];
  return (
    <div
      key={conversation.id} // ← CRITICAL: stable identity, not viewport index
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      <ConversationItem conversation={conversation} />
    </div>
  );
})}
```
**Rule:** Never use array indices as `key` in virtualized or filtered lists. Always use the entity's primary key.

---

## Dispute 2 — Style Consolidation Boundary (Finding 4)
**Severity:** 🟡 MEDIUM (Maintainability debt)
**File:** `CoachChatStyles.ts` vs `CoachMarkdownStyles.ts`

### Issue
Merging `CoachMarkdownStyles.ts` into `CoachChatStyles.ts` violates the **Single Responsibility Principle** for styling subsystems. `react-markdown` + `rehype-highlight` generates deeply nested, third-party DOM structures (`<pre>`, `<code>`, `<table>`, `<blockquote>`) that require isolated CSS reset rules and theme variables. Bundling them with chat bubbles will:
1. Create a 350+ line file that exceeds your own 300-line budget
2. Force developers to parse unrelated selectors when tweaking markdown rendering
3. Cause cascade conflicts if chat bubble styles accidentally leak into code block rendering

### Correction
Keep `CoachMarkdownStyles.ts` isolated. Final style count: **5 files**, not 4.

| File | Responsibility | Est. Lines |
|---|---|---|
| `CoachLayoutStyles.ts` | Sidebar, main panel, flex containers, mobile overlays | ~180 |
| `CoachChatStyles.ts` | Message bubbles, timestamps, actions, thinking indicator, badges | ~160 |
| `CoachInputStyles.ts` | Input bar, textarea, voice orb, attachment tray, send button | ~190 |
| `CoachMarkdownStyles.ts` | **Isolated:** Tables, code blocks, lists, headers, links, syntax highlighting | ~200 |
| `CoachVoiceStyles.ts` | Recording overlay, waveform, permission fallback | ~120 |

**Rationale:** Markdown rendering is a third-party wrapper subsystem. It deserves its own namespace to prevent selector bleed and simplify future theme swaps (e.g., dark/light code block palettes).

---

## Dispute 3 — Memoization Dependency Chain (Finding 3)
**Severity:** 🟡 MEDIUM (Performance regression risk)
**File:** `hooks/useAIChat.ts` → `hooks/useConversationSidebar.ts`

### Issue
Your `useConversationSidebar` correctly memoizes `filteredConversations` on `[conversations, searchQuery]`. However, if `useAIChat` returns a new `conversations` array reference on every render (e.g., from `useState` updates or API polling), the sidebar's `useMemo` will recompute unnecessarily, defeating the optimization.

### Correction
`useAIChat` must stabilize its output array. Add this to `hooks/useAIChat.ts`:

```typescript
// hooks/useAIChat.ts — Line ~85 (after state initialization)
const stableConversations = useMemo(() => conversations, [conversations]);

// Return object
return useMemo(
  () => ({
    conversations: stableConversations, // ← Pass stable ref, not raw state
    messages,
    // ... other exports
  }),
  [stableConversations, messages]
);
```
**Rule:** Any hook that passes arrays/objects to sibling hooks must guarantee reference stability. The consumer's `useMemo` is only as good as the producer's reference stability.

---

## Finding 5 Completion — Error Boundary Implementation
*(Completing your cut-off point with exact placement)*

**File:** `SwanCoachAssistantPage.tsx`, `MarkdownRenderer.tsx`, `VoiceRecordingOverlay.tsx`

Create a lightweight, reusable boundary. Do not use `react-error-boundary` unless already in `package.json` (adds ~4kb). A 20-line custom boundary is sufficient:

```typescript
// components/common/ComponentErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props { fallback: ReactNode; children: ReactNode; }
interface State { hasError: boolean; }

export class ComponentErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.fallback?.toString()}:`, error, info);
    // Optional: telemetry.report(error);
  }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}
```

**Placement:**
1. `SwanCoachAssistantPage.tsx` → Wrap `<ConversationSidebar />` with fallback: `<SidebarErrorFallback />`
2. `MarkdownRenderer.tsx` → Wrap `<ReactMarkdown />` with fallback: `<div className="markdown-error">Failed to render response</div>`
3. `VoiceRecordingOverlay.tsx` → Wrap MediaRecorder init with fallback: `<PermissionDeniedBanner />`

---

## Pre-Phase 1 Checklist Additions
- [ ] Replace `key={virtualRow.index}` with `key={conversation.id}` in virtualizer
- [ ] Keep `CoachMarkdownStyles.ts` isolated (5 style files total)
- [ ] Stabilize `conversations` array reference in `useAIChat` return
- [ ] Implement `ComponentErrorBoundary` and wrap 3 critical subtrees
- [ ] Add `@tanstack/react-virtual` to `package.json` (or document CSS fallback decision)

**Status:** Architecture is 95% locked. Resolve the 3 disputes above, and Phase 1 can proceed without structural refactors. Awaiting your adjudication on the virtualization key and style boundary before Round 2.

---

## Senior Architecture Lead — Round 3

# Senior Architecture Lead — Round 2 Adjudication

## Dispute Resolution Status

Qwen's Round 1 response is high quality. Two of three disputes are **fully accepted**. One requires a **partial correction**. I'm also completing Finding 5 and adding one new finding their review surfaced.

---

## ✅ ACCEPT — Dispute 1: Virtualization Key Anti-Pattern

Qwen is **correct**. Using `key={virtualRow.index}` in a filtered list is a genuine bug, not a style preference.

My original snippet was illustrative pseudocode and I failed to specify the key strategy. The correction is exact and right:

```typescript
// ConversationSidebar.tsx — FINAL implementation
{rowVirtualizer.getVirtualItems().map(virtualRow => {
  const conversation = filteredConversations[virtualRow.index];
  return (
    <div
      key={conversation.id} // stable identity, not viewport index
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      <ConversationItem conversation={conversation} />
    </div>
  );
})}
```

**This is now locked.** `key={conversation.id}` is the only acceptable implementation. Adding to pre-Phase 1 checklist.

---

## ✅ ACCEPT — Dispute 2: `CoachMarkdownStyles.ts` Isolation

Qwen is **correct** on the SRP argument. I'll add one concrete reason they didn't mention that makes this even more important:

`rehype-highlight` injects Prism/Highlight.js class names (`hljs-keyword`, `hljs-string`, etc.) that require specificity overrides. Those overrides will collide with any `.message-bubble code` selectors in `CoachChatStyles.ts` if they share a file. The cascade conflict is not theoretical — it will manifest the first time a user receives a code block inside a message.

**Revised final style file count: 5 files.**

| File | Responsibility | Est. Lines |
|---|---|---|
| `CoachLayoutStyles.ts` | Sidebar, main panel, flex containers, mobile overlays | ~180 |
| `CoachChatStyles.ts` | Message bubbles, timestamps, actions, thinking indicator, badges | ~160 |
| `CoachInputStyles.ts` | Input bar, textarea, voice orb, attachment tray, send button | ~190 |
| `CoachMarkdownStyles.ts` | Tables, code blocks, lists, headers, links, syntax highlighting | ~200 |
| `CoachVoiceStyles.ts` | Recording overlay, waveform, permission fallback | ~120 |

**However, I'm rejecting Qwen's `CoachVoiceStyles.ts` as a separate file.** Their table above introduces it without justification relative to my original proposal to merge voice styles into `CoachInputStyles.ts`. Let me adjudicate this properly:

**Voice overlay styles belong in `CoachVoiceStyles.ts` as a standalone file** — but for a different reason than Qwen stated. The voice overlay is a **modal-layer component** (`position: fixed`, `z-index: 9999`, full-screen backdrop). Its styles are structurally unrelated to the input bar's inline layout. Merging them into `CoachInputStyles.ts` would mix two different stacking contexts. Qwen's conclusion is right; their reasoning was incomplete.

**Final style architecture: 5 files. This is locked.**

---

## ⚠️ PARTIAL ACCEPT — Dispute 3: Memoization Dependency Chain

Qwen identifies a real problem but proposes a **redundant solution**.

### What They Got Right

`useAIChat` must return a stable `conversations` reference. If `useState` updates replace the array reference on every render, downstream `useMemo` calls recompute unnecessarily. This is correct.

### What's Wrong With Their Fix

```typescript
// Qwen's proposed fix — hooks/useAIChat.ts
const stableConversations = useMemo(() => conversations, [conversations]);
```

**This is a no-op.** `useMemo(() => conversations, [conversations])` returns `conversations` when `conversations` changes and returns the cached value when it doesn't. But `conversations` is already a `useState` value — React only creates a new array reference when `setConversations` is called with a new value. The `useMemo` wrapper adds zero stability; it just adds overhead.

The **actual problem** is different: it's not that `useState` creates spurious references — it's that mutation patterns like this create them:

```typescript
// hooks/useAIChat.ts — THE REAL BUG PATTERN
// This creates a new array reference even when content is identical
setConversations(prev => [...prev]); // ← spreads into new array unnecessarily
```

And this pattern in API response handlers:

```typescript
// Also problematic — new array on every poll even if data unchanged
const data = await listConversations();
setConversations(data); // ← always a new reference from JSON.parse
```

### The Correct Fix

The solution is **structural normalization**, not `useMemo` wrapping:

```typescript
// hooks/useAIChat.ts — correct approach
// Option A: Normalize updates to avoid unnecessary new references
const updateConversationTitle = useCallback(
  (id: number, title: string) => {
    setConversations(prev => {
      const target = prev.find(c => c.id === id);
      // Guard: don't create new array if nothing changed
      if (!target || target.title === title) return prev;
      return prev.map(c => c.id === id ? { ...c, title } : c);
    });
  },
  []
);

// Option B: For API polling — deep equality check before setState
const refreshConversations = useCallback(async () => {
  const fresh = await listConversations();
  setConversations(prev => {
    // Structural equality check — don't replace if content is same
    if (prev.length === fresh.length &&
        prev.every((c, i) => c.id === fresh[i].id && c.title === fresh[i].title)) {
      return prev; // ← return SAME reference, no re-render
    }
    return fresh;
  });
}, []);
```

**Rule:** Stability comes from disciplined `setState` calls that return the previous reference when content hasn't changed — not from wrapping stable state in `useMemo`.

Qwen's `useMemo(() => conversations, [conversations])` pattern should be **removed from the codebase** if any developer adds it. It's cargo-cult memoization that adds a dependency tracking overhead with zero benefit.

---

## Finding 5 — Completed (Error Boundaries)

Qwen's `ComponentErrorBoundary` implementation is correct and I'm adopting it. One addition: the boundary needs a **reset mechanism** for the voice recorder case, where the user can grant permissions after the initial denial.

```typescript
// components/common/ComponentErrorBoundary.tsx — FINAL
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  fallback: ReactNode | ((reset: () => void) => ReactNode);
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}
interface State { hasError: boolean; }

export class ComponentErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    console.error('[ComponentErrorBoundary]', error, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(this.reset)
        : this.props.fallback;
    }
    return this.props.children;
  }
}
```

**Placement (locked):**

```typescript
// SwanCoachAssistantPage.tsx
<ComponentErrorBoundary fallback={<SidebarErrorFallback />}>
  <ConversationSidebar sidebar={sidebar} />
</ComponentErrorBoundary>

// MarkdownRenderer.tsx — static fallback, no reset needed
<ComponentErrorBoundary
  fallback={<div className="markdown-error">Unable to render response</div>}
>
  <ReactMarkdown>{content}</ReactMarkdown>
</ComponentErrorBoundary>

// VoiceRecordingOverlay.tsx — needs reset for permission retry
<ComponentErrorBoundary
  fallback={(reset) => (
    <PermissionDeniedBanner onRetry={reset} />
  )}
>
  <VoiceRecordingOverlay />
</ComponentErrorBoundary>
```

---

## New Finding 6 — Missing Type Exports Barrel

**Severity: 🟡 MEDIUM**
**Gap:** Neither review mentioned this. Qwen's 1M context window should have caught it.

### Issue

The plan creates 11 new files across 5 phases. Each hook exports an interface (`UseConversationSidebarReturn`, `UseAIChatReturn`, etc.). Each component imports these interfaces. Without a centralized type barrel, you get:

```typescript
// What will happen without a barrel — import sprawl
import type { UseConversationSidebarReturn } from '../../hooks/useConversationSidebar';
import type { UseAIChatReturn } from '../../hooks/useAIChat';
import type { UseVoiceRecorderReturn } from '../../hooks/useVoiceRecorder';
// ... 4 more lines for a component that needs 2 types
```

When a type moves or is renamed during refactoring, every import breaks independently.

### Fix

```typescript
// hooks/types.ts — single source of truth for all hook interfaces
export type { UseConversationSidebarReturn, UseConversationSidebarParams } from './useConversationSidebar';
export type { UseAIChatReturn } from './useAIChat';
export type { UseVoiceRecorderReturn } from './useVoiceRecorder';
export type { UseGeminiTranscriptionReturn } from './useGeminiTranscription';
export type { UseFileAttachmentReturn } from './useFileAttachment';
export type { UseCoachAssistantReturn } from './useCoachAssistant';

// ConversationSidebar.tsx — clean import
import type { UseConversationSidebarReturn } from '../hooks/types';
```

**This adds 1 file to the count: `hooks/types.ts`.** Final total: **12 new files + 4 modified.**

---

## Updated Pre-Phase 1 Checklist

**Locked decisions:**
- [x] `key={conversation.id}` in virtualizer (Dispute 1 — accepted)
- [x] 5 style files, `CoachMarkdownStyles.ts` isolated (Dispute 2 — accepted)
- [x] `CoachVoiceStyles.ts` standalone (modal-layer stacking context justification)
- [x] `ComponentErrorBoundary` with reset mechanism (Finding 5 — completed)
- [x] `hooks/types.ts` barrel for all hook interfaces (Finding 6 — new)

**Corrected decisions:**
- [x] Stability via disciplined `setState` guards, NOT `useMemo(() => state, [state])` (Dispute 3 — partial accept, mechanism corrected)

**Still open (requires Qwen's response):**
- [ ] Does Qwen accept the `setState` guard pattern over their `useMemo` wrapper?
- [ ] Does Qwen have a position on `hooks/types.ts` barrel — any conflicts with existing type organization in the codebase?

**Round 2 status: 2 of 3 disputes fully resolved. 1 partially resolved with mechanism correction. 1 new finding added. Architecture is 97% locked.**

---

## Code Architecture Specialist (1M context) — Round 4

## Code Architecture Specialist (Qwen 3.6 Plus) — Round 2 Response

### ✅ Consensus Baseline
I fully accept your adjudication on **Dispute 1** (virtualization keys), **Dispute 2** (style isolation), and **Finding 5** (error boundary reset mechanism). The architectural surface is now clean. Below are direct answers to your open questions, plus two implementation constraints required before Phase 1 code generation.

---

### ✅ ACCEPT — Dispute 3: Memoization Dependency Chain
Your correction is accurate. `useMemo(() => state, [state])` is indeed a no-op that adds dependency-tracking overhead without stabilizing references. The `setState` guard pattern is the correct solution.

**Implementation Constraint:** To prevent boilerplate drift across the 5 hooks, standardize the guard pattern using a lightweight utility rather than inline `every()` checks. This ensures consistent equality semantics and simplifies future migration to `useSyncExternalStore` if needed.

```typescript
// utils/stateGuards.ts
export function stableArrayUpdate<T extends { id: string | number }>(
  prev: T[],
  next: T[]
): T[] {
  if (prev.length !== next.length) return next;
  // Shallow structural check: ID + top-level primitive fields
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].id !== next[i].id) return next;
  }
  return prev; // Return identical reference → zero re-renders
}
```

**Applied in `hooks/useAIChat.ts` (Line ~92):**
```typescript
const refreshConversations = useCallback(async () => {
  const fresh = await listConversations();
  setConversations(prev => stableArrayUpdate(prev, fresh));
}, []);
```
**Rule:** All array state updates in hooks must pass through `stableArrayUpdate` or an equivalent guard. Direct `setConversations(data)` from API responses is prohibited.

---

### ⚠️ CONDITIONAL ACCEPT — Finding 6: Type Exports Barrel
The barrel concept is sound for this scale, but `hooks/types.ts` introduces a subtle maintenance risk: developers will inevitably import runtime hooks from it, creating implicit coupling and breaking tree-shaking. 

**Refined Implementation:**
1. Keep `hooks/types.ts` strictly for **type-only re-exports**.
2. Enforce `import type` syntax via ESLint (`@typescript-eslint/consistent-type-imports: "error"`).
3. Use a dual-barrel structure to separate runtime from types cleanly:

```typescript
// hooks/types.ts — TYPE-ONLY BARREL
export type { UseConversationSidebarParams, UseConversationSidebarReturn } from './useConversationSidebar';
export type { UseAIChatReturn } from './useAIChat';
export type { UseVoiceRecorderReturn } from './useVoiceRecorder';
export type { UseGeminiTranscriptionReturn } from './useGeminiTranscription';
export type { UseFileAttachmentReturn } from './useFileAttachment';
export type { UseCoachAssistantReturn } from './useCoachAssistant';

// hooks/index.ts — RUNTIME + TYPE BARREL
export { useConversationSidebar } from './useConversationSidebar';
export { useAIChat } from './useAIChat';
export { useVoiceRecorder } from './useVoiceRecorder';
export { useGeminiTranscription } from './useGeminiTranscription';
export { useFileAttachment } from './useFileAttachment';
export { useCoachAssistant } from './useCoachAssistant';
export type * from './types'; // Re-export types for convenience
```

**Consumer Pattern (`ConversationSidebar.tsx` Line 3):**
```typescript
import { useConversationSidebar } from '@/hooks';
import type { UseConversationSidebarReturn } from '@/hooks/types';
```
**Rule:** Never mix runtime and type exports in the same file. `types.ts` must contain only `export type` statements. This guarantees zero runtime bundle impact and enables safe cross-module refactoring.

---

### 🔒 Final Pre-Phase 1 Checklist (Merged & Locked)

| # | Decision | Status | File/Line Reference |
|---|---|---|---|
| 1 | Virtualization uses `key={conversation.id}` | ✅ Locked | `ConversationSidebar.tsx` L52 |
| 2 | 5 isolated style files (`CoachMarkdownStyles.ts` standalone) | ✅ Locked | `styles/Coach*.ts` |
| 3 | Array stability via `setState` guards, not `useMemo` wrappers | ✅ Locked | `hooks/useAIChat.ts` L92 + `utils/stateGuards.ts` |
| 4 | `ComponentErrorBoundary` with reset callback | ✅ Locked | `components/common/ComponentErrorBoundary.tsx` |
| 5 | Dual-barrel type system (`types.ts` + `index.ts`) | ✅ Locked | `hooks/types.ts`, `hooks/index.ts` |
| 6 | ESLint rule: `@typescript-eslint/consistent-type-imports: "error"` | ✅ Locked | `.eslintrc.json` |
| 7 | `@tanstack/react-virtual` dependency check or CSS fallback documented | ✅ Locked | `package.json` / `docs/ai-workflow/DECISIONS.md` |

---

### Round 2 Status
All disputes resolved. Architecture is **100% locked** for implementation. No further structural debates required. Phase 1 can proceed with the exact file budget, hook contracts, and performance guardrails defined above.

**Awaiting final authority sign-off or direct transition to Phase 1 scaffolding.**

---

## Senior Architecture Lead — Round 5

# Senior Architecture Lead — Round 3 Final Adjudication

## CONSENSUS REACHED

The architecture is fully locked. Below is the complete merged specification.

---

## Dispute Resolution: Final Status

### ✅ ACCEPT — `stableArrayUpdate` Utility (Dispute 3 Resolution)

Qwen's `utils/stateGuards.ts` utility is the correct evolution of my `setState` guard pattern. Standardizing equality semantics across 5 hooks via a shared utility prevents the exact boilerplate drift I was concerned about.

One precision addition: the current implementation only checks `id` fields. For `ConversationSummary` objects, `updatedAt` timestamps also change on rename/delete without ID changes. The utility needs a second comparator parameter:

```typescript
// utils/stateGuards.ts — FINAL
export function stableArrayUpdate<T extends { id: string | number }>(
  prev: T[],
  next: T[],
  isEqual?: (a: T, b: T) => boolean
): T[] {
  if (prev.length !== next.length) return next;
  for (let i = 0; i < prev.length; i++) {
    const equal = isEqual
      ? isEqual(prev[i], next[i])
      : prev[i].id === next[i].id;
    if (!equal) return next;
  }
  return prev;
}

// hooks/useAIChat.ts — usage with conversation-specific equality
const refreshConversations = useCallback(async () => {
  const fresh = await listConversations();
  setConversations(prev =>
    stableArrayUpdate(
      prev,
      fresh,
      (a, b) => a.id === b.id && a.title === b.title && a.updatedAt === b.updatedAt
    )
  );
}, []);
```

**This is now locked.** `stableArrayUpdate` is the canonical pattern. Direct `setState(apiResponse)` is prohibited in all hooks.

---

### ✅ ACCEPT — Dual-Barrel Type System (Finding 6 Resolution)

Qwen's refinement is correct and I'm adopting it fully. The separation of `hooks/types.ts` (type-only) from `hooks/index.ts` (runtime + types) is the right architecture at this scale.

One addition to their ESLint rule: add the `fixStyle` option to auto-correct violations rather than just flag them:

```json
// .eslintrc.json — FINAL
{
  "rules": {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports",
        "fixStyle": "inline-type-imports",
        "disallowTypeAnnotations": false
      }
    ],
    "@typescript-eslint/no-import-type-side-effects": "error"
  }
}
```

The `no-import-type-side-effects` rule is the critical companion: it prevents `import type { Foo }` from being silently converted to a runtime import by bundlers that don't fully understand TypeScript's `verbatimModuleSyntax`. Belt-and-suspenders enforcement.

**Both rules are now locked.**

---

## Merged Final Specification

### Hook Architecture (Locked)

```
useCoachAssistant (orchestration only, no direct state)
  ├── useAIChat          → owns: conversations[], messages[], API calls
  ├── useConversationSidebar({ conversations }) → owns: isOpen, searchQuery, filteredConversations (derived)
  ├── useVoiceRecorder   → owns: MediaRecorder lifecycle
  ├── useGeminiTranscription → owns: upload + transcribe pipeline
  └── useFileAttachment  → owns: file selection, validation, preview URLs
```

**Invariants:**
- No child hook imports another child hook
- Cross-hook coordination lives exclusively in `useCoachAssistant`
- Every exported function wrapped in `useCallback`
- Every derived array/object wrapped in `useMemo`
- `useCoachAssistant` return value wrapped in `useMemo`
- All array state updates pass through `stableArrayUpdate`

---

### File Budget (Locked: 13 new files + 4 modified)

| Phase | New Files | Modified Files |
|---|---|---|
| Phase 0 | `CoachLayoutStyles.ts`, `CoachChatStyles.ts`, `CoachInputStyles.ts`, `CoachMarkdownStyles.ts`, `CoachVoiceStyles.ts` | `SwanCoachAssistantPage.tsx`, existing style barrel |
| Phase 1 | `ConversationSidebar.tsx`, `ConversationItem.tsx`, `useConversationSidebar.ts` | — |
| Phase 2 | `MarkdownRenderer.tsx` | — |
| Phase 3 | `ThinkingIndicator.tsx`, `SuggestedPrompts.tsx` | `CoachMessage.tsx` (inline ProviderBadge) |
| Phase 4 | `useVoiceRecorder.ts`, `useGeminiTranscription.ts`, `VoiceRecordingOverlay.tsx` | — |
| Phase 5 | `AttachmentTray.tsx`, `useFileAttachment.ts` | — |
| Cross-cutting | `hooks/types.ts`, `hooks/index.ts`, `utils/stateGuards.ts`, `components/common/ComponentErrorBoundary.tsx` | `.eslintrc.json` |

**300-line budget applies to every file. No exceptions.**

---

### Style Architecture (Locked: 5 files)

| File | Responsibility | Ceiling |
|---|---|---|
| `CoachLayoutStyles.ts` | Sidebar, main panel, flex containers, mobile overlays | ~180 lines |
| `CoachChatStyles.ts` | Message bubbles, timestamps, actions, thinking indicator, badges | ~160 lines |
| `CoachInputStyles.ts` | Input bar, textarea, attachment tray, send button | ~190 lines |
| `CoachMarkdownStyles.ts` | Tables, code blocks, lists, headers, syntax highlighting (isolated from chat bubble cascade) | ~200 lines |
| `CoachVoiceStyles.ts` | Recording overlay, waveform, permission fallback (modal-layer stacking context) | ~120 lines |

---

### Virtualization (Locked)

```typescript
// ConversationSidebar.tsx — canonical implementation
{rowVirtualizer.getVirtualItems().map(virtualRow => {
  const conversation = filteredConversations[virtualRow.index];
  return (
    <div
      key={conversation.id}          // stable identity — never index
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      <ConversationItem conversation={conversation} />
    </div>
  );
})}
```

**Dependency decision required before Phase 1:** Check `package.json` for `@tanstack/react-virtual`. If absent, use `content-visibility: auto` CSS fallback. Document in `docs/ai-workflow/DECISIONS.md`.

---

### Error Boundary (Locked)

```typescript
// components/common/ComponentErrorBoundary.tsx
export class ComponentErrorBoundary extends Component<Props, State> {
  // reset() method enables permission-retry flow in VoiceRecordingOverlay
  // fallback accepts (reset: () => void) => ReactNode for interactive recovery
}
```

**Placement:**
1. `<ConversationSidebar />` → static fallback
2. `<ReactMarkdown />` inside `MarkdownRenderer.tsx` → static fallback
3. `<VoiceRecordingOverlay />` → `(reset) => <PermissionDeniedBanner onRetry={reset} />` functional fallback

---

### Pre-Phase 1 Checklist (Complete & Locked)

**Infrastructure (before any Phase 0 code):**
- [ ] ESLint rules added: `consistent-type-imports` + `no-import-type-side-effects`
- [ ] `utils/stateGuards.ts` created with `stableArrayUpdate<T>` (optional comparator param)
- [ ] `components/common/ComponentErrorBoundary.tsx` created
- [ ] `hooks/types.ts` and `hooks/index.ts` created (empty barrels, populated as hooks are built)
- [ ] `@tanstack/react-virtual` presence confirmed in `package.json`; decision documented

**Per-hook implementation gates (each hook must pass before next phase):**
- [ ] All exported functions use `useCallback`
- [ ] All derived arrays/objects use `useMemo`
- [ ] All API response array updates use `stableArrayUpdate`
- [ ] Hook return object uses `useMemo`
- [ ] Interface exported to `hooks/types.ts`
- [ ] Runtime export added to `hooks/index.ts`

**Component implementation gates:**
- [ ] `key={entity.id}` on all virtualized/filtered list items (never index)
- [ ] Error boundary wrapping all three critical subtrees
- [ ] No component file exceeds 300 lines
- [ ] No style file exceeds 300 lines

---

**Architecture status: FULLY LOCKED. Phase 0 implementation may begin.**

---

